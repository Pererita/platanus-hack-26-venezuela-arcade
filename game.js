// Caimanera Kart: Gran Circuito Venezuela 3D (Edición Retro Java / 16-Bit Arcade)
// Platanus Hack 26: Caracas Arcade Challenge
// 100% Procedural Phaser 3.87.0 — Zero external assets, zero imports, <= 50KB minified

const CABINET_KEYS = {
  P1_U: ['w', 'ArrowUp'],
  P1_D: ['s', 'ArrowDown'],
  P1_L: ['a', 'ArrowLeft'],
  P1_R: ['d', 'ArrowRight'],
  P1_1: ['u', ' ', 'z'],
  P1_2: ['i', 'Shift', 'x'],
  P1_3: ['o', 'c'],
  P1_4: ['j'],
  P1_5: ['k'],
  P1_6: ['l'],
  START1: ['1', 'Enter'],
  P2_U: ['ArrowUp'],
  P2_D: ['ArrowDown'],
  P2_L: ['ArrowLeft'],
  P2_R: ['ArrowRight'],
  P2_1: ['r', '.'],
  P2_2: ['t', '/'],
  P2_3: ['y'],
  P2_4: ['f'],
  P2_5: ['g'],
  P2_6: ['h'],
  START2: ['2'],
};

(function () {
  'use strict';

  const W = 800;
  const H = 600;
  const STORAGE_KEY = 'caimanera.kart.ve.v1';

  const M = Math;
  const M_PI = M.PI;
  const TAU = M_PI * 2;
  const M_sin = M.sin;
  const M_cos = M.cos;
  const M_abs = M.abs;
  const M_min = M.min;
  const M_max = M.max;
  const M_floor = M.floor;
  const M_ceil = M.ceil;
  const M_round = M.round;
  const M_sqrt = M.sqrt;
  const M_rand = M.random;

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIn = (a, b, p) => a + (b - a) * p * p;
  const easeInOut = (a, b, p) => a + (b - a) * (-M_cos(p * M_PI) * 0.5 + 0.5);

  function quad(ctx, col, x1, y1, x2, y2, x3, y3, x4, y4) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  }

  function ell(ctx, col, x, y, rx, ry, rot = 0, strokeCol = '', lw = 1.5) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
    ctx.fill();
    if (strokeCol) {
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  }

  function boxUI(g, x, y, w, h, r, fill, fillA, lw, stroke, strokeA = 1) {
    if (fill !== null) {
      g.fillStyle(fill, fillA);
      g.fillRoundedRect(x, y, w, h, r);
    }
    if (lw > 0) {
      g.lineStyle(lw, stroke, strokeA);
      g.strokeRoundedRect(x, y, w, h, r);
    }
  }

  // =========================================================================
  // CONTROLES ARCADE
  // =========================================================================
  const held = Object.create(null);
  const justPressed = Object.create(null);

  for (const code in CABINET_KEYS) {
    held[code] = false;
    justPressed[code] = false;
  }

  let twoPlayerActive = false;

  function resolveKeyCodes(key) {
    if (!key) return [];
    const out = [];
    const kl = key.toLowerCase();
    const ku = key.toUpperCase();
    for (const code in CABINET_KEYS) {
      const list = CABINET_KEYS[code];
      if (list.includes(key) || list.includes(kl) || list.includes(ku)) {
        if (twoPlayerActive && code.startsWith('P1_') && key.startsWith('Arrow')) continue;
        out.push(code);
      }
    }
    return out;
  }

  window.addEventListener('keydown', (e) => {
    const codes = resolveKeyCodes(e.key);
    if (codes.length > 0) {
      for (const c of codes) {
        if (!held[c]) justPressed[c] = true;
        held[c] = true;
      }
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    const codes = resolveKeyCodes(e.key);
    if (codes.length > 0) {
      for (const c of codes) held[c] = false;
      e.preventDefault();
    }
  });

  function eat(code) {
    if (justPressed[code]) {
      justPressed[code] = false;
      return true;
    }
    return false;
  }

  function eatAny(codes) {
    for (const c of codes) {
      if (justPressed[c]) {
        justPressed[c] = false;
        return true;
      }
    }
    return false;
  }

  function clearPressed() {
    for (const k in justPressed) justPressed[k] = false;
  }

  // =========================================================================
  // PERSISTENCIA ARCADE
  // =========================================================================
  const DEFAULT_SCORES = [
    { name: 'ENC', score: 2450, mode: 'COPA VE', veh: 'ENCAVA' },
    { name: 'BER', score: 2120, mode: 'CAIMANERA', veh: 'BERA' },
    { name: 'MAL', score: 1890, mode: 'CURDA KO', veh: 'MALIBU' },
    { name: 'MCH', score: 1640, mode: 'RELOJ', veh: 'MACHITO' },
    { name: 'CCS', score: 1380, mode: 'COPA VE', veh: 'ENCAVA' },
  ];

  async function loadLeaderboard() {
    try {
      const s = window.platanusArcadeStorage;
      if (s && typeof s.get === 'function') {
        const res = await s.get(STORAGE_KEY);
        if (res && res.found && Array.isArray(res.value) && res.value.length > 0) {
          return res.value.slice(0, 8);
        }
      }
    } catch (_) {}
    return DEFAULT_SCORES.slice();
  }

  async function saveLeaderboard(list) {
    try {
      const s = window.platanusArcadeStorage;
      if (s && typeof s.set === 'function') {
        await s.set(STORAGE_KEY, list.slice(0, 8));
      }
    } catch (_) {}
  }

  // =========================================================================
  // DATOS DE VEHÍCULOS, PODERES Y MODALIDADES
  // =========================================================================
  const VEHICLES = [
    {
      id: 'malibu',
      name: 'POR PUESTO',
      sub: 'Malibú Clásico • Equilibrado',
      hex: '#29b6f6',
      accent: 0x29b6f6,
      maxSpd: 615,
      accel: 410,
      turn: 1.78,
      driftB: 1.22,
      mass: 1.15,
      offMul: 0.84,
      horn: 310,
      stats: [4, 4, 4, 4],
    },
    {
      id: 'bera',
      name: 'MOTORIZADO BERA',
      sub: 'SBR 150 + Casco Sandoval • Ágil',
      hex: '#00b0ff',
      accent: 0x00b0ff,
      maxSpd: 605,
      accel: 470,
      turn: 1.98,
      driftB: 1.4,
      mass: 0.8,
      offMul: 0.82,
      horn: 520,
      stats: [4, 5, 5, 2],
    },
    {
      id: 'encava',
      name: 'LA ENCAVA',
      sub: 'ENT-610 El Pelotero • Veloz',
      hex: '#f06292',
      accent: 0xf06292,
      maxSpd: 630,
      accel: 360,
      turn: 1.62,
      driftB: 1.1,
      mass: 1.5,
      offMul: 0.8,
      horn: 195,
      stats: [5, 3, 3, 5],
    },
    {
      id: 'machito',
      name: 'EL MACHITO 4x4',
      sub: 'Serie 70 Vinotinto • Todo Terreno',
      hex: '#e53935',
      accent: 0xe53935,
      maxSpd: 610,
      accel: 395,
      turn: 1.7,
      driftB: 1.18,
      mass: 1.35,
      offMul: 0.96,
      horn: 250,
      stats: [4, 4, 4, 5],
    },
  ];

  const ITEMS = [
    { id: 'mango', asset: 'item_mango', short: 'MANGO BAJITO', col: '#ffb700', desc: '¡RESCATA PISO!' },
    { id: 'arepa', asset: 'item_arepa', short: 'AREPA VOLADORA', col: '#f5deb3', desc: 'Disparo frontal' },
    { id: 'reina', asset: 'item_reina', short: 'REINA PEPIADA', col: '#76ff03', desc: 'Persigue al rival' },
    { id: 'malta', asset: 'item_malta', short: 'MALTA TURBO', col: '#ff9800', desc: '¡Súper Turbo!' },
    { id: 'fiscal', asset: 'item_fiscal', short: 'EL FISCAL', col: '#00b0ff', desc: 'Persigue al 1° lugar' },
    { id: 'bajon', asset: 'item_bajon', short: 'BAJÓN LUZ', col: '#00e5ff', desc: '¡CSM SE FUE LA LUZ!' },
    { id: 'alma', asset: 'item_alma', short: 'ESTRELLA VE', col: '#ffe600', desc: 'Invencible + Velocidad' },
  ];

  const ITEM_MAP = {};
  for (const it of ITEMS) ITEM_MAP[it.id] = it;

  const MODES = [
    {
      id: 'gp',
      name: 'COPA VENEZUELA (GP)',
      short: 'COPA VE',
      desc: 'Carrera 3D a 3 vueltas por Caracas, Maracaibo, Los Llanos y el Salto Ángel.',
      laps: 3,
    },
    {
      id: 'ko',
      name: 'EL ÚLTIMO PAGA LA CURDA',
      short: 'CURDA KO',
      desc: 'Eliminación directa: cada 25 s queda fuera el que vaya de último.',
      laps: 9,
    },
    {
      id: 'tt',
      name: 'FIEBRE DEL VIERNES',
      short: 'RELOJ',
      desc: 'Contrarreloj 3D a 3 vueltas con 3 Maltas Bien Frías de arranque.',
      laps: 3,
    },
  ];

  // =========================================================================
  // GENERADOR DE ASSETS PIXEL-ART ESTILO JAVA / 16-BIT (PANORAMA, EDIFICIOS, AUTOS, ÍTEMS)
  // =========================================================================
  const ASSETS = Object.create(null);

  function createPixelCanvas(w, h, drawFn) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const px = (x, y, pw, ph, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(M_round(x), M_round(y), M_max(1, M_round(pw)), M_max(1, M_round(ph)));
    };
    const disc = (cx, cy, rx, ry, col) => {
      ctx.fillStyle = col;
      for (let dy = -M_ceil(ry); dy <= M_ceil(ry); dy++) {
        const ny = dy / ry;
        if (M_abs(ny) > 1) continue;
        const hw = M_round(rx * M_sqrt(1 - ny * ny));
        if (hw > 0) ctx.fillRect(M_round(cx - hw), M_round(cy + dy), hw * 2, 1);
      }
    };
    drawFn(ctx, px, disc);
    return c;
  }

  const ZONES = [
    { name: 'CARACAS • EL ÁVILA', sky: 'sky_0', g1: '#11381f', g2: '#0d2b18', col: '#39ff14' },
    { name: 'PUENTE DE MARACAIBO', sky: 'sky_1', g1: '#0c2c3d', g2: '#081f2c', col: '#00e5ff' },
    { name: 'LOS LLANOS • SABANA', sky: 'sky_2', g1: '#2d2912', g2: '#211d0b', col: '#ffab00' },
    { name: 'CANAIMA • SALTO ÁNGEL', sky: 'sky_3', g1: '#0e3628', g2: '#09261c', col: '#ff6ec7' },
  ];

  function buildAllPixelAssets() {
    if (ASSETS.sky_0) return;

    const drawTree = (px, disc, tx, by, crownCol1, crownCol2, hiCol) => {
      px(tx - 3, by - 28, 6, 28, '#3e2723');
      disc(tx, by - 40, 20, 18, '#090d16');
      disc(tx - 6, by - 38, 13, 12, crownCol1);
      disc(tx + 6, by - 38, 13, 12, crownCol1);
      disc(tx, by - 44, 16, 14, crownCol2);
      disc(tx - 4, by - 49, 9, 8, hiCol);
    };

    const drawGreenSign = (px, sx, sy) => {
      px(sx + 10, sy + 28, 5, 34, '#94a3b8');
      px(sx + 65, sy + 28, 5, 34, '#94a3b8');
      px(sx - 2, sy - 2, 84, 34, '#090d16');
      px(sx, sy, 80, 30, '#f8fafc');
      px(sx + 2, sy + 2, 76, 26, '#007a33');
      px(sx + 4, sy + 4, 72, 3, '#ffd700');
      px(sx + 6, sy + 10, 42, 4, '#ffffff');
      px(sx + 6, sy + 17, 54, 3, '#fde047');
      px(sx + 6, sy + 22, 36, 3, '#e2e8f0');
      px(sx + 64, sy + 10, 6, 12, '#ffffff');
      px(sx + 61, sy + 13, 12, 4, '#ffffff');
    };

    // 1A. ZONA 0 — CARACAS • EL ÁVILA • TELEFÉRICO • ESFERA DE SOTO • PARQUE CENTRAL (800x300)
    ASSETS.sky_0 = createPixelCanvas(800, 300, (ctx, px, disc) => {
      const g = ctx.createLinearGradient(0, 0, 0, 300);
      g.addColorStop(0, '#070b1a');
      g.addColorStop(0.5, '#111b38');
      g.addColorStop(1, '#26324d');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 800, 300);

      for (let i = 0; i < 45; i++) {
        px((i * 137) % 800, (i * 53) % 115, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1, '#e2e8f0');
      }
      disc(510, 50, 24, 24, '#e2e8f0');
      disc(504, 46, 5, 4, '#cbd5e1');

      // Silueta de El Ávila
      ctx.fillStyle = '#0f231e';
      ctx.beginPath();
      ctx.moveTo(0, 300);
      for (const [x, y] of [[0, 190], [110, 128], [220, 96], [340, 148], [470, 112], [610, 154], [730, 126], [800, 185]]) {
        ctx.lineTo(x, y);
      }
      ctx.lineTo(800, 300);
      ctx.fill();

      // Hotel Humboldt en la cima del Ávila + Guaya y Cabinas del Teleférico
      px(214, 58, 14, 46, '#b45309');
      px(216, 60, 10, 42, '#f59e0b');
      px(212, 72, 18, 5, '#fef08a');
      px(220, 42, 2, 16, '#f8fafc');
      ctx.strokeStyle = 'rgba(226,232,240,0.65)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(40, 195);
      ctx.lineTo(220, 66);
      ctx.lineTo(440, 175);
      ctx.stroke();
      for (const [cx, cy, col] of [[110, 145, '#ef4444'], [168, 104, '#facc15'], [315, 118, '#ef4444']]) {
        px(cx, cy - 6, 2, 6, '#e2e8f0');
        px(cx - 7, cy, 16, 10, '#090d16');
        px(cx - 6, cy + 1, 14, 8, col);
        px(cx - 4, cy + 2, 10, 4, '#bae6fd');
      }

      // Skyline de Caracas y Torres de Parque Central
      const blds = [
        [18, 46, 76, '#1b1938'], [72, 44, 68, '#231f42'], [238, 46, 142, '#1e1b3a'], [290, 46, 142, '#1e1b3a'],
        [346, 54, 84, '#262147'], [412, 48, 72, '#191833'], [545, 58, 86, '#311b54'], [612, 88, 132, '#2e1a47'],
      ];
      for (const [bx, bw, bh, bCol] of blds) {
        const by = 296 - bh;
        px(bx, by, bw, bh, '#090b16');
        px(bx + 2, by + 2, bw - 4, bh - 2, bCol);
        for (let wy = by + 8; wy < 278; wy += 9) {
          for (let wx = bx + 6; wx < bx + bw - 8; wx += 8) {
            if ((wx + wy) % 3 !== 0) px(wx, wy, 4, 4, '#fde047');
          }
        }
      }
      // Antenas de Parque Central
      px(260, 130, 2, 24, '#e2e8f0');
      px(312, 130, 2, 24, '#e2e8f0');

      // Esfera de Jesús Soto (estructura blanca + esfera óptica naranja/amarilla con líneas)
      px(142, 236, 48, 60, '#e2e8f0');
      px(146, 240, 40, 56, '#111b38');
      disc(166, 268, 20, 20, 'rgba(255,109,0,0.3)');
      for (let x = 150; x <= 182; x += 3) {
        const dx = (x - 166) / 17;
        const hh = M_round(M_sqrt(M_max(0, 1 - dx * dx)) * 17);
        px(x, 268 - hh, 2, hh * 2, x % 6 === 0 ? '#fde047' : '#ff6d00');
      }

      drawTree(px, disc, 492, 296, '#143818', '#1b5e20', '#43a047');
      drawGreenSign(px, 706, 236);
      px(0, 295, 800, 5, '#091410');
    });

    // 1B. ZONA 1 — PUENTE SOBRE EL LAGO DE MARACAIBO + RELÁMPAGO DEL CATATUMBO (800x300)
    ASSETS.sky_1 = createPixelCanvas(800, 300, (ctx, px, disc) => {
      const g = ctx.createLinearGradient(0, 0, 0, 300);
      g.addColorStop(0, '#09061c');
      g.addColorStop(0.55, '#1e1342');
      g.addColorStop(0.82, '#3b1d5e');
      g.addColorStop(1, '#0c2c3d');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 800, 300);

      // Relámpago del Catatumbo iluminando el cielo zuliano
      disc(620, 78, 70, 28, 'rgba(0, 229, 255, 0.22)');
      ctx.strokeStyle = '#7ef9ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(620, 32);
      ctx.lineTo(604, 68);
      ctx.lineTo(626, 76);
      ctx.lineTo(596, 128);
      ctx.stroke();

      // Agua del Lago de Maracaibo al fondo con reflejos dorados
      px(0, 246, 800, 50, '#082032');
      for (let rx = 20; rx < 780; rx += 55) {
        px(rx, 258 + (rx % 14), 28, 2, '#38bdf8');
        px(rx + 10, 272 + (rx % 10), 22, 2, '#facc15');
      }

      // Pilones de concreto y guayas del Puente Gral. Rafael Urdaneta
      const towers = [110, 275, 440, 605];
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      for (const tx of towers) {
        for (const off of [-68, -44, -22, 22, 44, 68]) {
          ctx.beginPath();
          ctx.moveTo(tx, 128);
          ctx.lineTo(tx + off, 232);
          ctx.stroke();
        }
        // Pila en A del puente
        px(tx - 14, 120, 8, 136, '#cbd5e1');
        px(tx + 6, 120, 8, 136, '#94a3b8');
        px(tx - 16, 118, 32, 8, '#e2e8f0');
        px(tx - 12, 162, 24, 6, '#cbd5e1');
        px(tx - 12, 202, 24, 6, '#cbd5e1');
        px(tx - 3, 112, 6, 6, '#ff1744');
      }
      // Tablero vial del puente sobre el lago
      px(0, 228, 800, 10, '#475569');
      px(0, 230, 800, 3, '#f8fafc');
      for (let lx = 16; lx < 790; lx += 32) px(lx, 224, 4, 4, '#fde047');

      drawGreenSign(px, 706, 236);
      px(0, 295, 800, 5, '#061520');
    });

    // 1C. ZONA 2 — LOS LLANOS • ATARDECER LLANERO • ARAGUANEYES Y CHIGÜIRES (800x300)
    ASSETS.sky_2 = createPixelCanvas(800, 300, (ctx, px, disc) => {
      const g = ctx.createLinearGradient(0, 0, 0, 300);
      g.addColorStop(0, '#2b091c');
      g.addColorStop(0.42, '#881337');
      g.addColorStop(0.75, '#ea580c');
      g.addColorStop(1, '#facc15');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 800, 300);

      // Sol gigante de los Llanos
      disc(400, 198, 66, 66, 'rgba(253, 224, 71, 0.28)');
      disc(400, 198, 48, 48, '#fef08a');

      // Sabana y esteros al horizonte
      px(0, 258, 800, 42, '#3b240b');
      px(180, 268, 420, 18, '#ca8a04');

      // Araguaneyes amarillos y palmas de moriche
      for (const ax of [68, 230, 555]) {
        drawTree(px, disc, ax, 294, '#ca8a04', '#eab308', '#fef08a');
      }
      for (const mx of [145, 330, 645]) {
        px(mx - 2, 232, 5, 62, '#451a03');
        disc(mx - 12, 232, 14, 5, '#14532d');
        disc(mx + 12, 232, 14, 5, '#14532d');
        disc(mx, 226, 16, 6, '#166534');
      }

      // Chigüires en la sabana
      for (const cx of [280, 470]) {
        disc(cx, 282, 13, 9, '#090d16');
        disc(cx, 282, 11, 7, '#8d5524');
        disc(cx + 9, 278, 7, 6, '#a16207');
        px(cx + 12, 276, 2, 2, '#090d16');
      }

      drawGreenSign(px, 706, 236);
      px(0, 295, 800, 5, '#1f1608');
    });

    // 1D. ZONA 3 — CANAIMA • TEPUYES • SALTO ÁNGEL (800x300)
    ASSETS.sky_3 = createPixelCanvas(800, 300, (ctx, px, disc) => {
      const g = ctx.createLinearGradient(0, 0, 0, 300);
      g.addColorStop(0, '#061a23');
      g.addColorStop(0.5, '#0f4c5c');
      g.addColorStop(0.85, '#7c2d12');
      g.addColorStop(1, '#f59e0b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 800, 300);

      // Tepuyes de cumbre plana (Auyántepuy y Roraima)
      const tepuys = [
        [25, 136, 175, '#3b1c32', '#581c4f'],
        [240, 82, 240, '#2e152b', '#4a1d3d'],
        [520, 124, 180, '#3b1c32', '#581c4f'],
      ];
      for (const [tx, ty, tw, c1, c2] of tepuys) {
        px(tx - 8, ty, tw + 16, 300 - ty, '#090d16');
        px(tx, ty + 4, tw, 300 - ty, c1);
        px(tx + 8, ty + 4, tw - 16, 10, '#15803d');
        for (let sy = ty + 24; sy < 280; sy += 22) {
          px(tx + 6, sy, tw - 12, 5, c2);
        }
      }

      // Cascada del Salto Ángel cayendo desde el Auyántepuy central + bruma
      px(348, 86, 18, 198, 'rgba(186, 230, 253, 0.45)');
      px(352, 86, 10, 198, '#f8fafc');
      px(355, 86, 4, 198, '#38bdf8');
      disc(357, 278, 46, 16, 'rgba(224, 242, 254, 0.75)');
      disc(357, 282, 28, 10, '#ffffff');

      // Laguna de Canaima y palmas de moriche
      px(0, 278, 800, 20, '#7c2d12');
      px(120, 284, 520, 8, '#38bdf8');
      drawTree(px, disc, 195, 294, '#064e3b', '#047857', '#34d399');
      drawTree(px, disc, 505, 294, '#064e3b', '#047857', '#34d399');

      drawGreenSign(px, 706, 236);
      px(0, 295, 800, 5, '#062016');
    });

    // 2. MOJÓN REFLECTIVO + CARTEL VIAL VERDE VENEZOLANO DE AUTOPISTA
    ASSETS.prop_post = createPixelCanvas(16, 36, (ctx, px) => {
      px(4, 4, 8, 30, '#090d16');
      px(5, 6, 6, 26, '#cbd5e1');
      px(5, 9, 6, 7, '#ef4444');
      px(6, 11, 4, 3, '#fef08a');
    });

    ASSETS.prop_sign = createPixelCanvas(84, 64, (ctx, px) => {
      drawGreenSign(px, 2, 2);
    });

    // 3. CAJA DE PODER / CUBO ARCADE BISELADO EN PIXEL-ART (2 FRAMES DE BRILLO)
    for (let f = 0; f < 2; f++) {
      ASSETS['item_box_' + f] = createPixelCanvas(36, 36, (ctx, px) => {
        // Sombra exterior y borde negro grueso de cubo biselado
        px(4, 2, 28, 32, '#090d16');
        px(2, 4, 32, 28, '#090d16');
        // Cara superior en perspectiva 3D
        px(6, 4, 24, 6, f === 0 ? '#fef08a' : '#7ef9ff');
        px(8, 5, 20, 4, '#ffd700');
        // Cuerpo frontal del cubo con franjas luminosas venezolanas y bisel metálico
        px(5, 10, 26, 22, '#1e293b');
        px(7, 11, 22, 6, '#eab308');
        px(7, 17, 22, 7, '#1d4ed8');
        px(7, 24, 22, 6, '#dc2626');
        // Marco interior brillante
        px(6, 10, 24, 2, '#ffffff');
        px(6, 10, 2, 20, '#ffffff');
        px(28, 10, 2, 20, '#94a3b8');
        px(6, 29, 24, 2, '#94a3b8');
        // Signo "?" pixel-art nítido en el centro con sombra
        px(14, 13, 9, 3, '#090d16');
        px(20, 15, 4, 5, '#090d16');
        px(16, 18, 6, 4, '#090d16');
        px(16, 24, 5, 4, '#090d16');

        px(13, 12, 9, 3, '#ffffff');
        px(19, 14, 4, 5, '#ffffff');
        px(15, 17, 6, 4, '#ffffff');
        px(15, 23, 5, 4, f === 0 ? '#ffffff' : '#fef08a');
      });
    }

    // 4. PODERES VENEZOLANOS EN PIXEL-ART REDONDEADO Y DETALLADO (28x28)
    ASSETS.item_arepa = createPixelCanvas(28, 28, (ctx, px, disc) => {
      disc(14, 14, 12, 10, '#090d16');
      disc(14, 15, 10, 8, '#c68642');
      disc(14, 13, 10, 8, '#f5deb3');
      disc(14, 12, 8, 6, '#fff3d1');
      px(6, 13, 16, 3, '#ffffff');
      px(8, 15, 12, 2, '#fff9c4');
      px(10, 9, 8, 2, '#8d5524');
      px(9, 12, 10, 1, '#8d5524');
      px(11, 16, 6, 1, '#8d5524');
    });

    ASSETS.item_reina = createPixelCanvas(28, 28, (ctx, px, disc) => {
      disc(14, 14, 12, 10, '#090d16');
      disc(14, 16, 10, 7, '#d99b66');
      disc(14, 14, 11, 6, '#64dd17');
      disc(11, 14, 3, 2, '#ffd600');
      disc(17, 15, 3, 2, '#ffd600');
      disc(14, 13, 2, 2, '#ffffff');
      disc(14, 10, 10, 6, '#f5deb3');
      px(10, 8, 8, 2, '#8d5524');
      px(11, 11, 6, 1, '#8d5524');
    });

    ASSETS.item_mango = createPixelCanvas(28, 28, (ctx, px, disc) => {
      disc(14, 16, 10, 9, '#090d16');
      disc(17, 19, 6, 5, '#090d16');
      disc(13, 15, 8, 7, '#ff9100');
      disc(12, 13, 6, 5, '#ff1744');
      disc(16, 18, 5, 4, '#ffd600');
      disc(11, 12, 2, 2, '#ffffff');
      px(13, 4, 2, 4, '#3e2723');
      disc(18, 6, 5, 2, '#2e7d32');
      disc(18, 6, 3, 1, '#69f0ae');
    });

    ASSETS.item_malta = createPixelCanvas(28, 28, (ctx, px, disc) => {
      px(10, 2, 8, 3, '#ffd700');
      px(10, 5, 8, 5, '#090d16');
      px(11, 5, 6, 5, '#4e2708');
      disc(14, 18, 7, 8, '#090d16');
      px(8, 10, 12, 15, '#090d16');
      px(9, 11, 10, 13, '#3b1a04');
      px(9, 14, 10, 6, '#e6192e');
      disc(14, 17, 4, 2, '#ffd700');
      px(12, 16, 4, 2, '#0044cc');
      px(10, 11, 2, 11, 'rgba(255,255,255,0.35)');
    });

    ASSETS.item_fiscal = createPixelCanvas(28, 28, (ctx, px) => {
      px(9, 2, 10, 5, '#090d16');
      px(10, 3, 4, 3, '#ff1744');
      px(14, 3, 4, 3, '#00e5ff');
      for (let y = 7; y <= 22; y++) {
        const hw = 3 + M_floor(((y - 7) / 15) * 7);
        px(14 - hw - 1, y, (hw + 1) * 2, 1, '#090d16');
        const st = (y >= 11 && y <= 13) || (y >= 17 && y <= 19);
        px(14 - hw, y, hw * 2, 1, st ? '#ffffff' : '#ff6d00');
      }
      px(3, 22, 22, 4, '#090d16');
      px(4, 23, 20, 2, '#ff6d00');
    });

    ASSETS.item_bajon = createPixelCanvas(28, 28, (ctx, px) => {
      px(12, 2, 10, 7, '#090d16');
      px(7, 8, 14, 6, '#090d16');
      px(9, 13, 12, 6, '#090d16');
      px(6, 18, 10, 8, '#090d16');
      px(13, 3, 8, 5, '#00e5ff');
      px(8, 9, 12, 4, '#ffe600');
      px(10, 14, 10, 4, '#ffe600');
      px(7, 19, 7, 6, '#00e5ff');
    });

    ASSETS.item_alma = createPixelCanvas(28, 28, (ctx, px, disc) => {
      disc(14, 14, 11, 11, '#090d16');
      px(11, 2, 6, 24, '#090d16');
      px(2, 10, 24, 8, '#090d16');
      px(12, 3, 4, 7, '#ffd700');
      px(4, 11, 20, 5, '#0055ff');
      px(6, 16, 16, 7, '#e6192e');
      px(11, 12, 2, 3, '#ffffff');
      px(15, 12, 2, 3, '#ffffff');
    });

    // 5. VEHÍCULOS PIXEL-ART 16-BIT ESTILO JAVA RETRO (72x50, 3 VISTAS FLUIDAS _l / _c / _r SIN CAJAS SALIENTES)
    const dirs = [
      ['l', -1],
      ['c', 0],
      ['r', 1],
    ];

    for (const [key, d] of dirs) {
      // 5A. POR PUESTO MALIBÚ AZUL CIELO (Inspirado directamente en el deportivo celeste de la referencia Java)
      ASSETS['kart_malibu_' + key] = createPixelCanvas(72, 50, (ctx, px, disc) => {
        const sTop = d * 3;
        const sMid = d * 2;
        // Cauchos traseros anchos y rueda delantera asomándose suavemente al girar
        if (d < 0) px(8, 28, 5, 12, '#090d16');
        if (d > 0) px(59, 28, 5, 12, '#090d16');
        px(10, 34, 13, 14, '#090d16');
        px(49, 34, 13, 14, '#090d16');
        px(12, 36, 9, 10, '#1e293b');
        px(51, 36, 9, 10, '#1e293b');

        // Sombra y contorno aerodinámico de cabina y guardafangos
        disc(36 + sTop, 19, 19, 10, '#090d16');
        disc(36 + sMid, 31, 27, 12, '#090d16');
        px(10 + sMid, 26, 52, 16, '#090d16');

        // Retrovisores laterales
        px(13 + sTop, 20, 5, 3, '#090d16');
        px(54 + sTop, 20, 5, 3, '#090d16');
        px(14 + sTop, 21, 3, 2, '#7dd3fc');
        px(55 + sTop, 21, 3, 2, '#7dd3fc');

        // Techo y parabrisas trasero con brillo diagonal
        disc(36 + sTop, 19, 17, 8, '#38bdf8');
        disc(36 + sTop, 20, 14, 6, '#1e3a5f');
        px(25 + sTop, 17, 22, 6, '#0f172a');
        px(27 + sTop, 18, 8, 2, '#7dd3fc');
        px(29 + sTop, 15, 14, 2, '#fde047');

        // Maletera y carrocería celeste sombreada
        px(12 + sMid, 24, 48, 15, '#0284c7');
        px(14 + sMid, 23, 44, 5, '#38bdf8');
        px(18 + sMid, 23, 36, 2, '#bae6fd');
        px(12 + sMid, 33, 48, 6, '#0369a1');

        // Faros traseros rojos esculpidos + tercer stop central
        px(29 + sMid, 26, 14, 2, '#ef4444');
        px(13 + sMid, 27, 9, 6, '#7f1d1d');
        px(50 + sMid, 27, 9, 6, '#7f1d1d');
        px(14 + sMid, 28, 7, 4, '#ff1744');
        px(51 + sMid, 28, 7, 4, '#ff1744');
        px(16 + sMid, 29, 3, 2, '#fde047');
        px(53 + sMid, 29, 3, 2, '#fde047');

        // Placa venezolana y difusor inferior con doble escape
        px(11 + sMid, 37, 50, 6, '#0f172a');
        px(28 + sMid, 35, 16, 5, '#f8fafc');
        px(28 + sMid, 35, 16, 1, '#1d4ed8');
        px(30 + sMid, 37, 12, 2, '#334155');
        px(15 + sMid, 39, 6, 3, '#64748b');
        px(51 + sMid, 39, 6, 3, '#64748b');
        px(16 + sMid, 40, 4, 2, '#090d16');
        px(52 + sMid, 40, 4, 2, '#090d16');
      });

      // 5B. MOTORIZADO BERA SBR 150 + CASCO SANDOVAL (Se inclina con fluidez en las curvas)
      ASSETS['kart_bera_' + key] = createPixelCanvas(72, 50, (ctx, px, disc) => {
        const lean = d * 5;
        if (d !== 0) {
          const fx = 36 + d * 10;
          px(fx - 3, 30, 7, 13, '#090d16');
          px(fx - 1, 32, 3, 9, '#94a3b8');
          px(fx - 2, 21, 4, 10, '#cbd5e1');
          px(fx + d * 2 - 2, 18, 4, 4, '#ffe600');
        }
        disc(36 + lean, 9, 7, 5, '#090d16');
        disc(36 + lean, 9, 6, 4, '#1c1c1c');
        px(34 + lean, 6, 4, 2, '#64748b');
        px(30 + lean, 13, 12, 4, '#d99b66');
        px(33 + lean, 16, 6, 3, '#c68642');
        px(20 + lean, 17, 5, 3, '#090d16');
        px(47 + lean, 17, 5, 3, '#090d16');
        px(22 + lean, 22, 28, 2, '#cbd5e1');
        px(23 + lean, 20, 5, 4, '#d99b66');
        px(44 + lean, 20, 5, 4, '#d99b66');
        px(28 + lean, 18, 16, 11, '#090d16');
        px(29 + lean, 19, 14, 9, '#212121');
        px(31 + lean, 21, 10, 2, '#ffd700');
        px(31 + lean, 23, 10, 2, '#0055ff');
        px(31 + lean, 25, 10, 2, '#e6192e');
        px(27 + d * 2, 28, 5, 10, '#0d47a1');
        px(40 + d * 2, 28, 5, 10, '#0d47a1');
        px(29, 27, 14, 4, '#090d16');
        px(30, 26, 12, 6, '#0088ff');
        px(33, 28, 6, 3, '#ff1744');
        px(40, 35, 5, 6, '#e2e8f0');
        px(31, 32, 2, 7, '#ffd600');
        px(39, 32, 2, 7, '#ffd600');
        px(32, 31, 8, 16, '#090d16');
        px(34, 33, 4, 12, '#37474f');
      });

      // 5C. LA ENCAVA ENT-610 "EL PELOTERO" (Contorneada en 16-bit con techo curvo y perspectiva suave sin puertas abiertas)
      ASSETS['kart_encava_' + key] = createPixelCanvas(72, 50, (ctx, px, disc) => {
        const sTop = d * 3;
        const sMid = d * 1.5;

        // Ruedas dobles traseras
        px(13, 36, 12, 12, '#090d16');
        px(47, 36, 12, 12, '#090d16');
        px(15, 38, 6, 8, '#94a3b8');
        px(51, 38, 6, 8, '#94a3b8');

        // Techo abovedado y carrocería con esquinas redondeadas
        disc(36 + sTop, 10, 22, 6, '#090d16');
        px(13 + sMid, 8, 46, 32, '#090d16');
        disc(36 + sTop, 10, 20, 4, '#f8fafc');
        px(15 + sMid, 10, 42, 14, '#f8fafc');
        px(15 + sMid, 24, 42, 6, '#0055ff');
        px(15 + sMid, 30, 42, 8, '#f06292');

        // Retrovisores altos de autobús
        px(9 + sTop, 11, 4, 8, '#090d16');
        px(59 + sTop, 11, 4, 8, '#090d16');
        px(10 + sTop, 12, 2, 6, '#e2e8f0');
        px(60 + sTop, 12, 2, 6, '#e2e8f0');

        // 5 luces de gálibo en el techo
        for (let x = 20; x <= 52; x += 8) {
          px(x + sTop, 8, 3, 2, x === 36 ? '#39ff14' : '#ff3d00');
        }

        // Parabrisas trasero panorámico con calcomanía "EL PELOTERO"
        px(18 + sTop, 12, 36, 11, '#0f172a');
        px(20 + sTop, 13, 12, 4, '#e6192e');
        px(21 + sTop, 14, 10, 2, '#ffffff');
        px(44 + sTop, 13, 7, 4, '#ffe600');
        px(22 + sTop, 18, 28, 3, '#ff007f');
        px(25 + sTop, 19, 22, 2, '#00e5ff');

        // Luces traseras triples + placa + parachoques cromado
        px(16 + sMid, 31, 9, 5, '#ff1744');
        px(47 + sMid, 31, 9, 5, '#ff1744');
        px(25 + sMid, 31, 4, 5, '#ffab00');
        px(43 + sMid, 31, 4, 5, '#ffab00');
        px(32 + sMid, 31, 8, 5, '#ffffff');
        px(13 + sMid, 37, 46, 4, '#cbd5e1');
        px(15 + sMid, 38, 42, 2, '#f8fafc');
      });

      // 5D. EL MACHITO 4x4 SERIE 70 VINOTINTO (Guardafangos anchos, caucho de repuesto y snorkel sin cajas laterales)
      ASSETS['kart_machito_' + key] = createPixelCanvas(72, 50, (ctx, px, disc) => {
        const sTop = d * 3;
        const sMid = d * 2;

        // Cauchos 4x4 anchos con guardabarros
        px(10, 32, 14, 16, '#090d16');
        px(48, 32, 14, 16, '#090d16');
        px(13, 35, 7, 10, '#475569');
        px(52, 35, 7, 10, '#475569');
        px(21, 38, 4, 5, '#facc15');
        px(47, 38, 4, 5, '#facc15');

        // Parrilla de techo + Snorkel
        px(51 + sTop, 6, 4, 18, '#090d16');
        px(20 + sTop, 6, 32, 3, '#1e293b');
        px(22 + sTop, 5, 7, 3, '#ff1744');
        px(41 + sTop, 5, 7, 3, '#00b0ff');

        // Cabina y carrocería vinotinto con franja dorada
        px(16 + sTop, 9, 40, 15, '#090d16');
        px(12 + sMid, 22, 48, 16, '#090d16');
        px(18 + sTop, 11, 36, 13, '#881337');
        px(14 + sMid, 23, 44, 13, '#9f1239');
        px(14 + sMid, 25, 44, 2, '#fbbf24');

        // Ventanas traseras dobles de Machito
        px(20 + sTop, 12, 15, 10, '#0f172a');
        px(38 + sTop, 12, 14, 10, '#0f172a');
        px(22 + sTop, 14, 6, 2, '#7dd3fc');

        // Faros traseros, parachoques de hierro y caucho de repuesto
        px(15 + sMid, 28, 8, 5, '#ff1744');
        px(49 + sMid, 28, 8, 5, '#ff1744');
        px(12 + sMid, 34, 48, 5, '#cbd5e1');
        disc(41 + sMid, 27, 8, 8, '#090d16');
        disc(41 + sMid, 27, 6, 6, '#1e293b');
        disc(41 + sMid, 27, 3, 3, '#cbd5e1');
      });
    }
  }

  // =========================================================================
  // SINTETIZADOR MUSICAL VENEZOLANO PRO: ARPA / STEELPAN + CUATRO + TUMBAO + MARACAS
  // =========================================================================
  class ArcadeSynth {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.step = 0;
      this.nextT = 0;
    }

    init() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    m2f(m) {
      return 440 * Math.pow(2, (m - 69) / 12);
    }

    voice(freq, t0, dur, type = 'triangle', vol = 0.06, cut = 2600, endCut = 0) {
      if (this.muted || !this.ctx || freq <= 0) return;
      try {
        const o = this.ctx.createOscillator();
        const flt = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t0);
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(cut, t0);
        if (endCut > 0) flt.frequency.exponentialRampToValueAtTime(endCut, t0 + dur);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + M_max(0.04, dur));
        o.connect(flt);
        flt.connect(g);
        g.connect(this.ctx.destination);
        o.start(t0);
        o.stop(t0 + dur + 0.02);
      } catch (_) {}
    }

    // Lead melódico brillante con doble oscilador desafinado + eco slapback estilo Mario Kart 64
    lead(midi, t0, dur, vol = 0.068) {
      const f = this.m2f(midi);
      this.voice(f, t0, dur, 'sawtooth', vol * 0.65, 3600, 1300);
      this.voice(f * 1.003, t0, dur, 'triangle', vol * 0.85, 3200, 1500);
      this.voice(f * 2, t0, dur * 0.45, 'sine', vol * 0.3, 4200);
      this.voice(f, t0 + 0.085, dur * 0.55, 'triangle', vol * 0.25, 1800);
    }

    // Rasgueo de Cuatro Venezolano (acorde arpegiado en 12 ms)
    strum(rootMidi, minor, t0, dur, vol = 0.028) {
      const third = minor ? 3 : 4;
      const notes = [rootMidi + 12, rootMidi + 12 + third, rootMidi + 19];
      for (let i = 0; i < 3; i++) {
        this.voice(this.m2f(notes[i]), t0 + i * 0.011, dur, 'sawtooth', vol, 2400, 900);
      }
    }

    drum(kind, t0, vol = 0.05) {
      if (this.muted || !this.ctx) return;
      try {
        if (kind === 'k') {
          const o = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(145, t0);
          o.frequency.exponentialRampToValueAtTime(38, t0 + 0.11);
          g.gain.setValueAtTime(vol * 1.5, t0);
          g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
          o.connect(g);
          g.connect(this.ctx.destination);
          o.start(t0);
          o.stop(t0 + 0.13);
        } else if (kind === 'b') {
          this.voice(860, t0, 0.055, 'square', vol * 0.42, 2400);
          this.voice(575, t0, 0.055, 'triangle', vol * 0.35, 1900);
        } else {
          const dur = kind === 's' ? 0.085 : 0.03;
          const len = M_max(1, M_floor(this.ctx.sampleRate * dur));
          const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < len; i++) d[i] = (M_rand() * 2 - 1) * Math.pow(1 - i / len, 1.7);
          const src = this.ctx.createBufferSource();
          src.buffer = buf;
          const flt = this.ctx.createBiquadFilter();
          flt.type = kind === 's' ? 'bandpass' : 'highpass';
          flt.frequency.value = kind === 's' ? 1450 : 5600;
          const g = this.ctx.createGain();
          g.gain.value = vol;
          src.connect(flt);
          flt.connect(g);
          g.connect(this.ctx.destination);
          src.start(t0);
        }
      } catch (_) {}
    }

    tone(f1, f2, dur = 0.1, type = 'triangle', vol = 0.08, delay = 0) {
      this.init();
      if (this.muted || !this.ctx) return;
      try {
        const t0 = this.ctx.currentTime + delay;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f1, t0);
        if (f2 && f2 !== f1) o.frequency.exponentialRampToValueAtTime(M_max(25, f2), t0 + dur);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start(t0);
        o.stop(t0 + dur + 0.02);
      } catch (_) {}
    }

    sfx(type, freq = 300) {
      switch (type) {
        case 'move':
          this.tone(520, 740, 0.05, 'triangle', 0.06);
          break;
        case 'select':
          this.tone(523, 659, 0.08, 'triangle', 0.08);
          this.tone(659, 1046, 0.14, 'triangle', 0.08, 0.06);
          break;
        case 'count':
          this.tone(440, 440, 0.14, 'sine', 0.1);
          break;
        case 'go':
          this.tone(880, 1174, 0.3, 'triangle', 0.12);
          break;
        case 'box':
          [523, 659, 784, 1046].forEach((n, i) => this.tone(n, n * 1.06, 0.06, 'sine', 0.07, i * 0.045));
          break;
        case 'itemReady':
          this.tone(784, 1046, 0.12, 'triangle', 0.09);
          break;
        case 'boost':
          this.tone(180, 920, 0.32, 'sawtooth', 0.09);
          this.tone(360, 1240, 0.28, 'triangle', 0.08, 0.03);
          break;
        case 'hop':
          this.tone(280, 520, 0.08, 'sine', 0.07);
          break;
        case 'trick':
          [587, 784, 987, 1174].forEach((n, i) => this.tone(n, n, 0.07, 'triangle', 0.09, i * 0.04));
          break;
        case 'throw':
          this.tone(680, 260, 0.12, 'triangle', 0.08);
          break;
        case 'hit':
          this.tone(180, 52, 0.28, 'sawtooth', 0.11);
          break;
        case 'thunder':
          this.tone(120, 38, 0.4, 'sawtooth', 0.12);
          this.tone(920, 160, 0.22, 'square', 0.07, 0.04);
          break;
        case 'horn':
          this.tone(freq, freq * 1.03, 0.12, 'sawtooth', 0.08);
          this.tone(freq * 1.25, freq * 1.28, 0.16, 'sawtooth', 0.08, 0.08);
          break;
        case 'wall':
          this.tone(130, 75, 0.07, 'triangle', 0.05);
          break;
        case 'win':
          [523, 659, 784, 1046, 784, 1046].forEach((n, i) =>
            this.tone(n, n, 0.13, 'triangle', 0.09, i * 0.1)
          );
          break;
      }
    }

    tickMusic(isRacing, isFinalLap = false) {
      if (!this.ctx || this.ctx.state !== 'running' || this.muted) return;
      const stepSec = isRacing ? (isFinalLap ? 0.098 : 0.108) : 0.125;
      const now = this.ctx.currentTime;
      if (this.nextT < now - 0.2 || this.nextT === 0) this.nextT = now + 0.02;

      // Parte A: Calypso de El Callao / Fiesta Venezolana (muy pegajoso y alegre)
      const MELODY_A = [
        [0, 76, 2], [2, 79, 2], [4, 84, 3], [7, 83, 1], [8, 81, 2], [10, 79, 2], [12, 76, 2], [14, 79, 2],
        [16, 77, 2], [18, 81, 2], [20, 86, 3], [23, 84, 1], [24, 83, 2], [26, 79, 2], [28, 74, 4],
        [32, 76, 2], [34, 79, 2], [36, 84, 2], [38, 88, 2], [40, 86, 2], [42, 84, 2], [44, 81, 2], [46, 79, 2],
        [48, 77, 2], [50, 81, 2], [52, 83, 2], [54, 86, 2], [56, 84, 4], [60, 79, 2], [62, 84, 2],
      ];

      // Parte B: Pajarillo / Alma Llanera en Arpa Sintetizada
      const MELODY_B = [
        [0, 81, 3], [3, 83, 1], [4, 84, 2], [6, 88, 2], [8, 86, 2], [10, 84, 2], [12, 83, 2], [14, 80, 2],
        [16, 81, 2], [18, 76, 2], [20, 72, 2], [22, 76, 2], [24, 80, 2], [26, 83, 2], [28, 86, 3], [31, 84, 1],
        [32, 83, 2], [34, 86, 2], [36, 89, 3], [39, 88, 1], [40, 86, 2], [42, 84, 2], [44, 83, 2], [46, 81, 2],
        [48, 80, 2], [50, 83, 2], [52, 86, 2], [54, 88, 2], [56, 81, 4], [60, 81, 3],
      ];

      while (this.nextT < now + 0.16) {
        const t = this.nextT;
        const seq = this.step % 128;
        const isPartB = isRacing && seq >= 64;
        const loc = seq % 64;
        const bar = seq % 16;

        if (!isPartB) {
          for (const n of MELODY_A) {
            if (n[0] === loc) {
              this.lead(n[1], t, n[2] * stepSec * 0.9, 0.062);
              break;
            }
          }
          const ch = loc < 16 ? [48, 0] : loc < 32 ? [43, 0] : loc < 48 ? [45, 1] : [41, 0];
          const bRoot = ch[0];
          if (bar === 0 || bar === 3 || bar === 6 || bar === 10 || bar === 12) {
            const bn = bar === 6 ? bRoot + 7 : bar === 10 ? bRoot + 4 : bRoot;
            this.voice(this.m2f(bn), t, stepSec * 1.9, 'triangle', 0.1, 920);
            this.voice(this.m2f(bn + 12), t, stepSec * 1.2, 'square', 0.025, 800);
          }
          if (bar === 2 || bar === 5 || bar === 10 || bar === 14) {
            this.strum(bRoot + 12, ch[1] === 1, t, stepSec * 0.75, 0.026);
          }
          if (bar === 0 || bar === 6 || bar === 8 || bar === 14) this.drum('k', t, 0.065);
          if (bar === 0 || bar === 3 || bar === 6 || bar === 11 || bar === 14) this.drum('b', t, 0.045);
          if (bar === 4 || bar === 12) this.drum('s', t, 0.042);
          this.drum('h', t, bar % 2 === 1 ? 0.028 : 0.014);
        } else {
          for (const n of MELODY_B) {
            if (n[0] === loc) {
              this.lead(n[1], t, n[2] * stepSec * 0.88, 0.066);
              break;
            }
          }
          const ch = loc < 16 ? [45, 1] : loc < 32 ? [40, 0] : loc < 48 ? [38, 1] : [40, 0];
          const jRoot = ch[0];
          if (bar === 0 || bar === 4 || bar === 6 || bar === 10 || bar === 12) {
            const bn = bar === 6 || bar === 12 ? jRoot + 7 : jRoot;
            this.voice(this.m2f(bn), t, stepSec * 1.8, 'triangle', 0.105, 920);
          }
          if (bar === 2 || bar === 4 || bar === 8 || bar === 10 || bar === 14) {
            this.strum(jRoot + 12, ch[1] === 1, t, stepSec * 0.65, 0.028);
          }
          if (bar === 0 || bar === 6 || bar === 12) this.drum('k', t, 0.065);
          if (bar === 4 || bar === 10 || bar === 14) this.drum('s', t, 0.044);
          this.drum('h', t, bar % 2 === 0 ? 0.032 : 0.018);
        }

        this.nextT += stepSec;
        this.step++;
      }
    }
  }

  const sfx = new ArcadeSynth();

  // =========================================================================
  // AUTOPISTA 3D CON CURVAS AFINCADAS, COLINAS Y MINIMAPA DE CIRCUITO GP REAL
  // =========================================================================
  const SEG_LEN = 60;
  const ROAD_W = 350;
  const DRAW_SEGS = 110;
  const RUMBLE_SEGS = 4;
  const CAM_H = 420;
  const CAM_DIST = 0.84;
  const CAM_BEHIND = 310;
  const NEAR_Z = 45;

  const segments = [];
  let TOTAL_SEGS = 0;
  let TRACK_LEN = 0;
  const miniMapPts = [];

  function buildTrack3D() {
    segments.length = 0;

    function addRoad(enter, hold, leave, curve, endYDelta) {
      const startY = segments.length ? segments[segments.length - 1].y : 0;
      const endY = startY + endYDelta;
      const total = enter + hold + leave;
      for (let n = 0; n < enter; n++) addSeg(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total));
      for (let n = 0; n < hold; n++) addSeg(curve, easeInOut(startY, endY, (enter + n) / total));
      for (let n = 0; n < leave; n++)
        addSeg(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
    }

    function addSeg(curve, y) {
      const idx = segments.length;
      segments.push({ idx, z: idx * SEG_LEN, y, curve, zone: 0, props: [], boost: false, ramp: false });
    }

    // Zona 0 (Caracas): Recta de salida + Chicana de Parque Central + Curva afincada de El Ávila
    addRoad(8, 14, 8, 0, 0);
    addRoad(10, 22, 10, 3.7, 260);
    addRoad(10, 24, 10, -4.2, -260);

    // Zona 1 (Puente de Maracaibo): Curvón sobre el Lago + Horquilla del Catatumbo
    addRoad(12, 24, 12, 3.4, 320);
    addRoad(10, 22, 10, -3.9, -150);
    addRoad(10, 20, 10, 4.3, -170);

    // Zona 2 (Los Llanos): Doble curva cerrada entre Araguaneyes + S rápida llanera
    addRoad(10, 22, 10, -4.4, 240);
    addRoad(10, 22, 10, 4.0, -240);
    addRoad(8, 16, 8, -3.1, 0);

    // Zona 3 (Canaima / Salto Ángel): Horquilla de los Tepuyes + Rampa del Salto Ángel
    addRoad(10, 22, 10, 4.5, 290);
    addRoad(10, 22, 10, -4.1, -290);
    addRoad(8, 14, 8, 2.4, 0);

    TOTAL_SEGS = segments.length;
    TRACK_LEN = TOTAL_SEGS * SEG_LEN;

    for (let i = 0; i < TOTAL_SEGS; i++) {
      const seg = segments[i];
      const z = M_floor((i / TOTAL_SEGS) * 4);
      seg.zone = z;

      if (i === 32 || i === 198 || i === 355) seg.boost = true;
      if (i >= 460 && i <= 464) seg.ramp = true;

      if (i === 6 || i === 138 || i === 272 || i === 405) {
        seg.props.push({ asset: 'prop_sign', offset: 1.28, wMul: 0.34, hMul: 0.26 });
      }

      if (i % 8 === 0) {
        seg.props.push({ asset: 'prop_post', offset: -1.08, wMul: 0.06, hMul: 0.14 });
        seg.props.push({ asset: 'prop_post', offset: 1.08, wMul: 0.06, hMul: 0.14 });
      }
    }

    // Construir silueta de Circuito GP auténtico con horquillas, chicana en S y rectas (nunca un simple círculo)
    miniMapPts.length = 0;
    const nPts = 120;
    let minX = 1e9,
      maxX = -1e9,
      minY = 1e9,
      maxY = -1e9;
    for (let i = 0; i < nPts; i++) {
      const a = (i / nPts) * TAU;
      const r = 1 + 0.36 * M_cos(2 * a - 0.35) + 0.24 * M_sin(3 * a + 0.65) - 0.16 * M_cos(4 * a);
      const x = M_cos(a) * r * 1.28 + 0.22 * M_sin(2 * a);
      const y = M_sin(a) * r + 0.18 * M_cos(3 * a);
      miniMapPts.push({ x, y });
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    for (const pt of miniMapPts) {
      pt.nx = (pt.x - minX) / spanX;
      pt.ny = (pt.y - minY) / spanY;
    }
  }

  buildTrack3D();

  function wrapZ(z) {
    let r = z % TRACK_LEN;
    if (r < 0) r += TRACK_LEN;
    return r;
  }

  function shortestTrackDelta(fromZ, toZ) {
    let d = wrapZ(toZ) - wrapZ(fromZ);
    if (d > TRACK_LEN / 2) d -= TRACK_LEN;
    if (d < -TRACK_LEN / 2) d += TRACK_LEN;
    return d;
  }

  // 4 estaciones de cajas de poder por vuelta con 3 CUBOS EN FILA EN LA CALLE
  const ITEM_BOX_TEMPLATES = [];
  for (const s of [68, 192, 325, 442]) {
    for (const off of [-0.54, 0, 0.54]) {
      ITEM_BOX_TEMPLATES.push({ segIdx: s, z: s * SEG_LEN, offset: off });
    }
  }

  // =========================================================================
  // RENDERIZADO DE SPRITES PIXEL-ART CON HUMITO EN CAUCHOS Y LLAMAS DE NITRO
  // =========================================================================
  function drawPixelSpriteAnchored(ctx, assetName, cx, bottomY, drawW, drawH, rot = 0, clipY = 9999) {
    const img = ASSETS[assetName];
    if (!img || drawW < 3 || drawH < 3 || bottomY - drawH >= clipY) return;
    ctx.save();
    if (bottomY > clipY) {
      ctx.beginPath();
      ctx.rect(0, 0, W, clipY);
      ctx.clip();
    }
    ctx.imageSmoothingEnabled = false;
    ctx.translate(cx, bottomY);
    if (rot) ctx.rotate(rot);
    ctx.drawImage(img, -drawW / 2, -drawH, drawW, drawH);
    ctx.restore();
  }

  function drawKartSprite3D(
    ctx,
    vehId,
    cx,
    by,
    widthPx,
    steer,
    time,
    hasBoost,
    isShrunk,
    clipY = 9999,
    rankBadge = 0,
    spdRatio = 0,
    driftLv = 0
  ) {
    const w = widthPx * (isShrunk ? 0.68 : 1.0);
    const h = w * (50 / 72);
    if (w < 8 || by - h >= clipY) return;

    const dirKey = steer < -0.22 ? 'l' : steer > 0.22 ? 'r' : 'c';
    const img = ASSETS[`kart_${vehId}_${dirKey}`] || ASSETS[`kart_${vehId}_c`];

    ctx.save();
    if (by + 4 > clipY) {
      ctx.beginPath();
      ctx.rect(0, 0, W, clipY);
      ctx.clip();
    }
    ctx.imageSmoothingEnabled = false;
    ctx.translate(cx, by);

    ell(ctx, 'rgba(0,0,0,0.52)', 0, -2, w * 0.44, M_max(3, h * 0.12));

    const bounce = M_sin(time * 0.035) * (h * 0.015);
    ctx.save();
    ctx.rotate(steer * (vehId === 'bera' ? 0.12 : 0.055));
    ctx.drawImage(img, -w / 2, -h + bounce, w, h);

    // Humito de cauchos y escape cuando el vehículo va rodando o derrapando
    if (spdRatio > 0.2 && w > 24) {
      const tireXs = vehId === 'bera' ? [0] : [-w * 0.3, w * 0.3];
      for (const tx of tireXs) {
        for (let p = 0; p < 3; p++) {
          const phase = ((time * 0.008 + p * 0.33 + M_abs(tx)) % 1);
          const puffX = tx - steer * w * 0.18 * phase + M_sin(time * 0.02 + p * 2) * (w * 0.04);
          const puffY = -h * 0.05 + phase * (h * 0.22);
          const rad = M_max(2, w * (0.045 + phase * 0.055) * (driftLv > 0 ? 1.35 : 1));
          const col =
            hasBoost
              ? p === 0
                ? 'rgba(0, 229, 255, 0.75)'
                : 'rgba(255, 145, 0, 0.55)'
              : driftLv >= 2
              ? 'rgba(255, 109, 0, 0.65)'
              : driftLv === 1
              ? 'rgba(0, 229, 255, 0.6)'
              : `rgba(226, 232, 240, ${(1 - phase) * 0.42})`;
          ell(ctx, col, puffX, puffY, rad, rad * 0.72);
        }
      }
    }

    // Llamas potentes de Nitro (doble postquemador azul/naranja/blanco)
    if (hasBoost) {
      const pulse = 0.85 + 0.3 * M_sin(time * 0.09);
      const fw = w * 0.16;
      const fh = h * 0.34 * pulse;
      const exPos = vehId === 'bera' ? [w * 0.06] : [-w * 0.23, w * 0.23];
      for (const ex of exPos) {
        ell(ctx, 'rgba(255, 61, 0, 0.85)', ex, -h * 0.06 + fh * 0.35, fw * 0.7, fh * 0.65);
        ell(ctx, '#ffea00', ex, -h * 0.08 + fh * 0.22, fw * 0.48, fh * 0.45);
        ell(ctx, '#00e5ff', ex, -h * 0.1 + fh * 0.1, fw * 0.3, fh * 0.26);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ex - fw * 0.15, -h * 0.12, fw * 0.3, fh * 0.18);
      }
    }
    ctx.restore();

    if (rankBadge > 0 && w > 22) {
      const fs = clamp(M_round(w * 0.34), 12, 26);
      const ry = -h - fs * 0.55;
      ctx.font = `bold ${fs}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#090d16';
      ctx.fillText(String(rankBadge), 2, ry + 2);
      ctx.fillStyle = rankBadge === 1 ? '#ffe600' : '#ffab00';
      ctx.fillText(String(rankBadge), 0, ry);
      ctx.fillStyle = '#ff9100';
      ctx.fillRect(-4, ry + fs * 0.48, 8, 2);
      ctx.fillRect(-2, ry + fs * 0.48 + 2, 4, 2);
    }

    ctx.restore();
  }

  function drawItemBox3D(ctx, cx, groundY, boxSz, time, seed, clipY = 9999) {
    if (boxSz < 7 || groundY - boxSz * 1.3 >= clipY) return;
    ell(ctx, 'rgba(0,0,0,0.45)', cx, groundY - 2, boxSz * 0.4, M_max(2, boxSz * 0.12));
    const floatY = groundY - boxSz * 0.14 + M_sin(time * 0.006 + seed) * (boxSz * 0.1);
    const frame = M_floor(time / 180) % 2;
    drawPixelSpriteAnchored(ctx, 'item_box_' + frame, cx, floatY, boxSz, boxSz, 0, clipY);
  }

  // =========================================================================
  // ESCENA PHASER 3
  // =========================================================================
  class CaimaneraScene extends Phaser.Scene {
    constructor() {
      super('CaimaneraScene');
    }

    create() {
      buildAllPixelAssets();

      this.screenTex = this.textures.createCanvas('screen3d', W, H);
      this.screenCtx = this.screenTex.getContext();
      this.add.image(W / 2, H / 2, 'screen3d').setDepth(0);

      this.uiGfx = this.add.graphics().setDepth(10);
      this.textPool = [];
      this.textIdx = 0;

      this.state = {
        phase: 'title',
        players: 1,
        modeIdx: 0,
        p1Veh: 0,
        p2Veh: 1,
        p1Ready: false,
        p2Ready: false,
        setupStep: 0,
        leaderboard: DEFAULT_SCORES.slice(),
        tStart: 0,
        elapsed: 0,
        cdStart: 0,
        lastBeep: 4,
        koNext: 25,
        bajonT: 0,
        boltT: 0,
        winTitle: '',
        winSub: '',
        finalScore: 0,
        winVeh: 'MALIBU',
        ne: { active: false, chars: ['V', 'Z', 'L'], row: 0, col: 0, saved: false, cd: 0 },
      };

      this.karts = [];
      this.itemBoxes = [];
      this.projectiles = [];
      this.popups = [];

      loadLeaderboard().then((lb) => {
        if (lb && lb.length) this.state.leaderboard = lb;
      });
    }

    update(time, delta) {
      const dt = clamp(delta / 1000, 0.001, 0.05);
      twoPlayerActive = this.state.players === 2;

      this.textIdx = 0;
      this.uiGfx.clear();

      if (eat('P1_6') || eat('P2_6')) sfx.muted = !sfx.muted;

      const isRacing = this.state.phase === 'playing' || this.state.phase === 'countdown';
      const isFinalLap =
        isRacing &&
        this.karts.length > 0 &&
        MODES[this.state.modeIdx].laps > 0 &&
        this.karts[0].lap >= MODES[this.state.modeIdx].laps;
      sfx.tickMusic(isRacing, isFinalLap);

      if (this.state.phase === 'title') updateTitleScreen(this, time);
      else if (this.state.phase === 'setup') updateSetupScreen(this, time);
      else if (isRacing) updateMatch(this, time, dt);
      else if (this.state.phase === 'gameover') updateGameOverScreen(this, time, dt);

      for (let i = this.textIdx; i < this.textPool.length; i++) {
        this.textPool[i].setVisible(false);
      }
    }
  }

  function drawText(scene, x, y, str, size = 16, color = '#ffffff', alignX = 0.5, shadow = true) {
    let t = scene.textPool[scene.textIdx++];
    if (!t) {
      t = scene.add.text(0, 0, '', { fontFamily: 'Impact, "Arial Black", sans-serif', fontStyle: 'bold' });
      t.setDepth(20);
      scene.textPool.push(t);
    }
    t.setVisible(true);
    t.setText(str);
    t.setFontSize(size);
    t.setColor(color);
    t.setOrigin(alignX, 0.5);
    t.setPosition(x, y);
    if (shadow) t.setStroke('#050911', M_max(3, M_floor(size * 0.22)));
    else t.setStroke('#000000', 0);
    return t;
  }

  // =========================================================================
  // INICIALIZACIÓN DE CARRERA
  // =========================================================================
  function startRaceMatch(scene) {
    const st = scene.state;
    const mode = MODES[st.modeIdx];

    scene.karts = [];
    scene.projectiles = [];
    scene.popups = [];
    scene.itemBoxes = ITEM_BOX_TEMPLATES.map((b) => ({ ...b, respawnAt: 0 }));

    const chosen = [st.p1Veh];
    if (st.players === 2) chosen.push(st.p2Veh);
    for (let i = 0; i < VEHICLES.length; i++) {
      if (chosen.length < 4 && !chosen.includes(i)) chosen.push(i);
    }
    while (chosen.length < 4) chosen.push(chosen.length % 4);

    const laneSlots = [-0.24, 0.44, -0.54, 0.18];
    const startZ = [0, st.players === 2 ? 0 : 220, 440, 680];

    for (let i = 0; i < 4; i++) {
      const isHuman = i === 0 || (i === 1 && st.players === 2);
      const veh = VEHICLES[chosen[i]];
      scene.karts.push({
        id: isHuman ? `P${i + 1}` : `CPU ${i}`,
        pNum: isHuman ? i + 1 : 0,
        isHuman,
        veh,
        z: startZ[i],
        dist: startZ[i],
        offset: laneSlots[i],
        speed: 0,
        steer: 0,
        y3d: 0,
        vy3d: 0,
        tricked: false,
        tSpin: 0,
        lap: 1,
        rank: 4 - i,
        done: false,
        alive: true,
        item: mode.id === 'tt' ? 'malta' : null,
        maltas: mode.id === 'tt' ? 3 : 0,
        roulT: 0,
        drifting: false,
        dDir: 0,
        dChg: 0,
        boostT: 0,
        starT: 0,
        shrinkT: 0,
        spinT: 0,
        wallT: 0,
        sChg: 0,
        overheat: false,
        skyX: 0,
        lastZone: 0,
        aiLane: laneSlots[i],
        aiPace: 0.91 + i * 0.035,
        aiT: 2.5 + i * 0.9,
      });
    }

    st.phase = 'countdown';
    st.cdStart = scene.time.now;
    st.lastBeep = 4;
    st.elapsed = 0;
    st.koNext = 25;
    st.bajonT = 0;
    st.boltT = 0;
  }

  function addPopup(scene, pNum, text, color = '#ffe600') {
    scene.popups.push({ pNum, text, color, life: 1.4 });
  }

  function rollForItem(kart) {
    const r = kart.rank || 1;
    const pool =
      r === 1
        ? ['mango', 'mango', 'arepa', 'arepa', 'malta']
        : r === 2
        ? ['mango', 'arepa', 'reina', 'malta', 'alma']
        : r === 3
        ? ['arepa', 'reina', 'malta', 'fiscal', 'bajon', 'alma']
        : ['reina', 'malta', 'fiscal', 'bajon', 'alma', 'alma'];
    return pool[M_floor(M_rand() * pool.length)];
  }

  function triggerKartItem(scene, k, time) {
    const st = scene.state;
    const mode = MODES[st.modeIdx];

    if (time < k.roulT || !k.item) {
      if (k.isHuman) sfx.sfx('horn', k.veh.horn);
      return;
    }

    const item = k.item;
    if (mode.id === 'tt') {
      if (k.maltas > 1) k.maltas--;
      else {
        k.maltas = 0;
        k.item = null;
      }
    } else {
      k.item = null;
    }

    if (item === 'malta') {
      k.boostT = time + 2200;
      k.speed = M_max(k.speed, k.veh.maxSpd * 1.32);
      if (k.isHuman) {
        sfx.sfx('boost');
        addPopup(scene, k.pNum, '🍺 ¡MALTA BIEN FRÍA TURBO!', '#ff9800');
      }
    } else if (item === 'alma') {
      k.starT = time + 5500;
      k.boostT = M_max(k.boostT, time + 5500);
      if (k.isHuman) {
        sfx.sfx('win');
        addPopup(scene, k.pNum, '🌟 ¡ALMA LLANERA INVENCIBLE!', '#ffe600');
      }
    } else if (item === 'bajon') {
      st.bajonT = time + 1800;
      st.boltT = time + 420;
      sfx.sfx('thunder');
      addPopup(scene, 0, '⚡ ¡CSM SE FUE LA LUZ!', '#00e5ff');
      for (const o of scene.karts) {
        if (o !== k && o.alive && time >= o.starT) {
          o.shrinkT = time + 4500;
          o.speed *= 0.65;
        }
      }
    } else if (item === 'mango') {
      scene.projectiles.push({
        type: 'mango',
        asset: 'item_mango',
        owner: k,
        z: wrapZ(k.z - 50),
        offset: k.offset,
        speed: 0,
        vOff: 0,
        life: 16,
        arm: time + 300,
      });
      if (k.isHuman) {
        sfx.sfx('throw');
        addPopup(scene, k.pNum, '🥭 ¡MANGO BAJITO EN LA VÍA!', '#ffb700');
      }
    } else if (item === 'arepa' || item === 'reina') {
      const target = findRivalAhead(scene, k);
      scene.projectiles.push({
        type: item,
        asset: item === 'reina' ? 'item_reina' : 'item_arepa',
        owner: k,
        z: wrapZ(k.z + 32),
        offset: k.offset,
        speed: k.veh.maxSpd * 1.48,
        vOff: 0,
        target: item === 'reina' ? target : null,
        life: 4.5,
        arm: time + 80,
      });
      if (k.isHuman) {
        sfx.sfx('throw');
        addPopup(scene, k.pNum, item === 'reina' ? '🥑 ¡REINA PEPIADA TELEDIRIGIDA!' : '🫓 ¡AREPAZO PA LANTE!', '#76ff03');
      }
    } else if (item === 'fiscal') {
      let leader = scene.karts[0];
      for (const c of scene.karts) {
        if (c !== k && c.alive && c.rank === 1) leader = c;
      }
      if (leader === k) leader = findRivalAhead(scene, k);
      scene.projectiles.push({
        type: 'fiscal',
        asset: 'item_fiscal',
        owner: k,
        z: wrapZ(k.z + 36),
        offset: k.offset,
        speed: k.veh.maxSpd * 1.62,
        vOff: 0,
        target: leader,
        life: 6.0,
        arm: time + 80,
      });
      if (k.isHuman) {
        sfx.sfx('throw');
        addPopup(scene, k.pNum, '🚨 ¡EL FISCAL BUSCA AL LÍDER!', '#00b0ff');
      }
    }
  }

  function findRivalAhead(scene, k) {
    let best = null;
    let bestDist = 1e9;
    for (const o of scene.karts) {
      if (o === k || !o.alive) continue;
      const d = wrapZ(o.z - k.z);
      if (d > 0 && d < bestDist) {
        bestDist = d;
        best = o;
      }
    }
    return best;
  }

  function inflictSpinOut(scene, victim, attacker, time, label = '¡RESCATA PISO!') {
    if (time < victim.starT || time < victim.spinT) return;
    victim.spinT = time + 1000;
    victim.speed *= 0.28;
    victim.drifting = false;
    sfx.sfx('hit');
    addPopup(scene, victim.pNum || 1, `💥 ${label}`, '#ff5252');
  }

  // =========================================================================
  // MOTOR DE PROYECCIÓN 3D CON LAS 4 ZONAS DE VENEZUELA + NITRO Y ESTELA DE CAUCHOS
  // =========================================================================
  function renderViewport3D(scene, ctx, kart, vx, vy, vw, vh, time) {
    const st = scene.state;
    ctx.save();
    ctx.beginPath();
    ctx.rect(vx, vy, vw, vh);
    ctx.clip();

    const hasBoost = time < kart.boostT || time < kart.starT;
    const camZ = wrapZ(kart.z - CAM_BEHIND);
    const baseIdx = M_floor(camZ / SEG_LEN) % TOTAL_SEGS;
    const basePercent = (camZ % SEG_LEN) / SEG_LEN;
    const baseSeg = segments[baseIdx];
    const nextBaseSeg = segments[(baseIdx + 1) % TOTAL_SEGS];
    const playerY = lerp(baseSeg.y, nextBaseSeg.y, basePercent);
    const slopeY = nextBaseSeg.y - baseSeg.y;

    const horizonY = vy + M_floor(vh * 0.52 - clamp(slopeY * 1.4, -28, 28));
    const viewCenterX = vx + vw * 0.5;

    // 1. PANORAMA PIXEL-ART SEGÚN LA ZONA ACTUAL DE VENEZUELA
    const zone = ZONES[baseSeg.zone] || ZONES[0];
    const skyImg = ASSETS[zone.sky] || ASSETS.sky_0;
    const bgShift = ((M_floor(kart.skyX) % vw) + vw) % vw;
    ctx.drawImage(skyImg, vx - bgShift, vy, vw, horizonY - vy + 6);
    ctx.drawImage(skyImg, vx - bgShift + vw, vy, vw, horizonY - vy + 6);

    if (time < st.bajonT) {
      ctx.fillStyle = 'rgba(2, 6, 18, 0.65)';
      ctx.fillRect(vx, vy, vw, horizonY - vy + 6);
    }

    ctx.fillStyle = zone.g2;
    ctx.fillRect(vx, horizonY, vw, vh - (horizonY - vy));

    // 2. PROYECCIÓN DE LA AUTOPISTA 3D CON CURVAS AFINCADAS Y COLINAS
    const camX = kart.offset * ROAD_W;
    const camY = playerY + CAM_H + kart.y3d * 1.2;

    const rem0 = 1 - basePercent;
    let x = 0;
    let slope = 0;
    let maxY = vy + vh;

    const projSegs = [];

    for (let n = 0; n < DRAW_SEGS; n++) {
      const curr = segments[(baseIdx + n) % TOTAL_SEGS];
      const next = segments[(baseIdx + n + 1) % TOTAL_SEGS];

      const rawZ1 = (n - basePercent) * SEG_LEN;
      const rawZ2 = (n + 1 - basePercent) * SEG_LEN;

      let x1, x2, y1, y2;
      if (n === 0) {
        x1 = 0;
        x2 = 0.5 * curr.curve * rem0 * rem0;
        slope = curr.curve * rem0;
        y1 = playerY;
        y2 = next.y;
      } else {
        x1 = x;
        x2 = x + slope + 0.5 * curr.curve;
        slope += curr.curve;
        y1 = curr.y;
        y2 = next.y;
      }
      x = x2;

      if (rawZ2 <= NEAR_Z) continue;

      const clipT = rawZ1 < NEAR_Z ? (NEAR_Z - rawZ1) / (rawZ2 - rawZ1) : 0;
      const z1 = rawZ1 < NEAR_Z ? NEAR_Z : rawZ1;
      const z2 = rawZ2;
      const cx1 = lerp(x1, x2, clipT);
      const cy1 = lerp(y1, y2, clipT);

      const sc1 = CAM_DIST / z1;
      const sc2 = CAM_DIST / z2;

      const sx1 = viewCenterX + sc1 * (cx1 - camX) * vw * 0.5;
      const sy1 = horizonY + sc1 * (camY - cy1) * vh * 0.5;
      const sw1 = sc1 * ROAD_W * vw * 0.5;

      const sx2 = viewCenterX + sc2 * (x2 - camX) * vw * 0.5;
      const sy2 = horizonY + sc2 * (camY - y2) * vh * 0.5;
      const sw2 = sc2 * ROAD_W * vw * 0.5;

      projSegs.push({ curr, rawZ1, z1, z2, sc1, sx1, sy1, sw1, sc2, sx2, sy2, sw2, clipY: maxY });

      if (sy2 >= maxY || sy1 <= sy2) continue;

      const stripe = M_floor(curr.idx / RUMBLE_SEGS);
      const alt = stripe % 2 === 0;
      const segZone = ZONES[curr.zone] || zone;

      ctx.fillStyle = alt ? segZone.g1 : segZone.g2;
      ctx.fillRect(vx, sy2, vw, sy1 - sy2 + 1);

      const rumW1 = sw1 * 1.05,
        rumW2 = sw2 * 1.05;
      quad(ctx, alt ? '#e2e8f0' : '#dc2626', sx2 - rumW2, sy2, sx2 + rumW2, sy2, sx1 + rumW1, sy1, sx1 - rumW1, sy1);

      const roadCol = curr.ramp
        ? alt
          ? '#0284c7'
          : '#0369a1'
        : curr.boost
        ? '#ea580c'
        : alt
        ? '#263238'
        : '#1f292e';
      quad(ctx, roadCol, sx2 - sw2, sy2, sx2 + sw2, sy2, sx1 + sw1, sy1, sx1 - sw1, sy1);

      const ew1 = M_max(1.5, sw1 * 0.022),
        ew2 = M_max(1, sw2 * 0.022);
      quad(ctx, '#f8fafc', sx2 - sw2, sy2, sx2 - sw2 + ew2, sy2, sx1 - sw1 + ew1, sy1, sx1 - sw1, sy1);
      quad(ctx, '#f8fafc', sx2 + sw2 - ew2, sy2, sx2 + sw2, sy2, sx1 + sw1, sy1, sx1 + sw1 - ew1, sy1);
      quad(ctx, 'rgba(248,250,252,0.85)', sx2 - ew2 * 0.7, sy2, sx2 + ew2 * 0.7, sy2, sx1 + ew1 * 0.7, sy1, sx1 - ew1 * 0.7, sy1);

      if (curr.idx < 2) {
        quad(ctx, '#ffffff', sx2 - sw2, sy2, sx2 + sw2, sy2, sx1 + sw1, sy1, sx1 - sw1, sy1);
      } else if (alt) {
        for (const laneOff of [-0.5, 0.5]) {
          const lx1 = sx1 + laneOff * sw1;
          const lx2 = sx2 + laneOff * sw2;
          quad(ctx, 'rgba(226,232,240,0.75)', lx2 - ew2 * 0.65, sy2, lx2 + ew2 * 0.65, sy2, lx1 + ew1 * 0.65, sy1, lx1 - ew1 * 0.65, sy1);
        }
      }

      maxY = sy2;
    }

    // 3. CARTELES VIALES VERDES, 3 CUBOS DE ÍTEMS, PROYECTILES Y RIVALES ORDENADOS POR PROFUNDIDAD
    for (let i = projSegs.length - 1; i >= 0; i--) {
      const ps = projSegs[i];
      const seg = ps.curr;

      if (ps.rawZ1 >= 160) {
        for (const pr of seg.props) {
          const pw = ps.sw1 * pr.wMul;
          const ph = ps.sw1 * pr.hMul;
          drawPixelSpriteAnchored(
            ctx,
            pr.asset,
            ps.sx1 + pr.offset * ps.sw1,
            ps.sy1,
            pw,
            ph,
            0,
            ps.clipY
          );
        }
      }

      if (MODES[st.modeIdx].id !== 'tt' && ps.rawZ1 >= NEAR_Z) {
        for (const box of scene.itemBoxes) {
          if (box.segIdx === seg.idx && time >= box.respawnAt) {
            drawItemBox3D(
              ctx,
              ps.sx1 + box.offset * ps.sw1,
              ps.sy1,
              clamp(ps.sw1 * 0.3, 13, 66),
              time,
              box.offset * 3 + seg.idx,
              ps.clipY
            );
          }
        }
      }

      for (const proj of scene.projectiles) {
        const dz = shortestTrackDelta(camZ, proj.z);
        if (dz >= ps.z1 && dz < ps.z2) {
          const t = (dz - ps.z1) / M_max(1, ps.z2 - ps.z1);
          const roadHalfW = lerp(ps.sw1, ps.sw2, t);
          const px = lerp(ps.sx1, ps.sx2, t) + proj.offset * roadHalfW;
          const py = lerp(ps.sy1, ps.sy2, t);
          const pSz = clamp(roadHalfW * 0.24, 10, 68);

          if (py - pSz < ps.clipY) {
            ell(ctx, 'rgba(0,0,0,0.45)', px, py - 2, pSz * 0.42, M_max(2, pSz * 0.14));
            if (proj.type === 'reina' || proj.type === 'fiscal') {
              ell(
                ctx,
                'rgba(0,0,0,0)',
                px,
                py - 3,
                pSz * 0.56,
                M_max(3, pSz * 0.2),
                0,
                proj.type === 'fiscal' ? '#00e5ff' : '#76ff03',
                M_max(1.5, pSz * 0.06)
              );
            }
            const spinRot = proj.type === 'arepa' || proj.type === 'reina' ? time * 0.012 : 0;
            const hoverY = proj.type === 'mango' ? py : py - pSz * 0.12 + M_sin(time * 0.015) * (pSz * 0.06);
            drawPixelSpriteAnchored(ctx, proj.asset, px, hoverY, pSz, pSz, spinRot, ps.clipY);
          }
        }
      }

      const segKarts = [];
      for (const other of scene.karts) {
        if (other === kart || !other.alive) continue;
        const dz = shortestTrackDelta(camZ, other.z);
        if (dz >= ps.z1 && dz < ps.z2) segKarts.push({ other, dz });
      }
      if (segKarts.length > 1) segKarts.sort((a, b) => b.dz - a.dz);

      for (const item of segKarts) {
        const other = item.other;
        const dz = item.dz;
        const t = (dz - ps.z1) / M_max(1, ps.z2 - ps.z1);
        const roadHalfW = lerp(ps.sw1, ps.sw2, t);
        const kx = lerp(ps.sx1, ps.sx2, t) + other.offset * roadHalfW;
        const ky = lerp(ps.sy1, ps.sy2, t) - other.y3d * lerp(ps.sc1, ps.sc2, t) * 140;
        const kw = clamp(roadHalfW * 0.44, 12, 152);
        drawKartSprite3D(
          ctx,
          other.veh.id,
          kx,
          ky,
          kw,
          other.steer,
          time,
          time < other.boostT || time < other.starT,
          time < other.shrinkT,
          ps.clipY,
          other.rank || 0,
          M_abs(other.speed || 0) / other.veh.maxSpd,
          0
        );
      }
    }

    if (time < st.boltT) {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(viewCenterX - 40, vy);
      ctx.lineTo(viewCenterX + 15, vy + vh * 0.22);
      ctx.lineTo(viewCenterX - 25, vy + vh * 0.34);
      ctx.lineTo(viewCenterX + 30, horizonY + 40);
      ctx.stroke();
    }

    // 4. VEHÍCULO DEL JUGADOR + ESTELA DE CAUCHOS + HUMITO + EFECTOS DE NITRO
    const selfX = viewCenterX + kart.steer * 14;
    const selfY = vy + vh - (st.players === 2 ? 12 : 16) - kart.y3d * 0.45;
    const selfW = st.players === 2 ? 122 : 166;
    const spdRatio = M_abs(kart.speed || 0) / kart.veh.maxSpd;
    const driftLv = kart.drifting ? (kart.dChg >= 0.95 ? 2 : kart.dChg >= 0.35 ? 1 : 0) : 0;
    const spinVisual =
      time < kart.spinT
        ? M_sin(time * 0.045) * 3.5
        : kart.steer + (kart.drifting ? kart.dDir * 0.45 : 0) + (kart.tSpin || 0);

    // Estela de cauchos en el asfalto (marcas de rodaje/derrape/nitro detrás de las ruedas)
    if (spdRatio > 0.15 && kart.y3d <= 4) {
      const trailCol = hasBoost
        ? 'rgba(255, 109, 0, 0.58)'
        : driftLv === 2
        ? 'rgba(255, 145, 0, 0.52)'
        : driftLv === 1
        ? 'rgba(0, 229, 255, 0.48)'
        : 'rgba(15, 23, 42, 0.42)';
      const wheelOffsets = kart.veh.id === 'bera' ? [0] : [-selfW * 0.28, selfW * 0.28];
      for (const wo of wheelOffsets) {
        const wx1 = selfX + wo;
        const wx2 = wx1 - kart.steer * 34;
        quad(ctx, trailCol, wx1 - 6, selfY - 4, wx1 + 6, selfY - 4, wx2 + 12, vy + vh + 2, wx2 - 12, vy + vh + 2);
      }
    }

    // Líneas de velocidad radiales en pantalla cuando se activa el Nitro
    if (hasBoost) {
      ctx.strokeStyle = time < kart.starT ? 'rgba(255, 230, 0, 0.45)' : 'rgba(0, 229, 255, 0.42)';
      ctx.lineWidth = 2.5;
      for (let s = 0; s < 10; s++) {
        const side = s % 2 === 0 ? -1 : 1;
        const anim = ((time * 0.015 + s * 0.19) % 1);
        const sx0 = viewCenterX + side * (vw * 0.18 + anim * vw * 0.32);
        const sy0 = horizonY + anim * (vh * 0.48);
        ctx.beginPath();
        ctx.moveTo(sx0, sy0);
        ctx.lineTo(sx0 + side * 42, sy0 + 26);
        ctx.stroke();
      }
    }

    ell(ctx, 'rgba(224, 242, 254, 0.18)', selfX + kart.steer * 12, selfY - selfW * 0.62, selfW * 0.56, selfW * 0.13);
    ell(ctx, 'rgba(255, 255, 255, 0.14)', selfX + kart.steer * 16, selfY - selfW * 0.66, selfW * 0.36, selfW * 0.08);

    drawKartSprite3D(
      ctx,
      kart.veh.id,
      selfX,
      selfY,
      selfW,
      spinVisual,
      time,
      hasBoost,
      time < kart.shrinkT,
      9999,
      0,
      spdRatio,
      driftLv
    );

    ctx.restore();
  }

  // =========================================================================
  // FÍSICA 3D FLUIDA + COLISIONES SUAVES SIN TIRONES + HUD DE MARIO KART
  // =========================================================================
  function updateMatch(scene, time, dt) {
    const st = scene.state;
    const mode = MODES[st.modeIdx];
    const ctx = scene.screenCtx;

    let countStep = 0;
    if (st.phase === 'countdown') {
      const el = (time - st.cdStart) / 1000;
      if (el < 1) countStep = 3;
      else if (el < 2) countStep = 2;
      else if (el < 3) countStep = 1;
      else {
        st.phase = 'playing';
        st.tStart = time;
        sfx.sfx('go');
        for (const k of scene.karts) {
          if (!k.overheat && k.sChg > 0.45) {
            k.boostT = time + 1500;
            k.speed = k.veh.maxSpd * 1.25;
            if (k.isHuman) addPopup(scene, k.pNum, '🔥 ¡ARRANQUE EXPLOSIVO!', '#39ff14');
          } else if (k.overheat) {
            k.spinT = time + 850;
            if (k.isHuman) addPopup(scene, k.pNum, '💨 ¡SE AHOGÓ EL MOTOR!', '#ff5252');
          }
        }
      }
      if (countStep > 0 && countStep !== st.lastBeep) {
        st.lastBeep = countStep;
        sfx.sfx('count');
      }
    }

    if (st.phase === 'playing') {
      st.elapsed = (time - st.tStart) / 1000;

      if (mode.id === 'ko' && st.elapsed >= st.koNext) {
        st.koNext += 25;
        const alive = scene.karts.filter((k) => k.alive);
        if (alive.length > 1) {
          alive.sort((a, b) => a.dist - b.dist);
          const last = alive[0];
          last.alive = false;
          sfx.sfx('hit');
          addPopup(scene, 0, `🍺 ¡${last.veh.name} PAGA LA CURDA!`, '#ff1744');
          const rem = scene.karts.filter((k) => k.alive);
          if (rem.length <= 1 || !rem.some((k) => k.isHuman)) {
            finishMatch(scene);
            return;
          }
        }
      }
    }

    for (const k of scene.karts) {
      if (!k.alive) continue;

      let throttle = 0,
        steerInput = 0,
        wantItem = false,
        wantDrift = false;

      if (k.isHuman && !k.done) {
        const p = k.pNum;
        if (held[`P${p}_U`]) throttle = 1;
        else if (held[`P${p}_D`]) throttle = -0.45;
        if (held[`P${p}_L`]) steerInput -= 1;
        if (held[`P${p}_R`]) steerInput += 1;
        wantItem = eatAny([`P${p}_1`, `P${p}_4`]);
        wantDrift = held[`P${p}_2`] || held[`P${p}_3`] || held[`P${p}_5`];
      } else {
        throttle = k.aiPace || 0.94;
        const curAiSeg = segments[M_floor(wrapZ(k.z) / SEG_LEN) % TOTAL_SEGS];
        k.aiT -= dt;
        if (k.aiT <= 0) {
          k.aiT = 3.5 + M_rand() * 2.5;
          const lanes = [-0.6, -0.22, 0.22, 0.6];
          k.aiLane = lanes[M_floor(M_rand() * lanes.length)];
          if (k.item && time >= k.roulT && st.phase === 'playing') wantItem = true;
        }
        for (const other of scene.karts) {
          if (other !== k && other.alive) {
            const dz = shortestTrackDelta(k.z, other.z);
            if (dz > -65 && dz < 190 && M_abs(other.offset - k.aiLane) < 0.36) {
              k.aiLane = other.offset > 0 ? -0.56 : 0.56;
              k.aiT = M_max(k.aiT, 1.4);
            }
          }
        }
        steerInput = clamp((k.aiLane - k.offset) * 1.9 + curAiSeg.curve * 0.04, -0.65, 0.65);
      }

      if (st.phase === 'countdown') {
        if (throttle > 0) {
          if (countStep === 3) k.overheat = true;
          else k.sChg += dt;
        }
        continue;
      }

      if (wantItem) triggerKartItem(scene, k, time);

      const segIdx = M_floor(wrapZ(k.z) / SEG_LEN) % TOTAL_SEGS;
      const curSeg = segments[segIdx];
      if (k.isHuman && curSeg.zone !== k.lastZone) {
        k.lastZone = curSeg.zone;
        const zn = ZONES[curSeg.zone];
        if (zn) addPopup(scene, k.pNum, `📍 ${zn.name}`, zn.col);
      }

      const hasBoost = time < k.boostT;
      const hasStar = time < k.starT;
      const isShrunk = time < k.shrinkT;
      const isSpinning = time < k.spinT;

      if (k.y3d <= 1) {
        if (curSeg.boost && M_abs(k.offset) < 0.88) {
          k.boostT = M_max(k.boostT, time + 1250);
          k.speed = M_max(k.speed, k.veh.maxSpd * 1.26);
          if (k.isHuman) sfx.sfx('boost');
        }
        if (curSeg.ramp && k.vy3d <= 0) {
          k.vy3d = 195;
          k.y3d = 3;
          k.tricked = false;
          k.boostT = M_max(k.boostT, time + 1250);
          if (k.isHuman) {
            sfx.sfx('hop');
            addPopup(scene, k.pNum, '🌊 ¡SALTO ÁNGEL EN 3D!', '#7ef9ff');
          }
        }
      } else if (k.y3d > 14 && !k.tricked && wantDrift) {
        k.tricked = true;
        k.tSpin = TAU;
        k.boostT = M_max(k.boostT, time + 2100);
        if (k.isHuman) {
          sfx.sfx('trick');
          addPopup(scene, k.pNum, '🦜 ¡PIRUETA AÉREA + SÚPER TURBO!', '#ffe600');
        }
      }

      if (!isSpinning && k.y3d <= 2) {
        if (wantDrift && !k.drifting && M_abs(steerInput) > 0.1 && k.speed > 240) {
          k.drifting = true;
          k.dDir = steerInput > 0 ? 1 : -1;
          k.dChg = 0;
          k.vy3d = 68;
          k.y3d = 1;
          if (k.isHuman) sfx.sfx('hop');
        } else if (k.drifting) {
          if (wantDrift && k.speed > 180) {
            k.dChg += dt * (steerInput * k.dDir > 0 ? 1.25 : 0.65) * k.veh.driftB;
          } else {
            if (k.dChg >= 0.95) {
              k.boostT = M_max(k.boostT, time + 1600);
              k.speed = M_max(k.speed, k.veh.maxSpd * 1.3);
              if (k.isHuman) {
                sfx.sfx('boost');
                addPopup(scene, k.pNum, '🔥 ¡SÚPER TURBO!', '#ff6d00');
              }
            } else if (k.dChg >= 0.38) {
              k.boostT = M_max(k.boostT, time + 950);
              k.speed = M_max(k.speed, k.veh.maxSpd * 1.18);
              if (k.isHuman) {
                sfx.sfx('boost');
                addPopup(scene, k.pNum, '⚡ ¡MINI-TURBO!', '#00e5ff');
              }
            }
            k.drifting = false;
            k.dChg = 0;
          }
        }
      }

      let topSpd = k.veh.maxSpd;
      if (hasStar) topSpd *= 1.24;
      else if (hasBoost) topSpd *= 1.26;
      if (isShrunk) topSpd *= 0.68;

      if (M_abs(k.offset) > 1.0 && !hasBoost && !hasStar && k.y3d <= 2) topSpd *= k.veh.offMul;

      if (!k.isHuman && (mode.id === 'gp' || mode.id === 'ko')) {
        const bestHumanDist = M_max(...scene.karts.filter((h) => h.isHuman).map((h) => h.dist));
        const gap = bestHumanDist - k.dist;
        if (gap > 350) topSpd *= 1.18;
        else if (gap < -620) topSpd *= 0.72;
        else if (gap < -280) topSpd *= 0.9;
      }

      if (isSpinning) {
        k.speed = lerp(k.speed, 0, dt * 4);
        k.steer = M_sin(time * 0.04);
      } else {
        k.steer = lerp(k.steer, steerInput, dt * (k.isHuman ? 10 : 6));
        if (throttle > 0) k.speed = lerp(k.speed, topSpd * throttle, dt * (k.veh.accel / 180));
        else if (throttle < 0) k.speed = lerp(k.speed, topSpd * throttle, dt * 3.5);
        else k.speed = lerp(k.speed, 0, dt * 1.8);

        const speedRatio = k.speed / k.veh.maxSpd;
        const steerEff = k.drifting ? k.dDir * 0.55 + k.steer * 0.6 : k.steer;
        k.offset += steerEff * k.veh.turn * clamp(M_abs(speedRatio), 0.3, 1.1) * dt;
        k.offset -= curSeg.curve * speedRatio * 0.044 * dt;
      }

      if (k.offset < -0.82 || k.offset > 0.82) {
        k.offset = clamp(k.offset, -0.82, 0.82);
        k.speed *= M_max(0.94, 1 - 0.18 * dt);
        if (k.isHuman && time >= k.wallT) {
          k.wallT = time + 260;
          sfx.sfx('wall');
        }
      }

      const dz = k.speed * dt;
      const oldZ = wrapZ(k.z);
      k.z = wrapZ(k.z + dz);
      k.dist += dz;
      k.skyX += curSeg.curve * (k.speed / k.veh.maxSpd) * 0.55;

      if (k.y3d > 0 || k.vy3d !== 0) {
        k.y3d += k.vy3d * dt;
        k.vy3d -= 440 * dt;
        if (k.tSpin > 0) k.tSpin = M_max(0, k.tSpin - 16 * dt);
        if (k.y3d <= 0) {
          k.y3d = 0;
          k.vy3d = 0;
          k.tSpin = 0;
        }
      }

      if (oldZ > TRACK_LEN * 0.8 && k.z < TRACK_LEN * 0.2 && k.dist > TRACK_LEN * 0.5) {
        const newLap = M_floor(k.dist / TRACK_LEN) + 1;
        if (newLap > k.lap) {
          k.lap = newLap;
          if (mode.laps > 0 && k.lap > mode.laps && !k.done) {
            k.done = true;
            if (k.isHuman) {
              sfx.sfx('win');
              finishMatch(scene);
              return;
            }
          } else if (k.isHuman) {
            sfx.sfx('itemReady');
            addPopup(scene, k.pNum, k.lap === mode.laps ? '🔥 ¡ÚLTIMA VUELTA!' : `🏁 VUELTA ${k.lap}/${mode.laps}`, '#ffe600');
          }
        }
      }

      if (!k.item && time >= k.roulT && mode.id !== 'tt') {
        for (const box of scene.itemBoxes) {
          if (
            time >= box.respawnAt &&
            M_abs(shortestTrackDelta(k.z, box.z)) < 68 &&
            M_abs(k.offset - box.offset) < 0.36
          ) {
            box.respawnAt = time + 8000;
            k.item = rollForItem(k);
            k.roulT = time + 1000;
            if (k.isHuman) sfx.sfx('box');
            break;
          }
        }
      }
    }

    // Colisión vehículo-a-vehículo suavizada con dt
    for (let i = 0; i < scene.karts.length; i++) {
      const a = scene.karts[i];
      if (!a.alive || a.y3d > 18) continue;
      for (let j = i + 1; j < scene.karts.length; j++) {
        const b = scene.karts[j];
        if (!b.alive || b.y3d > 18) continue;
        const dz = shortestTrackDelta(a.z, b.z);
        const doff = b.offset - a.offset;
        const minSep = 0.34;
        if (M_abs(dz) < 48 && M_abs(doff) < minSep) {
          const overlap = minSep - M_abs(doff);
          const dir = doff >= 0 ? 1 : -1;
          const totalMass = a.veh.mass + b.veh.mass;
          const push = dir * (overlap * 3.8 + 0.12) * dt;
          a.offset = clamp(a.offset - push * (b.veh.mass / totalMass), -0.82, 0.82);
          b.offset = clamp(b.offset + push * (a.veh.mass / totalMass), -0.82, 0.82);

          const zSep = (dz >= 0 ? 1 : -1) * 32 * dt;
          a.z = wrapZ(a.z - zSep);
          b.z = wrapZ(b.z + zSep);

          if (!a.isHuman) {
            a.aiLane = clamp(a.offset - dir * 0.42, -0.62, 0.62);
            a.aiT = 1.6;
          }
          if (!b.isHuman) {
            b.aiLane = clamp(b.offset + dir * 0.42, -0.62, 0.62);
            b.aiT = 1.6;
          }

          const aStar = time < a.starT;
          const bStar = time < b.starT;
          if (aStar && !bStar) inflictSpinOut(scene, b, a, time, '¡RESCATA PISO!');
          else if (bStar && !aStar) inflictSpinOut(scene, a, b, time, '¡RESCATA PISO!');
        }
      }
    }

    for (let i = scene.projectiles.length - 1; i >= 0; i--) {
      const p = scene.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        scene.projectiles.splice(i, 1);
        continue;
      }

      if ((p.type === 'reina' || p.type === 'fiscal') && p.target && p.target.alive) {
        p.offset = lerp(p.offset, p.target.offset, dt * 6.5);
      } else {
        p.offset += p.vOff * dt;
        if (p.offset < -0.96 || p.offset > 0.96) p.vOff = -p.vOff;
      }

      p.z = wrapZ(p.z + p.speed * dt);

      if (time >= p.arm) {
        for (const k of scene.karts) {
          if (!k.alive || k.y3d > 18) continue;
          if (p.owner === k && time < p.arm + 500) continue;
          if (M_abs(shortestTrackDelta(p.z, k.z)) < 58 && M_abs(p.offset - k.offset) < 0.36) {
            const msg =
              p.type === 'mango'
                ? '¡RESCATA PISO!'
                : p.type === 'fiscal'
                ? '🚨 ¡MULTADO POR EL FISCAL!'
                : '🫓 ¡TOMA TU AREPAZO!';
            inflictSpinOut(scene, k, p.owner, time, msg);
            scene.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }

    const ranked = [...scene.karts].sort((a, b) => (b.alive - a.alive) * 1e6 + (b.dist - a.dist));
    ranked.forEach((k, idx) => {
      k.rank = idx + 1;
    });

    if (st.players === 1) {
      renderViewport3D(scene, ctx, scene.karts[0], 0, 0, W, H, time);
    } else {
      renderViewport3D(scene, ctx, scene.karts[0], 0, 0, W, H / 2 - 2, time);
      renderViewport3D(scene, ctx, scene.karts[1], 0, H / 2 + 2, W, H / 2 - 2, time);
      ctx.fillStyle = '#ffe600';
      ctx.fillRect(0, H / 2 - 2, W, 4);
    }

    drawMarioKartCanvasHUD(ctx, scene, time);

    scene.screenTex.refresh();
    drawMatchHUD(scene, time, dt, countStep);

    if (eatAny(['START1', 'START2'])) {
      sfx.sfx('select');
      st.phase = 'title';
      clearPressed();
    }
  }

  function drawMarioKartCanvasHUD(ctx, scene, time) {
    const st = scene.state;
    const humans = scene.karts.filter((k) => k.isHuman);

    for (const k of humans) {
      const topY = st.players === 2 && k.pNum === 2 ? H / 2 + 8 : 8;
      const botY = st.players === 2 && k.pNum === 1 ? H / 2 - 8 : H - 8;

      // 1. Caja de Ruleta de Poder estilo Mario Kart (centro superior)
      ctx.fillStyle = 'rgba(7, 13, 25, 0.88)';
      ctx.beginPath();
      ctx.roundRect(W / 2 - 115, topY, 230, 56, 10);
      ctx.fill();

      let activeItem = null;
      if (time < k.roulT) activeItem = ITEMS[M_floor(time / 70) % ITEMS.length];
      else if (k.item) activeItem = ITEM_MAP[k.item];

      if (activeItem) drawPixelSpriteAnchored(ctx, activeItem.asset, W / 2 - 82, topY + 46, 38, 38);
      else drawItemBox3D(ctx, W / 2 - 82, topY + 46, 32, time, k.pNum);

      // 2. Minimapa del Circuito GP con curvas, horquillas y línea de meta (esquina inferior derecha)
      const mw = 114,
        mh = st.players === 2 ? 72 : 88;
      const mx0 = W - mw - 16,
        my0 = botY - mh - 6;
      ctx.fillStyle = 'rgba(7, 13, 25, 0.88)';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(mx0 - 8, my0 - 8, mw + 16, mh + 16, 10);
      ctx.fill();
      ctx.stroke();

      if (miniMapPts.length > 2) {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < miniMapPts.length; i++) {
          const px = mx0 + miniMapPts[i].nx * mw;
          const py = my0 + miniMapPts[i].ny * mh;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();

        // Borde exterior oscuro + asfalto gris + línea central blanca de circuito
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 10;
        ctx.stroke();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 6.5;
        ctx.stroke();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Línea de Meta a cuadros en el punto de partida del minimapa
        const stPt = miniMapPts[0];
        const sx = mx0 + stPt.nx * mw;
        const sy = my0 + stPt.ny * mh;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 4, sy - 4, 8, 8);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(sx - 4, sy - 4, 4, 4);
        ctx.fillRect(sx, sy, 4, 4);

        for (const o of scene.karts) {
          if (!o.alive) continue;
          const idx = M_floor((wrapZ(o.z) / TRACK_LEN) * miniMapPts.length) % miniMapPts.length;
          const pt = miniMapPts[idx];
          const rx = mx0 + pt.nx * mw;
          const ry = my0 + pt.ny * mh;
          if (o === k) {
            ell(ctx, 'rgba(255, 230, 0, 0.38)', rx, ry, 7.5, 7.5);
          }
          ell(ctx, o.veh.hex, rx, ry, o === k ? 4.8 : 3.6, o === k ? 4.8 : 3.6, 0, o === k ? '#ffffff' : '#090d16', 1.5);
        }
      }
    }
  }

  function drawMatchHUD(scene, time, dt, countStep) {
    const g = scene.uiGfx;
    const st = scene.state;
    const mode = MODES[st.modeIdx];
    const humans = scene.karts.filter((k) => k.isHuman);

    for (const k of humans) {
      const topY = st.players === 2 && k.pNum === 2 ? H / 2 + 8 : 8;
      const botY = st.players === 2 && k.pNum === 1 ? H / 2 - 8 : H - 8;

      boxUI(g, 12, topY, 224, 56, 10, 0x070d19, 0.88, 2, k.veh.accent, 0.95);
      const rankCols = ['#ffe600', '#00e5ff', '#ff9800', '#ff5252'];
      drawText(scene, 42, topY + 28, `${k.rank}°`, 34, rankCols[k.rank - 1] || '#ffffff');

      const lapStr =
        mode.id === 'ko'
          ? `CURDA KO EN ${M_max(0, M_ceil(st.koNext - st.elapsed))}s`
          : `VUELTA ${M_min(k.lap, mode.laps)}/${mode.laps}`;
      const mins = String(M_floor(st.elapsed / 60)).padStart(2, '0');
      const secs = String(M_floor(st.elapsed % 60)).padStart(2, '0');

      drawText(scene, 78, topY + 18, k.veh.name, 13, '#ffe600', 0);
      drawText(scene, 78, topY + 40, `${lapStr} • ${mins}:${secs}`, 12, '#ffffff', 0);

      boxUI(g, W / 2 - 115, topY, 230, 56, 10, null, 0, 2, 0xffe600, 0.95);
      let itemTitle = 'CAJA DE PODER',
        itemSub = 'BOTÓN 1 (U): CORNETA',
        itemCol = '#94a3b8';
      if (time < k.roulT) {
        const rIt = ITEMS[M_floor(time / 70) % ITEMS.length];
        itemTitle = rIt.short;
        itemSub = '🎲 RULETA...';
        itemCol = rIt.col;
      } else if (k.item) {
        const it = ITEM_MAP[k.item];
        itemTitle = mode.id === 'tt' ? `${it.short} x${k.maltas}` : it.short;
        itemSub = `${it.desc} [U]`;
        itemCol = it.col;
      }
      drawText(scene, W / 2 - 52, topY + 18, itemTitle, 13, itemCol, 0);
      drawText(scene, W / 2 - 52, topY + 39, itemSub, 11, '#ffffff', 0);

      const curZone = ZONES[segments[M_floor(wrapZ(k.z) / SEG_LEN) % TOTAL_SEGS].zone] || ZONES[0];
      boxUI(g, W - 236, topY, 224, 38, 8, 0x070d19, 0.88, 2, 0x00e5ff, 0.9);
      drawText(scene, W - 124, topY + 19, `📍 ${curZone.name}`, 12, curZone.col);

      const kmh = M_round((M_abs(k.speed) / k.veh.maxSpd) * 145);
      boxUI(g, 12, botY - 40, 128, 36, 8, 0x070d19, 0.88, 2, 0x39ff14, 0.9);
      drawText(scene, 76, botY - 22, `${kmh} KM/H`, 17, time < k.boostT ? '#ff9100' : '#39ff14');
    }

    if (st.phase === 'countdown') {
      boxUI(g, W / 2 - 140, H / 2 - 58, 280, 116, 14, 0x070d19, 0.92, 3, 0xffe600, 1);
      for (let c = 0; c < 3; c++) {
        const active = 3 - countStep >= c;
        g.fillStyle(active ? (countStep === 1 ? 0xffe600 : 0xff1744) : 0x263238, 1);
        g.fillCircle(W / 2 - 64 + c * 64, H / 2 - 20, 16);
      }
      drawText(scene, W / 2, H / 2 + 28, `PREPARADOS... ${countStep}`, 24, '#ffe600');
    } else if (st.elapsed < 1.1) {
      drawText(scene, W / 2, H / 2 - 20, '🏁 ¡DALE PUES! 🏁', 38, '#39ff14');
    }

    for (let i = scene.popups.length - 1; i >= 0; i--) {
      const pop = scene.popups[i];
      pop.life -= dt;
      if (pop.life <= 0) {
        scene.popups.splice(i, 1);
        continue;
      }
      const py = (pop.pNum === 2 && st.players === 2 ? H * 0.72 : H * 0.28) - (1.4 - pop.life) * 28;
      drawText(scene, W / 2, py, pop.text, 22, pop.color);
    }
  }

  function finishMatch(scene) {
    const st = scene.state;
    const mode = MODES[st.modeIdx];
    st.phase = 'gameover';

    const p1 = scene.karts[0];
    const p2 = st.players === 2 ? scene.karts[1] : null;
    const best = p2 && p2.rank < p1.rank ? p2 : p1;

    const score =
      mode.id === 'gp'
        ? M_max(250, M_round((5 - best.rank) * 520 + M_max(0, 180 - st.elapsed) * 7))
        : mode.id === 'ko'
        ? (5 - best.rank) * 550 + M_round(st.elapsed * 10)
        : M_max(350, M_round(2600 - st.elapsed * 16));

    st.finalScore = score;
    st.winVeh = best.veh.id.toUpperCase();
    st.winTitle =
      best.rank === 1
        ? `🏆 ¡${best.id} (${best.veh.name}) GANÓ LA CAIMANERA!`
        : `🏁 ${best.id} LLEGÓ EN ${best.rank}° LUGAR`;
    st.winSub = `MODALIDAD: ${mode.name} • TIEMPO: ${st.elapsed.toFixed(1)}s • ${score} PTS`;

    st.ne.active = true;
    st.ne.saved = false;
    st.ne.row = 0;
    st.ne.col = 0;
    st.ne.cd = scene.time.now + 350;
    sfx.sfx('win');
  }

  // =========================================================================
  // PANTALLA DE TÍTULO
  // =========================================================================
  function updateTitleScreen(scene, time) {
    const st = scene.state;
    const ctx = scene.screenCtx;
    const g = scene.uiGfx;

    const demoKart = {
      z: (time * 0.34) % TRACK_LEN,
      offset: M_sin(time * 0.0009) * 0.35,
      steer: M_cos(time * 0.0012) * 0.4,
      speed: 520,
      y3d: 0,
      skyX: time * 0.024,
      veh: VEHICLES[M_floor(time / 5000) % 4],
      boostT: 0,
      starT: 0,
      shrinkT: 0,
      spinT: 0,
      drifting: false,
      dChg: 0,
      alive: true,
    };
    renderViewport3D(scene, ctx, demoKart, 0, 0, W, H, time);

    for (let i = 0; i < 4; i++) {
      const cx = 148 + i * 168;
      const cy = 316;
      ctx.fillStyle = 'rgba(11, 19, 34, 0.92)';
      ctx.strokeStyle = VEHICLES[i].hex;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx - 74, cy - 72, 148, 106, 10);
      ctx.fill();
      ctx.stroke();

      const previewSteer = M_sin(time * 0.003 + i) * 0.45;
      drawKartSprite3D(ctx, VEHICLES[i].id, cx, cy + 16, 86, previewSteer, time, false, false);
    }

    ctx.fillStyle = 'rgba(7, 13, 25, 0.88)';
    ctx.beginPath();
    ctx.roundRect(410, 368, 325, 144, 10);
    ctx.fill();

    const demoItems = ['item_mango', 'item_arepa', 'item_fiscal', 'item_bajon'];
    for (let i = 0; i < 4; i++) {
      drawPixelSpriteAnchored(ctx, demoItems[i], 436, 426 + i * 22, 18, 18);
    }

    scene.screenTex.refresh();

    boxUI(g, 105, 16, 590, 128, 12, 0x007a33, 0.96, 4, 0xffffff, 1);
    g.fillStyle(0xffd700, 1);
    g.fillRect(115, 24, 570, 6);
    g.fillStyle(0x0044cc, 1);
    g.fillRect(115, 30, 570, 6);
    g.fillStyle(0xe6192e, 1);
    g.fillRect(115, 36, 570, 6);

    drawText(scene, W / 2, 68, 'CAIMANERA KART', 42, '#ffffff');
    drawText(scene, W / 2, 102, 'GRAN CIRCUITO VENEZUELA 3D', 17, '#ffe600');
    drawText(scene, W / 2, 127, '⬆ CARACAS  •  ⬅ SALTO ÁNGEL  •  ➡ MARACAIBO  •  ⬇ LOS LLANOS', 12, '#e0f2f1');

    for (let i = 0; i < 4; i++) {
      const v = VEHICLES[i];
      const cx = 148 + i * 168;
      drawText(scene, cx, 258, v.name, 13, '#ffe600');
      drawText(scene, cx, 338, v.sub.split('•')[0].trim(), 10, '#7ef9ff');
    }

    boxUI(g, 65, 368, 325, 144, 10, 0x070d19, 0.88, 2, 0x00e5ff, 0.8);
    drawText(scene, 227, 388, '🏆 TOP RÉCORDS ARCADE', 14, '#ffe600');

    for (let i = 0; i < M_min(4, st.leaderboard.length); i++) {
      const row = st.leaderboard[i];
      drawText(
        scene,
        82,
        416 + i * 22,
        `${i + 1}. ${row.name.padEnd(3, ' ')}  ${String(row.score).padStart(4, '0')} pts  [${row.mode || 'COPA'}]`,
        12,
        i === 0 ? '#39ff14' : '#ffffff',
        0
      );
    }

    boxUI(g, 410, 368, 325, 144, 10, null, 0, 2, 0xffae00, 0.85);
    drawText(scene, 572, 388, '📦 PODERES VENEZOLANOS', 14, '#ffae00');
    drawText(scene, 452, 418, 'Mango Bajito: ¡RESCATA PISO!', 12, '#ffffff', 0);
    drawText(scene, 452, 440, 'Arepa / Reina Pepiada (Homing)', 12, '#ffffff', 0);
    drawText(scene, 452, 462, 'El Fiscal (Al 1°) / Malta Turbo', 12, '#ffffff', 0);
    drawText(scene, 452, 484, '¡CSM SE FUE LA LUZ! / Estrella', 12, '#ffffff', 0);

    boxUI(g, 165, 528, 470, 44, 10, 0xe1ff00, 0.7 + 0.3 * M_sin(time * 0.008), 0, 0);
    drawText(scene, W / 2, 550, 'PRESIONA START (ENTER) O BOTÓN 1 (U / R) PARA JUGAR', 14, '#050b12', 0.5, false);

    if (eatAny(['START1', 'START2', 'P1_1', 'P2_1', 'P1_2', 'P2_2'])) {
      sfx.init();
      sfx.sfx('select');
      st.phase = 'setup';
      st.setupStep = 0;
      st.p1Ready = false;
      st.p2Ready = false;
      clearPressed();
    }
  }

  // =========================================================================
  // PANTALLA DE SELECCIÓN
  // =========================================================================
  function updateSetupScreen(scene, time) {
    const st = scene.state;
    const ctx = scene.screenCtx;
    const g = scene.uiGfx;

    ctx.fillStyle = '#060c18';
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 4; i++) {
      const v = VEHICLES[i];
      const cx = 122 + i * 185;
      const cy = 320;
      const isP1 = st.p1Veh === i;
      const isP2 = st.players === 2 && st.p2Veh === i;

      ctx.fillStyle = isP1 || isP2 ? '#11223d' : '#0a1324';
      ctx.strokeStyle = isP1 ? '#e1ff00' : isP2 ? '#ff6ec7' : '#263859';
      ctx.lineWidth = isP1 || isP2 ? 3 : 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - 82, cy - 110, 164, 210, 12);
      ctx.fill();
      ctx.stroke();

      const rotSteer = isP1 || isP2 ? M_sin(time * 0.004) * 0.45 : 0;
      drawKartSprite3D(ctx, v.id, cx, cy - 16, 98, rotSteer, time, isP1 && st.p1Ready, false);

      const sLabels = ['VEL', 'ACE', 'DIR', 'PES'];
      for (let s = 0; s < 4; s++) {
        const sy = cy + 38 + s * 14;
        for (let b = 0; b < 5; b++) {
          ctx.fillStyle = b < v.stats[s] ? v.hex : '#1e293b';
          ctx.fillRect(cx - 30 + b * 18, sy - 4, 14, 7);
        }
        drawText(scene, cx - 64, sy, sLabels[s], 10, '#94a3b8', 0);
      }
    }

    scene.screenTex.refresh();

    boxUI(g, 40, 18, 720, 48, 10, 0x091326, 0.95, 2, 0x00e5ff, 0.9);
    drawText(scene, W / 2, 42, 'ARMA TU CAIMANERA 3D • ELIGE MODO Y NAVE', 22, '#ffe600');

    const p1BoxCol = st.players === 1 ? 0x39ff14 : 0x334155;
    const p2BoxCol = st.players === 2 ? 0xff6ec7 : 0x334155;
    boxUI(g, 55, 80, 160, 42, 8, st.players === 1 ? 0x13381e : 0x0b1528, 0.95, st.setupStep === 0 ? 3 : 1.5, p1BoxCol);
    boxUI(g, 225, 80, 160, 42, 8, st.players === 2 ? 0x38132e : 0x0b1528, 0.95, st.setupStep === 0 ? 3 : 1.5, p2BoxCol);
    drawText(scene, 135, 101, '👤 1 JUGADOR', 14, st.players === 1 ? '#39ff14' : '#94a3b8');
    drawText(scene, 305, 101, '👥 2 JUGADORES', 14, st.players === 2 ? '#ff6ec7' : '#94a3b8');

    const curMode = MODES[st.modeIdx];
    boxUI(g, 405, 80, 340, 42, 8, 0x162238, 0.95, st.setupStep === 0 ? 3 : 1.5, 0xffae00, 1);
    drawText(scene, 575, 101, `◀  ${curMode.name}  ▶`, 15, '#ffe600');

    boxUI(g, 40, 132, 720, 34, 8, 0x091426, 0.85, 0, 0);
    drawText(scene, W / 2, 149, curMode.desc, 13, '#7ef9ff');

    for (let i = 0; i < 4; i++) {
      const v = VEHICLES[i];
      const cx = 122 + i * 185;
      const cy = 320;
      drawText(scene, cx, cy + 4, v.name, 14, '#ffe600');
      drawText(scene, cx, cy + 20, v.sub, 9, '#cbd5e1');

      if (st.p1Veh === i) {
        boxUI(g, cx - 72, cy - 128, 64, 22, 6, st.p1Ready ? 0x39ff14 : 0xe1ff00, 1, 0, 0);
        drawText(scene, cx - 40, cy - 117, st.p1Ready ? 'P1 LISTO' : 'P1', 11, '#050b12', 0.5, false);
      }
      if (st.players === 2 && st.p2Veh === i) {
        boxUI(g, cx + 8, cy - 128, 64, 22, 6, st.p2Ready ? 0x39ff14 : 0xff6ec7, 1, 0, 0);
        drawText(scene, cx + 40, cy - 117, st.p2Ready ? 'P2 LISTO' : 'P2', 11, '#050b12', 0.5, false);
      }
    }

    boxUI(g, 40, 452, 720, 82, 10, 0x070d19, 0.92, 2, 0xe1ff00, 0.85);
    const helpMsg =
      st.setupStep === 0
        ? 'PASO 1: ⬆/⬇ JUGADORES • ⬅/➡ MODALIDAD • PULSA BOTÓN 1 (U / ENTER) PARA ELEGIR NAVE'
        : 'PASO 2: ⬅/➡ ELIGE TU NAVE • PULSA BOTÓN 1 (U / ENTER) PARA ARRANCAR LA CARRERA';
    drawText(scene, W / 2, 472, helpMsg, 13, '#ffe600');
    drawText(
      scene,
      W / 2,
      495,
      'CONTROLES 3D: W/S ACELERAR/FRENAR • A/D CRUZAR • U PODER/CORNETA • I/SHIFT DERRAPAR (MINI-TURBO)',
      12,
      '#ffffff'
    );
    drawText(
      scene,
      W / 2,
      516,
      'TIP: ¡ACELERA EN EL "2" DEL SEMÁFORO PARA ARRANQUE EXPLOSIVO Y SALTA EN LA RAMPA DE CANAIMA!',
      11,
      '#39ff14'
    );

    if (st.setupStep === 0) {
      if (eat('P1_U') || eat('P1_D') || eat('P2_U') || eat('P2_D')) {
        st.players = st.players === 1 ? 2 : 1;
        sfx.sfx('move');
      }
      if (eat('P1_L') || eat('P2_L')) {
        st.modeIdx = (st.modeIdx + MODES.length - 1) % MODES.length;
        sfx.sfx('move');
      }
      if (eat('P1_R') || eat('P2_R')) {
        st.modeIdx = (st.modeIdx + 1) % MODES.length;
        sfx.sfx('move');
      }
      if (eatAny(['P1_1', 'START1', 'P2_1', 'START2'])) {
        st.setupStep = 1;
        sfx.sfx('select');
      }
    } else {
      if (!st.p1Ready) {
        if (eat('P1_L')) {
          st.p1Veh = (st.p1Veh + 3) % 4;
          sfx.sfx('move');
        }
        if (eat('P1_R')) {
          st.p1Veh = (st.p1Veh + 1) % 4;
          sfx.sfx('move');
        }
        if (eatAny(['P1_1', 'START1'])) {
          st.p1Ready = true;
          sfx.sfx('select');
        }
      }
      if (st.players === 2 && !st.p2Ready) {
        if (eat('P2_L')) {
          st.p2Veh = (st.p2Veh + 3) % 4;
          sfx.sfx('move');
        }
        if (eat('P2_R')) {
          st.p2Veh = (st.p2Veh + 1) % 4;
          sfx.sfx('move');
        }
        if (eatAny(['P2_1', 'START2'])) {
          st.p2Ready = true;
          sfx.sfx('select');
        }
      }
      if (eat('P1_2') || eat('P2_2')) {
        st.setupStep = 0;
        st.p1Ready = false;
        st.p2Ready = false;
        sfx.sfx('move');
      }
      if (st.p1Ready && (st.players === 1 || st.p2Ready)) {
        startRaceMatch(scene);
      }
    }
    clearPressed();
  }

  // =========================================================================
  // PANTALLA DE RESULTADOS + TECLADO ARCADE A-Z
  // =========================================================================
  const KB_ROWS = ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZ<✓'];

  function updateGameOverScreen(scene, time, dt) {
    const st = scene.state;
    const ctx = scene.screenCtx;
    const g = scene.uiGfx;

    ctx.fillStyle = '#050b16';
    ctx.fillRect(0, 0, W, H);
    scene.screenTex.refresh();

    boxUI(g, 55, 22, 690, 88, 12, 0x0b162c, 0.96, 3, 0xffe600, 1);
    drawText(scene, W / 2, 50, st.winTitle, 24, '#ffe600');
    drawText(scene, W / 2, 84, st.winSub, 14, '#7ef9ff');

    boxUI(g, 55, 124, 690, 142, 10, 0x070f1e, 0.92, 2, 0x00e5ff, 0.85);
    drawText(scene, W / 2, 144, '🏁 POSICIONES DE LA CAIMANERA 🏁', 15, '#39ff14');

    const sorted = [...scene.karts].sort((a, b) => a.rank - b.rank);
    for (let i = 0; i < sorted.length; i++) {
      const k = sorted[i];
      const ry = 172 + i * 22;
      drawText(
        scene,
        120,
        ry,
        `${k.rank}°  ${k.id.padEnd(6, ' ')} • ${k.veh.name}`,
        14,
        k.isHuman ? '#ffe600' : '#ffffff',
        0
      );
      const extra =
        MODES[st.modeIdx].id === 'ko'
          ? (k.alive ? '¡SOBREVIVIÓ!' : 'ELIMINADO')
          : `Vuelta ${M_min(k.lap, 3)}`;
      drawText(scene, 530, ry, extra, 13, '#00e5ff', 0);
    }

    const ne = st.ne;
    if (ne.active && !ne.saved) {
      boxUI(g, 55, 280, 690, 220, 12, 0x0b1528, 0.95, 2, 0xff6ec7, 0.95);
      drawText(
        scene,
        W / 2,
        304,
        `🏆 ¡NUEVO RÉCORD (${st.finalScore} PTS)! INGRESA TUS INICIALES:`,
        16,
        '#ffe600'
      );

      const slotsStr = ne.chars.join('  ');
      boxUI(g, W / 2 - 75, 322, 150, 36, 8, 0x050912, 1, 2, 0x39ff14, 1);
      drawText(scene, W / 2, 340, slotsStr, 22, '#39ff14');

      for (let r = 0; r < KB_ROWS.length; r++) {
        const rowStr = KB_ROWS[r];
        for (let c = 0; c < rowStr.length; c++) {
          const ch = rowStr[c];
          const kx = 175 + c * 50;
          const ky = 382 + r * 36;
          const sel = ne.row === r && ne.col === c;
          boxUI(g, kx - 20, ky - 14, 40, 28, 6, sel ? 0xe1ff00 : 0x16243d, 1, 1, 0x00e5ff, 0.7);
          drawText(
            scene,
            kx,
            ky,
            ch === '<' ? '⌫' : ch === '✓' ? 'OK' : ch,
            14,
            sel ? '#050b12' : '#ffffff',
            0.5,
            !sel
          );
        }
      }

      if (time >= ne.cd) {
        if (eat('P1_L') || eat('P2_L')) {
          ne.col = (ne.col + KB_ROWS[ne.row].length - 1) % KB_ROWS[ne.row].length;
          sfx.sfx('move');
        }
        if (eat('P1_R') || eat('P2_R')) {
          ne.col = (ne.col + 1) % KB_ROWS[ne.row].length;
          sfx.sfx('move');
        }
        if (eat('P1_U') || eat('P2_U')) {
          ne.row = (ne.row + KB_ROWS.length - 1) % KB_ROWS.length;
          ne.col = M_min(ne.col, KB_ROWS[ne.row].length - 1);
          sfx.sfx('move');
        }
        if (eat('P1_D') || eat('P2_D')) {
          ne.row = (ne.row + 1) % KB_ROWS.length;
          ne.col = M_min(ne.col, KB_ROWS[ne.row].length - 1);
          sfx.sfx('move');
        }

        if (eatAny(['P1_1', 'P2_1'])) {
          const picked = KB_ROWS[ne.row][ne.col];
          if (picked === '<') {
            if (ne.chars.length > 0) ne.chars.pop();
            sfx.sfx('move');
          } else if (picked === '✓') {
            commitScore(scene);
          } else {
            if (ne.chars.length < 3) ne.chars.push(picked);
            sfx.sfx('select');
            if (ne.chars.length === 3) {
              ne.row = 2;
              ne.col = KB_ROWS[2].length - 1;
            }
          }
        } else if (eatAny(['P1_2', 'P2_2'])) {
          if (ne.chars.length > 0) ne.chars.pop();
          sfx.sfx('move');
        } else if (eatAny(['START1', 'START2'])) {
          commitScore(scene);
        }
      }
    } else {
      boxUI(g, 55, 280, 690, 220, 12, 0x0b1528, 0.95, 2, 0x39ff14, 0.95);
      drawText(scene, W / 2, 306, '🏆 TABLA HISTÓRICA DE RÉCORDS 🏆', 18, '#ffe600');

      for (let i = 0; i < M_min(6, st.leaderboard.length); i++) {
        const row = st.leaderboard[i];
        drawText(
          scene,
          170,
          338 + i * 24,
          `${i + 1}.  ${row.name.padEnd(4, ' ')} • ${String(row.score).padStart(4, '0')} PTS • ${row.mode || 'COPA VE'} (${row.veh || 'MALIBU'})`,
          14,
          i === 0 ? '#39ff14' : '#ffffff',
          0
        );
      }

      if (eatAny(['P1_1', 'P2_1', 'START1', 'START2'])) {
        sfx.sfx('select');
        startRaceMatch(scene);
        clearPressed();
        return;
      } else if (eatAny(['P1_2', 'P2_2'])) {
        sfx.sfx('move');
        st.phase = 'title';
        clearPressed();
        return;
      }
    }

    boxUI(g, 140, 515, 520, 44, 10, 0xe1ff00, 0.92, 0, 0);
    drawText(
      scene,
      W / 2,
      537,
      ne.saved
        ? 'BOTÓN 1 / START: OTRA CARRERA   •   BOTÓN 2 (I / SHIFT): MENÚ PRINCIPAL'
        : 'ELIGE TUS 3 LETRAS CON EL JOYSTICK Y PULSA "OK" O START PARA GUARDAR',
      13,
      '#050b12',
      0.5,
      false
    );
  }

  function commitScore(scene) {
    const st = scene.state;
    const ne = st.ne;
    if (ne.saved) return;
    ne.saved = true;
    ne.active = false;
    const cleanName = (ne.chars.join('') || 'VZL').slice(0, 3).toUpperCase();
    st.leaderboard.push({
      name: cleanName,
      score: st.finalScore,
      mode: MODES[st.modeIdx].short,
      veh: st.winVeh,
    });
    st.leaderboard.sort((a, b) => b.score - a.score);
    st.leaderboard = st.leaderboard.slice(0, 8);
    saveLeaderboard(st.leaderboard);
    sfx.sfx('win');
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent: 'game-root',
    backgroundColor: '#050811',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [CaimaneraScene],
  });
})();
