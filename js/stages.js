// stages.js — Kampagnen-Definition. 10 Stages, Gegnerteams, Belohnungen.
// Design-Regeln (aus Balancing-Simulation, siehe CLAUDE.md):
// - Kein reines Konter-Trio gegen das Spieler-Kernteam (Elementar-Konter auf dem
//   einzigen Tank nature_golem kippt sonst jeden Kampf).
// - Unlocks liefern das Konter-Werkzeug VOR der Stage, die es braucht:
//   S3 gibt Wasser-DPS vor der Feuer-Stage 4, S4 gibt Natur-DPS vor der Wasser-Stage 5.
// - S8–S10 zeigen Fusions-Kreaturen (fx_*) als Gegner — Vorgeschmack aufs eigene
//   Fusions-Endgame; Level per Headless-Sim ausbalanciert.

// Runde 9 (21.07.2026), Nutzer-Feedback „keine Herausforderung":
// - Gold und Erstsieg-Bonus sind auf die HÄLFTE gesenkt (Wiederholungen geben in
//   grantStageRewards nur noch ein Viertel).
// - `drop: true` markiert die EINZIGEN Stages mit garantiertem Item-Erstsieg —
//   zwei je Kapitel (Mitte + Endboss). Überall sonst gibt es nur die kleine
//   Wiederholungs-Chance (items.js `rollStageDrop`).
// - `bossCreature` ist die einmalige Endboss-Belohnung: eigene Archetypen
//   (titan/weltenschlange), NICHT über Fusion herstellbar.

// Kapitel/Abteile (19.07.2026): Kampagne = Welt-Übersicht -> Kapitel-Karte.
// Boss-Sieg schaltet das nächste Kapitel frei (neue Karte). range = [erste, letzte].
const CHAPTERS = [
  { id: 1, name: 'Erwachen',      range: [1, 10],  theme: 'nature', bossStage: 10 },
  { id: 2, name: 'Fusions-Ära',   range: [11, 20], theme: 'storm',  bossStage: 20 },
  { id: 3, name: 'Ewiges Eis',    range: [21, 28], theme: 'frost',  bossStage: 28 },
  { id: 4, name: 'Sturmreich',    range: [29, 36], theme: 'storm',  bossStage: 36 },
  { id: 5, name: 'Aschenlande',   range: [37, 44], theme: 'ash',    bossStage: 44 },
];

const STAGES = [
  {
    id: 1, name: 'Waldrand', theme: 'nature', desc: 'Junge Naturkreaturen streifen umher.',
    enemies: [
      { id: 'nature_wolf', level: 1, mod: { hp: 0.03, atk: 0.15 } },
      { id: 'nature_greif', level: 1, mod: { hp: 0.03, atk: 0.15 } },
      { id: 'nature_wyrm', level: 1, mod: { hp: 0.03, atk: 0.15 } }
    ],
    gold: 23, firstClearBonus: 30, unlockCreature: null,
  },
  {
    id: 2, name: 'Dornige Lichtung', theme: 'nature', desc: 'Ein Rudel verteidigt sein Revier.',
    enemies: [
      { id: 'nature_wolf', level: 1, mod: { hp: 0.03, atk: 0.15 } },
      { id: 'nature_greif', level: 1, mod: { hp: 0.03, atk: 0.15 } },
      { id: 'nature_wyrm', level: 1, mod: { hp: 0.03, atk: 0.15 } }
    ],
    gold: 30, firstClearBonus: 40, unlockCreature: 'fire_greif',
  },
  {
    id: 3, name: 'Flussfurt', theme: 'water', desc: 'Wasserkreaturen bewachen die Überquerung.',
    enemies: [
      { id: 'water_wolf', level: 1, mod: { hp: 0.06, atk: 0.3 } },
      { id: 'water_greif', level: 1, mod: { hp: 0.06, atk: 0.3 } },
      { id: 'water_wyrm', level: 1, mod: { hp: 0.06, atk: 0.3 } }
    ],
    gold: 35, firstClearBonus: 45, unlockCreature: 'water_wyrm',
  },
  {
    id: 4, name: 'Glutschlucht', theme: 'fire', desc: 'Hitze flimmert über schwarzem Fels.',
    enemies: [
      { id: 'fire_wolf', level: 1 },
      { id: 'fire_wyrm', level: 1 },
      { id: 'nature_greif', level: 1 }
    ],
    gold: 40, firstClearBonus: 50, unlockCreature: 'nature_wolf',
  },
  {
    id: 5, name: 'Versunkener Tempel', theme: 'water', desc: 'Etwas Altes wacht in der Tiefe.',
    enemies: [
      { id: 'water_golem', level: 1, mod: { hp: 0.1, atk: 0.5 } },
      { id: 'water_drache', level: 1, mod: { hp: 0.1, atk: 0.5 } },
      { id: 'water_wolf', level: 1, mod: { hp: 0.1, atk: 0.5 } }
    ],
    gold: 45, firstClearBonus: 55, unlockCreature: null, drop: true,
  },
  {
    id: 6, name: 'Sturmklippen', theme: 'storm', desc: 'Greifen kreisen über den Felsen.',
    enemies: [
      { id: 'nature_greif', level: 2, mod: { hp: 0.15, atk: 0.105 } },
      { id: 'fire_greif', level: 2, mod: { hp: 0.15, atk: 0.105 } },
      { id: 'water_greif', level: 2, mod: { hp: 0.15, atk: 0.105 } }
    ],
    gold: 50, firstClearBonus: 60, unlockCreature: null,
  },
  {
    id: 7, name: 'Tiefenmeer-Grotte', theme: 'water', desc: 'Der Tiefendrache stellt sich dir.',
    enemies: [
      { id: 'water_drache', level: 5, mod: { hp: 0.3, atk: 0.21 } },
      { id: 'water_golem', level: 5, mod: { hp: 0.3, atk: 0.21 } },
      { id: 'water_wolf', level: 5, mod: { hp: 0.3, atk: 0.21 } }
    ],
    gold: 55, firstClearBonus: 70, unlockCreature: 'water_drache',
  },
  {
    id: 8, name: 'Aschewüste', theme: 'ash', desc: 'Eine Fusions-Chimära — Vorsicht, neutral!',
    enemies: [
      { id: 'fx_chimaera_ash', level: 1 },
      { id: 'fire_drache', level: 2 },
      { id: 'nature_geist', level: 1 }
    ],
    gold: 60, firstClearBonus: 80, unlockCreature: null,
  },
  {
    id: 9, name: 'Frostgrat', theme: 'frost', desc: 'Frost-Fusionen halten den Pass.',
    enemies: [
      { id: 'fx_leviathan_frost', level: 1, item: 'steinherz', mod: { hp: 0.03, atk: 0.15 } },
      { id: 'fx_basilisk_frost', level: 2, mod: { hp: 0.03, atk: 0.15 } },
      { id: 'water_geist', level: 3, mod: { hp: 0.03, atk: 0.15 } }
    ],
    gold: 65, firstClearBonus: 90, unlockCreature: null,
  },
  {
    id: 10, name: 'Thron der Elemente', theme: 'storm', boss: true,
    desc: 'Der Phönix prüft, ob du würdig bist.',
    enemies: [
      { id: 'fire_phoenix', level: 2 },
      { id: 'fx_leviathan_steam', level: 1 },
      { id: 'fx_koloss_frost', level: 1 }
    ],
    gold: 75, firstClearBonus: 125, unlockCreature: 'fire_phoenix', drop: true,
    bossCreature: 'boss_titan',
  },

  // ===== Kapitel 2 (17.07.2026): Fusions-Ära. Ab S15 sind eigene Fusionen
  // faktisch Pflicht, S20 ist ein All-Fusion-Bosskampf. Levels per Sim.
  {
    id: 11, name: 'Glutfelder', theme: 'fire', desc: 'Glühende Schlacke, patrouillierende Golems.',
    enemies: [
      { id: 'fire_golem', level: 3, item: 'steinherz' },
      { id: 'fire_wolf', level: 3, item: 'scharfzahn' },
      { id: 'fire_geist', level: 2 }
    ],
    gold: 80, firstClearBonus: 100, unlockCreature: 'water_golem',
  },
  {
    id: 12, name: 'Sturmsee', theme: 'water', desc: 'Die See tobt — alles hier beißt.',
    enemies: [
      { id: 'water_drache', level: 5, item: 'steinherz', mod: { hp: 0.5, atk: 0.35 } },
      { id: 'water_wolf', level: 5, mod: { hp: 0.5, atk: 0.35 } },
      { id: 'water_greif', level: 5, mod: { hp: 0.5, atk: 0.35 } }
    ],
    gold: 85, firstClearBonus: 105, unlockCreature: 'nature_greif',
  },
  {
    id: 13, name: 'Dornenwald', theme: 'nature', desc: 'Der Wald selbst stellt sich dir entgegen.',
    enemies: [
      { id: 'nature_drache', level: 5, item: 'steinherz', mod: { hp: 0.06, atk: 0.3 } },
      { id: 'nature_wolf', level: 5, mod: { hp: 0.06, atk: 0.3 } },
      { id: 'nature_geist', level: 5, mod: { hp: 0.06, atk: 0.3 } }
    ],
    gold: 90, firstClearBonus: 110, unlockCreature: 'fire_wyrm',
  },
  {
    id: 14, name: 'Aschensturm', theme: 'ash', desc: 'Ein Geisterwolf jagt im Aschenregen.',
    enemies: [
      { id: 'fx_barghest_ash', level: 1 },
      { id: 'fire_drache', level: 5 },
      { id: 'fire_greif', level: 4 }
    ],
    gold: 95, firstClearBonus: 115, unlockCreature: 'nature_drache',
  },
  {
    id: 15, name: 'Eistiefe', theme: 'frost', desc: 'Unter dem Eis wartet der Basilisk.',
    enemies: [
      { id: 'fx_basilisk_frost', level: 4, mod: { hp: 0.1, atk: 0.5 } },
      { id: 'water_golem', level: 5, mod: { hp: 0.1, atk: 0.5 } },
      { id: 'water_geist', level: 5, mod: { hp: 0.1, atk: 0.5 } }
    ],
    gold: 100, firstClearBonus: 120, unlockCreature: 'fire_golem', drop: true,
  },
  {
    id: 16, name: 'Himmelspass', theme: 'storm', desc: 'Die Sphinx bewacht den Aufstieg.',
    enemies: [
      { id: 'fx_sphinx_steam', level: 1, item: 'steinherz', mod: { hp: 0.06, atk: 0.3 } },
      { id: 'nature_greif', level: 3, item: 'scharfzahn', mod: { hp: 0.06, atk: 0.3 } },
      { id: 'fire_greif', level: 3, mod: { hp: 0.06, atk: 0.3 } }
    ],
    gold: 105, firstClearBonus: 125, unlockCreature: null,
  },
  {
    id: 17, name: 'Seelenmoor', theme: 'nature', desc: 'Irrlichter führen dich vom Weg ab.',
    enemies: [
      { id: 'fx_barghest_frost', level: 1, item: 'steinherz', mod: { hp: 0.75, atk: 0.525 } },
      { id: 'nature_geist', level: 3, mod: { hp: 0.75, atk: 0.525 } },
      { id: 'nature_wolf', level: 3, mod: { hp: 0.75, atk: 0.525 } }
    ],
    gold: 110, firstClearBonus: 130, unlockCreature: null,
  },
  {
    id: 18, name: 'Obsidianfeste', theme: 'fire', desc: 'Der Koloss hält die schwarzen Tore.',
    enemies: [
      { id: 'fx_ouroboros_ash', level: 1, item: 'steinherz', mod: { hp: 0.3, atk: 0.21 } },
      { id: 'fire_wolf', level: 2, item: 'scharfzahn', mod: { hp: 0.3, atk: 0.21 } },
      { id: 'fire_drache', level: 2, item: 'titanenmark', mod: { hp: 0.3, atk: 0.21 } }
    ],
    gold: 115, firstClearBonus: 140, unlockCreature: null,
  },
  {
    id: 19, name: 'Frostthron', theme: 'frost', desc: 'Gargoyle und Ouroboros — Eis ohne Ende.',
    enemies: [
      { id: 'fx_gargoyle_frost', level: 2, mod: { hp: 0.15, atk: 0.75 } },
      { id: 'fx_ouroboros_frost', level: 1, mod: { hp: 0.15, atk: 0.75 } },
      { id: 'water_drache', level: 4, mod: { hp: 0.15, atk: 0.75 } }
    ],
    gold: 120, firstClearBonus: 150, unlockCreature: null,
  },
  {
    id: 20, name: 'Herz der Elemente', theme: 'storm', boss: true,
    desc: 'Drei Fusionen. Keine Gnade.',
    enemies: [
      { id: 'fx_seraph_steam', level: 4, item: 'steinherz' },
      { id: 'fx_leviathan_ash', level: 4, item: 'scharfzahn' },
      { id: 'fx_archon_frost', level: 4 }
    ],
    gold: 150, firstClearBonus: 200, unlockCreature: null, drop: true,
    bossCreature: 'boss_schlange',
  },
  {
    id: 21, name: 'Gletschertor', theme: 'frost', desc: 'Das Eis knackt unter jedem Schritt.',
    enemies: [
      { id: 'water_wolf', level: 5, mod: { hp: 0.5, atk: 0.35 } },
      { id: 'water_greif', level: 5, mod: { hp: 0.5, atk: 0.35 } },
      { id: 'water_wyrm', level: 5, mod: { hp: 0.5, atk: 0.35 } }
    ],
    gold: 125, firstClearBonus: 185, unlockCreature: null,
  },
  {
    id: 22, name: 'Frostkamm', theme: 'frost', desc: 'Wächter aus Stein und Eis.',
    enemies: [
      { id: 'water_golem', level: 4, item: 'steinherz', mod: { hp: 0.15, atk: 0.75 } },
      { id: 'water_geist', level: 4, item: 'scharfzahn', mod: { hp: 0.15, atk: 0.75 } },
      { id: 'water_greif', level: 4, item: 'titanenmark', mod: { hp: 0.15, atk: 0.75 } }
    ],
    gold: 130, firstClearBonus: 190, unlockCreature: 'water_greif',
  },
  {
    id: 23, name: 'Eisspalte', theme: 'frost', desc: 'Etwas windet sich in der Tiefe.',
    enemies: [
      { id: 'fx_basilisk_frost', level: 2, mod: { hp: 0.2, atk: 1 } },
      { id: 'water_drache', level: 2, mod: { hp: 0.2, atk: 1 } },
      { id: 'water_wolf', level: 2, mod: { hp: 0.2, atk: 1 } }
    ],
    gold: 135, firstClearBonus: 195, unlockCreature: null,
  },
  {
    id: 24, name: 'Erfrorene Halle', theme: 'frost', desc: 'Gargoyles bewachen den Frostthron.',
    enemies: [
      { id: 'fx_gargoyle_frost', level: 3 },
      { id: 'water_golem', level: 3 },
      { id: 'water_geist', level: 3 }
    ],
    gold: 140, firstClearBonus: 200, unlockCreature: null, drop: true,
  },
  {
    id: 25, name: 'Weiße Tiefe', theme: 'frost', desc: 'Der Ouroboros beißt sich in den Schwanz.',
    enemies: [
      { id: 'water_drache', level: 3, mod: { hp: 1, atk: 0.7 } },
      { id: 'water_wyrm', level: 3, mod: { hp: 1, atk: 0.7 } },
      { id: 'fx_ouroboros_frost', level: 3, mod: { hp: 1, atk: 0.7 } }
    ],
    gold: 145, firstClearBonus: 205, unlockCreature: 'nature_wyrm',
  },
  {
    id: 26, name: 'Nebelfjord', theme: 'frost', desc: 'Ein Leviathan zieht seine Bahn.',
    enemies: [
      { id: 'fx_leviathan_frost', level: 3, mod: { hp: 0.2, atk: 1 } },
      { id: 'water_greif', level: 3, mod: { hp: 0.2, atk: 1 } },
      { id: 'water_wolf', level: 3, mod: { hp: 0.2, atk: 1 } }
    ],
    gold: 150, firstClearBonus: 210, unlockCreature: null,
  },
  {
    id: 27, name: 'Firngrat', theme: 'frost', desc: 'Der Koloss versperrt den Pass.',
    enemies: [
      { id: 'fx_koloss_frost', level: 5, item: 'steinherz', mod: { hp: 0.06, atk: 0.3 } },
      { id: 'water_golem', level: 5, item: 'scharfzahn', mod: { hp: 0.06, atk: 0.3 } },
      { id: 'water_drache', level: 5, item: 'titanenmark', mod: { hp: 0.06, atk: 0.3 } }
    ],
    gold: 155, firstClearBonus: 215, unlockCreature: 'fire_wolf',
  },
  {
    id: 28, name: 'Herz des Eises', theme: 'frost', boss: true, desc: 'Drei Köpfe, ein Wille.',
    enemies: [
      { id: 'boss_hydra', level: 2, item: 'steinherz', mod: { hp: 0.2, atk: 1 } },
      { id: 'fx_basilisk_frost', level: 2, mod: { hp: 0.2, atk: 1 } },
      { id: 'water_geist', level: 2, mod: { hp: 0.2, atk: 1 } }
    ],
    gold: 160, firstClearBonus: 220, unlockCreature: null, drop: true,
    bossCreature: 'boss_hydra',
  },
  {
    id: 29, name: 'Sturmtor', theme: 'storm', desc: 'Greifen kreisen über dem Tor.',
    enemies: [
      { id: 'nature_greif', level: 4, item: 'steinherz', mod: { hp: 0.15, atk: 0.75 } },
      { id: 'fire_greif', level: 4, mod: { hp: 0.15, atk: 0.75 } },
      { id: 'water_greif', level: 4, mod: { hp: 0.15, atk: 0.75 } }
    ],
    gold: 165, firstClearBonus: 225, unlockCreature: null,
  },
  {
    id: 30, name: 'Windbruch', theme: 'storm', desc: 'Die Sphinx stellt ihre Frage.',
    enemies: [
      { id: 'fx_sphinx_steam', level: 5, mod: { hp: 0.5, atk: 0.35 } },
      { id: 'nature_greif', level: 5, mod: { hp: 0.5, atk: 0.35 } },
      { id: 'water_geist', level: 5, mod: { hp: 0.5, atk: 0.35 } }
    ],
    gold: 170, firstClearBonus: 230, unlockCreature: 'nature_geist',
  },
  {
    id: 31, name: 'Blitzgrat', theme: 'storm', desc: 'Der Grat singt im Sturm.',
    enemies: [
      { id: 'fire_greif', level: 4, mod: { hp: 0.3, atk: 0.21 } },
      { id: 'water_greif', level: 4, mod: { hp: 0.3, atk: 0.21 } },
      { id: 'fx_chimaera_steam', level: 4, mod: { hp: 0.3, atk: 0.21 } }
    ],
    gold: 175, firstClearBonus: 235, unlockCreature: null,
  },
  {
    id: 32, name: 'Donnerhalle', theme: 'storm', desc: 'Ein Seraph steigt aus den Wolken.',
    enemies: [
      { id: 'fx_seraph_steam', level: 4, item: 'steinherz', mod: { hp: 0.1, atk: 0.5 } },
      { id: 'nature_greif', level: 4, mod: { hp: 0.1, atk: 0.5 } },
      { id: 'fire_geist', level: 4, mod: { hp: 0.1, atk: 0.5 } }
    ],
    gold: 180, firstClearBonus: 240, unlockCreature: null, drop: true,
  },
  {
    id: 33, name: 'Wolkenmeer', theme: 'storm', desc: 'Der Leviathan schwimmt im Himmel.',
    enemies: [
      { id: 'fx_leviathan_steam', level: 4, item: 'steinherz', mod: { hp: 0.5, atk: 0.35 } },
      { id: 'water_wolf', level: 4, mod: { hp: 0.5, atk: 0.35 } },
      { id: 'water_greif', level: 4, mod: { hp: 0.5, atk: 0.35 } }
    ],
    gold: 185, firstClearBonus: 245, unlockCreature: 'water_wolf',
  },
  {
    id: 34, name: 'Orkanauge', theme: 'storm', desc: 'Im Auge ist es still — zu still.',
    enemies: [
      { id: 'fx_sphinx_steam', level: 5, mod: { hp: 0.5, atk: 0.35 } },
      { id: 'fire_greif', level: 5, mod: { hp: 0.5, atk: 0.35 } },
      { id: 'nature_greif', level: 5, mod: { hp: 0.5, atk: 0.35 } }
    ],
    gold: 190, firstClearBonus: 250, unlockCreature: null,
  },
  {
    id: 35, name: 'Gewitterfront', theme: 'storm', desc: 'Die Chimära hetzt durch den Regen.',
    enemies: [
      { id: 'fx_chimaera_steam', level: 5, mod: { hp: 0.15, atk: 0.75 } },
      { id: 'water_greif', level: 5, mod: { hp: 0.15, atk: 0.75 } },
      { id: 'fire_geist', level: 5, mod: { hp: 0.15, atk: 0.75 } }
    ],
    gold: 195, firstClearBonus: 255, unlockCreature: 'fire_geist',
  },
  {
    id: 36, name: 'Auge des Sturms', theme: 'storm', boss: true, desc: 'Aus der Tiefe steigt die Krake.',
    enemies: [
      { id: 'boss_kraken', level: 3, mod: { hp: 0.15, atk: 0.105 } },
      { id: 'fx_leviathan_steam', level: 3, mod: { hp: 0.15, atk: 0.105 } },
      { id: 'fx_sphinx_steam', level: 3, mod: { hp: 0.15, atk: 0.105 } }
    ],
    gold: 200, firstClearBonus: 260, unlockCreature: null, drop: true,
    bossCreature: 'boss_kraken',
  },
  {
    id: 37, name: 'Glutpforte', theme: 'fire', desc: 'Asche rieselt vom schwarzen Himmel.',
    enemies: [
      { id: 'fire_wolf', level: 3, mod: { hp: 0.15, atk: 0.75 } },
      { id: 'fire_wyrm', level: 3, mod: { hp: 0.15, atk: 0.75 } },
      { id: 'fire_greif', level: 3, mod: { hp: 0.15, atk: 0.75 } }
    ],
    gold: 205, firstClearBonus: 265, unlockCreature: null,
  },
  {
    id: 38, name: 'Rauchtal', theme: 'fire', desc: 'Golems glühen im Qualm.',
    enemies: [
      { id: 'fire_golem', level: 5, item: 'steinherz', mod: { hp: 0.1, atk: 0.5 } },
      { id: 'fire_drache', level: 5, mod: { hp: 0.1, atk: 0.5 } },
      { id: 'fire_geist', level: 5, mod: { hp: 0.1, atk: 0.5 } }
    ],
    gold: 210, firstClearBonus: 270, unlockCreature: 'water_phoenix',
  },
  {
    id: 39, name: 'Aschenfeld', theme: 'ash', desc: 'Ein Barghest jagt im Aschenregen.',
    enemies: [
      { id: 'fx_barghest_ash', level: 4, mod: { hp: 0.1, atk: 0.5 } },
      { id: 'fire_wolf', level: 4, mod: { hp: 0.1, atk: 0.5 } },
      { id: 'fire_wyrm', level: 4, mod: { hp: 0.1, atk: 0.5 } }
    ],
    gold: 215, firstClearBonus: 275, unlockCreature: null,
  },
  {
    id: 40, name: 'Schwelende Ruine', theme: 'ash', desc: 'Die Chimära lauert im Rauch.',
    enemies: [
      { id: 'fx_chimaera_ash', level: 5, item: 'steinherz', mod: { hp: 0.06, atk: 0.3 } },
      { id: 'fire_golem', level: 5, item: 'scharfzahn', mod: { hp: 0.06, atk: 0.3 } },
      { id: 'fire_drache', level: 5, mod: { hp: 0.06, atk: 0.3 } }
    ],
    gold: 220, firstClearBonus: 280, unlockCreature: null, drop: true,
  },
  {
    id: 41, name: 'Magmastrom', theme: 'fire', desc: 'Der Koloss watet durch flüssiges Feuer.',
    enemies: [
      { id: 'fx_koloss_ash', level: 4, mod: { hp: 0.1, atk: 0.5 } },
      { id: 'fire_wolf', level: 4, mod: { hp: 0.1, atk: 0.5 } },
      { id: 'fire_geist', level: 4, mod: { hp: 0.1, atk: 0.5 } }
    ],
    gold: 225, firstClearBonus: 285, unlockCreature: 'nature_phoenix',
  },
  {
    id: 42, name: 'Feuermeer', theme: 'fire', desc: 'Der Ouroboros brennt und heilt zugleich.',
    enemies: [
      { id: 'fx_ouroboros_ash', level: 5, item: 'steinherz', mod: { hp: 0.1, atk: 0.5 } },
      { id: 'fire_drache', level: 5, mod: { hp: 0.1, atk: 0.5 } },
      { id: 'fire_wyrm', level: 5, mod: { hp: 0.1, atk: 0.5 } }
    ],
    gold: 230, firstClearBonus: 290, unlockCreature: null,
  },
  {
    id: 43, name: 'Verkohlter Thron', theme: 'ash', desc: 'Ein Seraph aus Glut und Asche.',
    enemies: [
      { id: 'fx_seraph_ash', level: 5, item: 'steinherz', mod: { hp: 0.06, atk: 0.3 } },
      { id: 'fire_golem', level: 5, item: 'scharfzahn', mod: { hp: 0.06, atk: 0.3 } },
      { id: 'fire_greif', level: 5, item: 'titanenmark', mod: { hp: 0.06, atk: 0.3 } }
    ],
    gold: 235, firstClearBonus: 295, unlockCreature: null,
  },
  {
    id: 44, name: 'Schlund der Asche', theme: 'ash', boss: true, desc: 'Der Moloch erwacht.',
    enemies: [
      { id: 'boss_moloch', level: 2, mod: { hp: 0.2, atk: 1 } },
      { id: 'fx_koloss_ash', level: 2, mod: { hp: 0.2, atk: 1 } },
      { id: 'fx_barghest_ash', level: 2, mod: { hp: 0.2, atk: 1 } }
    ],
    gold: 240, firstClearBonus: 300, unlockCreature: null, drop: true,
    bossCreature: 'boss_moloch',
  },
];
