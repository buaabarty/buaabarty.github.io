"""Pre-generate DeepSeek answers for the prompt-builder tool.

The tool lets students pick a scenario and switch 4 optional prompt parts on or off.
Every combination (3 scenarios x 16 combinations x 2 languages) is sent to DeepSeek
VARIANTS times, and the answers are saved to public/teach/ai-intro/tools/prompt/answers.js.
The page then shows a stored answer instead of calling an LLM.

Scenario texts live only here. The page reads them from answers.js, so the prompt a
student sees is exactly the prompt that produced the stored answer.

Usage: DEEPSEEK_API_KEY=... python scripts/gen_prompt_answers.py
Answers are cached in scripts/prompt_answers_cache.json, so a rerun only calls the API
for prompts that changed. Delete the cache to regenerate everything.
"""
import concurrent.futures as cf
import itertools
import json
import os
import sys
import threading
import time

from openai import OpenAI

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "teach", "ai-intro", "tools", "prompt", "answers.js")
CACHE = os.path.join(ROOT, "scripts", "prompt_answers_cache.json")
MODEL = "deepseek-chat"
TEMPERATURE = 1.0
VARIANTS = 3

PARTS = [
    {"key": "task", "zh": "任务", "en": "Task"},
    {"key": "context", "zh": "背景", "en": "Background"},
    {"key": "limits", "zh": "约束", "en": "Constraints"},
    {"key": "example", "zh": "示例", "en": "Example"},
    {"key": "format", "zh": "格式", "en": "Format"},
]

SCENARIOS = [
    {
        "id": "leave",
        "zh": "请假邮件", "en": "Leave email",
        "text": {
            "task": ("帮我写一封向老师请假一天的邮件。",
                     "Write an email asking my teacher for one day of leave."),
            "context": ("我是大一学生，发烧了，有医院证明。请假的是周四上午的《人工智能概论》。",
                        "I am a first-year student. I have a fever and a doctor's note. The class is Introduction to AI on Thursday morning."),
            "limits": ("不超过 150 字，语气礼貌，不要编造我没提供的信息。",
                       "Under 120 words, polite, and do not make up any facts I did not give you."),
            "example": ("开头类似：“李老师您好，我是人工智能 1 班的王同学，想向您请假……”",
                        "Open like: \"Dear Professor Li, I am Wang from AI Class 1, and I am writing to ask for leave ...\""),
            "format": ("先给邮件标题，再给正文，正文分 3 段。",
                       "Give a subject line first, then the body in 3 short paragraphs."),
        },
    },
    {
        "id": "grandma",
        "zh": "给奶奶讲大模型", "en": "Explain LLMs",
        "text": {
            "task": ("向我奶奶解释什么是大语言模型。",
                     "Explain to my grandmother what a large language model is."),
            "context": ("奶奶 70 岁，会用微信聊天和发语音，没学过电脑知识。她听说我在大学学人工智能，想知道我学的是什么。",
                        "My grandmother is 70. She can send messages and voice notes on her phone but knows nothing about computers. She heard I study AI at university and wants to know what that is."),
            "limits": ("不超过 150 字，不用任何专业术语，不要夸大它的能力。",
                       "Under 120 words, no technical terms, and do not exaggerate what it can do."),
            "example": ("可以这样打比方：“它像一个读过很多很多书的人，你说上半句，它接下半句……”",
                        "Use a comparison like: \"It is like someone who has read a huge number of books. You say the first half of a sentence, and it guesses the rest ...\""),
            "format": ("用 3 句话说完，最后一句提醒她，它也会说错话。",
                       "Use exactly 3 sentences. The last one should warn her that it can be wrong."),
        },
    },
    {
        "id": "plan",
        "zh": "一周复习计划", "en": "Study plan",
        "text": {
            "task": ("帮我制定一份复习计划。",
                     "Make a study plan for me."),
            "context": ("我是大一学生，下周一考《人工智能概论》，考搜索、机器学习、神经网络、大语言模型 4 部分。我每天晚上只有 1 小时空闲。",
                        "I am a first-year student. My Introduction to AI exam is next Monday and covers search, machine learning, neural networks, and large language models. I only have 1 free hour each evening."),
            "limits": ("只安排周一到周五，周末休息。不要推荐我没提到的书、网站或资料。",
                       "Plan Monday to Friday only and keep the weekend free. Do not recommend books, websites, or materials I did not mention."),
            "example": ("每天一条，类似：“周一：搜索。重看迷宫的例子，自己画一遍广度优先搜索的过程。”",
                        "One line per day, like: \"Monday: search. Go over the maze example again and draw the breadth-first search steps yourself.\""),
            "format": ("用表格给出，3 列：日期、复习内容、怎么检查自己学会了。",
                       "Give it as a table with 3 columns: day, what to review, how to check you have learned it."),
        },
    },
]

OPTIONAL = [p["key"] for p in PARTS[1:]]


def build_prompt(scn, on, lang):
    """Must match prompt() in prompt/index.html."""
    i = 0 if lang == "zh" else 1
    sep = "：" if lang == "zh" else ": "
    lines = []
    for p in PARTS:
        if p["key"] == "task" or p["key"] in on:
            lines.append(p[lang] + sep + scn["text"][p["key"]][i])
    return "\n".join(lines)


def combo_key(on):
    return "".join("1" if k in on else "0" for k in OPTIONAL)


def main():
    key = os.environ.get("DEEPSEEK_API_KEY")
    if not key:
        sys.exit("DEEPSEEK_API_KEY is not set")
    client = OpenAI(api_key=key, base_url="https://api.deepseek.com")
    cache = json.load(open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}
    lock = threading.Lock()

    jobs = []
    for scn in SCENARIOS:
        for bits in itertools.product([0, 1], repeat=len(OPTIONAL)):
            on = {k for k, b in zip(OPTIONAL, bits) if b}
            for lang in ("zh", "en"):
                prompt = build_prompt(scn, on, lang)
                for v in range(VARIANTS):
                    ck = "%s|%s|%d|%s" % (MODEL, lang, v, prompt)
                    if ck not in cache:
                        jobs.append((ck, prompt))
    print("calls needed:", len(jobs))

    def run(job):
        ck, prompt = job
        for attempt in range(5):
            try:
                r = client.chat.completions.create(
                    model=MODEL, temperature=TEMPERATURE, max_tokens=1200,
                    messages=[{"role": "user", "content": prompt}])
                text = r.choices[0].message.content.strip()
                with lock:
                    cache[ck] = text
                return
            except Exception as e:  # retry on rate limits and timeouts
                print("retry", attempt, type(e).__name__, e)
                time.sleep(3 * (attempt + 1))
        raise RuntimeError("failed: " + prompt[:40])

    done = 0
    with cf.ThreadPoolExecutor(8) as ex:
        for f in cf.as_completed([ex.submit(run, j) for j in jobs]):
            f.result()
            done += 1
            if done % 20 == 0:
                with lock:
                    json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
                print(done, "/", len(jobs))
    json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False, indent=0)

    data = {"model": MODEL, "generated": time.strftime("%Y-%m"), "parts": PARTS, "optional": OPTIONAL, "scenarios": []}
    for scn in SCENARIOS:
        answers = {"zh": {}, "en": {}}
        for bits in itertools.product([0, 1], repeat=len(OPTIONAL)):
            on = {k for k, b in zip(OPTIONAL, bits) if b}
            for lang in ("zh", "en"):
                prompt = build_prompt(scn, on, lang)
                answers[lang][combo_key(on)] = [cache["%s|%s|%d|%s" % (MODEL, lang, v, prompt)] for v in range(VARIANTS)]
        data["scenarios"].append({"id": scn["id"], "zh": scn["zh"], "en": scn["en"],
                                  "text": {k: list(v) for k, v in scn["text"].items()}, "answers": answers})
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("/* Generated by scripts/gen_prompt_answers.py. Do not edit by hand. */\n")
        f.write("window.PROMPT_DATA = ")
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print("wrote", OUT, "%.0f KB" % (os.path.getsize(OUT) / 1024))


if __name__ == "__main__":
    main()
