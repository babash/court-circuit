/* Court-circuit : un petit Python pour piloter les robots.
   Il comprend : for … in range(…), while, if / elif / else, and, or, not, les comparaisons,
   les variables (=, +=, -=), les nombres, les textes et les fonctions du jeu.
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

function parse(src) {
  const rows = tokenize(src); let ri = 0, tk = [], ti = 0, line = 1;
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
    if (!/^[A-Za-z_À-ÿ]/.test(s) || ['and', 'or', 'not', 'if', 'elif', 'else', 'while', 'for', 'in'].includes(s)) throw erreur('SyntaxError', 'invalid syntax', line);
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
  'cible', 'distance', 'caisses', 'score', 'score_adversaire']);
// Comme Python 3.10 et suivants : un nom presque juste reçoit une proposition (« Did you mean »).
function proche(nom, noms) {
  const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
  let best = null, bd = 99;
  for (const n of noms) { const v = n.toLowerCase() === nom.toLowerCase() ? 0 : lev(nom.toLowerCase(), n.toLowerCase()); if (v < bd) { bd = v; best = n; } }
  return best && bd <= Math.max(1, Math.floor(nom.length / 4)) && best !== nom ? best : null;
}
const nonDefini = (nom, c, line) => { const p = proche(nom, [...ACTIONS_ET_CAPTEURS, ...Object.keys(c.vars)]); return erreur('NameError', `name '${nom}' is not defined` + (p ? `. Did you mean: '${p}'?` : ''), line); };

function evalE(n, c) {
  switch (n.k) {
    case 'num': return Number(n.t.s);
    case 'str': return n.t.s.slice(1, -1);
    case 'bool': return n.t.s === 'True';
    case 'var': if (!(n.name in c.vars)) throw nonDefini(n.name, c, n.line); return c.vars[n.name];
    case 'not': return !evalE(n.a, c);
    case 'logic': { const a = evalE(n.a, c); return n.o.s === 'and' ? (a && evalE(n.b, c)) : (a || evalE(n.b, c)); }
    case 'cmp': { const a = evalE(n.a, c), b = evalE(n.b, c); return ({ '<': a < b, '<=': a <= b, '>': a > b, '>=': a >= b, '==': a === b, '!=': a !== b })[n.o.s]; }
    case 'bin': { const a = evalE(n.a, c), b = evalE(n.b, c); if (n.o.s === '/' && b === 0) throw erreur('ZeroDivisionError', 'division by zero', c.line); if (n.o.s === '%' && b === 0) throw erreur('ZeroDivisionError', 'integer modulo by zero', c.line); return ({ '+': a + b, '-': a - b, '*': a * b, '/': a / b, '%': a % b })[n.o.s]; }
    case 'call': {
      const f = c.env[n.t.s]; if (!f) throw nonDefini(n.t.s, c, n.line);
      const max = f.nargs ?? 0;
      if (n.args.length > max) throw erreur('TypeError', `${n.t.s}() takes ${max} positional argument${max > 1 ? 's' : ''} but ${n.args.length} ${n.args.length > 1 ? 'were' : 'was'} given`, n.line);
      return f(...n.args.map(a => evalE(a, c)));
    }
  }
}

function* runBlock(b, c) { for (const s of b) yield* runStmt(s, c); }
function* guard(c, line) { if (++c.ops > 300) { c.ops = 0; yield { a: 'watchdog', line }; } }
function* runStmt(s, c) {
  c.line = s.line;
  try {
    if (s.k === 'for') {
      const n = evalE(s.n, c), d = s.from ? evalE(s.from, c) : 0;
      if (typeof n !== 'number' || typeof d !== 'number') throw erreur('TypeError', "'str' object cannot be interpreted as an integer", s.line);
      for (let i = d; i < n; i++) { c.vars[s.v] = i; c.loops[s.line] = [i - d + 1, n - d]; yield* runBlock(s.body, c); c.line = s.line; yield* guard(c, s.line); }
    } else if (s.k === 'while') {
      for (;;) { c.line = s.line; const v = !!evalE(s.c, c); c.cond[s.line] = v; if (!v) break; yield* runBlock(s.body, c); yield* guard(c, s.line); }
    } else if (s.k === 'if') {
      const v = !!evalE(s.c, c); c.cond[s.line] = v;
      if (v) yield* runBlock(s.then, c); else if (s.other) yield* runBlock(s.other, c);
    } else if (s.k === 'set') { c.vars[s.name] = evalE(s.e, c); yield* guard(c, s.line); }
    else if (s.e.k === 'call' && ACTIONS.has(s.e.t.s)) {
      if (s.e.args.length) throw erreur('TypeError', `${s.e.t.s}() takes 0 positional arguments but ${s.e.args.length} ${s.e.args.length > 1 ? 'were' : 'was'} given`, s.line);
      c.ops = 0; yield { a: s.e.t.s, line: s.line };
    } else { evalE(s.e, c); yield* guard(c, s.line); }
  } catch (e) { if (e.ligne == null) e.ligne = s.line; throw e; }
}
