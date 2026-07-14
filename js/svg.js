// svg.js — prozeduraler Kreaturen-Generator.
// 7 Archetyp-Silhouetten × Element-Palette = alle 42 Kreaturen ohne Bild-Assets.
// creatureSVG(creature) liefert einen fertigen <svg>-String (inline nutzbar).

const ElementPalettes = {
  fire:   { c1: '#e8552d', c2: '#ffb03a', c3: '#7a1f0e', glow: '#ff7a3c' },
  nature: { c1: '#4caf50', c2: '#a8e063', c3: '#1d5b23', glow: '#7dff8a' },
  water:  { c1: '#2f80ed', c2: '#6ec6ff', c3: '#123a75', glow: '#5ab8ff' },
  steam:  { c1: '#b0bec5', c2: '#eceff1', c3: '#546e7a', glow: '#cfe8f5' },
  ash:    { c1: '#8d6e63', c2: '#d7a98c', c3: '#3e2723', glow: '#e0965a' },
  frost:  { c1: '#81d4fa', c2: '#e1f5fe', c3: '#1a5f8a', glow: '#a8e8ff' },
};

let _svgUid = 0;

// Silhouetten pro Archetyp. Alle im viewBox 0 0 120 120, Blickrichtung rechts.
const ArchetypeShapes = {
  drache(p, id) {
    return `
      <path d="M28 88 Q18 70 30 56 Q44 40 62 44 Q60 30 74 24 Q88 18 96 30 Q104 40 94 46 Q102 52 98 62 Q92 76 74 78 Q80 88 70 94 Q52 102 38 96 Q30 93 28 88 Z" fill="url(#${id}-body)"/>
      <path d="M60 46 Q40 18 14 22 Q30 32 34 46 Q20 44 12 52 Q30 56 42 60 Q52 62 60 46 Z" fill="url(#${id}-wing)" opacity="0.92"/>
      <path d="M74 24 L70 12 L80 20 Z" fill="${p.c2}"/>
      <path d="M88 22 L90 10 L96 22 Z" fill="${p.c2}"/>
      <circle cx="86" cy="34" r="3.4" fill="#fff"/>
      <circle cx="87" cy="34" r="1.8" fill="${p.c3}"/>
      <path d="M96 40 L110 44 L96 48 Z" fill="${p.c2}"/>
      <path d="M30 88 Q10 96 6 110 Q24 106 36 96 Z" fill="${p.c1}" opacity="0.85"/>
      <path d="M46 58 Q56 54 64 58 M44 70 Q56 66 68 70" stroke="${p.c3}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.6"/>`;
  },
  golem(p, id) {
    return `
      <path d="M34 112 L30 84 Q18 82 20 68 Q22 56 34 54 Q32 38 46 34 Q44 22 58 20 Q74 18 78 30 Q92 32 92 46 Q104 50 102 64 Q100 78 88 82 L86 112 Z" fill="url(#${id}-body)"/>
      <path d="M12 78 Q4 64 14 56 Q26 50 30 62 Q32 72 24 78 Z" fill="${p.c1}"/>
      <path d="M108 76 Q116 62 106 54 Q94 48 90 60 Q88 70 96 76 Z" fill="${p.c1}"/>
      <rect x="48" y="30" width="26" height="20" rx="6" fill="${p.c3}"/>
      <circle cx="56" cy="40" r="3.4" fill="${p.glow}"/>
      <circle cx="68" cy="40" r="3.4" fill="${p.glow}"/>
      <path d="M52 66 L64 60 L60 74 L72 68" stroke="${p.glow}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.9"/>
      <path d="M38 92 L46 88 M74 94 L82 88" stroke="${p.c3}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`;
  },
  greif(p, id) {
    return `
      <path d="M58 26 Q30 8 8 18 Q26 26 32 38 Q16 36 6 46 Q24 50 34 56 Q18 58 12 68 Q32 68 44 64 Z" fill="url(#${id}-wing)"/>
      <path d="M40 92 Q30 72 44 58 Q56 44 74 46 Q72 34 84 30 Q98 26 104 36 Q110 46 100 50 Q106 58 98 66 Q90 78 72 78 Q76 88 66 94 Q52 100 40 92 Z" fill="url(#${id}-body)"/>
      <path d="M100 40 L114 46 L98 50 Z" fill="${p.c2}"/>
      <circle cx="92" cy="40" r="3.2" fill="#fff"/>
      <circle cx="93" cy="40" r="1.7" fill="${p.c3}"/>
      <path d="M84 28 Q88 18 96 16 Q94 26 90 30 Z" fill="${p.c2}"/>
      <path d="M42 92 Q28 100 24 112 Q40 108 50 98 Z M56 96 Q50 106 52 116 Q62 108 64 98 Z" fill="${p.c1}" opacity="0.85"/>
      <path d="M52 62 Q62 56 72 60" stroke="${p.c3}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.55"/>`;
  },
  wolf(p, id) {
    return `
      <path d="M22 96 Q14 74 26 58 Q36 44 54 42 L50 20 L66 36 Q76 32 86 36 L98 24 L96 46 Q108 56 106 72 Q104 90 88 96 Q70 104 46 102 Q30 100 22 96 Z" fill="url(#${id}-body)"/>
      <path d="M54 42 L50 20 L66 36 Z" fill="${p.c3}"/>
      <path d="M86 36 L98 24 L96 46 Z" fill="${p.c3}"/>
      <circle cx="72" cy="56" r="3.6" fill="${p.glow}"/>
      <circle cx="92" cy="58" r="3.4" fill="${p.glow}"/>
      <path d="M96 70 Q108 72 114 68 Q110 80 98 82 Q90 84 84 78 Z" fill="${p.c2}"/>
      <path d="M98 80 L96 88 L102 82 M106 76 L108 84 L112 76" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M30 66 Q42 60 52 64 M32 80 Q44 74 54 78" stroke="${p.c3}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.55"/>`;
  },
  wyrm(p, id) {
    return `
      <path d="M20 104 Q6 92 16 78 Q26 66 44 70 Q36 58 46 48 Q56 38 70 44 Q64 30 78 22 Q92 14 102 26 Q110 36 102 44 Q112 52 104 62 Q96 72 84 66 Q90 80 78 88 Q66 96 54 88 Q60 102 46 108 Q32 112 20 104 Z" fill="url(#${id}-body)"/>
      <circle cx="92" cy="34" r="3.4" fill="#fff"/>
      <circle cx="93" cy="34" r="1.8" fill="${p.c3}"/>
      <path d="M102 40 L116 44 L102 50 Z" fill="${p.c2}"/>
      <path d="M104 46 L108 54 M108 44 L114 50" stroke="${p.c2}" stroke-width="2" stroke-linecap="round"/>
      <path d="M78 24 Q82 12 92 10 Q90 20 86 26 Z" fill="${p.c2}"/>
      <path d="M30 84 Q40 80 48 84 M40 96 Q50 92 58 96 M52 62 Q62 58 68 62" stroke="${p.c3}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.6"/>`;
  },
  geist(p, id) {
    return `
      <path d="M60 14 Q90 16 94 52 Q96 74 92 92 L84 84 L78 98 L70 88 L62 102 L54 88 L46 98 L40 84 L32 92 Q26 72 28 50 Q32 16 60 14 Z" fill="url(#${id}-body)" opacity="0.92"/>
      <circle cx="60" cy="54" r="13" fill="${p.glow}" opacity="0.55"/>
      <circle cx="60" cy="54" r="7" fill="#fff" opacity="0.9"/>
      <circle cx="48" cy="40" r="3.6" fill="${p.c3}"/>
      <circle cx="72" cy="40" r="3.6" fill="${p.c3}"/>
      <path d="M26 60 Q14 64 10 74 Q22 74 30 68 Z M94 60 Q106 64 110 74 Q98 74 90 68 Z" fill="${p.c1}" opacity="0.7"/>
      <path d="M44 26 Q52 20 60 22" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.5"/>`;
  },
  phoenix(p, id) {
    return `
      <path d="M60 110 Q52 94 58 82 Q48 90 40 88 Q50 80 52 70 Q40 76 30 72 Q44 64 48 54 Q60 46 72 54 Q76 64 90 72 Q80 76 68 70 Q70 80 80 88 Q72 90 62 82 Q68 94 60 110 Z" fill="url(#${id}-tail)" opacity="0.95"/>
      <path d="M60 18 Q74 20 78 34 Q90 30 98 38 Q88 44 84 52 Q88 62 80 70 Q70 78 58 74 Q44 70 42 56 Q40 42 48 32 Q52 22 60 18 Z" fill="url(#${id}-body)"/>
      <path d="M46 34 Q22 24 8 32 Q22 40 28 50 Q14 52 8 60 Q26 62 40 58 Z" fill="url(#${id}-wing)"/>
      <path d="M78 34 Q98 22 112 28 Q100 38 96 48 Q106 48 114 54 Q98 58 84 54 Z" fill="url(#${id}-wing)"/>
      <circle cx="72" cy="36" r="3.2" fill="#fff"/>
      <circle cx="73" cy="36" r="1.7" fill="${p.c3}"/>
      <path d="M78 42 L92 46 L78 50 Z" fill="${p.c2}"/>
      <path d="M56 16 Q58 6 66 4 Q64 12 62 18 Z M64 16 Q70 8 78 8 Q72 16 68 20 Z" fill="${p.c2}"/>`;
  },
};

// Liefert kompletten SVG-String einer Kreatur (Aura + Silhouette + Glow-Filter).
function creatureSVG(creature, opts = {}) {
  const el = Elements[creature.element];
  const p = ElementPalettes[creature.element];
  const id = 'cs' + (++_svgUid);
  const shape = ArchetypeShapes[creature.archetype](p, id);
  const aura = opts.noAura ? '' :
    `<circle cx="60" cy="62" r="46" fill="url(#${id}-aura)"/>`;
  // Tier-2-Hybride: Gradient mischt die Farben beider Ursprungs-Elemente ein.
  const comps = (el && el.components) || null;
  const gA = comps ? ElementPalettes[comps[0]].c1 : p.c2;
  const gB = comps ? ElementPalettes[comps[1]].c1 : p.c3;
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" class="creature-svg">
    <defs>
      <radialGradient id="${id}-aura">
        <stop offset="0%" stop-color="${p.glow}" stop-opacity="0.5"/>
        <stop offset="70%" stop-color="${p.glow}" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="${p.glow}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${id}-body" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${comps ? gA : p.c2}"/>
        <stop offset="55%" stop-color="${p.c1}"/>
        <stop offset="100%" stop-color="${comps ? gB : p.c3}"/>
      </linearGradient>
      <linearGradient id="${id}-wing" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${p.c2}"/>
        <stop offset="100%" stop-color="${p.c1}"/>
      </linearGradient>
      <linearGradient id="${id}-tail" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="${p.glow}" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="${p.c1}"/>
      </linearGradient>
      <filter id="${id}-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.4" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    ${aura}
    <g filter="url(#${id}-glow)">${shape}</g>
  </svg>`;
}

const ElementIcons = {
  fire: '🔥', nature: '🌿', water: '💧', steam: '💨', ash: '🌋', frost: '❄️',
};

// ---------- Szenen-Hintergründe (Kampf-Arena) ----------

const SceneThemes = {
  nature: { sky1: '#0c1f16', sky2: '#123324', far: '#0f2b1d', near: '#0a1f14', ground1: '#14352a', ground2: '#071510', orb: '#7dff8a', orbOp: 0.18 },
  water:  { sky1: '#081527', sky2: '#0d2547', far: '#0d2038', near: '#081727', ground1: '#0e2a45', ground2: '#050f1d', orb: '#5ab8ff', orbOp: 0.2 },
  fire:   { sky1: '#1c0b08', sky2: '#3a140c', far: '#2a0f0a', near: '#180806', ground1: '#331410', ground2: '#0e0503', orb: '#ff7a3c', orbOp: 0.24 },
  ash:    { sky1: '#150f0d', sky2: '#2b1d18', far: '#211511', near: '#140d0a', ground1: '#2a1c16', ground2: '#0c0705', orb: '#e0965a', orbOp: 0.16 },
  frost:  { sky1: '#0a1420', sky2: '#14283d', far: '#12222f', near: '#0a1520', ground1: '#16293a', ground2: '#060d15', orb: '#a8e8ff', orbOp: 0.2 },
  storm:  { sky1: '#0d1024', sky2: '#1c2148', far: '#161a38', near: '#0d1026', ground1: '#1b2040', ground2: '#080a18', orb: '#b18aff', orbOp: 0.2 },
};

// Prozeduraler Arena-Hintergrund: Himmel, Mond/Orb, zwei Bergsilhouetten, Boden.
function sceneSVG(themeName) {
  const t = SceneThemes[themeName] || SceneThemes.storm;
  const id = 'sc' + (++_svgUid);
  return `<svg viewBox="0 0 390 700" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${t.sky1}"/><stop offset="100%" stop-color="${t.sky2}"/>
      </linearGradient>
      <linearGradient id="${id}-gr" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${t.ground1}"/><stop offset="100%" stop-color="${t.ground2}"/>
      </linearGradient>
      <radialGradient id="${id}-orb">
        <stop offset="0%" stop-color="${t.orb}" stop-opacity="${t.orbOp * 2}"/>
        <stop offset="40%" stop-color="${t.orb}" stop-opacity="${t.orbOp}"/>
        <stop offset="100%" stop-color="${t.orb}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="390" height="700" fill="url(#${id}-sky)"/>
    <circle cx="300" cy="130" r="150" fill="url(#${id}-orb)"/>
    <circle cx="300" cy="130" r="34" fill="${t.orb}" opacity="0.35"/>
    <path d="M0 320 L60 240 L120 300 L190 210 L260 290 L330 230 L390 300 L390 700 L0 700 Z" fill="${t.far}" opacity="0.8"/>
    <path d="M0 380 L80 310 L150 370 L240 300 L320 380 L390 330 L390 700 L0 700 Z" fill="${t.near}"/>
    <rect y="420" width="390" height="280" fill="url(#${id}-gr)"/>
    <ellipse cx="195" cy="430" rx="260" ry="40" fill="${t.orb}" opacity="0.05"/>
  </svg>`;
}

// Titel-Emblem: drei Element-Orbs im Dreieck um einen Drachenkern.
function emblemSVG() {
  const id = 'em' + (++_svgUid);
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="${id}-halo">
        <stop offset="0%" stop-color="#b18aff" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#b18aff" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${id}-ring" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#b9a1ff"/><stop offset="100%" stop-color="#4b3a9e"/>
      </linearGradient>
      <filter id="${id}-g" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="3" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <linearGradient id="${id}d-body" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${ElementPalettes.steam.c2}"/>
        <stop offset="55%" stop-color="${ElementPalettes.steam.c1}"/>
        <stop offset="100%" stop-color="${ElementPalettes.steam.c3}"/>
      </linearGradient>
      <linearGradient id="${id}d-wing" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${ElementPalettes.steam.c2}"/>
        <stop offset="100%" stop-color="${ElementPalettes.steam.c1}"/>
      </linearGradient>
    </defs>
    <circle cx="100" cy="100" r="95" fill="url(#${id}-halo)"/>
    <circle cx="100" cy="100" r="72" fill="none" stroke="url(#${id}-ring)" stroke-width="5"/>
    <circle cx="100" cy="100" r="62" fill="rgba(12,10,30,0.85)"/>
    <g filter="url(#${id}-g)">
      <g transform="translate(64,64) scale(0.6)">${ArchetypeShapes.drache(ElementPalettes.steam, id + 'd')}</g>
      <circle cx="100" cy="24" r="14" fill="${ElementPalettes.fire.c1}"/>
      <circle cx="100" cy="24" r="7" fill="${ElementPalettes.fire.c2}"/>
      <circle cx="34" cy="152" r="14" fill="${ElementPalettes.nature.c1}"/>
      <circle cx="34" cy="152" r="7" fill="${ElementPalettes.nature.c2}"/>
      <circle cx="166" cy="152" r="14" fill="${ElementPalettes.water.c1}"/>
      <circle cx="166" cy="152" r="7" fill="${ElementPalettes.water.c2}"/>
    </g>
  </svg>`;
}
