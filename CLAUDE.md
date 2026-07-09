# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A classic Tetris implementation in vanilla JavaScript (HTML5 Canvas + CSS). No dependencies, no build process, no package.json.

## Running the game

There is no build/lint/test tooling. Open `index.html` directly, or serve it statically:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then open `http://localhost:8000`. Changes to `game.js`/`style.css`/`index.html` take effect on browser reload — no compilation step.

## Architecture

Three files, all logic lives in `game.js` (~300 lines, single top-level script, no modules):

- **`index.html`** — DOM structure: `<canvas id="board">` (300×600, the 10×20 grid at `BLOCK=30`px/cell) and `<canvas id="next-canvas">` (next-piece preview), plus the score/lines/level panel and pause/game-over overlay.
- **`style.css`** — dark/retro arcade visual theme only.
- **`game.js`** — all game state and logic, using global `let` variables (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, etc.) rather than a class/module structure.

### Core model

- `board` is a `ROWS × COLS` matrix; each cell is `0` (empty) or an integer `1–7` indexing into `COLORS`/`PIECES` for a locked block's color.
- Pieces (`PIECES`) are defined as square matrices of color indices. `current`/`next` are `{ type, shape, x, y }`.
- `rotateCW` rotates a shape via transpose + row-reverse. `tryRotate` applies this and attempts wall kicks (`[0, -1, 1, -2, 2]` column offsets) until one doesn't collide.
- `collide(shape, ox, oy)` is the single collision check used for movement, rotation, and ghost-piece projection — it checks board bounds and existing locked cells.

### Game loop

`init()` seeds board/state and starts `requestAnimationFrame(loop)`. `loop(ts)` accumulates elapsed time in `dropAccum`; once it exceeds `dropInterval`, the piece drops one row or, if blocked, calls `lockPiece()` (merge into board → `clearLines()` → `spawn()` next piece). `spawn()` promotes `next` to `current`, generates a new `next`, and calls `endGame()` if the new piece immediately collides (top-out).

### Scoring/leveling

`LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`. Level increments every 10 lines cleared; `dropInterval = max(100, 1000 - (level-1)*90)` ms. Hard drop scores 2 pts/row traveled, soft drop 1 pt/row.

### Rendering

`draw()` redraws the whole board canvas each frame: grid lines, locked blocks, a ghost piece (computed via `ghostY()`, drawn at `globalAlpha = 0.2`), then the current piece on top. `drawNext()` renders the preview canvas separately.

### Input

Single `keydown` listener switches on `e.code` (arrows for move/rotate/soft-drop, `Space` for hard drop, `KeyX` as alt rotate, `KeyP` for pause). Input is ignored while `paused` or `gameOver`.

## Tunable constants (top of `game.js`)

`COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, initial `dropInterval`. If changing `COLS`/`ROWS`/`BLOCK`, also update the `<canvas id="board">` `width`/`height` in `index.html` to match (`COLS×BLOCK` × `ROWS×BLOCK`).
