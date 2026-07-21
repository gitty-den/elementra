# CLAUDE.md — Projekt Elementra

Kreaturen-Sammel-Autobattler (Echtzeit, 3 vs 3) mit Element-System und Fusion.
Roadmap & App-Store-Pfad: `MASTERPLAN.md` — zuerst lesen.

## Runde 10 (21.07.2026) — Neuausrichtung nach Messung. ZUERST LESEN.

Eine Analyse hatte belegt, dass mehrere Kernsysteme nicht funktionierten. Die
Zahlen und die Gegenmaßnahmen stehen hier, weil sie fast jede Datei berühren.

**Befund und Behebung:**

| Befund (gemessen) | Behebung |
|---|---|
| 95 Kreaturen = nur 21 Designs; `fire_drache` und `nature_drache` unterschieden sich um 9 LP bei gleichen Fähigkeiten | **Element-Keywords** (`ELEMENT_KEYWORD_PARAMS` in items.js, `keyword` je Element in types.json): Feuer brennt, Natur vergiftet, Wasser friert ein, Dampf lädt Energie, Asche hat Dornen, Frost startet mit Schild |
| Hybride waren `neutral: true`; 2 von 3 Fusionen löschten damit das Element-System | **Zweites Konter-Rad** Dampf>Asche>Frost>Dampf. Basis und Hybrid sind zueinander neutral, jedes Rad bleibt für sich lernbar |
| 3 von 7 Archetypen hatten `effect: 'none'` als Passiv; Geist-Teams gewannen 0 von 12 Spielen | **Drei neue Passiv-Effekte** in battle.js: `everyNthAttackDouble` (Greif), `teamAura` (Geist), `selfRevive` (Phönix) |
| Kämpfe dauerten im Median 15 s Kampfzeit (7 s echte Zeit) — zu kurz für Heilung und Schilde | **`HP_SCALE = 1.7`** in battle.js. Bewusst LP hoch statt Schaden runter: Verteidigung und Steinhaut sind FLACHE Abzüge, eine Schadensbremse macht sie relativ stärker und lässt Tanks alles dominieren (gemessen) |
| Fusion war bei 8 von 12 Rezepten ein Rückschritt: 700 XP Einsatz, Ergebnis auf Level 1 | **`FUSION_MIN_LEVEL = 3`**, Ergebnis erbt das niedrigere Zutat-Level (`fusionLevelFor`). Vorschau zeigt den Werte-Gewinn (`fusionGainHTML`) |
| Neue Unlocks kamen auf Level 1 in ein Level-4-Team | **`unlockLevel()`** in state.js: Belohnungen starten knapp unter dem Team-Schnitt |
| Items waren Rauschen; ein 120-Gold-Common schlug zwei Epics | Werte nach gemessener Wirkung neu gesetzt; Seltenheit und Wirkung decken sich jetzt (common ≈ 2, rare ≈ 3, epic ≈ 5,5 Prozentpunkte Rest-LP) |
| Kein Onboarding | **`TIPS` + `showTipOnce`**: sechs Hinweise, je einmal, am richtigen Ort |
| Kein Grund, ein Team vorher zu durchdenken | **Kampf-Vorschau** (`previewBattle`/`previewHTML`) — die deterministische Engine rechnet den Ausgang vorher durch. Rechnet mit AUTO-Ults, gutes Timing schlägt die Vorschau |
| Sammlung mit 95 Karten unbenutzbar | **Filterleiste** (`collFilter`, `collFilterHTML`): Element, Rolle, Sortierung |

**Neue Projektregel (Pfeiler 5): Balancing wird nie geschätzt.** Es gibt jetzt
`tools/` mit `sim.mjs`, `campaign.mjs`, `tune.mjs` — sie laufen gegen die
generierte `engine.js`, also exakt die Engine von Browser und Server. **Vor jedem
Lauf `powershell -File tools/regen.ps1`**, sonst misst man alten Code.

`tools/tune.mjs --write` sucht je Stage die Gegner-Stärke (Level-Offset, Items,
Werte-Bonus `mod`), die die Zielkurve trifft, und schreibt `js/stages.js`.
Zielkurve = Rest-LP nach dem Sieg: S1–3 ≈ 72 %, S4–7 ≈ 58 %, S8–12 ≈ 48 %,
S13–16 ≈ 40 %, S17–19 ≈ 33 %, Bosse ≈ 25 %. **Wer Kreaturen- oder Item-Werte
ändert, muss den Tuner danach neu laufen lassen** — sonst driftet die Kampagne.

## Navigation (seit 17.07.2026: Hub-and-Spoke, kein Bottom-Nav)

- App startet mit **Splash** (nur rotierendes Ring-Logo, fliegt per FLIP auf die
  Emblem-Position im Menü — `showSplash` in main.js), dann **Hauptmenü**
  (`renderMenu`): Lager-Szene mit den 3 Team-Kreaturen am Pixel-Lagerfeuer
  (`campfireArt`, 2 Flacker-Frames), 2×2-Kachel-Raster: Kampagne / Sammlung /
  **Battlepass** (Fusion-Kachel entfiel 19.07. — Fusion ist Tab in der Sammlung;
  **Optionen-Kachel entfiel 21.07.**). Kampagne-Kachel ist `.wide` (volle Breite).
- **Keine Kopfleiste mehr** (21.07.): `#topbar` ist transparent, ohne Rahmen/Schatten,
  das ELEMENTRA-Band (`.logo`) ist ausgeblendet. Übrig bleiben Zurück-Pfeil links und
  **Zahnrad rechts — auch im Hauptmenü** (`body.in-menu #topbar { display:flex }`,
  Zurück dort `visibility:hidden`). Im Kampf bleibt die Topbar komplett aus.
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
- **Hauptmenü-Kacheln liegen an den Bildschirmrändern** (21.07. Runde 9,
  `.menu-side.left/.right` in style.css): je zwei Kacheln links und rechts unten,
  Mitte bleibt für Lagerfeuer + Team frei — vorher deckte das 2×2-Raster die
  Szene auf dem Handy komplett zu. `MENU_CAMP_POS` wurde entsprechend nach oben
  gerückt (Bottom 27/27/36 %). Im Menü ist `#topbar` **fixed** (schwebt über dem
  Bild), sonst blieb oben ein leerer Streifen stehen, wo früher die Leiste saß.
- **Welt-Übersicht = Globen-Rail** (21.07.): ein Planet je Kapitel
  (`globeArt(theme)` in pixel.js — 48×48-Kugel aus den Theme-Farben, Licht von
  oben links, Kontinent-Blobs), **horizontal scrollbar mit Snap** (`.globe-rail`),
  scrollt automatisch aufs aktuelle Kapitel. Die alte vertikale Kartenliste
  (`.world-card`) ist raus. **Runde 9:** Eine Globus-Karte ist genau so breit wie
  der Bildschirm (mittig zentriert), **ohne Kästchen** (kein Rahmen/Hintergrund/
  Schatten); der Hintergrund ist wieder der gekachelte **Sternenhimmel**
  (`setStarWallpaper`, `#bg-layer.stars`) statt eines Landschafts-Wallpapers.
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
  (`floatHint`). **IMMER zwei Taps** (Korrektur 21.07.): der erste Tap markiert
  nur (`sel` = `{kind:'slot'|'card'}`), der zweite führt aus — Slot→Slot tauscht
  Positionen, Karte→Slot setzt ein, Karte→Karte tauscht bzw. ersetzt. Reihenfolge
  egal. **Nichts darf bei einem einzelnen Tap auf den letzten Platz rutschen** —
  genau das war der Fehler der ersten Fassung. Long-Press auf einen Slot nimmt
  die Kreatur aus dem Team.
- **Kein Zurück im Kampf** — raus nur über das Sieg/Niederlage-Overlay.
- **Kampf immer über `leaveBattle(screen)` verlassen** (21.07.): `endBattleUI()`
  räumt nur den Zustand ab und lässt die tote Arena im `#screen` stehen — ohne
  folgendes `showScreen` sitzt man fest (war der Bug im Dummy-Kampf). Im
  Dev-Kampf heißt „Aufgeben" außerdem „Simulation beenden" und führt direkt
  ins Menü, ohne Ergebnis-Overlay.
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
  (profiles → data → items → state → svg → pixel → sfx → music → stages → ascension → battle → bp → ui → main).
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
- **Bildschirmgrößen (21.07.):** Handy = NUR Hochformat — im Querformat unter
  601 px Höhe legt sich `#rotate-hint` über alles („bitte hochkant halten").
  Tablet/Desktop dürfen quer (ab 601 px Höhe): Menü wird 4-spaltig, `#screen`
  nutzt die **volle Breite** (`max-width: none` — die frühere 720/780-px-Deckelung
  erzeugte auf dem iPad schwarze Streifen links/rechts, 21.07.), Overlays bis 94 dvh. Grundschrift ist nicht mehr fest
  21 px, sondern `clamp(17px, 4.4vmin, 25px)` — skaliert an der KLEINEREN
  Bildschirmachse. Arena-Einheiten sind auf `min(27vw, 30vh, 150px)` gedeckelt,
  damit sie im Querformat nicht aus dem Bild wachsen. `manifest.webmanifest`
  steht deshalb auf `orientation: any`.
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
| `js/items.js` | **Items** (21.07.): `ITEMS_DATA`/`Items` (12 Stück), `ITEM_KEYWORDS` (7 Mechaniken), `applyItemStats`, Inventar (`grantItem/equipItem/unequipItem/itemsFree/itemOf`), Tages-Shop (`shopState/buyItem`), Drops (`rollStageDrop`). Lädt VOR state.js |
| `js/state.js` | Lookups (`Elements`, `Creatures`, `Abilities`), Kurzbeschreibungen `abilityShort` (GENERIERT aus effect/params — nicht handpflegen), Save (localStorage, Schlüssel kommt aus `currentSaveKey()`, Migration entfernt unbekannte IDs gegen 100 Gold), Level-Logik (`MAX_LEVEL` 5, +10 %/Level, Kosten 30·Level), Fusion (`fusionResult/fusionReady/fuseCreatures`), Stage-Fortschritt |
| `js/svg.js` | KOMPLETT obsolet — nur die Farbtabelle `SceneThemes` wird noch von `sceneArt` (pixel.js) gelesen. Keine SVG-Funktion mehr aufrufen |
| `js/pixel.js` | **Standard-Kreaturen-Renderer**: `creatureArt(c, {noAura,noAnim})` — `PixelArchetypes` (7 Basis + 12 Fusion Char-Maps) × `PixelPalettes`, 32×32-Canvas → dataURI, Cache. **Idle-Frames (19.07.)**: `creatureFrames(arch,el)` erzeugt prozedural Frame 1 (Augen zu via e/p→m + 1px Atem-Stauchung); globaler `setInterval` (540 ms) swappt `img.creature-sprite`-`src`. `noAnim` schaltet es ab. Tippfehler-Pixel erscheinen magenta |
| `js/sfx.js` | WebAudio-Synth (`Sfx.hit/ulti/win/...`), kein Audio-Asset, entsperrt bei erster Interaktion. **Rausch-Kanal seit 20.07.** (`Sfx.noise(dur, {type,freq,freqTo,q,vol,attack,delay})`: gefiltertes Rauschen, grobkörniger Buffer) — das Gegenstück zum Noise-Kanal echter 8-Bit-Chips. Ult-Sounds sind nach dem Muster **Ton-Kern + Rausch-Schicht + Transiente** gebaut; neue Sounds bitte genauso, sonst klingen sie wieder austauschbar |
| `js/music.js` | Generative Musik (WebAudio, Lookahead-Scheduler): Themes `map`/`battle`, `Music.play(theme)`, Toggle in ⚙. Hooks: Titel-Tap, `beginBattle`, `endBattleUI` |
| `js/stages.js` | 10 Kampagnen-Stages: Gegner, Gold, First-Clear-Bonus, Kreaturen-Unlocks, `theme` (Arena-Hintergrund) |
| `js/ascension.js` | **Aufstieg + Wochen-Modifikatoren** (21.07.): `MUTATORS` (8 Stück, generisch von battle.js gelesen), `weeklyMutators()` (deterministisch aus dem Montags-Datum), `ascensionUnlocked/maxAscension/setAscension`, `ascEnemyDefs`, `ascGoldMult`, `ascFirstClear/markAscClear`. Lädt VOR battle.js |
| `js/battle.js` | Engine: `createBattle(allyDefs, enemyDefs, modIds)`, `updateBattle(battle, dtMs)`, `castActive`. Events via `battle.on((type, data) => …)`: attack, damage, heal, absorb, shieldGain, poison, ulti, die, revive, energyFull, end |
| `js/bp.js` | **Battlepass** (19.07.): Season (~30 Tage, `currentSeason()` in state.js), Stufen (`bpCompleted`, `BP_TIER_XP`), Belohnungs-Bahn (`bpReward` free/prem, `bpClaim`), Aufgaben (`bpEnsureQuests`/`bpTrack`), Kampf-Hook `bpOnBattle(won)`, Screen `renderBattlepass`. Premium = Demo-Schalter (`bpUnlockPremium`), echtes IAP erst Phase 4 |
| `js/net.js` | **Supabase-Anbindung ohne Build-Schritt** (21.07.): reines `fetch` gegen Auth/REST/RPC — KEIN npm-Paket (Projektregel „kein Framework"). `NET_CONFIG` (URL + Publishable Key, beide öffentlich), anonyme Anmeldung + Token-Refresh, `Net.rpc/ensurePlayer/uploadSnapshot/findOpponent/submitMatch/leaderboard`, Snapshot-Helfer `pvpTeamUnits/pvpTeamPower/pvpUnitsToDefs`. **Offline zuerst:** jeder Aufruf darf scheitern, nichts wird automatisch hochgeladen |
| `js/ui.js` | Screens (menu/map=welt+kapitel/collection+fusion/pvp), Kampf-UI (rAF-Loop), Overlays, Hauptmenü (`renderMenu`), Team-Warnung (`teamWeakness`), Aufgeben (`giveUpBattle`), Developer-Board (`openDevBoard`), `debugBattleStep(ms)` |
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
- Einstellungen: **Lautstärke in 4 einrastbaren Stufen** (21.07., `VOL_STEPS`
  = [0, 0.34, 0.67, 1], `volStepsHTML`) statt Schieberegler — am Handy zielsicherer.
  Werte weiter in `Save.settings.sfxVol`/`musicVol`, Musik über `Music.setVolume`
  (persistiert selbst). Logo fest 'ring'.
- **Hauptmenü-Lagerfeuer sitzt auf dem Boden** (21.07.): `MENU_CAMP_POS` positioniert
  über `bottom` statt `top`, damit Feuer und Team auf DERSELBEN Bodenlinie stehen;
  `.menu-creature` hat `animation: none` (kein Schweben mehr) und einen
  Boden-Schatten via `::after`.
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
  (fire+water=steam, fire+nature=ash, nature+water=frost). **Hybride kämpfen seit
  Runde 10 NICHT mehr neutral** — sie haben ein eigenes Konter-Rad
  (Dampf>Asche>Frost>Dampf); gegen Basis-Elemente bleiben sie neutral.
- Ergebnis-IDs `fx_<archetyp>_<element>` werden zur Laufzeit in state.js generiert
  (12×6=72 Einträge in `Creatures`, NICHT in creatures.json); Name =
  `namePrefixes[element]`-Archetypname (z. B. „Aschen-Koloss").
- Sprites: eigene Char-Maps je Fusions-Archetyp in `PixelArchetypes` (pixel.js),
  Paletten wie gehabt je Element. Angriffs-Animationen erben per CSS vom passenden
  Eltern-Archetyp (Block „Fusions-Archetypen erben…" in style.css).
- Fusions-Kreaturen sind Endstufe: nicht erneut fusionierbar.
- **Ab Level 3 fusionierbar (Runde 10), Ergebnis erbt das niedrigere Zutat-Level.**
  Vorher: zwei Max-Level-Kreaturen, Ergebnis auf Level 1 — bei 8 von 12 Rezepten
  verlor die frische Fusion gegen eine der Zutaten, die man dafür gelöscht hat.
- Fusion-Screen ist ein freier 2-Slot-Picker mit Ergebnis-Vorschau (`renderFusion`).
- **Picker zeigt nur, was wirklich geht** (21.07.): ausschließlich Basis-Kreaturen
  auf Max-Level; ist bereits eine gewählt, bleiben nur Partner übrig, für die
  `fusionResult` ein Rezept liefert. Keine ausgegrauten Karten mehr. Leerer Fall
  bekommt eine Erklärzeile (kein Max-Level / kein passender Partner).

## Items (Runde 6, 21.07.2026) — `js/items.js`

**Design-Pfeiler 2 in Code gegossen: Thema kommt über KEYWORDS, nicht über neue
Elemente.** „Seeschlange mit Toxin" = Wasser + Keyword `poison`, KEIN Giftelement.
Das Element-Rad ist eingefroren (siehe MASTERPLAN „Design-Pfeiler").

- **EIN Slot je Kreatur**: `Save.equipped[creatureId] = itemId`, Inventar
  `Save.items[itemId] = Anzahl`. `itemsFree(id)` = Besitz minus getragen — ein Item
  kann nur einmal gleichzeitig getragen werden.
- **12 Items, 3 Seltenheiten.** `stats` sind PROZENT-Aufschläge auf die Level-Stats
  (`hp/atk/def`), `spd` ist FLACH (Tempo skaliert nicht mit Level).
- **7 Keywords** (`ITEM_KEYWORDS`), alle in `battle.js` verdrahtet:
  `poison` (Stapel wie Wyrm-Passiv), `burn` (DoT), `chill` (Ziel schlägt langsamer —
  `attackInterval(u, now)` rechnet `chillUntil/chillPct` ein), `lifesteal`, `thorns`
  (Reflex bei `kind==='hit'`, Rückschlag läuft mit `kind='thorns'` = kein Loop),
  `energy` (+Energie pro Angriff), `shieldStart` (Schild bei Kampfbeginn, in
  `createBattle` gesetzt).
- **Engine-Anbindung:** `createUnit(cid, level, side, slot, itemId)` zieht die Werte
  über `applyItemStats` rein und legt `u.item` ab; `createBattle` reicht `d.item`
  durch. `beginBattle` baut `allyDefs` mit `item: Save.equipped[id]`. Gegner können
  ebenfalls Items bekommen (Feld `item` in den Stage-Gegnern) — noch ungenutzt.
- **Quellen:** Kampagnen-Drops (`rollStageDrop`: Erstsieg garantiert, Seltenheit
  steigt mit Stage; Wiederholung 20 %), Tages-Shop (`shopState`, 3 Angebote,
  rotiert per Datum-Hash, `buyItem`), Battlepass (`bpReward` kind `'item'`).
  **Dev-Sim droppt nie** (`stage.dev`).
- **UI:** dritter Tab in der Sammlung (`collMode === 'items'`, `renderItemsBody`) =
  Inventar + Shop; Slot im Kreatur-Detail (`itemSlotHTML`) öffnet `openItemPicker`.
- **Aufräumen:** `fuseCreatures` löscht die Ausrüstung der verbrauchten Zutaten;
  `loadSave` entfernt Ausrüstung an unbekannten Kreaturen/Items. Deshalb wird
  `items.js` VOR `state.js` geladen (Migration braucht `Items`).

## Aufstieg + Wochen-Modifikatoren (Runde 7, 21.07.2026) — `js/ascension.js`

Langzeit-Hebel 2: die Map ist endlich, die Herausforderung nicht.

- **Aufstieg (Ascension)** ist eine Schwierigkeitsstufe für die GANZE Kampagne,
  kein eigener Modus. `Save.ascension` (gewählt), `Save.ascHigh` (höchste Stufe mit
  Endboss-Kill), `Save.ascStages[stageId]` (höchste dort geschaffte Stufe).
  Öffnet sich erst, wenn der Endboss des letzten Kapitels einmal fiel
  (`ascensionUnlocked`); wählbar bis `maxAscension()` = `ascHigh + 1`.
- **Skalierung:** `ascEnemyDefs(stage)` gibt Gegner mit `level + asc` (Cap MAX_LEVEL)
  und `mod: {hp: 0.15·asc, atk: 0.12·asc}` zurück — `createUnit` wendet `mod` über
  `applyStatMod` an.
- **Belohnung:** Erstsieg AUF EINER STUFE (`ascFirstClear`) zählt wieder wie ein
  Erstsieg: volles Stage-Gold × `ascGoldMult()` (1 + 0,5·asc) **und** garantierter
  Item-Drop. `stageDropRarity` rechnet `asc·6` auf die Stage-Nummer — höhere Stufen
  droppen besser. `markAscClear` hebt `ascHigh`, wenn der Endboss auf neuer Stufe fällt.
- **Wochen-Modifikatoren:** `weeklyMutators()` wählt 2 aus `MUTATORS` deterministisch
  aus dem Montags-Datum (UTC) — alle Spieler sehen dieselben, ohne Server. Aktiv NUR
  ab Aufstieg 1 (`activeMutators`).
- **8 Modifikatoren**, von `battle.js` **generisch** ausgewertet (`createBattle`
  liest die MUTATORS-Felder) — ein neuer Modifikator braucht NUR einen Eintrag in
  `MUTATORS`, keinen neuen Engine-Code: `all/enemy {atk,def,hp}` (Prozent),
  `intervalMult` (Angriffstempo), `energyMult`, `suddenDeathAt`, `chipPctPerSec`
  (Schaden pro Sekunde auf alle), `lifestealAll`, `enemyThorns`.
- **UI:** Panel in der Welt-Übersicht (`ascensionPanelHTML`, −/+ Stufenwahl, Chips
  der Wochen-Modifikatoren); im Kampf Chips oben (`.battle-mods`).
- **Dev-Sim ist ausgenommen** — `beginBattle` nutzt bei `stage.dev` weder Skalierung
  noch Modifikatoren.

## Arena / Async-PVP (21.07.2026) — `js/net.js` + `supabase/migrations/0001_pvp.sql`

- **Kein Echtzeit-Netcode.** Man kämpft gegen den **Team-Schnappschuss** eines
  anderen Spielers, gesteuert von der normalen Gegner-KI (Super-Auto-Pets-Prinzip).
  `battle.js` bleibt unverändert.
- **`battle.js` ist deterministisch** — kein `Math.random`, kein `Date.now`. Deshalb
  kann der Server jeden Kampf exakt nachrechnen (Stufe 2: Edge Function setzt
  `matches.verified`). **Diese Eigenschaft bitte nie brechen** — sonst stirbt die
  serverseitige Verifikation und damit das Anti-Cheat.
- **Wertung ist nie client-schreibbar:** `ladder` hat keine Write-Policy, nur die
  `SECURITY DEFINER`-Funktion `submit_match` (Elo K=24, Rate-Limit 30/Stunde) ändert sie.
- Arena nutzt **keine** Aufstiegs-Skalierung (`beginBattle` schließt `stage.pvp` aus),
  sonst zöge die eigene Stufe das fremde Team mit hoch.
- Ergebnis läuft über `showPvpBattleResult` (eigener Zweig in `showBattleResult`,
  wie die Dev-Sim) — keine Stage-Belohnungen, stattdessen `submit_match`.
- **Voraussetzungen im Supabase-Projekt:** Migration eingespielt UND
  Auth → Providers → **Anonymous sign-ins aktiviert**. Beides ist seit 21.07.
  erledigt; fehlt eines, meldet die App es sauber und bleibt voll spielbar.
- **BEKANNTE FAIRNESS-LÜCKE (offen):** Der Verteidiger ist offline, sein Team wird
  von der Kampagnen-KI gespielt — die zündet Ults **sofort** bei voller Energie
  (`gainEnergy` setzt `ultiPlannedAt` für `side === 'enemy'`). Der Angreifer darf
  dagegen manuell timen. **Der Angreifer hat dadurch einen systematischen Vorteil,
  die Rangliste ist verzerrt.** Lösungswege stehen im MASTERPLAN unter
  „GEPLANT — PVP-Ausbau, B)". Vor öffentlichem Betrieb reparieren.

## Runde 9 (21.07.2026): Ökonomie, Endboss-Kreaturen, Arena-Team, Cloud-Save

### Ökonomie-Bremse (Nutzer: „keine Herausforderung, viel zu schnell")
- **Gold halbiert**: alle `gold`/`firstClearBonus` in `stages.js` auf 50 % gesenkt
  (S1 105 → 53 Gold beim Erstsieg, S10 350 → 200). **Wiederholungen geben ein
  Viertel** statt der Hälfte (`grantStageRewards`).
- **Item-Drops nur noch 2 je Kapitel**: garantierter Erstsieg-Drop ausschließlich
  auf Stages mit `drop: true` (S5/S10/S15/S20). Restchance bei Wiederholung von
  20 % auf **5 %** gesenkt (`rollStageDrop`). Vorher droppte jeder Erstsieg — 10
  Items je Kapitel.
- Kampf-XP blieb absichtlich unverändert (XP ist laut Design der Hauptweg; nur
  der Gold-Beschleuniger war zu üppig).

### Endboss-Kreaturen (`bossCreature` in stages.js)
- **`boss_titan` „Urtitan"** (S10) und **`boss_schlange` „Weltenschlange"** (S20).
  Einmalige Belohnung beim Boss-Sieg, zusätzlich zum normalen `unlockCreature`.
- **Eigene Archetypen** `titan`/`weltenschlange` in `PixelArchetypes` — sie stehen
  in KEINEM Fusions-Rezept (`fusions.json`), `fusionResult` liefert für sie immer
  `null`. Damit sind sie ausschließlich über den Endboss zu bekommen.
- Flag `unique: true`: zählt NICHT zum Sammelziel „Basis x/21" (`goalProgress`),
  sonst stünde dort 23/21.
- Werte per Sim gesetzt: Titan Lv1 ≈ Koloss Lv3 als Tank (230/23/22/9, Schild 28 %
  + Spott), Weltenschlange Lv3 ≈ Koloss Lv3 (185/29/16/14, Gift 6 Stapel,
  Flächen-DoT 11 %). Nicht ohne neue Sim verändern.

### Arena
- **Eigenes Team**: `Save.arenaTeam` (unabhängig von `Save.team`, **gleiche
  Sammlung**). `arenaTeamIds()` in net.js ist die einzige Quelle; `fuseCreatures`
  flickt beide Teams. Bearbeiten über `openArenaTeamSelect()` — derselbe Picker
  wie die Kampagne mit `stage.arenaEdit`, nur ohne Gegner-Band und ohne Kampfstart.
- **Rangliste ist Dauer-Inhalt**: lädt beim Öffnen des Screens automatisch
  (`pvpState.boardTried` verhindert eine Endlosschleife, wenn der Abruf scheitert).
  Der frühere „Rangliste"-Knopf ist weg.

### Cloud-Spielstand (`0003_cloud_save.sql`, `Net.cloudPush/cloudPull`)
- **Warum:** Profile lagen nur im localStorage des jeweiligen Browsers — vom
  iPhone sah man die PC-Profile nicht.
- Profil bekommt einen **8-Zeichen-Code + 4-stelligen PIN**. ⚙ → „Spielstand-Cloud":
  hochladen (`cloud_push`) bzw. auf dem anderen Gerät mit Code+PIN laden
  (`cloud_pull`). Verknüpfung steht in `Profiles.list[].cloud = { code, pin, at }`.
- **Bewusst manuell**, kein Auto-Sync: automatisches Hochladen könnte den neueren
  Stand des anderen Geräts überschreiben.
- **Laden legt immer ein NEUES lokales Profil an** (`importCloudProfile`) — so
  geht kein Stand auf dem Gerät verloren.
- Sicherheit: `cloud_saves` hat **keine RLS-Policy**, ist also für Clients dicht;
  Zugriff nur über die beiden `SECURITY DEFINER`-Funktionen, die Code+PIN prüfen.
  Kein Kontoschutz — wer Code UND PIN kennt, hat den Spielstand.

## Edge Function `verify-match` (Anti-Cheat, 21.07.2026)

- **Warum das geht:** `battle.js` ist deterministisch. Gleiche Aufstellungen +
  gleiche Ult-Zeitpunkte = gleicher Sieger. **Diese Eigenschaft nie brechen.**
- **Ult-Protokoll ist Pflicht:** Ults werden manuell gezündet, also reicht die
  Aufstellung NICHT. `B.inputs` sammelt in Arena-Kämpfen `{slot, t}` je Zündung,
  `submit_match` speichert es in `matches.inputs`, die Function spielt es beim
  passenden Tick ein. Gemessen: mit Protokoll 26848 ms (identisch zum Original),
  ohne Protokoll 23968 ms — **ohne Log wäre jede Prüfung falsch**.
- **`engine.js` ist GENERIERT** aus den Browser-Dateien, damit Client und Server
  nie auseinanderlaufen. Nach JEDER Änderung an profiles/data/items/state/
  ascension/battle neu erzeugen:
  ```powershell
  cd C:\005-Kellerwohnung\elementra
  $out = "// GENERIERT aus js/*.js - NICHT von Hand aendern.`n"
  $out += "const localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };`n"
  foreach ($f in @('profiles','data','items','state','ascension','battle')) {
    $out += "`n// ================= js/$f.js =================`n"
    $out += (Get-Content "js\$f.js" -Raw) + "`n"
  }
  $out += "`nexport { createBattle, updateBattle, castActive, Creatures, Items };`n"
  [IO.File]::WriteAllText("supabase\functions\verify-match\engine.js", $out, (New-Object Text.UTF8Encoding($false)))
  ```
  Der `localStorage`-Schim ist nötig, weil profiles.js/state.js beim Laden darauf
  zugreifen; `Save` bleibt serverseitig ein Default und wird von battle.js nicht genutzt.
- **Prüfung ohne Treffer ist kein Fehler:** `apply_verification` setzt `verified`;
  bei falscher Meldung dreht es `rating_delta` exakt zurück und setzt `cheated`.
- Aufruf: `POST {match_id}` (Client nach dem Kampf, bester Aufwand) oder `POST {}`
  für einen Cron-Lauf über bis zu 25 ungeprüfte Kämpfe.

## Countdown vor Rundenbeginn (21.07.2026)

`showBattleCountdown()` blendet mittig 3 · 2 · 1 · LOS! ein (620 ms je Schritt) und
friert den Kampf über `B.freezeUntil` ein — gilt für Kampagne UND Arena, wird in der
Dev-Sim übersprungen. Bei Boss-Stages gewinnt der längere der beiden Freezes.

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
- **Alle LP werden mit `HP_SCALE` (1,7) multipliziert** — streckt die Kampfdauer,
  ohne die Verhältnisse zu verzerren (Begründung in der Runde-10-Tabelle oben).
- **Jede Kreatur trägt das Keyword ihres Elements** (`u.kws` in `createUnit`);
  Item-Keywords kommen additiv dazu. Alle Keywords laufen durch dieselbe Schleife
  in `doAttack` — ein neues Keyword braucht keinen Sonderweg.
- Schaden: `ANG · Elementmult − VER · 0.4`, min. 1. Elementmult aus `types.json`
  (1.5 / 0.75 / 1.0; Hybride immer neutral). Golem-Passiv zieht flach 2 ab.
- Energie 0–100 laut `creatures.json`-Passiven (onAttack/onHit/perSecond); Ulti kostet 100.
  Spieler tippt Kreatur an (Karte pulsiert gold) oder Auto-Schalter; Gegner-KI zündet nach 400 ms.
- Status: Schild (absorbiert, verfällt), Spott, Gift-Stapel (5 %·ANG/s je Stapel),
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
