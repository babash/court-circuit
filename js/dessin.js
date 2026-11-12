/* Dessin du plateau : cases, peinture électrique, caisses, robots, éclairs.
   creerPlateau(canvas) renvoie un objet qui dessine une partie ; vue.retourne place le joueur du haut en bas, en cyan. */
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COL = { K: '#22D3EE', Z: '#FF5CA8' }, DARK = { K: '#0B5568', Z: '#8E1450' }, FILL = { 1: 'rgba(34,211,238,', 2: 'rgba(255,92,168,' };
function creerPlateau(canvas) {
let C = 30, ctx = null, WALLS = new Set(), FLIP = false;
const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
function ajuster(largeur, hauteur) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  C = Math.max(10, Math.floor(Math.min(largeur / W, hauteur / H)));
  canvas.style.width = C * W + 'px'; canvas.style.height = C * H + 'px'; canvas.width = C * W * dpr; canvas.height = C * H * dpr;
  ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return C;
}
const VX = x => FLIP ? W - 1 - x : x, VY = y => FLIP ? H - 1 - y : y;
const QUI = w => FLIP ? (w === 'K' ? 'Z' : 'K') : w, TEINTE = c => FLIP && c ? 3 - c : c;
function floor(x, y) { const px = VX(x) * C, py = VY(y) * C; ctx.fillStyle = (x + y) % 2 ? '#16213A' : '#1A2742'; ctx.fillRect(px, py, C, C); ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(px, py, C, 1); ctx.fillRect(px, py, 1, C); }
function wall(x, y) {
  const px = VX(x) * C, py = VY(y) * C, m = C * .05;
  ctx.fillStyle = '#323E57'; rr(px + m, py + m, C - 2 * m, C - 2 * m, C * .12); ctx.fill();
  ctx.fillStyle = '#56627E'; rr(px + m, py + m, C - 2 * m, C * .7, C * .12); ctx.fill();
  ctx.fillStyle = '#76839F'; rr(px + C * .18, py + C * .16, C * .64, C * .24, C * .06); ctx.fill();
}
function painted(x, y, c, s) {
  const px = VX(x) * C, py = VY(y) * C; c = TEINTE(c); const f = FILL[c], m = C * (.5 - .46 * s);
  ctx.fillStyle = f + '.55)'; rr(px + m, py + m, C - 2 * m, C - 2 * m, C * .14); ctx.fill();
  if (s < 1) return;
  ctx.strokeStyle = f + '.95)'; ctx.lineWidth = Math.max(1, C * .045); ctx.beginPath();
  // petit circuit imprimé, orienté selon la case
  const v = (x * 7 + y * 3) % 4, a = C * .3, b = C * .7;
  if (v === 0) { ctx.moveTo(px + a, py + C * .2); ctx.lineTo(px + a, py + C * .5); ctx.lineTo(px + b, py + C * .5); ctx.lineTo(px + b, py + C * .8); }
  else if (v === 1) { ctx.moveTo(px + C * .2, py + a); ctx.lineTo(px + C * .5, py + a); ctx.lineTo(px + C * .5, py + b); ctx.lineTo(px + C * .8, py + b); }
  else if (v === 2) { ctx.moveTo(px + b, py + C * .2); ctx.lineTo(px + b, py + C * .45); ctx.lineTo(px + a, py + C * .55); ctx.lineTo(px + a, py + C * .8); }
  else { ctx.moveTo(px + C * .2, py + b); ctx.lineTo(px + C * .5, py + b); ctx.lineTo(px + C * .5, py + a); ctx.lineTo(px + C * .8, py + a); }
  ctx.stroke(); ctx.fillStyle = f + '1)'; ctx.beginPath(); ctx.arc(px + (v % 2 ? C * .8 : b), py + (v % 2 ? (v === 1 ? b : a) : C * .8), C * .06, 0, 7); ctx.fill();
}
// une caisse : elle bloque la case et garde sa couleur ; le liseré dit à qui elle est
function caisse(x, y, w) {
  const px = VX(x) * C, py = VY(y) * C, m = C * .16, s = C - 2 * m;
  ctx.fillStyle = '#5B4630'; rr(px + m, py + m, s, s, C * .08); ctx.fill();
  ctx.strokeStyle = '#8C6B45'; ctx.lineWidth = Math.max(1, C * .05); ctx.beginPath();
  ctx.moveTo(px + m, py + m); ctx.lineTo(px + m + s, py + m + s); ctx.moveTo(px + m + s, py + m); ctx.lineTo(px + m, py + m + s); ctx.stroke();
  ctx.strokeStyle = COL[QUI(w)]; ctx.lineWidth = Math.max(1.5, C * .07); rr(px + m, py + m, s, s, C * .08); ctx.stroke();
}
function robot(w, x, y, ang, t, st) {
  if (FLIP) { x = W - 1 - x; y = H - 1 - y; ang += Math.PI; } w = QUI(w);
  const px = (x + .5) * C, py = (y + .5) * C, s = C * .42, col = COL[w], dk = DARK[w];
  ctx.save(); ctx.translate(px, py);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(0, s * .95, s * .9, s * .25, 0, 0, 7); ctx.fill();
  ctx.rotate(ang);
  if (st.frozen) ctx.globalAlpha = .75;
  ctx.fillStyle = '#0B1020'; rr(-s * 1.02, -s * .78, s * .34, s * 1.56, s * .14); ctx.fill(); rr(s * .68, -s * .78, s * .34, s * 1.56, s * .14); ctx.fill();
  ctx.fillStyle = '#3A4766'; for (let i = 0; i < 3; i++) { ctx.fillRect(-s * .96, -s * .6 + i * s * .5, s * .22, s * .14); ctx.fillRect(s * .74, -s * .6 + i * s * .5, s * .22, s * .14); }
  ctx.fillStyle = dk; rr(-s * .74, -s * .82, s * 1.48, s * 1.64, s * .3); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, C * .06); ctx.stroke();
  ctx.fillStyle = '#E8F7FF'; rr(-s * .56, -s * .7, s * 1.12, s * .5, s * .16); ctx.fill();
  ctx.fillStyle = '#0B1020'; const blink = !RM && Math.floor(t * 0.7 + (w === 'K' ? 0 : 3)) % 9 === 0;
  for (const ex of [-.26, .26]) { ctx.beginPath(); if (blink) ctx.rect(ex * s - s * .1, -s * .47, s * .2, s * .04); else ctx.arc(ex * s, -s * .45, s * .1, 0, 7); ctx.fill(); }
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -s * 1.2); ctx.lineTo(-s * .2, -s * .9); ctx.lineTo(s * .2, -s * .9); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, C * .04); ctx.beginPath(); ctx.moveTo(0, s * .45); ctx.lineTo(0, s * .75); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, s * .25, s * .14, 0, 7); ctx.fill();
  ctx.globalAlpha = 1; ctx.restore();
  if (st.frozen) { ctx.strokeStyle = '#E0F2FE'; ctx.lineWidth = Math.max(1, C * .05); for (let i = 0; i < 4; i++) { const a = i * 1.57 + (RM ? 0 : Math.floor(t * 8) * .7); ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * s * .5, py + Math.sin(a) * s * .5); ctx.lineTo(px + Math.cos(a + .4) * s * .95, py + Math.sin(a + .4) * s * .95); ctx.lineTo(px + Math.cos(a + .1) * s * 1.25, py + Math.sin(a + .1) * s * 1.25); ctx.stroke(); } }
  if (st.immune) { ctx.strokeStyle = 'rgba(224,242,254,.7)'; ctx.setLineDash([C * .1, C * .08]); ctx.lineWidth = Math.max(1, C * .04); ctx.beginPath(); ctx.arc(px, py, s * 1.3, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
}
function bolt(x0, y0, x1, y1, col, a, seed) {
  ctx.globalAlpha = a; const n = 7, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  for (const [lw, c] of [[C * .22, col], [C * .08, '#FFFFFF']]) {
    ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0);
    for (let i = 1; i < n; i++) { const j = ((seed * 97 + i * 53) % 11 - 5) / 5 * C * .22; ctx.lineTo(x0 + dx * i / n + nx * j, y0 + dy * i / n + ny * j); }
    ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
const ANG = d => d * Math.PI / 2;
function dessiner(frames, p, opt = {}) {
  if (!ctx || !frames.length) return; FLIP = !!opt.retourne; if (opt.murs) WALLS = opt.murs;
  const i = Math.min(frames.length - 1, Math.max(0, Math.floor(p))), f = frames[i], prev = frames[Math.max(0, i - 1)], fr = p - i, t = p / 10;
  ctx.clearRect(0, 0, C * W, C * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = x + y * W; if (WALLS.has(k)) { wall(x, y); continue; }
    floor(x, y); const c = f.paint[k];
    if (c) { const fresh = prev.paint[k] !== c && i > 0; painted(x, y, c, fresh && !RM ? Math.min(1, .35 + fr * .65) : 1); }
  }
  for (const [k, w] of (f.cr || [])) caisse(k % W, Math.floor(k / W), w);
  if (opt.path && opt.path.length > 1) {
    ctx.strokeStyle = 'rgba(34,211,238,.85)'; ctx.lineWidth = Math.max(2, C * .08); ctx.setLineDash([C * .16, C * .12]); ctx.lineCap = 'round';
    ctx.beginPath(); opt.path.forEach(([x, y], j) => j ? ctx.lineTo((VX(x) + .5) * C, (VY(y) + .5) * C) : ctx.moveTo((VX(x) + .5) * C, (VY(y) + .5) * C)); ctx.stroke(); ctx.setLineDash([]);
    const [ex, ey] = opt.path[opt.path.length - 1]; ctx.fillStyle = 'rgba(34,211,238,.85)'; ctx.beginPath(); ctx.arc((VX(ex) + .5) * C, (VY(ey) + .5) * C, C * .12, 0, 7); ctx.fill();
  }
  // éclairs et chocs récents
  for (let j = Math.max(1, i - 5); j <= i; j++) for (const e of frames[j].ev) {
    const age = (i - j + fr) / 5; if (age > 1) continue;
    if (e.type === 'eclair') for (const [d, l] of e.rayons) { let [dx, dy] = DV[d]; if (FLIP) { dx = -dx; dy = -dy; } const len = Math.max(.45, l), ex = VX(e.x), ey = VY(e.y); bolt((ex + .5 + dx * .35) * C, (ey + .5 + dy * .35) * C, (ex + .5 + dx * len) * C, (ey + .5 + dy * len) * C, COL[QUI(e.who)], (1 - age) * (e.hit ? 1 : .7), j + d); }
    if (e.type === 'caisse') { ctx.strokeStyle = `rgba(255,255,255,${.8 * (1 - age)})`; ctx.lineWidth = Math.max(1, C * .06); ctx.strokeRect(VX(e.x) * C + 1, VY(e.y) * C + 1, C - 2, C - 2); }
    if (e.type === 'hit') { ctx.fillStyle = `rgba(255,255,255,${.5 * (1 - age)})`; ctx.fillRect((VX(e.x) - 1) * C, (VY(e.y) - 1) * C, C * 3, C * 3); }
  }
  for (const w of ['Z', 'K']) {
    const q = f.P[w], pq = prev.P[w], k = RM ? 1 : Math.max(0, Math.min(1, (p - q.ms) / 2.4));
    const x = q.fx + (q.x - q.fx) * k, y = q.fy + (q.y - q.fy) * k;
    let a0 = ANG(pq.d), a1 = ANG(q.d); if (a1 - a0 > Math.PI) a0 += 2 * Math.PI; if (a0 - a1 > Math.PI) a1 += 2 * Math.PI;
    const ang = RM || i === 0 ? a1 : a0 + (a1 - a0) * Math.min(1, fr * 1.6);
    robot(w, x, y, ang, t, q);
  }
}
return { ajuster, dessiner, get C() { return C; } };
}
