import { useEffect, useRef } from "react";
import { useT } from "@/i18n";

const SRC = "https://mapmyvisitors.com/map.js?d=w5sJvatzL3GJIwhotI1_Lx1_HbH6CVeNwqvVV0x4nsM&cl=ffffff&w=a";

/** MapMyVisitors map. The script inserts the map right after its own script tag. */
export function Visitors() {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || document.getElementById("mapmyvisitors")) return;
    const s = document.createElement("script");
    s.id = "mapmyvisitors";
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
