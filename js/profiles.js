// profiles.js — Lokale Spielerprofile (20.07.2026).
//
// Mehrere Spielstände nebeneinander in localStorage: jedes Profil bekommt einen
// eigenen Save-Schlüssel (`elementra_save_v1__<id>`). Kein Server, kein Konto —
// der PIN ist reine Bequemlichkeit (er liegt im Klartext daneben und schützt
// NICHT gegen jemanden, der den Browser-Speicher öffnet).
//
// Wird VOR state.js geladen, weil state.js beim Start bereits den Save des
// aktiven Profils liest.

const PROFILES_KEY = 'elementra_profiles_v1';
const LEGACY_SAVE_KEY = 'elementra_save_v1';   // Spielstand aus der Zeit vor den Profilen
const MAX_PROFILES = 4;

// { list: [{ id, name, pin }], activeId }
let Profiles = loadProfiles();

function loadProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.list)) return p;
    }
    // Erststart mit altem Spielstand: als „Spieler 1" übernehmen, nichts verlieren.
    const legacy = localStorage.getItem(LEGACY_SAVE_KEY);
    if (legacy) {
      const id = newProfileId();
      localStorage.setItem(profileSaveKey(id), legacy);
      const p = { list: [{ id, name: 'Spieler 1', pin: '' }], activeId: id };
      localStorage.setItem(PROFILES_KEY, JSON.stringify(p));
      return p;
    }
  } catch (e) { console.warn('Profile unlesbar, starte leer.', e); }
  return { list: [], activeId: null };
}

function persistProfiles() {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(Profiles)); } catch (e) { /* voll/privat */ }
}

function newProfileId() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function profileSaveKey(id) { return LEGACY_SAVE_KEY + '__' + id; }

function activeProfile() { return Profiles.list.find(p => p.id === Profiles.activeId) || null; }

// Save-Schlüssel des aktiven Profils; null = noch kein Profil gewählt
// (state.js persistiert dann bewusst nicht).
function currentSaveKey() { return Profiles.activeId ? profileSaveKey(Profiles.activeId) : null; }

function createProfile(name, pin) {
  if (Profiles.list.length >= MAX_PROFILES) return null;
  const p = { id: newProfileId(), name: (name || 'Spieler').slice(0, 12), pin: pin || '' };
  Profiles.list.push(p);
  Profiles.activeId = p.id;
  persistProfiles();
  return p;
}

function deleteProfile(id) {
  Profiles.list = Profiles.list.filter(p => p.id !== id);
  try { localStorage.removeItem(profileSaveKey(id)); } catch (e) { /* egal */ }
  if (Profiles.activeId === id) Profiles.activeId = null;
  persistProfiles();
}

// Profil aktivieren und dessen Spielstand in Save laden.
function activateProfile(id) {
  Profiles.activeId = id;
  persistProfiles();
  Save = loadSave();
}

// ---------- Cloud-Anbindung (Runde 9, 21.07.2026) ----------
// Ein Profil kann mit einem Cloud-Spielstand verknüpft sein: `p.cloud = { code,
// pin, at }`. Der PIN liegt lokal im Klartext daneben — wie der Profil-PIN ist
// er Bequemlichkeit, kein Schutz. Ohne Verknüpfung bleibt alles rein lokal.

function setProfileCloud(id, code, pin) {
  const p = Profiles.list.find(x => x.id === id);
  if (!p) return null;
  p.cloud = { code, pin, at: new Date().toISOString() };
  persistProfiles();
  return p.cloud;
}

function profileCloud(id) {
  const p = Profiles.list.find(x => x.id === id);
  return (p && p.cloud) || null;
}

// Legt ein NEUES Profil aus einem heruntergeladenen Spielstand an und aktiviert
// es. Bewusst neu statt überschreiben — so geht nie ein lokaler Stand verloren.
function importCloudProfile(name, saveData, code, pin) {
  const p = createProfile(name, '');
  if (!p) return null;
  p.cloud = { code, pin, at: new Date().toISOString() };
  persistProfiles();
  try { localStorage.setItem(profileSaveKey(p.id), JSON.stringify(saveData)); }
  catch (e) { console.warn('Cloud-Spielstand konnte nicht abgelegt werden.', e); }
  Save = loadSave();
  return p;
}

// Kurzer Fortschritts-Abriss für die Profilkarte (ohne den Save zu aktivieren).
function profileSummary(id) {
  try {
    const raw = localStorage.getItem(profileSaveKey(id));
    if (!raw) return { creatures: 0, stars: 0 };
    const s = JSON.parse(raw);
    const stars = Object.values(s.stages || {}).reduce((a, b) => a + (+b || 0), 0);
    return { creatures: Object.keys(s.collection || {}).length, stars };
  } catch (e) { return { creatures: 0, stars: 0 }; }
}
