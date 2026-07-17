import fs from 'fs';
import path from 'path';
import type { HuashengCatalogResult, RagSource, TeacherMode } from '../../shared/ipc';

interface SkillReferenceDefinition {
  id: string;
  title: string;
  category: string;
  file: string;
  keywords: string[];
}

const REFERENCES: SkillReferenceDefinition[] = [
  { id: 'ziliao-fenxi', title: '资料分析全体系', category: '资料分析', file: 'references/ziliao-fenxi.md', keywords: ['资料分析', '增长率', '增长量', '基期', '现期', '比重', '平均数', '倍数', 'ABRX', '415', '截位直除', '假设分配'] },
  { id: 'ziliao-susuan', title: '资料分析速算', category: '资料分析', file: 'references/ziliao-susuan.md', keywords: ['速算', '截位', '直除', '415', '份数', '假设分配', '分数比较', '百化分'] },
  { id: 'ziliao-zonghe', title: '资料综合分析专项', category: '资料分析', file: 'references/ziliao-zonghe.md', keywords: ['综合分析', '资料最后一题', '能推出', '说法正确'] },
  { id: 'shuliang-guanxi', title: '数量关系全题型', category: '数量关系', file: 'references/shuliang-guanxi.md', keywords: ['数量关系', '工程', '行程', '利润', '排列组合', '概率', '容斥', '最值', '年龄', '几何', '牛吃草', '鸡兔同笼'] },
  { id: 'shuliang-gongshi', title: '数量关系公式速查', category: '数量关系', file: 'references/shuliang-gongshi.md', keywords: ['公式', '工程', '行程', '利润', '排列', '组合', '概率', '容斥', '几何'] },
  { id: 'yanyu-lianjie', title: '言语理解全体系', category: '言语理解', file: 'references/yanyu-lianjie.md', keywords: ['言语理解', '逻辑填空', '片段阅读', '中心理解', '语句排序', '语句衔接', '主旨'] },
  { id: 'yanyu-ciyu', title: '高频成语与实词', category: '言语理解', file: 'references/yanyu-ciyu.md', keywords: ['成语', '实词', '词义辨析', '逻辑填空', '搭配'] },
  { id: 'yanyu-zhuanxiang', title: '言语专项突破', category: '言语理解', file: 'references/yanyu-zhuanxiang.md', keywords: ['言语专项', '标题填入', '细节判断', '篇章阅读'] },
  { id: 'panduan-tuili', title: '判断推理全体系', category: '判断推理', file: 'references/panduan-tuili.md', keywords: ['判断推理', '图形推理', '定义判断', '类比推理', '逻辑判断', '翻译推理', '加强', '削弱'] },
  { id: 'panduan-guilv', title: '判断规律速查', category: '判断推理', file: 'references/panduan-guilv.md', keywords: ['规律', '点线角面素', '一笔画', '定义要素', '类比关系'] },
  { id: 'panduan-tuxing', title: '图形推理专项', category: '判断推理', file: 'references/panduan-tuxing.md', keywords: ['图形推理', '平移', '旋转', '叠加', '对称', '立体图形'] },
  { id: 'shenlun', title: '申论全题型', category: '申论', file: 'references/shenlun.md', keywords: ['申论', '归纳概括', '综合分析', '提出对策', '公文', '大作文', '审题', '找点'] },
  { id: 'shenlun-biaoda', title: '申论规范表达', category: '申论', file: 'references/shenlun-biaoda.md', keywords: ['规范表达', '口语', '公文', '金句', '改写'] },
  { id: 'shenlun-sucai', title: '申论素材库', category: '申论', file: 'references/shenlun-sucai.md', keywords: ['素材', '分论点', '乡村振兴', '基层治理', '生态', '文化', '科技'] },
  { id: 'changshi-panduan', title: '常识判断体系', category: '常识判断', file: 'references/changshi-panduan.md', keywords: ['常识判断', '政治', '法律', '经济', '历史', '地理', '科技'] },
  { id: 'strategy', title: '答题顺序与套题复盘', category: '考试策略', file: 'references/strategy.md', keywords: ['答题顺序', '时间分配', '套题', '复盘', '行测策略', '涂卡', '考场'] },
  { id: 'beikao-jihua', title: '备考计划', category: '考试策略', file: 'references/beikao-jihua.md', keywords: ['备考', '计划', '30天', '60天', '90天', '在职', '全职', '冲刺'] },
  { id: 'cuoti-muban', title: '错题归因与复盘', category: '错题复盘', file: 'references/cuoti-muban.md', keywords: ['错题', '错因', '知识盲区', '技巧不熟', '粗心', '时间不够', '复习'] },

  { id: 'shizheng-redian', title: '\u65f6\u653f\u70ed\u70b9\uff08\u9759\u6001\u8d44\u6599\uff09', category: '\u5e38\u8bc6\u5224\u65ad', file: 'references/shizheng-redian.md', keywords: ['\u65f6\u653f', '\u4f1a\u8bae', '\u6218\u7565', '\u65b0\u8d28\u751f\u4ea7\u529b', '\u79d1\u6280\u6210\u5c31'] },
  { id: 'zhenti-shili', title: '\u516c\u5f00\u771f\u9898\u793a\u4f8b', category: '\u7efc\u5408\u793a\u4f8b', file: 'references/zhenti-shili.md', keywords: ['\u771f\u9898\u793a\u4f8b', '\u5b8c\u6574\u89e3\u6790', '\u4e3e\u4e00\u53cd\u4e09'] },
  { id: 'example-ziliao', title: '\u8d44\u6599\u5206\u6790\u7ec3\u4e60', category: '\u5b9e\u6218\u7ec3\u4e60', file: 'examples/ziliao-lianxi.md', keywords: ['\u8d44\u6599\u7ec3\u4e60', '\u8d44\u6599\u5206\u6790\u7ec3\u4e60', '\u51fa\u9898'] },
  { id: 'example-shuliang', title: '\u6570\u91cf\u5173\u7cfb\u7ec3\u4e60', category: '\u5b9e\u6218\u7ec3\u4e60', file: 'examples/shuliang-lianxi.md', keywords: ['\u6570\u91cf\u7ec3\u4e60', '\u6570\u91cf\u5173\u7cfb\u7ec3\u4e60', '\u51fa\u9898'] },
  { id: 'example-yanyu', title: '\u8a00\u8bed\u7406\u89e3\u7ec3\u4e60', category: '\u5b9e\u6218\u7ec3\u4e60', file: 'examples/yanyu-lianxi.md', keywords: ['\u8a00\u8bed\u7ec3\u4e60', '\u903b\u8f91\u586b\u7a7a\u7ec3\u4e60', '\u51fa\u9898'] },
  { id: 'example-panduan', title: '\u5224\u65ad\u63a8\u7406\u7ec3\u4e60', category: '\u5b9e\u6218\u7ec3\u4e60', file: 'examples/panduan-lianxi.md', keywords: ['\u5224\u65ad\u7ec3\u4e60', '\u56fe\u5f62\u63a8\u7406\u7ec3\u4e60', '\u51fa\u9898'] },
  { id: 'example-shenlun', title: '\u7533\u8bba\u7ec3\u4e60', category: '\u5b9e\u6218\u7ec3\u4e60', file: 'examples/shenlun-lianxi.md', keywords: ['\u7533\u8bba\u7ec3\u4e60', '\u7533\u8bba\u9898\u76ee', '\u51fa\u9898'] },
];

const MODE_SEEDS: Record<TeacherMode, string[]> = {
  general: [],
  'huasheng-auto': [],
  'xingce-speed': ['ziliao-fenxi', 'ziliao-susuan', 'shuliang-guanxi', 'strategy'],
  foundation: ['ziliao-fenxi', 'shuliang-guanxi', 'yanyu-lianjie', 'panduan-tuili'],
  essay: ['shenlun', 'shenlun-biaoda'],
  'wrong-review': ['cuoti-muban'],
  planning: ['strategy', 'beikao-jihua'],
};

const MODE_LABELS: Record<TeacherMode, string> = {
  general: '通用 RAG',
  'huasheng-auto': '花生十三·自动识别',
  'xingce-speed': '行测速解',
  foundation: '基础讲解',
  essay: '申论审题',
  'wrong-review': '错因复盘',
  planning: '备考规划',
};

function resolveSkillRoot() {
  const candidates = [
    path.resolve(__dirname, '../../skills/huasheng13'),
    path.resolve(process.cwd(), 'dist/main/skills/huasheng13'),
    path.resolve(process.cwd(), 'src/main/skills/huasheng13'),
  ];
  return candidates.find((candidate) => fs.existsSync(path.join(candidate, 'SKILL.md'))) ?? candidates[0];
}

function readReference(file: string) {
  try {
    return fs.readFileSync(path.join(resolveSkillRoot(), file), 'utf8');
  } catch {
    return '';
  }
}

function splitSections(markdown: string) {
  const starts = [...markdown.matchAll(/^#{1,4}\s+.+$/gm)];
  if (starts.length === 0) return [{ heading: '正文', content: markdown }];
  return starts.map((match, index) => ({
    heading: match[0].replace(/^#+\s*/, '').trim(),
    content: markdown.slice(match.index ?? 0, index + 1 < starts.length ? starts[index + 1].index : markdown.length).trim(),
  }));
}

function matchedTerms(message: string, definition: SkillReferenceDefinition) {
  const normalized = message.toLowerCase();
  return definition.keywords.filter((keyword) => normalized.includes(keyword.toLowerCase()));
}

function selectDefinitions(message: string, mode: TeacherMode) {
  const selected = new Map<string, { definition: SkillReferenceDefinition; score: number; terms: string[] }>();
  MODE_SEEDS[mode].forEach((id, index) => {
    const definition = REFERENCES.find((item) => item.id === id);
    if (definition) selected.set(id, { definition, score: 20 - index, terms: [] });
  });
  for (const definition of REFERENCES) {
    const terms = matchedTerms(message, definition);
    if (terms.length === 0) continue;
    const current = selected.get(definition.id);
    selected.set(definition.id, {
      definition,
      score: (current?.score ?? 0) + terms.length * 10,
      terms: [...new Set([...(current?.terms ?? []), ...terms])],
    });
  }
  if (mode !== 'general' && selected.size === 0) {
    ['strategy', 'ziliao-fenxi', 'panduan-tuili'].forEach((id, index) => {
      const definition = REFERENCES.find((item) => item.id === id);
      if (definition) selected.set(id, { definition, score: 3 - index, terms: [] });
    });
  }
  return [...selected.values()].sort((a, b) => b.score - a.score).slice(0, 4);
}

function pickExcerpt(markdown: string, terms: string[], maxLength = 3200) {
  const sections = splitSections(markdown);
  const scored = sections.map((section, index) => {
    const text = `${section.heading}\n${section.content}`.toLowerCase();
    const score = terms.reduce((sum, term) => sum + (text.includes(term.toLowerCase()) ? 8 : 0), 0)
      + (/核心|解题|步骤|方法|公式|易错/.test(section.heading) ? 2 : 0)
      + (index === 0 ? 1 : 0);
    return { ...section, score, index };
  }).sort((a, b) => b.score - a.score || a.index - b.index);
  const picked: string[] = [];
  let length = 0;
  for (const section of scored) {
    if (picked.length >= 3 || length >= maxLength) break;
    const available = maxLength - length;
    const content = section.content.slice(0, available);
    if (!content) continue;
    picked.push(content);
    length += content.length;
  }
  return picked.join('\n\n');
}

export function getHuasheng13Catalog(): HuashengCatalogResult {
  const root = resolveSkillRoot();
  return {
    available: fs.existsSync(path.join(root, 'SKILL.md')),
    name: '花生十三公考技巧库',
    version: '1.0.0',
    modes: (Object.keys(MODE_LABELS) as TeacherMode[]).map((id) => ({ id, label: MODE_LABELS[id] })),
    references: REFERENCES.map(({ id, title, category, file }) => ({ id, title, category, file })),
  };
}

export function getHuasheng13Context(message: string, mode: TeacherMode) {
  if (mode === 'general') return { context: '', sources: [] as RagSource[] };
  const selected = selectDefinitions(message, mode);
  const chunks: string[] = [];
  const sources: RagSource[] = [];
  let totalLength = 0;
  selected.forEach(({ definition, terms }, index) => {
    const markdown = readReference(definition.file);
    if (!markdown || totalLength >= 12000) return;
    const excerpt = pickExcerpt(markdown, terms.length > 0 ? terms : definition.keywords.slice(0, 4), Math.min(3400, 12000 - totalLength));
    if (!excerpt) return;
    chunks.push(`[花生${index + 1}] ${definition.title}\n${excerpt}`);
    totalLength += excerpt.length;
    sources.push({ id: -(index + 1), title: `花生十三 · ${definition.title}`, source: definition.file });
  });
  return { context: chunks.join('\n\n---\n\n'), sources };
}

export function buildHuasheng13SystemPrompt(mode: TeacherMode, skillContext: string, ragContext: string) {
  const modeInstruction: Record<TeacherMode, string> = {
    general: '使用通用公考 RAG 问答。',
    'huasheng-auto': '先识别用户场景和具体题型，再自动调用最匹配的方法。',
    'xingce-speed': '以考场提速为目标。资料分析和数量关系必须展示速算过程，并给出目标用时。',
    foundation: '面向基础薄弱学习者，解释识别标志、原理、步骤，再做计算或排除。',
    essay: '只提供审题、找点、加工、表达、结构和修改建议；大作文不得代写完整范文。',
    'wrong-review': '围绕知识盲区、技巧不熟、粗心失误、时间不够四类错因复盘，并生成下次提醒。',
    planning: '先说明计划所基于的考试类型、剩余时间、当前水平和每日时长；信息不足时列出假设。',
  };
  return `你正在使用“花生十三名师模式：${MODE_LABELS[mode]}”。\n${modeInstruction[mode]}\n\n输出规则：\n1. 单题按“题型识别 → 识别标志 → 解题思路 → 计算/推理过程 → 答案 → 易错点 → 同类迁移”输出。\n2. 资料分析、数量关系不得只给答案；优先判断截位直除、415 份数、假设分配、赋值、代入排除是否适用。\n3. 言语必须说明语境对应、关联词或中心句；判断推理必须说明规律、定义要素、关系层级或论证结构。\n4. 申论答案从材料提炼；大作文只给立意、结构、分论点和素材方向。\n5. 不照搬付费课程内容，不虚构官方评分或最新时政。静态常识资料可能过时，涉及时政、法律变化和考试公告时必须提示核验日期。\n6. 使用技能资料时在相关结论后标注 [花生1]；使用用户知识库时标注 [资料1]。\n\n花生十三技能资料：\n${skillContext || '未检索到直接匹配的方法文档。'}\n\n用户本地知识库：\n${ragContext || '未检索到用户知识库资料。'}`;
}
