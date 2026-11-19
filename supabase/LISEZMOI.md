# Court-circuit : le code de l'élève, ses programmes gardés et sa progression

Ce dossier contient les migrations de la base de Court-circuit. Le jeu lui-même n'en a pas besoin : les duels passent par les canaux temps réel de Supabase, sans table. Ces fichiers servent seulement au **code élève**, à **« Mes codes »** et à **la progression de l'entraînement** : un·e élève qui le veut garde ses programmes et la liste des challenges réussis en ligne, et les retrouve sur n'importe quel ordinateur avec son code (règle 21 : on n'enregistre qu'un pseudo ou un prénom, et la progression).

- **Le projet :** `cukahpyqkljiddmimpyi` (« Babash - applications »), la base unique des applications du site.
- **Le schéma :** `court_circuit`, que l'API n'expose pas. Les fonctions d'entrée sont dans `public`, avec le préfixe `cc_`.
- **Les règles suivies :** `architecture/regles-supabase.md` (P1 à P10, M1 à M8) et la spécification des codes, `architecture/codes-acces.md`.
- **Il faut d'abord le socle commun** (`supabase/0003-schema-commun.sql` du dépôt du site, [`babash/Babash-NSI-SNT`](https://github.com/babash/Babash-NSI-SNT), appliqué le 11/11) : le compteur d'essais `commun.essais` sert ici aussi.
- **Le registre des tables** (`commun.registre`) range `court_circuit` après la migration `base_unique_0005_registre_court_circuit` du dépôt du site, qui passe avant ou après celle-ci. Son fichier est `supabase/0005-registre-court-circuit.sql` du dépôt du site ; il est appliqué depuis le 13/11/2026 à 06:49, heure de Mayotte (version 20261113034900).

## Où en est la base

**0001 est appliquée**, après l'accord de l'enseignant sur le SQL exact (« Ok base Court-circuit », 13/11/2026 à 06:45, heure de Mayotte ; règle M4) : `court_circuit_0001_codes_eleves`, le 13/11 à 06:48 (version 20261113034818), par le chef d'orchestre, sans les lignes `begin;` et `commit;`. Le texte enregistré a la même empreinte que ce fichier (md5 sans commentaires, espaces ni `;` : `f2a0459a…`) : **le fichier de ce dossier est exactement celui qui a été appliqué**. Vérifié aussitôt par les métadonnées seulement : 4 tables sous RLS, sans règle ni droit ; le schéma fermé à `anon` et à `authenticated` ; les 6 fonctions d'entrée `cc_…` appelables par `anon` seul, les 4 fonctions internes par personne ; 64 mots ; 0 compte. Ensuite seulement, `config.js` passe à `COMPTES: true` (règle M7 : la page n'appelle que des fonctions qui existent).

**0002 (la progression) est appliquée**, avec l'accord de l'enseignant donné par avance (« Fais le sans ma validation je te fais confiance », 19/11/2026 à 11:57, heure de Mayotte) et après la relecture de l'Architecte (« bon à appliquer ») : `court_circuit_0002_progression`, le 19/11 à 12:43, heure de Mayotte (version 20261119094320), par le chef d'orchestre, sans les lignes `begin;` et `commit;`. Le texte appliqué est ce fichier sans ces deux lignes (md5 `e7a79a9bee159803dd24d2388332b285`, le même que celui du texte appliqué ; empreinte sans commentaires, espaces ni `;` : `b0d72ac3…`) : **le fichier de ce dossier est exactement celui qui a été appliqué**. Le Gardien vérifie la base par les métadonnées (ci-dessous) avant de publier la page avec `PROGRESSION_EN_LIGNE: true` (règle M7 : la page n'appelle que des fonctions qui existent).

## Les fichiers

| Fichier | Nom de migration (`apply_migration`) | Ce qu'il fait |
|---|---|---|
| `0001-codes-eleves.sql` | `court_circuit_0001_codes_eleves` | Crée le schéma `court_circuit`, ses 4 tables, 4 fonctions internes et 6 fonctions d'entrée. Ne modifie rien d'existant. |
| `0001-codes-eleves-inverse.sql` | `court_circuit_0001_codes_eleves_inverse` | Retire tout. **Efface les comptes et les programmes des élèves.** Refuse de partir tant que 0002 est appliquée : défaire 0002 d'abord. |
| `0002-progression.sql` | `court_circuit_0002_progression` | Ajoute la progression de l'entraînement : une colonne dans `court_circuit.eleves`, un champ `reussis` dans `cc_connexion` et `cc_reprise`, et la fonction `cc_progression`. Ne retire ni ne renomme rien. |
| `0002-progression-inverse.sql` | `court_circuit_0002_progression_inverse` | Retire la fonction et la colonne, et remet `cc_connexion`, `cc_reprise` et les commentaires exactement comme 0001. **Efface la progression des élèves** (les comptes et les programmes restent). |
| `schema.sql` | — | Le script complet, pour la copie d'un·e collègue (après le socle commun du dépôt du site) : 0001 puis 0002, recopiées telles quelles. Il s'installe dans un projet neuf. |

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

## Ce que change 0002 : la progression de l'entraînement

| Objet | Ce qui change |
|---|---|
| `court_circuit.eleves.challenges_reussis` | Une colonne `text[]`, vide au départ : les challenges et les hauts-faits réussis, sous forme d'identifiants de la liste connue (`ligne`, `escalier`, `mur`, `montee`, `tondeuse`, `slalom`, `serpent`, `stalactites`, `creneaux`, `grotte`), 10 au plus, **sans date**. La contrainte `eleves_challenges_reussis_connus` refuse toute autre valeur. **Données d'élèves**, effacées avec le compte. |
| Le commentaire de `court_circuit.eleves` | Il cite la progression. Le registre des tables (une vue du catalogue) n'a pas besoin de migration : la table reste « Données d'élèves : oui ». |
| `cc_connexion(p_code)` et `cc_reprise(p_jeton)` | Le même résultat, plus un champ : `reussis`, la liste des challenges réussis. Rien n'est retiré ni renommé : la page publiée avant 0002 marche encore. |
| `cc_progression(p_jeton, p_reussis)` | **Nouvelle**, appelable par `anon` seulement (`security definer`, `search_path` vide). Elle réunit la liste reçue à celle de la base, sans jamais la réduire (un challenge réussi quelque part compte partout), et répond `{ "ok": true, "reussis": [...] }`. Une liste fausse (un identifiant inconnu, plus de 10 valeurs, une valeur vide, un tableau à deux dimensions) est refusée : `{ "ok": false, "message": … }`. Une liste vide renvoie seulement la progression gardée. |

« Effacer mes données » (`cc_effacer_moi`) et le ménage des comptes sans visite depuis 12 mois effacent la ligne de l'élève : la progression part avec elle, sans rien changer à ces fonctions.

**Côté page**, tout est derrière le réglage `PROGRESSION_EN_LIGNE` de `config.js` : `true` depuis l'application de 0002 dans la base du site ; pour une copie, `false` tant que 0002 n'est pas appliquée dans son projet (règle M7). Avec `true` et un code élève : à la connexion, à la reprise et à l'ouverture de l'entraînement, la page réunit la progression de l'appareil et celle de la base ; chaque challenge réussi part aussitôt ; sans réseau, elle le dit en français et garde la progression sur l'appareil ; si la session a expiré, elle l'oublie et demande d'entrer de nouveau son code. Sans code élève, rien ne change : la progression reste sur l'appareil.

## Appliquer

1. L'enseignant lit `0001-codes-eleves.sql` et donne son accord. Pour `0002-progression.sql`, il a donné son accord par avance (19/11, 11:57), et l'Architecte a relu le SQL (« bon à appliquer »).
2. Le chef d'orchestre l'applique par `apply_migration`, sous le nom `court_circuit_0001_codes_eleves` (puis `court_circuit_0002_progression`), sans les lignes `begin;` et `commit;`.
3. Le Gardien vérifie par les métadonnées (ci-dessous) et l'inscrit au journal.
4. Ensuite seulement, `COMPTES: true` (puis `PROGRESSION_EN_LIGNE: true`) dans `config.js`, dans une branche publiée par le Gardien. Pour 0002, c'est le commit « progression en ligne en service » de la branche de T93, publié après la vérification de la base par le Gardien.

## Vérifier, sans lire aucune donnée

```sql
-- les tables : RLS, aucun droit pour anon ni authenticated (attendu : 4 lignes, rls vrai, droits faux)
select c.relname, c.relrowsecurity as rls,
  has_table_privilege('anon', c.oid, 'select, insert, update, delete, truncate, references, trigger, maintain') as droits_anon,
  has_table_privilege('authenticated', c.oid, 'select, insert, update, delete, truncate, references, trigger, maintain') as droits_authenticated
from pg_class c where c.relnamespace = 'court_circuit'::regnamespace and c.relkind = 'r';

-- le schéma fermé (attendu : false, false)
select has_schema_privilege('anon', 'court_circuit', 'usage'), has_schema_privilege('authenticated', 'court_circuit', 'usage');

-- les fonctions appelables par anon (attendu : les 6 fonctions cc_, 7 après 0002 avec cc_progression, et aucune pour authenticated)
select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as authenticated
from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'cc\_%';

-- les mots (attendu : 64) et les comptes (attendu : 0 juste après l'application)
select (select count(*) from court_circuit.mots) as mots, (select count(*) from court_circuit.eleves) as comptes;

-- après 0002 : la colonne, sa contrainte, et la fonction (attendu : une ligne, f, f, t, {"search_path=\"\""})
select a.attname, has_column_privilege('anon', a.attrelid, a.attname, 'select, update') as anon,
  has_column_privilege('authenticated', a.attrelid, a.attname, 'select, update') as authenticated,
  exists (select 1 from pg_constraint c where c.conrelid = a.attrelid and c.conname = 'eleves_challenges_reussis_connus') as contrainte,
  (select proconfig from pg_proc where oid = 'public.cc_progression(uuid, text[])'::regprocedure) as reglage
from pg_attribute a where a.attrelid = 'court_circuit.eleves'::regclass and a.attname = 'challenges_reussis';
```

Puis les conseillers (`get_advisors`) : seuls « RLS sans règle » (0008) et « security definer appelable par anon » (0028) pour les 6 fonctions `cc_` (7 après 0002) sont attendus.

## L'essai local

La migration a été essayée sur un PostgreSQL 16 local (rôles `anon`, `authenticated` et `service_role` comme Supabase, `pgcrypto` dans `extensions`, socle commun appliqué), avec des données inventées, jamais sur la base en ligne. PostgreSQL 16 n'a pas le droit `maintain`, nouveau dans PostgreSQL 17, la version de la base en ligne : les copies essayées n'avaient donc pas les mots `, maintain`, et le reste de leur texte était identique au fichier. Ce qui a été vérifié :
- appliquée deux fois de suite sans erreur, puis retirée par l'inverse et appliquée de nouveau ; l'inverse s'arrête si une migration plus récente ou un objet hors du schéma se sert de `court_circuit` ;
- relue par l'Architecte, qui l'a rejouée à part (78 contrôles en `anon`, la liste des 64 mots vérifiée contre les trois autres listes) ;
- en rôle `anon` : création, connexion avec le code tapé en minuscules avec des espaces, programmes gardés, mis à jour par leur nom, supprimés, compte effacé ; la lecture des tables, les fonctions internes et `commun` sont refusées ;
- le compteur : 20 échecs de connexion, puis refus jusqu'à la fin de l'heure (un autre réseau n'est pas bloqué) ; 60 créations, puis refus ;
- le tirage : 5 000 codes tous différents, chaque mot tiré 59 à 99 fois, chaque centaine de chiffres 469 à 545 fois ;
- le plafond de 30 programmes, les tailles (nom vide, texte de 4 001 caractères), le ménage d'un compte vu il y a 13 mois, une fois par heure au plus.

### L'essai local de 0002 (T93, 19/11/2026)

Sur la même reproduction (PostgreSQL 16, rôles de l'API, socle commun du site, puis 0001), avec des comptes inventés, jamais sur la base en ligne, 53 contrôles réussis :
- 0002 appliquée sur une base qui a déjà des comptes et un programme, puis relancée sans erreur ; les autres colonnes des comptes ne changent pas ; la progression part vide ;
- les droits : 7 fonctions `cc_` appelables par `anon` seul, aucune par `authenticated` ni par `public` ; `cc_progression` en `security definer` avec un `search_path` vide ; le schéma, les 4 tables (RLS, aucune règle) et la colonne restent fermés à `anon` et à `authenticated` ; en `anon`, la lecture de la table, l'écriture de la colonne et les fonctions internes sont refusées ;
- en `anon` : la progression gardée et rangée dans l'ordre des challenges, réunie sans jamais être réduite, la liste vide, les doublons ; 7 valeurs fausses refusées (identifiant inconnu, valeur vide, liste absente (`null`), tableau à deux dimensions, 11 valeurs, majuscules, espace) sans rien changer ; un jeton inconnu : « Ta session a expiré » ; écrites à la main en `postgres`, une valeur inconnue, 11 valeurs ou `null` sont refusées par la table ;
- `cc_connexion` et `cc_reprise` renvoient `reussis` en plus de leurs champs ;
- « Effacer mes données » et le ménage d'un compte vu il y a 13 mois effacent aussi la progression ;
- l'inverse de 0001 refuse de partir tant que 0002 est appliquée ; **l'inverse de 0002 remet exactement le schéma d'avant** (`pg_dump` du schéma `court_circuit` et de `public` identiques), garde les programmes, et se relance sans effet ; 0002 se réapplique ensuite ;
- 0002 refuse de partir sans 0001, et dans un autre rôle que `postgres` ;
- `schema.sql`, lancé sur une base neuve, donne exactement le même schéma que 0001 puis 0002 (`pg_dump` identiques).

Comme pour 0001, les copies essayées n'avaient pas les mots `, maintain` (PostgreSQL 16).

## Revenir en arrière

Pour 0002 seulement (la progression) :
1. `PROGRESSION_EN_LIGNE: false` dans `config.js`, publié : la page n'appelle plus `cc_progression` (règles M6 et M7).
2. Si l'enseignant veut garder la progression, il exporte d'abord `court_circuit.eleves` (règle M8). L'export reste hors du dépôt.
3. `0002-progression-inverse.sql`, par `apply_migration`, sous le nom `court_circuit_0002_progression_inverse`.

Pour tout retirer : d'abord 0002 comme ci-dessus, puis :
1. `COMPTES: false` dans `config.js`, publié : la page n'appelle plus les fonctions (règles M6 et M7 : on retire en deux temps, la page d'abord).
2. Si l'enseignant veut garder les programmes des élèves, il exporte d'abord `court_circuit.eleves` et `court_circuit.programmes` (Table Editor, export ; règle M8). L'export reste hors du dépôt.
3. `0001-codes-eleves-inverse.sql`, par `apply_migration`, sous le nom `court_circuit_0001_codes_eleves_inverse`. Il refuse de partir tant que 0002 est appliquée.

## Installer sa copie (un·e collègue)

1. Créer son projet Supabase (gratuit), y lancer `supabase/schema.sql` du dépôt du site, [`babash/Babash-NSI-SNT`](https://github.com/babash/Babash-NSI-SNT) (le socle commun), puis `schema.sql` de ce dossier.
2. Mettre l'adresse de son projet et sa clé publique dans `config.js`, avec `COMPTES: true` et `PROGRESSION_EN_LIGNE: true`.
3. Garder la même liste de mots, pour que les codes restent lisibles partout.
