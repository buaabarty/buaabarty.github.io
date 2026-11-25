// Generic replay player. Draws the declarative `render` section of game.toml.
// Replays may come from strangers: numbers and colors are checked, and text
// only ever reaches the page through textContent.

export const COLORS = ["#2563c9", "#d9480f", "#2f9e44", "#9c36b5", "#c99700", "#0b8a9a", "#c2255c", "#5c6b7a"];
const num = (v, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const color = (v, d) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
const bound = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Throws when a replay file does not have the expected shape or is too big. */
export function checkReplay(r) {
  const bad = (m) => { throw new Error("回放文件无效:" + m); };
  const obj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  if (!obj(r) || r.version !== 1) bad("版本");
  if (!Array.isArray(r.players) || !r.players.length || r.players.length > 16) bad("玩家");
  if (!Array.isArray(r.frames) || !r.frames.length || r.frames.length > 5000) bad("帧数");
  if (!obj(r.render)) bad("渲染配置");
  const size = (v) => Number.isInteger(v) && v > 0 && v <= 100;
  if (r.render.kind !== "grid" || !size(r.render.width) || !size(r.render.height)) bad("棋盘大小");
  for (const f of r.frames) {
    if (!obj(f) || !obj(f.view)) bad("帧");
    for (const k of ["cells", "entities", "players", "marks", "hints"]) {
      const a = f.view[k];
      if (a !== undefined && (!Array.isArray(a) || a.length > 10000)) bad(k);
      if (a && k !== "cells" && !a.every(obj)) bad(k);
    }
    if (f.events !== undefined && (!Array.isArray(f.events) || !f.events.every(obj))) bad("事件");
  }
  const players = r.players.map((p) => ({ name: String(p?.name ?? "").slice(0, 40), lang: String(p?.lang ?? "").slice(0, 12) }));
  const logs = (Array.isArray(r.logs) ? r.logs.slice(0, 2000) : []).filter(obj)
    .map((l) => ({ turn: num(l.turn), player: num(l.player), text: String(l.text).slice(0, 2000) }));
  let outcome = null;
  if (obj(r.outcome) && Array.isArray(r.outcome.ranks) && Array.isArray(r.outcome.scores))
    outcome = { ranks: r.outcome.ranks.map((v) => num(v)), scores: r.outcome.scores.map((v) => num(v)), reason: String(r.outcome.reason ?? "").slice(0, 100) };
  return { ...r, title: String(r.title ?? "").slice(0, 60), players, logs, outcome };
}

export class Board {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.render = null;
    this.view = null;
  }
  show(render, view) {
    this.render = render;
    this.view = view;
    this.draw();
  }
  get dark() { return document.documentElement.dataset.theme === "dark"; }
  /** Grid cell under a mouse event. */
  cellAt(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * this.render.width);
    const y = Math.floor(((e.clientY - r.top) / r.height) * this.render.height);
    return { x: bound(x, 0, this.render.width - 1), y: bound(y, 0, this.render.height - 1) };
  }
  draw() {
    const { canvas, ctx, render, view } = this;
    if (!render || !view) return;
    const w = render.width, h = render.height;
    const css = canvas.clientWidth || 640;
    const unit = Math.max(4, Math.floor((css * Math.min(2, devicePixelRatio || 1)) / w));
    if (canvas.width !== unit * w || canvas.height !== unit * h) {
      canvas.width = unit * w;
      canvas.height = unit * h;
    }
    canvas.style.aspectRatio = `${w} / ${h}`;
    const felt = render.background === "felt";
    ctx.fillStyle = felt ? "#2c7a55" : this.dark ? "#22262b" : "#f7f8f9";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = felt ? "#1f5c40" : this.dark ? "#2c3238" : "#eaedf0";
    ctx.lineWidth = Math.max(1, unit / 40);
    ctx.beginPath();
    for (let x = 0; x <= w; x++) { ctx.moveTo(x * unit, 0); ctx.lineTo(x * unit, h * unit); }
    for (let y = 0; y <= h; y++) { ctx.moveTo(0, y * unit); ctx.lineTo(w * unit, y * unit); }
    ctx.stroke();
    (view.cells ?? []).forEach((v, i) => {
      const spec = v && render.cells?.[String(v)];
      if (spec && i < w * h) this.shape(spec, i % w, Math.floor(i / w), unit, num(spec.player, -1), 0);
    });
    for (const e of view.entities ?? []) {
      const spec = typeof e.type === "string" && Object.hasOwn(render.sprites ?? {}, e.type) ? render.sprites[e.type] : null;
      if (spec) this.shape(spec, num(e.x), num(e.y), unit, num(e.player, -1), num(e.angle));
    }
    for (const m of view.hints ?? []) {
      ctx.fillStyle = "rgba(255,255,255,.28)";
      this.circle(num(m.x), num(m.y), unit, 0.1);
      ctx.fill();
    }
    for (const m of view.marks ?? []) {
      ctx.fillStyle = "#e0563f";
      this.circle(num(m.x), num(m.y), unit, 0.09);
      ctx.fill();
    }
  }
  circle(x, y, u, r) {
    this.ctx.beginPath();
    this.ctx.arc((x + 0.5) * u, (y + 0.5) * u, r * u, 0, Math.PI * 2);
  }
  poly(x, y, u, r, n, turn) {
    this.ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = turn + (i * 2 * Math.PI) / n;
      this.ctx.lineTo((x + 0.5 + Math.cos(a) * r) * u, (y + 0.5 + Math.sin(a) * r) * u);
    }
    this.ctx.closePath();
  }
  shape(spec, x, y, u, player, angle) {
    const c = this.ctx;
    const size = bound(num(spec.size, 0.8), 0.05, 2);
    const fill = player >= 0 ? COLORS[Math.floor(player) % COLORS.length] : color(spec.color, "#808890");
    c.fillStyle = fill;
    switch (spec.shape) {
      case "stone":
        c.fillStyle = player === 0 ? "#16191c" : "#f6f6f3";
        this.circle(x, y, u, 0.4);
        c.fill();
        c.strokeStyle = "rgba(0,0,0,.35)";
        c.stroke();
        break;
      case "wall":
        c.fillStyle = this.dark ? "#59636e" : "#3d4a57";
        c.fillRect(x * u, y * u, u + 0.5, u + 0.5);
        break;
      case "square":
        c.globalAlpha = 0.72;
        c.fillRect((x + 0.5 - size / 2) * u, (y + 0.5 - size / 2) * u, size * u, size * u);
        c.globalAlpha = 1;
        break;
      case "ring":
        this.circle(x, y, u, Math.max(0.02, size / 2 - 0.08));
        c.strokeStyle = fill;
        c.lineWidth = u * 0.14;
        c.stroke();
        break;
      case "diamond":
        this.poly(x, y, u, size / 2, 4, 0);
        c.fill();
        c.fillStyle = "#fff";
        this.circle(x, y, u, size * 0.13);
        c.fill();
        break;
      case "hex":
      case "hex_shield":
        this.poly(x, y, u, size / 2, 6, Math.PI / 6);
        c.fill();
        c.fillStyle = "#fff";
        this.circle(x, y, u, size * 0.16);
        c.fill();
        if (spec.shape === "hex_shield") {
          this.circle(x, y, u, 0.54);
          c.strokeStyle = "#c9861c";
          c.lineWidth = u * 0.1;
          c.stroke();
        }
        break;
      case "head": {
        c.fillRect((x + 0.04) * u, (y + 0.04) * u, u * 0.92, u * 0.92);
        const a = (angle * Math.PI) / 180;
        c.fillStyle = "#fff";
        for (const s of [-0.6, 0.6]) {
          this.circle(x + Math.cos(a + s) * 0.26, y + Math.sin(a + s) * 0.26, u, 0.11);
          c.fill();
        }
        break;
      }
      default:
        this.circle(x, y, u, size / 2);
        c.fill();
    }
  }
}
