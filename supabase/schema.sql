begin;
-- =============================================================================
--  Court-circuit : le script complet de la base (code de l'élève et programmes gardés)
-- =============================================================================
--  À quoi il sert : installer la base de Court-circuit dans un projet Supabase
--  neuf (la copie d'un·e collègue), APRÈS le socle commun du site
--  (supabase/schema.sql du dépôt Babash-NSI-SNT), qui crée le compteur d'essais.
--  Il réunit les migrations de ce dossier, dans l'ordre : aujourd'hui, la seule
--  0001-codes-eleves.sql, recopiée telle quelle à partir du garde-fou.
--  Mode d'emploi : LISEZMOI.md. Ensuite : COMPTES: true dans config.js.
-- =============================================================================

-- Garde-fou : le bon rôle, le schéma commun et pgcrypto présents, et aucun
-- objet du même nom venu d'ailleurs. Sinon, arrêt avant toute modification.
do $$
declare o text;
begin
  if current_user <> 'postgres' then
    raise exception 'À lancer en postgres (éditeur SQL de Supabase ou apply_migration), pas en % : arrêt, rien n''a été modifié.', current_user;
  end if;
  if to_regprocedure('commun.essai_permis(text, text, integer)') is null or to_regprocedure('commun.noter_echec(text, text)') is null then
    raise exception 'Le schéma commun manque (migration base_unique_0003_schema_commun, ou supabase/schema.sql du site) : arrêt, rien n''a été modifié.';
  end if;
  if to_regprocedure('extensions.gen_random_bytes(integer)') is null then
    raise exception 'L''extension pgcrypto manque dans le schéma extensions : arrêt, rien n''a été modifié.';
  end if;
  if to_regnamespace('court_circuit') is not null
     and coalesce(obj_description(to_regnamespace('court_circuit'), 'pg_namespace'), '') not like 'Court-circuit%' then
    raise exception 'Un schéma court_circuit existe déjà et ne vient pas de cette migration : arrêt, rien n''a été modifié.';
  end if;
  foreach o in array array['court_circuit.mots', 'court_circuit.eleves', 'court_circuit.programmes', 'court_circuit.menage'] loop
    if to_regclass(o) is not null and coalesce(obj_description(to_regclass(o), 'pg_class'), '') not like 'Court-circuit.%' then
      raise exception '% existe déjà et ne vient pas de cette migration : arrêt, rien n''a été modifié.', o;
    end if;
  end loop;
  if exists (select 1 from pg_catalog.pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cc\_%'
             and coalesce(obj_description(p.oid, 'pg_proc'), '') not like 'Court-circuit%') then
    raise exception 'Une fonction public.cc_… existe déjà et ne vient pas de cette migration : arrêt, rien n''a été modifié.';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1. Le schéma
-- -----------------------------------------------------------------------------
create schema if not exists court_circuit authorization postgres;
revoke all on schema court_circuit from public, anon, authenticated;
comment on schema court_circuit is
  'Court-circuit (jeu de duel de robots en Python) : le code de chaque élève et ses programmes gardés. Jamais exposé à l''API ; aucun droit pour anon ni pour authenticated.';

-- -----------------------------------------------------------------------------
-- 2. Les tables
-- -----------------------------------------------------------------------------
create table if not exists court_circuit.mots (
  rang smallint primary key check (rang between 0 and 63),
  mot  text not null unique check (mot ~ '^[A-Z]{4,8}$')
);
alter table court_circuit.mots enable row level security;
revoke all on court_circuit.mots from public, anon, authenticated;
comment on table court_circuit.mots is
  'Court-circuit. Les 64 mots des codes des élèves (thème : l''atelier, outils et électricité). Aucun n''est dans la liste d''une autre application, ni le début d''un autre mot. Données d''élèves : non.';
comment on column court_circuit.mots.rang is 'La place du mot dans la liste, de 0 à 63 : le tirage d''un octet modulo 64 donne le rang.';
comment on column court_circuit.mots.mot is 'Le mot, en majuscules sans accent, de 4 à 8 lettres.';
insert into court_circuit.mots (rang, mot)
select (o - 1)::smallint, m from unnest(array[
  'MARTEAU', 'PINCE', 'SCIE', 'ENCLUME', 'PERCEUSE', 'BOULON', 'ECROU', 'RIVET',
  'CHEVILLE', 'RESSORT', 'LEVIER', 'TREUIL', 'ROUAGE', 'PISTON', 'MOTEUR', 'DYNAMO',
  'FUSIBLE', 'BOBINE', 'AIMANT', 'DIODE', 'PRISE', 'AMPOULE', 'LAMPE', 'TORCHE',
  'SOUDURE', 'CUIVRE', 'NICKEL', 'BRONZE', 'CHROME', 'VOLT', 'WATT', 'AMPERE',
  'TENSION', 'COURANT', 'CIRCUIT', 'BATTERIE', 'RELAIS', 'FICHE', 'NEON', 'CAPTEUR',
  'TENAILLE', 'SPATULE', 'EQUERRE', 'NIVEAU', 'REGLE', 'CRAYON', 'GOMME', 'ROULEAU',
  'COLLE', 'AGRAFE', 'PUNAISE', 'VERNIS', 'MASTIC', 'TRUELLE', 'BROUETTE', 'ECHELLE',
  'ETABLI', 'SOURIS', 'PIXEL', 'TURBINE', 'HELICE', 'TABLIER', 'COPEAU', 'PLANCHE'
]) with ordinality as l(m, o)
on conflict (rang) do nothing;

create table if not exists court_circuit.eleves (
  id           uuid primary key default gen_random_uuid(),
  pseudo       text not null check (char_length(pseudo) between 2 and 24),
  code         text not null unique check (code ~ '^[A-Z]{8,16}[0-9]{3,4}$'),
  code_affiche text not null check (code_affiche ~ '^[A-Z]{4,8}-[A-Z]{4,8}-[0-9]{3,4}$'),
  jeton        uuid not null unique default gen_random_uuid(),
  cree_le      timestamptz not null default now(),
  vu_le        timestamptz not null default now()
);
create index if not exists eleves_vu_le on court_circuit.eleves (vu_le);
alter table court_circuit.eleves enable row level security;
revoke all on court_circuit.eleves from public, anon, authenticated;
comment on table court_circuit.eleves is
  'Court-circuit. Un compte par élève : son prénom ou son pseudo, son code (2 mots et 3 chiffres) et son jeton de session. Effacé 12 mois après la dernière visite. Données d''élèves : oui.';
comment on column court_circuit.eleves.id is 'L''identifiant du compte, tiré au hasard ; il ne change jamais.';
comment on column court_circuit.eleves.pseudo is 'Le prénom ou le pseudo choisi par l''élève, de 2 à 24 caractères. Jamais le nom de famille.';
comment on column court_circuit.eleves.code is 'Le code de l''élève sous sa forme canonique (PINCEDIODE482) : c''est lui qu''on cherche. Secret : seule la fonction de l''élève le renvoie, à lui ou à elle.';
comment on column court_circuit.eleves.code_affiche is 'Le même code tel qu''on l''affiche (PINCE-DIODE-482).';
comment on column court_circuit.eleves.jeton is 'Le jeton de session, tiré au hasard : la page le garde un jour et l''envoie à chaque appel.';
comment on column court_circuit.eleves.cree_le is 'La date de création du compte.';
comment on column court_circuit.eleves.vu_le is 'La date de la dernière visite : le compte est effacé 12 mois après.';

create table if not exists court_circuit.programmes (
  id         uuid primary key default gen_random_uuid(),
  eleve_id   uuid not null references court_circuit.eleves (id) on delete cascade,
  nom        text not null check (char_length(nom) between 1 and 40),
  texte      text not null check (char_length(texte) <= 4000),
  cree_le    timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists programmes_eleve on court_circuit.programmes (eleve_id, modifie_le desc);
alter table court_circuit.programmes enable row level security;
revoke all on court_circuit.programmes from public, anon, authenticated;
comment on table court_circuit.programmes is
  'Court-circuit. Les programmes Python gardés par chaque élève (« Mes codes ») : 30 au plus par élève, 4 000 caractères chacun. Effacés avec le compte. Données d''élèves : oui.';
comment on column court_circuit.programmes.id is 'L''identifiant du programme.';
comment on column court_circuit.programmes.eleve_id is 'Le compte de l''élève (court_circuit.eleves).';
comment on column court_circuit.programmes.nom is 'Le nom donné par l''élève, de 1 à 40 caractères.';
comment on column court_circuit.programmes.texte is 'Le programme Python, 4 000 caractères au plus.';
comment on column court_circuit.programmes.cree_le is 'La date où le programme a été gardé la première fois.';
comment on column court_circuit.programmes.modifie_le is 'La date de sa dernière mise à jour.';

create table if not exists court_circuit.menage (
  seule_ligne boolean primary key default true check (seule_ligne),
  fait_le     timestamptz not null default now()
);
alter table court_circuit.menage enable row level security;
revoke all on court_circuit.menage from public, anon, authenticated;
insert into court_circuit.menage (fait_le) values (now()) on conflict (seule_ligne) do nothing;
comment on table court_circuit.menage is
  'Court-circuit. La date du dernier ménage des comptes (une seule ligne) : il se fait au plus une fois par heure. Données d''élèves : non.';
comment on column court_circuit.menage.seule_ligne is 'Toujours vrai : garantit que la table n''a qu''une ligne.';
comment on column court_circuit.menage.fait_le is 'La date du dernier ménage.';

-- -----------------------------------------------------------------------------
-- 3. Les fonctions internes : aucun droit pour personne
-- -----------------------------------------------------------------------------

-- La forme canonique d'un code : majuscules, sans accent, sans séparateur.
-- (La page lit le code avec plus de tolérance : O et 0, I et 1, mots proches.)
create or replace function court_circuit.normaliser_code(p_code text)
returns text
language sql immutable
set search_path = ''
as $$
  select regexp_replace(upper(translate(replace(replace(coalesce(p_code, ''), 'œ', 'oe'), 'Œ', 'OE'),
    'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY')), '[^A-Z0-9]', '', 'g')
$$;

-- Un code neuf : 2 mots tirés au hasard (un octet modulo 64, sans biais),
-- 3 chiffres tirés par rejet (sans biais), jamais un code déjà pris.
create or replace function court_circuit.nouveau_code(out code text, out code_affiche text)
language plpgsql volatile
set search_path = ''
as $$
declare b bytea; v integer; w1 text; w2 text; d text;
begin
  loop
    b := extensions.gen_random_bytes(4);
    v := get_byte(b, 2) * 256 + get_byte(b, 3);
    continue when v >= 64000;
    select m.mot into w1 from court_circuit.mots m where m.rang = get_byte(b, 0) % 64;
    select m.mot into w2 from court_circuit.mots m where m.rang = get_byte(b, 1) % 64;
    d := lpad((v % 1000)::text, 3, '0');
    code := w1 || w2 || d;
    code_affiche := w1 || '-' || w2 || '-' || d;
    exit when not exists (select 1 from court_circuit.eleves e where e.code = nouveau_code.code);
  end loop;
end $$;

-- Le compte qui porte ce jeton (et la visite du jour), ou null.
create or replace function court_circuit.eleve_par_jeton(p_jeton uuid)
returns uuid
language sql volatile
set search_path = ''
as $$
  update court_circuit.eleves e set vu_le = now() where e.jeton = p_jeton returning e.id
$$;

-- Au plus une fois par heure : efface les comptes sans visite depuis 12 mois
-- (leurs programmes partent avec eux). Renvoie le nombre de comptes effacés.
create or replace function court_circuit.menage_si_besoin()
returns integer
language plpgsql volatile
set search_path = ''
as $$
declare n integer := 0;
begin
  update court_circuit.menage set fait_le = now() where fait_le < now() - interval '1 hour';
  if found then
    with efface as (delete from court_circuit.eleves e where e.vu_le < now() - interval '12 months' returning 1)
    select count(*)::integer into n from efface;
  end if;
  return n;
end $$;

revoke all on function court_circuit.normaliser_code(text), court_circuit.nouveau_code(),
  court_circuit.eleve_par_jeton(uuid), court_circuit.menage_si_besoin()
  from public, anon, authenticated;
comment on function court_circuit.normaliser_code(text) is
  'Court-circuit, interne. La forme canonique d''un code : majuscules, sans accent, sans séparateur.';
comment on function court_circuit.nouveau_code() is
  'Court-circuit, interne. Tire un code neuf (2 mots de court_circuit.mots et 3 chiffres, sans biais) qu''aucun compte n''a encore.';
comment on function court_circuit.eleve_par_jeton(uuid) is
  'Court-circuit, interne. Le compte qui porte ce jeton (ou null), et la date de visite mise à jour.';
comment on function court_circuit.menage_si_besoin() is
  'Court-circuit, interne. Au plus une fois par heure, efface les comptes sans visite depuis 12 mois, avec leurs programmes.';

-- -----------------------------------------------------------------------------
-- 4. Les fonctions d'entrée : public, security definer, appelables par anon.
--    Elles bornent chaque paramètre et répondent { "ok": false, "message" }
--    plutôt que de lever une exception (qui annulerait le compteur d'essais).
-- -----------------------------------------------------------------------------

-- Créer son code (sans classe) : 60 créations au plus par heure et par réseau.
create or replace function public.cc_solo(p_pseudo text)
returns json
language plpgsql volatile security definer
set search_path = ''
as $$
declare ps text := btrim(regexp_replace(left(coalesce(p_pseudo, ''), 100), '\s+', ' ', 'g')); n record; e court_circuit.eleves;
begin
  -- 2 à 24 caractères, sans caractère de contrôle ni caractère invisible (écrits par leur code)
  if char_length(ps) < 2 or char_length(ps) > 24
     or ps ~ ('[' || chr(1) || '-' || chr(31) || chr(127) || '-' || chr(159) || chr(173) || chr(8203) || '-' || chr(8207)
              || chr(8232) || '-' || chr(8238) || chr(8288) || '-' || chr(8303) || chr(65279) || ']') then
    return json_build_object('ok', false, 'message', 'Écris un prénom ou un pseudo de 2 à 24 caractères (jamais ton nom de famille).');
  end if;
  if not commun.essai_permis('court_circuit', 'creation', 60) then
    return json_build_object('ok', false, 'message', 'Trop de codes créés depuis ce réseau : attends un peu, ou demande de l''aide à ton enseignant·e.');
  end if;
  perform commun.noter_echec('court_circuit', 'creation');
  perform court_circuit.menage_si_besoin();
  select * into n from court_circuit.nouveau_code();
  insert into court_circuit.eleves (pseudo, code, code_affiche) values (ps, n.code, n.code_affiche) returning * into e;
  return json_build_object('ok', true, 'pseudo', e.pseudo, 'code_affiche', e.code_affiche, 'jeton', e.jeton);
end $$;

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

-- Garder un programme : un nouveau, ou la mise à jour d'un programme du même nom
-- (ou de p_id). 30 programmes au plus par élève.
create or replace function public.cc_enregistrer(p_jeton uuid, p_nom text, p_texte text, p_id uuid default null)
returns json
language plpgsql volatile security definer
set search_path = ''
as $$
declare v_eleve uuid; nm text := btrim(regexp_replace(left(coalesce(p_nom, ''), 100), '\s+', ' ', 'g')); pid uuid;
begin
  if char_length(nm) < 1 or char_length(nm) > 40 then
    return json_build_object('ok', false, 'message', 'Donne un nom de 1 à 40 caractères à ton programme.');
  end if;
  if p_texte is null or char_length(p_texte) > 4000 then
    return json_build_object('ok', false, 'message', 'Un programme gardé a 4 000 caractères au plus.');
  end if;
  v_eleve := court_circuit.eleve_par_jeton(p_jeton);
  if v_eleve is null then
    return json_build_object('ok', false, 'message', 'Ta session a expiré : entre de nouveau ton code.');
  end if;
  select p.id into pid from court_circuit.programmes p
   where p.eleve_id = v_eleve and (p.id = p_id or (p_id is null and lower(p.nom) = lower(nm)))
   limit 1;
  if pid is not null then
    update court_circuit.programmes p set nom = nm, texte = p_texte, modifie_le = now() where p.id = pid;
    return json_build_object('ok', true, 'id', pid, 'nouveau', false);
  end if;
  if (select count(*) from court_circuit.programmes p where p.eleve_id = v_eleve) >= 30 then
    return json_build_object('ok', false, 'message', 'Tu as déjà 30 programmes gardés : supprimes-en un avant d''en garder un autre.');
  end if;
  insert into court_circuit.programmes (eleve_id, nom, texte) values (v_eleve, nm, p_texte) returning programmes.id into pid;
  return json_build_object('ok', true, 'id', pid, 'nouveau', true);
end $$;

-- Supprimer un de ses programmes.
create or replace function public.cc_supprimer(p_jeton uuid, p_id uuid)
returns json
language plpgsql volatile security definer
set search_path = ''
as $$
declare v_eleve uuid := court_circuit.eleve_par_jeton(p_jeton);
begin
  if v_eleve is null then
    return json_build_object('ok', false, 'message', 'Ta session a expiré : entre de nouveau ton code.');
  end if;
  delete from court_circuit.programmes p where p.id = p_id and p.eleve_id = v_eleve;
  return json_build_object('ok', found);
end $$;

-- Effacer son compte et tous ses programmes (« Effacer mes données »).
create or replace function public.cc_effacer_moi(p_jeton uuid)
returns json
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  delete from court_circuit.eleves e where e.jeton = p_jeton;
  return json_build_object('ok', found);
end $$;

revoke all on function public.cc_solo(text), public.cc_connexion(text), public.cc_reprise(uuid),
  public.cc_enregistrer(uuid, text, text, uuid), public.cc_supprimer(uuid, uuid), public.cc_effacer_moi(uuid)
  from public, anon, authenticated;
grant execute on function public.cc_solo(text), public.cc_connexion(text), public.cc_reprise(uuid),
  public.cc_enregistrer(uuid, text, text, uuid), public.cc_supprimer(uuid, uuid), public.cc_effacer_moi(uuid)
  to anon;
comment on function public.cc_solo(text) is
  'Court-circuit, entrée. Crée le compte d''un·e élève (prénom ou pseudo) et renvoie son code et son jeton. 60 créations au plus par heure et par réseau.';
comment on function public.cc_connexion(text) is
  'Court-circuit, entrée. Entre avec son code ; renvoie le pseudo, le code et le jeton. 20 échecs au plus par heure et par réseau.';
comment on function public.cc_reprise(uuid) is
  'Court-circuit, entrée. Avec le jeton : le pseudo, le code et les programmes gardés de l''élève, en un seul objet JSON.';
comment on function public.cc_enregistrer(uuid, text, text, uuid) is
  'Court-circuit, entrée. Avec le jeton : garde un programme (nouveau, ou mis à jour s''il a le même nom ou l''identifiant donné). 30 au plus par élève.';
comment on function public.cc_supprimer(uuid, uuid) is
  'Court-circuit, entrée. Avec le jeton : supprime un programme de l''élève.';
comment on function public.cc_effacer_moi(uuid) is
  'Court-circuit, entrée. Avec le jeton : efface le compte et tous ses programmes.';

-- -----------------------------------------------------------------------------
-- 5. Contrôle : rien d'ouvert à l'API, sauf les six fonctions d'entrée.
--    Sinon, arrêt : rien n'est appliqué.
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
  if exists (select 1 from pg_catalog.pg_proc p where p.pronamespace = 'court_circuit'::regnamespace
             and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) then
    raise exception 'Une fonction interne de court_circuit est appelable par l''API : arrêt, rien n''a été modifié.';
  end if;
  if (select count(*) from pg_catalog.pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cc\_%'
      and has_function_privilege('anon', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute')) <> 6 then
    raise exception 'Les six fonctions d''entrée cc_… ne sont pas appelables par anon seul : arrêt, rien n''a été modifié.';
  end if;
  if (select count(*) from court_circuit.mots) <> 64 then
    raise exception 'court_circuit.mots doit avoir 64 mots : arrêt, rien n''a été modifié.';
  end if;
end $$;

commit;
