import { useState } from "react";
import { Button } from "@/components/arc/button/button";
import { news } from "@/content/news";
import { useLang, useT } from "@/i18n";
import { Profile } from "./Profile";
import { PublicationList } from "./PublicationList";
import { Research } from "./Research";
import { Visitors } from "./Visitors";

const KEEP = 6;

const jin = "https://orcid.org/0000-0002-5845-5601";
const tian = "https://haoyetiancoder.github.io/";
const li = "https://scholar.google.com.hk/citations?user=e-4LoEcAAAAJ";
const whu = "https://cse.whu.edu.cn/szdw/jsml/mmkxyjsx/fjs.htm";

function AboutEn() {
  return (
    <>
      <p>
        I am an Assistant Professor (from 2026) at Yanshan University, and CTO (from 2015) of Beijing Jisuanke Co., Ltd.
        I obtained my bachelor's degree (2013) from Beihang University. While working in industry, I obtained my master's
        degree (2018) from Beihang University under the supervision of Prof. <a href={li}>Zhoujun Li</a>, and my Ph.D. (2026)
        from Yanshan University under the supervision of Prof. <a href={jin}>Shunfu Jin</a> and
        Prof. <a href={tian}>Haoye Tian</a>.
      </p>
      <p>
        I am a Senior Member of IEEE and CCF, an Executive Committee Member of the CCF Technical Committee on System
        Software, and an external supervisor at Wuhan University. I represented Beihang University in the ACM International
        Collegiate Programming Contest (ICPC) World Finals and achieved 27th place. I have published 7 papers in top-tier
        venues (ICSE, TOSEM, ISSTA), 4 of which I am the first author.
      </p>
      <p>
        I have served as a Program Committee member for FSE'26 IVR, FSE'27 Industry, ICPC'27 Research, ICSME'26 Industry,
        ICST'26, MSR'26, and AIware'26, and served as a reviewer for WWW'27 and the journal EMSE, ASEJ, TOSEM, TSE and TAAS.
      </p>
    </>
  );
}

function AboutZh() {
  return (
    <>
      <p>
        我是燕山大学讲师（2026 年起），并自 2015 年起担任北京计蒜客 CTO。2013 年在北京航空航天大学获学士学位。此后在职攻读硕士和博士学位，
        2018 年在北京航空航天大学获硕士学位，导师为<a href={li}>李舟军</a>教授，2026 年在燕山大学获博士学位，导师为
        <a href={jin}>金顺福</a>教授和<a href={tian}>田昊野</a>教授。
      </p>
      <p>
        我是 IEEE 和 CCF 高级会员、CCF 系统软件专委会执行委员，并担任武汉大学校外导师。曾代表北京航空航天大学参加 ACM 国际大学生程序设计竞赛（ICPC）全球总决赛，获第
        27 名。已在 ICSE、TOSEM、ISSTA 等顶级会议和期刊发表论文 7 篇，其中第一作者 4 篇。
      </p>
      <p>
        担任 FSE'26 IVR、FSE'27 Industry、ICPC'27 Research、ICSME'26 Industry、ICST'26、MSR'26 和 AIware'26 程序委员会委员，以及
        WWW'27 和 EMSE、ASEJ、TOSEM、TSE、TAAS 等期刊的审稿人。
      </p>
    </>
  );
}

const committees = [
  { label: "WWW 2027" },
  { label: "ICPC 2027", href: "https://conf.researchr.org/committee/icpc-2027/icpc-2027-research-track-program-committee" },
  { label: "FSE 2027 (Industry)", href: "https://conf.researchr.org/committee/fse-2027/fse-2027-industry-papers-program-committee" },
  { label: "FSE 2026 (IVR)", href: "https://conf.researchr.org/committee/fse-2026/fse-2026-ideas-visions-and-reflections-program-committee" },
  { label: "ICSME 2026 (Industry)", href: "https://conf.researchr.org/committee/icsme-2026/icsme-2026-industry-track-program-committee" },
  { label: "MSR 2026", href: "https://2026.msrconf.org/committee/msr-2026-junior-pc-technical-papers---junior-program-committee" },
  { label: "ICST 2026", href: "https://conf.researchr.org/committee/icst-2026/icst-2026-papers-program-committee" },
  { label: "AIware 2026", href: "https://2026.aiwareconf.org/committee/aiware-2026-papers-program-committee" },
];

export function Home() {
  const [allNews, setAllNews] = useState(false);
  const { lang } = useLang();
  const t = useT();
  const shown = allNews ? news : news.slice(0, KEEP);

  return (
    <>
      <Profile />

      <section aria-labelledby="about">
        <h2 id="about">{t({ en: "About me", zh: "个人简介" })}</h2>
        {lang === "zh" ? <AboutZh /> : <AboutEn />}
      </section>

      <Research />

      <section aria-labelledby="news">
        <h2 id="news">{t({ en: "News", zh: "动态" })}</h2>
        <ul className="news" id="news-list">
          {shown.map((n, i) => (
            <li key={i}>
              <span className="news-date">{t(n.date)}</span>
              <span>{t(n.text)}</span>
            </li>
          ))}
        </ul>
        {news.length > KEEP && (
          <Button
            variant="secondary"
            size="sm"
            aria-expanded={allNews}
            aria-controls="news-list"
            onClick={() => setAllNews((v) => !v)}
          >
            {allNews ? t({ en: "Show less", zh: "收起" }) : t({ en: `Show all ${news.length}`, zh: `显示全部 ${news.length} 条` })}
          </Button>
        )}
      </section>

      <section aria-labelledby="publications">
        <h2 id="publications">{t({ en: "Publications", zh: "论文" })}</h2>
        <PublicationList />
      </section>

      <section aria-labelledby="services">
        <h2 id="services">{t({ en: "Services", zh: "学术服务" })}</h2>
        <h3>{t({ en: "Program committees and reviewing", zh: "程序委员会与审稿" })}</h3>
        <ul className="plain-list">
          {committees.map((c) => (
            <li key={c.label}>{c.href ? <a href={c.href}>{c.label}</a> : c.label}</li>
          ))}
        </ul>
        <h3>{t({ en: "Academic positions", zh: "学术任职" })}</h3>
        <ul className="plain-list">
          <li>{t({ en: "Senior Member of IEEE and CCF", zh: "IEEE 和 CCF 高级会员" })}</li>
          <li>{t({ en: "Executive Committee Member, CCF Technical Committee on System Software", zh: "CCF 系统软件专委会执行委员" })}</li>
          <li>{t({ en: "Academic Committee member of YOCSEF (Baoding) and CTO Club, CCF", zh: "CCF YOCSEF 保定和 CCF CTO Club 学术委员" })}</li>
          <li><a href={whu}>{t({ en: "External Lecturer at Wuhan University", zh: "武汉大学校外导师" })}</a></li>
        </ul>
      </section>
      <Visitors />
    </>
  );
}
