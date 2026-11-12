/* Court-circuit : le code de l'élève (règle 21) et ses programmes gardés en ligne (« Mes codes »).
   Un code de 2 mots et 3 chiffres (PINCE-DIODE-482) suffit pour revenir depuis n'importe quel appareil.
   La page ne garde qu'un jeton de session, un jour au plus (postes partagés).
   Les fonctions de la base sont dans supabase/0001-codes-eleves.sql ; en mode démo, elles sont imitées sur cet appareil.
   Tant que la migration n'est pas appliquée, config.js garde COMPTES à false et rien de tout cela n'apparaît. */

// La liste des mots, dans l'ordre de court_circuit.mots (rang 0 à 63) : thème « l'atelier ».
const MOTS_CODES = ['MARTEAU', 'PINCE', 'SCIE', 'ENCLUME', 'PERCEUSE', 'BOULON', 'ECROU', 'RIVET',
  'CHEVILLE', 'RESSORT', 'LEVIER', 'TREUIL', 'ROUAGE', 'PISTON', 'MOTEUR', 'DYNAMO',
  'FUSIBLE', 'BOBINE', 'AIMANT', 'DIODE', 'PRISE', 'AMPOULE', 'LAMPE', 'TORCHE',
  'SOUDURE', 'CUIVRE', 'NICKEL', 'BRONZE', 'CHROME', 'VOLT', 'WATT', 'AMPERE',
  'TENSION', 'COURANT', 'CIRCUIT', 'BATTERIE', 'RELAIS', 'FICHE', 'NEON', 'CAPTEUR',
  'TENAILLE', 'SPATULE', 'EQUERRE', 'NIVEAU', 'REGLE', 'CRAYON', 'GOMME', 'ROULEAU',
  'COLLE', 'AGRAFE', 'PUNAISE', 'VERNIS', 'MASTIC', 'TRUELLE', 'BROUETTE', 'ECHELLE',
  'ETABLI', 'SOURIS', 'PIXEL', 'TURBINE', 'HELICE', 'TABLIER', 'COPEAU', 'PLANCHE'];

/* Lecture tolérante d'un code (spécification des codes, § 1.2) : majuscules ou minuscules, accents, séparateurs,
   O pour 0 et I ou L pour 1 dans les chiffres, 0 pour O et 1 pour I dans les mots, 3 ou 4 chiffres.
   Renvoie { ok, canon, affiche } ou { ok: false, message } : un mot mal écrit est signalé avant tout envoi. */
function lireCodeEleve(texte) {
  const brut = String(texte || '').replace(/[œŒ]/g, m => m === 'œ' ? 'oe' : 'OE').normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
  const morceaux = brut.split(/[^A-Z0-9]+/).filter(Boolean), tout = morceaux.join('');
  const enMots = s => s.replace(/0/g, 'O').replace(/1/g, 'I'), enChiffres = s => s.replace(/O/g, '0').replace(/[IL]/g, '1');
  const decouper = s => { for (const a of MOTS_CODES) if (s.startsWith(a) && MOTS_CODES.includes(s.slice(a.length))) return [a, s.slice(a.length)]; return null; };
  for (const n of [3, 4]) {
    if (tout.length <= n) continue;
    const ch = enChiffres(tout.slice(-n)), mots = decouper(enMots(tout.slice(0, -n)));
    if (/^\d+$/.test(ch) && mots) return { ok: true, canon: mots[0] + mots[1] + ch, affiche: mots[0] + '-' + mots[1] + '-' + ch };
  }
  // un mot inconnu : le mot le plus proche de la liste
  const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
  const motsTapes = morceaux.map(enMots).filter(m => /^[A-Z]{2,}$/.test(m));
  for (const m of motsTapes) if (!MOTS_CODES.includes(m)) {
    const proche = MOTS_CODES.reduce((b, x) => lev(m, x) < lev(m, b) ? x : b, MOTS_CODES[0]);
    return { ok: false, message: lev(m, proche) <= 2 ? `${m} n’est pas dans la liste : voulais-tu dire ${proche} ?` : `${m} n’est pas un mot des codes de Court-circuit.` };
  }
  return { ok: false, message: 'Un code a 2 mots et 3 chiffres, par exemple PINCE-DIODE-482.' };
}

const Comptes = (() => {
  const cfg = window.CC_CONFIG || {};
  // l'imitation seulement avec ?demo ou sans projet configuré : jamais par accident (un fichier qui ne se charge pas, par exemple)
  const demo = (() => { modeDemo(); try { return sessionStorage.getItem('cc-demo') === '1' || !cfg.SUPABASE_URL; } catch (e) { return params.has('demo') || !cfg.SUPABASE_URL; } })();
  const actif = demo || !!cfg.COMPTES;
  let session = stock.lire('compte'); // { jeton, pseudo } : un jour au plus
  async function rpc(fn, args) {
    if (demo) return Imitation[fn](args);
    const r = await fetch(cfg.SUPABASE_URL + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: cfg.SUPABASE_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
    if (!r.ok) throw new Error('La base ne répond pas (' + r.status + ').');
    return r.json();
  }
  const garder = r => { if (r.ok) { session = { jeton: r.jeton, pseudo: r.pseudo }; stock.ecrire('compte', session); } return r; };
  return {
    actif, demo,
    get session() { return session; },
    creer: async pseudo => garder(await rpc('cc_solo', { p_pseudo: pseudo })),
    entrer: async texte => { const c = lireCodeEleve(texte); if (!c.ok) return c; return garder(await rpc('cc_connexion', { p_code: c.canon })); },
    reprise: async () => { if (!session) return { ok: false, message: 'Entre ton code.' }; const r = await rpc('cc_reprise', { p_jeton: session.jeton }); if (!r.ok) { session = null; stock.ecrire('compte', null); } return r; },
    enregistrer: async (nom, texte, id = null) => rpc('cc_enregistrer', { p_jeton: session && session.jeton, p_nom: nom, p_texte: texte, p_id: id }),
    supprimer: async id => rpc('cc_supprimer', { p_jeton: session && session.jeton, p_id: id }),
    effacer: async () => { const r = await rpc('cc_effacer_moi', { p_jeton: session && session.jeton }); session = null; stock.ecrire('compte', null); return r; },
    oublier() { session = null; stock.ecrire('compte', null); },
  };
})();

/* Mode démo : les mêmes fonctions que la base, imitées sur cet appareil (rien ne part en ligne). */
const Imitation = (() => {
  const lire = () => { try { return JSON.parse(localStorage.getItem('court-circuit-demo:base')) || { eleves: [] }; } catch (e) { return { eleves: [] }; } };
  const ecrire = b => { try { localStorage.setItem('court-circuit-demo:base', JSON.stringify(b)); } catch (e) {} };
  const hasard = n => { const a = new Uint8Array(1); crypto.getRandomValues(a); return a[0] % n; };
  const uuid = () => crypto.randomUUID ? crypto.randomUUID() : nouvelId() + nouvelId();
  const parJeton = (b, j) => b.eleves.find(e => e.jeton === j);
  const expire = { ok: false, message: 'Ta session a expiré : entre de nouveau ton code.' };
  return {
    cc_solo({ p_pseudo }) {
      const ps = String(p_pseudo || '').replace(/\s+/g, ' ').trim(); if (ps.length < 2 || ps.length > 24) return { ok: false, message: 'Écris un prénom ou un pseudo de 2 à 24 caractères (jamais ton nom de famille).' };
      const b = lire(); let c;
      do { const w1 = MOTS_CODES[hasard(64)], w2 = MOTS_CODES[hasard(64)], d = String(hasard(250) * 4 % 1000 + hasard(4)).padStart(3, '0'); c = { code: w1 + w2 + d, code_affiche: `${w1}-${w2}-${d}` }; } while (b.eleves.some(e => e.code === c.code));
      const e = { id: uuid(), pseudo: ps, ...c, jeton: uuid(), programmes: [] }; b.eleves.push(e); ecrire(b);
      return { ok: true, pseudo: e.pseudo, code_affiche: e.code_affiche, jeton: e.jeton };
    },
    cc_connexion({ p_code }) { const e = lire().eleves.find(x => x.code === p_code); return e ? { ok: true, pseudo: e.pseudo, code_affiche: e.code_affiche, jeton: e.jeton } : { ok: false, message: 'Ce code n’existe pas. Vérifie-le dans ton cahier.' }; },
    cc_reprise({ p_jeton }) { const e = parJeton(lire(), p_jeton); if (!e) return expire; return { ok: true, pseudo: e.pseudo, code_affiche: e.code_affiche, programmes: e.programmes.slice().sort((a, b) => b.modifie_le.localeCompare(a.modifie_le)) }; },
    cc_enregistrer({ p_jeton, p_nom, p_texte, p_id }) {
      const nom = String(p_nom || '').replace(/\s+/g, ' ').trim(); if (nom.length < 1 || nom.length > 40) return { ok: false, message: 'Donne un nom de 1 à 40 caractères à ton programme.' };
      if (String(p_texte).length > 4000) return { ok: false, message: 'Un programme gardé a 4 000 caractères au plus.' };
      const b = lire(), e = parJeton(b, p_jeton); if (!e) return expire;
      let p = e.programmes.find(x => p_id ? x.id === p_id : x.nom.toLowerCase() === nom.toLowerCase()); const nouveau = !p;
      if (!p) { if (e.programmes.length >= 30) return { ok: false, message: 'Tu as déjà 30 programmes gardés : supprimes-en un avant d’en garder un autre.' }; p = { id: uuid() }; e.programmes.push(p); }
      Object.assign(p, { nom, texte: p_texte, modifie_le: new Date().toISOString() }); ecrire(b); return { ok: true, id: p.id, nouveau };
    },
    cc_supprimer({ p_jeton, p_id }) { const b = lire(), e = parJeton(b, p_jeton); if (!e) return expire; const n = e.programmes.length; e.programmes = e.programmes.filter(x => x.id !== p_id); ecrire(b); return { ok: e.programmes.length < n }; },
    cc_effacer_moi({ p_jeton }) { const b = lire(), n = b.eleves.length; b.eleves = b.eleves.filter(x => x.jeton !== p_jeton); ecrire(b); return { ok: b.eleves.length < n }; },
  };
})();
