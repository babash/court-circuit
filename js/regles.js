/* Court-circuit : règles du duel de robots peintres. Déterministe, 1 tick = 100 ms. */
const W = 9, H = 10;
const ACTIONS = new Set(['avancer', 'gauche', 'droite', 'eclair', 'attendre']);
const DV = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const REL = { devant: 0, droite: 1, derriere: 2, gauche: 3 };
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
  const rows = cfg.map, walls = new Set(), paint = new Uint8Array(W * H), start = {};
  const key = (x, y) => x + y * W, inB = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') walls.add(key(x, y)); if (c === 'K' || c === 'Z') start[c] = [x, y]; }));
  const isWall = (x, y) => !inB(x, y) || walls.has(key(x, y));
  const COL = { K: 1, Z: 2 }, other = w => w === 'K' ? 'Z' : 'K';
  const P = {}; let t = 0; const frames = [], pending = [];
  // vitesse : chaque action écrite en plus de la première ralentit le robot (une boucle n'écrit qu'une fois)
  const periodOf = (n, rep) => cfg.speed === 'fixe' ? PERIOD : cfg.speed === 'actions' ? PERIOD + Math.floor(Math.max(0, n - 1) / (cfg.slope ?? 2)) : PERIOD + rep;
  function makeCtx(w) {
    const p = P[w], o = () => P[other(w)];
    const cell = d => { const r = REL[d ?? 'devant']; if (r === undefined) throw erreur('ValueError', `unknown direction ${JSON.stringify(d)} (use "droite", "gauche" or "devant")`, p.ctx && p.ctx.line); const [dx, dy] = DV[(p.d + r) % 4]; return [p.x + dx, p.y + dy]; };
    const env = {
      libre: d => { const [x, y] = cell(d); return !isWall(x, y) && !(o().x === x && o().y === y); },
      couleur: d => { const [x, y] = cell(d); if (isWall(x, y)) return 'mur'; const c = paint[key(x, y)]; return c === 0 ? 'vide' : c === COL[w] ? 'moi' : 'adversaire'; },
      cible: () => { const q = o(); if (q.frozen > 0 || q.immune > 0) return false; const [dx, dy] = DV[p.d]; for (let r = 1; r <= RANGE; r++) { const x = p.x + dx * r, y = p.y + dy * r; if (isWall(x, y)) return false; if (q.x === x && q.y === y) return true; } return false; },
      distance: () => Math.abs(p.x - o().x) + Math.abs(p.y - o().y),
      score: () => count(w), score_adversaire: () => count(other(w)),
    };
    env.libre.nargs = 1; env.couleur.nargs = 1;
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
    P[w] = { who: w, x, y, fx: x, fy: y, d: w === 'K' ? 0 : 2, ms: -10, wait: 4, frozen: 0, immune: 0, blk: 0, ver: 0, act: null, stats: { new: 0, stolen: 0, hits: 0, hurt: 0, blocked: 0 } };
    if (inB(x, y)) paint[key(x, y)] = COL[w];
  }
  load('K', cfg.code.K || ''); load('Z', cfg.code.Z || '');
  const snap = ev => frames.push({ t, ev, paint: paint.slice(), P: Object.fromEntries(['K', 'Z'].map(w => { const p = P[w]; return [w, { x: p.x, y: p.y, fx: p.fx, fy: p.fy, d: p.d, ms: p.ms, md: p.period, frozen: p.frozen, immune: p.immune, line: p.line, done: p.done, ver: p.ver, blk: p.blk, act: p.act }]; })), score: { K: count('K'), Z: count('Z') } });
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
    // 1. virages
    for (const [w, a] of ready) { const p = P[w]; p.act = a.a; if (a.a === 'droite') p.d = (p.d + 1) % 4; if (a.a === 'gauche') p.d = (p.d + 3) % 4; if (a.a === 'droite' || a.a === 'gauche' || a.a === 'attendre' || a.a === 'watchdog') p.blk = 0; }
    // 2. déplacements simultanés
    const tg = {};
    for (const [w, a] of ready) if (a.a === 'avancer') { const p = P[w], [dx, dy] = DV[p.d]; tg[w] = [p.x + dx, p.y + dy]; }
    const failed = Object.keys(tg).filter(w => { const q = P[other(w)], [x, y] = tg[w], o = tg[other(w)]; return isWall(x, y) || (q.x === x && q.y === y) || (o && o[0] === x && o[1] === y && w !== ((((t + (cfg.seed || 0)) * 2654435761) >>> 0) % 2 ? 'K' : 'Z')); });
    for (const w of failed) { const p = P[w], [x, y] = tg[w]; p.blk++; p.stats.blocked++; ev.push({ type: isWall(x, y) ? 'wall' : 'bump', who: w, n: p.blk }); }
    for (const w of failed) tg[w] = null;
    for (const w of Object.keys(tg)) if (tg[w]) {
      const p = P[w], [x, y] = tg[w], k = key(x, y), before = paint[k];
      p.fx = p.x; p.fy = p.y; p.x = x; p.y = y; p.ms = t; p.blk = 0;
      if (before !== COL[w]) { if (before === 0) p.stats.new++; else { p.stats.stolen++; ev.push({ type: 'steal', who: w, x, y }); } paint[k] = COL[w]; }
    }
    // 3. éclairs
    for (const [w, a] of ready) if (a.a === 'eclair') {
      const p = P[w], q = P[other(w)], [dx, dy] = DV[p.d]; let len = 0, hit = false;
      for (let r = 1; r <= RANGE; r++) { const x = p.x + dx * r, y = p.y + dy * r; if (isWall(x, y)) break; len = r; if (q.x === x && q.y === y) { hit = q.frozen === 0 && q.immune === 0; break; } }
      ev.push({ type: 'eclair', who: w, x: p.x, y: p.y, d: p.d, len, hit });
      if (hit) {
        p.stats.hits++; q.stats.hurt++;
        if (SPLASH) { const sx = q.x, sy = q.y, cells = []; for (let yy = sy - SPLASH; yy <= sy + SPLASH; yy++) for (let xx = sx - SPLASH; xx <= sx + SPLASH; xx++) if (!isWall(xx, yy) && paint[key(xx, yy)] !== COL[w]) { if (paint[key(xx, yy)] === COL[q.who]) p.stats.stolen++; else p.stats.new++; paint[key(xx, yy)] = COL[w]; } }
        q.frozen = STUN; q.wait = 1; q.blk = 0; ev.push({ type: 'hit', who: q.who, by: w, x: q.x, y: q.y });
        if (cfg.hit === 'base') { q.fx = q.x = start[q.who][0]; q.fy = q.y = start[q.who][1]; q.d = q.who === 'K' ? 0 : 2; q.ms = t; load(q.who, q.src); }

      }
    }
    if (t >= TMAX) { const k = count('K'), z = count('Z'); ev.push({ type: 'end', result: k > z ? 'K' : z > k ? 'Z' : 'tie', k, z }); snap(ev); return false; }
    snap(ev); return true;
  }
  function setCode(w, src) { load(w, src); const p = P[w]; p.ver++; p.blk = 0; p.endSaid = false; p.wait = Math.min(p.wait, 2); pending.push({ type: 'send', who: w }); }
  return { tick, setCode, frames, P, paint, count, get t() { return t; }, get result() { const k = count('K'), z = count('Z'); return k > z ? 'K' : z > k ? 'Z' : 'tie'; }, start, walls };
}
// Aperçu : trajet du robot seul pendant n actions
function preview(map, w, src, n = 24) {
  const m = createMatch({ map, code: { [w]: src, [w === 'K' ? 'Z' : 'K']: '' }, tmax: 4 + n * 3 + 1 });
  const out = [[m.P[w].x, m.P[w].y]]; while (m.tick()) { const p = m.P[w], l = out[out.length - 1]; if (p.x !== l[0] || p.y !== l[1]) out.push([p.x, p.y]); }
  return out;
}
