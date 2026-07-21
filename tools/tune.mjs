// tools/tune.mjs — sucht fuer jede Stage die Gegner-Staerke, die eine gewollte
// Schwierigkeitskurve trifft. Misst "Rest-LP des Spielerteams nach dem Sieg":
// 80 % = Spaziergang, 25 % = Zitterpartie, Niederlage = zu schwer.
//
// Stellschrauben je Stage, in dieser Reihenfolge:
//   1. Level-Offset der Gegner (Deckel: MAX_LEVEL 5)
//   2. Items an den Gegnern (bisher ungenutzt, in der Engine laengst verdrahtet)
//
// Aufruf: node tools/tune.mjs          (nur Vorschlag, schreibt nichts)
//         node tools/tune.mjs --write  (schreibt js/stages.js)
import { run, Creatures } from './sim.mjs';
import fs from 'fs';

const MAX_LEVEL = 5;
const STARTERS = ['fire_drache', 'nature_golem', 'water_geist'];
const ROLE_ORDER = { tank: 0, bruiser: 1, sustain: 2, dps: 3, dot: 4, speed: 5, support: 6 };
// Gegner-Items, mit denen eine Stage haerter wird, ohne das Level zu heben.
const FOE_ITEMS = ['steinherz', 'scharfzahn', 'titanenmark'];

// Gewollte Rest-LP-Kurve: vorne luftig, hinten eng, Bosse am engsten.
function targetMargin(stage) {
  const n = stage.id;
  if (stage.boss) return 25;
  if (n <= 3) return 72;
  if (n <= 7) return 58;
  if (n <= 12) return 48;
  if (n <= 16) return 40;
  return 33;
}

function levelFromXp(xp) {
  let lv = 1, rest = xp;
  while (lv < MAX_LEVEL && rest >= 35 * lv) { rest -= 35 * lv; lv++; }
  return lv;
}

function bestTeam(pool, lvl, enemies) {
  let best = null;
  for (let i = 0; i < pool.length; i++)
    for (let j = i + 1; j < pool.length; j++)
      for (let k = j + 1; k < pool.length; k++) {
        const ids = [pool[i], pool[j], pool[k]]
          .sort((a, b) => ROLE_ORDER[Creatures[a].role] - ROLE_ORDER[Creatures[b].role]);
        const r = run(ids.map((id, s) => ({ id, level: lvl(id), slot: s })), enemies);
        const score = r.win ? 1000 + r.allyHp / r.allyMax * 100 : -1000 + r.allyHp;
        if (!best || score > best.score) best = { score, ids, r };
      }
  return best;
}

// Gegner-Variante: Level-Offset + Items + Werte-Bonus. Der Werte-Bonus (`mod`)
// ist noetig, weil spaete Stages schon auf MAX_LEVEL stehen — dort greift kein
// Level-Offset mehr. Dieselbe Mechanik wie der Aufstieg (ascension.js).
// `shape` waehlt, WIE der Bonus verteilt wird:
//   'zaeh'    mehr LP als ANG  — Kampf wird laenger und knapper
//   'scharf'  mehr ANG als LP  — Kampf wird KUERZER und trotzdem knapper
// Ohne 'scharf' landet der Tuner bei zaehen Materialschlachten (gemessen bis
// 133 s Kampfzeit), die am Handy niemand sehen will.
function variant(stage, dLevel, nItems, mod, shape) {
  const m = mod > 0
    ? (shape === 'scharf' ? { hp: mod * 0.2, atk: mod } : { hp: mod, atk: mod * 0.7 })
    : undefined;
  return stage.enemies.map((e, s) => ({
    id: e.id,
    level: Math.max(1, Math.min(MAX_LEVEL, e.level + dLevel)),
    item: s < nItems ? FOE_ITEMS[s % FOE_ITEMS.length] : e.item,
    mod: m,
    slot: s,
  }));
}

export function tune(STAGES) {
  const pool = [...STARTERS];
  const xp = {}; STARTERS.forEach(id => xp[id] = 0);
  const out = [];

  for (const st of STAGES) {
    const lvl = id => levelFromXp(xp[id] || 0);
    const want = targetMargin(st);
    let pick = null;

    // Alle Varianten durchprobieren, die naechstbeste am Zielwert gewinnt.
    for (let d = -2; d <= 3; d++) {
      for (let it = 0; it <= 3; it++) {
      for (const mod of [0, 0.15, 0.3, 0.5, 0.75, 1.0]) {
      for (const shape of ['zaeh', 'scharf']) {
        if (mod === 0 && shape === 'scharf') continue;
        const foes = variant(st, d, it, mod, shape);
        const b = bestTeam(pool, lvl, foes);
        const margin = b.r.win ? b.r.allyHp / b.r.allyMax * 100 : -1;
        if (margin < 0) continue;                       // unschaffbar: verwerfen
        const dist = Math.abs(margin - want);
        // Zaehe Kaempfe hart bestrafen: 75 s Kampfzeit sind bei Tempo 2x rund
        // 37 s echte Zeit — laenger will am Handy niemand zusehen. Strafe statt
        // Ausschluss, damit immer eine Variante uebrig bleibt.
        const slow = Math.max(0, b.r.sec - 60) * 1.5;
        const cost = dist + Math.abs(d) * 0.6 + it * 0.8 + mod * 2 + slow;
        if (!pick || cost < pick.cost) pick = { cost, d, it, mod, shape, margin, foes, team: b.ids, sec: b.r.sec };
      }
      }
      }
    }
    out.push({ stage: st, ...pick });

    const gain = 10 + st.id * 2;
    pick.team.forEach(id => xp[id] = (xp[id] || 0) + gain);
    const startLv = () => {
      const ls = pool.map(id => lvl(id)).sort((a, b) => a - b);
      return Math.max(1, Math.min(MAX_LEVEL, ls[Math.floor(ls.length / 2)] - 1));
    };
    [st.unlockCreature, st.bossCreature].forEach(nid => {
      if (!nid || pool.includes(nid)) return;
      const lv0 = startLv();
      let need = 0; for (let l = 1; l < lv0; l++) need += 35 * l;
      xp[nid] = need; pool.push(nid);
    });
  }
  return out;
}

const src = fs.readFileSync(new URL('../js/stages.js', import.meta.url), 'utf8');
const STAGES = eval(src.replace(/^\s*\/\/.*$/gm, '').match(/const STAGES = (\[[\s\S]*?\n\]);/)[1]);
const res = tune(STAGES);

console.log('St  Ziel  Ist   Lv    Items  Werte  Dauer  Team');
res.forEach(r => console.log(
  String(r.stage.id).padStart(2) + (r.stage.boss ? '*' : ' '),
  String(targetMargin(r.stage)).padStart(4) + '%',
  String(Math.round(r.margin)).padStart(4) + '%',
  String(r.d >= 0 ? '+' + r.d : r.d).padStart(8),
  String(r.it).padStart(6),
  ('+'+Math.round(r.mod*100)+'%'+(r.mod?r.shape[0]:' ')).padStart(7),
  (r.sec.toFixed(0) + 's').padStart(6), ' ',
  r.team.map(x => x.replace('_', '·')).join(' ')));

if (process.argv.includes('--write')) {
  let text = src;
  // ACHTUNG Zeilenenden: die Datei liegt unter Windows als CRLF vor. Eine Regex
  // mit nacktem `\n` findet dort NICHTS und der Schreibvorgang lief still ins
  // Leere (genau das ist am 21.07. zweimal passiert). Deshalb `\r?\n` — und
  // geschrieben wird mit demselben Zeilenende, das die Datei schon hat.
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  let written = 0;
  res.forEach(r => {
    const enemiesText = r.foes.map(e =>
      `      { id: '${e.id}', level: ${e.level}` +
      `${e.item ? `, item: '${e.item}'` : ''}` +
      `${e.mod ? `, mod: { hp: ${+e.mod.hp.toFixed(3)}, atk: ${+e.mod.atk.toFixed(3)} }` : ''} },`
    ).join(nl);
    // Genau den enemies-Block DIESER Stage ersetzen (id-Anker davor).
    const re = new RegExp(`(id: ${r.stage.id},[\\s\\S]*?enemies: \\[\\r?\\n)([\\s\\S]*?)(\\r?\\n    \\],)`);
    if (!re.test(text)) { console.log('WARNUNG: Stage ' + r.stage.id + ' nicht gefunden'); return; }
    text = text.replace(re, (m, a, b, c) => a + enemiesText.replace(/,$/, '') + c);
    written++;
  });
  fs.writeFileSync(new URL('../js/stages.js', import.meta.url), text);
  console.log(`\njs/stages.js geschrieben (${written}/${res.length} Stages).`);
}
