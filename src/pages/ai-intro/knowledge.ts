import type { ToolId } from "./content";

type L = { zh: string; en: string };
export type Topic = {
  id: number; title: L; question: L; concepts: L[]; outcome: L; check: L;
  tools: ToolId[]; x: number; y: number;
};
const l = (zh: string, en: string): L => ({ zh, en });

export const learningGoals = [
  l("理解与分析：描述人工智能的主要方法，用“感知—决策—行动”拆解应用，借助无代码工具比较数据、提示词、奖励与输入条件对结果的影响。", "Understand and analyze: describe major AI approaches, break applications into perception, decision and action, and use no-code tools to compare the effects of data, prompts, rewards and inputs."),
  l("判断与责任：核查模型输出，辨别隐私、版权、偏见、安全与学术诚信问题，说明适用条件并负责任地使用工具。", "Judge and act responsibly: verify model outputs, recognize privacy, copyright, bias, safety and academic-integrity issues, and explain appropriate conditions of use."),
  l("规划与持续学习：联系后续专业课程，总结自己的实践证据，制定具体的学习计划与前沿跟踪途径。", "Plan and keep learning: connect this course to later study, reflect on evidence from your practice, and make a concrete learning and AI-tracking plan."),
];

export const topics: Topic[] = [
  {
    id: 1, x: 230, y: 10,
    title: l("人工智能全景", "The AI landscape"),
    question: l("什么样的任务可以交给人工智能？", "Which tasks can AI help with?"),
    concepts: [l("人工智能、机器学习与深度学习", "AI, machine learning and deep learning"), l("发展脉络与代表性应用", "History and representative applications"), l("感知—决策—行动", "Perception, decision and action")],
    outcome: l("用一个生活实例说明三类概念的范围，并拆解系统的输入、判断与行动。", "Use an everyday example to explain the scope of these concepts and identify inputs, decisions and actions."),
    check: l("一台按固定规则工作的机器和一个从数据中学习的模型，有哪些不同？", "How does a machine following fixed rules differ from a model that learns from data?"),
    tools: ["circles"],
  },
  {
    id: 2, x: 20, y: 140,
    title: l("搜索与决策", "Search and decisions"),
    question: l("机器怎样在多种可能中选择行动？", "How does a machine choose among possible actions?"),
    concepts: [l("广度优先、深度优先与 A* 搜索", "Breadth-first, depth-first and A* search"), l("博弈中的对手与选择", "Opponents and choices in games"), l("奖励反馈与强化学习", "Reward feedback and reinforcement learning")],
    outcome: l("区分搜索规划与路径执行，比较搜索代价和路径长度，观察奖励如何改变行动。", "Distinguish planning from execution, compare search effort and path length, and observe how rewards change actions."),
    check: l("在完整地图中规划最短路线与在未知环境中依靠奖励学习，分别需要哪些信息？", "What information is needed to plan a shortest route on a complete map, and to learn through rewards in an unfamiliar environment?"),
    tools: ["maze", "puzzle", "grid"],
  },
  {
    id: 3, x: 440, y: 140,
    title: l("机器学习", "Machine learning"),
    question: l("机器怎样利用已有例子作出预测？", "How does a machine learn to predict from examples?"),
    concepts: [l("数据、特征与标签", "Data, features and labels"), l("决策树与最近邻", "Decision trees and nearest neighbors"), l("训练、测试与过拟合", "Training, testing and overfitting")],
    outcome: l("搭建数据—模型—评价工作流，用训练与测试结果的差异分析过拟合。", "Build a data–model–evaluation workflow and use training and test results to analyze overfitting."),
    check: l("训练准确率很高、测试准确率较低时，还需要检查什么？", "What should you check when training accuracy is high but test accuracy is lower?"),
    tools: ["ml"],
  },
  {
    id: 4, x: 440, y: 260,
    title: l("神经网络", "Neural networks"),
    question: l("多层神经元怎样通过训练改善判断？", "How do layers of neurons improve their predictions through training?"),
    concepts: [l("神经元、层与表示", "Neurons, layers and representations"), l("损失、学习率与训练过程", "Loss, learning rate and training"), l("深度学习与图像识别", "Deep learning and image recognition")],
    outcome: l("有控制地改变网络结构或学习率，用分类边界和两条损失曲线解释变化。", "Change structure or learning rate in a controlled comparison and explain the decision boundary and two loss curves."),
    check: l("增加层数后测试效果变差，哪些观察能帮助你解释原因？", "What observations could explain worse test performance after adding layers?"),
    tools: ["nn", "evolve"],
  },
  {
    id: 5, x: 230, y: 380,
    title: l("大模型与提示词", "LLMs and prompts"),
    question: l("语言模型怎样生成回答，提示词怎样影响它？", "How do language models generate answers, and how do prompts affect them?"),
    concepts: [l("逐步生成与上下文", "Step-by-step generation and context"), l("注意力与 Transformer", "Attention and Transformers"), l("任务、背景、约束、示例与格式", "Task, background, constraints, examples and format")],
    outcome: l("保留完整提示词和输出，按一致的标准比较四种提示方式，并核查具体事实。", "Keep prompts and outputs, compare four prompting approaches using consistent criteria, and verify specific facts."),
    check: l("回答更流畅、更符合格式时，你会用什么证据判断内容是否可靠？", "When an answer is more fluent and better formatted, what evidence would you use to judge its reliability?"),
    tools: ["prompt"],
  },
  {
    id: 6, x: 20, y: 380,
    title: l("生成式 AI 与多模态", "Generative AI and modalities"),
    question: l("文字、图像等不同形式的信息怎样参与生成？", "How do text, images and other modalities take part in generation?"),
    concepts: [l("生成与识别", "Generation and recognition"), l("扩散与逐步去噪", "Diffusion and gradual denoising"), l("图文理解、偏差与版权", "Image–text understanding, bias and copyright")],
    outcome: l("直观解释逐步去噪，比较生成内容与任务约束，记录可核查的错误与来源。", "Explain gradual denoising intuitively, compare generated content with task constraints, and record verifiable errors and sources."),
    check: l("一张生成图片看起来真实时，你会怎样检查它的来源与使用条件？", "How would you check the source and conditions of use of a realistic generated image?"),
    tools: ["denoise"],
  },
  {
    id: 7, x: 230, y: 510,
    title: l("智能体系统", "Agent systems"),
    question: l("模型怎样借助工具完成一个连续任务？", "How can a model use tools to complete a multi-step task?"),
    concepts: [l("目标、计划与工具调用", "Goals, plans and tool use"), l("执行、反馈与修正", "Execution, feedback and revision"), l("最小权限与人工确认", "Least privilege and human confirmation")],
    outcome: l("绘制真实产品的任务链，标出模型、工具与环境的作用，以及需要人工确认的操作。", "Draw a real product's task chain, identify the roles of model, tools and environment, and mark actions requiring human confirmation."),
    check: l("允许智能体查资料、修改文件和发送消息时，你会分别设置什么权限？", "Which permissions would you give an agent for research, file editing and sending messages?"),
    tools: ["agent", "swarm"],
  },
  {
    id: 8, x: 440, y: 510,
    title: l("安全、伦理与诚信", "Safety, ethics and integrity"),
    question: l("怎样判断结果可信，并为使用过程负责？", "How do we judge reliability and take responsibility for use?"),
    concepts: [l("幻觉、偏见与事实核查", "Hallucinations, bias and fact checking"), l("隐私、提示词攻击与权限", "Privacy, prompt attacks and permissions"), l("来源、AI 声明与学习计划", "Sources, AI disclosure and a learning plan")],
    outcome: l("用权威来源逐句核查，说明错误原因与使用边界，形成个人学习计划。", "Check claims against authoritative sources, explain errors and limits of use, and make a personal learning plan."),
    check: l("多次生成的答案一致时，你还可以到哪些独立来源核实？", "When repeated generated answers agree, which independent sources could verify them?"),
    tools: ["factcheck"],
  },
];

export const relations = [
  { from: 1, to: 2, text: l("搜索与决策是人工智能解决任务的一类方法。", "Search and decision making are one family of AI approaches.") },
  { from: 1, to: 3, text: l("机器学习属于人工智能，借助数据学习规律。", "Machine learning is part of AI and learns patterns from data.") },
  { from: 3, to: 4, text: l("深度学习属于机器学习，采用多层神经网络学习表示。", "Deep learning is part of machine learning and uses multi-layer neural networks to learn representations.") },
  { from: 4, to: 5, text: l("现代大语言模型以深度神经网络为基础，注意力帮助利用上下文。", "Modern LLMs build on deep neural networks; attention helps use context.") },
  { from: 5, to: 6, text: l("语言生成与图像生成都属于生成式 AI；不同任务可以采用不同模型机制。", "Language and image generation are both generative AI; their model mechanisms can differ.") },
  { from: 5, to: 7, text: l("大模型可以参与智能体的计划与工具选择，系统通过反馈继续执行。", "An LLM can help an agent plan and select tools, with feedback guiding execution.") },
  { from: 2, to: 7, text: l("目标、搜索规划和奖励反馈为理解智能体行动提供基础。", "Goals, search planning and reward feedback help explain agent behavior.") },
  { from: 7, to: 8, text: l("工具调用会产生实际影响，需要权限控制、核查与人工确认。", "Tool use has real effects and calls for permissions, checking and human confirmation.") },
];

export const studyPaths = [
  { topic: l("搜索与任务求解", "Search and problem solving"), courses: l("数据结构与算法、离散数学", "Data Structures and Algorithms; Discrete Mathematics"), action: l("先比较找路策略，再学习它们的表示方式与效率分析。", "Compare route-planning strategies now, then study their representations and efficiency.") },
  { topic: l("数据与模型评价", "Data and model evaluation"), courses: l("人工智能的数学基础、机器学习方法与应用、模式识别与数据挖掘", "Mathematical Foundations of AI; Machine Learning Methods and Applications; Pattern Recognition and Data Mining"), action: l("保留训练与测试对照实验，继续学习评价指标与泛化。", "Keep training–test comparisons and later study evaluation metrics and generalization.") },
  { topic: l("深度学习与多模态", "Deep learning and modalities"), courses: l("深度学习、计算机视觉、自然语言处理", "Deep Learning; Computer Vision; Natural Language Processing"), action: l("记录调参和图文核查实例，进一步学习模型结构与训练。", "Record tuning and image–text checking examples before studying architectures and training.") },
  { topic: l("大模型与智能体", "LLMs and agents"), courses: l("生成式AI与大模型原理、智能机器人与具身智能", "Generative AI and Large Model Principles; Intelligent Robotics and Embodied Intelligence"), action: l("用任务链追踪计划、工具和反馈，再学习系统实现与环境交互。", "Trace planning, tools and feedback before studying system implementation and environmental interaction.") },
  { topic: l("可信与负责任的使用", "Trustworthy and responsible use"), courses: l("人工智能安全导论", "Introduction to AI Safety"), action: l("持续积累来源核查、隐私和权限案例，随技术变化修订使用规范。", "Collect source-checking, privacy and permission cases and revise your practices as technology changes.") },
];
