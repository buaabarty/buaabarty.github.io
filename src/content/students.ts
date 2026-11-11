// Newest cohort first. "years" is the enrolment period.
type L = { en: string; zh: string };
export type Student = { name: L; years: string; href?: string };

export const masters: Student[] = [
  { name: { en: "Weiwei Zhang", zh: "张薇薇" }, years: "2026–2029" },
  { name: { en: "Yang Zou", zh: "邹阳" }, years: "2026–2029" },
  { name: { en: "Zhenhao Li", zh: "李振昊" }, years: "2026–2029" },
  { name: { en: "Yibo Shao", zh: "邵一博" }, years: "2026–2029" },
  { name: { en: "Shoulong Wu", zh: "吴守龙" }, years: "2026–2029" },
  { name: { en: "Kanghui Jia", zh: "贾康辉" }, years: "2026–2029" },
  { name: { en: "Zijian Cai", zh: "蔡子健" }, years: "2024–2027" },
];
