(function () {
  "use strict";

  const canvas = document.getElementById("mazeCanvas");
  const ctx = canvas.getContext("2d");
  const algorithmSelect = document.getElementById("algorithmSelect");
  const sizeSelect = document.getElementById("sizeSelect");
  const showAnimation = document.getElementById("showAnimation");
  const speedRange = document.getElementById("speedRange");
  const startButton = document.getElementById("startButton");
  const pauseButton = document.getElementById("pauseButton");
  const stepButton = document.getElementById("stepButton");
  const resetButton = document.getElementById("resetButton");
  const clearButton = document.getElementById("clearButton");
  const randomButton = document.getElementById("randomButton");
  const modeButtons = Array.from(document.querySelectorAll(".mode-button"));
  const statusText = document.getElementById("statusText");
  const visitedCount = document.getElementById("visitedCount");
  const frontierCount = document.getElementById("frontierCount");
  const distanceValue = document.getElementById("distanceValue");

  const EMPTY = 0;
  const WALL = 1;
  const colors = {
    empty: "#ffffff",
    grid: "#d8e0ec",
    wall: "#2b3444",
    visited: "#7fb0e6",
    frontier: "#f5d66e",
    path: "#d6a11d",
    current: "#f3a43b",
    start: "#1f8a70",
    target: "#c64646"
  };

  const state = {
    size: Number(sizeSelect.value),
    grid: [],
    start: { row: 12, col: 4 },
    target: { row: 12, col: 20 },
    mode: "wall",
    isDrawing: false,
    running: false,
    paused: false,
    timerId: 0,
    steps: [],
    stepIndex: 0,
    view: emptyView(),
    message: "准备就绪",
    distance: null,
    canvasSize: 720
  };

  function emptyView() {
    return {
      visited: new Set(),
      frontier: new Set(),
      path: new Set(),
      current: null
    };
  }

  function key(row, col) {
    return `${row},${col}`;
  }

  function parseKey(value) {
    const parts = value.split(",");
    return { row: Number(parts[0]), col: Number(parts[1]) };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function inBounds(row, col) {
    return row >= 0 && row < state.size && col >= 0 && col < state.size;
  }

  function isSpecial(row, col) {
    return (row === state.start.row && col === state.start.col) ||
      (row === state.target.row && col === state.target.col);
  }

  function resetSearchView(message) {
    stopTimer();
    state.steps = [];
    state.stepIndex = 0;
    state.view = emptyView();
    state.message = message || "准备就绪";
    state.distance = null;
    render();
    updateMetrics();
    updateButtons();
  }

  function stopTimer() {
    if (state.timerId) {
      window.clearTimeout(state.timerId);
      state.timerId = 0;
    }
    state.running = false;
    state.paused = false;
    pauseButton.textContent = "暂停";
  }

  function setMode(mode) {
    state.mode = mode;
    modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function initializeGrid(size) {
    state.size = size;
    state.grid = Array.from({ length: size }, () => Array(size).fill(EMPTY));
    const mid = Math.floor(size / 2);
    state.start = { row: mid, col: Math.max(1, Math.floor(size * 0.18)) };
    state.target = { row: mid, col: Math.min(size - 2, Math.floor(size * 0.82)) };
    addStarterWalls();
    resetSearchView("准备就绪");
  }

  function addStarterWalls() {
    const size = state.size;
    const mid = Math.floor(size / 2);
    const leftWall = Math.floor(size * 0.38);
    const rightWall = Math.floor(size * 0.64);
    for (let row = 2; row < size - 2; row += 1) {
      if (row !== mid && row !== mid + 1) {
        placeWall(row, leftWall);
      }
      if (row !== mid - 2 && row !== mid - 1) {
        placeWall(row, rightWall);
      }
    }
    for (let col = 4; col < size - 4; col += 1) {
      if (col !== leftWall + 1 && col !== rightWall - 1) {
        placeWall(Math.floor(size * 0.28), col);
      }
    }
  }

  function placeWall(row, col) {
    if (inBounds(row, col) && !isSpecial(row, col)) {
      state.grid[row][col] = WALL;
    }
  }

  function clearWalls() {
    for (let row = 0; row < state.size; row += 1) {
      state.grid[row].fill(EMPTY);
    }
    resetSearchView("墙体已清空");
  }

  function randomMaze() {
    stopTimer();
    for (let row = 0; row < state.size; row += 1) {
      for (let col = 0; col < state.size; col += 1) {
        state.grid[row][col] = Math.random() < 0.24 ? WALL : EMPTY;
      }
    }
    clearAround(state.start);
    clearAround(state.target);
    resetSearchView("随机迷宫已生成");
  }

  function clearAround(point) {
    for (let row = point.row - 1; row <= point.row + 1; row += 1) {
      for (let col = point.col - 1; col <= point.col + 1; col += 1) {
        if (inBounds(row, col)) {
          state.grid[row][col] = EMPTY;
        }
      }
    }
  }

  function cellFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const col = clamp(Math.floor(((event.clientX - rect.left) / rect.width) * state.size), 0, state.size - 1);
    const row = clamp(Math.floor(((event.clientY - rect.top) / rect.height) * state.size), 0, state.size - 1);
    return { row, col };
  }

  function applyEdit(cell) {
    if (state.running) {
      return;
    }
    const { row, col } = cell;
    if (!inBounds(row, col)) {
      return;
    }

    if (state.mode === "wall" && !isSpecial(row, col)) {
      state.grid[row][col] = WALL;
    } else if (state.mode === "erase" && !isSpecial(row, col)) {
      state.grid[row][col] = EMPTY;
    } else if (state.mode === "start" && state.grid[row][col] !== WALL &&
      (row !== state.target.row || col !== state.target.col)) {
      state.start = { row, col };
    } else if (state.mode === "target" && state.grid[row][col] !== WALL &&
      (row !== state.start.row || col !== state.start.col)) {
      state.target = { row, col };
    }

    resetSearchView("已更新迷宫");
  }

  function neighbors(cellKey) {
    const { row, col } = parseKey(cellKey);
    const moves = [
      [-1, 0],
      [0, -1], [0, 1],
      [1, 0]
    ];
    const result = [];
    moves.forEach(([dr, dc]) => {
      const nextRow = row + dr;
      const nextCol = col + dc;
      if (inBounds(nextRow, nextCol) && state.grid[nextRow][nextCol] !== WALL) {
        result.push(key(nextRow, nextCol));
      }
    });
    return result;
  }

  function makeNode(cellKey, parent, scores) {
    return Object.assign({ key: cellKey, parent }, scores || {});
  }

  function frontierHas(frontier, cellKey) {
    return frontier.some((node) => node.key === cellKey);
  }

  function exploredHas(explored, cellKey) {
    return explored.some((node) => node.key === cellKey);
  }

  function lowestCostNode(open) {
    let current = open[0];
    let currentIndex = 0;
    open.forEach((node, index) => {
      if (node.f < current.f) {
        current = node;
        currentIndex = index;
      }
    });
    return { node: current, index: currentIndex };
  }

  function openHasBetterPath(open, cellKey, gScore) {
    return open.some((node) => node.key === cellKey && gScore > node.g);
  }

  function uniqueKeys(nodes, closed) {
    const values = [];
    const seen = new Set();
    nodes.forEach((node) => {
      const nodeKey = typeof node === "string" ? node : node.key;
      if (!closed.has(nodeKey) && !seen.has(nodeKey)) {
        seen.add(nodeKey);
        values.push(nodeKey);
      }
    });
    return values;
  }

  function snapshot(current, visited, frontier, message, extra) {
    return Object.assign({
      current,
      visited: Array.from(visited),
      frontier,
      path: [],
      message,
      distance: null,
      final: false
    }, extra || {});
  }

  function buildPathFromNode(node) {
    const path = [];
    let cursor = node.parent;
    while (cursor && cursor.parent !== null) {
      path.push(cursor.key);
      cursor = cursor.parent;
    }
    path.reverse();
    return path;
  }

  function finalFoundStep(node, visited) {
    const path = buildPathFromNode(node);
    const distance = path.length;
    return snapshot(
      node.key,
      visited,
      [],
      `已找到路径，共 ${distance} 步`,
      { path, distance, final: true }
    );
  }

  function finalBlockedStep(visited) {
    return snapshot(
      null,
      visited,
      [],
      "无可达路径，请擦除部分墙体后重试",
      { final: true }
    );
  }

  function heuristic(cellKey) {
    const cell = parseKey(cellKey);
    return Math.abs(cell.row - state.target.row) + Math.abs(cell.col - state.target.col);
  }

  function buildAStarSteps() {
    const startKey = key(state.start.row, state.start.col);
    const targetKey = key(state.target.row, state.target.col);
    const open = [makeNode(startKey, null, { g: 0, h: 0, f: 0 })];
    const closed = [];
    const visited = new Set();
    const steps = [];

    while (open.length > 0) {
      const current = lowestCostNode(open);
      const currentNode = current.node;
      open.splice(current.index, 1);
      closed.push(currentNode);
      visited.add(currentNode.key);
      if (currentNode.key === targetKey) {
        steps.push(finalFoundStep(currentNode, visited));
        return steps;
      }

      neighbors(currentNode.key).forEach((nextKey) => {
        if (exploredHas(closed, nextKey)) {
          return;
        }
        const nextG = currentNode.g + 1;
        if (openHasBetterPath(open, nextKey, nextG)) {
          return;
        }
        const h = heuristic(nextKey);
        open.push(makeNode(nextKey, currentNode, { g: nextG, h, f: nextG + h }));
      });

      steps.push(snapshot(
        currentNode.key,
        visited,
        uniqueKeys(open, new Set(closed.map((node) => node.key))),
        "A* 正在优先探索更接近终点的格子"
      ));
    }

    steps.push(finalBlockedStep(visited));
    return steps;
  }

  function buildQueueSteps(useStack) {
    const startKey = key(state.start.row, state.start.col);
    const targetKey = key(state.target.row, state.target.col);
    const frontier = [makeNode(startKey, null)];
    const explored = [];
    const visited = new Set();
    const steps = [];
    const message = useStack ? "DFS 正在沿一条分支向深处探索" : "BFS 正在按层扩展候选格子";

    while (frontier.length > 0) {
      const current = useStack ? frontier.pop() : frontier.shift();
      visited.add(current.key);
      if (current.key === targetKey) {
        steps.push(finalFoundStep(current, visited));
        return steps;
      }

      explored.push(current);
      neighbors(current.key).forEach((nextKey) => {
        if (!frontierHas(frontier, nextKey) && !exploredHas(explored, nextKey)) {
          frontier.push(makeNode(nextKey, current));
        }
      });

      steps.push(snapshot(current.key, visited, uniqueKeys(frontier, visited), message));
    }

    steps.push(finalBlockedStep(visited));
    return steps;
  }

  function buildSteps() {
    const algorithm = algorithmSelect.value;
    if (algorithm === "astar") {
      return buildAStarSteps();
    }
    if (algorithm === "dfs") {
      return buildQueueSteps(true);
    }
    return buildQueueSteps(false);
  }

  function prepareSearch() {
    stopTimer();
    state.view = emptyView();
    state.distance = null;
    state.steps = buildSteps();
    state.stepIndex = 0;
    state.message = "搜索已准备";
    updateMetrics();
    updateButtons();
  }

  function applyStep(step) {
    state.view = {
      visited: new Set(step.visited),
      frontier: new Set(step.frontier),
      path: new Set(step.path || []),
      current: step.current
    };
    state.message = step.message;
    state.distance = step.distance;
    render();
    updateMetrics();
  }

  function applyNextStep() {
    if (state.stepIndex >= state.steps.length) {
      finishRun();
      return false;
    }
    const step = state.steps[state.stepIndex];
    state.stepIndex += 1;
    applyStep(step);
    if (step.final || state.stepIndex >= state.steps.length) {
      finishRun();
    }
    return true;
  }

  function delay() {
    return Math.max(12, 190 - Number(speedRange.value) * 17);
  }

  function runLoop() {
    if (!state.running || state.paused) {
      return;
    }
    const advanced = applyNextStep();
    if (advanced && state.running) {
      state.timerId = window.setTimeout(runLoop, delay());
    }
  }

  function startSearch() {
    prepareSearch();
    if (showAnimation.checked) {
      state.running = true;
      state.paused = false;
      state.message = "搜索中";
      updateButtons();
      runLoop();
    } else if (state.steps.length > 0) {
      applyStep(state.steps[state.steps.length - 1]);
      state.stepIndex = state.steps.length;
      finishRun();
    }
  }

  function finishRun() {
    if (state.timerId) {
      window.clearTimeout(state.timerId);
      state.timerId = 0;
    }
    state.running = false;
    state.paused = false;
    pauseButton.textContent = "暂停";
    updateButtons();
  }

  function togglePause() {
    if (!state.running) {
      return;
    }
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "继续" : "暂停";
    state.message = state.paused ? "已暂停" : "搜索中";
    updateMetrics();
    if (state.paused && state.timerId) {
      window.clearTimeout(state.timerId);
      state.timerId = 0;
    } else if (!state.paused) {
      runLoop();
    }
  }

  function singleStep() {
    if (state.running && !state.paused) {
      togglePause();
    }
    if (state.steps.length === 0 || state.stepIndex >= state.steps.length) {
      prepareSearch();
    }
    applyNextStep();
  }

  function updateMetrics() {
    statusText.textContent = state.message;
    visitedCount.textContent = String(state.view.visited.size);
    frontierCount.textContent = String(state.view.frontier.size);
    distanceValue.textContent = state.distance === null ? "-" : String(state.distance);
  }

  function updateButtons() {
    startButton.textContent = state.running ? "重新搜索" : "开始搜索";
    pauseButton.disabled = !state.running;
    stepButton.disabled = state.running && !state.paused;
    clearButton.disabled = state.running;
    randomButton.disabled = state.running;
    sizeSelect.disabled = state.running;
    algorithmSelect.disabled = state.running;
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const cssSize = Math.max(280, Math.floor(Math.min(rect.width || 720, rect.height || rect.width || 720)));
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    state.canvasSize = cssSize;
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }

  function drawCell(row, col, fill) {
    const cellSize = state.canvasSize / state.size;
    const x = col * cellSize;
    const y = row * cellSize;
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, Math.ceil(cellSize), Math.ceil(cellSize));
  }

  function render() {
    if (!ctx) {
      return;
    }
    const size = state.canvasSize;
    const cellSize = size / state.size;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = colors.empty;
    ctx.fillRect(0, 0, size, size);

    for (let row = 0; row < state.size; row += 1) {
      for (let col = 0; col < state.size; col += 1) {
        const cellKey = key(row, col);
        if (state.grid[row][col] === WALL) {
          drawCell(row, col, colors.wall);
        } else if (state.view.visited.has(cellKey)) {
          drawCell(row, col, colors.visited);
        } else if (state.view.frontier.has(cellKey)) {
          drawCell(row, col, colors.frontier);
        }
      }
    }

    state.view.path.forEach((cellKey) => {
      const cell = parseKey(cellKey);
      if (!isSpecial(cell.row, cell.col)) {
        drawCell(cell.row, cell.col, colors.path);
      }
    });

    if (state.view.current) {
      const cell = parseKey(state.view.current);
      if (!isSpecial(cell.row, cell.col)) {
        drawCell(cell.row, cell.col, colors.current);
      }
    }

    drawCell(state.start.row, state.start.col, colors.start);
    drawCell(state.target.row, state.target.col, colors.target);

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let index = 0; index <= state.size; index += 1) {
      const pos = Math.round(index * cellSize) + 0.5;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }

    drawLabel(state.start, "起");
    drawLabel(state.target, "终");
  }

  function drawLabel(point, text) {
    const cellSize = state.canvasSize / state.size;
    const x = point.col * cellSize + cellSize / 2;
    const y = point.row * cellSize + cellSize / 2;
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.max(12, Math.floor(cellSize * 0.42))}px "Microsoft YaHei", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y + 1);
  }

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (state.running) {
      return;
    }
    state.isDrawing = true;
    canvas.setPointerCapture(event.pointerId);
    applyEdit(cellFromEvent(event));
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.isDrawing || state.running) {
      return;
    }
    if (state.mode === "wall" || state.mode === "erase") {
      applyEdit(cellFromEvent(event));
    }
  });

  canvas.addEventListener("pointerup", (event) => {
    state.isDrawing = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  });

  canvas.addEventListener("pointerleave", () => {
    state.isDrawing = false;
  });

  sizeSelect.addEventListener("change", () => {
    initializeGrid(Number(sizeSelect.value));
  });
  startButton.addEventListener("click", startSearch);
  pauseButton.addEventListener("click", togglePause);
  stepButton.addEventListener("click", singleStep);
  resetButton.addEventListener("click", () => resetSearchView("准备就绪"));
  clearButton.addEventListener("click", clearWalls);
  randomButton.addEventListener("click", randomMaze);
  algorithmSelect.addEventListener("change", () => resetSearchView("已切换算法"));

  window.addEventListener("resize", resizeCanvas);
  if ("ResizeObserver" in window) {
    new ResizeObserver(resizeCanvas).observe(canvas);
  }

  initializeGrid(state.size);
  resizeCanvas();
}());
