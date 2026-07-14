// battle.js — Echtzeit-Kampf-Engine (3 vs 3).
// Tick-basiert über update(dt); UI hängt sich per battle.on(event => …) an.
// Alle Zahlenwerte kommen aus creatures.json/types.json (siehe data.js).

const ATTACK_INTERVAL_BASE = 2400;   // ms; sinkt mit Tempo (spd).
const ATTACK_INTERVAL_MIN = 700;
const DEF_MITIGATION = 0.4;          // Schaden = ANG·Mult − VER·0.4
const ENEMY_ULTI_DELAY = 400;        // KI zündet Ulti kurz nach voller Energie.
const SUDDEN_DEATH_AT = 120000;      // ab 2 min steigt aller Schaden (verhindert Heiler-Patt)

// Globaler Schadens-Multiplikator: 1× bis 2 min, danach linear bis 3× (Minute 4+).
function suddenDeathMult(battle) {
  if (battle.time <= SUDDEN_DEATH_AT) return 1;
  return 1 + Math.min(2, (battle.time - SUDDEN_DEATH_AT) / 60000);
}

function elementMult(attEl, defEl) {
  const a = Elements[attEl], d = Elements[defEl];
  if (a.neutral || d.neutral) return TYPES_DATA.multipliers.neutral;
  if (a.strongVs === defEl) return TYPES_DATA.multipliers.advantage;
  if (a.weakVs === defEl) return TYPES_DATA.multipliers.disadvantage;
  return TYPES_DATA.multipliers.neutral;
}

let _unitUid = 0;

function createUnit(cid, level, side, slot) {
  const c = Creatures[cid];
  const stats = statsAtLevel(c, level);
  return {
    uid: 'u' + (++_unitUid),
    cid, c, side, slot, level, stats,
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
    perSecondAcc: 0,
    ultiPlannedAt: null,     // KI-Verzögerung
  };
}

function createBattle(allyDefs, enemyDefs) {
  const battle = {
    time: 0,
    over: false, winner: null,
    allies: allyDefs.map((d, i) => createUnit(d.id, d.level, 'ally', i)),
    enemies: enemyDefs.map((d, i) => createUnit(d.id, d.level, 'enemy', i)),
    autoUlti: false,
    listeners: [],
    on(fn) { this.listeners.push(fn); },
    emit(type, data) { this.listeners.forEach(fn => fn(type, data)); },
  };
  // Erste Angriffe staffeln, damit nicht alles gleichzeitig zuschlägt.
  [...battle.allies, ...battle.enemies].forEach(u => {
    u.nextAttackAt = attackInterval(u) * (0.35 + u.slot * 0.18);
  });
  return battle;
}

function attackInterval(u) {
  return Math.max(ATTACK_INTERVAL_MIN, ATTACK_INTERVAL_BASE - u.stats.spd * 50);
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
  u.energy = Math.min(100, u.energy + amount);
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
      u.nextAttackAt = battle.time + attackInterval(u);
      doAttack(battle, u);
      if (battle.over) return;
    }
  }
}
