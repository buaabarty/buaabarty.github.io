import { useEffect, useState } from "react";
import { useT } from "@/i18n";
import { aiRecord, course, exam, grading, lectureDates, lectureTime, tools, homeworks, lectures, policies, project, projectPrompt, scheduleEvents, week, type Homework } from "./content";

type Route = "home" | "schedule" | "assignments" | "final" | "tools" | "policies" | `hw${number}`;

function readRoute(): Route {
  const h = location.hash.replace(/^#\/?/, "");
  if (/^hw[1-8]$/.test(h) || ["schedule", "assignments", "final", "tools", "policies"].includes(h)) return h as Route;
  return "home";
}

export function Course() {
  const t = useT();
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const on = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const tabs: { id: Route; label: string }[] = [
    { id: "home", label: t({ en: "Home", zh: "首页" }) },
    { id: "schedule", label: t({ en: "Schedule", zh: "日程" }) },
    { id: "assignments", label: t({ en: "Assignments", zh: "作业" }) },
    { id: "final", label: t({ en: "Final", zh: "期末" }) },
    { id: "tools", label: t({ en: "Tools", zh: "练习工具" }) },
    { id: "policies", label: t({ en: "Policies", zh: "课程政策" }) },
  ];
  const activeTab = route.startsWith("hw") ? "assignments" : route;
  const hw = route.startsWith("hw") ? homeworks.find((h) => `hw${h.id}` === route) : undefined;

  return (
    <>
      <p className="course-crumb">
        <a href="/teach.html">{t({ en: "Teaching", zh: "教学" })}</a>
      </p>
      <h1>{t(course.title)}</h1>
      <p className="course-meta">{t(course.meta)}</p>

      <nav className="course-tabs" aria-label={t({ en: "Course sections", zh: "课程栏目" })}>
        {tabs.map((tab) => (
          <a key={tab.id} href={`#/${tab.id === "home" ? "" : tab.id}`} aria-current={activeTab === tab.id ? "page" : undefined}>
            {tab.label}
          </a>
        ))}
      </nav>

      {route === "home" && <CourseHome />}
      {route === "schedule" && <Schedule />}
      {route === "assignments" && <Assignments />}
      {route === "final" && <Final />}
      {route === "tools" && <Tools />}
      {route === "policies" && <Policies />}
      {hw && <HomeworkPage hw={hw} />}
    </>
  );
}

function CourseHome() {
  const t = useT();
  return (
    <>
      <section aria-labelledby="about">
        <h2 id="about">{t({ en: "About this course", zh: "课程简介" })}</h2>
        <p>{t(course.summary)}</p>
        <p>{t(course.when)}</p>
      </section>
      <section aria-labelledby="prereqs">
        <h2 id="prereqs">{t({ en: "Prerequisites", zh: "先修要求" })}</h2>
        <p>{t(course.prereqs)}</p>
      </section>
      <section aria-labelledby="grading">
        <h2 id="grading">{t({ en: "Grading", zh: "成绩构成" })}</h2>
        <table className="course-table">
          <tbody>
            {grading.map((g) => (
              <GradeGroup key={g.item.en} g={g} />
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function GradeGroup({ g }: { g: (typeof grading)[number] }) {
  const t = useT();
  return (
    <>
      <tr className="course-table-group">
        <th scope="row">{t(g.item)}</th>
        <td>{g.weight}</td>
      </tr>
      {g.parts?.map((p) => (
        <tr key={p.item.en}>
          <td className="course-table-sub">{t(p.item)}</td>
          <td>{p.weight}</td>
        </tr>
      ))}
    </>
  );
}

function Schedule() {
  const t = useT();
  return (
    <section aria-labelledby="schedule">
      <h2 id="schedule">{t({ en: "Schedule", zh: "日程" })}</h2>
      <table className="course-table">
        <thead>
          <tr>
            <th scope="col">{t({ en: "When", zh: "时间" })}</th>
            <th scope="col">{t({ en: "Lecture", zh: "讲次" })}</th>
            <th scope="col">{t({ en: "Homework", zh: "作业" })}</th>
          </tr>
        </thead>
        <tbody>
          {lectures.map((title, i) => (
            <tr key={title.en}>
              <td className="course-when">
                {t(lectureDates[i])}
                <div className="course-num">{t(week(Math.floor(i / 2) + 1))} · {lectureTime(i)}</div>
              </td>
              <td>
                <span className="course-num">{i + 1}</span> {t(title)}
                <div className="course-tools">
                  {tools.filter((x) => x.lecture === i + 1).map((x) => (
                    <a key={x.id} href={x.href} target="_blank" rel="noopener">{t(x.title)}</a>
                  ))}
                </div>
              </td>
              <td>
                {(scheduleEvents[i] ?? []).map((e) => (
                  <div key={`${e.hw}${e.kind}`}>
                    <a href={`#/hw${e.hw}`}>HW{e.hw}</a>{" "}
                    {e.kind === "out" ? t({ en: "released after this class", zh: "本次课后发布" }) : t({ en: "due before this class", zh: "本次课前截止" })}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="course-note">
        {t({ en: "HW7 and HW8 are due on Dec 22, the day before the final exam. The final project is due on Dec 23 at 23:59.", zh: "HW7、HW8 在 12 月 22 日（期末考试前一天）截止，期末大作业在 12 月 23 日 23:59 前提交。" })}
      </p>
    </section>
  );
}

function Assignments() {
  const t = useT();
  return (
    <section aria-labelledby="assignments">
      <h2 id="assignments">{t({ en: "Assignments", zh: "作业" })}</h2>
      <p>
        {t({
          en: "One assignment per lecture, 8 in total, 5 points each. Two assignments share a deadline: HW1–2 on Nov 30, HW3–4 on Dec 7, HW5–6 on Dec 14 (before class), HW7–8 on Dec 22. You can start in class and submit any time on Xuexitong, including before class or during the break.",
          zh: "每讲一个作业，共 8 个，各 5 分。两个作业一起截止：HW1–2 在 11 月 30 日、HW3–4 在 12 月 7 日、HW5–6 在 12 月 14 日（均为上课前），HW7–8 在 12 月 22 日。可以课上开个头，课前、课间随时在学习通提交。",
        })}
      </p>
      <table className="course-table">
        <thead>
          <tr>
            <th scope="col">{t({ en: "Assignment", zh: "作业" })}</th>
            <th scope="col">{t({ en: "Lectures", zh: "讲次" })}</th>
            <th scope="col">{t({ en: "Due", zh: "截止" })}</th>
          </tr>
        </thead>
        <tbody>
          {homeworks.map((h) => (
            <tr key={h.id}>
              <td>
                <a href={`#/hw${h.id}`}>HW{h.id} {t(h.title)}</a>
              </td>
              <td className="course-when">{h.lectures.join(", ")}</td>
              <td className="course-when">{t(h.due)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function HomeworkPage({ hw }: { hw: Homework }) {
  const t = useT();
  const s = (en: string, zh: string) => t({ en, zh });
  return (
    <article>
      <h2>
        HW{hw.id} {t(hw.title)}
      </h2>

      <h3>Overview</h3>
      <p>{t(hw.overview)}</p>

      <h3>{s("Lectures covered", "对应讲次")}</h3>
      <ul className="plain-list">
        {hw.lectures.map((n) => (
          <li key={n}>
            {s(`Lecture ${n}`, `第 ${n} 讲`)} {t(lectures[n - 1])}
          </li>
        ))}
      </ul>

      <h3>{s("Timeline", "时间安排")}</h3>
      <table className="course-table">
        <tbody>
          <tr>
            <th scope="row">{s("Released", "发布")}</th>
            <td>{t(hw.out)}</td>
          </tr>
          <tr>
            <th scope="row">{s("Due", "截止")}</th>
            <td>{t(hw.due)}</td>
          </tr>
        </tbody>
      </table>

      <h3>{s("Tasks", "任务")}</h3>
      {hw.tools && (
        <p>
          {s("Tool: ", "使用工具：")}
          {hw.tools.map((id) => {
            const tool = tools.find((x) => x.id === id)!;
            return (
              <a key={id} href={tool.href} target="_blank" rel="noopener">
                {t(tool.title)}
              </a>
            );
          })}
        </p>
      )}
      {hw.tasks.map((task) => (
        <div key={task.title.en} className="course-task">
          <p className="course-task-title">
            {t(task.title)}
            {task.note && <span className="course-task-note">{t(task.note)}</span>}
          </p>
          {task.link && (
            <p>
              <a href={task.link.href} target="_blank" rel="noopener">
                {t(task.link.label)}
              </a>
            </p>
          )}
          {task.text && <p>{t(task.text)}</p>}
          {task.steps && (
            <ol>
              {task.steps.map((st) => (
                <li key={st.en}>{t(st)}</li>
              ))}
            </ol>
          )}
        </div>
      ))}

      <h3>{s("What to submit", "提交内容")}</h3>
      <p>{t(hw.submit)}</p>
      <p>{s("Submit on Xuexitong.", "在学习通提交。")}</p>

      <h3>{s("Grading (5 points)", "评分（5 分）")}</h3>
      <table className="course-table">
        <thead>
          <tr>
            <th scope="col">{s("Item", "项")}</th>
            <th scope="col">{s("Points", "分值")}</th>
            <th scope="col">{s("What we look for", "看什么")}</th>
          </tr>
        </thead>
        <tbody>
          {hw.grading.map((r) => (
            <tr key={r.item.en}>
              <td>{t(r.item)}</td>
              <td className="course-when">{r.points}</td>
              <td>{t(r.look)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {hw.gradingNote && <p className="course-note">{t(hw.gradingNote)}</p>}

      <h3>{s("AI policy", "AI 使用要求")}</h3>
      <p>{t(hw.ai)}</p>
      <p>
        {s("Also follow the ", "并遵守")}
        <a href="#/policies">{s("DeepSeek record rules", "DeepSeek 使用记录要求")}</a>
        {s(".", "。")}
      </p>

      <h3>{s("Common pitfalls", "常见问题")}</h3>
      <ul className="plain-list">
        {hw.pitfalls.map((p) => (
          <li key={p.en}>{t(p)}</li>
        ))}
      </ul>

      <p className="course-pager">
        {hw.id > 1 && <a href={`#/hw${hw.id - 1}`}>← HW{hw.id - 1}</a>}
        <a href="#/assignments">{s("All assignments", "全部作业")}</a>
        {hw.id < homeworks.length && <a href={`#/hw${hw.id + 1}`}>HW{hw.id + 1} →</a>}
      </p>
    </article>
  );
}

function Final() {
  const t = useT();
  const s = (en: string, zh: string) => t({ en, zh });
  return (
    <>
      <section aria-labelledby="exam">
        <h2 id="exam">{s("Closed-book exam (25 points)", "闭卷考试（25 分）")}</h2>
        <p>{t(exam.when)}</p>
        <table className="course-table">
          <thead>
            <tr>
              <th scope="col">{s("Type", "题型")}</th>
              <th scope="col">{s("Questions", "题数")}</th>
              <th scope="col">{s("Points each", "每题分值")}</th>
              <th scope="col">{s("Total", "小计")}</th>
            </tr>
          </thead>
          <tbody>
            {exam.rows.map((r) => (
              <tr key={r.item.en}>
                <td>{t(r.item)}</td>
                <td className="course-when">{r.n}</td>
                <td className="course-when">{r.each}</td>
                <td className="course-when">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="plain-list">
          {exam.notes.map((n) => (
            <li key={n.en}>{t(n)}</li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="project">
        <h2 id="project">{s("Final project (25 points): ", "期末大作业（25 分）：")}{t(project.title)}</h2>
        <p>{t(project.overview)}</p>
        <p>
          <strong>{s("Due: ", "截止：")}</strong>
          {t(project.due)}
        </p>
        <h3>{s("What the proposal covers (at most 2000 Chinese characters)", "提案写什么（正文不超过 2000 字）")}</h3>
        {project.sections.map((x, i) => (
          <div key={x.title.en} className="course-task">
            <p className="course-task-title">
              {i + 1}. {t(x.title)}
            </p>
            <p>{t(x.text)}</p>
          </div>
        ))}
        <p>{t(project.prototype)}</p>
        <h3>{s("Rubric", "评分量规")}</h3>
        <table className="course-table">
          <tbody>
            {project.rubric.map((r) => (
              <tr key={r.item.en}>
                <td>{t(r.item)}</td>
                <td className="course-when">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>{s("Rules", "规则")}</h3>
        <ul className="plain-list">
          {project.rules.map((r) => (
            <li key={r.en}>{t(r)}</li>
          ))}
        </ul>
        <h3>{s("How it is graded", "怎么评分")}</h3>
        <p>{t(project.grading)}</p>
        <h3>{s("Grading prompt (copy all of it, and paste your proposal between the <submission> tags)", "评分提示词（整段复制，把提案粘贴在 <submission> 标签之间）")}</h3>
        <pre className="course-prompt">{projectPrompt}</pre>
      </section>
    </>
  );
}

function Tools() {
  const t = useT();
  return (
    <section aria-labelledby="tools">
      <h2 id="tools">{t({ en: "Tools", zh: "练习工具" })}</h2>
      <p>
        {t({
          en: "Every lecture has at least one tool. All tools open directly in the browser. Nothing to install.",
          zh: "每一讲都配有至少一个练习工具。所有工具都在浏览器里直接打开，无需安装。",
        })}
      </p>
      {lectures.map((title, i) => (
        <div key={title.en} className="course-tool-group">
          <h3>
            <span className="course-num">{i + 1}</span> {t(title)}
          </h3>
          {tools.filter((x) => x.lecture === i + 1).map((tool) => (
            <div key={tool.id} className="course-task">
              <p className="course-task-title">
                <a href={tool.href} target="_blank" rel="noopener">
                  {t(tool.title)}
                </a>
              </p>
              <p>{t(tool.text)}</p>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

function Policies() {
  const t = useT();
  return (
    <>
      <section aria-labelledby="policies">
        <h2 id="policies">{t({ en: "Policies", zh: "课程政策" })}</h2>
        {policies.map((p) => (
          <div key={p.title.en} className="course-task">
            <p className="course-task-title">{t(p.title)}</p>
            <p>{t(p.text)}</p>
          </div>
        ))}
      </section>
      <section aria-labelledby="deepseek">
        <h2 id="deepseek">{t({ en: "Recording your DeepSeek use", zh: "DeepSeek 使用记录要求" })}</h2>
        <p>
          {t({
            en: "LLM work in this course, including the final project, uses the DeepSeek web app unless an assignment says otherwise. Every time you use it, keep a record that can be checked:",
            zh: "本课程的大模型实践，包括期末大作业，除作业另有说明外统一使用 DeepSeek 网页版。每次使用都要留下可核对的记录：",
          })}
        </p>
        <ol>
          {aiRecord.map((r) => (
            <li key={r.en}>{t(r)}</li>
          ))}
        </ol>
        <p className="course-note">
          {t({
            en: "DeepSeek is updated over time, so the same prompt can give different answers on different days. That is why we ask for dates, and why grading looks at the quality of your checking, not at a fixed answer.",
            zh: "DeepSeek 的模型会更新，同样的提示词在不同时间输出不同。所以要求记日期，评分也不拿固定答案对照，只看核查和分析的质量。",
          })}
        </p>
      </section>
    </>
  );
}
