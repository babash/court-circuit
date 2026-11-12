/* Court-circuit : une partie à deux, rejouable à l'identique sur chaque appareil.
   Le journal de chaque joueur (code de départ, puis chaque code envoyé avec son instant) suffit à tout recalculer :
   deux appareils qui ont le même journal voient exactement le même match. */
const DUREE_TICKS = 300; // 30 s
const ZERO = [ // écrits du point de vue de Zéro : son nord va vers toi
  { nom: 'fait quelques pas', code: 'for i in range(3):\n    est()\nfor i in range(3):\n    nord()' },
  { nom: 'fait des zigzags', code: 'while True:\n    for i in range(4):\n        nord()\n    est()\n    for i in range(4):\n        sud()\n    est()' },
  { nom: 'longe les murs', code: 'while True:\n    while not obstacleNord():\n        nord()\n    est()\n    while not obstacleSud():\n        sud()\n    est()' },
  { nom: 'cherche les cases vides', code: 'while True:\n    if couleurNord() == "vide":\n        nord()\n    elif couleurEst() == "vide":\n        est()\n    elif couleurOuest() == "vide":\n        ouest()\n    elif couleurSud() == "vide":\n        sud()\n    elif not obstacleNord():\n        nord()\n    else:\n        est()' },
  { nom: 'électrise', code: 'n = 0\nwhile True:\n    n += 1\n    if cible():\n        eclair()\n    elif couleurNord() != "moi" and couleurNord() != "mur":\n        nord()\n    elif couleurEst() != "moi" and couleurEst() != "mur":\n        est()\n    elif couleurOuest() != "moi" and couleurOuest() != "mur":\n        ouest()\n    elif couleurSud() != "moi" and couleurSud() != "mur":\n        sud()\n    elif n % 4 == 0 and not obstacleOuest():\n        ouest()\n    elif n % 3 == 0 and not obstacleSud():\n        sud()\n    elif not obstacleEst():\n        est()\n    else:\n        nord()' },
];
class Partie {
  constructor({ carte, codeK, codeZ, seed = 1, solo = false, duree = DUREE_TICKS }) {
    this.carte = carte; this.seed = seed; this.solo = solo; this.duree = duree;
    this.log = { K: [{ seq: 0, tick: 0, code: codeK }], Z: [{ seq: 0, tick: 0, code: codeZ }] };
    this.reconstruire();
  }
  reconstruire() {
    const cible = this.m ? this.m.t : 0;
    this.m = createMatch({ map: this.carte, code: { K: this.log.K[0].code, Z: this.log.Z[0].code }, seed: this.seed, solo: this.solo, tmax: this.duree });
    this.applique = { K: 1, Z: 1 };
    this.avancer(cible);
  }
  // nouveaux événements d'un joueur (liste complète ou partielle) ; renvoie vrai si quelque chose a changé
  fusionner(qui, evs) {
    const l = this.log[qui]; let neuf = false, passe = false;
    for (const e of evs) {
      if (e.seq === 0 || l.some(x => x.seq === e.seq)) continue;
      l.push({ seq: e.seq, tick: Math.min(this.duree, Math.max(1, e.tick)), code: e.code }); neuf = true;
      if (e.tick <= this.m.t) passe = true;
    }
    if (!neuf) return false;
    l.sort((a, b) => a.tick - b.tick || a.seq - b.seq);
    if (passe) this.reconstruire();
    else { const i = l.findIndex((x, k) => k > 0 && x.tick > this.m.t); this.applique[qui] = i < 0 ? l.length : i; }
    return true;
  }
  // un code envoyé en direct : il agit 0,5 s plus tard, sur les deux appareils
  envoi(qui, code) {
    const l = this.log[qui], tick = Math.max(this.m.t + 5, l[l.length - 1].tick + 1);
    if (tick > this.duree - 5) return null;
    const e = { seq: l.length ? Math.max(...l.map(x => x.seq)) + 1 : 1, tick, code };
    this.fusionner(qui, [e]); return e;
  }
  avancer(cible) {
    cible = Math.min(cible, this.duree);
    while (this.m.t < cible) {
      for (const qui of ['K', 'Z']) {
        const l = this.log[qui];
        while (this.applique[qui] < l.length && l[this.applique[qui]].tick <= this.m.t + 1) {
          const e = l[this.applique[qui]++]; if (e.tick === this.m.t + 1) { try { this.m.setCode(qui, e.code); } catch (err) { /* code refusé : le robot garde l'ancien */ } }
        }
      }
      if (!this.m.tick()) break;
    }
  }
  get finie() { return this.m.t >= this.duree; }
  codeActuel(qui) { const l = this.log[qui]; let c = l[0].code; for (const e of l) if (e.tick <= this.m.t) c = e.code; return c; }
}
