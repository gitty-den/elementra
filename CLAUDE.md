# CLAUDE.md — Projekt Elementra

Kreaturen-Sammel-Autobattler (Echtzeit, 3 vs 3) mit Element-System und Fusion.
Roadmap & App-Store-Pfad: `MASTERPLAN.md` — zuerst lesen.

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
  (7 Archetyp-Maps × 6 Element-Paletten = alle 42, ⚙ → „Sprite-Galerie"), `iconArt(name)`
  (Pixel-Icons statt Emoji), `sceneArt(theme)` (Kampf/Titel-Hintergründe), `emblemArt()`
  (4 Varianten in `EmblemVariants`, Auswahl ⚙ → „Logo wählen" → `Save.settings.emblem`),
  `mapTrailURI()`/`starTileURI()` (Kampagnen-Karte). `js/svg.js` ist KOMPLETT obsolet
  (nur noch `SceneThemes`-Farbtabelle wird daraus gelesen). Char-Map-Zeilenlänge exakt
  16 (symmetric) bzw. 32 bzw. Icon-Breite; Fehler = Magenta-Pixel + console.warn.
- Kampf-Feedback: Angriffs-Animation je Archetyp (CSS `atkDash/atkBite/atkStomp/atkPhase/
  atkWhip/atkSwoop/atkDive`, Richtungs-Flip via `--dir` am `.unit`), Pixel-Partikel bei
  Treffer/Heilung/Tod/Ulti (`spawnParticles`, Farben aus `PixelPalettes`). Fusion-Screen
  ist visuell (Element-Legende, Level-Pips, Fundort-Tags, Teaser-Rezepte) — keine Textwände.
- Schrift: Pixel-Fonts aus `fonts/` (OFL-Lizenz, lokal, offline-fähig): „Press Start 2P"
  für Headlines/Buttons, „VT323" für Fließtext (Grundgröße 19px). Keine System-/Webfonts.
  UI-Look: kantige Ecken, harte Stufen-Schatten, CSS-Scanlines (style.css „Pixel-Look" + „Pixel-Typografie").
- Testen: Preview-Server `elementra` (`..\.claude\launch.json`, Port 8124) oder `index.html` doppelklicken.

## Architektur

| Datei | Inhalt |
|---|---|
| `js/data.js` | GENERIERT — Rohdaten aus `data/*.json` als Globals `TYPES_DATA`, `CREATURES_DATA`, `FUSIONS_DATA` |
| `js/state.js` | Lookups (`Elements`, `Creatures`, `Abilities`), Save (localStorage `elementra_save_v1`), Level-Logik (`MAX_LEVEL` 5, +10 %/Level, Kosten 30·Level), Fusion (`fuse`, `recipeReady`), Stage-Fortschritt |
| `js/svg.js` | KOMPLETT obsolet — nur die Farbtabelle `SceneThemes` wird noch von `sceneArt` (pixel.js) gelesen. Keine SVG-Funktion mehr aufrufen |
| `js/pixel.js` | **Standard-Kreaturen-Renderer**: `creatureArt(c, {noAura})` — `PixelArchetypes` (7 Char-Maps) × `PixelPalettes` (6 Elemente), 32×32-Canvas → dataURI, Cache. Tippfehler-Pixel erscheinen magenta |
| `js/sfx.js` | WebAudio-Synth (`Sfx.hit/ulti/win/...`), kein Audio-Asset, entsperrt bei erster Interaktion |
| `js/music.js` | Generative Musik (WebAudio, Lookahead-Scheduler): Themes `map`/`battle`, `Music.play(theme)`, Toggle in ⚙. Hooks: Titel-Tap, `beginBattle`, `endBattleUI` |
| `js/stages.js` | 10 Kampagnen-Stages: Gegner, Gold, First-Clear-Bonus, Kreaturen-Unlocks, `theme` (Arena-Hintergrund) |
| `js/battle.js` | Engine: `createBattle`, `updateBattle(battle, dtMs)`, `castActive`. Events via `battle.on((type, data) => …)`: attack, damage, heal, absorb, shieldGain, poison, ulti, die, revive, energyFull, end |
| `js/ui.js` | Screens (map/collection/fusion), Kampf-UI (rAF-Loop), Overlays, Titelscreen (`showTitle`), `debugBattleStep(ms)` |
| `js/main.js` | Bootstrap |

## UI-Design (Game-Look, kein Web-Look!)

- **Titelscreen** (`showTitle`): Emblem + Logo, Tap startet und entsperrt AudioContext.
- **Kampagne = Weltkarte**: Zickzack-Pfad (SVG, in `renderMap` aus Knotenpositionen berechnet),
  Medaillon-Knoten, Stage 1 unten, aktuelle Stage pulsiert gold. Kein Listen-Layout!
- **Kampf = Arena-Szene**: `sceneSVG(stage.theme)` als Hintergrund, Einheiten absolut
  positioniert über `SLOT_POS` (Prozent-Koordinaten in ui.js), Gegner per `scaleX(-1)`
  gespiegelt. Idle-Bobbing, gerichteter Ausfallschritt (Vektor per getBoundingClientRect
  in CSS-Vars `--tx`/`--ty`), Treffer-Blitz, Screen-Shake bei Ultis, goldener Boden-Ring
  bei voller Energie.
- Stil-Grundsätze in `css/style.css`: Bevel-Buttons (inset-Shadows statt flach),
  Vignette + Korn-Overlay auf `body::before/after`, Sheen-Animation auf Legendär-Karten,
  Versalien + Letterspacing für Titel. Neue UI-Elemente müssen diesem Look folgen —
  keine flachen Web-Buttons/-Listen.

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
- **Heiler-Falle ist Absicht:** water_geist (ANG 8) macht das Team früh stabil, aber ab
  Stage 8 gewinnen nur Triple-DPS-Teams. Team-Umbau ist die gewollte Lernkurve.
- Unlock-Reihenfolge liefert Konter VOR der Stage, die ihn braucht: S3→water_wyrm (vor
  Feuer-S4), S4→nature_wolf (vor Wasser-S5), S7→water_drache (Demo-Fusion), S10→fire_phoenix.
- Referenzkurve (simuliert): S1–3 Starter Lv1–2 · S4 Lv3 + water_wyrm · S5–7 Lv3–4 ·
  S8–10 Lv5 Triple-DPS; S10 auch mit Fusions-Drache ~30 s.

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
