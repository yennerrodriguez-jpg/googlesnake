/* =====================================================================
   google-snake.js â€” Google-style snake for the homepage only.
   Original code + art (no Google assets/branding). Features:
   checkerboard board, blue snake with eyes, red apple, smooth gliding
   motion, and a start menu (board size / speed / walls).
   Controls: arrow keys or WASD, swipe, or the on-screen D-pad.
   ===================================================================== */
(function () {
  var root = document.getElementById('gsnake');
  if (!root) return;

  var canvas = root.querySelector('.gs-canvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = root.querySelector('[data-gscore]');
  var bestEl = root.querySelector('[data-gbest]');
  var overlay = root.querySelector('.gs-overlay');
  var menu = root.querySelector('.gs-menu');
  var overTitle = root.querySelector('[data-gs-title]');
  var overText = root.querySelector('[data-gs-text]');
  var STORE = 'sgg_home_google';

  // ---- colours (original palette; evokes the Google snake look) ----
  var C = {
    cellA: '#a8d94f', cellB: '#a2d149',   // checkerboard greens
    apple: '#ea4b3b', appleLeaf: '#3aa652', appleStem: '#7a4a24',
    body:  '#4b6fe0', bodyDark: '#3f5fce', // blue snake
    eye:   '#ffffff', pupil: '#1f2a44'
  };

  // ---- settings (chosen from the menu) ----
  var COLS = 25, ROWS = 16, STEP = 140, WRAP = false;

  // ---- state ----
  var snake, prevSnake, dir, queue, food, score, best, running, dead, lastStep, raf;
  best = parseInt(localStorage.getItem(STORE) || '0', 10) || 0;
  if (bestEl) bestEl.textContent = best;

  // ---- canvas sizing (square, crisp on retina) ----
  var cell = 24;
  function resize() {
    var w = canvas.clientWidth || root.clientWidth || 640;
    var dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(w * dpr * (ROWS / COLS)); // landscape, square cells
    cell = canvas.width / COLS;
    draw(1);
  }

  function eq(a, b) { return a.x === b.x && a.y === b.y; }

  function placeFood() {
    var free = [];
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
      var on = false;
      for (var i = 0; i < snake.length; i++) if (snake[i].x === x && snake[i].y === y) { on = true; break; }
      if (!on) free.push({ x: x, y: y });
    }
    food = free.length ? free[(Math.random() * free.length) | 0] : { x: 0, y: 0 };
  }

  function reset() {
    var cx = (COLS / 2) | 0, cy = (ROWS / 2) | 0;
    snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
    prevSnake = snake.map(function (s) { return { x: s.x, y: s.y }; });
    dir = { x: 1, y: 0 };
    queue = [];
    score = 0;
    dead = false;
    running = false;
    placeFood();
    if (scoreEl) scoreEl.textContent = 0;
  }

  function setDir(nx, ny) {
    // last intended direction (end of queue, else current)
    var last = queue.length ? queue[queue.length - 1] : dir;
    if (last.x === -nx && last.y === -ny) return;      // no reversing
    if (last.x === nx && last.y === ny) return;        // no dupes
    if (queue.length < 2) queue.push({ x: nx, y: ny });
  }

  function step() {
    if (queue.length) dir = queue.shift();
    var head = snake[0];
    var nx = head.x + dir.x, ny = head.y + dir.y;

    if (WRAP) {
      nx = (nx + COLS) % COLS;
      ny = (ny + ROWS) % ROWS;
    } else if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
      return gameOver();
    }

    var eating = (food && nx === food.x && ny === food.y);
    // collision with body (ignore tail cell if it will move this step)
    var limit = eating ? snake.length : snake.length - 1;
    for (var i = 0; i < limit; i++) {
      if (snake[i].x === nx && snake[i].y === ny) return gameOver();
    }

    prevSnake = snake.map(function (s) { return { x: s.x, y: s.y }; });
    snake.unshift({ x: nx, y: ny });
    if (eating) {
      score++;
      if (scoreEl) scoreEl.textContent = score;
      if (score > best) { best = score; if (bestEl) bestEl.textContent = best; try { localStorage.setItem(STORE, best); } catch (e) {} }
      placeFood();
    } else {
      snake.pop();
    }
    lastStep = performance.now();
  }

  function gameOver() {
    dead = true;
    running = false;
    if (overTitle) overTitle.textContent = 'Game over';
    if (overText) overText.textContent = 'You scored ' + score + (score === best ? ' â€” a new best!' : '') + '.';
    if (menu) menu.classList.add('gs-over');
    overlay.classList.remove('gs-hide');
  }

  // ---- rendering ----
  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBoard() {
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
      ctx.fillStyle = ((x + y) % 2 === 0) ? C.cellA : C.cellB;
      ctx.fillRect(x * cell, y * cell, cell + 1, cell + 1);
    }
  }

  function drawApple() {
    if (!food) return;
    var cx = food.x * cell + cell / 2, cy = food.y * cell + cell / 2;
    var r = cell * 0.32;
    ctx.fillStyle = C.apple;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // stem
    ctx.strokeStyle = C.appleStem; ctx.lineWidth = Math.max(1, cell * 0.06); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.7); ctx.lineTo(cx, cy - r * 1.35); ctx.stroke();
    // leaf
    ctx.fillStyle = C.appleLeaf;
    ctx.beginPath(); ctx.ellipse(cx + r * 0.5, cy - r * 1.15, r * 0.42, r * 0.22, -0.6, 0, Math.PI * 2); ctx.fill();
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function fromFor(i) {
    if (i === 0) return prevSnake[0] || snake[0];
    if (prevSnake[i - 1]) return prevSnake[i - 1];
    return prevSnake[prevSnake.length - 1] || snake[i];
  }

  function draw(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    drawApple();

    var pad = cell * 0.10, sz = cell - pad * 2, r = sz * 0.42;
    for (var i = snake.length - 1; i >= 0; i--) {
      var to = snake[i], fr = fromFor(i);
      var dx = to.x - fr.x, dy = to.y - fr.y;
      var tt = t;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) { fr = to; tt = 1; } // wrap teleport: snap
      var gx = lerp(fr.x, to.x, tt) * cell + pad;
      var gy = lerp(fr.y, to.y, tt) * cell + pad;
      ctx.fillStyle = (i === 0) ? C.body : C.body;
      roundRect(gx, gy, sz, sz, r); ctx.fill();
      // subtle lower shade for depth on body (not head)
      if (i !== 0) {
        ctx.fillStyle = C.bodyDark;
        roundRect(gx + sz * 0.18, gy + sz * 0.5, sz * 0.64, sz * 0.42, r * 0.6); ctx.fill();
        ctx.fillStyle = C.body;
        roundRect(gx, gy, sz, sz * 0.78, r); ctx.fill();
      }
      if (i === 0) drawEyes(gx, gy, sz);
    }
  }

  function drawEyes(gx, gy, sz) {
    var ex = sz * 0.28, ey = sz * 0.30, er = sz * 0.16, pr = sz * 0.08;
    var cxs = [gx + ex, gx + sz - ex], cys = [gy + ey, gy + ey];
    // arrange eyes toward movement axis
    if (dir.y !== 0) { cys = [gy + (dir.y > 0 ? sz - ey : ey), gy + (dir.y > 0 ? sz - ey : ey)]; cxs = [gx + ex, gx + sz - ex]; }
    if (dir.x !== 0) { cxs = [gx + (dir.x > 0 ? sz - ex : ex), gx + (dir.x > 0 ? sz - ex : ex)]; cys = [gy + ex, gy + sz - ex]; }
    for (var k = 0; k < 2; k++) {
      ctx.fillStyle = C.eye;
      ctx.beginPath(); ctx.arc(cxs[k], cys[k], er, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.pupil;
      ctx.beginPath(); ctx.arc(cxs[k] + dir.x * pr, cys[k] + dir.y * pr, pr, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---- loop ----
  function loop(now) {
    if (running && now - lastStep >= STEP) step();
    var t = running ? Math.max(0, Math.min(1, (now - lastStep) / STEP)) : 1;
    draw(t);
    raf = requestAnimationFrame(loop);
  }

  function start() {
    reset();
    overlay.classList.add('gs-hide');
    if (menu) menu.classList.remove('gs-over');
    running = true;
    lastStep = performance.now();
  }

  // ---- menu: option selection ----
  function bindGroup(attr, apply) {
    root.querySelectorAll('[' + attr + ']').forEach(function (b) {
      b.addEventListener('click', function () {
        root.querySelectorAll('[' + attr + ']').forEach(function (o) { o.classList.remove('gs-sel'); o.setAttribute('aria-pressed', 'false'); });
        b.classList.add('gs-sel'); b.setAttribute('aria-pressed', 'true');
        apply(b.getAttribute(attr));
      });
    });
  }
  bindGroup('data-size', function (v) { var p = v.split('x'); COLS = parseInt(p[0], 10); ROWS = parseInt(p[1], 10); resize(); });
  bindGroup('data-speed', function (v) { STEP = parseInt(v, 10); });
  bindGroup('data-walls', function (v) { WRAP = (v === 'off'); });

  // Play buttons (menu + hero "Start playing")
  root.querySelectorAll('[data-gplay]').forEach(function (b) { b.addEventListener('click', start); });
  document.querySelectorAll('[data-gplay-hero]').forEach(function (b) {
    b.addEventListener('click', function () { root.scrollIntoView({ behavior: 'smooth', block: 'center' }); start(); });
  });

  // ---- input ----
  var KEYS = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0]
  };
  window.addEventListener('keydown', function (e) {
    if (e.key === ' ' || e.key === 'Spacebar') {
      if (!running) { e.preventDefault(); start(); }
      return;
    }
    var k = KEYS[e.key];
    if (k) { setDir(k[0], k[1]); if (running) e.preventDefault(); }
  });

  // D-pad
  var dmap = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  Object.keys(dmap).forEach(function (cls) {
    var el = root.querySelector('.gs-dpad .' + cls);
    if (el) el.addEventListener('click', function () { setDir(dmap[cls][0], dmap[cls][1]); });
  });

  // Swipe
  var sx = 0, sy = 0;
  canvas.addEventListener('touchstart', function (e) { var t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
  canvas.addEventListener('touchmove', function (e) {
    if (!running) return;
    var t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0); else setDir(0, dy > 0 ? 1 : -1);
    sx = t.clientX; sy = t.clientY;
    e.preventDefault();
  }, { passive: false });

  // ---- boot ----
  window.addEventListener('resize', resize);
  reset();
  resize();
  raf = requestAnimationFrame(loop);
})();
