# MASTERPLAN — Elementra

Kreaturen-Sammel-Autobattler: sammeln → leveln → fusionieren → Kampagne besiegen.
Datengrundlage: `data/*.json` (42 Kreaturen, 3+3 Elemente, 21 Fusions-Rezepte, siehe `data/DATA_SCHEMA.md`).

## Vision

Mobile-Game (iOS + Android, App Store / Play Store). Kernloop: Autobattler
3 vs 3, Element-Kreislauf 🔥→🌿→💧→🔥, Hybride durch Fusion.
Stil: dunkel-episch mit Element-Glow.

## STAND & NÄCHSTE SCHRITTE (Stand 21.07.2026) — hier zuerst lesen

### Was fertig ist und läuft
Kampagne (2 Kapitel, 20 Stages), Sammlung, Fusion, Battlepass, **Items**,
**Aufstieg + Wochen-Modifikatoren**, Profile mit PIN, Rundenstart-Countdown,
**Arena (asynchrones PVP) — live und getestet** gegen Supabase.

### Supabase-Projekt
- Ref `kdldlxwkwqmbtttuwxbq`, URL `https://kdldlxwkwqmbtttuwxbq.supabase.co`
- Publishable Key liegt in `js/net.js` (öffentlich, gehört dorthin).
  **service_role-Key und DB-Passwort dürfen NIE in den Client oder in den Chat.**
- Migration **0001 und 0002 sind eingespielt** ✅
- **Anonymous Sign-ins sind aktiviert** ✅
- Testdaten in der DB: Spieler „._." (der Nutzer) und ein Dummy „Test-Gegner".
  Wertung des Nutzers steht durch Testkämpfe bei ~957 statt 1000.
  Aufräumen bei Bedarf: `delete from public.ladder; delete from public.matches;`
  bzw. `delete from public.players where name = 'Test-Gegner';`

### Offen (in dieser Reihenfolge sinnvoll)
1. **Edge Function `verify-match` deployen** — geht NICHT über den SQL-Editor:
   ```
   cd C:\005-Kellerwohnung\elementra
   npx supabase login
   npx supabase link --project-ref kdldlxwkwqmbtttuwxbq
   npx supabase functions deploy verify-match
   ```
   Bis dahin steht in `matches.verified` überall `false` — der Client meldet den
   Sieger ungeprüft. Unkritisch, solange nur bekannte Spieler mitspielen.
2. **Push nach GitHub** (noch NICHT passiert, 2 Commits liegen lokal auf `main`).
   Push aktualisiert automatisch `gitty-den.github.io/elementra`. Erst danach kann
   ein Freund mitspielen.
3. Danach: die zwei geplanten PVP-Features unten.

### Sicherungs-Zweige (lokal, nicht gepusht)
| Zweig | Zeigt auf |
|---|---|
| `backup/2026-07-21-vor-items-und-arena` | Stand VOR Items/Aufstieg/Arena |
| `backup/2026-07-21-stand-heute` | aktueller Stand |
| `main` | Arbeitsstand |

### Wichtig für den Nutzer-Umgang
Der Nutzer ist **kein Entwickler**. Fachbegriffe (Branch, Migration, Edge Function,
RLS) IMMER in einfachen Worten erklären, mit Alltagsvergleichen, und Schritt für
Schritt durch Oberflächen führen (Supabase-Dashboard verwechselt er z. B. leicht mit
dem Terminal). Nie Befehle „einfach hinwerfen".

## GEPLANT, NOCH NICHT GEBAUT — PVP-Ausbau

### A) Duell per Einladungscode (Echtzeit, gegen Freund) — vom Nutzer gewünscht
Nicht die Rangliste umbauen, sondern **ergänzen**: Code erzeugen, Freund gibt ihn
ein, beide kämpfen live gegeneinander und zünden ihre Ults selbst.

- **Technik: Lockstep, nicht Server-Simulation.** Beide Geräte rechnen denselben
  Kampf und tauschen nur Eingaben mit Taktnummer aus („Ult in Tick 312"). Das geht,
  weil `battle.js` deterministisch ist. Supabase Realtime reicht als Nachrichten-
  Kanal — **kein Mietserver nötig**. Ein Server-autoritatives Modell scheidet aus:
  Supabase Edge Functions sind für kurze Anfragen gebaut, nicht für laufende Kämpfe.
- **Nötige Umbauten:** feste Taktrate statt variablem `dt` (heute
  `updateBattle(dt * B.speed)` im rAF-Loop); Kanal + Eingaben mit Tick-Nummer;
  Eingabe-Verzögerung (~3 Ticks Puffer gegen Latenz); Desync-Erkennung
  (Prüfsumme alle N Ticks); Abbruch-/Aufgabe-Regeln.
- **Aufwand:** größter Brocken bisher, grob so viel wie die ganze Session vom
  21.07. zusammen. Der Einladungscode spart aber die komplette Lobby-/
  Warteschlangen-Baustelle (~halber Aufwand gegenüber echtem Matchmaking).
- **Warum kein Matchmaking:** bei kleiner Spielerbasis wartet man in einer leeren
  Schlange — genau deshalb ist die Rangliste asynchron.

### B) Verteidigungs-Anweisungen für die asynchrone Rangliste — offene Fairness-Lücke
**Problem (vom Nutzer erkannt):** Im asynchronen PVP ist der Verteidiger offline.
Sein Team wird heute von derselben simplen KI gespielt wie Kampagnen-Gegner —
sie zündet die Ult **sofort** bei voller Energie (`gainEnergy` setzt
`ultiPlannedAt` für `side === 'enemy'`). Der Angreifer darf dagegen taktisch
timen. **Also hat der Angreifer einen systematischen Vorteil und die Rangliste
ist verzerrt.**

Ursache: Der MASTERPLAN sah ursprünglich vollautomatische Kämpfe vor; die
manuellen Ult-Buttons (Wunsch vom 19.07.) haben diese Schieflage erzeugt.

Drei Wege (Nutzer tendiert zu Weg 2):
1. **Arena vollautomatisch** — auch das eigene Team zündet selbst. Sofort fair,
   Aufwand ~ein Schalter. Kampagne behält manuelle Ults. (Das SAP-Modell.)
2. **Verteidigungs-Anweisung je Kreatur**, wird im Team-Schnappschuss gespeichert:
   z. B. *sofort* / *erst unter 50 % LP* / *erst wenn 2 Gegner stehen*. Beide Seiten
   spielen dann nach hinterlegtem Plan — symmetrisch. Aufwand mittel, passt exakt
   zum Pfeiler „Vorbereitung IST das Spiel".
3. Angreifer-Sieg gibt weniger Wertung. Billig, löst das Problem aber nicht.

**Empfehlung:** Weg 2 für die Rangliste, manuelle Ults im Live-Duell (A).
Dann belohnt die Rangliste Vorbereitung, das Duell Reaktion.

## Design-Pfeiler (21.07.2026) — BINDEND, gegen Scope-Creep

Diese vier Regeln entscheiden jede neue Idee. Passt eine Idee nicht rein, kommt sie
NICHT rein. Sie existieren, weil sonst Kombinatorik und Umfang explodieren.

1. **Element-Rad ist eingefroren.** 3 Basis (Feuer/Natur/Wasser) + 3 Hybrid
   (Dampf/Asche/Frost, neutral). **Keine neuen Elemente.** Grund: das Konter-Rad
   muss auswendig lernbar bleiben, und jedes Element multipliziert Matchup-Tabelle,
   Paletten und Fusions-Matrix.
2. **Thema kommt über Keywords, nicht über Elemente.** Gift, Brand, Frost-Chill,
   Lebensraub, Dornen sind **Mechaniken** an Items/Fähigkeiten — beliebig viele,
   additiv, ohne Kombinatorik-Kosten. Beispiel: „Seeschlange mit Toxin" =
   Wasser-Element + Keyword `poison`, NICHT ein neues Giftelement.
3. **Fusionen werden kuratiert, nicht auskombiniert.** Nur Paare, die sich gut
   anfühlen (aktuell 12 von 21; 9 bewusst ohne Rezept). Kein Vollständigkeits-Zwang.
   Neue Fusionen kommen tröpfchenweise als Season-Chase-Units, nicht als Matrix.
4. **Tiefe vor Breite.** Erst Systeme, die vorhandene Kreaturen interessanter machen
   (Items, Modifikatoren, Aufstellung), dann erst neue Kreaturen. Neue Kreaturen sind
   die teuerste und schwächste Retention-Maßnahme.

### Langzeit-Motor (endlicher Content, unendliches Spiel)

Die Map ist endlich — die Beschäftigung darf es nicht sein. Reihenfolge der Hebel:

1. **Items** (Tiefe im Teambau) — Runde 6, siehe Phase 2.
2. **Wochen-Modifikatoren + Ascension** (Kampagne mit Mutatoren neu spielbar) —
   client-seitig, kein Backend nötig.
3. **Async-PVP-Ladder** (Kampf gegen Team-Schnappschüsse anderer Spieler) —
   spielergenerierte, unendliche Gegner. Braucht Backend (Phase 5), aber KEIN
   Echtzeit-Netcode; `battle.js` ist deterministisch und läuft serverseitig weiter.
4. **Live-Ops-Takt**: Seasons (Battlepass steht), Events, rotierende Quests.
5. **Meta-Patches**: gelegentlich kleine Balance-Verschiebung statt Content-Flut.

## Design-Pivot (Interview 15.07.2026)

1. **Art: Pixelart im GBA-Pokémon-Stil** (klar, ikonisch, lesbar) statt prozeduralem
   SVG — dunkel-epische Stimmung bleibt (Referenz: Castlevania GBA).
   - [x] 15.07.: Stil-Test mit 3 Startern — Nutzer-Urteil: „sehr gut", prozedural weiter.
   - [x] 15.07.: **Alle 42 Kreaturen umgestellt** (7 Archetyp-Char-Maps × 6 Element-
         Paletten in `js/pixel.js`), `creatureArt()` ersetzt `creatureSVG` überall;
         Sammlung/Team-Select/Kampf/Fusion/Silhouetten laufen auf Pixel-Sprites.
         ⚙ → „Sprite-Galerie" zeigt die komplette Matrix.
   - [x] 15.07.: UI auf Pixel-Look gezogen (kantige Ecken, harte Stufen-Schatten,
         Abschnitt „Pixel-Look" in style.css).
   - [x] 15.07. (Session 2): **Regel „ALLES Pixelart, kein SVG"** — Szenen, UI-Icons,
         Karten-Pfad, Titel-Emblem gepixelt; Fusion-Screen visuell statt Text (Legende
         aus Element-Icons, Level-Pips, Fundort-Tags, Teaser-Rezepte); Angriffs-
         Animation je Archetyp + Pixel-Partikel (Treffer/Heilung/Tod/Ulti);
         4 Logo-Varianten (⚙ → „Logo wählen") — **finale Logo-Wahl durch Nutzer offen**.
   - [ ] Optionaler Qualitäts-Upgrade-Pfad später per KI-Generator (**PixelLab**
         mit Aseprite-Plugin, **Sprite-AI** ab 5 $/Monat mit Free-Tier, **Retro
         Diffusion**). Prompt-Rezept pro Kreatur:
         „32x32 pixel art game sprite, GBA style, [creature: fire dragon standing
         upright], dark epic fantasy, black outline, limited palette (5 shades of
         [orange/red]), transparent background, single character, front view,
         no anti-aliasing" — je Element Farbwort tauschen, je Archetyp die
         Beschreibung; danach in Aseprite/Piskel auf exakt 32×32 bringen und
         als Sprite-Sheet ins Repo. Loader-Umbau übernimmt Claude.
2. **Kampfgefühl: Super Auto Pets / TFT** — Vorbereitung IST das Spiel: Aufstellung
   (Front/Backline), Element-Synergien, später Items. Kampf läuft vollautomatisch;
   Tap-Ulti wird zurückgebaut (Auto-Ulti Standard).
3. **Progression:** Sammeln/Komplettieren + Idle-/Tages-Belohnungen + feste Kampagne
   mit Ende. Kein Roguelite, kein Gacha.
4. **Musik:** ✅ 15.07.: generative WebAudio-Musik (`js/music.js`, Themes map/battle,
   Toggle in ⚙) — lizenzfrei, kein Asset. Später optional echte Tracks (Suno/OpenGameArt,
   Lizenz vor Store-Release prüfen).
5. Reihenfolge: erst 2 (Kern-Gameplay), dann 1 (Art), dann neuer Content.

## Phasen

### Phase 1 — Spielbarer Prototyp ✅ (13.07.2026)

- [x] Echtzeit-Kampf-Engine (Passive, Ultis, Status-Effekte, Sudden Death)
- [x] Kampagne mit 10 Stages, Sterne, Gold, Kreaturen-Unlocks
- [x] Sammlung + Level-System (Gold, Max-Level 5)
- [x] Fusion inkl. Animation (Demo: Glutdrache + Tiefendrache = Dampf-Drache)
- [x] Prozedurale SVG-Kreaturen (alle 42), WebAudio-Sound, Speicherstand (localStorage)
- [x] Balancing per Simulation verifiziert (S1–S10 durchspielbar)

### Phase 2 — Content & Tiefe

- [x] 17.07.: **Nutzer-Feedback-Runde 1 umgesetzt:** Hauptmenü als Landingpage
      (Lager-Szene mit aktivem Team am Pixel-Lagerfeuer, vertikales Titelmenü,
      Bottom-Nav ersetzt durch Hub-and-Spoke mit Topbar-Zurück), kein Flucht-Button
      im Kampf, EIN rotierender Niederlage-Tipp statt Textwand, Kampf-HUD als
      Kompakt-Plakette (Level-Badge an HP-Bar), Element-Attack-Sounds,
      Safe-Area-Fix (weißer iOS-Streifen).
- [x] 17.07.: **Fusions-Redesign: Archetyp + Element.** Alte Element-Hybride
      (Dampf-Drache & Co.) komplett entfernt; 12 kuratierte Fusions-Archetypen
      (Koloss, Wyvern, Leviathan, Seraph, Behemoth, Gargoyle, Basilisk, Chimära,
      Sphinx, Barghest, Ouroboros, Archon) mit eigenen Char-Maps, Abilities und
      freiem 2-Slot-Picker; S8–S10 zeigen Fusions-Gegner, per Sim neu balanciert
      (Details in CLAUDE.md).
- [x] 17.07.: **Feedback-Runde 2:** Hauptmenü mit größerem Logo + 2×2-Kachel-Raster
      (daumenfreundlich), Kampagnen-Map horizontal scrollend mit Theme-Icons statt
      Nummern (sprachunabhängig, keine Labels), UI global vergrößert (Root 21px,
      dickere Bars, größere Icons). UI-Grundsätze in CLAUDE.md verankert:
      icon-basiert, visuell, groß.
- [x] 17.07.: **Kapitel 2 (Stages 11–20)** generiert: 10 neue Unlocks Richtung
      Sammlung, Fusions-Gegner ab S14 (erste Fusions-Pflicht), All-Fusion-Finale
      S20; per Headless-Sim balanciert. Offen für Kapitel 3: nature_wyrm,
      water_greif, nature_geist als Unlocks.
- [x] 17.07.: **Feedback-Runde 3:** Map wieder vertikal (Scrollbars app-weit
      unsichtbar), Overlays rahmenlos (kein Box-in-Box), Kampf: Tempo/Auto größer
      unten am Rand + Hint-Text entfernt, Ulti-Ready = goldene blinkende
      Sprite-Umrandung statt Bodenring, Einstellungen mit Lautstärke-Reglern
      (Sound/Musik 0–100 %), Sprite-Galerie/Logo-Wahl entfernt — Logo fest:
      Element-Ring.
- [x] 17.07.: **Feedback-Runde 4:** Ulti-Moment (Element-Partikel-Burst mit
      elementtypischer Flugbahn, Schockwelle, Vollbild-Blitz, Caster-Aufbäumen,
      260-ms-Hit-Stop), Kreaturen-Karten komplett rahmenlos (Seltenheit/Auswahl
      als Sprite-Glow), Detail-Overlay icon-basiert (Herz/Schwert/Schild/Blitz,
      Rollen-Pixel-Icons statt Emoji, Level-Pips, „Lvl. Up"), Long-Press am Handy
      öffnet Stat-Peek statt iOS-Bildmenü (contextmenu + touch-callout unterdrückt).
- [x] 17.07.: **Feedback-Runde 5:** Splash = rotierendes Logo, fliegt per FLIP auf
      die Menü-Position; Links/Rechts-Swipe zwischen Kampagne/Sammlung/Fusion
      (im Kampf gesperrt); Map fokussiert immer die aktuelle Stage; Teamwahl
      ersetzt per Antippen direkt (markierter Slot, sonst hinterste Position).
- [x] 17.07.: **Progression-Paket** (alle 4 Bausteine vom Nutzer gewählt):
      **Kampf-XP** — Kreaturen leveln durchs Kämpfen (`xpNeed` 35·Level, Sieg
      `10+2·Stage`, Niederlage ⅓; XP-Feier im Ergebnis-Screen, XP-Bar im Detail);
      Gold-Level-Up nur noch Beschleuniger. **Ökonomie-Bremse** — Level-Kosten
      60·Level (statt 30), Wiederholungs-Gold halbiert. **Ziele** — Panel in der
      Sammlung (Basis x/21, Fusionen x/12, Sterne x/60) mit 6 abholbaren
      Meilenstein-Belohnungen + Tages-Bonus (50 Gold/Kalendertag).
      **Boss-Inszenierung** — S10/S20 `boss: true`: großer roter Map-Knoten,
      Intro-Auftritt des Boss-Sprites (Kampf startet eingefroren), Sieg-Schmuck.
- [x] 19.07.: **Feature-Paket (Interview):** (1) **Fusion + Sammlung in ein Fenster**
      (Umschalter-Tabs, `renderFusionBody`). (2) **Battlepass** ersetzt Fusion-Kachel
      im Menü — kostenlos + Premium-Spur, Fortschritt aus Kämpfen + Tages-/Wochen-
      Aufgaben, feste Season ~30 Tage (`js/bp.js`; Premium = Demo, echtes IAP Phase 4).
      (3) **Idle-Animationen** — echte Frame-Sprites (atmen + blinzeln) global über
      `creatureFrames`/Ticker. (4) **Kampf aufgeben** (Aufgeben-Button + Bestätigung)
      **+ Team-Warnung** vor schwachem Matchup im Team-Select. (5) **Developer-Board**
      in Optionen (alle 93 Kreaturen als Liste + Tools: Gold/Unlock/Max/Stages/BP-XP/
      Galerie). (6) **Kampagne = Abteile** — Welt-Übersicht → Kapitel-Karte, Boss führt
      zur nächsten Karte (`CHAPTERS`). sw.js → v2.
- [x] 19.07. (Runde 2): **Kampf-Steuerung** neu — Auto-Ult + Tempo-Schalter raus,
      stattdessen **Ult-Leiste** (Button je Kreatur, Gold-Glow bei Ready), Aufgeben-
      Icon oben in die Ecke (kräftiger). **Ults mit eigenen Icons** (`ultIconName`) +
      **Pokemon-artigen Animationen** (Projektil-Strom je Element / Support-Aura).
      **Sammlung-Detail** icon-basiert (Ult-Icon in Tags + Fähigkeiten, Fließtext
      raus). **Gold nur in der Sammlung.** **Kampagne:** Sternen-Hintergrund +
      Kapitel-Themes (Wald usw.). sw.js → v3.
- [x] 19.07. (Runde 3): **Ult-Effekte aufgemotzt** — größere Projektile/Partikel +
      Einschlags-Blitz, bleibende **Schild-Barriere** bis Schild leer, **Heil-Glow**
      + Heil-Icon über der Kreatur, eigene **Ult-Sounds** je Typ. **Kampagne-
      Hintergründe** = Voll-Wallpaper (`#bg-layer`) statt gekacheltem Muster. sw.js → v4.
- [x] 19.07. (Runde 4): **Dev-Kampf-Simulation** (Team gegen 3 Dummys, volle Energie,
      keine Belohnung) im Dev-Board. **Map-Wallpaper eigene `sceneURI`-Variante 'map'**
      (verwandt zur Arena, nicht gleich). sw.js → v5.
- [x] 20.07. (Runde 5, Interview): **Profile mit PIN** — App-Start fragt, wer spielt;
      getrennte Spielstände je Profil (`js/profiles.js`), 4-stelliger PIN optional,
      Wechsel in den Optionen. **Kampf fest 2×** (`BATTLE_SPEED`, kein Schalter).
      **Passiv/Ult-Kurztext** unter den Stats, generiert aus den JSON-Werten
      (`abilityShort`) statt handgepflegter Liste. **Rand-Pfeile statt Swipe**
      zwischen Kampagne und Sammlung. **Team-Auswahl beruhigt** — Stage-Name,
      Beschreibung und Hinweiszeilen raus, Belohnung nur Icon+Zahl, Warnung nur
      Icon, Grid zeigt zuerst 6 Empfehlungen; **Tausch per zwei Taps in beliebiger
      Reihenfolge**. sw.js → v6.
- [x] 20.07. (Runde 6): **Ult-Feedback nachgeschärft** — Flammenwurf als dicker,
      flackernder Strahl mit dreifachem Projektil-Strom (`UltStreamStyle`),
      Heilung als leuchtender Boden-Kreis unter dem Team (`spawnHealField`),
      und **Rausch-Kanal im Synth** (`Sfx.noise`): Feuer faucht, Dampf zischt,
      Frost klirrt, Natur schneidet — vorher klangen alle Ults gleich.
- [x] 21.07. (Runde 7): **Fusion aufgeräumt** — Picker zeigt nur Max-Level-Kreaturen
      und nach der ersten Wahl nur noch Partner mit echtem Rezept. **Team-Auswahl
      korrigiert** — jede Änderung braucht zwei Taps, nichts rutscht mehr
      ungefragt auf den letzten Platz. **Dummy-Kampf-Ausstieg repariert**
      (`leaveBattle`; vorher blieb die tote Arena stehen). **Bildschirmgrößen**:
      Handy nur hochkant (Dreh-Hinweis im Querformat), Tablet quer mit
      4-spaltigem Menü, Grundschrift skaliert per `vmin`. sw.js → v7.
- [x] 21.07. (Runde 6): **Item-System** (`js/items.js`) — Langzeit-Hebel 1 der
      Design-Pfeiler. 12 Items, 1 Slot je Kreatur, Werte als Prozent-Aufschlag +
      **7 Keywords** (Gift/Brand/Frost-Chill/Lebensraub/Dornen/Energie/Startschild),
      alle in `battle.js` verdrahtet. Quellen: Kampagnen-Drops, Tages-Shop,
      Battlepass. UI: dritter Sammlungs-Tab (Inventar + Shop) + Slot im
      Kreatur-Detail. Setzt Pfeiler 2 um: „Toxin" ist ein Keyword, kein Element.
- [x] 21.07. (Runde 7): **Aufstieg + Wochen-Modifikatoren** (`js/ascension.js`) —
      Langzeit-Hebel 2. Kampagne ab Endboss-Kill auf höheren Stufen neu spielbar
      (Gegner +Level +Werte, Gold ×1,5 je Stufe, bessere Drops, Erstsieg je Stufe
      zählt neu). **8 Modifikatoren**, zwei davon wöchentlich rotierend,
      deterministisch aus dem Kalender — kein Backend. battle.js wertet sie
      generisch aus: neuer Modifikator = ein Eintrag in `MUTATORS`.
- [x] 21.07. (Runde 8): UI-Feinschliff — Lautstärke in 4 einrastbaren Stufen,
      iPad-Querformat ohne Randstreifen (`#screen` volle Breite), Welt-Übersicht als
      **Globen-Rail** (horizontal, ein Planet je Kapitel), Kopfleiste entfernt
      (nur Zurück + Zahnrad, Zahnrad auch im Menü), Lagerfeuer + Team auf der
      Bodenlinie statt schwebend.
- [x] 21.07.: **Async-PVP LIVE** — Supabase-Projekt `kdldlxwkwqmbtttuwxbq`, Migration
      eingespielt, Anonymous Sign-ins aktiv. End-to-End verifiziert: anonyme Anmeldung,
      Spieler-Zeile, Snapshot-Upload, Matchmaking, Kampf, `submit_match` (Elo 1000 →
      988 bei Niederlage, Gegner 1012), Rangliste. UI-Weg über den Arena-Screen
      ebenfalls durchgetestet. **Offen: Edge Function** zur serverseitigen
      Nachrechnung (`matches.verified`) — bis dahin meldet der Client den Sieger.
- [~] **Async-PVP (Langzeit-Hebel 3):** Datenmodell steht als Migration
      `supabase/migrations/0001_pvp.sql` (players, team_snapshots, ladder, matches
      + RPCs `upsert_snapshot`/`find_opponent`/`submit_match`/`leaderboard`, RLS).
      Kernpunkt: Wertung ist NICHT client-schreibbar. **`battle.js` ist
      deterministisch** (kein `Math.random`, kein `Date.now`) — Stufe 2 lässt eine
      Edge Function jeden Kampf nachrechnen (`matches.verified`).
      Offen: Client-Anbindung (Supabase-URL + anon key), Anmeldung (anonymous auth),
      PVP-Screen.
- [ ] Mehr Kampagnen-Kapitel (Stages 21+, weitere Fusions-Rezepte für die 9 offenen Paare)
- [ ] Idle-/Tages-Belohnungen, Erfolge
- [ ] Team-Positionen (Front/Backline ausbauen — Engine kennt `enemyBackline` schon)
  - [x] 15.07.: Positionen im Team-Select sichtbar (Slot 1 = „Vorne", wird zuerst
        angegriffen), per Tap tauschbar/entfernbar; vorderster Gegner markiert

### Phase 3 — Aufs iPhone (ohne Store, ohne Server)

- [x] GitHub-Repo: `https://github.com/gitty-den/elementra` (public, 14.07.2026)
- [x] GitHub Pages aktiv → Spiel unter `https://gitty-den.github.io/elementra/`
- [x] 17.07.: PWA-Manifest + Service-Worker (offline spielbar, „Zum Home-Bildschirm" = App-Gefühl).
      `manifest.webmanifest` + `sw.js` (stale-while-revalidate: Update greift beim ZWEITEN
      Start; neue Dateien in `sw.js` ASSETS eintragen). App-Icons gepixelt aus dem
      Element-Ring-Emblem (`icons/`, 192/512/180). Fonts-Fix: `fonts/` lag eine Ebene
      über dem Repo und fehlte darin — Pixel-Fonts luden nie; jetzt im Repo.
- [ ] Auf iPhone 13 / iPad Air real testen: Safari → Teilen → „Zum Home-Bildschirm" —
      startet dann randlos wie eine App, auch offline

**Arbeitsablauf ab jetzt:** Lokale Änderungen → `git push` → Pages aktualisiert sich
automatisch (~1 min). Remote-Sessions von claude.ai/code pushen ins selbe Repo →
lokal `git pull` nicht vergessen, bevor hier weitergearbeitet wird!

### Phase 4 — Stores

- [ ] **Capacitor**-Wrapper (Web-Code bleibt 1:1; Node ist seit 07/2026 installiert)
- [ ] Android: Play Console (25 $ einmalig), Build lokal oder GitHub Actions
- [ ] iOS: Apple Developer Program (99 $/Jahr). Kein Mac nötig: iOS-Build über
      GitHub Actions (macOS-Runner) oder Codemagic; Test-Verteilung per TestFlight
- [ ] Store-Assets: Icons, Screenshots, Datenschutzerklärung
- [ ] Monetarisierung entscheiden (Premium vs. F2P; beeinflusst Store-Prüfung)

### Phase 5 — Später / optional

- [ ] Backend erst, wenn nötig (Cloud-Save, PvP, Events) — bis dahin bewusst serverlos
- [ ] Analytics/Crash-Reporting (z. B. Sentry) erst ab Beta

## Remote-Arbeit vom iPad (Anweisung an Claude von unterwegs)

**Empfehlung: Variante A — kein PC, kein Mietserver nötig.**

- **A) Claude Code Web (claude.ai/code) + GitHub** ⭐ — AKTIV seit 14.07.2026
  Repo: `gitty-den/elementra`. Auf dem iPad im Browser/Claude-App claude.ai/code
  öffnen, GitHub verbinden, Repo auswählen — Claude arbeitet in Anthropic-Cloud-Sandboxes
  und pusht Ergebnisse ins Repo. PC kann aus bleiben. Ergebnis sofort via GitHub Pages
  am iPhone testbar: `https://gitty-den.github.io/elementra/`
- **B) Remote Control (offizielles Claude-Code-Feature)** — eingerichtet 14.07.2026
  Steuert eine LOKAL laufende Session vom iPad/iPhone (Claude-App → „Code") oder
  claude.ai/code. PC muss anbleiben; dafür voller Zugriff auf lokale Dateien/Tools.
  Start: `C:\005-Kellerwohnung\remote-control.cmd` doppelklicken (Server-Modus,
  Leertaste = QR-Code) oder `/remote-control` in einer laufenden Session tippen.
  Einmalige Voraussetzung: `claude auth login` im Terminal (Browser-Anmeldung).
  CLI: v2.1.209, global via npm installiert. Kein SSH/Tailscale nötig.
- **C) Server mieten** — für dieses Projekt unnötig (statisches Spiel, kein Backend).

Faustregel: PC aus → Variante A (Cloud). PC an → Variante B (lokal, mächtiger).

## Konnektoren / Dienste

| Dienst | Wozu | Status |
|---|---|---|
| GitHub (`gh` CLI) | Repo, Pages-Hosting, Actions-Builds, Basis für Variante A | vorhanden, Repo fehlt noch |
| Apple Developer | iOS-Signierung + App Store (99 $/Jahr) | erst Phase 4 |
| Google Play Console | Android-Store (25 $ einmalig) | erst Phase 4 |
| Codemagic (Alternative) | iOS-Cloud-Builds ohne Mac | optional, Phase 4 |
| Sentry o. ä. | Crash-Reports | optional, Phase 5 |

Kein weiterer MCP-Konnektor nötig; Prototyp läuft komplett lokal.
