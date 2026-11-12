/* Court-circuit : la salle de classe, côté enseignant·e. Elle mène le mini-championnat (système suisse classé
   à l'Elo, js/championnat.js) : elle forme les paires de chaque ronde, tire la carte, rejoue chaque duel à partir
   des codes reçus et envoie le classement. Rien n'est enregistré : la salle vit tant que cette page est ouverte. */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const P = { code: null, salle: null, joueurs: [], table: new Map(), ronde: 0, total: null, manche: null, matchs: {}, historique: {}, id: nouvelId() };
const place = r => r + (r === 1 ? 're' : 'e');
// Le lien de la salle : le dossier de cette page (https://babash.github.io/court-circuit/?classe=ABCD en ligne),
// plus court à projeter et à scanner ; index.html quand la page est ouverte comme fichier (file:).
function lien(code) { const u = new URL(location.protocol === 'file:' ? 'index.html' : './', location.href); u.search = '?classe=' + code; return u.toString(); }
function ouvrirLaSalle(code) {
  if (P.salle) P.salle.fermer();
  P.code = code; stock.ecrire('salle-prof', code);
  $('code').textContent = code; $('lien').textContent = lien(code);
  const q = qrcode(0, 'M'); q.addData(lien(code)); q.make(); $('qr').innerHTML = q.createSvgTag({ scalable: true, margin: 0 });
  P.salle = ouvrirSalle(code, { id: P.id, pseudo: 'Enseignant·e', role: 'hote' }, {
    onMessage: recevoir,
    onPresence: l => { P.joueurs = l.filter(x => x.role === 'joueur'); majJoueurs(); },
    onEtat: e => { $('etat').textContent = e === 'connecte' ? (P.salle && P.salle.demo ? 'mode démo : salle entre les onglets de ce navigateur' : 'salle ouverte') : e === 'erreur' ? 'connexion impossible : vérifie le réseau' : 'connexion…'; },
  });
}
function majJoueurs() {
  const ici = new Set(P.joueurs.map(j => j.id));
  for (const j of P.joueurs) { const f = P.table.get(j.id); if (f) f.pseudo = j.pseudo; else P.table.set(j.id, nouveauJoueur(j.id, j.pseudo)); }
  for (const f of P.table.values()) f.present = ici.has(f.id);
  const n = P.joueurs.length; $('nbJoueurs').textContent = n + (n > 1 ? ' élèves' : ' élève');
  $('joueurs').innerHTML = P.joueurs.map(j => `<span>${esc(j.pseudo)}</span>`).join('') || '<span>En attente des élèves…</span>';
  if (!P.total) $('conseil').textContent = n ? `conseillé : ${rondesConseillees(n)} rondes pour ${n} élève${n > 1 ? 's' : ''}` : '';
  const enCours = P.manche && !P.manche.finie;
  $('lancer').disabled = n < 1 || enCours;
  $('lancer').textContent = P.total && P.ronde >= P.total ? 'Une ronde de plus' : `Lancer la ronde ${P.ronde + 1}${P.total ? ' sur ' + P.total : ''}`;
  $('rondes').disabled = !!P.total; $('terminer').disabled = !P.ronde || enCours; $('reinit').disabled = enCours;
}
function lancer() {
  if (P.manche && !P.manche.finie) return;
  if (!P.total) P.total = +$('rondes').value;
  P.ronde++; if (P.ronde > P.total) P.total = P.ronde;
  const ecr = +$('ecriture').value, seed = 1 + Math.floor(Math.random() * 1e6), choix = $('carte').value;
  const c = choix === 'h' ? { ...carteDeManche(seed, P.ronde), idee: '' } : { rows: carte(+choix), nom: CARTES[+choix].nom, idee: CARTES[+choix].idee };
  const presents = [...P.table.values()].filter(j => j.present);
  const paires = apparier(presents);
  for (const [a, b] of paires) if (!b) a.exempt++;
  const fiche = j => ({ id: j.id, pseudo: j.pseudo, elo: Math.round(j.elo) });
  const msg = { t: 'manche', n: P.ronde, total: P.total, carte: c.rows, nomCarte: c.nom, idee: c.idee, seed, ecriture: ecr, paires: paires.map(([a, b], i) => ({ m: P.ronde + '-' + i, a: fiche(a), b: b ? fiche(b) : null })) };
  P.salle.envoyer(msg); preparer(msg);
}
function preparer(msg) {
  P.manche = { ...msg, finie: false, debut: performance.now() }; P.matchs = {}; $('bilan').hidden = true;
  const murs = new Set(); msg.carte.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') murs.add(x + y * W); }));
  for (const p of msg.paires) P.matchs[p.m] = { p, codes: { K: null, Z: p.b ? null : ZERO[2].code }, ev: { K: [], Z: [] }, partie: null, fin: {}, murs };
  $('titreMatchs').textContent = `Ronde ${msg.n} sur ${msg.total} · ${msg.nomCarte} · écriture`;
  $('matchs').innerHTML = msg.paires.map(p => `<div class="match" id="m-${p.m}"><div class="vs"><b>${esc(p.a.pseudo)}</b><span id="s-${p.m}">0 – 0</span><i>${esc(p.b ? p.b.pseudo : 'Zéro')}</i></div><canvas id="c-${p.m}"></canvas><span id="e-${p.m}" class="vitesse">écriture…</span></div>`).join('');
  for (const p of msg.paires) { const m = P.matchs[p.m]; m.pl = creerPlateau($('c-' + p.m)); m.pl.ajuster(170, 190); m.pl.dessiner(createMatch({ map: msg.carte, code: { K: '', Z: '' } }).frames, 0, { murs }); }
  majJoueurs(); compteARebours(msg.ecriture);
}
function compteARebours(s) { const fin = performance.now() + s * 1000; const tic = () => { if (!P.manche || P.manche.finie) return; const r = Math.ceil((fin - performance.now()) / 1000); $('infoManche').textContent = r > 0 ? `écriture : ${r} s` : 'duels en cours'; if (r > 0) setTimeout(tic, 500); }; tic(); }
function recevoir(msg) {
  if (!P.manche) return;
  const m = P.matchs[msg.m]; if (!m) return;
  if (msg.t === 'code') {
    const e0 = msg.ev.find(e => e.seq === 0); if (e0 && m.codes[msg.qui] == null) m.codes[msg.qui] = e0.code;
    m.ev[msg.qui] = msg.ev.filter(e => e.seq > 0);
    if (!m.partie && m.codes.K != null && m.codes.Z != null) { m.partie = new Partie({ carte: P.manche.carte, codeK: m.codes.K, codeZ: m.codes.Z, seed: P.manche.seed }); m.t0 = performance.now(); $('e-' + msg.m).textContent = 'duel'; }
    if (m.partie) for (const q of ['K', 'Z']) if (m.ev[q].length) m.partie.fusionner(q, m.ev[q]);
  }
  if (msg.t === 'fin') m.fin[msg.qui] = msg;
}
function boucle() {
  if (P.manche && !P.manche.finie) {
    let toutes = true, une = false;
    for (const [id, m] of Object.entries(P.matchs)) {
      if (!m.partie) { toutes = false; continue; }
      une = true; m.partie.avancer(Math.floor((performance.now() - m.t0) / 100));
      const f = m.partie.m.frames, fr = f[f.length - 1]; m.pl.dessiner(f, f.length - 1, { murs: m.murs });
      $('s-' + id).textContent = `${fr.score.K} – ${fr.score.Z}`;
      if (!m.partie.finie) toutes = false; else $('e-' + id).textContent = fr.score.K > fr.score.Z ? m.p.a.pseudo + ' gagne' : fr.score.Z > fr.score.K ? (m.p.b ? m.p.b.pseudo : 'Zéro') + ' gagne' : 'égalité';
    }
    if (une) $('titreMatchs').textContent = `Ronde ${P.manche.n} sur ${P.manche.total} · ${P.manche.nomCarte} · duels`;
    const maintenant = performance.now();
    if (toutes && Object.keys(P.matchs).length && !P.manche.toutesFinies) P.manche.toutesFinies = maintenant;
    // on attend le dernier journal de chaque élève (message « fin »), 6 s au plus
    const fins = Object.values(P.matchs).every(m => !m.partie || ['K', 'Z'].every(q => (q === 'Z' && !m.p.b) || m.fin[q]));
    const pret = P.manche.toutesFinies && (fins || maintenant - P.manche.toutesFinies > 6000);
    // un duel sans nouvelles 20 s après la fin de l'écriture est annulé
    const tard = maintenant - P.manche.debut > (P.manche.ecriture + 20 + 32) * 1000;
    if (pret || tard) { P.manche.finie = true; bilan(); }
  }
  requestAnimationFrame(boucle);
}
function bilan() {
  const lignes = [], gains = {};
  for (const m of Object.values(P.matchs)) {
    const a = P.table.get(m.p.a.id), b = m.p.b ? P.table.get(m.p.b.id) : null;
    if (!m.partie) { lignes.push({ a: m.p.a.pseudo, b: m.p.b ? m.p.b.pseudo : 'Zéro', txt: 'duel annulé (un code n’est pas arrivé)' }); continue; }
    m.partie.avancer(m.partie.duree);
    const k = m.partie.m.count('K'), z = m.partie.m.count('Z');
    for (const [j, moi] of [[m.p.a, k], [m.p.b, z]]) if (j) { const avant = P.historique[j.id]; P.historique[j.id] = moi; if (avant != null && moi > avant) (gains[j.id] = gains[j.id] || {}).cases = moi - avant; }
    if (a && b) { const d = noterDuel(a, b, k, z); (gains[a.id] = gains[a.id] || {}).elo = d.da; (gains[b.id] = gains[b.id] || {}).elo = d.db; lignes.push({ a: a.pseudo, b: b.pseudo, k, z, txt: k > z ? a.pseudo + ' gagne' : z > k ? b.pseudo + ' gagne' : 'égalité', da: d.da, db: d.db }); }
    else lignes.push({ a: m.p.a.pseudo, b: 'Zéro', k, z, txt: (k > z ? 'gagné' : k < z ? 'perdu' : 'égalité') + ' contre Zéro (sans effet sur l’Elo)' });
  }
  const table = classer([...P.table.values()].filter(j => j.j || j.present));
  const msg = { t: 'classement', n: P.ronde, total: P.total, final: P.ronde >= P.total, table: table.map(j => ({ id: j.id, pseudo: j.pseudo, elo: j.elo, v: j.v, e: j.e, d: j.d, j: j.j, rang: j.rang })) };
  P.salle.envoyer(msg);
  const progres = Object.entries(gains).filter(([, g]) => g.cases > 0).map(([id, g]) => ({ pseudo: P.table.get(id) ? P.table.get(id).pseudo : '?', n: g.cases })).sort((x, y) => y.n - x.n).slice(0, 5);
  const signe = d => d == null ? '' : ` (${d >= 0 ? '+' : '−'}${Math.abs(d)})`;
  $('titreBilan').textContent = msg.final ? `Classement final, après ${P.ronde} ronde${P.ronde > 1 ? 's' : ''}` : `Bilan de la ronde ${P.ronde} sur ${P.total}`;
  $('bilanTexte').innerHTML = (progres.length ? `<p class="bravo"><b>Bravo pour vos progrès :</b> ${progres.map(l => `${esc(l.pseudo)} (+${l.n} cases)`).join(', ')}.</p>` : '')
    + `<table><thead><tr><th>Duel</th><th>Cases</th><th>Résultat</th></tr></thead><tbody>${lignes.map(l => `<tr><td>${esc(l.a)}${signe(l.da)} contre ${esc(l.b)}${signe(l.db)}</td><td>${l.k != null ? l.k + ' – ' + l.z : ''}</td><td>${esc(l.txt)}</td></tr>`).join('')}</tbody></table>`
    + `<h3 style="font-family:var(--titre);margin:14px 0 6px">Classement</h3><table class="classement"><thead><tr><th>Rang</th><th>Élève</th><th class="n">Elo</th><th class="n">V</th><th class="n">N</th><th class="n">D</th></tr></thead><tbody>${table.map(j => `<tr${j.present ? '' : ' style="opacity:.6"'}><td>${place(j.rang)}</td><td>${esc(j.pseudo)}${j.present ? '' : ' (parti·e)'}</td><td class="n">${j.elo}</td><td class="n">${j.v}</td><td class="n">${j.e}</td><td class="n">${j.d}</td></tr>`).join('')}</tbody></table>`;
  $('bilan').hidden = false;
  if (msg.final) { finSeance(); $('infoManche').textContent = 'championnat fini : chaque élève peut copier le code de ses adversaires'; }
  else $('infoManche').textContent = 'ronde finie : lance la suivante quand la classe est prête';
  majJoueurs();
}
function finSeance() {
  const table = classer([...P.table.values()].filter(j => j.j || j.present));
  P.salle.envoyer({ t: 'fin-seance', n: P.ronde, total: P.total, table: table.map(j => ({ id: j.id, pseudo: j.pseudo, elo: j.elo, v: j.v, e: j.e, d: j.d, j: j.j, rang: j.rang })) });
}
function nouvelleSeance() {
  P.table = new Map(); P.ronde = 0; P.total = null; P.manche = null; P.matchs = {}; P.historique = {};
  $('matchs').innerHTML = ''; $('bilan').hidden = true; $('titreMatchs').textContent = 'Les duels'; $('infoManche').textContent = 'nouvelle séance : tout le monde repart à 1000';
  majJoueurs();
}
function init() {
  $('carte').innerHTML = '<option value="h" selected>Au hasard (conseillé)</option>' + CARTES.map((c, i) => `<option value="${i}">${i + 1}. ${esc(c.nom)}</option>`).join('');
  $('rondes').innerHTML = [3, 4, 5, 6, 7, 8, 9, 10].map(n => `<option value="${n}"${n === 6 ? ' selected' : ''}>${n} rondes</option>`).join('');
  $('lancer').onclick = lancer;
  $('terminer').onclick = () => { finSeance(); P.total = P.ronde; $('infoManche').textContent = 'séance terminée : chaque élève peut copier le code de ses adversaires'; majJoueurs(); };
  $('reinit').onclick = nouvelleSeance;
  $('nouvelle').onclick = () => ouvrirLaSalle(nouveauCodeSalle());
  $('copier').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(lien(P.code)).then(() => { $('etat').textContent = 'lien copié'; }).catch(() => { $('etat').textContent = 'copie impossible : sélectionne le lien'; }); };
  ouvrirLaSalle(stock.lire('salle-prof') || nouveauCodeSalle()); majJoueurs(); requestAnimationFrame(boucle);
}
window.addEventListener('DOMContentLoaded', init);
