/* Les cartes : 9 colonnes, 10 lignes, symétriques par demi-tour. K part en bas, Z en haut. */
const CARTES = [
  { id: 'piste', nom: 'La piste', idee: 'Une boucle for suffit.', rows: [
    '.........', '....Z....', '.........', '.........', '.........', '.........', '.........', '.........', '....K....', '.........'] },
  { id: 'poteaux', nom: 'Les poteaux', idee: 'Tourner avec droite() ou gauche().', rows: [
    '.........', '....Z....', '.#.....#.', '.........', '...#.#...', '...#.#...', '.........', '.#.....#.', '....K....', '.........'] },
  { id: 'couloirs', nom: 'Les couloirs', idee: 'Répéter sans fin avec while True.', rows: [
    '..#...#..', '..#.Z.#..', '..#...#..', '.........', '..#...#..', '..#...#..', '.........', '..#...#..', '..#.K.#..', '..#...#..'] },
  { id: 'salles', nom: 'Les salles', idee: 'Regarder devant avec if libre().', rows: [
    '.........', '....Z....', '.........', '###.##.##', '.........', '.........', '##.##.###', '.........', '....K....', '.........'] },
  { id: 'damier', nom: 'Le damier', idee: 'Choisir ses cases avec couleur().', rows: [
    '.........', '....Z....', '.#.#.#.#.', '.........', '.#.#.#.#.', '.#.#.#.#.', '.........', '.#.#.#.#.', '....K....', '.........'] },
  { id: 'dedale', nom: 'Le dédale', idee: 'Combiner and, not et eclair().', rows: [
    '.........', '.##.Z.##.', '.#.....#.', '...#.#...', '.#.#.#.#.', '.#.#.#.#.', '...#.#...', '.#.....#.', '.##.K.##.', '.........'] },
];
const carte = i => CARTES[Math.max(0, Math.min(CARTES.length - 1, i))].rows;
