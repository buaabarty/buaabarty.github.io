import { Engine, cancelAll, runMatch, tryBot } from "./engine.js";
import { createEditor } from "./editor.js";
import { actionHelp, completions, explain, fields, parseErrors, template } from "./help.js";
import { Board, COLORS, checkReplay } from "./viewer.js";

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const LANGS = { python: "Python", js: "JavaScript", c: "C", cpp: "C++", java: "Java", rust: "Rust", wasm: "WASM 文件", human: "真人" };
const LOCAL_ONLY = new Set(["java", "rust"]);
const STORE = "npe-arena-v1";
const EXT = { python: "py", js: "js", c: "c", cpp: "cpp", java: "java", rust: "rs" };

const [data, config, engine] = await Promise.all([
  fetch("data.json").then((r) => r.json()),
  fetch("config.json").then((r) => r.json()),
  Engine.load("npe.wasm"),
]);
for (const g of data.games) g.spec = engine.call({ op: "spec", toml: g.toml });

// The local studio hands out a token. The public site has no such endpoint.
let token = null;
if (["127.0.0.1", "localhost"].includes(location.hostname)) {
  try {
    const r = await fetch("api/token");
    if (r.ok) token = (await r.json()).token;
  } catch { /* plain static server */ }
}
$("mode").textContent = token ? "本地版,支持全部语言" : "网页版";

const board = new Board($("board"));
let game, seats, sel = 0, trace = null, replay = null, at = 0, playing = false, running = false, stopFlag = false, human = null;

// ---------- storage ----------
function load() {
  try { return JSON.parse(localStorage.getItem(STORE)) ?? {}; } catch { return {}; }
}
function save() {
  try {
    const all = load();
    all[game.spec.id] = seats.map(({ lang, name, code }) => ({ lang, name, code }));
    all.last = game.spec.id;
    localStorage.setItem(STORE, JSON.stringify(all));
  } catch { /* storage is optional */ }
}
const samplesOf = (lang) => (EXT[lang]
  ? [...game.bots.filter((b) => b.lang === lang), { name: `模板.${EXT[lang]}`, lang, code: template(game.spec.id, lang) }] : []);
const editor = createEditor($("editor"), {
  label: "代码编辑器",
  onChange: (t) => { seats[sel].code = t; save(); },
  onRun: () => $("run").click(),
});
function seatFrom(lang) {
  const b = samplesOf(lang)[0];
  return { lang, name: b?.name ?? LANGS[lang], code: b?.code ?? "" };
}

// ---------- game and seats ----------
function pickGame(id) {
  game = data.games.find((g) => g.spec.id === id) ?? data.games[0];
  const old = load()[game.spec.id];
  const ok = Array.isArray(old) && old.length >= game.spec.min_players && old.length <= game.spec.max_players &&
    old.every((s) => s && Object.hasOwn(LANGS, s.lang) && typeof s.code === "string" && typeof s.name === "string");
  seats = ok ? old : ["js", "python"].slice(0, Math.max(2, game.spec.min_players)).map(seatFrom);
  sel = 0;
  setReplay(null);
  for (const b of $("games").children) b.setAttribute("aria-pressed", String(b.dataset.id === game.spec.id));
  $("desc").textContent = game.spec.description;
  const s = engine.call({ op: "new", toml: game.toml, script: game.rules, seed: seed(), players: seats.map(({ name, lang }) => ({ name, lang })) });
  engine.call({ op: "free", id: s.id });
  board.show(game.spec.render, s.frame.view);
  drawSeats();
  drawCode();
}
const seed = () => Math.min(4294967295, Math.max(0, Math.floor(Number($("seed").value) || 0)));
const swatch = (p) => {
  const d = el("span", "dot");
  const stones = game.spec.render.cells?.["1"]?.shape === "stone";
  d.style.background = stones ? ["#16191c", "#f6f6f3"][p] : COLORS[p % COLORS.length];
  return d;
};
function drawSeats() {
  $("seats").replaceChildren(...seats.map((s, p) => {
    const row = el("div", "seat");
    const b = el("button", "pick");
    b.type = "button";
    b.setAttribute("aria-pressed", String(p === sel));
    b.append(swatch(p), el("span", "name", s.name), el("span", "lang", LANGS[s.lang]));
    b.onclick = () => { sel = p; drawSeats(); drawCode(); };
    row.append(b);
    if (seats.length > game.spec.min_players) {
      const d = el("button", "del", "×");
      d.type = "button";
      d.setAttribute("aria-label", "删除选手");
      d.disabled = running;
      d.onclick = () => { seats.splice(p, 1); sel = Math.min(sel, seats.length - 1); save(); drawSeats(); drawCode(); };
      row.append(d);
    }
    return row;
  }));
  $("addSeat").disabled = running || seats.length >= game.spec.max_players;
}
function drawCode() {
  const s = seats[sel];
  $("codeTitle").textContent = `选手 ${sel + 1}`;
  $("lang").replaceChildren(...Object.entries(LANGS)
    .filter(([k]) => k !== "human" || game.spec.input?.kind)
    .map(([k, v]) => { const o = el("option", "", v); o.value = k; o.selected = k === s.lang; return o; }));
  const list = samplesOf(s.lang);
  const coded = list.length > 0;
  for (const id of ["sample", "editor", "openSrc", "saveSrc"]) $(id).hidden = !coded;
  $("try").hidden = !coded || LOCAL_ONLY.has(s.lang);
  const first = el("option", "", "载入示例");
  first.value = "";
  $("sample").replaceChildren(first, ...list.map((b) => { const o = el("option", "", b.name); o.value = b.name; return o; }));
  if (coded) editor.open(s.code, s.lang, completions(game.spec.id, s.lang), board.dark);
  editor.lock(running);
  drawDoc();
  drawState();
  $("upload").hidden = s.lang !== "wasm";
  const keys = game.spec.input?.kind === "keys";
  $("langNote").textContent =
    s.lang === "human" ? (keys ? "对战开始后用方向键操作。" : "轮到你时点击棋盘落子。")
    : s.lang === "wasm" ? `上传用 NPlayEngine SDK 编译的 .wasm 文件。${s.wasm ? "已选择文件。" : "还没有选择文件。"}Rust 的编译命令见项目文档。`
    : LOCAL_ONLY.has(s.lang) && !token ? `${LANGS[s.lang]} 源码要在本地版里运行。${s.lang === "rust" ? "网页版可以上传编译好的 .wasm 文件。" : "网页版可以先用 C、C++、Python 或 JavaScript。"}`
    : s.lang === "c" || s.lang === "cpp" ? (token ? "" : "在浏览器里编译。首次使用要下载编译器,约 30 MB。")
    : "";
}

// ---------- helper tabs ----------
function showTab(id) {
  for (const b of $("tabs").children) {
    const on = b.dataset.tab === id;
    b.setAttribute("aria-pressed", String(on));
    $(b.dataset.tab).hidden = !on;
  }
}
for (const b of $("tabs").children) b.onclick = () => showTab(b.dataset.tab);
function drawDoc() {
  const s = seats[sel];
  const tip = el("p", "", `${actionHelp(game.spec.id)} 点击一行,把它插入到光标处。`);
  $("doc").replaceChildren(tip, ...(EXT[s.lang] ? fields(game.spec.id, s.lang) : []).map((f) => {
    const b = el("button");
    b.type = "button";
    b.append(el("code", "", f.code), el("span", "", f.text));
    b.onclick = () => { if (!running) editor.insert(f.code); };
    return b;
  }));
}
function drawState() {
  const t = trace?.[sel]?.[at];
  $("state").textContent = t
    ? `第 ${at} 回合,选手 ${sel + 1}\n返回:${t.action === undefined ? "没有返回" : JSON.stringify(t.action)}${t.ms === undefined ? "" : `,用时 ${t.ms.toFixed(1)} 毫秒`}\n\n收到的数据:\n`
      + JSON.stringify(t.msg.obs, null, 1).replace(/\[[\s\d,-]+\]/g, (m) => m.replace(/\s+/g, ""))
    : "打完一局后,拖动进度条,这里会显示该选手在那一回合收到的数据和返回的动作。";
}
/** Show an error with a hint, and mark the lines in the editor of its seat. */
function showError(text, p) {
  const s = seats[p];
  const tip = explain(text);
  $("log").textContent = (tip ? `提示:${tip}\n\n` : "") + text.slice(0, 8000);
  showTab("log");
  const errors = s && EXT[s.lang] ? parseErrors(text, s.lang) : [];
  if (errors.length) {
    if (sel !== p) { sel = p; drawSeats(); drawCode(); }
    editor.mark(errors);
  }
}

// ---------- player ----------
function setReplay(r, t = null) {
  replay = r;
  trace = t;
  at = 0;
  playing = false;
  $("seek").max = r ? r.frames.length - 1 : 0;
  $("exportBtn").disabled = !r;
  $("result").hidden = true;
  $("log").textContent = "";
  $("score").replaceChildren();
  $("turn").textContent = "0 / 0";
  drawState();
  if (r) { showFrame(0); showLogs(r); showResult(r); }
  $("play").textContent = "播放";
}
function showScore(view, players) {
  $("score").replaceChildren(...players.map((p, i) => {
    const v = view.players?.[i] ?? {};
    const d = el("span", v.alive === false ? "sc out" : "sc");
    d.append(swatch(i), el("span", "", p.name), el("b", "", String(v.score ?? "")));
    if (v.note) d.append(el("span", "note", String(v.note).slice(0, 40)));
    return d;
  }));
}
function showFrame(i) {
  at = Math.min(Math.max(0, i), replay.frames.length - 1);
  const f = replay.frames[at];
  board.show(replay.render, f.view);
  showScore(f.view, replay.players);
  $("seek").value = at;
  $("turn").textContent = `${at} / ${replay.frames.length - 1}`;
  if (!$("state").hidden) drawState();
}
const KIND = { timeout: "超时", invalid: "非法操作", crash: "崩溃" };
function showLogs(r) {
  const lines = r.logs.map((l) => [l.turn, `[${l.turn}] ${r.players[l.player]?.name ?? "?"}: ${l.text}`]);
  for (const f of r.frames) for (const e of f.events ?? [])
{
    const d = String(e.detail).slice(0, 600), tip = explain(d);
    const kind = Object.hasOwn(KIND, e.kind) ? KIND[e.kind] : "异常";
    lines.push([f.turn, `[${f.turn}] ${r.players[e.player]?.name ?? "?"} ${kind}${e.eliminated ? ",出局" : ""}: ${d}${tip ? `\n    提示:${tip}` : ""}`]);
  }
  lines.sort((a, b) => a[0] - b[0]);
  $("log").textContent = lines.map((l) => l[1]).join("\n") || "没有日志。";
}
function showResult(r) {
  if (!r.outcome) return;
  const o = r.outcome;
  const order = r.players.map((_, i) => i).sort((a, b) => o.ranks[a] - o.ranks[b]);
  $("result").textContent = `${o.reason}\n` + order.map((p) => `第 ${o.ranks[p]} 名  ${r.players[p].name}  ${o.scores[p]} 分`).join("\n");
  $("result").hidden = false;
}
let last = 0;
function tick(now) {
  if (playing && replay) {
    const fps = Math.min(60, Math.max(1, Number(replay.render.fps) || 8)) * Number($("speed").value);
    if (now - last >= 1000 / fps) {
      last = now;
      if (at >= replay.frames.length - 1) { playing = false; $("play").textContent = "播放"; } else {
        // One bad frame in an imported replay must not stop the player.
        try { showFrame(at + 1); } catch { playing = false; }
      }
    }
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
$("play").onclick = () => {
  if (!replay) return;
  if (!playing && at >= replay.frames.length - 1) showFrame(0);
  playing = !playing;
  $("play").textContent = playing ? "暂停" : "播放";
};
const jump = (f) => { if (replay) { playing = false; $("play").textContent = "播放"; showFrame(f); } };
$("prev").onclick = () => jump(at - 1);
$("next").onclick = () => jump(at + 1);
$("seek").oninput = () => jump(Number($("seek").value));
new ResizeObserver(() => board.draw()).observe($("board"));

// ---------- human input ----------
let held = null;
function humanPlayer() {
  const input = game.spec.input;
  if (input.kind === "cell") {
    return (msg) => new Promise((resolve, reject) => {
      $("status").textContent = "轮到你了,点击棋盘落子。";
      human = { reject, cell: (c) => {
        const legal = msg.obs.moves;
        if (legal && !legal.some((m) => m.x === c.x && m.y === c.y)) { $("status").textContent = "这里不能落子。"; return; }
        human = null;
        $("status").textContent = "";
        resolve(c);
      } };
    });
  }
  held = null;
  // Before the first key press, stay put where the game allows it, else go straight on.
  return (msg) => new Promise((resolve) => setTimeout(() => {
    resolve(held ?? input.keys.Space ?? { dir: msg.obs.snakes?.[msg.obs.me]?.dir ?? 0 });
  }, input.tick_ms));
}
$("board").onclick = (e) => human?.cell?.(board.cellAt(e));
addEventListener("keydown", (e) => {
  if (!running || !seats.some((s) => s.lang === "human") || game.spec.input?.kind !== "keys") return;
  const k = e.key === " " ? "Space" : e.key;
  if (Object.hasOwn(game.spec.input.keys, k) && !["TEXTAREA", "INPUT", "SELECT"].includes(document.activeElement?.tagName)) {
    held = game.spec.input.keys[k];
    e.preventDefault();
  }
});

// ---------- run ----------
function setRunning(v) {
  running = v;
  $("run").disabled = v;
  $("stop").disabled = !v;
  editor.lock(v);
  for (const id of ["lang", "sample", "openSrc", "try", "series", "upload", "importBtn"]) $(id).disabled = v;
  for (const b of $("games").children) b.disabled = v;
  drawSeats();
}
let abort = null;
async function runNative(seedValue = seed(), order = seats) {
  abort = new AbortController();
  const r = await fetch("api/run", {
    method: "POST",
    signal: abort.signal,
    headers: { "Content-Type": "application/json", "X-Npe-Token": token },
    body: JSON.stringify({ game: game.spec.id, seed: seedValue, bots: order.map(({ name, lang, code }) => ({ name, lang, code })) }),
  });
  const v = await r.json();
  if (!r.ok) throw new Error(v.error);
  return v;
}
async function runHere(seedValue = seed(), order = seats, show = true) {
  const live = order.some((s) => s.lang === "human");
  const list = order.map((s) => ({ ...s, human: s.lang === "human" ? humanPlayer() : null }));
  const state = [];
  return runMatch(engine, game, list, seedValue, data.headers, {
    log: () => {},
    stopped: () => stopFlag,
    status: (p, t) => {
      state[p] = t;
      $("status").textContent = state.map((x, i) => (x ? `${order[i].name}:${x}` : "")).filter(Boolean).join("\n");
    },
    frame: (s) => {
      if (show && (live || s.turn % 5 === 0)) {
        board.show(game.spec.render, s.frame.view);
        showScore(s.frame.view, order);
        $("turn").textContent = `${s.turn}`;
      }
    },
  });
}
function canRun() {
  const bad = seats.find((s) => (s.lang === "wasm" && !s.wasm) || (LOCAL_ONLY.has(s.lang) && !token));
  if (bad) {
    $("status").textContent = bad.lang === "wasm" ? `${bad.name}:请先选择 .wasm 文件。` : `${bad.name}:${LANGS[bad.lang]} 源码要在本地版里运行。`;
    return false;
  }
  const inBrowser = seats.some((s) => s.lang === "wasm" || s.lang === "human");
  if (token && inBrowser && seats.some((s) => LOCAL_ONLY.has(s.lang))) {
    $("status").textContent = "真人或 WASM 选手不能和 Java、Rust 源码同场。";
    return false;
  }
  return true;
}
const isNative = () => token && !seats.some((s) => s.lang === "wasm" || s.lang === "human");
function fail(e) {
  $("status").textContent = stopFlag ? "已停止。" : "出错了,详情见日志。";
  if (stopFlag) return;
  // The native build names the seat in its message.
  const m = /^player (\d+): /.exec(e.message);
  showError(e.text ?? e.message, e.player ?? (m ? Number(m[1]) - 1 : sel));
}
$("run").onclick = async () => {
  if (running || !canRun()) return;
  setReplay(null);
  stopFlag = false;
  setRunning(true);
  editor.mark([]);
  if (seats.some((s) => s.lang === "human")) $("board").focus();
  $("status").textContent = "正在准备";
  try {
    const out = isNative() ? { replay: await runNative(), trace: null } : await runHere();
    if (out && !stopFlag) {
      const r = checkReplay(out.replay);
      setReplay(r, out.trace);
      const crash = r.frames.flatMap((f) => f.events ?? []).find((e) => e.eliminated && EXT[seats[e.player]?.lang]);
      if (crash) {
        const errors = parseErrors(String(crash.detail), seats[crash.player].lang);
        if (errors.length) { sel = crash.player; drawSeats(); drawCode(); editor.mark(errors); }
      }
      $("status").textContent = "对战完成。";
      if (seats.some((s) => s.lang === "human")) showFrame(r.frames.length - 1);
      else $("play").click();
    } else $("status").textContent = "已停止。";
  } catch (e) {
    fail(e);
  }
  human = null;
  setRunning(false);
};

// Every seed is played once per seat rotation, so nobody keeps the better side.
$("series").onclick = async () => {
  if (running || !canRun()) return;
  if (seats.some((s) => s.lang === "human")) { $("status").textContent = "真人选手不能连测。"; return; }
  setReplay(null);
  stopFlag = false;
  setRunning(true);
  editor.mark([]);
  const mine = seats, n = mine.length;
  const sum = mine.map(() => ({ first: 0, score: 0, out: 0 }));
  const total = n * Math.ceil(6 / n);
  let done = 0, order = mine;
  try {
    for (let k = 0; k < total && !stopFlag; k++) {
      order = mine.map((_, p) => mine[(p + k) % n]);
      const value = (seed() + Math.floor(k / n)) % 4294967296;
      const out = isNative() ? { replay: await runNative(value, order) } : await runHere(value, order, false);
      if (!out || stopFlag) break;
      const r = checkReplay(out.replay);
      r.outcome?.ranks.forEach((rank, p) => {
        const s = sum[(p + k) % n];
        if (rank === 1) s.first++;
        s.score += r.outcome.scores[p];
      });
      for (const e of r.frames.flatMap((f) => f.events ?? [])) if (e.eliminated && e.player >= 0 && e.player < n) sum[(e.player + k) % n].out++;
      done++;
      $("result").hidden = false;
      $("result").textContent = `已完成 ${done} / ${total} 局\n` + mine.map((s, p) =>
        `${s.name}  第一名 ${sum[p].first} 次  平均 ${(sum[p].score / done).toFixed(1)} 分${sum[p].out ? `  程序出局 ${sum[p].out} 次` : ""}`).join("\n");
    }
    $("status").textContent = stopFlag ? "已停止。" : "连测完成。";
  } catch (e) {
    // Report the error on the seat order that the user sees.
    const seat = /^player (\d+): /.exec(e.message);
    if (seat) e.player = Number(seat[1]) - 1;
    if (e.player !== undefined) e.player = mine.indexOf(order[e.player]);
    fail(e);
  }
  setRunning(false);
};

// Compile, start, and ask for one move in the position on screen.
$("try").onclick = async () => {
  if (running) return;
  const s = seats[sel];
  stopFlag = false;
  setRunning(true);
  editor.mark([]);
  const logs = [];
  try {
    let msgs = trace?.[sel]?.[at];
    if (!msgs) {
      const m = engine.call({ op: "new", toml: game.toml, script: game.rules, seed: seed(), players: seats.map(({ name, lang }) => ({ name, lang })) });
      engine.call({ op: "free", id: m.id });
      // In turn-based games only the first seat moves in the opening.
      const p = m.messages[sel] ? sel : m.active[0];
      msgs = { init: m.init[p], msg: m.messages[p] };
    }
    const r = await tryBot(engine, game, s, sel, { init: msgs.init, turn: msgs.msg }, data.headers, {
      log: (t) => logs.push(t), status: (t) => { $("status").textContent = t; },
    });
    $("status").textContent = `试跑成功,第 ${msgs.msg.turn} 回合。`;
    $("log").textContent = `返回:${JSON.stringify(r.action)},用时 ${r.ms.toFixed(1)} 毫秒\n` + logs.join("\n");
    showTab("log");
  } catch (e) {
    $("status").textContent = stopFlag ? "已停止。" : "试跑失败,详情见日志。";
    if (!stopFlag) showError([e.message, ...logs].join("\n"), seats.indexOf(s));
  }
  setRunning(false);
};
$("stop").onclick = () => { stopFlag = true; human?.reject(new Error("stopped")); abort?.abort(); cancelAll(); $("status").textContent = "正在停止"; };

// ---------- editing ----------
$("addSeat").onclick = () => { seats.push(seatFrom("js")); sel = seats.length - 1; save(); drawSeats(); drawCode(); };
$("lang").onchange = () => {
  const s = seats[sel];
  const edited = s.code.trim() && !samplesOf(s.lang).some((x) => x.code === s.code);
  if (!edited || confirm("切换语言会清除当前代码,确定吗?")) seats[sel] = seatFrom($("lang").value);
  save(); drawSeats(); drawCode();
};
function useSample() {
  const s = seats[sel], list = samplesOf(s.lang);
  const b = list.find((x) => x.name === $("sample").value);
  const edited = s.code.trim() && !list.some((x) => x.code === s.code);
  if (b && (!edited || confirm("当前代码会被示例替换,确定吗?"))) Object.assign(s, { name: b.name, code: b.code });
  save(); drawSeats(); drawCode();
}
$("sample").onchange = useSample;
$("openSrc").onclick = () => $("srcFile").click();
$("srcFile").onchange = async () => {
  const f = $("srcFile").files[0];
  $("srcFile").value = "";
  if (!f) return;
  const lang = Object.keys(EXT).find((k) => f.name.toLowerCase().endsWith("." + EXT[k]));
  if (!lang || f.size > 200000) { $("status").textContent = "只支持 200 KB 以内的 .c .cpp .py .js .java .rs 文件。"; return; }
  const target = seats[sel];
  const code = await f.text();
  // The user may have moved on to another game while the file was read.
  if (running || !seats.includes(target)) return;
  Object.assign(target, { lang, name: f.name.slice(0, 40), code });
  save(); drawSeats(); drawCode();
};
$("saveSrc").onclick = () => {
  const s = seats[sel];
  // Java insists on a file named after its public class.
  const cls = s.lang === "java" ? /public class (\w+)/.exec(s.code)?.[1] : null;
  const a = el("a");
  a.href = URL.createObjectURL(new Blob([s.code], { type: "text/plain" }));
  a.download = cls ? `${cls}.java` : s.name.endsWith("." + EXT[s.lang]) ? s.name : `bot.${EXT[s.lang]}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$("upload").onclick = () => $("uploadFile").click();
$("uploadFile").onchange = async () => {
  const f = $("uploadFile").files[0];
  $("uploadFile").value = "";
  if (!f) return;
  if (f.size > 8e6) { $("status").textContent = "文件超过 8 MB。"; return; }
  const target = seats[sel];
  const wasm = new Uint8Array(await f.arrayBuffer());
  if (running || !seats.includes(target) || target.lang !== "wasm") return;
  Object.assign(target, { wasm, name: f.name.slice(0, 40) });
  drawSeats(); drawCode();
};

// ---------- replay files ----------
$("exportBtn").onclick = () => {
  const a = el("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(replay)], { type: "application/json" }));
  a.download = `${replay.game}-${replay.seed}.json`.replace(/[^\w.-]/g, "_");
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$("importBtn").onclick = () => $("importFile").click();
$("importFile").onchange = async () => {
  const f = $("importFile").files[0];
  $("importFile").value = "";
  if (!f) return;
  try {
    if (f.size > 20e6) throw new Error("文件超过 20 MB");
    setReplay(checkReplay(JSON.parse(await f.text())));
    $("status").textContent = `已打开回放:${replay.title}`;
  } catch (e) {
    $("status").textContent = `打不开这个文件。${e instanceof SyntaxError ? "它不是 JSON。" : e.message}`;
  }
};

// ---------- feedback ----------
const fbBody = () => `${$("fbText").value.trim()}\n\n---\n游戏:${game.spec.id}\n版本:${data.version}`;
$("feedbackBtn").onclick = () => { $("fbNote").textContent = ""; $("feedback").showModal(); };
$("fbClose").onclick = () => $("feedback").close();
$("fbOpen").onclick = () => {
  if (!$("fbText").value.trim()) { $("fbNote").textContent = "请先填写内容。"; return; }
  const u = new URL(`https://github.com/${config.feedbackRepo}/issues/new`);
  u.searchParams.set("title", `[对战场] ${$("fbType").value}`);
  u.searchParams.set("body", fbBody());
  window.open(u, "_blank", "noopener,noreferrer");
};
$("fbCopy").onclick = async () => {
  try {
    await navigator.clipboard.writeText(`${$("fbType").value}\n${fbBody()}`);
    $("fbNote").textContent = "已复制。";
  } catch { $("fbNote").textContent = "浏览器不允许复制,请手动选择文字。"; }
};

$("games").replaceChildren(...data.games.map((g) => {
  const b = el("button", "", g.spec.title);
  b.type = "button";
  b.dataset.id = g.spec.id;
  b.onclick = () => { pickGame(g.spec.id); save(); };
  return b;
}));
showTab("log");
pickGame(load().last);
