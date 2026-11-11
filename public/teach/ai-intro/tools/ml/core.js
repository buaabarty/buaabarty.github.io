/* 机器学习计算核心：数据表、四种分类模型、评估方法、主成分分析、k 均值。
   全部在浏览器里计算，不联网，不上传数据。 */
(function () {
  'use strict';

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

  // ---------- 数据表 ----------
  // 表 = { title, cols: [{name, type: 'num'|'cat', role: 'f'|'y'|'m'}], rows: [[...]] }
  function isMissing(v) { return v === null || v === undefined || v === '' || v === '?' || (typeof v === 'number' && isNaN(v)); }
  function feats(t) { return t.cols.map(function (c, i) { return c.role === 'f' ? i : -1; }).filter(function (i) { return i >= 0; }); }
  function yIdx(t) { for (var i = 0; i < t.cols.length; i++) if (t.cols[i].role === 'y') return i; return -1; }
  function levels(t, ci) {
    var out = [];
    t.rows.forEach(function (r) { var v = r[ci]; if (!isMissing(v) && out.indexOf(v) < 0) out.push(v); });
    var c = t.cols[ci];
    if (c.order) out.sort(function (a, b) { return c.order.indexOf(a) - c.order.indexOf(b); });
    return out;
  }
  function classes(t) { var y = yIdx(t); return y < 0 ? [] : levels(t, y); }
  function copyTable(t, rows, title) {
    return { title: title || t.title, cols: t.cols.map(function (c) { return Object.assign({}, c); }), rows: rows || t.rows.slice() };
  }
  // 把另一张表的行按列名对齐到 ref 表的列顺序
  function align(ref, t) {
    var map = ref.cols.map(function (c) {
      for (var i = 0; i < t.cols.length; i++) if (t.cols[i].name === c.name) return i;
      return -1;
    });
    return t.rows.map(function (r) { return map.map(function (i) { return i < 0 ? null : r[i]; }); });
  }

  // 读入用户自己的 CSV / TSV 文件：第一行是列名，最后一列默认是要预测的类别
  function parseText(text, title) {
    var lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (lines.length < 2) throw new Error('文件里至少要有表头和一行数据');
    var sep = lines[0].indexOf('\t') >= 0 ? '\t' : (lines[0].indexOf(';') >= 0 && lines[0].indexOf(',') < 0 ? ';' : ',');
    var split = function (l) { return l.split(sep).map(function (s) { return s.trim().replace(/^"(.*)"$/, '$1'); }); };
    var head = split(lines[0]);
    var raw = lines.slice(1).map(split).filter(function (r) { return r.length >= head.length; });
    var cols = head.map(function (h, i) {
      var vals = raw.map(function (r) { return r[i]; }).filter(function (v) { return !isMissing(v); });
      var num = vals.length > 0 && vals.every(function (v) { return !isNaN(+v); });
      var distinct = {}; vals.forEach(function (v) { distinct[v] = 1; });
      if (num && Object.keys(distinct).length <= 2 && i === head.length - 1) num = false;
      return { name: h || ('第' + (i + 1) + '列'), type: num ? 'num' : 'cat', role: i === head.length - 1 ? 'y' : 'f' };
    });
    var rows = raw.map(function (r) {
      return cols.map(function (c, i) { var v = r[i]; return isMissing(v) ? null : (c.type === 'num' ? +v : v); });
    });
    cols.forEach(function (c, i) {
      if (c.role === 'f' && c.type === 'cat') {
        var n = {}; rows.forEach(function (r) { n[r[i]] = 1; });
        if (Object.keys(n).length > rows.length * 0.8 && rows.length > 20) c.role = 'm';
      }
    });
    return { title: title, cols: cols, rows: rows };
  }

  // ---------- 特征编码（k 近邻、逻辑回归用）：数值列标准化，类别列展开成 0/1 ----------
  function encoder(t, normalize) {
    var parts = feats(t).map(function (f) {
      if (t.cols[f].type === 'num') {
        var vals = t.rows.map(function (r) { return r[f]; }).filter(function (v) { return !isMissing(v); });
        var m = vals.reduce(function (a, b) { return a + b; }, 0) / (vals.length || 1);
        var s = Math.sqrt(vals.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (vals.length || 1)) || 1;
        if (!normalize) { s = 1; }
        return function (r) { var v = r[f]; return [isMissing(v) ? 0 : (v - m) / s - (normalize ? 0 : 0)]; };
      }
      var lv = levels(t, f);
      return function (r) { return lv.map(function (v) { return r[f] === v ? 1 : 0; }); };
    });
    return function (r) { var out = []; parts.forEach(function (p) { out.push.apply(out, p(r)); }); return out; };
  }

  function counts(rows, y, cls) {
    var c = cls.map(function () { return 0; });
    rows.forEach(function (r) { var k = cls.indexOf(r[y]); if (k >= 0) c[k]++; });
    return c;
  }
  function argmax(a) { var b = 0; for (var i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; }
  function entropy(c) {
    var n = c.reduce(function (a, b) { return a + b; }, 0), e = 0;
    c.forEach(function (k) { if (k) { var p = k / n; e -= p * Math.log2(p); } });
    return e;
  }

  // ---------- 决策树：按信息增益选问题；类别特征多路分叉，数值特征按阈值二分 ----------
  function fitTree(t, opt) {
    var y = yIdx(t), cls = classes(t), F = feats(t), rand = opt.rand || rng(1);
    function grow(rows, used, depth) {
      var c = counts(rows, y, cls), maj = cls[argmax(c)];
      var node = { n: rows.length, dist: c, label: maj, leaf: true };
      if (c.filter(function (k) { return k > 0; }).length <= 1) return node;
      if (depth >= opt.maxDepth || rows.length < opt.minSplit) return node;
      var cand = F.filter(function (f) { return !(t.cols[f].type === 'cat' && used.indexOf(f) >= 0); });
      if (opt.mtry && cand.length > opt.mtry) {
        cand = shuffled(cand.length, rand).slice(0, opt.mtry).sort(function (a, b) { return a - b; }).map(function (i) { return cand[i]; });
      }
      var base = entropy(c), best = null;
      cand.forEach(function (f) {
        var known = rows.filter(function (r) { return !isMissing(r[f]); });
        if (known.length < 2) return;
        if (t.cols[f].type === 'cat') {
          var groups = {};
          known.forEach(function (r) { (groups[r[f]] = groups[r[f]] || []).push(r); });
          var keys = Object.keys(groups);
          if (keys.length < 2) return;
          if (keys.some(function (k) { return groups[k].length < opt.minLeaf; })) return;
          var rem = keys.reduce(function (a, k) { return a + groups[k].length / known.length * entropy(counts(groups[k], y, cls)); }, 0);
          var g = (base - rem) * known.length / rows.length;
          if (!best || g > best.gain + 1e-12) best = { gain: g, f: f, cat: true, groups: groups };
        } else {
          var sorted = known.slice().sort(function (a, b) { return a[f] - b[f]; });
          var left = cls.map(function () { return 0; }), right = counts(sorted, y, cls);
          for (var i = 0; i + 1 < sorted.length; i++) {
            var k = cls.indexOf(sorted[i][y]); left[k]++; right[k]--;
            if (sorted[i][f] === sorted[i + 1][f]) continue;
            var nl = i + 1, nr = sorted.length - nl;
            if (nl < opt.minLeaf || nr < opt.minLeaf) continue;
            var g2 = (base - nl / sorted.length * entropy(left) - nr / sorted.length * entropy(right)) * known.length / rows.length;
            if (!best || g2 > best.gain + 1e-12) best = { gain: g2, f: f, cat: false, th: (sorted[i][f] + sorted[i + 1][f]) / 2 };
          }
        }
      });
      if (!best || best.gain <= 1e-12) return node;
      node.leaf = false; node.f = best.f; node.cat = best.cat;
      if (best.cat) {
        node.kids = {};
        Object.keys(best.groups).sort().forEach(function (k) { node.kids[k] = grow(best.groups[k], used.concat([best.f]), depth + 1); });
      } else {
        node.th = best.th;
        node.left = grow(rows.filter(function (r) { return !isMissing(r[best.f]) && r[best.f] <= best.th; }), used, depth + 1);
        node.right = grow(rows.filter(function (r) { return !isMissing(r[best.f]) && r[best.f] > best.th; }), used, depth + 1);
      }
      return node;
    }
    var root = grow(t.rows, [], 0);
    return {
      classes: cls, tree: root, table: t,
      dist: function (r) {
        var n = root;
        while (!n.leaf) {
          var v = r[n.f];
          if (isMissing(v)) break;
          var next = n.cat ? n.kids[v] : (v <= n.th ? n.left : n.right);
          if (!next || next.n === 0) break;
          n = next;
        }
        var s = n.dist.reduce(function (a, b) { return a + b; }, 0) || 1;
        return n.dist.map(function (k) { return k / s; });
      }
    };
  }

  // ---------- k 近邻 ----------
  function fitKnn(t, opt) {
    var y = yIdx(t), cls = classes(t), enc = encoder(t, opt.normalize !== false);
    var pts = t.rows.map(function (r) { return { x: enc(r), c: cls.indexOf(r[y]) }; });
    var k = Math.max(1, Math.min(opt.k, pts.length));
    return {
      classes: cls, table: t,
      dist: function (r) {
        var q = enc(r);
        var d = pts.map(function (p) {
          var s = 0;
          for (var i = 0; i < q.length; i++) {
            var diff = p.x[i] - q[i];
            s += opt.metric === 'manhattan' ? Math.abs(diff) : diff * diff;
          }
          return { d: opt.metric === 'manhattan' ? s : Math.sqrt(s), c: p.c };
        });
        d.sort(function (a, b) { return a.d - b.d; });
        // 第 k 个邻居之后与它一样近的点一并计入，避免由原始顺序决定结果
        var cut = d[k - 1].d + 1e-12, out = cls.map(function () { return 0; });
        d.forEach(function (o) {
          if (o.d <= cut) out[o.c] += opt.weights === 'distance' ? 1 / (o.d + 1e-9) : 1;
        });
        var s2 = out.reduce(function (a, b) { return a + b; }, 0) || 1;
        return out.map(function (v) { return v / s2; });
      }
    };
  }

  // ---------- 逻辑回归（多类别，带正则化的梯度下降） ----------
  function fitLogit(t, opt) {
    var y = yIdx(t), cls = classes(t), enc = encoder(t, true);
    var X = t.rows.map(function (r) { return enc(r).concat([1]); });
    var Y = t.rows.map(function (r) { return cls.indexOf(r[y]); });
    var D = X[0] ? X[0].length : 1, C = cls.length, lam = 1 / (opt.C || 1) / Math.max(1, X.length);
    var W = cls.map(function () { var w = []; for (var d = 0; d < D; d++) w.push(0); return w; });
    function probs(x) {
      var z = W.map(function (w) { var s = 0; for (var i = 0; i < D; i++) s += w[i] * x[i]; return s; });
      var m = Math.max.apply(null, z), e = z.map(function (v) { return Math.exp(v - m); });
      var s = e.reduce(function (a, b) { return a + b; }, 0);
      return e.map(function (v) { return v / s; });
    }
    for (var it = 0; it < 500; it++) {
      var G = W.map(function (w) { return w.map(function () { return 0; }); });
      for (var n = 0; n < X.length; n++) {
        var p = probs(X[n]);
        for (var c = 0; c < C; c++) {
          var err = p[c] - (Y[n] === c ? 1 : 0);
          for (var i = 0; i < D; i++) G[c][i] += err * X[n][i];
        }
      }
      for (var c2 = 0; c2 < C; c2++) for (var j = 0; j < D; j++) {
        W[c2][j] -= 1.0 * (G[c2][j] / X.length + (j < D - 1 ? lam * W[c2][j] : 0));
      }
    }
    return { classes: cls, table: t, dist: function (r) { return probs(enc(r).concat([1])); } };
  }

  // ---------- 随机森林 ----------
  function fitForest(t, opt) {
    var rand = rng(opt.seed || 42), cls = classes(t), trees = [];
    var mtry = opt.mtry || Math.max(1, Math.round(Math.sqrt(feats(t).length)));
    for (var i = 0; i < opt.n; i++) {
      var boot = [];
      for (var j = 0; j < t.rows.length; j++) boot.push(t.rows[Math.floor(rand() * t.rows.length)]);
      var tt = copyTable(t, boot);
      trees.push(fitTree(tt, { maxDepth: opt.maxDepth || 99, minSplit: 2, minLeaf: 1, mtry: mtry, rand: rand }));
    }
    return {
      classes: cls, table: t,
      dist: function (r) {
        var out = cls.map(function () { return 0; });
        trees.forEach(function (m) {
          var d = m.dist(r);
          m.classes.forEach(function (c, k) { out[cls.indexOf(c)] += d[k] / trees.length; });
        });
        return out;
      }
    };
  }

  function predict(model, r) { return model.classes[argmax(model.dist(r))]; }

  // ---------- 评估 ----------
  function stratifiedFolds(t, K, seed) {
    var y = yIdx(t), rand = rng(seed), byClass = {};
    shuffled(t.rows.length, rand).forEach(function (i) { var c = t.rows[i][y]; (byClass[c] = byClass[c] || []).push(i); });
    var fold = new Array(t.rows.length), pos = 0;
    Object.keys(byClass).sort().forEach(function (c) { byClass[c].forEach(function (i) { fold[i] = pos++ % K; }); });
    return fold;
  }
  // 返回 { classes, learners: [{name, actual:[], predicted:[]}] }
  function evaluate(data, testData, learners, opt) {
    var y = yIdx(data), splits = [];
    if (opt.method === 'cv' || opt.method === 'loo') {
      var K = opt.method === 'loo' ? data.rows.length : Math.min(opt.folds, data.rows.length);
      var fold = opt.method === 'loo' ? data.rows.map(function (_, i) { return i; }) : stratifiedFolds(data, K, opt.seed);
      for (var f = 0; f < K; f++) {
        var tr = [], te = [];
        data.rows.forEach(function (r, i) { (fold[i] === f ? te : tr).push(r); });
        if (te.length && tr.length) splits.push({ train: copyTable(data, tr), test: te });
      }
    } else if (opt.method === 'random') {
      for (var rep = 0; rep < opt.repeats; rep++) {
        var idx = shuffled(data.rows.length, rng(opt.seed + rep)), cut = Math.round(data.rows.length * opt.trainPct / 100);
        splits.push({ train: copyTable(data, idx.slice(0, cut).map(function (i) { return data.rows[i]; })), test: idx.slice(cut).map(function (i) { return data.rows[i]; }) });
      }
    } else if (opt.method === 'train') {
      splits.push({ train: data, test: data.rows });
    } else if (opt.method === 'test') {
      splits.push({ train: data, test: align(data, testData) });
    }
    var cls = classes(data);
    if (testData) classes(testData).forEach(function (c) { if (cls.indexOf(c) < 0) cls.push(c); });
    return {
      classes: cls,
      learners: learners.map(function (L) {
        var actual = [], predicted = [];
        splits.forEach(function (s) {
          var m = L.fit(s.train);
          s.test.forEach(function (r) { actual.push(r[y]); predicted.push(predict(m, r)); });
        });
        return { name: L.name, actual: actual, predicted: predicted };
      })
    };
  }
  function scores(res, L) {
    var n = L.actual.length, ok = 0, f1 = 0, prec = 0, rec = 0;
    L.actual.forEach(function (a, i) { if (a === L.predicted[i]) ok++; });
    res.classes.forEach(function (c) {
      var tp = 0, fp = 0, fn = 0, sup = 0;
      L.actual.forEach(function (a, i) {
        var p = L.predicted[i];
        if (a === c) sup++;
        if (a === c && p === c) tp++; else if (p === c) fp++; else if (a === c) fn++;
      });
      var pr = tp + fp ? tp / (tp + fp) : 0, re = tp + fn ? tp / (tp + fn) : 0, f = pr + re ? 2 * pr * re / (pr + re) : 0;
      prec += pr * sup / n; rec += re * sup / n; f1 += f * sup / n;
    });
    return { CA: ok / n, F1: f1, Prec: prec, Recall: rec };
  }
  function confusion(res, L) {
    var m = res.classes.map(function () { return res.classes.map(function () { return 0; }); });
    L.actual.forEach(function (a, i) { m[res.classes.indexOf(a)][res.classes.indexOf(L.predicted[i])]++; });
    return m;
  }

  // ---------- 主成分分析 ----------
  function pca(t, nComp) {
    var F = feats(t).filter(function (f) { return t.cols[f].type === 'num'; });
    var d = F.length, n = t.rows.length;
    if (d < 2) throw new Error('主成分分析至少需要 2 个数值特征');
    var mean = [], sd = [];
    F.forEach(function (f) {
      var m = 0; t.rows.forEach(function (r) { m += r[f] || 0; }); m /= n;
      var v = 0; t.rows.forEach(function (r) { v += ((r[f] || 0) - m) * ((r[f] || 0) - m); });
      mean.push(m); sd.push(Math.sqrt(v / n) || 1);
    });
    var Z = t.rows.map(function (r) { return F.map(function (f, j) { return ((r[f] || 0) - mean[j]) / sd[j]; }); });
    var A = [];
    for (var a = 0; a < d; a++) { A.push([]); for (var b = 0; b < d; b++) { var s = 0; Z.forEach(function (z) { s += z[a] * z[b]; }); A[a].push(s / n); } }
    var V = A.map(function (_, i) { return A.map(function (_, j) { return i === j ? 1 : 0; }); });
    for (var sweep = 0; sweep < 80; sweep++) {
      for (var p = 0; p < d; p++) for (var q = p + 1; q < d; q++) {
        if (Math.abs(A[p][q]) < 1e-12) continue;
        var th = 0.5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p]), c = Math.cos(th), s2 = Math.sin(th), k;
        for (k = 0; k < d; k++) { var x1 = A[k][p], x2 = A[k][q]; A[k][p] = c * x1 - s2 * x2; A[k][q] = s2 * x1 + c * x2; }
        for (k = 0; k < d; k++) { var y1 = A[p][k], y2 = A[q][k]; A[p][k] = c * y1 - s2 * y2; A[q][k] = s2 * y1 + c * y2; }
        for (k = 0; k < d; k++) { var v1 = V[k][p], v2 = V[k][q]; V[k][p] = c * v1 - s2 * v2; V[k][q] = s2 * v1 + c * v2; }
      }
    }
    var order = A.map(function (_, i) { return i; }).sort(function (i, j) { return A[j][j] - A[i][i]; });
    var total = order.reduce(function (s, i) { return s + A[i][i]; }, 0);
    var k2 = Math.min(nComp, d), comps = order.slice(0, k2);
    var cols = comps.map(function (_, i) { return { name: 'PC' + (i + 1), type: 'num', role: 'f' }; });
    var keep = t.cols.map(function (c, i) { return c.role !== 'f' ? i : -1; }).filter(function (i) { return i >= 0; });
    keep.forEach(function (i) { cols.push(Object.assign({}, t.cols[i])); });
    var rows = Z.map(function (z, ri) {
      var pcs = comps.map(function (ci) { return z.reduce(function (s, v, j) { return s + v * V[j][ci]; }, 0); });
      return pcs.concat(keep.map(function (i) { return t.rows[ri][i]; }));
    });
    return {
      table: { title: t.title + '（主成分）', cols: cols, rows: rows },
      variance: order.map(function (i) { return A[i][i] / total; })
    };
  }

  // ---------- k 均值 ----------
  function kmeans(t, k, seed) {
    var F = feats(t), enc = encoder(t, true), pts = t.rows.map(enc), rand = rng(seed || 7);
    function d2(a, b) { var s = 0; for (var i = 0; i < a.length; i++) s += (a[i] - b[i]) * (a[i] - b[i]); return s; }
    var centers = [pts[Math.floor(rand() * pts.length)].slice()];
    while (centers.length < k) {
      var dd = pts.map(function (p) { return Math.min.apply(null, centers.map(function (c) { return d2(p, c); })); });
      var tot = dd.reduce(function (a, b) { return a + b; }, 0), r = rand() * tot, i = 0;
      while (i < dd.length - 1 && r > dd[i]) { r -= dd[i]; i++; }
      centers.push(pts[i].slice());
    }
    var lab = [], iter;
    for (iter = 0; iter < 100; iter++) {
      var changed = false;
      pts.forEach(function (p, n) {
        var b = 0;
        for (var c = 1; c < k; c++) if (d2(p, centers[c]) < d2(p, centers[b])) b = c;
        if (lab[n] !== b) { lab[n] = b; changed = true; }
      });
      centers = centers.map(function (c, ci) {
        var mem = pts.filter(function (_, n) { return lab[n] === ci; });
        if (!mem.length) return c;
        return c.map(function (_, j) { return mem.reduce(function (s, p) { return s + p[j]; }, 0) / mem.length; });
      });
      if (!changed) break;
    }
    // 轮廓系数（样本多时抽样计算）
    var sample = shuffled(pts.length, rng(3)).slice(0, 400), sil = 0;
    sample.forEach(function (i) {
      var own = 0, no = 0, other = {};
      pts.forEach(function (q, j) {
        if (i === j) return;
        var dist = Math.sqrt(d2(pts[i], q));
        if (lab[j] === lab[i]) { own += dist; no++; } else { other[lab[j]] = other[lab[j]] || [0, 0]; other[lab[j]][0] += dist; other[lab[j]][1]++; }
      });
      var a = no ? own / no : 0, b = Infinity;
      Object.keys(other).forEach(function (c) { b = Math.min(b, other[c][0] / other[c][1]); });
      sil += no && b < Infinity ? (b - a) / Math.max(a, b) : 0;
    });
    var out = copyTable(t, t.rows.map(function (r, i) { return r.concat(['C' + (lab[i] + 1)]); }), t.title + '（聚类）');
    out.cols.push({ name: '簇', type: 'cat', role: 'm' });
    return { table: out, labels: lab, iterations: iter + 1, silhouette: sil / sample.length, k: k, F: F.length };
  }

  window.ML = {
    rng: rng, shuffled: shuffled, isMissing: isMissing, feats: feats, yIdx: yIdx, levels: levels, classes: classes,
    copyTable: copyTable, align: align, parseText: parseText,
    fitTree: fitTree, fitKnn: fitKnn, fitLogit: fitLogit, fitForest: fitForest, predict: predict,
    evaluate: evaluate, scores: scores, confusion: confusion, pca: pca, kmeans: kmeans
  };
})();
