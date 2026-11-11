import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./site.css";
import { Layout, type PageId } from "./Layout";
import { LangProvider } from "./i18n";
import { Home } from "./pages/Home";
import { Publications } from "./pages/Publications";
import { Teaching } from "./pages/Teaching";

const root = document.getElementById("root")!;
const page = (root.dataset.page ?? "home") as PageId;
const Page = { home: Home, publications: Publications, teaching: Teaching }[page];

createRoot(root).render(
  <StrictMode>
    <LangProvider>
      <Layout page={page}>
        <Page />
      </Layout>
    </LangProvider>
  </StrictMode>,
);
