# MASTERPLAN — Elementra

Kreaturen-Sammel-Autobattler fürs Handy. Vorbereitung ist das Spiel, der Kampf
ist die Auflösung.

> Der Plan bis zum 21.07.2026 liegt als `MASTERPLAN-ALT-2026-07-21.md` daneben,
> der Code-Stand als Zweig `backup/2026-07-21-vor-neuausrichtung` und Tag
> `v0.2-alte-ausrichtung`. Beides ist auch auf GitHub.

---

## Was das Spiel ist (eine Seite)

**Das Versprechen:** Ein fairer Autobattler ohne Gacha, ohne Energie-Timer, ohne
Pay-to-Win. Man stellt drei Kreaturen auf, entscheidet sich für Elemente, Rollen
und Items — und sieht dann zu, ob die Rechnung aufgeht.

**Die Kampagne ist das Tutorial. Die Arena ist das Spiel.**
20 Stages bringen jede Mechanik einmal bei und enden. Danach lebt das Spiel von
Aufstieg, Wochen-Modifikatoren und der asynchronen Rangliste — spielergenerierte
Gegner, die nie ausgehen.

**Die Marktposition:** Genau das, was Gacha-müde Spieler suchen. Kein Zufall im
Kampf (`battle.js` ist deterministisch), kein Bezahlvorteil, endlicher Content
mit unendlicher Beschäftigung. Das ist ein Verkaufsargument, kein Kompromiss.

---

## STAND & NÄCHSTE SCHRITTE (21.07.2026, nach Runde 10) — hier zuerst lesen

### Was fertig ist
Kampagne (2 Kapitel, 20 Stages, auf eine gemessene Schwierigkeitskurve getunt),
Sammlung mit Filtern, Fusion, Items, Battlepass, Aufstieg + Wochen-Modifikatoren,
Profile mit PIN, Cloud-Spielstand, Arena (asynchrones PVP, live gegen Supabase),
Kampf-Vorschau, Ersthilfe-Hinweise.

### Was Runde 10 grundlegend geändert hat
Eine Messung hatte gezeigt: 95 Kreaturen waren in Wahrheit 21 Designs, drei von
sieben Rollen unspielbar, Fusion bei 8 von 12 Rezepten ein Rückschritt, Items
Rauschen, und zwei Drittel aller Fusionen löschten das Element-System. Behoben:

1. **Elemente sind jetzt Mechanik, nicht Farbe.** Jedes Element bringt ein
   Keyword mit (Feuer brennt, Natur vergiftet, Wasser friert ein, Dampf lädt
   Energie, Asche hat Dornen, Frost startet mit Schild). Aus 7 Archetypen in
   3 Farben wurden 21 verschieden spielende Kreaturen — ohne einen neuen Sprite.
2. **Zwei Konter-Räder.** Feuer>Natur>Wasser und Dampf>Asche>Frost. Hybride sind
   nicht mehr neutral; das Endgame behält die Kernmechanik. Keine neuen Elemente.
3. **Fusion ist immer ein Aufstieg.** Ab Stufe 3 möglich, Ergebnis erbt das
   niedrigere Zutat-Level. Die Vorschau zeigt vorher, was man gewinnt.
4. **Alle sieben Rollen sind spielbar.** Drei Passive waren leer (`effect: none`);
   Greif, Geist und Phönix haben jetzt echte: Doppeltreffer, Team-Aura,
   Selbst-Wiederbelebung. Kampfdauer verdoppelt, damit Heilung überhaupt wirkt.
5. **Kampf-Vorschau.** Der Ausgang wird vor dem Start durchgerechnet und als
   Einschätzung gezeigt — möglich, weil die Engine deterministisch ist.
6. **Onboarding.** Sechs Hinweise, je einmal, am richtigen Ort.

### Kampagne-Ausbau auf 10 Kapitel (Entscheidung 22.07.2026)
8 Stages je Kapitel, je ein einzigartiger Endboss (8 neue Boss-Kreaturen Ziel).
Kapitel 1-2 bleiben bei 10 Stages (Save-Kompatibilität).
- [x] **Kapitel 3-5 gebaut** (S21-44): Ewiges Eis / Sturmreich / Aschenlande,
      3 neue Bosse (Frosthydra/Sturmkrake/Aschenmoloch), Cadence entschärft,
      per Tuner auf die Kurve gebracht, komplett schaffbar (Sim-verifiziert).
      **Boss-Sprites sind Rohfassung** — auf dem Gerät ansehen, Feinschliff-Runde
      einplanen. S24 ist etwas zu leicht (~100 %).
- [ ] **Kapitel 6-10** (S45-84) — nach dem Gerätetest von 3-5. Brauchen 3 weitere
      Boss-Kreaturen (Sprites) und die restlichen Fusions-Rezepte als Anreize.

### Offen — in dieser Reihenfolge
1. **Auf echten Geräten spielen.** iPhone 13 + iPad, Safari, „Zum Home-Bildschirm".
   Die Kurve ist simuliert, nicht gefühlt. Erst danach weiter balancieren.
2. **Edge Function `verify-match` deployen** (serverseitige Kampfprüfung):
   ```
   cd C:\005-Kellerwohnung\elementra
   npx supabase login
   npx supabase link --project-ref kdldlxwkwqmbtttuwxbq
   npx supabase functions deploy verify-match
   ```
3. **PVP-Fairness schließen** (siehe unten, Weg 2). Eine verzerrte Rangliste ist
   schlimmer als keine.
4. **Phase 4 beginnen** (Store), sobald 1–3 stehen.

### Supabase
- Ref `kdldlxwkwqmbtttuwxbq`, Migrationen 0001–0003 eingespielt, Anonymous
  Sign-ins aktiv. Publishable Key gehört in `js/net.js`.
  **service_role-Key und DB-Passwort nie in den Client oder in den Chat.**
- Aufräumen bei Bedarf: `delete from public.cloud_saves where name = 'Cloud-Test';`

---

## Die vier Design-Pfeiler (BINDEND)

Jede neue Idee wird hieran gemessen. Passt sie nicht, kommt sie nicht rein.

1. **Element-Rad ist eingefroren.** 3 Basis + 3 Hybrid, zwei Konter-Räder, fertig.
   Neue Elemente würden Matchup-Tabelle, Paletten und Fusions-Matrix multiplizieren.
2. **Thema kommt über Keywords, nicht über Elemente.** Gift, Brand, Frost, Dornen,
   Lebensraub sind Mechaniken an Elementen, Items und Fähigkeiten — additiv,
   ohne Kombinatorik-Kosten.
3. **Fusionen werden kuratiert, nicht auskombiniert.** 12 von 21 Paaren haben ein
   Rezept, 9 bewusst nicht.
4. **Tiefe vor Breite.** Erst Systeme, die vorhandene Kreaturen interessanter
   machen. Neue Kreaturen sind die teuerste und schwächste Retention-Maßnahme.

**Neuer Pfeiler 5 (Runde 10): Nichts kommt ins Spiel, was nicht gemessen ist.**
Balancing wird nie geschätzt. `tools/sim.mjs`, `tools/campaign.mjs` und
`tools/tune.mjs` rechnen mit derselben Engine wie Browser und Server. Wer eine
Zahl ändert, lässt die Werkzeuge laufen und legt das Ergebnis daneben.

---

## Geld verdienen — ehrliche Einschätzung

Ein unbekannter Solo-Autobattler ohne Marketingbudget verdient im Store
realistisch **nahe null**. Nicht wegen der Qualität, wegen der Auffindbarkeit.
Daraus folgt die Strategie:

- **Kein Free-to-Play-Wirtschaftssystem.** Das braucht Live-Ops, Analytics und
  ständigen Content-Nachschub. Bei kleiner Spielerbasis bringt es nichts und
  frisst die Entwicklungszeit.
- **Einmalpreis 3–5 €.** Ein Kauf, alles drin. Passt zum Versprechen „fair und
  endlich" und braucht keine Wirtschaftsbalance.
- **Play Store zuerst** (25 $ einmalig) statt Apple (99 $/Jahr). Dort messen, ob
  jemand anbeißt, bevor jährliche Kosten entstehen.
- **Der Battlepass bleibt kostenlos** und wird zur Season-Struktur, nicht zur
  Zahlschranke. Die Premium-Spur ist heute ein Demo-Schalter; sie wird entweder
  kostenlos freigeschaltet oder entfernt.
- Erst wenn eine Spielerbasis existiert, über Kosmetik-Käufe nachdenken.

---

## Phasen

### Phase 1 — Prototyp ✅ (13.07.2026)
Engine, Kampagne, Sammlung, Fusion, Sprites, Sound, Speicherstand.

### Phase 2 — Content & Tiefe ✅ (bis 21.07.2026)
Pixelart-Umstellung, Fusions-Redesign, Battlepass, Items, Aufstieg,
Wochen-Modifikatoren, Profile, Arena, Cloud-Save.
**Runde 10 (21.07.2026):** Neuausrichtung nach Messung — Element-Keywords,
zwei Konter-Räder, echte Passive für alle Rollen, Fusion als Aufstieg,
Kampfdauer, Kampf-Vorschau, Sammlungs-Filter, Onboarding, Kampagne per
`tools/tune.mjs` auf eine Zielkurve gebracht. sw.js → v14.

### Phase 3 — Aufs Gerät (läuft)
- [x] GitHub-Repo + Pages: `https://gitty-den.github.io/elementra/`
- [x] PWA (Manifest, Service Worker, Offline)
- [ ] **Auf iPhone 13 und iPad real durchspielen** — der wichtigste offene Punkt

### Phase 4 — Stores
- [ ] **Capacitor**-Wrapper (Node ist installiert)
- [ ] Play Console (25 $ einmalig), Build lokal oder per GitHub Actions
- [ ] Apple Developer (99 $/Jahr) — erst wenn Android trägt. Kein Mac nötig:
      iOS-Build über GitHub Actions (macOS-Runner) oder Codemagic, Verteilung
      per TestFlight
- [ ] Store-Assets: Icons, Screenshots, Datenschutzerklärung
- [ ] Kaufabwicklung für den Einmalpreis

### Phase 5 — Später
- [ ] Kapitel 3+, weitere Fusions-Rezepte für die 9 offenen Paare
- [ ] Erfolge, Tages-Ziele
- [ ] Front-/Backline ausbauen (Engine kennt `enemyBackline` schon)
- [ ] Analytics/Crash-Reporting erst ab Beta

---

## GEPLANT — PVP-Ausbau

### A) Duell per Einladungscode (Echtzeit, gegen Freunde)
Code erzeugen, Freund gibt ihn ein, beide kämpfen live und zünden ihre Ults selbst.
**Technik: Lockstep, nicht Server-Simulation.** Beide Geräte rechnen denselben
Kampf und tauschen nur Eingaben mit Taktnummer aus. Möglich, weil `battle.js`
deterministisch ist; Supabase Realtime reicht als Kanal, **kein Mietserver nötig**.
Nötig: feste Taktrate statt variablem `dt`, Eingabe-Puffer (~3 Ticks),
Desync-Prüfsumme, Abbruch-Regeln. Größter Brocken bisher.

### B) Verteidigungs-Anweisungen — offene Fairness-Lücke
Im asynchronen PVP ist der Verteidiger offline; seine Ults zündet die Kampagnen-KI
**sofort** bei voller Energie, während der Angreifer taktisch timen darf.
**Der Angreifer hat einen systematischen Vorteil, die Rangliste ist verzerrt.**

Weg 2 (empfohlen, Nutzer tendiert dahin): **Verteidigungs-Anweisung je Kreatur**
im Team-Schnappschuss — *sofort* / *erst unter 50 % LP* / *erst wenn 2 Gegner
stehen*. Beide Seiten spielen nach hinterlegtem Plan, also symmetrisch. Passt
exakt auf „Vorbereitung IST das Spiel".

---

## Balancing-Werkzeuge (`tools/`)

Alle drei nutzen `supabase/functions/verify-match/engine.js` — also exakt die
Engine, die auch im Browser und auf dem Server läuft. **Vor jedem Lauf
`tools/regen.ps1` ausführen**, sonst misst man alten Code.

| Werkzeug | Zweck |
|---|---|
| `tools/sim.mjs` | Bausteine: `run()`, `roleLadder()`, `teamTournament()`, `avgDuration()` |
| `tools/campaign.mjs` | Spielt die Kampagne so durch, wie ein Spieler sie erlebt (Pool wächst, XP-Kurve echt) |
| `tools/tune.mjs` | Sucht je Stage die Gegner-Stärke, die die Zielkurve trifft. `--write` schreibt `js/stages.js` |

**Zielkurve der Kampagne** (Rest-LP nach dem Sieg, kleiner = knapper):
Stage 1–3 ≈ 72 %, 4–7 ≈ 58 %, 8–12 ≈ 48 %, 13–16 ≈ 40 %, 17–19 ≈ 33 %,
Bosse ≈ 25 %. Stand 21.07.2026: alle 20 Stages treffen ihr Ziel.

---

## Remote-Arbeit vom iPad

- **A) Claude Code Web (claude.ai/code) + GitHub** ⭐ — Repo `gitty-den/elementra`,
  PC kann aus bleiben, Ergebnis via GitHub Pages sofort am iPhone testbar.
- **B) Remote Control** — steuert eine lokal laufende Session; PC muss anbleiben,
  dafür voller Zugriff auf lokale Dateien. Start:
  `C:\005-Kellerwohnung\remote-control.cmd`.

Faustregel: PC aus → A. PC an → B.
Nach Remote-Sessions lokal `git pull`, bevor hier weitergearbeitet wird.
