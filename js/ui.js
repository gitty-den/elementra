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
      <div class="ccard-art">${creatureSVG(c)}</div>
      <div class="ccard-el">${ElementIcons[c.element]}</div>
      ${level ? `<div class="ccard-lvl ${level >= MAX_LEVEL ? 'max' : ''}">${lvlTxt}</div>` : ''}
      <div class="ccard-name" style="--rar:${r.color}">${c.name}</div>
    </div>`;
}

function silhouetteCardHTML(cid) {
  const c = Creatures[cid];
  return `
    <div class="ccard unknown" data-cid="${cid}">
      <div class="ccard-art silhouette">${creatureSVG(c, { noAura: true })}</div>
      <div class="ccard-name">???</div>
    </div>`;
}

function starsHTML(n) {
  return [1, 2, 3].map(i => `<span class="star ${i <= n ? 'on' : ''}">★</span>`).join('');
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
  // Geschwungener Pfad durch alle Knoten (viewBox-Breite 390)
  const pts = pos.map(p => ({ x: p.x * 3.9 + 16, y: p.y + 36 }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const my = (pts[i - 1].y + pts[i].y) / 2;
    d += ` C ${pts[i - 1].x} ${my}, ${pts[i].x} ${my}, ${pts[i].x} ${pts[i].y}`;
  }
  world.innerHTML = `<svg class="map-trail" viewBox="0 0 390 ${height}" preserveAspectRatio="none">
    <path d="${d}" fill="none" stroke="rgba(124,108,255,0.10)" stroke-width="28" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="rgba(177,138,255,0.5)" stroke-width="4" stroke-dasharray="2 11" stroke-linecap="round"/>
  </svg>`;

  const current = highestClearedStage() + 1;
  STAGES.forEach((stage, i) => {
    const cleared = Save.stages[stage.id] || 0;
    const unlocked = stageUnlocked(stage.id);
    const node = el('div', `map-node ${cleared ? 'cleared' : ''} ${unlocked ? '' : 'locked'} ${stage.id === current ? 'current' : ''}`);
    node.style.left = pos[i].x + '%';
    node.style.top = pos[i].y + 'px';
    node.innerHTML = `
      <div class="node-medal"><span>${unlocked ? stage.id : '🔒'}</span></div>
      <div class="node-stars">${starsHTML(cleared)}</div>
      <div class="node-label">${stage.name}</div>
      ${stage.unlockCreature && !Save.stages[stage.id] && unlocked ? '<div class="node-egg">🥚</div>' : ''}`;
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
  const render = () => {
    const owned = ownedIds().sort((a, b) =>
      Creatures[b].tier - Creatures[a].tier || Creatures[a].name.localeCompare(Creatures[b].name));
    const ov = showOverlay(`
      <div class="ts-head">
        <h2>Stage ${stage.id} — ${stage.name}</h2>
        <div class="ts-desc">${stage.desc}</div>
        <div class="ts-enemies">Gegner: ${stage.enemies.map(e =>
          `<span class="mini-foe">${creatureSVG(Creatures[e.id], { noAura: true })}<i>Lv${e.level}</i></span>`).join('')}
        </div>
        <div class="ts-reward">Belohnung: 🪙 ${stage.gold}${stage.unlockCreature && !Save.stages[stage.id] ? ' + neue Kreatur 🥚' : ''}</div>
      </div>
      <div class="ts-label">Wähle dein Team (${picked.length}/3)</div>
      <div class="ts-grid">
        ${owned.map(id => creatureCardHTML(id, Save.collection[id].level,
          { cls: picked.includes(id) ? 'picked' : '' })).join('')}
      </div>
      <div class="ov-actions">
        <button class="btn btn-ghost" id="ts-cancel">Zurück</button>
        <button class="btn btn-primary" id="ts-start" ${picked.length === 3 ? '' : 'disabled'}>Kampf starten ⚔️</button>
      </div>`);
    ov.querySelectorAll('.ts-grid .ccard').forEach(card => card.onclick = () => {
      Sfx.click();
      const id = card.dataset.cid;
      if (picked.includes(id)) picked = picked.filter(x => x !== id);
      else if (picked.length < 3) picked.push(id);
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

  document.body.classList.add('in-battle');
  const s = $('#screen');
  s.innerHTML = `
    <div class="battle-screen">
      <div class="battle-bg">${sceneSVG(stage.theme)}</div>
      <div class="battle-top">
        <button class="btn btn-ghost btn-sm" id="bt-flee">✕</button>
        <div class="battle-stage-name">${stage.name}</div>
        <div class="battle-ctrl">
          <button class="btn btn-ghost btn-sm" id="bt-speed">1×</button>
          <button class="btn btn-ghost btn-sm" id="bt-auto">⚡ Auto</button>
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
  const card = el('div', `unit ${u.side}`);
  card.id = u.uid;
  card.style.left = p.x + '%';
  card.style.top = p.y + '%';
  card.style.zIndex = 10 + Math.round(p.y);
  card.style.setProperty('--bob-delay', (u.slot * 0.4 + (u.side === 'enemy' ? 0.25 : 0)).toFixed(2) + 's');
  card.innerHTML = `
    <div class="unit-bars">
      <div class="unit-tag">${ElementIcons[u.c.element]} ${u.c.name} <b>${u.level}</b></div>
      <div class="bar hp-bar"><div class="fill hp-fill"></div><div class="fill shield-fill"></div></div>
      <div class="bar energy-bar"><div class="fill energy-fill"></div></div>
    </div>
    <div class="unit-body">
      <div class="unit-ring"></div>
      <div class="unit-shadow"></div>
      <div class="unit-art">${creatureSVG(u.c)}</div>
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
        }
      }
      break;
    }
    case 'heal': floatText(d.target, '+' + d.amount, 'healtxt'); Sfx.heal(); break;
    case 'absorb': floatText(d.target, '🛡 ' + d.amount, 'absorb'); break;
    case 'shieldGain': floatText(d.target, '🛡 Schild', 'absorb'); break;
    case 'poison': floatText(d.target, '☠ ×' + d.stacks, 'poison'); break;
    case 'ulti': {
      const p = ElementPalettes[d.unit.c.element];
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
    case 'die': Sfx.die(); break;
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
        <div class="result-gold">+ 🪙 ${rewards.gold}</div>
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
        <div class="detail-art rarity-${c.rarity}">${creatureSVG(c)}</div>
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
                 Level-Up (🪙 ${cost})</button>`}
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

function renderFusion(root) {
  const wrap = el('div', 'fusion-screen');
  wrap.appendChild(el('div', 'screen-title', 'Fusion'));
  wrap.appendChild(el('p', 'fusion-intro',
    'Zwei Kreaturen des gleichen Archetyps mit verschiedenen Basis-Elementen auf ' +
    `<b>Max-Level (${MAX_LEVEL})</b> verschmelzen zu einem mächtigen Hybrid — neutral gegen alle Elemente.`));

  const recipes = availableRecipes();
  if (!recipes.length) {
    wrap.appendChild(el('div', 'fusion-empty',
      '🔮 Noch kein Rezept verfügbar.<br>Sammle zwei Kreaturen des gleichen Archetyps mit ' +
      'unterschiedlichen Elementen — z. B. den <b>Tiefendrachen</b> aus Stage 7 zu deinem Glutdrachen.'));
  }
  recipes.forEach(recipe => {
    const ready = recipeReady(recipe);
    const done = !!Save.collection[recipe.output];
    const row = el('div', `fusion-row ${ready ? 'ready' : ''} ${done ? 'done' : ''}`);
    const inputHTML = recipe.inputs.map(id => {
      const entry = Save.collection[id];
      const lvl = entry ? entry.level : 0;
      const ok = entry && lvl >= MAX_LEVEL;
      return `<div class="fusion-input ${ok ? 'ok' : ''}">
        ${creatureCardHTML(id, lvl)}
        <div class="fusion-req">${done ? '—' : ok ? '✓ bereit' : `Lv ${lvl}/${MAX_LEVEL}`}</div>
      </div>`;
    }).join('<div class="fusion-plus">+</div>');
    row.innerHTML = `
      ${inputHTML}
      <div class="fusion-arrow">➜</div>
      <div class="fusion-output">
        ${done ? creatureCardHTML(recipe.output, Save.collection[recipe.output].level)
               : silhouetteCardHTML(recipe.output)}
        ${done ? '<div class="fusion-req">✓ fusioniert</div>'
               : `<button class="btn btn-primary btn-sm btn-fuse" ${ready ? '' : 'disabled'}>Fusionieren</button>`}
      </div>`;
    if (!done) {
      const btn = row.querySelector('.btn-fuse');
      btn.onclick = () => { Sfx.click(); playFusion(recipe); };
    }
    wrap.appendChild(row);
  });
  root.appendChild(wrap);
}

function playFusion(recipe) {
  const [a, b] = recipe.inputs.map(id => Creatures[id]);
  const out = Creatures[recipe.output];
  const ov = showOverlay(`
    <div class="fusion-anim">
      <div class="fa-stage">
        <div class="fa-card fa-left">${creatureSVG(a)}</div>
        <div class="fa-core"></div>
        <div class="fa-card fa-right">${creatureSVG(b)}</div>
        <div class="fa-result">${creatureSVG(out)}</div>
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
    <div class="title-bg">${sceneSVG('storm')}</div>
    <div class="title-content">
      <div class="title-emblem">${emblemSVG()}</div>
      <div class="title-logo">ELEMENTRA</div>
      <div class="title-tag">Sammle. Fusioniere. Herrsche.</div>
      <div class="title-cta">— Tippen zum Starten —</div>
    </div>`;
  document.body.appendChild(t);
  t.onclick = () => {
    Sfx.ulti(); // entsperrt zugleich den AudioContext (erste Interaktion)
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
  ov.querySelector('#set-reset').onclick = () => {
    if (confirm('Wirklich den kompletten Spielstand löschen?')) {
      resetSave();
      closeOverlay();
      showScreen('map');
    }
  };
  ov.querySelector('#set-close').onclick = () => { Sfx.click(); closeOverlay(); };
}
