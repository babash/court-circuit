/* Court-circuit : la salle de classe, côté enseignant·e. Elle forme les paires, lance les manches
   et rejoue chaque duel à partir des codes reçus. Rien n'est enregistré : la salle vit tant que cette page est ouverte. */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const P = { code: null, salle: null, joueurs: [], manche: null, matchs: {}, derniers: {}, historique: {}, id: nouvelId() };
function lien(code) { const u = new URL('index.html', location.href); u.search = '?classe=' + code; return u.toString(); }
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
  const n = P.joueurs.length; $('nbJoueurs').textContent = n + (n > 1 ? ' élèves' : ' élève');
  $('joueurs').innerHTML = P.joueurs.map(j => `<span>${esc(j.pseudo)}</span>`).join('') || '<span>En attente des élèves…</span>';
  $('lancer').disabled = n < 1 || (P.manche && !P.manche.finie);
}
function lancer() {
  const ci = +$('carte').value, ecr = +$('ecriture').value, n = (P.manche ? P.manche.n : 0) + 1;
  const paires = formerPaires(P.joueurs, P.derniers);
  const msg = { t: 'manche', n, carte: ci, seed: 1 + Math.floor(Math.random() * 1e6), ecriture: ecr, paires: paires.map(([a, b], i) => ({ m: n + '-' + i, a: { id: a.id, pseudo: a.pseudo }, b: b ? { id: b.id, pseudo: b.pseudo } : null })) };
  P.salle.envoyer(msg); preparer(msg);
  if (ci < CARTES.length - 1) $('carte').value = ci + 1; // la carte suivante est proposée pour la manche d'après
}
function preparer(msg) {
  P.manche = { ...msg, finie: false, debut: performance.now() }; P.matchs = {}; $('bilan').hidden = true;
  for (const p of msg.paires) { if (p.b) { P.derniers[p.a.id] = p.b.id; P.derniers[p.b.id] = p.a.id; } P.matchs[p.m] = { p, codes: { K: null, Z: p.b ? null : ZERO[2].code }, ev: { K: [], Z: [] }, partie: null, fin: null }; }
  $('titreMatchs').textContent = `Manche ${msg.n} · ${CARTES[msg.carte].nom} · écriture`;
  $('matchs').innerHTML = msg.paires.map(p => `<div class="match" id="m-${p.m}"><div class="vs"><b>${esc(p.a.pseudo)}</b><span id="s-${p.m}">0 – 0</span><i>${esc(p.b ? p.b.pseudo : 'Zéro')}</i></div><canvas id="c-${p.m}"></canvas><span id="e-${p.m}" class="vitesse">écriture…</span></div>`).join('');
  for (const p of msg.paires) { const m = P.matchs[p.m]; m.pl = creerPlateau($('c-' + p.m)); m.pl.ajuster(170, 190); m.murs = new Set(); carte(msg.carte).forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') m.murs.add(x + y * W); })); m.pl.dessiner(createMatch({ map: carte(msg.carte), code: { K: '', Z: '' } }).frames, 0, { murs: m.murs }); }
  majJoueurs(); compteARebours(msg.ecriture);
}
function compteARebours(s) { const fin = performance.now() + s * 1000; const tic = () => { if (!P.manche) return; const r = Math.ceil((fin - performance.now()) / 1000); $('infoManche').textContent = r > 0 ? `écriture : ${r} s` : 'duels en cours'; if (r > 0) setTimeout(tic, 500); }; tic(); }
function recevoir(msg) {
  if (!P.manche) return;
  const m = P.matchs[msg.m]; if (!m) return;
  if (msg.t === 'code') {
    const e0 = msg.ev.find(e => e.seq === 0); if (e0 && m.codes[msg.qui] == null) m.codes[msg.qui] = e0.code;
    m.ev[msg.qui] = msg.ev.filter(e => e.seq > 0);
    if (!m.partie && m.codes.K != null && m.codes.Z != null) { m.partie = new Partie({ carte: carte(P.manche.carte), codeK: m.codes.K, codeZ: m.codes.Z, seed: P.manche.seed }); m.t0 = performance.now(); $('e-' + msg.m).textContent = 'duel'; }
    if (m.partie) for (const q of ['K', 'Z']) if (m.ev[q].length) m.partie.fusionner(q, m.ev[q]);
  }
  if (msg.t === 'fin') { m.fin = m.fin || {}; m.fin[msg.qui] = msg; }
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
    if (une) $('titreMatchs').textContent = `Manche ${P.manche.n} · ${CARTES[P.manche.carte].nom} · duels`;
    // un duel sans nouvelles 20 s après la fin de l'écriture est clos sans lui
    const tard = performance.now() - P.manche.debut > (P.manche.ecriture + 20 + 32) * 1000;
    if ((toutes && Object.keys(P.matchs).length) || tard) setTimeout(bilan, 1600), P.manche.finie = true;
  }
  requestAnimationFrame(boucle);
}
function bilan() {
  const lignes = [];
  for (const m of Object.values(P.matchs)) {
    if (!m.partie) continue; const k = m.partie.m.count('K'), z = m.partie.m.count('Z');
    for (const [j, moi, lui, adv] of [[m.p.a, k, z, m.p.b], [m.p.b, z, k, m.p.a]]) {
      if (!j) continue; const avant = P.historique[j.id]; P.historique[j.id] = moi;
      lignes.push({ pseudo: j.pseudo, adv: adv ? adv.pseudo : 'Zéro', moi, lui, prog: avant == null ? null : moi - avant });
    }
  }
  lignes.sort((a, b) => (b.moi - b.lui) - (a.moi - a.lui) || b.moi - a.moi);
  const progres = lignes.filter(l => l.prog > 0).sort((a, b) => b.prog - a.prog).slice(0, 5);
  $('bilanTexte').innerHTML = (progres.length ? `<p class="bravo"><b>Bravo pour vos progrès :</b> ${progres.map(l => `${esc(l.pseudo)} (+${l.prog} cases)`).join(', ')}.</p>` : '')
    + `<table><thead><tr><th>Élève</th><th>Adversaire</th><th>Cases</th><th>Résultat</th></tr></thead><tbody>${lignes.map(l => `<tr><td>${esc(l.pseudo)}</td><td>${esc(l.adv)}</td><td>${l.moi} – ${l.lui}</td><td>${l.moi > l.lui ? 'gagné' : l.moi < l.lui ? 'perdu' : 'égalité'}</td></tr>`).join('')}</tbody></table>`;
  $('bilan').hidden = false; $('infoManche').textContent = 'manche finie : lance la suivante quand la classe est prête'; majJoueurs();
}
function init() {
  $('carte').innerHTML = CARTES.map((c, i) => `<option value="${i}">${i + 1}. ${esc(c.nom)}</option>`).join('');
  $('lancer').onclick = lancer;
  $('nouvelle').onclick = () => ouvrirLaSalle(nouveauCodeSalle());
  $('copier').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(lien(P.code)).then(() => { $('etat').textContent = 'lien copié'; }).catch(() => { $('etat').textContent = 'copie impossible : sélectionne le lien'; }); };
  ouvrirLaSalle(stock.lire('salle-prof') || nouveauCodeSalle()); majJoueurs(); requestAnimationFrame(boucle);
}
window.addEventListener('DOMContentLoaded', init);
