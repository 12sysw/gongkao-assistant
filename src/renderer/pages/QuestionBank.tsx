import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  FileText,
  Tag,
  RefreshCw,
  Trash2,
  Layers,
  Database,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { MotionItem } from '../components/ui/Motion';
import { SkeletonCard } from '../components/ui/Skeleton';
import {
  useRagDocs,
  useDeleteRagDocBatch,
  useSyncQuestions,
  useQuestions,
} from '../hooks/use-api';
import type { QuestionRecord, RagDoc } from '../../shared/ipc';

interface DocGroup {
  key: string;
  displayTitle: string;
  source: string;
  category: string;
  created_at: string;
  parts: RagDoc[];
  fullContent: string;
}

const QUESTION_TYPE_ORDER = [
  '行测-常识判断',
  '行测-言语理解',
  '行测-数量关系',
  '行测-判断推理',
  '行测-资料分析',
  '申论',
];
const QUESTION_VISIBLE_BATCH = 80;
const SOURCE_FILTERS = ['manual', 'question_bank', 'pdf_exam', 'pdf_answer'];

function formatQuestionSyncSummary(result: { questionsImported?: number; questionsSkipped?: number; questionsUpdated?: number; questionsUnanswered?: number }) {
  if (result.questionsImported === undefined) return '';
  const updatedText = result.questionsUpdated
    ? `，更新 ${result.questionsUpdated} 题`
    : '';
  const unansweredText = result.questionsUnanswered
    ? `，其中 ${result.questionsUnanswered} 题未识别答案`
    : '';
  return `\n同步可测评题目：新增 ${result.questionsImported} 题${updatedText}，跳过 ${result.questionsSkipped ?? 0} 题${unansweredText}`;
}

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

function getTypeLabel(type: string) {
  return type.replace(/^行测-/, '') || '未分类';
}

function normalizeQuestionType(question: QuestionRecord) {
  const raw = String(question.type ?? '');
  if (QUESTION_TYPE_ORDER.includes(raw)) return raw;
  if (normalizeText(question.content).startsWith('【资料】')) return '行测-资料分析';
  if (/资料|材料分析|统计|图表|增长率|比重/.test(raw)) return '行测-资料分析';
  if (/判断|图形推理|定义判断|类比推理|逻辑判断/.test(raw)) return '行测-判断推理';
  if (/数量|数学运算|数字推理|数资/.test(raw)) return '行测-数量关系';
  if (/言语|逻辑填空|片段阅读|语句表达|阅读理解|中心理解/.test(raw)) return '行测-言语理解';
  if (/申论/.test(raw)) return '申论';
  return '行测-常识判断';
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

function getQuestionSource(question: QuestionRecord) {
  const tags = String(question.tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  const ignored = new Set(['pdf_import', 'pdf_exam', 'pdf_answer', 'question_bank', 'manual']);
  const sourceTag = [...tags].reverse().find((tag) => !ignored.has(tag) && !/^\d+个分片合并$/.test(tag));
  if (sourceTag) return sourceTag;
  return question.created_at ? new Date(question.created_at).toLocaleDateString('zh-CN') : '本地题库';
}

function getQuestionSearchText(question: QuestionRecord) {
  return [
    question.type,
    question.content,
    question.options,
    question.answer,
    question.explanation,
    question.tags,
  ].join('\n').toLowerCase();
}

function getAnswerStatus(question: QuestionRecord) {
  const explanation = String(question.explanation ?? '');
  if (/未识别到答案|默认使用/.test(explanation)) return '未识别答案';
  return `答案 ${question.answer || '-'}`;
}

// 解析标题中的分片编号 "文件名 (2/6)" -> { base: "文件名", part: 2, total: 6 }
function parsePartInfo(title: string): { base: string; part: number; total: number } {
  const m = title.match(/^(.+?)\s*\((\d+)\/(\d+)\)\s*$/);
  if (m) return { base: m[1].trim(), part: +m[2], total: +m[3] };
  return { base: title, part: 1, total: 1 };
}

function QuestionPreview({ question }: { question: QuestionRecord }) {
  const display = splitQuestionDisplay(question.content);
  const options = parseOptions(question.options);

  return (
    <div className="space-y-4">
      {display.material && (
        <div className="rounded-lg border border-info/20 bg-info-light/50 dark:bg-info/10 px-4 py-3">
          <div className="text-xs font-semibold text-info-dark dark:text-info mb-2">资料</div>
          <div className="whitespace-pre-wrap text-sm leading-7 text-surface-700 dark:text-surface-200">
            {display.material}
          </div>
        </div>
      )}

      <div className="whitespace-pre-wrap text-sm leading-7 text-surface-800 dark:text-surface-100">
        {display.question}
      </div>

      {options.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {options.map((option, index) => (
            <div
              key={`${question.id}-${index}`}
              className="rounded-md bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 px-3 py-2 text-sm leading-6 text-surface-700 dark:text-surface-200"
            >
              {option}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
        <span className={cn(
          'px-2 py-1 rounded-md font-medium',
          getAnswerStatus(question) === '未识别答案'
            ? 'bg-warning-light text-warning-text dark:bg-warning/10 dark:text-warning'
            : 'bg-success-light text-success-text dark:bg-success/10 dark:text-success'
        )}>
          {getAnswerStatus(question)}
        </span>
        <span>来源：{getQuestionSource(question)}</span>
        {question.explanation && <span className="truncate max-w-full">解析：{question.explanation}</span>}
      </div>
    </div>
  );
}

const QuestionBank: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);
  const [expandedDocKey, setExpandedDocKey] = useState<string | null>(null);
  const [showSourceDocs, setShowSourceDocs] = useState(false);
  const [visibleQuestionCount, setVisibleQuestionCount] = useState(QUESTION_VISIBLE_BATCH);

  const { data: docs = [], isLoading: docsLoading } = useRagDocs(showSourceDocs);
  const { data: questions = [], isLoading: questionsLoading } = useQuestions();
  const deleteDocBatch = useDeleteRagDocBatch();
  const syncMutation = useSyncQuestions();
  const isLoading = questionsLoading;

  const sources = useMemo(
    () => ['all', ...SOURCE_FILTERS],
    [],
  );

  const filteredQuestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return questions.filter((question) => {
      const type = normalizeQuestionType(question);
      const source = getQuestionSource(question);
      const matchesType = selectedType === 'all' || type === selectedType;
      const matchesSource = selectedSource === 'all'
        || String(question.tags ?? '').includes(selectedSource)
        || source === selectedSource;
      const matchesSearch = !query || getQuestionSearchText(question).includes(query);
      return matchesType && matchesSource && matchesSearch;
    });
  }, [questions, searchQuery, selectedSource, selectedType]);

  const questionGroups = useMemo(() => {
    const map = new Map<string, QuestionRecord[]>();
    for (const type of QUESTION_TYPE_ORDER) {
      map.set(type, []);
    }
    for (const question of filteredQuestions) {
      const type = normalizeQuestionType(question);
      if (!map.has(type)) map.set(type, []);
      map.get(type)!.push(question);
    }
    for (const items of map.values()) {
      items.sort((a, b) => a.id - b.id);
    }
    return [...map.entries()]
      .map(([type, items]) => [type, items.slice(0, visibleQuestionCount)] as const)
      .filter(([, items]) => items.length > 0);
  }, [filteredQuestions, visibleQuestionCount]);

  const filteredTypeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const question of filteredQuestions) {
      const type = normalizeQuestionType(question);
      map.set(type, (map.get(type) ?? 0) + 1);
    }
    return map;
  }, [filteredQuestions]);

  const typeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const question of questions) {
      const type = normalizeQuestionType(question);
      map.set(type, (map.get(type) ?? 0) + 1);
    }
    return map;
  }, [questions]);

  const displayedQuestionTotal = useMemo(
    () => questionGroups.reduce((sum, [, items]) => sum + items.length, 0),
    [questionGroups],
  );

  const hasMoreQuestions = displayedQuestionTotal < filteredQuestions.length;

  // 将分片文档合并为组，每组代表一篇完整的 PDF 来源。
  const docGroups = useMemo(() => {
    if (!showSourceDocs) return [];
    const query = searchQuery.trim().toLowerCase();
    const filtered = docs.filter((doc) => {
      if (!doc.content || doc.content.trim().length < 20) return false;
      const matchesSearch =
        !query ||
        doc.title.toLowerCase().includes(query) ||
        doc.content.toLowerCase().includes(query) ||
        doc.category.toLowerCase().includes(query);
      const matchesSrc = selectedSource === 'all' || doc.source === selectedSource;
      return matchesSearch && matchesSrc;
    });

    const map = new Map<string, DocGroup>();
    for (const doc of filtered) {
      const info = parsePartInfo(doc.title);
      const groupKey = `${doc.source}::${doc.category}::${info.base}`;
      let group = map.get(groupKey);
      if (!group) {
        group = {
          key: groupKey,
          displayTitle: info.base,
          source: doc.source,
          category: doc.category,
          created_at: doc.created_at,
          parts: [],
          fullContent: '',
        };
        map.set(groupKey, group);
      }
      group.parts.push(doc);
      if (doc.created_at > group.created_at) group.created_at = doc.created_at;
    }

    for (const group of map.values()) {
      group.parts.sort((a, b) => parsePartInfo(a.title).part - parsePartInfo(b.title).part);
      group.fullContent = group.parts.map((p) => p.content).join('\n\n');
    }

    return [...map.values()].sort((a, b) => {
      if (a.category !== b.category) return (a.category || '').localeCompare(b.category || '');
      const yearA = parseInt(a.displayTitle.match(/\d{4}/)?.[0] || '0', 10);
      const yearB = parseInt(b.displayTitle.match(/\d{4}/)?.[0] || '0', 10);
      if (yearA !== yearB) return yearB - yearA;
      return a.displayTitle.localeCompare(b.displayTitle);
    });
  }, [docs, searchQuery, selectedSource, showSourceDocs]);

  useEffect(() => {
    setVisibleQuestionCount(QUESTION_VISIBLE_BATCH);
    setExpandedQuestionId(null);
  }, [searchQuery, selectedSource, selectedType]);

  const handleSyncQuestions = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      alert(`同步完成：新增 ${result.synced} 条知识文档${formatQuestionSyncSummary(result)}`);
    } catch {
      alert('同步失败');
    }
  };

  const handleDeleteGroup = async (group: DocGroup) => {
    if (!confirm(`确定要删除「${group.displayTitle}」（${group.parts.length} 个分片）吗？`)) return;
    try {
      await deleteDocBatch.mutateAsync(group.parts.map((p) => p.id));
    } catch {
      alert('删除失败');
    }
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      manual: '手动添加',
      question_bank: '题库同步',
      pdf_exam: 'PDF真题',
      pdf_answer: 'PDF解析',
    };
    return labels[source] || source;
  };

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      manual: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      question_bank: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
      pdf_exam: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
      pdf_answer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    };
    return colors[source] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  return (
    <div className="h-full flex flex-col bg-surface-0 dark:bg-surface-900">
      <div className="shrink-0 px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-0 font-display flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-500" />
            题库管理
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncQuestions}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-4 h-4', syncMutation.isPending && 'animate-spin')} />
              同步结构化题
            </button>
            <button
              onClick={() => navigate('/real-papers')}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
            >
              <Database className="w-4 h-4" />
              已导入真题
            </button>
            <button
              onClick={() => navigate('/paper-import')}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
            >
              <FileText className="w-4 h-4" />
              PDF 真题导入
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索题干、资料、选项、答案或来源..."
              className="w-full pl-10 pr-4 py-2 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-brand-500"
          >
            <option value="all">所有题型</option>
            {QUESTION_TYPE_ORDER.map((type) => (
              <option key={type} value={type}>{getTypeLabel(type)}（{typeCounts.get(type) ?? 0}）</option>
            ))}
          </select>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3 py-2 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-brand-500"
          >
            <option value="all">所有来源</option>
            {sources.filter((s): s is string => s !== 'all').map((src: string) => (
              <option key={src} value={src}>{getSourceLabel(src)}</option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-medium text-surface-500 dark:text-surface-400">
          <span className="flex items-center gap-1.5"><Database className="w-4 h-4" />结构化题目 {questions.length} 题</span>
          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            来源文档 {showSourceDocs ? `${docs.length} 条` : '按需加载'}
          </span>
          <span>匹配 {filteredQuestions.length} 题，已显示 {displayedQuestionTotal} 题</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-surface-400">
            <BookOpen className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">暂无结构化题目</p>
            <p className="text-sm mt-2">导入 PDF 后点击“同步结构化题”，题目会按类型进入这里</p>
          </div>
        ) : questionGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-surface-400">
            <Search className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">没有匹配的题目</p>
            <p className="text-sm mt-2">换一个关键词或题型筛选</p>
          </div>
        ) : (
          <div className="space-y-6">
            {questionGroups.map(([type, items]) => (
              <section key={type} className="space-y-2">
                <h2 className="text-lg font-bold text-surface-800 dark:text-surface-0 font-display flex items-center gap-2 sticky top-0 bg-surface-0 dark:bg-surface-900 py-2 z-10">
                  <Tag className="w-5 h-5 text-brand-500" />
                  {getTypeLabel(type)}
                  <span className="text-sm font-normal text-surface-400">
                    ({items.length}/{filteredTypeCounts.get(type) ?? items.length})
                  </span>
                </h2>
                <div className="space-y-2">
                  {items.map((question) => {
                    const expanded = expandedQuestionId === question.id;
                    const display = splitQuestionDisplay(question.content);
                    return (
                      <MotionItem key={question.id}>
                        <article className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden hover:shadow-soft transition-shadow">
                          <button
                            type="button"
                            className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
                            onClick={() => setExpandedQuestionId(expanded ? null : question.id)}
                          >
                            <div className="w-10 shrink-0 text-sm font-semibold text-surface-500 dark:text-surface-400 tabular-nums">
                              #{question.id}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                                  {getTypeLabel(type)}
                                </span>
                                {display.material && (
                                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-info-light text-info-text dark:bg-info/10 dark:text-info">
                                    含资料
                                  </span>
                                )}
                                <span className="text-xs text-surface-400">{getAnswerStatus(question)}</span>
                              </div>
                              <h3 className="text-sm font-medium text-surface-800 dark:text-surface-100 line-clamp-2">
                                {display.question}
                              </h3>
                            </div>
                            {expanded ? (
                              <ChevronDown className="w-5 h-5 text-surface-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-surface-400" />
                            )}
                          </button>
                          {expanded && (
                            <div className="px-4 py-4 bg-surface-50 dark:bg-surface-700/40 border-t border-surface-200 dark:border-surface-700">
                              <QuestionPreview question={question} />
                            </div>
                          )}
                        </article>
                      </MotionItem>
                    );
                  })}
                </div>
              </section>
            ))}

            {hasMoreQuestions && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setVisibleQuestionCount((count) => count + QUESTION_VISIBLE_BATCH)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
                >
                  加载更多题目
                </button>
              </div>
            )}

            <section className="pt-2">
              <button
                type="button"
                onClick={() => setShowSourceDocs((value) => !value)}
                className="w-full flex items-center justify-between rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-4 py-3 text-sm font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-surface-400" />
                  来源文档检查
                  <span className="text-surface-400 font-normal">
                    {showSourceDocs ? `(${docGroups.length} 篇)` : '(点击后加载)'}
                  </span>
                </span>
                {showSourceDocs ? <ChevronDown className="w-5 h-5 text-surface-400" /> : <ChevronRight className="w-5 h-5 text-surface-400" />}
              </button>

              {showSourceDocs && (
                <div className="mt-3 space-y-2">
                  {docsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                    </div>
                  ) : docGroups.length === 0 ? (
                    <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-4 py-8 text-center text-sm text-surface-400">
                      暂无来源文档
                    </div>
                  ) : docGroups.map((group) => (
                    <MotionItem key={group.key}>
                      <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
                        <div
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700"
                          onClick={() => setExpandedDocKey(expandedDocKey === group.key ? null : group.key)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getSourceColor(group.source))}>
                                {getSourceLabel(group.source)}
                              </span>
                              <span className="text-xs text-surface-400">{group.parts.length} 个分片</span>
                              <span className="text-xs text-surface-400">{new Date(group.created_at).toLocaleDateString('zh-CN')}</span>
                            </div>
                            <h3 className="text-sm font-medium text-surface-800 dark:text-surface-100 truncate">{group.displayTitle}</h3>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group); }}
                            className="p-1.5 text-surface-400 hover:text-danger-500 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-colors"
                            title="删除来源文档"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {expandedDocKey === group.key ? (
                            <ChevronDown className="w-5 h-5 text-surface-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-surface-400" />
                          )}
                        </div>
                        {expandedDocKey === group.key && (
                          <div className="px-4 py-3 bg-surface-50 dark:bg-surface-700/50 border-t border-surface-200 dark:border-surface-700">
                            <div className="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap max-h-[32rem] overflow-y-auto leading-relaxed">
                              {group.fullContent}
                            </div>
                          </div>
                        )}
                      </div>
                    </MotionItem>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>


    </div>
  );
};

export default QuestionBank;
