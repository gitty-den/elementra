// ascension.js — Aufstieg (Ascension) + Wochen-Modifikatoren.
// Langzeit-Hebel 2 der Design-Pfeiler: die Kampagne ist endlich, die Herausforderung
// nicht. Ab Aufstieg 1 wird die GANZE Kampagne härter neu gespielt — Gegner skalieren
// mit der Stufe, und zwei wöchentlich rotierende Modifikatoren drehen die Regeln um.
// Kein Backend nötig: die Wochenwahl ist deterministisch aus dem Kalender-Datum.

// Modifikatoren. battle.js liest die Felder generisch aus (siehe applyMutators):
//   all/enemy: {atk,def,hp} = Prozent-Aufschlag · intervalMult · energyMult
//   suddenDeathAt (ms) · chipPctPerSec · lifestealAll · enemyThorns
const MUTATORS = {
  glaskanone:   { name: 'Glaskanone',   icon: 'sword',  all: { atk: 0.5, hp: -0.3 } },
  panzerung:    { name: 'Panzerung',    icon: 'shield', enemy: { def: 0.4 } },
  frostluft:    { name: 'Frostluft',    icon: 'frost',  intervalMult: 1.25 },
  energiesturm: { name: 'Energiesturm', icon: 'bolt',   energyMult: 1.6 },
  zeitdruck:    { name: 'Zeitdruck',    icon: 'star',   suddenDeathAt: 45000 },
  giftnebel:    { name: 'Giftnebel',    icon: 'skull',  chipPctPerSec: 0.01 },
  dornenwelt:   { name: 'Dornenwelt',   icon: 'nature', enemyThorns: 3 },
  blutrausch:   { name: 'Blutrausch',   icon: 'heart',  lifestealAll: 0.1 },
};
const MUTATOR_IDS = Object.keys(MUTATORS);

// Montag der laufenden Woche als Schlüssel (UTC, wie im Battlepass).
function _ascWeekKey() {
  const d = new Date();
  const on = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  on.setUTCDate(on.getUTCDate() - ((on.getUTCDay() + 6) % 7));
  return on.toISOString().slice(0, 10);
}

// Zwei Modifikatoren pro Woche, deterministisch — jeder Spieler sieht dieselben.
function weeklyMutators() {
  const key = _ascWeekKey();
  let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const a = MUTATOR_IDS[h % MUTATOR_IDS.length];
  let b = MUTATOR_IDS[(h + 3) % MUTATOR_IDS.length];
  if (b === a) b = MUTATOR_IDS[(h + 4) % MUTATOR_IDS.length];
  return [a, b];
}

// Aktiv sind die Wochen-Modifikatoren nur im Aufstieg (Stufe 0 = normale Kampagne).
function activeMutators() { return (Save.ascension || 0) > 0 ? weeklyMutators() : []; }

// ---------- Stufen ----------

function finalBossStage() {
  const last = CHAPTERS[CHAPTERS.length - 1];
  return last ? last.bossStage : null;
}

// Aufstieg öffnet sich, sobald der Endboss der Kampagne einmal gefallen ist.
function ascensionUnlocked() {
  const fb = finalBossStage();
  return !!(fb && Save.stages[fb]);
}

// Man darf immer höchstens eine Stufe über dem bisher Geschafften antreten.
function maxAscension() { return (Save.ascHigh || 0) + 1; }

function setAscension(n) {
  const lvl = Math.max(0, Math.min(maxAscension(), n));
  Save.ascension = lvl;
  persist();
  return lvl;
}

// ---------- Skalierung ----------

// Gegner der Stage auf die aktuelle Aufstiegsstufe heben: +1 Level je Stufe
// (Cap MAX_LEVEL) und zusätzlich flacher Werte-Aufschlag über `mod`.
function ascEnemyDefs(stage) {
  const asc = Save.ascension || 0;
  if (!asc) return stage.enemies;
  return stage.enemies.map(e => ({
    ...e,
    level: Math.min(MAX_LEVEL, e.level + asc),
    mod: { hp: 0.15 * asc, atk: 0.12 * asc },
  }));
}

function ascGoldMult() { return 1 + 0.5 * (Save.ascension || 0); }

// Erstsieg AUF DIESER Aufstiegsstufe? Gibt der endlichen Map bei jeder Stufe
// wieder volle Belohnung und einen garantierten Item-Drop.
function ascFirstClear(stageId) {
  const asc = Save.ascension || 0;
  return asc > 0 && (Save.ascStages[stageId] || 0) < asc;
}

function markAscClear(stageId) {
  const asc = Save.ascension || 0;
  if (!asc) return;
  if ((Save.ascStages[stageId] || 0) < asc) { Save.ascStages[stageId] = asc; persist(); }
  // Endboss auf neuer Stufe geschafft -> nächste Stufe freischalten.
  if (stageId === finalBossStage() && asc > (Save.ascHigh || 0)) {
    Save.ascHigh = asc;
    persist();
  }
}
