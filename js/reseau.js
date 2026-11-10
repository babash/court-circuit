/* Court-circuit : stockage sur l'appareil et salles en direct.
   Rien n'est enregistré en ligne : une salle est un canal temps réel de Supabase (diffusion et présence).
   Mode démo (?demo, ou sans configuration) : la salle passe entre les onglets de ce navigateur. */

// Stockage de l'appareil : un jour au plus (postes partagés), comme Lagon Arena et Gombessa.
const stock = {
  lire(k, defaut = null) { try { const v = JSON.parse(localStorage.getItem('court-circuit:' + k)); if (!v || v.fin < Date.now()) return defaut; return v.val; } catch (e) { return defaut; } },
  ecrire(k, val) { try { localStorage.setItem('court-circuit:' + k, JSON.stringify({ val, fin: Date.now() + 864e5 })); } catch (e) {} },
  oublier() { try { Object.keys(localStorage).filter(k => k.startsWith('court-circuit:')).forEach(k => localStorage.removeItem(k)); } catch (e) {} },
};

const params = new URLSearchParams(location.search);
function modeDemo() {
  try { if (params.get('demo') === '0') sessionStorage.removeItem('cc-demo'); else if (params.has('demo')) sessionStorage.setItem('cc-demo', '1'); return sessionStorage.getItem('cc-demo') === '1' || !window.CC_CONFIG || !window.CC_CONFIG.SUPABASE_URL || !window.TempsReel; }
  catch (e) { return params.has('demo'); }
}
const LETTRES = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 4 lettres sans I ni O
function nouveauCodeSalle() { const a = new Uint8Array(4); crypto.getRandomValues(a); return [...a].map(x => LETTRES[x % 24]).join(''); }
function lireCodeSalle(t) { const c = String(t || '').toUpperCase().normalize('NFD').replace(/[^A-Z0-9]/g, '').replace(/0/g, 'O'); return /^[A-Z]{4}$/.test(c) && ![...c].some(x => x === 'I' || x === 'O') ? c : null; }
// un identifiant par onglet : il sert seulement à reconnaître les joueurs d'une salle pendant la séance
function idOnglet() { try { let v = sessionStorage.getItem('cc-id'); if (!v) { v = nouvelId(); sessionStorage.setItem('cc-id', v); } return v; } catch (e) { return nouvelId(); } }
const nouvelId = () => { const a = new Uint8Array(8); crypto.getRandomValues(a); return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); };

/* Une salle : envoyer(msg), maj(info de présence), fermer(). Les rappels : onMessage(msg), onPresence(liste), onEtat(texte). */
function ouvrirSalle(code, moi, rappels) {
  return modeDemo() ? salleDemo(code, moi, rappels) : salleEnLigne(code, moi, rappels);
}
function salleEnLigne(code, moi, { onMessage, onPresence, onEtat }) {
  const cfg = window.CC_CONFIG, url = cfg.SUPABASE_URL.replace(/^http/, 'ws') + '/realtime/v1';
  const client = new TempsReel.RealtimeClient(url, { params: { apikey: cfg.SUPABASE_KEY, eventsPerSecond: 20 } });
  const ch = client.channel('court-circuit:' + code, { config: { broadcast: { self: false, ack: false }, presence: { key: moi.id } } });
  let info = { ...moi };
  ch.on('broadcast', { event: 'm' }, ({ payload }) => onMessage(payload));
  ch.on('presence', { event: 'sync' }, () => onPresence(Object.values(ch.presenceState()).map(l => l[l.length - 1])));
  ch.subscribe(async st => {
    onEtat(st === 'SUBSCRIBED' ? 'connecte' : st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' ? 'erreur' : st === 'CLOSED' ? 'ferme' : st);
    if (st === 'SUBSCRIBED') { try { await ch.track(info); } catch (e) {} }
  });
  return {
    envoyer(msg) { ch.send({ type: 'broadcast', event: 'm', payload: msg }).catch(() => {}); },
    maj(plus) { info = { ...info, ...plus }; ch.track(info).catch(() => {}); },
    fermer() { try { ch.unsubscribe(); client.disconnect(); } catch (e) {} },
    demo: false,
  };
}
function salleDemo(code, moi, { onMessage, onPresence, onEtat }) {
  const bc = new BroadcastChannel('court-circuit-demo:' + code), vus = new Map(); let info = { ...moi };
  const publier = () => onPresence([info, ...[...vus.values()].map(v => v.info)]);
  const battre = () => bc.postMessage({ k: 'p', info });
  bc.onmessage = ({ data }) => {
    if (data.k === 'p') { const neuf = !vus.has(data.info.id); vus.set(data.info.id, { info: data.info, vu: Date.now() }); publier(); if (neuf) battre(); }
    else if (data.k === 'q') { vus.delete(data.id); publier(); }
    else if (data.k === 'm') onMessage(data.msg);
  };
  const tic = setInterval(() => { battre(); const t = Date.now(); let ch = false; for (const [id, v] of vus) if (t - v.vu > 7000) { vus.delete(id); ch = true; } if (ch) publier(); }, 2000);
  const bye = () => bc.postMessage({ k: 'q', id: moi.id });
  window.addEventListener('pagehide', bye);
  setTimeout(() => { onEtat('connecte'); battre(); publier(); }, 50);
  return {
    envoyer(msg) { bc.postMessage({ k: 'm', msg }); },
    maj(plus) { info = { ...info, ...plus }; battre(); publier(); },
    fermer() { bye(); clearInterval(tic); bc.close(); },
    demo: true,
  };
}

/* L'hôte d'une salle (page enseignant·e, ou élève qui lance un défi) : forme les paires et lance les manches. */
function formerPaires(joueurs, derniers = {}) {
  const l = joueurs.slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
  const paires = [];
  while (l.length > 1) {
    const a = l.shift(); let k = l.findIndex(b => derniers[a.id] !== b.id); if (k < 0) k = 0;
    const b = l.splice(k, 1)[0]; paires.push([a, b]);
  }
  if (l.length) paires.push([l[0], null]); // nombre impair : contre Zéro
  return paires;
}
