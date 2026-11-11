/* 第3讲 机器学习流程练习：在浏览器里完成 选数据 → 看数据 → 选模型 → 测试与评分 → 混淆矩阵。
   对应四个示例流程（鸢尾花分类入门、分类模型对比、PCA 降维观察、k-Means 聚类）。
   全部计算在本页完成，不联网、不上传数据。 */
(function () {
  'use strict';

  var DATASETS = [
    ['iris', window.ORANGE_DATA.iris],
    ['melon', window.COURSE_DATA.melon],
    ['loan', window.COURSE_DATA.loan],
    ['titanic', window.ORANGE_DATA.titanic]
  ];
  var COLORS = ['#005aa7', '#c64646', '#1f8a70', '#d6a11d', '#7a4fb3', '#4b5563'];
  var $ = function (id) { return document.getElementById(id); };

  // ---------- 随机数（固定种子，结果可复现） ----------
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffled(n, rand) {
    var idx = [];
    for (var i = 0; i < n; i++) idx.push(i);
    for (var j = n - 1; j > 0; j--) {
      var k = Math.floor(rand() * (j + 1));
      var t = idx[j]; idx[j] = idx[k]; idx[k] = t;
    }
    return idx;
  }

  // ---------- 状态 ----------
  var state = { key: 'iris', ds: null, feats: [], seed: 20261123 };

  function classesOf(ds) {
    var seen = [], all = ds.rows.concat(ds.test || []);
    all.forEach(function (r) { var c = r[r.length - 1]; if (seen.indexOf(c) < 0) seen.push(c); });
    return seen;
  }

  // ---------- 特征编码（给 k 近邻和逻辑回归用） ----------
  function makeEncoder(ds, feats, trainRows) {
    var parts = feats.map(function (f) {
      if (ds.types[f] === 'num') {
        var vals = trainRows.map(function (r) { return r[f]; });
        var m = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
        var s = Math.sqrt(vals.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / vals.length) || 1;
        if (ds.noScale) { m = 0; s = 1; }
        return function (r) { return [(r[f] - m) / s]; };
      }
      var levels = [];
      trainRows.forEach(function (r) { if (levels.indexOf(r[f]) < 0) levels.push(r[f]); });
      return function (r) { return levels.map(function (v) { return r[f] === v ? 1 : 0; }); };
    });
    return function (r) {
      var out = [];
      parts.forEach(function (p) { out.push.apply(out, p(r)); });
      return out;
    };
  }

  function majority(rows, classes) {
    var cnt = classes.map(function () { return 0; });
    rows.forEach(function (r) { cnt[classes.indexOf(r[r.length - 1])]++; });
    var best = 0;
    for (var i = 1; i < cnt.length; i++) if (cnt[i] > cnt[best]) best = i;
    return { label: classes[best], counts: cnt };
  }
  function entropy(rows, classes) {
    var n = rows.length, cnt = {};
    rows.forEach(function (r) { var c = r[r.length - 1]; cnt[c] = (cnt[c] || 0) + 1; });
    var e = 0;
    Object.keys(cnt).forEach(function (c) { var p = cnt[c] / n; e -= p * Math.log2(p); });
    return e;
  }

  // ---------- 决策树（按信息增益选问题，与课件一致） ----------
  function trainTree(ds, feats, rows, classes, opt) {
    var rand = opt.rand;
    function grow(sub, used, depth) {
      var maj = majority(sub, classes);
      var pure = maj.counts.filter(function (c) { return c > 0; }).length <= 1;
      if (pure || depth >= opt.maxDepth || sub.length < opt.minSplit) return { leaf: true, label: maj.label, n: sub.length };
      var cand = feats.filter(function (f) { return !(ds.types[f] === 'cat' && used.indexOf(f) >= 0); });
      if (opt.mtry && cand.length > opt.mtry) {
        var pick = shuffled(cand.length, rand).slice(0, opt.mtry).sort(function (a, b) { return a - b; });
        cand = pick.map(function (i) { return cand[i]; });
      }
      var base = entropy(sub, classes), best = null;
      cand.forEach(function (f) {
        if (ds.types[f] === 'cat') {
          var groups = {};
          sub.forEach(function (r) { (groups[r[f]] = groups[r[f]] || []).push(r); });
          var keys = Object.keys(groups);
          if (keys.length < 2) return;
          var rem = keys.reduce(function (a, k) { return a + groups[k].length / sub.length * entropy(groups[k], classes); }, 0);
          var g = base - rem;
          if (!best || g > best.gain + 1e-12) best = { gain: g, f: f, cat: true, groups: groups };
        } else {
          var vals = sub.map(function (r) { return r[f]; }).sort(function (a, b) { return a - b; });
          var uniq = vals.filter(function (v, i) { return i === 0 || v !== vals[i - 1]; });
          for (var i = 0; i + 1 < uniq.length; i++) {
            var th = (uniq[i] + uniq[i + 1]) / 2;
            var L = sub.filter(function (r) { return r[f] <= th; });
            var R = sub.filter(function (r) { return r[f] > th; });
            var g2 = base - L.length / sub.length * entropy(L, classes) - R.length / sub.length * entropy(R, classes);
            if (!best || g2 > best.gain + 1e-12) best = { gain: g2, f: f, cat: false, th: th, L: L, R: R };
          }
        }
      });
      if (!best || best.gain <= 1e-12) return { leaf: true, label: maj.label, n: sub.length };
      var node = { leaf: false, f: best.f, cat: best.cat, label: maj.label, n: sub.length };
      if (best.cat) {
        node.kids = {};
        Object.keys(best.groups).sort().forEach(function (k) { node.kids[k] = grow(best.groups[k], used.concat([best.f]), depth + 1); });
      } else {
        node.th = best.th;
        node.left = grow(best.L, used, depth + 1);
        node.right = grow(best.R, used, depth + 1);
      }
      return node;
    }
    var root = grow(rows, [], 0);
    function predict(r) {
      var t = root;
      while (!t.leaf) {
        if (t.cat) { var k = t.kids[r[t.f]]; if (!k) return t.label; t = k; }
        else t = r[t.f] <= t.th ? t.left : t.right;
      }
      return t.label;
    }
    return { predict: predict, tree: root };
  }

  // ---------- k 近邻 ----------
  function trainKnn(ds, feats, rows, classes, k) {
    var enc = makeEncoder(ds, feats, rows);
    var pts = rows.map(function (r) { return { x: enc(r), c: r[r.length - 1] }; });
    return {
      predict: function (r) {
        var q = enc(r);
        var d = pts.map(function (p) {
          var s = 0;
          for (var i = 0; i < q.length; i++) s += (p.x[i] - q[i]) * (p.x[i] - q[i]);
          return { d: s, c: p.c };
        });
        d.sort(function (a, b) { return a.d - b.d; });
        // 第 k 个邻居与后面的点距离相同时，把这些并列的点一起算进来
        var cut = d[Math.min(k, d.length) - 1].d + 1e-12, near = d.filter(function (o) { return o.d <= cut; });
        var cnt = {}, best = null;
        near.forEach(function (o) {
          cnt[o.c] = (cnt[o.c] || 0) + 1;
          if (best === null || cnt[o.c] > cnt[best]) best = o.c;
        });
        return best;
      }
    };
  }

  // ---------- 逻辑回归（多类，梯度下降） ----------
  function trainLogit(ds, feats, rows, classes) {
    var enc = makeEncoder(ds, feats, rows);
    var X = rows.map(function (r) { return enc(r).concat([1]); });
    var Y = rows.map(function (r) { return classes.indexOf(r[r.length - 1]); });
    var D = X[0].length, C = classes.length;
    var W = [];
    for (var c = 0; c < C; c++) { W.push([]); for (var d = 0; d < D; d++) W[c].push(0); }
    function probs(x) {
      var z = W.map(function (w) { var s = 0; for (var i = 0; i < D; i++) s += w[i] * x[i]; return s; });
      var m = Math.max.apply(null, z);
      var e = z.map(function (v) { return Math.exp(v - m); });
      var t = e.reduce(function (a, b) { return a + b; }, 0);
      return e.map(function (v) { return v / t; });
    }
    for (var it = 0; it < 400; it++) {
      var G = W.map(function (w) { return w.map(function () { return 0; }); });
      for (var n = 0; n < X.length; n++) {
        var p = probs(X[n]);
        for (var c2 = 0; c2 < C; c2++) {
          var err = p[c2] - (Y[n] === c2 ? 1 : 0);
          for (var i = 0; i < D; i++) G[c2][i] += err * X[n][i];
        }
      }
      for (var c3 = 0; c3 < C; c3++) for (var j = 0; j < D; j++) W[c3][j] -= 0.5 * (G[c3][j] / X.length + 0.01 * W[c3][j]);
    }
    return {
      predict: function (r) {
        var p = probs(enc(r).concat([1])), b = 0;
        for (var i = 1; i < p.length; i++) if (p[i] > p[b]) b = i;
        return classes[b];
      }
    };
  }

  // ---------- 随机森林 ----------
  function trainForest(ds, feats, rows, classes, nTrees, seed) {
    var rand = rng(seed), trees = [];
    var mtry = Math.max(1, Math.round(Math.sqrt(feats.length)));
    for (var t = 0; t < nTrees; t++) {
      var boot = [];
      for (var i = 0; i < rows.length; i++) boot.push(rows[Math.floor(rand() * rows.length)]);
      trees.push(trainTree(ds, feats, boot, classes, { maxDepth: 99, minSplit: 2, mtry: mtry, rand: rand }));
    }
    return {
      predict: function (r) {
        var cnt = {}, best = null;
        trees.forEach(function (tr) {
          var c = tr.predict(r);
          cnt[c] = (cnt[c] || 0) + 1;
          if (best === null || cnt[c] > cnt[best]) best = c;
        });
        return best;
      }
    };
  }

  // ---------- 读取控件 ----------
  function modelSpecs() {
    var out = [];
    var depth = +$('treeDepth').value;
    if ($('useTree').checked) out.push({ id: 'tree', name: '决策树', depth: depth > 10 ? 99 : depth, min: +$('treeMin').value });
    if ($('useKnn').checked) out.push({ id: 'knn', name: 'k 近邻（k=' + $('knnK').value + '）', k: +$('knnK').value });
    if ($('useLogit').checked) out.push({ id: 'logit', name: '逻辑回归' });
    if ($('useForest').checked) out.push({ id: 'forest', name: '随机森林', n: +$('forestN').value });
    return out;
  }
  function fit(spec, rows) {
    var ds = state.ds, feats = state.feats, cls = classesOf(ds);
    if (spec.id === 'tree') return trainTree(ds, feats, rows, cls, { maxDepth: spec.depth, minSplit: spec.min, rand: rng(1) });
    if (spec.id === 'knn') return trainKnn(ds, feats, rows, cls, Math.min(spec.k, rows.length));
    if (spec.id === 'logit') return trainLogit(ds, feats, rows, cls);
    return trainForest(ds, feats, rows, cls, spec.n, state.seed);
  }

  // ---------- 评估方式 ----------
  function evalOptions(ds) {
    var o = [['train', '在训练数据上测（会偏高）']];
    if (ds.test) o.push(['fixed', '用单独的测试集（8 个瓜）']);
    var n = ds.rows.length;
    if (n >= 30) { o.push(['cv', '5 折交叉验证']); o.push(['split', '随机留出 30% 当测试集']); }
    else o.push(['loo', '留一法（每次留 1 条测）']);
    return o;
  }
  function folds() {
    var ds = state.ds, mode = $('evalSelect').value, n = ds.rows.length;
    if (mode === 'train') return [{ train: ds.rows, test: ds.rows }];
    if (mode === 'fixed') return [{ train: ds.rows, test: ds.test }];
    var idx = shuffled(n, rng(state.seed));
    if (mode === 'split') {
      var cut = Math.round(n * 0.7);
      return [{ train: idx.slice(0, cut).map(function (i) { return ds.rows[i]; }), test: idx.slice(cut).map(function (i) { return ds.rows[i]; }) }];
    }
    var K = mode === 'loo' ? n : 5, out = [];
    for (var f = 0; f < K; f++) {
      var tr = [], te = [];
      idx.forEach(function (i, pos) { (pos % K === f ? te : tr).push(ds.rows[i]); });
      out.push({ train: tr, test: te });
    }
    return out;
  }

  // ---------- 测试与评分 ----------
  var lastResults = [];
  function score() {
    var specs = modelSpecs(), fs = folds(), cls = classesOf(state.ds);
    lastResults = specs.map(function (spec) {
      var trOk = 0, trN = 0, teOk = 0, teN = 0;
      var cm = cls.map(function () { return cls.map(function () { return 0; }); });
      fs.forEach(function (fold) {
        var m = fit(spec, fold.train);
        fold.train.forEach(function (r) { trN++; if (m.predict(r) === r[r.length - 1]) trOk++; });
        fold.test.forEach(function (r) {
          var p = m.predict(r), y = r[r.length - 1];
          teN++; if (p === y) teOk++;
          cm[cls.indexOf(y)][cls.indexOf(p)]++;
        });
      });
      return { spec: spec, train: trOk / trN, test: teOk / teN, cm: cm };
    });
    var mode = $('evalSelect').value;
    var h = '<tr><th>模型</th><th>训练准确率</th><th>测试准确率</th></tr>';
    lastResults.forEach(function (r) {
      var gap = mode !== 'train' && r.train - r.test >= 0.1;
      h += '<tr><td>' + r.spec.name + '</td><td>' + pct(r.train) + '</td><td' + (gap ? ' class="gap"' : '') + '>' +
        (mode === 'train' ? '（同左）' : pct(r.test)) + '</td></tr>';
    });
    if (!lastResults.length) h += '<tr><td colspan="3">请在左侧至少勾选一个模型</td></tr>';
    $('scoreTable').innerHTML = h;
    $('scoreNote').textContent = mode === 'train'
      ? '训练数据既用来学又用来测，相当于考原题。换一种测法，看看分数会不会掉。'
      : '红色表示测试准确率比训练准确率低了 10 个百分点以上：模型把训练数据背下来了，换了新数据就不灵，这就是过拟合。';
    var sel = $('cmModel'), keep = sel.value;
    sel.innerHTML = lastResults.map(function (r, i) { return '<option value="' + i + '">' + r.spec.name + '</option>'; }).join('');
    if (keep && +keep < lastResults.length) sel.value = keep;
    drawCm();
  }
  function pct(v) { return (v * 100).toFixed(1) + '%'; }
  function drawCm() {
    var r = lastResults[+$('cmModel').value || 0], cls = classesOf(state.ds);
    if (!r) { $('cmTable').innerHTML = ''; return; }
    var h = '<tr><th>真实 \\ 判断</th>' + cls.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>';
    r.cm.forEach(function (row, i) {
      h += '<tr><th>' + cls[i] + '</th>' + row.map(function (v, j) { return '<td' + (i === j ? ' class="diag"' : '') + '>' + v + '</td>'; }).join('') + '</tr>';
    });
    $('cmTable').innerHTML = h;
  }

  // ---------- 决策树结构 ----------
  function drawTree() {
    var specs = modelSpecs().filter(function (s) { return s.id === 'tree'; });
    $('treeBox').hidden = !specs.length;
    if (!specs.length) return;
    var ds = state.ds, mode = $('evalSelect').value;
    var rows = mode === 'split' ? folds()[0].train : ds.rows;
    var t = trainTree(ds, state.feats, rows, classesOf(ds), { maxDepth: specs[0].depth, minSplit: specs[0].min, rand: rng(1) }).tree;
    var leaves = 0, depth = 0;
    (function walk(n, d) {
      depth = Math.max(depth, d);
      if (n.leaf) { leaves++; return; }
      if (n.cat) Object.keys(n.kids).forEach(function (k) { walk(n.kids[k], d + 1); });
      else { walk(n.left, d + 1); walk(n.right, d + 1); }
    })(t, 0);
    var name = function (f) { return ds.features[f]; };
    function html(n) {
      if (n.leaf) return '<span class="leaf">判断：' + n.label + '</span>（' + n.n + ' 条）';
      var s = '<span class="q">问：' + name(n.f) + (n.cat ? '？' : ' ≤ ' + (+n.th.toFixed(2)) + ' 吗？') + '</span><ul>';
      if (n.cat) Object.keys(n.kids).forEach(function (k) { s += '<li>' + k + ' → ' + html(n.kids[k]) + '</li>'; });
      else s += '<li>是 → ' + html(n.left) + '</li><li>否 → ' + html(n.right) + '</li>';
      return s + '</ul>';
    }
    var head = '<p class="hint">一共问了 ' + depth + ' 层，得出 ' + leaves + ' 种最终判断。' +
      (mode === 'split' ? '这棵树只用了训练部分的数据。' : '这棵树用了全部数据。') + '</p>';
    $('treeView').innerHTML = head + (leaves > 60 ? '<p class="hint">判断太多，这里不逐条展开。把“最大层数”调小试试。</p>' : '<ul><li>' + html(t) + '</li></ul>');
  }

  // ---------- PCA（数值特征的前两个主成分） ----------
  function pca(rows, feats) {
    var X = rows.map(function (r) { return feats.map(function (f) { return r[f]; }); });
    var d = feats.length, n = X.length;
    var mean = [], sd = [];
    for (var j = 0; j < d; j++) {
      var m = 0; X.forEach(function (x) { m += x[j]; }); m /= n;
      var v = 0; X.forEach(function (x) { v += (x[j] - m) * (x[j] - m); });
      mean.push(m); sd.push(Math.sqrt(v / n) || 1);
    }
    var Z = X.map(function (x) { return x.map(function (v, j) { return (v - mean[j]) / sd[j]; }); });
    var A = [];
    for (var a = 0; a < d; a++) { A.push([]); for (var b = 0; b < d; b++) { var s = 0; Z.forEach(function (z) { s += z[a] * z[b]; }); A[a].push(s / n); } }
    // 雅可比法求特征向量
    var V = A.map(function (_, i) { return A.map(function (_, j) { return i === j ? 1 : 0; }); });
    for (var sweep = 0; sweep < 60; sweep++) {
      for (var p = 0; p < d; p++) for (var q = p + 1; q < d; q++) {
        if (Math.abs(A[p][q]) < 1e-12) continue;
        var th = 0.5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p]);
        var c = Math.cos(th), s2 = Math.sin(th);
        for (var k = 0; k < d; k++) {
          var akp = A[k][p], akq = A[k][q];
          A[k][p] = c * akp - s2 * akq; A[k][q] = s2 * akp + c * akq;
        }
        for (var k2 = 0; k2 < d; k2++) {
          var apk = A[p][k2], aqk = A[q][k2];
          A[p][k2] = c * apk - s2 * aqk; A[q][k2] = s2 * apk + c * aqk;
        }
        for (var k3 = 0; k3 < d; k3++) {
          var vkp = V[k3][p], vkq = V[k3][q];
          V[k3][p] = c * vkp - s2 * vkq; V[k3][q] = s2 * vkp + c * vkq;
        }
      }
    }
    var order = A.map(function (r, i) { return i; }).sort(function (i, j) { return A[j][j] - A[i][i]; });
    var total = order.reduce(function (t, i) { return t + A[i][i]; }, 0);
    var comps = order.slice(0, 2).map(function (i) { return V.map(function (row) { return row[i]; }); });
    return {
      share: order.slice(0, 2).map(function (i) { return A[i][i] / total; }),
      project: function (r) {
        var z = feats.map(function (f, j) { return (r[f] - mean[j]) / sd[j]; });
        return comps.map(function (w) { return w.reduce(function (t, wi, j) { return t + wi * z[j]; }, 0); });
      }
    };
  }

  // ---------- k-Means ----------
  function kmeans(points, k, seed) {
    var rand = rng(seed), centers = [points[Math.floor(rand() * points.length)].slice()];
    while (centers.length < k) {
      var d2 = points.map(function (p) { return Math.min.apply(null, centers.map(function (c) { return dist2(p, c); })); });
      var tot = d2.reduce(function (a, b) { return a + b; }, 0), r = rand() * tot, i = 0;
      while (i < d2.length - 1 && r > d2[i]) { r -= d2[i]; i++; }
      centers.push(points[i].slice());
    }
    var lab = [];
    for (var it = 0; it < 50; it++) {
      var changed = false;
      points.forEach(function (p, n) {
        var b = 0;
        for (var c = 1; c < k; c++) if (dist2(p, centers[c]) < dist2(p, centers[b])) b = c;
        if (lab[n] !== b) { lab[n] = b; changed = true; }
      });
      centers = centers.map(function (c, ci) {
        var mem = points.filter(function (_, n) { return lab[n] === ci; });
        if (!mem.length) return c;
        return c.map(function (_, j) { return mem.reduce(function (t, p) { return t + p[j]; }, 0) / mem.length; });
      });
      if (!changed) break;
    }
    return { labels: lab, centers: centers };
  }
  function dist2(a, b) { var s = 0; for (var i = 0; i < a.length; i++) s += (a[i] - b[i]) * (a[i] - b[i]); return s; }

  // ---------- 画图 ----------
  function numFeats() { return state.ds.types.map(function (t, i) { return t === 'num' ? i : -1; }).filter(function (i) { return i >= 0; }); }

  function drawPlot() {
    var ds = state.ds, cv = $('plot'), g = cv.getContext('2d');
    var W = cv.width, H = cv.height, pad = 56;
    g.clearRect(0, 0, W, H);
    var cls = classesOf(ds), nums = numFeats();
    var colorMode = $('colorSelect').value;
    $('kmeansBox').style.display = colorMode === 'kmeans' ? '' : 'none';
    $('clusterBox').hidden = colorMode !== 'kmeans';
    if (!nums.length) return drawBars(g, W, H, cls);

    var xs = $('xSelect').value, ys = $('ySelect').value;
    var useFeats = state.feats.filter(function (f) { return ds.types[f] === 'num'; });
    var P = (xs[0] === 'p' || ys[0] === 'p') && useFeats.length >= 2 ? pca(ds.rows, useFeats) : null;
    function coord(r, sel) {
      if (sel[0] === 'p') return P ? P.project(r)[+sel.slice(1)] : 0;
      return r[+sel];
    }
    function axisName(sel) {
      if (sel[0] === 'p') return '主成分' + (+sel.slice(1) + 1) + (P ? '（保留了 ' + (P.share[+sel.slice(1)] * 100).toFixed(1) + '% 的差异）' : '');
      return ds.features[+sel];
    }
    var rows = ds.rows.map(function (r) { return { r: r, test: false }; });
    if (ds.test) ds.test.forEach(function (r) { rows.push({ r: r, test: true }); });
    var pts = rows.map(function (o) { return [coord(o.r, xs), coord(o.r, ys)]; });
    var xmin = Math.min.apply(null, pts.map(function (p) { return p[0]; })), xmax = Math.max.apply(null, pts.map(function (p) { return p[0]; }));
    var ymin = Math.min.apply(null, pts.map(function (p) { return p[1]; })), ymax = Math.max.apply(null, pts.map(function (p) { return p[1]; }));
    var dx = (xmax - xmin) * 0.08 || 1, dy = (ymax - ymin) * 0.08 || 1;
    xmin -= dx; xmax += dx; ymin -= dy; ymax += dy;
    var sx = function (v) { return pad + (v - xmin) / (xmax - xmin) * (W - pad - 20); };
    var sy = function (v) { return H - pad - (v - ymin) / (ymax - ymin) * (H - pad - 20); };

    // 模型分区
    var canBoundary = state.feats.length === 2 && state.feats.every(function (f) { return ds.types[f] === 'num'; }) &&
      xs === String(state.feats[0]) && ys === String(state.feats[1]);
    $('showBoundary').disabled = !canBoundary;
    $('boundaryLabel').textContent = canBoundary
      ? '画出“混淆矩阵”所选模型的分区'
      : '画出模型的分区（只勾两个数值特征、并把它们设为横轴和纵轴时可用）';
    if (canBoundary && $('showBoundary').checked && lastResults.length) {
      var spec = lastResults[+$('cmModel').value || 0].spec;
      var m = fit(spec, $('evalSelect').value === 'split' ? folds()[0].train : ds.rows);
      var step = 8;
      for (var px = pad; px < W - 20; px += step) for (var py = 20; py < H - pad; py += step) {
        var vx = xmin + (px + step / 2 - pad) / (W - pad - 20) * (xmax - xmin);
        var vy = ymin + (H - pad - py - step / 2) / (H - pad - 20) * (ymax - ymin);
        var fake = []; fake[state.feats[0]] = vx; fake[state.feats[1]] = vy; fake.push('');
        g.fillStyle = COLORS[cls.indexOf(m.predict(fake)) % COLORS.length];
        g.globalAlpha = 0.13; g.fillRect(px, py, step, step); g.globalAlpha = 1;
      }
    }

    // 坐标轴
    g.strokeStyle = '#9aa6b8'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(pad, 20); g.lineTo(pad, H - pad); g.lineTo(W - 20, H - pad); g.stroke();
    g.fillStyle = '#39465b'; g.font = '15px "Microsoft YaHei", sans-serif'; g.textAlign = 'center';
    g.fillText(axisName(xs), (W + pad) / 2, H - 14);
    for (var t = 0; t <= 4; t++) {
      var xv = xmin + (xmax - xmin) * t / 4, yv = ymin + (ymax - ymin) * t / 4;
      g.fillText(+xv.toFixed(1), sx(xv), H - pad + 20);
      g.textAlign = 'right'; g.fillText(+yv.toFixed(1), pad - 8, sy(yv) + 5); g.textAlign = 'center';
    }
    g.save(); g.translate(16, (H - pad) / 2); g.rotate(-Math.PI / 2); g.fillText(axisName(ys), 0, 0); g.restore();

    // 颜色
    var colorIdx, legend;
    if (colorMode === 'kmeans') {
      var feats = useFeats.length ? useFeats : nums;
      var mean = feats.map(function (f) { return ds.rows.reduce(function (t, r) { return t + r[f]; }, 0) / ds.rows.length; });
      var sd = feats.map(function (f, j) { return Math.sqrt(ds.rows.reduce(function (t, r) { return t + (r[f] - mean[j]) * (r[f] - mean[j]); }, 0) / ds.rows.length) || 1; });
      var z = ds.rows.map(function (r) { return feats.map(function (f, j) { return (r[f] - mean[j]) / sd[j]; }); });
      var K = +$('kmeansK').value, km = kmeans(z, K, 7);
      colorIdx = rows.map(function (o, i) { return i < ds.rows.length ? km.labels[i] : 5; });
      legend = []; for (var c = 0; c < K; c++) legend.push('第 ' + (c + 1) + ' 簇');
      drawClusterTable(km.labels, K, cls);
      $('plotNote').textContent = 'k-Means 只看特征数值，不看真实类别。它用了左侧勾选的 ' + feats.length + ' 个数值特征。';
    } else {
      colorIdx = rows.map(function (o) { return cls.indexOf(o.r[o.r.length - 1]); });
      legend = cls.slice();
      $('plotNote').textContent = ds.test ? '实心点是训练数据，空心方块是测试数据。' : '';
    }
    rows.forEach(function (o, i) {
      var x = sx(pts[i][0]), y = sy(pts[i][1]);
      g.fillStyle = COLORS[colorIdx[i] % COLORS.length]; g.strokeStyle = g.fillStyle;
      if (o.test) { g.lineWidth = 2.5; g.strokeRect(x - 7, y - 7, 14, 14); }
      else { g.globalAlpha = 0.8; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
    });
    $('plotLegend').innerHTML = legend.map(function (n, i) { return '<span><i style="background:' + COLORS[i % COLORS.length] + '"></i>' + n + '</span>'; }).join('');
  }

  function drawBars(g, W, H, cls) {
    var ds = state.ds, f = +$('xSelect').value, pad = 56;
    var levels = [];
    ds.rows.forEach(function (r) { if (levels.indexOf(r[f]) < 0) levels.push(r[f]); });
    var cnt = levels.map(function (v) { return cls.map(function (c) { return ds.rows.filter(function (r) { return r[f] === v && r[r.length - 1] === c; }).length; }); });
    var maxN = Math.max.apply(null, cnt.map(function (a) { return a.reduce(function (x, y) { return x + y; }, 0); }));
    var bw = (W - pad - 40) / levels.length;
    g.font = '15px "Microsoft YaHei", sans-serif'; g.textAlign = 'center';
    levels.forEach(function (v, i) {
      var y = H - pad;
      cnt[i].forEach(function (n, c) {
        var h = n / maxN * (H - pad - 40);
        g.fillStyle = COLORS[c % COLORS.length]; g.fillRect(pad + i * bw + bw * 0.2, y - h, bw * 0.6, h);
        if (n) { g.fillStyle = '#fff'; if (h > 18) g.fillText(n, pad + i * bw + bw / 2, y - h / 2 + 5); }
        y -= h;
      });
      g.fillStyle = '#39465b'; g.fillText(v, pad + i * bw + bw / 2, H - pad + 22);
    });
    g.fillText(ds.features[f] + '（每一根柱子按' + ds.target + '分色）', W / 2, H - 12);
    $('showBoundary').disabled = true;
    $('boundaryLabel').textContent = '这组数据全是类别特征，用分组柱状图代替散点图';
    $('plotLegend').innerHTML = cls.map(function (n, i) { return '<span><i style="background:' + COLORS[i % COLORS.length] + '"></i>' + n + '</span>'; }).join('');
    $('plotNote').textContent = '';
  }

  function drawClusterTable(labels, K, cls) {
    var ds = state.ds;
    var h = '<tr><th>簇 \\ 真实</th>' + cls.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>';
    for (var k = 0; k < K; k++) {
      h += '<tr><th>第 ' + (k + 1) + ' 簇</th>' + cls.map(function (c) {
        return '<td>' + ds.rows.filter(function (r, i) { return labels[i] === k && r[r.length - 1] === c; }).length + '</td>';
      }).join('') + '</tr>';
    }
    $('clusterTable').innerHTML = h;
  }

  function drawTable() {
    var ds = state.ds;
    var h = '<table><tr><th>#</th>' + ds.features.map(function (f) { return '<th>' + f + '</th>'; }).join('') + '<th>' + ds.target + '</th>' + (ds.test ? '<th>用途</th>' : '') + '</tr>';
    var all = ds.rows.map(function (r) { return [r, '训练']; }).concat((ds.test || []).map(function (r) { return [r, '测试']; }));
    all.slice(0, 300).forEach(function (o, i) {
      h += '<tr><td>' + (i + 1) + '</td>' + o[0].map(function (v) { return '<td>' + v + '</td>'; }).join('') + (ds.test ? '<td>' + o[1] + '</td>' : '') + '</tr>';
    });
    h += '</table>';
    if (all.length > 300) h += '<p class="hint">共 ' + all.length + ' 条，这里只列出前 300 条。</p>';
    $('dataTable').innerHTML = h;
  }

  // ---------- 联动 ----------
  function loadDataset(key) {
    state.key = key;
    state.ds = DATASETS.filter(function (d) { return d[0] === key; })[0][1];
    var ds = state.ds;
    state.feats = ds.features.map(function (_, i) { return i; });
    $('dataNote').textContent = ds.note || ('要预测的是：' + ds.target + '。');
    $('featureBox').innerHTML = ds.features.map(function (f, i) {
      return '<label><input type="checkbox" data-f="' + i + '" checked>' + f + '</label>';
    }).join('');
    $('evalSelect').innerHTML = evalOptions(ds).map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');
    if (ds.test) $('evalSelect').value = 'fixed';
    var nums = numFeats(), opts;
    if (nums.length) {
      opts = nums.map(function (i) { return [String(i), ds.features[i]]; });
      if (nums.length >= 3) opts.push(['p0', '主成分1（PCA）'], ['p1', '主成分2（PCA）']);
      $('xSelect').innerHTML = opts.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');
      $('ySelect').innerHTML = $('xSelect').innerHTML;
      $('xSelect').value = String(nums[nums.length >= 4 ? 2 : 0]);
      $('ySelect').value = String(nums[nums.length >= 4 ? 3 : 1]);
      $('ySelect').parentNode.style.display = '';
      $('colorSelect').parentNode.style.display = '';
    } else {
      $('xSelect').innerHTML = ds.features.map(function (f, i) { return '<option value="' + i + '">' + f + '</option>'; }).join('');
      $('ySelect').parentNode.style.display = 'none';
      $('colorSelect').value = 'class';
      $('colorSelect').parentNode.style.display = 'none';
    }
    $('reshuffle').style.display = ds.rows.length >= 30 ? '' : 'none';
    drawTable();
    refresh();
  }

  function refresh() {
    $('treeDepthVal').textContent = +$('treeDepth').value > 10 ? '不限' : $('treeDepth').value;
    $('treeMinVal').textContent = $('treeMin').value;
    $('knnKVal').textContent = $('knnK').value;
    $('forestNVal').textContent = $('forestN').value;
    $('kmeansKVal').textContent = $('kmeansK').value;
    $('reshuffle').disabled = ['split', 'cv'].indexOf($('evalSelect').value) < 0;
    score();
    drawTree();
    drawPlot();
  }

  $('dataSelect').innerHTML = DATASETS.map(function (d) { return '<option value="' + d[0] + '">' + d[1].name + '</option>'; }).join('');
  $('dataSelect').addEventListener('change', function () { loadDataset(this.value); });
  $('featureBox').addEventListener('change', function () {
    var on = [].slice.call(document.querySelectorAll('#featureBox input')).filter(function (c) { return c.checked; });
    if (!on.length) { this.querySelector('input').checked = true; on = [this.querySelector('input')]; }
    state.feats = on.map(function (c) { return +c.getAttribute('data-f'); });
    var nf = state.feats.filter(function (f) { return state.ds.types[f] === 'num'; });
    if (nf.length === 2 && state.feats.length === 2) { $('xSelect').value = String(nf[0]); $('ySelect').value = String(nf[1]); }
    refresh();
  });
  ['useTree', 'useKnn', 'useLogit', 'useForest', 'treeDepth', 'treeMin', 'knnK', 'forestN', 'evalSelect', 'xSelect', 'ySelect', 'colorSelect', 'kmeansK', 'showBoundary']
    .forEach(function (id) { $(id).addEventListener(id.indexOf('use') === 0 || /Select$|showBoundary/.test(id) ? 'change' : 'input', refresh); });
  $('cmModel').addEventListener('change', function () { drawCm(); drawPlot(); });
  $('reshuffle').addEventListener('click', function () { state.seed = (state.seed * 1103515245 + 12345) >>> 0; refresh(); });

  loadDataset('iris');
})();
