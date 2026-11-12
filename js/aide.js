/* Court-circuit : les mots du jeu (pour l'autocomplétion et le mémo) et l'explication des erreurs en français.
   Les noms sont ceux des TD : nord(), est()…, obstacleNord(), obstacleEst()…, et sur le même modèle couleurNord()… */
const MOTS = {
  actions: [
    { mot: 'nord()', role: 'Avance d’une case vers le haut de ton écran (du côté de l’adversaire) et la colorie.' },
    { mot: 'sud()', role: 'Avance d’une case vers le bas de ton écran et la colorie.' },
    { mot: 'est()', role: 'Avance d’une case vers la droite de ton écran et la colorie.' },
    { mot: 'ouest()', role: 'Avance d’une case vers la gauche de ton écran et la colorie.' },
    { mot: 'eclair()', role: 'Lance un éclair dans les 4 directions, sur 3 cases (un mur ou une caisse l’arrête). S’il touche, le robot adverse est figé 2 s et les cases autour de lui deviennent les tiennes.' },
    { mot: 'poserCaisse()', role: 'Pose une caisse sur ta case : quand tu en sors, plus personne ne peut y passer, et la case garde sa couleur. 3 caisses par match.' },
    { mot: 'attendre()', role: 'Ne fait rien pendant une action.' },
  ],
  capteurs: [
    { mot: 'obstacleNord()', role: 'Vrai s’il y a un obstacle sur la case au nord : un mur, une caisse, le bord ou l’autre robot.' },
    { mot: 'obstacleSud()', role: 'Vrai s’il y a un obstacle sur la case au sud.' },
    { mot: 'obstacleEst()', role: 'Vrai s’il y a un obstacle sur la case à l’est.' },
    { mot: 'obstacleOuest()', role: 'Vrai s’il y a un obstacle sur la case à l’ouest.' },
    { mot: 'couleurNord()', role: 'La couleur de la case au nord : "vide", "moi", "adversaire", ou "mur" (un mur, une caisse ou le bord).' },
    { mot: 'couleurSud()', role: 'La couleur de la case au sud.' },
    { mot: 'couleurEst()', role: 'La couleur de la case à l’est.' },
    { mot: 'couleurOuest()', role: 'La couleur de la case à l’ouest.' },
    { mot: 'cible()', role: 'Vrai si un éclair toucherait l’adversaire maintenant, dans n’importe quelle direction : même ligne ou même colonne, à 3 cases au plus, sans mur ni caisse entre vous.' },
    { mot: 'cibleNord()', role: 'Vrai si un éclair toucherait l’adversaire au nord : dans ta colonne, au-dessus de toi, à 3 cases au plus, sans mur ni caisse entre vous.' },
    { mot: 'cibleSud()', role: 'Vrai si un éclair toucherait l’adversaire au sud (en dessous de toi).' },
    { mot: 'cibleEst()', role: 'Vrai si un éclair toucherait l’adversaire à l’est (à ta droite).' },
    { mot: 'cibleOuest()', role: 'Vrai si un éclair toucherait l’adversaire à l’ouest (à ta gauche).' },
    { mot: 'distance()', role: 'Le nombre de cases jusqu’à l’adversaire (en lignes et en colonnes).' },
    { mot: 'caisses()', role: 'Le nombre de caisses qu’il te reste (3 au début du match).' },
  ],
  mots_cles: [
    { mot: 'for i in range(3):', role: 'Répète 3 fois les lignes décalées en dessous (boucle bornée).' },
    { mot: 'while True:', role: 'Répète sans fin les lignes décalées en dessous (boucle non bornée).' },
    { mot: 'while not obstacleNord():', role: 'Répète tant qu’il n’y a pas d’obstacle au nord.' },
    { mot: 'if obstacleNord():', role: 'Fait les lignes décalées seulement si la condition est vraie.' },
    { mot: 'elif …:', role: 'Sinon, si une autre condition est vraie.' },
    { mot: 'else:', role: 'Sinon : quand aucune condition au-dessus n’est vraie.' },
    { mot: 'and', role: 'Les deux conditions doivent être vraies.' },
    { mot: 'or', role: 'Au moins une des deux conditions doit être vraie.' },
    { mot: 'not', role: 'Inverse la condition : vrai devient faux.' },
    { mot: 'def zigzag():', role: 'Définit une fonction : un nom pour les lignes décalées en dessous. zigzag() les fait ensuite, à chaque appel.' },
    { mot: 'def grimper(n):', role: 'Une fonction avec un paramètre : grimper(3) fait les lignes de la fonction avec n = 3.' },
    { mot: 'return', role: 'Dans une fonction : la termine et renvoie une valeur (return couleurNord() == "vide").' },
    { mot: '== != < <= > >=', role: 'Comparer : égal, différent, plus petit, plus petit ou égal, plus grand, plus grand ou égal.' },
  ],
};
const ANCIENS = { avancer: 'nord()', droite: 'est()', gauche: 'ouest()', libre: 'not obstacleNord()', couleur: 'couleurNord()' };

// Explications des erreurs : l'erreur reste affichée telle que Python la donne, l'explication vient à la demande.
const EXPLICATIONS = [
  [/^SyntaxError: expected ':'/, 'Il manque les deux-points « : » à la fin de la ligne.', 'Une ligne qui commence par for, while, if, elif ou else se termine toujours par « : ».'],
  [/^IndentationError: expected an indented block/, 'Après une ligne qui finit par « : », il faut au moins une ligne décalée de 4 espaces.', 'Place le curseur au début de la ligne suivante et appuie sur Tab.'],
  [/^IndentationError: unexpected indent/, 'Cette ligne est décalée alors qu’elle ne devrait pas l’être.', 'Enlève les espaces au début de la ligne (Maj + Tab), ou mets-la sous un for, un while ou un if.'],
  [/^IndentationError: unindent does not match/, 'Le décalage de cette ligne ne correspond à aucun bloc au-dessus.', 'Les décalages vont de 4 en 4 espaces. Aligne la ligne sur celle du bloc voulu.'],
  [/^SyntaxError: Missing parentheses in call to '(\w+)'/, 'Il manque les parenthèses : une action ou un capteur s’écrit toujours avec ().', m => `Écris ${m[1]}() et non ${m[1]}.`],
  [/^SyntaxError: invalid syntax\. Maybe you meant '=='/, 'Dans une condition, on compare avec == (deux signes égal). Un seul = sert à donner une valeur à une variable.', 'Écris par exemple : if couleurNord() == "vide":'],
  [/^SyntaxError: '\(' was never closed/, 'Une parenthèse ouverte n’est jamais fermée.', 'Compte les ( et les ) de la ligne : il en faut autant.'],
  [/^SyntaxError: invalid character '(.)'/, 'Ce caractère n’existe pas en Python.', 'Retire-le. En Python, on ne met pas de point-virgule en fin de ligne.'],
  [/^SyntaxError: unterminated string literal/, 'Un texte entre guillemets n’est pas fermé.', 'Ferme le texte avec le même guillemet : "moi".'],
  [/^SyntaxError: invalid syntax\. Perhaps you forgot a comma/, 'Il manque une virgule entre deux valeurs dans les parenthèses.', 'Écris par exemple range(2, 5).'],
  [/^SyntaxError: invalid syntax/, 'Python ne comprend pas cette ligne.', 'Vérifie : une seule instruction par ligne, un else juste sous son if, les mots bien écrits.'],
  [/^NameError: name '(\w+)' is not defined\. Did you mean: '(\w+)'/, m => `Le mot ${m[1]} n’existe pas, mais ${m[2]} existe : une lettre diffère, peut-être une majuscule.`, m => `Écris ${m[2]}. Python fait la différence entre les majuscules et les minuscules : obstacleNord a un N majuscule.`],
  [/^NameError: name '(avancer|droite|gauche|libre|couleur)' is not defined/, m => `${m[1]}() n’existe pas dans ce jeu : on se déplace et on regarde comme dans les TD.`, m => `Écris par exemple ${ANCIENS[m[1]]}. Les déplacements : nord(), sud(), est(), ouest().`],
  [/^NameError: name '(\w+)' is not defined/, m => `Le mot ${m[1]} n’existe pas dans ce jeu, ou la variable n’a pas encore de valeur.`, 'Vérifie l’orthographe (sans accent : eclair) et les majuscules. Les mots du jeu sont dans le mémo.'],
  [/^TypeError: cible\(\) takes 0 positional/, 'cible() ne prend rien entre ses parenthèses : elle regarde dans les 4 directions à la fois.', 'Pour une seule direction, écris cibleNord(), cibleSud(), cibleEst() (à droite) ou cibleOuest() (à gauche).'],
  [/^NameError: name 'cible(Droite|Gauche|Haut|Bas)' is not defined/, m => `cible${m[1]}() n’existe pas : les directions du jeu sont nord, sud, est et ouest.`, m => `Écris cible${({ Droite: 'Est', Gauche: 'Ouest', Haut: 'Nord', Bas: 'Sud' })[m[1]]}().`],
  [/^TypeError: (\w+)\(\) takes 0 positional/, m => `${m[1]}() ne prend rien entre ses parenthèses.`, m => `Écris ${m[1]}() et, pour répéter, utilise une boucle : for i in range(3):`],
  [/^TypeError: 'int' object is not iterable/, 'On ne peut pas parcourir un nombre directement.', 'Écris for i in range(3): pour répéter 3 fois.'],
  [/^TypeError: for … in range/, 'Dans ce jeu, une boucle for s’écrit avec range.', 'Écris for i in range(3):'],
  [/^TypeError: 'str' object cannot be interpreted/, 'range() attend un nombre, pas un texte.', 'Écris range(3) et non range("3").'],
  [/^SyntaxError: 'return' outside function/, 'return ne s’écrit que dans une fonction, sous une ligne def.', 'Décale la ligne sous ton def, ou retire-la.'],
  [/^SyntaxError: expected '\('/, 'Après le nom d’une fonction, il faut des parenthèses.', 'Écris par exemple def zigzag(): avec les parenthèses et les deux-points.'],
  [/^SyntaxError: duplicate argument/, 'Deux paramètres de la fonction ont le même nom.', 'Donne un nom différent à chaque paramètre : def f(a, b):'],
  [/^UnboundLocalError: cannot access local variable '(\w+)'/, m => `Dans une fonction, une variable qu’on modifie est locale : ici, ${m[1]} n’a pas encore de valeur dans la fonction.`, m => `Donne-lui une valeur au début de la fonction, ou écris global ${m[1]} en première ligne de la fonction pour utiliser celle du programme.`],
  [/^TypeError: (\w+)\(\) missing (\d+) required positional/, m => `Il manque ${m[2] === '1' ? 'une valeur' : m[2] + ' valeurs'} entre les parenthèses de ${m[1]}().`, m => `Donne autant de valeurs que de paramètres dans la ligne def : par exemple ${m[1]}(3).`],
  [/^TypeError: (\w+)\(\) takes (\d+) positional/, m => `${m[1]}() attend ${m[2]} valeur${m[2] === '1' ? '' : 's'} entre ses parenthèses, pas plus.`, 'Compte les valeurs de l’appel et les paramètres de la ligne def : il en faut autant.'],
  [/^TypeError: '(\w+)' object is not callable/, 'Ce nom désigne une valeur, pas une fonction : on ne peut pas l’appeler avec des parenthèses.', 'Une variable et une fonction ne peuvent pas avoir le même nom : renomme l’une des deux.'],
  [/^RecursionError/, 'La fonction s’appelle elle-même sans jamais s’arrêter.', 'Une fonction qui s’appelle elle-même a besoin d’une condition qui arrête les appels (if n > 0:).'],
  [/^ZeroDivisionError/, 'On ne peut pas diviser par zéro.', 'Vérifie le nombre après le signe / ou %.'],
];
function expliquer(texte) {
  for (const [re, quoi, faire] of EXPLICATIONS) {
    const m = texte.match(re);
    if (m) return { quoi: typeof quoi === 'function' ? quoi(m) : quoi, faire: typeof faire === 'function' ? faire(m) : faire };
  }
  return { quoi: 'Python signale une erreur sur cette ligne.', faire: 'Relis la ligne indiquée et compare-la aux exemples du mémo.' };
}
