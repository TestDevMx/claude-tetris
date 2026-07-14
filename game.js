'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#64b5f6', // J - pale blue
  '#ffb74d', // L - orange
  '#90a4ae', // + pentominó - gris azulado
  '#ff8a65', // U pentominó - naranja
  '#aed581', // Y pentominó - verde claro
  '#fff176', // Single (recompensa Tetris) - dorado
  '#b0bec5', // Tuerca 3x3 hueca (reto) - gris metálico
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[0,8,0],[8,8,8],[0,8,0]],                  // + pentominó
  [[9,0,9],[9,9,9]],                           // U pentominó
  [[0,10],[10,10],[0,10],[0,10]],             // Y pentominó
  [[11]],                                      // Single (recompensa Tetris)
  [[12,12,12],[12,0,12],[12,12,12]],          // Tuerca 3x3 hueca (reto)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const SPECIAL_TYPES = [8, 9, 10, 12]; // pentominós + tuerca — nunca 11 (solo recompensa)
const SPECIAL_CHANCE = 0.15;

const GRID_COLORS = { dark: '#22222e', light: '#c8c8d8' };

// Paleta "neon": versiones saturadas/brillantes de COLORS, mismo índice = misma pieza.
const NEON_COLORS = [
  null,
  '#00ffff', // I
  '#ffff00', // O
  '#e040fb', // T
  '#39ff14', // S
  '#ff1744', // Z
  '#2979ff', // J
  '#ff9100', // L
  '#00e5ff', // +
  '#ff3d00', // U
  '#76ff03', // Y
  '#ffea00', // Single
  '#e0e0e0', // Tuerca 3x3
];

// Paleta "pastel": versiones suaves/desaturadas de COLORS.
const PASTEL_COLORS = [
  null,
  '#b2ebf2', // I
  '#fff9c4', // O
  '#e1bee7', // T
  '#c8e6c9', // S
  '#ffcdd2', // Z
  '#bbdefb', // J
  '#ffe0b2', // L
  '#cfd8dc', // +
  '#ffccbc', // U
  '#dcedc8', // Y
  '#fff59d', // Single
  '#d7dee1', // Tuerca 3x3
];

// Cada skin define su propia paleta de colores y su estilo de dibujo de bloque.
const SKINS = {
  retro: { colors: COLORS, boardBg: null, style: 'retro' },
  neon: { colors: NEON_COLORS, boardBg: '#000000', style: 'neon' },
  pastel: { colors: PASTEL_COLORS, boardBg: null, style: 'pastel' },
  pixelart: { colors: COLORS, boardBg: null, style: 'pixelart' },
};

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');
const skinSelect = document.getElementById('skin-select');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, rewardPending;
let theme = localStorage.getItem('tetris-theme') === 'light' ? 'light' : 'dark';
let skin = SKINS[localStorage.getItem('tetris-skin')] ? localStorage.getItem('tetris-skin') : 'retro';

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function pickType() {
  if (Math.random() < SPECIAL_CHANCE) {
    return SPECIAL_TYPES[Math.floor(Math.random() * SPECIAL_TYPES.length)];
  }
  return Math.floor(Math.random() * 7) + 1;
}

function randomPiece(forcedType) {
  const type = forcedType ?? pickType();
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    if (cleared === 4) rewardPending = true;
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece(rewardPending ? 11 : undefined);
  rewardPending = false;
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlockRetro(context, x, y, color, size) {
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
}

function drawBlockNeon(context, x, y, color, size) {
  context.save();
  context.shadowColor = color;
  context.shadowBlur = size * 0.6;
  context.fillStyle = color;
  context.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
  context.restore();
  context.fillStyle = 'rgba(255,255,255,0.3)';
  context.fillRect(x * size + 2, y * size + 2, size - 4, 3);
}

function drawBlockPastel(context, x, y, color, size) {
  const px = x * size + 1, py = y * size + 1, s = size - 2, r = size * 0.25;
  context.fillStyle = color;
  context.beginPath();
  if (typeof context.roundRect === 'function') {
    context.roundRect(px, py, s, s, r);
  } else {
    context.moveTo(px + r, py);
    context.arcTo(px + s, py, px + s, py + s, r);
    context.arcTo(px + s, py + s, px, py + s, r);
    context.arcTo(px, py + s, px, py, r);
    context.arcTo(px, py, px + s, py, r);
    context.closePath();
  }
  context.fill();
  context.fillStyle = 'rgba(255,255,255,0.35)';
  context.beginPath();
  if (typeof context.roundRect === 'function') {
    context.roundRect(px, py, s, s * 0.4, r);
    context.fill();
  }
}

function drawBlockPixelArt(context, x, y, color, size) {
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  context.fillStyle = color;
  context.fillRect(px, py, s, s);
  // sub-cuadrícula 2x2
  context.strokeStyle = 'rgba(0,0,0,0.35)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(px + s / 2, py);
  context.lineTo(px + s / 2, py + s);
  context.moveTo(px, py + s / 2);
  context.lineTo(px + s, py + s / 2);
  context.stroke();
  // puntos en las esquinas
  context.fillStyle = 'rgba(255,255,255,0.45)';
  const dot = Math.max(1, size * 0.08);
  context.fillRect(px + 2, py + 2, dot, dot);
  context.fillRect(px + s - 2 - dot, py + 2, dot, dot);
  context.fillRect(px + 2, py + s - 2 - dot, dot, dot);
  context.fillRect(px + s - 2 - dot, py + s - 2 - dot, dot, dot);
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const skinDef = SKINS[skin] || SKINS.retro;
  const color = skinDef.colors[colorIndex];
  context.globalAlpha = alpha ?? 1;
  switch (skinDef.style) {
    case 'neon':
      drawBlockNeon(context, x, y, color, size);
      break;
    case 'pastel':
      drawBlockPastel(context, x, y, color, size);
      break;
    case 'pixelart':
      drawBlockPixelArt(context, x, y, color, size);
      break;
    default:
      drawBlockRetro(context, x, y, color, size);
      break;
  }
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = GRID_COLORS[theme];
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const skinDef = SKINS[skin] || SKINS.retro;
  if (skinDef.boardBg) {
    ctx.fillStyle = skinDef.boardBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const skinDef = SKINS[skin] || SKINS.retro;
  if (skinDef.boardBg) {
    nextCtx.fillStyle = skinDef.boardBg;
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  }
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function applyTheme() {
  document.body.classList.toggle('light', theme === 'light');
  themeToggle.checked = theme === 'light';
}

function toggleTheme() {
  theme = themeToggle.checked ? 'light' : 'dark';
  localStorage.setItem('tetris-theme', theme);
  applyTheme();
}

function applySkin() {
  skinSelect.value = skin;
}

function changeSkin() {
  skin = SKINS[skinSelect.value] ? skinSelect.value : 'retro';
  localStorage.setItem('tetris-skin', skin);
  applySkin();
  if (next) drawNext();
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  if (gameOver) return;
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  rewardPending = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);
themeToggle.addEventListener('change', toggleTheme);
skinSelect.addEventListener('change', changeSkin);

applyTheme();
applySkin();
init();
