// net.js — Supabase-Anbindung OHNE Build-Schritt: reines fetch gegen die
// REST-/RPC- und Auth-Endpunkte. Kein npm-Paket, keine Build-Kette, damit die
// Projektregel „kein Framework, laeuft per file://" bestehen bleibt.
//
// WICHTIG — Offline zuerst: Das Spiel muss ohne Netz vollstaendig funktionieren.
// Jeder Aufruf hier darf fehlschlagen; Aufrufer fangen das ab und spielen weiter.
// Es wird NICHTS automatisch hochgeladen — nur wenn der Spieler PVP oeffnet.
//
// Der Publishable Key ist oeffentlich und gehoert in den Client. Der
// service_role-Key und das DB-Passwort duerfen hier NIE auftauchen.

const NET_CONFIG = {
  url: 'https://kdldlxwkwqmbtttuwxbq.supabase.co',
  key: 'sb_publishable_i24N_PpnN7ZDF63omyFeFQ_lmDry1DP',
};

const NET_SESSION_KEY = 'elementra_net_session_v1';

const Net = {
  session: null,          // { access_token, refresh_token, expires_at, user_id }
  lastError: null,

  get configured() { return !!(NET_CONFIG.url && NET_CONFIG.key); },

  // ---------- Sitzung ----------

  loadSession() {
    try {
      const raw = localStorage.getItem(NET_SESSION_KEY);
      if (raw) this.session = JSON.parse(raw);
    } catch (e) { this.session = null; }
    return this.session;
  },

  saveSession(s) {
    this.session = s;
    try { localStorage.setItem(NET_SESSION_KEY, JSON.stringify(s)); } catch (e) { /* egal */ }
  },

  clearSession() {
    this.session = null;
    try { localStorage.removeItem(NET_SESSION_KEY); } catch (e) { /* egal */ }
  },

  _storeAuth(json) {
    if (!json || !json.access_token) throw new Error('Keine Sitzung erhalten');
    this.saveSession({
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at: Date.now() + (json.expires_in || 3600) * 1000,
      user_id: json.user ? json.user.id : (this.session && this.session.user_id),
    });
    return this.session;
  },

  // Anonyme Anmeldung — kein Konto, keine Huerde. Muss in Supabase unter
  // Auth -> Providers -> "Anonymous sign-ins" aktiviert sein.
  async signInAnonymously() {
    const r = await fetch(`${NET_CONFIG.url}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: NET_CONFIG.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const json = await r.json().catch(() => null);
    if (!r.ok) throw new Error((json && (json.msg || json.error_description || json.message)) || `Anmeldung fehlgeschlagen (${r.status})`);
    return this._storeAuth(json);
  },

  async refresh() {
    if (!this.session || !this.session.refresh_token) return this.signInAnonymously();
    const r = await fetch(`${NET_CONFIG.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: NET_CONFIG.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.session.refresh_token }),
    });
    const json = await r.json().catch(() => null);
    if (!r.ok) { this.clearSession(); return this.signInAnonymously(); }
    return this._storeAuth(json);
  },

  async ensureSession() {
    if (!this.configured) throw new Error('Supabase nicht konfiguriert');
    if (!this.session) this.loadSession();
    if (!this.session) return this.signInAnonymously();
    if (Date.now() > this.session.expires_at - 60000) return this.refresh();
    return this.session;
  },

  // ---------- Aufrufe ----------

  _headers() {
    return {
      apikey: NET_CONFIG.key,
      Authorization: 'Bearer ' + this.session.access_token,
      'Content-Type': 'application/json',
    };
  },

  // Ruft eine Postgres-Funktion (siehe supabase/migrations/0001_pvp.sql).
  async rpc(fn, params) {
    await this.ensureSession();
    const r = await fetch(`${NET_CONFIG.url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(params || {}),
    });
    const json = await r.json().catch(() => null);
    if (!r.ok) {
      const msg = (json && (json.message || json.hint)) || `RPC ${fn} fehlgeschlagen (${r.status})`;
      this.lastError = msg;
      throw new Error(msg);
    }
    return json;
  },

  // Spieler-Zeile anlegen/aktualisieren (Name ist oeffentlich, fuer die Rangliste).
  async ensurePlayer(name) {
    await this.ensureSession();
    const r = await fetch(`${NET_CONFIG.url}/rest/v1/players`, {
      method: 'POST',
      headers: { ...this._headers(), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: this.session.user_id, name: (name || 'Spieler').slice(0, 16) }),
    });
    if (!r.ok && r.status !== 409) {
      const json = await r.json().catch(() => null);
      throw new Error((json && json.message) || `Spieler anlegen fehlgeschlagen (${r.status})`);
    }
    return true;
  },

  // ---------- PVP ----------

  async uploadSnapshot(season, power, units) {
    return this.rpc('upsert_snapshot', { p_season: season, p_power: power, p_units: units });
  },

  // Liefert { player_id, name, power, units, rating } oder null (kein Gegner da).
  async findOpponent(season, power) {
    const rows = await this.rpc('find_opponent', { p_season: season, p_power: power });
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  },

  async submitMatch(season, defenderId, attackerUnits, defenderUnits, mods, winner, durationMs, inputs) {
    return this.rpc('submit_match', {
      p_season: season, p_defender: defenderId,
      p_attacker_units: attackerUnits, p_defender_units: defenderUnits,
      p_mods: mods || [], p_winner: winner, p_duration_ms: Math.round(durationMs || 0),
      p_inputs: inputs || [],
    });
  },

  // Stösst die serverseitige Nachrechnung an (Edge Function verify-match).
  // Bester Aufwand: schlägt der Aufruf fehl, holt der Cron-Lauf den Kampf nach.
  async verifyLastMatch() {
    try {
      await this.ensureSession();
      await fetch(`${NET_CONFIG.url}/functions/v1/verify-match`, {
        method: 'POST', headers: this._headers(), body: JSON.stringify({}),
      });
    } catch (e) { /* egal — Cron prueft nach */ }
  },

  async leaderboard(season, limit = 25) {
    return this.rpc('leaderboard', { p_season: season, p_limit: limit });
  },

  // ---------- Cloud-Spielstand (Runde 9) ----------
  // Spielstand unter CODE + 4-stelliger PIN ablegen bzw. holen. Migration
  // supabase/migrations/0003_cloud_save.sql. Beide Aufrufe duerfen scheitern —
  // das Spiel bleibt offline voll spielbar.

  // Gibt den Code zurueck (bei leerem code wird einer erzeugt).
  async cloudPush(code, pin, name, data) {
    return this.rpc('cloud_push', { p_code: code || null, p_pin: pin, p_name: name || 'Spieler', p_data: data });
  },

  // Liefert { name, data, updated_at } oder wirft.
  async cloudPull(code, pin) {
    const rows = await this.rpc('cloud_pull', { p_code: code, p_pin: pin });
    if (!Array.isArray(rows) || !rows.length) throw new Error('Kein Spielstand zu diesem Code');
    return rows[0];
  },
};

// ---------- Team-Schnappschuss aus dem Spielstand ----------

// Format entspricht exakt dem, was createBattle() erwartet (allyDefs/enemyDefs).
// Runde 9: Die Arena hat ein EIGENES Team (`Save.arenaTeam`) — dieselbe Sammlung,
// aber eine von der Kampagne unabhaengige Aufstellung.
function arenaTeamIds() {
  const t = Array.isArray(Save.arenaTeam) && Save.arenaTeam.length ? Save.arenaTeam : Save.team;
  return t.filter(id => Save.collection[id]).slice(0, 3);
}

function pvpTeamUnits() {
  return arenaTeamIds()
    .slice(0, 3)
    .map((id, slot) => ({
      cid: id,
      level: Save.collection[id].level,
      item: Save.equipped[id] || null,
      slot,
    }));
}

// Grober Staerke-Index fuers Matchmaking — Summe der Kampfwerte inkl. Item.
function pvpTeamPower(units) {
  return (units || pvpTeamUnits()).reduce((sum, u) => {
    const c = Creatures[u.cid];
    if (!c) return sum;
    const st = applyItemStats(statsAtLevel(c, u.level), u.item ? Items[u.item] : null);
    return sum + st.hp + st.atk * 4 + st.def * 2 + st.spd * 2;
  }, 0);
}

// Schnappschuss-Einheiten -> Defs fuer createBattle.
function pvpUnitsToDefs(units) {
  return (units || [])
    .filter(u => Creatures[u.cid])
    .slice(0, 3)
    .map(u => ({ id: u.cid, level: u.level, item: u.item || undefined }));
}
