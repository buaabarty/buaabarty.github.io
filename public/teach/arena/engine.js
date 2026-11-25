// Match loop in the browser: the Rust kernel (wasm) plus sandboxed bots.
// Everything that comes out of a sandbox is untrusted data.

/** True when a JSON value nests deeper than `limit`. The kernel's parser has a depth limit. */
const tooDeep = (v, limit) => v !== null && typeof v === "object" && (limit === 0 || Object.values(v).some((x) => tooDeep(x, limit - 1)));

const open = new Set();
/** Stop everything at once, including a compile or a Python download. */
export function cancelAll() {
  for (const s of [...open]) s.destroy();
  compiler = null;
}

const BOOT_MS = 120000, MIN_TURN_MS = 2000;

export class Engine {
  static async load(url) {
    const bytes = await (await fetch(url)).arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes);
    return new Engine(instance.exports);
  }
  constructor(x) { this.x = x; }
  call(req) {
    const x = this.x;
    const b = new TextEncoder().encode(JSON.stringify(req));
    const p = x.npe_alloc(b.length);
    new Uint8Array(x.memory.buffer, p, b.length).set(b);
    const r = BigInt.asUintN(64, x.npe_call(p, b.length));
    x.npe_free(p, b.length);
    const ptr = Number(r >> 32n), len = Number(r & 0xffffffffn);
    const v = JSON.parse(new TextDecoder().decode(new Uint8Array(x.memory.buffer, ptr, len)));
    x.npe_free(ptr, len);
    if (v.err !== undefined) throw new Error(v.err);
    return v.ok;
  }
}

/** One sandboxed iframe. Destroying it also kills the worker inside. */
class Sandbox {
  constructor(page) {
    this.waiting = null;
    this.dead = null;
    this.onlog = () => {};
    this.onstatus = () => {};
    const f = (this.frame = document.createElement("iframe"));
    f.setAttribute("sandbox", "allow-scripts"); // never add allow-same-origin
    f.setAttribute("referrerpolicy", "no-referrer");
    f.hidden = true;
    f.src = page;
    this.listener = (e) => { if (e.source === f.contentWindow) this.receive(e.data); };
    window.addEventListener("message", this.listener);
    this.ready = this.expect("hello", 15000);
    this.ready.catch(() => {});
    document.body.append(f);
    open.add(this);
  }
  receive(m) {
    if (!m || typeof m !== "object") return;
    if (m.kind === "log" && typeof m.text === "string") return this.onlog(m.text);
    if (m.kind === "status" && typeof m.text === "string") return this.onstatus(m.text);
    if (m.kind === "crash") {
      this.dead = typeof m.text === "string" ? m.text.slice(0, 4000) : "crash";
      const w = this.waiting;
      this.waiting = null;
      if (w) { clearTimeout(w.timer); w.reject(Object.assign(new Error(this.dead), { fault: "crash" })); }
      return;
    }
    const w = this.waiting;
    if (w && m.kind === w.kind && w.accept(m)) {
      this.waiting = null;
      clearTimeout(w.timer);
      w.resolve(m);
    }
  }
  expect(kind, ms, accept = () => true) {
    if (this.dead) return Promise.reject(Object.assign(new Error(this.dead), { fault: "crash" }));
    return new Promise((resolve, reject) => {
      const fire = () => {
        this.waiting = null;
        reject(Object.assign(new Error(`no reply within ${ms} ms`), { fault: "timeout" }));
      };
      // After a stall of this page, a reply may already be queued. Let it in first.
      const timer = setTimeout(() => { if (this.waiting === w) w.timer = setTimeout(fire, 50); }, ms);
      const w = { kind, accept, resolve, reject, timer };
      this.waiting = w;
    });
  }
  send(m) { this.frame.contentWindow?.postMessage(m, "*"); }
  destroy() {
    open.delete(this);
    this.dead ??= "stopped";
    window.removeEventListener("message", this.listener);
    if (this.waiting) {
      clearTimeout(this.waiting.timer);
      this.waiting.reject(Object.assign(new Error("stopped"), { fault: "crash" }));
      this.waiting = null;
    }
    this.frame.remove();
  }
}

class CodeBot {
  constructor(page, boot, hooks) {
    this.boot = boot;
    this.box = new Sandbox(page);
    this.box.onlog = hooks.log;
    this.box.onstatus = hooks.status;
  }
  async start() {
    await this.box.ready;
    const p = this.box.expect("booted", BOOT_MS);
    this.box.send({ kind: "boot", ...this.boot });
    await p;
  }
  /** Send one protocol line and wait for the matching reply. */
  async ask(msg, ms) {
    let value;
    const p = this.box.expect("reply", ms, (m) => {
      try { value = JSON.parse(m.text); } catch { return false; }
      return value !== null && typeof value === "object" && (msg.type === "init" ? value.ready === true : value.turn === msg.turn);
    });
    this.box.send({ kind: "line", text: JSON.stringify(msg) });
    await p;
    const action = value.action ?? null;
    return tooDeep(action, 8) ? "action is nested too deeply" : action;
  }
  destroy() { this.box.destroy(); }
}

let compiler = null;
async function compile(lang, code, headers, status) {
  if (!compiler) {
    compiler = new Sandbox("sandbox/clang.html");
    compiler.onstatus = status;
    try {
      await compiler.ready;
      const p = compiler.expect("booted", BOOT_MS);
      compiler.send({ kind: "boot" });
      await p;
    } catch (e) {
      compiler.destroy();
      compiler = null;
      throw new Error("C/C++ 编译器加载失败:" + e.message);
    }
  }
  status("正在编译");
  let r;
  try {
    const p = compiler.expect("built", 60000);
    compiler.send({ kind: "build", lang, code, headers });
    r = await p;
  } catch (e) {
    compiler.destroy();
    compiler = null;
    throw new Error("编译失败:" + e.message);
  }
  if (!(r.wasm instanceof Uint8Array)) throw new Error(String(r.error ?? "编译失败").slice(0, 8000));
  return r.wasm;
}

function codeBot(seat, wasm, hooks) {
  if (seat.lang === "python") return new CodeBot("sandbox/python.html", { code: seat.code }, hooks);
  return new CodeBot("sandbox/run.html", seat.lang === "js" ? { lang: "js", code: seat.code } : { lang: "wasm", wasm }, hooks);
}

/** Compile and start one bot, then ask for a single move. */
export async function tryBot(engine, game, seat, p, msgs, headers, hooks) {
  let wasm = seat.wasm;
  if (seat.lang === "c" || seat.lang === "cpp") wasm = await compile(seat.lang, seat.code, headers, hooks.status);
  const b = codeBot(seat, wasm, hooks);
  try {
    await b.start();
    await b.ask(msgs.init, game.spec.init_timeout_ms);
    const t0 = performance.now();
    const action = await b.ask(msgs.turn, Math.max(MIN_TURN_MS, game.spec.turn_timeout_ms));
    return { action, ms: performance.now() - t0 };
  } finally {
    b.destroy();
  }
}

/**
 * Play a match. Seats: {name, lang, code | wasm | human: (msg, signal) => Promise<action>}.
 * hooks: frame(status), log(player, turn, text), status(player, text), stopped() => boolean.
 */
export async function runMatch(engine, game, seats, seed, headers, hooks) {
  const players = seats.map((s) => ({ name: s.name, lang: s.lang }));
  let turn = 0;
  const bots = [], dead = [], logs = [], trace = seats.map(() => ({}));
  const log = (p, text) => { logs.push({ turn, player: p, text }); hooks.log(p, turn, text); };
  let id = null;
  try {
    // One compiler serves all seats, so C and C++ builds go one by one.
    const built = [];
    for (const [p, s] of seats.entries()) {
      if (s.lang === "c" || s.lang === "cpp") {
        try { built[p] = await compile(s.lang, s.code, headers, (t) => hooks.status(p, t)); }
        catch (e) { throw Object.assign(new Error(`${s.name} 编译出错\n${e.message}`), { player: p, text: e.message }); }
      }
      if (hooks.stopped()) return null;
    }
    const first = engine.call({ op: "new", toml: game.toml, script: game.rules, seed, players });
    id = first.id;
    await Promise.all(seats.map(async (s, p) => {
      if (s.human) return;
      const h = { log: (t) => log(p, t), status: (t) => hooks.status(p, t) };
      const b = (bots[p] = codeBot(s, built[p] ?? s.wasm, h));
      try {
        await b.start();
        await b.ask(first.init[p], game.spec.init_timeout_ms);
        hooks.status(p, "");
      } catch (e) {
        dead[p] = e.message;
        log(p, e.message);
        hooks.status(p, "启动失败");
      }
    }));
    let s = first;
    hooks.frame(s);
    const limit = Math.max(MIN_TURN_MS, game.spec.turn_timeout_ms);
    while (!s.outcome && !hooks.stopped()) {
      turn = s.turn;
      const replies = {};
      // Humans in real-time games give the round its pace.
      await Promise.all(s.active.map(async (p) => {
        const msg = s.messages[p];
        if (dead[p]) { replies[p] = { kind: "fault", fault: "crash", detail: dead[p] }; return; }
        const t0 = performance.now();
        trace[p][s.turn] = { init: first.init[p], msg };
        try {
          const action = seats[p].human ? await seats[p].human(msg) : await bots[p].ask(msg, limit);
          replies[p] = { kind: "action", action };
          Object.assign(trace[p][s.turn], { action, ms: performance.now() - t0 });
        } catch (e) {
          // A stuck worker cannot be interrupted, so in the browser a timeout ends the bot.
          const t = e.fault === "timeout";
          dead[p] = t ? `超时:${e.message}` : e.message;
          bots[p]?.destroy();
          log(p, dead[p]);
          replies[p] = { kind: "fault", fault: "crash", detail: dead[p].slice(0, 500) };
        }
      }));
      if (hooks.stopped()) break;
      s = engine.call({ op: "step", id, replies });
      hooks.frame(s);
      // Let the page paint and react between turns.
      if (s.turn % 4 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    const replay = engine.call({ op: "replay", id });
    replay.logs = logs.slice(0, 2000);
    return { replay, trace };
  } finally {
    bots.forEach((b) => b?.destroy());
    if (id !== null) engine.call({ op: "free", id });
  }
}
