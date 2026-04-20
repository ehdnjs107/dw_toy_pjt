const BOARD_SIZE = 15;
const BLACK = 1;
const WHITE = 2;

let board = [];
let currentPlayer = BLACK;
let gameMode = '2p';
let gameOver = false;
let lastMove = null;
let toastTimer = null;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

let cellSize = 0;
let padding = 0;

// ── 초기화 ──────────────────────────────────────────────
function init() {
  board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
  currentPlayer = BLACK;
  gameOver = false;
  lastMove = null;
  document.getElementById('overlay').classList.add('hidden');
  hideToast();
  resize();
  updateStatus();
}

function setMode(mode) {
  gameMode = mode;
  document.getElementById('btn2p').classList.toggle('active', mode === '2p');
  document.getElementById('btnAI').classList.toggle('active', mode === 'ai');
  resetGame();
}

function resetGame() { init(); }

// ── 캔버스 크기 조정 ────────────────────────────────────
function resize() {
  const maxW = Math.min(window.innerWidth - 32, 500);
  const size = Math.floor(maxW);
  canvas.width = size;
  canvas.height = size;
  padding = Math.floor(size / BOARD_SIZE * 0.9);
  cellSize = (size - padding * 2) / (BOARD_SIZE - 1);
  drawBoard();
}

window.addEventListener('resize', resize);

// ── 그리기 ──────────────────────────────────────────────
function drawBoard() {
  const size = canvas.width;

  ctx.fillStyle = '#DCB67A';
  ctx.beginPath();
  roundRect(ctx, 0, 0, size, size, 8);
  ctx.fill();

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, 'rgba(255,220,130,0.3)');
  grad.addColorStop(1, 'rgba(160,100,30,0.2)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  roundRect(ctx, 0, 0, size, size, 8);
  ctx.fill();

  ctx.strokeStyle = 'rgba(80,40,0,0.6)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < BOARD_SIZE; i++) {
    const x = padding + i * cellSize;
    const y = padding + i * cellSize;
    ctx.beginPath(); ctx.moveTo(x, padding); ctx.lineTo(x, padding + (BOARD_SIZE - 1) * cellSize); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(padding + (BOARD_SIZE - 1) * cellSize, y); ctx.stroke();
  }

  const starPoints = [3, 7, 11];
  ctx.fillStyle = 'rgba(80,40,0,0.7)';
  for (const r of starPoints) {
    for (const c of starPoints) {
      ctx.beginPath();
      ctx.arc(padding + c * cellSize, padding + r * cellSize, cellSize * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c]) drawStone(r, c, board[r][c]);
    }
  }

  if (lastMove) {
    const { r, c } = lastMove;
    ctx.fillStyle = '#e94560';
    ctx.beginPath();
    ctx.arc(padding + c * cellSize, padding + r * cellSize, cellSize * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStone(r, c, player) {
  const x = padding + c * cellSize;
  const y = padding + r * cellSize;
  const radius = cellSize * 0.44;

  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 3;

  const grad = ctx.createRadialGradient(
    x - radius * 0.3, y - radius * 0.3, radius * 0.05,
    x, y, radius
  );
  if (player === BLACK) {
    grad.addColorStop(0, '#666');
    grad.addColorStop(1, '#000');
  } else {
    grad.addColorStop(0, '#fff');
    grad.addColorStop(1, '#bbb');
  }

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function drawWinLine(cells) {
  ctx.strokeStyle = 'rgba(233,69,96,0.85)';
  ctx.lineWidth = cellSize * 0.2;
  ctx.lineCap = 'round';
  const first = cells[0];
  const last = cells[cells.length - 1];
  ctx.beginPath();
  ctx.moveTo(padding + first.c * cellSize, padding + first.r * cellSize);
  ctx.lineTo(padding + last.c * cellSize, padding + last.r * cellSize);
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── 상태 UI ─────────────────────────────────────────────
function updateStatus() {
  const indicator = document.getElementById('stoneIndicator');
  const text = document.getElementById('statusText');
  if (currentPlayer === BLACK) {
    indicator.className = 'stone-indicator';
    text.textContent = gameMode === 'ai' ? '내 차례 (흑)' : '흑돌 차례';
  } else {
    indicator.className = 'stone-indicator white';
    text.textContent = gameMode === 'ai' ? 'AI 생각 중...' : '백돌 차례';
  }
}

function showWin(player, winCells) {
  drawWinLine(winCells);
  const overlay = document.getElementById('overlay');
  document.getElementById('overlayStone').className =
    player === BLACK ? 'overlay-stone' : 'overlay-stone white';
  document.getElementById('overlayText').textContent =
    gameMode === 'ai'
      ? (player === BLACK ? '승리했습니다!' : 'AI 승리!')
      : (player === BLACK ? '흑돌 승리!' : '백돌 승리!');
  overlay.classList.remove('hidden');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 1500);
}

function hideToast() {
  document.getElementById('toast').classList.add('hidden');
}

// ── 삼삼(33) 체크 ───────────────────────────────────────
/**
 * (r, c)에 흑돌을 뒀을 때 양쪽이 열린 삼(활삼)이 2개 이상 생기는지 확인.
 * - 5목이 되는 수는 승리이므로 삼삼 체크 제외.
 * - 4가 생기는 방향은 삼으로 카운트하지 않음 (4,3은 허용).
 */
function isDoubleSan(r, c) {
  if (currentPlayer !== BLACK) return false;

  board[r][c] = BLACK;

  // 5목 → 삼삼 체크 없이 통과
  if (checkWin(r, c, BLACK)) {
    board[r][c] = 0;
    return false;
  }

  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  let openThreeCount = 0;

  for (const [dr, dc] of dirs) {
    if (isOpenThreeInDir(r, c, dr, dc)) openThreeCount++;
  }

  board[r][c] = 0;
  return openThreeCount >= 2;
}

/**
 * (r, c)를 포함한 방향 (dr, dc)에서 양쪽 열린 삼이 만들어지는지 확인.
 * count === 3 이고 양 끝이 모두 빈 칸이어야 함.
 */
function isOpenThreeInDir(r, c, dr, dc) {
  let rightCount = 0;
  let nr = r + dr, nc = c + dc;
  while (inBounds(nr, nc) && board[nr][nc] === BLACK) {
    rightCount++;
    nr += dr; nc += dc;
  }
  const rightOpen = inBounds(nr, nc) && board[nr][nc] === 0;

  let leftCount = 0;
  nr = r - dr; nc = c - dc;
  while (inBounds(nr, nc) && board[nr][nc] === BLACK) {
    leftCount++;
    nr -= dr; nc -= dc;
  }
  const leftOpen = inBounds(nr, nc) && board[nr][nc] === 0;

  const total = 1 + leftCount + rightCount;
  // 정확히 3개이고 양쪽 모두 열려있어야 활삼
  return total === 3 && leftOpen && rightOpen;
}

function inBounds(r, c) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

// ── 게임 로직 ───────────────────────────────────────────
function placeStone(r, c) {
  if (gameOver || board[r][c]) return false;

  // 흑돌 삼삼 금지 체크
  if (currentPlayer === BLACK && isDoubleSan(r, c)) {
    showToast('삼삼 금지');
    return false;
  }

  board[r][c] = currentPlayer;
  lastMove = { r, c };
  drawBoard();

  const winCells = checkWin(r, c, currentPlayer);
  if (winCells) {
    gameOver = true;
    showWin(currentPlayer, winCells);
    return true;
  }

  currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
  updateStatus();
  return true;
}

function checkWin(r, c, player) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    const cells = getLine(r, c, dr, dc, player);
    if (cells.length >= 5) return cells;
  }
  return null;
}

function getLine(r, c, dr, dc, player) {
  const cells = [{ r, c }];
  for (const d of [-1, 1]) {
    let nr = r + dr * d, nc = c + dc * d;
    while (inBounds(nr, nc) && board[nr][nc] === player) {
      d === -1 ? cells.unshift({ r: nr, c: nc }) : cells.push({ r: nr, c: nc });
      nr += dr * d; nc += dc * d;
    }
  }
  return cells;
}

// ── 좌표 변환 ───────────────────────────────────────────
function getCell(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  const c = Math.round((x - padding) / cellSize);
  const r = Math.round((y - padding) / cellSize);
  if (!inBounds(r, c)) return null;
  return { r, c };
}

// ── 이벤트 ──────────────────────────────────────────────
canvas.addEventListener('click', (e) => {
  if (gameOver) return;
  if (gameMode === 'ai' && currentPlayer === WHITE) return;
  const cell = getCell(e.clientX, e.clientY);
  if (!cell) return;
  const placed = placeStone(cell.r, cell.c);
  if (placed && !gameOver && gameMode === 'ai') setTimeout(aiMove, 300);
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (gameOver) return;
  if (gameMode === 'ai' && currentPlayer === WHITE) return;
  const touch = e.touches[0];
  const cell = getCell(touch.clientX, touch.clientY);
  if (!cell) return;
  const placed = placeStone(cell.r, cell.c);
  if (placed && !gameOver && gameMode === 'ai') setTimeout(aiMove, 300);
}, { passive: false });

// ── AI ──────────────────────────────────────────────────
function aiMove() {
  if (gameOver) return;
  const move = getBestMove();
  if (move) placeStone(move.r, move.c);
}

function getBestMove() {
  const candidates = getCandidates();
  if (candidates.length === 0) {
    const mid = Math.floor(BOARD_SIZE / 2);
    return { r: mid, c: mid };
  }

  let bestScore = -Infinity;
  let bestMove = null;

  for (const { r, c } of candidates) {
    if (board[r][c]) continue;

    board[r][c] = WHITE;
    if (checkWin(r, c, WHITE)) { board[r][c] = 0; return { r, c }; }
    board[r][c] = 0;

    board[r][c] = BLACK;
    if (checkWin(r, c, BLACK)) { board[r][c] = 0; bestMove = { r, c }; bestScore = 100000; continue; }
    board[r][c] = 0;

    const score = evalPosition(r, c, WHITE) * 1.1 + evalPosition(r, c, BLACK);
    if (score > bestScore) { bestScore = score; bestMove = { r, c }; }
  }

  return bestMove;
}

function getCandidates() {
  const visited = new Set();
  const result = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!board[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = r + dr, nc = c + dc;
          if (!inBounds(nr, nc) || board[nr][nc]) continue;
          const key = nr * BOARD_SIZE + nc;
          if (!visited.has(key)) { visited.add(key); result.push({ r: nr, c: nc }); }
        }
      }
    }
  }
  return result;
}

function evalPosition(r, c, player) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  let score = 0;
  board[r][c] = player;
  for (const [dr, dc] of dirs) score += evalLine(r, c, dr, dc, player);
  board[r][c] = 0;
  return score;
}

function evalLine(r, c, dr, dc, player) {
  let count = 1, openEnds = 0;
  for (const d of [-1, 1]) {
    let nr = r + dr * d, nc = c + dc * d;
    while (inBounds(nr, nc) && board[nr][nc] === player) { count++; nr += dr * d; nc += dc * d; }
    if (inBounds(nr, nc) && board[nr][nc] === 0) openEnds++;
  }
  if (count >= 5) return 100000;
  if (count === 4 && openEnds === 2) return 10000;
  if (count === 4 && openEnds === 1) return 1000;
  if (count === 3 && openEnds === 2) return 500;
  if (count === 3 && openEnds === 1) return 100;
  if (count === 2 && openEnds === 2) return 50;
  if (count === 2 && openEnds === 1) return 10;
  return openEnds;
}

// ── 시작 ─────────────────────────────────────────────────
init();
