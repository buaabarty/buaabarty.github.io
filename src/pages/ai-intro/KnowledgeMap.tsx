import { useState } from "react";
import { useT } from "@/i18n";
import { homeworks, lectureDates, lectures, lectureTime, tools } from "./content";
import { relations, studyPaths, topics } from "./knowledge";
import "./knowledge.css";

// Connectors describe the conceptual relations listed in knowledge.ts.
const paths = [
  "M260 70 L110 140", "M380 70 L530 140", "M530 200 L530 260",
  "M530 320 L320 380", "M230 410 L200 410", "M320 440 L320 510",
  "M20 170 L10 170 L10 490 L230 540", "M410 540 L440 540",
];

export function KnowledgeMap({ initialTopic = 1 }: { initialTopic?: number }) {
  const t = useT();
  const [selected, setSelected] = useState(initialTopic);
  const topic = topics.find((x) => x.id === selected)!;
  const linked = relations.filter((x) => x.from === selected || x.to === selected);
  const hw = homeworks.find((x) => x.lectures.includes(selected));
  const s = (en: string, zh: string) => t({ en, zh });

  function choose(id: number) {
    setSelected(id);
    history.replaceState(null, "", `#/knowledge/${id}`);
  }

  return (
    <>
      <section aria-labelledby="knowledge-heading">
        <h2 id="knowledge-heading">{s("Course knowledge map", "课程知识图谱")}</h2>
        <p>{s("Select a topic to explore its concepts, connections, practice and review question. Arrows show the conceptual relations explained below. Safety and verification run throughout the course.", "选择一个主题，查看核心概念、知识联系、练习与自测。箭头表示下方说明的知识关系。安全与核查贯穿全课程。")}</p>
        <div className="knowledge-map" role="group" aria-label={s("Eight course topics", "八讲知识主题")}>
          <svg viewBox="0 0 640 580" aria-hidden="true" focusable="false">
            <defs>
              <marker id="knowledge-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 Z" fill="context-stroke" />
              </marker>
            </defs>
            {relations.map((edge, i) => (
              <path key={`${edge.from}-${edge.to}`} d={paths[i]} className={edge.from === selected || edge.to === selected ? "knowledge-edge is-related" : "knowledge-edge"} markerEnd="url(#knowledge-arrow)" />
            ))}
          </svg>
          {topics.map((item) => (
            <button key={item.id} type="button" className="knowledge-topic" style={{ left: `${item.x / 6.4}%`, top: `${item.y / 5.8}%` }}
              aria-pressed={item.id === selected} aria-controls="knowledge-detail" onClick={() => choose(item.id)}>
              <span className="course-num">{String(item.id).padStart(2, "0")}</span>
              <span>{t(item.title)}</span>
            </button>
          ))}
        </div>
        <article className="knowledge-detail" id="knowledge-detail" aria-labelledby="topic-heading">
          <p className="course-note">{s(`Lecture ${selected}`, `第 ${selected} 讲`)} · {t(lectureDates[selected - 1])} · {lectureTime(selected - 1)}</p>
          <h3 id="topic-heading">{t(lectures[selected - 1])}</h3>
          <p className="knowledge-question">{t(topic.question)}</p>
          <h4>{s("Core concepts", "核心概念")}</h4>
          <ul>{topic.concepts.map((concept) => <li key={concept.en}>{t(concept)}</li>)}</ul>
          <h4>{s("What you will be able to do", "学完能做什么")}</h4>
          <p>{t(topic.outcome)}</p>
          <h4>{s("Connections", "知识联系")}</h4>
          <ul className="knowledge-relations">
            {linked.map((edge) => {
              const other = topics.find((x) => x.id === (edge.from === selected ? edge.to : edge.from))!;
              return <li key={`${edge.from}-${edge.to}`}><p>{t(edge.text)}</p><button type="button" onClick={() => choose(other.id)}>{s("Explore: ", "查看：")}{t(other.title)} →</button></li>;
            })}
          </ul>
          <h4>{s("Practice and assignment", "练习与作业")}</h4>
          <div className="course-tools">{topic.tools.map((id) => {
            const tool = tools.find((x) => x.id === id)!;
            return <a key={id} href={tool.href} target="_blank" rel="noopener">{t(tool.title)} ↗</a>;
          })}</div>
          {hw && <p><a href={`#/hw${hw.id}`}>HW{hw.id} {t(hw.title)}</a></p>}
          <h4>{s("Check your understanding", "自测问题")}</h4>
          <p>{t(topic.check)}</p>
        </article>
      </section>
      <section aria-labelledby="study-paths">
        <h2 id="study-paths">{s("Where to study next", "后续课程衔接")}</h2>
        <p>{s("This course gives you questions and observations to bring into later study. Use these connections when writing your HW4 learning plan.", "把本课形成的问题和观察带入后续学习。完成 HW4 学习计划时，可以据此选择持续跟踪的方向。")}</p>
        <div className="knowledge-paths">{studyPaths.map((path) => <div key={path.topic.en}>
          <h3>{t(path.topic)}</h3><p className="knowledge-courses">{t(path.courses)}</p><p>{t(path.action)}</p>
        </div>)}</div>
        <p><a href="#/hw4">{s("Write your learning plan →", "制定个人学习计划 →")}</a></p>
      </section>
    </>
  );
}
