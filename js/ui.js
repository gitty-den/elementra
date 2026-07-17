// ui.js — Screens, Navigation, Kampf-Darstellung, Overlays.
// Screens: map (Kampagne), collection (Sammlung), fusion. Kampf läuft als Fullscreen-Modus.

const $ = sel => document.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};

let currentScreen = 'menu';
let B = null; // laufender Kampf: { battle, stage, raf, speed, unitEls }

// ---------- Grundgerüst ----------

function updateGoldDisplay() {
  $('#gold-display').textContent = Save.gold.toLocaleString('de-DE');
}

function showScreen(name) {
  currentScreen = name;
  // Hauptmenü ist die Landingpage: keine Topbar, kein Zurück; Subscreens
  // haben den Zurück-Pfeil in der Topbar (Hub-and-Spoke statt Bottom-Nav).
  document.body.classList.toggle('in-menu', name === 'menu');
  const s = $('#screen');
  s.innerHTML = '';
  s.scrollTop = 0;
  if (name === 'menu') renderMenu(s);
  else if (name === 'map') renderMap(s);
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
// Horizontaler Zickzack-Pfad (Stage 1 links), Medaillons mit Theme-Icons statt
// Nummern — sprachunabhängig, Details erst im Team-Select (UI-Grundsätze 17.07.).

const MAP_NODE_SPACING_X = 136;
const MAP_WORLD_H = 440; // logische Höhe in px (vertikal zentriert)

// Theme -> Pixel-Icon auf dem Medaillon; Glow-Farbe für den Knoten.
const MapThemeIcon = { fire: 'fire', nature: 'nature', water: 'water', storm: 'bolt', ash: 'ash', frost: 'frost' };
const MapThemeGlow = { fire: '#ff7a3c', nature: '#7dff8a', water: '#5ab8ff', storm: '#b18aff', ash: '#e0965a', frost: '#a8e8ff' };

function renderMap(root) {
  const wrap = el('div', 'map-screen');
  const width = STAGES.length * MAP_NODE_SPACING_X + 190;
  const world = el('div', 'map-world');
  world.style.width = width + 'px';
  world.style.height = MAP_WORLD_H + 'px';

  const pos = STAGES.map((s, i) => ({
    x: 80 + i * MAP_NODE_SPACING_X,
    y: MAP_WORLD_H * (i % 2 === 0 ? 0.62 : 0.3),
  }));
  const pts = pos.map(p => ({ x: p.x, y: p.y + 34 }));
  world.innerHTML = `<img class="map-trail pixel-sprite" src="${mapTrailURI(pts, width, MAP_WORLD_H)}" alt="" draggable="false">`;
  world.style.backgroundImage = `url(${starTileURI()})`;

  const current = highestClearedStage() + 1;
  STAGES.forEach((stage, i) => {
    const cleared = Save.stages[stage.id] || 0;
    const unlocked = stageUnlocked(stage.id);
    const node = el('div', `map-node ${cleared ? 'cleared' : ''} ${unlocked ? '' : 'locked'} ${stage.id === current ? 'current' : ''}`);
    node.style.left = pos[i].x + 'px';
    node.style.top = pos[i].y + 'px';
    node.style.setProperty('--theme-glow', MapThemeGlow[stage.theme] || '#b18aff');
    node.innerHTML = `
      <div class="node-medal"><span>${unlocked ? iconArt(MapThemeIcon[stage.theme] || 'bolt', 30) : iconArt('lock', 22)}</span></div>
      <div class="node-stars">${starsHTML(cleared)}</div>
      ${stage.unlockCreature && !Save.stages[stage.id] && unlocked ? `<div class="node-egg">${iconArt('egg', 20)}</div>` : ''}`;
    if (unlocked) node.onclick = () => { Sfx.click(); openTeamSelect(stage); };
    world.appendChild(node);
  });

  wrap.appendChild(world);
  root.appendChild(wrap);
  // Aktuelle Stage in die Bildmitte scrollen
  wrap.scrollLeft = Math.max(0, 80 + (current - 1) * MAP_NODE_SPACING_X - wrap.clientWidth / 2);
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

  // Kein Zurück/Aufgeben im Kampf — raus geht es erst über das Ergebnis-Overlay.
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
    <div class="unit-plate">
      <span class="unit-lvl">${u.level}</span>
      <div class="unit-plate-bars">
        <div class="bar hp-bar"><div class="fill hp-fill"></div><div class="fill shield-fill"></div></div>
        <div class="bar energy-bar"><div class="fill energy-fill"></div></div>
      </div>
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
      Sfx.hit(d.attacker.c.element);
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

// Ein kurzer Tipp pro Niederlage (rotierend) statt Textwand; Pixel-Icons statt Emoji.
const DEFEAT_TIPS = [
  () => `${iconArt('coin', 15)} Level dein Team mit Gold auf — jedes Level bringt +10&nbsp;%.`,
  () => `Elemente kontern: ${iconArt('fire', 15)} schlägt ${iconArt('nature', 15)},
         ${iconArt('nature', 15)} schlägt ${iconArt('water', 15)},
         ${iconArt('water', 15)} schlägt ${iconArt('fire', 15)}.`,
  () => `${iconArt('sword', 15)} Drei Angreifer schlagen jeden Heiler — bau dein Team um.`,
  () => `Die vorderste Kreatur wird zuerst angegriffen — stell deinen Tank nach vorn.`,
];
let defeatTipIdx = Math.floor(Math.random() * DEFEAT_TIPS.length);

function nextDefeatTip() {
  return DEFEAT_TIPS[defeatTipIdx++ % DEFEAT_TIPS.length]();
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
        <p class="defeat-tip">${nextDefeatTip()}</p>
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
  // Fusions-Archetypen ohne Besitz als Silhouetten (Element-neutral dargestellt).
  const missingFx = FUSIONS_DATA.fusionArchetypes.filter(f =>
    !owned.some(id => Creatures[id].fusion && Creatures[id].archetype === f.id));
  if (missingFx.length) {
    wrap.appendChild(el('div', 'coll-sub', `Fusionen — noch nicht erweckt (${missingFx.length})`));
    const g3 = el('div', 'coll-grid');
    g3.innerHTML = missingFx.map(f => silhouetteCardHTML('fx_' + f.id + '_steam')).join('');
    wrap.appendChild(g3);
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
            ? `<button class="btn btn-max" disabled>✦ ${c.fusion ? 'Maximalstufe' : 'Bereit zur Fusion'}</button>`
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

// Freie Auswahl: zwei Basis-Kreaturen VERSCHIEDENER Archetypen (Max-Level) →
// Fusions-Archetyp; das Element ergibt sich aus den Eltern.

let fusionPick = [];

function renderFusion(root) {
  const wrap = el('div', 'fusion-screen');
  wrap.appendChild(el('div', 'screen-title', 'Fusion'));

  fusionPick = fusionPick.filter(id => Save.collection[id]);
  const [a, b] = fusionPick;
  const outId = a && b ? fusionResult(a, b) : null;
  const ready = a && b ? fusionReady(a, b) : null;

  // Picker-Zeile: zwei Slots + Ergebnis-Vorschau
  const slotHTML = [0, 1].map(i => {
    const id = fusionPick[i];
    return `<div class="fx-slot ${id ? 'filled' : ''}" data-slot="${i}">
      ${id ? creatureCardHTML(id, Save.collection[id].level) : '<div class="ts-slot-empty">＋</div>'}
    </div>`;
  }).join('<div class="fusion-plus">+</div>');

  let resultHTML;
  if (outId && Save.collection[outId]) {
    resultHTML = creatureCardHTML(outId, Save.collection[outId].level)
      + '<div class="fusion-req"><span class="fusion-ok">bereits erwacht</span></div>';
  } else if (outId) {
    resultHTML = silhouetteCardHTML(outId)
      + `<div class="fusion-req">${Creatures[outId].name}</div>`;
  } else if (a && b) {
    resultHTML = `<div class="fusion-nores">${iconArt('lock', 22)}<div>Kein Rezept für dieses Paar</div></div>`;
  } else {
    resultHTML = `<div class="fusion-nores">${iconArt('orb', 22)}<div>Wähle zwei Kreaturen</div></div>`;
  }

  const row = el('div', 'fusion-row fx-picker' + (ready ? ' ready' : ''));
  row.innerHTML = `${slotHTML}<div class="fusion-arrow">➜</div>
    <div class="fusion-output">${resultHTML}
      ${ready ? '<button class="btn btn-primary btn-sm btn-fuse">Fusionieren</button>' : ''}
    </div>`;
  wrap.appendChild(row);

  // Legende: Archetyp-Paar + Element-Kombinatorik, ein Satz Regeln.
  const combos = [['fire', 'water', 'steam'], ['fire', 'nature', 'ash'], ['nature', 'water', 'frost']];
  wrap.appendChild(el('div', 'fusion-legend', combos.map(([x, y, out]) => `
    <div class="fl-chip">${iconArt(x, 16)}<b>+</b>${iconArt(y, 16)}<b>=</b>${iconArt(out, 16)}</div>`).join('')));
  wrap.appendChild(el('div', 'fusion-hint',
    'Zwei verschiedene Archetypen, beide auf Max-Level — beide werden verbraucht!'));

  // Kandidaten: Basis-Kreaturen im Besitz (Fusions-Kreaturen sind Endstufe).
  const cands = ownedIds().filter(id => !Creatures[id].fusion).sort((x, y) =>
    (Save.collection[y].level - Save.collection[x].level) ||
    Creatures[x].name.localeCompare(Creatures[y].name));
  const grid = el('div', 'ts-grid fx-grid');
  grid.innerHTML = cands.map(id => {
    const lvl = Save.collection[id].level;
    const maxed = lvl >= MAX_LEVEL;
    return `<div class="fx-cand ${maxed ? '' : 'notmax'}">
      ${creatureCardHTML(id, lvl, { cls: fusionPick.includes(id) ? 'picked' : '' })}
      ${maxed ? '' : levelPipsHTML(lvl)}
    </div>`;
  }).join('');
  wrap.appendChild(grid);

  // Noch nicht erweckte Fusions-Archetypen als Silhouetten-Teaser.
  const missingFx = FUSIONS_DATA.fusionArchetypes.filter(f =>
    !ownedIds().some(id => Creatures[id].fusion && Creatures[id].archetype === f.id));
  if (missingFx.length) {
    wrap.appendChild(el('div', 'coll-sub', `Noch nicht erweckt (${missingFx.length})`));
    const g = el('div', 'coll-grid');
    g.innerHTML = missingFx.map(f => silhouetteCardHTML('fx_' + f.id + '_steam')).join('');
    wrap.appendChild(g);
  }

  root.appendChild(wrap);

  row.querySelectorAll('.fx-slot').forEach(s => s.onclick = () => {
    const i = +s.dataset.slot;
    if (fusionPick[i] !== undefined) { fusionPick.splice(i, 1); Sfx.click(); showScreen('fusion'); }
  });
  const fuseBtn = row.querySelector('.btn-fuse');
  if (fuseBtn) fuseBtn.onclick = () => { Sfx.click(); playFusion(fusionPick[0], fusionPick[1]); };
  grid.querySelectorAll('.ccard').forEach(card => card.onclick = () => {
    const id = card.dataset.cid;
    if (fusionPick.includes(id)) fusionPick = fusionPick.filter(x => x !== id);
    else if (fusionPick.length < 2) fusionPick.push(id);
    Sfx.click();
    showScreen('fusion');
  });
}

function playFusion(cidA, cidB) {
  const outId = fusionReady(cidA, cidB);
  if (!outId) return;
  const a = Creatures[cidA], b = Creatures[cidB], out = Creatures[outId];
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
    fuseCreatures(cidA, cidB);
    fusionPick = [];
    ov.querySelector('.fa-stage').classList.add('reveal');
    const elInfo = Elements[out.element];
    ov.querySelector('.fa-label').innerHTML =
      `<b>${out.name}</b> ist erwacht!<br><span class="fa-sub">${RarityInfo[out.rarity].name} · ${elInfo.name}${elInfo.neutral ? ' · neutral gegen alle Elemente' : ''}</span>`;
    const btn = el('button', 'btn btn-primary', 'Fantastisch!');
    btn.onclick = () => { Sfx.click(); closeOverlay(); showScreen('fusion'); updateGoldDisplay(); };
    ov.querySelector('.fusion-anim').appendChild(btn);
    Sfx.win();
  }, 1900);
}

// ---------- Hauptmenü (Landingpage): Lager-Szene mit dem aktiven Team ----------

// Positionen der Team-Kreaturen ums Lagerfeuer (Prozent, x = Mitte).
const MENU_CAMP_POS = [
  { x: 26, y: 58, flip: false },
  { x: 74, y: 56, flip: true },
  { x: 50, y: 45, flip: false },
];

function renderMenu(root) {
  const team = Save.team.filter(id => Save.collection[id]).slice(0, 3);
  const camp = team.map((id, i) => {
    const p = MENU_CAMP_POS[i];
    return `<div class="menu-creature ${p.flip ? 'flip' : ''}"
      style="left:${p.x}%; top:${p.y}%; --bob-delay:${(i * 0.6).toFixed(1)}s">
      ${creatureArt(Creatures[id])}</div>`;
  }).join('');
  const wrap = el('div', 'menu-screen');
  wrap.innerHTML = `
    <div class="menu-bg">${sceneArt('nature')}</div>
    <div class="menu-camp">
      <div class="camp-glow"></div>
      ${camp}
      <div class="camp-fire">${campfireArt()}</div>
    </div>
    <div class="menu-content">
      <div class="menu-emblem">${emblemArt()}</div>
      <div class="title-logo menu-logo">ELEMENTRA</div>
      <div class="title-tag">Sammle. Fusioniere. Herrsche.</div>
      <div class="menu-grid">
        <button class="menu-tile primary" data-goto="map">${iconArt('map', 36)}<span>Kampagne</span></button>
        <button class="menu-tile" data-goto="collection">${iconArt('book', 36)}<span>Sammlung</span></button>
        <button class="menu-tile" data-goto="fusion">${iconArt('orb', 36)}<span>Fusion</span></button>
        <button class="menu-tile" id="menu-settings">${iconArt('gear', 36)}<span>Optionen</span></button>
      </div>
    </div>`;
  root.appendChild(wrap);
  wrap.querySelectorAll('[data-goto]').forEach(b =>
    b.onclick = () => { Sfx.click(); showScreen(b.dataset.goto); });
  wrap.querySelector('#menu-settings').onclick = () => { Sfx.click(); openSettings(); };
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
      showScreen('menu');
    }
  };
  ov.querySelector('#set-close').onclick = () => { Sfx.click(); closeOverlay(); };
}

// ---------- Sprite-Galerie (alle 42 Pixel-Sprites, Debug/Design-Review) ----------

function openPixelTest() {
  const byElement = {};
  Object.values(Creatures).filter(c => !c.fusion)
    .forEach(c => (byElement[c.element] = byElement[c.element] || []).push(c));
  let sections = Object.keys(byElement).map(elId => `
    <div class="pt-row">
      <div class="pt-name" style="--rar:${Elements[elId].color}">${ElementIcons[elId] || ''} ${Elements[elId].name}</div>
      <div class="pt-gallery">
        ${byElement[elId].map(c => `
          <div class="pt-gcell"><div class="pt-art">${creatureArt(c)}</div><span>${c.name}</span></div>`).join('')}
      </div>
    </div>`).join('');
  // Fusions-Archetypen einmal je Element-Palette wären 72 Zellen — eine Reihe reicht.
  sections += `
    <div class="pt-row">
      <div class="pt-name">Fusions-Archetypen (Dampf-Palette)</div>
      <div class="pt-gallery">
        ${FUSIONS_DATA.fusionArchetypes.map(f => {
          const c = Creatures['fx_' + f.id + '_steam'];
          return `<div class="pt-gcell"><div class="pt-art">${creatureArt(c)}</div><span>${f.name}</span></div>`;
        }).join('')}
      </div>
    </div>`;
  showOverlay(`
    <div class="pixel-test">
      <h2>Sprite-Galerie</h2>
      <div class="pt-hint">21 Basis-Kreaturen (7 Archetypen × 3 Elemente) +
        12 Fusions-Archetypen, prozedural aus Char-Maps (js/pixel.js).</div>
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
