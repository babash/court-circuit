/* Court-circuit : la page des élèves (entraînement, défi contre Zéro, duel en direct dans une salle,
   mini-championnat de la classe, programmes gardés avec le code de l'élève). */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const CODE_DEPART = 'for i in range(8):\n    nord()';
// Entraînement : 3 étoiles par carte (nombre de cases coloriées en 30 s, seul·e sur la carte)
const OBJECTIFS = {
  piste: [9, 35, 60], poteaux: [9, 20, 28], couloirs: [9, 18, 30], salles: [4, 12, 17], damier: [9, 18, 25], dedale: [9, 15, 25],
};
const PISTES_ETOILES = ['Une boucle for suffit : for i in range(8): nord()', 'Répète sans fin (while True) et change de direction : nord(), est(), sud()…', 'Regarde avant d’avancer : while not obstacleNord():, couleurEst() != "moi".'];
const HASARD = 'h'; // la 7e carte de l'entraînement : tirée au hasard, sans étoiles

const S = { mode: null, etat: 'accueil', carteI: 0, zLv: 0, moi: 'K', partie: null, t0: 0, vu: 0, salle: null, hote: false, monId: idOnglet(), pseudo: stock.lire('pseudo') || '', manche: null, monMatch: null, attente: null, adv: null, joueurs: [], derniers: {}, resultats: {}, pendants: {}, envoiTimer: 0, rencontres: [], classement: null, nomCarte: '', ideeCarte: '' };
let ED, PL;

/* ---------- affichage ---------- */
function dire(txt, cls = '', ms = 0) { const m = $('message'); m.textContent = txt; m.className = 'message ' + cls; dire.jusqua = ms ? performance.now() + ms : 0; }
function conseil(cle, txt) { const now = performance.now(); if (dire.jusqua && now < dire.jusqua) return; if (conseil.vus[cle] && now - conseil.vus[cle] < 7000) return; conseil.vus[cle] = now; dire(txt, 'aide', 3500); }
conseil.vus = {};
const FONCTIONS_RE = /\b(nord|sud|est|ouest|eclair|poserCaisse|attendre|obstacle(?:Nord|Sud|Est|Ouest)|couleur(?:Nord|Sud|Est|Ouest)|cible|distance|caisses)\b(?=\()/g;
function colorer(code, { courante = 0, prendre = false } = {}) {
  return code.split('\n').map((l, i) => {
    let h = esc(l).replace(/(#.*)$/, '<span class="c-com">$1</span>')
      .replace(/(&quot;[^&]*?&quot;|'[^']*')/g, '<span class="c-str">$1</span>')
      .replace(/\b(for|in|range|while|if|elif|else|and|or|not|True|False)\b/g, '<span class="c-kw">$1</span>')
      .replace(FONCTIONS_RE, '<span class="c-fn">$1</span>')
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
function poserCarte(rows, nom = '', idee = '') {
  S.carte = rows; S.nomCarte = nom; S.ideeCarte = idee; S.murs = new Set(); rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') S.murs.add(x + y * W); }));
  S.partie = null; majApercu(); ajusterPlateau();
}
function choisirCarte(i) { // entraînement : une des 6 cartes, ou une carte au hasard
  S.carteI = i; if ($('carte')) $('carte').value = i;
  if (i === HASARD) { const g = 1 + Math.floor(Math.random() * 9999); const c = carteDeManche(g, 3); poserCarte(c.rows, c.nom, 'Une carte tirée au hasard : regarde avant d’avancer.'); }
  else poserCarte(carte(i), CARTES[i].nom, CARTES[i].idee);
}
function carteZero() { const g = 1 + Math.floor(Math.random() * 9999), c = carteDeManche(g, S.zLv + 1); poserCarte(c.rows, c.nom, 'Carte tirée au hasard.'); }

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
  const go = $('go');
  go.disabled = false;
  if (S.etat === 'pret') { go.textContent = S.mode === 'solo' ? 'Lancer (30 s)' : 'Lancer le match'; go.disabled = !S.valide || !ED.code().trim(); }
  else if (S.etat === 'ecriture') { go.textContent = 'Je suis prêt·e'; go.disabled = !S.valide; }
  else if (S.etat === 'attente') { go.textContent = 'En attente de l’adversaire…'; go.disabled = true; }
  else if (S.etat === 'duel' || S.etat === 'solo') { const change = ED.code() !== S.partie.codeActuel(S.moi); go.textContent = change ? 'Envoyer le code (Ctrl + Entrée)' : 'Code envoyé'; go.disabled = !change || !S.valide; }
  else if (S.etat === 'salle') { go.textContent = 'En attente de la manche…'; go.disabled = true; }
  else { go.textContent = 'Match terminé'; go.disabled = true; }
  $('bCodes').hidden = !Comptes.actif;
}
function action() {
  if (S.etat === 'pret') return S.mode === 'solo' ? lancerSolo() : S.mode === 'zero' ? ecriture(60, () => lancerZero()) : null;
  if (S.etat === 'ecriture') return S.finEcriture && S.finEcriture();
  if (S.etat === 'duel' || S.etat === 'solo') return envoyer();
}

/* ---------- les modes ---------- */
function entrer(mode) {
  S.mode = mode; fermer(); $('jeu').hidden = false; S.partie = null; S.moi = 'K'; S.hote = false;
  $('adv').hidden = true; $('consigne').hidden = false; $('choixCarte').hidden = mode !== 'solo'; $('nomAdv').hidden = mode === 'solo';
  if (mode === 'solo') { $('mode').textContent = 'Entraînement · seul·e sur la carte'; $('choixNiveau').hidden = true; choisirCarte(S.carteI); pret(); }
  if (mode === 'zero') { $('mode').textContent = 'Défi contre Zéro'; $('choixNiveau').hidden = false; $('niveau').value = S.zLv; carteZero(); pret(); }
  if (mode === 'salle') { $('mode').textContent = 'Duel en direct'; $('choixNiveau').hidden = true; }
  ED.focus();
}
function pret() {
  S.etat = 'pret'; S.partie = null; phase('Prêt·e'); chrono(null); score(0, 0); ED.ligneEnCours(0);
  if (S.mode === 'solo') {
    if (S.carteI === HASARD) { $('consigne').innerHTML = `<b>${esc(S.nomCarte)}</b> · colorie le plus de cases possible en 30 s. ${esc(S.ideeCarte)}`; }
    else {
      const c = CARTES[S.carteI], o = OBJECTIFS[c.id], meil = (stock.lire('etoiles') || {})[c.id] || 0;
      $('consigne').innerHTML = `<b>${esc(c.nom)}</b> · colorie le plus de cases possible en 30 s. ${esc(c.idee)}<div class="etoiles">${o.map((n, i) => `<span class="${meil > i ? 'ok' : ''}">${'★'.repeat(i + 1)} ${n} cases</span>`).join('')}</div>`;
    }
    dire('Écris ton code, puis lance. Tu peux le changer pendant les 30 s : il repart de la ligne 1.');
  } else if (S.mode === 'zero') {
    const z = ZERO[S.zLv]; S.advNom = 'Zéro'; S.advId = null;
    $('consigne').innerHTML = `<b>${esc(S.nomCarte)}</b> · contre Zéro, niveau ${S.zLv + 1} (${esc(z.nom)}). Le robot qui a le plus de cases au bout de 30 s gagne. <b>1 minute</b> pour écrire, puis le duel. Le nord est en haut de ton écran.`;
    adversaire(z.code, 'Zéro', 0, 'son code, à lire avant le duel (vu de son côté : son nord va vers toi)'); dire('Lis le code de Zéro, écris le tien, puis lance : tu as 1 minute.');
  }
  majCode(); majBoutons(); dessiner();
}
function ecriture(secondes, fin) {
  S.etat = 'ecriture'; phase('Écriture', 'ecriture'); const t1 = performance.now() + secondes * 1000; let fini = false;
  S.finEcriture = () => { if (fini) return; if (!S.valide) { dire('Corrige l’erreur avant de lancer.', 'mal'); return; } fini = true; S.finEcriture = null; fin(); };
  const tic = () => { if (fini || S.etat !== 'ecriture') return; const r = Math.ceil((t1 - performance.now()) / 1000); chrono(r); if (r <= 0) { clearTimeout(init.t); majCode(); if (!S.valide) { ED.remplacer(S.dernierValide || CODE_DEPART); clearTimeout(init.t); majCode(); if (!S.valide) { ED.remplacer(CODE_DEPART); clearTimeout(init.t); majCode(); } dire('Ton code avait une erreur : ton robot part avec ton dernier code correct.', 'mal', 4000); } S.finEcriture(); return; } setTimeout(tic, 250); };
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
  if (S.mode !== 'solo') { const code = p.codeActuel(autre), l = p.m.P[autre].done ? 0 : p.m.P[autre].line; if (code !== S.advAffiche || l !== S.advLigne) { S.advAffiche = code; S.advLigne = l; adversaire(code, S.advNom, l, 'en direct, vu de son côté'); } }
  dessiner(); majBoutons();
  if (p.finie) { if (S.mode === 'salle' && !S.graceFin) { S.graceFin = performance.now(); } if (S.mode !== 'salle' || performance.now() - S.graceFin > 1500) return finir(); }
  requestAnimationFrame(boucle);
}
function suivre(fr, prev) {
  if (!prev) return;
  for (const e of fr.ev) {
    if (e.type === 'wall' && e.who === S.moi && e.n >= 2) conseil('mur', 'Ton robot cogne un obstacle. Regarde avant d’avancer : if not obstacleNord(): nord() else: est()');
    if (e.type === 'bump' && e.who === S.moi && e.n >= 2) conseil('bloc', 'Bloqué·e par l’autre robot : change de direction, ou électrise-le avec eclair().');
    if (e.type === 'end_code' && e.who === S.moi) dire(e.err ? `Ton code s’est arrêté, ligne ${e.err.ligne} : ${texteErreur(e.err)}` : 'Ton code est fini : ton robot s’arrête. Mets-le dans while True: pour qu’il continue.', 'aide', 4000);
    if (e.type === 'hit' && e.who === S.moi) dire('Électrocuté·e ! 2 s sans bouger, et les cases autour changent de couleur. Riposte : if cible(): eclair()', 'mal', 3500);
    if (e.type === 'hit' && e.who !== S.moi) dire('Touché ! L’autre robot est figé et les cases autour passent à ta couleur.', 'bon', 3000);
    if (e.type === 'eclair' && e.who === S.moi && !e.hit) conseil('rate', 'Éclair dans le vide : vérifie d’abord avec if cible():');
    if (e.type === 'caisse' && e.who === S.moi) conseil('caisse' + e.reste, `Caisse posée : elle bloque la case dès que tu en sors. Il t’en reste ${e.reste}.`);
    if (e.type === 'caisse_vide' && e.who === S.moi) conseil('caisse_vide', e.reste ? 'Il y a déjà une caisse sur ta case : avance avant d’en poser une autre.' : 'Plus de caisse : tu en as 3 par match. caisses() dit combien il t’en reste.');
  }
  const a = prev.P[S.moi], b = fr.P[S.moi];
  if (a.x !== b.x || a.y !== b.y) { const mien = S.moi === 'K' ? 1 : 2; if (prev.paint[b.x + b.y * W] === mien) { if (++S.propres >= 7) conseil('propres', 'Ton robot repasse sur ses propres cases. couleurNord() != "moi" l’aide à en trouver d’autres.'); } else S.propres = 0; }
}
function conseilFin(code) {
  if (!/while/.test(code)) return 'Ton robot s’arrête quand ton code est fini. Avec while True:, il colorie jusqu’à la fin.';
  if (countRep(code)) return 'Tu as recopié des lignes : avec une boucle for, ton robot irait plus vite.';
  if (!/obstacle/.test(code)) return 'Ton robot ne regarde pas avant d’avancer. while not obstacleNord(): nord() le fait aller jusqu’au mur sans le cogner.';
  if (!/couleur/.test(code)) return 'couleurEst() != "moi" fait choisir à ton robot des cases qui ne sont pas déjà à lui. Voler une case adverse compte double.';
  if (!/cible/.test(code)) return 'if cible(): eclair() électrise l’adversaire dans ta ligne ou ta colonne : il est figé et les cases autour deviennent les tiennes.';
  if (!/\band\b|\bor\b|\bnot\b/.test(code)) return 'Combine tes tests avec and : not obstacleEst() and couleurEst() != "moi".';
  if (!/poserCaisse/.test(code)) return 'poserCaisse() bloque une case derrière toi : de quoi fermer un couloir à ton adversaire.';
  return 'Ton code utilise tout ! Essaie distance() <= 3, ou change l’ordre de tes tests.';
}
function blocCode(code, i, { garder = true } = {}) { // un code à copier en entier : Copier, Dans mon éditeur, Garder
  return `<pre class="lecture copie" style="max-height:220px;background:var(--nuit);border-radius:8px">${colorer(code)}</pre>
    <div class="ligne" style="margin:4px 0 12px"><button class="bouton petit" data-a="copier" data-i="${i}">Copier</button><button class="bouton petit" data-a="editeur" data-i="${i}">Dans mon éditeur</button>${garder && Comptes.actif ? `<button class="bouton petit" data-a="garder" data-i="${i}">Garder dans mes codes</button>` : ''}</div>`;
}
async function copier(texte) {
  try { await navigator.clipboard.writeText(texte); return true; }
  catch (e) { const t = document.createElement('textarea'); t.value = texte; document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (x) {} t.remove(); return ok; }
}
function actionCode(a, code, nom) {
  if (a === 'copier') copier(code).then(ok => dire(ok ? 'Code copié : colle-le où tu veux (Ctrl + V).' : 'Copie impossible : sélectionne le code à la main.', ok ? 'bon' : 'mal', 3000));
  if (a === 'editeur') { ED.remplacer(code); majCode(); dire('Code mis dans ton éditeur : à toi de l’améliorer.', 'bon', 3000); }
  if (a === 'garder') mesCodes({ nom, texte: code });
}
function finir() {
  const p = S.partie, k = p.m.count('K'), z = p.m.count('Z'), moi = S.moi === 'K' ? k : z, lui = S.moi === 'K' ? z : k, st = p.m.P[S.moi].stats, so = p.m.P[S.moi === 'K' ? 'Z' : 'K'].stats;
  S.etat = 'fin'; phase('Fini'); chrono(0); ED.ligneEnCours(0); majBoutons();
  const code = p.codeActuel(S.moi);
  let titre, plus = '', boutons = '', copieEntiere = false;
  if (S.mode === 'solo') {
    if (S.carteI === HASARD) { titre = `${moi} cases`; plus = '<p>Une autre carte au hasard, ou une des 6 cartes à étoiles ?</p>'; boutons = '<button class="bouton" data-a="rejouer">Rejouer</button><button class="bouton fort" data-a="autre">Autre carte</button>'; }
    else {
      const c = CARTES[S.carteI], o = OBJECTIFS[c.id], n = o.filter(x => moi >= x).length, et = stock.lire('etoiles') || {};
      if (n > (et[c.id] || 0)) { et[c.id] = n; stock.ecrire('etoiles', et); }
      titre = n ? `${'★'.repeat(n)} ${moi} cases !` : `${moi} cases`;
      plus = n < 3 ? `<p>Prochaine étoile : ${o[n]} cases. ${esc(PISTES_ETOILES[n])}</p>` : '<p>Les 3 étoiles ! Essaie la carte suivante, ou un défi contre Zéro.</p>';
      boutons = `<button class="bouton" data-a="rejouer">Rejouer</button>${S.carteI < CARTES.length - 1 ? '<button class="bouton fort" data-a="suivante">Carte suivante</button>' : '<button class="bouton fort" data-a="zero">Défier Zéro</button>'}`;
    }
  } else {
    const r = moi > lui ? 'Gagné !' : moi < lui ? 'Perdu' : 'Égalité';
    titre = `${r} ${moi} cases contre ${lui}`;
    if (S.mode === 'zero') {
      copieEntiere = true;
      if (moi > lui && S.zLv < ZERO.length - 1) { S.zLv++; stock.ecrire('zero', S.zLv); plus = `<p>Zéro apprend : au prochain match, il passe au niveau ${S.zLv + 1} (${esc(ZERO[S.zLv].nom)}).</p>`; }
      boutons = '<button class="bouton" data-a="rejouer">Même carte</button><button class="bouton fort" data-a="suivant">Match suivant</button>';
    } else {
      envoyerFin(k, z);
      S.rencontres.push({ n: S.manche.n, adv: S.advNom, moi, lui, code: p.codeActuel(S.moi === 'K' ? 'Z' : 'K'), monCode: code, zero: !S.advId });
      plus = '<p>La prochaine ronde arrive : garde ton code, améliore-le, ou emprunte une ligne à ton adversaire. À la fin de la séance, tu pourras copier tout le code de chacun·e de tes adversaires.</p>';
      boutons = '<button class="bouton fort" data-a="fermer">Continuer</button>';
    }
  }
  const advCode = S.mode === 'solo' ? '' : p.codeActuel(S.moi === 'K' ? 'Z' : 'K');
  ouvrir(`<h2 class="res">${esc(titre)}</h2>
    <div class="stats"><span></span><b style="color:var(--k)">Toi</b>${S.mode === 'solo' ? '<span></span>' : `<b style="color:var(--z)">${esc(S.advNom)}</b>`}
    <span>Cases prises</span><span>${st.new}</span><span>${S.mode === 'solo' ? '' : so.new}</span>
    <span>Cases volées</span><span>${st.stolen}</span><span>${S.mode === 'solo' ? '' : so.stolen}</span>
    <span>Éclairs réussis</span><span>${st.hits}</span><span>${S.mode === 'solo' ? '' : so.hits}</span>
    <span>Caisses posées</span><span>${st.caisses}</span><span>${S.mode === 'solo' ? '' : so.caisses}</span>
    <span>Pas bloqués</span><span>${st.blocked}</span><span>${S.mode === 'solo' ? '' : so.blocked}</span></div>
    <div class="conseil">${esc(conseilFin(code))}</div>${plus}<p id="eloFin" class="sous"></p>
    ${advCode ? `<h3 style="font-family:var(--titre);margin:12px 0 4px">Le code de ${esc(S.advNom)}</h3>${copieEntiere ? blocCode(advCode, 0) : `<p class="sous" style="margin:0 0 4px">Touche une ligne pour l’ajouter à ton code (sous la ligne où est ton curseur).</p><pre class="lecture" id="emprunt" style="max-height:260px;background:var(--nuit);border-radius:8px">${colorer(advCode, { prendre: true })}</pre>`}` : ''}
    <div class="ligne">${Comptes.actif ? '<button class="bouton" data-a="garderMien">Garder mon code</button>' : ''}${boutons}</div>`, (a, b) => {
    if (a === 'copier' || a === 'editeur' || a === 'garder') return actionCode(a, advCode, 'Code de ' + S.advNom);
    if (a === 'garderMien') return mesCodes({ nom: S.nomCarte ? 'Mon code · ' + S.nomCarte : 'Mon code', texte: code });
    if (a === 'rejouer') { fermer(); pret(); }
    if (a === 'suivante') { fermer(); choisirCarte(S.carteI + 1); pret(); }
    if (a === 'autre') { fermer(); choisirCarte(HASARD); pret(); }
    if (a === 'suivant') { fermer(); carteZero(); pret(); }
    if (a === 'zero') { fermer(); entrer('zero'); }
    if (a === 'fermer') { fermer(); attendreManche(); }
  });
  majEloFin();
  const em = $('emprunt'); if (em) em.onclick = ev => { const l = ev.target.closest('.l'); if (!l) return; const lignes = advCode.split('\n'), i = +l.dataset.i; let txt = lignes[i].trim(); if (/^else\s*:/.test(txt)) return; txt = txt.replace(/^elif\b/, 'if'); if (/:\s*$/.test(txt)) { const s = lignes[i + 1]; txt += '\n    ' + (s && s.trim() && !/:\s*$/.test(s) ? s.trim() : 'nord()'); } ED.inserer(txt, { bloc: true }); l.style.background = 'rgba(52,211,153,.25)'; dire('Ligne empruntée : adapte-la à ton robot.', 'bon', 3000); };
}

/* ---------- salles en direct et mini-championnat ---------- */
function rejoindreSalle(code, hote) {
  S.mode = 'salle'; S.hote = hote; S.codeSalle = code; S.etat = 'salle'; S.rencontres = []; S.classement = null; entrer('salle'); S.hote = hote;
  if (S.salle) S.salle.fermer();
  S.salle = ouvrirSalle(code, { id: S.monId, pseudo: S.pseudo, role: 'joueur' }, {
    onMessage: recevoir,
    onPresence: l => { S.joueurs = l.filter(x => x.role === 'joueur'); majSalle(); },
    onEtat: e => { S.etatReseau = e; majSalle(); if (e === 'erreur') dire('Connexion à la salle impossible. Vérifie le réseau, puis recharge la page.', 'mal'); },
  });
  attendreManche();
}
function maPlace() { if (!S.classement) return null; return S.classement.table.find(j => j.id === S.monId) || null; }
function majSalle() {
  if (S.mode !== 'salle') return;
  const n = S.joueurs.length, pl = maPlace();
  $('salleInfo').hidden = false;
  $('salleInfo').innerHTML = `Salle <b class="salle-code" style="font-size:20px;letter-spacing:2px">${esc(S.codeSalle)}</b> · ${n} élève${n > 1 ? 's' : ''}${S.salle && S.salle.demo ? ' · mode démo (cet ordinateur seulement)' : ''}${S.etatReseau && S.etatReseau !== 'connecte' ? ' · connexion…' : ''}`
    + (pl ? `<br>Championnat : <b>${pl.rang}${pl.rang === 1 ? 're' : 'e'} place</b> sur ${S.classement.table.length} · Elo <b>${pl.elo}</b> · ${pl.v} victoire${pl.v > 1 ? 's' : ''}, ${pl.e} nul${pl.e > 1 ? 's' : ''}, ${pl.d} défaite${pl.d > 1 ? 's' : ''}` : '')
    + (S.hote && S.etat !== 'duel' && S.etat !== 'ecriture' && S.etat !== 'attente' ? ` <span class="ligne" style="display:inline-flex;margin:4px 0"><button class="bouton fort petit" id="hLancer"${n < 2 ? ' disabled' : ''}>Lancer une manche</button></span>${n < 2 ? '<br>Donne le code ou ce lien à ton ou ta camarade : <a href="' + esc(lienSalle(S.codeSalle)) + '">' + esc(lienSalle(S.codeSalle)) + '</a>' : ''}` : '');
  const b = $('hLancer'); if (b) b.onclick = () => lancerManche(60);
}
function lienSalle(code) { const u = new URL(location.href); u.search = '?classe=' + code; u.hash = ''; return u.toString(); }
function attendreManche() {
  S.etat = 'salle'; S.partie = null; S.monMatch = null; phase('Salle'); chrono(null); majBoutons(); majSalle();
  $('consigne').innerHTML = `<b>Duel en direct</b> · à chaque ronde, la carte est tirée au hasard. Tu as <b>1 minute</b> pour écrire ton code, puis 30 s de duel. Pendant le duel, tu vois le code de ton adversaire et tu peux changer le tien.`;
  if (!S.carte) poserCarte(carte(0), CARTES[0].nom, ''); adversaire('', '…', 0, ''); $('adv').hidden = true;
  dire(S.hote ? 'Quand ton ou ta camarade est là, lance une manche.' : 'En attente de la prochaine ronde. Prépare ton code !');
}
function lancerManche(ecr) { // hôte élève (défi entre ami·e·s) : le même message que la page enseignant·e, sans championnat
  const paires = formerPaires(S.joueurs, S.derniers), n = (S.manche ? S.manche.n : 0) + 1, seed = 1 + Math.floor(Math.random() * 1e6), c = carteDeManche(seed, n);
  const msg = { t: 'manche', n, carte: c.rows, nomCarte: c.nom, seed, ecriture: ecr, paires: paires.map(([a, b], i) => ({ m: n + '-' + i, a: { id: a.id, pseudo: a.pseudo }, b: b ? { id: b.id, pseudo: b.pseudo } : null })) };
  S.salle.envoyer(msg); recevoir(msg);
}
function recevoir(msg) {
  if (msg.t === 'manche') {
    S.manche = msg; for (const p of msg.paires) if (p.b) { S.derniers[p.a.id] = p.b.id; S.derniers[p.b.id] = p.a.id; }
    const p = msg.paires.find(x => x.a.id === S.monId || (x.b && x.b.id === S.monId));
    if (!p) { dire('Une ronde a commencé sans toi : tu joueras à la prochaine.', 'aide'); return; }
    fermer(); S.monMatch = p; S.moi = p.a.id === S.monId ? 'K' : 'Z'; const adv = S.moi === 'K' ? p.b : p.a;
    S.advNom = adv ? adv.pseudo : 'Zéro'; S.advId = adv ? adv.id : null; S.advCode0 = null; S.graceFin = 0; S.finEnvoyee = false;
    poserCarte(msg.carte, msg.nomCarte || '', msg.idee || ''); S.partie = null;
    const ronde = msg.total ? `Ronde ${msg.n} sur ${msg.total}` : `Manche ${msg.n}`, eloAdv = adv && adv.elo ? ` (Elo ${adv.elo})` : '';
    $('consigne').innerHTML = `<b>${ronde} · ${esc(msg.nomCarte || '')}</b> contre <b>${esc(S.advNom)}</b>${esc(eloAdv)}. ${esc(msg.idee || '')} Tu es en bas, en cyan : le nord est en haut de ton écran.`;
    adversaire('', S.advNom, 0, adv ? 'caché pendant l’écriture' : 'niveau 3');
    if (!adv) adversaire(ZERO[2].code, 'Zéro', 0, 'pas d’adversaire cette ronde : tu affrontes Zéro (sans effet sur ton Elo)');
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
  if (msg.t === 'classement') { S.classement = msg; majSalle(); majEloFin(); }
  if (msg.t === 'fin-seance') { S.classement = { ...msg, final: true }; majSalle(); finSeance(); }
  if (msg.t === 'stop') { dire('L’enseignant·e a fermé la salle.', 'aide'); }
}
function majEloFin() {
  const el = $('eloFin'), pl = maPlace(); if (!el || !pl || !S.classement || S.mode !== 'salle') return;
  el.textContent = `Championnat, après la ronde ${S.classement.n} : tu es à la ${pl.rang}${pl.rang === 1 ? 're' : 'e'} place sur ${S.classement.table.length}, Elo ${pl.elo}.`;
}
function finSeance() {
  const t = S.classement.table, pl = maPlace(), podium = t.slice(0, 3);
  const items = S.rencontres.filter(r => !r.zero);
  ouvrir(`<h2>Fin de la séance</h2>
    <p class="sous">${pl ? `Tu finis à la <b>${pl.rang}${pl.rang === 1 ? 're' : 'e'} place</b> sur ${t.length}, avec un Elo de <b>${pl.elo}</b> (${pl.v} victoire${pl.v > 1 ? 's' : ''}, ${pl.e} nul${pl.e > 1 ? 's' : ''}, ${pl.d} défaite${pl.d > 1 ? 's' : ''}).` : 'Le championnat est fini.'}</p>
    <p>Le podium : ${podium.map(j => `<b>${j.rang}. ${esc(j.pseudo)}</b> (${j.elo})`).join(' · ')}</p>
    <h3 style="font-family:var(--titre);margin:12px 0 4px">Les codes de tes adversaires</h3>
    ${items.length ? items.map((r, i) => `<p style="margin:8px 0 2px"><b>Ronde ${r.n}</b> · contre <b>${esc(r.adv)}</b> · ${r.moi > r.lui ? 'gagné' : r.moi < r.lui ? 'perdu' : 'égalité'} ${r.moi} – ${r.lui}</p>${blocCode(r.code, i)}`).join('') : '<p class="sous">Aucun duel contre un·e camarade pendant cette séance.</p>'}
    <div class="ligne">${Comptes.actif ? '<button class="bouton" data-a="garderMien">Garder mon code</button>' : ''}<button class="bouton fort" data-a="ok">Fermer</button></div>`, (a, b) => {
    if (a === 'copier' || a === 'editeur' || a === 'garder') { const r = items[+b.dataset.i]; return actionCode(a, r.code, `Code de ${r.adv} (ronde ${r.n})`); }
    if (a === 'garderMien') return mesCodes({ nom: 'Mon code de la séance', texte: ED.code() });
    if (a === 'ok') fermer();
  });
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

/* ---------- mon code élève et mes programmes gardés ---------- */
async function mesCodes(aGarder = null) {
  if (!Comptes.actif) return;
  const s = Comptes.session;
  if (!s) return monCode(aGarder);
  ouvrir('<h2>Mes codes</h2><p class="sous">Chargement…</p>');
  let r; try { r = await Comptes.reprise(); } catch (e) { r = { ok: false, message: e.message }; }
  if (!r.ok) { if (!Comptes.session) return monCode(aGarder, r.message); ouvrir(`<h2>Mes codes</h2><p class="message mal">${esc(r.message)}</p><div class="ligne"><button class="bouton fort" data-a="ok">Fermer</button></div>`, () => fermer()); return; }
  const progs = r.programmes || [], nomDefaut = aGarder ? aGarder.nom : '';
  ouvrir(`<h2>Mes codes</h2>
    <p class="sous">${esc(r.pseudo)} · ton code élève : <code id="monCodeEleve" class="code-eleve" data-code="${esc(r.code_affiche)}">${esc(r.code_affiche.replace(/-.*$/, '-•••••-•••'))}</code> <button class="bouton petit" data-a="voir">Afficher</button><br>Ce code suffit pour retrouver tes programmes sur n’importe quel ordinateur. Garde-le pour toi.</p>
    <label for="nomProg"><b>Garder ${aGarder ? 'ce code' : 'le code de ton éditeur'}</b> sous le nom :</label>
    <div class="ligne"><input type="text" id="nomProg" maxlength="40" value="${esc(nomDefaut)}" placeholder="Serpent, chasseur…" style="flex:1;min-width:180px"><button class="bouton fort" data-a="garder">Garder</button></div>
    <p id="codesMsg" class="message" role="status"></p>
    ${progs.length ? `<ul class="programmes">${progs.map((p, i) => `<li><span><b>${esc(p.nom)}</b><small>${esc(new Date(p.modifie_le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }))} · ${p.texte.split('\n').length} ligne${p.texte.split('\n').length > 1 ? 's' : ''}</small></span><button class="bouton petit" data-a="charger" data-i="${i}">Dans mon éditeur</button><button class="bouton petit" data-a="suppr" data-i="${i}" aria-label="Supprimer ${esc(p.nom)}">Supprimer</button></li>`).join('')}</ul>` : '<p class="sous">Aucun programme gardé pour l’instant.</p>'}
    <p class="sous">${progs.length} programme${progs.length > 1 ? 's' : ''} sur 30 au plus.</p>
    <div class="ligne"><button class="bouton petit" data-a="pasmoi">Ce n’est pas moi</button><button class="bouton petit" data-a="effacer">Effacer mes données</button><button class="bouton fort" data-a="ok" style="margin-left:auto">Fermer</button></div>`, async (a, b) => {
    const msg = (t, c = '') => { $('codesMsg').textContent = t; $('codesMsg').className = 'message ' + c; };
    if (a === 'voir') { const c = $('monCodeEleve'); const vu = c.textContent === c.dataset.code; c.textContent = vu ? c.dataset.code.replace(/-.*$/, '-•••••-•••') : c.dataset.code; b.textContent = vu ? 'Afficher' : 'Masquer'; }
    if (a === 'garder') {
      const nom = $('nomProg').value.trim(), texte = aGarder ? aGarder.texte : ED.code(); if (!nom) { msg('Donne un nom à ton programme.', 'mal'); $('nomProg').focus(); return; }
      b.disabled = true; let q; try { q = await Comptes.enregistrer(nom, texte); } catch (e) { q = { ok: false, message: e.message }; } b.disabled = false;
      if (!q.ok) return msg(q.message, 'mal');
      dire(q.nouveau ? `« ${nom} » est gardé avec ton code.` : `« ${nom} » est mis à jour.`, 'bon', 3000); mesCodes();
    }
    if (a === 'charger') { const p = progs[+b.dataset.i]; ED.remplacer(p.texte); majCode(); fermer(); dire(`« ${p.nom} » est dans ton éditeur.`, 'bon', 3000); }
    if (a === 'suppr') {
      const p = progs[+b.dataset.i]; if (b.dataset.sur !== '1') { b.dataset.sur = '1'; b.textContent = 'Sûr·e ?'; return; }
      try { await Comptes.supprimer(p.id); } catch (e) { return msg(e.message, 'mal'); } mesCodes();
    }
    if (a === 'pasmoi') { Comptes.oublier(); fermer(); dire('Ce poste a oublié ton code. Tu pourras entrer de nouveau avec ton code.', 'aide', 4000); majBoutons(); }
    if (a === 'effacer') {
      if (b.dataset.sur !== '1') { b.dataset.sur = '1'; b.textContent = 'Tout effacer, pour de bon ?'; msg('Ton compte et tous tes programmes seront effacés. Clique encore pour confirmer.', 'aide'); return; }
      try { await Comptes.effacer(); } catch (e) { return msg(e.message, 'mal'); } fermer(); dire('Ton compte et tes programmes sont effacés.', 'aide', 4000);
    }
    if (a === 'ok') fermer();
  });
}
function monCode(aGarder = null, message = '') { // entrer avec son code, ou en créer un
  ouvrir(`<h2>Ton code élève</h2>
    <p class="sous">Avec ton code (2 mots et 3 chiffres, par exemple PINCE-DIODE-482), tu gardes tes programmes en ligne et tu les retrouves sur n’importe quel ordinateur.</p>
    ${message ? `<p class="message mal">${esc(message)}</p>` : ''}
    <div class="choix">
      <div class="carte-choix" style="cursor:default"><b>J’ai déjà un code</b><label class="sr" for="codeEleve">Ton code</label><div class="ligne"><input type="text" id="codeEleve" maxlength="40" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="PINCE-DIODE-482" style="flex:1;min-width:170px;text-transform:uppercase"><button class="bouton fort petit" data-a="entrer">Entrer</button></div></div>
      <div class="carte-choix" style="cursor:default"><b>Je n’ai pas encore de code</b><label for="pseudoCode">Ton prénom ou un pseudo (jamais ton nom de famille)</label><div class="ligne"><input type="text" id="pseudoCode" maxlength="24" autocomplete="off" value="${esc(S.pseudo)}" style="flex:1;min-width:150px"><button class="bouton petit" data-a="creer">Créer mon code</button></div></div>
    </div>
    <p id="codeMsg" class="message" role="status"></p>
    <p class="sous">Ce qui est gardé : ton prénom ou ton pseudo, ton code et tes programmes, effacés 12 mois après ta dernière visite. Tu peux tout effacer avant, depuis « Mes codes ».</p>
    <div class="ligne"><button class="bouton" data-a="ok">Plus tard</button></div>`, async (a, b) => {
    const msg = (t, c = 'mal') => { $('codeMsg').textContent = t; $('codeMsg').className = 'message ' + c; };
    if (a === 'entrer') {
      const c = lireCodeEleve($('codeEleve').value); if (!c.ok) return msg(c.message);
      b.disabled = true; let r; try { r = await Comptes.entrer($('codeEleve').value); } catch (e) { r = { ok: false, message: e.message }; } b.disabled = false;
      if (!r.ok) return msg(r.message);
      S.pseudo = r.pseudo; stock.ecrire('pseudo', r.pseudo); majBoutons(); mesCodes(aGarder);
    }
    if (a === 'creer') {
      const ps = $('pseudoCode').value.trim(); if (ps.length < 2) return msg('Écris un prénom ou un pseudo (2 lettres au moins).');
      b.disabled = true; let r; try { r = await Comptes.creer(ps); } catch (e) { r = { ok: false, message: e.message }; } b.disabled = false;
      if (!r.ok) return msg(r.message);
      S.pseudo = r.pseudo; stock.ecrire('pseudo', r.pseudo); majBoutons(); noterCode(r.code_affiche, aGarder);
    }
    if (a === 'ok') fermer();
  });
  const f = $('codeEleve'); if (f) f.focus();
}
function noterCode(code, aGarder) { // le code est montré en gros ; « Je l'ai noté » demande les 3 chiffres
  const chiffres = code.split('-').pop();
  ouvrir(`<h2>Ton code</h2><p class="code-gros">${esc(code)}</p>
    <p><b>Note-le dans ton cahier.</b> Avec lui seul, tu retrouves tes programmes sur n’importe quel ordinateur. Ne le donne à personne.</p>
    <label for="verif">Pour vérifier, recopie les ${chiffres.length} chiffres de ton code :</label>
    <div class="ligne"><input type="text" id="verif" maxlength="4" inputmode="numeric" autocomplete="off" style="width:110px"><button class="bouton fort" data-a="note">Je l’ai noté</button></div>
    <p id="verifMsg" class="message" role="status"></p>`, a => {
    if (a !== 'note') return;
    if ($('verif').value.trim().replace(/[oO]/g, '0') !== chiffres) { $('verifMsg').textContent = 'Ce ne sont pas les bons chiffres : relis ton code, puis recopie-les.'; $('verifMsg').className = 'message mal'; return; }
    mesCodes(aGarder);
  });
}

/* ---------- fenêtres ---------- */
function ouvrir(html, onAction) { $('fenetre').innerHTML = html; $('voile').hidden = false; $('fenetre').onclick = e => { const b = e.target.closest('[data-a]'); if (b && onAction) onAction(b.dataset.a, b); }; const f = $('fenetre').querySelector('input,button'); if (f) f.focus(); }
function fermer() { $('voile').hidden = true; }
function accueil() {
  if (S.salle) { S.salle.fermer(); S.salle = null; }
  S.etat = 'accueil'; $('jeu').hidden = true; $('salleInfo').hidden = true;
  const code = lireCodeSalle(params.get('classe') || params.get('salle')), s = Comptes.session;
  ouvrir(`<h2>Court-circuit</h2><p class="sous">Écris le code de ton robot : il colorie les cases où il passe. Le plus de cases gagne.</p>
    <label for="pseudo"><b>Ton prénom ou un pseudo</b> (jamais ton nom de famille)</label>
    <div class="ligne"><input type="text" id="pseudo" maxlength="24" autocomplete="off" value="${esc(S.pseudo)}" style="flex:1;min-width:200px"></div>
    <div class="choix">
      <button class="carte-choix" data-a="solo"><b>S’entraîner</b><span>Seul·e sur 6 cartes, de plus en plus difficiles. 3 étoiles par carte.</span></button>
      <button class="carte-choix" data-a="zero"><b>Défier Zéro</b><span>Le robot de l’ordinateur, sur une carte tirée au hasard. Il progresse quand tu le bats.</span></button>
      <div class="carte-choix" style="cursor:default"><b>Rejoindre une salle</b><span>Le code de 4 lettres donné en classe.</span><div class="ligne"><input type="text" id="codeSalle" maxlength="9" placeholder="ABCD" value="${esc(code || '')}" style="width:110px;text-transform:uppercase" aria-label="Code de la salle"><button class="bouton fort petit" data-a="rejoindre">Entrer</button></div></div>
      <button class="carte-choix" data-a="defi"><b>Défier un·e camarade</b><span>Crée une salle à deux et donne son code.</span></button>
    </div>
    ${Comptes.actif ? `<p class="sous" style="margin:12px 0 0">${s ? `Connecté·e avec ton code élève (${esc(s.pseudo)}).` : 'Avec un code élève, tu gardes tes programmes en ligne.'} <button class="bouton petit" data-a="codes">${s ? 'Mes codes' : 'Mon code élève'}</button></p>` : ''}
    <p id="accErr" class="message mal"></p>
    <p class="sous" style="margin:8px 0 0"><a href="memo.html">Mémo à imprimer</a> · ${Comptes.actif ? 'Ton pseudo et ton code de robot passent aux élèves de ta salle ; seul ton code élève garde tes programmes en ligne.' : 'Rien n’est enregistré en ligne : ton pseudo et ton code ne passent qu’aux élèves de ta salle.'}</p>`, a => {
    const ps = $('pseudo').value.trim();
    if (a === 'codes') { if (ps.length >= 2) { S.pseudo = ps; stock.ecrire('pseudo', ps); } return mesCodes(); }
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
    <h3>Exemples</h3><pre>${colorer('for i in range(4):\n    nord()\nest()')}</pre><pre>${colorer('while True:\n    while not obstacleNord():\n        nord()\n    est()\n    while not obstacleSud():\n        sud()\n    est()')}</pre>
    <h3>Les règles</h3><p>30 s de match. Le robot qui a le plus de cases gagne. Une case de l’adversaire sur laquelle tu passes devient la tienne. Le nord est toujours en haut de ton écran. Chaque ligne recopiée ralentit ton robot : une boucle évite de recopier.</p>
    <h3>Au clavier</h3><p>Tab décale la ligne vers la droite, Maj + Tab vers la gauche. Échap puis Tab sort de l’éditeur. Ctrl + Entrée lance ou envoie le code.</p>
    <div class="ligne"><a class="bouton" href="memo.html" target="_blank" rel="noopener">Mémo à imprimer</a><button class="bouton fort" data-a="ok">Fermer</button></div></div>`, () => fermer());
}

/* ---------- boîte à outils ---------- */
const OUTILS = {
  Actions: [['nord()', 1], ['sud()', 1], ['est()', 1], ['ouest()', 1], ['eclair()', 1], ['poserCaisse()', 1], ['attendre()', 1]],
  Boucles: [['for i in range(3):\n    nord()', 1, 'for'], ['while True:\n    nord()', 1, 'while True'], ['while not obstacleNord():\n    nord()', 1, 'while not obstacleNord()']],
  Conditions: [['if obstacleNord():\n    est()\nelse:\n    nord()', 1, 'if … else'], ['elif obstacleEst():\n    ouest()', 1, 'elif'], ['obstacleNord()', 0], ['obstacleEst()', 0], ['obstacleSud()', 0], ['obstacleOuest()', 0], ['couleurNord() != "moi"', 0], ['couleurEst() == "vide"', 0], ['cible()', 0], ['distance()', 0], ['caisses()', 0]],
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
  const garde = stock.lire('code');
  ED = creerEditeur($('editeur'), { doc: garde && !/\b(avancer|droite|gauche|libre|couleur)\(/.test(garde) ? garde : CODE_DEPART, onChange: () => { clearTimeout(init.t); init.t = setTimeout(majCode, 200); majBoutons(); }, onEnvoi: action });
  $('go').onclick = action; $('bCodes').onclick = () => mesCodes();
  $('errBouton').onclick = () => { const v = $('errFr').hidden; $('errFr').hidden = !v; $('errBouton').textContent = v ? 'Masquer l’explication' : 'Expliquer en français'; };
  $('onglets').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.o) { ongletOutil = b.dataset.o; outils(); } if (b.dataset.d) ED.decaler(+b.dataset.d); };
  $('mots').onclick = e => { const b = e.target.closest('.mot'); if (!b) return; const [t, bloc] = OUTILS[ongletOutil][+b.dataset.i]; ED.inserer(t, { bloc: !!bloc }); };
  $('carte').innerHTML = CARTES.map((c, i) => `<option value="${i}">${i + 1}. ${esc(c.nom)}</option>`).join('') + `<option value="${HASARD}">7. Carte au hasard (sans étoiles)</option>`;
  $('carte').onchange = () => { if (S.etat === 'pret' || S.etat === 'fin') { const v = $('carte').value; choisirCarte(v === HASARD ? HASARD : +v); pret(); } };
  $('niveau').innerHTML = ZERO.map((z, i) => `<option value="${i}">Zéro ${i + 1} · ${esc(z.nom)}</option>`).join('');
  $('niveau').onchange = () => { if (S.etat === 'pret' || S.etat === 'fin') { S.zLv = +$('niveau').value; carteZero(); pret(); } };
  $('bMemo').onclick = memo; $('bAccueil').onclick = () => { if (S.etat === 'duel' && !confirmerQuitter()) return; accueil(); };
  $('voile').onclick = e => { if (e.target === $('voile') && S.etat !== 'accueil') { fermer(); if (S.etat === 'fin' && S.mode === 'salle') attendreManche(); } };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('voile').hidden && S.etat !== 'accueil') fermer(); });
  new ResizeObserver(ajusterPlateau).observe($('scene'));
  outils(); choisirCarte(0); majCode(); accueil();
}
function confirmerQuitter() { dire('Un match est en cours : termine-le avant de revenir à l’accueil.', 'aide'); return false; }
window.addEventListener('DOMContentLoaded', init);
