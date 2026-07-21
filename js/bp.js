// bp.js — Battlepass (19.07.2026). Ersetzt die Fusion-Kachel im Hauptmenü.
// Modell (Nutzer-Interview): kostenlos + Premium-Spur, Fortschritt aus Kämpfen +
// Tages-/Wochen-Aufgaben, feste Season (~30 Tage, danach Reset der Bahn).
// Belohnungen: Gold, Eier (zufällige Basis-Kreatur), Kosmetik.
// currentSeason()/SEASON_* liegen in state.js (Save wird dort früher gebaut).

const BP_TIERS = 30;
const BP_TIER_XP = 100;   // Punkte pro Stufe
const BP_WIN_XP = 20;     // Sieg
const BP_LOSS_XP = 6;     // Niederlage/Aufgeben

// ---------- Stufen-Fortschritt ----------

function bpCompleted() { return Math.min(BP_TIERS, Math.floor(Save.bp.xp / BP_TIER_XP)); }
function bpIntoTier() { return Math.min(BP_TIER_XP, Save.bp.xp - bpCompleted() * BP_TIER_XP); }

// ---------- Belohnungs-Bahn ----------
// Deterministisch aus der Stufennummer erzeugt — kein Handtabellieren von 30 Zeilen.

function bpReward(tier, track) {
  if (track === 'free') {
    if (tier % 10 === 0) return { kind: 'egg' };
    if (tier % 5 === 0)  return { kind: 'item', rarity: 'rare' };
    return { kind: 'gold', amount: 40 + tier * 6 };
  }
  // Premium-Spur: dickere Belohnungen, Kosmetik, Items, Milestone-Eier.
  if (tier % 10 === 0) return { kind: 'egg' };
  if (tier % 4 === 0)  return { kind: 'item', rarity: tier >= 20 ? 'epic' : 'rare' };
  if (tier % 2 === 0)  return { kind: 'cosmetic', id: 'cos_s' + Save.bp.season + '_t' + tier };
  return { kind: 'gold', amount: 80 + tier * 10 };
}

function bpRandomCreature() {
  const pool = Object.values(Creatures).filter(c => !c.fusion && !c.dev && !Save.collection[c.id]);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

// Vergibt die Belohnung, gibt eine Anzeige-Info zurück ({icon,label,cid?}).
function bpGrant(rw) {
  if (rw.kind === 'gold') { Save.gold += rw.amount; return { icon: 'coin', label: '+' + rw.amount }; }
  if (rw.kind === 'egg') {
    const id = bpRandomCreature();
    if (id) { Save.collection[id] = { level: 1, xp: 0 }; return { icon: 'egg', label: Creatures[id].name, cid: id }; }
    Save.gold += 150; return { icon: 'coin', label: '+150' }; // alles vorhanden -> Gold
  }
  if (rw.kind === 'item') {
    const id = randomItemByRarity(rw.rarity || 'rare');
    grantItem(id);
    return { icon: Items[id].icon, label: Items[id].name };
  }
  if (rw.kind === 'cosmetic') { Save.bp.cosmetics[rw.id] = true; return { icon: 'sparkle', label: 'Kosmetik' }; }
  return { icon: 'coin', label: '' };
}

function bpCanClaim(tier, track) {
  if (bpCompleted() < tier) return false;
  if (track === 'prem' && !Save.bp.premium) return false;
  const done = track === 'free' ? Save.bp.claimedFree : Save.bp.claimedPrem;
  return !done[tier];
}

function bpClaim(tier, track) {
  if (!bpCanClaim(tier, track)) return null;
  const info = bpGrant(bpReward(tier, track));
  (track === 'free' ? Save.bp.claimedFree : Save.bp.claimedPrem)[tier] = true;
  persist();
  return info;
}

function bpUnlockPremium() { Save.bp.premium = true; persist(); }

// ---------- Aufgaben (Quests) ----------

const BP_DAILY_POOL = [
  { id: 'd_win',  type: 'win',     goal: 3, xp: 40, icon: 'sword', text: 'Gewinne 3 Kämpfe' },
  { id: 'd_play', type: 'battle',  goal: 5, xp: 35, icon: 'flag',  text: 'Bestreite 5 Kämpfe' },
  { id: 'd_lvl',  type: 'levelup', goal: 2, xp: 40, icon: 'bolt',  text: 'Level 2 Kreaturen' },
  { id: 'd_fuse', type: 'fusion',  goal: 1, xp: 50, icon: 'orb',   text: 'Fusioniere 1×' },
];
const BP_WEEKLY_POOL = [
  { id: 'w_win',  type: 'win',     goal: 12, xp: 120, icon: 'sword', text: 'Gewinne 12 Kämpfe' },
  { id: 'w_lvl',  type: 'levelup', goal: 6,  xp: 120, icon: 'bolt',  text: 'Level 6 Kreaturen' },
  { id: 'w_fuse', type: 'fusion',  goal: 2,  xp: 150, icon: 'orb',   text: 'Fusioniere 2×' },
  { id: 'w_play', type: 'battle',  goal: 20, xp: 110, icon: 'flag',  text: 'Bestreite 20 Kämpfe' },
];

function _bpDayKey() { return new Date().toISOString().slice(0, 10); }
function _bpWeekKey() {
  const d = new Date();
  const on = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  on.setUTCDate(on.getUTCDate() - ((on.getUTCDay() + 6) % 7)); // Montag der Woche
  return on.toISOString().slice(0, 10);
}
function _bpPick(pool, n, seed) {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const start = h % pool.length, out = [];
  for (let i = 0; i < n; i++) out.push(pool[(start + i) % pool.length]);
  return out;
}

function bpEnsureQuests() {
  const q = Save.bp.quests || {};
  const day = _bpDayKey(), week = _bpWeekKey();
  if (q.day !== day) { q.day = day; q.daily = _bpPick(BP_DAILY_POOL, 3, day).map(t => ({ ...t, prog: 0, done: false })); }
  if (q.week !== week) { q.week = week; q.weekly = _bpPick(BP_WEEKLY_POOL, 3, week).map(t => ({ ...t, prog: 0, done: false })); }
  Save.bp.quests = q;
  return q;
}

// Fortschritt melden (von battle/levelUp/fuseCreatures) — schließt Aufgaben ab.
function bpTrack(type, n = 1) {
  if (!Save.bp) return 0;
  const q = bpEnsureQuests();
  let awarded = 0;
  [...q.daily, ...q.weekly].forEach(t => {
    if (t.type === type && !t.done) {
      t.prog = Math.min(t.goal, t.prog + n);
      if (t.prog >= t.goal) { t.done = true; awarded += t.xp; }
    }
  });
  if (awarded) Save.bp.xp += awarded;
  persist();
  return awarded;
}

// Kampf-Ende: BP-Punkte + Sieg/Kampf-Aufgaben.
function bpOnBattle(won) {
  Save.bp.xp += won ? BP_WIN_XP : BP_LOSS_XP;
  bpTrack('battle');
  if (won) bpTrack('win');
  persist();
}

// ---------- Screen ----------

function bpRewardIcon(rw) {
  if (rw.kind === 'gold') return `${iconArt('coin', 20)}<i>${rw.amount}</i>`;
  if (rw.kind === 'egg') return iconArt('egg', 24);
  if (rw.kind === 'item') return iconArt('bag', 22);
  if (rw.kind === 'cosmetic') return iconArt('sparkle', 22);
  return '';
}

function bpQuestHTML(q) {
  return `<div class="bp-quest ${q.done ? 'done' : ''}">
    ${iconArt(q.icon, 18)}
    <div class="bp-q-main"><span>${q.text}</span>
      <div class="bar bp-q-bar"><div class="fill" style="width:${Math.round(q.prog / q.goal * 100)}%"></div></div>
    </div>
    <b class="bp-q-x">${q.done ? iconArt('star', 14) : '+' + q.xp}</b>
  </div>`;
}

function renderBattlepass(root) {
  const q = bpEnsureQuests();
  const comp = bpCompleted();
  const pct = comp >= BP_TIERS ? 100 : Math.round(bpIntoTier() / BP_TIER_XP * 100);
  const wrap = el('div', 'bp-screen');

  const tiers = [];
  for (let t = 1; t <= BP_TIERS; t++) tiers.push(t);
  const trackHTML = tiers.map(tier => {
    const fr = bpReward(tier, 'free'), pr = bpReward(tier, 'prem');
    const fC = Save.bp.claimedFree[tier], pC = Save.bp.claimedPrem[tier];
    const fReady = bpCanClaim(tier, 'free'), pReady = bpCanClaim(tier, 'prem');
    const reached = comp >= tier;
    return `<div class="bp-tier ${reached ? 'reached' : ''} ${tier === comp + 1 ? 'next' : ''}">
      <button class="bp-cell prem ${pC ? 'claimed' : pReady ? 'ready' : ''} ${Save.bp.premium ? '' : 'plock'}"
        data-tier="${tier}" data-track="prem" ${pReady ? '' : 'disabled'}>
        ${pC ? iconArt('star', 16) : bpRewardIcon(pr)}
        ${!Save.bp.premium ? `<span class="bp-plock">${iconArt('lock', 12)}</span>` : ''}</button>
      <div class="bp-num">${tier}</div>
      <button class="bp-cell free ${fC ? 'claimed' : fReady ? 'ready' : ''}"
        data-tier="${tier}" data-track="free" ${fReady ? '' : 'disabled'}>
        ${fC ? iconArt('star', 16) : bpRewardIcon(fr)}</button>
    </div>`;
  }).join('');

  wrap.innerHTML = `
    <div class="bp-head">
      <div class="bp-title-row">
        <div class="screen-title">Battlepass</div>
        <div class="bp-season">${iconArt('star', 14)} Season ${Save.bp.season}</div>
      </div>
      <div class="bp-tierbig">
        <div class="bp-tiernum">${comp}</div>
        <div class="bp-tierbar-wrap">
          <div class="bar bp-tierbar"><div class="fill" style="width:${pct}%"></div></div>
          <span class="bp-tierhint">${comp >= BP_TIERS ? 'Bahn komplett!' : bpIntoTier() + '/' + BP_TIER_XP + ' zur nächsten Stufe'}</span>
        </div>
      </div>
      ${Save.bp.premium
        ? `<div class="bp-prem-on">${iconArt('star', 15)} Premium aktiv</div>`
        : `<button class="btn btn-primary btn-sm bp-prem-btn" id="bp-prem">${iconArt('orb', 14)} Premium freischalten</button>`}
    </div>
    <div class="bp-legend"><span class="bp-lg prem">${iconArt('orb', 13)} Premium</span><span class="bp-lg free">${iconArt('coin', 13)} Gratis</span></div>
    <div class="bp-track">${trackHTML}</div>
    <div class="bp-quests">
      <div class="coll-sub">Tages-Aufgaben</div>
      ${q.daily.map(bpQuestHTML).join('')}
      <div class="coll-sub">Wochen-Aufgaben</div>
      ${q.weekly.map(bpQuestHTML).join('')}
    </div>`;
  root.appendChild(wrap);

  // Track zur nächsten Stufe scrollen (horizontal).
  const track = wrap.querySelector('.bp-track');
  const nextCell = track.querySelector('.bp-tier.next');
  if (nextCell) track.scrollLeft = Math.max(0, nextCell.offsetLeft - track.clientWidth / 2 + 30);

  const premBtn = wrap.querySelector('#bp-prem');
  if (premBtn) premBtn.onclick = () => {
    const ov = showOverlay(`
      <div class="bp-prem-dialog">
        <div class="gu-icon">${iconArt('orb', 40)}</div>
        <div class="gu-q">Premium-Pass freischalten?</div>
        <div class="gu-sub">Demo — echter Kauf folgt im Store (Phase 4). Schaltet alle Premium-Belohnungen dieser Season frei.</div>
        <div class="ov-actions">
          <button class="btn btn-ghost" id="bp-prem-no">Abbrechen</button>
          <button class="btn btn-primary" id="bp-prem-yes">Freischalten</button>
        </div>
      </div>`, 'giveup-ov');
    ov.querySelector('#bp-prem-no').onclick = () => { Sfx.click(); closeOverlay(); };
    ov.querySelector('#bp-prem-yes').onclick = () => {
      Sfx.win(); bpUnlockPremium(); closeOverlay(); showScreen('battlepass');
    };
  };

  wrap.querySelectorAll('.bp-cell').forEach(btn => btn.onclick = () => {
    const tier = +btn.dataset.tier, track = btn.dataset.track;
    const info = bpClaim(tier, track);
    if (!info) return;
    Sfx.win();
    updateGoldDisplay();
    // Kurze Belohnungs-Feier
    const ov = showOverlay(`
      <div class="bp-claim">
        <div class="bp-claim-ico">${info.cid ? creatureArt(Creatures[info.cid]) : iconArt(info.icon, 44)}</div>
        <div class="bp-claim-label">${info.label}</div>
        <div class="ov-actions"><button class="btn btn-primary" id="bp-claim-ok">Weiter</button></div>
      </div>`, 'result-ov');
    ov.querySelector('#bp-claim-ok').onclick = () => { Sfx.click(); closeOverlay(); showScreen('battlepass'); };
  });
}
