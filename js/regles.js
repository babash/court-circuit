/* Court-circuit : règles du duel de robots peintres. Déterministe, 1 tick = 100 ms.
   Les directions sont celles des TD : nord(), sud(), est(), ouest(), vues par chaque élève
   (le nord est toujours vers le haut de son écran, du côté de l'adversaire). */
const W = 9, H = 10;
const ACTIONS = new Set(['nord', 'sud', 'est', 'ouest', 'eclair', 'poserCaisse', 'attendre']);
const DV = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // nord, est, sud, ouest (dans le sens du plateau de K)
const DIR = { nord: 0, est: 1, sud: 2, ouest: 3 };
const CAISSES = 3; // caisses par robot et par match
const countActs = b => b.reduce((n, s) => n + (s.k === 'expr' && s.e.k === 'call' && ACTIONS.has(s.e.t.s) ? 1 : 0) + (s.body ? countActs(s.body) : 0) + (s.then ? countActs(s.then) : 0) + (s.other ? countActs(s.other) : 0), 0);
// Lignes répétées : une ligne qui recopie la ligne (ou le groupe de lignes) juste au-dessus.
// Chaque ligne répétée ralentit le robot d'un dixième de seconde par action : une boucle évite de recopier.
function countRep(src) {
  const L = src.split('\n').map(l => l.replace(/#.*$/, '').replace(/\s+$/, '')).filter(l => l.trim());
  let n = 0;
  for (let i = 1; i < L.length; i++) {
    for (let k = 1; k <= 6 && 2 * k <= i + 1; k++) {
      let same = true; for (let j = 0; j < k; j++) if (L[i - j] !== L[i - k - j]) { same = false; break; }
      if (same) { n++; break; }
    }
  }
  return n;
}
function createMatch(cfg) {
  const PERIOD = cfg.period ?? 3, STUN = cfg.stun ?? 20, IMM = cfg.immune ?? 30, RANGE = cfg.range ?? 3, TMAX = cfg.tmax ?? 300, SPLASH = cfg.splash ?? 1;
  const rows = cfg.map, walls = new Set(), crates = new Map(), paint = new Uint8Array(W * H), start = {};
  const key = (x, y) => x + y * W, inB = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') walls.add(key(x, y)); if (c === 'K' || c === 'Z') start[c] = [x, y]; }));
  const isWall = (x, y) => !inB(x, y) || walls.has(key(x, y));
  const isBlock = (x, y) => isWall(x, y) || crates.has(key(x, y)); // un mur, le bord ou une caisse
  const COL = { K: 1, Z: 2 }, other = w => w === 'K' ? 'Z' : 'K';
  // la direction vue par l'élève w, en direction du plateau (Z voit le plateau retourné)
  const monde = (w, d) => w === 'K' ? d : (d + 2) % 4;
  const P = {}; let t = 0; const frames = [], pending = [];
  const periodOf = (n, rep) => cfg.speed === 'fixe' ? PERIOD : PERIOD + rep;
  function voisin(w, d) { const p = P[w], [dx, dy] = DV[monde(w, d)]; return [p.x + dx, p.y + dy]; }
  // l'éclair part dans les 4 directions, sur 3 cases, et s'arrête au premier mur ou à la première caisse ;
  // un robot posé sur une caisse (la sienne, avant d'en sortir) peut être touché
  function rayons(w) {
    const p = P[w], q = P[other(w)], out = [];
    for (let d = 0; d < 4; d++) {
      const [dx, dy] = DV[d]; let len = 0, touche = false;
      for (let r = 1; r <= RANGE; r++) { const x = p.x + dx * r, y = p.y + dy * r; if (q.x === x && q.y === y) { len = r; touche = true; break; } if (isBlock(x, y)) break; len = r; }
      out.push({ d, len, touche });
    }
    return out;
  }
  function makeCtx(w) {
    const p = P[w], o = () => P[other(w)];
    const obstacle = d => () => { const [x, y] = voisin(w, d); return isBlock(x, y) || (o().x === x && o().y === y); };
    const cibleVers = d => () => { const q = o(); if (q.frozen > 0 || q.immune > 0) return false; return rayons(w)[monde(w, d)].touche; };
    const couleur = d => () => { const [x, y] = voisin(w, d); if (isBlock(x, y)) return 'mur'; const c = paint[key(x, y)]; return c === 0 ? 'vide' : c === COL[w] ? 'moi' : 'adversaire'; };
    const env = {
      obstacleNord: obstacle(0), obstacleEst: obstacle(1), obstacleSud: obstacle(2), obstacleOuest: obstacle(3),
      couleurNord: couleur(0), couleurEst: couleur(1), couleurSud: couleur(2), couleurOuest: couleur(3),
      cible: () => { const q = o(); if (q.frozen > 0 || q.immune > 0) return false; return rayons(w).some(r => r.touche); },
      // la même chose dans une seule direction, vue par l'élève (le nord est en haut de son écran)
      cibleNord: cibleVers(0), cibleEst: cibleVers(1), cibleSud: cibleVers(2), cibleOuest: cibleVers(3),
      distance: () => Math.abs(p.x - o().x) + Math.abs(p.y - o().y),
      caisses: () => p.caisses,
      score: () => count(w), score_adversaire: () => count(other(w)),
    };
    return { env, vars: {}, loops: {}, cond: {}, line: 1, ops: 0 };
  }
  function load(w, src) {
    const parsed = src.trim() ? parse(src) : { prog: [], rows: [] }, p = P[w];
    p.src = src; p.rows = parsed.rows; p.acts = countActs(parsed.prog); p.rep = countRep(src); p.period = periodOf(p.acts, p.rep);
    p.ctx = makeCtx(w); p.gen = runBlock(parsed.prog, p.ctx); p.done = false; p.line = parsed.rows.length ? parsed.rows[0].line : 1;
  }
  const count = w => { let n = 0; for (const c of paint) if (c === COL[w]) n++; return n; };
  if (cfg.solo) start.Z = [-9, -9];
  for (const w of ['K', 'Z']) {
    const [x, y] = start[w];
    P[w] = { who: w, x, y, fx: x, fy: y, d: w === 'K' ? 0 : 2, ms: -10, wait: 4, frozen: 0, immune: 0, blk: 0, ver: 0, act: null, caisses: CAISSES, stats: { new: 0, stolen: 0, hits: 0, hurt: 0, blocked: 0, caisses: 0 } };
    if (inB(x, y)) paint[key(x, y)] = COL[w];
  }
  load('K', cfg.code.K || ''); load('Z', cfg.code.Z || '');
  const snap = ev => frames.push({ t, ev, paint: paint.slice(), cr: crates.size ? [...crates] : [], P: Object.fromEntries(['K', 'Z'].map(w => { const p = P[w]; return [w, { x: p.x, y: p.y, fx: p.fx, fy: p.fy, d: p.d, ms: p.ms, md: p.period, frozen: p.frozen, immune: p.immune, line: p.line, done: p.done, ver: p.ver, blk: p.blk, act: p.act, caisses: p.caisses }]; })), score: { K: count('K'), Z: count('Z') } });
  snap([]);
  function nextAction(w) {
    const p = P[w]; if (p.done) return null;
    try { const r = p.gen.next(); if (r.done) { p.done = true; return null; } return r.value; }
    catch (e) { p.done = true; p.err = { type: e.type || 'Error', msg: e.msg || String(e.message), ligne: e.ligne || p.line }; return null; }
  }
  function tick() {
    if (t >= TMAX) return false;
    t++; const ev = pending.splice(0);
    const ready = [];
    for (const w of ['K', 'Z']) {
      const p = P[w];
      if (p.frozen > 0) { if (--p.frozen === 0) p.immune = IMM; continue; }
      if (p.immune > 0) p.immune--;
      if (--p.wait > 0) continue;
      const a = nextAction(w);
      if (!a) { p.wait = 1; if (p.done && !p.endSaid) { p.endSaid = true; ev.push({ type: 'end_code', who: w, err: p.err }); } continue; }
      p.line = a.line; p.wait = p.period; ready.push([w, a]);
    }
    for (const [w, a] of ready) { P[w].act = a.a; if (!(a.a in DIR)) P[w].blk = 0; }
    // 1. caisses : posée sous le robot, elle bloque la case dès qu'il en sort
    for (const [w, a] of ready) if (a.a === 'poserCaisse') {
      const p = P[w], k = key(p.x, p.y);
      if (p.caisses > 0 && !crates.has(k)) { crates.set(k, w); p.caisses--; p.stats.caisses++; ev.push({ type: 'caisse', who: w, x: p.x, y: p.y, reste: p.caisses }); }
      else ev.push({ type: 'caisse_vide', who: w, reste: p.caisses });
    }
    // 2. déplacements simultanés
    const tg = {};
    for (const [w, a] of ready) if (a.a in DIR) { const p = P[w], d = monde(w, DIR[a.a]), [dx, dy] = DV[d]; p.d = d; tg[w] = [p.x + dx, p.y + dy]; }
    const failed = Object.keys(tg).filter(w => { const q = P[other(w)], [x, y] = tg[w], o = tg[other(w)]; return isBlock(x, y) || (q.x === x && q.y === y) || (o && o[0] === x && o[1] === y && w !== ((((t + (cfg.seed || 0)) * 2654435761) >>> 0) % 2 ? 'K' : 'Z')); });
    for (const w of failed) { const p = P[w], [x, y] = tg[w]; p.blk++; p.stats.blocked++; ev.push({ type: isBlock(x, y) ? 'wall' : 'bump', who: w, n: p.blk }); }
    for (const w of failed) tg[w] = null;
    for (const w of Object.keys(tg)) if (tg[w]) {
      const p = P[w], [x, y] = tg[w], k = key(x, y), before = paint[k];
      p.fx = p.x; p.fy = p.y; p.x = x; p.y = y; p.ms = t; p.blk = 0;
      if (before !== COL[w]) { if (before === 0) p.stats.new++; else { p.stats.stolen++; ev.push({ type: 'steal', who: w, x, y }); } paint[k] = COL[w]; }
    }
    // 3. éclairs : les deux éclairs d'un même instant sont décidés ensemble (aucun robot n'est avantagé)
    const coups = [];
    for (const [w, a] of ready) if (a.a === 'eclair') {
      const p = P[w], q = P[other(w)], rs = rayons(w), hit = rs.some(x => x.touche) && q.frozen === 0 && q.immune === 0;
      ev.push({ type: 'eclair', who: w, x: p.x, y: p.y, rayons: rs.map(x => [x.d, x.len]), hit });
      if (hit) { const zone = []; for (let yy = q.y - SPLASH; yy <= q.y + SPLASH; yy++) for (let xx = q.x - SPLASH; xx <= q.x + SPLASH; xx++) if (!isBlock(xx, yy)) zone.push(key(xx, yy)); coups.push({ w, q, zone }); }
    }
    const deux = coups.length === 2 ? new Set(coups[0].zone.filter(k => coups[1].zone.includes(k))) : new Set();
    for (const { w, q, zone } of coups) {
      const p = P[w]; p.stats.hits++; q.stats.hurt++;
      for (const k of zone) if (!deux.has(k) && paint[k] !== COL[w]) { if (paint[k] === COL[q.who]) p.stats.stolen++; else p.stats.new++; paint[k] = COL[w]; }
      q.frozen = STUN; q.wait = 1; q.blk = 0; ev.push({ type: 'hit', who: q.who, by: w, x: q.x, y: q.y });
    }
    if (t >= TMAX) { const k = count('K'), z = count('Z'); ev.push({ type: 'end', result: k > z ? 'K' : z > k ? 'Z' : 'tie', k, z }); snap(ev); return false; }
    snap(ev); return true;
  }
  function setCode(w, src) { load(w, src); const p = P[w]; p.ver++; p.blk = 0; p.endSaid = false; p.wait = Math.min(p.wait, 2); pending.push({ type: 'send', who: w }); }
  return { tick, setCode, frames, P, paint, crates, count, get t() { return t; }, get result() { const k = count('K'), z = count('Z'); return k > z ? 'K' : z > k ? 'Z' : 'tie'; }, start, walls };
}
// Aperçu : trajet du robot seul pendant n actions
function preview(map, w, src, n = 24) {
  const m = createMatch({ map, code: { [w]: src, [w === 'K' ? 'Z' : 'K']: '' }, tmax: 4 + n * 3 + 1 });
  const out = [[m.P[w].x, m.P[w].y]]; while (m.tick()) { const p = m.P[w], l = out[out.length - 1]; if (p.x !== l[0] || p.y !== l[1]) out.push([p.x, p.y]); }
  return out;
}
