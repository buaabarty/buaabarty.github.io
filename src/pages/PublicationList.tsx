import { Badge } from "@/components/arc/badge/badge";
import data from "@/content/publications.yml";
import { useT } from "@/i18n";

type Text = string | { en: string; zh: string };

type Pub = {
  id: string;
  tag: string;
  title: Text;
  authors: Text;
  conference_short?: Text;
  ccf?: string;
  conference: Text;
  pdf?: string;
  code?: string;
  slides?: string;
  page?: string;
  bibtex?: string;
  notes?: string;
};

export function PublicationList({ items = data.main as Pub[], legend = true }: { items?: Pub[]; legend?: boolean }) {
  const t = useT();
  const L = (v: Text) => (typeof v === "string" ? v : t(v));
  return (
    <>
      {legend && <p className="legend"><sup>#</sup> {t({ en: "Corresponding author", zh: "通讯作者" })}</p>}
      <ol className="pubs">
        {items.map((p) => (
          <li key={p.id} id={p.id} className="pub">
            <p className="pub-title">
              {p.pdf ? <a href={p.pdf} target="_blank" rel="noopener">{L(p.title)}</a> : L(p.title)}
            </p>
            {/* Author strings carry <strong> and <sup> from the site's own data file. */}
            <p className="pub-authors" dangerouslySetInnerHTML={{ __html: L(p.authors) }} />
            <p className="pub-venue">
              {p.conference_short && <Badge key={L(p.conference_short)} size="sm" tone="info">{L(p.conference_short)}</Badge>}
              {p.ccf && <Badge size="sm" outline>{p.ccf}</Badge>}
              <span>{L(p.conference)}</span>
            </p>
            {(p.pdf || p.code || p.slides || p.page || p.bibtex || p.notes) && (
              <p className="pub-links">
                {p.pdf && <a href={p.pdf} target="_blank" rel="noopener">{t({ en: "Paper", zh: "论文" })}</a>}
                {p.code && <a href={p.code} target="_blank" rel="noopener">{t({ en: "Code", zh: "代码" })}</a>}
                {p.slides && <a href={p.slides} target="_blank" rel="noopener">{t({ en: "Slides", zh: "幻灯片" })}</a>}
                {p.page && <a href={p.page} target="_blank" rel="noopener">{t({ en: "Project", zh: "项目主页" })}</a>}
                {p.bibtex && <a href={p.bibtex} target="_blank" rel="noopener">BibTeX</a>}
                {p.notes && <span>{p.notes}</span>}
              </p>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
