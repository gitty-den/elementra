# CLAUDE.md — Projekt Elementra

Kreaturen-Sammel-Autobattler (Echtzeit, 3 vs 3) mit Element-System und Fusion.
Roadmap & App-Store-Pfad: `MASTERPLAN.md` — zuerst lesen.

## Navigation (seit 17.07.2026: Hub-and-Spoke, kein Bottom-Nav)

- App startet mit **Splash** (nur rotierendes Ring-Logo, fliegt per FLIP auf die
  Emblem-Position im Menü — `showSplash` in main.js), dann **Hauptmenü**
  (`renderMenu`): Lager-Szene mit den 3 Team-Kreaturen am Pixel-Lagerfeuer
  (`campfireArt`, 2 Flacker-Frames), 2×2-Kachel-Raster: Kampagne / Sammlung /
  **Battlepass** / Optionen (Fusion-Kachel entfiel 19.07. — Fusion ist jetzt Tab
  in der Sammlung). Topbar nur in Subscreens (`body.in-menu` blendet sie aus).
- **Rand-Pfeile** wechseln zwischen map/collection (`initNavArrows`/`updateNavArrows`,
  `NAV_ORDER` = ['map','collection']). Swipe ist seit 20.07. RAUS (kollidierte mit
  dem Scrollen der Karte). Pfeile sind fix am linken/rechten Bildschirmrand,
  erscheinen nur, wenn es in der Richtung einen Nachbarn gibt, und nie im Kampf.
- **App-Start = Profilauswahl** (20.07., `js/profiles.js` + `openProfileGate`):
  mehrere Spielstände nebeneinander, je Profil ein eigener Save-Schlüssel
  (`elementra_save_v1__<id>`), optionaler 4-stelliger PIN (Ziffernblock
  `openPinPad`). Gate erscheint beim Start, wenn kein Profil aktiv ist, das
  aktive Profil einen PIN hat oder es mehr als eins gibt — ein einzelnes Profil
  ohne PIN startet durch. Wechseln in den Optionen, Löschen per Long-Press auf
  die Profilkarte. **Der PIN ist Bequemlichkeit, kein Schutz** (Klartext im
  localStorage).
- **Kampagne = Welt-Übersicht (`renderWorld`) → Kapitel-Karte (`renderChapterMap`)**
  (19.07.): `CHAPTERS` (stages.js) teilen die Stages in Abteile; `renderMap` ist
  Dispatcher über `currentChapter` (null = Übersicht). Kapitel N gesperrt bis
  Boss von N−1 besiegt (`chapterUnlocked`). Boss-Sieg zeigt „Nächste Karte"
  (setzt `currentChapter` aufs Folgekapitel). Menü-Kachel „Kampagne" öffnet immer
  die Übersicht. **Wallpaper (19.07. Runde 3):** Kampagne nutzt ein Voll-Bild-
  Wallpaper — `#bg-layer` (fixed, `z-index:-1`, in index.html) wird per
  `setCampaignWallpaper(theme)` mit `sceneArt` gefüllt (Welt = 'storm', Kapitel =
  `ch.theme`, Kapitel 1 nature = Wald). KEIN gekacheltes Stern-Muster mehr auf
  `.map-world`. `showScreen` leert `#bg-layer` außerhalb der Kampagne. Kapitel-
  Karten zeigen zusätzlich ihr Theme als `.wc-bg`-Cover.
- **Sammlung + Fusion in einem Fenster** (19.07.): `renderCollection` hat oben
  einen Umschalter (`collMode` 'coll'|'fusion', `collTabsHTML`); Fusion-Inhalt via
  `renderFusionBody(wrap)`. `showScreen('fusion')` leitet auf den Fusion-Tab um.
- Kapitel-Karte fokussiert beim Rendern die aktuelle Stage (Scroll zentriert).
- **Team-Auswahl = ruhige Einseite** (Umbau 20.07., Nutzer-Feedback „zu viel Text,
  überreizt"): oben schmales Gegner-Band (Sprites + Level, vorderster Gegner mit
  Gold-Strich) und Belohnung als Icon+Zahl — KEIN Stage-Name, KEINE Beschreibung,
  keine Hinweiszeile, keine Labels. Darunter drei große Slots, darunter das Grid
  mit den 6 besten Kandidaten (`stageFitScore`) und einem Aufklapp-Pfeil für alle.
  Team-Warnung nur als Warn-Icon am Front-Slot; Text erst beim Antippen
  (`floatHint`). **Tausch = zwei Taps, Reihenfolge egal** (`tapPos`/`tapCard`):
  erstes Antippen markiert, zweites tauscht — funktioniert für Slots wie für
  Karten im Grid. Long-Press auf einen Slot nimmt die Kreatur aus dem Team.
- **Kein Zurück im Kampf** — raus nur über das Sieg/Niederlage-Overlay.
- Niederlage zeigt EINEN kurzen rotierenden Tipp (`DEFEAT_TIPS`), keine Textwand.
- Kampf-HUD: Kompakt-Plakette (`unit-plate`) — Level-Badge links an der HP-Bar,
  Energie-Bar darunter, kein Name.

## UI-Grundsätze (Nutzer-Feedback 17.07.2026, bindend)

- **Icon-basiert statt Text:** so wenig Wörter wie möglich; Erklärungen visuell
  vermitteln (sprachunabhängig — Ziel internationaler Store).
- **Groß genug fürs Handy:** Buttons daumengroß, Counter/Bars deutlich lesbar;
  im Zweifel größer. Erste Fassung war auf iPhone 13 zu klein.

## Regeln

- **Kein Build-Schritt, kein Framework.** Spiel muss per `file://` UND Preview-Server laufen.
- **Kein `import`/`export`** — klassische Script-Tags, Reihenfolge in `index.html` ist bindend
  (data → state → svg → pixel → sfx → music → stages → battle → bp → ui → main).
- **`data/*.json` ist die Quelle der Wahrheit** (kommt aus der Design-ZIP, Stats laut
  `data/DATA_SCHEMA.md` Platzhalter fürs Balancing). `js/data.js` wird daraus GENERIERT
  (JSON-Inhalt 1:1 in `const`-Deklarationen, wegen file://-CORS kein fetch). Nach jeder
  JSON-Änderung neu generieren:
  ```powershell
  $d="data"; $out="// Auto-generiert aus data/*.json`n"
  $out += "const TYPES_DATA = " + (Get-Content "$d\types.json" -Raw) + ";`n"
  $out += "const CREATURES_DATA = " + (Get-Content "$d\creatures.json" -Raw) + ";`n"
  $out += "const FUSIONS_DATA = " + (Get-Content "$d\fusions.json" -Raw) + ";`n"
  [IO.File]::WriteAllText("js\data.js", $out, (New-Object Text.UTF8Encoding($false)))
  ```
- PowerShell-Skripte: reines ASCII (PowerShell 5.1 liest UTF-8 ohne BOM als ANSI).
- Zielgerät: iPhone 13, Hochformat, Safari. Touch zuerst; Desktop nur Dev-Fallback.
- Grafik: **ALLES ist Pixelart — NIE wieder Vektor/SVG/Emoji für Sichtbares erzeugen.**
  Jedes neue visuelle Element (Kreatur, Icon, Hintergrund, Emblem, Effekt) wird direkt
  als Pixelart in `js/pixel.js` gebaut: Char-Maps oder Low-Res-Canvas → dataURI →
  `<img class="pixel-sprite">` (image-rendering: pixelated). Renderer: `creatureArt()`
  (Archetyp-Maps × 6 Element-Paletten; Galerie nur noch per Konsole `openPixelTest()`), `iconArt(name)`
  (Pixel-Icons statt Emoji), `sceneArt(theme)` (Kampf/Titel-Hintergründe), `emblemArt()`
  (Logo FEST auf 'ring' — Element-Ring; übrige `EmblemVariants` nur noch Debug-Assets),
  `mapTrailURI()`/`starTileURI()` (Kampagnen-Karte). `js/svg.js` ist KOMPLETT obsolet
  (nur noch `SceneThemes`-Farbtabelle wird daraus gelesen). Char-Map-Zeilenlänge exakt
  16 (symmetric) bzw. 32 bzw. Icon-Breite; Fehler = Magenta-Pixel + console.warn.
- Kampf-Feedback: Angriffs-Animation je Archetyp (CSS `atkDash/atkBite/atkStomp/atkPhase/
  atkWhip/atkSwoop/atkDive`, Richtungs-Flip via `--dir` am `.unit`), Pixel-Partikel bei
  Treffer/Heilung/Tod (`spawnParticles`). **Ulti-Moment** (17.07.): `spawnUltiBurst`
  (30 Partikel in Element-Farben, Flugbahn je Element: Feuer/Asche steigen, Wasser/Frost
  spritzen, Natur wirbelt, Rest radial) + Schockwellen-Ring + Vollbild-Blitz +
  `casting`-Aufbäumen + 260-ms-Hit-Stop (`B.freezeUntil`). Fusion-Screen ist visuell —
  keine Textwände.
- **Karten rahmenlos:** `.ccard` ohne Box/Border — Seltenheit + Auswahl als Drop-Shadow-
  Glow am Sprite. Long-Press auf Karten = Stat-Peek (`attachLongPress`, 450 ms;
  `contextmenu` global unterdrückt, `-webkit-touch-callout: none`).
- Schrift: Pixel-Fonts aus `fonts/` (OFL-Lizenz, lokal, offline-fähig): „Press Start 2P"
  für Headlines/Buttons, „VT323" für Fließtext (Grundgröße 19px). Keine System-/Webfonts.
  UI-Look: kantige Ecken, harte Stufen-Schatten, CSS-Scanlines (style.css „Pixel-Look" + „Pixel-Typografie").
- Testen: Preview-Server `elementra` (`..\.claude\launch.json`, Port 8124) oder `index.html` doppelklicken.
- **PWA:** `manifest.webmanifest` + `sw.js` (Offline-Cache, stale-while-revalidate —
  Deploy-Updates greifen erst beim ZWEITEN App-Start). **Auf localhost registriert
  main.js den SW NICHT** und räumt alte Registrierungen ab (20.07.) — der Cache
  lieferte beim Entwickeln sonst hartnäckig alten Code. **Jede neue Datei (JS/CSS/Font/
  Icon) in `sw.js` ASSETS eintragen**, sonst offline kaputt. SW registriert nur über
  http(s), nicht file:// (Guard in main.js). App-Icons in `icons/` sind aus dem
  Emblem gepixelt (192/512/180, Hintergrund #0b0e1a) — bei Emblem-Änderung neu erzeugen.

## Architektur

| Datei | Inhalt |
|---|---|
| `js/profiles.js` | **Lokale Profile** (20.07.): Profilliste + aktives Profil in `elementra_profiles_v1`, Save-Schlüssel je Profil (`currentSaveKey`), `createProfile/deleteProfile/activateProfile`, `profileSummary`. Migriert einen alten `elementra_save_v1` beim Erststart zu „Spieler 1". Wird VOR state.js geladen |
| `js/data.js` | GENERIERT — Rohdaten aus `data/*.json` als Globals `TYPES_DATA`, `CREATURES_DATA`, `FUSIONS_DATA` |
| `js/state.js` | Lookups (`Elements`, `Creatures`, `Abilities`), Kurzbeschreibungen `abilityShort` (GENERIERT aus effect/params — nicht handpflegen), Save (localStorage, Schlüssel kommt aus `currentSaveKey()`, Migration entfernt unbekannte IDs gegen 100 Gold), Level-Logik (`MAX_LEVEL` 5, +10 %/Level, Kosten 30·Level), Fusion (`fusionResult/fusionReady/fuseCreatures`), Stage-Fortschritt |
| `js/svg.js` | KOMPLETT obsolet — nur die Farbtabelle `SceneThemes` wird noch von `sceneArt` (pixel.js) gelesen. Keine SVG-Funktion mehr aufrufen |
| `js/pixel.js` | **Standard-Kreaturen-Renderer**: `creatureArt(c, {noAura,noAnim})` — `PixelArchetypes` (7 Basis + 12 Fusion Char-Maps) × `PixelPalettes`, 32×32-Canvas → dataURI, Cache. **Idle-Frames (19.07.)**: `creatureFrames(arch,el)` erzeugt prozedural Frame 1 (Augen zu via e/p→m + 1px Atem-Stauchung); globaler `setInterval` (540 ms) swappt `img.creature-sprite`-`src`. `noAnim` schaltet es ab. Tippfehler-Pixel erscheinen magenta |
| `js/sfx.js` | WebAudio-Synth (`Sfx.hit/ulti/win/...`), kein Audio-Asset, entsperrt bei erster Interaktion. **Rausch-Kanal seit 20.07.** (`Sfx.noise(dur, {type,freq,freqTo,q,vol,attack,delay})`: gefiltertes Rauschen, grobkörniger Buffer) — das Gegenstück zum Noise-Kanal echter 8-Bit-Chips. Ult-Sounds sind nach dem Muster **Ton-Kern + Rausch-Schicht + Transiente** gebaut; neue Sounds bitte genauso, sonst klingen sie wieder austauschbar |
| `js/music.js` | Generative Musik (WebAudio, Lookahead-Scheduler): Themes `map`/`battle`, `Music.play(theme)`, Toggle in ⚙. Hooks: Titel-Tap, `beginBattle`, `endBattleUI` |
| `js/stages.js` | 10 Kampagnen-Stages: Gegner, Gold, First-Clear-Bonus, Kreaturen-Unlocks, `theme` (Arena-Hintergrund) |
| `js/battle.js` | Engine: `createBattle`, `updateBattle(battle, dtMs)`, `castActive`. Events via `battle.on((type, data) => …)`: attack, damage, heal, absorb, shieldGain, poison, ulti, die, revive, energyFull, end |
| `js/bp.js` | **Battlepass** (19.07.): Season (~30 Tage, `currentSeason()` in state.js), Stufen (`bpCompleted`, `BP_TIER_XP`), Belohnungs-Bahn (`bpReward` free/prem, `bpClaim`), Aufgaben (`bpEnsureQuests`/`bpTrack`), Kampf-Hook `bpOnBattle(won)`, Screen `renderBattlepass`. Premium = Demo-Schalter (`bpUnlockPremium`), echtes IAP erst Phase 4 |
| `js/ui.js` | Screens (menu/map=welt+kapitel/collection+fusion), Kampf-UI (rAF-Loop), Overlays, Hauptmenü (`renderMenu`), Team-Warnung (`teamWeakness`), Aufgeben (`giveUpBattle`), Developer-Board (`openDevBoard`), `debugBattleStep(ms)` |
| `js/main.js` | Bootstrap |

## UI-Design (Game-Look, kein Web-Look!)

- **Hauptmenü** (`renderMenu`): Emblem + Logo über Lager-Szene; erste Interaktion
  (pointerdown, main.js) entsperrt AudioContext und startet die Musik.
- **Kampagne = Weltkarte, VERTIKAL scrollend** (Stage 1 unten; horizontale Variante
  wurde vom Nutzer verworfen). Scrollbars sind app-weit unsichtbar. Medaillons zeigen
  **Theme-Icons statt Nummern** (`MapThemeIcon`/`MapThemeGlow` in ui.js), keine
  Text-Labels auf der Map — Details erst im Team-Select. Kein Listen-Layout!
- **Overlays rahmenlos** (Feedback 17.07.): eine Fläche, keine Box-in-Box-Optik —
  innere Container ohne Border, Hervorhebung über Glow/Schatten.
- **Kampf-Steuerung (Umbau 19.07.):** KEIN Tempo-/Auto-Schalter, KEIN Tap-auf-Kreatur
  mehr. Unten eine **Ult-Leiste** (`#ult-bar`, `B.ultBtns`) — ein Button je Team-
  Kreatur mit ihrem **Ult-Icon** (`ultIconName`: Effekt-Typ, offensive erben Element),
  Energie-Bar drunter, leuchtet **gold bei voller Energie** (`.ult-btn.ready`), Tap
  zündet `castActive`. **Aufgeben** = prägnantes Icon (`giveup`) oben links
  (`.battle-giveup`). Enemy-KI zündet weiter automatisch (`side==='enemy'`).
- **Kampftempo fest 2×** (20.07.): `BATTLE_SPEED = 2` in ui.js, `B.speed` daraus;
  kein Schalter. Nur der Engine-Tick läuft doppelt (`updateBattle(dt * B.speed)`),
  Animationen bleiben Echtzeit — deshalb kürzt CSS die Angriffs-Animationen auf
  0,26 s (`.unit.attacking .unit-body`), sonst schneidet der nächste Angriff sie ab.
  Achtung fürs Balancing: Sudden Death (2 min Kampfzeit) kommt real nach 1 min.
- **Ult-Animationen (Pokemon-Stil, aufgemotzt Runde 3):** `ulti`-Event spawnt
  gerichtete Attacke — offensive = großer Projektil-Strom (34px Element-Icons +
  Glow) vom Wirker zum Ziel mit Einschlags-Blitz + Partikelregen je Treffer
  (`spawnUltProjectile`, Feuer=Flammenwurf/Natur=Rasierblatt …). Wie dick der
  Strom ist, steht in `UltStreamStyle` (20.07.): Größe, Anzahl-Multiplikator,
  Abstand und `beam` = Dicke des durchgehenden Strahls (`.ult-beam`, flackert in
  zwei harten Stufen). Feuer/Asche/Dampf/Wasser haben einen Strahl, Natur/Frost
  bleiben Einzelgeschosse. **Heil-Ult** = Boden-Kreis unter dem ganzen Team
  (`spawnHealField`, `.heal-field` mit aufsteigenden Funken) + Aura je Kreatur —
  soll so klar lesbar sein wie die Schild-Blase. **Schild-Ult** =
  bleibende Barriere-Blase um die Kreatur, solange Schild hält (`.unit.shielded
  .shield-barrier`, in renderBars getoggelt). **Heil** = grünes Aufleuchten
  (`.unit.healed`) + schwebendes Heil-Icon (`.heal-icon`) über der Kreatur.
  **Revive/Support** = Aura-Ringe (`spawnUltAura`). Eigene Sounds je Typ
  (`Sfx.ultShield/ultHeal/ultRevive/ultAttack(element)`). Normale Angriffe bleiben
  Tackle (`atk*`-Anims). Ulti-Ready-Sprite-Umrandung (`ultiBlink`) bleibt.
- **Gold-Anzeige nur in der Sammlung** (`body.gold-visible`, in showScreen gesetzt).
- Einstellungen: **Lautstärke-Regler** `Save.settings.sfxVol`/`musicVol` (0–1,
  `Music.setVolume`), Logo fest 'ring'.
- **Kampf = Arena-Szene**: `sceneSVG(stage.theme)` als Hintergrund, Einheiten absolut
  positioniert über `SLOT_POS` (Prozent-Koordinaten in ui.js), Gegner per `scaleX(-1)`
  gespiegelt. Idle-Bobbing, gerichteter Ausfallschritt (Vektor per getBoundingClientRect
  in CSS-Vars `--tx`/`--ty`), Treffer-Blitz, Screen-Shake bei Ultis, goldener Boden-Ring
  bei voller Energie.
- Stil-Grundsätze in `css/style.css`: Bevel-Buttons (inset-Shadows statt flach),
  Vignette + Korn-Overlay auf `body::before/after`, Sheen-Animation auf Legendär-Karten,
  Versalien + Letterspacing für Titel. Neue UI-Elemente müssen diesem Look folgen —
  keine flachen Web-Buttons/-Listen.

## Fusion (Redesign 17.07.2026: Archetyp + Element)

- Alte Regel (gleicher Archetyp, Element-Hybrid als Ergebnis) ist WEG — die 21
  Hybrid-Kreaturen (steam_/ash_/frost_*) existieren nicht mehr; `creatures.json`
  hat nur noch 21 Basis-Kreaturen.
- Neu: zwei Basis-Kreaturen VERSCHIEDENER Archetypen (beide Max-Level) → einer von
  **12 kuratierten Fusions-Archetypen** (`fusions.json` → `fusionArchetypes`:
  Koloss=Drache+Golem, Wyvern=Drache+Greif, Leviathan=Drache+Wyrm, Seraph=Drache+
  Phönix, Behemoth=Golem+Wolf, Gargoyle=Golem+Geist, Basilisk=Golem+Wyrm,
  Chimära=Greif+Wolf, Sphinx=Greif+Geist, Barghest=Wolf+Geist, Ouroboros=Wyrm+
  Phönix, Archon=Geist+Phönix). 9 Paare haben bewusst KEIN Rezept.
- Element des Ergebnisses: gleich+gleich → gleich, sonst Hybrid-Element
  (fire+water=steam, fire+nature=ash, nature+water=frost). Hybride kämpfen neutral.
- Ergebnis-IDs `fx_<archetyp>_<element>` werden zur Laufzeit in state.js generiert
  (12×6=72 Einträge in `Creatures`, NICHT in creatures.json); Name =
  `namePrefixes[element]`-Archetypname (z. B. „Aschen-Koloss").
- Sprites: eigene Char-Maps je Fusions-Archetyp in `PixelArchetypes` (pixel.js),
  Paletten wie gehabt je Element. Angriffs-Animationen erben per CSS vom passenden
  Eltern-Archetyp (Block „Fusions-Archetypen erben…" in style.css).
- Fusions-Kreaturen sind Endstufe: nicht erneut fusionierbar.
- Fusion-Screen ist ein freier 2-Slot-Picker mit Ergebnis-Vorschau (`renderFusion`).

## Progression (17.07.2026)

- **Kampf-XP ist der Hauptweg:** `gainXp`/`grantTeamXp` in state.js — Sieg gibt
  `10+2·Stage` XP je Team-Mitglied (Niederlage ⅓), `xpNeed = 35·Level`, Cap Lv 5.
  Gold-Level-Up kostet 60·Level und setzt xp=0 (reiner Beschleuniger).
- Wiederholungs-Clears geben nur halbes Stage-Gold.
- **Ziele/Meilensteine:** `MILESTONES` + `goalProgress`/`claimMilestone` (state.js),
  Panel oben in der Sammlung. Tages-Bonus: `claimDailyBonus` (50 Gold, Kalendertag).
- **Boss-Stages** (`boss: true` in stages.js, aktuell S10/S20): roter XL-Map-Knoten,
  Intro-Overlay in beginBattle (Kampf via `B.freezeUntil` eingefroren), Sieg-Schmuck.

## Kampfsystem (Kurzfassung)

- Echtzeit; Angriffsintervall `max(700, 2400 − spd·50)` ms, erste Angriffe pro Slot gestaffelt.
- Schaden: `ANG · Elementmult − VER · 0.4`, min. 1. Elementmult aus `types.json`
  (1.5 / 0.75 / 1.0; Hybride immer neutral). Golem-Passiv zieht flach 2 ab.
- Energie 0–100 laut `creatures.json`-Passiven (onAttack/onHit/perSecond); Ulti kostet 100.
  Spieler tippt Kreatur an (Karte pulsiert gold) oder Auto-Schalter; Gegner-KI zündet nach 400 ms.
- Status: Schild (absorbiert, verfällt), Spott, Gift-Stapel (5 %·ANG/s je Stapel, max 5),
  Blutung, Flächen-DoT, VER-Debuff.
- **Sudden Death:** ab 2 min Kampfzeit steigt aller Schaden linear bis 3× (Minute 4) —
  verhindert Heiler-Patts.

## Balancing-Erkenntnisse (aus Simulation, nicht raten!)

- **Elementar-Konter auf dem Tank kippt jeden Kampf** — der Spieler hat im Prototyp nur
  nature_golem als Tank; Stages dürfen daher keine reinen Feuer-Konter-Trios sein.
- Unlock-Reihenfolge liefert Konter VOR der Stage, die ihn braucht: S3→water_wyrm (vor
  Feuer-S4), S4→nature_wolf (vor Wasser-S5), S10→fire_phoenix.
- Referenzkurve (Sim 17.07.2026, nach Fusions-Redesign): S1–3 Starter Lv1–2 ·
  S4 Lv3 + water_wyrm · S5–7 Lv3–4 · **S8–10 Lv5 Triple-DPS** (S10: Lv4-DPS verliert,
  Lv5-DPS ~30 s, Team mit Fusions-Koloss ~19 s).
- Kapitel 2 (Sim 17.07.2026): S11–13 Lv5-Basis-Teams · **S14 = erste Fusions-Pflicht**
  (Lv5-DPS verliert gegen Barghest, 1 Fusion genügt) · S15–17 Fusions-Ära ·
  S18–19 brauchen ausgebaute Fusionen (Koloss Lv3+ bzw. 2 Fusionen) ·
  S20 All-Fusion-Finale (ohne eigene Fusion nicht schaffbar).
- **fx_wyvern als Gegner ist tabu bzw. nur mit Sim-Beleg:** multiHit 3× auf die
  Rückreihe vernichtet schon auf Lv1 jedes Nicht-Fusions-Team (getestet 17.07.).
- Alte „Heiler-Falle"-Notiz relativiert: ein Heiler-Team MIT Lv5-Drache gewann auch
  das alte S10 — die Falle betraf nur Teams ohne echten DPS-Kern.

## Debug/Test (wichtig — Browser-Pane-Tab ist oft `hidden`, rAF pausiert dann!)

- **Dev-Board → „Kampf-Sim (Dummys)"** (`startDevBattle`, 19.07. Runde 4): Team gegen
  3 unverwüstliche `dev_dummy` (5000 LP, kaum Schaden, zünden nie); Team startet mit
  voller Energie → Ults/Animationen sofort testbar. Ergebnis ohne Belohnung
  (`stage.dev` überspringt Grants/Battlepass in `showBattleResult`). Dummy hat
  `dev:true` → aus Battlepass-Pool + Dev-Liste ausgeschlossen.
- **Map-Wallpaper vs. Arena:** `sceneURI(theme, 'map')` = eigene Komposition (tieferer
  Horizont, 3 Bergketten, versetzter Mond, Vordergrund-Silhouette) — verwandt, aber
  NICHT identisch mit dem Arena-Hintergrund `sceneArt(theme)` (Variante '').
- `debugBattleStep(ms)` tickt den laufenden Kampf synchron (16-ms-Schritte) + rendert Bars.
- Headless-Sim für Balancing (in Konsole):
  ```js
  function sim(a, e) { const b = createBattle(a, e); b.autoUlti = true;
    while (!b.over && b.time < 400000) updateBattle(b, 16);
    return { winner: b.winner, t: Math.round(b.time / 1000) }; }
  sim([{id:'fire_drache',level:3}, …], STAGES[3].enemies)
  ```
- Save manipulieren: `Save.collection.water_drache = {level:5}; persist(); showScreen('fusion')`.
- Spielstand löschen: `resetSave(); location.reload()` oder ⚙ → Zurücksetzen.
