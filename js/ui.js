// ui.js — Screens, Navigation, Kampf-Darstellung, Overlays.
// Screens: map (Kampagne), collection (Sammlung), fusion. Kampf läuft als Fullscreen-Modus.

const $ = sel => document.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};

let currentScreen = 'map';
let B = null; // laufender Kampf: { battle, stage, raf, speed, unitEls }

// ---------- Grundgerüst ----------

function updateGoldDisplay() {
  $('#gold-display').textContent = Save.gold.toLocaleString('de-DE');
}

function showScreen(name) {
  currentScreen = name;
  document.querySelectorAll('#nav button').forEach(b =>
    b.classList.toggle('active', b.dataset.screen === name));
  const s = $('#screen');
  s.innerHTML = '';
  s.scrollTop = 0;
  if (name === 'map') renderMap(s);
  else if (name === 'collection') renderCollection(s);
  else if (name === 'fusion') renderFusion(s);
  updateGoldDisplay();
}

function showOverlay(html, cls = '') {
  const ov = $('#overlay');
  ov.className = 'overlay-open ' + cls;
  ov.innerHTML = `<div class="overlay-box">${html}</div>`;
  return ov;
}

function closeOverlay() {
  const ov = $('#overlay');
  ov.className = '';
  ov.innerHTML = '';
}

// ---------- Wiederverwendbare Bausteine ----------

function creatureCardHTML(cid, level, opts = {}) {
  const c = Creatures[cid];
  const r = RarityInfo[c.rarity];
  const lvlTxt = level >= MAX_LEVEL ? 'MAX' : 'Lv ' + level;
  return `
    <div class="ccard rarity-${c.rarity} ${opts.cls || ''}" data-cid="${cid}">
      <div class="ccard-art">${creatureArt(c)}</div>
      <div class="ccard-el">${ElementIcons[c.element]}</div>
      ${level ? `<div class="ccard-lvl ${level >= MAX_LEVEL ? 'max' : ''}">${lvlTxt}</div>` : ''}
      <div class="ccard-name" style="--rar:${r.color}">${c.name}</div>
    </div>`;
}

function silhouetteCardHTML(cid) {
  const c = Creatures[cid];
  return `
    <div class="ccard unknown" data-cid="${cid}">
      <div class="ccard-art silhouette">${creatureArt(c, { noAura: true })}</div>
      <div class="ccard-name">???</div>
    </div>`;
}

function starsHTML(n) {
  return [1, 2, 3].map(i => `<span class="star ${i <= n ? 'on' : ''}">${iconArt('star')}</span>`).join('');
}

// ---------- Screen: Kampagnen-Weltkarte ----------
// Zickzack-Pfad von unten (Stage 1) nach oben (Stage 10), Medaillon-Knoten.

const MAP_NODE_SPACING = 122;

function renderMap(root) {
  const wrap = el('div', 'map-screen');
  const height = STAGES.length * MAP_NODE_SPACING + 140;
  const world = el('div', 'map-world');
  world.style.height = height + 'px';

  const pos = STAGES.map((s, i) => ({
    x: i % 2 === 0 ? 26 : 62,
    y: height - 120 - i * MAP_NODE_SPACING,
  }));
  // Gepixelter Pfad durch alle Knoten (Referenzbreite 390)
  const pts = pos.map(p => ({ x: p.x * 3.9 + 16, y: p.y + 36 }));
  world.innerHTML = `<img class="map-trail pixel-sprite" src="${mapTrailURI(pts, 390, height)}" alt="" draggable="false">`;
  world.style.backgroundImage = `url(${starTileURI()})`;

  const current = highestClearedStage() + 1;
  STAGES.forEach((stage, i) => {
    const cleared = Save.stages[stage.id] || 0;
    const unlocked = stageUnlocked(stage.id);
    const node = el('div', `map-node ${cleared ? 'cleared' : ''} ${unlocked ? '' : 'locked'} ${stage.id === current ? 'current' : ''}`);
    node.style.left = pos[i].x + '%';
    node.style.top = pos[i].y + 'px';
    node.innerHTML = `
      <div class="node-medal"><span>${unlocked ? stage.id : iconArt('lock', 16)}</span></div>
      <div class="node-stars">${starsHTML(cleared)}</div>
      <div class="node-label">${stage.name}</div>
      ${stage.unlockCreature && !Save.stages[stage.id] && unlocked ? `<div class="node-egg">${iconArt('egg', 18)}</div>` : ''}`;
    if (unlocked) node.onclick = () => { Sfx.click(); openTeamSelect(stage); };
    world.appendChild(node);
  });

  wrap.appendChild(world);
  root.appendChild(wrap);
  root.scrollTop = root.scrollHeight; // Start unten bei Stage 1
}

// ---------- Team-Auswahl ----------

function openTeamSelect(stage) {
  let picked = Save.team.filter(id => Save.collection[id]).slice(0, 3);
  let selSlot = -1; // markierter Slot für Positions-Tausch
  const render = () => {
    const owned = ownedIds().sort((a, b) =>
      Creatures[b].tier - Creatures[a].tier || Creatures[a].name.localeCompare(Creatures[b].name));
    const slots = [0, 1, 2].map(i => {
      const c = picked[i] ? Creatures[picked[i]] : null;
      return `
        <div class="ts-slot ${c ? 'filled' : ''} ${selSlot === i ? 'sel' : ''} ${i === 0 ? 'front' : ''}" data-slot="${i}">
          <div class="ts-slot-tag">${i === 0 ? '🛡 Vorne' : (i + 1) + '. Reihe'}</div>
          ${c
            ? `<div class="ts-slot-art">${creatureArt(c, { noAura: true })}</div><div class="ts-slot-name">${c.name}</div>`
            : '<div class="ts-slot-empty">＋</div>'}
        </div>`;
    }).join('');
    const ov = showOverlay(`
      <div class="ts-head">
        <h2>Stage ${stage.id} — ${stage.name}</h2>
        <div class="ts-desc">${stage.desc}</div>
        <div class="ts-enemies">Gegner: ${stage.enemies.map((e, i) =>
          `<span class="mini-foe ${i === 0 ? 'front' : ''}">${creatureArt(Creatures[e.id], { noAura: true })}<i>Lv${e.level}</i>${i === 0 ? '<b>Vorne</b>' : ''}</span>`).join('')}
        </div>
        <div class="ts-reward">Belohnung: ${iconArt('coin')} ${stage.gold}${stage.unlockCreature && !Save.stages[stage.id] ? ' + neue Kreatur ' + iconArt('egg') : ''}</div>
      </div>
      <div class="ts-label">Wähle dein Team (${picked.length}/3)</div>
      <div class="ts-slots">${slots}</div>
      <div class="ts-slot-hint">Die vorderste Kreatur wird zuerst angegriffen — Slots antippen zum Tauschen.</div>
      <div class="ts-grid">
        ${owned.map(id => creatureCardHTML(id, Save.collection[id].level,
          { cls: picked.includes(id) ? 'picked' : '' })).join('')}
      </div>
      <div class="ov-actions">
        <button class="btn btn-ghost" id="ts-cancel">Zurück</button>
        <button class="btn btn-primary" id="ts-start" ${picked.length === 3 ? '' : 'disabled'}>Kampf starten ${iconArt('sword')}</button>
      </div>`);
    ov.querySelectorAll('.ts-slot').forEach(slotEl => slotEl.onclick = () => {
      const i = +slotEl.dataset.slot;
      if (selSlot === -1) {
        if (!picked[i]) return;          // leerer Slot ohne Auswahl: nichts zu tun
        selSlot = i;
      } else if (selSlot === i) {
        picked.splice(i, 1);             // zweiter Tap auf gleichen Slot = entfernen
        selSlot = -1;
      } else {
        if (picked[i]) [picked[selSlot], picked[i]] = [picked[i], picked[selSlot]];
        else picked.push(picked.splice(selSlot, 1)[0]); // in leeren Slot = ans Ende
        selSlot = -1;
      }
      Sfx.click();
      render();
    });
    ov.querySelectorAll('.ts-grid .ccard').forEach(card => card.onclick = () => {
      Sfx.click();
      const id = card.dataset.cid;
      if (picked.includes(id)) picked = picked.filter(x => x !== id);
      else if (picked.length < 3) picked.push(id);
      selSlot = -1;
      render();
    });
    ov.querySelector('#ts-cancel').onclick = () => { Sfx.click(); closeOverlay(); };
    ov.querySelector('#ts-start').onclick = () => {
      Save.team = picked.slice();
      persist();
      closeOverlay();
      beginBattle(stage, picked);
    };
  };
  render();
}

// ---------- Kampf ----------

// Slot-Positionen in der Arena (Prozent; x = Mitte, y = Oberkante der Figur).
const SLOT_POS = {
  enemy: [{ x: 64, y: 22 }, { x: 84, y: 12 }, { x: 44, y: 8 }],
  ally:  [{ x: 36, y: 54 }, { x: 16, y: 66 }, { x: 56, y: 70 }],
};

function beginBattle(stage, teamIds) {
  const allyDefs = teamIds.map(id => ({ id, level: Save.collection[id].level }));
  const battle = createBattle(allyDefs, stage.enemies);
  B = { battle, stage, raf: null, speed: 1, unitEls: {}, endShown: false };
  Music.play('battle');

  document.body.classList.add('in-battle');
  const s = $('#screen');
  s.innerHTML = `
    <div class="battle-screen">
      <div class="battle-bg">${sceneArt(stage.theme)}</div>
      <div class="battle-top">
        <button class="btn btn-ghost btn-sm" id="bt-flee">✕</button>
        <div class="battle-stage-name">${stage.name}</div>
        <div class="battle-ctrl">
          <button class="btn btn-ghost btn-sm" id="bt-speed">1×</button>
          <button class="btn btn-ghost btn-sm" id="bt-auto">${iconArt('bolt')} Auto</button>
        </div>
      </div>
      <div class="arena" id="arena"></div>
      <div class="battle-hint">Leuchtende Kreatur antippen = Spezialfähigkeit!</div>
      <div id="ulti-banner"></div>
    </div>`;

  battle.enemies.forEach(u => $('#arena').appendChild(buildUnitEl(u)));
  battle.allies.forEach(u => $('#arena').appendChild(buildUnitEl(u)));

  $('#bt-flee').onclick = () => { Sfx.click(); endBattleUI(); showScreen('map'); };
  $('#bt-speed').onclick = e => {
    B.speed = B.speed === 1 ? 2 : 1;
    e.target.textContent = B.speed + '×';
    Sfx.click();
  };
  $('#bt-auto').onclick = e => {
    battle.autoUlti = !battle.autoUlti;
    e.target.classList.toggle('on', battle.autoUlti);
    if (battle.autoUlti) battle.allies.forEach(u => {
      if (u.alive && u.energy >= 100) u.ultiPlannedAt = battle.time;
    });
    Sfx.click();
  };

  battle.on(onBattleEvent);

  let last = performance.now();
  const frame = now => {
    const dt = Math.min(64, now - last);
    last = now;
    updateBattle(battle, dt * B.speed);
    renderBars();
    if (!battle.over) B.raf = requestAnimationFrame(frame);
    else renderBars();
  };
  B.raf = requestAnimationFrame(frame);
}

// Debug: tickt den laufenden Kampf synchron um ms Millisekunden (16-ms-Schritte).
// Nötig für Tests bei verstecktem Tab (rAF pausiert dann). Kein Spiel-Feature.
function debugBattleStep(ms) {
  if (!B || B.battle.over) return 'kein laufender Kampf';
  for (let t = 0; t < ms && !B.battle.over; t += 16) updateBattle(B.battle, 16);
  renderBars();
  return { time: Math.round(B.battle.time), over: B.battle.over, winner: B.battle.winner };
}

function buildUnitEl(u) {
  const p = SLOT_POS[u.side][u.slot] || SLOT_POS[u.side][0];
  const card = el('div', `unit ${u.side} arch-${u.c.archetype}`);
  card.id = u.uid;
  card.style.left = p.x + '%';
  card.style.top = p.y + '%';
  card.style.zIndex = 10 + Math.round(p.y);
  card.style.setProperty('--bob-delay', (u.slot * 0.4 + (u.side === 'enemy' ? 0.25 : 0)).toFixed(2) + 's');
  card.style.setProperty('--dir', u.side === 'enemy' ? -1 : 1); // Rotationsrichtung der Angriffs-Animation
  card.innerHTML = `
    <div class="unit-bars">
      <div class="unit-tag">${ElementIcons[u.c.element]} ${u.c.name} <b>${u.level}</b></div>
      <div class="bar hp-bar"><div class="fill hp-fill"></div><div class="fill shield-fill"></div></div>
      <div class="bar energy-bar"><div class="fill energy-fill"></div></div>
    </div>
    <div class="unit-body">
      <div class="unit-ring"></div>
      <div class="unit-shadow"></div>
      <div class="unit-art">${creatureArt(u.c)}</div>
      <div class="fx-layer"></div>
    </div>`;
  if (u.side === 'ally') {
    card.onclick = () => {
      if (B && !B.battle.over && u.alive && u.energy >= 100) {
        castActive(B.battle, u);
        renderBars();
      }
    };
  }
  B.unitEls[u.uid] = card;
  return card;
}

function renderBars() {
  if (!B) return;
  [...B.battle.allies, ...B.battle.enemies].forEach(u => {
    const card = B.unitEls[u.uid];
    if (!card) return;
    card.querySelector('.hp-fill').style.width = (u.hp / u.maxHp * 100) + '%';
    const sh = u.shield && u.shield.expiresAt > B.battle.time ? u.shield.amount : 0;
    card.querySelector('.shield-fill').style.width = Math.min(100, sh / u.maxHp * 100) + '%';
    card.querySelector('.energy-fill').style.width = u.energy + '%';
    card.classList.toggle('dead', !u.alive);
    card.classList.toggle('ulti-ready', u.alive && u.energy >= 100 && u.side === 'ally');
    card.classList.toggle('taunting', u.alive && u.tauntUntil > B.battle.time);
  });
}

function floatText(u, text, cls) {
  const card = B && B.unitEls[u.uid];
  if (!card) return;
  const fx = card.querySelector('.fx-layer');
  const n = el('span', 'float-text ' + cls, text);
  n.style.left = (20 + Math.random() * 50) + '%';
  fx.appendChild(n);
  setTimeout(() => n.remove(), 1000);
}

function spawnParticles(u, color, count = 14) {
  const card = B && B.unitEls[u.uid];
  if (!card) return;
  const fx = card.querySelector('.fx-layer');
  for (let i = 0; i < count; i++) {
    const p = el('span', 'particle');
    p.style.background = color;
    p.style.setProperty('--dx', (Math.random() * 140 - 70) + 'px');
    p.style.setProperty('--dy', (Math.random() * -120 - 20) + 'px');
    p.style.left = '50%'; p.style.top = '55%';
    fx.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
}

function onBattleEvent(type, d) {
  switch (type) {
    case 'attack': {
      const a = B.unitEls[d.attacker.uid], t = B.unitEls[d.target.uid];
      if (a && t) {
        // Ausfallschritt in Richtung des Ziels (Vektor zwischen den Figuren)
        const ar = a.getBoundingClientRect(), tr = t.getBoundingClientRect();
        const body = a.querySelector('.unit-body');
        body.style.setProperty('--tx', ((tr.left + tr.width / 2) - (ar.left + ar.width / 2)) * 0.5 + 'px');
        body.style.setProperty('--ty', ((tr.top + tr.height / 2) - (ar.top + ar.height / 2)) * 0.5 + 'px');
        a.classList.remove('attacking');
        void a.offsetWidth; // Animation neu triggern
        a.classList.add('attacking');
      }
      Sfx.hit();
      break;
    }
    case 'damage': {
      const cls = { hit: 'dmg', ulti: 'dmg ulti-dmg', poison: 'poison', bleed: 'bleed', dot: 'dot' }[d.kind] || 'dmg';
      floatText(d.target, '-' + d.amount, cls);
      if (d.elMult > 1) floatText(d.target, 'Effektiv!', 'eff');
      else if (d.elMult < 1) floatText(d.target, 'Schwach…', 'weak');
      const card = B.unitEls[d.target.uid];
      if (card) {
        card.classList.remove('hurt');
        void card.offsetWidth;
        card.classList.add('hurt');
        if (d.kind === 'hit' || d.kind === 'ulti') {
          const imp = el('span', 'impact');
          card.querySelector('.fx-layer').appendChild(imp);
          setTimeout(() => imp.remove(), 400);
          // Element-Funken des Angreifers spritzen am Ziel
          if (d.source) {
            const pal = PixelPalettes[d.source.c.element];
            spawnParticles(d.target, d.source.c.archetype === 'golem' ? '#8d8877' : pal.l,
              d.kind === 'ulti' ? 12 : 7);
          }
        }
      }
      break;
    }
    case 'heal':
      floatText(d.target, '+' + d.amount, 'healtxt');
      spawnParticles(d.target, '#7dedb2', 7);
      Sfx.heal();
      break;
    case 'absorb': floatText(d.target, '🛡 ' + d.amount, 'absorb'); break;
    case 'shieldGain': floatText(d.target, '🛡 Schild', 'absorb'); break;
    case 'poison': floatText(d.target, '☠ ×' + d.stacks, 'poison'); break;
    case 'ulti': {
      const p = { glow: PixelPalettes[d.unit.c.element].g };
      spawnParticles(d.unit, p.glow, 18);
      const scr = document.querySelector('.battle-screen');
      if (scr) {
        scr.classList.remove('shaking');
        void scr.offsetWidth;
        scr.classList.add('shaking');
      }
      const banner = $('#ulti-banner');
      if (banner) {
        banner.innerHTML = `<div class="ulti-flash" style="--glow:${p.glow}">
          <b>${d.unit.c.name}</b> — ${d.ability.name}!</div>`;
        setTimeout(() => { banner.innerHTML = ''; }, 1300);
      }
      Sfx.ulti();
      break;
    }
    case 'die':
      spawnParticles(d.unit, PixelPalettes[d.unit.c.element].d, 16);
      Sfx.die();
      break;
    case 'revive': {
      floatText(d.unit, '✨ Wiedergeburt!', 'healtxt');
      spawnParticles(d.unit, '#ffd54f', 20);
      break;
    }
    case 'end': {
      if (B.endShown) break;
      B.endShown = true;
      setTimeout(() => showBattleResult(d.winner), 900);
      break;
    }
  }
}

function endBattleUI() {
  if (B && B.raf) cancelAnimationFrame(B.raf);
  document.body.classList.remove('in-battle');
  B = null;
  Music.play('map');
}

function showBattleResult(winner) {
  if (!B) return; // Kampf wurde bereits verlassen (z. B. Aufgeben im Endmoment)
  const stage = B.stage;
  const alive = B.battle.allies.filter(u => u.alive).length;
  if (winner === 'ally') {
    Sfx.win();
    const rewards = grantStageRewards(stage, alive);
    const unlockHTML = rewards.unlocked ? `
      <div class="unlock-box">
        <div class="unlock-label">Neue Kreatur freigeschaltet!</div>
        ${creatureCardHTML(rewards.unlocked, 1, { cls: 'unlock-card' })}
      </div>` : '';
    showOverlay(`
      <div class="result victory">
        <h1>Sieg!</h1>
        <div class="result-stars">${starsHTML(alive)}</div>
        <div class="result-gold">+ ${iconArt('coin')} ${rewards.gold}</div>
        ${unlockHTML}
        <div class="ov-actions">
          <button class="btn btn-ghost" id="res-again">Nochmal</button>
          <button class="btn btn-primary" id="res-next">Weiter</button>
        </div>
      </div>`, 'result-ov');
  } else {
    Sfx.lose();
    showOverlay(`
      <div class="result defeat">
        <h1>Niederlage</h1>
        <p>Tipp: Level deine Kreaturen mit Gold auf und nutze Element-Vorteile —
        🔥 schlägt 🌿, 🌿 schlägt 💧, 💧 schlägt 🔥.<br>
        Und manchmal schlagen drei Angreifer jeden Heiler — probiere andere Team-Aufstellungen!</p>
        <div class="ov-actions">
          <button class="btn btn-ghost" id="res-next">Zur Karte</button>
          <button class="btn btn-primary" id="res-again">Nochmal</button>
        </div>
      </div>`, 'result-ov');
  }
  const stageRef = stage;
  $('#res-next').onclick = () => { Sfx.click(); closeOverlay(); endBattleUI(); showScreen('map'); };
  $('#res-again').onclick = () => { Sfx.click(); closeOverlay(); endBattleUI(); openTeamSelect(stageRef); };
}

// ---------- Screen: Sammlung ----------

function renderCollection(root) {
  const wrap = el('div', 'coll-screen');
  wrap.appendChild(el('div', 'screen-title', 'Sammlung'));
  const owned = ownedIds();
  const grid = el('div', 'coll-grid');
  grid.innerHTML = owned.map(id => creatureCardHTML(id, Save.collection[id].level)).join('');
  wrap.appendChild(grid);

  const unknown = CREATURES_DATA.creatures.filter(c => !Save.collection[c.id]);
  if (unknown.length) {
    wrap.appendChild(el('div', 'coll-sub', `Noch nicht entdeckt (${unknown.length})`));
    const g2 = el('div', 'coll-grid');
    g2.innerHTML = unknown.map(c => silhouetteCardHTML(c.id)).join('');
    wrap.appendChild(g2);
  }
  root.appendChild(wrap);
  wrap.querySelectorAll('.coll-grid .ccard:not(.unknown)').forEach(card =>
    card.onclick = () => { Sfx.click(); openCreatureDetail(card.dataset.cid); });
}

function openCreatureDetail(cid) {
  const render = () => {
    const c = Creatures[cid];
    const entry = Save.collection[cid];
    const st = statsAtLevel(c, entry.level);
    const r = RarityInfo[c.rarity];
    const role = RoleInfo[c.role];
    const isMax = entry.level >= MAX_LEVEL;
    const cost = levelUpCost(entry.level);
    const elName = Elements[c.element].name;
    const ov = showOverlay(`
      <div class="detail">
        <div class="detail-art rarity-${c.rarity}">${creatureArt(c)}</div>
        <h2>${c.name}</h2>
        <div class="detail-tags">
          <span class="tag" style="--rar:${r.color}">${r.name}</span>
          <span class="tag">${ElementIcons[c.element]} ${elName}</span>
          <span class="tag">${role.icon} ${role.name}</span>
          <span class="tag">${isMax ? 'MAX-LEVEL' : 'Level ' + entry.level}</span>
        </div>
        <div class="stat-grid">
          <div class="stat"><i>LP</i><b>${st.hp}</b></div>
          <div class="stat"><i>ANG</i><b>${st.atk}</b></div>
          <div class="stat"><i>VER</i><b>${st.def}</b></div>
          <div class="stat"><i>TMP</i><b>${st.spd}</b></div>
        </div>
        <div class="ability-box">
          <div class="ab"><b>Passiv — ${Abilities[c.passive].name}:</b> ${AbilityDescriptions[c.passive]}</div>
          <div class="ab"><b>Ulti — ${Abilities[c.active].name}:</b> ${AbilityDescriptions[c.active]}</div>
        </div>
        <div class="ov-actions">
          <button class="btn btn-ghost" id="det-close">Schließen</button>
          ${isMax
            ? '<button class="btn btn-max" disabled>✦ Bereit zur Fusion</button>'
            : `<button class="btn btn-primary" id="det-lvl" ${canLevelUp(cid) ? '' : 'disabled'}>
                 Level-Up (${iconArt('coin')} ${cost})</button>`}
        </div>
      </div>`);
    ov.querySelector('#det-close').onclick = () => { Sfx.click(); closeOverlay(); showScreen('collection'); };
    const lvlBtn = ov.querySelector('#det-lvl');
    if (lvlBtn) lvlBtn.onclick = () => {
      if (levelUp(cid)) { Sfx.heal(); updateGoldDisplay(); render(); }
    };
  };
  render();
}

// ---------- Screen: Fusion ----------

// Level-Fortschritt als 5 Pixel-Pips statt Text („Lv 3/5").
function levelPipsHTML(level) {
  return `<div class="lvl-pips">${[1, 2, 3, 4, 5].map(i =>
    `<span class="pip ${i <= level ? 'on' : ''}"></span>`).join('')}</div>`;
}

// Fundort einer Kreatur (Stage-Freischaltung) für Teaser-Rezepte.
function creatureSourceHTML(id) {
  const stage = STAGES.find(s => s.unlockCreature === id);
  return stage ? `${iconArt('map', 12)} Stage ${stage.id}` : iconArt('orb', 12);
}

function renderFusion(root) {
  const wrap = el('div', 'fusion-screen');
  wrap.appendChild(el('div', 'screen-title', 'Fusion'));

  // Visuelle Legende statt Erklärtext: Element + Element = Hybrid-Element.
  const combos = [['fire', 'water', 'steam'], ['fire', 'nature', 'ash'], ['nature', 'water', 'frost']];
  wrap.appendChild(el('div', 'fusion-legend', combos.map(([a, b, out]) => `
    <div class="fl-chip">${iconArt(a, 16)}<b>+</b>${iconArt(b, 16)}<b>=</b>${iconArt(out, 16)}</div>`).join('')));

  // Echte Rezepte (beide Zutaten im Besitz) zuerst, danach Teaser (eine Zutat fehlt).
  const owned = availableRecipes();
  const teasers = FUSIONS_DATA.recipes.filter(r =>
    !owned.includes(r) && !Save.collection[r.output] &&
    r.inputs.some(id => Save.collection[id]));
  const shown = [...owned, ...teasers.slice(0, Math.max(0, 4 - owned.length))];

  shown.forEach(recipe => {
    const isTeaser = !owned.includes(recipe);
    const ready = !isTeaser && recipeReady(recipe);
    const done = !!Save.collection[recipe.output];
    const row = el('div', `fusion-row ${ready ? 'ready' : ''} ${done ? 'done' : ''}`);
    const inputHTML = recipe.inputs.map(id => {
      const entry = Save.collection[id];
      const lvl = entry ? entry.level : 0;
      const ok = entry && lvl >= MAX_LEVEL;
      const card = entry ? creatureCardHTML(id, lvl) : silhouetteCardHTML(id);
      const req = done ? '—'
        : !entry ? `<span class="fusion-src">${creatureSourceHTML(id)}</span>`
        : ok ? `<span class="fusion-ok">✓</span>`
        : levelPipsHTML(lvl);
      return `<div class="fusion-input ${ok ? 'ok' : ''}">${card}
        <div class="fusion-req">${req}</div></div>`;
    }).join('<div class="fusion-plus">+</div>');
    row.innerHTML = `
      ${inputHTML}
      <div class="fusion-arrow">➜</div>
      <div class="fusion-output">
        ${done ? creatureCardHTML(recipe.output, Save.collection[recipe.output].level)
               : silhouetteCardHTML(recipe.output)}
        ${done ? '<div class="fusion-req"><span class="fusion-ok">✓</span></div>'
               : isTeaser ? ''
               : `<button class="btn btn-primary btn-sm btn-fuse" ${ready ? '' : 'disabled'}>Fusionieren</button>`}
      </div>`;
    if (!done && !isTeaser) {
      const btn = row.querySelector('.btn-fuse');
      btn.onclick = () => { Sfx.click(); playFusion(recipe); };
    }
    wrap.appendChild(row);
  });

  if (!shown.length) {
    // Gar keine Zutat im Besitz: ein Beispiel-Rezept als Bild zeigen.
    const demo = FUSIONS_DATA.recipes[0];
    if (demo) {
      const row = el('div', 'fusion-row teaser');
      row.innerHTML = demo.inputs.map(id => `
        <div class="fusion-input">${silhouetteCardHTML(id)}
          <div class="fusion-req"><span class="fusion-src">${creatureSourceHTML(id)}</span></div>
        </div>`).join('<div class="fusion-plus">+</div>') + `
        <div class="fusion-arrow">➜</div>
        <div class="fusion-output">${silhouetteCardHTML(demo.output)}</div>`;
      wrap.appendChild(row);
    }
  }
  root.appendChild(wrap);
}

function playFusion(recipe) {
  const [a, b] = recipe.inputs.map(id => Creatures[id]);
  const out = Creatures[recipe.output];
  const ov = showOverlay(`
    <div class="fusion-anim">
      <div class="fa-stage">
        <div class="fa-card fa-left">${creatureArt(a)}</div>
        <div class="fa-core"></div>
        <div class="fa-card fa-right">${creatureArt(b)}</div>
        <div class="fa-result">${creatureArt(out)}</div>
      </div>
      <div class="fa-label">Fusion…</div>
    </div>`, 'fusion-ov');
  Sfx.fuse();
  setTimeout(() => ov.querySelector('.fa-stage').classList.add('merge'), 100);
  setTimeout(() => {
    fuse(recipe);
    ov.querySelector('.fa-stage').classList.add('reveal');
    ov.querySelector('.fa-label').innerHTML =
      `<b>${out.name}</b> ist erwacht!<br><span class="fa-sub">${RarityInfo[out.rarity].name} · ${Elements[out.element].name} · neutral gegen alle Elemente</span>`;
    const btn = el('button', 'btn btn-primary', 'Fantastisch!');
    btn.onclick = () => { Sfx.click(); closeOverlay(); showScreen('fusion'); updateGoldDisplay(); };
    ov.querySelector('.fusion-anim').appendChild(btn);
    Sfx.win();
  }, 1900);
}

// ---------- Titelscreen ----------

function showTitle() {
  const t = el('div', 'title-screen');
  t.innerHTML = `
    <div class="title-bg">${sceneArt('storm')}</div>
    <div class="title-content">
      <div class="title-emblem">${emblemArt()}</div>
      <div class="title-logo">ELEMENTRA</div>
      <div class="title-tag">Sammle. Fusioniere. Herrsche.</div>
      <div class="title-cta">— Tippen zum Starten —</div>
    </div>`;
  document.body.appendChild(t);
  t.onclick = () => {
    Sfx.ulti(); // entsperrt zugleich den AudioContext (erste Interaktion)
    Music.play('map');
    t.classList.add('gone');
    setTimeout(() => t.remove(), 650);
  };
}

// ---------- Einstellungen ----------

function openSettings() {
  const ov = showOverlay(`
    <div class="settings">
      <h2>Einstellungen</h2>
      <button class="btn btn-ghost" id="set-sfx">Sound: ${Save.settings.sfx ? 'an 🔊' : 'aus 🔇'}</button>
      <button class="btn btn-ghost" id="set-music">Musik: ${Music.enabled ? 'an 🎵' : 'aus 🔇'}</button>
      <button class="btn btn-ghost" id="set-pixeltest">🎨 Sprite-Galerie</button>
      <button class="btn btn-ghost" id="set-logo"><span class="btn-ico">${emblemArt()}</span> Logo wählen</button>
      <button class="btn btn-danger" id="set-reset">Spielstand zurücksetzen</button>
      <div class="settings-info">Elementra — Prototyp v0.1</div>
      <div class="ov-actions">
        <button class="btn btn-primary" id="set-close">Schließen</button>
      </div>
    </div>`);
  ov.querySelector('#set-sfx').onclick = e => {
    Save.settings.sfx = !Save.settings.sfx;
    persist();
    e.target.textContent = 'Sound: ' + (Save.settings.sfx ? 'an 🔊' : 'aus 🔇');
    Sfx.click();
  };
  ov.querySelector('#set-music').onclick = e => {
    Music.toggle();
    e.target.textContent = 'Musik: ' + (Music.enabled ? 'an 🎵' : 'aus 🔇');
    Sfx.click();
  };
  ov.querySelector('#set-pixeltest').onclick = () => { Sfx.click(); openPixelTest(); };
  ov.querySelector('#set-logo').onclick = () => { Sfx.click(); openLogoChooser(); };
  ov.querySelector('#set-reset').onclick = () => {
    if (confirm('Wirklich den kompletten Spielstand löschen?')) {
      resetSave();
      closeOverlay();
      showScreen('map');
    }
  };
  ov.querySelector('#set-close').onclick = () => { Sfx.click(); closeOverlay(); };
}

// ---------- Sprite-Galerie (alle 42 Pixel-Sprites, Debug/Design-Review) ----------

function openPixelTest() {
  const byElement = {};
  Object.values(Creatures).forEach(c => (byElement[c.element] = byElement[c.element] || []).push(c));
  const sections = Object.keys(byElement).map(elId => `
    <div class="pt-row">
      <div class="pt-name" style="--rar:${Elements[elId].color}">${ElementIcons[elId] || ''} ${Elements[elId].name}</div>
      <div class="pt-gallery">
        ${byElement[elId].map(c => `
          <div class="pt-gcell"><div class="pt-art">${creatureArt(c)}</div><span>${c.name}</span></div>`).join('')}
      </div>
    </div>`).join('');
  showOverlay(`
    <div class="pixel-test">
      <h2>🎨 Sprite-Galerie</h2>
      <div class="pt-hint">Alle 42 Kreaturen: 7 Archetypen × 6 Element-Paletten,
        prozedural aus Char-Maps (js/pixel.js).</div>
      ${sections}
      <div class="ov-actions">
        <button class="btn btn-primary" id="pt-close">Schließen</button>
      </div>
    </div>`);
  $('#pt-close').onclick = () => { Sfx.click(); closeOverlay(); };
}

// ---------- Logo-Auswahl (4 Emblem-Varianten, Wahl landet in Save.settings.emblem) ----------

function openLogoChooser() {
  const current = Save.settings.emblem || 'ring';
  const cells = Object.keys(EmblemVariants).map(key => `
    <div class="logo-cell ${key === current ? 'sel' : ''}" data-key="${key}">
      <div class="pt-art">${emblemArt(key)}</div>
      <span>${EmblemVariants[key].name}</span>
    </div>`).join('');
  const ov = showOverlay(`
    <div class="logo-chooser">
      <h2>Logo wählen</h2>
      <div class="pt-hint">Wird Titel-Emblem und später App-Icon. Antippen zum Festlegen.</div>
      <div class="logo-grid">${cells}</div>
      <div class="ov-actions">
        <button class="btn btn-primary" id="lg-close">Fertig</button>
      </div>
    </div>`);
  ov.querySelectorAll('.logo-cell').forEach(cell => cell.onclick = () => {
    Sfx.click();
    Save.settings.emblem = cell.dataset.key;
    persist();
    ov.querySelectorAll('.logo-cell').forEach(c =>
      c.classList.toggle('sel', c.dataset.key === cell.dataset.key));
  });
  ov.querySelector('#lg-close').onclick = () => { Sfx.click(); closeOverlay(); openSettings(); };
}
