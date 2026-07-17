// pixel.js — Pixelart-Renderer im GBA-Stil (seit 15.07.2026 Standard, ersetzt creatureSVG).
// Prinzip wie svg.js: 7 Archetyp-Silhouetten × 6 Element-Paletten = alle 42 Kreaturen.
// Sprites als Char-Maps: Zeichen = Palettenschlüssel, '.' = transparent.
// symmetric: nur linke Hälfte (16 Zeichen/Zeile), rechte wird gespiegelt;
// sonst volle 32 Zeichen/Zeile. Render: 32×32-Canvas → dataURI → <img> mit
// image-rendering: pixelated. Keine Bild-Assets, läuft per file://.
// Tippfehler-Pixel erscheinen magenta, falsche Zeilenlängen als console.warn.

const PIXEL_SIZE = 32;

// Dunkel-epische Farbrampen je Element (Basisfarben aus data/types.json).
// '#' Outline · d dunkel · m mittel · l hell · h Glanzlicht · g Glut/Glow · e Auge · p Pupille
const PixelPalettes = {
  fire:   { '#': '#2b0d08', d: '#8f2011', m: '#d84a24', l: '#f58a3c', h: '#ffcf5e', g: '#fff3b0', e: '#fff6e8', p: '#2b0d08' },
  nature: { '#': '#0f2410', d: '#2c5e2e', m: '#499a44', l: '#86c95d', h: '#cdeb8a', g: '#eaffc9', e: '#f4ffe8', p: '#0f2410' },
  water:  { '#': '#0a1c33', d: '#1d4f8f', m: '#2f7fd4', l: '#6cbdf2', h: '#c8ecff', g: '#f0fbff', e: '#f4fbff', p: '#0a1c33' },
  steam:  { '#': '#232a30', d: '#5c6b74', m: '#8fa1ab', l: '#c4d3da', h: '#eef6f9', g: '#ffffff', e: '#ffffff', p: '#232a30' },
  ash:    { '#': '#1f1512', d: '#4e3a32', m: '#7a5c50', l: '#a58877', h: '#d4b8a4', g: '#ff9a3d', e: '#fff4ea', p: '#1f1512' },
  frost:  { '#': '#0e2233', d: '#2b6b8f', m: '#5ba8cc', l: '#9adcf2', h: '#d6f4fd', g: '#ffffff', e: '#f4fcff', p: '#0e2233' },
};

// top = Zeilen-Offset von oben (vertikale Zentrierung im 32er-Raster).
const PixelArchetypes = {
  // Aufrechter Drache: Hörner, Glutaugen, Bauchpanzer, Flügelzacken seitlich.
  drache: { symmetric: true, top: 4, rows: [
    '.........#......',
    '.........#l.....',
    '.........#l#####',
    '........#llhllll',
    '........#lmmgmmm',
    '.......#lmmmmmmm',
    '.......#mmmmmm#m',
    '........#mmmmmmm',
    '.....##.#mmmmmmm',
    '....#ll##mmmmmmm',
    '...#lldd#mllllll',
    '...#lldd#mllllll',
    '....#dd#dmllllll',
    '.....##ddmllllll',
    '.......#dmmllllm',
    '.......#dmmmllmm',
    '.......#ddmmmmmm',
    '........#ddmmmmm',
    '........#ddddddd',
    '.........#dd#ddd',
    '.........#dd#ddd',
    '.........#######',
  ] },
  // Greif: Ohrbüschel, heller Hakenschnabel, gefaltete Schwingen, Brustgefieder, Krallen.
  greif: { symmetric: true, top: 5, rows: [
    '........##......',
    '........#l#.....',
    '........#ll#####',
    '.......#llllllll',
    '.......#lmeplmmm',
    '.......#mmmmm#hh',
    '........#mmmm#hg',
    '........#mmmmm#h',
    '.....###mmmmmmmm',
    '....#ll#mmmmmmmm',
    '...#lld#mmmmhmmm',
    '...#lld#mmmhmhmm',
    '...#lldd#mmmmmmm',
    '....#ddd#mmmmmmm',
    '.....#dd#dmmmmmm',
    '......##ddmmmmmm',
    '.......#dddmmmmm',
    '........#ddddddd',
    '.........#dd#ddd',
    '.........#hh#hhh',
    '.........#######',
  ] },
  // Monolith-Golem: Moos-/Kristallkappe, Runen-Visier mit Glüh-Augen, Stummelfüße.
  golem: { symmetric: true, top: 4, rows: [
    '.........#######',
    '........#hhhllll',
    '......##llllllll',
    '.....#llmmmmmmmm',
    '....#lmmmmmmmmmm',
    '...#lmmmmmmmmmmm',
    '...#mmmmmm######',
    '...#mmmmmm#gg###',
    '...#mmmmmm#gg###',
    '...#mmmmmm######',
    '...#mmmmmm####gg',
    '...#mmmmmmmmmmmm',
    '...#mmmmmmmmmmmm',
    '...#dmmmm#mmmmmm',
    '...#ddmmmmmmmmmm',
    '....#ddddmmmmmmm',
    '....#ddddddddddd',
    '.....#dddddddddd',
    '......##dddddddd',
    '........########',
    '......#dd#......',
    '......#dd#......',
    '......####......',
  ] },
  // Geist: Seelenflamme auf dem Kopf, große Augen, ausgefranster Schweif.
  geist: { symmetric: true, top: 3, rows: [
    '...............#',
    '..............#l',
    '..............#h',
    '...............#',
    '..........######',
    '........##hhllll',
    '.......#hhllllll',
    '......#lllmmmmmm',
    '.....#llmmmmmmmm',
    '.....#lmmmmmmmmm',
    '....#lmmmeeemmmm',
    '....#lmmmeepmmmm',
    '....#mmmmeeemmmm',
    '....#mmmmmmmmmmm',
    '....#mmmmmmmmmm#',
    '....#dmmmmmmmmmm',
    '....#ddmmmmmmmmm',
    '.....#ddddmmmmmm',
    '.....#dddddddddd',
    '......#ddddddddd',
    '.......#dddddddd',
    '........##dddddd',
    '..........##dddd',
    '............##dd',
    '..............##',
  ] },
  // Wolf: Seitenansicht nach rechts, Ohren, Schnauze, buschige Rute, vier Läufe.
  wolf: { symmetric: false, top: 9, rows: [
    '......................##..##....',
    '.....................########...',
    '.#l..................#llllll#...',
    '.#ll................#lllleplm#..',
    '..#ll...............#llllmmmm##.',
    '..#lld.......########mmmmmmm#...',
    '...#ld......#llllllllmmmmmm#....',
    '...#ld.....#lmmmmmmmmmmmmm#.....',
    '....##....#mmmmmmmmmmmmmmm#.....',
    '..........#mmmmmmmmmmmmmm#......',
    '.........#dmmmmmmmmmmmmmm#......',
    '.........#dd#ddmmmm#ddmmm#......',
    '.........#d#..#dd#..#dd#........',
    '.........###..####..####........',
  ] },
  // Wyrm: Schlange in Seitenansicht, erhobener Kopf rechts, Glutauge, S-Körper.
  wyrm: { symmetric: false, top: 9, rows: [
    '.......................######...',
    '......................#llllgl#..',
    '......................#lllll##h.',
    '......................#lll#.....',
    '.....................#lll#......',
    '....................#lll#.......',
    '..........#########lll#.........',
    '.#ll.....#lllllllllllll#........',
    '..#ll...#mmmmmmmmmmmmm#.........',
    '...#lll#mmmmmmmmmmmm#...........',
    '....#ddmmmmmmmmmmmd#............',
    '.....#ddddddddddd#..............',
    '......###########...............',
  ] },
  // Phönix: Flammenkamm, gespreizte Schwingen, Flammenschweif, schwebend.
  phoenix: { symmetric: true, top: 3, rows: [
    '...............g',
    '..............gh',
    '..............hl',
    '............####',
    '.###.......#llll',
    '#lll##.....#lmmm',
    '#llmmm##...#mepm',
    '#lmmmmmm##.#mmmh',
    '.#mmmmmmmm##mmmh',
    '.#dmmmmmmmm#mmmm',
    '..#ddddmmm#mmmmm',
    '...#dd#dd#mmmmmm',
    '....#..#.#mmmmmm',
    '.........#mmmmmm',
    '.........#dmmmmm',
    '........#ddmmmmm',
    '........#dddmmmm',
    '.........#ddddmm',
    '..........#ddddd',
    '...........##ddd',
    '............#hhd',
    '.............#hh',
    '..........g..#hh',
    '.............#gh',
    '..............#g',
    '...............g',
  ] },

  // ===== Fusions-Archetypen (17.07.2026): 12 kuratierte Paar-Fusionen =====
  // Koloss (Drache+Golem): gehörnter Panzerriese mit Glut-Kern in der Brust.
  koloss: { symmetric: true, top: 4, rows: [
    '....##..........',
    '....#l#.........',
    '.....#l#........',
    '......#l##......',
    '.......#ll######',
    '.......#lhhlllll',
    '......##mmggmmmm',
    '......#mmmmmmmmm',
    '....#lllllllllll',
    '...#lmmmmmmmmmmm',
    '...#mmmmm##mmmmm',
    '..#mmmmm#gg#mmmm',
    '..#mmmmm#gg#mmmm',
    '..#mmmmmm##mmmmm',
    '..#dmmmmmmmmmmmm',
    '..#ddmmmmmmmmmmm',
    '...#ddmmmmmmmmmm',
    '...#dddddddddddd',
    '....#ddddddddddd',
    '.....###########',
    '.....#dd#.......',
    '.....#dd#.......',
    '.....####.......',
  ] },
  // Wyvern (Drache+Greif): schlanker Flugdrache mit weit gespannten Schwingen.
  wyvern: { symmetric: true, top: 5, rows: [
    '.........##.....',
    '........#ll#....',
    '........#lle####',
    '.......#llllllll',
    '##.....#mmmm#mmm',
    '#l#...#mmmmmmmmm',
    '#ll##.#mmmmmmmmm',
    '#lll###mmmmmmmmm',
    '.#llll#mmmmmmmmm',
    '.#lllll#mmmmhmmm',
    '..#llll#mmmhmhmm',
    '...#lll#mmmmmmmm',
    '....#ll#dmmmmmmm',
    '.....###ddmmmmmm',
    '.......#dddmmmmm',
    '........#ddddddd',
    '.........#dd#ddd',
    '.........#dd#ddd',
    '.........#######',
  ] },
  // Leviathan (Drache+Wyrm): gehörnte Riesenschlange mit Rückenflosse.
  leviathan: { symmetric: false, top: 9, rows: [
    '......................##.###....',
    '.....................#llllll#...',
    '.....................#lleplll#..',
    '.....................#lllll##h..',
    '......................#lll#.....',
    '.....................#llll#.....',
    '............####....#llll#......',
    '.#ll.......#llll###llllll#......',
    '..#lll....#mmmmmmmmmmmmm#.......',
    '...#lll..#mmmmmmmmmmmmm#........',
    '....#lll#mmmmmmmmmmmm#..........',
    '.....#ddmmmmmmmmmmmd#...........',
    '......#ddddddddddd#.............',
    '.......###########..............',
  ] },
  // Seraph (Drache+Phönix): aufrechter Drache mit strahlenden Lichtschwingen.
  seraph: { symmetric: true, top: 4, rows: [
    '.........#......',
    '.........#l.....',
    '.........#l#####',
    '........#llhllll',
    '........#lmmgmmm',
    '##.....#lmmmmmmm',
    '#h#....#mmmmmm#m',
    '#hl#...#mmmmmmmm',
    '#hll##.#mmmmmmmm',
    '.#hlll##mmmmmmmm',
    '.#hllll#mlllllll',
    '..#hlll#mlllllll',
    '...#hll#mllllllm',
    '....###dmmllllmm',
    '.......#dmmmmmmm',
    '.......#ddmmmmmm',
    '........#ddmmmmm',
    '........#ddddddd',
    '.........#dd#ddd',
    '.........#gg#ggg',
    '.........#######',
  ] },
  // Behemoth (Golem+Wolf): vierbeinige Urgewalt mit Panzerplatten auf dem Rücken.
  behemoth: { symmetric: false, top: 8, rows: [
    '.....................##.##......',
    '....................#######.....',
    '.#d.................#llllll#....',
    '.#dd...............#lleplmm#....',
    '..#dd..............#llllmmmm##..',
    '..#dd......#########mmmmmmmm#...',
    '...#d#....#hh#hh#hh#mmmmmmm#....',
    '...#d#...#lmmmmmmmmmmmmmmm#.....',
    '....##..#mmmmmmmmmmmmmmmmm#.....',
    '........#mmmmmmmmmmmmmmmm#......',
    '.......#dmmmmmmmmmmmmmmmm#......',
    '.......#ddmmmmmmmmmmmmmmm#......',
    '.......#dd##ddmmmm##ddmmm#......',
    '.......#dd#..#dd#..#dd#.........',
    '.......###...####..####.........',
  ] },
  // Gargoyle (Golem+Geist): beseelter Stein mit Schwingen, verweht nach unten.
  gargoyle: { symmetric: true, top: 5, rows: [
    '..........######',
    '.........#llllll',
    '.........#lggmmm',
    '.........#mmmmmm',
    '..##.....#mmmmmm',
    '..#l##..##mmmmmm',
    '..#lll##lmmmmmmm',
    '..#llllmmmmmmmmm',
    '...#llmmmmmmmmmm',
    '...#lmmmm#mmmmmm',
    '....#mmmm#mmmmmm',
    '....#dmmmm#mmmmm',
    '.....#dmmmmmmmmm',
    '.....#ddmmmmmmmm',
    '......#ddddmmmmm',
    '......#ddddddddd',
    '.......##ddddddd',
    '.........##ddddd',
    '...........##ddd',
    '.............##d',
  ] },
  // Basilisk (Golem+Wyrm): gepanzerte Schlange mit Zackenkrone.
  basilisk: { symmetric: false, top: 8, rows: [
    '......................#.#.#.....',
    '......................#####.....',
    '.....................#llllll#...',
    '.....................#leplll#...',
    '.....................#lllll#....',
    '......................#lll#.....',
    '.....................#lll#......',
    '..........##########lll#........',
    '.#ll.....#hh#hh#hh#llll#........',
    '..#ll...#mmmmmmmmmmmmm#.........',
    '...#lll#mmmmmmmmmmmm#...........',
    '....#ddmmmmmmmmmmmd#............',
    '.....#ddddddddddd#..............',
    '......###########...............',
  ] },
  // Chimära (Greif+Wolf): Wolfskörper mit Schwinge und hellem Schnabelhieb.
  chimaera: { symmetric: false, top: 9, rows: [
    '.....................##..##.....',
    '....................########....',
    '.#l..................#llllll#...',
    '.#ll................#lleplmm#...',
    '..#ll...............#llmmmm##h..',
    '..#lld.....########.#mmmmmm#h...',
    '...#ld....#llllllll##mmmmmm#....',
    '...#ld...#ll##########mmmm#.....',
    '....##..#lmmmmmmmmmmmmmmm#......',
    '........#mmmmmmmmmmmmmmmm#......',
    '.......#dmmmmmmmmmmmmmmmm#......',
    '.......#dd##ddmmmm##ddmmm#......',
    '.......#d#..#dd#..#dd#..........',
    '.......###..####..####..........',
  ] },
  // Sphinx (Greif+Geist): sitzender Wächter mit Kopfschmuck und Schwingen.
  sphinx: { symmetric: true, top: 5, rows: [
    '..........######',
    '.........#llllll',
    '.........#lhhlhh',
    '.........#meemme',
    '.........#mmmmmm',
    '..##.....##mmmmm',
    '..#l##...#mmmmmm',
    '..#lll#.#mmmmmmm',
    '...#lll##mmmmmmm',
    '...#llll#mmmmmmm',
    '....#lll#mmmmmmm',
    '.....#ll#mmmmmmm',
    '.....#ll#dmmmmmm',
    '......###ddmmmmm',
    '.......#dddmmmmm',
    '.......#dddddddd',
    '.......#dd#ddddd',
    '.......#dd#ddddd',
    '.......#########',
  ] },
  // Barghest (Wolf+Geist): Geisterwolf mit Seelenflamme, Läufe lösen sich auf.
  barghest: { symmetric: false, top: 7, rows: [
    '.......................gg.......',
    '.......................hg.......',
    '......................##..##....',
    '.....................########...',
    '.....................#llllll#...',
    '....................#lllleplm#..',
    '....................#llllmmmm##.',
    '..#l.........########mmmmmmm#...',
    '..#ll.......#llllllllmmmmmm#....',
    '...#l#.....#lmmmmmmmmmmmmm#.....',
    '....##....#mmmmmmmmmmmmmmm#.....',
    '..........#mmmmmmmmmmmmmm#......',
    '....#d...#dmmmmmmmmmmmmmm#......',
    '.....#..#dd#ddmmmm#ddmmm#.......',
    '.........#d#..#dd#..#dd#........',
    '..........#....##....##.........',
  ] },
  // Ouroboros (Wyrm+Phönix): Schlangenring, der sich selbst verzehrt, Flammenkrone.
  ouroboros: { symmetric: true, top: 5, rows: [
    '..............gh',
    '.............ghh',
    '.........#######',
    '........#lllllll',
    '.......#llepllll',
    '......#ll###llll',
    '.....#ll#...####',
    '....#ll#........',
    '....#l#.........',
    '...#ll#.........',
    '...#l#..........',
    '...#l#..........',
    '...#ll#.........',
    '....#l#.........',
    '....#ll#........',
    '.....#ll#.......',
    '......#lll##....',
    '.......#llll####',
    '........#ddddddd',
    '.........#######',
  ] },
  // Archon (Geist+Phönix): hoher Lichtgeist mit Halo und Glanzschwingen.
  archon: { symmetric: true, top: 3, rows: [
    '..............gg',
    '.............g..',
    '..........######',
    '.........#llllll',
    '.........#leemmm',
    '.........#mmmmmm',
    '..##.....#mmmmmm',
    '..#h##...#mmmmmm',
    '..#hh##.##mmmmmm',
    '...#hhl#lmmmmmmm',
    '...#hhll#mmmmmmm',
    '....#hll#mmmmmmm',
    '.....#ll#mmmmmmm',
    '.....###dmmmmmmm',
    '.......#dmmmmmmm',
    '.......#ddmmmmmm',
    '........#ddmmmmm',
    '........#ddddddd',
    '.........##ddddd',
    '...........##ddd',
    '.............##d',
  ] },
};

const pixelURICache = {};

function pixelSpriteURI(archetype, element) {
  const key = archetype + '_' + element;
  if (pixelURICache[key]) return pixelURICache[key];
  const def = PixelArchetypes[archetype];
  const pal = PixelPalettes[element];
  if (!def || !pal) return null;
  const expected = def.symmetric ? PIXEL_SIZE / 2 : PIXEL_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = PIXEL_SIZE;
  canvas.height = PIXEL_SIZE;
  const ctx = canvas.getContext('2d');
  def.rows.forEach((r, i) => {
    if (r.length !== expected)
      console.warn(`pixel.js: ${archetype} Zeile ${i} hat ${r.length} statt ${expected} Zeichen`);
    const row = def.symmetric ? r + [...r].reverse().join('') : r;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      ctx.fillStyle = pal[ch] || '#ff00ff'; // Magenta = Tippfehler im Sprite sichtbar machen
      ctx.fillRect(x, (def.top || 0) + i, 1, 1);
    }
  });
  pixelURICache[key] = canvas.toDataURL();
  return pixelURICache[key];
}

// Standard-Kreaturen-Renderer (Nachfolger von creatureSVG). Größe regelt CSS
// über den Container; opts.noAura lässt den Element-Glow weg (Minis, Silhouetten).
function creatureArt(c, opts = {}) {
  const uri = pixelSpriteURI(c.archetype, c.element);
  if (!uri) return '';
  const glow = opts.noAura ? '' :
    ` style="filter: drop-shadow(0 0 5px ${Elements[c.element].color}66)"`;
  return `<img class="pixel-sprite" src="${uri}"${glow} alt="${c.name}" draggable="false">`;
}

// ===================== Pixel-Icons (ersetzen alle Emoji/Vektor-Icons) =====================
// 12×12-Char-Maps, eigene Mini-Palette je Icon.

const PixelIcons = {
  fire: { pal: { o: '#2b0d08', m: '#d84a24', l: '#f58a3c', h: '#ffcf5e' }, rows: [
    '.....o......', '....omo.....', '....omlo....', '...omllo....', '..omlllho...',
    '..omllhho...', '.omlhhhho...', '.omhhhhho...', '.omhhhhhmo..', '..omhhhmo...',
    '...ommmo....', '....ooo.....',
  ] },
  nature: { pal: { o: '#0f2410', m: '#499a44', l: '#86c95d', h: '#cdeb8a' }, rows: [
    '........o...', '......oomo..', '.....omllmo.', '....omlllmo.', '...omllhlmo.',
    '..omllhllmo.', '..omlhllmo..', '.omllhlmo...', '.omlhlmo....', '.omlmo......',
    '.omo........', 'oo..........',
  ] },
  water: { pal: { o: '#0a1c33', m: '#2f7fd4', l: '#6cbdf2', h: '#c8ecff' }, rows: [
    '.....o......', '.....o......', '....omo.....', '....omo.....', '...omlmo....',
    '..omllmo....', '.omllhlmo...', '.omlhhlmo...', '.omllllmo...', '..omllmo....',
    '...ommo.....', '....oo......',
  ] },
  steam: { pal: { o: '#232a30', m: '#8fa1ab', l: '#c4d3da', h: '#eef6f9' }, rows: [
    '............', '...ooo......', '..omllo.oo..', '.omlllloomo.', '.omlhhllllmo',
    'omlhhhhllllo', 'omllhhhhlllo', '.omllllllmo.', '..oommmmoo..', '............',
    '...o..o.....', '............',
  ] },
  ash: { pal: { o: '#1f1512', m: '#7a5c50', l: '#a58877', g: '#ff9a3d' }, rows: [
    '....g.g.....', '.....g......', '....ooo.....', '...oglgo....', '...omllmo...',
    '..omlllmo...', '..omllllmo..', '.omllllllmo.', '.omllllllmo.', 'omllllllllmo',
    'oommmmmmmmoo', '.oooooooooo.',
  ] },
  frost: { pal: { o: '#0e2233', l: '#9adcf2', h: '#d6f4fd' }, rows: [
    '.....h......', '..h..h..h...', '...h.h.h....', '....hhh.....', '..hhhhhhh...',
    '.h..hhh..h..', 'hhhhhhhhhhh.', '.h..hhh..h..', '..hhhhhhh...', '....hhh.....',
    '...h.h.h....', '..h..h..h...',
  ] },
  coin: { pal: { o: '#5c3d0d', m: '#ffc94d', l: '#ffe9a8', d: '#d99a1e' }, rows: [
    '............', '...oooooo...', '..ommmmmmo..', '.omllmmmmdo.', '.omlmmmmmdo.',
    '.omlmmmmmdo.', '.omlmmmmmdo.', '.ommmmmmddo.', '..ommmmddo..', '...oooooo...',
    '............', '............',
  ] },
  star: { pal: { m: '#ffc94d', l: '#ffe9a8' }, rows: [
    '.....mm.....', '.....mm.....', '....mllm....', 'mmmmmllmmmmm', '.mmllllllmm.',
    '..mllllllm..', '...mllllm...', '..mllmmllm..', '.mlm....mlm.', 'mm........mm',
    '............', '............',
  ] },
  lock: { pal: { o: '#1a1a22', m: '#8a8fa8', l: '#c0c6dd', d: '#565b70' }, rows: [
    '....ooo.....', '...om.mo....', '...om.mo....', '..ommmmmmo..', '..omllllmo..',
    '..omldllmo..', '..omldllmo..', '..omllllmo..', '..oommmmoo..', '............',
    '............', '............',
  ] },
  egg: { pal: { o: '#6b5335', m: '#f2e3c8', l: '#fff8ea', d: '#d9c4a0' }, rows: [
    '.....oo.....', '....ommo....', '...omllmo...', '..omllllmo..', '..omlllldo..',
    '.omllllldmo.', '.omlllllddo.', '.omlllllddo.', '..omlllddo..', '...ommddo...',
    '....oooo....', '............',
  ] },
  sword: { pal: { o: '#1a1a22', l: '#eef2ff', g: '#ffc94d' }, rows: [
    '.....o......', '....olo.....', '....olo.....', '....olo.....', '....olo.....',
    '....olo.....', '....olo.....', '.gggggggg...', '....ogo.....', '....ogo.....',
    '....ggg.....', '............',
  ] },
  gear: { pal: { m: '#8a8fa8', l: '#c0c6dd' }, rows: [
    '.....mm.....', '.mm..mm..mm.', '.mmmmmmmmmm.', '..mmllllmm..', '..mll..llm..',
    'mmml....lmmm', 'mmml....lmmm', '..mll..llm..', '..mmllllmm..', '.mmmmmmmmmm.',
    '.mm..mm..mm.', '.....mm.....',
  ] },
  map: { pal: { o: '#3d2f18', m: '#d9c49a', l: '#efe3c2', g: '#7c6cff' }, rows: [
    '............', '.oooooooooo.', '.olllmmmllo.', '.olglmmmllo.', '.olglmgmllo.',
    '.ollgmgmllo.', '.ollgggmllo.', '.olllmgmllo.', '.olllmggllo.', '.olllmmgglo.',
    '.oooooooooo.', '............',
  ] },
  book: { pal: { o: '#2a1a3d', m: '#7c6cff', l: '#b18aff', p: '#efe8ff' }, rows: [
    '............', '..oooooooo..', '..ommmmmmlo.', '..ommmmmmlo.', '..omllllmlo.',
    '..omllllmlo.', '..ommmmmmlo.', '..ommmmmmlo.', '..oppppppo..', '..oooooooo..',
    '............', '............',
  ] },
  orb: { pal: { o: '#3d2f52', m: '#b18aff', l: '#d9c9ff', h: '#ffffff' }, rows: [
    '....oooo....', '...ommmmo...', '..omllmmmo..', '.omlhllmmmo.', '.omlhllmmmo.',
    '.omllllmmmo.', '.ommmmmmmmo.', '..ommmmmmo..', '...ommmmo...', '....oooo....',
    '...oooooo...', '............',
  ] },
  bolt: { pal: { g: '#ffc94d' }, rows: [
    '.....ggggg..', '....gggg....', '...gggg.....', '..ggggggg...', '.....gggg...',
    '....gggg....', '...gggg.....', '..gggg......', '.ggg........', '............',
    '............', '............',
  ] },
  back: { pal: { l: '#c0c6dd', m: '#8a8fa8' }, rows: [
    '............', '.....l......', '....ll......', '...lll......', '..llllllllll',
    '.lllllllllll', '.lllllllllll', '..llllllllll', '...lll......', '....ll......',
    '.....l......', '............',
  ] },
  sound: { pal: { m: '#8a8fa8', l: '#eef2ff', g: '#4db8ff' }, rows: [
    '............', '.....l......', '....ll..g...', '.mmlll...g..', '.mmlll.g.g..',
    '.mmlll.g.g..', '.mmlll.g.g..', '.mmlll.g.g..', '.mmlll...g..', '....ll..g...',
    '.....l......', '............',
  ] },
  music: { pal: { m: '#c0c6dd', l: '#eef2ff' }, rows: [
    '............', '....mmmmmm..', '....mllllm..', '....m....m..', '....m....m..',
    '....m....m..', '....m....m..', '..mmm..mmm..', '.mmmm.mmmm..', '.mmmm.mmmm..',
    '..mm...mm...', '............',
  ] },
  heart: { pal: { o: '#5c1020', m: '#e84a5f', l: '#ff8a9b', h: '#ffd0d8' }, rows: [
    '............', '..oo....oo..', '.ommo..ommo.', 'omllmoomllmo', 'omhlmmmmllmo',
    'omllllllllmo', '.omllllllmo.', '..omllllmo..', '...omllmo...', '....ommo....',
    '.....oo.....', '............',
  ] },
  shield: { pal: { o: '#1a2a4a', m: '#5d8ac9', l: '#9dc3f0', h: '#e2f0ff' }, rows: [
    '............', '.oooooooooo.', '.omllhhllmo.', '.omllhhllmo.', '.omllllllmo.',
    '.ommllllmmo.', '.ommllllmmo.', '..omllllmo..', '..ommllmmo..', '...omllmo...',
    '....ommo....', '.....oo.....',
  ] },
  fang: { pal: { o: '#3a2a1a', m: '#e8dcc8', l: '#fffaf0' }, rows: [
    '............', '.oo......oo.', '.omo....omo.', '.olmo..omlo.', '.olmo..omlo.',
    '.ollmoomllo.', '.ollmoomllo.', '..olmoomlo..', '..olmoomlo..', '...oo..oo...',
    '............', '............',
  ] },
  skull: { pal: { o: '#2a2a35', m: '#c8ccd8', l: '#eef1f8' }, rows: [
    '............', '...oooooo...', '..omllllmo..', '.omllllllmo.', '.omlollolmo.',
    '.omoolloomo.', '.omllllllmo.', '..omlmmlmo..', '..oml..lmo..', '...o.oo.o...',
    '............', '............',
  ] },
  sparkle: { pal: { m: '#b18aff', l: '#d9c9ff', h: '#ffffff' }, rows: [
    '.....m......', '.....m......', '....mlm.....', 'mmmlhhlmmm..', '....mlm...m.',
    '.....m...mlm', '.....m....m.', '..m.........', '.mlm........', '..m.........',
    '............', '............',
  ] },
  sun: { pal: { m: '#ffc94d', l: '#ffe9a8', h: '#fff8e0' }, rows: [
    '.....m......', '.m...m...m..', '..m.mlm.m...', '...mlllm....', '..mllhllm...',
    'mmmlhhhlmmm.', '..mllhllm...', '...mlllm....', '..m.mlm.m...', '.m...m...m..',
    '.....m......', '............',
  ] },
};

// ===================== Lagerfeuer (Hauptmenü-Szene, 2 Flacker-Frames) =====================

const CampfirePal = {
  o: '#1a0d05', w: '#5a3a1e', v: '#7a5230',
  d: '#8f2011', m: '#d84a24', l: '#f58a3c', h: '#ffcf5e', g: '#fff3b0',
};
const CampfireFrames = [
  [
    '................',
    '.......g........',
    '......gh........',
    '......hh........',
    '.....ghhg.......',
    '.....hlhh.......',
    '....hllmhg......',
    '....llmmlh......',
    '...hlmmmmlg.....',
    '...lmmdmmml.....',
    '..glmdddmmlg....',
    '...ow#ww#wo.....',
    '..ow##vv##wo....',
    '.owwvwwwwvwwo...',
    '..oooooooooo....',
    '................',
  ],
  [
    '................',
    '........g.......',
    '........hg......',
    '.......hh.......',
    '......ghhg......',
    '......hhlh......',
    '.....ghmllh.....',
    '....hlmmll......',
    '....glmmmmlh....',
    '...lmmmdmml.....',
    '..glmmdddmlg....',
    '...ow#ww#wo.....',
    '..ow##vv##wo....',
    '.owwvwwwwvwwo...',
    '..oooooooooo....',
    '................',
  ],
];

let _campfireURIs = null;
function campfireArt() {
  if (!_campfireURIs) _campfireURIs = CampfireFrames.map(rows => charMapURI(rows, CampfirePal));
  return `<span class="campfire">
    <img class="pixel-sprite fire-f1" src="${_campfireURIs[0]}" alt="" draggable="false">
    <img class="pixel-sprite fire-f2" src="${_campfireURIs[1]}" alt="" draggable="false">
  </span>`;
}

function charMapURI(rows, pal) {
  const w = rows[0].length, h = rows.length;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  rows.forEach((r, y) => {
    if (r.length !== w) console.warn('pixel.js: Icon-Zeile', y, 'hat', r.length, 'statt', w);
    for (let x = 0; x < r.length; x++) {
      if (r[x] === '.') continue;
      ctx.fillStyle = pal[r[x]] || '#ff00ff';
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return canvas.toDataURL();
}

const iconURICache = {};

function iconArt(name, size) {
  if (!iconURICache[name]) {
    const def = PixelIcons[name];
    if (!def) return '';
    iconURICache[name] = charMapURI(def.rows, def.pal);
  }
  const s = size ? ` style="width:${size}px;height:${size}px"` : '';
  return `<img class="pixel-sprite px-ico" src="${iconURICache[name]}"${s} alt="" draggable="false">`;
}

// Emoji-Element-Icons aus svg.js durch Pixel-Icons ersetzen (const-Objekt wird mutiert).
Object.keys(ElementIcons).forEach(k => { if (PixelIcons[k]) ElementIcons[k] = iconArt(k); });

// ===================== Szenen-Hintergründe (ersetzt sceneSVG) =====================
// Low-Res-Canvas (96×160) hochskaliert: gedittherter Himmel, Mond-Orb, zwei
// Bergsilhouetten, Boden — Farben aus SceneThemes (svg.js).

function _hashStr(s) { let h = 9; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 387420489); return h >>> 0; }
function _rng(seed) { return () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function _hexLerp(a, b, t) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

const sceneURICache = {};

function sceneURI(themeName) {
  if (sceneURICache[themeName]) return sceneURICache[themeName];
  const t = SceneThemes[themeName] || SceneThemes.storm;
  const w = 96, h = 160;
  const rnd = _rng(_hashStr(themeName));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Himmel: 4 Farbstufen mit 2×2-Dithering
  const skyLevels = [0, 1, 2, 3].map(i => _hexLerp(t.sky1, t.sky2, i / 3));
  const horizon = Math.round(h * 0.66);
  for (let y = 0; y < horizon; y++) {
    const q = (y / horizon) * 3;
    const base = Math.floor(q), frac = q - base;
    for (let x = 0; x < w; x++) {
      const dither = ((x + y) & 1) ? 0.33 : 0.66;
      ctx.fillStyle = skyLevels[Math.min(3, frac > dither ? base + 1 : base)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Sterne
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 22; i++) ctx.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * horizon * 0.7), 1, 1);
  // Mond/Orb mit Halo
  const ox = Math.round(w * 0.72), oy = Math.round(h * 0.15), orad = 8;
  for (let y = oy - orad - 4; y <= oy + orad + 4; y++) for (let x = ox - orad - 4; x <= ox + orad + 4; x++) {
    const d = Math.hypot(x - ox, y - oy);
    if (d <= orad) { ctx.globalAlpha = Math.min(1, t.orbOp * 3); ctx.fillStyle = t.orb; ctx.fillRect(x, y, 1, 1); }
    else if (d <= orad + 4) { ctx.globalAlpha = t.orbOp * 0.6; ctx.fillStyle = t.orb; ctx.fillRect(x, y, 1, 1); }
  }
  ctx.globalAlpha = 1;
  // Zwei Bergketten (Random Walk, deterministisch je Theme)
  [[t.far, 0.44], [t.near, 0.55]].forEach(([col, fy]) => {
    ctx.fillStyle = col;
    let ry = Math.round(h * fy);
    for (let x = 0; x < w; x++) {
      ry += Math.round((rnd() - 0.5) * 5);
      ry = Math.max(Math.round(h * (fy - 0.12)), Math.min(Math.round(h * (fy + 0.08)), ry));
      ctx.fillRect(x, ry, 1, horizon - ry + 2);
    }
  });
  // Boden: Stufen mit Dithering, heller Horizontsaum
  const gLevels = [0, 1, 2, 3].map(i => _hexLerp(t.ground1, t.ground2, i / 3));
  for (let y = horizon; y < h; y++) {
    const q = ((y - horizon) / (h - horizon)) * 3;
    const base = Math.floor(q), frac = q - base;
    for (let x = 0; x < w; x++) {
      const dither = ((x + y) & 1) ? 0.33 : 0.66;
      ctx.fillStyle = gLevels[Math.min(3, frac > dither ? base + 1 : base)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = _hexLerp(t.ground1, '#ffffff', 0.12);
  ctx.fillRect(0, horizon, w, 1);

  sceneURICache[themeName] = canvas.toDataURL();
  return sceneURICache[themeName];
}

function sceneArt(themeName) {
  return `<img class="pixel-sprite scene-art" src="${sceneURI(themeName)}" alt="" draggable="false">`;
}

// ===================== Titel-Emblem: 4 Varianten, Auswahl in ⚙ → Logo =====================
// Logo fest: 'ring' (Element-Ring, Nutzer-Entscheidung 17.07.2026) — auch App-Icon-Basis.
// Die übrigen Varianten bleiben als Assets erhalten (emblemArt('kristall') etc. für Debug).

function _emblemRing(ctx, s) {
  const cx = s / 2, cy = s / 2, R = 19;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (Math.abs(d - R) <= 1.3) {
      ctx.fillStyle = _hexLerp('#b9a1ff', '#4b3a9e', y / s);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  [['fire', -90], ['nature', 150], ['water', 30]].forEach(([el, deg]) => {
    const a = deg * Math.PI / 180;
    const px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
    const pal = PixelPalettes[el];
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) {
      const d = Math.hypot(x, y);
      if (d > 4.4) continue;
      ctx.fillStyle = d > 3.3 ? pal['#'] : (x < 0 && y < 0 ? pal.l : pal.m);
      ctx.fillRect(Math.round(px + x), Math.round(py + y), 1, 1);
    }
  });
  for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) {
    const d = Math.abs(x) + Math.abs(y);
    if (d > 6) continue;
    ctx.fillStyle = d > 4 ? '#5c3d0d' : (x + y < 0 ? '#ffe9a8' : '#ffc94d');
    ctx.fillRect(s / 2 + x, s / 2 + y, 1, 1);
  }
}

// Kristall-Raute, drei Element-Facetten + weißer Fusionskern.
function _emblemKristall(ctx, s) {
  const cx = s / 2, cy = s / 2, R = 21;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const dx = x - cx, dy = y - cy;
    const d = Math.abs(dx) + Math.abs(dy);
    if (d > R) continue;
    const ang = Math.atan2(dy, dx) * 180 / Math.PI; // -180..180
    const el = ang < -30 && ang >= -150 ? 'fire' : ang >= -30 && ang < 90 ? 'water' : 'nature';
    const pal = PixelPalettes[el];
    ctx.fillStyle = d > R - 2 ? pal['#'] : (dx + dy < -4 ? pal.l : d % 7 === 0 ? pal.d : pal.m);
    ctx.fillRect(x, y, 1, 1);
  }
  for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
    const d = Math.abs(x) + Math.abs(y);
    if (d > 4) continue;
    ctx.fillStyle = d > 2 ? '#ffe9a8' : '#ffffff';
    ctx.fillRect(cx + x, cy + y, 1, 1);
  }
}

// Drei große, überlappende Element-Orbs, weißer Kern.
function _emblemOrben(ctx, s) {
  const cx = s / 2, cy = s / 2;
  [['nature', 150], ['water', 30], ['fire', -90]].forEach(([el, deg]) => {
    const a = deg * Math.PI / 180;
    const ox = cx + Math.cos(a) * 9, oy = cy + Math.sin(a) * 9;
    const pal = PixelPalettes[el];
    for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) {
      const d = Math.hypot(x, y);
      if (d > 11) continue;
      ctx.fillStyle = d > 9.6 ? pal['#'] : (x < -2 && y < -2 ? pal.l : pal.m);
      ctx.fillRect(Math.round(ox + x), Math.round(oy + y), 1, 1);
    }
  });
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) {
    if (Math.abs(x) + Math.abs(y) > 3) continue;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx + x, cy + y, 1, 1);
  }
}

// Goldene „E"-Rune mit drei Element-Punkten an den Balken.
const _runeRows = [
  'mmmmmmmmmm..',
  'mllllllllmff',
  'mllllllllmff',
  'mmmmmmmmmm..',
  'mll.........',
  'mmmmmmmmm...',
  'mlllllllm.nn',
  'mlllllllm.nn',
  'mmmmmmmmm...',
  'mll.........',
  'mmmmmmmmmm..',
  'mllllllllmww',
  'mllllllllmww',
  'mmmmmmmmmm..',
];

const EmblemVariants = {
  ring:     { name: 'Element-Ring',     draw: _emblemRing },
  kristall: { name: 'Element-Kristall', draw: _emblemKristall },
  orben:    { name: 'Fusions-Orben',    draw: _emblemOrben },
  rune:     { name: 'Elementra-Rune',   draw: null }, // Char-Map, kein Zeichner
};

const emblemURICache = {};

function emblemURI(key) {
  if (emblemURICache[key]) return emblemURICache[key];
  if (key === 'rune') {
    emblemURICache.rune = charMapURI(_runeRows, {
      m: '#ffc94d', l: '#ffe9a8',
      f: PixelPalettes.fire.m, n: PixelPalettes.nature.m, w: PixelPalettes.water.m,
    });
    return emblemURICache.rune;
  }
  const s = 48;
  const canvas = document.createElement('canvas');
  canvas.width = s; canvas.height = s;
  (EmblemVariants[key] || EmblemVariants.ring).draw(canvas.getContext('2d'), s);
  emblemURICache[key] = canvas.toDataURL();
  return emblemURICache[key];
}

function emblemArt(variant) {
  const key = variant || 'ring';
  return `<img class="pixel-sprite" src="${emblemURI(EmblemVariants[key] ? key : 'ring')}" alt="Elementra" draggable="false">`;
}

// ===================== Karten-Pfad + Karten-Hintergrund =====================

// Gepixelter Kampagnen-Pfad (ersetzt den SVG-Trail): breite Unterlage + Punktlinie
// entlang derselben kubischen Bézier-Segmente wie zuvor.
function mapTrailURI(pts, width, height) {
  const S = 4; // 1 Canvas-Pixel = 4 CSS-Pixel
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width / S); canvas.height = Math.ceil(height / S);
  const ctx = canvas.getContext('2d');
  const stamp = (x, y, r, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x - r), Math.round(y - r), r * 2 + 1, r * 2 + 1);
  };
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p3 = pts[i], my = (p0.y + p3.y) / 2;
    for (let st = 0; st <= 56; st++) {
      const t = st / 56, u = 1 - t;
      const bx = u * u * u * p0.x + 3 * u * u * t * p0.x + 3 * u * t * t * p3.x + t * t * t * p3.x;
      const by = u * u * u * p0.y + 3 * u * u * t * my + 3 * u * t * t * my + t * t * t * p3.y;
      stamp(bx / S, by / S, 3, 'rgba(124,108,255,0.028)');
      if (st % 4 === 0) stamp(bx / S, by / S, 0, 'rgba(177,138,255,0.8)');
    }
  }
  return canvas.toDataURL();
}

// Kachelbarer Sternenhimmel als Karten-Hintergrund.
let _starTileURI = null;
function starTileURI() {
  if (!_starTileURI) {
    const s = 64;
    const canvas = document.createElement('canvas');
    canvas.width = s; canvas.height = s;
    const ctx = canvas.getContext('2d');
    const rnd = _rng(1337);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = `rgba(${180 + Math.floor(rnd() * 75)},${180 + Math.floor(rnd() * 60)},255,${0.12 + rnd() * 0.25})`;
      ctx.fillRect(Math.floor(rnd() * s), Math.floor(rnd() * s), 1, 1);
    }
    _starTileURI = canvas.toDataURL();
  }
  return _starTileURI;
}
