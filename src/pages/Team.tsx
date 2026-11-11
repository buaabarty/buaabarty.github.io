import { useT } from "@/i18n";
import { masters } from "@/content/students";

const github = "https://github.com/GLEAM-Lab";

export function Team() {
  const t = useT();
  return (
    <>
      <h1>{t({ en: "Team", zh: "团队" })}</h1>

      <section aria-labelledby="lab">
        <h2 id="lab">GLEAM Lab</h2>
        <p>
          {t({
            en: "Generative LLM-based Software Engineering & Automated Maintenance Laboratory, led by Boyang Yang at Yanshan University.",
            zh: "GLEAM Lab（Generative LLM-based Software Engineering & Automated Maintenance Laboratory）由杨博洋在燕山大学组建，研究基于大语言模型的软件工程与自动化维护。",
          })}
        </p>
        <p>
          <a href={github}>{t({ en: "GLEAM-Lab on GitHub", zh: "GitHub 主页：GLEAM-Lab" })}</a>
        </p>
      </section>

      <section aria-labelledby="students">
        <h2 id="students">{t({ en: "Students", zh: "学生" })}</h2>
        <h3>{t({ en: "Master's students", zh: "硕士研究生" })}</h3>
        <ul className="people">
          {masters.map((m) => (
            <li key={m.name.en}>
              <span className="people-name">{m.href ? <a href={m.href}>{t(m.name)}</a> : t(m.name)}</span>
              <span className="people-years">{m.years}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
