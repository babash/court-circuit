/* Court-circuit : les mots du jeu (pour l'autocomplétion et le mémo) et l'explication des erreurs en français. */
const MOTS = {
  actions: [
    { mot: 'avancer()', role: 'Avance d’une case et la colorie.' },
    { mot: 'droite()', role: 'Tourne d’un quart de tour à droite, sur place.' },
    { mot: 'gauche()', role: 'Tourne d’un quart de tour à gauche, sur place.' },
    { mot: 'eclair()', role: 'Lance un éclair sur 3 cases devant. S’il touche, l’adversaire est figé 2 s et les cases autour de lui deviennent les tiennes.' },
    { mot: 'attendre()', role: 'Ne fait rien pendant une action.' },
  ],
  capteurs: [
    { mot: 'libre()', role: 'Vrai si la case devant est libre (ni mur, ni robot).' },
    { mot: 'libre("droite")', role: 'Vrai si la case à droite est libre. Aussi : "gauche".' },
    { mot: 'couleur()', role: 'La couleur de la case devant : "vide", "moi", "adversaire" ou "mur".' },
    { mot: 'couleur("droite")', role: 'La couleur de la case à droite. Aussi : "gauche".' },
    { mot: 'cible()', role: 'Vrai si un éclair toucherait l’adversaire maintenant.' },
    { mot: 'distance()', role: 'Le nombre de cases jusqu’à l’adversaire (en ligne droite et en colonnes).' },
  ],
  mots_cles: [
    { mot: 'for i in range(3):', role: 'Répète 3 fois les lignes décalées en dessous (boucle bornée).' },
    { mot: 'while True:', role: 'Répète sans fin les lignes décalées en dessous (boucle non bornée).' },
    { mot: 'while libre():', role: 'Répète tant que la case devant est libre.' },
    { mot: 'if libre():', role: 'Fait les lignes décalées seulement si la condition est vraie.' },
    { mot: 'elif …:', role: 'Sinon, si une autre condition est vraie.' },
    { mot: 'else:', role: 'Sinon : quand aucune condition au-dessus n’est vraie.' },
    { mot: 'and', role: 'Les deux conditions doivent être vraies.' },
    { mot: 'or', role: 'Au moins une des deux conditions doit être vraie.' },
    { mot: 'not', role: 'Inverse la condition : vrai devient faux.' },
    { mot: '== != < <= > >=', role: 'Comparer : égal, différent, plus petit, plus petit ou égal, plus grand, plus grand ou égal.' },
  ],
};

// Explications des erreurs : l'erreur reste affichée telle que Python la donne, l'explication vient à la demande.
const EXPLICATIONS = [
  [/^SyntaxError: expected ':'/, 'Il manque les deux-points « : » à la fin de la ligne.', 'Une ligne qui commence par for, while, if, elif ou else se termine toujours par « : ».'],
  [/^IndentationError: expected an indented block/, 'Après une ligne qui finit par « : », il faut au moins une ligne décalée de 4 espaces.', 'Place le curseur au début de la ligne suivante et appuie sur Tab.'],
  [/^IndentationError: unexpected indent/, 'Cette ligne est décalée alors qu’elle ne devrait pas l’être.', 'Enlève les espaces au début de la ligne (Maj + Tab), ou mets-la sous un for, un while ou un if.'],
  [/^IndentationError: unindent does not match/, 'Le décalage de cette ligne ne correspond à aucun bloc au-dessus.', 'Les décalages vont de 4 en 4 espaces. Aligne la ligne sur celle du bloc voulu.'],
  [/^SyntaxError: Missing parentheses in call to '(\w+)'/, 'Il manque les parenthèses : une action ou un capteur s’écrit toujours avec ().', 'Écris par exemple avancer() et non avancer.'],
  [/^SyntaxError: invalid syntax\. Maybe you meant '=='/, 'Dans une condition, on compare avec == (deux signes égal). Un seul = sert à donner une valeur à une variable.', 'Écris par exemple : if distance() == 2:'],
  [/^SyntaxError: '\(' was never closed/, 'Une parenthèse ouverte n’est jamais fermée.', 'Compte les ( et les ) de la ligne : il en faut autant.'],
  [/^SyntaxError: invalid character '(.)'/, 'Ce caractère n’existe pas en Python.', 'Retire-le. En Python, une ligne ne finit pas par un point-virgule.'],
  [/^SyntaxError: unterminated string literal/, 'Un texte entre guillemets n’est pas fermé.', 'Ferme le texte avec le même guillemet : "droite".'],
  [/^SyntaxError: invalid syntax\. Perhaps you forgot a comma/, 'Il manque une virgule entre deux valeurs dans les parenthèses.', 'Écris par exemple range(2, 5).'],
  [/^SyntaxError: invalid syntax/, 'Python ne comprend pas cette ligne.', 'Vérifie : une seule instruction par ligne, un else juste sous son if, les mots bien écrits.'],
  [/^NameError: name '(\w+)' is not defined/, m => `Le mot ${m[1]} n’existe pas dans ce jeu, ou la variable n’a pas encore de valeur.`, 'Vérifie l’orthographe (sans accent : eclair). Les mots du jeu sont dans le mémo.'],
  [/^TypeError: (\w+)\(\) takes 0 positional/, m => `${m[1]}() ne prend rien entre ses parenthèses.`, m => `Écris ${m[1]}() et, pour répéter, utilise une boucle : for i in range(3):`],
  [/^TypeError: (\w+)\(\) takes 1 positional/, m => `${m[1]}() prend au plus une direction entre ses parenthèses.`, m => `Écris par exemple ${m[1]}("droite").`],
  [/^TypeError: 'int' object is not iterable/, 'On ne peut pas parcourir un nombre directement.', 'Écris for i in range(3): pour répéter 3 fois.'],
  [/^TypeError: for … in range/, 'Dans ce jeu, une boucle for s’écrit avec range.', 'Écris for i in range(3):'],
  [/^TypeError: 'str' object cannot be interpreted/, 'range() attend un nombre, pas un texte.', 'Écris range(3) et non range("3").'],
  [/^ValueError: unknown direction/, 'Cette direction n’existe pas.', 'Les directions sont "droite", "gauche" et "devant", entre guillemets.'],
  [/^ZeroDivisionError/, 'On ne peut pas diviser par zéro.', 'Vérifie le nombre après le signe /.'],
];
function expliquer(texte) {
  for (const [re, quoi, faire] of EXPLICATIONS) {
    const m = texte.match(re);
    if (m) return { quoi: typeof quoi === 'function' ? quoi(m) : quoi, faire: typeof faire === 'function' ? faire(m) : faire };
  }
  return { quoi: 'Python signale une erreur sur cette ligne.', faire: 'Relis la ligne indiquée et compare-la aux exemples du mémo.' };
}
