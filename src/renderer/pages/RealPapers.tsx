import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Monitor,
  Printer,
  Search,
  Tag,
} from 'lucide-react';
import { MotionItem } from '../components/ui/Motion';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useQuestions } from '../hooks/use-api';
import type { QuestionRecord } from '../../shared/ipc';
import { cn } from '../lib/utils';

const QUESTION_TYPE_ORDER = ['常识判断', '言语理解', '数量关系', '判断推理', '资料分析', '申论'];

type PaperInfo = {
  key: string;
  title: string;
  category: string;
};

type PaperGroup = PaperInfo & {
  questions: QuestionRecord[];
  typeCounts: Map<string, number>;
  unansweredCount: number;
  materialIssueCount: number;
};

type DataAnalysisItem = {
  question: QuestionRecord;
  order: number;
  material: string;
  questionText: string;
  options: string[];
};

type DataAnalysisSet = {
  id: string;
  material: string;
  questions: DataAnalysisItem[];
  missingMaterial: boolean;
};

function normalizeText(text: string | null | undefined) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\u3000/g, ' ')
    .trim();
}

function parseOptions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item));
  } catch {}
  return raw.split('\n').map((item) => item.trim()).filter(Boolean);
}

function getQuestionTags(question: QuestionRecord) {
  return String(question.tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getPaperInfo(question: QuestionRecord): PaperInfo | null {
  const tags = getQuestionTags(question);
  if (!tags.includes('pdf_import') && !tags.includes('pdf_exam')) return null;

  const ignored = new Set(['pdf_import', 'pdf_exam', 'pdf_answer', 'question_bank', 'manual']);
  const title = [...tags].reverse().find((tag) => !ignored.has(tag) && !/^\d+个分片合并$/.test(tag));
  if (!title) return null;

  const category = tags.find((tag) => !ignored.has(tag) && tag !== title && !/^\d+个分片合并$/.test(tag)) ?? '未分类';
  return {
    key: `${category}::${title}`,
    title,
    category,
  };
}

function inferTypeByPosition(index: number) {
  const number = index + 1;
  if (number <= 20) return '常识判断';
  if (number <= 60) return '言语理解';
  if (number <= 75) return '数量关系';
  if (number <= 115) return '判断推理';
  return '资料分析';
}

function isXingcePaper(paper: PaperInfo) {
  return /行测|行政职业能力测验/.test(`${paper.category} ${paper.title}`);
}

function normalizeQuestionType(question: QuestionRecord, indexInPaper = -1, paper?: PaperInfo) {
  const content = normalizeText(question.content);
  if (content.startsWith('【资料】')) return '资料分析';

  const raw = String(question.type ?? '').replace(/^行测-/, '');
  if (QUESTION_TYPE_ORDER.includes(raw) && raw !== '申论') return raw;

  if (paper && isXingcePaper(paper) && indexInPaper >= 0) {
    return inferTypeByPosition(indexInPaper);
  }

  const text = `${question.type} ${question.tags} ${question.content}`.replace(/\s+/g, '');
  if (/资料|材料分析|统计|图表|增长率|比重/.test(text)) return '资料分析';
  if (/判断|图形推理|定义判断|类比推理|逻辑判断/.test(text)) return '判断推理';
  if (/数量|数学运算|数字推理|数资/.test(text)) return '数量关系';
  if (/言语|逻辑填空|片段阅读|语句表达|阅读理解|中心理解/.test(text)) return '言语理解';
  if (/申论/.test(text) && !/行测|行政职业能力测验/.test(text)) return '申论';
  return '常识判断';
}

function splitQuestionDisplay(content: string): { material: string; question: string } {
  const normalized = normalizeText(content);
  const materialMatch = normalized.match(/^【资料】\s*([\s\S]*?)(?:\n\s*\n)?【题目】\s*([\s\S]*)$/);
  if (!materialMatch) return { material: '', question: normalized };
  return {
    material: materialMatch[1].trim(),
    question: materialMatch[2].trim(),
  };
}

function hasUncertainAnswer(question: QuestionRecord) {
  return /未识别到答案|默认使用/.test(String(question.explanation ?? ''));
}

function buildPaperGroups(questions: QuestionRecord[]) {
  const map = new Map<string, PaperGroup>();

  for (const question of questions) {
    const paper = getPaperInfo(question);
    if (!paper) continue;
    let group = map.get(paper.key);
    if (!group) {
      group = {
        ...paper,
        questions: [],
        typeCounts: new Map(),
        unansweredCount: 0,
        materialIssueCount: 0,
      };
      map.set(paper.key, group);
    }
    group.questions.push(question);
  }

  for (const group of map.values()) {
    group.questions.sort((a, b) => a.id - b.id);
    group.typeCounts = new Map();
    group.unansweredCount = 0;
    group.materialIssueCount = 0;

    group.questions.forEach((question, index) => {
      const type = normalizeQuestionType(question, index, group);
      group.typeCounts.set(type, (group.typeCounts.get(type) ?? 0) + 1);
      if (hasUncertainAnswer(question)) group.unansweredCount++;
      if (type === '资料分析' && !normalizeText(question.content).startsWith('【资料】')) {
        group.materialIssueCount++;
      }
    });
  }

  return [...map.values()].sort((a, b) => {
    const yearA = parseInt(a.title.match(/\d{4}/)?.[0] ?? '0', 10);
    const yearB = parseInt(b.title.match(/\d{4}/)?.[0] ?? '0', 10);
    if (yearA !== yearB) return yearB - yearA;
    return a.title.localeCompare(b.title);
  });
}

function PaperTypeSummary({ group }: { group: PaperGroup }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
      {QUESTION_TYPE_ORDER.map((type) => (
        <div key={type} className="rounded-md bg-surface-50 dark:bg-surface-700/60 px-3 py-2">
          <div className="text-xs text-surface-400">{type}</div>
          <div className="text-sm font-semibold text-surface-800 dark:text-surface-100 tabular-nums">
            {group.typeCounts.get(type) ?? 0}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionRow({ question, order, type, expanded, onToggle }: {
  question: QuestionRecord;
  order: number;
  type: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const display = splitQuestionDisplay(question.content);
  const options = parseOptions(question.options);

  return (
    <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
      >
        <div className="w-10 shrink-0 text-sm font-semibold text-surface-500 tabular-nums">{order}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              {type}
            </span>
            {display.material && <span className="text-xs text-info-text dark:text-info">含资料</span>}
            <span className="text-xs text-surface-400">答案 {question.answer || '-'}</span>
          </div>
          <div className="text-sm font-medium text-surface-800 dark:text-surface-100 line-clamp-2">
            {display.question}
          </div>
        </div>
        {expanded ? <ChevronDown className="w-5 h-5 text-surface-400" /> : <ChevronRight className="w-5 h-5 text-surface-400" />}
      </button>

      {expanded && (
        <div className="px-4 py-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-700/40 space-y-4">
          {display.material && (
            <div className="rounded-lg border border-info/20 bg-info-light/50 dark:bg-info/10 px-4 py-3">
              <div className="text-xs font-semibold text-info-dark dark:text-info mb-2">资料</div>
              <div className="whitespace-pre-wrap text-sm leading-7 text-surface-700 dark:text-surface-200">{display.material}</div>
            </div>
          )}
          <div className="whitespace-pre-wrap text-sm leading-7 text-surface-800 dark:text-surface-100">{display.question}</div>
          {options.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {options.map((option, index) => (
                <div key={index} className="rounded-md bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 px-3 py-2 text-sm leading-6">
                  {option}
                </div>
              ))}
            </div>
          )}
          {question.explanation && (
            <div className="text-xs text-surface-500 dark:text-surface-400">解析：{question.explanation}</div>
          )}
        </div>
      )}
    </div>
  );
}

function buildDataAnalysisSets(group: PaperGroup): DataAnalysisSet[] {
  const grouped = new Map<string, DataAnalysisSet>();
  const dataQuestions = group.questions
    .map((question, index) => ({ question, index }))
    .filter(({ question, index }) => normalizeQuestionType(question, index, group) === '资料分析');

  dataQuestions.forEach(({ question, index }, dataIndex) => {
    const display = splitQuestionDisplay(question.content);
    const material = normalizeText(display.material);
    const key = material
      ? material.replace(/\s+/g, '').slice(0, 220)
      : `missing-material-${Math.floor(dataIndex / 5)}`;
    const existing = grouped.get(key) ?? {
      id: key,
      material,
      questions: [],
      missingMaterial: !material,
    };

    existing.questions.push({
      question,
      order: index + 1,
      material,
      questionText: display.question,
      options: parseOptions(question.options),
    });
    grouped.set(key, existing);
  });

  const sets: DataAnalysisSet[] = [];
  for (const item of grouped.values()) {
    const sortedQuestions = [...item.questions].sort((a, b) => a.order - b.order);
    for (let i = 0; i < sortedQuestions.length; i += 5) {
      const questions = sortedQuestions.slice(i, i + 5);
      sets.push({
        ...item,
        id: `${item.id}-${i}`,
        questions,
      });
    }
  }

  return sets.sort((a, b) => (a.questions[0]?.order ?? 0) - (b.questions[0]?.order ?? 0));
}

function DataAnalysisPracticeSection({ sets }: { sets: DataAnalysisSet[] }) {
  if (sets.length === 0) {
    return (
      <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-4 py-8 text-center text-sm text-surface-400">
        当前真题没有可打印的资料分析内容。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sets.map((set, index) => (
        <article key={set.id} className="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-hidden">
          <div className="border-b border-surface-200 dark:border-surface-700 px-4 py-3 bg-surface-50 dark:bg-surface-700/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-surface-400">资料分析 {index + 1}</div>
                <h4 className="mt-0.5 text-sm font-semibold text-surface-900 dark:text-surface-0">
                  第 {set.questions[0]?.order ?? '-'}-{set.questions[set.questions.length - 1]?.order ?? '-'} 题
                </h4>
              </div>
              <span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                {set.questions.length} 小题
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr),minmax(0,0.95fr)] divide-y xl:divide-y-0 xl:divide-x divide-surface-200 dark:divide-surface-700">
            <div className="p-4">
              <div className="mb-2 text-xs font-semibold text-info-dark dark:text-info">资料</div>
              {set.missingMaterial ? (
                <div className="rounded-lg border border-warning/30 bg-warning-light/70 px-3 py-3 text-sm text-warning-text dark:bg-warning/10 dark:text-warning">
                  这组题缺少完整资料，建议重新导入包含资料页的 PDF 后再打印。
                </div>
              ) : (
                <div className="max-h-[34rem] overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-surface-700 dark:text-surface-200">
                  {set.material}
                </div>
              )}
            </div>

            <div className="p-4 space-y-4">
              {set.questions.map((item) => (
                <div key={item.question.id} className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 w-8 shrink-0 text-sm font-semibold text-surface-500 tabular-nums">{item.order}</span>
                    <div className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-7 text-surface-800 dark:text-surface-100">
                      {item.questionText}
                    </div>
                  </div>
                  {item.options.length > 0 && (
                    <div className="ml-10 grid grid-cols-1 gap-1.5">
                      {item.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="text-sm leading-6 text-surface-600 dark:text-surface-300">
                          {option}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="ml-10 text-xs text-surface-400">答案 {item.question.answer || '-'}</div>
                </div>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function PrintableDataAnalysis({ group, sets }: { group: PaperGroup; sets: DataAnalysisSet[] }) {
  return (
    <>
      <style>{`
        .real-paper-print-root { display: none; }
        @media print {
          body * { visibility: hidden !important; }
          .real-paper-print-root, .real-paper-print-root * { visibility: visible !important; }
          .real-paper-print-root {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 18mm 16mm;
            background: #ffffff;
            color: #111827;
            font-family: "SimSun", "Microsoft YaHei", serif;
          }
          .real-paper-print-title {
            margin: 0 0 6mm;
            padding-bottom: 4mm;
            border-bottom: 1px solid #111827;
          }
          .real-paper-print-title h1 { margin: 0 0 2mm; font-size: 18pt; }
          .real-paper-print-title p { margin: 0; font-size: 9pt; color: #374151; }
          .real-paper-print-set {
            break-after: page;
            page-break-after: always;
          }
          .real-paper-print-set:last-child { break-after: auto; page-break-after: auto; }
          .real-paper-print-set h2 { margin: 0 0 4mm; font-size: 13pt; }
          .real-paper-print-material {
            margin-bottom: 5mm;
            white-space: pre-wrap;
            font-size: 10.5pt;
            line-height: 1.75;
          }
          .real-paper-print-question {
            margin: 0 0 4mm;
            font-size: 10.5pt;
            line-height: 1.65;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .real-paper-print-question-title { font-weight: 600; white-space: pre-wrap; }
          .real-paper-print-options { margin: 1.5mm 0 0 7mm; white-space: pre-wrap; }
          .real-paper-print-answer-key {
            margin-top: 8mm;
            border-top: 1px solid #9ca3af;
            padding-top: 4mm;
            font-size: 10pt;
          }
        }
      `}</style>
      <div className="real-paper-print-root">
        <div className="real-paper-print-title">
          <h1>{group.title} 资料分析纸面练习</h1>
          <p>{group.category} · 共 {sets.reduce((sum, set) => sum + set.questions.length, 0)} 小题</p>
        </div>
        {sets.map((set, index) => (
          <section key={set.id} className="real-paper-print-set">
            <h2>资料分析 {index + 1}（第 {set.questions[0]?.order ?? '-'}-{set.questions[set.questions.length - 1]?.order ?? '-'} 题）</h2>
            <div className="real-paper-print-material">
              {set.material || '此组题缺少完整资料，请重新导入包含资料页的 PDF。'}
            </div>
            {set.questions.map((item) => (
              <div key={item.question.id} className="real-paper-print-question">
                <div className="real-paper-print-question-title">
                  {item.order}. {item.questionText}
                </div>
                {item.options.length > 0 && (
                  <div className="real-paper-print-options">
                    {item.options.join('\n')}
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}
        <div className="real-paper-print-answer-key">
          <strong>参考答案：</strong>{' '}
          {sets.flatMap((set) => set.questions).map((item) => `${item.order}.${item.question.answer || '-'}`).join('  ')}
        </div>
      </div>
    </>
  );
}

export default function RealPapers() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);
  const { data: questions = [], isLoading } = useQuestions();

  const groups = useMemo(() => buildPaperGroups(questions), [questions]);
  const filteredGroups = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return groups;
    return groups.filter((group) =>
      `${group.title} ${group.category}`.toLowerCase().includes(keyword)
    );
  }, [groups, query]);

  const selectedGroup = filteredGroups.find((group) => group.key === selectedKey) ?? filteredGroups[0] ?? null;
  const dataAnalysisSets = useMemo(
    () => selectedGroup ? buildDataAnalysisSets(selectedGroup) : [],
    [selectedGroup]
  );

  const startPaperTraining = (group: PaperGroup) => {
    navigate(`/mock-exam?paper=${encodeURIComponent(group.key)}&skipData=1`);
  };

  const printDataAnalysis = () => {
    if (dataAnalysisSets.length === 0) return;
    window.print();
  };

  return (
    <div className="h-full flex flex-col bg-surface-0 dark:bg-surface-900">
      <div className="shrink-0 px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-0 font-display flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-500" />
            真题入口
          </h1>
          <div className="text-sm font-medium text-surface-500 dark:text-surface-400">
            共 {groups.length} 套真题
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索年份、省份、考试类型..."
            className="w-full pl-10 pr-4 py-2 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[22rem,1fr]">
        <aside className="border-r border-surface-200 dark:border-surface-700 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            [1, 2, 3, 4].map((item) => <SkeletonCard key={item} />)
          ) : filteredGroups.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-surface-400">
              <BookOpen className="w-10 h-10 mb-2" />
              <div className="text-sm">暂无真题</div>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => {
                  setSelectedKey(group.key);
                  setExpandedQuestionId(null);
                }}
                className={cn(
                  'w-full rounded-lg px-3 py-3 text-left border transition-colors',
                  selectedGroup?.key === group.key
                    ? 'border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10'
                    : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 hover:bg-surface-50 dark:hover:bg-surface-700'
                )}
              >
                <div className="text-sm font-semibold text-surface-900 dark:text-surface-0 line-clamp-2">
                  {group.title}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-surface-400">
                  <Tag className="w-3.5 h-3.5" />
                  <span className="truncate">{group.category}</span>
                </div>
                <div className="mt-2 text-xs text-surface-500 dark:text-surface-400">
                  {group.questions.length} 题
                  {group.unansweredCount > 0 && ` · ${group.unansweredCount} 题答案待核`}
                  {group.materialIssueCount > 0 && ` · ${group.materialIssueCount} 题资料待补`}
                </div>
              </button>
            ))
          )}
        </aside>

        <main className="overflow-y-auto p-6">
          {!selectedGroup ? (
            <div className="h-full flex flex-col items-center justify-center text-surface-400">
              <ClipboardList className="w-14 h-14 mb-3" />
              <div className="text-lg font-medium">选择一套真题</div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium text-surface-400 mb-1">{selectedGroup.category}</div>
                    <h2 className="text-xl font-bold text-surface-900 dark:text-surface-0 font-display">
                      {selectedGroup.title}
                    </h2>
                    <div className="mt-2 text-sm text-surface-500 dark:text-surface-400">
                      {selectedGroup.questions.length} 题
                      {selectedGroup.unansweredCount > 0 && ` · ${selectedGroup.unansweredCount} 题答案待核`}
                      {selectedGroup.materialIssueCount > 0 && ` · ${selectedGroup.materialIssueCount} 题资料待补`}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => startPaperTraining(selectedGroup)}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
                    >
                      <Monitor className="w-4 h-4" />
                      电脑训练
                    </button>
                    <button
                      type="button"
                      onClick={printDataAnalysis}
                      disabled={dataAnalysisSets.length === 0}
                      className="inline-flex items-center gap-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700 disabled:opacity-50 disabled:hover:bg-white dark:disabled:hover:bg-surface-800 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      打印资料分析
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <PaperTypeSummary group={selectedGroup} />
                </div>
                <div className="mt-4 rounded-lg border border-info/20 bg-info-light/40 dark:bg-info/10 px-4 py-3 text-sm leading-6 text-info-text dark:text-info">
                  资料分析按“整篇资料 + 五个小题”整理，适合打印后纸面限时训练；电脑训练会跳过资料分析，避免在屏幕上反复找数据影响模拟效果。
                </div>
              </div>

              <div className="space-y-5">
                {QUESTION_TYPE_ORDER.map((type) => {
                  const typedQuestions = selectedGroup.questions.filter((question, index) =>
                    normalizeQuestionType(question, index, selectedGroup) === type
                  );
                  if (typedQuestions.length === 0) return null;

                  if (type === '资料分析') {
                    return (
                      <section key={type} className="space-y-2">
                        <h3 className="sticky top-0 z-10 flex items-center gap-2 bg-surface-0 dark:bg-surface-900 py-2 text-lg font-bold text-surface-800 dark:text-surface-0 font-display">
                          <Tag className="w-5 h-5 text-brand-500" />
                          {type}
                          <span className="text-sm font-normal text-surface-400">({typedQuestions.length})</span>
                          <span className="ml-auto text-xs font-medium text-surface-400">纸面练习优先</span>
                        </h3>
                        <DataAnalysisPracticeSection sets={dataAnalysisSets} />
                      </section>
                    );
                  }

                  return (
                    <section key={type} className="space-y-2">
                      <h3 className="sticky top-0 z-10 flex items-center gap-2 bg-surface-0 dark:bg-surface-900 py-2 text-lg font-bold text-surface-800 dark:text-surface-0 font-display">
                        <Tag className="w-5 h-5 text-brand-500" />
                        {type}
                        <span className="text-sm font-normal text-surface-400">({typedQuestions.length})</span>
                      </h3>
                      <div className="space-y-2">
                        {typedQuestions.map((question) => {
                          const order = selectedGroup.questions.findIndex((item) => item.id === question.id) + 1;
                          return (
                            <MotionItem key={question.id}>
                              <QuestionRow
                                question={question}
                                order={order}
                                type={type}
                                expanded={expandedQuestionId === question.id}
                                onToggle={() => setExpandedQuestionId(expandedQuestionId === question.id ? null : question.id)}
                              />
                            </MotionItem>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
              <PrintableDataAnalysis group={selectedGroup} sets={dataAnalysisSets} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
