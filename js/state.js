// state.js — Spielzustand, Speicherstand (localStorage), Level- & Fusions-Logik.

// Nachschlagetabellen aus den Rohdaten (data.js).
const Elements = {};
TYPES_DATA.elements.forEach(e => Elements[e.id] = e);
const Creatures = {};
CREATURES_DATA.creatures.forEach(c => Creatures[c.id] = c);
const Abilities = CREATURES_DATA.abilities;

const MAX_LEVEL = 5;                 // Prototyp-Cap; Fusion verlangt Max-Level.
const LEVEL_STAT_BONUS = 0.10;       // +10 % Basiswerte pro Level über 1.
const SAVE_KEY = 'elementra_save_v1';

// ---------- Kampf-XP (17.07.2026: Bindung — Kreaturen wachsen durchs Kämpfen) ----------
// Gold-Level-Up bleibt als teurer Beschleuniger (Ökonomie-Bremse: 60·Level).

function xpNeed(level) { return 35 * level; }           // XP für Level -> Level+1
function stageXp(stage) { return 10 + stage.id * 2; }   // Sieg; Niederlage: 1/3 davon

// Verteilt XP an eine Kreatur; gibt Anzahl Level-Ups zurück.
function gainXp(id, amount) {
  const e = Save.collection[id];
  if (!e || e.level >= MAX_LEVEL) return 0;
  e.xp = (e.xp || 0) + amount;
  let ups = 0;
  while (e.level < MAX_LEVEL && e.xp >= xpNeed(e.level)) {
    e.xp -= xpNeed(e.level);
    e.level++;
    ups++;
  }
  if (e.level >= MAX_LEVEL) e.xp = 0;
  return ups;
}

// XP nach Kampf für das ganze Team; Ergebnisliste für die Sieg/Niederlage-Anzeige.
function grantTeamXp(stage, teamIds, won) {
  const amount = won ? stageXp(stage) : Math.ceil(stageXp(stage) / 3);
  const gains = teamIds.filter(id => Save.collection[id]).map(id => {
    const ups = gainXp(id, amount);
    const e = Save.collection[id];
    return { id, amount, ups, level: e.level, xp: e.xp || 0, need: xpNeed(e.level) };
  });
  persist();
  return gains;
}

// ---------- Meilensteine / Sammelziele ----------

const MILESTONES = [
  { id: 'base10',  type: 'base',   need: 10, gold: 150 },
  { id: 'base21',  type: 'base',   need: 21, gold: 400 },
  { id: 'fx3',     type: 'fusion', need: 3,  gold: 200 },
  { id: 'fx12',    type: 'fusion', need: 12, gold: 600 },
  { id: 'stars30', type: 'stars',  need: 30, gold: 250 },
  { id: 'stars60', type: 'stars',  need: 60, gold: 800 },
];

function goalProgress(type) {
  if (type === 'base') return ownedIds().filter(id => !Creatures[id].fusion).length;
  if (type === 'fusion') return ownedIds().filter(id => Creatures[id].fusion).length;
  return Object.values(Save.stages).reduce((a, b) => a + b, 0); // stars
}

function claimMilestone(m) {
  if (Save.milestones[m.id] || goalProgress(m.type) < m.need) return false;
  Save.milestones[m.id] = true;
  Save.gold += m.gold;
  persist();
  return true;
}

// Tages-Bonus: einmal pro Kalendertag beim Start.
const DAILY_BONUS_GOLD = 50;
function dailyBonusAvailable() {
  return Save.lastLogin !== new Date().toISOString().slice(0, 10);
}
function claimDailyBonus() {
  if (!dailyBonusAvailable()) return false;
  Save.lastLogin = new Date().toISOString().slice(0, 10);
  Save.gold += DAILY_BONUS_GOLD;
  persist();
  return true;
}

const RarityInfo = {
  common:    { name: 'Gewöhnlich', color: '#9e9e9e' },
  rare:      { name: 'Selten',     color: '#42a5f5' },
  epic:      { name: 'Episch',     color: '#ab47bc' },
  legendary: { name: 'Legendär',   color: '#ffb300' },
};

// icon = PixelIcons-Name (iconArt), keine Emoji (UI-Grundsätze).
const RoleInfo = {
  dps:     { name: 'Angreifer', icon: 'sword' },
  tank:    { name: 'Tank',      icon: 'shield' },
  speed:   { name: 'Läufer',    icon: 'bolt' },
  bruiser: { name: 'Raufbold',  icon: 'fang' },
  dot:     { name: 'Gift',      icon: 'skull' },
  support: { name: 'Heiler',    icon: 'sparkle' },
  sustain: { name: 'Bewahrer',  icon: 'sun' },
};

// Beschreibungstexte der Fähigkeiten (Effekt-IDs aus creatures.json).
const AbilityDescriptions = {
  drache_passive:  'Erhält +5 % ANG je 25 % fehlender LP. +8 Energie pro Angriff.',
  drache_active:   '300 % ANG auf den Gegner mit den meisten LP.',
  golem_passive:   'Reduziert erlittenen Schaden um 2. +6 Energie pro erlittenem Treffer.',
  golem_active:    'Schild (20 % Max-LP) für das ganze Team, 5 Sekunden Spott.',
  greif_passive:   'Schnellste Energie-Ladung: +10 Energie pro Angriff.',
  greif_active:    '2 Treffer à 150 % ANG auf die gegnerische Rückreihe.',
  wolf_passive:    'Heilt sich um 15 % des verursachten Schadens. +7 Energie pro Angriff.',
  wolf_active:     '250 % ANG auf den schwächsten Gegner + Blutung (3×10 %).',
  wyrm_passive:    'Vergiftet Ziele (5 % ANG je Stapel, max. 5). +6 Energie pro Angriff.',
  wyrm_active:     'Gift-Flächenschaden (15 %/s, 4 s) + VER −10 % auf alle Gegner.',
  geist_passive:   'Lädt stetig: +6 Energie pro Sekunde.',
  geist_active:    'Heilt das gesamte Team um 30 % Max-LP.',
  phoenix_passive: 'Lädt stetig: +5 Energie pro Sekunde.',
  phoenix_active:  'Belebt einen Gefallenen (40 % LP) oder heilt den Schwächsten (25 %).',
  // Fusions-Archetypen
  koloss_passive:    'Reduziert erlittenen Schaden um 3. +6 Energie pro erlittenem Treffer.',
  koloss_active:     'Schild (25 % Max-LP) für das ganze Team, 5 Sekunden Spott.',
  wyvern_passive:    'Schnellste Ladung: +10 Energie pro Angriff.',
  wyvern_active:     '3 Treffer à 130 % ANG auf die gegnerische Rückreihe.',
  leviathan_passive: 'Vergiftet Ziele (max. 5 Stapel). +7 Energie pro Angriff.',
  leviathan_active:  '320 % ANG auf den Gegner mit den meisten LP.',
  seraph_passive:    'Lädt stetig: +6 Energie pro Sekunde.',
  seraph_active:     'Belebt einen Gefallenen (50 % LP) oder heilt den Schwächsten (30 %).',
  behemoth_passive:  'Heilt sich um 18 % des verursachten Schadens. +7 Energie pro Angriff.',
  behemoth_active:   '260 % ANG auf den schwächsten Gegner + Blutung (3×12 %).',
  gargoyle_passive:  'Reduziert erlittenen Schaden um 2. +6 Energie pro erlittenem Treffer.',
  gargoyle_active:   'Schild (22 % Max-LP) für das ganze Team, 5 Sekunden Spott.',
  basilisk_passive:  'Vergiftet Ziele (max. 5 Stapel). +6 Energie pro Angriff.',
  basilisk_active:   'Gift-Fläche (18 %/s, 4 s) + VER −15 % auf alle Gegner.',
  chimaera_passive:  'Schnelle Ladung: +10 Energie pro Angriff.',
  chimaera_active:   '2 Treffer à 170 % ANG auf den schwächsten Gegner.',
  sphinx_passive:    '+8 Energie pro Angriff.',
  sphinx_active:     'Heilt das gesamte Team um 25 % Max-LP.',
  barghest_passive:  'Heilt sich um 18 % des verursachten Schadens. +7 Energie pro Angriff.',
  barghest_active:   '240 % ANG auf den schwächsten Gegner + Blutung (3×12 %).',
  ouroboros_passive: 'Lädt stetig: +6 Energie pro Sekunde.',
  ouroboros_active:  'Gift-Fläche (15 %/s, 5 s) + VER −10 % auf alle Gegner.',
  archon_passive:    'Lädt stetig: +7 Energie pro Sekunde.',
  archon_active:     'Heilt das gesamte Team um 35 % Max-LP.',
};

// ---------- Fusions-Kreaturen (generiert aus fusions.json: 12 Archetypen × 6 Elemente) ----------
// Nicht in CREATURES_DATA — Sammlung/Silhouetten zeigen sie über FusionArchetypes an.

const FusionArchetypes = {};
FUSIONS_DATA.fusionArchetypes.forEach(f => {
  FusionArchetypes[f.id] = f;
  Object.keys(Elements).forEach(elId => {
    const id = 'fx_' + f.id + '_' + elId;
    Creatures[id] = {
      id,
      name: FUSIONS_DATA.namePrefixes[elId] + '-' + f.name,
      archetype: f.id, role: f.role, element: elId,
      rarity: f.rarity, tier: 2, baseStats: f.baseStats,
      passive: f.passive, active: f.active,
      fusion: true, pair: f.pair,
    };
  });
});

// ---------- Speicherstand ----------

function defaultSave() {
  return {
    gold: 120,
    // Sammlung: id -> { level, xp } (xp = Fortschritt zum nächsten Level)
    collection: {
      fire_drache:  { level: 1, xp: 0 },
      nature_golem: { level: 1, xp: 0 },
      water_geist:  { level: 1, xp: 0 },
    },
    team: ['fire_drache', 'nature_golem', 'water_geist'],
    stages: {},            // stageId -> Sterne (1–3)
    milestones: {},        // milestoneId -> true (abgeholt)
    lastLogin: null,       // 'YYYY-MM-DD' des letzten Tages-Bonus
    settings: { sfxVol: 1, musicVol: 1 }, // Regler 0–1 statt An/Aus (17.07.2026)
    bp: defaultBP(),       // Battlepass (Season, XP, Quests, abgeholte Stufen)
  };
}

// Season-Rhythmus ~30 Tage ab fester Epoche (bp.js nutzt dieselbe Funktion).
const SEASON_EPOCH = Date.UTC(2026, 6, 1);   // 01.07.2026
const SEASON_MS = 30 * 24 * 60 * 60 * 1000;
function currentSeason() { return Math.floor((Date.now() - SEASON_EPOCH) / SEASON_MS) + 1; }

// Battlepass-Grunddaten (19.07.2026). Season ~30 Tage, danach Reset der Bahn.
function defaultBP() {
  return {
    season: currentSeason(),
    xp: 0,                 // Battlepass-Punkte
    premium: false,        // Premium-Spur freigeschaltet (Prototyp: Demo-Schalter)
    claimedFree: {},       // tier -> true
    claimedPrem: {},       // tier -> true
    cosmetics: {},         // cosmeticId -> true
    quests: null,          // { day, week, daily:[...], weekly:[...] } — lazy in bp.js
  };
}

let Save = loadSave();

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = Object.assign(defaultSave(), JSON.parse(raw));
      // Migration 17.07.2026: alte Element-Hybride (steam_/ash_/frost_<archetyp>)
      // existieren nicht mehr — entfernen, 100 Gold Ersatz pro Kreatur.
      Object.keys(s.collection).forEach(id => {
        if (!Creatures[id]) { delete s.collection[id]; s.gold += 100; }
      });
      s.team = s.team.filter(id => s.collection[id]);
      const spare = Object.keys(s.collection).filter(id => !s.team.includes(id));
      while (s.team.length < 3 && spare.length) s.team.push(spare.shift());
      if (!Object.keys(s.collection).length) return defaultSave();
      // Migration: Lautstärke-Regler statt An/Aus; Logo fest auf Element-Ring.
      if (typeof s.settings.sfxVol !== 'number') s.settings.sfxVol = s.settings.sfx === false ? 0 : 1;
      if (typeof s.settings.musicVol !== 'number') s.settings.musicVol = s.settings.music === false ? 0 : 1;
      delete s.settings.sfx; delete s.settings.music; delete s.settings.emblem;
      // Migration Kampf-XP: alten Einträgen xp-Feld geben.
      Object.values(s.collection).forEach(e => { if (typeof e.xp !== 'number') e.xp = 0; });
      // Migration Battlepass: Feld anlegen; neue Season -> Bahn zurücksetzen.
      if (!s.bp) s.bp = defaultBP();
      if (s.bp.season !== currentSeason()) {
        s.bp = Object.assign(defaultBP(), { premium: false });
      }
      return s;
    }
  } catch (e) { console.warn('Speicherstand unlesbar, starte neu.', e); }
  return defaultSave();
}

function persist() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(Save));
}

function resetSave() {
  Save = defaultSave();
  persist();
}

// ---------- Werte & Level ----------

function statsAtLevel(creature, level) {
  const f = 1 + LEVEL_STAT_BONUS * (level - 1);
  const b = creature.baseStats;
  return {
    hp:  Math.round(b.hp * f),
    atk: Math.round(b.atk * f),
    def: Math.round(b.def * f),
    spd: b.spd, // Tempo skaliert nicht — hält das Balancing lesbar.
  };
}

// Ökonomie-Bremse 17.07.2026: Gold-Level-Up ist Beschleuniger, nicht Hauptweg.
function levelUpCost(level) { return 60 * level; } // Level 1→2 = 60 … 4→5 = 240.

function canLevelUp(id) {
  const e = Save.collection[id];
  return e && e.level < MAX_LEVEL && Save.gold >= levelUpCost(e.level);
}

function levelUp(id) {
  if (!canLevelUp(id)) return false;
  Save.gold -= levelUpCost(Save.collection[id].level);
  Save.collection[id].level++;
  Save.collection[id].xp = 0; // Gold-Kauf startet das neue Level frisch
  if (typeof bpTrack === 'function') bpTrack('levelup');
  persist();
  return true;
}

function ownedIds() { return Object.keys(Save.collection); }

// ---------- Fusion (Archetyp + Element, seit 17.07.2026) ----------
// Zwei Basis-Kreaturen VERSCHIEDENER Archetypen (beide Max-Level) -> Fusions-Archetyp.
// Element: gleich+gleich -> gleich, sonst Hybrid (fire+water=steam, fire+nature=ash,
// nature+water=frost). Fusions-Kreaturen selbst sind nicht erneut fusionierbar.

function fusionElementResult(a, b) {
  if (a === b) return a;
  const combo = FUSIONS_DATA.elementCombos.find(c => c.elements.includes(a) && c.elements.includes(b));
  return combo ? combo.result : null;
}

function fusionArchetypeFor(archA, archB) {
  return FUSIONS_DATA.fusionArchetypes.find(f =>
    (f.pair[0] === archA && f.pair[1] === archB) ||
    (f.pair[0] === archB && f.pair[1] === archA)) || null;
}

// Ergebnis-Kreatur-ID für zwei Kreaturen — oder null (gleicher Archetyp, kein
// Rezept-Paar, Fusions-Kreatur als Zutat).
function fusionResult(cidA, cidB) {
  const a = Creatures[cidA], b = Creatures[cidB];
  if (!a || !b || a.fusion || b.fusion || cidA === cidB) return null;
  if (a.archetype === b.archetype) return null;
  const f = fusionArchetypeFor(a.archetype, b.archetype);
  const elId = fusionElementResult(a.element, b.element);
  return f && elId ? 'fx_' + f.id + '_' + elId : null;
}

// Wie fusionResult, prüft zusätzlich Besitz + Max-Level + noch nicht vorhanden.
function fusionReady(cidA, cidB) {
  const out = fusionResult(cidA, cidB);
  if (!out || Save.collection[out]) return null;
  const ea = Save.collection[cidA], eb = Save.collection[cidB];
  return ea && eb && ea.level >= MAX_LEVEL && eb.level >= MAX_LEVEL ? out : null;
}

// Verbraucht beide Zutaten, fügt die Fusions-Kreatur (Level 1) hinzu, flickt das Team.
function fuseCreatures(cidA, cidB) {
  const out = fusionReady(cidA, cidB);
  if (!out) return null;
  delete Save.collection[cidA];
  delete Save.collection[cidB];
  Save.collection[out] = { level: 1, xp: 0 };
  Save.team = Save.team.map(id => (id === cidA || id === cidB) ? out : id);
  Save.team = [...new Set(Save.team)];
  while (Save.team.length < 3) {
    const spare = ownedIds().find(id => !Save.team.includes(id));
    if (!spare) break;
    Save.team.push(spare);
  }
  if (typeof bpTrack === 'function') bpTrack('fusion');
  persist();
  return out;
}

// ---------- Fortschritt ----------

function highestClearedStage() {
  return Object.keys(Save.stages).reduce((m, k) => Math.max(m, +k), 0);
}

function stageUnlocked(n) { return n <= highestClearedStage() + 1; }

function grantStageRewards(stage, stars) {
  const first = !Save.stages[stage.id];
  const prev = Save.stages[stage.id] || 0;
  Save.stages[stage.id] = Math.max(prev, stars);
  // Ökonomie-Bremse: Wiederholungen bringen nur halbes Gold.
  let gold = first ? stage.gold : Math.round(stage.gold * 0.5);
  let unlocked = null;
  if (first) {
    gold += stage.firstClearBonus;
    if (stage.unlockCreature && !Save.collection[stage.unlockCreature]) {
      Save.collection[stage.unlockCreature] = { level: 1, xp: 0 };
      unlocked = stage.unlockCreature;
    }
  }
  Save.gold += gold;
  persist();
  return { gold, unlocked, first };
}
