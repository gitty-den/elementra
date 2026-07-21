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

const ITEMS_DATA = [
  // --- Gewöhnlich: reine Werte ---
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
// Erstsieg: garantiert ein Item (Seltenheit steigt mit der Stage).
// Wiederholung: 20 % Chance auf ein gewöhnliches/seltenes Item.

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
  if (firstClear) {
    const id = randomItemByRarity(stageDropRarity(stage.id));
    grantItem(id);
    return id;
  }
  if (Math.random() < 0.2) {
    const id = randomItemByRarity(Math.random() < 0.3 ? 'rare' : 'common');
    grantItem(id);
    return id;
  }
  return null;
}
