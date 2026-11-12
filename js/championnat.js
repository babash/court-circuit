/* Court-circuit : le mini-championnat de la classe, calculé par la page de l'enseignant·e.
   Le format : un système suisse classé à l'Elo.
   - Chaque élève commence à 1000 points.
   - À chaque ronde, les élèves sont appariés à un niveau proche (Elo voisin), jamais deux fois contre le ou la même
     tant que c'est possible. Un nombre impair : l'élève le moins bien classé·e qui n'a pas encore été exempté·e joue
     contre Zéro, sans effet sur son Elo.
   - Après chaque duel, l'Elo bouge selon le résultat attendu : battre plus fort·e que soi rapporte plus.
     K = 40 pour les 3 premiers duels (le classement se fait vite), puis 24.
   - Nombre de rondes conseillé : log2(nombre d'élèves) + 2, au moins 4 : de quoi séparer les niveaux.
   Rien n'est enregistré : le championnat vit tant que la page de l'enseignant·e est ouverte. */
const ELO_DEPART = 1000;
const rondesConseillees = n => Math.max(4, Math.ceil(Math.log2(Math.max(2, n))) + 2);
const attendu = (ra, rb) => 1 / (1 + Math.pow(10, (rb - ra) / 400));
const facteurK = j => j.j < 3 ? 40 : 24;
function nouveauJoueur(id, pseudo) { return { id, pseudo, elo: ELO_DEPART, j: 0, v: 0, e: 0, d: 0, exempt: 0, cases: 0, adv: [], present: true }; }
// Un duel joué : a et b sont deux fiches de joueur ; ka et kb leurs cases à la fin.
function noterDuel(a, b, ka, kb) {
  const sa = ka > kb ? 1 : ka < kb ? 0 : .5, ea = attendu(a.elo, b.elo), da = facteurK(a) * (sa - ea), db = facteurK(b) * ((1 - sa) - (1 - ea));
  a.elo += da; b.elo += db; a.j++; b.j++; a.cases += ka; b.cases += kb;
  if (sa === 1) { a.v++; b.d++; } else if (sa === 0) { a.d++; b.v++; } else { a.e++; b.e++; }
  a.adv.push(b.id); b.adv.push(a.id);
  return { da: Math.round(da), db: Math.round(db) };
}
// Le classement : Elo, puis victoires, puis cases prises.
function classer(table) {
  return [...table].sort((x, y) => y.elo - x.elo || y.v - x.v || y.cases - x.cases || x.pseudo.localeCompare(y.pseudo, 'fr'))
    .map((j, i) => ({ ...j, rang: i + 1, elo: Math.round(j.elo) }));
}
// Les paires d'une ronde (système suisse). Renvoie [[a, b], …, [exempt, null]].
function apparier(presents, alea = Math.random) {
  const l = presents.slice().map(j => ({ j, r: alea() })).sort((x, y) => y.j.elo - x.j.elo || x.r - y.r).map(x => x.j);
  let exempt = null;
  if (l.length % 2) { // l'exempt·e : en bas du classement, et le moins souvent exempté·e
    let k = l.length - 1; for (let i = l.length - 1; i >= 0; i--) if (l[i].exempt < l[k].exempt) k = i;
    exempt = l.splice(k, 1)[0];
  }
  const deja = (a, b) => a.adv.includes(b.id);
  let pas = 0;
  function suite(reste) { // retour arrière borné : au pire, une revanche plutôt qu'une ronde impossible
    if (!reste.length) return [];
    const a = reste[0];
    for (let i = 1; i < reste.length; i++) {
      if (deja(a, reste[i])) continue;
      if (++pas > 20000) break;
      const r = suite(reste.filter((_, k) => k !== 0 && k !== i)); if (r) return [[a, reste[i]], ...r];
    }
    return null;
  }
  let paires = suite(l);
  if (!paires) { paires = []; for (let i = 0; i + 1 < l.length; i += 2) paires.push([l[i], l[i + 1]]); }
  if (exempt) paires.push([exempt, null]);
  return paires;
}
