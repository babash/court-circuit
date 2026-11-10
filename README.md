# ⚡ Court-circuit

**Les boucles et les conditions en Python, en duel de robots.** Pour la SNT et la 1re NSI.

> Tes élèves écrivent en Python le code d'un robot qui colorie le sol. Un `for` suffit pour commencer ; `while`, `if`, `and`, `not` et les comparaisons rendent le robot plus fort. Seul·e, contre Zéro (le robot de l'ordinateur) ou **en duel en direct contre un·e camarade** : une minute pour écrire son code, 30 secondes de duel, et le code de l'adversaire s'affiche pendant le match.

## 👉 [Jouer maintenant : babash.github.io/Babash-NSI-SNT/snt/fichiers/court-circuit/](https://babash.github.io/Babash-NSI-SNT/snt/fichiers/court-circuit/)

**Gratuit · sans compte · rien à installer · rien n'est enregistré en ligne · sur ordinateur et sur téléphone**

Court-circuit fait partie des [Ressources NSI et SNT](https://babash.github.io/Babash-NSI-SNT/), rubrique [SNT](https://babash.github.io/Babash-NSI-SNT/snt/), thème Programmation.

---

## Une séance en trois étapes

1. **Tu** ouvres la [salle de classe](https://babash.github.io/Babash-NSI-SNT/snt/fichiers/court-circuit/prof.html) et la projettes : un code de 4 lettres, un lien et un QR code s'affichent.
2. **Les élèves** s'entraînent seul·e·s quelques minutes (6 cartes, 3 étoiles par carte), puis entrent dans la salle avec le code et un prénom ou un pseudo.
3. **Tu lances les manches** : les paires changent à chaque manche, un nombre impair joue contre Zéro. Chaque manche : 1 minute pour écrire son code, 30 s de duel, puis le bilan projeté (résultats et progrès de chacun·e).

Sans enseignant·e, deux élèves peuvent aussi jouer ensemble : **Défier un·e camarade** crée une salle à deux.

## Ce que les élèves écrivent

```python
while True:                                    # répéter sans fin (boucle non bornée)
    if cible():                                # l'adversaire est à portée
        eclair()
    elif libre() and couleur() != "moi":       # une case à prendre devant
        avancer()
    elif libre("droite") and couleur("droite") != "moi":
        droite()
    else:
        gauche()
```

Le code de départ est `for i in range(8): avancer()` : il marche tout de suite, mais le robot s'arrête quand le code est fini. **Chaque ligne recopiée ralentit le robot** : avec une boucle `for` de 3 tours, il va plus vite qu'avec 3 lignes recopiées.

## Pour quels usages

| Usage | Comment |
|---|---|
| **Découvrir les boucles** (≈ 15 min) | L'entraînement : 6 cartes de plus en plus difficiles. Sur la première, un simple `for` donne la première étoile ; la deuxième demande `while` et un virage, la troisième `if` et `couleur()`. |
| **Une séance en classe** (≈ 45 min) | Entraînement, puis 4 à 6 manches dans la salle projetée. |
| **En binôme** | Un clavier pour deux : l'un·e écrit, l'autre lit le code de l'adversaire et conseille ; on change à chaque manche. |
| **Seul·e, à la maison** | Défier Zéro : 5 niveaux, son code s'affiche, il progresse quand on le bat. |
| **Sur papier** | Le [mémo à imprimer](https://babash.github.io/Babash-NSI-SNT/snt/fichiers/court-circuit/memo.html) (une page A4 en noir et blanc, aussi en [PDF](https://babash.github.io/Babash-NSI-SNT/snt/fichiers/court-circuit/memo.pdf)) : les mots du jeu, l'essentiel et trois exercices. |

## Pourquoi ça marche

- **Tout le monde marque des points** : un robot colorie toujours quelques cases, même avec un code très simple.
- **Les meilleurs codes gagnent** : en simulation, sur 5 cartes sur 6, plus le code est élaboré, plus il gagne (sur Le damier, l'éclair fait encore perdre) ; voler une case adverse compte double.
- **L'éditeur des programmeur·se·s** (règle 20) : coloration, indentation automatique et touche Tab, guides des blocs, autocomplétion qui comprend aussi le français (« si », « tant que », « sinon »), erreurs affichées comme en Python puis expliquées en français.
- **Apprendre des autres** : le code de l'adversaire est visible pendant le duel, et on peut en emprunter une ligne à la fin.
- **Des retours de processus** : des conseils pendant le match (« ton robot repasse sur ses cases : regarde `couleur()` ») et à la fin.

## Données des élèves

- **Rien n'est enregistré en ligne.** La salle passe par les canaux temps réel du projet Supabase des applications du site : le prénom ou le pseudo et le code de chaque élève ne vont qu'aux élèves de sa salle, pendant la séance. Aucun champ pour le nom ni pour l'adresse électronique.
- **Sur l'appareil** : le pseudo, le code en cours, les étoiles et le niveau de Zéro, gardés un jour au plus.
- **Sans réseau** : l'entraînement et le défi contre Zéro marchent quand même.

## Pour aller plus loin

| Document | Contenu |
|---|---|
| [Mémo à imprimer](memo.html) | Les actions, les capteurs, l'essentiel sur `for` et `while`, trois exercices et un bilan « Je sais… » |
| [config.js](config.js) | Le projet Supabase utilisé ; pour ta copie, mets le tien, ou laisse vide pour le mode démo |
| [Les bibliothèques incluses](vendor/LICENCES-BIBLIOTHEQUES.txt) | CodeMirror 6, Supabase Realtime, QR Code Generator, avec leurs licences |

Pour essayer seul·e une salle, ajoute `?demo` à l'adresse : la salle passe alors entre les onglets de ton navigateur (page de la salle dans un onglet, élèves dans les autres).

## Feuille de route

- **Les codes d'élèves** (règle 21) : garder les étoiles et les niveaux en ligne avec un code en mots, comme les autres applications du site.
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
