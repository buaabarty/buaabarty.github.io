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
    role: { en: "Assistant Professor", zh: "助理教授" },
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
  {
    when: present("2023"),
    role: { en: "External Mentor", zh: "校外导师" },
    where: { en: "Information Engineering University", zh: "信息工程大学" },
    points: [
      { en: "Lead engineering practice training courses", zh: "主持工程实践训练课程" },
      { en: "Develop practical training programs for military information systems", zh: "设计军事信息系统实践训练项目" },
      { en: "Supervise capstone projects in information engineering", zh: "指导信息工程方向毕业设计" },
    ],
  },
];

const coaching: Entry[] = [
  {
    when: { en: "2012", zh: "2012 年" },
    role: { en: "Coach", zh: "教练" },
    where: { en: "Beijing Olympiad in Informatics Winter Camp", zh: "北京市信息学奥林匹克冬令营" },
    points: [
      { en: "Trained high school students in competitive programming", zh: "培训高中生程序设计竞赛" },
      { en: "Developed algorithmic problem-solving curricula", zh: "编写算法解题课程" },
      { en: "Prepared students for national and international programming contests", zh: "辅导学生备战国内外程序设计竞赛" },
    ],
  },
  {
    when: { en: "", zh: "" },
    role: { en: "Chief Teacher", zh: "首席教师" },
    where: { en: "Jisuanke Online Platform", zh: "计蒜客在线教育平台" },
    points: [
      { en: "Lead the development of online programming education platform", zh: "主持在线编程教育平台的研发" },
      { en: "Design interactive programming courses and assessment systems", zh: "设计交互式编程课程和测评系统" },
      { en: "Oversee curriculum development for competitive programming training", zh: "负责程序设计竞赛培训课程体系建设" },
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

      <section aria-labelledby="coaching">
        <h2 id="coaching">{t({ en: "Competition coaching", zh: "竞赛指导" })}</h2>
        <Entries items={coaching} />
      </section>

      <section aria-labelledby="achievements">
        <h2 id="achievements">{t({ en: "Competition achievements", zh: "竞赛成绩" })}</h2>
        <ul className="plain-list">
          <li>{t({ en: "ACM-ICPC coach: led several teams to regional gold medals", zh: "ACM-ICPC 教练：带领多支队伍获区域赛金牌" })}</li>
          <li>{t({ en: "Blue Bridge Cup: top 1% coach", zh: "蓝桥杯：前 1% 优秀指导教师" })}</li>
          <li>{t({ en: "Represented Beihang University at the ACM-ICPC World Finals (27th place)", zh: "代表北京航空航天大学参加 ACM-ICPC 全球总决赛，获第 27 名" })}</li>
        </ul>
      </section>

      <section aria-labelledby="awards">
        <h2 id="awards">{t({ en: "Teaching awards and recognition", zh: "教学奖励与荣誉" })}</h2>
        <ul className="plain-list">
          <li>{t({ en: "First Prize, MOE Cybersecurity Industry-Academia Cooperation Excellence (2022)", zh: "教育部网络安全产学合作优秀案例一等奖（2022 年）" })}</li>
        </ul>
      </section>
    </>
  );
}
