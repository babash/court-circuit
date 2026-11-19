begin;
-- =============================================================================
--  Court-circuit, migration 0002 : la progression de l'entraînement
--  Projet Supabase cukahpyqkljiddmimpyi (« Babash - applications »)
--  Nom de migration : court_circuit_0002_progression
-- =============================================================================
--  Pourquoi : l'entraînement passe à 10 challenges (T93), et l'enseignant veut
--  que la progression soit « également sauvegardée sur supabase si compte »
--  (19/11, 11:55). C'est la règle 21 : on n'enregistre qu'un pseudo ou un
--  prénom, et la progression. Sans code élève, rien ne change : la progression
--  reste sur l'appareil.
--
--  Ce que ce fichier change, et rien d'autre :
--   - une colonne dans court_circuit.eleves : challenges_reussis, la liste des
--     challenges et des hauts-faits réussis (identifiants de la liste connue,
--     10 au plus, sans date), avec sa contrainte de validité ;
--   - le commentaire de la table court_circuit.eleves (il cite la progression) ;
--   - cc_connexion et cc_reprise renvoient aussi la progression : un champ en
--     plus, « reussis ». Rien n'est retiré ni renommé ;
--   - une fonction d'entrée dans public, appelable par anon seulement :
--       cc_progression(p_jeton, p_reussis), qui réunit la liste reçue et celle
--       de la base (un challenge réussi quelque part compte partout) et renvoie
--       la liste complète.
--  Ni table, ni fonction interne, ni droit nouveaux sur le schéma court_circuit.
--
--  Les données d'élèves : la liste des challenges réussis, rien d'autre (ni
--  date, ni code, ni programme). Elle est effacée avec le compte : par
--  « Effacer mes données » (cc_effacer_moi) et par le ménage des comptes sans
--  visite depuis 12 mois, sans rien changer à ces fonctions.
--
--  Il faut d'abord 0001-codes-eleves.sql (court_circuit_0001_codes_eleves).
--  Le fichier peut être relancé : il ne crée que ce qui manque.
--  Retour en arrière : 0002-progression-inverse.sql. Mode d'emploi : LISEZMOI.md.
-- =============================================================================

-- Garde-fou : le bon rôle, la migration 0001 déjà appliquée (le schéma, la
-- table et les fonctions de Court-circuit, reconnus par leur commentaire), et
-- aucun objet du même nom venu d'ailleurs. Sinon, arrêt avant toute modification.
do $$
begin
  if current_user <> 'postgres' then
    raise exception 'À lancer en postgres (éditeur SQL de Supabase ou apply_migration), pas en % : arrêt, rien n''a été modifié.', current_user;
  end if;
  if to_regnamespace('court_circuit') is null
     or coalesce(obj_description(to_regnamespace('court_circuit'), 'pg_namespace'), '') not like 'Court-circuit%'
     or to_regclass('court_circuit.eleves') is null
     or coalesce(obj_description(to_regclass('court_circuit.eleves'), 'pg_class'), '') not like 'Court-circuit.%' then
    raise exception 'La migration 0001 de Court-circuit (court_circuit_0001_codes_eleves) n''est pas appliquée dans ce projet : arrêt, rien n''a été modifié.';
  end if;
  if to_regprocedure('public.cc_connexion(text)') is null or to_regprocedure('public.cc_reprise(uuid)') is null
     or to_regprocedure('public.cc_effacer_moi(uuid)') is null or to_regprocedure('court_circuit.eleve_par_jeton(uuid)') is null then
    raise exception 'Les fonctions de la migration 0001 manquent (cc_connexion, cc_reprise, cc_effacer_moi, court_circuit.eleve_par_jeton) : arrêt, rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_catalog.pg_attribute a where a.attrelid = 'court_circuit.eleves'::regclass and a.attname = 'challenges_reussis' and not a.attisdropped
             and coalesce(col_description(a.attrelid, a.attnum), '') not like 'Court-circuit%') then
    raise exception 'court_circuit.eleves a déjà une colonne challenges_reussis qui ne vient pas de cette migration : arrêt, rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_catalog.pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'cc_progression'
             and coalesce(obj_description(p.oid, 'pg_proc'), '') not like 'Court-circuit%') then
    raise exception 'Une fonction public.cc_progression existe déjà et ne vient pas de cette migration : arrêt, rien n''a été modifié.';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1. La colonne : les challenges réussis, sans date
-- -----------------------------------------------------------------------------
alter table court_circuit.eleves add column if not exists challenges_reussis text[] not null default '{}'::text[];
do $$
begin
  if not exists (select 1 from pg_catalog.pg_constraint c where c.conrelid = 'court_circuit.eleves'::regclass and c.conname = 'eleves_challenges_reussis_connus') then
    alter table court_circuit.eleves add constraint eleves_challenges_reussis_connus check (
      cardinality(challenges_reussis) <= 10
      and coalesce(array_ndims(challenges_reussis), 1) = 1
      and challenges_reussis <@ array['ligne', 'escalier', 'mur', 'montee', 'tondeuse', 'slalom', 'serpent', 'stalactites', 'creneaux', 'grotte']::text[]);
  end if;
end $$;
comment on column court_circuit.eleves.challenges_reussis is
  'Court-circuit. Les challenges et les hauts-faits de l''entraînement que l''élève a réussis : des identifiants de la liste connue (ligne, escalier, mur, montee, tondeuse, slalom, serpent, stalactites, creneaux, grotte), 10 au plus, sans date. Effacée avec le compte.';
comment on table court_circuit.eleves is
  'Court-circuit. Un compte par élève : son prénom ou son pseudo, son code (2 mots et 3 chiffres), son jeton de session et sa progression à l''entraînement (les challenges réussis). Effacé 12 mois après la dernière visite. Données d''élèves : oui.';

-- -----------------------------------------------------------------------------
-- 2. Les fonctions d'entrée : cc_connexion et cc_reprise renvoient aussi la
--    progression (un champ en plus), et cc_progression la garde.
--    Même signature, même type de retour : les droits restent ceux de 0001.
-- -----------------------------------------------------------------------------

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
  return json_build_object('ok', true, 'pseudo', e.pseudo, 'code_affiche', e.code_affiche, 'jeton', e.jeton,
    'reussis', to_json(e.challenges_reussis));
end $$;

-- Reprendre sa session : son pseudo, son code, ses programmes et sa progression (un seul objet JSON).
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
                            from court_circuit.programmes p where p.eleve_id = e.id), '[]'::json),
    'reussis', to_json(e.challenges_reussis));
end $$;

-- Garder sa progression : la liste reçue est réunie à celle de la base, jamais
-- réduite (un challenge réussi reste réussi), rangée dans l'ordre des challenges.
-- La liste vide est permise : elle renvoie seulement la progression gardée.
create or replace function public.cc_progression(p_jeton uuid, p_reussis text[])
returns json
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  connus constant text[] := array['ligne', 'escalier', 'mur', 'montee', 'tondeuse', 'slalom', 'serpent', 'stalactites', 'creneaux', 'grotte']::text[];
  v_eleve uuid; v text[];
begin
  if p_reussis is null or cardinality(p_reussis) > 10 or coalesce(array_ndims(p_reussis), 1) <> 1
     or array_position(p_reussis, null) is not null or not (p_reussis <@ connus) then
    return json_build_object('ok', false, 'message', 'Cette progression n''est pas valable : elle n''a pas été gardée en ligne.');
  end if;
  v_eleve := court_circuit.eleve_par_jeton(p_jeton);
  if v_eleve is null then
    return json_build_object('ok', false, 'message', 'Ta session a expiré : entre de nouveau ton code.');
  end if;
  update court_circuit.eleves e
     set challenges_reussis = array(select k.c from unnest(connus) with ordinality as k(c, rang)
                                     where k.c = any(e.challenges_reussis) or k.c = any(p_reussis) order by k.rang)
   where e.id = v_eleve
  returning e.challenges_reussis into v;
  return json_build_object('ok', true, 'reussis', to_json(v));
end $$;

revoke all on function public.cc_progression(uuid, text[]) from public, anon, authenticated;
grant execute on function public.cc_progression(uuid, text[]) to anon;
comment on function public.cc_connexion(text) is
  'Court-circuit, entrée. Entre avec son code ; renvoie le pseudo, le code, le jeton et la progression (reussis). 20 échecs au plus par heure et par réseau.';
comment on function public.cc_reprise(uuid) is
  'Court-circuit, entrée. Avec le jeton : le pseudo, le code, les programmes gardés et la progression (reussis) de l''élève, en un seul objet JSON.';
comment on function public.cc_progression(uuid, text[]) is
  'Court-circuit, entrée. Avec le jeton : réunit les challenges réussis reçus (identifiants connus, 10 au plus) à ceux de la base, et renvoie la liste complète.';

-- -----------------------------------------------------------------------------
-- 3. Contrôle : rien d'ouvert à l'API, sauf les sept fonctions d'entrée,
--    et la colonne avec sa contrainte. Sinon, arrêt : rien n'est appliqué.
-- -----------------------------------------------------------------------------
do $$
begin
  if has_schema_privilege('anon', 'court_circuit', 'usage') or has_schema_privilege('authenticated', 'court_circuit', 'usage') then
    raise exception 'Le schéma court_circuit est ouvert à anon ou à authenticated : arrêt, rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_catalog.pg_class c where c.relnamespace = 'court_circuit'::regnamespace and c.relkind = 'r'
             and (not c.relrowsecurity
                  or has_table_privilege('anon', c.oid, 'select, insert, update, delete, truncate, references, trigger, maintain')
                  or has_table_privilege('authenticated', c.oid, 'select, insert, update, delete, truncate, references, trigger, maintain'))) then
    raise exception 'Une table de court_circuit est ouverte, ou sans RLS : arrêt, rien n''a été modifié.';
  end if;
  if has_column_privilege('anon', 'court_circuit.eleves', 'challenges_reussis', 'select, insert, update, references')
     or has_column_privilege('authenticated', 'court_circuit.eleves', 'challenges_reussis', 'select, insert, update, references') then
    raise exception 'La colonne challenges_reussis est ouverte à l''API : arrêt, rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_catalog.pg_proc p where p.pronamespace = 'court_circuit'::regnamespace
             and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) then
    raise exception 'Une fonction interne de court_circuit est appelable par l''API : arrêt, rien n''a été modifié.';
  end if;
  if (select count(*) from pg_catalog.pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cc\_%'
      and has_function_privilege('anon', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute')) <> 7 then
    raise exception 'Les sept fonctions d''entrée cc_… ne sont pas appelables par anon seul : arrêt, rien n''a été modifié.';
  end if;
  if not exists (select 1 from pg_catalog.pg_proc p where p.oid = 'public.cc_progression(uuid, text[])'::regprocedure
                 and p.prosecdef and p.proconfig = array['search_path=""']) then
    raise exception 'cc_progression doit être security definer, avec un search_path vide : arrêt, rien n''a été modifié.';
  end if;
  if not exists (select 1 from pg_catalog.pg_constraint c where c.conrelid = 'court_circuit.eleves'::regclass and c.conname = 'eleves_challenges_reussis_connus' and c.contype = 'c') then
    raise exception 'La contrainte eleves_challenges_reussis_connus manque : arrêt, rien n''a été modifié.';
  end if;
end $$;

commit;
