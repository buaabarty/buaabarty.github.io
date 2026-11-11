import data from "@/content/publications.yml";
import { interests, summary, topics, type Topic } from "@/content/research";
import { useT } from "@/i18n";

const tagOf: Record<string, string> = Object.fromEntries(
  (data.main as { id: string; tag: string }[]).map((p) => [p.id, p.tag]),
);

function Papers({ ids }: { ids: string[] }) {
  return (
    <span className="topic-papers">
      {ids.map((id) => (
        <a key={id} href={`#${id}`}>{tagOf[id] ?? id}</a>
      ))}
    </span>
  );
}

function TopicList({ items }: { items: Topic[] }) {
  const t = useT();
  return (
    <ul className="topics">
      {items.map((tp) => (
        <li key={tp.name.en}>
          <span className={tp.children ? "topic-group" : "topic-name"}>{t(tp.name)}</span>
          {tp.papers && <Papers ids={tp.papers} />}
          {tp.children && <TopicList items={tp.children} />}
        </li>
      ))}
    </ul>
  );
}

export function Research() {
  const t = useT();
  return (
    <section aria-labelledby="interests">
      <h2 id="interests">{t({ en: "Research interests", zh: "研究方向" })}</h2>
      <ul className="plain-list">
        {interests.map((i) => <li key={i.en}>{t(i)}</li>)}
      </ul>
      <p>{t(summary)}</p>
      <TopicList items={topics} />
    </section>
  );
}
