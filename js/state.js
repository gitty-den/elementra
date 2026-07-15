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

const RarityInfo = {
  common:    { name: 'Gewöhnlich', color: '#9e9e9e' },
  rare:      { name: 'Selten',     color: '#42a5f5' },
  epic:      { name: 'Episch',     color: '#ab47bc' },
  legendary: { name: 'Legendär',   color: '#ffb300' },
};

const RoleInfo = {
  dps:     { name: 'Angreifer', icon: '⚔️' },
  tank:    { name: 'Tank',      icon: '🛡️' },
  speed:   { name: 'Läufer',    icon: '⚡' },
  bruiser: { name: 'Raufbold',  icon: '🐺' },
  dot:     { name: 'Gift',      icon: '☠️' },
  support: { name: 'Heiler',    icon: '✨' },
  sustain: { name: 'Bewahrer',  icon: '🔆' },
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
};

// ---------- Speicherstand ----------

function defaultSave() {
  return {
    gold: 120,
    // Sammlung: id -> { level }
    collection: {
      fire_drache:  { level: 1 },
      nature_golem: { level: 1 },
      water_geist:  { level: 1 },
    },
    team: ['fire_drache', 'nature_golem', 'water_geist'],
    stages: {},            // stageId -> Sterne (1–3)
    settings: { sfx: true, music: true },
  };
}

let Save = loadSave();

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return Object.assign(defaultSave(), JSON.parse(raw));
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

function levelUpCost(level) { return 30 * level; } // Level 1→2 = 30 … 4→5 = 120.

function canLevelUp(id) {
  const e = Save.collection[id];
  return e && e.level < MAX_LEVEL && Save.gold >= levelUpCost(e.level);
}

function levelUp(id) {
  if (!canLevelUp(id)) return false;
  Save.gold -= levelUpCost(Save.collection[id].level);
  Save.collection[id].level++;
  persist();
  return true;
}

function ownedIds() { return Object.keys(Save.collection); }

// ---------- Fusion ----------

// Rezepte, deren beide Zutaten im Besitz sind.
function availableRecipes() {
  return FUSIONS_DATA.recipes.filter(r => r.inputs.every(id => Save.collection[id]));
}

function recipeReady(recipe) {
  return recipe.inputs.every(id => {
    const e = Save.collection[id];
    return e && (!recipe.requiresMaxLevel || e.level >= MAX_LEVEL);
  }) && !Save.collection[recipe.output];
}

// Verbraucht beide Zutaten, fügt Hybrid (Level 1) hinzu, flickt das Team.
function fuse(recipe) {
  if (!recipeReady(recipe)) return false;
  recipe.inputs.forEach(id => delete Save.collection[id]);
  Save.collection[recipe.output] = { level: 1 };
  Save.team = Save.team.map(id => recipe.inputs.includes(id) ? recipe.output : id);
  // Doppelte Ersetzung (beide Zutaten im Team) auffüllen.
  Save.team = [...new Set(Save.team)];
  while (Save.team.length < 3) {
    const spare = ownedIds().find(id => !Save.team.includes(id));
    if (!spare) break;
    Save.team.push(spare);
  }
  persist();
  return true;
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
  let gold = stage.gold;
  let unlocked = null;
  if (first) {
    gold += stage.firstClearBonus;
    if (stage.unlockCreature && !Save.collection[stage.unlockCreature]) {
      Save.collection[stage.unlockCreature] = { level: 1 };
      unlocked = stage.unlockCreature;
    }
  }
  Save.gold += gold;
  persist();
  return { gold, unlocked, first };
}
