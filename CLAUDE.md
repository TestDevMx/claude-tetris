# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Tetris implementation in vanilla JavaScript (HTML5 Canvas + CSS), extended with a few non-standard mechanics: special/challenge pieces and a reward piece granted for clearing a Tetris (4 lines at once). No dependencies, no build process, no package.json. UI strings (title, panel labels, overlay text) are in Spanish.

## Running the game

There is no build/lint/test tooling. Open `index.html` directly, or serve it statically:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then open `http://localhost:8000`. Changes to `game.js`/`style.css`/`index.html` take effect on browser reload — no compilation step.

## Architecture

Three files, all logic lives in `game.js` (~345 lines, single top-level script, no modules):

- **`index.html`** — DOM structure: `<canvas id="board">` (300×600, the 10×20 grid at `BLOCK=30`px/cell) and `<canvas id="next-canvas">` (next-piece preview), plus the score/lines/level panel, a dark/light theme toggle switch, and pause/game-over overlay.
- **`style.css`** — visual theme only, driven by CSS custom properties on `:root` (dark) and overridden under `body.light` (light theme). No game logic reads CSS.
- **`game.js`** — all game state and logic, using global `let` variables (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `rewardPending`, `theme`, etc.) rather than a class/module structure.

### Core model

- `board` is a `ROWS × COLS` matrix; each cell is `0` (empty) or an integer `1–12` indexing into `COLORS`/`PIECES` for a locked block's color.
- Pieces (`PIECES`) are defined as square-ish matrices of color indices, indices `1–7` are the standard tetrominoes (I/O/T/S/Z/J/L). Indices `8–12` are extra pieces: `+`/`U`/`Y` pentominós and a "tuerca" (3×3 hollow-square challenge piece) at `8/9/10/12`, plus a single-block "Tetris reward" piece at `11`. `current`/`next` are `{ type, shape, x, y }`.
- `pickType()` picks a piece type: with probability `SPECIAL_CHANCE` (0.15) it returns one of `SPECIAL_TYPES` (`[8, 9, 10, 12]` — pentominós + tuerca; type `11` is deliberately excluded here), otherwise a uniform-random standard tetromino (`1–7`). `randomPiece(forcedType)` builds a piece from a type, defaulting to `pickType()` if none is forced.
- `rotateCW` rotates a shape via transpose + row-reverse. `tryRotate` applies this and attempts wall kicks (`[0, -1, 1, -2, 2]` column offsets) until one doesn't collide.
- `collide(shape, ox, oy)` is the single collision check used for movement, rotation, and ghost-piece projection — it checks board bounds and existing locked cells.

### Game loop

`init()` seeds board/state and starts `requestAnimationFrame(loop)`. `loop(ts)` accumulates elapsed time in `dropAccum`; once it exceeds `dropInterval`, the piece drops one row or, if blocked, calls `lockPiece()` (merge into board → `clearLines()` → `spawn()` next piece). `spawn()` promotes `next` to `current`, generates a new `next` (forcing type `11` if `rewardPending` is set), and calls `endGame()` if the new piece immediately collides (top-out). The restart button (`restartBtn`) and theme toggle checkbox wire directly to `init()`/`toggleTheme()`.

### Scoring/leveling/rewards

`LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`. Level increments every 10 lines cleared; `dropInterval = max(100, 1000 - (level-1)*90)` ms. Hard drop scores 2 pts/row traveled, soft drop 1 pt/row. Clearing exactly 4 lines at once (a Tetris) sets `rewardPending = true`, which forces the *next* spawned piece to be the single-block reward piece (type `11`) regardless of `pickType()`.

### Rendering

`draw()` redraws the whole board canvas each frame: grid lines (`drawGrid`, color driven by `theme` via `GRID_COLORS`), locked blocks, a ghost piece (computed via `ghostY()`, drawn at `globalAlpha = 0.2`), then the current piece on top. `drawNext()` renders the preview canvas separately. `applyTheme()` toggles the `light` class on `<body>` and syncs the toggle checkbox; theme choice persists to `localStorage` under `tetris-theme`.

### Input

Single `keydown` listener switches on `e.code` (arrows for move/rotate/soft-drop, `Space` for hard drop, `KeyX` as alt rotate, `KeyP` for pause). Input is ignored while `paused` or `gameOver`, except `KeyP` which always toggles pause (unless game over).

## Tunable constants (top of `game.js`)

`COLS`, `ROWS`, `BLOCK`, `COLORS`, `PIECES`, `LINE_SCORES`, `SPECIAL_TYPES`, `SPECIAL_CHANCE`, `GRID_COLORS`, initial `dropInterval`. If changing `COLS`/`ROWS`/`BLOCK`, also update the `<canvas id="board">` `width`/`height` in `index.html` to match (`COLS×BLOCK` × `ROWS×BLOCK`). If adding a new piece type, append to both `COLORS` and `PIECES` at the same index and decide whether it belongs in `SPECIAL_TYPES`.

## GitHub Claude automation

`.github/workflows/` wires up three `anthropics/claude-code-action` workflows: `claude.yml` responds to `@claude` mentions in issues/PR comments/reviews, `claude-code-review.yml` runs the `code-review` plugin on every PR, and `claude-issue-triage.yml` auto-labels new issues (restricted to the repo's existing label set — `bug`, `documentation`, `duplicate`, `enhancement`, `good first issue`, `help wanted`, `invalid`, `question`, `wontfix`) and posts a diagnostic comment referencing this file's architecture notes. Keep the function/file references in this document accurate, since the triage workflow prompt points directly at it.
