import { useEffect, useRef } from "react";
import { useT } from "@/i18n";

const SRC = "https://mapmyvisitors.com/globe.js?d=Uo4f-TFafL8Hkuo9FGaDiXLJq7IoN9G4zJmwje-oSYQ";

/** MapMyVisitors globe. The script inserts the globe right after its own script tag. */
export function Visitors() {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || document.getElementById("mmvst_globe")) return;
    const s = document.createElement("script");
    s.id = "mmvst_globe";
    s.src = SRC;
    s.async = true;
    el.appendChild(s);
  }, []);

  return (
    <section aria-labelledby="visitors">
      <h2 id="visitors">{t({ en: "Visitors", zh: "访客" })}</h2>
      <div ref={box} className="visitors" />
    </section>
  );
}
