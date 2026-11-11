/* 画布：放组件、连线、双击打开组件窗口；数据沿连线自动流动。 */
(function () {
  'use strict';
  var OW = window.OW, W = OW.widgets, h = OW.h;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var $ = function (id) { return document.getElementById(id); };
  var svg = $('canvas'), wrap = $('canvasWrap'), winLayer = $('windows');
  var state = { nodes: [], links: [], nextId: 1, sel: null };
  var wins = {}, zTop = 10, lastClick = { id: 0, t: 0 };

  function s(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function node(id) { return state.nodes.filter(function (n) { return n.id === id; })[0]; }
  function def(n) { return W[n.type]; }

  // ---------- 增删 ----------
  function uniqueTitle(base) {
    var names = state.nodes.map(function (n) { return n.title; });
    if (names.indexOf(base) < 0) return base;
    for (var i = 1; ; i++) if (names.indexOf(base + ' (' + i + ')') < 0) return base + ' (' + i + ')';
  }
  function addNode(type, x, y, params, title) {
    var d = W[type];
    var n = { id: state.nextId++, type: type, title: title || uniqueTitle(d.name), x: x, y: y,
      params: Object.assign(clone(d.defaults || {}), params || {}), out: {}, inputs: {}, summary: '', error: '' };
    state.nodes.push(n);
    return n;
  }
  function removeNode(n) {
    state.links = state.links.filter(function (l) { return l.from !== n.id && l.to !== n.id; });
    state.nodes = state.nodes.filter(function (m) { return m !== n; });
    closeWin(n.id);
  }
  function addLink(a, fromCh, b, toCh) {
    var inp = def(b).inputs.filter(function (i) { return i.name === toCh; })[0];
    if (!inp.multi) state.links = state.links.filter(function (l) { return !(l.to === b.id && l.toCh === toCh); });
    state.links = state.links.filter(function (l) { return !(l.from === a.id && l.to === b.id && l.fromCh === fromCh && l.toCh === toCh); });
    state.links.push({ id: state.nextId++, from: a.id, fromCh: fromCh, to: b.id, toCh: toCh });
  }
  function candidates(a, b) {
    var out = [];
    def(a).outputs.forEach(function (o) {
      def(b).inputs.forEach(function (i) { if (o.type === i.type) out.push({ from: o.name, to: i.name, multi: i.multi }); });
    });
    return out;
  }
  function wouldCycle(a, b) {
    var seen = {}, stack = [b.id];
    while (stack.length) {
      var id = stack.pop();
      if (id === a.id) return true;
      if (seen[id]) continue; seen[id] = 1;
      state.links.forEach(function (l) { if (l.from === id) stack.push(l.to); });
    }
    return false;
  }
  function connect(a, b, px, py, existing) {
    if (a === b) return;
    if (wouldCycle(a, b)) { toast('不能连成一个圈'); return; }
    var c = candidates(a, b);
    if (!c.length) { toast('“' + a.title + '”的输出不能接到“' + b.title + '”'); return; }
    var occupied = function (p) { return state.links.some(function (l) { return l.to === b.id && l.toCh === p.to && !(existing && l === existing); }); };
    var free = c.filter(function (p) { return p.multi || !occupied(p); });
    var pool = free.length ? free : c;
    var same = pool.filter(function (p) { return p.from === p.to; });
    var done = function (p) {
      if (existing) state.links = state.links.filter(function (l) { return l !== existing; });
      addLink(a, p.from, b, p.to); changed();
    };
    if (!existing && same.length === 1) return done(same[0]);
    if (!existing && pool.length === 1) return done(pool[0]);
    chooser(existing ? c : pool, px, py, done);
  }

  // ---------- 计算 ----------
  function order() {
    var indeg = {}, out = [];
    state.nodes.forEach(function (n) { indeg[n.id] = 0; });
    state.links.forEach(function (l) { indeg[l.to]++; });
    var q = state.nodes.filter(function (n) { return !indeg[n.id]; });
    while (q.length) {
      var n = q.shift(); out.push(n);
      state.links.forEach(function (l) { if (l.from === n.id && --indeg[l.to] === 0) q.push(node(l.to)); });
    }
    return out;
  }
  function run() {
    order().forEach(function (n) {
      var d = def(n), inputs = {};
      d.inputs.forEach(function (i) {
        var vals = state.links.filter(function (l) { return l.to === n.id && l.toCh === i.name; })
          .map(function (l) { var src = node(l.from); return src.out[l.fromCh]; }).filter(function (v) { return v; });
        inputs[i.name] = i.multi ? vals : vals[0];
      });
      n.inputs = inputs; n.error = '';
      try { n.out = d.run(n, inputs) || {}; }
      catch (e) { n.out = {}; n.error = e.message; n.summary = ''; }
    });
  }
  function changed(rebuildOwnCtrl, sourceId) {
    run();
    render();
    Object.keys(wins).forEach(function (id) {
      var n = node(+id);
      if (!n) return;
      if (+id !== sourceId || rebuildOwnCtrl) buildCtrl(n);
      buildView(n);
    });
    save();
  }

  // ---------- 画布 ----------
  function render() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var gl = s('g'), gn = s('g');
    svg.appendChild(gl); svg.appendChild(gn);
    state.links.forEach(function (l) {
      var a = node(l.from), b = node(l.to);
      var x1 = a.x + 40, y1 = a.y, x2 = b.x - 40, y2 = b.y, dx = Math.max(40, Math.abs(x2 - x1) / 2);
      var d = 'M' + x1 + ',' + y1 + ' C' + (x1 + dx) + ',' + y1 + ' ' + (x2 - dx) + ',' + y2 + ' ' + x2 + ',' + y2;
      var empty = !a.out[l.fromCh];
      var g = s('g', { class: 'link' + (state.sel === l ? ' sel' : '') + (empty ? ' empty' : '') });
      g.appendChild(s('path', { d: d, class: 'hit' }));
      g.appendChild(s('path', { d: d, class: 'line' }));
      var t = s('text', { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 7, 'text-anchor': 'middle' });
      t.textContent = l.fromCh === l.toCh ? l.fromCh : l.fromCh + ' → ' + l.toCh;
      g.appendChild(t);
      g.addEventListener('pointerdown', function (e) {
        e.stopPropagation();
        var now = Date.now();
        if (lastClick.id === -l.id && now - lastClick.t < 400) { lastClick = { id: 0, t: 0 }; connect(a, b, e.clientX, e.clientY, l); return; }
        lastClick = { id: -l.id, t: now };
        state.sel = l; render();
      });
      gl.appendChild(g);
    });
    state.nodes.forEach(function (n) {
      var d = def(n);
      var g = s('g', { class: 'node' + (state.sel === n ? ' sel' : ''), transform: 'translate(' + n.x + ',' + n.y + ')' });
      g.appendChild(s('circle', { r: 34, class: 'body', fill: OW.catColor[d.cat] }));
      var img = s('image', { href: 'icons/' + d.icon, x: -26, y: -26, width: 52, height: 52 });
      g.appendChild(img);
      if (d.inputs.length) { var pi = s('path', { d: 'M -40,-16 A 40 40 0 0 0 -40,16', class: 'port in' }); g.appendChild(pi); }
      if (d.outputs.length) { var po = s('circle', { cx: 42, cy: 0, r: 7, class: 'port out' }); g.appendChild(po); }
      var lab = s('text', { y: 56, 'text-anchor': 'middle', class: 'title' }); lab.textContent = n.title; g.appendChild(lab);
      var sm = s('text', { y: 74, 'text-anchor': 'middle', class: 'summary' + (n.error ? ' err' : '') });
      sm.textContent = n.error ? '⚠ ' + n.error : n.summary || '';
      g.appendChild(sm);
      if (n.error) { var tt = s('title'); tt.textContent = n.error; g.appendChild(tt); }
      g.addEventListener('pointerdown', function (e) { nodeDown(e, n); });
      g.addEventListener('contextmenu', function (e) { e.preventDefault(); menu(n, e.clientX, e.clientY); });
      gn.appendChild(g);
    });
    $('emptyHint').hidden = state.nodes.length > 0;
  }
  function pt(e) {
    var r = svg.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function hitNode(p, except) {
    var best = null, bd = 48;
    state.nodes.forEach(function (n) {
      if (n === except) return;
      var d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d < bd) { bd = d; best = n; }
    });
    return best;
  }
  function nodeDown(e, n) {
    e.stopPropagation();
    if (e.button !== 0) return;
    var p0 = pt(e), cls = e.target.getAttribute('class') || '';
    if (cls.indexOf('port') >= 0) return linkDrag(e, n, cls.indexOf('out') >= 0);
    var ox = n.x - p0.x, oy = n.y - p0.y, moved = false;
    function mv(ev) {
      var p = pt(ev);
      if (!moved && Math.hypot(p.x - p0.x, p.y - p0.y) < 4) return;
      moved = true;
      n.x = Math.max(50, p.x + ox); n.y = Math.max(46, p.y + oy); render();
    }
    function up() {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
      var now = Date.now();
      if (!moved && lastClick.id === n.id && now - lastClick.t < 400) { lastClick = { id: 0, t: 0 }; openWin(n); return; }
      lastClick = { id: n.id, t: now };
      state.sel = n; render(); if (moved) save();
    }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  }
  function linkDrag(e, n, fromOut) {
    var temp = s('path', { class: 'temp' }); svg.appendChild(temp);
    function mv(ev) {
      var p = pt(ev), x1 = fromOut ? n.x + 40 : p.x, y1 = fromOut ? n.y : p.y, x2 = fromOut ? p.x : n.x - 40, y2 = fromOut ? p.y : n.y;
      var dx = Math.max(40, Math.abs(x2 - x1) / 2);
      temp.setAttribute('d', 'M' + x1 + ',' + y1 + ' C' + (x1 + dx) + ',' + y1 + ' ' + (x2 - dx) + ',' + y2 + ' ' + x2 + ',' + y2);
    }
    function up(ev) {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
      temp.remove();
      var p = pt(ev), other = hitNode(p, n);
      if (other) { if (fromOut) connect(n, other, ev.clientX, ev.clientY); else connect(other, n, ev.clientX, ev.clientY); }
      else if (fromOut && Math.hypot(p.x - n.x, p.y - n.y) > 60) quickAdd(n, p, ev.clientX, ev.clientY);
    }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  }
  svg.addEventListener('pointerdown', function () { state.sel = null; render(); closePopups(); });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.sel && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) {
      if (state.sel.type) removeNode(state.sel); else state.links = state.links.filter(function (l) { return l !== state.sel; });
      state.sel = null; changed(); e.preventDefault();
    }
    if (e.key === 'Escape') closePopups();
  });

  // ---------- 弹出菜单 ----------
  function closePopups() { [].forEach.call(document.querySelectorAll('.popup'), function (p) { p.remove(); }); }
  function popup(x, y, items) {
    closePopups();
    var m = h('div', { class: 'popup' });
    items.forEach(function (it) {
      if (it.head) { m.appendChild(h('div', { class: 'popup-head', text: it.head })); return; }
      m.appendChild(h('button', { type: 'button', onclick: function () { closePopups(); it.fn(); } }, it.icon ? [h('img', { src: 'icons/' + it.icon, alt: '' }), it.text] : [it.text]));
    });
    document.body.appendChild(m);
    var r = m.getBoundingClientRect();
    m.style.left = Math.min(x, innerWidth - r.width - 8) + 'px';
    m.style.top = Math.min(y, innerHeight - r.height - 8) + 'px';
    setTimeout(function () { document.addEventListener('pointerdown', function off(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('pointerdown', off); } }); });
  }
  function chooser(pairs, x, y, done) {
    popup(x, y, [{ head: '选择要连接的通道' }].concat(pairs.map(function (p) { return { text: p.from + ' → ' + p.to, fn: function () { done(p); } }; })));
  }
  function menu(n, x, y) {
    state.sel = n; render();
    popup(x, y, [
      { text: '打开', fn: function () { openWin(n); } },
      { text: '重命名', fn: function () { var t = prompt('新名称', n.title); if (t && t.trim()) { n.title = t.trim(); changed(); } } },
      { text: '删除', fn: function () { removeNode(n); changed(); } }
    ]);
  }
  function quickAdd(src, p, x, y) {
    var items = [{ head: '接到“' + src.title + '”后面' }];
    OW.order.forEach(function (c) {
      c[1].forEach(function (type) {
        var probe = { type: type };
        var ok = def(src).outputs.some(function (o) { return W[type].inputs.some(function (i) { return i.type === o.type; }); });
        if (ok) items.push({ text: W[type].name, icon: W[type].icon, fn: function () { var n = addNode(type, p.x, p.y); connect(src, n, x, y); changed(); } });
      });
    });
    popup(x, y, items);
  }
  var toastTimer;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  // ---------- 组件窗口 ----------
  function openWin(n) {
    if (wins[n.id]) { wins[n.id].el.style.zIndex = ++zTop; return; }
    var d = def(n), count = Object.keys(wins).length;
    var ctrl = h('div', { class: 'ow-ctrl' }), view = h('div', { class: 'ow-main' });
    var title = h('span', { text: n.title });
    var bar = h('div', { class: 'ow-bar' }, [h('img', { src: 'icons/' + d.icon, alt: '' }), title,
      h('button', { type: 'button', class: 'ow-close', title: '关闭', text: '×', onclick: function () { closeWin(n.id); } })]);
    var el = h('div', { class: 'ow-win' }, [bar, h('div', { class: 'ow-body' }, [ctrl, view])]);
    var ww = Math.min(780, innerWidth - 16), wh = Math.min(540, innerHeight - 70);
    el.style.width = ww + 'px'; el.style.height = wh + 'px';
    el.style.left = Math.max(8, Math.min(innerWidth - ww - 8, innerWidth - ww - 24 - count * 28)) + 'px';
    el.style.top = Math.max(56, Math.min(innerHeight - wh - 8, innerHeight - wh - 24 - count * 28)) + 'px';
    el.style.zIndex = ++zTop;
    el.addEventListener('pointerdown', function () { el.style.zIndex = ++zTop; });
    bar.addEventListener('pointerdown', function (e) {
      if (e.target.tagName === 'BUTTON') return;
      var sx = e.clientX - el.offsetLeft, sy = e.clientY - el.offsetTop;
      function mv(ev) { el.style.left = Math.max(0, ev.clientX - sx) + 'px'; el.style.top = Math.max(0, ev.clientY - sy) + 'px'; }
      function up() { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); }
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    });
    winLayer.appendChild(el);
    wins[n.id] = { el: el, ctrl: ctrl, view: view, title: title };
    n.ctx = {
      changed: function (rebuild) { changed(rebuild, n.id); },
      redraw: function () { buildView(n); save(); }
    };
    buildCtrl(n); buildView(n);
  }
  function closeWin(id) { if (wins[id]) { wins[id].el.remove(); delete wins[id]; } }
  function buildCtrl(n) {
    var w = wins[n.id], d = def(n); if (!w) return;
    w.title.textContent = n.title;
    w.ctrl.innerHTML = '';
    if (d.ui) d.ui(n, w.ctrl, n.ctx);
    w.ctrl.hidden = !w.ctrl.childNodes.length;
  }
  function buildView(n) {
    var w = wins[n.id], d = def(n); if (!w) return;
    w.view.innerHTML = '';
    if (n.error) w.view.appendChild(h('p', { class: 'ow-error', text: '⚠ ' + n.error }));
    if (d.view) d.view(n, w.view);
  }

  // ---------- 组件栏 ----------
  var pal = $('palette');
  OW.order.forEach(function (c) {
    pal.appendChild(h('div', { class: 'pal-head', style: 'border-left-color:' + OW.catColor[c[0]] , text: c[0] }));
    var grid = h('div', { class: 'pal-grid' });
    c[1].forEach(function (type) {
      var d = W[type];
      var b = h('button', { type: 'button', class: 'pal-item', draggable: 'true', title: d.desc,
        onclick: function () { var r = wrap.getBoundingClientRect(); var n = addNode(type, wrap.scrollLeft + 120 + (state.nodes.length % 6) * 30, wrap.scrollTop + 100 + (state.nodes.length % 6) * 40); state.sel = n; changed(); } },
        [h('span', { class: 'pal-ico', style: 'background:' + OW.catColor[d.cat] }, [h('img', { src: 'icons/' + d.icon, alt: '' })]), h('span', { text: d.name })]);
      b.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', type); });
      grid.appendChild(b);
    });
    pal.appendChild(grid);
  });
  wrap.addEventListener('dragover', function (e) { e.preventDefault(); });
  wrap.addEventListener('drop', function (e) {
    e.preventDefault();
    var type = e.dataTransfer.getData('text/plain');
    if (!W[type]) return;
    var p = pt(e), n = addNode(type, Math.max(50, p.x), Math.max(46, p.y)); state.sel = n; changed();
  });

  // ---------- 示例工作流 ----------
  var EXAMPLES = [
    { title: '第3讲 鸢尾花分类入门', nodes: [['file', 90, 230, { src: 'iris' }], ['table', 280, 110], ['scatter', 280, 340], ['tree', 460, 170], ['knn', 460, 300], ['test', 660, 230], ['cm', 860, 230]],
      links: [[0, '数据', 1, '数据'], [0, '数据', 2, '数据'], [0, '数据', 5, '数据'], [3, '学习器', 5, '学习器'], [4, '学习器', 5, '学习器'], [5, '评估结果', 6, '评估结果']], open: 5 },
    { title: '第3讲 分类模型对比', nodes: [['file', 90, 240, { src: 'iris' }], ['table', 280, 100], ['scatter', 280, 380], ['logit', 460, 140], ['tree', 460, 250], ['forest', 460, 360], ['test', 660, 250], ['cm', 860, 250]],
      links: [[0, '数据', 1, '数据'], [0, '数据', 2, '数据'], [0, '数据', 6, '数据'], [3, '学习器', 6, '学习器'], [4, '学习器', 6, '学习器'], [5, '学习器', 6, '学习器'], [6, '评估结果', 7, '评估结果']], open: 6 },
    { title: '第3讲 PCA 降维观察', nodes: [['file', 100, 220, { src: 'iris' }], ['pca', 300, 220], ['scatter', 500, 140], ['table', 500, 310]],
      links: [[0, '数据', 1, '数据'], [1, '转换后数据', 2, '数据'], [1, '转换后数据', 3, '数据']], open: 2 },
    { title: '第3讲 K 均值聚类', nodes: [['file', 100, 220, { src: 'iris' }], ['kmeans', 300, 220], ['scatter', 500, 110], ['table', 500, 230], ['box', 500, 350]],
      links: [[0, '数据', 1, '数据'], [1, '数据', 2, '数据'], [1, '数据', 3, '数据'], [1, '数据', 4, '数据']], open: 1 },
    { title: '作业二 西瓜数据制造过拟合', nodes: [['file', 100, 200, { src: 'melon_train' }, '西瓜-训练集'], ['file', 100, 380, { src: 'melon_test' }, '西瓜-测试集'], ['scatter', 300, 80], ['knn', 440, 130, { k: 1 }], ['tree', 440, 470], ['test', 640, 300, { method: 'test' }], ['cm', 840, 300]],
      links: [[0, '数据', 2, '数据'], [0, '数据', 5, '数据'], [1, '数据', 5, '测试数据'], [3, '学习器', 5, '学习器'], [4, '学习器', 5, '学习器'], [5, '评估结果', 6, '评估结果']], open: 5 },
    { title: '第3讲 贷款审批决策树', nodes: [['file', 100, 220, { src: 'loan' }], ['table', 300, 110], ['tree', 300, 300], ['treeview', 500, 300]],
      links: [[0, '数据', 1, '数据'], [0, '数据', 2, '数据'], [2, '模型', 3, '树模型']], open: 3 },
    { title: '训练集与测试集：数据抽样', nodes: [['file', 90, 230, { src: 'iris' }], ['sampler', 280, 230], ['tree', 280, 400], ['test', 500, 230, { method: 'test' }], ['pred', 500, 400], ['cm', 700, 230]],
      links: [[0, '数据', 1, '数据'], [1, '数据样本', 3, '数据'], [1, '剩余数据', 3, '测试数据'], [2, '学习器', 3, '学习器'], [1, '数据样本', 2, '数据'], [2, '模型', 4, '模型'], [1, '剩余数据', 4, '数据'], [3, '评估结果', 5, '评估结果']], open: 3 }
  ];
  function loadExample(ex) {
    Object.keys(wins).forEach(function (id) { closeWin(+id); });
    state.nodes = []; state.links = []; state.sel = null;
    var made = ex.nodes.map(function (d) { return addNode(d[0], d[1], d[2], d[3], d[4]); });
    ex.links.forEach(function (l) { addLink(made[l[0]], l[1], made[l[2]], l[3]); });
    changed();
    if (ex.open !== undefined) openWin(made[ex.open]);
  }
  var exSel = $('examples');
  EXAMPLES.forEach(function (ex, i) { exSel.appendChild(h('option', { value: i, text: ex.title })); });
  exSel.addEventListener('change', function () {
    if (exSel.value === '') return;
    if (state.nodes.length && !confirm('打开示例会替换当前画布上的内容，继续吗？')) { exSel.value = ''; return; }
    loadExample(EXAMPLES[+exSel.value]); exSel.value = '';
  });

  // ---------- 新建、保存、打开 ----------
  function serialize() {
    return { app: 'ysu-ai-intro-ml', version: 1, nodes: state.nodes.map(function (n) { return { id: n.id, type: n.type, title: n.title, x: n.x, y: n.y, params: n.params }; }),
      links: state.links.map(function (l) { return { from: l.from, fromCh: l.fromCh, to: l.to, toCh: l.toCh }; }) };
  }
  function restore(o) {
    Object.keys(wins).forEach(function (id) { closeWin(+id); });
    state.nodes = []; state.links = []; state.sel = null;
    var map = {};
    o.nodes.forEach(function (d) { if (W[d.type]) map[d.id] = addNode(d.type, d.x, d.y, d.params, d.title); });
    o.links.forEach(function (l) { if (map[l.from] && map[l.to]) addLink(map[l.from], l.fromCh, map[l.to], l.toCh); });
    changed();
  }
  function save() { try { localStorage.setItem('ysu-ml-workflow', JSON.stringify(serialize())); } catch (e) { /* 浏览器不允许存储时忽略 */ } }
  $('newBtn').addEventListener('click', function () {
    if (state.nodes.length && !confirm('清空画布上的全部组件吗？')) return;
    Object.keys(wins).forEach(function (id) { closeWin(+id); });
    state.nodes = []; state.links = []; changed();
  });
  $('saveBtn').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(serialize(), null, 1)], { type: 'application/json' });
    var a = h('a', { href: URL.createObjectURL(blob), download: '我的工作流.json' });
    document.body.appendChild(a); a.click(); a.remove();
  });
  $('openFile').addEventListener('change', function () {
    var f = this.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try { var o = JSON.parse(String(rd.result)); if (!o.nodes) throw new Error(); restore(o); }
      catch (e) { alert('这个文件不是本页保存的工作流。'); }
    };
    rd.readAsText(f, 'utf-8'); this.value = '';
  });
  $('helpBtn').addEventListener('click', function () { $('help').hidden = !$('help').hidden; });
  $('helpClose').addEventListener('click', function () { $('help').hidden = true; });

  // 网址里带 ?example=序号 时直接打开对应示例（作业页可以链到这里），&open=组件序号 再打开一个窗口
  var qs = new URLSearchParams(location.search), exq = qs.get('example');
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem('ysu-ml-workflow') || 'null'); } catch (e) { saved = null; }
  if (exq !== null && EXAMPLES[+exq]) {
    var ex = EXAMPLES[+exq];
    loadExample(qs.get('open') === 'none' ? Object.assign({}, ex, { open: undefined }) : ex);
    if (qs.get('open') && qs.get('open') !== 'none') openWin(state.nodes[+qs.get('open')]);
  } else if (saved && saved.nodes && saved.nodes.length) restore(saved);
  else loadExample(Object.assign({}, EXAMPLES[0], { open: undefined }));
  window.OWAPP = { state: state, loadExample: loadExample, EXAMPLES: EXAMPLES, openWin: openWin, changed: changed, node: node };
})();
