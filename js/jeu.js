/* Court-circuit : la page des élèves (entraînement, défi contre Zéro, duel en direct dans une salle). */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const CODE_DEPART = 'for i in range(8):\n    avancer()';
// Entraînement : 3 étoiles par carte (nombre de cases coloriées en 30 s, seul·e sur la carte)
const OBJECTIFS = {
  piste: [9, 25, 50], poteaux: [8, 25, 50], couloirs: [9, 20, 45], salles: [5, 15, 40], damier: [9, 20, 45], dedale: [9, 20, 45],
};
const PISTES_ETOILES = ['Une boucle for suffit.', 'Répète sans fin (while True) et tourne (droite()).', 'Regarde devant toi : if libre(), couleur() != "moi".'];

const S = { mode: null, etat: 'accueil', carteI: 0, zLv: 0, moi: 'K', partie: null, t0: 0, vu: 0, salle: null, hote: false, monId: idOnglet(), pseudo: stock.lire('pseudo') || '', manche: null, monMatch: null, attente: null, adv: null, joueurs: [], derniers: {}, resultats: {}, pendants: {}, envoiTimer: 0 };
let ED, PL;

/* ---------- affichage ---------- */
function dire(txt, cls = '', ms = 0) { const m = $('message'); m.textContent = txt; m.className = 'message ' + cls; dire.jusqua = ms ? performance.now() + ms : 0; }
function conseil(cle, txt) { const now = performance.now(); if (dire.jusqua && now < dire.jusqua) return; if (conseil.vus[cle] && now - conseil.vus[cle] < 7000) return; conseil.vus[cle] = now; dire(txt, 'aide', 3500); }
conseil.vus = {};
function colorer(code, { courante = 0, prendre = false } = {}) {
  return code.split('\n').map((l, i) => {
    let h = esc(l).replace(/(#.*)$/, '<span class="c-com">$1</span>')
      .replace(/(&quot;[^&]*?&quot;|'[^']*')/g, '<span class="c-str">$1</span>')
      .replace(/\b(for|in|range|while|if|elif|else|and|or|not|True|False)\b/g, '<span class="c-kw">$1</span>')
      .replace(/\b(avancer|droite|gauche|eclair|attendre|libre|couleur|cible|distance)\b(?=\()/g, '<span class="c-fn">$1</span>')
      .replace(/(?<![\w#])(\d+)\b/g, '<span class="c-num">$1</span>')
      .replace(/(==|!=|&lt;=|&gt;=|&lt;|&gt;)/g, '<span class="c-op">$1</span>');
    return `<div class="l${i + 1 === courante ? ' on' : ''}${prendre ? ' prend' : ''}" data-i="${i}"><span class="n">${i + 1}</span><span class="t">${h || ' '}</span></div>`;
  }).join('');
}
function adversaire(code, nom, ligne = 0, note = '') { $('advNom').textContent = nom; $('advNote').textContent = note; $('advCode').innerHTML = code ? colorer(code, { courante: ligne }) : '<div class="l"><span class="n"></span>Code caché pendant l’écriture.</div>'; $('adv').hidden = false; }
function score(k, z) {
  const moi = S.moi === 'K' ? k : z, lui = S.moi === 'K' ? z : k, tot = W * H - S.murs.size;
  $('sMoi').textContent = moi; $('sLui').textContent = lui; $('bMoi').style.width = (100 * moi / tot) + '%'; $('bLui').style.width = (100 * lui / tot) + '%';
}
function chrono(s) { $('chrono').textContent = s == null ? '' : `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`; }
function phase(txt, cls = '') { $('phase').textContent = txt; $('phase').className = 'phase ' + cls; }
function ajusterPlateau() {
  const box = $('scene'), largeur = Math.min(box.clientWidth, 440), haut = Math.max(220, Math.min(460, window.innerHeight * (innerWidth > 860 ? .62 : .44)));
  PL.ajuster(largeur, haut); dessiner();
}
function dessiner() {
  if (!S.carte) return;
  const p = S.partie, opt = { murs: S.murs, retourne: S.moi === 'Z' };
  if (p) { const f = p.m.frames, t = Math.min(f.length - 1, p.m.t) + (S.etat === 'duel' || S.etat === 'solo' ? Math.min(.99, (performance.now() - S.t0) / 100 - p.m.t) : 0); PL.dessiner(f, Math.max(0, t), opt); }
  else { const m = createMatch({ map: S.carte, code: { K: '', Z: '' }, solo: S.mode === 'solo' }); PL.dessiner(m.frames, 0, { ...opt, path: S.apercu }); }
}
function choisirCarte(i) {
  S.carteI = i; S.carte = carte(i); S.murs = new Set(); S.carte.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') S.murs.add(x + y * W); }));
  S.partie = null; if ($('carte')) $('carte').value = i; majApercu(); ajusterPlateau();
}

/* ---------- le code : vérification, vitesse, erreurs ---------- */
function verifier(code) {
  if (!code.trim()) return { ok: true, vide: true };
  try { parse(code); } catch (e) { return { ok: false, err: e }; }
  const m = createMatch({ map: S.carte || carte(0), code: { K: code, Z: '' }, solo: true, tmax: 90 }); while (m.tick());
  if (m.P.K.err) return { ok: false, err: m.P.K.err, execution: true };
  return { ok: true };
}
function texteErreur(e) { return `${e.type || 'Error'}: ${e.msg || e.message}`; }
function majCode() {
  const code = ED.code(); stock.ecrire('code', code);
  const v = verifier(code); S.valide = v.ok;
  if (!v.ok) {
    const e = v.err, t = texteErreur(e), x = expliquer(t);
    $('errTexte').textContent = `Ligne ${e.ligne || '?'}\n${t}`; $('errFr').hidden = true; $('errFrTexte').innerHTML = `<p>${esc(x.quoi)}</p><p><b>Pour corriger :</b> ${esc(x.faire)}</p>`;
    $('errBouton').textContent = 'Expliquer en français'; $('erreur').hidden = false; ED.ligneErreur(e.ligne);
  } else { $('erreur').hidden = true; ED.ligneErreur(0); if (!v.vide) S.dernierValide = code; }
  const rep = countRep(code), periode = 3 + rep;
  $('vitesse').innerHTML = rep ? `<span class="lent">${rep} ligne${rep > 1 ? 's' : ''} recopiée${rep > 1 ? 's' : ''} : ton robot fait une action toutes les <b>${(periode / 10).toFixed(1).replace('.', ',')} s</b>.</span> Une boucle évite de recopier et rend ton robot plus rapide.` : `Ton robot fait une action toutes les <b>0,3 s</b> (aucune ligne recopiée).`;
  majBoutons(); majApercu();
}
function majApercu() {
  S.apercu = null;
  if (!S.partie && S.carte && S.valide !== false && (S.etat === 'pret' || S.etat === 'ecriture') && ED) {
    const code = ED.code(); if (code.trim()) { try { S.apercu = preview(S.carte, S.moi === 'Z' && S.mode !== 'solo' ? 'Z' : 'K', code, 24); } catch (e) {} }
  }
  if (!S.partie) dessiner();
}

/* ---------- boutons ---------- */
function majBoutons() {
  const go = $('go'), pret = $('pret');
  pret.hidden = true; go.disabled = false;
  if (S.etat === 'pret') { go.textContent = S.mode === 'solo' ? 'Lancer (30 s)' : 'Lancer le match'; go.disabled = !S.valide || !ED.code().trim(); }
  else if (S.etat === 'ecriture') { go.textContent = 'Je suis prêt·e'; go.disabled = !S.valide; }
  else if (S.etat === 'attente') { go.textContent = 'En attente de l’adversaire…'; go.disabled = true; }
  else if (S.etat === 'duel' || S.etat === 'solo') { const change = ED.code() !== S.partie.codeActuel(S.moi); go.textContent = change ? 'Envoyer le code (Ctrl + Entrée)' : 'Code envoyé'; go.disabled = !change || !S.valide; }
  else if (S.etat === 'salle') { go.textContent = 'En attente de la manche…'; go.disabled = true; }
  else { go.textContent = 'Match terminé'; go.disabled = true; }
}
function action() {
  if (S.etat === 'pret') return S.mode === 'solo' ? lancerSolo() : S.mode === 'zero' ? ecriture(60, () => lancerZero()) : null;
  if (S.etat === 'ecriture') return S.finEcriture && S.finEcriture();
  if (S.etat === 'duel' || S.etat === 'solo') return envoyer();
}

/* ---------- les modes ---------- */
function entrer(mode) {
  S.mode = mode; fermer(); $('jeu').hidden = false; S.partie = null; S.moi = 'K'; S.hote = false;
  $('adv').hidden = true; $('consigne').hidden = false; $('choixCarte').hidden = mode === 'salle'; $('nomAdv').hidden = mode === 'solo';
  if (mode === 'solo') { $('mode').textContent = 'Entraînement · seul·e sur la carte'; $('choixNiveau').hidden = true; choisirCarte(S.carteI); pret(); }
  if (mode === 'zero') { $('mode').textContent = 'Défi contre Zéro'; $('choixNiveau').hidden = false; $('niveau').value = S.zLv; choisirCarte(Math.min(S.zLv, CARTES.length - 1)); pret(); }
  if (mode === 'salle') { $('mode').textContent = 'Duel en direct'; $('choixNiveau').hidden = true; }
  ED.focus();
}
function pret() {
  S.etat = 'pret'; S.partie = null; phase('Prêt·e'); chrono(null); score(0, 0); ED.ligneEnCours(0);
  const c = CARTES[S.carteI];
  if (S.mode === 'solo') {
    const o = OBJECTIFS[c.id], meil = (stock.lire('etoiles') || {})[c.id] || 0;
    $('consigne').innerHTML = `<b>${esc(c.nom)}</b> · colorie le plus de cases possible en 30 s. ${esc(c.idee)}<div class="etoiles">${o.map((n, i) => `<span class="${meil > i ? 'ok' : ''}">${'★'.repeat(i + 1)} ${n} cases</span>`).join('')}</div>`;
    dire('Écris ton code, puis lance. Tu peux le changer pendant les 30 s : il repart de la ligne 1.');
  } else if (S.mode === 'zero') {
    const z = ZERO[S.zLv];
    $('consigne').innerHTML = `<b>${esc(c.nom)}</b> · contre Zéro, niveau ${S.zLv + 1} (${esc(z.nom)}). Le robot qui a le plus de cases au bout de 30 s gagne. <b>1 minute</b> pour écrire, puis le duel.`;
    adversaire(z.code, 'Zéro', 0, 'son code, à lire avant le duel'); dire('Lis le code de Zéro, écris le tien, puis lance : tu as 1 minute.');
  }
  majCode(); majBoutons(); dessiner();
}
function ecriture(secondes, fin) {
  S.etat = 'ecriture'; phase('Écriture', 'ecriture'); const t1 = performance.now() + secondes * 1000; let fini = false;
  S.finEcriture = () => { if (fini) return; if (!S.valide) { dire('Corrige l’erreur avant de lancer.', 'mal'); return; } fini = true; S.finEcriture = null; fin(); };
  const tic = () => { if (fini || S.etat !== 'ecriture') return; const r = Math.ceil((t1 - performance.now()) / 1000); chrono(r); if (r <= 0) { if (!S.valide) { const garde = S.dernierValide || CODE_DEPART; ED.remplacer(garde); dire('Ton code avait une erreur : ton robot part avec ton dernier code correct.', 'mal', 4000); } S.finEcriture(); return; } setTimeout(tic, 250); };
  tic(); majBoutons(); majApercu(); dire(`Tu as ${secondes} s pour écrire ton code. « Je suis prêt·e » pour lancer plus tôt.`);
}
function lancerSolo() {
  if (!S.valide) return;
  S.partie = new Partie({ carte: S.carte, codeK: ED.code(), codeZ: '', solo: true, seed: 1 });
  demarrer('solo');
}
function lancerZero() {
  S.partie = new Partie({ carte: S.carte, codeK: ED.code(), codeZ: ZERO[S.zLv].code, seed: 1 + Math.floor(Math.random() * 1e6) });
  demarrer('duel');
}
function demarrer(etat) {
  S.etat = etat; S.t0 = performance.now(); S.vu = 0; S.dernierValide = ED.code(); conseil.vus = {}; S.propres = 0;
  phase(etat === 'solo' ? 'En cours' : 'Duel', 'duel'); dire('C’est parti ! Tu peux changer ton code et l’envoyer : il repart de la ligne 1.', 'bon', 2500);
  majBoutons(); requestAnimationFrame(boucle);
}
function envoyer() {
  const code = ED.code(); if (!S.valide) { dire('Corrige l’erreur avant d’envoyer.', 'mal'); return; }
  if (code === S.partie.codeActuel(S.moi)) return;
  const e = S.partie.envoi(S.moi, code); if (!e) { dire('Trop tard : le match se termine.', 'mal'); return; }
  S.dernierValide = code; dire('Code envoyé : ton robot repart de la ligne 1, là où il est.', 'bon', 2500);
  if (S.salle) diffuserJournal(); majBoutons();
}
function boucle() {
  if (S.etat !== 'duel' && S.etat !== 'solo') return;
  const p = S.partie, cible = Math.floor((performance.now() - S.t0) / 100);
  p.avancer(cible);
  const f = p.m.frames;
  for (; S.vu < f.length; S.vu++) suivre(f[S.vu], f[S.vu - 1]);
  const fr = f[f.length - 1]; score(fr.score.K, fr.score.Z); chrono(Math.ceil((p.duree - p.m.t) / 10));
  const moiP = p.m.P[S.moi], autre = S.moi === 'K' ? 'Z' : 'K';
  ED.ligneEnCours(ED.code() === p.codeActuel(S.moi) && !moiP.done ? moiP.line : 0);
  if (S.mode !== 'solo') { const code = p.codeActuel(autre), l = p.m.P[autre].done ? 0 : p.m.P[autre].line; if (code !== S.advAffiche || l !== S.advLigne) { S.advAffiche = code; S.advLigne = l; adversaire(code, S.advNom, l, 'en direct'); } }
  dessiner(); majBoutons();
  if (p.finie) { if (S.mode === 'salle' && !S.graceFin) { S.graceFin = performance.now(); } if (S.mode !== 'salle' || performance.now() - S.graceFin > 1500) return finir(); }
  requestAnimationFrame(boucle);
}
function suivre(fr, prev) {
  if (!prev) return;
  for (const e of fr.ev) {
    if (e.type === 'wall' && e.who === S.moi && e.n >= 2) conseil('mur', 'Ton robot cogne un mur. Fais-le tourner quand la case n’est pas libre : if libre(): … else: droite()');
    if (e.type === 'bump' && e.who === S.moi && e.n >= 2) conseil('bloc', 'Bloqué·e par l’autre robot : tourne avec droite(), ou électrise-le avec eclair().');
    if (e.type === 'end_code' && e.who === S.moi) dire(e.err ? `Ton code s’est arrêté, ligne ${e.err.ligne} : ${texteErreur(e.err)}` : 'Ton code est fini : ton robot s’arrête. Mets-le dans while True: pour qu’il continue.', 'aide', 4000);
    if (e.type === 'hit' && e.who === S.moi) dire('Électrocuté·e ! 2 s sans bouger, et les cases autour changent de couleur. Riposte : if cible(): eclair()', 'mal', 3500);
    if (e.type === 'hit' && e.who !== S.moi) dire('Touché ! L’autre robot est figé et les cases autour passent à ta couleur.', 'bon', 3000);
    if (e.type === 'eclair' && e.who === S.moi && !e.hit) conseil('rate', 'Éclair dans le vide : vérifie d’abord avec if cible():');
  }
  const a = prev.P[S.moi], b = fr.P[S.moi];
  if (a.x !== b.x || a.y !== b.y) { const mien = S.moi === 'K' ? 1 : 2; if (prev.paint[b.x + b.y * W] === mien) { if (++S.propres >= 7) conseil('propres', 'Ton robot repasse sur ses propres cases. couleur() != "moi" l’aide à en trouver d’autres.'); } else S.propres = 0; }
}
function conseilFin(code) {
  if (!/while/.test(code)) return 'Ton robot s’arrête quand ton code est fini. Avec while True:, il colorie jusqu’à la fin.';
  if (countRep(code)) return 'Tu as recopié des lignes : avec une boucle for, ton robot irait plus vite.';
  if (!/\bif\b|while libre/.test(code)) return 'Ton robot ne regarde pas devant lui. if libre(): … else: droite() lui évite les murs.';
  if (!/couleur/.test(code)) return 'couleur() != "moi" fait choisir à ton robot des cases qui ne sont pas déjà à lui. Voler une case adverse compte double.';
  if (!/cible/.test(code)) return 'if cible(): eclair() électrise l’adversaire devant toi : il est figé et les cases autour deviennent les tiennes.';
  if (!/\band\b|\bor\b|\bnot\b/.test(code)) return 'Combine tes tests avec and : libre("droite") and couleur("droite") != "moi".';
  return 'Ton code utilise tout ! Essaie distance() <= 2, ou change l’ordre de tes tests.';
}
function finir() {
  const p = S.partie, k = p.m.count('K'), z = p.m.count('Z'), moi = S.moi === 'K' ? k : z, lui = S.moi === 'K' ? z : k, st = p.m.P[S.moi].stats, so = p.m.P[S.moi === 'K' ? 'Z' : 'K'].stats;
  S.etat = 'fin'; phase('Fini'); chrono(0); ED.ligneEnCours(0); majBoutons();
  const code = p.codeActuel(S.moi);
  let titre, plus = '', boutons = '';
  if (S.mode === 'solo') {
    const c = CARTES[S.carteI], o = OBJECTIFS[c.id], n = o.filter(x => moi >= x).length, et = stock.lire('etoiles') || {};
    if (n > (et[c.id] || 0)) { et[c.id] = n; stock.ecrire('etoiles', et); }
    titre = n ? `${'★'.repeat(n)} ${moi} cases !` : `${moi} cases`;
    plus = n < 3 ? `<p>Prochaine étoile : ${o[n]} cases. ${esc(PISTES_ETOILES[n])}</p>` : '<p>Les 3 étoiles ! Essaie la carte suivante, ou un défi contre Zéro.</p>';
    boutons = `<button class="bouton" data-a="rejouer">Rejouer</button>${S.carteI < CARTES.length - 1 ? '<button class="bouton fort" data-a="suivante">Carte suivante</button>' : '<button class="bouton fort" data-a="zero">Défier Zéro</button>'}`;
  } else {
    const r = moi > lui ? 'Gagné !' : moi < lui ? 'Perdu' : 'Égalité';
    titre = `${r} ${moi} cases contre ${lui}`;
    if (S.mode === 'zero') {
      if (moi > lui && S.zLv < ZERO.length - 1) { S.zLv++; stock.ecrire('zero', S.zLv); plus = `<p>Zéro apprend : au prochain match, il passe au niveau ${S.zLv + 1} (${esc(ZERO[S.zLv].nom)}).</p>`; }
      boutons = '<button class="bouton" data-a="rejouer">Même carte</button><button class="bouton fort" data-a="suivant">Match suivant</button>';
    } else {
      envoyerFin(k, z); plus = '<p>La prochaine manche arrive : garde ton code, améliore-le, ou emprunte une ligne à ton adversaire.</p>';
      boutons = '<button class="bouton fort" data-a="fermer">Continuer</button>';
    }
  }
  const advCode = S.mode === 'solo' ? '' : p.codeActuel(S.moi === 'K' ? 'Z' : 'K');
  ouvrir(`<h2 class="res">${esc(titre)}</h2>
    <div class="stats"><span></span><b style="color:var(--k)">Toi</b>${S.mode === 'solo' ? '<span></span>' : `<b style="color:var(--z)">${esc(S.advNom)}</b>`}
    <span>Cases prises</span><span>${st.new}</span><span>${S.mode === 'solo' ? '' : so.new}</span>
    <span>Cases volées</span><span>${st.stolen}</span><span>${S.mode === 'solo' ? '' : so.stolen}</span>
    <span>Éclairs réussis</span><span>${st.hits}</span><span>${S.mode === 'solo' ? '' : so.hits}</span>
    <span>Pas bloqués</span><span>${st.blocked}</span><span>${S.mode === 'solo' ? '' : so.blocked}</span></div>
    <div class="conseil">${esc(conseilFin(code))}</div>${plus}
    ${advCode ? `<h3 style="font-family:var(--titre);margin:12px 0 4px">Le code de ${esc(S.advNom)}</h3><p class="sous" style="margin:0 0 4px">Touche une ligne pour l’ajouter à ton code (sous la ligne où est ton curseur).</p><pre class="lecture" id="emprunt" style="max-height:260px;background:var(--nuit);border-radius:8px">${colorer(advCode, { prendre: true })}</pre>` : ''}
    <div class="ligne">${boutons}</div>`, a => {
    if (a === 'rejouer') { fermer(); pret(); }
    if (a === 'suivante') { fermer(); choisirCarte(S.carteI + 1); pret(); }
    if (a === 'suivant') { fermer(); choisirCarte(Math.min(S.zLv, CARTES.length - 1)); pret(); }
    if (a === 'zero') { fermer(); entrer('zero'); }
    if (a === 'fermer') { fermer(); attendreManche(); }
  });
  const em = $('emprunt'); if (em) em.onclick = ev => { const l = ev.target.closest('.l'); if (!l) return; const lignes = advCode.split('\n'), i = +l.dataset.i; let txt = lignes[i].trim(); if (/^else\s*:/.test(txt)) return; txt = txt.replace(/^elif\b/, 'if'); if (/:\s*$/.test(txt)) { const s = lignes[i + 1]; txt += '\n    ' + (s && s.trim() && !/:\s*$/.test(s) ? s.trim() : 'avancer()'); } ED.inserer(txt, { bloc: true }); l.style.background = 'rgba(52,211,153,.25)'; dire('Ligne empruntée : adapte-la à ton robot.', 'bon', 3000); };
}

/* ---------- salles en direct ---------- */
function rejoindreSalle(code, hote) {
  S.mode = 'salle'; S.hote = hote; S.codeSalle = code; S.etat = 'salle'; entrer('salle'); S.hote = hote;
  if (S.salle) S.salle.fermer();
  S.salle = ouvrirSalle(code, { id: S.monId, pseudo: S.pseudo, role: 'joueur' }, {
    onMessage: recevoir,
    onPresence: l => { S.joueurs = l.filter(x => x.role === 'joueur'); majSalle(); },
    onEtat: e => { S.etatReseau = e; majSalle(); if (e === 'erreur') dire('Connexion à la salle impossible. Vérifie le réseau, puis recharge la page.', 'mal'); },
  });
  attendreManche();
}
function majSalle() {
  if (S.mode !== 'salle') return;
  const n = S.joueurs.length;
  $('salleInfo').hidden = false;
  $('salleInfo').innerHTML = `Salle <b class="salle-code" style="font-size:20px;letter-spacing:2px">${esc(S.codeSalle)}</b> · ${n} joueur${n > 1 ? 's' : ''}${S.salle && S.salle.demo ? ' · mode démo (cet ordinateur seulement)' : ''}${S.etatReseau && S.etatReseau !== 'connecte' ? ' · connexion…' : ''}`
    + (S.hote && S.etat !== 'duel' && S.etat !== 'ecriture' && S.etat !== 'attente' ? ` <span class="ligne" style="display:inline-flex;margin:4px 0"><select id="hCarte" aria-label="Carte de la manche">${CARTES.map((c, i) => `<option value="${i}"${i === (S.hCarte || 0) ? ' selected' : ''}>${esc(c.nom)}</option>`).join('')}</select><button class="bouton fort petit" id="hLancer"${n < 2 ? ' disabled' : ''}>Lancer une manche</button></span>${n < 2 ? '<br>Donne le code ou ce lien à ton ou ta camarade : <a href="' + esc(lienSalle(S.codeSalle)) + '">' + esc(lienSalle(S.codeSalle)) + '</a>' : ''}` : '');
  const b = $('hLancer'); if (b) b.onclick = () => { S.hCarte = +$('hCarte').value; lancerManche(S.hCarte, 60); };
}
function lienSalle(code) { const u = new URL(location.href); u.search = '?classe=' + code; u.hash = ''; return u.toString(); }
function attendreManche() {
  S.etat = 'salle'; S.partie = null; S.monMatch = null; phase('Salle'); chrono(null); majBoutons(); majSalle();
  $('consigne').innerHTML = `<b>Duel en direct</b> · à chaque manche, tu as <b>1 minute</b> pour écrire ton code, puis 30 s de duel. Pendant le duel, tu vois le code de ton adversaire et tu peux changer le tien.`;
  if (!S.carte) choisirCarte(0); adversaire('', '…', 0, ''); $('adv').hidden = true;
  dire(S.hote ? 'Quand ton ou ta camarade est là, choisis une carte et lance une manche.' : 'En attente de la prochaine manche. Prépare ton code !');
}
function lancerManche(ci, ecr) { // hôte élève (défi entre ami·e·s) : même message que la page enseignant·e
  const paires = formerPaires(S.joueurs, S.derniers), n = (S.manche ? S.manche.n : 0) + 1;
  const msg = { t: 'manche', n, carte: ci, seed: 1 + Math.floor(Math.random() * 1e6), ecriture: ecr, paires: paires.map(([a, b], i) => ({ m: n + '-' + i, a: { id: a.id, pseudo: a.pseudo }, b: b ? { id: b.id, pseudo: b.pseudo } : null })) };
  S.salle.envoyer(msg); recevoir(msg);
}
function recevoir(msg) {
  if (msg.t === 'manche') {
    S.manche = msg; for (const p of msg.paires) if (p.b) { S.derniers[p.a.id] = p.b.id; S.derniers[p.b.id] = p.a.id; }
    const p = msg.paires.find(x => x.a.id === S.monId || (x.b && x.b.id === S.monId));
    if (!p) { dire('Une manche a commencé sans toi : tu joueras à la prochaine.', 'aide'); return; }
    fermer(); S.monMatch = p; S.moi = p.a.id === S.monId ? 'K' : 'Z'; const adv = S.moi === 'K' ? p.b : p.a;
    S.advNom = adv ? adv.pseudo : 'Zéro'; S.advId = adv ? adv.id : null; S.advCode0 = null; S.graceFin = 0; S.finEnvoyee = false;
    choisirCarte(msg.carte); S.partie = null;
    $('consigne').innerHTML = `<b>Manche ${msg.n} · ${esc(CARTES[msg.carte].nom)}</b> contre <b>${esc(S.advNom)}</b>. ${esc(CARTES[msg.carte].idee)} Tu es en bas, en cyan.`;
    adversaire('', S.advNom, 0, adv ? 'caché pendant l’écriture' : 'niveau 3');
    if (!adv) adversaire(ZERO[2].code, 'Zéro', 0, 'pas d’adversaire cette manche : tu affrontes Zéro');
    ecriture(msg.ecriture || 60, () => finEcritureSalle());
    for (const e of (S.pendants[p.m] || [])) recevoir(e); S.pendants = {};
  }
  if (msg.t === 'code') {
    if (!S.monMatch || msg.m !== S.monMatch.m) { if (S.manche && msg.m && msg.m.startsWith(S.manche.n + '-')) (S.pendants[msg.m] = S.pendants[msg.m] || []).push(msg); return; }
    const autre = S.moi === 'K' ? 'Z' : 'K'; if (msg.qui !== autre) return;
    const e0 = msg.ev.find(e => e.seq === 0);
    if (!S.partie) { if (e0) S.advCode0 = e0.code; S.advReste = msg.ev.filter(e => e.seq > 0); if (S.etat === 'attente' && S.advCode0 != null) commencerDuelSalle(); }
    else S.partie.fusionner(autre, msg.ev);
  }
  if (msg.t === 'stop') { dire('L’enseignant·e a fermé la salle.', 'aide'); }
}
function finEcritureSalle() {
  S.monCode0 = ED.code(); S.dernierValide = S.monCode0; S.etat = 'attente'; phase('Attente'); chrono(null); majBoutons();
  S.journal = [{ seq: 0, tick: 0, code: S.monCode0 }]; diffuserJournal();
  if (!S.advId) { S.advCode0 = ZERO[2].code; return commencerDuelSalle(); }
  dire('Code envoyé. En attente du code de ' + S.advNom + '…');
  clearTimeout(S.attenteTimer); S.attenteTimer = setTimeout(() => { if (S.etat === 'attente') { S.advCode0 = ZERO[2].code; S.advNom = 'Zéro'; S.advId = null; dire('Ton adversaire ne répond pas : tu affrontes Zéro.', 'aide', 4000); commencerDuelSalle(); } }, 12000);
  if (S.advCode0 != null) commencerDuelSalle();
}
function commencerDuelSalle() {
  clearTimeout(S.attenteTimer);
  const k = S.moi === 'K' ? S.monCode0 : S.advCode0, z = S.moi === 'K' ? S.advCode0 : S.monCode0;
  S.partie = new Partie({ carte: S.carte, codeK: k, codeZ: z, seed: S.manche.seed });
  if (S.advReste && S.advReste.length) S.partie.fusionner(S.moi === 'K' ? 'Z' : 'K', S.advReste);
  S.advAffiche = null; demarrer('duel');
  clearInterval(S.envoiTimer); S.envoiTimer = setInterval(() => { if (S.etat === 'duel' || S.etat === 'fin') diffuserJournal(); if (S.etat !== 'duel') clearInterval(S.envoiTimer); }, 2500);
}
function diffuserJournal() {
  if (!S.salle || !S.monMatch) return;
  const ev = S.partie ? S.partie.log[S.moi] : S.journal;
  S.salle.envoyer({ t: 'code', m: S.monMatch.m, qui: S.moi, ev });
}
function envoyerFin(k, z) {
  if (!S.salle || S.finEnvoyee) return; S.finEnvoyee = true; diffuserJournal();
  S.salle.envoyer({ t: 'fin', m: S.monMatch.m, id: S.monId, qui: S.moi, k, z, contreZero: !S.advId });
}

/* ---------- fenêtres ---------- */
function ouvrir(html, onAction) { $('fenetre').innerHTML = html; $('voile').hidden = false; $('fenetre').onclick = e => { const b = e.target.closest('[data-a]'); if (b && onAction) onAction(b.dataset.a, b); }; const f = $('fenetre').querySelector('input,button'); if (f) f.focus(); }
function fermer() { $('voile').hidden = true; }
function accueil() {
  if (S.salle) { S.salle.fermer(); S.salle = null; }
  S.etat = 'accueil'; $('jeu').hidden = true; $('salleInfo').hidden = true;
  const code = lireCodeSalle(params.get('classe') || params.get('salle'));
  ouvrir(`<h2>Court-circuit</h2><p class="sous">Écris le code de ton robot : il colorie les cases où il passe. Le plus de cases gagne.</p>
    <label for="pseudo"><b>Ton prénom ou un pseudo</b> (jamais ton nom de famille)</label>
    <div class="ligne"><input type="text" id="pseudo" maxlength="24" autocomplete="off" value="${esc(S.pseudo)}" style="flex:1;min-width:200px"></div>
    <div class="choix">
      <button class="carte-choix" data-a="solo"><b>S’entraîner</b><span>Seul·e sur 6 cartes, de plus en plus difficiles. 3 étoiles par carte.</span></button>
      <button class="carte-choix" data-a="zero"><b>Défier Zéro</b><span>Le robot de l’ordinateur. Il progresse quand tu le bats.</span></button>
      <div class="carte-choix" style="cursor:default"><b>Rejoindre une salle</b><span>Le code de 4 lettres donné en classe.</span><div class="ligne"><input type="text" id="codeSalle" maxlength="9" placeholder="ABCD" value="${esc(code || '')}" style="width:110px;text-transform:uppercase" aria-label="Code de la salle"><button class="bouton fort petit" data-a="rejoindre">Entrer</button></div></div>
      <button class="carte-choix" data-a="defi"><b>Défier un·e camarade</b><span>Crée une salle à deux et donne son code.</span></button>
    </div>
    <p id="accErr" class="message mal"></p>
    <p class="sous" style="margin:8px 0 0"><a href="memo.html">Mémo à imprimer</a> · Rien n’est enregistré en ligne : ton pseudo et ton code ne passent qu’aux joueurs de ta salle.</p>`, a => {
    const ps = $('pseudo').value.trim();
    if (ps.length < 2) { $('accErr').textContent = 'Écris un prénom ou un pseudo (2 lettres au moins).'; $('pseudo').focus(); return; }
    S.pseudo = ps; stock.ecrire('pseudo', ps);
    if (a === 'solo' || a === 'zero') entrer(a);
    if (a === 'rejoindre') { const c = lireCodeSalle($('codeSalle').value); if (!c) { $('accErr').textContent = 'Le code d’une salle a 4 lettres (sans I ni O).'; return; } rejoindreSalle(c, false); }
    if (a === 'defi') rejoindreSalle(nouveauCodeSalle(), true);
  });
  if (code) $('pseudo').focus();
}
function memo() {
  const dl = l => `<dl>${l.map(m => `<dt>${esc(m.mot)}</dt><dd>${esc(m.role)}</dd>`).join('')}</dl>`;
  ouvrir(`<div class="memo"><h2>Mémo</h2>
    <h3>Les actions</h3>${dl(MOTS.actions)}<h3>Les capteurs</h3>${dl(MOTS.capteurs)}<h3>Les mots de Python</h3>${dl(MOTS.mots_cles)}
    <h3>Exemples</h3><pre>${colorer('for i in range(4):\n    avancer()\ndroite()')}</pre><pre>${colorer('while True:\n    if libre():\n        avancer()\n    else:\n        droite()')}</pre>
    <h3>Les règles</h3><p>30 s de match. Le robot qui a le plus de cases gagne. Une case de l’adversaire sur laquelle tu passes devient la tienne. Chaque ligne recopiée ralentit ton robot : une boucle évite de recopier.</p>
    <div class="ligne"><a class="bouton" href="memo.html" target="_blank" rel="noopener">Mémo à imprimer</a><button class="bouton fort" data-a="ok">Fermer</button></div></div>`, () => fermer());
}

/* ---------- boîte à outils ---------- */
const OUTILS = {
  Actions: [['avancer()', 1], ['droite()', 1], ['gauche()', 1], ['eclair()', 1], ['attendre()', 1]],
  Boucles: [['for i in range(3):\n    avancer()', 1, 'for'], ['while True:\n    avancer()', 1, 'while True'], ['while libre():\n    avancer()', 1, 'while libre()']],
  Conditions: [['if libre():\n    avancer()\nelse:\n    droite()', 1, 'if … else'], ['elif libre("droite"):\n    droite()', 1, 'elif'], ['libre()', 0], ['libre("droite")', 0], ['couleur() != "moi"', 0], ['cible()', 0], ['distance()', 0]],
  Opérateurs: [[' and ', 0, 'and'], [' or ', 0, 'or'], ['not ', 0, 'not'], [' == ', 0, '=='], [' != ', 0, '!='], [' <= ', 0, '<='], [' < ', 0, '<'], [' > ', 0, '>']],
};
let ongletOutil = 'Actions';
function outils() {
  $('onglets').innerHTML = Object.keys(OUTILS).map(k => `<button class="onglet" role="tab" aria-selected="${k === ongletOutil}" data-o="${k}">${k}</button>`).join('') + (matchMedia('(pointer:coarse)').matches ? '<button class="onglet" data-d="1" aria-label="Décaler la ligne vers la droite">⇥</button><button class="onglet" data-d="-1" aria-label="Décaler la ligne vers la gauche">⇤</button>' : '');
  $('mots').innerHTML = OUTILS[ongletOutil].map(([t, bloc, lab], i) => `<button class="mot${/^(for|while|if|elif)/.test(t) ? ' kw' : /^ ?(and|or|not|==|!=|<|>)/.test(t) ? ' op' : ''}" data-i="${i}" title="${esc(t)}">${esc(lab || t.trim())}</button>`).join('');
}
function init() {
  PL = creerPlateau($('plateau'));
  S.zLv = stock.lire('zero') || 0;
  ED = creerEditeur($('editeur'), { doc: stock.lire('code') || CODE_DEPART, onChange: () => { clearTimeout(init.t); init.t = setTimeout(majCode, 200); majBoutons(); }, onEnvoi: action });
  $('go').onclick = action;
  $('errBouton').onclick = () => { const v = $('errFr').hidden; $('errFr').hidden = !v; $('errBouton').textContent = v ? 'Masquer l’explication' : 'Expliquer en français'; };
  $('onglets').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.o) { ongletOutil = b.dataset.o; outils(); } if (b.dataset.d) ED.decaler(+b.dataset.d); };
  $('mots').onclick = e => { const b = e.target.closest('.mot'); if (!b) return; const [t, bloc] = OUTILS[ongletOutil][+b.dataset.i]; ED.inserer(t, { bloc: !!bloc }); };
  $('carte').innerHTML = CARTES.map((c, i) => `<option value="${i}">${i + 1}. ${esc(c.nom)}</option>`).join('');
  $('carte').onchange = () => { if (S.etat === 'pret' || S.etat === 'fin') { choisirCarte(+$('carte').value); pret(); } };
  $('niveau').innerHTML = ZERO.map((z, i) => `<option value="${i}">Zéro ${i + 1} · ${esc(z.nom)}</option>`).join('');
  $('niveau').onchange = () => { if (S.etat === 'pret' || S.etat === 'fin') { S.zLv = +$('niveau').value; choisirCarte(Math.min(S.zLv, CARTES.length - 1)); $('carte').value = S.carteI; pret(); } };
  $('bMemo').onclick = memo; $('bAccueil').onclick = () => { if (S.etat === 'duel' && !confirmerQuitter()) return; accueil(); };
  $('voile').onclick = e => { if (e.target === $('voile') && S.etat !== 'accueil') { fermer(); if (S.etat === 'fin' && S.mode === 'salle') attendreManche(); } };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('voile').hidden && S.etat !== 'accueil') fermer(); });
  new ResizeObserver(ajusterPlateau).observe($('scene'));
  outils(); choisirCarte(0); majCode(); accueil();
}
function confirmerQuitter() { dire('Un match est en cours : termine-le avant de revenir à l’accueil.', 'aide'); return false; }
window.addEventListener('DOMContentLoaded', init);
