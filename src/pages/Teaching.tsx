import type { ReactNode } from "react";
import { useT } from "@/i18n";

type L = { en: string; zh: string };
type Entry = { when: L; role: L; where: L; href?: string; points?: L[] };

const present = (y: string): L => ({ en: `${y}–present`, zh: `${y} 年至今` });

const courses: Entry[] = [
  {
    when: { en: "Fall 2026", zh: "2026 年秋季" },
    role: { en: "Introduction to Artificial Intelligence", zh: "人工智能导论" },
    where: { en: "Yanshan University, instructor, undergraduate course", zh: "燕山大学，主讲教师，本科课程" },
  },
];

const appointments: Entry[] = [
  {
    when: present("2026"),
    role: { en: "Assistant Professor", zh: "讲师" },
    where: { en: "Yanshan University", zh: "燕山大学" },
    points: [
      { en: "Teach undergraduate courses in artificial intelligence", zh: "讲授人工智能方向本科课程" },
      { en: "Supervise undergraduate and graduate research in AI4SE and program repair", zh: "指导本科生和研究生开展智能化软件工程与程序修复研究" },
    ],
  },
  {
    when: present("2021"),
    role: { en: "External Mentor", zh: "校外导师" },
    where: { en: "Wuhan University, School of Cyber Science and Engineering", zh: "武汉大学国家网络安全学院" },
    href: "https://cse.whu.edu.cn/szdw/jsml/mmkxyjsx/fjs.htm",
    points: [
      { en: "Design and teach mandatory summer course “Security Maker Practice Training”", zh: "设计并讲授暑期必修课“安全创客实践训练”" },
      { en: "Mentor graduate students in cybersecurity research and practical applications", zh: "指导研究生开展网络安全研究与实践应用" },
      { en: "Develop hands-on training curricula for security engineering practices", zh: "编写安全工程实践训练课程" },
    ],
  },
];

function Entries({ items }: { items: Entry[] }) {
  const t = useT();
  return (
    <ul className="entries">
      {items.map((e) => {
        const where: ReactNode = e.href ? <a href={e.href}>{t(e.where)}</a> : t(e.where);
        return (
          <li key={e.role.en + e.when.en + e.where.en} className="entry">
            <span className="entry-when">{t(e.when)}</span>
            <div>
              <p className="entry-role">{t(e.role)}</p>
              <p className="entry-where">{where}</p>
              {e.points && (
                <ul className="entry-points">
                  {e.points.map((p) => <li key={p.en}>{t(p)}</li>)}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function Teaching() {
  const t = useT();
  return (
    <>
      <h1>{t({ en: "Teaching", zh: "教学" })}</h1>

      <section aria-labelledby="courses">
        <h2 id="courses">{t({ en: "Courses", zh: "课程" })}</h2>
        <Entries items={courses} />
      </section>

      <section aria-labelledby="appointments">
        <h2 id="appointments">{t({ en: "Academic appointments", zh: "学术任职" })}</h2>
        <Entries items={appointments} />
      </section>

      <section aria-labelledby="awards">
        <h2 id="awards">{t({ en: "Teaching awards and recognition", zh: "教学奖励与荣誉" })}</h2>
        <ul className="plain-list">
          <li><a href="https://csri.scu.edu.cn/info/1016/3409.htm">{t({ en: "First Prize, MOE Cybersecurity Industry-Academia Cooperation Excellence (2022)", zh: "教育部网络安全产学合作优秀案例一等奖（2022 年）" })}</a></li>
        </ul>
      </section>
    </>
  );
}
