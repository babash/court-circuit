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

drop function if exists public.cc_solo(text);
drop function if exists public.cc_connexion(text);
drop function if exists public.cc_reprise(uuid);
drop function if exists public.cc_enregistrer(uuid, text, text, uuid);
drop function if exists public.cc_supprimer(uuid, uuid);
drop function if exists public.cc_effacer_moi(uuid);

drop schema if exists court_circuit cascade;

delete from commun.essais where application = 'court_circuit';

commit;
