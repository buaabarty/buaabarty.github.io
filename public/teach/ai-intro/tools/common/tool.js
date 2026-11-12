/* 课程练习工具的共用脚本：中英双语、浅色/深色主题、统一顶栏。
   语言和主题与课程主页共用浏览器里的 lang、theme 设置（同一网站），在任一处切换，另一处也跟着变。

   用法：
   1. 页面 <head> 里依次引入 ../common/tool.css 和 ../common/tool.js（tool.js 不加 defer，以便先设主题，避免闪烁）。
   2. <body data-title-zh="…" data-title-en="…"> 写页面标题，tool.js 自动生成顶栏（课程名、标题、中/EN 切换、主题切换、返回链接）。
   3. 静态文字：<span data-en="English">中文</span>。属性：data-en-title、data-en-placeholder、data-en-aria-label。
      <option data-en="…">中文</option> 也可以。
   4. 脚本里的文字：TOOL.t("中文", "English")。语言切换后要重画的内容，用 TOOL.onLang(fn) 注册。 */
(function () {
  'use strict';
  var root = document.documentElement;

  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function write(key, v) { try { localStorage.setItem(key, v); } catch (e) { /* 浏览器禁止存储时忽略 */ } }

  var q = new URLSearchParams(location.search).get('lang');
  var lang = q === 'zh' || q === 'en' ? q : (read('lang') === 'zh' || read('lang') === 'en' ? read('lang') :
    ((navigator.language || '').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en'));
  var theme = read('theme') === 'dark' || read('theme') === 'light' ? read('theme') :
    (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-accent', 'blue');
  root.lang = lang === 'zh' ? 'zh-CN' : 'en';

  var hooks = [];
  var ATTRS = ['title', 'placeholder', 'aria-label'];

  function t(zh, en) { return lang === 'zh' ? zh : (en === undefined ? zh : en); }

  function apply(scope) {
    var nodes = (scope || document).querySelectorAll('[data-en]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!el.hasAttribute('data-zh')) el.setAttribute('data-zh', el.innerHTML);
      el.innerHTML = lang === 'zh' ? el.getAttribute('data-zh') : el.getAttribute('data-en');
    }
    ATTRS.forEach(function (a) {
      var list = (scope || document).querySelectorAll('[data-en-' + a + ']');
      for (var j = 0; j < list.length; j++) {
        var e2 = list[j], keep = 'data-zh-' + a;
        if (!e2.hasAttribute(keep)) e2.setAttribute(keep, e2.getAttribute(a) || '');
        e2.setAttribute(a, lang === 'zh' ? e2.getAttribute(keep) : e2.getAttribute('data-en-' + a));
      }
    });
    var b = document.body;
    if (b && b.dataset.titleZh) document.title = t(b.dataset.titleZh, b.dataset.titleEn);
  }

  function setLang(l) {
    if (l === lang) return;
    lang = l; write('lang', l);
    root.lang = l === 'zh' ? 'zh-CN' : 'en';
    apply();
    renderBar();
    hooks.forEach(function (fn) { try { fn(lang); } catch (e) { console.error(e); } });
  }
  function setTheme(v) {
    theme = v; write('theme', v); root.setAttribute('data-theme', v);
    renderBar();
    hooks.forEach(function (fn) { try { fn(lang, 'theme'); } catch (e) { console.error(e); } });
  }

  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';

  function renderBar() {
    var bar = document.querySelector('header.topbar[data-auto]');
    if (!bar) return;
    var b = document.body;
    bar.innerHTML =
      '<div><p class="eyebrow">' + t('燕山大学 · 人工智能概论', 'Yanshan University · Introduction to AI') + '</p>' +
      '<h1>' + t(b.dataset.titleZh || '', b.dataset.titleEn || '') + '</h1></div>' +
      '<div class="topbar-tools">' +
      '<div class="seg" role="group" aria-label="Language"><button type="button" data-l="zh" class="' + (lang === 'zh' ? 'on' : '') + '">中文</button>' +
      '<button type="button" data-l="en" class="' + (lang === 'en' ? 'on' : '') + '">EN</button></div>' +
      '<button type="button" class="icon-btn" id="themeBtn" aria-label="' + t(theme === 'dark' ? '切换到浅色' : '切换到深色', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode') + '">' + (theme === 'dark' ? SUN : MOON) + '</button>' +
      '<a class="pill-link" href="' + (b.dataset.back || '../../#/tools') + '">' + t('全部练习', 'All tools') + '</a></div>';
    bar.querySelectorAll('[data-l]').forEach(function (btn) { btn.addEventListener('click', function () { setLang(btn.getAttribute('data-l')); }); });
    bar.querySelector('#themeBtn').addEventListener('click', function () { setTheme(theme === 'dark' ? 'light' : 'dark'); });
  }

  function cssVar(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }

  window.TOOL = {
    get lang() { return lang; },
    get theme() { return theme; },
    t: t,
    apply: apply,
    setLang: setLang,
    onLang: function (fn) { hooks.push(fn); },
    css: cssVar
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.querySelector('header.topbar')) {
      var h = document.createElement('header'); h.className = 'topbar'; h.setAttribute('data-auto', '');
      document.body.insertBefore(h, document.body.firstChild);
    }
    apply(); renderBar();
  });
  // 主页在另一个标签页切换语言或主题时同步
  window.addEventListener('storage', function (e) {
    if (e.key === 'lang' && (e.newValue === 'zh' || e.newValue === 'en')) setLang(e.newValue);
    if (e.key === 'theme' && (e.newValue === 'dark' || e.newValue === 'light')) setTheme(e.newValue);
  });
})();
