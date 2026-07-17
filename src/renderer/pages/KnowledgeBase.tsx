import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  BookOpen,
  Calculator,
  Scale,
  Landmark,
  FlaskConical,
  PenTool,
  Pencil,
  Plus,
  Copy,
  Save,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  useAddKnowledgePoint,
  useDeleteKnowledgePoint,
  useKnowledgePoints,
  useUpdateKnowledgePoint,
} from '../hooks/use-api';
import type { KnowledgePointInput, KnowledgePointRecord } from '../../shared/ipc';

interface KnowledgeItem {
  id: string;
  dbId?: number;
  category: string;
  title: string;
  content: string;
  tags: string[];
  isCustom?: boolean;
}

interface KnowledgeDraft {
  title: string;
  category: string;
  content: string;
  tags: string;
}

type SourceFilter = 'all' | 'custom' | 'builtIn';

interface CategoryConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'all', label: '全部', icon: BookOpen, color: 'bg-surface-100 text-surface-600' },
  { key: 'formula', label: '行测公式', icon: Calculator, color: 'bg-brand-100 text-brand-600' },
  { key: 'politics', label: '政治常识', icon: Landmark, color: 'bg-danger-light text-danger-dark' },
  { key: 'law', label: '法律常识', icon: Scale, color: 'bg-warning-light text-warning-dark' },
  { key: 'economy', label: '经济常识', icon: BookOpen, color: 'bg-success-light text-success-dark' },
  { key: 'tech', label: '科技常识', icon: FlaskConical, color: 'bg-blue-100 text-blue-700' },
  { key: 'shenlun', label: '申论金句', icon: PenTool, color: 'bg-amber-100 text-amber-700' },
];

const CUSTOM_KNOWLEDGE_STORAGE_KEY = 'gongkao_custom_knowledge_v1';
const CUSTOM_KNOWLEDGE_MIGRATED_KEY = 'gongkao_custom_knowledge_migrated_v1';
const EMPTY_DRAFT: KnowledgeDraft = {
  title: '',
  category: 'formula',
  content: '',
  tags: '',
};

const KNOWLEDGE_DATA: KnowledgeItem[] = [
  // 行测公式
  { id: 'f1', category: 'formula', title: '行程问题', content: '路程 = 速度 × 时间\n相遇：S = (v₁ + v₂) × t\n追及：S = (v₁ - v₂) × t\n流水行船：顺流速度 = 船速 + 水速；逆流速度 = 船速 - 水速', tags: ['数量关系', '行程'] },
  { id: 'f2', category: 'formula', title: '工程问题', content: '工作总量 = 工作效率 × 工作时间\n合作效率 = 各自效率之和\n设工作总量为1，效率 = 1/时间', tags: ['数量关系', '工程'] },
  { id: 'f3', category: 'formula', title: '利润问题', content: '利润 = 售价 - 成本\n利润率 = 利润 / 成本 × 100%\n售价 = 成本 × (1 + 利润率)\n打折：售价 = 定价 × 折扣', tags: ['数量关系', '利润'] },
  { id: 'f4', category: 'formula', title: '排列组合', content: '排列 A(n,m) = n! / (n-m)!\n组合 C(n,m) = n! / [m!(n-m)!]\nC(n,m) = C(n,n-m)\n加法原理：分类用加\n乘法原理：分步用乘', tags: ['数量关系', '排列组合'] },
  { id: 'f5', category: 'formula', title: '概率问题', content: 'P(A) = A事件情况数 / 总情况数\n对立事件：P(Ā) = 1 - P(A)\n独立事件：P(AB) = P(A) × P(B)\n至少一次：1 - P(全不发生)', tags: ['数量关系', '概率'] },
  { id: 'f6', category: 'formula', title: '资料分析速算', content: '增长量 = 现期量 - 基期量 = 基期量 × 增长率\n增长率 = 增长量 / 基期量 × 100%\n比重 = 部分 / 整体\n倍数 = A / B\n平均数 = 总量 / 个数\n百分数化小数：n% = n/100', tags: ['资料分析', '速算'] },
  { id: 'f7', category: 'formula', title: '容斥原理', content: '两集合：|A∪B| = |A| + |B| - |A∩B|\n三集合：|A∪B∪C| = |A|+|B|+|C| - |A∩B| - |A∩C| - |B∩C| + |A∩B∩C|', tags: ['数量关系', '容斥'] },
  // 政治常识
  { id: 'p1', category: 'politics', title: '四项基本原则', content: '坚持社会主义道路\n坚持人民民主专政\n坚持中国共产党的领导\n坚持马克思列宁主义毛泽东思想', tags: ['政治', '核心'] },
  { id: 'p2', category: 'politics', title: '五位一体总体布局', content: '经济建设（根本）\n政治建设（保障）\n文化建设（灵魂）\n社会建设（条件）\n生态文明建设（基础）', tags: ['政治', '总体布局'] },
  { id: 'p3', category: 'politics', title: '四个全面战略布局', content: '全面建设社会主义现代化国家（目标）\n全面深化改革（动力）\n全面依法治国（保障）\n全面从严治党（关键）', tags: ['政治', '战略布局'] },
  { id: 'p4', category: 'politics', title: '新发展理念', content: '创新（引领发展的第一动力）\n协调（持续健康发展的内在要求）\n绿色（永续发展的必要条件）\n开放（国家繁荣发展的必由之路）\n共享（中国特色社会主义的本质要求）', tags: ['政治', '发展理念'] },
  // 法律常识
  { id: 'l1', category: 'law', title: '宪法基本制度', content: '根本制度：社会主义制度\n根本政治制度：人民代表大会制度\n基本经济制度：公有制为主体、多种所有制经济共同发展\n国家机构实行民主集中制原则', tags: ['法律', '宪法'] },
  { id: 'l2', category: 'law', title: '公民基本权利', content: '平等权\n选举权和被选举权（年满18周岁）\n言论、出版、集会、结社、游行、示威自由\n宗教信仰自由\n人身自由（不受非法逮捕、拘禁）\n批评建议权、申诉控告权', tags: ['法律', '权利'] },
  { id: 'l3', category: 'law', title: '行政法要点', content: '行政处罚：警告、罚款、没收、责令停产停业、暂扣/吊销许可证、行政拘留\n行政许可：依申请、外部性、授益性\n行政诉讼：民告官、合法性审查\n行政复议：上级机关复核', tags: ['法律', '行政法'] },
  // 经济常识
  { id: 'e1', category: 'economy', title: '宏观经济指标', content: 'GDP：国内生产总值（领土原则）\nGNP：国民生产总值（国民原则）\nCPI：居民消费价格指数（>3%为通胀）\nPPI：工业生产者出厂价格指数\n恩格尔系数：食品支出/总支出（越低越富裕）\n基尼系数：收入差距（0.3-0.4合理，>0.4差距大）', tags: ['经济', '指标'] },
  { id: 'e2', category: 'economy', title: '财政政策与货币政策', content: '扩张性财政政策：减税、增支\n紧缩性财政政策：增税、减支\n扩张性货币政策：降息、降准、增加货币供给\n紧缩性货币政策：加息、提准、减少货币供给', tags: ['经济', '政策'] },
  // 科技常识
  { id: 't1', category: 'tech', title: '中国航天成就', content: '神舟系列：载人飞船\n嫦娥系列：月球探测\n天问系列：火星探测\n北斗系统：全球导航\n天宫系列：空间站\n长征系列：运载火箭', tags: ['科技', '航天'] },
  { id: 't2', category: 'tech', title: '物理常识', content: '牛顿三定律：惯性定律、F=ma、作用力反作用力\n热力学：能量守恒、熵增原理\n光学：反射定律、折射定律、全反射\n电磁：法拉第电磁感应、麦克斯韦方程组', tags: ['科技', '物理'] },
  // 申论金句
  { id: 's1', category: 'shenlun', title: '人民类金句', content: '"江山就是人民，人民就是江山。"\n"民之所忧，我必念之；民之所盼，我必行之。"\n"时代是出卷人，我们是答卷人，人民是阅卷人。"\n"人民对美好生活的向往，就是我们的奋斗目标。"', tags: ['申论', '人民'] },
  { id: 's2', category: 'shenlun', title: '奋斗类金句', content: '"征途漫漫，惟有奋斗。"\n"幸福都是奋斗出来的。"\n"奋斗是青春最亮丽的底色。"\n"艰难方显勇毅，磨砺始得玉成。"\n"志之所趋，无远弗届，穷山距海，不能限也。"', tags: ['申论', '奋斗'] },
  { id: 's3', category: 'shenlun', title: '创新类金句', content: '"创新是引领发展的第一动力。"\n"惟创新者进，惟创新者强，惟创新者胜。"\n"苟日新，日日新，又日新。"\n"满眼生机转化钧，天工人巧日争新。"', tags: ['申论', '创新'] },
  { id: 's4', category: 'shenlun', title: '治理类金句', content: '"治国之道，富民为始。"\n"法令者，民之命也，为治之本也。"\n"天下之治，天下之民共治之。"\n"治国常富，而乱国必贫。"', tags: ['申论', '治理'] },
];

function getCategoryLabel(category: string) {
  return CATEGORIES.find((item) => item.key === category)?.label ?? category;
}

function parseTags(value: string) {
  return value
    .split(/[\s,，#、]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function loadCustomKnowledge(): KnowledgeItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_KNOWLEDGE_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        id: String(item.id ?? `custom-${Date.now()}`),
        category: CATEGORIES.some((cat) => cat.key === item.category && cat.key !== 'all') ? String(item.category) : 'formula',
        title: String(item.title ?? '').trim(),
        content: String(item.content ?? '').trim(),
        tags: Array.isArray(item.tags) ? item.tags.map((tag: unknown) => String(tag)).filter(Boolean) : [],
        isCustom: true,
      }))
      .filter((item) => item.title && item.content);
  } catch {
    return [];
  }
}

function toKnowledgePointInput(item: KnowledgeItem): KnowledgePointInput {
  return {
    title: item.title,
    category: item.category,
    content: item.content,
    tags: item.tags.join(' '),
  };
}

function toKnowledgeItem(point: KnowledgePointRecord): KnowledgeItem {
  return {
    id: `custom-${point.id}`,
    dbId: point.id,
    category: CATEGORIES.some((cat) => cat.key === point.category && cat.key !== 'all') ? point.category : 'formula',
    title: point.title,
    content: point.content,
    tags: parseTags(point.tags),
    isCustom: true,
  };
}

function getResultError(result: unknown) {
  if (result && typeof result === 'object' && 'error' in result) {
    return String((result as { error?: unknown }).error ?? '操作失败');
  }
  return '';
}

function getDefaultCategory(activeCategory: string) {
  return CATEGORIES.some((item) => item.key === activeCategory && item.key !== 'all')
    ? activeCategory
    : 'formula';
}

/* ─── Sub-components ─── */

const SearchBar: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="搜索知识点..."
      className="w-full pl-9 pr-4 py-2.5 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-brand-500"
    />
  </div>
);

const SourceFilterTabs: React.FC<{
  value: SourceFilter;
  onChange: (value: SourceFilter) => void;
  customCount: number;
  builtInCount: number;
}> = ({ value, onChange, customCount, builtInCount }) => {
  const options: { key: SourceFilter; label: string; count: number }[] = [
    { key: 'all', label: '全部资料', count: customCount + builtInCount },
    { key: 'custom', label: '我的总结', count: customCount },
    { key: 'builtIn', label: '内置资料', count: builtInCount },
  ];

  return (
    <div className="flex w-full overflow-x-auto rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-1 md:inline-flex md:w-auto">
      {options.map((option) => {
        const active = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
              active
                ? 'bg-brand-500 text-white'
                : 'text-surface-500 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-700'
            }`}
          >
            <span>{option.label}</span>
            <span className={`text-xs tabular-nums ${active ? 'text-white/80' : 'text-surface-400'}`}>
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

const CategoryGrid: React.FC<{
  activeCategory: string;
  onToggle: (key: string) => void;
  totalCount: number;
  categoryCounts: Map<string, number>;
}> = ({ activeCategory, onToggle, totalCount, categoryCounts }) => (
  <div className="grid grid-cols-3 lg:grid-cols-7 gap-3">
    {CATEGORIES.map((cat) => {
      const Icon = cat.icon;
      const count = cat.key === 'all' ? totalCount : categoryCounts.get(cat.key) ?? 0;
      const isActive = activeCategory === cat.key;
      return (
        <button
          key={cat.key}
          onClick={() => onToggle(cat.key)}
          className={`p-3 rounded-xl border transition-colors text-left ${
            isActive
              ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/30 dark:border-brand-700'
              : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 hover:border-surface-300 dark:hover:border-surface-600'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.color} mb-2`}
          >
            <Icon className="w-4 h-4" />
          </div>
          <p className="text-sm font-medium text-surface-900 dark:text-surface-0">{cat.label}</p>
          <p className="text-xs text-surface-400">{count} 条</p>
        </button>
      );
    })}
  </div>
);

const KnowledgeCard: React.FC<{
  item: KnowledgeItem;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (item: KnowledgeItem) => void;
  onDelete: (item: KnowledgeItem) => void;
  onClone: (item: KnowledgeItem) => void;
}> = ({ item, isExpanded, onToggle, onEdit, onDelete, onClone }) => {
  const category = CATEGORIES.find((c) => c.key === item.category);

  return (
    <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-0 dark:hover:bg-surface-700 transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                category?.color || 'bg-surface-100 text-surface-600'
              }`}
            >
              {category?.label || item.category}
            </span>
            {item.isCustom && (
              <span className="px-2 py-0.5 rounded text-xs bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                我的总结
              </span>
            )}
            <h3 className="text-sm font-medium text-surface-900 dark:text-surface-0">{item.title}</h3>
          </div>
          <div className="flex gap-1 flex-wrap">
            {item.tags.map((tag) => (
              <span key={tag} className="text-xs text-surface-400">
                #{tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {item.isCustom && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(item);
                }}
                className="p-1.5 rounded-md text-surface-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                title="编辑"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(item);
                }}
                className="p-1.5 rounded-md text-surface-400 hover:text-danger-600 hover:bg-danger-light dark:hover:bg-danger/10 transition-colors"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {!item.isCustom && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClone(item);
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-surface-500 hover:text-brand-600 hover:bg-brand-50 dark:text-surface-300 dark:hover:bg-brand-500/10 transition-colors"
              title="复制为我的总结"
            >
              <Copy className="w-3.5 h-3.5" />
              复制
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-surface-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-surface-400" />
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-surface-100 dark:border-surface-700">
          <pre className="text-sm text-surface-700 dark:text-surface-400 whitespace-pre-wrap leading-relaxed font-sans">
            {item.content}
          </pre>
        </div>
      )}
    </div>
  );
};

const KnowledgeEditor: React.FC<{
  draft: KnowledgeDraft;
  error: string;
  editing: boolean;
  saving: boolean;
  onChange: (draft: KnowledgeDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}> = ({ draft, error, editing, saving, onChange, onSave, onCancel }) => (
  <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-4">
    <div className="flex items-center justify-between gap-3 mb-4">
      <div>
        <h2 className="text-base font-bold text-surface-900 dark:text-surface-0 font-display">
          {editing ? '编辑知识点' : '添加我的知识点'}
        </h2>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          用自己的话记录考点、公式、易错点，后续可按分类检索。
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="p-2 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700 dark:hover:text-surface-200 transition-colors"
        title="关闭"
      >
        <X className="w-4 h-4" />
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr),12rem] gap-4">
      <label className="block">
        <span className="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-300">知识点名称</span>
        <input
          value={draft.title}
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
          placeholder="例如：资料分析-基期比重"
          className="w-full px-3 py-2 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-brand-500"
        />
      </label>
      <label className="block">
        <span className="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-300">分类</span>
        <select
          value={draft.category}
          onChange={(event) => onChange({ ...draft, category: event.target.value })}
          className="w-full px-3 py-2 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-brand-500"
        >
          {CATEGORIES.filter((item) => item.key !== 'all').map((item) => (
            <option key={item.key} value={item.key}>{item.label}</option>
          ))}
        </select>
      </label>
    </div>

    <label className="block mt-4">
      <span className="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-300">内容</span>
      <textarea
        value={draft.content}
        onChange={(event) => onChange({ ...draft, content: event.target.value })}
        placeholder="写下定义、解题步骤、易错提醒或自己的例题总结。"
        rows={7}
        className="w-full resize-y px-3 py-2 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm leading-6 focus:outline-none focus:border-brand-500"
      />
    </label>

    <label className="block mt-4">
      <span className="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-300">标签</span>
      <input
        value={draft.tags}
        onChange={(event) => onChange({ ...draft, tags: event.target.value })}
        placeholder="用逗号或空格分隔，例如：资料分析 速算 易错"
        className="w-full px-3 py-2 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-brand-500"
      />
    </label>

    {error && <p className="mt-3 text-sm text-danger">{error}</p>}

    <div className="mt-4 flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-2 rounded-lg border border-surface-200 dark:border-surface-700 px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
      >
        <X className="w-4 h-4" />
        取消
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
      >
        <Save className="w-4 h-4" />
        {saving ? '保存中' : '保存'}
      </button>
    </div>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="text-center py-12 text-surface-400 dark:text-surface-400">
    <BookOpen className="w-12 h-12 mx-auto mb-2 text-surface-300 dark:text-surface-600" />
    <p>没有找到相关知识点</p>
  </div>
);

/* ─── Main Page ─── */

const KnowledgeBase: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<KnowledgeDraft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState('');
  const [dataError, setDataError] = useState('');
  const migrationStartedRef = useRef(false);

  const knowledgePointsQuery = useKnowledgePoints();
  const addKnowledgePoint = useAddKnowledgePoint();
  const updateKnowledgePoint = useUpdateKnowledgePoint();
  const deleteKnowledgePoint = useDeleteKnowledgePoint();

  const customKnowledge = useMemo(
    () => (knowledgePointsQuery.data ?? []).map((point) => toKnowledgeItem(point)),
    [knowledgePointsQuery.data]
  );

  useEffect(() => {
    if (migrationStartedRef.current || knowledgePointsQuery.isLoading) return;
    if ((knowledgePointsQuery.data?.length ?? 0) > 0) return;
    if (localStorage.getItem(CUSTOM_KNOWLEDGE_MIGRATED_KEY) === '1') return;

    const legacyItems = loadCustomKnowledge();
    if (legacyItems.length === 0) {
      localStorage.setItem(CUSTOM_KNOWLEDGE_MIGRATED_KEY, '1');
      return;
    }

    migrationStartedRef.current = true;
    void (async () => {
      for (const item of legacyItems) {
        const result = await addKnowledgePoint.mutateAsync(toKnowledgePointInput(item));
        const error = getResultError(result);
        if (error) throw new Error(error);
      }
      localStorage.setItem(CUSTOM_KNOWLEDGE_MIGRATED_KEY, '1');
    })().catch((error) => {
      migrationStartedRef.current = false;
      setDataError(`旧知识点迁移失败：${String(error instanceof Error ? error.message : error)}`);
    });
  }, [addKnowledgePoint, knowledgePointsQuery.data, knowledgePointsQuery.isLoading]);

  const allKnowledge = useMemo(
    () => [...customKnowledge, ...KNOWLEDGE_DATA],
    [customKnowledge]
  );

  const sourceKnowledge = useMemo(() => {
    if (sourceFilter === 'custom') return customKnowledge;
    if (sourceFilter === 'builtIn') return KNOWLEDGE_DATA;
    return allKnowledge;
  }, [allKnowledge, customKnowledge, sourceFilter]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of sourceKnowledge) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return counts;
  }, [sourceKnowledge]);

  const filtered = useMemo(() => {
    const term = searchText.toLowerCase().trim();
    return sourceKnowledge.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (!term) return true;
      return (
        item.title.toLowerCase().includes(term) ||
        item.content.toLowerCase().includes(term) ||
        item.tags.some((t) => t.toLowerCase().includes(term))
      );
    });
  }, [activeCategory, searchText, sourceKnowledge]);

  const handleCategoryToggle = (key: string) => {
    setActiveCategory((prev) => (prev === key ? 'all' : key));
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const openCreateEditor = () => {
    setEditingId(null);
    setSourceFilter('custom');
    setDraft({ ...EMPTY_DRAFT, category: getDefaultCategory(activeCategory) });
    setFormError('');
    setShowEditor(true);
  };

  const openCloneEditor = (item: KnowledgeItem) => {
    setEditingId(null);
    setSourceFilter('custom');
    setDraft({
      title: `${item.title}（我的总结）`,
      category: item.category,
      content: item.content,
      tags: item.tags.join(' '),
    });
    setFormError('');
    setShowEditor(true);
  };

  const openEditEditor = (item: KnowledgeItem) => {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      category: item.category,
      content: item.content,
      tags: item.tags.join(' '),
    });
    setFormError('');
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setFormError('');
  };

  const handleSaveKnowledge = async () => {
    const title = draft.title.trim();
    const content = draft.content.trim();
    if (!title) {
      setFormError('请填写知识点名称。');
      return;
    }
    if (!content) {
      setFormError('请填写知识点内容。');
      return;
    }

    const payload: KnowledgePointInput = {
      category: draft.category,
      title,
      content,
      tags: parseTags(draft.tags).join(' '),
    };

    try {
      setFormError('');
      setDataError('');

      const editingItem = editingId ? customKnowledge.find((item) => item.id === editingId) : null;
      if (editingId && !editingItem?.dbId) {
        setFormError('无法定位这个自定义知识点，请刷新后重试。');
        return;
      }

      const result = editingId
        ? await updateKnowledgePoint.mutateAsync({
            id: editingItem!.dbId!,
            ...payload,
          })
        : await addKnowledgePoint.mutateAsync(payload);

      const error = getResultError(result);
      if (error) {
        setFormError(error);
        return;
      }

      if (result?.id) setExpandedId(`custom-${result.id}`);
      setSourceFilter('custom');
      closeEditor();
    } catch (error) {
      setFormError(`保存失败：${String(error instanceof Error ? error.message : error)}`);
    }
  };

  const handleDeleteKnowledge = async (item: KnowledgeItem) => {
    if (!confirm('确定删除这个自定义知识点吗？')) return;
    if (!item.dbId) {
      setDataError('无法定位这个自定义知识点，请刷新后重试。');
      return;
    }

    try {
      setDataError('');
      const result = await deleteKnowledgePoint.mutateAsync(item.dbId);
      const error = getResultError(result);
      if (error) {
        setDataError(error);
        return;
      }
      if (expandedId === item.id) setExpandedId(null);
      if (editingId === item.id) closeEditor();
    } catch (error) {
      setDataError(`删除失败：${String(error instanceof Error ? error.message : error)}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-0 font-display">知识点速查</h1>
          <p className="text-sm text-surface-500 mt-1">
            内置常用考点，也支持记录自己的总结和易错点
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateEditor}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加知识点
        </button>
      </div>

      {showEditor && (
        <KnowledgeEditor
          draft={draft}
          error={formError}
          editing={Boolean(editingId)}
          saving={addKnowledgePoint.isPending || updateKnowledgePoint.isPending}
          onChange={setDraft}
          onSave={handleSaveKnowledge}
          onCancel={closeEditor}
        />
      )}

      {(dataError || knowledgePointsQuery.error) && (
        <div className="rounded-lg border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger-dark dark:border-danger/30 dark:bg-danger/10 dark:text-danger-light">
          {dataError || `知识点加载失败：${String(knowledgePointsQuery.error)}`}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="lg:flex-1">
          <SearchBar value={searchText} onChange={setSearchText} />
        </div>
        <SourceFilterTabs
          value={sourceFilter}
          onChange={setSourceFilter}
          customCount={customKnowledge.length}
          builtInCount={KNOWLEDGE_DATA.length}
        />
      </div>

      <CategoryGrid
        activeCategory={activeCategory}
        onToggle={handleCategoryToggle}
        totalCount={sourceKnowledge.length}
        categoryCounts={categoryCounts}
      />

      {customKnowledge.length > 0 && (
        <div className="rounded-lg border border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 px-4 py-3 text-sm text-brand-700 dark:text-brand-300">
          已记录 {customKnowledge.length} 条个人知识点。当前分类：{activeCategory === 'all' ? '全部' : getCategoryLabel(activeCategory)}。
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          filtered.map((item) => (
            <KnowledgeCard
              key={item.id}
              item={item}
              isExpanded={expandedId === item.id}
              onToggle={() => handleToggleExpand(item.id)}
              onEdit={openEditEditor}
              onDelete={handleDeleteKnowledge}
              onClone={openCloneEditor}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default KnowledgeBase;
