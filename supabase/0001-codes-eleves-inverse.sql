begin;
-- =============================================================================
--  Court-circuit, inverse de la migration 0001 (court_circuit_0001_codes_eleves)
--  Projet Supabase cukahpyqkljiddmimpyi (« Babash - applications »)
--  Nom de migration : court_circuit_0001_codes_eleves_inverse
-- =============================================================================
--  **ATTENTION : ce retour efface les données.** Les comptes des élèves (prénom
--  ou pseudo, code) et tous leurs programmes gardés disparaissent, sans retour
--  possible. Avant de le lancer, l'enseignant exporte les tables
--  court_circuit.eleves et court_circuit.programmes s'il veut les garder
--  (Table Editor, export ; règle M8). L'export reste hors du dépôt.
--
--  Ce que ce fichier retire : les six fonctions d'entrée public.cc_…, le schéma
--  court_circuit (ses tables et ses fonctions internes), et les compteurs
--  d'essais de Court-circuit dans commun.essais. Rien d'autre.
--
--  Avant de le lancer : remettre COMPTES à false dans config.js et publier la
--  page, pour qu'elle n'appelle plus ces fonctions (règle M6).
-- =============================================================================

-- Garde-fou : le bon rôle, et rien d'autre que les objets de 0001 dans le
-- schéma court_circuit, ni objet d'ailleurs qui s'en sert. Sinon, arrêt avant
-- toute modification (le drop ... cascade ne retire alors que ces objets).
do $$
declare d text;
begin
  if current_user <> 'postgres' then
    raise exception 'À lancer en postgres (éditeur SQL de Supabase ou apply_migration), pas en % : arrêt, rien n''a été modifié.', current_user;
  end if;
  if to_regnamespace('court_circuit') is null then
    return;
  end if;
  if coalesce(obj_description(to_regnamespace('court_circuit'), 'pg_namespace'), '') not like 'Court-circuit%' then
    raise exception 'Le schéma court_circuit ne vient pas de cette migration : arrêt, rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_catalog.pg_class c where c.relnamespace = 'court_circuit'::regnamespace
             and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S', 'c') and c.relname not in ('mots', 'eleves', 'programmes', 'menage'))
     or exists (select 1 from pg_catalog.pg_proc p where p.pronamespace = 'court_circuit'::regnamespace
                and p.proname not in ('normaliser_code', 'nouveau_code', 'eleve_par_jeton', 'menage_si_besoin')) then
    raise exception 'Le schéma court_circuit contient d''autres objets que ceux de 0001 : une migration plus récente s''en sert. La défaire d''abord. Arrêt, rien n''a été modifié.';
  end if;
  select string_agg(distinct o, ', ') into d from (
    select v.oid::regclass::text as o
    from pg_catalog.pg_depend x
    join pg_catalog.pg_rewrite r on r.oid = x.objid
    join pg_catalog.pg_class v on v.oid = r.ev_class
    where x.classid = 'pg_catalog.pg_rewrite'::regclass and v.relnamespace <> 'court_circuit'::regnamespace
      and x.refobjid in (select c.oid from pg_catalog.pg_class c where c.relnamespace = 'court_circuit'::regnamespace)
    union all
    select p.oid::regprocedure::text
    from pg_catalog.pg_proc p
    where p.pronamespace <> 'court_circuit'::regnamespace and p.prosrc ~ '\mcourt_circuit\.'
      and not (p.pronamespace = 'public'::regnamespace
               and p.proname in ('cc_solo', 'cc_connexion', 'cc_reprise', 'cc_enregistrer', 'cc_supprimer', 'cc_effacer_moi'))
  ) s;
  if d is not null then
    raise exception 'Des objets hors du schéma se servent de court_circuit (%) : les défaire d''abord. Arrêt, rien n''a été modifié.', d;
  end if;
end $$;

drop function if exists public.cc_solo(text);
drop function if exists public.cc_connexion(text);
drop function if exists public.cc_reprise(uuid);
drop function if exists public.cc_enregistrer(uuid, text, text, uuid);
drop function if exists public.cc_supprimer(uuid, uuid);
drop function if exists public.cc_effacer_moi(uuid);

drop schema if exists court_circuit cascade;

delete from commun.essais where application = 'court_circuit';

commit;
