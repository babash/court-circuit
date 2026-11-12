# ⚡ Court-circuit

**Les boucles et les conditions en Python, en duel de robots.** Pour la seconde, en SNT, et la 1re NSI.

> Tes élèves écrivent en Python le code d'un robot qui colorie le sol, avec les mots des TD : `nord()`, `est()`, `obstacleNord()`, `couleurEst()`… Un `for` suffit pour commencer ; `while`, `if`, `and`, `not` et les comparaisons rendent le robot plus fort. Seul·e, contre Zéro (le robot de l'ordinateur) ou **en mini-championnat de classe, en duel en direct** : une minute pour écrire son code, 30 secondes de duel sur une carte tirée au hasard, le code de l'adversaire affiché pendant le match, et un classement Elo à la fin.

## 👉 [Essayer maintenant : babash.github.io/court-circuit](https://babash.github.io/court-circuit/)

**Gratuit · sans compte · rien à installer · aussi sur téléphone · les duels ne sont pas enregistrés ; le prénom ou le pseudo passe seulement en direct dans la salle**

Court-circuit fait partie des [Ressources NSI et SNT](https://babash.github.io/Babash-NSI-SNT/), rubriques [SNT](https://babash.github.io/Babash-NSI-SNT/snt/) et [NSI Première](https://babash.github.io/Babash-NSI-SNT/nsi-premiere/).

![Un duel contre Zéro sur une carte tirée au hasard : le plateau de 9 × 10 cases avec ses murs gris, colorié en cyan par le robot de l'élève et en rose par Zéro, avec le code de l'élève dans l'éditeur (couleurNord(), obstacleEst()…) et celui de Zéro sous le plateau](docs/img/duel.webp)

---

## Une séance en trois étapes

1. **Tu** ouvres la [salle de classe](https://babash.github.io/court-circuit/prof.html) et la projettes : un code de 4 lettres, un lien et un QR code s'affichent.
2. **Les élèves** s'entraînent seul·e·s quelques minutes (6 cartes, 3 étoiles par carte), puis entrent dans la salle avec le QR code, le lien ou le code, et un prénom ou un pseudo.
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

Les mots sont ceux des TD : `nord()`, `sud()`, `est()`, `ouest()` pour avancer d'une case, `obstacleNord()`… pour savoir s'il y a un obstacle, et sur le même modèle `couleurNord()`… pour connaître la couleur d'une case voisine. Le nord est toujours en haut de l'écran de l'élève. S'y ajoutent `eclair()`, `cible()`, `distance()` et **3 caisses par match** : `poserCaisse()` bloque la case où est le robot dès qu'il en sort.

Le code de départ est `for i in range(8): nord()` : il marche tout de suite, mais le robot s'arrête quand le code est fini. **Chaque ligne recopiée ralentit le robot** : avec une boucle `for` de 3 tours, il va plus vite qu'avec 3 lignes recopiées.

## Pour quels usages

| Usage | Comment |
|---|---|
| **Découvrir les boucles** (≈ 15 min) | L'entraînement : 6 cartes de plus en plus difficiles, et une 7e tirée au hasard. Sur la première, un simple `for` donne la première étoile ; la deuxième demande `while` et des changements de direction, la troisième de regarder les cases (`couleurEst() != "moi"`). |
| **Une séance en classe** (≈ 45 min) | Entraînement, puis le mini-championnat dans la salle projetée (7 rondes : environ un quart d'heure). |
| **En binôme** | Un clavier pour deux : l'un·e écrit, l'autre lit le code de l'adversaire et conseille ; on change à chaque manche. |
| **Pour s'entraîner seul·e** | Défier Zéro : 5 niveaux, son code s'affiche (on peut le copier à la fin), il progresse quand on le bat. Sans réseau aussi. |
| **Sur papier** | Le [mémo à imprimer](https://babash.github.io/court-circuit/memo.html) (une page A4 en noir et blanc, aussi en [PDF](https://babash.github.io/court-circuit/memo.pdf)) : les mots du jeu, l'essentiel et trois exercices. |
| **Avec des collègues** | Chaque collègue ouvre sa propre salle depuis la même adresse, sans compte : chaque salle a son code de 4 lettres, tiré au hasard. |

## Pourquoi ça marche

- **Tout le monde marque des points** : un robot colorie toujours quelques cases, même avec un code très simple.
- **Les meilleurs codes gagnent** : en simulation, sur 500 cartes tirées au hasard pour chaque niveau, Zéro 1 est battu 90 à 95 fois sur 100 par un simple `for` ; Zéro 2, 93 à 97 fois sur 100 par `while` et des boucles ; Zéro 3 et Zéro 4, 80 à 97 fois sur 100 par un code qui regarde les couleurs pour aller vers les cases à prendre (`couleurNord() != "moi"`…). Un code qui ne regarde que les obstacles bat Zéro 3 moins d’une fois sur deux : c’est la marche à franchir. Voler une case adverse compte double.
- **Les cartes changent à chaque ronde** : un trajet appris par cœur ne suffit plus, il faut regarder avant d'avancer.
- **L'éditeur des programmeur·se·s** : coloration, indentation automatique et touche Tab, guides des blocs, autocomplétion qui comprend aussi le français (« si », « tant que », « sinon », « droite » pour `est()`), erreurs affichées comme en Python (« Did you mean: 'obstacleNord'? ») puis expliquées en français.
- **Apprendre des autres** : le code de l'adversaire est visible pendant le duel, on peut en emprunter une ligne après chaque duel, et **tout son code à la fin de la séance**.
- **Des retours de processus** : des conseils pendant le match (« ton robot repasse sur ses cases : regarde `couleurNord()` ») et à la fin.

## Données des élèves

- **Les duels et le championnat ne sont pas enregistrés.** Une salle passe par les canaux temps réel (diffusion et présence) d'un projet Supabase, sans aucune table : le prénom ou le pseudo et le code de chaque élève ne vont qu'aux élèves de sa salle et à sa page projetée, pendant la séance. Le classement vit tant que la page de la salle est ouverte. Aucun champ pour le nom ni pour l'adresse électronique.
- **Le code élève, facultatif** (bientôt : la base doit d'abord être mise à jour) : l'élève qui veut garder ses programmes reçoit un code de 2 mots et 3 chiffres (par exemple `PINCE-DIODE-482`), qui suffit pour les retrouver sur n'importe quel ordinateur. Sont gardés dans le projet Supabase : son prénom ou son pseudo, son code et ses programmes (30 au plus), effacés 12 mois après sa dernière visite ; « Effacer mes données » efface tout avant. Le détail est dans [supabase/LISEZMOI.md](supabase/LISEZMOI.md).
- **Sur l'appareil** : le pseudo, le code en cours, les étoiles, le niveau de Zéro et le jeton de session du code élève, dans le stockage du navigateur, un jour au plus.

L'entraînement et le défi contre Zéro marchent sans réseau : seules la salle de classe, l'entrée dans une salle et le code élève se connectent à Supabase.

## Pour aller plus loin

| Document | Contenu |
|---|---|
| [Mémo à imprimer](https://babash.github.io/court-circuit/memo.html) | Les actions, les capteurs, l'essentiel sur `for` et `while`, trois exercices et un bilan « Je sais… » |
| [config.js](config.js) | Le projet Supabase des salles ; pour ta copie, mets le tien, ou laisse l'adresse vide pour le mode démo |
| [supabase/](supabase/LISEZMOI.md) | Le code élève et les programmes gardés : la migration, son inverse et le mode d'emploi |
| [Les bibliothèques incluses](vendor/LICENCES-BIBLIOTHEQUES.txt) | CodeMirror 6, Supabase Realtime, QR Code Generator, avec leurs licences |

En mode démo (`?demo` à la fin de l'adresse), le code élève est imité sur ton appareil.

### Installer ta copie

Les salles passent par le projet Supabase des applications de Babash - NSI Tani Malandi. Pour ne dépendre de personne, prends ta copie avec ton propre projet :

1. **Copie le dépôt** (bouton *Fork*), puis publie-le : *Settings › Pages › Deploy from a branch*, branche `main`, dossier `/ (root)`.
2. **Crée un projet Supabase** (offre gratuite). Les salles n'utilisent que les canaux temps réel, ouverts par défaut : aucune table, aucun script SQL. Pour le code élève, lance en plus, dans l'éditeur SQL de ton projet, le socle commun (`supabase/schema.sql` du dépôt [Babash-NSI-SNT](https://github.com/babash/Babash-NSI-SNT)), puis [supabase/schema.sql](supabase/schema.sql) de ce dépôt (mode d'emploi dans [supabase/LISEZMOI.md](supabase/LISEZMOI.md)), et mets `COMPTES: true` dans `config.js`.
3. **Dans `config.js`**, mets l'adresse de ton projet et sa clé publique (« publishable », ou « anon » sur un ancien projet), jamais une clé secrète, réservée aux serveurs.

Sans projet Supabase, laisse `SUPABASE_URL` vide : le jeu passe en mode démo, où une salle passe entre les onglets d'un même navigateur.

## Feuille de route

- **Le code élève en service**, puis le reste de la règle 21 des Ressources NSI et SNT : un code enseignant·e qui voit les codes de ses élèves, et les étoiles gardées en ligne.
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
