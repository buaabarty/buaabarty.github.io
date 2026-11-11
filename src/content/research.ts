// Research topics. Each paper id must match an `id` in publications.yml.
type L = { en: string; zh: string };
export type Topic = { name: L; papers?: string[]; children?: Topic[] };

export const summary: L = {
  en: "My research uses large language models to locate, repair, and explain bugs in software, while keeping the data and code involved private.",
  zh: "我的研究利用大语言模型定位、修复和解释软件缺陷，同时保护其中涉及的数据与代码隐私。",
};

export const interests: L[] = [
  { en: "AI for software engineering (AI4SE)", zh: "智能化软件工程（AI4SE）" },
  { en: "Automated program repair", zh: "程序自动修复" },
  { en: "Fault localization", zh: "缺陷定位" },
  { en: "Natural language processing for code", zh: "面向代码的自然语言处理" },
];

export const topics: Topic[] = [
  {
    name: { en: "Program repair", zh: "程序修复" },
    children: [
      { name: { en: "Fine-tuning LLMs for repair", zh: "面向修复的大模型微调" }, papers: ["tosem25-morepair"] },
      { name: { en: "Inference optimization", zh: "推理优化" }, papers: ["icse26-input", "icse26-translate"] },
      { name: { en: "Low-resource languages", zh: "低资源编程语言" }, papers: ["issta26-helo"] },
      { name: { en: "Repair for programming education", zh: "面向编程教学的修复" }, papers: ["issta24-cref"] },
      { name: { en: "Data privacy", zh: "数据隐私" }, papers: ["tosem25-federated"] },
      { name: { en: "Survey", zh: "综述" }, papers: ["tosem26-survey"] },
    ],
  },
  {
    name: { en: "Fault localization", zh: "缺陷定位" },
    children: [{ name: { en: "Empirical study of LLMs", zh: "大模型实证研究" }, papers: ["ijseke26-fl"] }],
  },
];
