import { useEffect, useState } from "react";
import { useT } from "@/i18n";
import { aiRecord, course, grading, lectureDates, lectureTime, homeworks, lectures, policies, scheduleEvents, week, type Homework } from "./content";

type Route = "home" | "schedule" | "assignments" | "policies" | `hw${number}`;

function readRoute(): Route {
  const h = location.hash.replace(/^#\/?/, "");
  if (/^hw[1-4]$/.test(h) || ["schedule", "assignments", "policies"].includes(h)) return h as Route;
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
        {t({ en: "HW4 is due the day before the final lab exam.", zh: "HW4 在期末机房考试前一天截止。" })}
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
          en: "One assignment per week, 4 in total, 5 points each. Each takes about 60 to 90 minutes and covers that week's two lectures. Submit on Xuexitong.",
          zh: "每周一个作业，共 4 个，各 5 分。每个作业覆盖当周两讲，预计用时 60 到 90 分钟。在学习通提交。",
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
      {hw.tasks.map((task) => (
        <div key={task.title.en} className="course-task">
          <p className="course-task-title">
            {t(task.title)}
            {task.note && <span className="course-task-note">{t(task.note)}</span>}
          </p>
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
            en: "All LLM work in this course, including the open test in the final exam, uses the DeepSeek web app. Every time you use it, keep a record that can be checked:",
            zh: "本课程所有大模型实践，包括期末开放应用测试，统一使用 DeepSeek 网页版。每次使用都要留下可核对的记录：",
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
