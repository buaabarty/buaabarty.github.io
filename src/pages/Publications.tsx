import data from "@/content/publications.yml";
import { useT } from "@/i18n";
import { PublicationList } from "./PublicationList";

export function Publications() {
  const t = useT();
  return (
    <section aria-labelledby="title">
      <h1 id="title">{t({ en: "Publications", zh: "论文" })}</h1>
      <PublicationList />
      <h2>{t({ en: "Earlier publications", zh: "早期论文" })}</h2>
      <PublicationList items={data.earlier} legend={false} />
      <h2>{t({ en: "Books", zh: "著作" })}</h2>
      <PublicationList items={data.books} legend={false} />
    </section>
  );
}
