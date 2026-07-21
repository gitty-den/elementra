// battle.js — Echtzeit-Kampf-Engine (3 vs 3).
// Tick-basiert über update(dt); UI hängt sich per battle.on(event => …) an.
// Alle Zahlenwerte kommen aus creatures.json/types.json (siehe data.js).

const ATTACK_INTERVAL_BASE = 2400;   // ms; sinkt mit Tempo (spd).
const ATTACK_INTERVAL_MIN = 700;
const DEF_MITIGATION = 0.4;          // Schaden = ANG·Mult − VER·0.4
// Kampfdauer-Stellschraube (Runde 10): ALLE Lebenspunkte werden mit diesem
// Faktor multipliziert. Vorher dauerte ein Kampf im Median 15 s Kampfzeit, bei
// Tempo 2× also gut 7 echte Sekunden — zu kurz, als dass Heilung, Schilde oder
// Ults etwas ausrichten könnten (Teams mit zwei Geistern: 0 von 12 Siegen).
//
// Bewusst LP hoch statt Schaden runter: Verteidigung und Steinhaut sind FLACHE
// Abzüge. Bremst man den Schaden, werden sie relativ stärker und Tanks
// dominieren alles (gemessen: Golem in 24 von 60 Plätzen der besten Teams).
// Mehr LP lässt jedes Verhältnis unangetastet und streckt nur die Zeitachse.
const HP_SCALE = 1.7;
const ENEMY_ULTI_DELAY = 400;        // KI zündet Ulti kurz nach voller Energie.
const SUDDEN_DEATH_AT = 75000;       // Runde 10: Kaempfe laufen jetzt laenger, Deckel entsprechend frueher

// Globaler Schadens-Multiplikator: 1× bis 2 min, danach linear bis 3× (Minute 4+).
function suddenDeathMult(battle) {
  const at = battle.suddenDeathAt || SUDDEN_DEATH_AT;   // Modifikator 'Zeitdruck'
  if (battle.time <= at) return 1;
  return 1 + Math.min(2, (battle.time - at) / 60000);
}

// Zwei getrennte Konter-Räder (Runde 10): Feuer>Natur>Wasser>Feuer und
// Dampf>Asche>Frost>Dampf. Zwischen Basis und Hybrid gibt es keine Kante —
// `strongVs`/`weakVs` zeigen nie über das eigene Rad hinaus, das ergibt
// automatisch neutral. Vorher waren Hybride pauschal neutral, wodurch das
// Endgame die Kernmechanik verlor.
function elementMult(attEl, defEl) {
  const a = Elements[attEl];
  if (!a) return TYPES_DATA.multipliers.neutral;
  if (a.strongVs === defEl) return TYPES_DATA.multipliers.advantage;
  if (a.weakVs === defEl) return TYPES_DATA.multipliers.disadvantage;
  return TYPES_DATA.multipliers.neutral;
}

let _unitUid = 0;

// Prozent-Aufschläge auf die Werte einer fertigen Einheit (Aufstieg/Modifikatoren).
function applyStatMod(u, s) {
  if (!s) return;
  if (s.atk) u.stats.atk = Math.max(1, Math.round(u.stats.atk * (1 + s.atk)));
  if (s.def) u.stats.def = Math.max(0, Math.round(u.stats.def * (1 + s.def)));
  if (s.hp) { u.maxHp = Math.max(1, Math.round(u.maxHp * (1 + s.hp))); u.hp = u.maxHp; }
}

function createUnit(cid, level, side, slot, itemId, mod) {
  const c = Creatures[cid];
  // Item (1 Slot je Kreatur): Werte fließen direkt in die Kampf-Stats ein,
  // das Keyword wird in doAttack/dealDamage ausgewertet (items.js).
  const item = (itemId && typeof Items !== 'undefined') ? (Items[itemId] || null) : null;
  const stats = applyItemStats(statsAtLevel(c, level), item);
  // Keyword-Liste (Runde 10): erst das Element-Keyword, dann das des Items.
  // Beide wirken gleichzeitig und werden überall generisch über `u.kws`
  // ausgewertet — ein neues Keyword braucht nur einen Eintrag, keinen Sonderweg.
  const kws = [];
  if (typeof elementKeyword === 'function') {
    const ek = elementKeyword(c);
    if (ek) kws.push(ek);
  }
  if (item && item.keyword) kws.push(item.keyword);
  const u = {
    uid: 'u' + (++_unitUid),
    cid, c, side, slot, level, stats, item, kws,
    hp: Math.round(stats.hp * HP_SCALE), maxHp: Math.round(stats.hp * HP_SCALE),
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
    ultiPlannedAt: null,     // KI-Verzögerung
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
    hpScale: HP_SCALE,
    listeners: [],
    on(fn) { this.listeners.push(fn); },
    emit(type, data) { this.listeners.forEach(fn => fn(type, data)); },
  };
  // Wochen-Modifikatoren (ascension.js). Generisch über die MUTATORS-Felder —
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

  // Passiv 'teamAura' (Runde 10): Unterstützer wirken ab der ersten Sekunde,
  // nicht erst beim Ult. Vorher war das Geist-Passiv leer (`effect: 'none'`) —
  // ein Geist im Team hieß faktisch 2 gegen 3.
  [battle.allies, battle.enemies].forEach(side => {
    side.forEach(src => {
      if (!src.passive || src.passive.effect !== 'teamAura') return;
      const p = src.passive.params || {};
      side.forEach(u => applyStatMod(u, { atk: p.atk || 0, def: p.def || 0 }));
    });
  });

  // Erste Angriffe staffeln, damit nicht alles gleichzeitig zuschlägt.
  [...battle.allies, ...battle.enemies].forEach(u => {
    u.nextAttackAt = attackInterval(u) * (0.35 + u.slot * 0.18);
    // Keyword 'shieldStart': Kampfbeginn mit Schild (Frost-Element, Aegis-Siegel).
    // Mehrere Quellen addieren sich, die längere Dauer gewinnt.
    let amount = 0, until = 0;
    for (const k of u.kws) {
      if (k.type !== 'shieldStart') continue;
      amount += Math.round(u.maxHp * k.pct);
      until = Math.max(until, k.sec * 1000);
    }
    if (amount > 0) u.shield = { amount, expiresAt: until };
  });
  return battle;
}

// now optional: bei aktivem Frost-Chill schlägt die Einheit langsamer zu.
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
  // Keyword 'thorns': normaler Treffer wird flach zurückgespiegelt (kein Loop,
  // weil der Rückschlag mit kind 'thorns' läuft).
  if (kind === 'hit' && source && source.alive && target.alive) {
    const flat = target.kws.reduce((s, k) => s + (k.type === 'thorns' ? k.flat : 0), 0)
               + (target.thorns || 0);
    if (flat > 0) dealDamage(battle, null, source, flat, 'thorns');
  }
  if (target.hp <= 0) {
    // Passiv 'selfRevive' (Runde 10): einmal pro Kampf wieder aufstehen.
    // Macht den Bewahrer zur echten Rolle statt zu einem Passiv mit `none`.
    if (target.passive && target.passive.effect === 'selfRevive' && !target.selfRevived) {
      target.selfRevived = true;
      target.hp = Math.max(1, Math.round(target.maxHp * (target.passive.params.hpPct || 0.35)));
      target.poison = null; target.bleeds = []; target.dots = [];
      battle.emit('revive', { unit: target, self: true });
      return dmg;
    }
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

// Standard-Ziel: vorderster lebender Gegner; Spott (Bollwerk) übersteuert.
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
  let dealt = dealDamage(battle, u, target, effAtk(u) * mult, 'hit', mult);

  const p = u.passive;
  // Passiv 'everyNthAttackDouble' (Runde 10): jeder N-te Angriff trifft doppelt.
  // Zähler statt Zufall — battle.js muss deterministisch bleiben (Server-Prüfung).
  if (p.effect === 'everyNthAttackDouble') {
    u.atkCount = (u.atkCount || 0) + 1;
    if (u.atkCount % p.params.every === 0 && target.alive) {
      dealt += dealDamage(battle, u, target, effAtk(u) * mult * (p.params.mult || 1), 'hit', mult);
      battle.emit('doubleHit', { attacker: u, target });
    }
  }
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

  // Keywords (Element + Item, items.js): Thema über Mechanik statt über neue
  // Elemente. Beide Quellen laufen durch dieselbe Schleife.
  for (const k of u.kws) {
    if (k.type === 'lifesteal') heal(battle, u, dealt * k.pct);
    if (k.type === 'energy') gainEnergy(battle, u, k.bonus);
    if (!target.alive) continue;
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

// ---------- DoT-Ticks (Gift / Blutung / Fläche) ----------

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
    // Zeit-Passive (Geist/Phönix)
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
