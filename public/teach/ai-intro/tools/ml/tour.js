/* 新手分步引导：高亮一个区域，其余部分盖上深灰遮罩，旁边的卡片说明这一处怎么用。
   第一次打开本页时自动开始，之后点工具栏的“新手引导”可以再看。网址带 ?tour=1 强制开始，?tour=0 不自动开始。
   ← → 键翻页，Esc 退出。 */
(function () {
  var KEY = 'ysu-ml-tour-done';
  var T = function (zh, en) { return window.TOOL ? TOOL.t(zh, en) : zh; };
  var q = function (sel) { return document.querySelector(sel); };

  var STEPS = [
    { title: ['欢迎使用机器学习工作流', 'Welcome to the workflow lab'],
      text: ['花一分钟认识页面上的几个部分。随时按 Esc 退出，用 ← → 键翻页。', 'Take a minute to meet the parts of this page. Press Esc to leave at any time, and use the arrow keys to move between steps.'] },
    { el: function () { return q('#palette'); },
      title: ['组件栏', 'Widget panel'],
      text: ['组件按数据、可视化、模型、评估等类别分组。点一下或拖到画布上，就能添加一个组件。', 'Widgets are grouped into data, visualization, models, evaluation, and more. Click one or drag it onto the canvas to add it.'] },
    { el: function () { return q('#canvas g.node'); }, pad: 14,
      title: ['画布上的组件', 'A widget on the canvas'],
      text: ['每个圆圈是一个组件。拖动可以移动位置，双击打开它的窗口，在窗口里改参数、看结果。', 'Each circle is a widget. Drag it to move it, and double-click it to open its window, where you change settings and see results.'] },
    { el: function () { return q('#canvas g.node .port.out'); }, pad: 10,
      title: ['连线', 'Drawing a link'],
      text: ['从组件右侧的小圆点按住，拖到另一个组件上，就连上一条线。数据会沿着线自动流过去。', 'Press on the small dot at the right of a widget and drag it onto another widget. Data then flows along the link by itself.'] },
    { el: function () { return q('#canvas g.link'); }, pad: 10,
      title: ['线上传的是什么', 'What a link carries'],
      text: ['线上的文字说明传过去的内容，比如“数据”或“学习器”。双击线可以改通道，选中后按 Delete 删除。', 'The label tells you what the link passes along, such as Data or Learner. Double-click a link to change its channels, or select it and press Delete to remove it.'] },
    { el: function () { return q('#examples'); },
      title: ['示例工作流', 'Example workflows'],
      text: ['课上和作业用到的流程都在这里。打开一个，直接在上面改着玩。', 'The workflows used in class and in the assignments are here. Open one and change it as you like.'] },
    { el: function () { return q('#newBtn') && q('#newBtn').parentNode; },
      title: ['新建、打开、保存', 'New, open, and save'],
      text: ['画布会自动保存在这台电脑的浏览器里。换电脑时点“保存”下载工作流文件，再用“打开”读回来。', 'The canvas is saved in this browser automatically. To move to another computer, click Save to download the workflow file, then load it there with Open.'] },
    { el: function () { return q('#tourBtn'); },
      title: ['随时再看一遍', 'See this again'],
      text: ['想再看引导就点这里。旁边的“怎么用”列出了全部操作。', 'Click here to replay this guide. Help, next to it, lists every action.'] }
  ];

  var ui = null, idx = 0, steps = [];

  function build() {
    var root = document.createElement('div');
    root.className = 'tour';
    root.innerHTML =
      '<div class="tour-block"></div><div class="tour-spot"></div>' +
      '<div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tourTitle" aria-describedby="tourText">' +
      '<div class="tour-progress"></div>' +
      '<h2 id="tourTitle"></h2><p id="tourText"></p>' +
      '<div class="tour-actions"><button type="button" class="tour-skip"></button>' +
      '<span class="tour-gap"></span><button type="button" class="tour-prev"></button><button type="button" class="tour-next"></button></div></div>';
    document.body.appendChild(root);
    root.querySelector('.tour-skip').addEventListener('click', end);
    root.querySelector('.tour-prev').addEventListener('click', function () { go(idx - 1); });
    root.querySelector('.tour-next').addEventListener('click', function () { go(idx + 1); });
    return { root: root, spot: root.querySelector('.tour-spot'), card: root.querySelector('.tour-card') };
  }

  function start() {
    if (ui) return;
    // 只保留页面上找得到目标的步骤，例如画布上没有连线时跳过“线上传的是什么”。
    steps = STEPS.filter(function (s) { return !s.el || s.el(); });
    ui = build(); idx = 0;
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', place);
    show();
  }

  function end() {
    if (!ui) return;
    try { localStorage.setItem(KEY, '1'); } catch (e) { /* 浏览器不允许存储时忽略 */ }
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', place);
    ui.root.remove(); ui = null;
    var b = q('#tourBtn'); if (b) b.focus();
  }

  function go(i) {
    if (i < 0) return;
    if (i >= steps.length) { end(); return; }
    idx = i; show();
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
  }

  function show() {
    var s = steps[idx], c = ui.card, last = idx === steps.length - 1;
    c.querySelector('h2').textContent = T(s.title[0], s.title[1]);
    c.querySelector('p').textContent = T(s.text[0], s.text[1]);
    c.querySelector('.tour-progress').innerHTML = steps.map(function (_, i) {
      return '<i class="' + (i === idx ? 'on' : i < idx ? 'done' : '') + '"></i>';
    }).join('') + '<span>' + (idx + 1) + ' / ' + steps.length + '</span>';
    c.querySelector('.tour-skip').textContent = T('跳过', 'Skip');
    c.querySelector('.tour-skip').hidden = last;
    var prev = c.querySelector('.tour-prev');
    prev.textContent = T('上一步', 'Back'); prev.hidden = idx === 0;
    c.querySelector('.tour-next').textContent = last ? T('开始使用', 'Get started') : idx === 0 ? T('开始', 'Start') : T('下一步', 'Next');
    var el = s.el && s.el();
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    place();
    c.querySelector('.tour-next').focus();
  }

  // 按目标位置摆放高亮框和卡片：卡片优先放在目标下方，放不下依次试上方、右侧、左侧。
  function place() {
    if (!ui) return;
    var s = steps[idx], el = s.el && s.el(), spot = ui.spot, c = ui.card;
    var vw = window.innerWidth, vh = window.innerHeight, gap = 14, m = 12;
    var cw = c.offsetWidth, ch = c.offsetHeight;
    if (!el) {
      ui.root.classList.add('centered');
      spot.style.cssText = 'top:' + vh / 2 + 'px;left:' + vw / 2 + 'px;width:0;height:0';
      c.style.left = Math.max(m, (vw - cw) / 2) + 'px'; c.style.top = Math.max(m, (vh - ch) / 2) + 'px';
      return;
    }
    ui.root.classList.remove('centered');
    var r = el.getBoundingClientRect(), p = s.pad || 8;
    var box = { top: r.top - p, left: r.left - p, width: r.width + 2 * p, height: r.height + 2 * p };
    spot.style.cssText = 'top:' + box.top + 'px;left:' + box.left + 'px;width:' + box.width + 'px;height:' + box.height + 'px';
    var bottom = box.top + box.height, right = box.left + box.width, x, y;
    var midX = box.left + box.width / 2 - cw / 2, midY = box.top + box.height / 2 - ch / 2;
    if (bottom + gap + ch <= vh - m) { x = midX; y = bottom + gap; }
    else if (box.top - gap - ch >= m) { x = midX; y = box.top - gap - ch; }
    else if (right + gap + cw <= vw - m) { x = right + gap; y = midY; }
    else if (box.left - gap - cw >= m) { x = box.left - gap - cw; y = midY; }
    else { x = (vw - cw) / 2; y = vh - ch - m; }
    c.style.left = Math.min(Math.max(m, x), vw - cw - m) + 'px';
    c.style.top = Math.min(Math.max(m, y), vh - ch - m) + 'px';
  }

  if (window.TOOL) TOOL.onLang(function (l, kind) { if (ui && kind !== 'theme') show(); });

  function init() {
    var b = q('#tourBtn'); if (b) b.addEventListener('click', start);
    var flag = new URLSearchParams(location.search).get('tour'), done = false;
    try { done = !!localStorage.getItem(KEY); } catch (e) { done = false; }
    if (flag === '1' || (!done && flag !== '0')) setTimeout(start, 400);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.MLTour = { start: start };
})();
