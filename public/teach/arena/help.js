// Field docs, code snippets and error parsing for the editor.

const FIELDS = {
  reversi: [
    ["board", "8×8 棋盘,board[y][x],0 空,1 黑,2 白"],
    ["me", "自己的棋子编号,1 或 2"],
    ["opponent", "对手的棋子编号"],
    ["moves", "当前所有合法落子,每项有 x 和 y", "moves"],
    ["size", "棋盘边长,固定为 8"],
    ["last", "上一步落子,开局时为空", null, ["c", "cpp"]],
  ],
  snake: [
    ["width", "场地宽"], ["height", "场地高"], ["turn", "当前回合"],
    ["me", "自己在 snakes 里的下标"],
    ["snakes", "所有蛇,每项有 alive、dir、length、body,body[0] 是蛇头"],
    ["food", "果子坐标的列表"],
  ],
  maze: [
    ["cells", "迷宫,cells[y][x],0 空地,1 墙,2 光点,3 护盾"],
    ["x", "自己的横坐标"], ["y", "自己的纵坐标"],
    ["shield", "护盾剩余回合,大于 0 时可以击退哨兵"],
    ["lives", "剩余生命"],
    ["sentries", "视野内的哨兵,每项有 x 和 y"],
    ["others", "视野内的其他选手", null, ["c", "cpp"]],
    ["scores", "所有选手的得分", null, ["c", "cpp"]],
    ["width", "迷宫宽"], ["height", "迷宫高"], ["turn", "当前回合"], ["me", "自己的编号"],
  ],
};
const COUNTS = { moves: "move_count", snakes: "snake_count", food: "food_count", sentries: "sentry_count" };
const ACTIONS = {
  reversi: "返回落子坐标 x 和 y,必须是 moves 里的一个。",
  snake: "返回方向 dir:0 上,1 右,2 下,3 左。不能直接掉头。",
  maze: "返回方向 dir:0 上,1 右,2 下,3 左,4 不动。",
};
const ARRAYS = new Set(["board", "moves", "snakes", "food", "cells", "sentries", "others", "scores"]);
const GRIDS = new Set(["board", "cells"]);

/** [{name, code, text}] for the help panel. */
export function fields(game, lang) {
  const native = lang === "c" || lang === "cpp";
  const out = [];
  for (const [name, text, , notIn] of FIELDS[game] ?? []) {
    if (notIn?.includes(lang)) continue;
    const code = native ? `s->${name}`
      : lang === "python" ? `obs["${name}"]`
      : lang === "java" ? (GRIDS.has(name) ? `obs.getGrid("${name}")` : ARRAYS.has(name) ? `obs.get("${name}")` : `obs.getInt("${name}")`)
      : lang === "rust" ? (GRIDS.has(name) ? `obs.grid("${name}")` : ARRAYS.has(name) ? `obs.get("${name}").items()` : `obs.int("${name}")`)
      : `obs.${name}`;
    out.push({ name, code, text });
    if (native && COUNTS[name]) out.push({ name: COUNTS[name], code: `s->${COUNTS[name]}`, text: `${name} 的个数` });
  }
  return out;
}
export const actionHelp = (game) => ACTIONS[game] ?? "";

export function completions(game, lang) {
  return fields(game, lang).map((f) => ({ label: f.code, detail: f.name, info: f.text }));
}

const RETURNS = {
  python: ["return {\"x\": move[\"x\"], \"y\": move[\"y\"]}", "return {\"dir\": 0}"],
};
/** The smallest program that plays legally. */
export function template(game, lang) {
  const rev = game === "reversi";
  const what = { reversi: "黑白棋", snake: "贪吃蛇", maze: "迷宫拾光" }[game];
  // Snakes must not stand still, so the template turns clockwise in a square.
  const dir = game === "maze" ? { v: "4", note: "4 表示不动" } : { v: null, note: "每两步右转一次" };
  switch (lang) {
    case "python":
      return `# ${what}模板\nimport npe\n\n\ndef think(obs):\n    # 在这里写你的策略。print 的内容会出现在日志里。\n` +
        (rev ? `    move = obs["moves"][0]  # 先走第一个合法落子\n    ${RETURNS.python[0]}\n`
          : `    d = ${dir.v ?? 'obs["turn"] // 2 % 4'}  # ${dir.note}\n    return {"dir": d}\n`) + `\n\nnpe.run(think)\n`;
    case "js":
      return `// ${what}模板\nfunction think(obs) {\n  // 在这里写你的策略。console.log 的内容会出现在日志里。\n` +
        (rev ? `  const move = obs.moves[0]; // 先走第一个合法落子\n  return { x: move.x, y: move.y };\n`
          : `  const d = ${dir.v ?? "Math.floor(obs.turn / 2) % 4"}; // ${dir.note}\n  return { dir: d };\n`) + `}\n\nnpe.run(think);\n`;
    case "c": case "cpp":
      return `// ${what}模板\n#include "${game}.h"\n\n${rev ? "Move" : "int"} think(const State *s) {\n    // 在这里写你的策略。printf 的内容会出现在日志里。\n` +
        (rev ? `    Move move = s->moves[0]; // 先走第一个合法落子\n    return move;\n` : `    return ${dir.v ? "STAY" : "s->turn / 2 % 4"}; // ${dir.note}\n`) + `}\n`;
    case "java":
      return `// ${what}模板\npublic class MyBot {\n    static String think(Npe.Json obs) {\n        // 在这里写你的策略。System.out.println 的内容会出现在日志里。\n` +
        (rev ? `        Npe.Json move = obs.get("moves").get(0); // 先走第一个合法落子\n        return Npe.action("x", move.getInt("x"), "y", move.getInt("y"));\n`
          : `        int d = ${dir.v ?? 'obs.getInt("turn") / 2 % 4'}; // ${dir.note}\n        return Npe.action("dir", d);\n`) +
        `    }\n\n    public static void main(String[] args) {\n        Npe.run(MyBot::think);\n    }\n}\n`;
    case "rust":
      return `// ${what}模板\nuse npe::Json;\n\nfn think(${!rev && dir.v ? "_obs" : "obs"}: &Json) -> String {\n    // 在这里写你的策略。println! 的内容会出现在日志里。\n` +
        (rev ? `    let m = obs.get("moves[0]"); // 先走第一个合法落子\n    npe::action(&[("x", m.int("x")), ("y", m.int("y"))])\n`
          : `    let d = ${dir.v ?? 'obs.int("turn") / 2 % 4'}; // ${dir.note}\n    npe::action(&[("dir", d)])\n`) + `}\n\nnpe::bot!(think);\n`;
  }
  return "";
}

/** Find 1-based line numbers in compiler output and tracebacks. */
export function parseErrors(text, lang) {
  const out = [];
  const add = (line, message) => { if (line > 0 && out.length < 20) out.push({ line, message: message.slice(0, 300) }); };
  if (lang === "c" || lang === "cpp") {
    for (const m of text.matchAll(/(?:bot\.c(?:pp)?|\w+\.c(?:pp)?):(\d+):\d+: (?:fatal )?error: (.*)/g)) add(Number(m[1]), m[2]);
  } else if (lang === "python") {
    // The last frame that belongs to the bot's file is where it went wrong.
    const all = [...text.matchAll(/File "[^"]*?(?:bot|\w+)\.py", line (\d+)/g)].filter((m) => !/npe\.py|_pyodide/.test(m[0]));
    const tail = text.trim().split("\n").pop();
    if (all.length) add(Number(all.at(-1)[1]), tail);
  } else if (lang === "js") {
    // new Function adds two lines before the first line of the bot.
    const m = /<anonymous>:(\d+):\d+\)/.exec(text);
    if (m) add(Number(m[1]) - 2, text.split("\n")[0]);
  } else if (lang === "java") {
    for (const m of text.matchAll(/\.java:(\d+): error: (.*)/g)) add(Number(m[1]), m[2]);
  } else if (lang === "rust") {
    for (const m of text.matchAll(/error(?:\[\w+\])?: (.*)\n\s*--> .*?:(\d+):\d+/g)) add(Number(m[2]), m[1]);
  }
  return out;
}

const HINTS = [
  [/memory error|segmentation|out of bounds/i, "数组可能越界,或用了空指针。检查下标范围。"],
  [/超时|no reply within/, "程序在时限内没有返回。检查有没有死循环,或计算量太大。"],
  [/not a legal move/, "返回的落子不在 moves 里。只能从 moves 里选一个。"],
  [/already taken|outside the board/, "坐标越界或该格已有棋子。"],
  [/action must be|must be integers|dir must be/, "返回值的格式不对。看“字段说明”里的返回要求。"],
  [/never called npe\.run/, "程序最后要调用 npe.run(think)。"],
  [/IndexError|KeyError|list index/, "访问了不存在的下标或键。"],
  [/ZeroDivision|division by zero/i, "出现了除以 0。"],
  [/stack overflow|call stack|recursion/i, "递归太深。检查递归的终止条件。"],
  [/undeclared|not defined|NameError/, "用到了没有定义的名字。检查拼写。"],
  [/expected ';'|SyntaxError|IndentationError/, "语法错误。检查分号、括号和缩进。"],
];
export const explain = (text) => HINTS.find(([re]) => re.test(text))?.[1] ?? "";
