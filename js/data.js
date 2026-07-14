// Auto-generiert aus data/*.json (file://-kompatibel, kein fetch noetig).
// Bei Datenaenderung: JSON anpassen und diese Datei neu generieren (siehe CLAUDE.md).
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
        "atkMultiplier": 3.0
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
      "id": "steam_drache",
      "name": "Dampf-Drache",
      "archetype": "drache",
      "role": "dps",
      "element": "steam",
      "rarity": "epic",
      "tier": 2,
      "baseStats": {
        "hp": 126,
        "atk": 31,
        "def": 14,
        "spd": 17
      },
      "passive": "drache_passive",
      "active": "drache_active",
      "fusionSource": [
        "fire_drache",
        "water_drache"
      ],
      "mvp": false
    },
    {
      "id": "ash_drache",
      "name": "Asche-Drache",
      "archetype": "drache",
      "role": "dps",
      "element": "ash",
      "rarity": "epic",
      "tier": 2,
      "baseStats": {
        "hp": 126,
        "atk": 31,
        "def": 14,
        "spd": 17
      },
      "passive": "drache_passive",
      "active": "drache_active",
      "fusionSource": [
        "fire_drache",
        "nature_drache"
      ],
      "mvp": false
    },
    {
      "id": "frost_drache",
      "name": "Frost-Drache",
      "archetype": "drache",
      "role": "dps",
      "element": "frost",
      "rarity": "epic",
      "tier": 2,
      "baseStats": {
        "hp": 126,
        "atk": 31,
        "def": 14,
        "spd": 17
      },
      "passive": "drache_passive",
      "active": "drache_active",
      "fusionSource": [
        "nature_drache",
        "water_drache"
      ],
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
      "id": "steam_golem",
      "name": "Dampf-Golem",
      "archetype": "golem",
      "role": "tank",
      "element": "steam",
      "rarity": "epic",
      "tier": 2,
      "baseStats": {
        "hp": 224,
        "atk": 17,
        "def": 28,
        "spd": 8
      },
      "passive": "golem_passive",
      "active": "golem_active",
      "fusionSource": [
        "fire_golem",
        "water_golem"
      ],
      "mvp": false
    },
    {
      "id": "ash_golem",
      "name": "Asche-Golem",
      "archetype": "golem",
      "role": "tank",
      "element": "ash",
      "rarity": "epic",
      "tier": 2,
      "baseStats": {
        "hp": 224,
        "atk": 17,
        "def": 28,
        "spd": 8
      },
      "passive": "golem_passive",
      "active": "golem_active",
      "fusionSource": [
        "fire_golem",
        "nature_golem"
      ],
      "mvp": false
    },
    {
      "id": "frost_golem",
      "name": "Frost-Golem",
      "archetype": "golem",
      "role": "tank",
      "element": "frost",
      "rarity": "epic",
      "tier": 2,
      "baseStats": {
        "hp": 224,
        "atk": 17,
        "def": 28,
        "spd": 8
      },
      "passive": "golem_passive",
      "active": "golem_active",
      "fusionSource": [
        "nature_golem",
        "water_golem"
      ],
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
      "id": "steam_greif",
      "name": "Dampf-Greif",
      "archetype": "greif",
      "role": "speed",
      "element": "steam",
      "rarity": "epic",
      "tier": 2,
      "baseStats": {
        "hp": 105,
        "atk": 22,
        "def": 11,
        "spd": 28
      },
      "passive": "greif_passive",
      "active": "greif_active",
      "fusionSource": [
        "fire_greif",
        "water_greif"
      ],
      "mvp": false
    },
    {
      "id": "ash_greif",
      "name": "Asche-Greif",
      "archetype": "greif",
      "role": "speed",
      "element": "ash",
      "rarity": "epic",
      "tier": 2,
      "baseStats": {
        "hp": 105,
        "atk": 22,
        "def": 11,
        "spd": 28
      },
      "passive": "greif_passive",
      "active": "greif_active",
      "fusionSource": [
        "fire_greif",
        "nature_greif"
      ],
      "mvp": false
    },
    {
      "id": "frost_greif",
      "name": "Frost-Greif",
      "archetype": "greif",
      "role": "speed",
      "element": "frost",
      "rarity": "epic",
      "tier": 2,
      "baseStats": {
        "hp": 105,
        "atk": 22,
        "def": 11,
        "spd": 28
      },
      "passive": "greif_passive",
      "active": "greif_active",
      "fusionSource": [
        "nature_greif",
        "water_greif"
      ],
      "mvp": false
    },
    {
      "id": "fire_wolf",
      "name": "Höllenwolf",
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
      "id": "steam_wolf",
      "name": "Dampf-Bestie",
      "archetype": "wolf",
      "role": "bruiser",
      "element": "steam",
      "rarity": "epic",
      "tier": 2,
      "baseStats": {
        "hp": 154,
        "atk": 28,
        "def": 17,
        "spd": 18
      },
      "passive": "wolf_passive",
      "active": "wolf_active",
      "fusionSource": [
        "fire_wolf",
        "water_wolf"
      ],
      "mvp": false
    },
    {
      "id": "ash_wolf",
      "name": "Asche-Bestie",
      "archetype": "wolf",
      "role": "bruiser",
      "element": "ash",
      "rarity": "epic",
      "tier": 2,
      "baseStats": {
        "hp": 154,
        "atk": 28,
        "def": 17,
        "spd": 18
      },
      "passive": "wolf_passive",
      "active": "wolf_active",
      "fusionSource": [
        "fire_wolf",
        "nature_wolf"
      ],
      "mvp": false
    },
    {
      "id": "frost_wolf",
      "name": "Frost-Bestie",
      "archetype": "wolf",
      "role": "bruiser",
      "element": "frost",
      "rarity": "epic",
      "tier": 2,
      "baseStats": {
        "hp": 154,
        "atk": 28,
        "def": 17,
        "spd": 18
      },
      "passive": "wolf_passive",
      "active": "wolf_active",
      "fusionSource": [
        "nature_wolf",
        "water_wolf"
      ],
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
      "id": "steam_wyrm",
      "name": "Dampf-Wyrm",
      "archetype": "wyrm",
      "role": "dot",
      "element": "steam",
      "rarity": "epic",
      "tier": 2,
      "baseStats": {
        "hp": 119,
        "atk": 21,
        "def": 13,
        "spd": 20
      },
      "passive": "wyrm_passive",
      "active": "wyrm_active",
      "fusionSource": [
        "fire_wyrm",
        "water_wyrm"
      ],
      "mvp": false
    },
    {
      "id": "ash_wyrm",
      "name": "Asche-Wyrm",
      "archetype": "wyrm",
      "role": "dot",
      "element": "ash",
      "rarity": "epic",
      "tier": 2,
      "baseStats": {
        "hp": 119,
        "atk": 21,
        "def": 13,
        "spd": 20
      },
      "passive": "wyrm_passive",
      "active": "wyrm_active",
      "fusionSource": [
        "fire_wyrm",
        "nature_wyrm"
      ],
      "mvp": false
    },
    {
      "id": "frost_wyrm",
      "name": "Frost-Wyrm",
      "archetype": "wyrm",
      "role": "dot",
      "element": "frost",
      "rarity": "epic",
      "tier": 2,
      "baseStats": {
        "hp": 119,
        "atk": 21,
        "def": 13,
        "spd": 20
      },
      "passive": "wyrm_passive",
      "active": "wyrm_active",
      "fusionSource": [
        "nature_wyrm",
        "water_wyrm"
      ],
      "mvp": false
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
      "id": "steam_geist",
      "name": "Dampf-Elementargeist",
      "archetype": "geist",
      "role": "support",
      "element": "steam",
      "rarity": "epic",
      "tier": 2,
      "baseStats": {
        "hp": 133,
        "atk": 11,
        "def": 15,
        "spd": 15
      },
      "passive": "geist_passive",
      "active": "geist_active",
      "fusionSource": [
        "fire_geist",
        "water_geist"
      ],
      "mvp": false
    },
    {
      "id": "ash_geist",
      "name": "Asche-Elementargeist",
      "archetype": "geist",
      "role": "support",
      "element": "ash",
      "rarity": "epic",
      "tier": 2,
      "baseStats": {
        "hp": 133,
        "atk": 11,
        "def": 15,
        "spd": 15
      },
      "passive": "geist_passive",
      "active": "geist_active",
      "fusionSource": [
        "fire_geist",
        "nature_geist"
      ],
      "mvp": false
    },
    {
      "id": "frost_geist",
      "name": "Frost-Elementargeist",
      "archetype": "geist",
      "role": "support",
      "element": "frost",
      "rarity": "epic",
      "tier": 2,
      "baseStats": {
        "hp": 133,
        "atk": 11,
        "def": 15,
        "spd": 15
      },
      "passive": "geist_passive",
      "active": "geist_active",
      "fusionSource": [
        "nature_geist",
        "water_geist"
      ],
      "mvp": false
    },
    {
      "id": "fire_phoenix",
      "name": "Phönix",
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
      "id": "steam_phoenix",
      "name": "Dampf-Phönixvogel",
      "archetype": "phoenix",
      "role": "sustain",
      "element": "steam",
      "rarity": "legendary",
      "tier": 2,
      "baseStats": {
        "hp": 140,
        "atk": 20,
        "def": 17,
        "spd": 17
      },
      "passive": "phoenix_passive",
      "active": "phoenix_active",
      "fusionSource": [
        "fire_phoenix",
        "water_phoenix"
      ],
      "mvp": false
    },
    {
      "id": "ash_phoenix",
      "name": "Asche-Phönixvogel",
      "archetype": "phoenix",
      "role": "sustain",
      "element": "ash",
      "rarity": "legendary",
      "tier": 2,
      "baseStats": {
        "hp": 140,
        "atk": 20,
        "def": 17,
        "spd": 17
      },
      "passive": "phoenix_passive",
      "active": "phoenix_active",
      "fusionSource": [
        "fire_phoenix",
        "nature_phoenix"
      ],
      "mvp": false
    },
    {
      "id": "frost_phoenix",
      "name": "Frost-Phönixvogel",
      "archetype": "phoenix",
      "role": "sustain",
      "element": "frost",
      "rarity": "legendary",
      "tier": 2,
      "baseStats": {
        "hp": 140,
        "atk": 20,
        "def": 17,
        "spd": 17
      },
      "passive": "phoenix_passive",
      "active": "phoenix_active",
      "fusionSource": [
        "nature_phoenix",
        "water_phoenix"
      ],
      "mvp": false
    }
  ]
};
const FUSIONS_DATA = {
  "rules": {
    "elemental": {
      "description": "Gleicher Archetyp, zwei verschiedene Basis-Elemente auf Max-Level -> Hybrid (Tier 2).",
      "combos": [
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
      ]
    },
    "archetype": {
      "description": "OPTIONAL / POST-MVP: gleiches Element, zwei verschiedene Archetypen -> Chimäre.",
      "enabled": false
    }
  },
  "hybridsAreNeutral": true,
  "recipes": [
    {
      "inputs": [
        "fire_drache",
        "water_drache"
      ],
      "output": "steam_drache",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "fire_drache",
        "nature_drache"
      ],
      "output": "ash_drache",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "nature_drache",
        "water_drache"
      ],
      "output": "frost_drache",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "fire_golem",
        "water_golem"
      ],
      "output": "steam_golem",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "fire_golem",
        "nature_golem"
      ],
      "output": "ash_golem",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "nature_golem",
        "water_golem"
      ],
      "output": "frost_golem",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "fire_greif",
        "water_greif"
      ],
      "output": "steam_greif",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "fire_greif",
        "nature_greif"
      ],
      "output": "ash_greif",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "nature_greif",
        "water_greif"
      ],
      "output": "frost_greif",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "fire_wolf",
        "water_wolf"
      ],
      "output": "steam_wolf",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "fire_wolf",
        "nature_wolf"
      ],
      "output": "ash_wolf",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "nature_wolf",
        "water_wolf"
      ],
      "output": "frost_wolf",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "fire_wyrm",
        "water_wyrm"
      ],
      "output": "steam_wyrm",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "fire_wyrm",
        "nature_wyrm"
      ],
      "output": "ash_wyrm",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "nature_wyrm",
        "water_wyrm"
      ],
      "output": "frost_wyrm",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "fire_geist",
        "water_geist"
      ],
      "output": "steam_geist",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "fire_geist",
        "nature_geist"
      ],
      "output": "ash_geist",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "nature_geist",
        "water_geist"
      ],
      "output": "frost_geist",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "fire_phoenix",
        "water_phoenix"
      ],
      "output": "steam_phoenix",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "fire_phoenix",
        "nature_phoenix"
      ],
      "output": "ash_phoenix",
      "requiresMaxLevel": true
    },
    {
      "inputs": [
        "nature_phoenix",
        "water_phoenix"
      ],
      "output": "frost_phoenix",
      "requiresMaxLevel": true
    }
  ]
};
