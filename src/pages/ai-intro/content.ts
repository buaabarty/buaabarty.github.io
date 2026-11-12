type L = { en: string; zh: string };

export const course = {
  title: { en: "Introduction to Artificial Intelligence", zh: "人工智能概论" },
  meta: {
    en: "School of Artificial Intelligence, Yanshan University · AI major, year 1, semester 1 · Required · 1 credit, 16 hours",
    zh: "燕山大学人工智能学院 · 人工智能专业大一第 1 学期 · 专业必选课 · 1 学分，16 学时",
  },
  when: {
    en: "8 lectures over 4 weeks, from November 23, 2026. Mondays 15:35–17:10 and Wednesdays 13:30–15:05, Liren C107",
    zh: "共 8 讲，2026 年 11 月 23 日起连续 4 周。每周一 15:35–17:10，每周三 13:30–15:05，地点里仁 C107",
  },
  summary: {
    en: "This course builds an intuitive picture of artificial intelligence without code or mathematical derivations. You will work with no-code web tools and large language models to see how search, machine learning, neural networks, LLMs, and agents behave, where they fail, and how to use them responsibly.",
    zh: "本课程零代码、不讲数学推导，借助网页上的无代码工具和大模型实践，帮你直观理解人工智能：搜索、机器学习、神经网络、大模型和智能体如何工作，在哪里会出错，以及如何负责任地使用它们。",
  },
  prereqs: {
    en: "None. All LLM work uses the DeepSeek web app, which only needs a free account.",
    zh: "无先修要求。所有大模型实践统一使用 DeepSeek 网页版，只需免费注册。",
  },
};

export const grading: { item: L; weight: string; parts?: { item: L; weight: string }[] }[] = [
  {
    item: { en: "Coursework", zh: "平时成绩" },
    weight: "50%",
    parts: [
      { item: { en: "In-class quizzes", zh: "随堂小测验" }, weight: "10" },
      { item: { en: "Homework (4 assignments, 5 points each)", zh: "课后练习（4 次作业，各 5 分）" }, weight: "20" },
      { item: { en: "Group report", zh: "分组报告" }, weight: "20" },
    ],
  },
  {
    item: { en: "Final exam (computer lab)", zh: "期末机房综合考试" },
    weight: "50%",
    parts: [
      { item: { en: "Closed-book theory test on Xuexitong", zh: "学习通闭卷理论测试" }, weight: "35" },
      { item: { en: "Open LLM application test (DeepSeek)", zh: "大模型开放应用测试（DeepSeek）" }, weight: "15" },
    ],
  },
];

export const lectures: L[] = [
  { en: "The AI landscape and a brief history", zh: "人工智能全景与简史" },
  { en: "Classical AI: search, games, and reinforcement learning", zh: "经典人工智能：搜索、博弈与强化学习" },
  { en: "Learning from data: machine learning", zh: "从数据中学习：机器学习" },
  { en: "Neural networks and deep learning", zh: "神经网络与深度学习" },
  { en: "Large language models and prompting", zh: "大语言模型与提示词" },
  { en: "Generative AI and multimodality", zh: "生成式人工智能与多模态" },
  { en: "Agent systems", zh: "智能体系统" },
  { en: "Limits, safety, ethics, and academic integrity", zh: "局限、安全、伦理与学术诚信" },
];

export const lectureDates: L[] = [
  { en: "Mon, Nov 23", zh: "11 月 23 日 周一" },
  { en: "Wed, Nov 25", zh: "11 月 25 日 周三" },
  { en: "Mon, Nov 30", zh: "11 月 30 日 周一" },
  { en: "Wed, Dec 2", zh: "12 月 2 日 周三" },
  { en: "Mon, Dec 7", zh: "12 月 7 日 周一" },
  { en: "Wed, Dec 9", zh: "12 月 9 日 周三" },
  { en: "Mon, Dec 14", zh: "12 月 14 日 周一" },
  { en: "Wed, Dec 16", zh: "12 月 16 日 周三" },
];
export const lectureTime = (i: number) => (i % 2 === 0 ? "15:35–17:10" : "13:30–15:05");
export const week = (n: number): L => ({ en: `Week ${n}`, zh: `第 ${n} 周` });

/** Homework released / due, keyed by the lecture index after which it appears in the schedule. */
export const scheduleEvents: Record<number, { hw: number; kind: "out" | "due" }[]> = {
  1: [{ hw: 1, kind: "out" }],
  2: [{ hw: 1, kind: "due" }],
  3: [{ hw: 2, kind: "out" }],
  4: [{ hw: 2, kind: "due" }],
  5: [{ hw: 3, kind: "out" }],
  6: [{ hw: 3, kind: "due" }, { hw: 4, kind: "out" }],
};

type Row = { item: L; points: string; look: L };

export type ToolId = "maze" | "puzzle" | "grid" | "ml" | "nn" | "evolve" | "swarm";
export const tools: { id: ToolId; href: string; title: L; text: L }[] = [
  {
    id: "maze",
    href: "/teach/ai-intro/tools/maze/",
    title: { en: "Maze search", zh: "迷宫搜索" },
    text: {
      en: "Draw a maze, then run breadth-first, depth-first, and A* search step by step, and compare the cells examined and the path length. Lecture 2.",
      zh: "自己画迷宫，逐步运行广度优先、深度优先和 A* 搜索，对比查看过的格子数和路径长度。对应第 2 讲。",
    },
  },
  {
    id: "puzzle",
    href: "/teach/ai-intro/tools/puzzle/",
    title: { en: "Eight-puzzle", zh: "八数码拼图" },
    text: {
      en: "Treat a sliding puzzle as search and compare how many positions breadth-first search and A* check. Lecture 2.",
      zh: "把拼图看成搜索问题，比较广度优先与 A* 查看的局面数。对应第 2 讲。",
    },
  },
  {
    id: "grid",
    href: "/teach/ai-intro/tools/grid/",
    title: { en: "Grid world", zh: "网格世界" },
    text: {
      en: "Watch a robot learn where to go from rewards and traps, and see how changing the reward per step changes its route. Lecture 2.",
      zh: "看机器人怎样根据奖励和陷阱学会往哪走，调整每一步的奖励，观察路线怎么变。对应第 2 讲。",
    },
  },
  {
    id: "ml",
    href: "/teach/ai-intro/tools/ml/",
    title: { en: "Machine learning workflow", zh: "机器学习工作流练习" },
    text: {
      en: "Build a workflow on a canvas by connecting data, models, and evaluation widgets, then compare training and test accuracy to see overfitting. Lecture 3.",
      zh: "在画布上连接数据、模型和测试与评分等组件搭出工作流，对比训练数据和测试数据上的准确率，看清过拟合。对应第 3 讲。",
    },
  },
  {
    id: "nn",
    href: "/teach/ai-intro/tools/nn/",
    title: { en: "Neural network playground", zh: "神经网络练习" },
    text: {
      en: "Change the data, layers, neurons, and learning rate, then watch the decision boundary and the training and test loss curves. Lecture 4.",
      zh: "调整数据、层数、神经元数和学习率，观察决策边界以及训练损失和测试损失两条曲线。对应第 4 讲。",
    },
  },
  {
    id: "evolve",
    href: "/teach/ai-intro/tools/evolve/",
    title: { en: "Evolving minesweepers", zh: "进化扫雷车" },
    text: {
      en: "Cars driven by tiny neural networks evolve, generation by generation, to find mines. Lecture 4.",
      zh: "小神经网络驾驶的小车，一代代进化出找地雷的本领。对应第 4 讲。",
    },
  },
  {
    id: "swarm",
    href: "/teach/ai-intro/tools/swarm/",
    title: { en: "Swarm intelligence", zh: "群体智能" },
    text: {
      en: "Ants find the shortcut by scent, and birds form a flock from three simple rules. Lecture 7.",
      zh: "蚂蚁靠气味找到近路，鸟群靠三条规则飞出队形。对应第 7 讲。",
    },
  },
];

export type Homework = {
  id: number;
  title: L;
  lectures: [number, number];
  tools?: ToolId[];
  out: L;
  due: L;
  overview: L;
  tasks: { title: L; note?: L; link?: { href: string; label: L }; steps?: L[]; text?: L }[];
  submit: L;
  grading: Row[];
  gradingNote?: L;
  ai: L;
  pitfalls: L[];
};

export const homeworks: Homework[] = [
  {
    id: 1,
    title: { en: "The world of search", zh: "搜索的世界" },
    lectures: [1, 2],
    tools: ["maze", "grid"],
    out: { en: "Wed, Nov 25, after class", zh: "11 月 25 日 周三课后" },
    due: { en: "Mon, Nov 30, before class", zh: "11 月 30 日 周一上课前" },
    overview: {
      en: "Use the maze search tool on this site to compare how many cells different search methods examine in the same maze. Then try an LLM and find an example it clearly gets wrong.",
      zh: "用本站的迷宫搜索工具，比较不同搜索方法在同一个迷宫里查看了多少格子。再体验一次大模型，找一个它明显答错的例子。",
    },
    tasks: [
      {
        title: { en: "Part A. Find an example the model gets wrong", zh: "Part A　找一个模型答错的例子" },
        note: { en: "Lecture 1 task", zh: "对应第 1 讲任务" },
        text: {
          en: "Ask DeepSeek to translate, summarize, or correct a text. Find a place where it is clearly wrong, and record your prompt, its answer, and what is wrong.",
          zh: "用 DeepSeek 做一次翻译、摘要或改错，找到一个它明显答错的地方，记下你的提问、它的回答、错在哪。",
        },
      },
      {
        title: { en: "Part B. One maze, three ways through", zh: "Part B　同一个迷宫，三种走法" },
        note: { en: "Lecture 2 task, core", zh: "对应第 2 讲任务，核心" },
        steps: [
          { en: "Generate a maze in the maze search tool and fix the start and goal.", zh: "在迷宫搜索工具里生成一个迷宫，起点和终点固定。" },
          { en: "Run breadth-first, depth-first, and directed search in turn. For each, record the number of cells examined and the length of the final path.", zh: "依次运行广度优先、深度优先、有方向的搜索，各记一次“查看过的格子数”和“最后路径的长度”。" },
          { en: "Add more obstacles or move the goal, then compare again.", zh: "把障碍加多或移动终点，再对比一次。" },
          { en: "In your own words: which method examines the fewest cells, and why?", zh: "用自己的话回答：哪种方法查看的格子最少，为什么。" },
        ],
      },
      {
        title: { en: "Part C. Optional, not graded", zh: "Part C　选做，不计分" },
        text: {
          en: "Open the grid world tool and click “一直算到不变” (run until stable) to see where the robot goes from the start. Then move “每走一步的奖励” (reward per step) toward negative values, find the value at which the robot switches to heading into the trap, and think about why.",
          zh: "打开网格世界练习页，先点“一直算到不变”，看机器人从起点走到哪里。再把“每走一步的奖励”往负的方向调，找出机器人改去陷阱的那个值，想一想为什么。",
        },
      },
    ],
    submit: {
      en: "One practice record sheet: a comparison table of the three methods (cells examined, path length), two screenshots, a short explanation of at most 150 Chinese characters, the wrong-answer example from Part A, and your AI use statement.",
      zh: "实践记录单一页：一张三种方法的对比表（格子数、路径长度），两张截图，一段不超过 150 字的原因分析，以及 Part A 的答错案例和 AI 使用声明。",
    },
    grading: [
      { item: { en: "Process evidence", zh: "过程证据" }, points: "2", look: { en: "Screenshots show real results of three methods on the same maze, and the numbers match the screenshots", zh: "截图能看出确实是同一迷宫、三种方法的真实结果，数字与截图一致" } },
      { item: { en: "Comparison and presentation", zh: "对比与呈现" }, points: "2", look: { en: "A clear table, plus a second comparison after changing the conditions", zh: "表格清楚，改了条件后又对比了一次" } },
      { item: { en: "Explanation", zh: "原因分析" }, points: "1", look: { en: "Explains with intuition, such as why nearby cells are checked first or why a directed search saves effort, rather than repeating the numbers", zh: "能用“为什么先查近的、为什么有方向的更省”这样的直觉解释，不只复述数字" } },
    ],
    ai: {
      en: "Part A requires DeepSeek. The numbers in Part B must come from your own runs. Do not let DeepSeek make them up.",
      zh: "Part A 本来就要用 DeepSeek。Part B 的数字必须来自本人运行，不能让 DeepSeek 代编。",
    },
    pitfalls: [
      { en: "Using a different maze for each run, so the numbers cannot be compared.", zh: "三次用了不同的迷宫，数字没有可比性。" },
      { en: "Capturing only the final path, so the examined cells are not visible.", zh: "只截了最后的路径，看不出查看过多少格子。" },
      { en: "Confusing “shortest path” with “fewest cells examined”.", zh: "把“最短路径”和“查看的格子最少”混为一谈。" },
    ],
  },
  {
    id: 2,
    title: { en: "Letting machines learn from data", zh: "让机器从数据里学" },
    lectures: [3, 4],
    tools: ["ml", "nn"],
    out: { en: "Wed, Dec 2, after class", zh: "12 月 2 日 周三课后" },
    due: { en: "Mon, Dec 7, before class", zh: "12 月 7 日 周一上课前" },
    overview: {
      en: "First build a workflow and train a classifier in the machine learning workflow tool on this site, and deliberately cause overfitting. Then change the structure and learning rate in the neural network playground and watch the loss curve.",
      zh: "先在课程网站的机器学习工作流练习页里搭流程、训练分类器，故意制造过拟合。再在神经网络练习页里改结构和学习率，看损失曲线怎么变。",
    },
    tasks: [
      {
        title: { en: "Part A. Cause overfitting on purpose", zh: "Part A　制造一次过拟合" },
        note: { en: "Lecture 3 task, core", zh: "对应第 3 讲任务，核心" },
        link: {
          href: "/teach/ai-intro/tools/ml/?example=4",
          label: { en: "Open the HW2 example workflow", zh: "打开作业二示例工作流" },
        },
        steps: [
          { en: "Open the machine learning workflow tool and pick “作业二 西瓜数据制造过拟合” (HW2: overfitting with the watermelon data) under “示例工作流” (example workflows).", zh: "打开机器学习工作流练习页，在“示例工作流”里选“作业二 西瓜数据制造过拟合”。" },
          { en: "Double-click “k近邻” (k-nearest neighbors) and set the number of neighbors to 1. Double-click “测试与评分” (test and score), choose “在测试数据上测试” (test on test data) and then “在训练数据上测试” (test on training data), and record the classification accuracy each time.", zh: "双击“k近邻”，把邻居个数设为 1。双击“测试与评分”，分别选“在测试数据上测试”和“在训练数据上测试”，记下两次的分类准确率。" },
          { en: "Change the number of neighbors to 5 and record again.", zh: "把邻居个数改成 5，再记一次。" },
          { en: "Take screenshots of the whole workflow canvas and of the “测试与评分” window.", zh: "截图：整个工作流画布，以及“测试与评分”窗口。" },
          { en: "Use these numbers to describe what overfitting looks like: why does k=1 score perfectly on the training data but drop on the test data?", zh: "用这些数字说明“过拟合”是什么样子：为什么 k=1 在训练数据上满分，到测试数据上却下降。" },
        ],
      },
      {
        title: { en: "Part B. Tune a neural network", zh: "Part B　调一次神经网络" },
        note: { en: "Lecture 4 task", zh: "对应第 4 讲任务" },
        steps: [
          { en: "In the neural network playground, pick a dataset, change the number of layers or neurons per layer, and record a loss curve.", zh: "在神经网络练习工具里，选一个数据集，改变网络层数或每层神经元数，记一次损失曲线。" },
          { en: "Change the learning rate and record again.", zh: "再改学习率，记一次。" },
          { en: "State which change made the clearest difference, with screenshots.", zh: "写明哪一次改动带来的差别最明显，并截图。" },
        ],
      },
    ],
    submit: {
      en: "Practice record sheet: the two-row accuracy table and screenshots from Part A, the two loss-curve screenshots from Part B, two or three sentences describing each, and your AI use statement.",
      zh: "实践记录单：Part A 的两行准确率对比表与截图，Part B 的两张损失曲线截图，各配两三句现象描述，以及 AI 使用声明。",
    },
    grading: [
      { item: { en: "Process evidence", zh: "过程证据" }, points: "2", look: { en: "Screenshots match the numbers in the table and show your own work", zh: "截图与表格数字一致，能看出是本人操作" } },
      { item: { en: "Comparison and presentation", zh: "对比与呈现" }, points: "2", look: { en: "Records before and after each change, with the difference clearly marked", zh: "改动前后各有记录，变化被清楚标出" } },
      { item: { en: "Explanation", zh: "原因分析" }, points: "1", look: { en: "States a cause, such as “with little or noisy data, training looks good but testing is poor”, rather than only listing numbers", zh: "能说出“数据少或有噪声时，训练好、测试差”这类因果，而不是只写数字" } },
    ],
    ai: {
      en: "Numbers and screenshots must come from your own work. You may ask DeepSeek to explain the word “overfitting”, but the analysis must describe your own observations.",
      zh: "数字和截图必须来自本人操作。可以让 DeepSeek 帮忙解释“过拟合”这个词，但分析要写自己的观察。",
    },
    pitfalls: [
      { en: "Swapping the training and test numbers.", zh: "训练集和测试集的数字写反。" },
      { en: "Changing only one parameter but claiming to compare two.", zh: "只调了一个参数却宣称对比了两个。" },
      { en: "Changing several conditions at once, so you cannot tell which one mattered. Change one thing at a time.", zh: "改了多个条件再对比，说不清是谁起了作用。一次只改一个。" },
    ],
  },
  {
    id: 3,
    title: { en: "Fact-checking a large language model", zh: "核查大模型" },
    lectures: [5, 6],
    out: { en: "Wed, Dec 9, after class", zh: "12 月 9 日 周三课后" },
    due: { en: "Mon, Dec 14, before class", zh: "12 月 14 日 周一上课前" },
    overview: {
      en: "This is the most important assignment of the course. It trains the core skills of the open LLM test in the final exam: iterating on prompts, checking outputs, and recognizing limits. You will have DeepSeek produce content, then check it line by line like a reviewer. You do not need to write or read any code.",
      zh: "这是全课最关键的一次作业，练期末开放应用测试里的核心能力：提示词迭代、核查输出、识别边界。你要让 DeepSeek 产出内容，然后像审稿人一样逐条核查它。整个作业不需要写代码，也不需要读代码。",
    },
    tasks: [
      {
        title: { en: "Part A. One task, four prompts", zh: "Part A　同一件事，四种问法" },
        note: { en: "Lecture 5 task, produces the material to check", zh: "对应第 5 讲任务，用来产生待核查的材料" },
        text: {
          en: "Pick a task, such as “introduce a historical event you are unfamiliar with”. Ask DeepSeek with four kinds of prompts: zero-shot, few-shot, with constraints, and with an example. Briefly compare the outputs.",
          zh: "选一个任务，例如“介绍一个你不熟悉的历史事件”，分别用零样本、少样本、加约束、给例子四种提示词问 DeepSeek，简要比较输出质量。",
        },
      },
      {
        title: { en: "Part B. Check every sentence", zh: "Part B　逐句核查" },
        note: { en: "Core", zh: "核心" },
        steps: [
          { en: "From Part A, pick the output you trust least.", zh: "从 Part A 里挑出你觉得最不可靠的一份输出。" },
          { en: "Mark each sentence as correct, wrong, or cannot tell.", zh: "逐句标注：对、错、无法判断。" },
          { en: "For each wrong or uncertain sentence, check an authoritative source and write down the source and your conclusion.", zh: "错的和无法判断的句子，用权威来源核查，写下来源名称和你的结论。" },
          { en: "Classify each error: fabricated fact, outdated information, logical error, or other.", zh: "写出你发现的错误属于哪类：事实编造、过时信息、逻辑错误、其他。" },
        ],
      },
      {
        title: { en: "Part C. Turn a vague request into a clear one", zh: "Part C　把一个说不清的需求问清楚" },
        note: { en: "Prompt iteration on a text task", zh: "提示词迭代，用文字任务练" },
        steps: [
          { en: "Pick a task with specific requirements, such as “rewrite a passage for primary school pupils, in at most 100 characters, keeping three key points”.", zh: "选一个有具体要求的任务，例如“把一段话改写成适合小学生读的版本，不超过 100 字，保留三个关键信息”。" },
          { en: "Ask DeepSeek with one casual sentence first. Then, based on its output, rewrite the prompt. Iterate at least 2 rounds.", zh: "先用一句随口的话问 DeepSeek，再根据它的输出，改写提示词，至少迭代 2 轮。" },
          { en: "For each round, record what you changed in the prompt, how the output changed, and whether it met your requirements.", zh: "每一轮记下：你改了提示词里的什么，输出因此有什么变化，是否达到了你的要求。" },
          { en: "Write one sentence: how do you judge that it met the requirements?", zh: "写一句：你怎么判断它达到了要求。" },
        ],
      },
      {
        title: { en: "Part D. Optional, not graded", zh: "Part D　选做，不计分" },
        steps: [
          { en: "Use a text-to-image or OCR tool, mark the errors in its output, and guess where they come from.", zh: "用文生图或 OCR 工具，标注输出里的错误并猜错误来源。" },
          { en: "Exam warm-up: following the format of the final open test, use DeepSeek to go through one full round of “state the requirement, get a result, check the result, create a share link and take a screenshot”.", zh: "考前适应：按期末开放测试的形式，用 DeepSeek 完整走一次“提出要求、拿到结果、检查结果、生成分享链接并截图”的流程。" },
        ],
      },
    ],
    submit: {
      en: "Practice record sheet: the four prompts and comparison table from Part A, the sentence-by-sentence check table from Part B, and the prompt iteration log from Part C, and your AI use statement.",
      zh: "实践记录单：Part A 的四种提示词与对比表，Part B 的逐句核查表，Part C 的提示词迭代记录，AI 使用声明。",
    },
    grading: [
      { item: { en: "Chain of evidence", zh: "核查的证据链" }, points: "2", look: { en: "Wrong sentences are backed by authoritative sources, not “I think it is wrong”", zh: "错误句子有权威来源支撑，不是“我觉得不对”" } },
      { item: { en: "Error analysis", zh: "错误分析" }, points: "1", look: { en: "Errors are classified sensibly, with a reason why the model behaves this way", zh: "错误归类合理，指出了模型为什么会这样" } },
      { item: { en: "Prompt iteration", zh: "提示词迭代" }, points: "1", look: { en: "Each change has a purpose, and you can explain why the output improved or not, and how you judged that it met the requirements", zh: "每轮改动有目的，能说清输出为什么变好或没变好，以及怎么判断达到了要求" } },
      { item: { en: "Limits of use", zh: "使用边界" }, points: "1", look: { en: "You can name the parts of this kind of task where DeepSeek cannot be trusted directly", zh: "能说出这类任务哪些地方不能直接信任 DeepSeek" } },
    ],
    gradingNote: {
      en: "We grade how thoroughly you check, not how well DeepSeek answers. Finding one real error scores higher than an output that is entirely correct.",
      zh: "评分不看 DeepSeek 答得好不好，只看你核查得扎不扎实。找到一个真实的错误，比一份全对的输出得分更高。",
    },
    ai: {
      en: "This assignment is about using AI. What needs to be your own is the analysis: the conclusions of your checks and the error classification must be written by you.",
      zh: "这个作业本身就是在用 AI。需要 AI 声明的是你自己的分析：核查结论和错误归类必须是本人写的。",
    },
    pitfalls: [
      { en: "Writing “this sentence is correct” without a source.", zh: "只写“这句话对”，没有来源。" },
      { en: "Citing another AI's answer instead of an authoritative source.", zh: "来源是另一个 AI 的回答，而不是权威资料。" },
      { en: "Rewording the prompt without adding any new constraint, so the output does not really change.", zh: "提示词只是换了说法，没有加入新的约束，输出也就没有实质变化。" },
      { en: "Judging “met the requirements” by feel, without checking each requirement you wrote down at the start.", zh: "判断“达到要求”只凭感觉，没有对照自己最初写下的要求逐条检查。" },
    ],
  },
  {
    id: 4,
    title: { en: "My AI learning map", zh: "我的 AI 学习地图" },
    lectures: [7, 8],
    out: { en: "Mon, Dec 14, after class", zh: "12 月 14 日 周一课后" },
    due: { en: "The day before the final lab exam", zh: "期末机房考试前一天" },
    overview: {
      en: "Look back on the four weeks, summarize what you learned, and plan your study for the courses that follow. Also give your draft breakdown of an agent to your group as material for the group report.",
      zh: "回顾这四周，总结自己的收获，并为后续的专业课做一份学习计划。同时把智能体拆解的个人草稿交给小组，作为分组报告的素材。",
    },
    tasks: [
      {
        title: { en: "Part A. Draft of an agent's task chain", zh: "Part A　智能体任务链草稿" },
        note: { en: "Completion check, not graded separately", zh: "完成性检查，不单独计分" },
        text: {
          en: "Pick a real AI agent product. Draw the tools it calls, how it gathers information, how it decides, and how it reports back while completing one task. Bring this draft to your group, where it becomes part of the group report.",
          zh: "选一个真实的 AI 智能体产品，画出它完成一次任务时调用了哪些工具、怎么获取信息、怎么做决定、怎么反馈。这份草稿带到小组里合并成分组报告的一部分。",
        },
      },
      {
        title: { en: "Part B. Learning summary and next steps", zh: "Part B　学习总结与后续计划" },
        note: { en: "Graded core", zh: "计分核心" },
        steps: [
          { en: "The three most important things you learned in these four weeks.", zh: "这四周你学到的最重要的三件事。" },
          { en: "One example of an idea you held that changed.", zh: "一个你原来的想法被改变的例子。" },
          { en: "At least 3 concrete ways you will keep up with AI, such as specific paper sites, courses, communities, or projects.", zh: "至少 3 条你准备用来持续跟踪 AI 前沿的具体途径，例如具体的论文网站、课程、社区或实践项目。" },
          { en: "How these connect to the major courses that follow.", zh: "说明这些途径和哪几门后续专业课对应。" },
        ],
        text: { en: "Write a short essay of 300 to 500 characters (Chinese) covering:", zh: "写 300 到 500 字的短文，包含：" },
      },
    ],
    submit: {
      en: "The task-chain diagram from Part A, the essay from Part B, and your AI use statement.",
      zh: "Part A 的任务链图，Part B 的短文，AI 使用声明。",
    },
    grading: [
      { item: { en: "Concrete takeaways", zh: "收获具体" }, points: "2", look: { en: "Describes specific things that happened in this course, not “I am more interested in AI now”", zh: "写的是课程里发生过的具体事，不是“我对 AI 更感兴趣了”" } },
      { item: { en: "Actionable paths", zh: "途径可执行" }, points: "2", look: { en: "At least 3 concrete paths with clear names that someone could follow", zh: "至少 3 条具体途径，名称明确，能让人照着去做" } },
      { item: { en: "Link to the curriculum", zh: "与课程对应" }, points: "1", look: { en: "Connects to later major courses in line with the program curriculum", zh: "能说出与后续专业课的对应关系，且与培养方案相符" } },
    ],
    gradingNote: { en: "Graded by the rubric. Submitting does not earn full marks by itself.", zh: "按量规评分，不是提交即满分。" },
    ai: {
      en: "You may use DeepSeek to organize your thoughts or polish wording. But how your thinking changed and what you plan to do can only come from you. Vague writing loses points.",
      zh: "允许用 DeepSeek 帮你整理思路或润色。但“你的想法怎么改变的”和“你准备怎么做”只有本人能写，写得空泛会被扣分。",
    },
    pitfalls: [
      { en: "Listing only vague paths like “follow some accounts, read the news”.", zh: "只列“关注公众号、看新闻”这类泛泛的途径。" },
      { en: "Getting the names or semesters of later courses wrong. Check the program curriculum.", zh: "后续课程的名称和学期写错。以培养方案为准。" },
      { en: "An essay that reads like a template, with no specific details from class.", zh: "整篇像模板，没有任何课堂上的具体细节。" },
    ],
  },
];

export const aiRecord: L[] = [
  { en: "Record the date, and whether “DeepThink” was turned on.", zh: "记下日期，以及是否打开了“深度思考”。" },
  { en: "Keep the conversation: a share link, or screenshots of the whole exchange.", zh: "保留对话：分享链接，或全程截图。" },
  { en: "Never enter your name, student ID, phone number, or other personal information in the chat.", zh: "不在对话里输入姓名、学号、手机号等个人信息。" },
  { en: "Include a one-sentence AI use statement: which steps used DeepSeek and which you did yourself.", zh: "提交时写一句 AI 使用声明：哪一步用了 DeepSeek，哪一步是自己做的。" },
];

export const policies: { title: L; text: L }[] = [
  {
    title: { en: "Real work", zh: "真实操作" },
    text: { en: "Practice records must come from your own real work. Copying, having someone else do the work, or faking the process record will be handled under university rules.", zh: "实践记录必须基于本人真实操作。抄袭、代做、伪造过程记录按学校规定处理。" },
  },
  {
    title: { en: "Using AI", zh: "AI 使用" },
    text: { en: "We encourage responsible use of AI tools, with an honest statement of how and how much you used them. An honest statement never costs points. Hiding AI use does.", zh: "鼓励规范使用 AI 工具，如实声明参与方式与程度。声明如实不扣分，隐瞒才扣分。" },
  },
  {
    title: { en: "Late work", zh: "迟交" },
    text: { en: "A late assignment earns half credit. A missing assignment earns zero.", zh: "迟交该次减半计分，未交计零。" },
  },
  {
    title: { en: "Regrade requests", zh: "成绩复核" },
    text: { en: "Submit a written request within 7 days after grades are posted, naming the rubric item and your reason.", zh: "成绩公布后 7 天内可书面提出，写明量规哪一项、依据是什么。" },
  },
  {
    title: { en: "Submission", zh: "提交方式" },
    text: { en: "Submit all work on Xuexitong, using the standard practice record sheet: screenshots, observations, and error analysis.", zh: "所有作业在学习通提交，使用统一的“实践记录单”模板：截图、现象描述、错误分析三栏。" },
  },
];
