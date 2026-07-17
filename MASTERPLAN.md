# MASTERPLAN — Elementra

Kreaturen-Sammel-Autobattler: sammeln → leveln → fusionieren → Kampagne besiegen.
Datengrundlage: `data/*.json` (42 Kreaturen, 3+3 Elemente, 21 Fusions-Rezepte, siehe `data/DATA_SCHEMA.md`).

## Vision

Mobile-Game (iOS + Android, App Store / Play Store). Kernloop: Autobattler
3 vs 3, Element-Kreislauf 🔥→🌿→💧→🔥, Hybride durch Fusion.
Stil: dunkel-episch mit Element-Glow.

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
