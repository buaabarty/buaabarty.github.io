import { useT } from "@/i18n";

const links = [
  { label: { en: "Google Scholar", zh: "Google Scholar" }, href: "https://scholar.google.com/citations?user=FpRGRi4AAAAJ" },
  { label: { en: "ORCID", zh: "ORCID" }, href: "https://orcid.org/0000-0001-9270-730X" },
  { label: { en: "GitHub", zh: "GitHub" }, href: "https://github.com/buaabarty" },
  { label: { en: "LinkedIn", zh: "LinkedIn" }, href: "https://www.linkedin.com/in/buaabarty" },
  { label: { en: "X", zh: "X" }, href: "https://twitter.com/buaabarty" },
];

export function Profile() {
  const t = useT();
  return (
    <section className="profile" aria-labelledby="name">
      <img className="profile-photo" src="/img/avatar.png" alt={t({ en: "Portrait of Boyang Yang", zh: "杨博洋照片" })} width={112} height={112} />
      <div>
        <h1 id="name">{t({ en: "Boyang Yang", zh: "杨博洋" })}</h1>
        <p className="profile-role">
          {t({ en: "Assistant Professor, ", zh: "讲师，" })}
          <a href="https://www.ysu.edu.cn/" rel="noopener">{t({ en: "Yanshan University", zh: "燕山大学" })}</a>
        </p>
        <p className="profile-email">yby@ieee.org</p>
        <ul className="profile-links">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} rel="noopener">{t(l.label)}</a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
