// verify-match — rechnet gemeldete Arena-Kaempfe serverseitig nach (Anti-Cheat).
//
// Warum das ueberhaupt geht: battle.js ist deterministisch (kein Math.random,
// kein Date.now). Gleiche Aufstellungen + gleiche Ult-Zeitpunkte = gleicher Sieger.
// Die Engine in ./engine.js ist aus den Browser-Dateien GENERIERT, damit Client
// und Server garantiert dieselbe Logik benutzen (Regenerieren: siehe CLAUDE.md).
//
// Aufruf:
//   POST { "match_id": "<uuid>" }  -> genau diesen Kampf pruefen
//   POST {}                        -> bis zu 25 ungeprüfte Kaempfe abarbeiten (Cron)

import { createBattle, updateBattle, castActive, Creatures } from './engine.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

const TICK_MS = 16;
const MAX_MS = 400000;

async function rest(path: string): Promise<any> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: HEADERS });
  if (!r.ok) throw new Error(`REST ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function rpc(fn: string, params: unknown): Promise<any> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: HEADERS, body: JSON.stringify(params),
  });
  if (!r.ok) throw new Error(`RPC ${fn}: ${r.status} ${await r.text()}`);
  return r.text();
}

// Snapshot-Einheiten -> Defs fuer createBattle (identisch zu pvpUnitsToDefs im Client).
function toDefs(units: any[]): any[] {
  return (units || [])
    .filter((u) => u && Creatures[u.cid])
    .slice(0, 3)
    .map((u) => ({ id: u.cid, level: u.level, item: u.item || undefined }));
}

// Kampf nachspielen. `inputs` sind die Ult-Zeitpunkte des Angreifers
// ([{slot, t}]); sie werden beim passenden Tick eingespielt. Der Gegner wird
// wie im Spiel von der KI gesteuert (side === 'enemy' zuendet automatisch).
function replay(m: any): 'attacker' | 'defender' {
  const b = createBattle(toDefs(m.attacker_units), toDefs(m.defender_units), m.mods || []);
  const queue = (Array.isArray(m.inputs) ? m.inputs : [])
    .filter((i: any) => i && typeof i.t === 'number')
    .sort((x: any, y: any) => x.t - y.t);
  let qi = 0;
  while (!b.over && b.time < MAX_MS) {
    while (qi < queue.length && queue[qi].t <= b.time) {
      const unit = b.allies.find((u: any) => u.slot === queue[qi].slot);
      if (unit) castActive(b, unit);   // prueft selbst auf Energie/Leben
      qi++;
    }
    updateBattle(b, TICK_MS);
  }
  // Kein Sieger innerhalb des Limits: Angreifer hat nicht gewonnen.
  return b.winner === 'ally' ? 'attacker' : 'defender';
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const filter = body.match_id
      ? `id=eq.${encodeURIComponent(body.match_id)}`
      : `verified=is.false&order=created_at.asc&limit=25`;
    const matches = await rest(`matches?select=*&${filter}`);

    const results = [];
    for (const m of matches) {
      if (m.verified) continue;
      let computed: string;
      try {
        computed = replay(m);
      } catch (e) {
        results.push({ id: m.id, error: String(e) });
        continue;
      }
      await rpc('apply_verification', { p_match: m.id, p_true_winner: computed });
      results.push({
        id: m.id,
        reported: m.winner,
        computed,
        ok: m.winner === computed,
      });
    }
    return Response.json({ checked: results.length, results });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
});
