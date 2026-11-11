import { useEffect, useState, type ReactNode } from "react";
import { SiteHeader } from "@/components/arc/blocks/site-header/site-header";
import { ThemeSwitch, type Theme } from "@/components/arc/theme-switch/theme-switch";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { useLang, useT, type Lang } from "./i18n";

export type PageId = "home" | "publications" | "teaching" | "team";

const titles: Record<PageId, { en: string; zh: string }> = {
  home: { en: "Boyang Yang | Yanshan University", zh: "杨博洋 | 燕山大学" },
  publications: { en: "Publications | Boyang Yang", zh: "论文 | 杨博洋" },
  teaching: { en: "Teaching | Boyang Yang", zh: "教学 | 杨博洋" },
  team: { en: "Team | Boyang Yang", zh: "团队 | 杨博洋" },
};

function currentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function Layout({ page, children }: { page: PageId; children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const { lang, setLang } = useLang();
  const t = useT();

  useEffect(() => {
    document.title = t(titles[page]);
  }, [lang, page]);

  // Content renders after load, so jump to a #hash once it exists.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  function applyTheme(next: Theme) {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  }

  const items = [
    { value: "home", label: t({ en: "Home", zh: "主页" }), href: "/" },
    { value: "publications", label: t({ en: "Publications", zh: "论文" }), href: "/publication.html" },
    { value: "teaching", label: t({ en: "Teaching", zh: "教学" }), href: "/teach.html" },
    { value: "team", label: t({ en: "Team", zh: "团队" }), href: "/team.html" },
  ];

  return (
    <>
      <a className="skip-link" href="#main">{t({ en: "Skip to content", zh: "跳到正文" })}</a>
      <div className="header-row">
        <SiteHeader
          variant="simple"
          brand={{ name: t({ en: "Boyang Yang", zh: "杨博洋" }), href: "/", mark: <></> }}
          items={items}
          current={page}
          secondaryAction={null}
          primaryAction={null}
          label={t({ en: "Main", zh: "主导航" })}
        />
        <div className="header-tools">
          <SegmentedControl
            label={t({ en: "Language", zh: "语言" })}
            value={lang}
            onValueChange={(v) => setLang(v as Lang)}
            options={[
              { value: "en", label: "EN" },
              { value: "zh", label: "中文" },
            ]}
          />
          <ThemeSwitch
            theme={theme}
            iconOnly
            variant="rise"
            label={theme === "dark" ? t({ en: "Switch to light mode", zh: "切换到浅色" }) : t({ en: "Switch to dark mode", zh: "切换到深色" })}
            onThemeChange={applyTheme}
          />
        </div>
      </div>
      <main id="main" className="page">
        {children}
      </main>
      <footer className="page footer">
        <p>© {new Date().getFullYear()} {t({ en: "Boyang Yang", zh: "杨博洋" })}</p>
        <ul className="footer-links">
          <li><a href="mailto:yby@ieee.org">{t({ en: "Email", zh: "邮箱" })}</a></li>
          <li><a href="https://scholar.google.com/citations?user=FpRGRi4AAAAJ" rel="noopener">Google Scholar</a></li>
          <li><a href="https://orcid.org/0000-0001-9270-730X" rel="noopener">ORCID</a></li>
          <li><a href="https://github.com/buaabarty" rel="noopener">GitHub</a></li>
        </ul>
      </footer>
    </>
  );
}
