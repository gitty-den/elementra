// GENERIERT aus js/*.js - NICHT von Hand aendern.
const localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

// ================= js/profiles.js =================
// profiles.js â€” Lokale Spielerprofile (20.07.2026).
//
// Mehrere SpielstÃ¤nde nebeneinander in localStorage: jedes Profil bekommt einen
// eigenen Save-SchlÃ¼ssel (`elementra_save_v1__<id>`). Kein Server, kein Konto â€”
// der PIN ist reine Bequemlichkeit (er liegt im Klartext daneben und schÃ¼tzt
// NICHT gegen jemanden, der den Browser-Speicher Ã¶ffnet).
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
    // Erststart mit altem Spielstand: als â€žSpieler 1" Ã¼bernehmen, nichts verlieren.
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

// Save-SchlÃ¼ssel des aktiven Profils; null = noch kein Profil gewÃ¤hlt
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
// Ein Profil kann mit einem Cloud-Spielstand verknÃ¼pft sein: `p.cloud = { code,
// pin, at }`. Der PIN liegt lokal im Klartext daneben â€” wie der Profil-PIN ist
// er Bequemlichkeit, kein Schutz. Ohne VerknÃ¼pfung bleibt alles rein lokal.

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
// es. Bewusst neu statt Ã¼berschreiben â€” so geht nie ein lokaler Stand verloren.
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

// Kurzer Fortschritts-Abriss fÃ¼r die Profilkarte (ohne den Save zu aktivieren).
function profileSummary(id) {
  try {
    const raw = localStorage.getItem(profileSaveKey(id));
    if (!raw) return { creatures: 0, stars: 0 };
    const s = JSON.parse(raw);
    const stars = Object.values(s.stages || {}).reduce((a, b) => a + (+b || 0), 0);
    return { creatures: Object.keys(s.collection || {}).length, stars };
  } catch (e) { return { creatures: 0, stars: 0 }; }
}


// ================= js/data.js =================
// Auto-generiert aus data/*.json
const TYPES_DATA = {
  "multipliers": {
    "advantage": 1.5,
    "disadvantage": 0.75,
    "neutral": 1.0
  },
  "elements": [
    {
      "id": "fire",
      "name": "Feuer",
      "tier": 1,
      "strongVs": "nature",
      "weakVs": "water",
      "color": "#e8552d"
    },
    {
      "id": "nature",
      "name": "Natur",
      "tier": 1,
      "strongVs": "water",
      "weakVs": "fire",
      "color": "#4caf50"
    },
    {
      "id": "water",
      "name": "Wasser",
      "tier": 1,
      "strongVs": "fire",
      "weakVs": "nature",
      "color": "#2f80ed"
    },
    {
      "id": "steam",
      "name": "Dampf",
      "tier": 2,
      "components": [
        "fire",
        "water"
      ],
      "neutral": true,
      "color": "#b0bec5"
    },
    {
      "id": "ash",
      "name": "Asche",
      "tier": 2,
      "components": [
        "fire",
        "nature"
      ],
      "neutral": true,
      "color": "#8d6e63"
    },
    {
      "id": "frost",
      "name": "Frost",
      "tier": 2,
      "components": [
        "nature",
        "water"
      ],
      "neutral": true,
      "color": "#81d4fa"
    }
  ]
};
const CREATURES_DATA = {
  "energyModel": {
    "max": 100,
    "activeCost": 100
  },
  "rarities": [
    "common",
    "rare",
    "epic",
    "legendary"
  ],
  "abilities": {
    "drache_passive": {
      "name": "Kampfrausch",
      "trigger": "onAttack",
      "energyGain": 8,
      "effect": "atkUpWhenHurt",
      "params": {
        "atkPer25MissingHp": 0.05
      }
    },
    "drache_active": {
      "name": "Elementarodem",
      "energyCost": 100,
      "target": "enemyHighestHp",
      "effect": "elementalNuke",
      "params": {
        "atkMultiplier": 3
      }
    },
    "golem_passive": {
      "name": "Steinhaut",
      "trigger": "onHit",
      "energyGain": 6,
      "effect": "damageReduction",
      "params": {
        "flatReduce": 2
      }
    },
    "golem_active": {
      "name": "Bollwerk",
      "energyCost": 100,
      "target": "allAllies",
      "effect": "teamShield",
      "params": {
        "shieldPctMaxHp": 0.2,
        "durationSec": 5,
        "taunt": true
      }
    },
    "greif_passive": {
      "name": "Windschnitt",
      "trigger": "onAttack",
      "energyGain": 10,
      "effect": "none",
      "params": {}
    },
    "greif_active": {
      "name": "Sturzflug",
      "energyCost": 100,
      "target": "enemyBackline",
      "effect": "multiHit",
      "params": {
        "hits": 2,
        "atkMultiplier": 1.5
      }
    },
    "wolf_passive": {
      "name": "Blutdurst",
      "trigger": "onAttack",
      "energyGain": 7,
      "effect": "lifesteal",
      "params": {
        "pctOfDamage": 0.15
      }
    },
    "wolf_active": {
      "name": "Rudelbiss",
      "energyCost": 100,
      "target": "enemyLowestHp",
      "effect": "hitPlusBleed",
      "params": {
        "atkMultiplier": 2.5,
        "bleedPct": 0.1,
        "bleedTicks": 3
      }
    },
    "wyrm_passive": {
      "name": "Toxin",
      "trigger": "onAttack",
      "energyGain": 6,
      "effect": "applyPoison",
      "params": {
        "stackPct": 0.05,
        "maxStacks": 5
      }
    },
    "wyrm_active": {
      "name": "Elementausbruch",
      "energyCost": 100,
      "target": "allEnemies",
      "effect": "spreadDotDebuff",
      "params": {
        "dotPct": 0.15,
        "durationSec": 4,
        "defDown": 0.1
      }
    },
    "geist_passive": {
      "name": "Lebensquell",
      "trigger": "perSecond",
      "energyGain": 6,
      "effect": "none",
      "params": {}
    },
    "geist_active": {
      "name": "Segen",
      "energyCost": 100,
      "target": "allAllies",
      "effect": "teamHeal",
      "params": {
        "healPctMaxHp": 0.3
      }
    },
    "phoenix_passive": {
      "name": "Ewige Glut",
      "trigger": "perSecond",
      "energyGain": 5,
      "effect": "none",
      "params": {}
    },
    "phoenix_active": {
      "name": "Wiedergeburt",
      "energyCost": 100,
      "target": "fallenAllyElseLowest",
      "effect": "reviveOrHeal",
      "params": {
        "reviveHpPct": 0.4,
        "healPctMaxHp": 0.25
      }
    },
    "koloss_passive": {
      "name": "Obsidianpanzer",
      "trigger": "onHit",
      "energyGain": 6,
      "effect": "damageReduction",
      "params": {
        "flatReduce": 3
      }
    },
    "koloss_active": {
      "name": "Ewiger Wall",
      "energyCost": 100,
      "target": "allAllies",
      "effect": "teamShield",
      "params": {
        "shieldPctMaxHp": 0.25,
        "durationSec": 5,
        "taunt": true
      }
    },
    "wyvern_passive": {
      "name": "Sturmschwingen",
      "trigger": "onAttack",
      "energyGain": 10,
      "effect": "none",
      "params": {}
    },
    "wyvern_active": {
      "name": "Dreifachstoss",
      "energyCost": 100,
      "target": "enemyBackline",
      "effect": "multiHit",
      "params": {
        "hits": 3,
        "atkMultiplier": 1.3
      }
    },
    "leviathan_passive": {
      "name": "Abgrundgift",
      "trigger": "onAttack",
      "energyGain": 7,
      "effect": "applyPoison",
      "params": {
        "stackPct": 0.05,
        "maxStacks": 5
      }
    },
    "leviathan_active": {
      "name": "Urflut",
      "energyCost": 100,
      "target": "enemyHighestHp",
      "effect": "elementalNuke",
      "params": {
        "atkMultiplier": 3.2
      }
    },
    "seraph_passive": {
      "name": "Lichtquell",
      "trigger": "perSecond",
      "energyGain": 6,
      "effect": "none",
      "params": {}
    },
    "seraph_active": {
      "name": "Auferstehung",
      "energyCost": 100,
      "target": "fallenAllyElseLowest",
      "effect": "reviveOrHeal",
      "params": {
        "reviveHpPct": 0.5,
        "healPctMaxHp": 0.3
      }
    },
    "behemoth_passive": {
      "name": "Urhunger",
      "trigger": "onAttack",
      "energyGain": 7,
      "effect": "lifesteal",
      "params": {
        "pctOfDamage": 0.18
      }
    },
    "behemoth_active": {
      "name": "Knochenbrecher",
      "energyCost": 100,
      "target": "enemyLowestHp",
      "effect": "hitPlusBleed",
      "params": {
        "atkMultiplier": 2.6,
        "bleedPct": 0.12,
        "bleedTicks": 3
      }
    },
    "gargoyle_passive": {
      "name": "Steinschwingen",
      "trigger": "onHit",
      "energyGain": 6,
      "effect": "damageReduction",
      "params": {
        "flatReduce": 2
      }
    },
    "gargoyle_active": {
      "name": "Waechterschrei",
      "energyCost": 100,
      "target": "allAllies",
      "effect": "teamShield",
      "params": {
        "shieldPctMaxHp": 0.22,
        "durationSec": 5,
        "taunt": true
      }
    },
    "basilisk_passive": {
      "name": "Schreckensblick",
      "trigger": "onAttack",
      "energyGain": 6,
      "effect": "applyPoison",
      "params": {
        "stackPct": 0.05,
        "maxStacks": 5
      }
    },
    "basilisk_active": {
      "name": "Versteinerung",
      "energyCost": 100,
      "target": "allEnemies",
      "effect": "spreadDotDebuff",
      "params": {
        "dotPct": 0.18,
        "durationSec": 4,
        "defDown": 0.15
      }
    },
    "chimaera_passive": {
      "name": "Dreiseelen",
      "trigger": "onAttack",
      "energyGain": 10,
      "effect": "none",
      "params": {}
    },
    "chimaera_active": {
      "name": "Wildes Zerreissen",
      "energyCost": 100,
      "target": "enemyLowestHp",
      "effect": "multiHit",
      "params": {
        "hits": 2,
        "atkMultiplier": 1.7
      }
    },
    "sphinx_passive": {
      "name": "Raetselblick",
      "trigger": "onAttack",
      "energyGain": 8,
      "effect": "none",
      "params": {}
    },
    "sphinx_active": {
      "name": "Wuestensegen",
      "energyCost": 100,
      "target": "allAllies",
      "effect": "teamHeal",
      "params": {
        "healPctMaxHp": 0.25
      }
    },
    "barghest_passive": {
      "name": "Seelenfrass",
      "trigger": "onAttack",
      "energyGain": 7,
      "effect": "lifesteal",
      "params": {
        "pctOfDamage": 0.18
      }
    },
    "barghest_active": {
      "name": "Schattenhatz",
      "energyCost": 100,
      "target": "enemyLowestHp",
      "effect": "hitPlusBleed",
      "params": {
        "atkMultiplier": 2.4,
        "bleedPct": 0.12,
        "bleedTicks": 3
      }
    },
    "ouroboros_passive": {
      "name": "Ewiger Kreis",
      "trigger": "perSecond",
      "energyGain": 6,
      "effect": "none",
      "params": {}
    },
    "ouroboros_active": {
      "name": "Zeitgift",
      "energyCost": 100,
      "target": "allEnemies",
      "effect": "spreadDotDebuff",
      "params": {
        "dotPct": 0.15,
        "durationSec": 5,
        "defDown": 0.1
      }
    },
    "archon_passive": {
      "name": "Astralstrom",
      "trigger": "perSecond",
      "energyGain": 7,
      "effect": "none",
      "params": {}
    },
    "archon_active": {
      "name": "Astralsegen",
      "energyCost": 100,
      "target": "allAllies",
      "effect": "teamHeal",
      "params": {
        "healPctMaxHp": 0.35
      }
    },
    "titan_passive": {
      "name": "Urgestein",
      "trigger": "onHit",
      "energyGain": 7,
      "effect": "damageReduction",
      "params": {
        "flatReduce": 4
      }
    },
    "titan_active": {
      "name": "Weltenwall",
      "energyCost": 100,
      "target": "allAllies",
      "effect": "teamShield",
      "params": {
        "shieldPctMaxHp": 0.28,
        "durationSec": 6,
        "taunt": true
      }
    },
    "schlange_passive": {
      "name": "Urtoxin",
      "trigger": "onAttack",
      "energyGain": 7,
      "effect": "applyPoison",
      "params": {
        "stackPct": 0.07,
        "maxStacks": 6
      }
    },
    "schlange_active": {
      "name": "Ewiger Kreis",
      "energyCost": 100,
      "target": "allEnemies",
      "effect": "spreadDotDebuff",
      "params": {
        "dotPct": 0.11,
        "durationSec": 6,
        "defDown": 0.22
      }
    }
  },
  "creatures": [
    {
      "id": "fire_drache",
      "name": "Glutdrache",
      "archetype": "drache",
      "role": "dps",
      "element": "fire",
      "rarity": "common",
      "tier": 1,
      "baseStats": {
        "hp": 90,
        "atk": 24,
        "def": 10,
        "spd": 12
      },
      "passive": "drache_passive",
      "active": "drache_active",
      "mvp": true
    },
    {
      "id": "nature_drache",
      "name": "Rankenwyrm",
      "archetype": "drache",
      "role": "dps",
      "element": "nature",
      "rarity": "common",
      "tier": 1,
      "baseStats": {
        "hp": 99,
        "atk": 22,
        "def": 10,
        "spd": 12
      },
      "passive": "drache_passive",
      "active": "drache_active",
      "mvp": false
    },
    {
      "id": "water_drache",
      "name": "Tiefendrache",
      "archetype": "drache",
      "role": "dps",
      "element": "water",
      "rarity": "common",
      "tier": 1,
      "baseStats": {
        "hp": 90,
        "atk": 22,
        "def": 11,
        "spd": 12
      },
      "passive": "drache_passive",
      "active": "drache_active",
      "mvp": false
    },
    {
      "id": "fire_golem",
      "name": "Magmagolem",
      "archetype": "golem",
      "role": "tank",
      "element": "fire",
      "rarity": "common",
      "tier": 1,
      "baseStats": {
        "hp": 160,
        "atk": 13,
        "def": 20,
        "spd": 6
      },
      "passive": "golem_passive",
      "active": "golem_active",
      "mvp": false
    },
    {
      "id": "nature_golem",
      "name": "Moosgolem",
      "archetype": "golem",
      "role": "tank",
      "element": "nature",
      "rarity": "common",
      "tier": 1,
      "baseStats": {
        "hp": 176,
        "atk": 12,
        "def": 20,
        "spd": 6
      },
      "passive": "golem_passive",
      "active": "golem_active",
      "mvp": true
    },
    {
      "id": "water_golem",
      "name": "Eisgolem",
      "archetype": "golem",
      "role": "tank",
      "element": "water",
      "rarity": "common",
      "tier": 1,
      "baseStats": {
        "hp": 160,
        "atk": 12,
        "def": 22,
        "spd": 6
      },
      "passive": "golem_passive",
      "active": "golem_active",
      "mvp": false
    },
    {
      "id": "fire_greif",
      "name": "Aschengreif",
      "archetype": "greif",
      "role": "speed",
      "element": "fire",
      "rarity": "common",
      "tier": 1,
      "baseStats": {
        "hp": 75,
        "atk": 18,
        "def": 8,
        "spd": 20
      },
      "passive": "greif_passive",
      "active": "greif_active",
      "mvp": true
    },
    {
      "id": "nature_greif",
      "name": "Sturmgreif",
      "archetype": "greif",
      "role": "speed",
      "element": "nature",
      "rarity": "common",
      "tier": 1,
      "baseStats": {
        "hp": 82,
        "atk": 16,
        "def": 8,
        "spd": 20
      },
      "passive": "greif_passive",
      "active": "greif_active",
      "mvp": false
    },
    {
      "id": "water_greif",
      "name": "Nebelgreif",
      "archetype": "greif",
      "role": "speed",
      "element": "water",
      "rarity": "common",
      "tier": 1,
      "baseStats": {
        "hp": 75,
        "atk": 16,
        "def": 9,
        "spd": 20
      },
      "passive": "greif_passive",
      "active": "greif_active",
      "mvp": false
    },
    {
      "id": "fire_wolf",
      "name": "HÃƒÂ¶llenwolf",
      "archetype": "wolf",
      "role": "bruiser",
      "element": "fire",
      "rarity": "common",
      "tier": 1,
      "baseStats": {
        "hp": 110,
        "atk": 22,
        "def": 12,
        "spd": 13
      },
      "passive": "wolf_passive",
      "active": "wolf_active",
      "mvp": false
    },
    {
      "id": "nature_wolf",
      "name": "Dornwolf",
      "archetype": "wolf",
      "role": "bruiser",
      "element": "nature",
      "rarity": "common",
      "tier": 1,
      "baseStats": {
        "hp": 121,
        "atk": 20,
        "def": 12,
        "spd": 13
      },
      "passive": "wolf_passive",
      "active": "wolf_active",
      "mvp": true
    },
    {
      "id": "water_wolf",
      "name": "Flutwolf",
      "archetype": "wolf",
      "role": "bruiser",
      "element": "water",
      "rarity": "common",
      "tier": 1,
      "baseStats": {
        "hp": 110,
        "atk": 20,
        "def": 13,
        "spd": 13
      },
      "passive": "wolf_passive",
      "active": "wolf_active",
      "mvp": false
    },
    {
      "id": "fire_wyrm",
      "name": "Aschennatter",
      "archetype": "wyrm",
      "role": "dot",
      "element": "fire",
      "rarity": "rare",
      "tier": 1,
      "baseStats": {
        "hp": 85,
        "atk": 16,
        "def": 9,
        "spd": 14
      },
      "passive": "wyrm_passive",
      "active": "wyrm_active",
      "mvp": false
    },
    {
      "id": "nature_wyrm",
      "name": "Giftschlinge",
      "archetype": "wyrm",
      "role": "dot",
      "element": "nature",
      "rarity": "rare",
      "tier": 1,
      "baseStats": {
        "hp": 94,
        "atk": 15,
        "def": 9,
        "spd": 14
      },
      "passive": "wyrm_passive",
      "active": "wyrm_active",
      "mvp": false
    },
    {
      "id": "water_wyrm",
      "name": "Seeschlange",
      "archetype": "wyrm",
      "role": "dot",
      "element": "water",
      "rarity": "rare",
      "tier": 1,
      "baseStats": {
        "hp": 85,
        "atk": 15,
        "def": 10,
        "spd": 14
      },
      "passive": "wyrm_passive",
      "active": "wyrm_active",
      "mvp": true
    },
    {
      "id": "fire_geist",
      "name": "Flammengeist",
      "archetype": "geist",
      "role": "support",
      "element": "fire",
      "rarity": "rare",
      "tier": 1,
      "baseStats": {
        "hp": 95,
        "atk": 9,
        "def": 11,
        "spd": 11
      },
      "passive": "geist_passive",
      "active": "geist_active",
      "mvp": false
    },
    {
      "id": "nature_geist",
      "name": "Haingeist",
      "archetype": "geist",
      "role": "support",
      "element": "nature",
      "rarity": "rare",
      "tier": 1,
      "baseStats": {
        "hp": 105,
        "atk": 8,
        "def": 11,
        "spd": 11
      },
      "passive": "geist_passive",
      "active": "geist_active",
      "mvp": false
    },
    {
      "id": "water_geist",
      "name": "Quellgeist",
      "archetype": "geist",
      "role": "support",
      "element": "water",
      "rarity": "rare",
      "tier": 1,
      "baseStats": {
        "hp": 95,
        "atk": 8,
        "def": 12,
        "spd": 11
      },
      "passive": "geist_passive",
      "active": "geist_active",
      "mvp": true
    },
    {
      "id": "fire_phoenix",
      "name": "PhÃƒÂ¶nix",
      "archetype": "phoenix",
      "role": "sustain",
      "element": "fire",
      "rarity": "epic",
      "tier": 1,
      "baseStats": {
        "hp": 100,
        "atk": 15,
        "def": 12,
        "spd": 12
      },
      "passive": "phoenix_passive",
      "active": "phoenix_active",
      "mvp": false
    },
    {
      "id": "nature_phoenix",
      "name": "Blattschwinge",
      "archetype": "phoenix",
      "role": "sustain",
      "element": "nature",
      "rarity": "epic",
      "tier": 1,
      "baseStats": {
        "hp": 110,
        "atk": 14,
        "def": 12,
        "spd": 12
      },
      "passive": "phoenix_passive",
      "active": "phoenix_active",
      "mvp": false
    },
    {
      "id": "water_phoenix",
      "name": "Sturmreiher",
      "archetype": "phoenix",
      "role": "sustain",
      "element": "water",
      "rarity": "epic",
      "tier": 1,
      "baseStats": {
        "hp": 100,
        "atk": 14,
        "def": 13,
        "spd": 12
      },
      "passive": "phoenix_passive",
      "active": "phoenix_active",
      "mvp": false
    },
    {
      "id": "boss_titan",
      "name": "Urtitan",
      "archetype": "titan",
      "role": "tank",
      "element": "ash",
      "rarity": "legendary",
      "tier": 3,
      "baseStats": {
        "hp": 230,
        "atk": 23,
        "def": 22,
        "spd": 9
      },
      "passive": "titan_passive",
      "active": "titan_active",
      "unique": true,
      "mvp": false
    },
    {
      "id": "boss_schlange",
      "name": "Weltenschlange",
      "archetype": "weltenschlange",
      "role": "dot",
      "element": "steam",
      "rarity": "legendary",
      "tier": 3,
      "baseStats": {
        "hp": 185,
        "atk": 29,
        "def": 16,
        "spd": 14
      },
      "passive": "schlange_passive",
      "active": "schlange_active",
      "unique": true,
      "mvp": false
    }
  ]
}
;
const FUSIONS_DATA = {
  "rule": "archetype+element",
  "description": "Zwei Max-Level-Kreaturen VERSCHIEDENER Archetypen fusionieren zu einem Fusions-Archetyp. Element: gleich+gleich -> gleich, sonst Hybrid-Element. Hybride bleiben im Kampf neutral.",
  "requiresMaxLevel": true,
  "elementCombos": [
    {
      "elements": [
        "fire",
        "water"
      ],
      "result": "steam"
    },
    {
      "elements": [
        "fire",
        "nature"
      ],
      "result": "ash"
    },
    {
      "elements": [
        "nature",
        "water"
      ],
      "result": "frost"
    }
  ],
  "namePrefixes": {
    "fire": "Glut",
    "nature": "Dorn",
    "water": "Flut",
    "steam": "Dampf",
    "ash": "Aschen",
    "frost": "Frost"
  },
  "fusionArchetypes": [
    {
      "id": "koloss",
      "name": "Koloss",
      "pair": [
        "drache",
        "golem"
      ],
      "role": "tank",
      "rarity": "epic",
      "baseStats": {
        "hp": 230,
        "atk": 20,
        "def": 26,
        "spd": 8
      },
      "passive": "koloss_passive",
      "active": "koloss_active"
    },
    {
      "id": "wyvern",
      "name": "Wyvern",
      "pair": [
        "drache",
        "greif"
      ],
      "role": "speed",
      "rarity": "epic",
      "baseStats": {
        "hp": 105,
        "atk": 26,
        "def": 10,
        "spd": 24
      },
      "passive": "wyvern_passive",
      "active": "wyvern_active"
    },
    {
      "id": "leviathan",
      "name": "Leviathan",
      "pair": [
        "drache",
        "wyrm"
      ],
      "role": "dps",
      "rarity": "legendary",
      "baseStats": {
        "hp": 125,
        "atk": 27,
        "def": 12,
        "spd": 15
      },
      "passive": "leviathan_passive",
      "active": "leviathan_active"
    },
    {
      "id": "seraph",
      "name": "Seraph",
      "pair": [
        "drache",
        "phoenix"
      ],
      "role": "sustain",
      "rarity": "legendary",
      "baseStats": {
        "hp": 135,
        "atk": 24,
        "def": 14,
        "spd": 13
      },
      "passive": "seraph_passive",
      "active": "seraph_active"
    },
    {
      "id": "behemoth",
      "name": "Behemoth",
      "pair": [
        "golem",
        "wolf"
      ],
      "role": "bruiser",
      "rarity": "epic",
      "baseStats": {
        "hp": 190,
        "atk": 24,
        "def": 20,
        "spd": 10
      },
      "passive": "behemoth_passive",
      "active": "behemoth_active"
    },
    {
      "id": "gargoyle",
      "name": "Gargoyle",
      "pair": [
        "golem",
        "geist"
      ],
      "role": "tank",
      "rarity": "epic",
      "baseStats": {
        "hp": 200,
        "atk": 14,
        "def": 24,
        "spd": 9
      },
      "passive": "gargoyle_passive",
      "active": "gargoyle_active"
    },
    {
      "id": "basilisk",
      "name": "Basilisk",
      "pair": [
        "golem",
        "wyrm"
      ],
      "role": "dot",
      "rarity": "epic",
      "baseStats": {
        "hp": 150,
        "atk": 19,
        "def": 18,
        "spd": 11
      },
      "passive": "basilisk_passive",
      "active": "basilisk_active"
    },
    {
      "id": "chimaera",
      "name": "ChimÃƒÂ¤ra",
      "pair": [
        "greif",
        "wolf"
      ],
      "role": "bruiser",
      "rarity": "epic",
      "baseStats": {
        "hp": 140,
        "atk": 26,
        "def": 13,
        "spd": 19
      },
      "passive": "chimaera_passive",
      "active": "chimaera_active"
    },
    {
      "id": "sphinx",
      "name": "Sphinx",
      "pair": [
        "greif",
        "geist"
      ],
      "role": "support",
      "rarity": "epic",
      "baseStats": {
        "hp": 115,
        "atk": 18,
        "def": 12,
        "spd": 18
      },
      "passive": "sphinx_passive",
      "active": "sphinx_active"
    },
    {
      "id": "barghest",
      "name": "Barghest",
      "pair": [
        "wolf",
        "geist"
      ],
      "role": "bruiser",
      "rarity": "epic",
      "baseStats": {
        "hp": 150,
        "atk": 24,
        "def": 14,
        "spd": 15
      },
      "passive": "barghest_passive",
      "active": "barghest_active"
    },
    {
      "id": "ouroboros",
      "name": "Ouroboros",
      "pair": [
        "wyrm",
        "phoenix"
      ],
      "role": "dot",
      "rarity": "epic",
      "baseStats": {
        "hp": 130,
        "atk": 20,
        "def": 14,
        "spd": 16
      },
      "passive": "ouroboros_passive",
      "active": "ouroboros_active"
    },
    {
      "id": "archon",
      "name": "Archon",
      "pair": [
        "geist",
        "phoenix"
      ],
      "role": "support",
      "rarity": "legendary",
      "baseStats": {
        "hp": 145,
        "atk": 12,
        "def": 16,
        "spd": 12
      },
      "passive": "archon_passive",
      "active": "archon_active"
    }
  ]
}
;


// ================= js/items.js =================
// items.js â€” Item-System (Runde 6, 21.07.2026).
// Design-Pfeiler 2: Thema kommt Ã¼ber KEYWORDS, nicht Ã¼ber neue Elemente.
// â€žSeeschlange mit Toxin" = Wasser + Keyword `poison`, kein Giftelement.
// EIN Slot je Kreatur (Save.equipped[creatureId] = itemId).
// Stat-Werte sind Prozent-AufschlÃ¤ge auf die Level-Stats; spd ist FLACH (spd
// skaliert im Spiel nicht mit Level, siehe statsAtLevel).

const ITEM_KEYWORDS = {
  poison:      { name: 'Gift',        icon: 'skull'  },
  burn:        { name: 'Brand',       icon: 'fire'   },
  chill:       { name: 'Frost',       icon: 'frost'  },
  lifesteal:   { name: 'Lebensraub',  icon: 'heart'  },
  thorns:      { name: 'Dornen',      icon: 'nature' },
  energy:      { name: 'Energie',     icon: 'bolt'   },
  shieldStart: { name: 'Startschild', icon: 'shield' },
};

const ITEMS_DATA = [
  // --- GewÃ¶hnlich: reine Werte ---
  { id: 'steinherz',     name: 'Steinherz',     icon: 'heart',  rarity: 'common', price: 120, stats: { hp: 0.18 } },
  { id: 'scharfzahn',    name: 'Scharfzahn',    icon: 'fang',   rarity: 'common', price: 120, stats: { atk: 0.15 } },
  { id: 'schuppenpanzer',name: 'Schuppenpanzer',icon: 'shield', rarity: 'common', price: 120, stats: { def: 0.25 } },
  { id: 'windfeder',     name: 'Windfeder',     icon: 'bolt',   rarity: 'common', price: 140, stats: { spd: 3 } },
  // --- Selten: Werte + Keyword ---
  { id: 'toxinzahn',     name: 'Toxin-Zahn',    icon: 'skull',  rarity: 'rare', price: 260,
    stats: { atk: 0.10 }, keyword: { type: 'poison', maxStacks: 5 } },
  { id: 'glutkern',      name: 'Glutkern',      icon: 'fire',   rarity: 'rare', price: 260,
    stats: { atk: 0.10 }, keyword: { type: 'burn', pct: 0.10, sec: 3 } },
  { id: 'frostsplitter', name: 'Frostsplitter', icon: 'frost',  rarity: 'rare', price: 260,
    stats: { def: 0.10 }, keyword: { type: 'chill', pct: 0.25, sec: 3 } },
  { id: 'blutkelch',     name: 'Blutkelch',     icon: 'heart',  rarity: 'rare', price: 280,
    stats: { atk: 0.08 }, keyword: { type: 'lifesteal', pct: 0.15 } },
  { id: 'dornenhaut',    name: 'Dornenhaut',    icon: 'nature', rarity: 'rare', price: 260,
    stats: { def: 0.15 }, keyword: { type: 'thorns', flat: 3 } },
  // --- Episch ---
  { id: 'energieprisma', name: 'Energieprisma', icon: 'orb',    rarity: 'epic', price: 460,
    stats: { atk: 0.05 }, keyword: { type: 'energy', bonus: 4 } },
  { id: 'aegissiegel',   name: 'Aegis-Siegel',  icon: 'shield', rarity: 'epic', price: 480,
    stats: { hp: 0.10 }, keyword: { type: 'shieldStart', pct: 0.20, sec: 8 } },
  { id: 'titanenmark',   name: 'Titanenmark',   icon: 'star',   rarity: 'epic', price: 520,
    stats: { hp: 0.25, atk: 0.10 } },
];

const Items = {};
ITEMS_DATA.forEach(i => Items[i.id] = i);

// ---------- Werte anwenden (von battle.js createUnit genutzt) ----------

function applyItemStats(stats, item) {
  if (!item || !item.stats) return stats;
  const s = item.stats;
  return {
    hp:  Math.round(stats.hp  * (1 + (s.hp  || 0))),
    atk: Math.round(stats.atk * (1 + (s.atk || 0))),
    def: Math.round(stats.def * (1 + (s.def || 0))),
    spd: stats.spd + (s.spd || 0),
  };
}

// ---------- Inventar ----------

function itemsOwned(id) { return (Save.items && Save.items[id]) || 0; }
function itemsEquippedCount(id) {
  return Object.values(Save.equipped || {}).filter(x => x === id).length;
}
function itemsFree(id) { return itemsOwned(id) - itemsEquippedCount(id); }
function itemOf(cid) { const id = Save.equipped && Save.equipped[cid]; return id ? Items[id] : null; }

function grantItem(id, n = 1) {
  if (!Items[id]) return false;
  Save.items[id] = itemsOwned(id) + n;
  persist();
  return true;
}

// Legt an; ein bereits getragenes Item wandert zurÃ¼ck ins freie Inventar.
function equipItem(cid, itemId) {
  if (!Save.collection[cid] || !Items[itemId]) return false;
  if (Save.equipped[cid] === itemId) return false;
  if (itemsFree(itemId) <= 0) return false;
  Save.equipped[cid] = itemId;
  persist();
  return true;
}

function unequipItem(cid) {
  if (!Save.equipped[cid]) return false;
  delete Save.equipped[cid];
  persist();
  return true;
}

// Kurzzeile fÃ¼r die UI: â€ž+18 % LP Â· Gift"
function itemStatLine(item) {
  const parts = [];
  const s = item.stats || {};
  if (s.hp)  parts.push('+' + Math.round(s.hp * 100) + ' % LP');
  if (s.atk) parts.push('+' + Math.round(s.atk * 100) + ' % ANG');
  if (s.def) parts.push('+' + Math.round(s.def * 100) + ' % VER');
  if (s.spd) parts.push('+' + s.spd + ' Tempo');
  if (item.keyword) parts.push(ITEM_KEYWORDS[item.keyword.type].name);
  return parts.join(' Â· ');
}

// ---------- Shop (rotiert tÃ¤glich, 3 Angebote) ----------

function shopState() {
  const day = new Date().toISOString().slice(0, 10);
  if (!Save.shop || Save.shop.day !== day) {
    let h = 0; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const offers = [];
    for (let i = 0; i < 3; i++) offers.push(ITEMS_DATA[(h + i * 5) % ITEMS_DATA.length].id);
    Save.shop = { day, offers, bought: {} };
    persist();
  }
  return Save.shop;
}

function canBuyItem(id) {
  const sh = shopState();
  return sh.offers.includes(id) && !sh.bought[id] && Save.gold >= Items[id].price;
}

function buyItem(id) {
  if (!canBuyItem(id)) return false;
  Save.gold -= Items[id].price;
  Save.shop.bought[id] = true;
  grantItem(id);        // persistiert
  return true;
}

// ---------- Drops aus der Kampagne ----------
// Runde 9 (21.07.2026), Nutzer-Feedback â€žviel zu viele Items": Ein garantierter
// Erstsieg-Drop gibt es NUR noch auf den mit `drop: true` markierten Stages â€”
// zwei je Kapitel (stages.js). Ãœberall sonst bleibt eine kleine Zufallschance.
// Vorher droppte JEDER Erstsieg, also 10 Items je Kapitel.

function randomItemByRarity(rarity) {
  const pool = ITEMS_DATA.filter(i => i.rarity === rarity);
  if (!pool.length) return ITEMS_DATA[0].id;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

// Aufstiegsstufen heben die Seltenheit an â€” das ist der Anreiz, hÃ¤rter zu spielen.
function stageDropRarity(stageId) {
  const n = (+stageId || 1) + (Save.ascension || 0) * 6;
  if (n >= 15) return Math.random() < 0.45 ? 'epic' : 'rare';
  if (n >= 8)  return Math.random() < 0.35 ? 'epic' : 'rare';
  if (n >= 4)  return Math.random() < 0.5  ? 'rare' : 'common';
  return 'common';
}

// Gibt die gedroppte Item-ID zurÃ¼ck (bereits gutgeschrieben) oder null.
function rollStageDrop(stage, firstClear) {
  if (!stage || stage.dev) return null;              // Dev-Sim droppt nie
  if (firstClear && stage.drop) {                    // nur die markierten Stages
    const id = randomItemByRarity(stageDropRarity(stage.id));
    grantItem(id);
    return id;
  }
  if (Math.random() < 0.05) {                        // Restchance, vorher 20 %
    const id = randomItemByRarity(Math.random() < 0.2 ? 'rare' : 'common');
    grantItem(id);
    return id;
  }
  return null;
}


// ================= js/state.js =================
// state.js â€” Spielzustand, Speicherstand (localStorage), Level- & Fusions-Logik.

// Nachschlagetabellen aus den Rohdaten (data.js).
const Elements = {};
TYPES_DATA.elements.forEach(e => Elements[e.id] = e);
const Creatures = {};
CREATURES_DATA.creatures.forEach(c => Creatures[c.id] = c);
const Abilities = CREATURES_DATA.abilities;

const MAX_LEVEL = 5;                 // Prototyp-Cap; Fusion verlangt Max-Level.
const LEVEL_STAT_BONUS = 0.10;       // +10 % Basiswerte pro Level Ã¼ber 1.
// Speicherstand liegt pro Profil (profiles.js, currentSaveKey()). Ohne aktives
// Profil wird nur im Arbeitsspeicher gespielt â€” persist() schreibt dann nichts.

// ---------- Kampf-XP (17.07.2026: Bindung â€” Kreaturen wachsen durchs KÃ¤mpfen) ----------
// Gold-Level-Up bleibt als teurer Beschleuniger (Ã–konomie-Bremse: 60Â·Level).

function xpNeed(level) { return 35 * level; }           // XP fÃ¼r Level -> Level+1
function stageXp(stage) { return 10 + stage.id * 2; }   // Sieg; Niederlage: 1/3 davon

// Verteilt XP an eine Kreatur; gibt Anzahl Level-Ups zurÃ¼ck.
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

// XP nach Kampf fÃ¼r das ganze Team; Ergebnisliste fÃ¼r die Sieg/Niederlage-Anzeige.
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
  // Endboss-Kreaturen (`unique`) zÃ¤hlen NICHT zur Basis-Sammlung â€” sonst stÃ¼nde
  // dort 23/21. Sie sind TrophÃ¤en, kein Sammelziel.
  if (type === 'base') return ownedIds().filter(id => !Creatures[id].fusion && !Creatures[id].unique).length;
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
  common:    { name: 'GewÃ¶hnlich', color: '#9e9e9e' },
  rare:      { name: 'Selten',     color: '#42a5f5' },
  epic:      { name: 'Episch',     color: '#ab47bc' },
  legendary: { name: 'LegendÃ¤r',   color: '#ffb300' },
};

// icon = PixelIcons-Name (iconArt), keine Emoji (UI-GrundsÃ¤tze).
const RoleInfo = {
  dps:     { name: 'Angreifer', icon: 'sword' },
  tank:    { name: 'Tank',      icon: 'shield' },
  speed:   { name: 'LÃ¤ufer',    icon: 'bolt' },
  bruiser: { name: 'Raufbold',  icon: 'fang' },
  dot:     { name: 'Gift',      icon: 'skull' },
  support: { name: 'Heiler',    icon: 'sparkle' },
  sustain: { name: 'Bewahrer',  icon: 'sun' },
};

// ---------- Kurzbeschreibung der FÃ¤higkeiten (generiert, 20.07.2026) ----------
// Wird aus effect/params/trigger der JSON-Daten gebaut, nicht handgepflegt â€”
// Balancing-Ã„nderungen an data/*.json ziehen automatisch mit.
// Stil: extrem knapp, Teile mit â€ž Â· " getrennt (UI-Grundsatz: so wenig Text wie mÃ¶glich).

const abPct = v => Math.round(v * 100) + '%';

// Zielgruppe als kurzes Stichwort.
const AbilityTargetShort = {
  enemyHighestHp:      'meiste LP',
  enemyLowestHp:       'wenigste LP',
  enemyBackline:       'RÃ¼ckreihe',
  allEnemies:          'alle Gegner',
  allAllies:           'Team',
  fallenAllyElseLowest: '',
};

// AuslÃ¶ser des Passivs als Energie-Zeile.
const AbilityTriggerShort = { onAttack: 'je Angriff', onHit: 'je Treffer', perSecond: 'pro Sek.' };

// Effekt-Kern; p = ability.params.
function abilityEffectShort(effect, p) {
  switch (effect) {
    case 'atkUpWhenHurt':   return `+${abPct(p.atkPer25MissingHp)} ANG je 25% fehlende LP`;
    case 'damageReduction': return `âˆ’${p.flatReduce} Schaden pro Treffer`;
    case 'lifesteal':       return `${abPct(p.pctOfDamage)} Lebensraub`;
    case 'applyPoison':     return `Gift ${abPct(p.stackPct)} ANG/s, max. ${p.maxStacks} Stapel`;
    case 'elementalNuke':   return `${abPct(p.atkMultiplier)} ANG`;
    case 'multiHit':        return `${p.hits}Ã— ${abPct(p.atkMultiplier)} ANG`;
    case 'hitPlusBleed':    return `${abPct(p.atkMultiplier)} ANG Â· Blutung ${p.bleedTicks}Ã—${abPct(p.bleedPct)}`;
    case 'teamShield':      return `Schild ${abPct(p.shieldPctMaxHp)} LP` + (p.taunt ? ` Â· Spott ${p.durationSec}s` : '');
    case 'teamHeal':        return `Heilt ${abPct(p.healPctMaxHp)} LP`;
    case 'spreadDotDebuff': return `Gift ${abPct(p.dotPct)}/s ${p.durationSec}s Â· VER âˆ’${abPct(p.defDown)}`;
    case 'reviveOrHeal':    return `Belebt mit ${abPct(p.reviveHpPct)} LP, sonst Heilung ${abPct(p.healPctMaxHp)}`;
    default:                return '';
  }
}

// Fertige Kurzzeile fÃ¼r eine FÃ¤higkeits-ID (Passiv oder Ult).
function abilityShort(abId) {
  const a = Abilities[abId];
  if (!a) return '';
  const parts = [];
  const core = abilityEffectShort(a.effect, a.params || {});
  const tgt = AbilityTargetShort[a.target];
  // Gruppenziele lesen sich vorangestellt besser (â€žTeam Â· Heilt 30 % LP"),
  // Einzelziele hinten dran (â€ž300 % ANG Â· meiste LP").
  const groupFirst = a.target === 'allAllies' || a.target === 'allEnemies';
  if (tgt && groupFirst) parts.push(tgt);
  if (core) parts.push(core);
  if (tgt && !groupFirst) parts.push(tgt);
  if (a.energyGain) parts.push(`+${a.energyGain} EN ${AbilityTriggerShort[a.trigger] || ''}`.trim());
  return parts.join(' Â· ');
}

// ---------- Fusions-Kreaturen (generiert aus fusions.json: 12 Archetypen Ã— 6 Elemente) ----------
// Nicht in CREATURES_DATA â€” Sammlung/Silhouetten zeigen sie Ã¼ber FusionArchetypes an.

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
    // Sammlung: id -> { level, xp } (xp = Fortschritt zum nÃ¤chsten Level)
    collection: {
      fire_drache:  { level: 1, xp: 0 },
      nature_golem: { level: 1, xp: 0 },
      water_geist:  { level: 1, xp: 0 },
    },
    team: ['fire_drache', 'nature_golem', 'water_geist'],
    // Arena-Team (Runde 9): eigenstÃ¤ndige Aufstellung fÃ¼rs PVP. Es greift auf
    // DIESELBE Sammlung zu â€” nur die drei PlÃ¤tze sind unabhÃ¤ngig von der Kampagne.
    arenaTeam: ['fire_drache', 'nature_golem', 'water_geist'],
    stages: {},            // stageId -> Sterne (1â€“3)
    milestones: {},        // milestoneId -> true (abgeholt)
    lastLogin: null,       // 'YYYY-MM-DD' des letzten Tages-Bonus
    settings: { sfxVol: 1, musicVol: 1 }, // Regler 0â€“1 statt An/Aus (17.07.2026)
    bp: defaultBP(),       // Battlepass (Season, XP, Quests, abgeholte Stufen)
    items: {},             // itemId -> Anzahl im Besitz (items.js)
    equipped: {},          // creatureId -> itemId (EIN Slot je Kreatur)
    shop: null,            // { day, offers[], bought{} } â€” lazy in shopState()
    ascension: 0,          // gewÃ¤hlte Aufstiegsstufe (0 = normale Kampagne)
    ascHigh: 0,            // hÃ¶chste Stufe, auf der der Endboss fiel
    ascStages: {},         // stageId -> hÃ¶chste dort geschaffte Aufstiegsstufe
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
    quests: null,          // { day, week, daily:[...], weekly:[...] } â€” lazy in bp.js
  };
}

let Save = loadSave();

function loadSave() {
  try {
    const key = currentSaveKey();
    const raw = key && localStorage.getItem(key);
    if (raw) {
      const s = Object.assign(defaultSave(), JSON.parse(raw));
      // Migration 17.07.2026: alte Element-Hybride (steam_/ash_/frost_<archetyp>)
      // existieren nicht mehr â€” entfernen, 100 Gold Ersatz pro Kreatur.
      Object.keys(s.collection).forEach(id => {
        if (!Creatures[id]) { delete s.collection[id]; s.gold += 100; }
      });
      s.team = s.team.filter(id => s.collection[id]);
      const spare = Object.keys(s.collection).filter(id => !s.team.includes(id));
      while (s.team.length < 3 && spare.length) s.team.push(spare.shift());
      // Migration Arena-Team (Runde 9): fehlt es, startet es als Kopie des
      // Kampagnen-Teams; verlorene Kreaturen (Fusion) fallen raus.
      if (!Array.isArray(s.arenaTeam)) s.arenaTeam = s.team.slice();
      s.arenaTeam = s.arenaTeam.filter(id => s.collection[id]);
      const spareA = Object.keys(s.collection).filter(id => !s.arenaTeam.includes(id));
      while (s.arenaTeam.length < 3 && spareA.length) s.arenaTeam.push(spareA.shift());
      if (!Object.keys(s.collection).length) return defaultSave();
      // Migration: LautstÃ¤rke-Regler statt An/Aus; Logo fest auf Element-Ring.
      if (typeof s.settings.sfxVol !== 'number') s.settings.sfxVol = s.settings.sfx === false ? 0 : 1;
      if (typeof s.settings.musicVol !== 'number') s.settings.musicVol = s.settings.music === false ? 0 : 1;
      delete s.settings.sfx; delete s.settings.music; delete s.settings.emblem;
      // Migration Kampf-XP: alten EintrÃ¤gen xp-Feld geben.
      Object.values(s.collection).forEach(e => { if (typeof e.xp !== 'number') e.xp = 0; });
      // Migration Items (21.07.): Felder anlegen, AusrÃ¼stung an verlorenen
      // Kreaturen/Items lÃ¶sen (z. B. nach Fusion oder entferntem Item).
      if (!s.items) s.items = {};
      if (!s.equipped) s.equipped = {};
      // Migration Aufstieg (21.07.)
      if (typeof s.ascension !== 'number') s.ascension = 0;
      if (typeof s.ascHigh !== 'number') s.ascHigh = 0;
      if (!s.ascStages) s.ascStages = {};
      Object.keys(s.equipped).forEach(cid => {
        if (!s.collection[cid] || typeof Items === 'undefined' || !Items[s.equipped[cid]]) delete s.equipped[cid];
      });
      // Migration Battlepass: Feld anlegen; neue Season -> Bahn zurÃ¼cksetzen.
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
  const key = currentSaveKey();
  if (!key) return;                       // noch kein Profil gewÃ¤hlt
  try { localStorage.setItem(key, JSON.stringify(Save)); }
  catch (e) { console.warn('Speichern fehlgeschlagen.', e); }
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
    spd: b.spd, // Tempo skaliert nicht â€” hÃ¤lt das Balancing lesbar.
  };
}

// Ã–konomie-Bremse 17.07.2026: Gold-Level-Up ist Beschleuniger, nicht Hauptweg.
function levelUpCost(level) { return 60 * level; } // Level 1â†’2 = 60 â€¦ 4â†’5 = 240.

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

// Ergebnis-Kreatur-ID fÃ¼r zwei Kreaturen â€” oder null (gleicher Archetyp, kein
// Rezept-Paar, Fusions-Kreatur als Zutat).
function fusionResult(cidA, cidB) {
  const a = Creatures[cidA], b = Creatures[cidB];
  if (!a || !b || a.fusion || b.fusion || cidA === cidB) return null;
  if (a.archetype === b.archetype) return null;
  const f = fusionArchetypeFor(a.archetype, b.archetype);
  const elId = fusionElementResult(a.element, b.element);
  return f && elId ? 'fx_' + f.id + '_' + elId : null;
}

// Wie fusionResult, prÃ¼ft zusÃ¤tzlich Besitz + Max-Level + noch nicht vorhanden.
function fusionReady(cidA, cidB) {
  const out = fusionResult(cidA, cidB);
  if (!out || Save.collection[out]) return null;
  const ea = Save.collection[cidA], eb = Save.collection[cidB];
  return ea && eb && ea.level >= MAX_LEVEL && eb.level >= MAX_LEVEL ? out : null;
}

// Verbraucht beide Zutaten, fÃ¼gt die Fusions-Kreatur (Level 1) hinzu, flickt das Team.
function fuseCreatures(cidA, cidB) {
  const out = fusionReady(cidA, cidB);
  if (!out) return null;
  delete Save.collection[cidA];
  delete Save.collection[cidB];
  delete Save.equipped[cidA];   // Items der Zutaten wandern zurÃ¼ck ins Inventar
  delete Save.equipped[cidB];
  Save.collection[out] = { level: 1, xp: 0 };
  // Kampagnen- UND Arena-Team flicken (beide greifen auf dieselbe Sammlung zu).
  ['team', 'arenaTeam'].forEach(key => {
    if (!Array.isArray(Save[key])) return;
    Save[key] = [...new Set(Save[key].map(id => (id === cidA || id === cidB) ? out : id))];
    while (Save[key].length < 3) {
      const spare = ownedIds().find(id => !Save[key].includes(id));
      if (!spare) break;
      Save[key].push(spare);
    }
  });
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
  // Aufstieg: Erstsieg AUF DIESER Stufe zÃ¤hlt wieder wie ein Erstsieg (ascension.js).
  const ascFirst = typeof ascFirstClear === 'function' && ascFirstClear(stage.id);
  if (typeof markAscClear === 'function') markAscClear(stage.id);
  // Ã–konomie-Bremse (verschÃ¤rft Runde 9): Wiederholungen bringen ein Viertel.
  let gold = first ? stage.gold : Math.round(stage.gold * 0.25);
  if (ascFirst) gold = stage.gold;                       // volle Basis auf neuer Stufe
  if (Save.ascension) gold = Math.round(gold * ascGoldMult());
  let unlocked = null;
  let bossUnlocked = null;
  if (first) {
    gold += stage.firstClearBonus;
    if (stage.unlockCreature && !Save.collection[stage.unlockCreature]) {
      Save.collection[stage.unlockCreature] = { level: 1, xp: 0 };
      unlocked = stage.unlockCreature;
    }
  }
  // Endboss-Belohnung (Runde 9): einmalig, eigener Archetyp, nicht fusionierbar.
  // Auch auf hÃ¶heren Aufstiegsstufen gibt es sie nur, wenn man sie noch nicht hat.
  if (stage.bossCreature && Creatures[stage.bossCreature] && !Save.collection[stage.bossCreature]) {
    Save.collection[stage.bossCreature] = { level: 1, xp: 0 };
    bossUnlocked = stage.bossCreature;
  }
  Save.gold += gold;
  persist();
  return { gold, unlocked, bossUnlocked, first, ascFirst };
}


// ================= js/ascension.js =================
// ascension.js â€” Aufstieg (Ascension) + Wochen-Modifikatoren.
// Langzeit-Hebel 2 der Design-Pfeiler: die Kampagne ist endlich, die Herausforderung
// nicht. Ab Aufstieg 1 wird die GANZE Kampagne hÃ¤rter neu gespielt â€” Gegner skalieren
// mit der Stufe, und zwei wÃ¶chentlich rotierende Modifikatoren drehen die Regeln um.
// Kein Backend nÃ¶tig: die Wochenwahl ist deterministisch aus dem Kalender-Datum.

// Modifikatoren. battle.js liest die Felder generisch aus (siehe applyMutators):
//   all/enemy: {atk,def,hp} = Prozent-Aufschlag Â· intervalMult Â· energyMult
//   suddenDeathAt (ms) Â· chipPctPerSec Â· lifestealAll Â· enemyThorns
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

// Montag der laufenden Woche als SchlÃ¼ssel (UTC, wie im Battlepass).
function _ascWeekKey() {
  const d = new Date();
  const on = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  on.setUTCDate(on.getUTCDate() - ((on.getUTCDay() + 6) % 7));
  return on.toISOString().slice(0, 10);
}

// Zwei Modifikatoren pro Woche, deterministisch â€” jeder Spieler sieht dieselben.
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

// Aufstieg Ã¶ffnet sich, sobald der Endboss der Kampagne einmal gefallen ist.
function ascensionUnlocked() {
  const fb = finalBossStage();
  return !!(fb && Save.stages[fb]);
}

// Man darf immer hÃ¶chstens eine Stufe Ã¼ber dem bisher Geschafften antreten.
function maxAscension() { return (Save.ascHigh || 0) + 1; }

function setAscension(n) {
  const lvl = Math.max(0, Math.min(maxAscension(), n));
  Save.ascension = lvl;
  persist();
  return lvl;
}

// ---------- Skalierung ----------

// Gegner der Stage auf die aktuelle Aufstiegsstufe heben: +1 Level je Stufe
// (Cap MAX_LEVEL) und zusÃ¤tzlich flacher Werte-Aufschlag Ã¼ber `mod`.
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
  // Endboss auf neuer Stufe geschafft -> nÃ¤chste Stufe freischalten.
  if (stageId === finalBossStage() && asc > (Save.ascHigh || 0)) {
    Save.ascHigh = asc;
    persist();
  }
}


// ================= js/battle.js =================
// battle.js â€” Echtzeit-Kampf-Engine (3 vs 3).
// Tick-basiert Ã¼ber update(dt); UI hÃ¤ngt sich per battle.on(event => â€¦) an.
// Alle Zahlenwerte kommen aus creatures.json/types.json (siehe data.js).

const ATTACK_INTERVAL_BASE = 2400;   // ms; sinkt mit Tempo (spd).
const ATTACK_INTERVAL_MIN = 700;
const DEF_MITIGATION = 0.4;          // Schaden = ANGÂ·Mult âˆ’ VERÂ·0.4
const ENEMY_ULTI_DELAY = 400;        // KI zÃ¼ndet Ulti kurz nach voller Energie.
const SUDDEN_DEATH_AT = 120000;      // ab 2 min steigt aller Schaden (verhindert Heiler-Patt)

// Globaler Schadens-Multiplikator: 1Ã— bis 2 min, danach linear bis 3Ã— (Minute 4+).
function suddenDeathMult(battle) {
  const at = battle.suddenDeathAt || SUDDEN_DEATH_AT;   // Modifikator 'Zeitdruck'
  if (battle.time <= at) return 1;
  return 1 + Math.min(2, (battle.time - at) / 60000);
}

function elementMult(attEl, defEl) {
  const a = Elements[attEl], d = Elements[defEl];
  if (a.neutral || d.neutral) return TYPES_DATA.multipliers.neutral;
  if (a.strongVs === defEl) return TYPES_DATA.multipliers.advantage;
  if (a.weakVs === defEl) return TYPES_DATA.multipliers.disadvantage;
  return TYPES_DATA.multipliers.neutral;
}

let _unitUid = 0;

// Prozent-AufschlÃ¤ge auf die Werte einer fertigen Einheit (Aufstieg/Modifikatoren).
function applyStatMod(u, s) {
  if (!s) return;
  if (s.atk) u.stats.atk = Math.max(1, Math.round(u.stats.atk * (1 + s.atk)));
  if (s.def) u.stats.def = Math.max(0, Math.round(u.stats.def * (1 + s.def)));
  if (s.hp) { u.maxHp = Math.max(1, Math.round(u.maxHp * (1 + s.hp))); u.hp = u.maxHp; }
}

function createUnit(cid, level, side, slot, itemId, mod) {
  const c = Creatures[cid];
  // Item (1 Slot je Kreatur): Werte flieÃŸen direkt in die Kampf-Stats ein,
  // das Keyword wird in doAttack/dealDamage ausgewertet (items.js).
  const item = (itemId && typeof Items !== 'undefined') ? (Items[itemId] || null) : null;
  const stats = applyItemStats(statsAtLevel(c, level), item);
  const u = {
    uid: 'u' + (++_unitUid),
    cid, c, side, slot, level, stats, item,
    hp: stats.hp, maxHp: stats.hp,
    energy: 0, alive: true,
    nextAttackAt: 0,
    passive: Abilities[c.passive],
    active: Abilities[c.active],
    // Status-Effekte
    shield: null,            // { amount, expiresAt }
    tauntUntil: 0,
    poison: null,            // { stacks, srcAtk, nextTickAt }
    bleeds: [],              // [{ dmg, ticksLeft, nextTickAt }]
    dots: [],                // [{ dps, expiresAt, nextTickAt }]
    defDownUntil: 0, defDownPct: 0,
    chillUntil: 0, chillPct: 0,   // Frost-Keyword: verlangsamt die Angriffe
    thorns: 0,               // Modifikator 'Dornenwelt' (Item-Dornen kommen extra)
    intervalMult: 1,         // Modifikator 'Frostluft'
    perSecondAcc: 0,
    ultiPlannedAt: null,     // KI-VerzÃ¶gerung
  };
  applyStatMod(u, mod);      // Aufstiegs-Skalierung der Gegner
  return u;
}

function createBattle(allyDefs, enemyDefs, modIds) {
  const battle = {
    time: 0,
    over: false, winner: null,
    allies: allyDefs.map((d, i) => createUnit(d.id, d.level, 'ally', i, d.item, d.mod)),
    enemies: enemyDefs.map((d, i) => createUnit(d.id, d.level, 'enemy', i, d.item, d.mod)),
    autoUlti: false,
    listeners: [],
    on(fn) { this.listeners.push(fn); },
    emit(type, data) { this.listeners.forEach(fn => fn(type, data)); },
  };
  // Wochen-Modifikatoren (ascension.js). Generisch Ã¼ber die MUTATORS-Felder â€”
  // neue Modifikatoren brauchen hier KEINEN neuen Code, nur einen Eintrag.
  battle.mods = modIds || [];
  battle.energyMult = 1;
  battle.suddenDeathAt = SUDDEN_DEATH_AT;
  battle.chipPctPerSec = 0;
  battle.lifestealAll = 0;
  battle.chipAcc = 0;
  battle.mods.forEach(id => {
    const m = (typeof MUTATORS !== 'undefined') && MUTATORS[id];
    if (!m) return;
    if (m.energyMult) battle.energyMult *= m.energyMult;
    if (m.suddenDeathAt) battle.suddenDeathAt = Math.min(battle.suddenDeathAt, m.suddenDeathAt);
    if (m.chipPctPerSec) battle.chipPctPerSec += m.chipPctPerSec;
    if (m.lifestealAll) battle.lifestealAll += m.lifestealAll;
    [...battle.allies, ...battle.enemies].forEach(u => {
      applyStatMod(u, m.all || (u.side === 'enemy' ? m.enemy : null));
      if (m.intervalMult) u.intervalMult *= m.intervalMult;
      if (m.enemyThorns && u.side === 'enemy') u.thorns = m.enemyThorns;
    });
  });

  // Erste Angriffe staffeln, damit nicht alles gleichzeitig zuschlÃ¤gt.
  [...battle.allies, ...battle.enemies].forEach(u => {
    u.nextAttackAt = attackInterval(u) * (0.35 + u.slot * 0.18);
    // Keyword 'shieldStart': Kampfbeginn mit Schild (Aegis-Siegel).
    const k = u.item && u.item.keyword;
    if (k && k.type === 'shieldStart') {
      u.shield = { amount: Math.round(u.maxHp * k.pct), expiresAt: k.sec * 1000 };
    }
  });
  return battle;
}

// now optional: bei aktivem Frost-Chill schlÃ¤gt die Einheit langsamer zu.
function attackInterval(u, now) {
  let iv = Math.max(ATTACK_INTERVAL_MIN, ATTACK_INTERVAL_BASE - u.stats.spd * 50);
  iv *= u.intervalMult || 1;                                   // Modifikator 'Frostluft'
  if (now !== undefined && now < u.chillUntil) iv *= 1 + u.chillPct;
  return iv;
}

function foesOf(battle, u) { return u.side === 'ally' ? battle.enemies : battle.allies; }
function matesOf(battle, u) { return u.side === 'ally' ? battle.allies : battle.enemies; }
function aliveOnly(list) { return list.filter(x => x.alive); }

// Effektiver Angriff inkl. Drachen-Passiv (+5 % je 25 % fehlender LP).
function effAtk(u) {
  let atk = u.stats.atk;
  if (u.passive.effect === 'atkUpWhenHurt') {
    const missing = 1 - u.hp / u.maxHp;
    atk *= 1 + Math.floor(missing * 4) * u.passive.params.atkPer25MissingHp;
  }
  return atk;
}

function effDef(u, now) {
  let def = u.stats.def;
  if (now < u.defDownUntil) def *= 1 - u.defDownPct;
  return def;
}

function gainEnergy(battle, u, amount) {
  if (!u.alive || u.energy >= 100) return;
  u.energy = Math.min(100, u.energy + amount * (battle.energyMult || 1)); // 'Energiesturm'
  if (u.energy >= 100) {
    battle.emit('energyFull', { unit: u });
    if (u.side === 'enemy' || battle.autoUlti) {
      u.ultiPlannedAt = battle.time + ENEMY_ULTI_DELAY;
    }
  }
}

// Zentrale Schadensrechnung. kind steuert nur die UI-Darstellung.
function dealDamage(battle, source, target, rawAmount, kind, elMult) {
  if (!target.alive) return 0;
  let dmg = rawAmount * suddenDeathMult(battle);
  if (kind === 'hit' || kind === 'ulti') {
    dmg -= effDef(target, battle.time) * DEF_MITIGATION;
    if (target.passive.effect === 'damageReduction') {
      dmg -= target.passive.params.flatReduce;
      gainEnergy(battle, target, target.passive.energyGain);
    }
  }
  dmg = Math.max(1, Math.round(dmg));
  if (target.shield && target.shield.expiresAt > battle.time && target.shield.amount > 0) {
    const absorbed = Math.min(target.shield.amount, dmg);
    target.shield.amount -= absorbed;
    dmg -= absorbed;
    battle.emit('absorb', { target, amount: absorbed });
    if (dmg <= 0) return 0;
  }
  target.hp -= dmg;
  battle.emit('damage', { source, target, amount: dmg, kind, elMult: elMult || 1 });
  // Keyword 'thorns': normaler Treffer wird flach zurÃ¼ckgespiegelt (kein Loop,
  // weil der RÃ¼ckschlag mit kind 'thorns' lÃ¤uft).
  if (kind === 'hit' && source && source.alive && target.alive) {
    const tk = target.item && target.item.keyword;
    const flat = (tk && tk.type === 'thorns' ? tk.flat : 0) + (target.thorns || 0);
    if (flat > 0) dealDamage(battle, null, source, flat, 'thorns');
  }
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    battle.emit('die', { unit: target });
    checkEnd(battle);
  }
  return dmg;
}

function heal(battle, target, amount) {
  if (!target.alive || amount <= 0) return;
  const healed = Math.min(Math.round(amount), target.maxHp - target.hp);
  if (healed <= 0) return;
  target.hp += healed;
  battle.emit('heal', { target, amount: healed });
}

// Standard-Ziel: vorderster lebender Gegner; Spott (Bollwerk) Ã¼bersteuert.
function defaultTarget(battle, u) {
  const foes = aliveOnly(foesOf(battle, u));
  if (!foes.length) return null;
  const taunter = foes.find(f => f.tauntUntil > battle.time);
  return taunter || foes[0];
}

function pickTarget(battle, u, mode) {
  const foes = aliveOnly(foesOf(battle, u));
  if (!foes.length) return null;
  switch (mode) {
    case 'enemyHighestHp': return foes.reduce((a, b) => b.hp > a.hp ? b : a);
    case 'enemyLowestHp':  return foes.reduce((a, b) => b.hp < a.hp ? b : a);
    case 'enemyBackline':  return foes[foes.length - 1];
    default: return defaultTarget(battle, u);
  }
}

// ---------- Auto-Angriff ----------

function doAttack(battle, u) {
  const target = defaultTarget(battle, u);
  if (!target) return;
  const mult = elementMult(u.c.element, target.c.element);
  battle.emit('attack', { attacker: u, target });
  const dealt = dealDamage(battle, u, target, effAtk(u) * mult, 'hit', mult);

  const p = u.passive;
  if (p.trigger === 'onAttack') {
    gainEnergy(battle, u, p.energyGain);
    if (p.effect === 'lifesteal') heal(battle, u, dealt * p.params.pctOfDamage);
    if (p.effect === 'applyPoison' && target.alive) {
      if (!target.poison) target.poison = { stacks: 0, srcAtk: 0, nextTickAt: battle.time + 1000 };
      target.poison.stacks = Math.min(p.params.maxStacks, target.poison.stacks + 1);
      target.poison.srcAtk = effAtk(u);
      battle.emit('poison', { target, stacks: target.poison.stacks });
    }
  }

  if (battle.lifestealAll) heal(battle, u, dealt * battle.lifestealAll); // 'Blutrausch'

  // Item-Keyword (items.js): Thema Ã¼ber Mechanik statt Ã¼ber neue Elemente.
  const k = u.item && u.item.keyword;
  if (k) {
    if (k.type === 'lifesteal') heal(battle, u, dealt * k.pct);
    if (k.type === 'energy') gainEnergy(battle, u, k.bonus);
    if (target.alive) {
      if (k.type === 'poison') {
        if (!target.poison) target.poison = { stacks: 0, srcAtk: 0, nextTickAt: battle.time + 1000 };
        target.poison.stacks = Math.min(k.maxStacks, target.poison.stacks + 1);
        target.poison.srcAtk = effAtk(u);
        battle.emit('poison', { target, stacks: target.poison.stacks });
      }
      if (k.type === 'burn') {
        target.dots.push({ dps: effAtk(u) * k.pct,
                           expiresAt: battle.time + k.sec * 1000,
                           nextTickAt: battle.time + 1000 });
        battle.emit('burn', { target });
      }
      if (k.type === 'chill') {
        target.chillUntil = battle.time + k.sec * 1000;
        target.chillPct = k.pct;
        battle.emit('chill', { target });
      }
    }
  }
}

// ---------- Ulti ----------

function castActive(battle, u) {
  if (!u.alive || u.energy < 100 || battle.over) return false;
  u.energy = 0;
  u.ultiPlannedAt = null;
  const a = u.active;
  battle.emit('ulti', { unit: u, ability: a });

  switch (a.effect) {
    case 'elementalNuke': {
      const t = pickTarget(battle, u, a.target);
      if (t) {
        const mult = elementMult(u.c.element, t.c.element);
        dealDamage(battle, u, t, effAtk(u) * a.params.atkMultiplier * mult, 'ulti', mult);
      }
      break;
    }
    case 'teamShield': {
      aliveOnly(matesOf(battle, u)).forEach(m => {
        m.shield = { amount: Math.round(m.maxHp * a.params.shieldPctMaxHp),
                     expiresAt: battle.time + a.params.durationSec * 1000 };
        battle.emit('shieldGain', { target: m, amount: m.shield.amount });
      });
      if (a.params.taunt) u.tauntUntil = battle.time + a.params.durationSec * 1000;
      break;
    }
    case 'multiHit': {
      for (let i = 0; i < a.params.hits; i++) {
        const t = pickTarget(battle, u, a.target);
        if (!t) break;
        const mult = elementMult(u.c.element, t.c.element);
        dealDamage(battle, u, t, effAtk(u) * a.params.atkMultiplier * mult, 'ulti', mult);
      }
      break;
    }
    case 'hitPlusBleed': {
      const t = pickTarget(battle, u, a.target);
      if (t) {
        const mult = elementMult(u.c.element, t.c.element);
        dealDamage(battle, u, t, effAtk(u) * a.params.atkMultiplier * mult, 'ulti', mult);
        if (t.alive) t.bleeds.push({
          dmg: effAtk(u) * a.params.bleedPct,
          ticksLeft: a.params.bleedTicks,
          nextTickAt: battle.time + 1000,
        });
      }
      break;
    }
    case 'spreadDotDebuff': {
      aliveOnly(foesOf(battle, u)).forEach(t => {
        t.dots.push({ dps: effAtk(u) * a.params.dotPct,
                      expiresAt: battle.time + a.params.durationSec * 1000,
                      nextTickAt: battle.time + 1000 });
        t.defDownUntil = battle.time + a.params.durationSec * 1000;
        t.defDownPct = a.params.defDown;
      });
      break;
    }
    case 'teamHeal': {
      aliveOnly(matesOf(battle, u)).forEach(m => heal(battle, m, m.maxHp * a.params.healPctMaxHp));
      break;
    }
    case 'reviveOrHeal': {
      const fallen = matesOf(battle, u).find(m => !m.alive);
      if (fallen) {
        fallen.alive = true;
        fallen.hp = Math.round(fallen.maxHp * a.params.reviveHpPct);
        fallen.energy = 0;
        fallen.poison = null; fallen.bleeds = []; fallen.dots = [];
        fallen.nextAttackAt = battle.time + attackInterval(fallen) * 0.5;
        battle.emit('revive', { unit: fallen });
      } else {
        const weakest = aliveOnly(matesOf(battle, u)).reduce((x, y) => y.hp / y.maxHp < x.hp / x.maxHp ? y : x);
        heal(battle, weakest, weakest.maxHp * a.params.healPctMaxHp);
      }
      break;
    }
  }
  return true;
}

// ---------- DoT-Ticks (Gift / Blutung / FlÃ¤che) ----------

function tickStatuses(battle, u) {
  if (!u.alive) return;
  const now = battle.time;
  if (u.poison && u.poison.stacks > 0 && now >= u.poison.nextTickAt) {
    u.poison.nextTickAt = now + 1000;
    dealDamage(battle, null, u, u.poison.srcAtk * 0.05 * u.poison.stacks, 'poison');
  }
  u.bleeds = u.bleeds.filter(b => {
    if (now >= b.nextTickAt) {
      b.nextTickAt = now + 1000;
      b.ticksLeft--;
      dealDamage(battle, null, u, b.dmg, 'bleed');
    }
    return b.ticksLeft > 0 && u.alive;
  });
  u.dots = u.dots.filter(d => {
    if (now >= d.nextTickAt && now <= d.expiresAt) {
      d.nextTickAt = now + 1000;
      dealDamage(battle, null, u, d.dps, 'dot');
    }
    return d.expiresAt > now && u.alive;
  });
  if (u.shield && u.shield.expiresAt <= now) u.shield = null;
}

function checkEnd(battle) {
  if (battle.over) return;
  if (!aliveOnly(battle.enemies).length) { battle.over = true; battle.winner = 'ally'; }
  else if (!aliveOnly(battle.allies).length) { battle.over = true; battle.winner = 'enemy'; }
  if (battle.over) battle.emit('end', { winner: battle.winner });
}

// ---------- Haupt-Tick ----------

function updateBattle(battle, dt) {
  if (battle.over) return;
  battle.time += dt;
  // Modifikator 'Giftnebel': alle verlieren stetig einen Anteil ihrer Max-LP.
  if (battle.chipPctPerSec) {
    battle.chipAcc += dt;
    while (battle.chipAcc >= 1000) {
      battle.chipAcc -= 1000;
      [...battle.allies, ...battle.enemies].forEach(u => {
        if (u.alive) dealDamage(battle, null, u, u.maxHp * battle.chipPctPerSec, 'dot');
      });
      if (battle.over) return;
    }
  }
  const units = [...battle.allies, ...battle.enemies];
  for (const u of units) {
    if (!u.alive) continue;
    // Zeit-Passive (Geist/PhÃ¶nix)
    if (u.passive.trigger === 'perSecond') {
      u.perSecondAcc += dt;
      while (u.perSecondAcc >= 1000) {
        u.perSecondAcc -= 1000;
        gainEnergy(battle, u, u.passive.energyGain);
      }
    }
    tickStatuses(battle, u);
    if (battle.over) return;
    // KI / Auto-Ulti
    if (u.ultiPlannedAt !== null && battle.time >= u.ultiPlannedAt) castActive(battle, u);
    if (battle.over) return;
    // Auto-Angriff
    if (battle.time >= u.nextAttackAt) {
      u.nextAttackAt = battle.time + attackInterval(u, battle.time);
      doAttack(battle, u);
      if (battle.over) return;
    }
  }
}


export { createBattle, updateBattle, castActive, Creatures, Items };
