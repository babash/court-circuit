/* Court-circuit : l'entraînement en 10 challenges, sans limite de temps.
   5 challenges de base, ouverts l'un après l'autre, puis 5 hauts-faits, ouverts quand les 5 de base sont réussis.
   Les challenges 1 et 2 donnent une carte seule, 3 à 5 un code à trous (___) à compléter ;
   les hauts-faits alternent : 1, 3 et 5 une carte seule, 2 et 4 un code à trous (champ « trous »).
   Le robot joue seul sur la carte, avec le moteur des matchs (createMatch) à vitesse fixe : une action toutes les
   3 ticks, que le code ait des lignes recopiées ou non. Le curseur de vitesse ne change que l'affichage, jamais le résultat.
   Les cartes : '#' un mur, 'K' le départ, '*' une case à colorier, 'B' une case à atteindre, '.' une case libre. */
const PLAFOND_ACTIONS = 600;  // au-delà, le robot est arrêté : le programme ne s'arrête pas (une boucle sans fin)
const IMMOBILE_MAX = 25;      // actions d'affilée sans que le robot change de case
const SANS_NOUVEAU_MAX = 80;  // actions d'affilée sans colorier de nouvelle case : il tourne en rond
const TROU_RE = /_{3,}/g;     // un trou du code : ___

const CHALLENGES = [
  { id: 'ligne', nom: 'La ligne droite', objectif: 'Colorie toute la ligne, jusqu’en haut.', notion: 'répéter une action : la boucle for',
    cartes: [['....*....', '....*....', '....*....', '....*....', '....*....', '....*....', '....*....', '....*....', '....*....', '....K....']],
    code: '# Ton robot est en bas, en cyan.\n# nord() le fait avancer d’une case vers le haut, et la colorie.\nnord()\n',
    pistes: ['Il y a 9 cases à colorier au-dessus de ton robot : il faut faire `nord()` 9 fois.', 'Une boucle répète pour toi : `for i in range(9):`, puis `nord()` en dessous, décalé de 4 espaces (touche Tab).'],
    appris: 'La boucle `for i in range(9):` répète les lignes décalées en dessous, un nombre de fois fixé : ici, 9 fois.' },
  { id: 'escalier', nom: 'L’escalier', objectif: 'Colorie toutes les marches de l’escalier.', notion: 'une boucle for qui répète plusieurs lignes',
    cartes: [['.........', '.......**', '......**#', '.....**##', '....**###', '...**####', '..**#####', '.**######', '**#######', 'K########']],
    code: '# Une marche, c’est nord() puis est().\n',
    pistes: ['Une marche, c’est `nord()` puis `est()`. Compte les marches : combien de fois faut-il les répéter ?', 'Une boucle peut répéter plusieurs lignes : `for i in range(8):`, puis `nord()` et `est()` en dessous, décalées toutes les deux.'],
    appris: 'Une boucle répète toutes les lignes décalées sous elle : ici, `nord()` puis `est()`, 8 fois.' },
  { id: 'mur', nom: 'Jusqu’au mur', objectif: 'Atteins la case marquée du drapeau.', notion: 'while avec un capteur (boucle non bornée)',
    cartes: [
      ['.........', '.........', '.........', '#########', '........B', '.........', '.........', '.........', '.........', '....K....'],
      ['.........', '#########', '........B', '.........', '.........', '.........', '.........', '.........', '.........', '....K....'],
      ['.........', '.........', '.........', '.........', '.........', '###.#####', '......B#.', '.........', '.........', '....K....']],
    code: '# Le mur n’est pas au même endroit sur les 3 versions de la carte :\n# ton code doit regarder avant d’avancer.\nwhile not obstacleNord():    # tant que le nord est libre…\n    ___                      # … quelle action ?\nwhile not ___:               # puis vers l’est : quel capteur ?\n    est()\n',
    pistes: ['Le premier trou est une action : vers où ton robot avance-t-il tant que le nord est libre ?', 'Le deuxième trou est un capteur, comme `obstacleNord()`, mais vers l’est : `obstacleEst()`.'],
    appris: '`while not obstacleNord():` répète tant que la condition est vraie : la boucle s’arrête au mur, où qu’il soit.' },
  { id: 'montee', nom: 'La montée', objectif: 'Monte jusqu’à la case marquée du drapeau, en haut à droite.', notion: 'la condition if … else',
    cartes: [
      ['#######.B', '#######.#', '#####...#', '#####.###', '##....###', '##.######', '...######', '.########', '.########', 'K########'],
      ['########B', '#######..', '#######.#', '####....#', '####.####', '###..####', '###.#####', '#...#####', '..#######', 'K########'],
      ['########B', '########.', '########.', '########.', '.........', '.########', '.########', '.########', '.########', 'K########']],
    code: '# Ton robot s’arrête tout seul sur le drapeau.\nwhile True:\n    if obstacleNord():       # un obstacle au nord ?\n        ___                  # alors, quelle action ?\n    else:\n        ___                  # sinon, quelle action ?\n',
    pistes: ['S’il y a un obstacle au nord, ton robot ne peut pas monter : il passe à l’est. Sinon, il monte.', 'Sous `if obstacleNord():`, écris `est()` ; sous `else:`, écris `nord()`.'],
    appris: '`if … else` choisit entre deux actions selon un capteur, à chaque tour de la boucle.' },
  { id: 'tondeuse', nom: 'La tondeuse', objectif: 'Colorie toutes les cases de la carte.', notion: 'des boucles dans une boucle',
    cartes: [['.........', '.........', '.........', '.........', '.........', '.........', '.........', '.........', '.........', 'K........']],
    code: '# Monte jusqu’en haut, un pas à l’est, redescends jusqu’en bas, un pas à l’est…\nwhile True:\n    while not obstacleNord():\n        nord()\n    est()\n    while not ___:           # jusqu’où redescendre ? quel capteur ?\n        ___                  # quelle action ?\n    est()\n',
    pistes: ['Ton robot monte jusqu’au bord du haut, fait un pas à l’est, puis doit redescendre jusqu’au bord du bas.', 'Le capteur est `obstacleSud()` et l’action `sud()`.'],
    appris: 'Une boucle dans une boucle : `while True:` répète tout le motif, et les `while` à l’intérieur s’arrêtent au bord.' },
  { id: 'slalom', nom: 'Le slalom', haut: true, objectif: 'Atteins la ligne d’arrivée, tout en haut, sans jamais cogner un obstacle.', notion: 'if, elif, else et not',
    contraintes: { sansCogner: true },
    cartes: [
      ['BBBBBBBBB', '.........', '...#.....', '.....#...', '.........', '....##...', '.........', '....#....', '.........', '....K....'],
      ['BBBBBBBBB', '.........', '.##......', '.........', '....###..', '.........', '...##....', '.........', '.....#...', '....K....'],
      ['BBBBBBBBB', '.........', '..#......', '......#..', '.........', '...##....', '....#....', '....##...', '.....#...', '....K....']],
    code: '# À toi d’écrire tout le code. Les obstacles changent sur les 3 versions de la carte.\n',
    pistes: ['Regarde avant chaque pas : `if not obstacleNord():` alors `nord()`. Sinon, contourne par l’est… et si l’est est bouché aussi, par l’ouest.', '`while True:`, puis `if not obstacleNord():` / `nord()`, `elif not obstacleEst():` / `est()`, `else:` / `ouest()`.'],
    appris: '`elif` teste une autre condition quand la première est fausse, et `not` inverse une condition.' },
  { id: 'serpent', nom: 'Le serpent', haut: true, objectif: 'Colorie tout le couloir, jusqu’au bout.', notion: 'le capteur couleur, if et elif',
    contraintes: { maxLignes: 12 },
    cartes: [['.........', '.#######.', '.#####...', '.#####.##', '.....#.##', '####.#.##', '...#.#...', '.#.#.###.', '.#.#.###.', 'K#...##..']],
    code: '# Va toujours vers une case encore vide : le couloir te guide.\nwhile True:\n    if couleurNord() == "vide":     # la case au nord est-elle vide ?\n        nord()\n    elif couleurEst() == "vide":\n        est()\n    elif ___ == "vide":             # et la case à l’ouest ?\n        ouest()\n    elif couleurSud() == "vide":\n        ___                         # quelle action ?\n',
    pistes: ['Le premier trou est un capteur de couleur, comme ceux des lignes au-dessus, mais vers l’ouest.', '`couleurOuest()`, puis l’action `sud()`.'],
    appris: '`couleurNord() == "vide"` compare la couleur d’une case : avec `if` et `elif`, ton robot choisit tout seul où aller.' },
  { id: 'stalactites', nom: 'Les stalactites', haut: true, objectif: 'Colorie toutes les cases libres, sans jamais cogner un obstacle.', notion: 'adapter son algorithme aux obstacles',
    contraintes: { sansCogner: true, maxLignes: 10 },
    cartes: [['.####.##.', '.#.##.#..', '.#.#..#..', '...#..#..', '...#.....', '.........', '.........', '.........', '.........', 'K........']],
    code: '# À toi d’écrire tout le code. Le code de la tondeuse cogne les stalactites…\n',
    pistes: ['Le code de la tondeuse cogne les stalactites. Dans chaque colonne, monte jusqu’en haut, puis redescends jusqu’en bas, avant de passer à l’est.', '`while True:`, puis `while not obstacleNord():` / `nord()`, `while not obstacleSud():` / `sud()`, et `est()`.'],
    appris: 'Tu as adapté ton algorithme à une carte avec des obstacles : dans chaque colonne, monter puis redescendre.' },
  { id: 'creneaux', nom: 'Les créneaux', haut: true, objectif: 'Colorie les 3 créneaux, de plus en plus hauts.', notion: 'une fonction avec un paramètre',
    contraintes: { fonction: true, maxLignes: 12 },
    cartes: [['.........', '.........', '..#..#..#', '..#..#**#', '..#..#**#', '..#**#**#', '..#**#**#', '**#**#**#', '**#**#**#', 'K********']],
    code: '# Une fonction donne un nom aux lignes décalées en dessous.\ndef creneau(h):              # un créneau de hauteur h\n    for i in range(h):\n        nord()\n    est()\n    for i in range(___):     # combien de pas vers le bas ?\n        sud()\n    for i in range(2):       # 2 pas vers l’est, jusqu’au créneau suivant\n        est()\n\ncreneau(2)\ncreneau(___)                 # le deuxième créneau a 4 cases de haut\n___                          # et le troisième, 6 cases de haut ?\n',
    pistes: ['Un créneau redescend d’autant de cases qu’il est monté : `h`. Le deuxième créneau, c’est `creneau(4)`.', '`range(h)`, puis `creneau(4)` et `creneau(6)`.'],
    appris: 'Une fonction avec un paramètre sert pour toutes les hauteurs : `creneau(2)`, `creneau(4)`, `creneau(6)`.' },
  { id: 'grotte', nom: 'La grotte', haut: true, objectif: 'Colorie toutes les cases libres de la grotte.', notion: 'une fonction pour couvrir toute la carte',
    contraintes: { fonction: true, maxLignes: 12 },
    cartes: [['#.###.###', '#.#.#.##.', '..#.#..#.', '....#..#.', '.......#.', '.........', '.....#...', '.#...#...', '.#.#.#..#', 'K#.###..#']],
    code: '# À toi d’écrire tout le code, avec une fonction.\n',
    pistes: ['Écris une fonction `colonne()` qui monte jusqu’en haut, puis redescend jusqu’en bas. Ensuite, si l’est est bouché, remonte jusqu’à une case libre à l’est.', '`def colonne():` avec les 2 boucles `while`, puis `while True:` / `colonne()` / `while obstacleEst():` / `nord()` / `est()`.'],
    appris: 'Une fonction donne un nom à une idée, `colonne()` : ton code est court, lisible, et couvre toute la carte.' },
];
CHALLENGES.forEach((c, i) => { c.i = i; c.haut = !!c.haut; c.contraintes = c.contraintes || {}; c.rang = c.haut ? i - 4 : i + 1; c.trous = (c.code.match(TROU_RE) || []).length > 0; });
const nomChallenge = c => (c.haut ? 'Haut-fait ' : 'Challenge ') + c.rang;

// Une carte : les lignes pour le moteur (sans * ni B), les cases à colorier, les cases à atteindre, les cases libres.
function lireCarte(rows) {
  const c = { rows: rows.map(r => r.replace(/[*B]/g, '.')), cibles: [], buts: [], libres: [] };
  rows.forEach((r, y) => [...r].forEach((ch, x) => { const k = x + y * W; if (ch !== '#') c.libres.push(k); if (ch === '*') c.cibles.push(k); if (ch === 'B') c.buts.push(k); }));
  if (!c.cibles.length && !c.buts.length) { c.cibles = c.libres.slice(); c.toutes = true; } // pas de case marquée : toute la carte
  return c;
}

// Les trous qui restent : la ligne, la colonne, et la question écrite en commentaire au bout de la ligne.
function trousDe(code) {
  const out = [];
  code.split('\n').forEach((l, i) => {
    const sansCom = l.replace(/#.*$/, ''), q = (l.match(/#\s*(.*)$/) || [])[1] || '';
    for (const m of sansCom.matchAll(TROU_RE)) out.push({ ligne: i + 1, col: m.index, long: m[0].length, question: q.trim() });
  });
  return out;
}
const lignesDeCode = code => code.split('\n').filter(l => l.replace(/#.*$/, '').trim()).length;
// Une fonction de l'élève, définie avec def et appelée ailleurs que sur sa ligne def
function fonctionUtilisee(code) {
  const lignes = code.split('\n').map(l => l.replace(/#.*$/, ''));
  const noms = lignes.map(l => (l.match(/^\s*def\s+([A-Za-z_À-ÿ][\wÀ-ÿ]*)\s*\(/) || [])[1]).filter(Boolean);
  return noms.some(n => lignes.some(l => !/^\s*def\s/.test(l) && new RegExp('(^|[^\\wÀ-ÿ])' + n + '\\s*\\(').test(l)));
}
// Les contraintes d'un haut-fait, vérifiées sur le code : [{ texte, ok, detail }]
function contraintesDe(ch, code) {
  const k = ch.contraintes, out = [];
  if (k.sansCogner) out.push({ id: 'sansCogner', texte: 'Sans jamais cogner un obstacle (ni le bord)', ok: null });
  if (k.sansRecopie) { const n = countRep(code); out.push({ id: 'sansRecopie', texte: 'Sans ligne recopiée', ok: n === 0, detail: n ? `${n} ligne${n > 1 ? 's' : ''} recopiée${n > 1 ? 's' : ''}` : 'aucune ligne recopiée' }); }
  if (k.maxLignes) { const n = lignesDeCode(code); out.push({ id: 'maxLignes', texte: `Au plus ${k.maxLignes} lignes de code`, ok: n <= k.maxLignes, detail: `ton code : ${n} ligne${n > 1 ? 's' : ''}` }); }
  if (k.fonction) { const f = fonctionUtilisee(code); out.push({ id: 'fonction', texte: 'Avec une fonction, définie avec def et appelée', ok: f, detail: f ? 'une fonction est appelée' : 'pas encore de fonction appelée' }); }
  return out;
}
function contraintesNonTenues(ch, code) { return contraintesDe(ch, code).filter(c => c.ok === false); }

/* Un essai : le robot seul sur une version de la carte, sans limite de temps.
   pas() joue un tick ; l'essai s'arrête quand l'objectif est atteint, quand le programme est fini,
   ou quand une garde l'arrête (plafond d'actions, robot immobile, rien de nouveau, obstacle cogné pour un haut-fait). */
class Essai {
  constructor(ch, iv, code) {
    this.ch = ch; this.iv = iv; this.c = lireCarte(ch.cartes[iv]); this.code = code; this.change = false;
    this.m = createMatch({ map: this.c.rows, code: { K: code, Z: '' }, solo: true, speed: 'fixe', tmax: 1e9 });
    this.actions = 0; this.immobile = 0; this.sansNouveau = 0; this.fin = null;
  }
  get total() { return this.c.buts.length ? 1 : this.c.cibles.length; }
  get fait() { const p = this.m.P.K; if (this.c.buts.length) return this.c.buts.includes(p.x + p.y * W) ? 1 : 0; return this.c.cibles.filter(k => this.m.paint[k] === 1).length; }
  get atteint() { return this.fait === this.total; }
  get reste() { return this.total - this.fait; }
  pas() {
    if (this.fin) return false;
    const m = this.m, p = m.P.K, avant = p.wait, x0 = p.x, y0 = p.y, n0 = m.count('K');
    m.tick();
    if (avant === 1 && p.wait === p.period && !p.done) { // le robot vient de faire une action
      this.actions++;
      this.immobile = p.x === x0 && p.y === y0 ? this.immobile + 1 : 0;
      this.sansNouveau = m.count('K') > n0 ? 0 : this.sansNouveau + 1;
    }
    if (this.atteint) this.fin = { ok: true };
    else if (p.done) this.fin = p.err ? { raison: 'erreur', err: p.err } : { raison: 'fini' };
    else if (this.ch.contraintes.sansCogner && p.stats.blocked > 0) this.fin = { raison: 'cogne' };
    else if (this.actions >= PLAFOND_ACTIONS) this.fin = { raison: 'plafond' };
    else if (this.immobile >= IMMOBILE_MAX) this.fin = { raison: 'immobile' };
    else if (this.sansNouveau >= SANS_NOUVEAU_MAX) this.fin = { raison: 'rond' };
    return !this.fin;
  }
  envoyer(code) { if (this.fin) return false; this.m.setCode('K', code); this.code = code; this.change = true; return true; }
  arreter() { if (!this.fin) this.fin = { raison: 'arret' }; }
  jusquauBout() { while (this.pas()); return this.fin; }
}
// Toutes les versions de la carte, d'un coup (sans affichage) : la première qui rate, ou null
function versionQuiRate(ch, code, sauf = -1) {
  for (let iv = 0; iv < ch.cartes.length; iv++) { if (iv === sauf) continue; const e = new Essai(ch, iv, code); const f = e.jusquauBout(); if (!f.ok) return { iv, fin: f, essai: e }; }
  return null;
}
// Le bilan complet d'un code, comme le jeu le juge : objectif sur toutes les versions, puis contraintes
function verifierChallenge(ch, code) {
  if (trousDe(code).length) return { ok: false, raison: 'trous' };
  const rate = versionQuiRate(ch, code);
  if (rate) return { ok: false, raison: rate.fin.raison, iv: rate.iv, reste: rate.essai.reste, actions: rate.essai.actions };
  const non = contraintesNonTenues(ch, code);
  if (non.length) return { ok: false, raison: 'contrainte', contraintes: non.map(c => c.id) };
  return { ok: true };
}
// L'aperçu du trajet : les premières actions du robot, sans les afficher
function apercuChallenge(ch, iv, code, n = 30) {
  const e = new Essai(ch, iv, code), out = [[e.m.P.K.x, e.m.P.K.y]];
  while (e.actions < n && e.pas()) { const p = e.m.P.K, l = out[out.length - 1]; if (p.x !== l[0] || p.y !== l[1]) out.push([p.x, p.y]); }
  return out;
}
