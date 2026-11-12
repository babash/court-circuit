# Court-circuit : le code de l'élève et ses programmes gardés

Ce dossier contient les migrations de la base de Court-circuit. Le jeu lui-même n'en a pas besoin : les duels passent par les canaux temps réel de Supabase, sans table. Ces fichiers servent seulement au **code élève** et à **« Mes codes »** : un·e élève qui le veut garde ses programmes en ligne et les retrouve sur n'importe quel ordinateur avec son code (règle 21).

- **Le projet :** `cukahpyqkljiddmimpyi` (« Babash - applications »), la base unique des applications du site.
- **Le schéma :** `court_circuit`, que l'API n'expose pas. Les fonctions d'entrée sont dans `public`, avec le préfixe `cc_`.
- **Les règles suivies :** `architecture/regles-supabase.md` (P1 à P10, M1 à M8) et la spécification des codes, `architecture/codes-acces.md`.
- **Il faut d'abord le socle commun** (`supabase/0003-schema-commun.sql` du dépôt du site, [`babash/Babash-NSI-SNT`](https://github.com/babash/Babash-NSI-SNT), appliqué le 11/11) : le compteur d'essais `commun.essais` sert ici aussi.
- **Le registre des tables** (`commun.registre`) range `court_circuit` après la migration `base_unique_0005_registre_court_circuit` du dépôt du site, qui passe avant ou après celle-ci. Son fichier, `supabase/0005-registre-court-circuit.sql`, attend sur la branche `archi/t58-registre` de ce dépôt du site : il est publié sur `main` après son application.

## Où en est la base

**Rien n'est appliqué.** La migration attend l'accord de l'enseignant, qui voit le SQL exact avant (règle M4). Tant qu'elle n'est pas appliquée, `config.js` garde `COMPTES: false` : la page ne montre ni le code élève ni « Mes codes », et n'appelle aucune de ces fonctions (règle M7).

## Les fichiers

| Fichier | Nom de migration (`apply_migration`) | Ce qu'il fait |
|---|---|---|
| `0001-codes-eleves.sql` | `court_circuit_0001_codes_eleves` | Crée le schéma `court_circuit`, ses 4 tables, 4 fonctions internes et 6 fonctions d'entrée. Ne modifie rien d'existant. |
| `0001-codes-eleves-inverse.sql` | `court_circuit_0001_codes_eleves_inverse` | Retire tout. **Efface les comptes et les programmes des élèves.** |
| `schema.sql` | — | Le script complet, pour la copie d'un·e collègue (après le socle commun du dépôt du site). |

Chaque fichier commence par `begin;` et finit par `commit;`, chacun sur sa ligne : il se colle d'un bloc dans l'éditeur SQL. Par `apply_migration`, on retire seulement ces deux lignes.

## Ce que crée 0001

| Objet | Ce que c'est |
|---|---|
| `court_circuit.mots` | Les 64 mots des codes, thème « l'atelier » (outils et électricité) : MARTEAU, PINCE, DIODE, VOLT… Aucun n'est dans la liste d'une autre application, aucun n'est le début d'un autre mot (spécification, § 1.3). Données d'élèves : non. |
| `court_circuit.eleves` | Un compte par élève : prénom ou pseudo (2 à 24 caractères), code (2 mots et 3 chiffres), jeton de session, dates de création et de dernière visite. **Données d'élèves.** |
| `court_circuit.programmes` | Les programmes gardés : nom, texte (4 000 caractères au plus), dates. 30 au plus par élève. **Données d'élèves.** |
| `court_circuit.menage` | La date du dernier ménage (une ligne). |
| `court_circuit.normaliser_code(text)` | La forme canonique d'un code (majuscules, sans accent ni séparateur). |
| `court_circuit.nouveau_code()` | Tire un code neuf, sans biais, jamais un code déjà pris. |
| `court_circuit.eleve_par_jeton(uuid)` | Le compte d'un jeton, et la visite du jour. |
| `court_circuit.menage_si_besoin()` | Au plus une fois par heure, quand un·e élève crée son code, entre ou reprend sa session : efface les comptes sans visite depuis 12 mois. Si plus personne n'ouvre Court-circuit, rien n'est effacé jusqu'à la visite suivante. |

Toutes les tables ont la RLS, sans règle et sans aucun droit pour `anon` ni `authenticated`. Les fonctions internes ne sont appelables par personne.

**Les fonctions d'entrée**, appelables par `anon` seulement (`security definer`, `search_path` vide) :

| Fonction | Rôle |
|---|---|
| `cc_solo(p_pseudo)` | Crée un compte et renvoie le code et le jeton. 60 créations au plus par heure et par réseau (`commun.essais`, type `creation`). Le pseudo refuse les caractères de contrôle et les caractères invisibles. |
| `cc_connexion(p_code)` | Entre avec son code et **tire un nouveau jeton** : un poste partagé oublié ne garde pas l'accès (l'autre appareil redonne alors son code). 20 échecs au plus par heure et par réseau (type `eleve`), 0,3 s d'attente après un échec. |
| `cc_reprise(p_jeton)` | Le pseudo, le code et les programmes de l'élève, en un seul objet JSON. |
| `cc_enregistrer(p_jeton, p_nom, p_texte, p_id)` | Garde un programme (ou met à jour celui du même nom). |
| `cc_supprimer(p_jeton, p_id)` | Supprime un programme. |
| `cc_effacer_moi(p_jeton)` | Efface le compte et tous ses programmes. |

Chaque fonction borne ses paramètres et répond `{ "ok": false, "message": … }` plutôt que de lever une exception, qui annulerait le compteur d'essais. Seul un jeton mal formé (qui n'a pas la forme d'un uuid) est refusé par l'API elle-même (erreur 400) : aucun compteur ne porte sur les jetons, qui ne se devinent pas. Le code d'un·e élève ne sort que par ses propres fonctions.

**Ce qui n'y est pas encore** (suite de la règle 21) : le code enseignant·e et la liste des codes de ses élèves, les classes. La page de la salle de classe reste sans compte.

## Appliquer

1. L'enseignant lit `0001-codes-eleves.sql` et donne son accord.
2. Le chef d'orchestre l'applique par `apply_migration`, sous le nom `court_circuit_0001_codes_eleves`, sans les lignes `begin;` et `commit;`.
3. Le Gardien vérifie par les métadonnées (ci-dessous) et l'inscrit au journal.
4. Ensuite seulement, `COMPTES: true` dans `config.js`, dans une branche publiée par le Gardien.

## Vérifier, sans lire aucune donnée

```sql
-- les tables : RLS, aucun droit pour anon ni authenticated (attendu : 4 lignes, rls vrai, droits faux)
select c.relname, c.relrowsecurity as rls,
  has_table_privilege('anon', c.oid, 'select, insert, update, delete, truncate, references, trigger, maintain') as droits_anon,
  has_table_privilege('authenticated', c.oid, 'select, insert, update, delete, truncate, references, trigger, maintain') as droits_authenticated
from pg_class c where c.relnamespace = 'court_circuit'::regnamespace and c.relkind = 'r';

-- le schéma fermé (attendu : false, false)
select has_schema_privilege('anon', 'court_circuit', 'usage'), has_schema_privilege('authenticated', 'court_circuit', 'usage');

-- les fonctions appelables par anon (attendu : les 6 fonctions cc_, et aucune pour authenticated)
select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as authenticated
from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cc\_%';

-- les mots (attendu : 64) et les comptes (attendu : 0 juste après l'application)
select (select count(*) from court_circuit.mots) as mots, (select count(*) from court_circuit.eleves) as comptes;
```

Puis les conseillers (`get_advisors`) : seuls « RLS sans règle » (0008) et « security definer appelable par anon » (0028) pour les 6 fonctions `cc_` sont attendus.

## L'essai local

La migration a été essayée sur un PostgreSQL 16 local (rôles `anon`, `authenticated` et `service_role` comme Supabase, `pgcrypto` dans `extensions`, socle commun appliqué), avec des données inventées, jamais sur la base en ligne. PostgreSQL 16 n'a pas le droit `maintain`, nouveau dans PostgreSQL 17, la version de la base en ligne : les copies essayées n'avaient donc pas les mots `, maintain`, et le reste de leur texte était identique au fichier. Ce qui a été vérifié :
- appliquée deux fois de suite sans erreur, puis retirée par l'inverse et appliquée de nouveau ; l'inverse s'arrête si une migration plus récente ou un objet hors du schéma se sert de `court_circuit` ;
- relue par l'Architecte, qui l'a rejouée à part (78 contrôles en `anon`, la liste des 64 mots vérifiée contre les trois autres listes) ;
- en rôle `anon` : création, connexion avec le code tapé en minuscules avec des espaces, programmes gardés, mis à jour par leur nom, supprimés, compte effacé ; la lecture des tables, les fonctions internes et `commun` sont refusées ;
- le compteur : 20 échecs de connexion, puis refus jusqu'à la fin de l'heure (un autre réseau n'est pas bloqué) ; 60 créations, puis refus ;
- le tirage : 5 000 codes tous différents, chaque mot tiré 59 à 99 fois, chaque centaine de chiffres 469 à 545 fois ;
- le plafond de 30 programmes, les tailles (nom vide, texte de 4 001 caractères), le ménage d'un compte vu il y a 13 mois, une fois par heure au plus.

## Revenir en arrière

1. `COMPTES: false` dans `config.js`, publié : la page n'appelle plus les fonctions (règles M6 et M7 : on retire en deux temps, la page d'abord).
2. Si l'enseignant veut garder les programmes des élèves, il exporte d'abord `court_circuit.eleves` et `court_circuit.programmes` (Table Editor, export ; règle M8). L'export reste hors du dépôt.
3. `0001-codes-eleves-inverse.sql`, par `apply_migration`, sous le nom `court_circuit_0001_codes_eleves_inverse`.

## Installer sa copie (un·e collègue)

1. Créer son projet Supabase (gratuit), y lancer `supabase/schema.sql` du dépôt du site, [`babash/Babash-NSI-SNT`](https://github.com/babash/Babash-NSI-SNT) (le socle commun), puis `schema.sql` de ce dossier.
2. Mettre l'adresse de son projet et sa clé publique dans `config.js`, avec `COMPTES: true`.
3. Garder la même liste de mots, pour que les codes restent lisibles partout.
