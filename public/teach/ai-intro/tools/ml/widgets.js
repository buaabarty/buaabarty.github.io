/* 组件定义：每个组件有输入、输出、参数、计算函数和窗口界面。
   名称、通道名沿用课程统一的中文译名。 */
(function () {
  'use strict';
  var ML = window.ML;
  var PALETTE = ['#46befa', '#ed462f', '#7cbb35', '#f5ae32', '#c55ee8', '#2f6dd0', '#8c564b', '#e377c2', '#7f7f7f', '#17becf'];
  var DATASETS = {};
  [window.ORANGE_DATA, window.COURSE_DATA].forEach(function (src) {
    Object.keys(src).forEach(function (k) { DATASETS[k] = src[k]; });
  });

  // ---------- 小工具 ----------
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function box(title, kids) { return h('fieldset', { class: 'ow-box' }, [h('legend', { text: title })].concat(kids)); }
  function select(opts, value, onchange) {
    var s = h('select', { onchange: function () { onchange(s.value); } });
    opts.forEach(function (o) {
      var op = h('option', { value: o[0], text: o[1] });
      if (String(o[0]) === String(value)) op.selected = true;
      s.appendChild(op);
    });
    return s;
  }
  function spin(label, value, min, max, step, onchange) {
    var inp = h('input', { type: 'number', min: min, max: max, step: step || 1, value: value });
    inp.addEventListener('change', function () {
      var v = Math.max(min, Math.min(max, +inp.value || min)); inp.value = v; onchange(v);
    });
    return h('label', { class: 'ow-row' }, [h('span', { text: label }), inp]);
  }
  function slider(label, value, min, max, step, fmt, onchange) {
    var out = h('b', { text: fmt(value) });
    var inp = h('input', { type: 'range', min: min, max: max, step: step || 1, value: value });
    inp.addEventListener('input', function () { out.textContent = fmt(+inp.value); });
    inp.addEventListener('change', function () { onchange(+inp.value); });
    return h('label', { class: 'ow-col' }, [h('span', {}, [label + '：', out]), inp]);
  }
  function check(label, value, onchange) {
    var inp = h('input', { type: 'checkbox' });
    inp.checked = !!value;
    inp.addEventListener('change', function () { onchange(inp.checked); });
    return h('label', { class: 'ow-check' }, [inp, h('span', { text: label })]);
  }
  function radios(name, opts, value, onchange) {
    return h('div', { class: 'ow-radios' }, opts.map(function (o) {
      var r = h('input', { type: 'radio', name: name, value: o[0] });
      if (String(o[0]) === String(value)) r.checked = true;
      r.addEventListener('change', function () { if (r.checked) onchange(o[0]); });
      return h('label', { class: 'ow-check' }, [r, h('span', { text: o[1] })].concat(o[2] ? [o[2]] : []));
    }));
  }
  function pct(v) { return (v * 100).toFixed(1) + '%'; }
  function fmt3(v) { return v.toFixed(3); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tableSummary(t) {
    var y = ML.yIdx(t);
    return t.rows.length + ' 行，' + ML.feats(t).length + ' 个特征' + (y >= 0 ? '，目标：' + t.cols[y].name : '');
  }
  function dataTableHtml(t, limit, extraHead, extraCell) {
    var roleName = { f: '', y: '目标', m: '备注' };
    var s = '<table class="ow-grid"><thead><tr><th>#</th>' + t.cols.map(function (c) {
      return '<th class="role-' + c.role + '">' + esc(c.name) + (roleName[c.role] ? '<small>' + roleName[c.role] + '</small>' : '') + '</th>';
    }).join('') + (extraHead || '') + '</tr></thead><tbody>';
    t.rows.slice(0, limit).forEach(function (r, i) {
      s += '<tr><td class="idx">' + (i + 1) + '</td>' + r.map(function (v, j) {
        var c = t.cols[j];
        var txt = ML.isMissing(v) ? '?' : (c.type === 'num' ? +(+v).toFixed(3) : esc(v));
        return '<td class="role-' + c.role + (c.type === 'num' ? ' num' : '') + '">' + txt + '</td>';
      }).join('') + (extraCell ? extraCell(r, i) : '') + '</tr>';
    });
    s += '</tbody></table>';
    if (t.rows.length > limit) s += '<p class="ow-note">共 ' + t.rows.length + ' 行，这里显示前 ' + limit + ' 行。</p>';
    return s;
  }
  function colorScale(t, ci) {
    var lv = ML.levels(t, ci);
    return { levels: lv, color: function (v) { var k = lv.indexOf(v); return k < 0 ? '#999' : PALETTE[k % PALETTE.length]; } };
  }
  function legendHtml(sc) {
    return '<div class="ow-legend">' + sc.levels.map(function (l) { return '<span><i style="background:' + sc.color(l) + '"></i>' + esc(l) + '</span>'; }).join('') + '</div>';
  }
  function roleEditor(t, roles, types, onchange) {
    var wrap = h('table', { class: 'ow-roles' });
    wrap.appendChild(h('tr', {}, [h('th', { text: '列名' }), h('th', { text: '类型' }), h('th', { text: '角色' })]));
    t.cols.forEach(function (c) {
      var role = roles[c.name] || c.role, type = types[c.name] || c.type;
      wrap.appendChild(h('tr', {}, [
        h('td', { text: c.name }),
        h('td', {}, [select([['num', '数值'], ['cat', '类别']], type, function (v) { types[c.name] = v; onchange(); })]),
        h('td', {}, [select([['f', '特征'], ['y', '目标'], ['m', '备注'], ['x', '忽略']], role, function (v) {
          if (v === 'y') Object.keys(roles).forEach(function (k) { if (roles[k] === 'y') roles[k] = 'f'; });
          if (v === 'y') t.cols.forEach(function (o) { if (o.role === 'y' && o.name !== c.name && !roles[o.name]) roles[o.name] = 'f'; });
          roles[c.name] = v; onchange();
        })])
      ]));
    });
    return wrap;
  }
  function applyRoles(t, roles, types) {
    var keep = [], cols = [];
    t.cols.forEach(function (c, i) {
      var role = roles[c.name] || c.role;
      if (role === 'x') return;
      var type = types[c.name] || c.type;
      keep.push({ i: i, type: type });
      cols.push({ name: c.name, type: type, role: role, order: c.order });
    });
    var rows = t.rows.map(function (r) {
      return keep.map(function (k) {
        var v = r[k.i];
        if (ML.isMissing(v)) return null;
        return k.type === 'num' ? (isNaN(+v) ? null : +v) : String(v);
      });
    });
    return { title: t.title, cols: cols, rows: rows };
  }
  function needClass(t) { if (ML.yIdx(t) < 0) throw new Error('数据里没有目标列（要预测的类别）'); if (t.cols[ML.yIdx(t)].type !== 'cat') throw new Error('目标列需要是类别型'); }

  // ---------- 画图 ----------
  function scatter(canvas, t, opt) {
    var g = canvas.getContext('2d'), W = canvas.width, H = canvas.height, pad = 76;
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    var xi = opt.x, yi = opt.y;
    var pts = t.rows.map(function (r, i) { return { x: r[xi], y: r[yi], r: r, i: i }; }).filter(function (p) { return !ML.isMissing(p.x) && !ML.isMissing(p.y); });
    if (!pts.length) return;
    var jit = function (ci, v, i) {
      if (t.cols[ci].type === 'num') return v;
      var lv = ML.levels(t, ci); return lv.indexOf(v) + (opt.jitter ? (ML.rng(i * 31 + ci)() - 0.5) * 0.5 : 0);
    };
    pts.forEach(function (p) { p.px = jit(xi, p.x, p.i); p.py = jit(yi, p.y, p.i + 7); });
    var xs = pts.map(function (p) { return p.px; }), ys = pts.map(function (p) { return p.py; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var dx = (x1 - x0) * 0.06 || 0.5, dy = (y1 - y0) * 0.06 || 0.5;
    x0 -= dx; x1 += dx; y0 -= dy; y1 += dy;
    var sx = function (v) { return pad + (v - x0) / (x1 - x0) * (W - pad - 16); };
    var sy = function (v) { return H - pad - (v - y0) / (y1 - y0) * (H - pad - 16); };
    g.strokeStyle = '#e4e4e4'; g.lineWidth = 1; g.fillStyle = '#555'; g.font = '17px sans-serif';
    function ticks(ci, lo, hi, horiz) {
      var out = [];
      if (t.cols[ci].type === 'cat') ML.levels(t, ci).forEach(function (l, k) { out.push([k, l]); });
      else for (var k = 0; k <= 5; k++) { var v = lo + (hi - lo) * k / 5; out.push([v, +v.toFixed(2)]); }
      out.forEach(function (tk) {
        if (horiz) { var x = sx(tk[0]); g.beginPath(); g.moveTo(x, 16); g.lineTo(x, H - pad); g.stroke(); g.textAlign = 'center'; g.fillText(tk[1], x, H - pad + 24); }
        else { var y = sy(tk[0]); g.beginPath(); g.moveTo(pad, y); g.lineTo(W - 16, y); g.stroke(); g.textAlign = 'right'; g.fillText(tk[1], pad - 6, y + 4); }
      });
    }
    ticks(xi, x0, x1, true); ticks(yi, y0, y1, false);
    g.strokeStyle = '#999'; g.beginPath(); g.moveTo(pad, 16); g.lineTo(pad, H - pad); g.lineTo(W - 16, H - pad); g.stroke();
    g.fillStyle = '#333'; g.font = 'bold 19px sans-serif'; g.textAlign = 'center';
    g.fillText(t.cols[xi].name, (W + pad) / 2, H - 14);
    g.save(); g.translate(20, (H - pad) / 2); g.rotate(-Math.PI / 2); g.fillText(t.cols[yi].name, 0, 0); g.restore();
    var sc = opt.color >= 0 ? colorScale(t, opt.color) : null;
    pts.forEach(function (p) {
      var inSub = !opt.subset || opt.subset(p.r);
      var col = sc ? sc.color(p.r[opt.color]) : '#46befa';
      g.globalAlpha = inSub ? 0.85 : 0.18;
      g.fillStyle = col; g.strokeStyle = col;
      g.beginPath(); g.arc(sx(p.px), sy(p.py), (opt.size || 5) * 1.3, 0, Math.PI * 2);
      if (opt.subset && inSub) { g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#222'; g.stroke(); } else g.fill();
    });
    g.globalAlpha = 1;
    return sc;
  }

  function boxplotSvg(t, vi, gi) {
    var groups = gi >= 0 ? ML.levels(t, gi) : ['全部'];
    var W = 640, rowH = 54, H = groups.length * rowH + 60, pad = 120;
    var all = t.rows.map(function (r) { return r[vi]; }).filter(function (v) { return !ML.isMissing(v); });
    if (t.cols[vi].type !== 'num') {
      // 类别变量：堆叠条形
      var lv = ML.levels(t, vi), sc = colorScale(t, vi), s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ow-svg">';
      groups.forEach(function (gname, k) {
        var rows = t.rows.filter(function (r) { return gi < 0 || r[gi] === gname; }), n = rows.length || 1, x = pad;
        s += '<text x="' + (pad - 10) + '" y="' + (30 + k * rowH + 22) + '" text-anchor="end">' + esc(gname) + '</text>';
        lv.forEach(function (l) {
          var c = rows.filter(function (r) { return r[vi] === l; }).length, w = c / n * (W - pad - 20);
          s += '<rect x="' + x + '" y="' + (30 + k * rowH + 6) + '" width="' + w + '" height="26" fill="' + sc.color(l) + '"><title>' + esc(l) + '：' + c + '</title></rect>';
          if (w > 30) s += '<text x="' + (x + w / 2) + '" y="' + (30 + k * rowH + 24) + '" text-anchor="middle" fill="#fff">' + c + '</text>';
          x += w;
        });
      });
      return s + '</svg>' + legendHtml(sc);
    }
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), span = hi - lo || 1;
    var X = function (v) { return pad + (v - lo) / span * (W - pad - 30); };
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ow-svg">';
    for (var k = 0; k <= 5; k++) {
      var v = lo + span * k / 5;
      svg += '<line x1="' + X(v) + '" x2="' + X(v) + '" y1="20" y2="' + (H - 30) + '" stroke="#eee"/><text x="' + X(v) + '" y="' + (H - 12) + '" text-anchor="middle">' + +v.toFixed(2) + '</text>';
    }
    groups.forEach(function (gname, k) {
      var vals = t.rows.filter(function (r) { return gi < 0 || r[gi] === gname; }).map(function (r) { return r[vi]; })
        .filter(function (v) { return !ML.isMissing(v); }).sort(function (a, b) { return a - b; });
      if (!vals.length) return;
      var q = function (p) { var i = (vals.length - 1) * p, a = Math.floor(i), b = Math.ceil(i); return vals[a] + (vals[b] - vals[a]) * (i - a); };
      var q1 = q(0.25), q2 = q(0.5), q3 = q(0.75), mean = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
      var y = 30 + k * rowH, col = gi >= 0 ? PALETTE[k % PALETTE.length] : '#46befa';
      svg += '<text x="' + (pad - 10) + '" y="' + (y + 22) + '" text-anchor="end">' + esc(gname) + '</text>';
      svg += '<line x1="' + X(vals[0]) + '" x2="' + X(vals[vals.length - 1]) + '" y1="' + (y + 18) + '" y2="' + (y + 18) + '" stroke="#666"/>';
      svg += '<rect x="' + X(q1) + '" y="' + (y + 6) + '" width="' + Math.max(1, X(q3) - X(q1)) + '" height="24" fill="' + col + '" fill-opacity="0.45" stroke="' + col + '"/>';
      svg += '<line x1="' + X(q2) + '" x2="' + X(q2) + '" y1="' + (y + 4) + '" y2="' + (y + 32) + '" stroke="#222" stroke-width="2"/>';
      svg += '<circle cx="' + X(mean) + '" cy="' + (y + 18) + '" r="3.5" fill="#222"><title>均值 ' + mean.toFixed(2) + '</title></circle>';
      svg += '<title>中位数 ' + q2.toFixed(2) + '</title>';
    });
    return svg + '</svg><p class="ow-note">方框是中间一半数据的范围，粗竖线是中位数，黑点是平均值，细线从最小值连到最大值。</p>';
  }

  function treeSvg(model) {
    var t = model.table, cls = model.classes, root = model.tree, sc = colorScale(t, ML.yIdx(t));
    var BW = 150, BH = 62, GX = 22, GY = 56, leaves = 0, maxD = 0;
    (function lay(n, d) {
      n.depth = d; maxD = Math.max(maxD, d);
      var kids = n.leaf ? [] : (n.cat ? Object.keys(n.kids).map(function (k) { return [k, n.kids[k]]; }) : [['≤ ' + +n.th.toFixed(3), n.left], ['> ' + +n.th.toFixed(3), n.right]]);
      n.children = kids;
      if (!kids.length) { n.cx = leaves * (BW + GX) + BW / 2; leaves++; return; }
      kids.forEach(function (k) { lay(k[1], d + 1); });
      n.cx = (kids[0][1].cx + kids[kids.length - 1][1].cx) / 2;
    })(root, 0);
    var W = leaves * (BW + GX) + 20, H = (maxD + 1) * (BH + GY) + 20;
    var s = '<svg class="ow-svg tree" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">';
    (function draw(n) {
      var x = n.cx + 10, y = n.depth * (BH + GY) + 10, total = n.dist.reduce(function (a, b) { return a + b; }, 0) || 1;
      var k = cls.indexOf(n.label), share = n.dist[k] / total;
      n.children.forEach(function (c) {
        var cx = c[1].cx + 10, cy = c[1].depth * (BH + GY) + 10;
        s += '<path d="M' + x + ',' + (y + BH) + ' C' + x + ',' + (y + BH + GY / 2) + ' ' + cx + ',' + (cy - GY / 2) + ' ' + cx + ',' + cy + '" fill="none" stroke="#9aa" />';
        s += '<text x="' + ((x + cx) / 2) + '" y="' + (y + BH + GY / 2 + 4) + '" text-anchor="middle" class="edge">' + esc(c[0]) + '</text>';
        draw(c[1]);
      });
      s += '<g><rect x="' + (x - BW / 2) + '" y="' + y + '" width="' + BW + '" height="' + BH + '" rx="4" fill="#fff" stroke="' + sc.color(n.label) + '" stroke-width="2"/>';
      s += '<rect x="' + (x - BW / 2) + '" y="' + y + '" width="' + BW * share + '" height="5" fill="' + sc.color(n.label) + '"/>';
      s += '<text x="' + x + '" y="' + (y + 24) + '" text-anchor="middle" class="lab">' + esc(n.label) + ' ' + (share * 100).toFixed(0) + '%</text>';
      s += '<text x="' + x + '" y="' + (y + 42) + '" text-anchor="middle" class="sub">' + total + ' 条</text>';
      if (!n.leaf) s += '<text x="' + x + '" y="' + (y + 57) + '" text-anchor="middle" class="q">' + esc(t.cols[n.f].name) + '</text>';
      s += '</g>';
    })(root);
    return { svg: s + '</svg>', leaves: leaves, depth: maxD, legend: legendHtml(sc) };
  }

  // ---------- 组件 ----------
  var W = {};

  W.file = {
    name: '文件', cat: '数据', icon: 'File.svg', desc: '读取示例数据或自己的 CSV 文件，是多数练习的起点。',
    inputs: [], outputs: [{ name: '数据', type: 'data' }],
    defaults: { src: 'iris', roles: {}, types: {}, custom: null },
    run: function (w) {
      var base = w.params.src === 'custom' ? w.params.custom : DATASETS[w.params.src];
      if (!base) throw new Error('请选择一个数据集');
      var t = applyRoles(base, w.params.roles, w.params.types);
      w.summary = (base.title || '') + ' · ' + t.rows.length + ' 行';
      return { '数据': t };
    },
    ui: function (w, el, ctx) {
      var list = Object.keys(DATASETS).map(function (k) { return [k, DATASETS[k].title, h('small', { text: DATASETS[k].desc })]; });
      if (w.params.custom) list.push(['custom', '我上传的文件：' + w.params.custom.title]);
      el.appendChild(box('数据来源', [radios('src' + w.id, list, w.params.src, function (v) { w.params.src = v; w.params.roles = {}; w.params.types = {}; ctx.changed(true); })]));
      var file = h('input', { type: 'file', accept: '.csv,.tsv,.tab,.txt' });
      file.addEventListener('change', function () {
        var f = file.files[0]; if (!f) return;
        var rd = new FileReader();
        rd.onload = function () {
          try { w.params.custom = ML.parseText(String(rd.result), f.name); w.params.src = 'custom'; w.params.roles = {}; w.params.types = {}; ctx.changed(true); }
          catch (e) { alert('读取失败：' + e.message); }
        };
        rd.readAsText(f, 'utf-8');
      });
      el.appendChild(box('打开自己的文件', [file, h('p', { class: 'ow-note', text: '支持逗号或制表符分隔的文本文件。第一行写列名，最后一列默认是要预测的类别。文件只在你的浏览器里读取，不会上传。' })]));
    },
    view: function (w, el) {
      var base = w.params.src === 'custom' ? w.params.custom : DATASETS[w.params.src];
      if (!base) return;
      el.appendChild(h('p', { class: 'ow-info', text: (base.desc || base.title) + '。' + tableSummary(w.out['数据']) + '。' }));
      el.appendChild(h('p', { class: 'ow-note', text: '可以在下表里改每一列的类型和角色：“目标”是要预测的列，“备注”只显示不参与学习，“忽略”直接去掉。' }));
      el.appendChild(roleEditor(base, w.params.roles, w.params.types, function () { w.ctx.changed(true); }));
    }
  };

  W.table = {
    name: '数据表', cat: '数据', icon: 'Table.svg', desc: '以表格方式查看数据。',
    inputs: [{ name: '数据', type: 'data' }], outputs: [{ name: '选中数据', type: 'data' }], defaults: {},
    run: function (w, inp) { var t = inp['数据']; if (!t) { w.summary = ''; return {}; } w.summary = t.rows.length + ' 行'; return { '选中数据': t }; },
    view: function (w, el) {
      var t = w.inputs['数据'];
      if (!t) { el.appendChild(h('p', { class: 'ow-info', text: '还没有输入数据。把“文件”连到这里。' })); return; }
      el.appendChild(h('p', { class: 'ow-info', text: tableSummary(t) + '。' }));
      el.appendChild(h('div', { class: 'ow-scroll', html: dataTableHtml(t, 500) }));
    }
  };

  W.select = {
    name: '选择列', cat: '数据', icon: 'SelectColumns.svg', desc: '选择特征、目标和备注列，整理建模输入。',
    inputs: [{ name: '数据', type: 'data' }], outputs: [{ name: '数据', type: 'data' }], defaults: { roles: {}, types: {} },
    run: function (w, inp) {
      var t = inp['数据']; if (!t) { w.summary = ''; return {}; }
      var out = applyRoles(t, w.params.roles, w.params.types);
      w.summary = ML.feats(out).length + ' 个特征';
      return { '数据': out };
    },
    view: function (w, el) {
      var t = w.inputs['数据'];
      if (!t) { el.appendChild(h('p', { class: 'ow-info', text: '还没有输入数据。' })); return; }
      el.appendChild(h('p', { class: 'ow-note', text: '把不想让模型看到的列设为“忽略”或“备注”，再看测试与评分里的成绩怎么变。' }));
      el.appendChild(roleEditor(t, w.params.roles, w.params.types, function () { w.ctx.changed(true); }));
    }
  };

  W.sampler = {
    name: '数据抽样', cat: '数据', icon: 'DataSampler.svg', desc: '随机抽取一部分数据，用于训练集和测试集练习。',
    inputs: [{ name: '数据', type: 'data' }], outputs: [{ name: '数据样本', type: 'data' }, { name: '剩余数据', type: 'data' }],
    defaults: { pct: 70, seed: 1, stratify: true },
    run: function (w, inp) {
      var t = inp['数据']; if (!t) { w.summary = ''; return {}; }
      var n = t.rows.length, idx, cut = Math.round(n * w.params.pct / 100);
      if (w.params.stratify && ML.yIdx(t) >= 0) {
        var y = ML.yIdx(t), by = {};
        ML.shuffled(n, ML.rng(w.params.seed)).forEach(function (i) { (by[t.rows[i][y]] = by[t.rows[i][y]] || []).push(i); });
        var take = [], rest = [];
        Object.keys(by).sort().forEach(function (c) { var k = Math.round(by[c].length * w.params.pct / 100); take = take.concat(by[c].slice(0, k)); rest = rest.concat(by[c].slice(k)); });
        idx = take.concat(rest); cut = take.length;
      } else idx = ML.shuffled(n, ML.rng(w.params.seed));
      var a = idx.slice(0, cut).sort(function (p, q) { return p - q; }), b = idx.slice(cut).sort(function (p, q) { return p - q; });
      w.summary = a.length + ' / ' + b.length;
      return {
        '数据样本': ML.copyTable(t, a.map(function (i) { return t.rows[i]; }), t.title + '（样本）'),
        '剩余数据': ML.copyTable(t, b.map(function (i) { return t.rows[i]; }), t.title + '（剩余）')
      };
    },
    ui: function (w, el, ctx) {
      el.appendChild(box('抽样方式', [
        slider('抽取比例', w.params.pct, 5, 95, 5, function (v) { return v + '%'; }, function (v) { w.params.pct = v; ctx.changed(); }),
        check('按类别分层抽样（各类比例保持一致）', w.params.stratify, function (v) { w.params.stratify = v; ctx.changed(); }),
        h('button', { type: 'button', text: '重新抽样', onclick: function () { w.params.seed++; ctx.changed(); } })
      ]));
    },
    view: function (w, el) {
      if (!w.out['数据样本']) { el.appendChild(h('p', { class: 'ow-info', text: '还没有输入数据。' })); return; }
      el.appendChild(h('p', { class: 'ow-info', text: '数据样本 ' + w.out['数据样本'].rows.length + ' 行，剩余数据 ' + w.out['剩余数据'].rows.length + ' 行。' }));
      el.appendChild(h('p', { class: 'ow-note', text: '常见用法：数据样本连到“测试与评分”的“数据”，剩余数据连到它的“测试数据”，再选“在测试数据上测试”。' }));
    }
  };

  W.scatter = {
    name: '散点图', cat: '可视化', icon: 'ScatterPlot.svg', desc: '查看两个特征之间的关系。',
    inputs: [{ name: '数据', type: 'data' }, { name: '数据子集', type: 'data' }], outputs: [], defaults: { x: null, y: null, color: null, size: 5, jitter: true },
    run: function (w, inp) { var t = inp['数据']; w.summary = t ? t.rows.length + ' 个点' : ''; return {}; },
    ui: function (w, el, ctx) {
      var t = w.inputs['数据']; if (!t) return;
      var cols = t.cols.map(function (c, i) { return [c.name, c.name + (c.type === 'cat' ? '（类别）' : '')]; });
      var pick = function (key, fallback) { return w.params[key] && t.cols.some(function (c) { return c.name === w.params[key]; }) ? w.params[key] : fallback; };
      var nums = t.cols.filter(function (c) { return c.role === 'f' && c.type === 'num'; });
      var fx = nums.length >= 4 ? nums[2] : (nums[0] || t.cols[0]), fy = nums.length >= 4 ? nums[3] : (nums[1] || t.cols[1] || t.cols[0]);
      w.params.x = pick('x', fx.name); w.params.y = pick('y', fy.name);
      var yc = ML.yIdx(t), clu = t.cols.filter(function (c) { return c.name === '簇'; })[0];
      w.params.color = pick('color', clu ? '簇' : (yc >= 0 ? t.cols[yc].name : '(无)'));
      el.appendChild(box('坐标轴', [
        h('label', { class: 'ow-col' }, ['横轴', select(cols, w.params.x, function (v) { w.params.x = v; ctx.redraw(); })]),
        h('label', { class: 'ow-col' }, ['纵轴', select(cols, w.params.y, function (v) { w.params.y = v; ctx.redraw(); })])
      ]));
      el.appendChild(box('外观', [
        h('label', { class: 'ow-col' }, ['颜色', select([['(无)', '(无)']].concat(t.cols.filter(function (c) { return c.type === 'cat'; }).map(function (c) { return [c.name, c.name]; })), w.params.color, function (v) { w.params.color = v; ctx.redraw(); })]),
        slider('点的大小', w.params.size, 2, 10, 1, String, function (v) { w.params.size = v; ctx.redraw(); }),
        check('类别轴上把重叠的点散开', w.params.jitter, function (v) { w.params.jitter = v; ctx.redraw(); })
      ]));
    },
    view: function (w, el) {
      var t = w.inputs['数据'];
      if (!t) { el.appendChild(h('p', { class: 'ow-info', text: '还没有输入数据。' })); return; }
      var idx = function (n) { for (var i = 0; i < t.cols.length; i++) if (t.cols[i].name === n) return i; return -1; };
      var cv = h('canvas', { width: 760, height: 560, class: 'ow-canvas' });
      el.appendChild(cv);
      var sub = w.inputs['数据子集'], subset = null;
      if (sub) {
        var keys = {}; sub.rows.forEach(function (r) { keys[JSON.stringify(r)] = 1; });
        subset = function (r) { return keys[JSON.stringify(r)]; };
      }
      var sc = scatter(cv, t, { x: Math.max(0, idx(w.params.x)), y: Math.max(0, idx(w.params.y)), color: idx(w.params.color), size: w.params.size, jitter: w.params.jitter, subset: subset });
      if (sc) el.appendChild(h('div', { html: legendHtml(sc) }));
      if (subset) el.appendChild(h('p', { class: 'ow-note', text: '描黑边的点属于“数据子集”，其余点变淡。' }));
    }
  };

  W.box = {
    name: '箱线图', cat: '可视化', icon: 'BoxPlot.svg', desc: '比较特征分布和组间差异。',
    inputs: [{ name: '数据', type: 'data' }], outputs: [], defaults: { v: null, g: null },
    run: function (w, inp) { w.summary = inp['数据'] ? '' : ''; return {}; },
    ui: function (w, el, ctx) {
      var t = w.inputs['数据']; if (!t) return;
      var has = function (n) { return t.cols.some(function (c) { return c.name === n; }); };
      var firstNum = t.cols.filter(function (c) { return c.type === 'num'; })[0] || t.cols[0];
      if (!has(w.params.v)) w.params.v = firstNum.name;
      var yc = ML.yIdx(t), clu = has('簇') ? '簇' : null;
      if (w.params.g !== '(无)' && !has(w.params.g)) w.params.g = clu || (yc >= 0 ? t.cols[yc].name : '(无)');
      el.appendChild(box('变量', [select(t.cols.map(function (c) { return [c.name, c.name]; }), w.params.v, function (v) { w.params.v = v; ctx.redraw(); })]));
      el.appendChild(box('分组依据', [select([['(无)', '(不分组)']].concat(t.cols.filter(function (c) { return c.type === 'cat'; }).map(function (c) { return [c.name, c.name]; })), w.params.g, function (v) { w.params.g = v; ctx.redraw(); })]));
    },
    view: function (w, el) {
      var t = w.inputs['数据'];
      if (!t) { el.appendChild(h('p', { class: 'ow-info', text: '还没有输入数据。' })); return; }
      var idx = function (n) { for (var i = 0; i < t.cols.length; i++) if (t.cols[i].name === n) return i; return -1; };
      el.appendChild(h('div', { html: boxplotSvg(t, Math.max(0, idx(w.params.v)), idx(w.params.g)) }));
    }
  };

  function learner(def) {
    return {
      name: def.name, cat: '建模', icon: def.icon, desc: def.desc,
      inputs: [{ name: '数据', type: 'data' }], outputs: [{ name: '学习器', type: 'learner' }, { name: '模型', type: 'model' }],
      defaults: def.defaults,
      run: function (w, inp) {
        var L = { name: w.title, fit: function (t) { needClass(t); return def.fit(t, w.params); } };
        var out = { '学习器': L };
        w.summary = def.brief(w.params);
        if (inp['数据']) { var m = L.fit(inp['数据']); m.kind = def.kind; m.name = w.title; out['模型'] = m; }
        return out;
      },
      ui: function (w, el, ctx) { def.ui(w, el, ctx); },
      view: function (w, el) {
        el.appendChild(h('p', { class: 'ow-info', text: def.explain }));
        if (w.out['模型']) el.appendChild(h('p', { class: 'ow-note', text: '已用输入的 ' + w.inputs['数据'].rows.length + ' 行数据训练出一个模型，可以连到“预测结果”或“树查看器”。' }));
        else el.appendChild(h('p', { class: 'ow-note', text: '把它的“学习器”连到“测试与评分”，就能和其他模型比成绩。' }));
      }
    };
  }

  W.tree = learner({
    name: '决策树', icon: 'Tree.svg', kind: 'tree', desc: '训练易解释的树模型。',
    defaults: { minLeaf: 1, minSplit: 2, limitDepth: false, maxDepth: 3 },
    fit: function (t, p) { return ML.fitTree(t, { minLeaf: p.minLeaf, minSplit: p.minSplit, maxDepth: p.limitDepth ? p.maxDepth : 99 }); },
    brief: function (p) { return p.limitDepth ? '最多 ' + p.maxDepth + ' 层' : '不限层数'; },
    explain: '决策树一层层地提问，每次挑最能把各类分开的那个问题。层数越多，越能记住训练数据里的细节，也越容易过拟合。',
    ui: function (w, el, ctx) {
      el.appendChild(box('参数', [
        spin('每个叶子至少几条数据', w.params.minLeaf, 1, 50, 1, function (v) { w.params.minLeaf = v; ctx.changed(); }),
        spin('少于几条就不再分', w.params.minSplit, 2, 100, 1, function (v) { w.params.minSplit = v; ctx.changed(); }),
        check('限制最大层数', w.params.limitDepth, function (v) { w.params.limitDepth = v; ctx.changed(); }),
        spin('最大层数', w.params.maxDepth, 1, 30, 1, function (v) { w.params.maxDepth = v; ctx.changed(); })
      ]));
    }
  });

  W.knn = learner({
    name: 'k近邻', icon: 'KNN.svg', kind: 'knn', desc: '用最近样本进行预测。',
    defaults: { k: 5, metric: 'euclidean', weights: 'uniform' },
    fit: function (t, p) { return ML.fitKnn(t, p); },
    brief: function (p) { return 'k = ' + p.k; },
    explain: 'k 近邻不总结规律，只记住全部训练数据。来了新数据，就看离它最近的 k 个邻居多数是哪一类。k 太小时容易被个别标错的数据带偏。',
    ui: function (w, el, ctx) {
      el.appendChild(box('邻居', [spin('邻居个数 k', w.params.k, 1, 100, 1, function (v) { w.params.k = v; ctx.changed(); })]));
      el.appendChild(box('距离', [select([['euclidean', '欧氏距离（直线距离）'], ['manhattan', '曼哈顿距离（横竖走的距离）']], w.params.metric, function (v) { w.params.metric = v; ctx.changed(); })]));
      el.appendChild(box('投票方式', [select([['uniform', '每个邻居一票'], ['distance', '越近的邻居票越重']], w.params.weights, function (v) { w.params.weights = v; ctx.changed(); })]));
    }
  });

  W.logit = learner({
    name: '逻辑回归', icon: 'LogisticRegression.svg', kind: 'logit', desc: '训练常用的线性分类模型。',
    defaults: { cexp: 0 },
    fit: function (t, p) { return ML.fitLogit(t, { C: Math.pow(10, p.cexp) }); },
    brief: function (p) { return 'C = ' + +Math.pow(10, p.cexp).toPrecision(2); },
    explain: '逻辑回归给每个特征一个权重，加权求和后换算成属于各类的可能性。它画出的分界线是直的，不容易记住个别数据。',
    ui: function (w, el, ctx) {
      el.appendChild(box('正则化', [slider('C（越小越保守，越大越贴合训练数据）', w.params.cexp, -3, 3, 1,
        function (v) { return String(+Math.pow(10, v).toPrecision(2)); }, function (v) { w.params.cexp = v; ctx.changed(); })]));
    }
  });

  W.forest = learner({
    name: '随机森林', icon: 'RandomForest.svg', kind: 'forest', desc: '训练由多棵决策树组成的集成模型。',
    defaults: { n: 10, useMtry: false, mtry: 2, limitDepth: false, maxDepth: 5, seed: 42 },
    fit: function (t, p) { return ML.fitForest(t, { n: p.n, mtry: p.useMtry ? p.mtry : 0, maxDepth: p.limitDepth ? p.maxDepth : 99, seed: p.seed }); },
    brief: function (p) { return p.n + ' 棵树'; },
    explain: '随机森林让很多棵决策树各自在随机抽出的数据上学习，最后投票。单棵树的偶然错误会被其他树抵消。',
    ui: function (w, el, ctx) {
      el.appendChild(box('参数', [
        spin('树的棵数', w.params.n, 1, 200, 1, function (v) { w.params.n = v; ctx.changed(); }),
        check('指定每次分叉看几个特征', w.params.useMtry, function (v) { w.params.useMtry = v; ctx.changed(); }),
        spin('每次分叉看几个特征', w.params.mtry, 1, 50, 1, function (v) { w.params.mtry = v; ctx.changed(); }),
        check('限制每棵树的最大层数', w.params.limitDepth, function (v) { w.params.limitDepth = v; ctx.changed(); }),
        spin('最大层数', w.params.maxDepth, 1, 30, 1, function (v) { w.params.maxDepth = v; ctx.changed(); })
      ]));
    }
  });

  W.test = {
    name: '测试与评分', cat: '评估', icon: 'TestLearners1.svg', desc: '用交叉验证等方法比较模型效果。',
    inputs: [{ name: '数据', type: 'data' }, { name: '测试数据', type: 'data' }, { name: '学习器', type: 'learner', multi: true }],
    outputs: [{ name: '评估结果', type: 'eval' }],
    defaults: { method: 'cv', folds: 5, repeats: 10, trainPct: 66, seed: 0 },
    run: function (w, inp) {
      var t = inp['数据'], Ls = inp['学习器'] || [];
      if (!t) { w.summary = ''; return {}; }
      needClass(t);
      if (!Ls.length) { w.summary = '等待学习器'; return {}; }
      if (w.params.method === 'test' && !inp['测试数据']) throw new Error('选了“在测试数据上测试”，但没有连接测试数据');
      if (w.params.method === 'loo' && t.rows.length > 500) throw new Error('留一法要训练 ' + t.rows.length + ' 次，太慢了。请换交叉验证。');
      var res = ML.evaluate(t, inp['测试数据'], Ls, { method: w.params.method, folds: w.params.folds, repeats: w.params.repeats, trainPct: w.params.trainPct, seed: w.params.seed });
      w.summary = Ls.length + ' 个模型';
      return { '评估结果': res };
    },
    ui: function (w, el, ctx) {
      el.appendChild(box('测试方法', [radios('m' + w.id, [
        ['cv', '交叉验证', select([[2, '2 折'], [3, '3 折'], [5, '5 折'], [10, '10 折'], [20, '20 折']], w.params.folds, function (v) { w.params.folds = +v; ctx.changed(); })],
        ['random', '随机抽样', h('span', { class: 'ow-inline' }, [
          select([[2, '重复 2 次'], [3, '重复 3 次'], [5, '重复 5 次'], [10, '重复 10 次'], [20, '重复 20 次']], w.params.repeats, function (v) { w.params.repeats = +v; ctx.changed(); }),
          select([[50, '训练 50%'], [66, '训练 66%'], [70, '训练 70%'], [80, '训练 80%'], [90, '训练 90%']], w.params.trainPct, function (v) { w.params.trainPct = +v; ctx.changed(); })])],
        ['loo', '留一法'],
        ['train', '在训练数据上测试'],
        ['test', '在测试数据上测试']
      ], w.params.method, function (v) { w.params.method = v; ctx.changed(); })]));
    },
    view: function (w, el) {
      var res = w.out['评估结果'];
      if (!res) {
        el.appendChild(h('p', { class: 'ow-info', text: '需要连接“数据”和至少一个“学习器”。' }));
        return;
      }
      var s = '<table class="ow-grid score"><thead><tr><th>模型</th><th>分类准确率 CA</th><th>F1</th><th>精确率</th><th>召回率</th></tr></thead><tbody>';
      res.learners.forEach(function (L) {
        var sc = ML.scores(res, L);
        s += '<tr><td>' + esc(L.name) + '</td><td>' + fmt3(sc.CA) + '</td><td>' + fmt3(sc.F1) + '</td><td>' + fmt3(sc.Prec) + '</td><td>' + fmt3(sc.Recall) + '</td></tr>';
      });
      el.appendChild(h('div', { html: s + '</tbody></table>' }));
      var tips = {
        cv: '交叉验证把数据分成几份，轮流拿其中一份当考卷，其余当练习题。',
        random: '随机抽样每次随机留出一部分当考卷，重复多次取平均。',
        loo: '留一法每次只留 1 条数据当考卷，数据少时最充分。',
        train: '在训练数据上测试相当于拿练习题考试，分数会偏高。和交叉验证比一比，差距就是过拟合的程度。',
        test: '在测试数据上测试：模型只用“数据”学习，再到另一份从没见过的“测试数据”上考试。'
      };
      el.appendChild(h('p', { class: 'ow-note', text: tips[w.params.method] + ' 共评估了 ' + res.learners[0].actual.length + ' 次预测。' }));
    }
  };

  W.cm = {
    name: '混淆矩阵', cat: '评估', icon: 'ConfusionMatrix.svg', desc: '查看分类模型的正确和错误预测。',
    inputs: [{ name: '评估结果', type: 'eval' }], outputs: [], defaults: { learner: 0, show: 'count' },
    run: function (w, inp) { w.summary = ''; return {}; },
    ui: function (w, el, ctx) {
      var res = w.inputs['评估结果']; if (!res) return;
      if (w.params.learner >= res.learners.length) w.params.learner = 0;
      el.appendChild(box('模型', [radios('l' + w.id, res.learners.map(function (L, i) { return [i, L.name]; }), w.params.learner, function (v) { w.params.learner = +v; ctx.redraw(); })]));
      el.appendChild(box('显示', [select([['count', '样本数'], ['row', '占真实类别的比例'], ['col', '占预测类别的比例']], w.params.show, function (v) { w.params.show = v; ctx.redraw(); })]));
    },
    view: function (w, el) {
      var res = w.inputs['评估结果'];
      if (!res) { el.appendChild(h('p', { class: 'ow-info', text: '把“测试与评分”的评估结果连到这里。' })); return; }
      var L = res.learners[w.params.learner] || res.learners[0], m = ML.confusion(res, L), cls = res.classes;
      var rowSum = m.map(function (r) { return r.reduce(function (a, b) { return a + b; }, 0); });
      var colSum = cls.map(function (_, j) { return m.reduce(function (a, r) { return a + r[j]; }, 0); });
      var s = '<table class="ow-grid cm"><thead><tr><th class="corner">真实 ↓ / 预测 →</th>' + cls.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '<th>合计</th></tr></thead><tbody>';
      m.forEach(function (r, i) {
        s += '<tr><th>' + esc(cls[i]) + '</th>' + r.map(function (v, j) {
          var txt = w.params.show === 'row' ? pct(rowSum[i] ? v / rowSum[i] : 0) : w.params.show === 'col' ? pct(colSum[j] ? v / colSum[j] : 0) : v;
          return '<td class="' + (i === j ? 'diag' : (v ? 'off' : '')) + '">' + txt + '</td>';
        }).join('') + '<td class="sum">' + rowSum[i] + '</td></tr>';
      });
      s += '<tr><th>合计</th>' + colSum.map(function (v) { return '<td class="sum">' + v + '</td>'; }).join('') + '<td class="sum">' + L.actual.length + '</td></tr></tbody></table>';
      el.appendChild(h('p', { class: 'ow-info', text: '模型：' + L.name }));
      el.appendChild(h('div', { html: s }));
      el.appendChild(h('p', { class: 'ow-note', text: '每一行是真实类别，每一列是模型的判断。对角线上是判断正确的数据，其余格子是判错的。' }));
    }
  };

  W.pred = {
    name: '预测结果', cat: '评估', icon: 'Predictions.svg', desc: '查看模型对输入数据的预测结果。',
    inputs: [{ name: '数据', type: 'data' }, { name: '模型', type: 'model', multi: true }], outputs: [], defaults: {},
    run: function (w, inp) { w.summary = ''; return {}; },
    view: function (w, el) {
      var t = w.inputs['数据'], ms = w.inputs['模型'] || [];
      if (!t || !ms.length) { el.appendChild(h('p', { class: 'ow-info', text: '需要连接“数据”和至少一个“模型”（决策树等组件在有数据输入时会输出模型）。' })); return; }
      var y = ML.yIdx(t);
      var rows = ms.map(function (m) { return ML.align(m.table, t).map(function (r) { return ML.predict(m, r); }); });
      var head = ms.map(function (m) { return '<th class="pred">' + esc(m.name) + '</th>'; }).join('');
      var acc = ms.map(function (m, k) { return y < 0 ? '' : m.name + ' 判对 ' + rows[k].filter(function (p, i) { return p === t.rows[i][y]; }).length + ' / ' + t.rows.length; }).filter(Boolean);
      if (acc.length) el.appendChild(h('p', { class: 'ow-info', text: acc.join('；') + '。' }));
      el.appendChild(h('div', { class: 'ow-scroll', html: dataTableHtml(t, 500, head, function (r, i) {
        return rows.map(function (pr) { var ok = y >= 0 && pr[i] === r[y]; return '<td class="pred ' + (y < 0 ? '' : ok ? 'ok' : 'bad') + '">' + esc(pr[i]) + '</td>'; }).join('');
      }) }));
    }
  };

  W.treeview = {
    name: '树查看器', cat: '可视化', icon: 'TreeViewer.svg', desc: '查看决策树结构和每个分叉上的数据。',
    inputs: [{ name: '树模型', type: 'model' }], outputs: [], defaults: {},
    run: function (w, inp) {
      var m = inp['树模型'];
      if (m && m.kind !== 'tree') throw new Error('树查看器只能显示决策树的模型');
      w.summary = ''; return {};
    },
    view: function (w, el) {
      var m = w.inputs['树模型'];
      if (!m) { el.appendChild(h('p', { class: 'ow-info', text: '把一个有数据输入的“决策树”的“模型”连到这里。' })); return; }
      var r = treeSvg(m);
      el.appendChild(h('p', { class: 'ow-info', text: '一共 ' + r.depth + ' 层，' + r.leaves + ' 个最终判断。每个方框写着多数类别、它所占的比例和落到这里的数据条数，方框底部是下一步要问的特征。' }));
      el.appendChild(h('div', { class: 'ow-scroll tree-wrap', html: r.svg }));
      el.appendChild(h('div', { html: r.legend }));
    }
  };

  W.pca = {
    name: '主成分分析', cat: '无监督', icon: 'PCA.svg', desc: '用 PCA 做线性降维并查看解释方差。',
    inputs: [{ name: '数据', type: 'data' }], outputs: [{ name: '转换后数据', type: 'data' }], defaults: { n: 2 },
    run: function (w, inp) {
      var t = inp['数据']; if (!t) { w.summary = ''; return {}; }
      var r = ML.pca(t, w.params.n); w.variance = r.variance;
      var kept = r.variance.slice(0, w.params.n).reduce(function (a, b) { return a + b; }, 0);
      w.summary = w.params.n + ' 个成分，保留 ' + (kept * 100).toFixed(0) + '%';
      return { '转换后数据': r.table };
    },
    ui: function (w, el, ctx) {
      el.appendChild(box('成分', [spin('保留几个主成分', w.params.n, 1, 20, 1, function (v) { w.params.n = v; ctx.changed(); })]));
    },
    view: function (w, el) {
      if (!w.variance) { el.appendChild(h('p', { class: 'ow-info', text: '还没有输入数据。' })); return; }
      var v = w.variance, W2 = 600, H = 300, pad = 46, cum = 0, bw = (W2 - pad - 20) / v.length;
      var s = '<svg viewBox="0 0 ' + W2 + ' ' + H + '" class="ow-svg"><line x1="' + pad + '" x2="' + pad + '" y1="10" y2="' + (H - 40) + '" stroke="#999"/><line x1="' + pad + '" x2="' + (W2 - 10) + '" y1="' + (H - 40) + '" y2="' + (H - 40) + '" stroke="#999"/>';
      var pts = [];
      v.forEach(function (p, i) {
        cum += p;
        var x = pad + i * bw, hh = p * (H - 60);
        s += '<rect x="' + (x + bw * 0.15) + '" y="' + (H - 40 - hh) + '" width="' + bw * 0.7 + '" height="' + hh + '" fill="' + (i < w.params.n ? '#46befa' : '#cfe8f5') + '"/>';
        s += '<text x="' + (x + bw / 2) + '" y="' + (H - 22) + '" text-anchor="middle">PC' + (i + 1) + '</text>';
        s += '<text x="' + (x + bw / 2) + '" y="' + (H - 46 - hh) + '" text-anchor="middle">' + (p * 100).toFixed(1) + '%</text>';
        pts.push((x + bw / 2) + ',' + (H - 40 - cum * (H - 60)));
      });
      s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#ed462f" stroke-width="2"/></svg>';
      el.appendChild(h('div', { html: s }));
      el.appendChild(h('p', { class: 'ow-note', text: '蓝柱是每个主成分保留的差异比例，红线是累计比例。把 4 个测量值压成 2 个数，还能保留多少信息，看红线在第 2 个点的高度。' }));
    }
  };

  W.kmeans = {
    name: 'K 均值聚类', cat: '无监督', icon: 'KMeans.svg', desc: '运行 K-Means 聚类并查看聚类质量。',
    inputs: [{ name: '数据', type: 'data' }], outputs: [{ name: '数据', type: 'data' }], defaults: { k: 3, seed: 7 },
    run: function (w, inp) {
      var t = inp['数据']; if (!t) { w.summary = ''; return {}; }
      var r = ML.kmeans(t, w.params.k, w.params.seed); w.result = r;
      w.summary = w.params.k + ' 个簇';
      return { '数据': r.table };
    },
    ui: function (w, el, ctx) {
      el.appendChild(box('簇的个数', [spin('k', w.params.k, 2, 10, 1, function (v) { w.params.k = v; ctx.changed(); }),
        h('button', { type: 'button', text: '换一组初始中心再跑', onclick: function () { w.params.seed++; ctx.changed(); } })]));
    },
    view: function (w, el) {
      var r = w.result, t = w.inputs['数据'];
      if (!r || !t) { el.appendChild(h('p', { class: 'ow-info', text: '还没有输入数据。' })); return; }
      el.appendChild(h('p', { class: 'ow-info', text: '用 ' + r.F + ' 个特征分成 ' + r.k + ' 个簇，迭代 ' + r.iterations + ' 轮。轮廓系数 ' + r.silhouette.toFixed(3) + '，越接近 1 说明簇分得越开。' }));
      var y = ML.yIdx(t), clus = [];
      for (var c = 0; c < r.k; c++) clus.push('C' + (c + 1));
      if (y >= 0) {
        var cls = ML.classes(t);
        var s = '<table class="ow-grid cm"><thead><tr><th class="corner">簇 ↓ / ' + esc(t.cols[y].name) + ' →</th>' + cls.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
        clus.forEach(function (cname, ci) {
          s += '<tr><th>' + cname + '</th>' + cls.map(function (cl) {
            return '<td>' + t.rows.filter(function (row, i) { return r.labels[i] === ci && row[y] === cl; }).length + '</td>';
          }).join('') + '</tr>';
        });
        el.appendChild(h('div', { html: s + '</tbody></table>' }));
        el.appendChild(h('p', { class: 'ow-note', text: '聚类时看不到“' + t.cols[y].name + '”这一列。上表把聚类结果和真实类别放在一起对照。' }));
      } else {
        el.appendChild(h('p', { class: 'ow-note', text: clus.map(function (cname, ci) { return cname + '：' + r.labels.filter(function (l) { return l === ci; }).length + ' 条'; }).join('，') }));
      }
    }
  };

  window.OW = {
    widgets: W, h: h, PALETTE: PALETTE,
    order: [['数据', ['file', 'table', 'select', 'sampler']], ['可视化', ['scatter', 'box', 'treeview']], ['建模', ['tree', 'knn', 'logit', 'forest']],
      ['评估', ['test', 'cm', 'pred']], ['无监督', ['pca', 'kmeans']]],
    catColor: { '数据': '#ffd39f', '可视化': '#ffb7b1', '建模': '#fac1d9', '评估': '#c3f3f3', '无监督': '#cae1ef' }
  };
})();
