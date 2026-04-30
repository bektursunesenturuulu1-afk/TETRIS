/* ============================================================
   NEON TETRIS — Full Game Engine
   ============================================================ */

// ─── Canvas Setup ─────────────────────────────────────────────────
const canvas     = document.getElementById('gameCanvas');
const ctx        = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx    = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('holdCanvas');
const holdCtx    = holdCanvas.getContext('2d');

const COLS       = 10;
const ROWS       = 20;
const BLOCK      = canvas.width / COLS;   // 30px

// ─── Tetromino Definitions ─────────────────────────────────────────
const PIECES = {
  I: { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: '#00f5ff', glow: '#00f5ff' },
  O: { shape: [[1,1],[1,1]],                               color: '#ffe600', glow: '#ffe600' },
  T: { shape: [[0,1,0],[1,1,1],[0,0,0]],                  color: '#bf00ff', glow: '#bf00ff' },
  S: { shape: [[0,1,1],[1,1,0],[0,0,0]],                  color: '#00ff88', glow: '#00ff88' },
  Z: { shape: [[1,1,0],[0,1,1],[0,0,0]],                  color: '#ff2d55', glow: '#ff2d55' },
  J: { shape: [[1,0,0],[1,1,1],[0,0,0]],                  color: '#0066ff', glow: '#0066ff' },
  L: { shape: [[0,0,1],[1,1,1],[0,0,0]],                  color: '#ff8c00', glow: '#ff8c00' },
};
const PIECE_KEYS = Object.keys(PIECES);

// ─── Scoring ───────────────────────────────────────────────────────
const SCORE_TABLE = { 1: 100, 2: 300, 3: 500, 4: 800 };
const COMBO_BONUS  = [0, 0, 50, 100, 200, 300, 400, 500];
const LINE_NAMES   = { 1: 'SINGLE', 2: 'DOUBLE', 3: 'TRIPLE', 4: '✦ TETRIS ✦' };

// ─── Game State ────────────────────────────────────────────────────
let board, score, level, lines, highScore, combo;
let currentPiece, nextPiece, holdPiece, canHold;
let dropInterval, lastDrop, animId;
let gameRunning, gamePaused, gameOver;
let flashRows = [];

// ─── Bag Randomiser (7-bag) ────────────────────────────────────────
let bag = [];
function getNextFromBag() {
  if (bag.length === 0) {
    bag = [...PIECE_KEYS].sort(() => Math.random() - 0.5);
  }
  return bag.pop();
}

// ─── Board ─────────────────────────────────────────────────────────
function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

// ─── Piece ────────────────────────────────────────────────────────
function createPiece(key) {
  const def = PIECES[key];
  return {
    key,
    shape: def.shape.map(row => [...row]),
    color: def.color,
    glow:  def.glow,
    x: Math.floor((COLS - def.shape[0].length) / 2),
    y: 0,
  };
}

function rotatePiece(piece) {
  const n = piece.shape.length;
  const m = piece.shape[0].length;
  const rotated = Array.from({ length: m }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++)
    for (let c = 0; c < m; c++)
      rotated[c][n - 1 - r] = piece.shape[r][c];
  return rotated;
}

// ─── Collision ─────────────────────────────────────────────────────
function collides(piece, board, dx = 0, dy = 0, shape = piece.shape) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

// ─── Wall Kick (SRS simplified) ───────────────────────────────────
const KICKS = [[0,0],[-1,0],[1,0],[-2,0],[2,0]];
function tryRotate(piece) {
  const newShape = rotatePiece(piece);
  for (const [dx, dy] of KICKS) {
    if (!collides(piece, board, dx, dy, newShape)) {
      piece.shape = newShape;
      piece.x += dx;
      piece.y += dy;
      return true;
    }
  }
  return false;
}

// ─── Ghost Piece ──────────────────────────────────────────────────
function getGhostY(piece) {
  let dy = 0;
  while (!collides(piece, board, 0, dy + 1)) dy++;
  return piece.y + dy;
}

// ─── Lock Piece ───────────────────────────────────────────────────
function lockPiece() {
  for (let r = 0; r < currentPiece.shape.length; r++) {
    for (let c = 0; c < currentPiece.shape[r].length; c++) {
      if (!currentPiece.shape[r][c]) continue;
      const ny = currentPiece.y + r;
      if (ny < 0) { triggerGameOver(); return; }
      board[ny][currentPiece.x + c] = currentPiece.color;
    }
  }
  clearLines();
  canHold = true;
  spawnPiece();
}

// ─── Clear Lines ──────────────────────────────────────────────────
function clearLines() {
  const full = [];
  for (let r = 0; r < ROWS; r++) {
    if (board[r].every(cell => cell !== null)) full.push(r);
  }
  if (full.length === 0) { combo = 0; return; }

  combo++;
  flashRows = [...full];

  setTimeout(() => {
    full.sort((a,b) => b - a).forEach(r => {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(null));
    });
    flashRows = [];

    const pts = (SCORE_TABLE[full.length] || 0) * level;
    const cb  = COMBO_BONUS[Math.min(combo, COMBO_BONUS.length - 1)];
    addScore(pts + cb);
    lines += full.length;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(80, 800 - (level - 1) * 70);

    updateUI();
    showLinePopup(full.length, combo > 1);
    if (combo > 1) showCombo(combo);
  }, 150);
}

// ─── Spawn ────────────────────────────────────────────────────────
function spawnPiece() {
  currentPiece = nextPiece || createPiece(getNextFromBag());
  nextPiece    = createPiece(getNextFromBag());
  if (collides(currentPiece, board)) { triggerGameOver(); }
  drawNext();
}

// ─── Hold ─────────────────────────────────────────────────────────
function holdCurrentPiece() {
  if (!canHold) return;
  canHold = false;
  if (holdPiece) {
    const tmp  = createPiece(holdPiece.key);
    holdPiece  = createPiece(currentPiece.key);
    currentPiece = tmp;
  } else {
    holdPiece    = createPiece(currentPiece.key);
    spawnPiece();
    return;
  }
  drawHold();
}

// ─── Score ────────────────────────────────────────────────────────
function addScore(pts) {
  score += pts;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('tetrisHS', highScore);
  }
  document.getElementById('score').classList.remove('pulse');
  void document.getElementById('score').offsetWidth;
  document.getElementById('score').classList.add('pulse');
}

function updateUI() {
  document.getElementById('score').textContent     = score.toLocaleString();
  document.getElementById('level').textContent     = level;
  document.getElementById('lines').textContent     = lines;
  document.getElementById('highscore').textContent = highScore.toLocaleString();
}

// ─── Popups ───────────────────────────────────────────────────────
let popupTimer = null;
function showLinePopup(count, isCombo) {
  const el = document.getElementById('line-popup');
  const colors = { 1: '#00f5ff', 2: '#00ff88', 3: '#ff8c00', 4: '#ffe600' };
  el.textContent = LINE_NAMES[count] || '';
  el.style.color = colors[count] || '#fff';
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(popupTimer);
  popupTimer = setTimeout(() => el.classList.remove('show'), 900);
}

let comboTimer = null;
function showCombo(n) {
  const el = document.getElementById('combo-display');
  el.textContent = `${n}x COMBO!`;
  clearTimeout(comboTimer);
  comboTimer = setTimeout(() => { el.textContent = ''; }, 1500);
}

// ─── Drawing ──────────────────────────────────────────────────────
function drawBlock(ctx, x, y, color, size = BLOCK, alpha = 1, isGhost = false) {
  const s = size;
  ctx.save();
  ctx.globalAlpha = alpha;

  if (isGhost) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x * s + 1, y * s + 1, s - 2, s - 2);
    ctx.restore();
    return;
  }

  // Shadow / glow
  ctx.shadowColor  = color;
  ctx.shadowBlur   = 14;

  // Main fill
  const grad = ctx.createLinearGradient(x*s, y*s, x*s + s, y*s + s);
  grad.addColorStop(0, lighten(color, 40));
  grad.addColorStop(1, color);
  ctx.fillStyle = grad;
  ctx.fillRect(x * s + 1, y * s + 1, s - 2, s - 2);

  // Inner highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x * s + 2, y * s + 2, s - 4, 4);

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x * s + 1, y * s + 1, s - 2, s - 2);

  ctx.restore();
}

function lighten(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + amount);
  const g = Math.min(255, ((n >> 8) & 0xff) + amount);
  const b = Math.min(255, (n & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx.strokeStyle = 'rgba(0,245,255,0.05)';
  ctx.lineWidth   = 0.5;
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * BLOCK); ctx.lineTo(canvas.width, r * BLOCK); ctx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * BLOCK, 0); ctx.lineTo(c * BLOCK, canvas.height); ctx.stroke();
  }

  // Board cells
  for (let r = 0; r < ROWS; r++) {
    const isFlash = flashRows.includes(r);
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) {
        if (isFlash) {
          ctx.save();
          ctx.fillStyle = '#fff';
          ctx.shadowColor = '#fff';
          ctx.shadowBlur = 20;
          ctx.fillRect(c * BLOCK + 1, r * BLOCK + 1, BLOCK - 2, BLOCK - 2);
          ctx.restore();
        } else {
          drawBlock(ctx, c, r, board[r][c]);
        }
      }
    }
  }
}

function drawPiece() {
  if (!currentPiece) return;

  // Ghost
  const gy = getGhostY(currentPiece);
  if (gy !== currentPiece.y) {
    for (let r = 0; r < currentPiece.shape.length; r++)
      for (let c = 0; c < currentPiece.shape[r].length; c++)
        if (currentPiece.shape[r][c])
          drawBlock(ctx, currentPiece.x + c, gy + r, currentPiece.color, BLOCK, 0.35, true);
  }

  // Active piece
  for (let r = 0; r < currentPiece.shape.length; r++)
    for (let c = 0; c < currentPiece.shape[r].length; c++)
      if (currentPiece.shape[r][c])
        drawBlock(ctx, currentPiece.x + c, currentPiece.y + r, currentPiece.color);
}

function drawPreview(pCtx, pCanvas, piece) {
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
  if (!piece) return;
  const size   = 24;
  const cols   = piece.shape[0].length;
  const rows   = piece.shape.length;
  const ox     = (pCanvas.width  / size - cols) / 2;
  const oy     = (pCanvas.height / size - rows) / 2;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (piece.shape[r][c])
        drawBlock(pCtx, ox + c, oy + r, piece.color, size);
}

function drawNext() { drawPreview(nextCtx, nextCanvas, nextPiece); }
function drawHold() { drawPreview(holdCtx, holdCanvas, holdPiece); }

// ─── Game Loop ────────────────────────────────────────────────────
function gameLoop(ts) {
  if (!gameRunning || gamePaused) return;
  animId = requestAnimationFrame(gameLoop);

  if (!lastDrop) lastDrop = ts;
  if (ts - lastDrop >= dropInterval) {
    lastDrop = ts;
    moveDown();
  }

  drawBoard();
  drawPiece();
}

// ─── Movement ─────────────────────────────────────────────────────
function moveLeft()  { if (!collides(currentPiece, board, -1)) currentPiece.x--; }
function moveRight() { if (!collides(currentPiece, board,  1)) currentPiece.x++; }
function moveDown()  {
  if (!collides(currentPiece, board, 0, 1)) { currentPiece.y++; }
  else { lockPiece(); }
}
function hardDrop() {
  let pts = 0;
  while (!collides(currentPiece, board, 0, 1)) { currentPiece.y++; pts += 2; }
  addScore(pts);
  lockPiece();
  updateUI();
}

// ─── Game Over ────────────────────────────────────────────────────
function triggerGameOver() {
  gameRunning = false;
  cancelAnimationFrame(animId);
  drawBoard();

  setTimeout(() => {
    const overlay = document.getElementById('overlay');
    document.getElementById('overlay-title').textContent = 'GAME OVER';
    document.getElementById('overlay-title').style.color  = '#ff2d55';
    document.getElementById('overlay-title').style.textShadow = '0 0 20px #ff2d55, 0 0 40px #ff2d55';
    document.getElementById('overlay-sub').textContent   = `Score: ${score.toLocaleString()}`;
    document.getElementById('btn-start').textContent     = '▶ PLAY AGAIN';
    overlay.classList.remove('hidden');
  }, 600);
}

// ─── Start / Restart ──────────────────────────────────────────────
function startGame() {
  board        = createBoard();
  score        = 0;
  level        = 1;
  lines        = 0;
  combo        = 0;
  dropInterval = 800;
  lastDrop     = null;
  holdPiece    = null;
  canHold      = true;
  bag          = [];
  flashRows    = [];
  gameRunning  = true;
  gamePaused   = false;
  gameOver     = false;

  highScore = parseInt(localStorage.getItem('tetrisHS') || '0');
  updateUI();

  nextPiece = createPiece(getNextFromBag());
  spawnPiece();
  drawNext();
  drawHold();

  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('overlay-title').style.color = '#00f5ff';
  document.getElementById('overlay-title').style.textShadow = '0 0 20px #00f5ff, 0 0 40px #00f5ff';

  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(gameLoop);
}

function togglePause() {
  if (!gameRunning) return;
  gamePaused = !gamePaused;
  document.getElementById('btn-pause').textContent = gamePaused ? '▶ RESUME' : '⏸ PAUSE';

  if (!gamePaused) {
    lastDrop = null;
    animId   = requestAnimationFrame(gameLoop);
  }

  const overlay = document.getElementById('overlay');
  if (gamePaused) {
    document.getElementById('overlay-title').textContent  = 'PAUSED';
    document.getElementById('overlay-title').style.color = '#00f5ff';
    document.getElementById('overlay-sub').textContent   = 'Press P or click Resume';
    document.getElementById('btn-start').textContent     = '▶ RESUME';
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

// ─── Keyboard Controls ────────────────────────────────────────────
const keysHeld = {};
const DAS_DELAY = 170;
const DAS_RATE  = 50;
let dasTimer = null, dasRepeat = null;

function startDAS(dir) {
  if (dir === 'left')  moveLeft();
  if (dir === 'right') moveRight();
  clearTimeout(dasTimer); clearInterval(dasRepeat);
  dasTimer = setTimeout(() => {
    dasRepeat = setInterval(() => {
      if (dir === 'left')  moveLeft();
      if (dir === 'right') moveRight();
    }, DAS_RATE);
  }, DAS_DELAY);
}
function stopDAS() {
  clearTimeout(dasTimer); clearInterval(dasRepeat);
}

document.addEventListener('keydown', e => {
  if (keysHeld[e.code]) return;
  keysHeld[e.code] = true;

  if (!gameRunning || gamePaused) {
    if (e.code === 'KeyP') togglePause();
    return;
  }

  switch (e.code) {
    case 'ArrowLeft':  e.preventDefault(); startDAS('left');  break;
    case 'ArrowRight': e.preventDefault(); startDAS('right'); break;
    case 'ArrowDown':  e.preventDefault(); moveDown(); addScore(1); updateUI(); break;
    case 'ArrowUp':    e.preventDefault(); tryRotate(currentPiece); break;
    case 'KeyZ':       tryRotate(currentPiece); break;
    case 'Space':      e.preventDefault(); hardDrop(); break;
    case 'KeyC':       holdCurrentPiece(); drawHold(); break;
    case 'KeyP':       togglePause(); break;
  }
});

document.addEventListener('keyup', e => {
  keysHeld[e.code] = false;
  if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') stopDAS();
});

// ─── Buttons ──────────────────────────────────────────────────────
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-pause').addEventListener('click', togglePause);
document.getElementById('btn-restart').addEventListener('click', startGame);

// ─── Touch Controls (swipe) ────────────────────────────────────────
let touchX, touchY;
canvas.addEventListener('touchstart', e => {
  touchX = e.touches[0].clientX;
  touchY = e.touches[0].clientY;
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchmove', e => { e.preventDefault(); }, { passive: false });
canvas.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchX;
  const dy = e.changedTouches[0].clientY - touchY;
  if (!gameRunning || gamePaused) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 20) moveRight(); else if (dx < -20) moveLeft();
  } else {
    if (dy > 20) moveDown(); else if (dy < -20) tryRotate(currentPiece);
  }
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) tryRotate(currentPiece);
  e.preventDefault();
}, { passive: false });

// ─── Particles ────────────────────────────────────────────────────
(function spawnParticles() {
  const container = document.getElementById('particles');
  const colors = ['#00f5ff','#ffe600','#00ff88','#ff2d55','#bf00ff','#ff8c00'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    const size = Math.random() * 3 + 1;
    p.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${Math.random() * 100}%;
      bottom: ${Math.random() * -20}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration: ${Math.random() * 10 + 8}s;
      animation-delay: ${Math.random() * 10}s;
    `;
    container.appendChild(p);
  }
})();

// ─── Init ─────────────────────────────────────────────────────────
highScore = parseInt(localStorage.getItem('tetrisHS') || '0');
document.getElementById('highscore').textContent = highScore.toLocaleString();

// Draw empty board on load
board = createBoard();
ctx.clearRect(0, 0, canvas.width, canvas.height);
ctx.strokeStyle = 'rgba(0,245,255,0.05)';
ctx.lineWidth   = 0.5;
for (let r = 0; r <= ROWS; r++) {
  ctx.beginPath(); ctx.moveTo(0, r * BLOCK); ctx.lineTo(canvas.width, r * BLOCK); ctx.stroke();
}
for (let c = 0; c <= COLS; c++) {
  ctx.beginPath(); ctx.moveTo(c * BLOCK, 0); ctx.lineTo(c * BLOCK, canvas.height); ctx.stroke();
}
