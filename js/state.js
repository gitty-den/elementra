// state.js — Spielzustand, Speicherstand (localStorage), Level- & Fusions-Logik.

// Nachschlagetabellen aus den Rohdaten (data.js).
const Elements = {};
TYPES_DATA.elements.forEach(e => Elements[e.id] = e);
const Creatures = {};
CREATURES_DATA.creatures.forEach(c => Creatures[c.id] = c);
const Abilities = CREATURES_DATA.abilities;

const MAX_LEVEL = 5;                 // Prototyp-Cap; Fusion verlangt Max-Level.
const LEVEL_STAT_BONUS = 0.10;       // +10 % Basiswerte pro Level über 1.
// Speicherstand liegt pro Profil (profiles.js, currentSaveKey()). Ohne aktives
// Profil wird nur im Arbeitsspeicher gespielt — persist() schreibt dann nichts.

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
  // Endboss-Kreaturen (`unique`) zählen NICHT zur Basis-Sammlung — sonst stünde
  // dort 23/21. Sie sind Trophäen, kein Sammelziel.
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

// ---------- Kurzbeschreibung der Fähigkeiten (generiert, 20.07.2026) ----------
// Wird aus effect/params/trigger der JSON-Daten gebaut, nicht handgepflegt —
// Balancing-Änderungen an data/*.json ziehen automatisch mit.
// Stil: extrem knapp, Teile mit „ · " getrennt (UI-Grundsatz: so wenig Text wie möglich).

const abPct = v => Math.round(v * 100) + '%';

// Zielgruppe als kurzes Stichwort.
const AbilityTargetShort = {
  enemyHighestHp:      'meiste LP',
  enemyLowestHp:       'wenigste LP',
  enemyBackline:       'Rückreihe',
  allEnemies:          'alle Gegner',
  allAllies:           'Team',
  fallenAllyElseLowest: '',
};

// Auslöser des Passivs als Energie-Zeile.
const AbilityTriggerShort = { onAttack: 'je Angriff', onHit: 'je Treffer', perSecond: 'pro Sek.' };

// Effekt-Kern; p = ability.params.
function abilityEffectShort(effect, p) {
  switch (effect) {
    case 'atkUpWhenHurt':   return `+${abPct(p.atkPer25MissingHp)} ANG je 25% fehlende LP`;
    case 'damageReduction': return `−${p.flatReduce} Schaden pro Treffer`;
    case 'lifesteal':       return `${abPct(p.pctOfDamage)} Lebensraub`;
    case 'applyPoison':     return `Gift ${abPct(p.stackPct)} ANG/s, max. ${p.maxStacks} Stapel`;
    case 'elementalNuke':   return `${abPct(p.atkMultiplier)} ANG`;
    case 'multiHit':        return `${p.hits}× ${abPct(p.atkMultiplier)} ANG`;
    case 'hitPlusBleed':    return `${abPct(p.atkMultiplier)} ANG · Blutung ${p.bleedTicks}×${abPct(p.bleedPct)}`;
    case 'teamShield':      return `Schild ${abPct(p.shieldPctMaxHp)} LP` + (p.taunt ? ` · Spott ${p.durationSec}s` : '');
    case 'teamHeal':        return `Heilt ${abPct(p.healPctMaxHp)} LP`;
    case 'spreadDotDebuff': return `Gift ${abPct(p.dotPct)}/s ${p.durationSec}s · VER −${abPct(p.defDown)}`;
    case 'reviveOrHeal':    return `Belebt mit ${abPct(p.reviveHpPct)} LP, sonst Heilung ${abPct(p.healPctMaxHp)}`;
    default:                return '';
  }
}

// Fertige Kurzzeile für eine Fähigkeits-ID (Passiv oder Ult).
function abilityShort(abId) {
  const a = Abilities[abId];
  if (!a) return '';
  const parts = [];
  const core = abilityEffectShort(a.effect, a.params || {});
  const tgt = AbilityTargetShort[a.target];
  // Gruppenziele lesen sich vorangestellt besser („Team · Heilt 30 % LP"),
  // Einzelziele hinten dran („300 % ANG · meiste LP").
  const groupFirst = a.target === 'allAllies' || a.target === 'allEnemies';
  if (tgt && groupFirst) parts.push(tgt);
  if (core) parts.push(core);
  if (tgt && !groupFirst) parts.push(tgt);
  if (a.energyGain) parts.push(`+${a.energyGain} EN ${AbilityTriggerShort[a.trigger] || ''}`.trim());
  return parts.join(' · ');
}

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
    // Arena-Team (Runde 9): eigenständige Aufstellung fürs PVP. Es greift auf
    // DIESELBE Sammlung zu — nur die drei Plätze sind unabhängig von der Kampagne.
    arenaTeam: ['fire_drache', 'nature_golem', 'water_geist'],
    stages: {},            // stageId -> Sterne (1–3)
    milestones: {},        // milestoneId -> true (abgeholt)
    lastLogin: null,       // 'YYYY-MM-DD' des letzten Tages-Bonus
    settings: { sfxVol: 1, musicVol: 1 }, // Regler 0–1 statt An/Aus (17.07.2026)
    bp: defaultBP(),       // Battlepass (Season, XP, Quests, abgeholte Stufen)
    items: {},             // itemId -> Anzahl im Besitz (items.js)
    equipped: {},          // creatureId -> itemId (EIN Slot je Kreatur)
    shop: null,            // { day, offers[], bought{} } — lazy in shopState()
    ascension: 0,          // gewählte Aufstiegsstufe (0 = normale Kampagne)
    ascHigh: 0,            // höchste Stufe, auf der der Endboss fiel
    ascStages: {},         // stageId -> höchste dort geschaffte Aufstiegsstufe
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
    const key = currentSaveKey();
    const raw = key && localStorage.getItem(key);
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
      // Migration Arena-Team (Runde 9): fehlt es, startet es als Kopie des
      // Kampagnen-Teams; verlorene Kreaturen (Fusion) fallen raus.
      if (!Array.isArray(s.arenaTeam)) s.arenaTeam = s.team.slice();
      s.arenaTeam = s.arenaTeam.filter(id => s.collection[id]);
      const spareA = Object.keys(s.collection).filter(id => !s.arenaTeam.includes(id));
      while (s.arenaTeam.length < 3 && spareA.length) s.arenaTeam.push(spareA.shift());
      if (!Object.keys(s.collection).length) return defaultSave();
      // Migration: Lautstärke-Regler statt An/Aus; Logo fest auf Element-Ring.
      if (typeof s.settings.sfxVol !== 'number') s.settings.sfxVol = s.settings.sfx === false ? 0 : 1;
      if (typeof s.settings.musicVol !== 'number') s.settings.musicVol = s.settings.music === false ? 0 : 1;
      delete s.settings.sfx; delete s.settings.music; delete s.settings.emblem;
      // Migration Kampf-XP: alten Einträgen xp-Feld geben.
      Object.values(s.collection).forEach(e => { if (typeof e.xp !== 'number') e.xp = 0; });
      // Migration Items (21.07.): Felder anlegen, Ausrüstung an verlorenen
      // Kreaturen/Items lösen (z. B. nach Fusion oder entferntem Item).
      if (!s.items) s.items = {};
      if (!s.equipped) s.equipped = {};
      // Migration Aufstieg (21.07.)
      if (typeof s.ascension !== 'number') s.ascension = 0;
      if (typeof s.ascHigh !== 'number') s.ascHigh = 0;
      if (!s.ascStages) s.ascStages = {};
      Object.keys(s.equipped).forEach(cid => {
        if (!s.collection[cid] || typeof Items === 'undefined' || !Items[s.equipped[cid]]) delete s.equipped[cid];
      });
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
  const key = currentSaveKey();
  if (!key) return;                       // noch kein Profil gewählt
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
  delete Save.equipped[cidA];   // Items der Zutaten wandern zurück ins Inventar
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
  // Aufstieg: Erstsieg AUF DIESER Stufe zählt wieder wie ein Erstsieg (ascension.js).
  const ascFirst = typeof ascFirstClear === 'function' && ascFirstClear(stage.id);
  if (typeof markAscClear === 'function') markAscClear(stage.id);
  // Ökonomie-Bremse (verschärft Runde 9): Wiederholungen bringen ein Viertel.
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
  // Auch auf höheren Aufstiegsstufen gibt es sie nur, wenn man sie noch nicht hat.
  if (stage.bossCreature && Creatures[stage.bossCreature] && !Save.collection[stage.bossCreature]) {
    Save.collection[stage.bossCreature] = { level: 1, xp: 0 };
    bossUnlocked = stage.bossCreature;
  }
  Save.gold += gold;
  persist();
  return { gold, unlocked, bossUnlocked, first, ascFirst };
}
