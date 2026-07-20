// stages.js — Kampagnen-Definition. 10 Stages, Gegnerteams, Belohnungen.
// Design-Regeln (aus Balancing-Simulation, siehe CLAUDE.md):
// - Kein reines Konter-Trio gegen das Spieler-Kernteam (Elementar-Konter auf dem
//   einzigen Tank nature_golem kippt sonst jeden Kampf).
// - Unlocks liefern das Konter-Werkzeug VOR der Stage, die es braucht:
//   S3 gibt Wasser-DPS vor der Feuer-Stage 4, S4 gibt Natur-DPS vor der Wasser-Stage 5.
// - S8–S10 zeigen Fusions-Kreaturen (fx_*) als Gegner — Vorgeschmack aufs eigene
//   Fusions-Endgame; Level per Headless-Sim ausbalanciert.

// Kapitel/Abteile (19.07.2026): Kampagne = Welt-Übersicht -> Kapitel-Karte.
// Boss-Sieg schaltet das nächste Kapitel frei (neue Karte). range = [erste, letzte].
const CHAPTERS = [
  { id: 1, name: 'Erwachen',      range: [1, 10],  theme: 'nature', bossStage: 10 },
  { id: 2, name: 'Fusions-Ära',   range: [11, 20], theme: 'storm',  bossStage: 20 },
];

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
    id: 10, name: 'Thron der Elemente', theme: 'storm', boss: true,
    desc: 'Der Phönix prüft, ob du würdig bist.',
    enemies: [
      { id: 'fire_phoenix', level: 3 },
      { id: 'fx_leviathan_steam', level: 2 },
      { id: 'fx_koloss_frost', level: 1 },
    ],
    gold: 150, firstClearBonus: 250, unlockCreature: 'fire_phoenix',
  },

  // ===== Kapitel 2 (17.07.2026): Fusions-Ära. Ab S15 sind eigene Fusionen
  // faktisch Pflicht, S20 ist ein All-Fusion-Bosskampf. Levels per Sim.
  {
    id: 11, name: 'Glutfelder', theme: 'fire', desc: 'Glühende Schlacke, patrouillierende Golems.',
    enemies: [
      { id: 'fire_golem', level: 4 },
      { id: 'fire_wolf', level: 4 },
      { id: 'fire_geist', level: 3 },
    ],
    gold: 160, firstClearBonus: 200, unlockCreature: 'water_golem',
  },
  {
    id: 12, name: 'Sturmsee', theme: 'water', desc: 'Die See tobt — alles hier beißt.',
    enemies: [
      { id: 'water_drache', level: 5 },
      { id: 'water_wolf', level: 5 },
      { id: 'water_greif', level: 4 },
    ],
    gold: 170, firstClearBonus: 210, unlockCreature: 'nature_greif',
  },
  {
    id: 13, name: 'Dornenwald', theme: 'nature', desc: 'Der Wald selbst stellt sich dir entgegen.',
    enemies: [
      { id: 'nature_drache', level: 5 },
      { id: 'nature_wolf', level: 5 },
      { id: 'nature_geist', level: 5 },
    ],
    gold: 180, firstClearBonus: 220, unlockCreature: 'fire_wyrm',
  },
  {
    id: 14, name: 'Aschensturm', theme: 'ash', desc: 'Ein Geisterwolf jagt im Aschenregen.',
    enemies: [
      { id: 'fx_barghest_ash', level: 1 },
      { id: 'fire_drache', level: 5 },
      { id: 'fire_greif', level: 4 },
    ],
    gold: 190, firstClearBonus: 230, unlockCreature: 'nature_drache',
  },
  {
    id: 15, name: 'Eistiefe', theme: 'frost', desc: 'Unter dem Eis wartet der Basilisk.',
    enemies: [
      { id: 'fx_basilisk_frost', level: 4 },
      { id: 'water_golem', level: 5 },
      { id: 'water_geist', level: 5 },
    ],
    gold: 200, firstClearBonus: 240, unlockCreature: 'fire_golem',
  },
  {
    id: 16, name: 'Himmelspass', theme: 'storm', desc: 'Die Sphinx bewacht den Aufstieg.',
    enemies: [
      { id: 'fx_sphinx_steam', level: 3 },
      { id: 'nature_greif', level: 5 },
      { id: 'fire_greif', level: 5 },
    ],
    gold: 210, firstClearBonus: 250, unlockCreature: 'water_wolf',
  },
  {
    id: 17, name: 'Seelenmoor', theme: 'nature', desc: 'Irrlichter führen dich vom Weg ab.',
    enemies: [
      { id: 'fx_barghest_frost', level: 3 },
      { id: 'nature_geist', level: 5 },
      { id: 'nature_wolf', level: 5 },
    ],
    gold: 220, firstClearBonus: 260, unlockCreature: 'fire_geist',
  },
  {
    id: 18, name: 'Obsidianfeste', theme: 'fire', desc: 'Der Koloss hält die schwarzen Tore.',
    enemies: [
      { id: 'fx_koloss_ash', level: 2 },
      { id: 'fire_golem', level: 5 },
      { id: 'fire_drache', level: 5 },
    ],
    gold: 230, firstClearBonus: 280, unlockCreature: 'fire_wolf',
  },
  {
    id: 19, name: 'Frostthron', theme: 'frost', desc: 'Gargoyle und Ouroboros — Eis ohne Ende.',
    enemies: [
      { id: 'fx_gargoyle_frost', level: 3 },
      { id: 'fx_ouroboros_frost', level: 2 },
      { id: 'water_drache', level: 5 },
    ],
    gold: 240, firstClearBonus: 300, unlockCreature: 'water_phoenix',
  },
  {
    id: 20, name: 'Herz der Elemente', theme: 'storm', boss: true,
    desc: 'Drei Fusionen. Keine Gnade.',
    enemies: [
      { id: 'fx_seraph_steam', level: 3 },
      { id: 'fx_leviathan_ash', level: 3 },
      { id: 'fx_archon_frost', level: 3 },
    ],
    gold: 300, firstClearBonus: 400, unlockCreature: 'nature_phoenix',
  },
];
