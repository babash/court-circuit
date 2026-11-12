/* Court-circuit : un petit Python pour piloter les robots.
   Il comprend : for … in range(…), while, if / elif / else, and, or, not, les comparaisons,
   les variables (=, +=, -=), les nombres, les textes, les fonctions du jeu, et les fonctions
   que l'élève définit (def, return, pass, global), avec leurs variables locales comme en Python.
   Les erreurs sont écrites comme celles de Python (type, message, ligne). */
function erreur(type, msg, ligne) { const e = new Error(type + ': ' + msg); e.type = type; e.msg = msg; e.ligne = ligne; return e; }

function tokenize(src) {
  const rows = [];
  src.replace(/\r/g, '').split('\n').forEach((raw0, i) => {
    const raw = raw0.replace(/\t/g, '    '), line = i + 1;
    const indent = raw.length - raw.trimStart().length;
    const re = /\s*(?:(#.*)|("[^"\n]*"|'[^'\n]*')|(\d+)|([A-Za-z_À-ÿ][\wÀ-ÿ]*)|(<=|>=|==|!=|\+=|-=|[<>=+\-*/%():,\[\]]))/y;
    const toks = []; let m, col = 0;
    while (col < raw.length) {
      re.lastIndex = col; m = re.exec(raw);
      if (!m) {
        const rest = raw.slice(col); if (!rest.trim()) break;
        const c = rest.trim()[0];
        if (c === '"' || c === "'") throw erreur('SyntaxError', 'unterminated string literal', line);
        throw erreur('SyntaxError', `invalid character '${c}'`, line);
      }
      col = re.lastIndex;
      if (m[1] !== undefined) break; // commentaire
      let s = m[2] || m[3] || m[4] || m[5];
      if (m[2]) s = '"' + m[2].slice(1, -1) + '"';
      toks.push({ s, line, base: m[2] || s });
    }
    rows.push({ indent, toks, line });
  });
  return rows.filter(r => r.toks.length);
}

const MOTS_RESERVES = ['and', 'or', 'not', 'if', 'elif', 'else', 'while', 'for', 'in', 'def', 'return', 'pass', 'global', 'True', 'False'];
const estNom = s => /^[A-Za-z_À-ÿ]/.test(s) && !MOTS_RESERVES.includes(s);
// Les noms qui reçoivent une valeur dans une fonction y sont locaux (règle de Python), sauf s'ils sont déclarés global.
function nomsAffectes(b, out) {
  for (const s of b) {
    if (s.k === 'set' || s.k === 'def') out.add(s.name);
    if (s.k === 'for') out.add(s.v);
    for (const sous of [s.k === 'def' ? null : s.body, s.then, s.other]) if (sous) nomsAffectes(sous, out);
  }
  return out;
}

function parse(src) {
  const rows = tokenize(src); let ri = 0, tk = [], ti = 0, line = 1;
  const fonctions = []; // les def en cours de lecture (pour return et global)
  const peek = () => tk[ti] && tk[ti].s, take = () => tk[ti++];
  const fin = () => ti >= tk.length;
  const eat = s => {
    if (peek() === s) return take();
    if (s === ':') throw erreur('SyntaxError', "expected ':'", line);
    if (s === ')') throw erreur('SyntaxError', "'(' was never closed", line);
    throw erreur('SyntaxError', 'invalid syntax', line);
  };
  function atom() {
    const t = take(); if (!t) throw erreur('SyntaxError', 'invalid syntax', line);
    const s = t.s;
    if (/^\d+$/.test(s)) return { k: 'num', t };
    if (s[0] === '"') return { k: 'str', t };
    if (s === 'True' || s === 'False') return { k: 'bool', t };
    if (s === '(') { const e = orE(); eat(')'); return e; }
    if (s === '-') return { k: 'bin', o: { s: '-' }, a: { k: 'num', t: { s: '0' } }, b: atom() };
    if (!estNom(s)) throw erreur('SyntaxError', 'invalid syntax', line);
    if (peek() === '(') {
      take(); const args = [];
      while (peek() !== ')') { if (fin()) throw erreur('SyntaxError', "'(' was never closed", line); args.push(orE()); if (peek() === ',') take(); else if (peek() !== ')') { if (fin()) throw erreur('SyntaxError', "'(' was never closed", line); throw erreur('SyntaxError', "invalid syntax. Perhaps you forgot a comma?", line); } }
      take(); return { k: 'call', t, args, line };
    }
    return { k: 'var', name: s, line };
  }
  function mul() { let a = atom(); while (['*', '/', '%'].includes(peek())) { const o = take(); a = { k: 'bin', o, a, b: atom() }; } return a; }
  function add() { let a = mul(); while (peek() === '+' || peek() === '-') { const o = take(); a = { k: 'bin', o, a, b: mul() }; } return a; }
  function cmp() { let a = add(); if (['<', '<=', '>', '>=', '==', '!='].includes(peek())) { const o = take(); a = { k: 'cmp', o, a, b: add() }; } return a; }
  function notE() { if (peek() === 'not') { take(); return { k: 'not', a: notE() }; } return cmp(); }
  function andE() { let a = notE(); while (peek() === 'and') { const o = take(); a = { k: 'logic', o, a, b: notE() }; } return a; }
  function orE() { let a = andE(); while (peek() === 'or') { const o = take(); a = { k: 'logic', o, a, b: andE() }; } return a; }
  function cond() {
    const c = orE();
    if (peek() === '=') throw erreur('SyntaxError', "invalid syntax. Maybe you meant '==' or ':=' instead of '='?", line);
    return c;
  }
  function block(ind) { const out = []; while (ri < rows.length && rows[ri].indent === ind) out.push(stmt(ind)); return out; }
  function body(ind, l, mot) {
    if (ri >= rows.length || rows[ri].indent <= ind) throw erreur('IndentationError', `expected an indented block after '${mot}' statement on line ${l}`, ri < rows.length ? rows[ri].line : l + 1);
    return block(rows[ri].indent);
  }
  function stmt(ind) {
    const row = rows[ri++]; tk = row.toks; ti = 0; line = row.line; const l = line, h = peek();
    let s;
    if (h === 'for') {
      take(); const v = take(); if (!v || !/^[A-Za-z_]/.test(v.s)) throw erreur('SyntaxError', 'invalid syntax', l);
      eat('in'); if (peek() !== 'range') { const x = take(); throw erreur('TypeError', x && /^\d+$/.test(x.s) ? "'int' object is not iterable" : 'for … in range(…) : seule la fonction range est utilisée dans ce jeu', l); }
      take(); eat('('); const a = orE(); let b = null; if (peek() === ',') { take(); b = orE(); } eat(')'); eat(':');
      if (!fin()) throw erreur('SyntaxError', 'invalid syntax', l);
      s = { k: 'for', v: v.s, n: b ? b : a, from: b ? a : null, line: l, body: body(ind, l, 'for') };
    } else if (h === 'while') {
      take(); const c = cond(); eat(':'); if (!fin()) throw erreur('SyntaxError', 'invalid syntax', l);
      s = { k: 'while', c, line: l, body: body(ind, l, 'while') };
    } else if (h === 'if' || h === 'elif') {
      take(); const c = cond(); eat(':'); if (!fin()) throw erreur('SyntaxError', 'invalid syntax', l);
      s = { k: 'if', c, line: l, then: body(ind, l, h), other: null };
      if (ri < rows.length && rows[ri].indent === ind && rows[ri].toks[0].s === 'elif') s.other = [stmt(ind)];
      else if (ri < rows.length && rows[ri].indent === ind && rows[ri].toks[0].s === 'else') {
        const r2 = rows[ri++]; tk = r2.toks; ti = 1; line = r2.line; eat(':'); if (!fin()) throw erreur('SyntaxError', 'invalid syntax', r2.line);
        s.other = body(ind, r2.line, 'else');
      }
      return s;
    } else if (h === 'def') {
      take(); const n = take(); if (!n || !estNom(n.s)) throw erreur('SyntaxError', 'invalid syntax', l);
      if (peek() !== '(') throw erreur('SyntaxError', "expected '('", l);
      take(); const params = [];
      while (peek() !== ')') {
        const p = take(); if (!p || p.s === ':') throw erreur('SyntaxError', "'(' was never closed", l);
        if (!estNom(p.s)) throw erreur('SyntaxError', 'invalid syntax', l);
        if (params.includes(p.s)) throw erreur('SyntaxError', `duplicate argument '${p.s}' in function definition`, l);
        params.push(p.s);
        if (peek() === ',') take(); else if (peek() !== ')') throw erreur('SyntaxError', fin() ? "'(' was never closed" : 'invalid syntax', l);
      }
      take(); eat(':'); if (!fin()) throw erreur('SyntaxError', 'invalid syntax', l);
      fonctions.push(new Set()); const corps = body(ind, l, 'def'), globaux = fonctions.pop();
      const locaux = nomsAffectes(corps, new Set(params)); for (const g of globaux) locaux.delete(g);
      s = { k: 'def', name: n.s, params, body: corps, locaux, globaux, line: l };
    } else if (h === 'return') {
      take(); if (!fonctions.length) throw erreur('SyntaxError', "'return' outside function", l);
      const e = fin() ? null : orE(); if (!fin()) throw erreur('SyntaxError', 'invalid syntax', l);
      s = { k: 'return', e, line: l };
    } else if (h === 'global') {
      take(); const noms = [];
      for (;;) { const v = take(); if (!v || !estNom(v.s)) throw erreur('SyntaxError', 'invalid syntax', l); noms.push(v.s); if (peek() !== ',') break; take(); }
      if (!fin()) throw erreur('SyntaxError', 'invalid syntax', l);
      if (fonctions.length) for (const v of noms) fonctions[fonctions.length - 1].add(v);
      s = { k: 'global', noms, line: l };
    } else if (h === 'pass') {
      take(); if (!fin()) throw erreur('SyntaxError', 'invalid syntax', l);
      s = { k: 'pass', line: l };
    } else if (h === 'else' || h === 'elif') {
      throw erreur('SyntaxError', 'invalid syntax', l);
    } else {
      const e = orE();
      if (peek() === '=' || peek() === '+=' || peek() === '-=') {
        const o = take().s; if (e.k !== 'var') throw erreur('SyntaxError', e.k === 'call' ? 'cannot assign to function call here' : 'cannot assign to expression', l);
        const v = orE(); s = { k: 'set', name: e.name, e: o === '=' ? v : { k: 'bin', o: { s: o[0] }, a: { k: 'var', name: e.name, line: l }, b: v }, line: l };
      } else if (e.k === 'var' && ACTIONS_ET_CAPTEURS.has(e.name)) {
        throw erreur('SyntaxError', `Missing parentheses in call to '${e.name}'. Did you mean ${e.name}(...)?`, l);
      } else s = { k: 'expr', e, line: l };
      if (!fin()) throw erreur('SyntaxError', 'invalid syntax', l);
    }
    return s;
  }
  if (!rows.length) return { prog: [], rows };
  if (rows[0].indent !== 0) throw erreur('IndentationError', 'unexpected indent', rows[0].line);
  const prog = block(0);
  if (ri < rows.length) {
    const r = rows[ri], plus = rows.slice(0, ri).some(x => x.indent === r.indent);
    throw erreur('IndentationError', plus ? 'unexpected indent' : 'unindent does not match any outer indentation level', r.line);
  }
  return { prog, rows };
}
const ACTIONS_ET_CAPTEURS = new Set(['nord', 'sud', 'est', 'ouest', 'eclair', 'poserCaisse', 'attendre',
  'obstacleNord', 'obstacleSud', 'obstacleEst', 'obstacleOuest', 'couleurNord', 'couleurSud', 'couleurEst', 'couleurOuest',
  'cible', 'cibleNord', 'cibleSud', 'cibleEst', 'cibleOuest', 'distance', 'caisses', 'score', 'score_adversaire']);
// Comme Python 3.10 et suivants : un nom presque juste reçoit une proposition (« Did you mean »).
function proche(nom, noms) {
  const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
  let best = null, bd = 99;
  for (const n of noms) { const v = n.toLowerCase() === nom.toLowerCase() ? 0 : lev(nom.toLowerCase(), n.toLowerCase()); if (v < bd) { bd = v; best = n; } }
  return best && bd <= Math.max(1, Math.floor(nom.length / 4)) && best !== nom ? best : null;
}
// Les noms qu'on peut proposer dans un « Did you mean » : les mots du jeu et les noms déjà connus.
function nomsConnus(c) { const out = [...ACTIONS_ET_CAPTEURS, ...Object.keys(c.vars)]; for (let f = c.cadre; f; f = f.parent) out.push(...Object.keys(f.vars)); return out; }
const nonDefini = (nom, c, line) => { const p = proche(nom, nomsConnus(c)); return erreur('NameError', `name '${nom}' is not defined` + (p ? `. Did you mean: '${p}'?` : ''), line); };
const nomDuType = v => v === null || v === undefined ? 'NoneType' : typeof v === 'boolean' ? 'bool' : typeof v === 'string' ? 'str' : typeof v === 'number' ? (Number.isInteger(v) ? 'int' : 'float') : v && v.fonction ? 'function' : 'object';
const PROFONDEUR_MAX = 100; // Python s'arrête à 1000 appels imbriqués ; ici, 100 suffisent largement

// Les variables : celles du programme (c.vars), et celles de la fonction en cours (c.cadre), comme en Python.
function lire(nom, c, line) {
  for (let f = c.cadre; f; f = f.parent) {
    if (f.globaux.has(nom)) break;
    if (f.locaux.has(nom)) {
      if (nom in f.vars) return f.vars[nom];
      if (f === c.cadre) throw erreur('UnboundLocalError', `cannot access local variable '${nom}' where it is not associated with a value`, line);
      throw erreur('NameError', `cannot access free variable '${nom}' where it is not associated with a value in enclosing scope`, line);
    }
  }
  if (nom in c.vars) return c.vars[nom];
  throw nonDefini(nom, c, line);
}
function trouver(nom, c) { // la valeur liée à ce nom, ou undefined, sans erreur
  for (let f = c.cadre; f; f = f.parent) { if (f.globaux.has(nom)) break; if (f.locaux.has(nom)) return f.vars[nom]; }
  return c.vars[nom];
}
function ecrire(nom, v, c) { if (c.cadre && !c.cadre.globaux.has(nom)) c.cadre.vars[nom] = v; else c.vars[nom] = v; }
const tropDArguments = (nom, max, n, line) => erreur('TypeError', `${nom}() takes ${max} positional argument${max === 1 ? '' : 's'} but ${n} ${n === 1 ? 'was' : 'were'} given`, line);

// Les expressions sont évaluées pas à pas (function*) : une fonction de l'élève peut faire bouger le robot.
function* evalG(n, c) {
  switch (n.k) {
    case 'num': return Number(n.t.s);
    case 'str': return n.t.s.slice(1, -1);
    case 'bool': return n.t.s === 'True';
    case 'var': return lire(n.name, c, n.line);
    case 'not': return !(yield* evalG(n.a, c));
    case 'logic': { const a = yield* evalG(n.a, c); return n.o.s === 'and' ? (a && (yield* evalG(n.b, c))) : (a || (yield* evalG(n.b, c))); }
    case 'cmp': { const a = yield* evalG(n.a, c), b = yield* evalG(n.b, c); return ({ '<': a < b, '<=': a <= b, '>': a > b, '>=': a >= b, '==': a === b, '!=': a !== b })[n.o.s]; }
    case 'bin': { const a = yield* evalG(n.a, c), b = yield* evalG(n.b, c); if (n.o.s === '/' && b === 0) throw erreur('ZeroDivisionError', 'division by zero', c.line); if (n.o.s === '%' && b === 0) throw erreur('ZeroDivisionError', 'integer modulo by zero', c.line); return ({ '+': a + b, '-': a - b, '*': a * b, '/': a / b, '%': a % b })[n.o.s]; }
    case 'call': return yield* appeler(n, c);
  }
}
function* appeler(n, c) {
  const nom = n.t.s, f = trouver(nom, c);
  if (f !== undefined) { // un nom de l'élève : sa fonction, ou une valeur qu'on ne peut pas appeler
    if (!f || !f.fonction) throw erreur('TypeError', `'${nomDuType(f)}' object is not callable`, n.line);
    const args = []; for (const a of n.args) args.push(yield* evalG(a, c));
    return yield* executer(f, args, c, n.line);
  }
  if (ACTIONS.has(nom)) { // une action du jeu : le robot agit, puis le programme reprend
    if (n.args.length) throw tropDArguments(nom, 0, n.args.length, n.line);
    c.ops = 0; yield { a: nom, line: n.line }; return null;
  }
  const g = c.env[nom]; if (!g) throw nonDefini(nom, c, n.line);
  const max = g.nargs ?? 0;
  if (n.args.length > max) throw tropDArguments(nom, max, n.args.length, n.line);
  const args = []; for (const a of n.args) args.push(yield* evalG(a, c));
  return g(...args);
}
function* executer(f, args, c, line) {
  const d = f.def, nom = d.name, nb = d.params.length;
  if (args.length > nb) throw tropDArguments(nom, nb, args.length, line);
  if (args.length < nb) {
    const m = d.params.slice(args.length).map(p => `'${p}'`), liste = m.length === 1 ? m[0] : m.length === 2 ? m.join(' and ') : m.slice(0, -1).join(', ') + ', and ' + m[m.length - 1];
    throw erreur('TypeError', `${nom}() missing ${m.length} required positional argument${m.length > 1 ? 's' : ''}: ${liste}`, line);
  }
  if ((c.profondeur || 0) >= PROFONDEUR_MAX) throw erreur('RecursionError', 'maximum recursion depth exceeded', line);
  yield* guard(c, line);
  const cadre = { vars: {}, locaux: d.locaux, globaux: d.globaux, parent: f.parent };
  d.params.forEach((p, i) => { cadre.vars[p] = args[i]; });
  const avant = c.cadre; c.cadre = cadre; c.profondeur = (c.profondeur || 0) + 1;
  try { const r = yield* runBlock(d.body, c); return r ? r.valeur : null; }
  finally { c.cadre = avant; c.profondeur--; }
}

// Un bloc s'arrête sur un return : il renvoie alors { valeur }, que les boucles et les if font remonter.
function* runBlock(b, c) { for (const s of b) { const r = yield* runStmt(s, c); if (r) return r; } return null; }
function* guard(c, line) { if (++c.ops > 300) { c.ops = 0; yield { a: 'watchdog', line }; } }
function* runStmt(s, c) {
  c.line = s.line;
  try {
    if (s.k === 'for') {
      const n = yield* evalG(s.n, c), d = s.from ? yield* evalG(s.from, c) : 0;
      if (typeof n !== 'number' || typeof d !== 'number') throw erreur('TypeError', "'str' object cannot be interpreted as an integer", s.line);
      for (let i = d; i < n; i++) { ecrire(s.v, i, c); c.loops[s.line] = [i - d + 1, n - d]; const r = yield* runBlock(s.body, c); if (r) return r; c.line = s.line; yield* guard(c, s.line); }
    } else if (s.k === 'while') {
      for (;;) { c.line = s.line; const v = !!(yield* evalG(s.c, c)); c.cond[s.line] = v; if (!v) break; const r = yield* runBlock(s.body, c); if (r) return r; yield* guard(c, s.line); }
    } else if (s.k === 'if') {
      const v = !!(yield* evalG(s.c, c)); c.cond[s.line] = v;
      if (v) return yield* runBlock(s.then, c);
      if (s.other) return yield* runBlock(s.other, c);
    } else if (s.k === 'set') { ecrire(s.name, yield* evalG(s.e, c), c); yield* guard(c, s.line); }
    else if (s.k === 'def') { ecrire(s.name, { fonction: true, def: s, parent: c.cadre || null }, c); yield* guard(c, s.line); }
    else if (s.k === 'return') return { valeur: s.e ? yield* evalG(s.e, c) : null };
    else if (s.k === 'global' || s.k === 'pass') yield* guard(c, s.line);
    else { yield* evalG(s.e, c); if (!(s.e.k === 'call' && ACTIONS.has(s.e.t.s))) yield* guard(c, s.line); }
  } catch (e) { if (e.ligne == null) e.ligne = s.line; throw e; }
  return null;
}
