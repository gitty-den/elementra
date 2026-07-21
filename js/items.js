// items.js — Item-System (Runde 6, 21.07.2026).
// Design-Pfeiler 2: Thema kommt über KEYWORDS, nicht über neue Elemente.
// „Seeschlange mit Toxin" = Wasser + Keyword `poison`, kein Giftelement.
// EIN Slot je Kreatur (Save.equipped[creatureId] = itemId).
// Stat-Werte sind Prozent-Aufschläge auf die Level-Stats; spd ist FLACH (spd
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

// ---------- Element-Keywords (Runde 10, 21.07.2026) ----------
// KERNÄNDERUNG: Jedes Element bringt seine eigene Mechanik mit. Vorher waren
// die 21 Basis-Kreaturen nur 7 Archetypen in 3 Farben — gleiche Fähigkeiten,
// ±10 % Werte. Jetzt spielt sich fire_wolf (brennt) anders als water_wolf
// (friert ein) und nature_wolf (vergiftet), ohne einen einzigen neuen Sprite.
//
// Werte bewusst KLEIN: jede Kreatur im Spiel hat eines davon, Item-Keywords
// sind deutlich stärker und bleiben dadurch eine echte Entscheidung.
// `keyword` je Element steht in data/types.json.
const ELEMENT_KEYWORD_PARAMS = {
  burn:        { pct: 0.05, sec: 3 },              // Feuer: Brand-DoT
  poison:      { maxStacks: 3 },                   // Natur: Giftstapel (5 % ANG/s je Stapel)
  chill:       { pct: 0.15, sec: 2.5 },            // Wasser: Ziel schlägt langsamer
  energy:      { bonus: 2 },                       // Dampf: schneller zur Ulti
  thorns:      { flat: 2 },                        // Asche: Rückschlag bei Treffern
  shieldStart: { pct: 0.10, sec: 10 },             // Frost: Startschild
};

// Liefert das Keyword-Objekt einer Kreatur (aus ihrem Element) oder null.
function elementKeyword(creature) {
  const el = creature && Elements[creature.element];
  const type = el && el.keyword;
  if (!type || !ELEMENT_KEYWORD_PARAMS[type]) return null;
  return Object.assign({ type }, ELEMENT_KEYWORD_PARAMS[type]);
}

const ITEMS_DATA = [
  // --- Gewöhnlich: reine Werte ---
  { id: 'steinherz',     name: 'Steinherz',     icon: 'heart',  rarity: 'common', price: 120, stats: { hp: 0.18 } },
  { id: 'scharfzahn',    name: 'Scharfzahn',    icon: 'fang',   rarity: 'common', price: 130, stats: { atk: 0.24 } },
  { id: 'schuppenpanzer',name: 'Schuppenpanzer',icon: 'shield', rarity: 'common', price: 120, stats: { def: 0.25 } },
  { id: 'windfeder',     name: 'Windfeder',     icon: 'bolt',   rarity: 'common', price: 130, stats: { spd: 10 } },
  // --- Selten: Werte + Keyword ---
  { id: 'toxinzahn',     name: 'Toxin-Zahn',    icon: 'skull',  rarity: 'rare', price: 260,
    stats: { atk: 0.20 }, keyword: { type: 'poison', maxStacks: 8 } },
  { id: 'glutkern',      name: 'Glutkern',      icon: 'fire',   rarity: 'rare', price: 260,
    stats: { atk: 0.12 }, keyword: { type: 'burn', pct: 0.16, sec: 4 } },
  { id: 'frostsplitter', name: 'Frostsplitter', icon: 'frost',  rarity: 'rare', price: 260,
    stats: { def: 0.14 }, keyword: { type: 'chill', pct: 0.35, sec: 4 } },
  { id: 'blutkelch',     name: 'Blutkelch',     icon: 'heart',  rarity: 'rare', price: 280,
    stats: { atk: 0.12 }, keyword: { type: 'lifesteal', pct: 0.25 } },
  { id: 'dornenhaut',    name: 'Dornenhaut',    icon: 'nature', rarity: 'rare', price: 260,
    stats: { def: 0.12 }, keyword: { type: 'thorns', flat: 3 } },
  // --- Episch ---
  { id: 'energieprisma', name: 'Energieprisma', icon: 'orb',    rarity: 'epic', price: 460,
    stats: { atk: 0.12 }, keyword: { type: 'energy', bonus: 22 } },
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

// Legt an; ein bereits getragenes Item wandert zurück ins freie Inventar.
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

// Kurzzeile für die UI: „+18 % LP · Gift"
function itemStatLine(item) {
  const parts = [];
  const s = item.stats || {};
  if (s.hp)  parts.push('+' + Math.round(s.hp * 100) + ' % LP');
  if (s.atk) parts.push('+' + Math.round(s.atk * 100) + ' % ANG');
  if (s.def) parts.push('+' + Math.round(s.def * 100) + ' % VER');
  if (s.spd) parts.push('+' + s.spd + ' Tempo');
  if (item.keyword) parts.push(ITEM_KEYWORDS[item.keyword.type].name);
  return parts.join(' · ');
}

// ---------- Shop (rotiert täglich, 3 Angebote) ----------

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
// Runde 9 (21.07.2026), Nutzer-Feedback „viel zu viele Items": Ein garantierter
// Erstsieg-Drop gibt es NUR noch auf den mit `drop: true` markierten Stages —
// zwei je Kapitel (stages.js). Überall sonst bleibt eine kleine Zufallschance.
// Vorher droppte JEDER Erstsieg, also 10 Items je Kapitel.

function randomItemByRarity(rarity) {
  const pool = ITEMS_DATA.filter(i => i.rarity === rarity);
  if (!pool.length) return ITEMS_DATA[0].id;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

// Aufstiegsstufen heben die Seltenheit an — das ist der Anreiz, härter zu spielen.
function stageDropRarity(stageId) {
  const n = (+stageId || 1) + (Save.ascension || 0) * 6;
  if (n >= 15) return Math.random() < 0.45 ? 'epic' : 'rare';
  if (n >= 8)  return Math.random() < 0.35 ? 'epic' : 'rare';
  if (n >= 4)  return Math.random() < 0.5  ? 'rare' : 'common';
  return 'common';
}

// Gibt die gedroppte Item-ID zurück (bereits gutgeschrieben) oder null.
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
