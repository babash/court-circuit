# ⚡ Court-circuit

**Les boucles et les conditions en Python, en duel de robots.** Pour la seconde, en SNT, et la 1re NSI.

> Tes élèves écrivent en Python le code d'un robot qui colorie le sol, avec les mots des TD : `nord()`, `est()`, `obstacleNord()`, `couleurEst()`… Un `for` suffit pour commencer ; `while`, `if`, `and`, `not` et les comparaisons rendent le robot plus fort. Seul·e **en 10 challenges sans limite de temps**, contre Zéro (le robot de l'ordinateur) ou **en mini-championnat de classe, en duel en direct** : une minute pour écrire son code, 30 secondes de duel sur une carte tirée au hasard, le code de l'adversaire affiché pendant le match, et un classement Elo à la fin.

## 👉 [Essayer maintenant : babash.github.io/court-circuit](https://babash.github.io/court-circuit/)

**Gratuit · sans compte · rien à installer · aussi sur téléphone · les duels ne sont pas enregistrés ; le prénom ou le pseudo passe seulement en direct dans la salle**

Court-circuit fait partie des [Ressources NSI et SNT](https://babash.github.io/Babash-NSI-SNT/), rubriques [SNT](https://babash.github.io/Babash-NSI-SNT/snt/) et [NSI Première](https://babash.github.io/Babash-NSI-SNT/nsi-premiere/).

![Un duel contre Zéro sur une carte tirée au hasard : le plateau de 9 × 10 cases avec ses murs gris, colorié en cyan par le robot de l'élève et en rose par Zéro, avec le code de l'élève dans l'éditeur (couleurNord(), obstacleEst()…) et celui de Zéro sous le plateau](docs/img/duel.webp)

---

## Une séance en trois étapes

1. **Tu** ouvres la [salle de classe](https://babash.github.io/court-circuit/prof.html) et la projettes : un code de 4 lettres, un lien et un QR code s'affichent.
2. **Les élèves** s'entraînent seul·e·s quelques minutes (les challenges, sans limite de temps), puis entrent dans la salle avec le QR code, le lien ou le code, et un prénom ou un pseudo.
3. **Tu lances le mini-championnat** : à chaque ronde, une carte tirée au hasard (presque vide à la première ronde, de plus en plus chargée), 1 minute pour écrire son code, 30 s de duel, puis le bilan et le classement projetés. À la fin, chaque élève retrouve le code de chacun·e de ses adversaires, à copier ou à mettre dans son éditeur.

**Le format du championnat : un système suisse classé à l'Elo.** Tout le monde part de 1000 points. À chaque ronde, chaque élève affronte quelqu'un de niveau proche, jamais deux fois la même personne tant que c'est possible ; un nombre impair joue contre Zéro, sans effet sur l'Elo. Battre plus fort·e que soi rapporte plus de points. La page conseille le nombre de rondes selon la classe (7 rondes pour 24 à 30 élèves) : en simulation, c'est assez pour que le classement suive le vrai niveau mieux qu'avec des paires au hasard.

Sans enseignant·e, deux élèves peuvent aussi jouer ensemble : **Défier un·e camarade** crée une salle à deux.

Tu veux d'abord découvrir la salle seul·e ? Ouvre-la [en mode démo](https://babash.github.io/court-circuit/prof.html?demo) : elle passe alors entre les onglets de ton navigateur (la salle dans un onglet, les élèves dans les autres).

## Ce que les élèves écrivent

```python
while True:                                          # répéter sans fin (boucle non bornée)
    if cible():                                      # l'adversaire est dans ma ligne ou ma colonne
        eclair()
    elif couleurNord() == "vide" or couleurNord() == "adversaire":
        nord()                                       # une case à prendre au nord
    elif couleurEst() != "moi" and not obstacleEst():
        est()
    elif not obstacleOuest():
        ouest()
    else:
        sud()
```

Les mots sont ceux des TD : `nord()`, `sud()`, `est()`, `ouest()` pour avancer d'une case, `obstacleNord()`… pour savoir s'il y a un obstacle, et sur le même modèle `couleurNord()`… pour connaître la couleur d'une case voisine. Le nord est toujours en haut de l'écran de l'élève. S'y ajoutent `eclair()`, `cible()` (l'éclair toucherait l'adversaire) et, pour une seule direction, `cibleNord()`, `cibleSud()`, `cibleEst()`, `cibleOuest()`, puis `distance()` et **3 caisses par match** : `poserCaisse()` bloque la case où est le robot dès qu'il en sort.

**Pour aller plus loin, ses propres fonctions** : `def`, avec ou sans paramètres, et `return`, comme en Python (variables locales, `global`, erreurs de Python expliquées en français).

```python
def prendre():                                       # une fonction qui renvoie Vrai ou Faux
    return couleurNord() != "moi" and not obstacleNord()

def glisser(n):                                      # une fonction avec un paramètre
    for i in range(n):
        est()

while True:
    if prendre():
        nord()
    else:
        glisser(2)
```

Le code de départ est `for i in range(8): nord()` : il marche tout de suite, mais le robot s'arrête quand le code est fini. **Chaque ligne recopiée ralentit le robot** : avec une boucle `for` de 3 tours, il va plus vite qu'avec 3 lignes recopiées.

## L'entraînement : 10 challenges

Sans limite de temps : le robot s'arrête dès que l'objectif est atteint, ou quand le programme est fini. **5 challenges de base**, ouverts l'un après l'autre, puis **5 hauts-faits**, des challenges bonus plus difficiles, ouverts quand les 5 de base sont réussis. On va d'une ligne droite à couvrir toute la carte avec des obstacles. Les challenges 1 et 2 donnent une carte seule, les challenges 3 à 5 un **code à trous** à compléter (les trous `___` sont surlignés en jaune, et le jeu ne lance pas tant qu'il en reste un) ; les hauts-faits alternent : ★ 1, ★ 3 et ★ 5 une carte seule, ★ 2 et ★ 4 un code à trous.

| | Challenge | Objectif | Ce qui est donné | Notion |
|---|---|---|---|---|
| 1 | La ligne droite | Colorier toute la ligne, jusqu'en haut | Carte seule | Répéter une action : `for` |
| 2 | L'escalier | Colorier toutes les marches | Carte seule | Une boucle qui répète plusieurs lignes |
| 3 | Jusqu'au mur | Atteindre le drapeau, sur 3 versions de la carte | Code à trous | `while not obstacleNord():` (boucle non bornée, capteur) |
| 4 | La montée | Monter jusqu'au drapeau, sur 3 versions de la carte | Code à trous | `if … else` |
| 5 | La tondeuse | Colorier toutes les cases | Code à trous | Des boucles dans une boucle |
| ★ 1 | Le slalom | Atteindre la ligne d'arrivée **sans jamais cogner**, sur 3 versions | Carte seule | `if`, `elif`, `else`, `not` |
| ★ 2 | Le serpent | Colorier tout le couloir, **en 12 lignes au plus** | Code à trous | Le capteur `couleurNord() == "vide"`, `elif` |
| ★ 3 | Les stalactites | Colorier toutes les cases libres **sans cogner, en 10 lignes au plus** | Carte seule | Adapter son algorithme aux obstacles |
| ★ 4 | Les créneaux | Colorier 3 créneaux de plus en plus hauts, **avec une fonction, en 12 lignes au plus** | Code à trous | Une fonction avec un paramètre : `def creneau(h):` |
| ★ 5 | La grotte | Colorier toute la grotte, **avec une fonction, en 12 lignes au plus** | Carte seule | Une fonction pour couvrir toute la carte |

Quand une carte a 3 versions, le code doit réussir sur les 3 : un trajet appris par cœur ne suffit pas, il faut un capteur. Après un essai raté, un **indice** s'affiche, puis un second, plus précis ; un challenge réussi dit **ce qu'on a appris**. Une boucle sans fin est arrêtée et expliquée en français (le robot ne bouge plus, tourne en rond, ou a fait 600 actions). On peut changer son code en route, comme en match ; pour valider, le code doit réussir depuis le départ. Pendant que le robot joue, **Arrêter** le stoppe et **Recommencer** le relance depuis le départ ; le **curseur de vitesse du robot** (lente, normale, rapide, très rapide), lui, reste toujours affiché : il ne change que l'affichage, jamais le résultat.

## Pour quels usages

| Usage | Comment |
|---|---|
| **Découvrir les boucles** (≈ 20 min) | Les 5 challenges de base : `for`, `while` avec un capteur, `if … else`, puis des boucles dans une boucle pour colorier toute la carte. |
| **Aller plus loin** (≈ 30 min) | Les 5 hauts-faits : `elif` et `not`, le capteur de couleur, une carte avec des obstacles, les fonctions avec un paramètre. Pour la 1re NSI, ou pour les élèves qui ont fini. |
| **Une séance en classe** (≈ 45 min) | Les challenges, puis le mini-championnat dans la salle projetée (7 rondes : environ un quart d'heure). |
| **En binôme** | Un clavier pour deux : l'un·e écrit, l'autre lit le code de l'adversaire et conseille ; on change à chaque manche. |
| **Garder ses programmes** | « Mes codes » : avec un code élève facultatif (2 mots et 3 chiffres, par exemple `PINCE-DIODE-482`), l'élève garde jusqu'à 30 programmes en ligne et les retrouve sur n'importe quel ordinateur. |
| **Pour s'entraîner seul·e** | Défier Zéro : 5 niveaux, son code s'affiche (on peut le copier à la fin), il progresse quand on le bat. Sans réseau aussi. |
| **Sur papier** | Le [mémo à imprimer](https://babash.github.io/court-circuit/memo.html) (une page A4 en noir et blanc, aussi en [PDF](https://babash.github.io/court-circuit/memo.pdf)) : les mots du jeu, l'essentiel et trois exercices. |
| **Avec des collègues** | Chaque collègue ouvre sa propre salle depuis la même adresse, sans compte : chaque salle a son code de 4 lettres, tiré au hasard. |

## Pourquoi ça marche

- **Tout le monde marque des points** : un robot colorie toujours quelques cases, même avec un code très simple.
- **Les meilleurs codes gagnent** : en simulation, sur 500 cartes tirées au hasard pour chaque niveau, Zéro 1 est battu 90 à 95 fois sur 100 par un simple `for` ; Zéro 2, 93 à 97 fois sur 100 par `while` et des boucles ; Zéro 3 et Zéro 4, 80 à 97 fois sur 100 par un code qui regarde les couleurs pour aller vers les cases à prendre (`couleurNord() != "moi"`…). Un code qui ne regarde que les obstacles bat Zéro 3 moins d’une fois sur deux : c’est la marche à franchir. Voler une case adverse compte double.
- **Les cartes changent à chaque ronde** : un trajet appris par cœur ne suffit plus, il faut regarder avant d'avancer.
- **L'éditeur des programmeur·se·s** : coloration, indentation automatique et touche Tab, guides des blocs, autocomplétion qui comprend aussi le français (« si », « tant que », « sinon », « droite » pour `est()`), erreurs affichées comme en Python (« Did you mean: 'obstacleNord'? ») puis expliquées en français.
- **Les fonctions pour éviter de recopier** : un groupe de lignes qui revient porte un nom (`def zigzag():`) et s'appelle d'une ligne ; comme une boucle, il évite les lignes recopiées, qui ralentissent le robot.
- **Apprendre des autres** : le code de l'adversaire est visible pendant le duel, on peut en emprunter une ligne après chaque duel, et **tout son code à la fin de la séance**.
- **Des retours de processus** : des conseils pendant le match (« ton robot repasse sur ses cases : regarde `couleurNord()` ») et à la fin.

## Données des élèves

- **Les duels et le championnat ne sont pas enregistrés.** Une salle passe par les canaux temps réel (diffusion et présence) d'un projet Supabase, sans aucune table : le prénom ou le pseudo et le code de chaque élève ne vont qu'aux élèves de sa salle et à sa page projetée, pendant la séance. Le classement vit tant que la page de la salle est ouverte. Aucun champ pour le nom ni pour l'adresse électronique.
- **Le code élève, facultatif** : l'élève qui veut garder ses programmes reçoit un code de 2 mots et 3 chiffres (par exemple `PINCE-DIODE-482`), qui suffit pour les retrouver sur n'importe quel ordinateur. Sont gardés dans le projet Supabase : son prénom ou son pseudo, son code et ses programmes (30 au plus), effacés 12 mois après sa dernière visite ; « Effacer mes données » efface tout avant. Le détail est dans [supabase/LISEZMOI.md](supabase/LISEZMOI.md).
- **La progression de l'entraînement, avec le code élève** : la liste des challenges réussis (sans date) est gardée aussi en ligne, avec le compte (migration `0002`, appliquée le 19/11/2026 ; réglage `PROGRESSION_EN_LIGNE` de `config.js`). Un challenge réussi sur un appareil compte partout ; elle s'efface avec le compte. Sans code élève, elle reste sur l'appareil, 30 jours.
- **Sur l'appareil**, dans le stockage du navigateur : la progression des challenges et le dernier code de chacun, gardés 30 jours après le dernier entraînement (chaque passage à l'entraînement, chaque code modifié et chaque challenge réussi relancent les 30 jours) ; le pseudo, le code en cours, la vitesse du robot, le niveau de Zéro et le jeton de session du code élève (et, sur la page de la salle, son code de 4 lettres), un jour après leur dernière écriture. Passé ce délai, la page ne les lit plus et les efface du navigateur au premier chargement de Court-circuit sur ce poste (la page des élèves ou celle de la salle) : tant que personne ne rouvre le jeu dans ce navigateur, elles y restent. **« Effacer ma progression sur cet appareil »**, sous la liste des challenges de l'entraînement, efface tout cela tout de suite, après une confirmation dans la page (« Annuler » d'abord) : la progression et les codes des challenges, le pseudo, le code en cours, la vitesse, le niveau de Zéro, et le jeton du code élève (l'appareil se déconnecte du code, comme avec « Ce n'est pas moi »). Rien n'est effacé en ligne : la progression en ligne et les programmes restent liés au code élève (« Effacer mes données » les efface).

L'entraînement et le défi contre Zéro marchent sans réseau : seules la salle de classe, l'entrée dans une salle et le code élève se connectent à Supabase.

## Pour aller plus loin

| Document | Contenu |
|---|---|
| [Mémo à imprimer](https://babash.github.io/court-circuit/memo.html) | Les actions, les capteurs, l'essentiel sur `for` et `while`, trois exercices et un bilan « Je sais… » |
| [config.js](config.js) | Le projet Supabase des salles ; pour ta copie, mets le tien, ou laisse l'adresse vide pour le mode démo |
| [js/challenges.js](js/challenges.js) | Les 10 challenges : cartes, objectifs, codes à trous, indices et contraintes |
| [supabase/](supabase/LISEZMOI.md) | Le code élève, les programmes gardés et la progression : les migrations, leurs inverses et le mode d'emploi |
| [Les bibliothèques incluses](vendor/LICENCES-BIBLIOTHEQUES.txt) | CodeMirror 6, Supabase Realtime, QR Code Generator, avec leurs licences |

En mode démo (`?demo` à la fin de l'adresse), le code élève est imité sur ton appareil.

### Installer ta copie

Les salles passent par le projet Supabase des applications de Babash - NSI Tani Malandi. Pour ne dépendre de personne, prends ta copie avec ton propre projet :

1. **Copie le dépôt** (bouton *Fork*), puis publie-le : *Settings › Pages › Deploy from a branch*, branche `main`, dossier `/ (root)`.
2. **Crée un projet Supabase** (offre gratuite). Les salles n'utilisent que les canaux temps réel, ouverts par défaut : aucune table, aucun script SQL. Pour le code élève, lance en plus, dans l'éditeur SQL de ton projet, le socle commun (`supabase/schema.sql` du dépôt [Babash-NSI-SNT](https://github.com/babash/Babash-NSI-SNT)), puis [supabase/schema.sql](supabase/schema.sql) de ce dépôt (mode d'emploi dans [supabase/LISEZMOI.md](supabase/LISEZMOI.md)), et mets `COMPTES: true` et `PROGRESSION_EN_LIGNE: true` dans `config.js`.
3. **Dans `config.js`**, mets l'adresse de ton projet et sa clé publique (« publishable », ou « anon » sur un ancien projet), jamais une clé secrète, réservée aux serveurs.

Sans projet Supabase, laisse `SUPABASE_URL` vide : le jeu passe en mode démo, où une salle passe entre les onglets d'un même navigateur.

## Feuille de route

- **Le reste de la règle 21** des Ressources NSI et SNT : un code enseignant·e qui voit les codes de ses élèves et leur progression.
- **Un essai en classe** pour régler les durées et les cartes.
- **Le rejeu d'une manche** au tableau, pas à pas.

## Contact

Conçu par Babash - NSI Tani Malandi pour les classes de SNT et de NSI de l'académie de Mayotte, développé avec l'aide de l'IA ([Claude Code](https://claude.com/claude-code)).
Une question, une idée, un bug ? Les [issues GitHub](https://github.com/babash/court-circuit/issues) du dépôt. Toutes les ressources sont sur le site [Ressources NSI et SNT](https://babash.github.io/Babash-NSI-SNT/).

## Licence

- **Le code** (les fichiers `.html`, `.css` et `.js`, hors bibliothèques et polices, et les scripts SQL de `supabase/`) est sous licence [MIT](LICENSE).
- **Les documents** (ce README, le mémo `memo.html` et `memo.pdf`, les images de `docs/`) sont sous licence [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr).
- **Les bibliothèques** de `vendor/` ([CodeMirror 6](https://codemirror.net), le client temps réel de [Supabase](https://supabase.com), [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) de Kazuhiko Arase) : licence MIT, notices dans [vendor/LICENCES-BIBLIOTHEQUES.txt](vendor/LICENCES-BIBLIOTHEQUES.txt). « QR Code » est une marque déposée de DENSO WAVE.
- **Les polices** Chakra Petch, JetBrains Mono et Atkinson Hyperlegible, intégrées dans `css/polices.css` : licence SIL OFL 1.1, copyrights et texte dans [css/LICENCE-POLICES.txt](css/LICENCE-POLICES.txt).

Tu peux les réutiliser et les modifier, y compris pour tes classes, en mentionnant Babash - NSI Tani Malandi et la licence ; un document modifié se partage sous la même licence. Si tu utilises l'IA pour les modifier, merci de le préciser.
