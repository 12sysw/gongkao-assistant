export type SkillModuleId =
  | 'verbal'
  | 'quantitative'
  | 'reasoning'
  | 'data-analysis'
  | 'general-knowledge'
  | 'essay';

export interface CivilServiceSkillNode {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  targetQuestions: number;
  suggestedMinutes: number;
  teacherMode: '基础讲解' | '行测速解' | '申论审题' | '错因复盘';
}

export interface CivilServiceSkillModule {
  id: SkillModuleId;
  name: string;
  shortName: string;
  description: string;
  typeKeywords: string[];
  accent: 'blue' | 'violet' | 'amber' | 'emerald' | 'rose' | 'cyan';
  nodes: CivilServiceSkillNode[];
}

/**
 * 公考小助手自己的能力树分类。
 *
 * 结构参考公开的技能树/学习追踪项目，但节点、文案和匹配规则均按本项目
 * 的题库字段、错题闭环及花生十三公开方法体系重新设计，不复制第三方源码。
 */
export const civilServiceSkillTree: CivilServiceSkillModule[] = [
  {
    id: 'data-analysis',
    name: '资料分析',
    shortName: '资料',
    description: '先识别题型与时间口径，再用估算、截位和份数思维提速。',
    typeKeywords: ['资料分析'],
    accent: 'blue',
    nodes: [
      {
        id: 'data-growth-rate',
        name: '增长率',
        description: '增长率计算、比较与混合增长率。',
        keywords: ['增长率', '增速', '同比', '环比', '百分点'],
        targetQuestions: 20,
        suggestedMinutes: 18,
        teacherMode: '行测速解',
      },
      {
        id: 'data-base-period',
        name: '基期量',
        description: '现期、基期与间隔基期的快速换算。',
        keywords: ['基期量', '基期', '现期量', '间隔基期'],
        targetQuestions: 16,
        suggestedMinutes: 15,
        teacherMode: '行测速解',
      },
      {
        id: 'data-growth-amount',
        name: '增长量与 415 份数法',
        description: '识别增长量题，选择公式、估算或 415 份数法。',
        keywords: ['增长量', '增加量', '415', '份数法'],
        targetQuestions: 16,
        suggestedMinutes: 15,
        teacherMode: '行测速解',
      },
      {
        id: 'data-proportion',
        name: '比重',
        description: '现期比重、基期比重和两期比重变化。',
        keywords: ['比重', '占比', '两期比重', '比重变化'],
        targetQuestions: 20,
        suggestedMinutes: 18,
        teacherMode: '行测速解',
      },
      {
        id: 'data-average-multiple',
        name: '平均数与倍数',
        description: '平均数增长率、倍数与翻番关系。',
        keywords: ['平均数', '均值', '倍数', '是几倍', '翻番'],
        targetQuestions: 16,
        suggestedMinutes: 15,
        teacherMode: '行测速解',
      },
      {
        id: 'data-estimation',
        name: '截位直除与估算',
        description: '根据选项差距选择截位、直除和百化分。',
        keywords: ['截位直除', '截位', '直除', '估算', '百化分', '首数法'],
        targetQuestions: 12,
        suggestedMinutes: 12,
        teacherMode: '行测速解',
      },
    ],
  },
  {
    id: 'quantitative',
    name: '数量关系',
    shortName: '数量',
    description: '识别模型优先于硬算，先拿工程、行程、利润等高性价比题。',
    typeKeywords: ['数量关系'],
    accent: 'violet',
    nodes: [
      {
        id: 'quant-engineering',
        name: '工程问题',
        description: '赋总量、效率比例、合作与轮换。',
        keywords: ['工程问题', '工作效率', '合作完成', '轮流工作'],
        targetQuestions: 12,
        suggestedMinutes: 15,
        teacherMode: '行测速解',
      },
      {
        id: 'quant-travel',
        name: '行程问题',
        description: '相遇追及、流水行船和多次相遇。',
        keywords: ['行程问题', '相遇', '追及', '流水行船', '速度'],
        targetQuestions: 16,
        suggestedMinutes: 18,
        teacherMode: '行测速解',
      },
      {
        id: 'quant-profit',
        name: '利润问题',
        description: '折扣、定价、利润率与分段销售。',
        keywords: ['利润', '利润率', '折扣', '定价', '售价', '成本'],
        targetQuestions: 12,
        suggestedMinutes: 15,
        teacherMode: '行测速解',
      },
      {
        id: 'quant-combinatorics',
        name: '排列组合与概率',
        description: '分类分步、捆绑插空、概率与期望。',
        keywords: ['排列组合', '排列', '组合', '概率', '插空', '捆绑'],
        targetQuestions: 16,
        suggestedMinutes: 20,
        teacherMode: '基础讲解',
      },
      {
        id: 'quant-inclusion',
        name: '容斥与最值',
        description: '两集合、三集合、和定最值及最不利原则。',
        keywords: ['容斥', '最值', '最不利', '至少', '至多', '集合'],
        targetQuestions: 12,
        suggestedMinutes: 15,
        teacherMode: '行测速解',
      },
      {
        id: 'quant-geometry-age',
        name: '几何与年龄',
        description: '规则图形、比例缩放与年龄差不变。',
        keywords: ['几何', '面积', '体积', '年龄问题', '年龄差'],
        targetQuestions: 12,
        suggestedMinutes: 15,
        teacherMode: '基础讲解',
      },
    ],
  },
  {
    id: 'verbal',
    name: '言语理解',
    shortName: '言语',
    description: '围绕语境、文段结构与作者意图建立稳定判断。',
    typeKeywords: ['言语理解', '言语'],
    accent: 'amber',
    nodes: [
      {
        id: 'verbal-fill',
        name: '逻辑填空',
        description: '关联词、解释关系、感情色彩与搭配。',
        keywords: ['逻辑填空', '选词填空', '成语', '词语填空'],
        targetQuestions: 24,
        suggestedMinutes: 20,
        teacherMode: '基础讲解',
      },
      {
        id: 'verbal-main-idea',
        name: '中心理解',
        description: '转折、因果、总分和对策结构。',
        keywords: ['中心理解', '主旨', '意在说明', '意在强调', '概括最准确'],
        targetQuestions: 24,
        suggestedMinutes: 20,
        teacherMode: '行测速解',
      },
      {
        id: 'verbal-detail',
        name: '细节判断',
        description: '偷换概念、时态、范围和因果关系。',
        keywords: ['细节判断', '符合文意', '理解正确', '理解不正确'],
        targetQuestions: 16,
        suggestedMinutes: 16,
        teacherMode: '基础讲解',
      },
      {
        id: 'verbal-order',
        name: '语句排序',
        description: '首句判断、捆绑句群与时空逻辑。',
        keywords: ['语句排序', '句子排序', '排列组合最恰当'],
        targetQuestions: 12,
        suggestedMinutes: 15,
        teacherMode: '行测速解',
      },
      {
        id: 'verbal-insertion',
        name: '语句衔接',
        description: '话题一致、指代衔接与上下文逻辑。',
        keywords: ['语句衔接', '填入横线', '接下来最可能', '下文'],
        targetQuestions: 12,
        suggestedMinutes: 15,
        teacherMode: '基础讲解',
      },
    ],
  },
  {
    id: 'reasoning',
    name: '判断推理',
    shortName: '判断',
    description: '先识别关系和规则，再做形式化推理与选项验证。',
    typeKeywords: ['判断推理'],
    accent: 'emerald',
    nodes: [
      {
        id: 'reasoning-graphic',
        name: '图形推理',
        description: '位置、样式、数量、属性与空间重构。',
        keywords: ['图形推理', '九宫格', '图形规律', '空间重构', '折纸盒'],
        targetQuestions: 24,
        suggestedMinutes: 20,
        teacherMode: '错因复盘',
      },
      {
        id: 'reasoning-definition',
        name: '定义判断',
        description: '主体、客体、目的、方式和结果要素。',
        keywords: ['定义判断', '属于上述定义', '不属于上述定义'],
        targetQuestions: 20,
        suggestedMinutes: 18,
        teacherMode: '行测速解',
      },
      {
        id: 'reasoning-analogy',
        name: '类比推理',
        description: '语义、逻辑、语法和常识关系层级。',
        keywords: ['类比推理', '关系最为相似', '逻辑关系'],
        targetQuestions: 20,
        suggestedMinutes: 15,
        teacherMode: '行测速解',
      },
      {
        id: 'reasoning-translation',
        name: '翻译推理',
        description: '充分必要、且或、真假与集合关系。',
        keywords: ['翻译推理', '充分条件', '必要条件', '如果那么', '只有才', '真假推理'],
        targetQuestions: 16,
        suggestedMinutes: 18,
        teacherMode: '基础讲解',
      },
      {
        id: 'reasoning-strengthen',
        name: '加强与削弱',
        description: '论点论据、搭桥、因果倒置与他因。',
        keywords: ['加强', '削弱', '支持上述论证', '质疑上述论证', '最能解释'],
        targetQuestions: 24,
        suggestedMinutes: 22,
        teacherMode: '错因复盘',
      },
      {
        id: 'reasoning-arrangement',
        name: '分析推理',
        description: '排序、分组、匹配与条件代入。',
        keywords: ['分析推理', '排序', '分组', '匹配', '必然为真', '可能为真'],
        targetQuestions: 16,
        suggestedMinutes: 20,
        teacherMode: '基础讲解',
      },
    ],
  },
  {
    id: 'general-knowledge',
    name: '常识判断',
    shortName: '常识',
    description: '以高频主题和错题联想为主，避免无边界背诵。',
    typeKeywords: ['常识判断', '常识'],
    accent: 'rose',
    nodes: [
      {
        id: 'common-politics-law',
        name: '政治与法律',
        description: '理论、宪法、行政法、民法和时政关联。',
        keywords: ['政治', '法律', '宪法', '行政法', '民法', '刑法'],
        targetQuestions: 20,
        suggestedMinutes: 15,
        teacherMode: '基础讲解',
      },
      {
        id: 'common-economy',
        name: '经济常识',
        description: '宏观政策、市场机制、金融与财政。',
        keywords: ['经济', '财政', '货币', '金融', '宏观调控', '市场'],
        targetQuestions: 12,
        suggestedMinutes: 12,
        teacherMode: '基础讲解',
      },
      {
        id: 'common-history-culture',
        name: '历史人文',
        description: '历史线索、文学艺术与传统文化。',
        keywords: ['历史', '文学', '文化', '诗词', '朝代', '艺术'],
        targetQuestions: 20,
        suggestedMinutes: 15,
        teacherMode: '错因复盘',
      },
      {
        id: 'common-science',
        name: '科技与生活',
        description: '基础物理化学生物、生活安全与科技前沿。',
        keywords: ['科技', '物理', '化学', '生物', '生活常识', '航天'],
        targetQuestions: 20,
        suggestedMinutes: 15,
        teacherMode: '基础讲解',
      },
      {
        id: 'common-geography',
        name: '地理国情',
        description: '自然地理、中国地理、资源环境与国情。',
        keywords: ['地理', '国情', '气候', '地形', '资源', '环境'],
        targetQuestions: 12,
        suggestedMinutes: 12,
        teacherMode: '基础讲解',
      },
    ],
  },
  {
    id: 'essay',
    name: '申论',
    shortName: '申论',
    description: '审题—找点—加工—表达—复盘，AI 只提供框架与修改建议。',
    typeKeywords: ['申论'],
    accent: 'cyan',
    nodes: [
      {
        id: 'essay-review-question',
        name: '审题',
        description: '明确对象、任务、范围、身份和字数限制。',
        keywords: ['审题', '作答要求', '根据给定资料', '概括', '分析'],
        targetQuestions: 12,
        suggestedMinutes: 12,
        teacherMode: '申论审题',
      },
      {
        id: 'essay-find-points',
        name: '找点',
        description: '围绕问题、原因、影响、对策提取材料信息。',
        keywords: ['找点', '要点', '问题', '原因', '影响', '对策'],
        targetQuestions: 16,
        suggestedMinutes: 20,
        teacherMode: '申论审题',
      },
      {
        id: 'essay-process',
        name: '归纳加工',
        description: '同义合并、异类分条、上位概括与逻辑排序。',
        keywords: ['归纳', '加工', '分类', '合并', '条理'],
        targetQuestions: 16,
        suggestedMinutes: 20,
        teacherMode: '错因复盘',
      },
      {
        id: 'essay-expression',
        name: '规范表达',
        description: '关键词前置、总分结构、动宾搭配和字数控制。',
        keywords: ['规范表达', '语言简洁', '条理清晰', '字数'],
        targetQuestions: 16,
        suggestedMinutes: 20,
        teacherMode: '错因复盘',
      },
      {
        id: 'essay-official-doc',
        name: '公文写作',
        description: '身份、对象、目的、格式与内容结构。',
        keywords: ['公文', '讲话稿', '倡议书', '通知', '调研报告', '发言提纲'],
        targetQuestions: 12,
        suggestedMinutes: 25,
        teacherMode: '申论审题',
      },
      {
        id: 'essay-article',
        name: '大作文结构',
        description: '立意、标题、分论点、论证与首尾呼应。',
        keywords: ['大作文', '文章写作', '议论文', '分论点', '立意'],
        targetQuestions: 10,
        suggestedMinutes: 60,
        teacherMode: '申论审题',
      },
    ],
  },
];
