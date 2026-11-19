begin;
-- =============================================================================
--  Court-circuit, inverse de la migration 0002 (court_circuit_0002_progression)
--  Projet Supabase cukahpyqkljiddmimpyi (« Babash - applications »)
--  Nom de migration : court_circuit_0002_progression_inverse
-- =============================================================================
--  **ATTENTION : ce retour efface la progression des élèves** (la colonne
--  court_circuit.eleves.challenges_reussis), sans retour possible. Les comptes
--  et les programmes restent. Avant de le lancer, l'enseignant exporte la table
--  court_circuit.eleves s'il veut garder la progression (Table Editor, export ;
--  règle M8). L'export reste hors du dépôt.
--
--  Ce que ce fichier fait : il retire la fonction public.cc_progression, la
--  contrainte et la colonne challenges_reussis, et remet cc_connexion,
--  cc_reprise, leurs commentaires et le commentaire de court_circuit.eleves
--  exactement comme la migration 0001 les a créés. Rien d'autre.
--
--  Avant de le lancer : remettre PROGRESSION_EN_LIGNE à false dans config.js
--  et publier la page, pour qu'elle n'appelle plus cc_progression (règles M6
--  et M7 : on retire en deux temps, la page d'abord).
-- =============================================================================

-- Garde-fou : le bon rôle, la migration 0001 en place, et aucun objet hors du
-- schéma qui se sert de la colonne. Sinon, arrêt avant toute modification.
do $$
declare d text;
begin
  if current_user <> 'postgres' then
    raise exception 'À lancer en postgres (éditeur SQL de Supabase ou apply_migration), pas en % : arrêt, rien n''a été modifié.', current_user;
  end if;
  if to_regclass('court_circuit.eleves') is null
     or coalesce(obj_description(to_regclass('court_circuit.eleves'), 'pg_class'), '') not like 'Court-circuit.%' then
    raise exception 'La table court_circuit.eleves de la migration 0001 manque : arrêt, rien n''a été modifié.';
  end if;
  select string_agg(distinct o, ', ') into d from (
    select v.oid::regclass::text as o
    from pg_catalog.pg_depend x
    join pg_catalog.pg_rewrite r on r.oid = x.objid
    join pg_catalog.pg_class v on v.oid = r.ev_class
    where x.classid = 'pg_catalog.pg_rewrite'::regclass and x.refobjid = 'court_circuit.eleves'::regclass
      and x.refobjsubid = (select a.attnum from pg_catalog.pg_attribute a where a.attrelid = 'court_circuit.eleves'::regclass and a.attname = 'challenges_reussis' and not a.attisdropped)
    union all
    select p.oid::regprocedure::text
    from pg_catalog.pg_proc p
    where p.prosrc ~ '\mchallenges_reussis\M'
      and not (p.pronamespace = 'public'::regnamespace and p.proname in ('cc_connexion', 'cc_reprise', 'cc_progression'))
  ) s;
  if d is not null then
    raise exception 'Des objets se servent de la colonne challenges_reussis (%) : les défaire d''abord. Arrêt, rien n''a été modifié.', d;
  end if;
end $$;

drop function if exists public.cc_progression(uuid, text[]);

-- cc_connexion et cc_reprise, telles que 0001 les a créées (même signature : les droits ne changent pas)
-- Entrer avec son code : 20 échecs au plus par heure et par réseau.
-- Chaque entrée tire un nouveau jeton : un poste partagé oublié ne garde pas l'accès.
create or replace function public.cc_connexion(p_code text)
returns json
language plpgsql volatile security definer
set search_path = ''
as $$
declare c text := court_circuit.normaliser_code(left(coalesce(p_code, ''), 60)); e court_circuit.eleves;
begin
  if not commun.essai_permis('court_circuit', 'eleve', 20) then
    return json_build_object('ok', false, 'message', 'Trop d''essais depuis ce réseau. Attends un peu, ou demande de l''aide à ton enseignant·e.');
  end if;
  update court_circuit.eleves x set vu_le = now(), jeton = gen_random_uuid() where x.code = c returning * into e;
  if e.id is null then
    perform commun.noter_echec('court_circuit', 'eleve');
    perform pg_sleep(0.3);
    return json_build_object('ok', false, 'message', 'Ce code n''existe pas. Vérifie-le dans ton cahier.');
  end if;
  perform court_circuit.menage_si_besoin();
  return json_build_object('ok', true, 'pseudo', e.pseudo, 'code_affiche', e.code_affiche, 'jeton', e.jeton);
end $$;

-- Reprendre sa session : son pseudo, son code et ses programmes (un seul objet JSON).
create or replace function public.cc_reprise(p_jeton uuid)
returns json
language plpgsql volatile security definer
set search_path = ''
as $$
declare v_eleve uuid := court_circuit.eleve_par_jeton(p_jeton); e court_circuit.eleves;
begin
  if v_eleve is null then
    return json_build_object('ok', false, 'message', 'Ta session a expiré : entre de nouveau ton code.');
  end if;
  select * into e from court_circuit.eleves x where x.id = v_eleve;
  perform court_circuit.menage_si_besoin();
  return json_build_object('ok', true, 'pseudo', e.pseudo, 'code_affiche', e.code_affiche,
    'programmes', coalesce((select json_agg(json_build_object('id', p.id, 'nom', p.nom, 'texte', p.texte, 'modifie_le', p.modifie_le) order by p.modifie_le desc)
                            from court_circuit.programmes p where p.eleve_id = e.id), '[]'::json));
end $$;

comment on function public.cc_connexion(text) is
  'Court-circuit, entrée. Entre avec son code ; renvoie le pseudo, le code et le jeton. 20 échecs au plus par heure et par réseau.';
comment on function public.cc_reprise(uuid) is
  'Court-circuit, entrée. Avec le jeton : le pseudo, le code et les programmes gardés de l''élève, en un seul objet JSON.';

alter table court_circuit.eleves drop constraint if exists eleves_challenges_reussis_connus;
alter table court_circuit.eleves drop column if exists challenges_reussis;
comment on table court_circuit.eleves is
  'Court-circuit. Un compte par élève : son prénom ou son pseudo, son code (2 mots et 3 chiffres) et son jeton de session. Effacé 12 mois après la dernière visite. Données d''élèves : oui.';

-- Contrôle : les six fonctions d'entrée de 0001, appelables par anon seul, et plus de colonne. Sinon, arrêt.
do $$
begin
  if (select count(*) from pg_catalog.pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cc\_%'
      and has_function_privilege('anon', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute')) <> 6 then
    raise exception 'Les six fonctions d''entrée cc_… de 0001 ne sont pas appelables par anon seul : arrêt, rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_catalog.pg_attribute a where a.attrelid = 'court_circuit.eleves'::regclass and a.attname = 'challenges_reussis' and not a.attisdropped) then
    raise exception 'La colonne challenges_reussis est encore là : arrêt, rien n''a été modifié.';
  end if;
end $$;

commit;
