// tools/sim.mjs — Balancing-Werkzeug (Runde 10). Laeuft mit `node tools/sim.mjs`.
// Nutzt die generierte engine.js, also EXAKT dieselbe Engine wie Browser + Server.
// Vor jedem Lauf engine.js neu erzeugen (siehe CLAUDE.md), sonst misst man alten Code.

const E = await import('../supabase/functions/verify-match/engine.js');
export const { createBattle, updateBattle, Creatures, Items, Elements, statsAtLevel } = E;

export const ARCHS = ['drache', 'golem', 'greif', 'wolf', 'wyrm', 'geist', 'phoenix'];
export const BASE_ELS = ['fire', 'nature', 'water'];

export function run(allyDefs, enemyDefs, opts = {}) {
  const b = createBattle(allyDefs, enemyDefs, opts.mods);
  b.autoUlti = true;
  let n = 0;
  while (!b.over && b.time < 400000 && n < 40000) { updateBattle(b, 16); n++; }
  return {
    win: b.winner === 'ally',
    winner: b.winner,
    sec: b.time / 1000,
    allyHp: b.allies.reduce((s, u) => s + Math.max(0, u.hp), 0),
    allyMax: b.allies.reduce((s, u) => s + u.maxHp, 0),
    enemyHp: b.enemies.reduce((s, u) => s + Math.max(0, u.hp), 0),
  };
}

// 1v1-Rangliste der Archetypen bei neutralem Element.
export function roleLadder(level = 5, el = 'fire') {
  const win = {}; ARCHS.forEach(a => win[a] = 0);
  for (let i = 0; i < ARCHS.length; i++) {
    for (let j = i + 1; j < ARCHS.length; j++) {
      const r = run([{ id: el + '_' + ARCHS[i], level }], [{ id: el + '_' + ARCHS[j], level }]);
      win[ARCHS[r.win ? i : j]]++;
    }
  }
  return Object.entries(win).sort((a, b) => b[1] - a[1]);
}

// Rundenturnier ueber alle 3er-Kombinationen (Stichprobe), Element neutralisiert.
export function teamTournament(level = 5, el = 'fire', stride = 7) {
  const combos = [];
  for (let i = 0; i < 7; i++) for (let j = i; j < 7; j++) for (let k = j; k < 7; k++)
    combos.push([ARCHS[i], ARCHS[j], ARCHS[k]]);
  const teams = combos.map(c => ({
    name: c.join('+'),
    defs: c.map((a, s) => ({ id: el + '_' + a, level, slot: s })),
  }));
  const score = {}; teams.forEach(t => score[t.name] = 0);
  let games = 0;
  for (let x = 0; x < teams.length; x++) for (let y = 0; y < teams.length; y++) {
    if (x === y || (x * teams.length + y) % stride !== 0) continue;
    games++;
    if (run(teams[x].defs, teams[y].defs).win) score[teams[x].name]++;
  }
  return { rank: Object.entries(score).sort((a, b) => b[1] - a[1]), games };
}

// Durchschnittliche Kampfdauer ueber zufaellige, aber feste Paarungen.
export function avgDuration(level = 5) {
  const times = [];
  for (let i = 0; i < ARCHS.length; i++) for (let j = 0; j < ARCHS.length; j++) {
    const a = [0, 1, 2].map((s) => ({ id: 'fire_' + ARCHS[(i + s) % 7], level, slot: s }));
    const e = [0, 1, 2].map((s) => ({ id: 'fire_' + ARCHS[(j + s) % 7], level, slot: s }));
    times.push(run(a, e).sec);
  }
  times.sort((x, y) => x - y);
  return { min: times[0], median: times[Math.floor(times.length / 2)], max: times[times.length - 1] };
}
