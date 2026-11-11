import { useT } from "@/i18n";
import { PublicationList } from "./PublicationList";

export function Publications() {
  const t = useT();
  return (
    <section aria-labelledby="title">
      <h1 id="title">{t({ en: "Publications", zh: "论文" })}</h1>
      <PublicationList />
    </section>
  );
}
