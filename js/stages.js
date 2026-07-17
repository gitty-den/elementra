// stages.js — Kampagnen-Definition. 10 Stages, Gegnerteams, Belohnungen.
// Design-Regeln (aus Balancing-Simulation, siehe CLAUDE.md):
// - Kein reines Konter-Trio gegen das Spieler-Kernteam (Elementar-Konter auf dem
//   einzigen Tank nature_golem kippt sonst jeden Kampf).
// - Unlocks liefern das Konter-Werkzeug VOR der Stage, die es braucht:
//   S3 gibt Wasser-DPS vor der Feuer-Stage 4, S4 gibt Natur-DPS vor der Wasser-Stage 5.
// - S8–S10 zeigen Fusions-Kreaturen (fx_*) als Gegner — Vorgeschmack aufs eigene
//   Fusions-Endgame; Level per Headless-Sim ausbalanciert.

const STAGES = [
  {
    id: 1, name: 'Waldrand', theme: 'nature', desc: 'Junge Naturkreaturen streifen umher.',
    enemies: [
      { id: 'nature_wyrm', level: 1 },
      { id: 'nature_greif', level: 1 },
    ],
    gold: 45, firstClearBonus: 60, unlockCreature: null,
  },
  {
    id: 2, name: 'Dornige Lichtung', theme: 'nature', desc: 'Ein Rudel verteidigt sein Revier.',
    enemies: [
      { id: 'nature_wolf', level: 1 },
      { id: 'nature_greif', level: 1 },
      { id: 'nature_wyrm', level: 1 },
    ],
    gold: 60, firstClearBonus: 80, unlockCreature: 'fire_greif',
  },
  {
    id: 3, name: 'Flussfurt', theme: 'water', desc: 'Wasserkreaturen bewachen die Überquerung.',
    enemies: [
      { id: 'water_wolf', level: 1 },
      { id: 'water_greif', level: 1 },
      { id: 'water_wyrm', level: 2 },
    ],
    gold: 70, firstClearBonus: 90, unlockCreature: 'water_wyrm',
  },
  {
    id: 4, name: 'Glutschlucht', theme: 'fire', desc: 'Hitze flimmert über schwarzem Fels.',
    enemies: [
      { id: 'fire_wolf', level: 2 },
      { id: 'fire_wyrm', level: 1 },
      { id: 'nature_greif', level: 2 },
    ],
    gold: 80, firstClearBonus: 100, unlockCreature: 'nature_wolf',
  },
  {
    id: 5, name: 'Versunkener Tempel', theme: 'water', desc: 'Etwas Altes wacht in der Tiefe.',
    enemies: [
      { id: 'water_golem', level: 2 },
      { id: 'water_drache', level: 2 },
      { id: 'water_wolf', level: 2 },
    ],
    gold: 90, firstClearBonus: 110, unlockCreature: null,
  },
  {
    id: 6, name: 'Sturmklippen', theme: 'storm', desc: 'Greifen kreisen über den Felsen.',
    enemies: [
      { id: 'nature_greif', level: 3 },
      { id: 'fire_greif', level: 3 },
      { id: 'water_greif', level: 3 },
    ],
    gold: 100, firstClearBonus: 120, unlockCreature: null,
  },
  {
    id: 7, name: 'Tiefenmeer-Grotte', theme: 'water', desc: 'Der Tiefendrache stellt sich dir.',
    enemies: [
      { id: 'water_drache', level: 3 },
      { id: 'water_golem', level: 3 },
      { id: 'water_geist', level: 3 },
    ],
    gold: 110, firstClearBonus: 140, unlockCreature: 'water_drache',
  },
  {
    id: 8, name: 'Aschewüste', theme: 'ash', desc: 'Eine Fusions-Chimära — Vorsicht, neutral!',
    enemies: [
      { id: 'fx_chimaera_ash', level: 2 },
      { id: 'fire_drache', level: 4 },
      { id: 'nature_geist', level: 3 },
    ],
    gold: 120, firstClearBonus: 160, unlockCreature: null,
  },
  {
    id: 9, name: 'Frostgrat', theme: 'frost', desc: 'Frost-Fusionen halten den Pass.',
    enemies: [
      { id: 'fx_gargoyle_frost', level: 2 },
      { id: 'fx_basilisk_frost', level: 3 },
      { id: 'water_geist', level: 4 },
    ],
    gold: 130, firstClearBonus: 180, unlockCreature: null,
  },
  {
    id: 10, name: 'Thron der Elemente', theme: 'storm', desc: 'Der Phönix prüft, ob du würdig bist.',
    enemies: [
      { id: 'fire_phoenix', level: 3 },
      { id: 'fx_leviathan_steam', level: 2 },
      { id: 'fx_koloss_frost', level: 1 },
    ],
    gold: 150, firstClearBonus: 250, unlockCreature: 'fire_phoenix',
  },
];
