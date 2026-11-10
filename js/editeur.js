/* Court-circuit : l'éditeur de code (CodeMirror 6, embarqué dans vendor/editeur.js).
   Règle 20 : coloration, indentation automatique et touche Tab, guides d'indentation,
   autocomplétion contextuelle (en français aussi), erreur affichée telle quelle puis expliquée. */
function creerEditeur(parent, { doc = '', onChange = () => {}, onEnvoi = null, lectureSeule = false } = {}) {
  const CMx = window.CM;
  const poseLigne = CMx.StateEffect.define(), poseErreur = CMx.StateEffect.define();
  const decoLigne = (cls) => CMx.StateField.define({
    create: () => CMx.Decoration.none,
    update(deco, tr) {
      deco = deco.map(tr.changes);
      for (const e of tr.effects) if (e.is(cls === 'run' ? poseLigne : poseErreur)) {
        const n = e.value; deco = CMx.Decoration.none;
        if (n && n <= tr.state.doc.lines) { const l = tr.state.doc.line(n); deco = CMx.Decoration.set([CMx.Decoration.line({ class: cls === 'run' ? 'cm-run' : 'cm-err' }).range(l.from)]); }
      }
      return deco;
    },
    provide: f => CMx.EditorView.decorations.from(f),
  });
  const champRun = decoLigne('run'), champErr = decoLigne('err');

  const T = CMx.tags;
  const style = CMx.HighlightStyle.define([
    { tag: [T.keyword, T.controlKeyword, T.definitionKeyword, T.operatorKeyword], color: '#C4B5FD', fontWeight: '700' },
    { tag: [T.string], color: '#FDBA74' },
    { tag: [T.number, T.bool], color: '#FDE047' },
    { tag: [T.comment], color: '#8A97B0', fontStyle: 'italic' },
    { tag: [T.operator, T.compareOperator, T.logicOperator], color: '#FF8AC4' },
    { tag: [T.function(T.variableName), T.function(T.propertyName)], color: '#67E8F9' },
    { tag: [T.variableName], color: '#F1F3F7' },
    { tag: [T.paren, T.punctuation], color: '#C9D2E3' },
  ]);
  const theme = CMx.EditorView.theme({
    '&': { color: '#F1F3F7', backgroundColor: '#0B1222', height: '100%', fontSize: '15px' },
    '.cm-content': { fontFamily: "'JetBrains Mono', ui-monospace, monospace", caretColor: '#FACC15', padding: '6px 0' },
    '.cm-scroller': { fontFamily: "'JetBrains Mono', ui-monospace, monospace", lineHeight: '1.55' },
    '.cm-gutters': { backgroundColor: '#0B1222', color: '#64708A', border: 'none' },
    '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,.04)' },
    '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,.06)', color: '#C9D2E3' },
    '&.cm-focused': { outline: '2px solid #FACC15', outlineOffset: '-2px' },
    '&.cm-focused .cm-cursor': { borderLeftColor: '#FACC15', borderLeftWidth: '2px' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'rgba(103,232,249,.28) !important' },
    '.cm-run': { backgroundColor: 'rgba(250,204,21,.20)' },
    '.cm-err': { backgroundColor: 'rgba(248,113,113,.18)', boxShadow: 'inset 3px 0 #F87171' },
    '.cm-tooltip': { backgroundColor: '#172136', border: '1px solid #2C3954', color: '#F1F3F7' },
    '.cm-tooltip-autocomplete > ul > li': { padding: '3px 8px', fontFamily: "'JetBrains Mono', monospace" },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: '#0E7490', color: '#fff' },
    '.cm-completionDetail': { color: '#A3B0C4', fontStyle: 'normal', marginLeft: '8px', fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif" },
    '.cm-completionInfo': { maxWidth: '260px', fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif", fontSize: '14px', lineHeight: '1.35' },
  }, { dark: true });

  /* --- autocomplétion contextuelle --- */
  const S = CMx.snippetCompletion;
  const act = (l, info, boost = 0) => ({ label: l + '()', apply: l + '()', type: 'function', detail: 'action', info, boost });
  const ACTIONS_C = MOTS.actions.map((m, i) => act(m.mot.replace('()', ''), m.role, 10 - i));
  const BLOCS = [
    S('for ${i} in range(${3}):\n\t${avancer()}', { label: 'for', detail: 'répéter n fois', info: 'Boucle bornée : répète un nombre de fois fixé.', type: 'keyword', boost: 5 }),
    S('while True:\n\t${avancer()}', { label: 'while True', detail: 'répéter sans fin', info: 'Boucle non bornée : répète jusqu’à la fin du match.', type: 'keyword', boost: 4 }),
    S('while ${libre()}:\n\t${avancer()}', { label: 'while', detail: 'tant que…', info: 'Répète tant que la condition est vraie.', type: 'keyword', boost: 3 }),
    S('if ${libre()}:\n\t${avancer()}', { label: 'if', detail: 'si…', info: 'Fait les lignes décalées seulement si la condition est vraie.', type: 'keyword', boost: 3 }),
  ];
  const SUITE_IF = [
    S('elif ${libre("droite")}:\n\t${droite()}', { label: 'elif', detail: 'sinon, si…', type: 'keyword' }),
    S('else:\n\t${droite()}', { label: 'else', detail: 'sinon', type: 'keyword' }),
  ];
  const FR = [ // mots français → Python
    ['pour', 'for'], ['repeter', 'for'], ['répéter', 'for'], ['tant', 'while'], ['toujours', 'while True'], ['si', 'if'], ['sinon', 'else'], ['sinonsi', 'elif'],
    ['avance', 'avancer()'], ['tourne', 'droite()'], ['tourner', 'droite()'],
  ];
  const CAPTEURS_C = [
    { label: 'libre()', type: 'function', detail: 'capteur', info: MOTS.capteurs[0].role, boost: 5 },
    { label: 'libre("droite")', type: 'function', detail: 'capteur', info: MOTS.capteurs[1].role },
    { label: 'libre("gauche")', type: 'function', detail: 'capteur', info: 'Vrai si la case à gauche est libre.' },
    { label: 'couleur() != "moi"', type: 'function', detail: 'capteur', info: 'Vrai si la case devant n’est pas déjà à toi.', boost: 3 },
    { label: 'couleur()', type: 'function', detail: 'capteur', info: MOTS.capteurs[2].role },
    { label: 'couleur("droite")', type: 'function', detail: 'capteur', info: MOTS.capteurs[3].role },
    { label: 'couleur("gauche")', type: 'function', detail: 'capteur', info: 'La couleur de la case à gauche.' },
    { label: 'cible()', type: 'function', detail: 'capteur', info: MOTS.capteurs[4].role },
    { label: 'distance()', type: 'function', detail: 'capteur', info: MOTS.capteurs[5].role },
    { label: 'and', type: 'keyword', detail: 'et', info: 'Les deux conditions doivent être vraies.' },
    { label: 'or', type: 'keyword', detail: 'ou', info: 'Au moins une des deux conditions doit être vraie.' },
    { label: 'not', type: 'keyword', detail: 'non', info: 'Inverse la condition.' },
    { label: 'True', type: 'keyword', detail: 'vrai', info: 'Toujours vrai.' },
  ];
  function variables(state, avant) {
    const vus = new Set(); const txt = state.doc.sliceString(0, avant);
    for (const m of txt.matchAll(/^\s*(\w+)\s*(?:=|\+=|-=)(?!=)/gm)) vus.add(m[1]);
    for (const m of txt.matchAll(/^\s*for\s+(\w+)\s+in/gm)) vus.add(m[1]);
    return [...vus].filter(v => !ACTIONS_ET_CAPTEURS.has(v)).map(v => ({ label: v, type: 'variable', detail: 'variable' }));
  }
  function source(ctx) {
    const ligne = ctx.state.doc.lineAt(ctx.pos), avant = ligne.text.slice(0, ctx.pos - ligne.from);
    // dans des guillemets, après libre( ou couleur( : une direction
    let m = avant.match(/(?:libre|couleur)\(\s*(["']?)(\w*)$/);
    if (m) { const q = m[1] || '"'; return { from: ctx.pos - m[2].length - m[1].length, options: ['droite', 'gauche', 'devant'].map(d => ({ label: q + d + q, type: 'text', detail: 'direction' })), validFor: /^["']?\w*["']?$/ }; }
    // après couleur(…) == ou != : une couleur
    m = avant.match(/couleur\([^)]*\)\s*(?:==|!=)\s*(["']?)(\w*)$/);
    if (m) { const q = m[1] || '"'; return { from: ctx.pos - m[2].length - m[1].length, options: ['vide', 'moi', 'adversaire', 'mur'].map(c => ({ label: q + c + q, type: 'text', detail: 'couleur' })), validFor: /^["']?\w*["']?$/ }; }
    const mot = ctx.matchBefore(/[\wÀ-ÿ]*/);
    if (!mot || (mot.from === mot.to && !ctx.explicit)) return null;
    const enTete = /^\s*(if|elif|while)\b/.test(avant) && !avant.includes(':');
    if (enTete) return { from: mot.from, options: [...CAPTEURS_C, ...variables(ctx.state, ligne.from)], validFor: /^[\wÀ-ÿ]*$/ };
    const debut = /^\s*[\wÀ-ÿ]*$/.test(avant);
    if (!debut) return { from: mot.from, options: [...CAPTEURS_C, ...variables(ctx.state, ligne.from)], validFor: /^[\wÀ-ÿ]*$/ };
    // début de ligne : actions, blocs, et elif / else s'il y a un if au même niveau au-dessus
    const dec = avant.length - avant.trimStart().length; let suite = false;
    // le dernier en-tête de même niveau au-dessus (les lignes plus décalées sont son bloc)
    for (let n = ligne.number - 1; n >= 1; n--) { const t = ctx.state.doc.line(n).text; if (!t.trim()) continue; const d = t.length - t.trimStart().length; if (d < dec) break; if (d === dec) { suite = /^\s*(if|elif)\b/.test(t); break; } }
    const fr = FR.map(([f, py]) => { const base = [...ACTIONS_C, ...BLOCS, ...SUITE_IF].find(o => o.label === py); return base ? { ...base, label: f, displayLabel: f + ' → ' + py, boost: -1 } : null; }).filter(Boolean);
    return { from: mot.from, options: [...ACTIONS_C, ...BLOCS, ...(suite ? SUITE_IF : []), ...variables(ctx.state, ligne.from), ...fr], validFor: /^[\wÀ-ÿ]*$/ };
  }

  const envoyer = onEnvoi ? [{ key: 'Ctrl-Enter', mac: 'Cmd-Enter', run: () => { onEnvoi(); return true; } }] : [];
  const etat = CMx.EditorState.create({
    doc,
    extensions: [
      CMx.lineNumbers(), CMx.highlightActiveLineGutter(), CMx.highlightActiveLine(), CMx.history(), CMx.drawSelection(),
      CMx.indentUnit.of('    '), CMx.EditorState.tabSize.of(4), CMx.python(), CMx.indentOnInput(), CMx.bracketMatching(), CMx.closeBrackets(),
      CMx.syntaxHighlighting(style), theme,
      CMx.indentationMarkers({ thickness: 2, colors: { light: '#3A4866', dark: '#3A4866', activeLight: '#67E8F9', activeDark: '#67E8F9' } }),
      CMx.autocompletion({ override: [source], activateOnTyping: true, icons: false }),
      champRun, champErr,
      CMx.keymap.of([...envoyer, { key: 'Tab', run: CMx.acceptCompletion }, ...CMx.closeBracketsKeymap, ...CMx.completionKeymap, CMx.indentWithTab, ...CMx.defaultKeymap, ...CMx.historyKeymap]),
      CMx.EditorView.updateListener.of(u => { if (u.docChanged) onChange(u.state.doc.toString()); }),
      CMx.EditorView.contentAttributes.of({ 'aria-label': 'Ton code Python', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false' }),
      CMx.EditorState.readOnly.of(lectureSeule), CMx.EditorView.editable.of(!lectureSeule),
    ],
  });
  const view = new CMx.EditorView({ state: etat, parent });
  return {
    view,
    code: () => view.state.doc.toString(),
    remplacer(txt) { view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: txt } }); },
    focus: () => view.focus(),
    ligneEnCours(n) { view.dispatch({ effects: poseLigne.of(n || 0) }); },
    ligneErreur(n) { view.dispatch({ effects: poseErreur.of(n || 0) }); },
    inserer(txt, { bloc = false } = {}) {
      // insère un mot au curseur ; un bloc (ligne entière) va sur une nouvelle ligne au bon décalage
      const st = view.state, sel = st.selection.main, ligne = st.doc.lineAt(sel.head);
      if (!bloc) { view.dispatch({ changes: { from: sel.from, to: sel.to, insert: txt }, selection: { anchor: sel.from + txt.length }, scrollIntoView: true }); view.focus(); return; }
      const dec = ligne.text.match(/^ */)[0] + (/:\s*$/.test(ligne.text) ? '    ' : '');
      const lignes = txt.split('\n').map((l, i) => (i ? dec : '') + l).join('\n');
      if (!ligne.text.trim()) { const from = ligne.from, ins = dec + lignes; view.dispatch({ changes: { from, to: ligne.to, insert: ins }, selection: { anchor: from + ins.length }, scrollIntoView: true }); }
      else { const ins = '\n' + dec + lignes; view.dispatch({ changes: { from: ligne.to, insert: ins }, selection: { anchor: ligne.to + ins.length }, scrollIntoView: true }); }
      view.focus();
    },
    decaler(k) { (k > 0 ? CMx.indentMore : CMx.indentLess)(view); view.focus(); },
  };
}
