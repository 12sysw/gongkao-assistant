import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Clock3,
  Flame,
  GitBranch,
  RefreshCcw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useQuestions, useWrongBookRecords } from '../hooks/use-api';
import type { QuestionRecord, WrongBookRecord } from '../../shared/ipc';
import {
  civilServiceSkillTree,
  type CivilServiceSkillModule,
  type CivilServiceSkillNode,
} from '../lib/civil-service-skill-tree';
import { cn } from '../lib/utils';

type EvidenceRecord = Pick<QuestionRecord, 'type' | 'content' | 'tags' | 'explanation'>;

interface SkillStats {
  questionCount: number;
  wrongCount: number;
  activeWrongCount: number;
  masteredCount: number;
  dueCount: number;
  recentWrongCount: number;
  repairRate: number | null;
  coverageRate: number;
  priorityScore: number;
}

const accentStyles: Record<CivilServiceSkillModule['accent'], {
  badge: string;
  soft: string;
  border: string;
  bar: string;
  text: string;
}> = {
  blue: {
    badge: 'bg-blue-500 text-white',
    soft: 'bg-blue-50 dark:bg-blue-950/35',
    border: 'border-blue-200 dark:border-blue-900/60',
    bar: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
  },
  violet: {
    badge: 'bg-violet-500 text-white',
    soft: 'bg-violet-50 dark:bg-violet-950/35',
    border: 'border-violet-200 dark:border-violet-900/60',
    bar: 'bg-violet-500',
    text: 'text-violet-700 dark:text-violet-300',
  },
  amber: {
    badge: 'bg-amber-500 text-white',
    soft: 'bg-amber-50 dark:bg-amber-950/35',
    border: 'border-amber-200 dark:border-amber-900/60',
    bar: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
  },
  emerald: {
    badge: 'bg-emerald-500 text-white',
    soft: 'bg-emerald-50 dark:bg-emerald-950/35',
    border: 'border-emerald-200 dark:border-emerald-900/60',
    bar: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  rose: {
    badge: 'bg-rose-500 text-white',
    soft: 'bg-rose-50 dark:bg-rose-950/35',
    border: 'border-rose-200 dark:border-rose-900/60',
    bar: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
  },
  cyan: {
    badge: 'bg-cyan-500 text-white',
    soft: 'bg-cyan-50 dark:bg-cyan-950/35',
    border: 'border-cyan-200 dark:border-cyan-900/60',
    bar: 'bg-cyan-500',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
};

function normalize(value: unknown) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, ' ');
}

function recordText(record: EvidenceRecord) {
  return normalize([record.type, record.tags, record.content, record.explanation].join(' '));
}

function matchesKeywords(record: EvidenceRecord, keywords: string[]) {
  const text = recordText(record);
  return keywords.some((keyword) => text.includes(normalize(keyword)));
}

function parseLocalDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNodeStats(
  node: CivilServiceSkillNode,
  questions: QuestionRecord[],
  wrongRecords: WrongBookRecord[]
): SkillStats {
  const matchedQuestions = questions.filter((question) => matchesKeywords(question, node.keywords));
  const matchedWrong = wrongRecords.filter((record) => matchesKeywords(record, node.keywords));
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const masteredCount = matchedWrong.filter((record) => Boolean(record.mastered)).length;
  const activeWrongCount = matchedWrong.length - masteredCount;
  const dueCount = matchedWrong.filter((record) => {
    if (record.mastered || !record.next_review_at) return false;
    const dueAt = parseLocalDate(record.next_review_at);
    return Boolean(dueAt && dueAt.getTime() <= now.getTime());
  }).length;
  const recentWrongCount = matchedWrong.filter((record) => {
    const wrongAt = parseLocalDate(record.last_wrong_at);
    return Boolean(wrongAt && wrongAt.getTime() >= sevenDaysAgo.getTime());
  }).length;

  const repairRate = matchedWrong.length > 0
    ? Math.round((masteredCount / matchedWrong.length) * 100)
    : null;
  const coverageRate = Math.min(100, Math.round((matchedQuestions.length / node.targetQuestions) * 100));
  const priorityScore = dueCount * 6 + recentWrongCount * 4 + activeWrongCount * 3 - masteredCount;

  return {
    questionCount: matchedQuestions.length,
    wrongCount: matchedWrong.length,
    activeWrongCount,
    masteredCount,
    dueCount,
    recentWrongCount,
    repairRate,
    coverageRate,
    priorityScore,
  };
}

function getModuleRecords<T extends EvidenceRecord>(module: CivilServiceSkillModule, records: T[]) {
  return records.filter((record) => matchesKeywords(record, module.typeKeywords));
}

function statusFor(stats: SkillStats) {
  if (stats.dueCount > 0) {
    return { label: '今日到期', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' };
  }
  if (stats.activeWrongCount > 0) {
    return { label: '补弱中', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' };
  }
  if (stats.wrongCount > 0 && stats.activeWrongCount === 0) {
    return { label: '已闭环', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' };
  }
  if (stats.questionCount > 0) {
    return { label: '待训练', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' };
  }
  return { label: '未覆盖', className: 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400' };
}

const MetricCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  note: string;
  tone: string;
}> = ({ icon: Icon, label, value, note, tone }) => (
  <div className="rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-surface-950 dark:text-white">{value}</p>
      </div>
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tone)}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
    <p className="mt-3 text-xs text-surface-500 dark:text-surface-400">{note}</p>
  </div>
);

const SkillTree: React.FC = () => {
  const questionsQuery = useQuestions();
  const wrongQuery = useWrongBookRecords();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(civilServiceSkillTree.map((module) => module.id))
  );

  const questions = questionsQuery.data ?? [];
  const wrongRecords = wrongQuery.data ?? [];
  const isLoading = questionsQuery.isLoading || wrongQuery.isLoading;

  const moduleData = useMemo(() => civilServiceSkillTree.map((module) => {
    const moduleQuestions = getModuleRecords(module, questions);
    const moduleWrong = getModuleRecords(module, wrongRecords);
    const nodes = module.nodes.map((node) => ({
      node,
      stats: getNodeStats(node, questions, wrongRecords),
    }));
    const mastered = moduleWrong.filter((record) => Boolean(record.mastered)).length;
    const activeWrong = moduleWrong.length - mastered;
    const due = moduleWrong.filter((record) => {
      if (record.mastered) return false;
      const dueAt = parseLocalDate(record.next_review_at);
      return Boolean(dueAt && dueAt.getTime() <= Date.now());
    }).length;

    return {
      module,
      nodes,
      questionCount: moduleQuestions.length,
      wrongCount: moduleWrong.length,
      masteredCount: mastered,
      activeWrongCount: activeWrong,
      dueCount: due,
      repairRate: moduleWrong.length > 0 ? Math.round((mastered / moduleWrong.length) * 100) : null,
      priorityScore: nodes.reduce((sum, item) => sum + item.stats.priorityScore, 0) + due * 4,
    };
  }), [questions, wrongRecords]);

  const sevenDayTrend = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return {
        key: localDateKey(date),
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        count: 0,
      };
    });
    const dayMap = new Map(days.map((day) => [day.key, day]));
    wrongRecords.forEach((record) => {
      const date = parseLocalDate(record.last_wrong_at);
      if (!date) return;
      const day = dayMap.get(localDateKey(date));
      if (day) day.count += 1;
    });
    return days;
  }, [wrongRecords]);

  const priorityNodes = useMemo(() => moduleData
    .flatMap(({ module, nodes }) => nodes.map(({ node, stats }) => ({ module, node, stats })))
    .sort((a, b) => {
      if (b.stats.priorityScore !== a.stats.priorityScore) {
        return b.stats.priorityScore - a.stats.priorityScore;
      }
      return b.stats.questionCount - a.stats.questionCount;
    })
    .slice(0, 3), [moduleData]);

  const activeWrongCount = wrongRecords.filter((record) => !record.mastered).length;
  const masteredCount = wrongRecords.filter((record) => Boolean(record.mastered)).length;
  const dueCount = wrongRecords.filter((record) => {
    if (record.mastered) return false;
    const dueAt = parseLocalDate(record.next_review_at);
    return Boolean(dueAt && dueAt.getTime() <= Date.now());
  }).length;
  const maxTrend = Math.max(1, ...sevenDayTrend.map((day) => day.count));

  const toggleModule = (moduleId: string) => {
    setExpandedModules((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-surface-500">
          <RefreshCcw className="h-5 w-5 animate-spin" />
          正在生成能力画像…
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-5 pb-12 lg:p-8">
      <header className="overflow-hidden rounded-3xl border border-surface-200 bg-surface-950 text-white shadow-sm dark:border-surface-800">
        <div className="grid gap-8 p-6 lg:grid-cols-[1.35fr_0.65fr] lg:p-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-surface-300">
              <GitBranch className="h-3.5 w-3.5" />
              能力树 × 错题闭环 × 7 日追踪
            </div>
            <h1 className="max-w-3xl text-3xl font-bold tracking-tight lg:text-4xl">
              不只看做了多少题，直接告诉你今天最该补哪一块
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-surface-300 lg:text-base">
              题库、错题状态与复习日期会自动映射到公考能力节点。当前版本不虚构正确率，
              优先展示真实可追溯的题库覆盖、活跃错题、到期复习和闭环修复率。
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-surface-400">Today's focus</p>
                <p className="mt-2 text-lg font-semibold">今日闭环</p>
              </div>
              <Target className="h-8 w-8 text-brand-300" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-xl font-bold">{dueCount}</p>
                <p className="mt-1 text-[11px] text-surface-400">到期复习</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-xl font-bold">{activeWrongCount}</p>
                <p className="mt-1 text-[11px] text-surface-400">活跃错题</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-xl font-bold">{priorityNodes[0]?.node.name ?? '待导入'}</p>
                <p className="mt-1 text-[11px] text-surface-400">第一优先</p>
              </div>
            </div>
            <Link
              to={dueCount > 0 || activeWrongCount > 0 ? '/wrong-book' : '/question-bank'}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-surface-950 transition hover:bg-surface-100"
            >
              开始今日任务
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={BookOpenCheck}
          label="能力树已关联题目"
          value={questions.length}
          note="来自本地题库，不上传第三方服务"
          tone="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300"
        />
        <MetricCard
          icon={AlertTriangle}
          label="尚未闭环错题"
          value={activeWrongCount}
          note="优先级会随到期时间和近 7 日错误提高"
          tone="bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300"
        />
        <MetricCard
          icon={CheckCircle2}
          label="已掌握错题"
          value={masteredCount}
          note="标记掌握后会计入对应能力节点修复率"
          tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300"
        />
        <MetricCard
          icon={CalendarClock}
          label="今日到期"
          value={dueCount}
          note="到期错题始终排在今日建议最前"
          tone="bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300">Daily loop</p>
              <h2 className="mt-1 text-xl font-bold text-surface-950 dark:text-white">今天最该做什么</h2>
            </div>
            <Link to="/review" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300">
              进入统一复习
            </Link>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {priorityNodes.map(({ module, node, stats }, index) => {
              const style = accentStyles[module.accent];
              const action = stats.dueCount > 0
                ? `复习 ${stats.dueCount} 道到期错题`
                : stats.activeWrongCount > 0
                  ? `复盘 ${stats.activeWrongCount} 道活跃错题`
                  : stats.questionCount > 0
                    ? `从 ${stats.questionCount} 道题中专项训练`
                    : '先导入对应题目';
              return (
                <div key={node.id} className={cn('rounded-2xl border p-4', style.soft, style.border)}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold', style.badge)}>
                      {index + 1}
                    </span>
                    <span className={cn('text-xs font-semibold', style.text)}>{module.name}</span>
                  </div>
                  <h3 className="mt-4 font-bold text-surface-950 dark:text-white">{node.name}</h3>
                  <p className="mt-2 min-h-10 text-xs leading-5 text-surface-600 dark:text-surface-400">{action}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-surface-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      建议 {node.suggestedMinutes} 分钟
                    </span>
                    <span>{node.teacherMode}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-500">Last 7 days</p>
              <h2 className="mt-1 text-xl font-bold text-surface-950 dark:text-white">新增错题趋势</h2>
            </div>
            <TrendingUp className="h-5 w-5 text-surface-400" />
          </div>
          <div className="mt-6 flex h-36 items-end gap-2">
            {sevenDayTrend.map((day) => (
              <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[11px] font-semibold text-surface-600 dark:text-surface-300">{day.count}</span>
                <div className="flex h-24 w-full items-end overflow-hidden rounded-lg bg-surface-100 dark:bg-surface-800">
                  <div
                    className="w-full rounded-lg bg-surface-900 transition-all dark:bg-brand-400"
                    style={{ height: `${Math.max(day.count > 0 ? 10 : 3, (day.count / maxTrend) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-surface-500">{day.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300">Civil service map</p>
            <h2 className="mt-1 text-2xl font-bold text-surface-950 dark:text-white">公考能力树</h2>
            <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
              六大模块、三十四个训练节点；展开后查看题库覆盖与错题修复状态。
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-surface-500">
            <CircleDashed className="h-4 w-4" />
            没有作答记录时不把“题库中存在”误判为“已经掌握”
          </div>
        </div>

        <div className="space-y-4">
          {moduleData.map(({ module, nodes, questionCount, wrongCount, activeWrongCount: moduleActiveWrong, dueCount: moduleDue, repairRate }) => {
            const style = accentStyles[module.accent];
            const expanded = expandedModules.has(module.id);
            return (
              <article key={module.id} className="overflow-hidden rounded-2xl border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
                <button
                  type="button"
                  onClick={() => toggleModule(module.id)}
                  className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-surface-50 dark:hover:bg-surface-850 lg:p-5"
                >
                  <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold', style.badge)}>
                    {module.shortName}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-bold text-surface-950 dark:text-white">{module.name}</span>
                      {moduleDue > 0 && (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                          {moduleDue} 道到期
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-surface-500 dark:text-surface-400">{module.description}</span>
                  </span>
                  <span className="hidden shrink-0 grid-cols-3 gap-6 text-center md:grid">
                    <span>
                      <span className="block text-base font-bold text-surface-900 dark:text-white">{questionCount}</span>
                      <span className="text-[11px] text-surface-500">题库题目</span>
                    </span>
                    <span>
                      <span className="block text-base font-bold text-amber-600 dark:text-amber-300">{moduleActiveWrong}</span>
                      <span className="text-[11px] text-surface-500">活跃错题</span>
                    </span>
                    <span>
                      <span className="block text-base font-bold text-emerald-600 dark:text-emerald-300">{repairRate == null ? '—' : `${repairRate}%`}</span>
                      <span className="text-[11px] text-surface-500">修复率</span>
                    </span>
                  </span>
                  {expanded ? <ChevronDown className="h-5 w-5 text-surface-400" /> : <ChevronRight className="h-5 w-5 text-surface-400" />}
                </button>

                {expanded && (
                  <div className="border-t border-surface-100 bg-surface-50/60 p-4 dark:border-surface-800 dark:bg-surface-950/30 lg:p-5">
                    {questionCount > 0 && wrongCount === 0 && (
                      <div className="mb-4 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                        <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0" />
                        当前题库已有 {questionCount} 道{module.name}题，但还没有错题/掌握记录，因此只显示覆盖情况，不推断正确率。
                      </div>
                    )}
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {nodes.map(({ node, stats }) => {
                        const status = statusFor(stats);
                        const progress = stats.repairRate ?? stats.coverageRate;
                        const progressLabel = stats.repairRate == null ? '题库覆盖' : '错题修复';
                        return (
                          <div key={node.id} className="rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-semibold text-surface-950 dark:text-white">{node.name}</h3>
                                <p className="mt-1 text-xs leading-5 text-surface-500 dark:text-surface-400">{node.description}</p>
                              </div>
                              <span className={cn('shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold', status.className)}>
                                {status.label}
                              </span>
                            </div>
                            <div className="mt-4 flex items-center justify-between text-[11px] text-surface-500">
                              <span>{progressLabel}</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800">
                              <div className={cn('h-full rounded-full transition-all', style.bar)} style={{ width: `${progress}%` }} />
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                              <div className="rounded-lg bg-surface-50 px-2 py-2 dark:bg-surface-800/70">
                                <p className="text-sm font-bold text-surface-900 dark:text-white">{stats.questionCount}</p>
                                <p className="text-[10px] text-surface-500">关联题目</p>
                              </div>
                              <div className="rounded-lg bg-surface-50 px-2 py-2 dark:bg-surface-800/70">
                                <p className="text-sm font-bold text-amber-600 dark:text-amber-300">{stats.activeWrongCount}</p>
                                <p className="text-[10px] text-surface-500">待修复</p>
                              </div>
                              <div className="rounded-lg bg-surface-50 px-2 py-2 dark:bg-surface-800/70">
                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">{stats.masteredCount}</p>
                                <p className="text-[10px] text-surface-500">已掌握</p>
                              </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-3 border-t border-surface-100 pt-3 text-[11px] dark:border-surface-800">
                              <span className="inline-flex items-center gap-1 text-surface-500">
                                <Sparkles className="h-3.5 w-3.5" />
                                {node.teacherMode}
                              </span>
                              <Link
                                to={stats.activeWrongCount > 0 ? '/wrong-book' : stats.questionCount > 0 ? '/question-bank' : '/real-papers'}
                                className={cn('inline-flex items-center gap-1 font-semibold', style.text)}
                              >
                                {stats.activeWrongCount > 0 ? '去复盘' : stats.questionCount > 0 ? '去练习' : '导入题目'}
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white">
              <Flame className="h-4 w-4 text-orange-500" />
              设计来源与许可边界
            </div>
            <p className="mt-2 max-w-4xl text-xs leading-6 text-surface-500 dark:text-surface-400">
              本页吸收 human-skill-tree 的“能力节点”思路，以及 kaogong-study-tracker 的“错题状态、时间趋势、弱项提醒”思路；
              页面代码、分类文案、统计逻辑均为公考小助手重新实现，不复制第三方 Web App 源码或题库内容。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <a
              href="https://github.com/24kchengYe/human-skill-tree"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-surface-200 px-3 py-2 font-medium text-surface-600 hover:border-surface-300 hover:text-surface-900 dark:border-surface-700 dark:text-surface-300"
            >
              human-skill-tree
            </a>
            <a
              href="https://github.com/KaguraNanaga/kaogong-study-tracker"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-surface-200 px-3 py-2 font-medium text-surface-600 hover:border-surface-300 hover:text-surface-900 dark:border-surface-700 dark:text-surface-300"
            >
              kaogong-study-tracker
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SkillTree;
