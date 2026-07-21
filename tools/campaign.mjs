// tools/campaign.mjs — prueft die Kampagne so, wie ein Spieler sie erlebt:
// verfuegbarer Pool waechst mit den Unlocks, das Spiel waehlt das beste Team
// aus diesem Pool. Ausgabe = Schwierigkeitskurve.
//   node tools/campaign.mjs
import { run, Creatures } from './sim.mjs';
import fs from 'fs';

const src = fs.readFileSync(new URL('../js/stages.js', import.meta.url), 'utf8');
export const STAGES = eval(src.replace(/^\s*\/\/.*$/gm, '').match(/const STAGES = (\[[\s\S]*?\n\]);/)[1]);

const STARTERS = ['fire_drache', 'nature_golem', 'water_geist'];

// Bestes Team aus dem Pool: alle 3er-Kombinationen und Reihenfolgen probieren
// waere zu teuer — wir testen alle Kombinationen, Reihenfolge nach Rolle
// (Tank zuerst), das entspricht dem, was ein Spieler tut.
const ROLE_ORDER = { tank: 0, bruiser: 1, sustain: 2, dps: 3, dot: 4, speed: 5, support: 6 };

function bestTeam(pool, level, enemies) {
  let best = null;
  for (let i = 0; i < pool.length; i++)
    for (let j = i + 1; j < pool.length; j++)
      for (let k = j + 1; k < pool.length; k++) {
        const ids = [pool[i], pool[j], pool[k]]
          .sort((a, b) => ROLE_ORDER[Creatures[a].role] - ROLE_ORDER[Creatures[b].role]);
        const defs = ids.map((id, s) => ({ id, level: level(id), slot: s }));
        const r = run(defs, enemies);
        const score = r.win ? 1000 + r.allyHp / r.allyMax * 100 : r.enemyHp * -1;
        if (!best || score > best.score) best = { score, ids, r };
      }
  return best;
}

// Echte Level-Kurve: XP kommt aus den Kaempfen (state.js: 10 + 2·Stage je Sieg,
// xpNeed = 35·Level, Cap 5). `replays` bildet ab, dass ein Spieler Stages auch
// wiederholt. Neu freigeschaltete Kreaturen starten laut unlockLevel() knapp
// unter dem Team-Schnitt.
const MAX_LEVEL = 5;
function levelFromXp(xp) {
  let lv = 1, rest = xp;
  while (lv < MAX_LEVEL && rest >= 35 * lv) { rest -= 35 * lv; lv++; }
  return lv;
}

export function checkCampaign({ replays = 1.0 } = {}) {
  const pool = [...STARTERS];
  const xp = {}; STARTERS.forEach(id => xp[id] = 0);
  const rows = [];
  for (const st of STAGES) {
    const lvl = id => levelFromXp(xp[id] || 0);
    const enemies = st.enemies.map((e, s) => ({ ...e, slot: s }));
    const b = bestTeam(pool, lvl, enemies);
    rows.push({
      id: st.id, boss: !!st.boss, win: b.r.win, sec: b.r.sec,
      margin: b.r.win ? Math.round(b.r.allyHp / b.r.allyMax * 100) : 0,
      lv: b.ids.map(id => lvl(id)).join(''),
      team: b.ids.map(x => x.replace('_', '·')).join(' '),
    });
    // XP an das eingesetzte Team verteilen (Sieg = voll, wie im Spiel).
    const gain = (10 + st.id * 2) * replays;
    b.ids.forEach(id => xp[id] = (xp[id] || 0) + gain);
    // Unlocks starten knapp unter dem Team-Schnitt (state.js unlockLevel()).
    const startLv = () => {
      const ls = pool.map(id => lvl(id)).sort((a, b2) => a - b2);
      return Math.max(1, Math.min(MAX_LEVEL, ls[Math.floor(ls.length / 2)] - 1));
    };
    [st.unlockCreature, st.bossCreature].forEach(nid => {
      if (!nid || pool.includes(nid)) return;
      const lv0 = startLv();
      let need = 0; for (let l = 1; l < lv0; l++) need += 35 * l;
      xp[nid] = need;
      pool.push(nid);
    });
  }
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/')) {
  const rows = checkCampaign();
  console.log('St  Erg    Rest-LP  Dauer  Bestes Team');
  rows.forEach(r => console.log(
    String(r.id).padStart(2) + (r.boss ? '*' : ' '),
    (r.win ? 'SIEG' : 'VERL').padEnd(6),
    String(r.margin).padStart(5) + '%',
    (r.sec.toFixed(0) + 's').padStart(6), ' ', r.team));
  const lost = rows.filter(r => !r.win);
  console.log('\nNiederlagen trotz bestem Team: ' + lost.length + (lost.length ? ' (' + lost.map(r => r.id).join(', ') + ')' : ''));
  const wins = rows.filter(r => r.win);
  console.log('Rest-LP im Schnitt: ' + Math.round(wins.reduce((s, r) => s + r.margin, 0) / wins.length) + '%');
  console.log('Dauer median: ' + rows.map(r => r.sec).sort((a, b) => a - b)[Math.floor(rows.length / 2)].toFixed(0) + 's Kampfzeit');
}
