import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "zh";

function initialLang(): Lang {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "en" || q === "zh") return q;
  try {
    const s = localStorage.getItem("lang");
    if (s === "en" || s === "zh") return s;
  } catch {}
  // The course pages follow the browser language, like the practice tools. The rest of the site defaults to English.
  if (document.getElementById("root")?.dataset.page === "aiIntro" && navigator.language.toLowerCase().startsWith("zh")) return "zh";
  return "en";
}

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  function setLang(l: Lang) {
    try {
      localStorage.setItem("lang", l);
    } catch {}
    const url = new URL(location.href);
    url.searchParams.delete("lang");
    history.replaceState(null, "", url);
    setLangState(l);
  }

  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}

/** Pick the string for the current language. */
export function useT() {
  const { lang } = useLang();
  return <T,>(v: { en: T; zh: T }) => v[lang];
}
