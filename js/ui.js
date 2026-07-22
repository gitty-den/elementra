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
  // Gold-Anzeige nur in der Sammlung (inkl. Fusion-Tab) — Nutzer-Wunsch 19.07.
  document.body.classList.toggle('gold-visible', name === 'collection' || name === 'fusion');
  // Kampagne-Wallpaper standardmäßig leeren; renderWorld/renderChapterMap setzen es.
  const bg = document.getElementById('bg-layer');
  if (bg && name !== 'map') { bg.innerHTML = ''; bg.style.backgroundImage = ''; bg.classList.remove('stars'); }
  const s = $('#screen');
  s.innerHTML = '';
  s.scrollTop = 0;
  if (name === 'menu') renderMenu(s);
  else if (name === 'map') renderMap(s);
  else if (name === 'collection') renderCollection(s);
  else if (name === 'battlepass') renderBattlepass(s);
  else if (name === 'pvp') renderPvp(s);
  // Fusion lebt jetzt als Tab in der Sammlung (ein Fenster) — alte Aufrufe umleiten.
  else if (name === 'fusion') { collMode = 'fusion'; currentScreen = 'collection'; renderCollection(s); }
  updateGoldDisplay();
  updateNavArrows();
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

// Ult-Icon je Effekt-Typ; offensive Nuke/MultiHit erben das Element-Icon
// (Feuer = Flammenwurf, Natur = Rasierblatt …).
const ULT_ICON_BY_EFFECT = {
  teamShield: 'shield', teamHeal: 'heal', reviveOrHeal: 'revive',
  spreadDotDebuff: 'skull', hitPlusBleed: 'fang',
};
function ultIconName(c) {
  const eff = Abilities[c.active].effect;
  return ULT_ICON_BY_EFFECT[eff] || c.element; // elementalNuke, multiHit -> Element
}

// ---------- Screen: Kampagnen-Weltkarte ----------
// Vertikaler Zickzack-Pfad (Stage 1 unten, Weg führt nach oben), Scrollbar
// unsichtbar. Medaillons mit Theme-Icons statt Nummern — sprachunabhängig,
// Details erst im Team-Select (UI-Grundsätze 17.07.).

const MAP_NODE_SPACING = 128;

// Theme -> Pixel-Icon auf dem Medaillon; Glow-Farbe für den Knoten.
const MapThemeIcon = { fire: 'fire', nature: 'nature', water: 'water', storm: 'bolt', ash: 'ash', frost: 'frost' };
const MapThemeGlow = { fire: '#ff7a3c', nature: '#7dff8a', water: '#5ab8ff', storm: '#b18aff', ash: '#e0965a', frost: '#a8e8ff' };

// Kampagne = Welt-Übersicht (Kapitel-Auswahl) -> Kapitel-Karte. null = Übersicht.
let currentChapter = null;

function chapterUnlocked(ch) {
  if (ch.id === 1) return true;
  const prev = CHAPTERS.find(c => c.id === ch.id - 1);
  return prev && Save.stages[prev.bossStage] > 0;
}

// Voll-Wallpaper hinter der Kampagne (#bg-layer, fixed über den Viewport) —
// eine gefüllte Szene, kein gekacheltes Muster. Cache je Theme via Sprite-URI.
function setCampaignWallpaper(theme) {
  const bg = document.getElementById('bg-layer');
  if (!bg) return;
  bg.style.backgroundImage = '';
  bg.classList.remove('stars');
  bg.innerHTML = sceneArt(theme, 'map'); // 'map'-Variante: verwandt zur Arena, nicht gleich
}

// Welt-Übersicht: gekachelter Pixel-Sternenhimmel (der Hintergrund von vor dem
// 19.07.) — er passt zu den frei schwebenden Globen besser als eine Landschaft.
function setStarWallpaper() {
  const bg = document.getElementById('bg-layer');
  if (!bg) return;
  bg.innerHTML = '';
  bg.classList.add('stars');
  bg.style.backgroundImage = `url(${starTileURI()})`;
}

function renderMap(root) {
  if (currentChapter == null) renderWorld(root);
  else renderChapterMap(root, currentChapter);
}

// Welt-Übersicht: eine Karte pro Kapitel (gesperrt bis Vorgänger-Boss besiegt).
// Aufstieg: Stufenwahl + die zwei Modifikatoren dieser Woche. Erscheint erst,
// wenn der Endboss einmal gefallen ist.
function ascensionPanelHTML() {
  if (!ascensionUnlocked()) return '';
  const asc = Save.ascension || 0, max = maxAscension();
  const mods = weeklyMutators();
  return `<div class="asc-panel ${asc > 0 ? 'on' : ''}">
    <div class="asc-row">
      <span class="asc-label">${iconArt('star', 16)} Aufstieg</span>
      <button class="asc-btn" id="asc-minus" ${asc <= 0 ? 'disabled' : ''}>−</button>
      <b class="asc-lvl">${asc}</b>
      <button class="asc-btn" id="asc-plus" ${asc >= max ? 'disabled' : ''}>+</button>
    </div>
    ${asc > 0 ? `
      <div class="asc-mods">${mods.map(id =>
        `<span class="asc-mod">${iconArt(MUTATORS[id].icon, 15)} ${MUTATORS[id].name}</span>`).join('')}</div>
      <div class="asc-hint">Gegner +${asc} Lv · ${iconArt('coin', 12)} ×${ascGoldMult().toFixed(1)} · bessere Drops</div>`
    : `<div class="asc-hint">Kampagne härter neu spielen — wöchentlich wechselnde Regeln.</div>`}
  </div>`;
}

function renderWorld(root) {
  setStarWallpaper(); // Sternenhimmel hinter den Globen (Nutzer-Wunsch 21.07.)
  const wrap = el('div', 'world-screen');
  wrap.appendChild(el('div', 'screen-title', 'Kampagne'));
  const asc = el('div', '', ascensionPanelHTML());
  wrap.appendChild(asc);
  const plus = asc.querySelector('#asc-plus'), minus = asc.querySelector('#asc-minus');
  if (plus) plus.onclick = () => { Sfx.click(); setAscension((Save.ascension || 0) + 1); showScreen('map'); };
  if (minus) minus.onclick = () => { Sfx.click(); setAscension((Save.ascension || 0) - 1); showScreen('map'); };
  // Kapitel als Globen, horizontal durchscrollbar (Snap). Ein Planet je Kapitel.
  const rail = el('div', 'globe-rail');
  let focusIdx = 0;
  CHAPTERS.forEach((ch, i) => {
    const stages = STAGES.filter(s => s.id >= ch.range[0] && s.id <= ch.range[1]);
    const unlocked = chapterUnlocked(ch);
    const stars = stages.reduce((a, s) => a + (Save.stages[s.id] || 0), 0);
    const maxStars = stages.length * 3;
    const done = Save.stages[ch.bossStage] > 0;
    if (unlocked && !done) focusIdx = i;            // aktuelles Kapitel in den Fokus
    const card = el('div', `globe-card ${unlocked ? '' : 'locked'} ${done ? 'done' : ''}`);
    card.style.setProperty('--theme-glow', MapThemeGlow[ch.theme] || '#b18aff');
    card.innerHTML = `
      <div class="globe-wrap">
        ${globeArt(ch.theme)}
        ${unlocked ? '' : `<span class="globe-lock">${iconArt('lock', 30)}</span>`}
        ${done ? `<span class="globe-done">${iconArt('star', 20)}</span>` : ''}
      </div>
      <div class="globe-num">Kapitel ${ch.id}</div>
      <div class="globe-name">${unlocked ? ch.name : '???'}</div>
      <div class="bar globe-bar"><div class="fill" style="width:${maxStars ? stars / maxStars * 100 : 0}%"></div></div>
      <div class="globe-stars">${iconArt('star', 13)} ${stars}/${maxStars}</div>`;
    if (unlocked) card.onclick = () => { Sfx.click(); currentChapter = ch.id; showScreen('map'); };
    rail.appendChild(card);
  });
  wrap.appendChild(rail);
  root.appendChild(wrap);

  // Peek-Carousel (Runde 11, Nutzer-Skizze): das fokussierte Kapitel steht groß
  // und mittig, die Nachbarn schauen klein und gedimmt an den Rändern herein.
  // Ein Scroll-Listener markiert die dem Zentrum nächste Karte mit `.focus`.
  const centerCard = idx => {
    const t = rail.children[idx];
    if (t) rail.scrollLeft = Math.max(0, t.offsetLeft - (rail.clientWidth - t.clientWidth) / 2);
  };
  const updateFocus = () => {
    const mid = rail.scrollLeft + rail.clientWidth / 2;
    let best = 0, bestD = Infinity;
    [...rail.children].forEach((c, i) => {
      const d = Math.abs(c.offsetLeft + c.clientWidth / 2 - mid);
      if (d < bestD) { bestD = d; best = i; }
    });
    [...rail.children].forEach((c, i) => c.classList.toggle('focus', i === best));
  };
  let scrollTimer = null;
  rail.addEventListener('scroll', () => {
    updateFocus();
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(updateFocus, 120);
  });
  // Ersten Frame abwarten, damit Breiten stehen, dann aufs aktuelle Kapitel.
  requestAnimationFrame(() => { centerCard(focusIdx); updateFocus(); });
}

function renderChapterMap(root, chId) {
  const ch = CHAPTERS.find(c => c.id === chId) || CHAPTERS[0];
  const stages = STAGES.filter(s => s.id >= ch.range[0] && s.id <= ch.range[1]);
  setCampaignWallpaper(ch.theme); // Voll-Wallpaper im Kapitel-Theme (Wald/…) hinter der Karte
  const wrap = el('div', 'map-screen');
  const head = el('div', 'chapter-head');
  head.innerHTML = `<button class="btn btn-ghost btn-sm" id="ch-world">${iconArt('back', 14)} Welt</button>
    <span class="ch-title">Kapitel ${ch.id} — ${ch.name}</span>`;
  wrap.appendChild(head);

  const height = stages.length * MAP_NODE_SPACING + 170;
  const world = el('div', 'map-world');
  world.style.height = height + 'px';
  const pos = stages.map((s, i) => ({ x: i % 2 === 0 ? 28 : 64, y: height - 140 - i * MAP_NODE_SPACING }));
  const pts = pos.map(p => ({ x: p.x * 3.9, y: p.y + 36 }));
  world.innerHTML = `<img class="map-trail pixel-sprite" src="${mapTrailURI(pts, 390, height)}" alt="" draggable="false">`;
  // Kein gekacheltes Stern-Muster mehr — Hintergrund liefert das Voll-Wallpaper (#bg-layer).

  const current = highestClearedStage() + 1;
  stages.forEach((stage, i) => {
    const cleared = Save.stages[stage.id] || 0;
    const unlocked = stageUnlocked(stage.id);
    const node = el('div', `map-node ${cleared ? 'cleared' : ''} ${unlocked ? '' : 'locked'} ${stage.id === current ? 'current' : ''} ${stage.boss ? 'boss' : ''}`);
    node.style.left = pos[i].x + '%';
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
  head.querySelector('#ch-world').onclick = () => { Sfx.click(); currentChapter = null; showScreen('map'); };

  // Fokus auf die aktuelle Stage im Kapitel (sonst unterste).
  let idx = stages.findIndex(s => s.id === current);
  if (idx < 0) idx = 0;
  root.scrollTop = Math.max(0, pos[idx].y - root.clientHeight / 2 + 50);
  showTipOnce('map');
}

// ---------- Navigation zwischen den Subscreens: Pfeile am Bildschirmrand ----------
// 20.07.2026: Swipe ersetzt durch antippbare Pfeile (entdeckbarer, kein Konflikt
// mit dem Scrollen der Karte). Reihenfolge wie zuvor: Kampagne <-> Sammlung.

const NAV_ORDER = ['map', 'collection'];

function navNeighbour(dir) {
  const i = NAV_ORDER.indexOf(currentScreen);
  return i === -1 ? null : NAV_ORDER[i + dir] || null;
}

function initNavArrows() {
  [-1, 1].forEach(dir => {
    const b = el('button', 'nav-arrow ' + (dir < 0 ? 'left' : 'right'));
    b.innerHTML = iconArt('back', 22);
    b.onclick = () => {
      const next = navNeighbour(dir);
      if (next) { Sfx.click(); showScreen(next); }
    };
    document.body.appendChild(b);
  });
  updateNavArrows();
}

// Sichtbar nur auf map/collection und nie im Kampf; jeder Pfeil nur, wenn es
// in seiner Richtung einen Nachbarn gibt.
function updateNavArrows() {
  document.querySelectorAll('.nav-arrow').forEach(b => {
    const dir = b.classList.contains('left') ? -1 : 1;
    b.classList.toggle('hidden', !!B || !navNeighbour(dir));
  });
}

// ---------- Team-Auswahl ----------

// Element-Konter (Feuer>Natur>Wasser>Feuer); Hybride sind neutral.
const ELEMENT_STRONG = { fire: 'nature', nature: 'water', water: 'fire' };

// Warnt vor schwachem Matchup: Front-Tank elementar gekontert ODER kein
// Team-Mitglied stark gegen den vordersten Gegner.
// Rückgabe: { where: 'front'|'team', text } — angezeigt wird nur ein Icon
// (UI-Grundsatz), der Text erscheint erst beim Antippen des Warn-Icons.
function teamWeakness(picked, stage) {
  if (picked.length < 3) return null;
  const enemyEls = stage.enemies.map(e => Creatures[e.id].element);
  const teamEls = picked.map(id => Creatures[id].element);
  const front = Creatures[picked[0]].element;
  if (enemyEls.some(en => ELEMENT_STRONG[en] === front))
    return { where: 'front', text: 'Deine vorderste Kreatur wird elementar gekontert.' };
  const foeFront = enemyEls[0];
  if (foeFront && !teamEls.some(te => ELEMENT_STRONG[te] === foeFront))
    return { where: 'team', text: 'Niemand im Team ist stark gegen den vordersten Gegner.' };
  return null;
}

// Empfehlungs-Score für die Vorauswahl im Team-Select: Elementvorteil gegen die
// Gegner dieser Stage zählt am meisten, danach Level und Seltenheitsstufe.
function stageFitScore(id, stage) {
  const c = Creatures[id];
  const lvl = (Save.collection[id] || {}).level || 1;
  const enemyEls = stage.enemies.map(e => Creatures[e.id].element);
  let s = lvl * 2 + (c.tier || 1) * 3;
  enemyEls.forEach(en => {
    if (ELEMENT_STRONG[c.element] === en) s += 6;     // stark gegen diesen Gegner
    if (ELEMENT_STRONG[en] === c.element) s -= 5;     // wird von ihm gekontert
  });
  return s;
}

// Ruhige Einseite (Umbau 20.07.2026): schmales Gegner-Band, drei große Slots,
// darunter das Kreaturen-Grid. Kein Stage-Name, keine Beschreibung, keine
// Hinweiszeile — Belohnung nur als Icon+Zahl, Warnung nur als Icon.
// `stage.arenaEdit` (Runde 9): derselbe Picker dient auch dem Arena-Team —
// kein Gegner-Band, kein Kampfstart, Ergebnis landet in Save.arenaTeam.
function openTeamSelect(stage) {
  const arena = !!stage.arenaEdit;
  let picked = (arena ? arenaTeamIds() : Save.team.filter(id => Save.collection[id])).slice(0, 3);
  // Markierung: { kind: 'slot', i } oder { kind: 'card', id } — null = nichts gewählt.
  let sel = null;
  let showAll = false;   // Grid: erst Empfehlungen, auf Wunsch alles

  // IMMER zwei Taps (Korrektur 21.07.2026): der erste Tap markiert nur, der
  // zweite führt aus. Vorher rutschte eine angetippte Kreatur sofort auf den
  // letzten Platz — genau das soll nicht passieren. Reihenfolge bleibt egal:
  // Slot→Slot tauscht Positionen, Karte→Slot setzt ein, Slot→Karte genauso.
  const selSlotIndex = () => (sel && sel.kind === 'slot' ? sel.i : -1);

  const putAt = (i, id) => {                 // Kreatur an Position i legen
    const from = picked.indexOf(id);
    if (from === i) return;
    if (from >= 0) [picked[from], picked[i]] = [picked[i], picked[from]];  // schon im Team: tauschen
    else picked[i] = id;
    picked = picked.filter(x => x);          // Lücken schließen (splice-Reste)
  };

  const tapPos = i => {
    if (!sel) { sel = { kind: 'slot', i }; return; }            // markieren (auch leere Position)
    if (sel.kind === 'card') { putAt(i, sel.id); sel = null; return; }
    if (sel.i === i) { sel = null; return; }                    // Markierung lösen
    const j = sel.i;
    if (picked[i] || picked[j]) {                               // Positionen tauschen
      const tmp = picked[i];
      picked[i] = picked[j];
      picked[j] = tmp;
      picked = picked.filter(x => x);
    }
    sel = null;
  };

  const tapCard = id => {
    const idx = picked.indexOf(id);
    if (sel && sel.kind === 'slot') { putAt(sel.i, id); sel = null; return; }
    if (sel && sel.kind === 'card') {
      if (sel.id === id) { sel = null; return; }                // dieselbe Karte: lösen
      // Zwei Grid-Karten: beide im Team -> Positionen tauschen, sonst neue merken.
      const iA = picked.indexOf(sel.id), iB = idx;
      if (iA >= 0 && iB >= 0) { [picked[iA], picked[iB]] = [picked[iB], picked[iA]]; sel = null; }
      else if (iA >= 0 && iB === -1) { picked[iA] = id; sel = null; }   // Austausch gegen Bank
      else sel = { kind: 'card', id };
      return;
    }
    sel = { kind: 'card', id };                                 // erster Tap: nur markieren
  };

  const render = () => {
    const warn = teamWeakness(picked, stage);
    const newCreature = stage.unlockCreature && !Save.stages[stage.id];

    const slots = [0, 1, 2].map(i => {
      const c = picked[i] ? Creatures[picked[i]] : null;
      const warnHere = warn && ((warn.where === 'front' && i === 0) || (warn.where === 'team' && i === 0));
      return `
        <div class="ts-slot ${c ? 'filled' : ''} ${selSlotIndex() === i ? 'sel' : ''} ${i === 0 ? 'front' : ''}" data-slot="${i}">
          ${i === 0 ? `<div class="ts-front-mark">${iconArt('shield', 14)}</div>` : ''}
          ${warnHere ? `<button class="ts-warn-ico" data-warn="1">${iconArt('skull', 16)}</button>` : ''}
          ${c
            ? `<div class="ts-slot-art">${creatureArt(c, { noAura: true })}</div>
               ${levelPipsHTML(Save.collection[picked[i]].level)}`
            : '<div class="ts-slot-empty">＋</div>'}
        </div>`;
    }).join('');

    // Grid: standardmäßig die sechs besten Kandidaten für diese Stage,
    // gepickte Kreaturen bleiben immer sichtbar.
    const owned = ownedIds().sort((a, b) => stageFitScore(b, stage) - stageFitScore(a, stage));
    const shown = showAll ? owned
      : Array.from(new Set([...picked, ...owned.slice(0, 6)])).filter(id => Save.collection[id]);

    // Arena: statt Gegner-Band die eigene Team-Stärke (es gibt keinen festen Gegner).
    // Titel wieder da (Runde 11, Nutzer-Wunsch): Gegner-Band und eigene Slots
    // bekommen je eine kleine Überschrift, damit klar ist, was oben und unten steht.
    const bandHTML = arena
      ? `<div class="ts-band">
           <div class="ts-loot">${iconArt('sword', 15)} ${pvpTeamPower(picked.map((id, slot) =>
             ({ cid: id, level: Save.collection[id].level, item: Save.equipped[id] || null, slot })))}</div>
         </div>`
      : `<div class="ts-head">${iconArt('skull', 14)} Gegner-Team</div>
         <div class="ts-band">
           <div class="ts-foes">${stage.enemies.map((e, i) =>
             `<span class="mini-foe ${i === 0 ? 'front' : ''}">${creatureArt(Creatures[e.id], { noAura: true })}<i>${e.level}</i></span>`).join('')}
           </div>
           <div class="ts-loot">${iconArt('coin', 15)} ${stage.gold}${newCreature ? iconArt('egg', 15) : ''}</div>
         </div>`;

    const ov = showOverlay(`
      ${bandHTML}
      <div class="ts-head ts-head-own">${iconArt('shield', 14)} ${arena ? 'Arena-Team' : 'Dein Team'}</div>
      <div class="ts-slots">${slots}</div>
      ${arena ? '' : previewHTML(picked, stage)}
      <div class="ts-grid ${showAll ? '' : 'ts-grid-short'}">
        ${shown.map(id => creatureCardHTML(id, Save.collection[id].level,
          { cls: (picked.includes(id) ? 'picked ' : '')
               + ((sel && sel.kind === 'card' && sel.id === id) ||
                  (selSlotIndex() >= 0 && picked[selSlotIndex()] === id) ? 'marked' : '') })).join('')}
      </div>
      ${owned.length > shown.length ? `<button class="ts-more" id="ts-more">${iconArt('back', 15)}</button>` : ''}
      <div class="ov-actions">
        <button class="btn btn-ghost" id="ts-cancel">${iconArt('back', 16)}</button>
        <button class="btn btn-primary" id="ts-start" ${picked.length === 3 ? '' : 'disabled'}>${iconArt(arena ? 'shield' : 'sword', 18)}</button>
      </div>`, 'ts-overlay');

    showTipOnce('team');
    ov.querySelectorAll('.ts-slot').forEach(slotEl => {
      slotEl.onclick = e => {
        if (e.target.closest('.ts-warn-ico')) {                 // Warn-Icon erklärt sich per Tap
          Sfx.click();
          floatHint(warn.text);
          return;
        }
        Sfx.click();
        tapPos(+slotEl.dataset.slot);
        render();
      };
      // Long-Press auf einen belegten Slot nimmt die Kreatur aus dem Team.
      attachLongPress(slotEl, () => {
        const i = +slotEl.dataset.slot;
        if (!picked[i]) return;
        picked.splice(i, 1);
        sel = null;
        Sfx.click();
        render();
      });
    });
    ov.querySelectorAll('.ts-grid .ccard').forEach(card => {
      card.onclick = () => {
        if (card._lpFired) { card._lpFired = false; return; }
        Sfx.click();
        tapCard(card.dataset.cid);
        render();
      };
      attachLongPress(card, () => openCreatureDetail(card.dataset.cid, { onClose: render }));
    });
    const prev = ov.querySelector('#ts-preview');
    if (prev) prev.onclick = () => {
      Sfx.click();
      floatHint('Vorschau ohne dein Zutun — mit gut getimten Ults schaffst du mehr.');
    };
    const more = ov.querySelector('#ts-more');
    if (more) more.onclick = () => { Sfx.click(); showAll = true; render(); };
    ov.querySelector('#ts-cancel').onclick = () => { Sfx.click(); closeOverlay(); };
    ov.querySelector('#ts-start').onclick = () => {
      if (arena) {                       // Arena-Team nur speichern, kein Kampf
        Save.arenaTeam = picked.slice();
        persist();
        closeOverlay();
        showScreen('pvp');
        return;
      }
      Save.team = picked.slice();
      persist();
      closeOverlay();
      beginBattle(stage, picked);
    };
  };
  render();
}

// ---------- Ersthilfe-Hinweise (Runde 10) ----------
// Ein neuer Spieler bekam bisher Elemente, Rollen, Energie, Ults, Items, Fusion
// und Arena ohne eine Sekunde Erklärung — der häufigste Grund, eine App in den
// ersten fünf Minuten wieder zu löschen.
//
// Bewusst KEIN gesperrter Tutorial-Pfad: je ein kurzer Hinweis, genau dann, wenn
// der Spieler das Ding zum ersten Mal sieht. Ein Tipp erscheint genau einmal
// (`Save.tips`), Antippen schließt ihn.
const TIPS = {
  map:    { icon: 'map',    text: 'Tippe einen Knoten an. Der Weg führt von unten nach oben.' },
  team:   { icon: 'shield', text: 'Vorderste Kreatur wird zuerst angegriffen. Zwei Taps tauschen Plätze.' },
  battle: { icon: 'bolt',   text: 'Leuchtet ein Knopf golden, ist die Ult bereit. Tippen zündet sie.' },
  coll:   { icon: 'book',   text: 'Kreaturen wachsen durchs Kämpfen. Gold beschleunigt nur.' },
  element:{ icon: 'fire',   text: 'Feuer schlägt Natur, Natur schlägt Wasser, Wasser schlägt Feuer.' },
  fusion: { icon: 'orb',    text: 'Zwei verschiedene Archetypen ab Stufe 3 verschmelzen zu etwas Stärkerem.' },
};

function showTipOnce(id) {
  if (!TIPS[id]) return;
  if (!Save.tips) Save.tips = {};
  if (Save.tips[id]) return;
  Save.tips[id] = true;
  persist();
  const n = el('div', 'tip-card');
  n.innerHTML = `<span class="tip-ico">${iconArt(TIPS[id].icon, 26)}</span>
    <span class="tip-text">${TIPS[id].text}</span>`;
  document.body.appendChild(n);
  const close = () => n.remove();
  n.onclick = close;
  setTimeout(close, 6500);
}

// ---------- Kampf-Vorschau (Runde 10) ----------
// `battle.js` ist deterministisch — der Ausgang eines Kampfes lässt sich vorher
// exakt ausrechnen. Das nutzt sonst kein vergleichbares Spiel, weil deren
// Engines Zufall enthalten. Hier wird der Kampf im Speicher durchgespielt und
// als grobe Einschätzung angezeigt.
//
// WICHTIG — die Vorschau rechnet mit AUTOMATISCHEN Ults (`autoUlti`). Wer seine
// Ults im echten Kampf gut timt, schlägt die Vorschau. Sie nimmt dem Spieler
// also nicht die Entscheidung ab, sie nimmt ihm das Raten ab.
const PREVIEW_STEPS = [
  { max: 0,  cls: 'lose', icon: 'skull',  text: 'aussichtslos' },
  { max: 18, cls: 'tight', icon: 'skull', text: 'sehr knapp' },
  { max: 45, cls: 'ok',    icon: 'sword', text: 'machbar' },
  { max: 70, cls: 'good',  icon: 'shield', text: 'sicher' },
  { max: 101, cls: 'easy', icon: 'star',  text: 'überlegen' },
];

// Liefert { margin, sec, win } oder null (kein vollständiges Team).
function previewBattle(teamIds, stage) {
  if (!teamIds || teamIds.length < 3 || !stage.enemies || !stage.enemies.length) return null;
  try {
    const allies = teamIds.slice(0, 3).map((id, slot) => ({
      id, level: Save.collection[id].level, item: Save.equipped[id] || undefined, slot,
    }));
    const foes = (typeof ascEnemyDefs === 'function' && !stage.pvp && !stage.dev)
      ? ascEnemyDefs(stage) : stage.enemies;
    const mods = (typeof activeMutators === 'function' && !stage.pvp && !stage.dev)
      ? activeMutators() : [];
    const b = createBattle(allies, foes, mods);
    b.autoUlti = true;
    let guard = 0;
    while (!b.over && b.time < 400000 && guard < 40000) { updateBattle(b, 16); guard++; }
    const maxHp = b.allies.reduce((s, u) => s + u.maxHp, 0) || 1;
    const hp = b.allies.reduce((s, u) => s + Math.max(0, u.hp), 0);
    return { win: b.winner === 'ally', margin: b.winner === 'ally' ? hp / maxHp * 100 : 0,
             sec: b.time / 1000 };
  } catch (e) {
    console.warn('Vorschau fehlgeschlagen', e);
    return null;
  }
}

function previewHTML(teamIds, stage) {
  const p = previewBattle(teamIds, stage);
  if (!p) return '';
  const step = PREVIEW_STEPS.find(s => p.margin <= s.max) || PREVIEW_STEPS[PREVIEW_STEPS.length - 1];
  const cls = p.win ? step.cls : 'lose';
  const s = p.win ? step : PREVIEW_STEPS[0];
  // Balken zeigt die erwarteten Rest-LP; bei Niederlage bleibt er leer.
  return `<button class="ts-preview ${cls}" id="ts-preview">
    ${iconArt(s.icon, 16)}<span class="tp-text">${s.text}</span>
    <span class="tp-bar"><i style="width:${Math.round(p.margin)}%"></i></span>
  </button>`;
}

// Kurzer Hinweis-Streifen (z. B. Erklärung zum Warn-Icon), verschwindet von selbst.
function floatHint(text) {
  document.querySelectorAll('.float-hint').forEach(n => n.remove());
  const n = el('div', 'float-hint', text);
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 2600);
}

// ---------- Kampf ----------

// Kämpfe laufen grundsätzlich in doppelter Geschwindigkeit (20.07.2026).
// Betrifft nur den Engine-Tick; Animationen bleiben in Echtzeit (CSS kürzt sie).
const BATTLE_SPEED = 2;

// Slot-Positionen in der Arena (Prozent; x = Mitte, y = Oberkante der Figur).
const SLOT_POS = {
  enemy: [{ x: 64, y: 22 }, { x: 84, y: 12 }, { x: 44, y: 8 }],
  ally:  [{ x: 36, y: 54 }, { x: 16, y: 66 }, { x: 56, y: 70 }],
};

function beginBattle(stage, teamIds) {
  // item = ausgerüstetes Item (1 Slot je Kreatur, items.js) — fließt in createUnit.
  const allyDefs = teamIds.map(id => ({ id, level: Save.collection[id].level, item: Save.equipped[id] }));
  // Aufstieg skaliert die Gegner, Wochen-Modifikatoren drehen die Regeln (ascension.js).
  // Die Dev-Sim bleibt davon unberührt.
  // Arena und Dev-Sim laufen OHNE Aufstiegs-Skalierung — sonst würde die eigene
  // Aufstiegsstufe das gegnerische Spieler-Team mit hochziehen (unfair).
  const battle = (stage.dev || stage.pvp)
    ? createBattle(allyDefs, stage.enemies)
    : createBattle(allyDefs, ascEnemyDefs(stage), activeMutators());
  // Tempo fest auf 2× (20.07.2026) — schnelleres Gameplay, kein Schalter.
  B = { battle, stage, raf: null, speed: BATTLE_SPEED, unitEls: {}, endShown: false, inputs: [] };
  Music.play('battle');

  document.body.classList.add('in-battle');
  updateNavArrows();   // Rand-Pfeile im Kampf ausblenden
  const s = $('#screen');
  s.innerHTML = `
    <div class="battle-screen">
      <div class="battle-bg">${sceneArt(stage.theme)}</div>
      <button class="battle-giveup" id="bt-giveup" title="Aufgeben">${iconArt('giveup', 26)}</button>
      <div class="battle-top">
        <div class="battle-stage-name">${stage.name}</div>
        ${battle.mods && battle.mods.length ? `<div class="battle-mods">${battle.mods.map(id =>
          `<span class="asc-mod">${iconArt(MUTATORS[id].icon, 13)} ${MUTATORS[id].name}</span>`).join('')}</div>` : ''}
      </div>
      <div class="arena" id="arena"></div>
      <div class="battle-bottom" id="ult-bar"></div>
      <div id="ulti-banner"></div>
    </div>`;

  battle.enemies.forEach(u => $('#arena').appendChild(buildUnitEl(u)));
  battle.allies.forEach(u => $('#arena').appendChild(buildUnitEl(u)));

  // Boss-Inszenierung: kurzer Auftritt des Boss-Sprites, Kampf startet eingefroren.
  if (stage.boss) {
    const bossC = Creatures[stage.enemies[0].id];
    const intro = el('div', 'boss-intro', `<div class="boss-intro-art">${creatureArt(bossC)}</div>`);
    document.querySelector('.battle-screen').appendChild(intro);
    B.freezeUntil = performance.now() + 1800;
    Sfx.ulti();
    setTimeout(() => intro.classList.add('gone'), 1400);
    setTimeout(() => intro.remove(), 2000);
  }

  // Aufgeben (oben in der Ecke, prägnantes Icon).
  $('#bt-giveup').onclick = () => { Sfx.click(); showGiveUpConfirm(); };

  // Ult-Leiste: ein Button je Team-Kreatur mit ihrem Ult-Icon; leuchtet gold bei
  // voller Energie. Kein Auto-Ult, kein Tempo-Schalter mehr (Nutzer-Wunsch 19.07.).
  B.ultBtns = {};
  const ultBar = $('#ult-bar');
  battle.allies.forEach(u => {
    const btn = el('button', 'ult-btn', `
      <div class="ult-btn-ico">${iconArt(ultIconName(u.c), 26)}</div>
      <div class="bar ult-btn-energy"><div class="fill"></div></div>`);
    btn.onclick = () => {
      if (!B || B.battle.over || !u.alive || u.energy < 100) return;
      Sfx.click();
      // Arena: Zeitpunkt protokollieren, damit der Server den Kampf exakt
      // nachspielen kann (Ults sind manuell — ohne Protokoll keine Prüfung).
      if (B.stage && B.stage.pvp) B.inputs.push({ slot: u.slot, t: Math.round(B.battle.time) });
      castActive(B.battle, u);
      renderBars();
    };
    B.ultBtns[u.uid] = btn;
    ultBar.appendChild(btn);
  });

  // Rundenstart-Countdown (3 · 2 · 1 · LOS!) mittig über der Arena. Der Kampf
  // bleibt so lange eingefroren. In der Dev-Sim übersprungen (schnelles Testen).
  if (!stage.dev) {
    const countMs = showBattleCountdown();
    B.freezeUntil = Math.max(B.freezeUntil || 0, performance.now() + countMs);
  }

  battle.on(onBattleEvent);

  let last = performance.now();
  const frame = now => {
    const dt = Math.min(64, now - last);
    last = now;
    // Hit-Stop während Ulti-Moment (B.freezeUntil), Anzeige läuft weiter
    if (!B.freezeUntil || now >= B.freezeUntil) updateBattle(battle, dt * B.speed);
    renderBars();
    if (!battle.over) B.raf = requestAnimationFrame(frame);
    else renderBars();
  };
  B.raf = requestAnimationFrame(frame);
}

// Countdown vor Rundenbeginn — gilt für Kampagne UND Arena. Gibt zurück, wie
// lange der Kampf eingefroren bleiben muss.
const COUNT_STEPS = ['3', '2', '1', 'LOS!'];
const COUNT_STEP_MS = 620;

function showBattleCountdown() {
  const scr = document.querySelector('.battle-screen');
  if (!scr) return 0;
  const wrap = el('div', 'battle-count');
  scr.appendChild(wrap);
  COUNT_STEPS.forEach((txt, i) => setTimeout(() => {
    if (!wrap.isConnected) return;
    const go = txt === 'LOS!';
    wrap.innerHTML = `<span class="count-num ${go ? 'go' : ''}">${txt}</span>`;
    if (go) Sfx.countGo(); else Sfx.countTick();
  }, i * COUNT_STEP_MS));
  const total = (COUNT_STEPS.length - 1) * COUNT_STEP_MS + 260;
  setTimeout(() => wrap.remove(), total + 120);
  // Erstes Mal im Kampf: erklären, wofür die Knöpfe unten da sind.
  setTimeout(() => { showTipOnce('battle'); showTipOnce('element'); }, total + 400);
  return total;
}

// Aufgeben: bestätigen, dann als Niederlage werten und Ergebnis zeigen.
function showGiveUpConfirm() {
  // Im Dev-Kampf gibt es nichts zu verlieren — dort heißt „Aufgeben" schlicht
  // „Simulation beenden" und führt ohne Ergebnis-Screen zurück (Fix 21.07.2026).
  const isDev = B && B.stage && B.stage.dev;
  const ov = showOverlay(`
    <div class="giveup-confirm">
      <div class="gu-icon">${iconArt(isDev ? 'gear' : 'flag', 40)}</div>
      <div class="gu-q">${isDev ? 'Simulation beenden?' : 'Kampf aufgeben?'}</div>
      <div class="gu-sub">${isDev ? 'Kein Ergebnis, keine Belohnung.' : 'Zählt als Niederlage — zurück zur Karte.'}</div>
      <div class="ov-actions">
        <button class="btn btn-ghost" id="gu-no">${isDev ? 'Weiter testen' : 'Weiter kämpfen'}</button>
        <button class="btn btn-danger" id="gu-yes">${isDev ? 'Beenden' : 'Aufgeben'}</button>
      </div>
    </div>`, 'giveup-ov');
  ov.querySelector('#gu-no').onclick = () => { Sfx.click(); closeOverlay(); };
  ov.querySelector('#gu-yes').onclick = () => {
    Sfx.click();
    closeOverlay();
    if (isDev) { leaveBattle('menu'); return; }
    giveUpBattle();
  };
}

// Kampf verlassen und wieder auf einem echten Screen landen. endBattleUI allein
// räumt nur den Zustand ab — ohne showScreen blieb die tote Arena stehen und man
// kam nicht mehr heraus (Bug im Dummy-Kampf, 21.07.2026).
function leaveBattle(screen = 'map') {
  endBattleUI();
  showScreen(screen);
}

function giveUpBattle() {
  if (!B || B.battle.over) return;
  B.battle.over = true;
  B.battle.winner = 'enemy';
  B.endShown = true;               // verhindert doppeltes Ende über das 'end'-Event
  if (B.raf) cancelAnimationFrame(B.raf);
  showBattleResult('enemy');
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
  const card = el('div', `unit ${u.side} arch-${u.c.archetype} rar-${u.c.rarity}`);
  card.id = u.uid;
  card.style.left = p.x + '%';
  card.style.top = p.y + '%';
  card.style.zIndex = 10 + Math.round(p.y);
  card.style.setProperty('--bob-delay', (u.slot * 0.4 + (u.side === 'enemy' ? 0.25 : 0)).toFixed(2) + 's');
  card.style.setProperty('--dir', u.side === 'enemy' ? -1 : 1); // Rotationsrichtung der Angriffs-Animation
  // Rarity färbt Rahmen/Glow (Runde 11) — der HP-Füllstand bleibt gesundheits-
  // farben, sonst ginge die wichtigste Kampf-Info verloren.
  card.style.setProperty('--rar', (RarityInfo[u.c.rarity] || RarityInfo.common).color);
  card.innerHTML = `
    <div class="unit-plate">
      <span class="unit-lvl">${u.level}</span>
      <div class="unit-plate-bars">
        <div class="bar hp-bar"><div class="fill hp-fill"></div><div class="fill shield-fill"></div></div>
        <div class="bar energy-bar"><div class="fill energy-fill"></div></div>
      </div>
      <span class="unit-elem" title="${Elements[u.c.element] ? Elements[u.c.element].name : ''}">${iconArt(u.c.element, 13)}</span>
    </div>
    <div class="unit-body">
      <div class="unit-ring"></div>
      <div class="unit-shadow"></div>
      <div class="shield-barrier"></div>
      <div class="unit-art">${creatureArt(u.c)}</div>
      <div class="fx-layer"></div>
    </div>`;
  // Ults werden über die Ult-Leiste gezündet, nicht mehr per Kreatur-Tap.
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
    card.classList.toggle('shielded', sh > 0 && u.alive); // Barriere bleibt bis Schild leer
    card.classList.toggle('dead', !u.alive);
    card.classList.toggle('ulti-ready', u.alive && u.energy >= 100 && u.side === 'ally');
    card.classList.toggle('taunting', u.alive && u.tauntUntil > B.battle.time);
  });
  // Ult-Buttons: Energie-Füllstand + Gold-Glow bei Bereitschaft.
  if (B.ultBtns) B.battle.allies.forEach(u => {
    const btn = B.ultBtns[u.uid];
    if (!btn) return;
    const ready = u.alive && u.energy >= 100;
    btn.querySelector('.ult-btn-energy .fill').style.width = u.energy + '%';
    btn.classList.toggle('ready', ready);
    btn.classList.toggle('spent', !u.alive);
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

// Ulti-Burst: großer Partikelregen in den Element-Farben, Flugbahn je Element
// (Feuer/Asche steigen, Wasser/Frost spritzen nach unten, Natur wirbelt seitlich,
// Rest explodiert radial). Dazu Schockwellen-Ring am Wirker.
function spawnUltiBurst(u) {
  const card = B && B.unitEls[u.uid];
  if (!card) return;
  const elId = u.c.element;
  const pal = PixelPalettes[elId];
  const colors = [pal.m, pal.l, pal.h, pal.g];
  const fx = card.querySelector('.fx-layer');
  for (let i = 0; i < 30; i++) {
    const p = el('span', 'particle particle-big');
    p.style.background = colors[i % colors.length];
    let dx, dy;
    if (elId === 'fire' || elId === 'ash') {
      dx = Math.random() * 160 - 80; dy = -(Math.random() * 190 + 50);
    } else if (elId === 'water' || elId === 'frost') {
      dx = Math.random() * 220 - 110; dy = Math.random() * 130 + 20;
    } else if (elId === 'nature') {
      dx = Math.random() * 260 - 130; dy = Math.random() * 90 - 45;
    } else {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 110 + 60;
      dx = Math.cos(a) * r; dy = Math.sin(a) * r;
    }
    p.style.setProperty('--dx', dx + 'px');
    p.style.setProperty('--dy', dy + 'px');
    p.style.left = '50%'; p.style.top = '50%';
    fx.appendChild(p);
    setTimeout(() => p.remove(), 1100);
  }
  const wave = el('span', 'ulti-wave');
  wave.style.borderColor = pal.g;
  fx.appendChild(wave);
  setTimeout(() => wave.remove(), 700);
}

// Wie dicht/dick ein Element seinen Strom schießt (20.07.2026). `beam` legt einen
// durchgehenden Strahl unter die Projektile — Feuer/Asche/Dampf sind ein Schwall,
// kein Wurfgeschoss, und wirkten als Einzelbrocken zu dünn.
const UltStreamStyle = {
  fire:   { size: 46, mult: 3, gap: 32, beam: 30 },
  ash:    { size: 42, mult: 3, gap: 34, beam: 26 },
  steam:  { size: 40, mult: 3, gap: 34, beam: 24 },
  water:  { size: 38, mult: 2, gap: 44, beam: 18 },
  frost:  { size: 36, mult: 2, gap: 48, beam: 0 },
  nature: { size: 36, mult: 2, gap: 52, beam: 0 },
};

// Pokemon-artige Ult-Attacke: ein Strom von Element-Projektilen fliegt vom Wirker
// zum Ziel (Feuer=Flammenwurf, Natur=Rasierblatt, Wasser=Wasserstrahl …).
function spawnUltProjectile(u, target, count) {
  const arena = document.querySelector('#arena');
  const a = B && B.unitEls[u.uid], t = B && B.unitEls[target.uid];
  if (!arena || !a || !t) return;
  const ar = arena.getBoundingClientRect();
  const as = a.getBoundingClientRect(), ts = t.getBoundingClientRect();
  const x0 = as.left + as.width / 2 - ar.left, y0 = as.top + as.height * 0.42 - ar.top;
  const x1 = ts.left + ts.width / 2 - ar.left, y1 = ts.top + ts.height * 0.46 - ar.top;
  const elId = u.c.element;
  const pal = PixelPalettes[elId];
  const dir = u.side === 'enemy' ? -1 : 1;
  const st = UltStreamStyle[elId] || { size: 34, mult: 1, gap: 60, beam: 0 };
  const shots = count * st.mult;
  const lastAt = 300 + (shots - 1) * st.gap;

  // Strahl-Körper: ein flackernder Balken vom Wirker zum Ziel, solange der
  // Schwall läuft. Liegt unter den Projektilen (z-index in style.css).
  if (st.beam) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const beam = el('div', 'ult-beam ult-beam-' + elId);
    beam.style.left = x0 + 'px';
    beam.style.top = y0 + 'px';
    beam.style.width = len + 'px';
    beam.style.height = st.beam + 'px';
    // Winkel als Variable — die Flacker-Animation setzt transform selbst neu.
    beam.style.setProperty('--rot', Math.atan2(y1 - y0, x1 - x0) + 'rad');
    beam.style.setProperty('--glow', pal.g);
    beam.style.setProperty('--core', pal.h);
    beam.style.setProperty('--edge', pal.m);
    beam.style.setProperty('--life', (lastAt + 260) + 'ms');
    arena.appendChild(beam);
    setTimeout(() => beam.remove(), lastAt + 300);
  }

  for (let i = 0; i < shots; i++) {
    const p = el('div', 'ult-proj ult-proj-' + elId);
    p.innerHTML = iconArt(elId, st.size);
    p.style.width = p.style.height = st.size + 'px';
    p.style.margin = `${-st.size / 2}px 0 0 ${-st.size / 2}px`;
    p.style.left = x0 + 'px';
    p.style.top = y0 + 'px';
    // Streuung quer zur Flugbahn, damit der Strom Breite bekommt statt einer Linie.
    const spread = st.beam ? (Math.random() - 0.5) * st.beam * 1.6 : 0;
    p.style.setProperty('--dx', (x1 - x0) + 'px');
    p.style.setProperty('--dy', (y1 - y0 + spread) + 'px');
    p.style.setProperty('--glow', pal.g);
    p.style.setProperty('--spin', (dir * (elId === 'nature' ? 720 : 200)) + 'deg');
    p.style.animationDelay = (i * st.gap) + 'ms';
    arena.appendChild(p);
    // Einschlag am Ziel, wenn das Projektil ankommt: großer Blitz + Partikelregen.
    setTimeout(() => {
      spawnParticles(target, pal.l, st.beam ? 8 : 12);
      const tc = B && B.unitEls[target.uid];
      if (tc) {
        const imp = el('span', 'impact impact-ult');
        tc.querySelector('.fx-layer').appendChild(imp);
        setTimeout(() => imp.remove(), 420);
      }
      p.remove();
    }, 300 + i * st.gap);
  }
}

// Heil-Ult: ein Kreis am Boden unter dem eigenen Team leuchtet auf und pulst,
// dazu steigen Funken daraus hoch (20.07.2026 — vorher nur Glow je Kreatur,
// zu unauffällig; der Effekt soll so klar lesbar sein wie die Schild-Blase).
function spawnHealField(units, color = '#6dffa6') {
  const arena = document.querySelector('#arena');
  if (!arena || !units.length) return;
  const ar = arena.getBoundingClientRect();
  // Bounding-Box über alle Team-Mitglieder, damit der Kreis wirklich alle umfasst.
  let x0 = Infinity, x1 = -Infinity, yb = -Infinity;
  units.forEach(u => {
    const c = B && B.unitEls[u.uid];
    if (!c) return;
    const r = c.getBoundingClientRect();
    x0 = Math.min(x0, r.left - ar.left);
    x1 = Math.max(x1, r.right - ar.left);
    yb = Math.max(yb, r.bottom - ar.top);
  });
  if (!isFinite(x0)) return;
  const pad = 26;
  const w = (x1 - x0) + pad * 2;
  const field = el('div', 'heal-field');
  field.style.left = (x0 - pad) + 'px';
  field.style.top = (yb - w * 0.17) + 'px';
  field.style.width = w + 'px';
  field.style.height = (w * 0.34) + 'px';       // flache Ellipse = liegt am Boden
  field.style.setProperty('--glow', color);
  arena.appendChild(field);
  // Funken steigen aus dem Kreis auf
  for (let i = 0; i < 16; i++) {
    const s = el('span', 'heal-spark');
    s.style.left = (Math.random() * 100) + '%';
    s.style.background = color;
    s.style.animationDelay = (Math.random() * 500) + 'ms';
    field.appendChild(s);
  }
  setTimeout(() => field.remove(), 1500);
}

// Support-Ult (Schild/Heal/Wiedergeburt): Licht-Aura pulst auf der Zieleinheit.
function spawnUltAura(unit, color) {
  const card = B && B.unitEls[unit.uid];
  if (!card) return;
  const fx = card.querySelector('.fx-layer');
  const ring = el('span', 'ult-aura');
  ring.style.borderColor = color;
  fx.appendChild(ring);
  setTimeout(() => ring.remove(), 800);
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
    case 'heal': {
      floatText(d.target, '+' + d.amount, 'healtxt');
      spawnParticles(d.target, '#7dedb2', 10);
      const hc = B.unitEls[d.target.uid];
      if (hc) {
        hc.classList.remove('healed'); void hc.offsetWidth; hc.classList.add('healed');
        setTimeout(() => hc.classList.remove('healed'), 750);
        const ico = el('span', 'heal-icon');
        ico.innerHTML = iconArt('heal', 22);
        hc.querySelector('.fx-layer').appendChild(ico);
        setTimeout(() => ico.remove(), 950);
      }
      Sfx.heal();
      break;
    }
    case 'absorb': floatText(d.target, '🛡 ' + d.amount, 'absorb'); break;
    case 'shieldGain': floatText(d.target, '🛡 Schild', 'absorb'); break;
    case 'poison': floatText(d.target, '☠ ×' + d.stacks, 'poison'); break;
    // Runde 10: Element-Mechaniken sichtbar machen — sonst merkt niemand, dass
    // sich Glut-Wolf und Flut-Wolf unterschiedlich spielen.
    case 'burn':  spawnParticles(d.target, PixelPalettes.fire.g, 6); break;
    case 'chill': spawnParticles(d.target, PixelPalettes.frost.h, 6); break;
    case 'doubleHit': floatText(d.attacker, '×2', 'crit'); Sfx.hit(); break;
    case 'ulti': {
      const glow = PixelPalettes[d.unit.c.element].g;
      // Kurzer Hit-Stop: Kampf friert ~260 ms ein, Ulti bekommt ihren Moment.
      B.freezeUntil = performance.now() + 260;
      spawnUltiBurst(d.unit);
      // Gerichtete Ult-Animation je Effekt (Projektil-Strom bzw. Support-Aura).
      const eff = d.ability.effect;
      if (eff === 'teamHeal' || eff === 'reviveOrHeal') {
        // Heilung: Boden-Kreis unter dem ganzen Team + Aura je Kreatur.
        const mates = aliveOnly(matesOf(B.battle, d.unit));
        spawnHealField(mates.length ? mates : [d.unit]);
        mates.forEach(m => spawnUltAura(m, '#6dffa6'));
      } else if (eff === 'teamShield') {
        aliveOnly(matesOf(B.battle, d.unit)).forEach(m => spawnUltAura(m, glow));
      } else if (eff === 'spreadDotDebuff') {
        aliveOnly(foesOf(B.battle, d.unit)).forEach(t => spawnUltProjectile(d.unit, t, 2));
      } else {
        const tgt = pickTarget(B.battle, d.unit, d.ability.target);
        if (tgt) {
          const count = eff === 'multiHit' ? d.ability.params.hits : 4;
          spawnUltProjectile(d.unit, tgt, count);
        }
      }
      const caster = B.unitEls[d.unit.uid];
      if (caster) {
        caster.classList.remove('casting');
        void caster.offsetWidth;
        caster.classList.add('casting');
        setTimeout(() => caster.classList.remove('casting'), 550); // idleBob wieder freigeben
      }
      const scr = document.querySelector('.battle-screen');
      if (scr) {
        scr.classList.remove('shaking');
        void scr.offsetWidth;
        scr.classList.add('shaking');
        // Element-farbiger Vollbild-Blitz
        const flash = el('div', 'ulti-screen-flash');
        flash.style.background = `radial-gradient(circle at 50% 45%, ${glow}55, transparent 70%)`;
        scr.appendChild(flash);
        setTimeout(() => flash.remove(), 450);
      }
      const banner = $('#ulti-banner');
      if (banner) {
        banner.innerHTML = `<div class="ulti-flash" style="--glow:${glow}">
          <b>${d.unit.c.name}</b> — ${d.ability.name}!</div>`;
        setTimeout(() => { banner.innerHTML = ''; }, 1300);
      }
      // Eigener Ult-Sound je Effekt-Typ.
      if (eff === 'teamShield') Sfx.ultShield();
      else if (eff === 'teamHeal') Sfx.ultHeal();
      else if (eff === 'reviveOrHeal') Sfx.ultRevive();
      else Sfx.ultAttack(d.unit.c.element);
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
  updateNavArrows();
  Music.play('map');
}

// XP-Zeile fürs Ergebnis: Mini-Sprite + XP-Balken + Level-Up-Feier je Team-Mitglied.
function xpRowHTML(gains) {
  return `<div class="xp-row">${gains.map(g => {
    const c = Creatures[g.id];
    const maxed = g.level >= MAX_LEVEL;
    const pct = maxed ? 100 : Math.round(g.xp / g.need * 100);
    return `<div class="xp-cell ${g.ups ? 'lvlup' : ''}">
      <div class="xp-art">${creatureArt(c, { noAura: true })}</div>
      <div class="bar xp-bar"><div class="fill xp-fill" style="width:${pct}%"></div></div>
      ${g.ups ? `<div class="xp-up">${iconArt('bolt', 12)} Lv ${g.level}!</div>`
              : `<div class="xp-plus">+${g.amount}</div>`}
    </div>`;
  }).join('')}</div>`;
}

function showBattleResult(winner) {
  if (!B) return; // Kampf wurde bereits verlassen (z. B. Aufgeben im Endmoment)
  if (B.stage && B.stage.dev) { showDevBattleResult(winner); return; } // Sim: keine Belohnung
  if (B.stage && B.stage.pvp) { showPvpBattleResult(winner); return; } // Arena: Server wertet
  const stage = B.stage;
  const teamIds = B.battle.allies.map(u => u.cid);
  const alive = B.battle.allies.filter(u => u.alive).length;
  const xpGains = grantTeamXp(stage, teamIds, winner === 'ally');
  bpOnBattle(winner === 'ally'); // Battlepass-Punkte + Sieg/Kampf-Aufgaben
  // Boss besiegt und nächstes Kapitel existiert -> Angebot „Nächste Karte".
  const nextCh = (winner === 'ally' && stage.boss)
    ? CHAPTERS.find(c => c.range[0] === stage.id + 1) : null;
  if (winner === 'ally') {
    Sfx.win();
    const rewards = grantStageRewards(stage, alive);
    const unlockHTML = rewards.unlocked ? `
      <div class="unlock-box">
        <div class="unlock-label">Neue Kreatur freigeschaltet!</div>
        ${creatureCardHTML(rewards.unlocked, 1, { cls: 'unlock-card' })}
      </div>` : '';
    const bossHTML = stage.boss ? `
      <div class="boss-clear">${iconArt('star', 18)}${emblemArt()}${iconArt('star', 18)}</div>` : '';
    // Endboss-Trophäe (Runde 9): einmalige Kreatur mit eigenem Archetyp.
    const bossCreatureHTML = rewards.bossUnlocked ? `
      <div class="unlock-box boss-unlock">
        <div class="unlock-label">${iconArt('star', 14)} Endboss-Kreatur erobert!</div>
        ${creatureCardHTML(rewards.bossUnlocked, 1, { cls: 'unlock-card' })}
        <div class="unlock-note">Einmalig — nicht durch Fusion herstellbar.</div>
      </div>` : '';
    // Item-Drop: Erstsieg garantiert, Wiederholung mit Chance (items.js).
    const dropId = rollStageDrop(stage, rewards.first || rewards.ascFirst);
    const dropHTML = dropId ? `
      <div class="unlock-box">
        <div class="unlock-label">Item gefunden!</div>
        ${itemCardHTML(Items[dropId], { cls: 'drop-card' })}
      </div>` : '';
    showOverlay(`
      <div class="result victory ${stage.boss ? 'boss-win' : ''}">
        <h1>Sieg!</h1>
        ${bossHTML}
        <div class="result-stars">${starsHTML(alive)}</div>
        <div class="result-gold">+ ${iconArt('coin')} ${rewards.gold}</div>
        ${xpRowHTML(xpGains)}
        ${bossCreatureHTML}
        ${unlockHTML}
        ${dropHTML}
        <div class="ov-actions">
          <button class="btn btn-ghost" id="res-again">Nochmal</button>
          ${nextCh
            ? `<button class="btn btn-primary" id="res-nextch">Nächste Karte ${iconArt('map', 14)}</button>`
            : `<button class="btn btn-primary" id="res-next">Weiter</button>`}
        </div>
      </div>`, 'result-ov');
  } else {
    Sfx.lose();
    showOverlay(`
      <div class="result defeat">
        <h1>Niederlage</h1>
        <p class="defeat-tip">${nextDefeatTip()}</p>
        ${xpRowHTML(xpGains)}
        <div class="ov-actions">
          <button class="btn btn-ghost" id="res-next">Zur Karte</button>
          <button class="btn btn-primary" id="res-again">Nochmal</button>
        </div>
      </div>`, 'result-ov');
  }
  const stageRef = stage;
  const nextBtn = $('#res-next');
  if (nextBtn) nextBtn.onclick = () => { Sfx.click(); closeOverlay(); endBattleUI(); showScreen('map'); };
  const nextChBtn = $('#res-nextch');
  if (nextChBtn) nextChBtn.onclick = () => {
    Sfx.click(); closeOverlay(); endBattleUI();
    currentChapter = nextCh.id; showScreen('map');
  };
  // Erst zurück auf die Karte, dann die Team-Auswahl — sonst liegt hinter dem
  // Overlay noch die tote Arena und „Zurück" führt ins Nichts.
  $('#res-again').onclick = () => { Sfx.click(); closeOverlay(); leaveBattle('map'); openTeamSelect(stageRef); };
}

// ---------- Screen: Sammlung ----------

// Ziele-Panel: drei Fortschrittsbalken (Basis/Fusionen/Sterne) + Meilenstein-Chips.
function goalsPanelHTML() {
  const goals = [
    { type: 'base',   icon: 'book', max: 21 },
    { type: 'fusion', icon: 'orb',  max: 12 },
    { type: 'stars',  icon: 'star', max: STAGES.length * 3 },
  ];
  return `<div class="goals">${goals.map(g => {
    const val = goalProgress(g.type);
    const chips = MILESTONES.filter(m => m.type === g.type).map(m => {
      const claimed = Save.milestones[m.id];
      const ready = !claimed && val >= m.need;
      return `<button class="goal-chip ${claimed ? 'claimed' : ready ? 'ready' : 'locked'}"
        data-mid="${m.id}" ${ready ? '' : 'disabled'}>
        <i>${m.need}</i>${claimed ? '✓' : `${iconArt('coin', 13)} ${m.gold}`}</button>`;
    }).join('');
    return `<div class="goal-row">
      ${iconArt(g.icon, 22)}
      <div class="bar goal-bar"><div class="fill goal-fill" style="width:${Math.min(100, val / g.max * 100)}%"></div></div>
      <b class="goal-val">${val}/${g.max}</b>
      <span class="goal-chips">${chips}</span>
    </div>`;
  }).join('')}</div>`;
}

// Sammlung + Fusion teilen sich ein Fenster (Nutzer-Wunsch 19.07.). Umschalter oben.
let collMode = 'coll'; // 'coll' | 'fusion'

function collTabsHTML() {
  return `<div class="coll-tabs">
    <button class="coll-tab ${collMode === 'coll' ? 'on' : ''}" data-m="coll">${iconArt('book', 18)} Sammlung</button>
    <button class="coll-tab ${collMode === 'items' ? 'on' : ''}" data-m="items">${iconArt('bag', 18)} Items</button>
    <button class="coll-tab ${collMode === 'fusion' ? 'on' : ''}" data-m="fusion">${iconArt('orb', 18)} Fusion</button>
  </div>`;
}

// ---------- Sammlungs-Filter (Runde 10) ----------
// Bleibt bewusst im Arbeitsspeicher (nicht im Save): ein Filter ist eine
// Momentaufnahme, kein Spielstand.
let collFilter = { el: null, role: null, sort: 'level' };

const COLL_SORTS = {
  level: { icon: 'bolt', fn: (a, b) => (Save.collection[b].level - Save.collection[a].level) },
  power: { icon: 'sword', fn: (a, b) => statPower(b) - statPower(a) },
  name:  { icon: 'book', fn: (a, b) => Creatures[a].name.localeCompare(Creatures[b].name) },
};

function statPower(id) {
  const s = statsAtLevel(Creatures[id], Save.collection[id].level);
  return s.hp + s.atk * 4 + s.def * 2 + s.spd * 2;
}

function collMatches(id) {
  const c = Creatures[id];
  if (collFilter.el && c.element !== collFilter.el) return false;
  if (collFilter.role && c.role !== collFilter.role) return false;
  return true;
}

function collSort(ids) {
  return ids.slice().sort(COLL_SORTS[collFilter.sort].fn);
}

function collFilterHTML() {
  const els = TYPES_DATA.elements.map(e => {
    const n = ownedIds().filter(id => Creatures[id].element === e.id).length;
    return `<button class="cf-btn ${collFilter.el === e.id ? 'on' : ''}" data-fel="${e.id}"
      ${n ? '' : 'disabled'}>${iconArt(e.id, 18)}<i>${n}</i></button>`;
  }).join('');
  const roles = Object.keys(RoleInfo).map(r => {
    const n = ownedIds().filter(id => Creatures[id].role === r).length;
    return `<button class="cf-btn ${collFilter.role === r ? 'on' : ''}" data-frole="${r}"
      ${n ? '' : 'disabled'}>${iconArt(RoleInfo[r].icon, 18)}<i>${n}</i></button>`;
  }).join('');
  const sorts = Object.entries(COLL_SORTS).map(([k, v]) =>
    `<button class="cf-btn sort ${collFilter.sort === k ? 'on' : ''}" data-fsort="${k}">
      ${iconArt(v.icon, 16)}</button>`).join('');
  return `<div class="cf-row">${els}</div>
          <div class="cf-row">${roles}<span class="cf-sep"></span>${sorts}</div>`;
}

function renderCollection(root) {
  const wrap = el('div', 'coll-screen');
  const tabs = el('div', '', collTabsHTML());
  wrap.appendChild(tabs);
  tabs.querySelectorAll('.coll-tab').forEach(t => t.onclick = () => {
    if (collMode === t.dataset.m) return;
    collMode = t.dataset.m; Sfx.click(); showScreen('collection');
  });

  if (collMode === 'fusion') { renderFusionBody(wrap); root.appendChild(wrap); return; }
  if (collMode === 'items') { renderItemsBody(wrap); root.appendChild(wrap); return; }

  showTipOnce('coll');
  wrap.appendChild(el('div', '', goalsPanelHTML()));
  wrap.querySelectorAll('.goal-chip.ready').forEach(chip => chip.onclick = () => {
    const m = MILESTONES.find(x => x.id === chip.dataset.mid);
    if (m && claimMilestone(m)) {
      Sfx.win();
      updateGoldDisplay();
      showScreen('collection');
    }
  });
  // Filterleiste (Runde 10): Icon-Knöpfe für Element und Rolle. Ohne sie ist die
  // Sammlung ab ~30 Kreaturen ein unsortierter Haufen. Rein visuell, kein Text
  // außer den Zahlen (UI-Grundsatz: sprachunabhängig).
  const filterBar = el('div', 'coll-filters', collFilterHTML());
  wrap.appendChild(filterBar);
  filterBar.querySelectorAll('[data-fel]').forEach(b => b.onclick = () => {
    collFilter.el = collFilter.el === b.dataset.fel ? null : b.dataset.fel;
    Sfx.click(); showScreen('collection');
  });
  filterBar.querySelectorAll('[data-frole]').forEach(b => b.onclick = () => {
    collFilter.role = collFilter.role === b.dataset.frole ? null : b.dataset.frole;
    Sfx.click(); showScreen('collection');
  });
  filterBar.querySelectorAll('[data-fsort]').forEach(b => b.onclick = () => {
    collFilter.sort = b.dataset.fsort;
    Sfx.click(); showScreen('collection');
  });

  const owned = collSort(ownedIds().filter(collMatches));
  const grid = el('div', 'coll-grid');
  grid.innerHTML = owned.length
    ? owned.map(id => creatureCardHTML(id, Save.collection[id].level)).join('')
    : `<div class="fusion-nores">${iconArt('lock', 22)}<div>Nichts passt zu diesem Filter</div></div>`;
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
  wrap.querySelectorAll('.coll-grid .ccard:not(.unknown)').forEach(card => {
    const open = () => { Sfx.click(); openCreatureDetail(card.dataset.cid); };
    card.onclick = () => {
      if (card._lpFired) { card._lpFired = false; return; }
      open();
    };
    attachLongPress(card, open);
  });
}

// Element-Mechanik sichtbar machen (Runde 10). Ohne diese Zeile bliebe der
// Unterschied zwischen Glut- und Flut-Wolf unsichtbar — und genau der ist der
// Grund, warum die 21 Basis-Kreaturen jetzt 21 statt 7 sind.
const ELEMENT_KEYWORD_TEXT = {
  burn:        'Angriffe setzen in Brand',
  poison:      'Angriffe vergiften (stapelt)',
  chill:       'Angriffe verlangsamen das Ziel',
  energy:      'Angriffe laden die Ult schneller',
  thorns:      'Angreifer bekommen Schaden zurück',
  shieldStart: 'Startet den Kampf mit Schild',
};

function elementKeywordHTML(c) {
  const k = elementKeyword(c);
  if (!k) return '';
  const info = ITEM_KEYWORDS[k.type];
  return `<div class="ab ab-elem"><span class="ab-ico">${iconArt(c.element, 20)}</span>
    <span class="ab-txt"><b>${info.name}</b><i>${ELEMENT_KEYWORD_TEXT[k.type] || ''}</i></span></div>`;
}

// Icon-basiert (UI-Grundsätze): Element-/Rollen-Icon, Level-Pips, Stat-Icons.
// opts.onClose: Rücksprung (z. B. Team-Select-Re-Render nach Long-Press-Peek).
function openCreatureDetail(cid, opts = {}) {
  const render = () => {
    const c = Creatures[cid];
    const entry = Save.collection[cid];
    const st = statsAtLevel(c, entry.level);
    const r = RarityInfo[c.rarity];
    const isMax = entry.level >= MAX_LEVEL;
    const cost = levelUpCost(entry.level);
    const ov = showOverlay(`
      <div class="detail">
        <div class="detail-art rarity-${c.rarity}">${creatureArt(c)}</div>
        <h2 style="--rar:${r.color}">${c.name}</h2>
        <div class="detail-tags">
          <span class="tag">${ElementIcons[c.element]}</span>
          <span class="tag">${iconArt(RoleInfo[c.role].icon, 16)}</span>
          <span class="tag tag-ult">${iconArt(ultIconName(c), 16)}</span>
          <span class="tag">${isMax ? iconArt('star', 15) + ' MAX' : levelPipsHTML(entry.level)}</span>
        </div>
        ${isMax ? '' : `<div class="detail-xp"><div class="bar xp-bar">
          <div class="fill xp-fill" style="width:${Math.round((entry.xp || 0) / xpNeed(entry.level) * 100)}%"></div>
        </div></div>`}
        <div class="stat-grid">
          <div class="stat">${iconArt('heart', 17)}<b>${st.hp}</b></div>
          <div class="stat">${iconArt('sword', 17)}<b>${st.atk}</b></div>
          <div class="stat">${iconArt('shield', 17)}<b>${st.def}</b></div>
          <div class="stat">${iconArt('bolt', 17)}<b>${st.spd}</b></div>
        </div>
        <div class="ability-box">
          ${elementKeywordHTML(c)}
          <div class="ab"><span class="ab-ico">${iconArt('orb', 20)}</span>
            <span class="ab-txt"><b>${Abilities[c.passive].name}</b><i>${abilityShort(c.passive)}</i></span></div>
          <div class="ab ab-ult"><span class="ab-ico">${iconArt(ultIconName(c), 20)}</span>
            <span class="ab-txt"><b>${Abilities[c.active].name}</b><i>${abilityShort(c.active)}</i></span></div>
        </div>
        ${itemSlotHTML(cid)}
        <div class="ov-actions">
          <button class="btn btn-ghost" id="det-close">Schließen</button>
          ${isMax
            ? `<button class="btn btn-max" disabled>${iconArt('star', 14)} MAX</button>`
            : `<button class="btn btn-primary" id="det-lvl" ${canLevelUp(cid) ? '' : 'disabled'}>
                 Lvl. Up (${iconArt('coin')} ${cost})</button>`}
        </div>
      </div>`);
    ov.querySelector('#det-close').onclick = () => {
      Sfx.click();
      closeOverlay();
      if (opts.onClose) opts.onClose(); else showScreen('collection');
    };
    const lvlBtn = ov.querySelector('#det-lvl');
    if (lvlBtn) lvlBtn.onclick = () => {
      if (levelUp(cid)) { Sfx.heal(); updateGoldDisplay(); render(); }
    };
    ov.querySelector('#det-item').onclick = () => { Sfx.click(); openItemPicker(cid, render); };
  };
  render();
}

// ---------- Screen-Teil: Items (Inventar + Tages-Shop) ----------

function renderItemsBody(parent) {
  const wrap = el('div', 'items-screen');
  const owned = ITEMS_DATA.filter(i => itemsOwned(i.id) > 0);
  const sh = shopState();

  // Wer trägt was — kleine Zeile unter dem Inventar-Eintrag.
  const wearer = itemId => Object.keys(Save.equipped).filter(cid => Save.equipped[cid] === itemId);

  wrap.innerHTML = `
    <div class="coll-sub">Inventar (${owned.length})</div>
    ${owned.length ? `<div class="item-list">${owned.map(i => {
      const w = wearer(i.id);
      return itemCardHTML(i, {
        badge: `<span class="item-count">×${itemsOwned(i.id)}</span>`,
        cls: w.length ? 'equipped' : '',
      }) + (w.length ? `<div class="item-wearer">${w.map(cid =>
        `<span>${creatureArt(Creatures[cid], { noAura: true, noAnim: true })}</span>`).join('')}</div>` : '');
    }).join('')}</div>`
      : `<div class="item-empty-hint">${iconArt('bag', 26)}<div>Noch keine Items — Kampagnen-Stages droppen welche.</div></div>`}

    <div class="coll-sub">${iconArt('coin', 15)} Tages-Shop</div>
    <div class="item-list shop-list">${sh.offers.map(id => {
      const it = Items[id];
      const bought = !!sh.bought[id];
      return itemCardHTML(it, {
        cls: 'shop-row' + (bought ? ' sold' : ''),
        badge: bought
          ? `<span class="item-buy sold">${iconArt('star', 14)}</span>`
          : `<button class="btn btn-sm item-buy ${Save.gold >= it.price ? '' : 'poor'}" data-buy="${id}">
               ${iconArt('coin', 13)} ${it.price}</button>`,
      });
    }).join('')}</div>
    <div class="fusion-hint">Shop wechselt täglich. Items droppen auch aus Kampagnen-Stages.</div>`;

  parent.appendChild(wrap);

  wrap.querySelectorAll('[data-buy]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const id = b.dataset.buy;
    if (buyItem(id)) { Sfx.win(); updateGoldDisplay(); showScreen('collection'); }
    else Sfx.lose();
  });
}

// ---------- Items: Slot am Detail + Auswahl ----------

// Ein Slot je Kreatur. Leerer Slot zeigt Plus, belegter das Item-Icon + Kurzzeile.
function itemSlotHTML(cid) {
  const it = itemOf(cid);
  return `<button class="item-slot ${it ? 'filled' : ''}" id="det-item">
    <span class="item-slot-ico">${it ? iconArt(it.icon, 26) : '<i class="item-plus">＋</i>'}</span>
    <span class="item-slot-txt">${it
      ? `<b>${it.name}</b><i>${itemStatLine(it)}</i>`
      : `<b>Item</b><i>leer</i>`}</span>
  </button>`;
}

// Kachel für Inventar/Picker/Shop.
function itemCardHTML(item, opts = {}) {
  const kw = item.keyword ? ITEM_KEYWORDS[item.keyword.type] : null;
  return `<div class="item-card rarity-${item.rarity} ${opts.cls || ''}" data-iid="${item.id}">
    <div class="item-card-ico">${iconArt(item.icon, 30)}</div>
    <div class="item-card-main">
      <b style="--rar:${RarityInfo[item.rarity].color}">${item.name}</b>
      <i>${itemStatLine(item)}</i>
    </div>
    ${kw ? `<span class="item-kw">${iconArt(kw.icon, 14)}</span>` : ''}
    ${opts.badge || ''}
  </div>`;
}

function openItemPicker(cid, onDone) {
  const cur = Save.equipped[cid];
  const list = ITEMS_DATA.filter(i => itemsFree(i.id) > 0 || i.id === cur);
  const back = () => { closeOverlay(); if (onDone) onDone(); };
  const ov = showOverlay(`
    <div class="item-picker">
      <h2>${iconArt('bag', 18)} Item wählen</h2>
      ${list.length ? `<div class="item-list">${list.map(i => itemCardHTML(i, {
        cls: i.id === cur ? 'equipped' : '',
        badge: i.id === cur
          ? `<span class="item-count on">${iconArt('star', 13)}</span>`
          : `<span class="item-count">×${itemsFree(i.id)}</span>`,
      })).join('')}</div>`
        : `<div class="item-empty-hint">${iconArt('bag', 26)}<div>Keine freien Items — Kampagne spielen oder im Shop kaufen.</div></div>`}
      <div class="ov-actions">
        <button class="btn btn-ghost" id="ip-close">Zurück</button>
        ${cur ? `<button class="btn btn-danger" id="ip-off">Ablegen</button>` : ''}
      </div>
    </div>`, 'item-ov');
  ov.querySelectorAll('.item-card').forEach(card => card.onclick = () => {
    const id = card.dataset.iid;
    if (id === cur) return;
    if (equipItem(cid, id)) { Sfx.heal(); back(); }
  });
  const off = ov.querySelector('#ip-off');
  if (off) off.onclick = () => { Sfx.click(); unequipItem(cid); back(); };
  ov.querySelector('#ip-close').onclick = () => { Sfx.click(); back(); };
}

// Long-Press (450 ms, max. 10 px Bewegung) — öffnet den Stat-Peek am Handy.
// Setzt _lpFired, damit der nachfolgende Click-Handler nicht zusätzlich feuert.
function attachLongPress(node, fn) {
  let timer = null, x0 = 0, y0 = 0;
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  node.addEventListener('pointerdown', e => {
    x0 = e.clientX; y0 = e.clientY;
    cancel();
    timer = setTimeout(() => { timer = null; node._lpFired = true; fn(); }, 450);
  });
  node.addEventListener('pointermove', e => {
    if (Math.hypot(e.clientX - x0, e.clientY - y0) > 10) cancel();
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => node.addEventListener(ev, cancel));
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

// Fusion-Inhalt in die Sammlung eingebettet (Tab „Fusion"). parent = coll-screen.
// Was bringt die Fusion? Vergleich gegen die STÄRKERE der beiden Zutaten
// (Werte-Summe), damit die Anzeige nicht schönrechnet. Icon-basiert.
function fusionGainHTML(cidA, cidB, outId, lvl) {
  const sum = s => s.hp + s.atk * 4 + s.def * 2 + s.spd * 2;
  const sa = statsAtLevel(Creatures[cidA], Save.collection[cidA].level);
  const sb = statsAtLevel(Creatures[cidB], Save.collection[cidB].level);
  const best = sum(sa) >= sum(sb) ? sa : sb;
  const out = statsAtLevel(Creatures[outId], lvl);
  const row = (icon, a, b) => {
    const d = b - a;
    return `<span class="fg-stat ${d >= 0 ? 'up' : 'down'}">${iconArt(icon, 13)}${d >= 0 ? '+' : ''}${d}</span>`;
  };
  return row('heart', best.hp, out.hp) + row('sword', best.atk, out.atk)
       + row('shield', best.def, out.def) + row('bolt', best.spd, out.spd);
}

function renderFusionBody(parent) {
  showTipOnce('fusion');
  const wrap = el('div', 'fusion-screen');

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
    // Runde 10: Ergebnis-Level vorher zeigen — es erbt das niedrigere Zutat-Level.
    // Vorher tappte der Spieler blind in ein teures Geschäft.
    const lvl = ready ? fusionLevelFor(a, b) : 0;
    resultHTML = (ready ? creatureCardHTML(outId, lvl) : silhouetteCardHTML(outId))
      + `<div class="fusion-req">${Creatures[outId].name}</div>`
      + (ready ? `<div class="fusion-gain">${fusionGainHTML(a, b, outId, lvl)}</div>` : '');
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
    a && fusionPick.length < 2
      ? 'Passende Partner — beide Kreaturen werden verbraucht!'
      : 'Zwei verschiedene Archetypen ab Level ' + FUSION_MIN_LEVEL + ' — beide werden verbraucht!'));

  // Kandidaten: NUR fusionsfähige Kreaturen zeigen — Basis-Archetyp
  // (Fusionen sind Endstufe) ab FUSION_MIN_LEVEL (Runde 10: 3 statt Max-Level). Alles darunter würde ohnehin nur
  // ausgegraut herumstehen. Ist bereits eine Kreatur gewählt, bleiben nur die
  // Partner übrig, mit denen es wirklich ein Rezept gibt (9 Paare haben keins).
  const cands = ownedIds().filter(id => {
    const c = Creatures[id];
    if (c.fusion || Save.collection[id].level < FUSION_MIN_LEVEL) return false;
    if (fusionPick.includes(id)) return true;
    if (a && fusionPick.length < 2 && !fusionResult(a, id)) return false;
    return true;
  }).sort((x, y) => Creatures[x].name.localeCompare(Creatures[y].name));

  const grid = el('div', 'ts-grid fx-grid');
  if (cands.length) {
    grid.innerHTML = cands.map(id =>
      `<div class="fx-cand">${creatureCardHTML(id, Save.collection[id].level,
        { cls: fusionPick.includes(id) ? 'picked' : '' })}</div>`).join('');
  } else {
    // Nichts übrig: entweder noch niemand auf Max-Level oder kein Partner passt.
    grid.innerHTML = `<div class="fusion-nores fx-empty">${iconArt('lock', 22)}
      <div>${a ? 'Kein passender Partner im Besitz' : 'Noch keine Kreatur auf Level ' + FUSION_MIN_LEVEL}</div></div>`;
  }
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

  parent.appendChild(wrap);

  row.querySelectorAll('.fx-slot').forEach(s => s.onclick = () => {
    const i = +s.dataset.slot;
    if (fusionPick[i] !== undefined) { fusionPick.splice(i, 1); Sfx.click(); showScreen('collection'); }
  });
  const fuseBtn = row.querySelector('.btn-fuse');
  if (fuseBtn) fuseBtn.onclick = () => { Sfx.click(); playFusion(fusionPick[0], fusionPick[1]); };
  grid.querySelectorAll('.ccard').forEach(card => {
    card.onclick = () => {
      if (card._lpFired) { card._lpFired = false; return; }
      const id = card.dataset.cid;
      if (fusionPick.includes(id)) fusionPick = fusionPick.filter(x => x !== id);
      else if (fusionPick.length < 2) fusionPick.push(id);
      Sfx.click();
      showScreen('collection');
    };
    attachLongPress(card, () => openCreatureDetail(card.dataset.cid, { onClose: () => showScreen('collection') }));
  });
}

// Pixel-Partikel für die Fusion (Runde 11), angelehnt an spawnUltiBurst:
// mode 'in' = die Zutaten-Farben strömen zum Kern, mode 'out' = das Ergebnis
// explodiert in seiner Element-Farbe nach außen.
function fusionBurst(stage, colors, mode, count = 26) {
  for (let i = 0; i < count; i++) {
    const p = el('span', 'fa-particle');
    p.style.background = colors[i % colors.length];
    const a = Math.random() * Math.PI * 2, r = 70 + Math.random() * 90;
    const ex = Math.cos(a) * r, ey = Math.sin(a) * r;
    if (mode === 'in') {                      // von außen zum Zentrum
      p.style.setProperty('--x0', ex + 'px'); p.style.setProperty('--y0', ey + 'px');
      p.style.setProperty('--x1', '0px');     p.style.setProperty('--y1', '0px');
    } else {                                  // vom Zentrum nach außen
      p.style.setProperty('--x0', '0px');     p.style.setProperty('--y0', '0px');
      p.style.setProperty('--x1', ex + 'px'); p.style.setProperty('--y1', ey + 'px');
    }
    p.style.animationDelay = (Math.random() * 0.15) + 's';
    stage.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}

function playFusion(cidA, cidB) {
  const outId = fusionReady(cidA, cidB);
  if (!outId) return;
  const a = Creatures[cidA], b = Creatures[cidB], out = Creatures[outId];
  const palA = PixelPalettes[a.element], palB = PixelPalettes[b.element], palO = PixelPalettes[out.element];
  const ov = showOverlay(`
    <div class="fusion-anim">
      <div class="fa-stage">
        <div class="fa-flash"></div>
        <div class="fa-card fa-left">${creatureArt(a)}</div>
        <div class="fa-core"></div>
        <div class="fa-card fa-right">${creatureArt(b)}</div>
        <div class="fa-result">${creatureArt(out)}</div>
      </div>
      <div class="fa-label">Fusion…</div>
    </div>`, 'fusion-ov');
  const stage = ov.querySelector('.fa-stage');
  Sfx.fuse();
  // Phase 1: Zutaten fahren zusammen, ihre Farben strömen zum Kern.
  setTimeout(() => {
    stage.classList.add('merge');
    fusionBurst(stage, [palA.m, palA.l, palB.m, palB.l, palA.h, palB.h], 'in', 22);
  }, 100);
  // Phase 2: Erwachen — Blitz, Schockwelle, Partikel-Explosion, Screen-Shake.
  setTimeout(() => {
    fuseCreatures(cidA, cidB);
    fusionPick = [];
    stage.classList.add('reveal');
    stage.style.setProperty('--fx-glow', palO.g);
    // Blitz
    const flash = stage.querySelector('.fa-flash');
    if (flash) { flash.style.background = `radial-gradient(circle at 50% 45%, ${palO.g}, ${palO.h}00 70%)`;
      flash.classList.add('on'); setTimeout(() => flash.classList.remove('on'), 500); }
    // Schockwelle
    const wave = el('span', 'fa-wave'); wave.style.borderColor = palO.g;
    stage.appendChild(wave); setTimeout(() => wave.remove(), 750);
    // Explosion + kurzer Shake
    fusionBurst(stage, [palO.m, palO.l, palO.h, palO.g], 'out', 30);
    const anim = ov.querySelector('.fusion-anim');
    anim.classList.add('fa-shake'); setTimeout(() => anim.classList.remove('fa-shake'), 400);
    const elInfo = Elements[out.element];
    const hybrid = !!elInfo.components;   // Hybride (Dampf/Asche/Frost) haben ein eigenes Konter-Rad
    ov.querySelector('.fa-label').innerHTML =
      `<b>${out.name}</b> ist erwacht!<br><span class="fa-sub">${RarityInfo[out.rarity].name} · ${elInfo.name}${hybrid ? ' · Hybrid-Rad' : ''}</span>`;
    const btn = el('button', 'btn btn-primary', 'Fantastisch!');
    btn.onclick = () => { Sfx.click(); closeOverlay(); showScreen('fusion'); updateGoldDisplay(); };
    ov.querySelector('.fusion-anim').appendChild(btn);
    Sfx.win();
  }, 1900);
}

// ---------- Hauptmenü (Landingpage): Lager-Szene mit dem aktiven Team ----------

// Team-Kreaturen ums Lagerfeuer. `bottom` statt `top`: alle sitzen auf DERSELBEN
// Bodenlinie wie das Feuer (vorher schwebten sie frei in der Luft).
// 21.07. Runde 9: Die Kacheln liegen jetzt an den Bildschirmrändern (siehe
// `.menu-side`), das Lager rückt in die Mitte der unteren Bildschirmhälfte —
// vorher deckten die Kacheln Feuer und Team auf dem Handy komplett zu.
const MENU_CAMP_POS = [
  { x: 34, bottom: 27, flip: false },
  { x: 66, bottom: 27, flip: true },
  { x: 50, bottom: 36, flip: false },   // hinten am Feuer, etwas höher = weiter weg
];

function renderMenu(root) {
  const team = Save.team.filter(id => Save.collection[id]).slice(0, 3);
  const camp = team.map((id, i) => {
    const p = MENU_CAMP_POS[i];
    return `<div class="menu-creature ${p.flip ? 'flip' : ''}"
      style="left:${p.x}%; bottom:${p.bottom}%">
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
    </div>
    <div class="menu-side left">
      <button class="menu-tile primary" data-goto="map">${iconArt('map', 30)}<span>Kampagne</span></button>
      <button class="menu-tile" data-goto="collection">${iconArt('book', 30)}<span>Sammlung</span></button>
    </div>
    <div class="menu-side right">
      <button class="menu-tile" data-goto="pvp">${iconArt('sword', 30)}<span>Arena</span></button>
      <button class="menu-tile" data-goto="battlepass">${iconArt('star', 30)}<span>Battlepass</span></button>
    </div>`;
  root.appendChild(wrap);
  wrap.querySelectorAll('[data-goto]').forEach(b =>
    b.onclick = () => {
      Sfx.click();
      if (b.dataset.goto === 'map') currentChapter = null; // Kampagne startet in der Welt-Übersicht
      if (b.dataset.goto === 'collection') collMode = 'coll';
      showScreen(b.dataset.goto);
    });
  // Optionen liegen jetzt IMMER als Zahnrad oben rechts (Topbar), auch im Menü —
  // keine eigene Kachel mehr.
}

// ---------- Screen: Arena (Async-PVP) ----------
// Kein Echtzeit-Gegner: man kämpft gegen den TEAM-SCHNAPPSCHUSS eines anderen
// Spielers, den die normale Gegner-KI steuert. Fällt das Netz aus, bleibt der
// Rest des Spiels unberührt — jeder Aufruf ist abgefangen.

let pvpState = { rating: null, busy: false, msg: '', board: null, boardLoading: false, boardTried: false };

function renderPvp(root) {
  const wrap = el('div', 'pvp-screen');
  const units = pvpTeamUnits();
  const power = pvpTeamPower(units);
  // Rangliste ist Dauer-Inhalt (Runde 9) — kein Knopf mehr, sie lädt beim Öffnen.
  const boardHTML = pvpState.board
    ? `<div class="pvp-board">${pvpState.board.map(row => `
        <div class="pvp-row ${row.player_id === (Net.session && Net.session.user_id) ? 'me' : ''}">
          <b class="pvp-rank">${row.rank}</b>
          <span class="pvp-name">${row.name}</span>
          <span class="pvp-rating">${row.rating}</span>
        </div>`).join('')}</div>`
    // Beim ersten Aufbau läuft der Abruf noch — dann „lädt", nicht „offline".
    : `<div class="pvp-board-empty">${pvpState.boardTried && !pvpState.boardLoading
        ? 'Rangliste nicht abrufbar (offline).' : 'Rangliste lädt…'}</div>`;
  wrap.innerHTML = `
    <div class="screen-title">Arena</div>
    <div class="pvp-head">
      <div class="pvp-stat"><span>${iconArt('star', 16)}</span>
        <b>${pvpState.rating === null ? '—' : pvpState.rating}</b><i>Wertung</i></div>
      <div class="pvp-stat"><span>${iconArt('sword', 16)}</span>
        <b>${power}</b><i>Team-Stärke</i></div>
    </div>
    <div class="pvp-team-head">
      <span>${iconArt('shield', 15)} Arena-Team</span>
      <button class="btn btn-ghost btn-sm" id="pvp-editteam">${iconArt('book', 14)} Ändern</button>
    </div>
    <div class="pvp-team">${units.map(u =>
      creatureCardHTML(u.cid, u.level)).join('')}</div>
    ${pvpState.msg ? `<div class="pvp-msg">${pvpState.msg}</div>` : ''}
    <div class="ov-actions pvp-actions">
      <button class="btn btn-primary" id="pvp-fight" ${pvpState.busy || !units.length ? 'disabled' : ''}>
        ${pvpState.busy ? '…' : 'Gegner suchen'} ${iconArt('sword', 14)}</button>
    </div>
    <div class="pvp-board-title">${iconArt('star', 14)} Rangliste</div>
    ${boardHTML}
    <div class="fusion-hint">Eigenes Team, gleiche Sammlung. Es wird als Schnappschuss hinterlegt — andere kämpfen dagegen, auch wenn du offline bist.</div>`;
  root.appendChild(wrap);

  wrap.querySelector('#pvp-fight').onclick = () => pvpFight();
  wrap.querySelector('#pvp-editteam').onclick = () => { Sfx.click(); openArenaTeamSelect(); };
  // Beim Öffnen EINMAL automatisch laden. `boardTried` verhindert eine
  // Endlosschleife, wenn der Abruf scheitert (pvpShowBoard rendert neu).
  if (!pvpState.boardTried && !pvpState.boardLoading) pvpShowBoard();
}

// Arena-Team bearbeiten: gleicher Picker wie die Kampagne, aber ohne Gegner-Band
// und ohne Kampfstart — Auswahl landet in Save.arenaTeam.
function openArenaTeamSelect() {
  openTeamSelect({ id: 'arena', name: 'Arena', enemies: [], gold: 0, pvp: true, arenaEdit: true });
}

function pvpSetMsg(m) { pvpState.msg = m; if (currentScreen === 'pvp') showScreen('pvp'); }

// Verbinden + eigenen Schnappschuss hochladen. Gibt true bei Erfolg.
async function pvpSync() {
  const units = pvpTeamUnits();
  if (!units.length) { pvpSetMsg('Kein Team — erst Kreaturen aufstellen.'); return false; }
  await Net.ensureSession();
  const p = typeof activeProfile === 'function' ? activeProfile() : null;
  await Net.ensurePlayer(p && p.name ? p.name : 'Spieler');
  await Net.uploadSnapshot(currentSeason(), pvpTeamPower(units), units);
  return true;
}

async function pvpFight() {
  if (pvpState.busy) return;
  pvpState.busy = true; pvpSetMsg('Verbinde…');
  try {
    await pvpSync();
    const opp = await Net.findOpponent(currentSeason(), pvpTeamPower());
    if (!opp) { pvpState.busy = false; pvpSetMsg('Noch kein Gegner da — du bist der Erste. Später nochmal.'); return; }
    pvpState.busy = false; pvpState.msg = '';
    startPvpBattle(opp);
  } catch (e) {
    pvpState.busy = false;
    pvpSetMsg('Offline oder Server nicht bereit: ' + e.message);
  }
}

async function pvpShowBoard() {
  if (pvpState.boardLoading) return;
  pvpState.boardLoading = true;
  pvpState.boardTried = true;
  try {
    await Net.ensureSession();
    pvpState.board = await Net.leaderboard(currentSeason(), 25);
  } catch (e) {
    pvpState.board = null;                 // Anzeige fällt auf den Offline-Text zurück
  }
  pvpState.boardLoading = false;
  if (currentScreen === 'pvp') showScreen('pvp');
}

function startPvpBattle(opp) {
  const defs = pvpUnitsToDefs(opp.units);
  if (!defs.length) { pvpSetMsg('Gegner-Team unlesbar.'); return; }
  const stage = {
    id: 'pvp', name: 'Arena — ' + opp.name, theme: 'storm', pvp: true, opponent: opp,
    enemies: defs, gold: 0, firstClearBonus: 0, unlockCreature: null,
  };
  beginBattle(stage, arenaTeamIds());   // Arena kämpft mit dem Arena-Team
}

// Ergebnis melden: die WERTUNG rechnet der Server (submit_match), nicht der Client.
function showPvpBattleResult(winner) {
  const stage = B.stage, opp = stage.opponent;
  const won = winner === 'ally';
  const attackerUnits = pvpTeamUnits();
  const durationMs = B.battle.time;
  const inputs = (B.inputs || []).slice();   // Ult-Protokoll für die Server-Prüfung
  showOverlay(`
    <div class="result ${won ? 'victory' : 'defeat'}">
      <h1>${won ? 'Sieg!' : 'Niederlage'}</h1>
      <p class="defeat-tip">gegen <b>${opp.name}</b></p>
      <div class="pvp-result-rating" id="pvp-newrating">${iconArt('star', 16)} Wertung wird gemeldet…</div>
      <div class="ov-actions">
        <button class="btn btn-ghost" id="res-pvpexit">Zurück</button>
        <button class="btn btn-primary" id="res-pvpagain">Nächster Gegner</button>
      </div>
    </div>`, 'result-ov');
  $('#res-pvpexit').onclick = () => { Sfx.click(); closeOverlay(); leaveBattle('pvp'); };
  $('#res-pvpagain').onclick = () => { Sfx.click(); closeOverlay(); leaveBattle('pvp'); pvpFight(); };

  Net.submitMatch(currentSeason(), opp.player_id, attackerUnits, opp.units,
                  (B.battle.mods || []), won ? 'attacker' : 'defender', durationMs, inputs)
    .then(newRating => {
      Net.verifyLastMatch();               // Server rechnet nach (bester Aufwand)
      pvpState.rating = typeof newRating === 'number' ? newRating : pvpState.rating;
      const n = document.querySelector('#pvp-newrating');
      if (n) n.innerHTML = `${iconArt('star', 16)} Neue Wertung: <b>${pvpState.rating}</b>`;
    })
    .catch(e => {
      const n = document.querySelector('#pvp-newrating');
      if (n) n.textContent = 'Wertung nicht gemeldet (offline): ' + e.message;
    });
}

// ---------- Einstellungen ----------

// Lautstärke in 4 einrastbaren Stufen (Aus / Leise / Mittel / Laut) statt stufenlos
// — am Handy zielsicherer als ein Schieberegler und sprachunabhängig ablesbar.
const VOL_STEPS = [0, 0.34, 0.67, 1];

function volStepIndex(v) {
  const val = typeof v === 'number' ? v : 1;
  let best = 0, bestD = Infinity;
  VOL_STEPS.forEach((s, i) => { const d = Math.abs(s - val); if (d < bestD) { bestD = d; best = i; } });
  return best;
}

function volStepsHTML(kind, level) {
  return `<div class="vol-steps" data-kind="${kind}">${VOL_STEPS.map((_, i) =>
    `<button class="vol-step ${i <= level && level > 0 ? 'on' : ''} ${i === 0 ? 'mute' : ''}"
       data-lvl="${i}" style="--h:${28 + i * 12}%"></button>`).join('')}</div>`;
}

function openSettings() {
  const ov = showOverlay(`
    <div class="settings">
      <h2>${iconArt('gear', 18)}</h2>
      <div class="set-row">${iconArt('sound', 26)}
        ${volStepsHTML('sfx', volStepIndex(Save.settings.sfxVol))}</div>
      <div class="set-row">${iconArt('music', 26)}
        ${volStepsHTML('music', volStepIndex(Save.settings.musicVol))}</div>
      <button class="btn btn-ghost" id="set-profile">${iconArt('lock', 14)} ${
        activeProfile() ? activeProfile().name : 'Profil wählen'}</button>
      <button class="btn btn-ghost" id="set-cloud">${iconArt('orb', 14)} Spielstand-Cloud</button>
      <button class="btn btn-ghost" id="set-dev">${iconArt('gear', 14)} Developer-Board</button>
      <button class="btn btn-danger" id="set-reset">Spielstand zurücksetzen</button>
      <div class="settings-info">Elementra — Prototyp v0.2</div>
      <div class="ov-actions">
        <button class="btn btn-primary" id="set-close">Schließen</button>
      </div>
    </div>`);
  ov.querySelectorAll('.vol-steps').forEach(group => {
    group.querySelectorAll('.vol-step').forEach(btn => btn.onclick = () => {
      const lvl = +btn.dataset.lvl;
      const vol = VOL_STEPS[lvl];
      if (group.dataset.kind === 'sfx') {
        Save.settings.sfxVol = vol;
        persist();
        Sfx.click();                       // hörbares Feedback in neuer Lautstärke
      } else {
        Music.setVolume(vol);              // schreibt musicVol selbst in den Save
      }
      group.querySelectorAll('.vol-step').forEach((b, i) =>
        b.classList.toggle('on', i <= lvl && lvl > 0));
    });
  });
  ov.querySelector('#set-profile').onclick = () => { Sfx.click(); openProfileGate({ cancelable: true }); };
  ov.querySelector('#set-dev').onclick = () => { Sfx.click(); openDevBoard(); };
  ov.querySelector('#set-reset').onclick = () => {
    const p = activeProfile();
    if (confirm(`Spielstand von „${p ? p.name : 'diesem Profil'}" wirklich löschen?`)) {
      resetSave();
      closeOverlay();
      showScreen('menu');
    }
  };
  ov.querySelector('#set-cloud').onclick = () => { Sfx.click(); openCloudSave(); };
  ov.querySelector('#set-close').onclick = () => { Sfx.click(); closeOverlay(); };
}

// ---------- Spielstand-Cloud (Runde 9, 21.07.2026) ----------
// Warum es das braucht: Profile liegen im Speicher des jeweiligen Browsers.
// Vom iPhone sieht man die PC-Profile deshalb NICHT. Hier bekommt ein Profil
// einen Code; mit Code + PIN holt man denselben Spielstand auf jedes Gerät.
// Bewusst manuell (hochladen/laden per Knopf) — automatisches Synchronisieren
// könnte den neueren Stand des anderen Geräts überschreiben.

// Server-Fehler in Klartext übersetzen (der Nutzer ist kein Entwickler).
function cloudErrText(e) {
  const m = (e && e.message) || '';
  if (/Could not find the function|schema cache/i.test(m))
    return 'Die Cloud ist im Server noch nicht eingerichtet (Migration 0003 fehlt).';
  if (/wrong pin/i.test(m))     return 'Falsche PIN.';
  if (/unknown code/i.test(m))  return 'Diesen Code gibt es nicht.';
  if (/not authenticated/i.test(m)) return 'Keine Verbindung zum Server.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Keine Internetverbindung.';
  return m;
}

function openCloudSave() {
  const p = activeProfile();
  if (!p) { floatHint('Erst ein Profil wählen.'); return; }
  let busy = false;

  const render = (msg = '') => {
    const link = profileCloud(p.id);
    const ov = showOverlay(`
      <div class="cloud-box">
        <h2>${iconArt('orb', 18)} Spielstand-Cloud</h2>
        <div class="cloud-hint">Ein Code + PIN — damit spielst du dasselbe Profil
          auf Handy und PC.</div>
        ${link ? `
          <div class="cloud-code-box">
            <div class="cloud-code-label">Dein Code</div>
            <div class="cloud-code">${link.code}</div>
            <div class="cloud-when">zuletzt hochgeladen: ${new Date(link.at).toLocaleString('de-DE')}</div>
          </div>` : ''}
        ${msg ? `<div class="pvp-msg">${msg}</div>` : ''}
        <button class="btn btn-primary" id="cl-push" ${busy ? 'disabled' : ''}>
          ${iconArt('star', 14)} ${link ? 'Jetzt hochladen' : 'Code erstellen'}</button>
        <button class="btn btn-ghost" id="cl-pull" ${busy ? 'disabled' : ''}>
          ${iconArt('book', 14)} Mit Code laden</button>
        <div class="ov-actions">
          <button class="btn btn-ghost" id="cl-close">Schließen</button>
        </div>
      </div>`, 'cloud-ov');
    ov.querySelector('#cl-close').onclick = () => { Sfx.click(); closeOverlay(); };
    ov.querySelector('#cl-push').onclick = () => {
      Sfx.click();
      const l = profileCloud(p.id);
      if (l && l.pin) { doPush(l.code, l.pin); return; }
      // Erster Upload: PIN festlegen (schützt den Code vor Fremdzugriff).
      openPinPad('set', pin => doPush(null, pin), () => {});
    };
    ov.querySelector('#cl-pull').onclick = () => { Sfx.click(); openCloudPull(); };
  };

  const doPush = async (code, pin) => {
    busy = true; render('Lade hoch…');
    try {
      await Net.ensureSession();
      const newCode = await Net.cloudPush(code, pin, p.name, Save);
      setProfileCloud(p.id, newCode, pin);
      busy = false;
      render('Hochgeladen. Code: ' + newCode);
      Sfx.win();
    } catch (e) {
      busy = false;
      render('Nicht hochgeladen: ' + cloudErrText(e));
    }
  };

  render();
}

// Code eingeben, dann PIN — danach wird ein NEUES lokales Profil angelegt.
// Bewusst neu statt überschreiben: so geht kein Stand auf diesem Gerät verloren.
function openCloudPull() {
  const render = (msg = '', code = '') => {
    const ov = showOverlay(`
      <div class="cloud-box">
        <h2>${iconArt('book', 18)} Spielstand laden</h2>
        <div class="cloud-hint">Code vom anderen Gerät eintippen (8 Zeichen).</div>
        <input class="cloud-input" id="cl-code" maxlength="8" autocapitalize="characters"
          autocomplete="off" spellcheck="false" value="${code}" placeholder="ABCD2345">
        ${msg ? `<div class="pvp-msg">${msg}</div>` : ''}
        <div class="ov-actions">
          <button class="btn btn-ghost" id="cl-back">Zurück</button>
          <button class="btn btn-primary" id="cl-go">Weiter</button>
        </div>
      </div>`, 'cloud-ov');
    const input = ov.querySelector('#cl-code');
    ov.querySelector('#cl-back').onclick = () => { Sfx.click(); openCloudSave(); };
    ov.querySelector('#cl-go').onclick = () => {
      const c = (input.value || '').trim().toUpperCase();
      if (c.length !== 8) { render('Der Code hat 8 Zeichen.', c); return; }
      Sfx.click();
      openPinPad('set', pin => doPull(c, pin), () => {});
    };
  };

  const doPull = async (code, pin) => {
    render('Lade…', code);
    try {
      await Net.ensureSession();
      const row = await Net.cloudPull(code, pin);
      const prof = importCloudProfile(row.name || 'Cloud-Spieler', row.data, code, pin);
      if (!prof) { render('Es sind schon 4 Profile angelegt — eins löschen und erneut versuchen.', code); return; }
      Sfx.win();
      closeOverlay();
      showScreen('menu');
      floatHint('Spielstand geladen: ' + prof.name);
    } catch (e) {
      render('Nicht geladen: ' + cloudErrText(e), code);
    }
  };

  render();
}

// ---------- Dev-Kampf-Simulation: Team gegen unverwüstliche Dummys (Ults testen) ----------

// Trainings-Dummy: viel LP, kaum Schaden, zündet nie eine Ult (trigger 'none' =
// bekommt nie Energie). Nur zur Laufzeit registriert, taucht nirgends sonst auf (dev-Flag).
Abilities.dummy_passive = { name: 'Reglos', trigger: 'none', effect: 'none', energyGain: 0, params: {} };
Abilities.dummy_active = { name: '—', effect: 'elementalNuke', target: 'default', params: { atkMultiplier: 0 } };
Creatures.dev_dummy = {
  id: 'dev_dummy', name: 'Dummy', archetype: 'golem', element: 'steam',
  rarity: 'common', tier: 1, baseStats: { hp: 5000, atk: 2, def: 0, spd: 1 },
  passive: 'dummy_passive', active: 'dummy_active', dev: true,
};

function startDevBattle() {
  const team = Save.team.filter(id => Save.collection[id]).slice(0, 3);
  if (!team.length) { alert('Kein Team vorhanden — erst Kreaturen ins Team legen.'); return; }
  closeOverlay();
  const stage = {
    id: 'dev', name: 'Dummy-Arena', theme: 'storm', dev: true,
    enemies: [{ id: 'dev_dummy', level: 1 }, { id: 'dev_dummy', level: 1 }, { id: 'dev_dummy', level: 1 }],
    gold: 0, firstClearBonus: 0, unlockCreature: null,
  };
  beginBattle(stage, team);
  B.battle.allies.forEach(u => { u.energy = 100; }); // sofort volle Energie -> alle Ults testbar
  renderBars();
}

function showDevBattleResult(winner) {
  const overText = winner === 'ally' ? 'Dummies besiegt' : 'Sim beendet';
  showOverlay(`
    <div class="result ${winner === 'ally' ? 'victory' : 'defeat'}">
      <h1>${overText}</h1>
      <p class="defeat-tip">${iconArt('gear', 15)} Trainings-Simulation — keine Belohnung.</p>
      <div class="ov-actions">
        <button class="btn btn-ghost" id="res-devexit">Zurück</button>
        <button class="btn btn-primary" id="res-devagain">Nochmal</button>
      </div>
    </div>`, 'result-ov');
  // „Zurück" muss auf einem echten Screen landen, sonst bleibt die tote Arena stehen.
  $('#res-devexit').onclick = () => { Sfx.click(); closeOverlay(); leaveBattle('menu'); };
  $('#res-devagain').onclick = () => { Sfx.click(); closeOverlay(); endBattleUI(); startDevBattle(); };
}

// ---------- Developer-Board (Optionen -> Developer-Board): alle Kreaturen + Tools ----------

function openDevBoard() {
  const all = Object.values(Creatures).filter(c => !c.dev); // Dummy nicht listen
  const base = all.filter(c => !c.fusion);
  const fus = all.filter(c => c.fusion);
  const rowHTML = c => {
    const owned = Save.collection[c.id];
    return `<div class="dev-row ${owned ? 'owned' : ''}">
      <div class="dev-art">${creatureArt(c, { noAura: true })}</div>
      <div class="dev-info">
        <b>${c.name}</b>
        <span>${ElementIcons[c.element]} ${c.archetype} · ${(RoleInfo[c.role] || {}).name || c.role}${owned ? ' · Lv ' + owned.level : ''}</span>
        <span class="dev-stats">${iconArt('heart', 12)}${c.baseStats.hp} ${iconArt('sword', 12)}${c.baseStats.atk} ${iconArt('shield', 12)}${c.baseStats.def} ${iconArt('bolt', 12)}${c.baseStats.spd}</span>
      </div>
      <button class="btn btn-sm btn-ghost dev-add" data-cid="${c.id}">${owned ? 'MAX' : '+'}</button>
    </div>`;
  };
  const ov = showOverlay(`
    <div class="dev-board">
      <h2>Developer-Board</h2>
      <div class="dev-tools">
        <button class="btn btn-sm btn-primary" id="dev-sim">${iconArt('sword', 13)} Kampf-Sim (Dummys)</button>
        <button class="btn btn-sm" id="dev-gold">+1000 ${iconArt('coin', 13)}</button>
        <button class="btn btn-sm" id="dev-unlock">Alle freischalten</button>
        <button class="btn btn-sm" id="dev-max">Alle Max-Level</button>
        <button class="btn btn-sm" id="dev-stage">Alle Stages</button>
        <button class="btn btn-sm" id="dev-bpxp">+500 BP-XP</button>
        <button class="btn btn-sm" id="dev-gallery">Sprite-Galerie</button>
      </div>
      <div class="dev-sub">Basis-Kreaturen (${base.length})</div>
      <div class="dev-list">${base.map(rowHTML).join('')}</div>
      <div class="dev-sub">Fusionen (${fus.length})</div>
      <div class="dev-list">${fus.map(rowHTML).join('')}</div>
      <div class="ov-actions"><button class="btn btn-primary" id="dev-close">Schließen</button></div>
    </div>`, 'dev-ov');
  const after = () => { persist(); updateGoldDisplay(); };
  ov.querySelector('#dev-sim').onclick = () => { Sfx.click(); startDevBattle(); };
  ov.querySelector('#dev-gold').onclick = () => { Save.gold += 1000; after(); Sfx.win(); openDevBoard(); };
  ov.querySelector('#dev-unlock').onclick = () => {
    Object.keys(Creatures).forEach(id => { if (!Save.collection[id]) Save.collection[id] = { level: 1, xp: 0 }; });
    after(); Sfx.win(); openDevBoard();
  };
  ov.querySelector('#dev-max').onclick = () => {
    Object.values(Save.collection).forEach(e => { e.level = MAX_LEVEL; e.xp = 0; });
    after(); Sfx.win(); openDevBoard();
  };
  ov.querySelector('#dev-stage').onclick = () => {
    STAGES.forEach(s => { if (!Save.stages[s.id]) Save.stages[s.id] = 1; });
    after(); Sfx.win(); openDevBoard();
  };
  ov.querySelector('#dev-bpxp').onclick = () => { Save.bp.xp += 500; after(); Sfx.win(); openDevBoard(); };
  ov.querySelector('#dev-gallery').onclick = () => { Sfx.click(); openPixelTest(); };
  ov.querySelectorAll('.dev-add').forEach(b => b.onclick = () => {
    const id = b.dataset.cid;
    if (!Save.collection[id]) Save.collection[id] = { level: 1, xp: 0 };
    else Save.collection[id].level = MAX_LEVEL;
    after(); Sfx.click(); openDevBoard();
  });
  ov.querySelector('#dev-close').onclick = () => { Sfx.click(); openSettings(); };
}

// ---------- Sprite-Galerie (Debug/Design-Review, nur noch per Konsole: openPixelTest()) ----------

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

// Logo ist fest der Element-Ring (Nutzer-Entscheidung 17.07.2026) — die frühere
// Logo-Auswahl wurde entfernt; emblemArt() ohne Argument liefert immer 'ring'.

// ---------- Profil-Auswahl (20.07.2026): getrennte Spielstände pro Person ----------

// Startbildschirm nach dem Splash, wenn noch kein Profil aktiv ist. Auch aus den
// Optionen erreichbar („Profil wechseln"). Erst nach der Wahl geht es ins Menü.
function openProfileGate(opts = {}) {
  const render = () => {
    const cards = Profiles.list.map(p => {
      const sum = profileSummary(p.id);
      return `
        <button class="prof-card" data-id="${p.id}">
          <span class="prof-name">${p.name}</span>
          <span class="prof-stats">
            ${iconArt('egg', 14)} ${sum.creatures}
            ${iconArt('star', 14)} ${sum.stars}
            ${p.pin ? iconArt('lock', 14) : ''}
          </span>
        </button>`;
    }).join('');
    const ov = showOverlay(`
      <div class="prof-gate">
        <div class="prof-emblem">${emblemArt()}</div>
        <div class="prof-list">${cards}</div>
        ${Profiles.list.length < MAX_PROFILES
          ? `<button class="btn btn-primary" id="prof-new">＋</button>` : ''}
        ${opts.cancelable ? `<div class="ov-actions">
          <button class="btn btn-ghost" id="prof-cancel">${iconArt('back', 16)}</button></div>` : ''}
      </div>`, 'prof-overlay');

    ov.querySelectorAll('.prof-card').forEach(card => {
      const p = Profiles.list.find(x => x.id === card.dataset.id);
      card.onclick = () => {
        if (card._lpFired) { card._lpFired = false; return; }
        Sfx.click();
        if (p.pin) askPin(p, () => enterProfile(p.id));
        else enterProfile(p.id);
      };
      // Long-Press löscht ein Profil (mit Rückfrage) — kein Extra-Button nötig.
      attachLongPress(card, () => {
        if (!confirm(`Profil „${p.name}" mit allem Fortschritt löschen?`)) return;
        deleteProfile(p.id);
        render();
      });
    });
    const nw = ov.querySelector('#prof-new');
    if (nw) nw.onclick = () => { Sfx.click(); openNewProfile(render); };
    const cancel = ov.querySelector('#prof-cancel');
    if (cancel) cancel.onclick = () => { Sfx.click(); closeOverlay(); };
  };
  render();
}

// Profil aktivieren und ins Hauptmenü springen.
function enterProfile(id) {
  activateProfile(id);
  closeOverlay();
  showScreen('menu');
  if (typeof dailyBonusAvailable === 'function' && dailyBonusAvailable()) showDailyBonus();
}

// Neues Profil: Name (max. 12 Zeichen) + optionaler PIN. `st` überlebt den
// Abstecher zum Ziffernblock (der baut das Overlay neu auf).
function openNewProfile(onDone, st = { name: '', pin: '' }) {
  const ov = showOverlay(`
    <div class="prof-new">
      <div class="prof-emblem small">${emblemArt()}</div>
      <input type="text" id="prof-name" class="pixel-input" maxlength="12"
             placeholder="Name" autocomplete="off" spellcheck="false" value="${st.name}">
      <button class="btn btn-ghost ${st.pin ? 'on' : ''}" id="prof-pin-toggle">${iconArt('lock', 14)}</button>
      <div class="ov-actions">
        <button class="btn btn-ghost" id="prof-abort">${iconArt('back', 16)}</button>
        <button class="btn btn-primary" id="prof-ok">${iconArt('sword', 16)}</button>
      </div>
    </div>`, 'prof-overlay');
  const nameInput = ov.querySelector('#prof-name');
  const toggle = ov.querySelector('#prof-pin-toggle');
  toggle.onclick = () => {
    Sfx.click();
    st.name = nameInput.value;
    if (st.pin) { st.pin = ''; toggle.classList.remove('on'); return; }   // PIN wieder abwählen
    openPinPad('set', code => { st.pin = code; }, () => openNewProfile(onDone, st));
  };
  ov.querySelector('#prof-abort').onclick = () => { Sfx.click(); closeOverlay(); onDone(); };
  ov.querySelector('#prof-ok').onclick = () => {
    Sfx.click();
    const p = createProfile(nameInput.value.trim() || 'Spieler', st.pin);
    if (p) enterProfile(p.id);
  };
}

// PIN abfragen, bevor ein geschütztes Profil geöffnet wird.
function askPin(profile, onOk) {
  openPinPad('check', code => {
    if (code === profile.pin) { onOk(); return true; }
    return false;                         // falsch: Pad zeigt Fehler und bleibt offen
  }, () => openProfileGate());
}

// Ziffernblock. mode 'set' = neuen PIN festlegen, 'check' = prüfen.
// onCode('1234') -> bei 'check' true/false (falsch = Pad bleibt offen).
function openPinPad(mode, onCode, onBack) {
  let code = '';
  const render = (err = false) => {
    const ov = showOverlay(`
      <div class="pin-pad ${err ? 'err' : ''}">
        <div class="pin-dots">${[0, 1, 2, 3].map(i =>
          `<span class="pin-dot ${i < code.length ? 'on' : ''}"></span>`).join('')}</div>
        <div class="pin-keys">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="pin-key" data-n="${n}">${n}</button>`).join('')}
          <button class="pin-key pin-back" data-del="1">${iconArt('back', 16)}</button>
          <button class="pin-key" data-n="0">0</button>
          <button class="pin-key pin-exit" data-exit="1">${iconArt('giveup', 16)}</button>
        </div>
      </div>`, 'prof-overlay');
    ov.querySelectorAll('.pin-key').forEach(k => k.onclick = () => {
      Sfx.click();
      if (k.dataset.exit) { closeOverlay(); onBack(); return; }
      if (k.dataset.del) { code = code.slice(0, -1); render(); return; }
      if (code.length >= 4) return;
      code += k.dataset.n;
      if (code.length < 4) { render(); return; }
      // Vier Ziffern voll: auswerten.
      if (mode === 'set') { closeOverlay(); onCode(code); onBack(); return; }
      if (onCode(code) === true) return;   // richtig -> Aufrufer übernimmt
      code = '';
      render(true);
    });
  };
  render();
}
