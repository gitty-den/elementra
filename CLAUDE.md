# CLAUDE.md — Projekt Elementra

Kreaturen-Sammel-Autobattler (Echtzeit, 3 vs 3) mit Element-System und Fusion.
Roadmap & App-Store-Pfad: `MASTERPLAN.md` — zuerst lesen.

## Navigation (seit 17.07.2026: Hub-and-Spoke, kein Bottom-Nav)

- App startet mit **Splash** (nur rotierendes Ring-Logo, fliegt per FLIP auf die
  Emblem-Position im Menü — `showSplash` in main.js), dann **Hauptmenü**
  (`renderMenu`): Lager-Szene mit den 3 Team-Kreaturen am Pixel-Lagerfeuer
  (`campfireArt`, 2 Flacker-Frames), 2×2-Kachel-Raster. Topbar (Gold, ⚙,
  Zurück-Pfeil) nur in Subscreens (`body.in-menu` blendet sie aus).
- **Swipe links/rechts** wechselt zwischen map/collection/fusion (`initSwipe`,
  Reihenfolge `SWIPE_ORDER`; im Kampf gesperrt via `if (B) return`).
- Map fokussiert beim Rendern immer die aktuelle Stage (Scroll zentriert).
- Teamwahl: Antippen ersetzt direkt — markierter Slot, sonst hinterste Position.
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
  (data → state → svg → pixel → sfx → music → stages → battle → ui → main).
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
  Deploy-Updates greifen erst beim ZWEITEN App-Start). **Jede neue Datei (JS/CSS/Font/
  Icon) in `sw.js` ASSETS eintragen**, sonst offline kaputt. SW registriert nur über
  http(s), nicht file:// (Guard in main.js). App-Icons in `icons/` sind aus dem
  Emblem gepixelt (192/512/180, Hintergrund #0b0e1a) — bei Emblem-Änderung neu erzeugen.

## Architektur

| Datei | Inhalt |
|---|---|
| `js/data.js` | GENERIERT — Rohdaten aus `data/*.json` als Globals `TYPES_DATA`, `CREATURES_DATA`, `FUSIONS_DATA` |
| `js/state.js` | Lookups (`Elements`, `Creatures`, `Abilities`), Save (localStorage `elementra_save_v1`, Migration entfernt unbekannte IDs gegen 100 Gold), Level-Logik (`MAX_LEVEL` 5, +10 %/Level, Kosten 30·Level), Fusion (`fusionResult/fusionReady/fuseCreatures`), Stage-Fortschritt |
| `js/svg.js` | KOMPLETT obsolet — nur die Farbtabelle `SceneThemes` wird noch von `sceneArt` (pixel.js) gelesen. Keine SVG-Funktion mehr aufrufen |
| `js/pixel.js` | **Standard-Kreaturen-Renderer**: `creatureArt(c, {noAura})` — `PixelArchetypes` (7 Char-Maps) × `PixelPalettes` (6 Elemente), 32×32-Canvas → dataURI, Cache. Tippfehler-Pixel erscheinen magenta |
| `js/sfx.js` | WebAudio-Synth (`Sfx.hit/ulti/win/...`), kein Audio-Asset, entsperrt bei erster Interaktion |
| `js/music.js` | Generative Musik (WebAudio, Lookahead-Scheduler): Themes `map`/`battle`, `Music.play(theme)`, Toggle in ⚙. Hooks: Titel-Tap, `beginBattle`, `endBattleUI` |
| `js/stages.js` | 10 Kampagnen-Stages: Gegner, Gold, First-Clear-Bonus, Kreaturen-Unlocks, `theme` (Arena-Hintergrund) |
| `js/battle.js` | Engine: `createBattle`, `updateBattle(battle, dtMs)`, `castActive`. Events via `battle.on((type, data) => …)`: attack, damage, heal, absorb, shieldGain, poison, ulti, die, revive, energyFull, end |
| `js/ui.js` | Screens (menu/map/collection/fusion), Kampf-UI (rAF-Loop), Overlays, Hauptmenü (`renderMenu`), `debugBattleStep(ms)` |
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
- Kampf-Steuerung (Tempo/Auto) unten am Rand; **Ulti-Ready = goldene blinkende
  Sprite-Umrandung** (`ultiBlink`, Drop-Shadow-Kette), kein Bodenring, kein Hint-Text.
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
