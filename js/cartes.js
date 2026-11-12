/* Les cartes : 9 colonnes, 10 lignes, symétriques par demi-tour. K part en bas, Z en haut.
   Les 6 cartes de l'entraînement vont de la plus simple à la plus riche ;
   en duel, la carte est tirée au hasard (genererCarte), de plus en plus chargée au fil des manches. */
const CARTES = [
  { id: 'piste', nom: 'La piste', idee: 'Une boucle for suffit : for i in range(8): nord()', rows: [
    '.........', '....Z....', '.........', '.........', '.........', '.........', '.........', '.........', '....K....', '.........'] },
  { id: 'poteaux', nom: 'Les poteaux', idee: 'Changer de direction : nord(), est(), sud(), ouest().', rows: [
    '.........', '....Z....', '.#.....#.', '.........', '...#.#...', '...#.#...', '.........', '.#.....#.', '....K....', '.........'] },
  { id: 'couloirs', nom: 'Les couloirs', idee: 'Répéter sans fin avec while True.', rows: [
    '..#...#..', '..#.Z.#..', '..#...#..', '.........', '..#...#..', '..#...#..', '.........', '..#...#..', '..#.K.#..', '..#...#..'] },
  { id: 'salles', nom: 'Les salles', idee: 'Avancer jusqu’au mur : while not obstacleNord(): nord()', rows: [
    '.........', '....Z....', '.........', '###.##.##', '.........', '.........', '##.##.###', '.........', '....K....', '.........'] },
  { id: 'damier', nom: 'Le damier', idee: 'Choisir ses cases : if couleurEst() != "moi":', rows: [
    '.........', '....Z....', '.#.#.#.#.', '.........', '.#.#.#.#.', '.#.#.#.#.', '.........', '.#.#.#.#.', '....K....', '.........'] },
  { id: 'dedale', nom: 'Le dédale', idee: 'Combiner and, not, eclair() et poserCaisse().', rows: [
    '.........', '.##.Z.##.', '.#.....#.', '...#.#...', '.#.#.#.#.', '.#.#.#.#.', '...#.#...', '.#.....#.', '.##.K.##.', '.........'] },
];
const carte = i => CARTES[Math.max(0, Math.min(CARTES.length - 1, i))].rows;

// Un tirage pseudo-aléatoire à partir d'une graine : la même graine donne la même carte sur chaque appareil.
function hasard(graine) { let a = graine >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// Une carte tirée au hasard : symétrique par demi-tour, d'un seul tenant, sans impasse (chaque case libre a au moins 2 voisines libres).
// niveau 0 : presque vide ; niveau 4 : une douzaine de murs de chaque côté.
const NIVEAUX_CARTE = [[0, 2], [3, 5], [5, 8], [7, 10], [9, 12]];
function genererCarte(graine, niveau = 0) {
  const rnd = hasard(graine), [mini, maxi] = NIVEAUX_CARTE[Math.max(0, Math.min(4, niveau))];
  const libreAutour = new Set(); for (const [x, y] of [[4, 8], [4, 1]]) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) libreAutour.add((x + dx) + ',' + (y + dy));
  for (let essai = 0; essai < 300; essai++) {
    const g = Array.from({ length: H }, () => Array(W).fill('.')), cible = mini + Math.floor(rnd() * (maxi - mini + 1));
    let n = 0, garde = 0;
    while (n < cible && garde++ < 60) {
      const forme = rnd(), x = Math.floor(rnd() * W), y = Math.floor(rnd() * 5);
      const cases = forme < .45 ? [[x, y]] : forme < .75 ? [[x, y], [x + 1, y]] : forme < .9 ? [[x, y], [x, y + 1]] : [[x, y], [x + 1, y], [x + 2, y]];
      if (cases.some(([a, b]) => a >= W || b > 4 || libreAutour.has(a + ',' + b) || libreAutour.has((W - 1 - a) + ',' + (H - 1 - b)))) continue;
      for (const [a, b] of cases) if (g[b][a] !== '#') { g[b][a] = '#'; g[H - 1 - b][W - 1 - a] = '#'; n++; }
    }
    g[8][4] = 'K'; g[1][4] = 'Z';
    if (carteJouable(g)) return g.map(r => r.join(''));
  }
  return CARTES[0].rows.slice();
}
function carteJouable(g) {
  const libre = (x, y) => x >= 0 && y >= 0 && x < W && y < H && g[y][x] !== '#';
  let total = 0, depart = null;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (libre(x, y)) {
    total++; if (!depart) depart = [x, y];
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => libre(x + dx, y + dy)).length < 2) return false;
  }
  const vu = new Set([depart.join(',')]), file = [depart];
  while (file.length) { const [x, y] = file.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy, k = a + ',' + b; if (libre(a, b) && !vu.has(k)) { vu.add(k); file.push([a, b]); } } }
  return vu.size === total;
}
// La carte d'une manche de duel : niveau 0 à la première manche, puis de plus en plus chargée.
const carteDeManche = (graine, manche) => ({ rows: genererCarte(graine, Math.min(4, Math.max(0, manche - 1))), nom: 'Carte n° ' + String(graine % 10000).padStart(4, '0') });
