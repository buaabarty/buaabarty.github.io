import data from "@/content/publications.yml";
import { useT } from "@/i18n";
import { PublicationList } from "./PublicationList";

export function Publications() {
  const t = useT();
  return (
    <section aria-labelledby="title">
      <h1 id="title">{t({ en: "Publications", zh: "论文" })}</h1>
      <h2>{t({ en: "Research papers", zh: "科研论文" })}</h2>
      <PublicationList items={[...data.main, ...data.research_earlier]} />
      <h2>{t({ en: "Teaching research papers", zh: "教研论文" })}</h2>
      <PublicationList items={data.education} legend={false} />
      <h2>{t({ en: "Books", zh: "著作" })}</h2>
      <PublicationList items={data.books} legend={false} />
    </section>
  );
}
