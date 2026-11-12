# ⚡ Court-circuit

**Les boucles et les conditions en Python, en duel de robots.** Pour la SNT et la 1re NSI.

> Tes élèves écrivent en Python le code d'un robot qui colorie le sol, avec les mots des TD : `nord()`, `est()`, `obstacleNord()`, `couleurEst()`… Un `for` suffit pour commencer ; `while`, `if`, `and`, `not` et les comparaisons rendent le robot plus fort. Seul·e, contre Zéro (le robot de l'ordinateur) ou **en mini-championnat de classe, en duel en direct** : une minute pour écrire son code, 30 secondes de duel sur une carte tirée au hasard, le code de l'adversaire affiché pendant le match, et un classement Elo à la fin.

## 👉 [Jouer maintenant : babash.github.io/Babash-NSI-SNT/snt/fichiers/court-circuit/](https://babash.github.io/Babash-NSI-SNT/snt/fichiers/court-circuit/)

**Gratuit · sans compte · rien à installer · les duels ne sont pas enregistrés · sur ordinateur et sur téléphone**

Court-circuit fait partie des [Ressources NSI et SNT](https://babash.github.io/Babash-NSI-SNT/), rubrique [SNT](https://babash.github.io/Babash-NSI-SNT/snt/), thème Programmation.

---

## Une séance en trois étapes

1. **Tu** ouvres la [salle de classe](https://babash.github.io/Babash-NSI-SNT/snt/fichiers/court-circuit/prof.html) et la projettes : un code de 4 lettres, un lien et un QR code s'affichent.
2. **Les élèves** s'entraînent seul·e·s quelques minutes (6 cartes, 3 étoiles par carte), puis entrent dans la salle avec le code et un prénom ou un pseudo.
3. **Tu lances le mini-championnat** : à chaque ronde, une carte tirée au hasard (presque vide à la première ronde, de plus en plus chargée), 1 minute pour écrire son code, 30 s de duel, puis le bilan et le classement projetés. À la fin, chaque élève retrouve le code de chacun·e de ses adversaires, à copier ou à mettre dans son éditeur.

**Le format du championnat : un système suisse classé à l'Elo.** Tout le monde part de 1000 points. À chaque ronde, chaque élève affronte quelqu'un de niveau proche, jamais deux fois la même personne tant que c'est possible ; un nombre impair joue contre Zéro, sans effet sur l'Elo. Battre plus fort·e que soi rapporte plus de points. La page conseille le nombre de rondes selon la classe (7 rondes pour 24 à 30 élèves) : en simulation, c'est assez pour que le classement suive le vrai niveau mieux qu'avec des paires au hasard.

Sans enseignant·e, deux élèves peuvent aussi jouer ensemble : **Défier un·e camarade** crée une salle à deux.

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
| **Seul·e, à la maison** | Défier Zéro : 5 niveaux, son code s'affiche (on peut le copier à la fin), il progresse quand on le bat. |
| **Sur papier** | Le [mémo à imprimer](https://babash.github.io/Babash-NSI-SNT/snt/fichiers/court-circuit/memo.html) (une page A4 en noir et blanc, aussi en [PDF](https://babash.github.io/Babash-NSI-SNT/snt/fichiers/court-circuit/memo.pdf)) : les mots du jeu, l'essentiel et trois exercices. |

## Pourquoi ça marche

- **Tout le monde marque des points** : un robot colorie toujours quelques cases, même avec un code très simple.
- **Les meilleurs codes gagnent** : en simulation sur des cartes tirées au hasard, les quatre premiers niveaux de Zéro sont battus, environ neuf fois sur dix, par un code un peu plus élaboré que le leur (un `for`, puis `while` avec des boucles, puis les capteurs `obstacle…`, puis `couleur…`) ; voler une case adverse compte double.
- **Les cartes changent à chaque ronde** : un trajet appris par cœur ne suffit plus, il faut regarder avant d'avancer.
- **L'éditeur des programmeur·se·s** (règle 20) : coloration, indentation automatique et touche Tab, guides des blocs, autocomplétion qui comprend aussi le français (« si », « tant que », « sinon », « droite » pour `est()`), erreurs affichées comme en Python (« Did you mean: 'obstacleNord'? ») puis expliquées en français.
- **Apprendre des autres** : le code de l'adversaire est visible pendant le duel, on peut en emprunter une ligne après chaque duel, et **tout son code à la fin de la séance**.
- **Des retours de processus** : des conseils pendant le match (« ton robot repasse sur ses cases : regarde `couleurNord()` ») et à la fin.

## Données des élèves

- **Les duels et le championnat ne sont pas enregistrés.** La salle passe par les canaux temps réel du projet Supabase des applications du site : le prénom ou le pseudo et le code de chaque élève ne vont qu'aux élèves de sa salle, pendant la séance. Le classement vit tant que la page de la salle est ouverte. Aucun champ pour le nom ni pour l'adresse électronique.
- **Le code élève, facultatif** (bientôt : la base doit d'abord être mise à jour) : l'élève qui veut garder ses programmes reçoit un code de 2 mots et 3 chiffres (par exemple `PINCE-DIODE-482`), qui suffit pour les retrouver sur n'importe quel ordinateur. Sont gardés dans le projet Supabase : son prénom ou son pseudo, son code et ses programmes (30 au plus), effacés 12 mois après sa dernière visite ; « Effacer mes données » efface tout avant. Le détail est dans [supabase/LISEZMOI.md](supabase/LISEZMOI.md).
- **Sur l'appareil** : le pseudo, le code en cours, les étoiles, le niveau de Zéro et le jeton de session du code élève, gardés un jour au plus.
- **Sans réseau** : l'entraînement et le défi contre Zéro marchent quand même.

## Pour aller plus loin

| Document | Contenu |
|---|---|
| [Mémo à imprimer](memo.html) | Les actions, les capteurs, l'essentiel sur `for` et `while`, trois exercices et un bilan « Je sais… » |
| [config.js](config.js) | Le projet Supabase utilisé ; pour ta copie, mets le tien, ou laisse vide pour le mode démo |
| [supabase/](supabase/LISEZMOI.md) | Le code élève et les programmes gardés : la migration, son inverse et le mode d'emploi |
| [Les bibliothèques incluses](vendor/LICENCES-BIBLIOTHEQUES.txt) | CodeMirror 6, Supabase Realtime, QR Code Generator, avec leurs licences |

Pour essayer seul·e une salle, ajoute `?demo` à l'adresse : la salle passe alors entre les onglets de ton navigateur (page de la salle dans un onglet, élèves dans les autres), et le code élève est imité sur ton appareil.

## Feuille de route

- **Le code élève en service**, puis le reste de la règle 21 : un code enseignant·e qui voit les codes de ses élèves, et les étoiles gardées en ligne.
- **Un essai en classe** pour régler les durées et les cartes.
- **Le rejeu d'une manche** au tableau, pas à pas.

## Contact

Conçu par Babash - NSI Tani Malandi pour les classes de SNT et de NSI de l'académie de Mayotte, développé avec l'aide de l'IA ([Claude](https://claude.com/claude-code)).
Une question, une idée, un bug ? Les [issues GitHub](https://github.com/babash/Babash-NSI-SNT/issues) du site.

## Licence

- **Le code** (les fichiers `.html`, `.css` et `.js`) est sous licence [MIT](LICENCE.txt).
- **Les documents** (ce README, le mémo) sont sous licence [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr).
- Les bibliothèques incluses gardent leur licence (MIT) et les polices la leur (SIL Open Font License 1.1).

Tu peux les réutiliser et les modifier, y compris pour tes classes, en mentionnant Babash - NSI Tani Malandi et la licence ; un document modifié se partage sous la même licence. Si tu utilises l'IA pour les modifier, merci de le préciser.
