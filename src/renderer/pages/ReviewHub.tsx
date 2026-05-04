import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Loader2,
  PlayCircle,
  RotateCcw,
  Target,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useDueReviews, useFlashcards, useStudyPlans, useDailyStats } from '../hooks/use-api';
import { buildReviewRecommendations } from '../lib/review-recommendations';
import { cn } from '../lib/utils';

type WrongRecord = {
  id: number;
  type?: string | null;
  content?: string | null;
  wrong_count?: number | null;
  review_count?: number | null;
  next_review_at?: string | null;
  mastered?: number | null;
};

type Flashcard = {
  id: number;
  front?: string | null;
  back?: string | null;
  category?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  review_count?: number | null;
  next_review?: string | null;
  mastered?: number | null;
};

type StudyPlan = {
  id: number;
  title?: string | null;
  subject?: string | null;
  target_date?: string | null;
  priority?: 'low' | 'medium' | 'high' | null;
  status?: 'pending' | 'in_progress' | 'completed' | null;
  daily_minutes?: number | null;
};

type DailyStats = {
  streak?: number | null;
  total_minutes?: number | null;
};

type LogForm = {
  study_minutes: number;
  questions_done: number;
  wrong_count: number;
  note: string;
};

type ReviewTask =
  | {
      kind: 'wrong';
      id: number;
      title: string;
      subtitle: string;
      record: WrongRecord;
    }
  | {
      kind: 'flashcard';
      id: number;
      title: string;
      subtitle: string;
      card: Flashcard;
    };

type ReviewSession = {
  date: string;
  started: boolean;
  initial_total: number;
  completed_wrong_ids: number[];
  completed_flashcard_ids: number[];
};

type RecentReviewSession = {
  date: string;
  started: number;
  initial_total: number;
  completed_wrong_ids: number[];
  completed_flashcard_ids: number[];
};

function getApi() {
  return (window as unknown as Window & { api?: Record<string, any> }).api;
}

function formatDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

function safeText(value: string | null | undefined, fallback: string) {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function truncate(text: string | null | undefined, max: number) {
  const content = safeText(text, '暂无内容');
  if (content.length <= max) return content;
  return content.slice(0, max) + '...';
}

function getTypeLabel(type: string | null | undefined) {
  return safeText(type, '未分类');
}

function getCategoryLabel(category: string | null | undefined) {
  return safeText(category, '未分类');
}

function getPriorityLabel(priority: StudyPlan['priority']) {
  if (priority === 'high') return '高优先';
  if (priority === 'low') return '低优先';
  return '中优先';
}

function getPriorityClass(priority: StudyPlan['priority']) {
  if (priority === 'high') return 'bg-danger-light text-danger-dark';
  if (priority === 'low') return 'bg-success-light text-success-dark';
  return 'bg-warning-light text-warning-dark';
}

function getDifficultyLabel(difficulty: Flashcard['difficulty']) {
  if (difficulty === 'easy') return '简单';
  if (difficulty === 'hard') return '困难';
  return '中等';
}

function formatReviewTime(value: string | null | undefined) {
  const text = String(value ?? '').trim();
  if (!text) return '今天';
  return text.replace('T', ' ').slice(0, 16);
}

function formatDate(value: string | null | undefined) {
  return String(value ?? '').slice(0, 10) || '未设置';
}

function isDueFlashcard(nextReview: string | null | undefined, todayKey: string) {
  return String(nextReview ?? '').slice(0, 10) <= todayKey;
}

function createEmptyReviewSession(todayKey: string): ReviewSession {
  return {
    date: todayKey,
    started: false,
    initial_total: 0,
    completed_wrong_ids: [],
    completed_flashcard_ids: [],
  };
}

const StatTile: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: 'brand' | 'success' | 'info';
}> = ({ icon: Icon, label, value, tone = 'brand' }) => {
  const toneMap = {
    brand: 'bg-brand-100 text-brand-600',
    success: 'bg-success-light text-success-dark',
    info: 'bg-surface-100 text-surface-700',
  };

  return (
    <Card hover={false} className="h-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-surface-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-surface-900 font-display">{value}</p>
        </div>
        <div className={cn('rounded-xl p-2.5', toneMap[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
};

const SectionHeader: React.FC<{
  title: string;
  subtitle: string;
  to?: string;
  cta?: string;
}> = ({ title, subtitle, to, cta }) => (
  <div className="flex items-end justify-between gap-3">
    <div>
      <h2 className="text-base font-semibold text-surface-900 font-display">{title}</h2>
      <p className="mt-1 text-sm text-surface-500">{subtitle}</p>
    </div>
    {to && cta ? (
      <Link to={to} className="shrink-0">
        <Button variant="outline" size="sm">
          {cta}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    ) : null}
  </div>
);

const LogStudyModal: React.FC<{
  show: boolean;
  form: LogForm;
  onClose: () => void;
  onChange: (form: LogForm) => void;
  onSubmit: () => void;
}> = ({ show, form, onClose, onChange, onSubmit }) => {
  if (!show) return null;

  const update = <K extends keyof LogForm>(key: K, value: LogForm[K]) => {
    onChange({ ...form, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="m-4 w-full max-w-sm rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-surface-900 font-display">记录今天学习</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-surface-600">学习时长（分钟）</label>
            <input
              type="number"
              value={form.study_minutes}
              onChange={(e) => update('study_minutes', parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              min={1}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-surface-600">做题数量</label>
              <input
                type="number"
                value={form.questions_done}
                onChange={(e) => update('questions_done', parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                min={0}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-surface-600">新增错题</label>
              <input
                type="number"
                value={form.wrong_count}
                onChange={(e) => update('wrong_count', parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                min={0}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-surface-600">学习笔记</label>
            <textarea
              value={form.note}
              onChange={(e) => update('note', e.target.value)}
              className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              rows={3}
              placeholder="今天主要复习了什么，哪些地方卡住了？"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button onClick={onSubmit} disabled={form.study_minutes <= 0}>
              保存记录
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReviewHub: React.FC = () => {
  const queryClient = useQueryClient();
  const api = getApi();
  const todayKey = formatDateKey();
  const dueReviewsQuery = useDueReviews();
  const flashcardsQuery = useFlashcards();
  const studyPlansQuery = useStudyPlans();
  const statsQuery = useDailyStats(30);

  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [showLogStudy, setShowLogStudy] = useState(false);
  const [reviewSession, setReviewSession] = useState<ReviewSession>(() => createEmptyReviewSession(todayKey));
  const [recentSessions, setRecentSessions] = useState<RecentReviewSession[]>([]);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [logForm, setLogForm] = useState<LogForm>({
    study_minutes: 45,
    questions_done: 0,
    wrong_count: 0,
    note: '',
  });

  const dueReviews = (dueReviewsQuery.data ?? []) as WrongRecord[];
  const flashcards = (flashcardsQuery.data ?? []) as Flashcard[];
  const studyPlans = (studyPlansQuery.data ?? []) as StudyPlan[];
  const stats = (statsQuery.data ?? null) as DailyStats | null;

  const dueFlashcards = useMemo(
    () => flashcards.filter((card) => !Number(card.mastered ?? 0) && isDueFlashcard(card.next_review, todayKey)),
    [flashcards, todayKey]
  );

  const activePlans = useMemo(
    () => studyPlans.filter((plan) => (plan.status ?? 'pending') !== 'completed'),
    [studyPlans]
  );

  const priorityPlans = useMemo(
    () =>
      [...activePlans]
        .sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority ?? 'medium'] - priorityOrder[b.priority ?? 'medium'];
        })
        .slice(0, 4),
    [activePlans]
  );

  const reviewFlow = useMemo<ReviewTask[]>(
    () => [
      ...dueReviews.map((record) => ({
        kind: 'wrong' as const,
        id: record.id,
        title: truncate(record.content, 88),
        subtitle: `${getTypeLabel(record.type)} · 错 ${Number(record.wrong_count ?? 0)} 次`,
        record,
      })),
      ...dueFlashcards.map((card) => ({
        kind: 'flashcard' as const,
        id: card.id,
        title: truncate(card.front, 88),
        subtitle: `${getCategoryLabel(card.category)} · ${getDifficultyLabel(card.difficulty ?? 'medium')}`,
        card,
      })),
    ],
    [dueReviews, dueFlashcards]
  );

  const recommendations = useMemo(
    () =>
      buildReviewRecommendations({
        dueReviews,
        flashcards,
        studyPlans,
        todayKey,
      }),
    [dueReviews, flashcards, studyPlans, todayKey]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const api = getApi();
      if (!api?.reviewSession?.get) return;

      try {
        const session = (await api.reviewSession.get(todayKey)) as ReviewSession | null;
        if (!cancelled && session) {
          setReviewSession({
            date: todayKey,
            started: Boolean((session as any).started),
            initial_total: Number((session as any).initial_total ?? 0),
            completed_wrong_ids: Array.isArray((session as any).completed_wrong_ids)
              ? (session as any).completed_wrong_ids.map(Number)
              : [],
            completed_flashcard_ids: Array.isArray((session as any).completed_flashcard_ids)
              ? (session as any).completed_flashcard_ids.map(Number)
              : [],
          });
          setSessionLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setReviewSession(createEmptyReviewSession(todayKey));
          setSessionLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [todayKey]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const api = getApi();
      if (!api?.reviewSession?.getRecent) return;

      try {
        const sessions = (await api.reviewSession.getRecent(7)) as RecentReviewSession[];
        if (!cancelled) {
          setRecentSessions(Array.isArray(sessions) ? sessions : []);
        }
      } catch {
        if (!cancelled) {
          setRecentSessions([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reviewSession]);

  useEffect(() => {
    const api = getApi();
    if (!api?.reviewSession?.set || !sessionLoaded) return;

    api.reviewSession.set(reviewSession).catch(() => {
      // ignore persistence failures and keep UI usable
    });
  }, [reviewSession, sessionLoaded]);

  useEffect(() => {
    if (flashcardIndex > 0 && flashcardIndex >= dueFlashcards.length) {
      setFlashcardIndex(Math.max(0, dueFlashcards.length - 1));
    }
    if (dueFlashcards.length === 0) {
      setFlashcardFlipped(false);
      setFlashcardIndex(0);
    }
  }, [dueFlashcards.length, flashcardIndex]);

  const currentFlashcard = dueFlashcards[flashcardIndex] ?? null;
  const currentTask = reviewSession.started ? reviewFlow[0] ?? null : null;
  const loading =
    dueReviewsQuery.isLoading ||
    flashcardsQuery.isLoading ||
    studyPlansQuery.isLoading ||
    statsQuery.isLoading;

  const completedFlowCount =
    reviewSession.completed_wrong_ids.length + reviewSession.completed_flashcard_ids.length;
  const totalReviewItems = Math.max(reviewSession.initial_total, reviewFlow.length + completedFlowCount);
  const streak = Number(stats?.streak ?? 0);
  const totalMinutes = Number(stats?.total_minutes ?? 0);
  const progressPercent = totalReviewItems > 0 ? Math.round((completedFlowCount / totalReviewItems) * 100) : 100;
  const recentReviewSummary = recentSessions.map((session) => {
    const completedCount =
      (Array.isArray(session.completed_wrong_ids) ? session.completed_wrong_ids.length : 0) +
      (Array.isArray(session.completed_flashcard_ids) ? session.completed_flashcard_ids.length : 0);
    const initialTotal = Number(session.initial_total ?? 0);
    const percent = initialTotal > 0 ? Math.round((completedCount / initialTotal) * 100) : 0;
    return {
      date: session.date,
      started: Boolean(session.started),
      completedCount,
      initialTotal,
      percent,
    };
  });

  const refreshReviewData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dueReviews'] }),
      queryClient.invalidateQueries({ queryKey: ['wrongBookRecords'] }),
      queryClient.invalidateQueries({ queryKey: ['flashcards'] }),
      queryClient.invalidateQueries({ queryKey: ['dailyStats'] }),
    ]);
  }, [queryClient]);

  const appendCompletedWrong = useCallback((id: number) => {
    setReviewSession((current) => ({
      ...current,
      completed_wrong_ids: current.completed_wrong_ids.includes(id)
        ? current.completed_wrong_ids
        : [...current.completed_wrong_ids, id],
    }));
  }, []);

  const appendCompletedFlashcard = useCallback((id: number) => {
    setReviewSession((current) => ({
      ...current,
      completed_flashcard_ids: current.completed_flashcard_ids.includes(id)
        ? current.completed_flashcard_ids
        : [...current.completed_flashcard_ids, id],
    }));
  }, []);

  const handleWrongReviewed = useCallback(
    async (record: WrongRecord, countForSession = false) => {
      const api = getApi();
      if (!api?.wrongBook?.update) return;

      const nextReviewSteps = [1, 3, 7, 14, 30];
      const nextReviewCount = Number(record.review_count ?? 0) + 1;
      const nextDays = nextReviewSteps[Math.min(nextReviewCount - 1, nextReviewSteps.length - 1)];
      setBusyKey(`wrong-review-${record.id}`);
      try {
        await api.wrongBook.update({
          id: record.id,
          review_count: nextReviewCount,
          next_review_at: addDays(nextDays),
        });
        if (countForSession) appendCompletedWrong(record.id);
        await refreshReviewData();
      } finally {
        setBusyKey(null);
      }
    },
    [appendCompletedWrong, refreshReviewData]
  );

  const handleWrongMastered = useCallback(
    async (recordId: number, countForSession = false) => {
      const api = getApi();
      if (!api?.wrongBook?.markMastered) return;

      setBusyKey(`wrong-mastered-${recordId}`);
      try {
        await api.wrongBook.markMastered(recordId);
        if (countForSession) appendCompletedWrong(recordId);
        await refreshReviewData();
      } finally {
        setBusyKey(null);
      }
    },
    [appendCompletedWrong, refreshReviewData]
  );

  const handleFlashcardResult = useCallback(
    async (correct: boolean, card: Flashcard | null, countForSession = false) => {
      const api = getApi();
      if (!api?.flashcard?.update || !card) return;

      const nextReviewCount = Number(card.review_count ?? 0) + 1;
      const nextDays = correct ? Math.min(2 ** nextReviewCount, 30) : 1;
      setBusyKey(`flashcard-${card.id}`);
      try {
        await api.flashcard.update({
          id: card.id,
          review_count: nextReviewCount,
          mastered: correct && nextReviewCount >= 5 ? 1 : 0,
          next_review: addDays(nextDays),
        });
        if (countForSession) appendCompletedFlashcard(card.id);
        setFlashcardFlipped(false);
        await refreshReviewData();
      } finally {
        setBusyKey(null);
      }
    },
    [appendCompletedFlashcard, refreshReviewData]
  );

  const handleStartToday = () => {
    setReviewSession({
      date: todayKey,
      started: true,
      initial_total: reviewFlow.length,
      completed_wrong_ids: [],
      completed_flashcard_ids: [],
    });
    setFlashcardFlipped(false);
    setFlashcardIndex(0);
  };

  const handleLogStudy = async () => {
    const api = getApi();
    if (!api?.dailyRecord?.add) return;

    setBusyKey('log-study');
    try {
      await api.dailyRecord.add({
        date: todayKey,
        ...logForm,
      });
      await queryClient.invalidateQueries({ queryKey: ['dailyStats'] });
      setShowLogStudy(false);
      setLogForm({
        study_minutes: 45,
        questions_done: 0,
        wrong_count: 0,
        note: '',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const canGoPrev = flashcardIndex > 0;
  const canGoNext = flashcardIndex < dueFlashcards.length - 1;

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl bg-brand-gradient px-6 py-5 text-white shadow-card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Review Flow</p>
            <h1 className="mt-2 text-2xl font-bold font-display">统一复习</h1>
            <p className="mt-2 text-sm text-white/75">
              把今天该做的错题、卡片和计划收进一个入口，少切页面，直接开练。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-xs text-white/60">待复习</p>
              <p className="mt-1 text-2xl font-bold font-display">{reviewFlow.length}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-xs text-white/60">错题</p>
              <p className="mt-1 text-2xl font-bold font-display">{dueReviews.length}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-xs text-white/60">卡片</p>
              <p className="mt-1 text-2xl font-bold font-display">{dueFlashcards.length}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-xs text-white/60">进行中计划</p>
              <p className="mt-1 text-2xl font-bold font-display">{activePlans.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon={Target} label="今日总任务" value={`${totalReviewItems}`} />
        <StatTile icon={CheckCircle2} label="连续学习" value={`${streak}天`} tone="success" />
        <StatTile icon={Clock3} label="近30天学习" value={`${(totalMinutes / 60).toFixed(1)}h`} tone="info" />
        <StatTile icon={CalendarCheck} label="活跃计划" value={`${activePlans.length}`} />
      </div>

      {loading ? (
        <Card hover={false} className="py-12">
          <div className="flex flex-col items-center justify-center gap-3 text-surface-400">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            <p className="text-sm">正在汇总今天的复习任务...</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card hover={false}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-brand-500" />
                今日任务工作台
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-900">
                    已完成 {reviewSession.completed_wrong_ids.length + reviewSession.completed_flashcard_ids.length} / {totalReviewItems || 0}
                  </p>
                  <p className="mt-1 text-sm text-surface-500">
                    {reviewSession.started
                      ? currentTask
                        ? `正在处理当前任务：${currentTask.subtitle}`
                        : '今天的串行复习已经完成，可以记录学习成果。'
                      : '点一下开始今日复习，系统会按顺序带你过完今天的到期任务。'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleStartToday}>
                    <PlayCircle className="h-4 w-4" />
                    {reviewSession.started ? '重新开始今日复习' : '开始今日复习'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowLogStudy(true)}>
                    <Clock3 className="h-4 w-4" />
                    记录学习
                  </Button>
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-surface-100">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {reviewSession.started ? (
                <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
                  {!currentTask ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-brand-700">今天的串行复习已经完成。</p>
                      <p className="text-sm text-brand-600">
                        即使刷新页面，今天已完成的进度也会保留下来。接下来可以推进学习计划，或者记录学习成果。
                      </p>
                    </div>
                  ) : currentTask.kind === 'wrong' ? (
                    <div className="space-y-3">
                      <p className="text-xs text-brand-500">当前任务 · 错题</p>
                      <p className="text-sm font-medium leading-6 text-surface-900">{currentTask.title}</p>
                      <p className="text-xs text-surface-500">
                        {currentTask.subtitle} · 下次复习 {formatReviewTime(currentTask.record.next_review_at)}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyKey === `wrong-review-${currentTask.record.id}`}
                          onClick={() => handleWrongReviewed(currentTask.record, true)}
                        >
                          {busyKey === `wrong-review-${currentTask.record.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                          已复习并继续
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busyKey === `wrong-mastered-${currentTask.record.id}`}
                          onClick={() => handleWrongMastered(currentTask.record.id, true)}
                        >
                          {busyKey === `wrong-mastered-${currentTask.record.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          已掌握并继续
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-brand-500">当前任务 · 卡片</p>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setFlashcardFlipped((value) => !value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setFlashcardFlipped((value) => !value);
                          }
                        }}
                        className="cursor-pointer rounded-xl border border-white/70 bg-white p-4"
                      >
                        <p className="text-xs text-surface-400">
                          {flashcardFlipped ? '答案面' : '题面'}
                        </p>
                        <p className="mt-2 text-sm font-medium leading-6 text-surface-900">
                          {flashcardFlipped
                            ? truncate(currentTask.card.back, 160)
                            : truncate(currentTask.card.front, 160)}
                        </p>
                        <p className="mt-2 text-xs text-surface-500">{currentTask.subtitle}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!flashcardFlipped || busyKey === `flashcard-${currentTask.card.id}`}
                          onClick={() => handleFlashcardResult(false, currentTask.card, true)}
                        >
                          {busyKey === `flashcard-${currentTask.card.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                          还不会并继续
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={!flashcardFlipped || busyKey === `flashcard-${currentTask.card.id}`}
                          onClick={() => handleFlashcardResult(true, currentTask.card, true)}
                        >
                          {busyKey === `flashcard-${currentTask.card.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          会了并继续
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card hover={false}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4 text-brand-500" />
                当前优先建议
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {recommendations.map((item) => (
                <Link
                  key={item.title}
                  to={item.href}
                  onClick={() => {
                    api?.recommendationEvent?.add?.({
                      date: todayKey,
                      source: 'review-hub',
                      title: item.title,
                      href: item.href,
                    });
                  }}
                  className="rounded-xl border border-surface-100 bg-surface-0 p-4 transition hover:border-brand-200 hover:bg-brand-50"
                >
                  <p className="text-sm font-medium text-surface-900">{item.title}</p>
                  <p className="mt-2 text-sm text-surface-500 leading-6">{item.body}</p>
                </Link>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_1.1fr_0.9fr]">
            <Card hover={false}>
              <CardContent className="space-y-4">
                <SectionHeader
                  title="待复习错题"
                  subtitle={`今天需要回看的错题 ${dueReviews.length} 道`}
                  to="/wrong-book"
                  cta="去错题本"
                />
                {dueReviews.length === 0 ? (
                  <div className="rounded-xl bg-success-light/60 p-4 text-sm text-success-dark">
                    今天没有到期错题，状态不错，继续保持。
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dueReviews.slice(0, 4).map((record) => (
                      <div key={record.id} className="rounded-xl border border-surface-100 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-lg bg-surface-50 px-2 py-1 text-xs text-surface-500">
                            {getTypeLabel(record.type)}
                          </span>
                          <span className="text-xs text-surface-400">错 {Number(record.wrong_count ?? 0)} 次</span>
                        </div>
                        <p className="mt-3 text-sm font-medium leading-6 text-surface-900">
                          {truncate(record.content, 90)}
                        </p>
                        <p className="mt-2 text-xs text-surface-400">
                          下次复习：{formatReviewTime(record.next_review_at)}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyKey === `wrong-review-${record.id}`}
                            onClick={() => handleWrongReviewed(record)}
                          >
                            {busyKey === `wrong-review-${record.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            已复习
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={busyKey === `wrong-mastered-${record.id}`}
                            onClick={() => handleWrongMastered(record.id)}
                          >
                            {busyKey === `wrong-mastered-${record.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            已掌握
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card hover={false}>
              <CardContent className="space-y-4">
                <SectionHeader
                  title="卡片快刷"
                  subtitle={`今天该翻的记忆卡片 ${dueFlashcards.length} 张`}
                  to="/flashcards"
                  cta="去卡片页"
                />
                {!currentFlashcard ? (
                  <div className="rounded-xl bg-success-light/60 p-4 text-sm text-success-dark">
                    今天没有到期卡片，可以把精力放到新题和计划上。
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-surface-400">
                      <span>
                        {flashcardIndex + 1} / {dueFlashcards.length}
                      </span>
                      <span>
                        {getCategoryLabel(currentFlashcard.category)} · {getDifficultyLabel(currentFlashcard.difficulty ?? 'medium')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFlashcardFlipped((value) => !value)}
                      className="w-full rounded-2xl border border-surface-100 bg-gradient-to-br from-brand-50 via-white to-brand-100 p-6 text-left transition hover:border-brand-200"
                    >
                      <p className="text-xs text-surface-400">
                        {flashcardFlipped ? '答案面' : '题面'}
                      </p>
                      <p className="mt-3 text-lg font-semibold leading-8 text-surface-900">
                        {flashcardFlipped
                          ? truncate(currentFlashcard.back, 140)
                          : truncate(currentFlashcard.front, 140)}
                      </p>
                      <p className="mt-4 text-xs text-surface-400">
                        点击卡片切换正反面 · 已复习 {Number(currentFlashcard.review_count ?? 0)} 次
                      </p>
                    </button>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!flashcardFlipped || busyKey === `flashcard-${currentFlashcard.id}`}
                        onClick={() => handleFlashcardResult(false, currentFlashcard)}
                      >
                        {busyKey === `flashcard-${currentFlashcard.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        还不会
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={!flashcardFlipped || busyKey === `flashcard-${currentFlashcard.id}`}
                        onClick={() => handleFlashcardResult(true, currentFlashcard)}
                      >
                        {busyKey === `flashcard-${currentFlashcard.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        会了
                      </Button>
                      <div className="ml-auto flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!canGoPrev}
                          onClick={() => {
                            setFlashcardFlipped(false);
                            setFlashcardIndex((value) => Math.max(0, value - 1));
                          }}
                        >
                          上一张
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!canGoNext}
                          onClick={() => {
                            setFlashcardFlipped(false);
                            setFlashcardIndex((value) => Math.min(dueFlashcards.length - 1, value + 1));
                          }}
                        >
                          下一张
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card hover={false}>
              <CardContent className="space-y-4">
                <SectionHeader
                  title="当前计划"
                  subtitle={`优先盯住 ${priorityPlans.length} 个主线计划`}
                  to="/study-plan"
                  cta="去计划页"
                />
                {priorityPlans.length === 0 ? (
                  <div className="rounded-xl bg-surface-50 p-4 text-sm text-surface-500">
                    还没有进行中的计划，可以去学习计划页建一个。
                  </div>
                ) : (
                  <div className="space-y-3">
                    {priorityPlans.map((plan) => (
                      <div key={plan.id} className="rounded-xl border border-surface-100 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className={cn('rounded-lg px-2 py-1 text-xs', getPriorityClass(plan.priority ?? 'medium'))}>
                            {getPriorityLabel(plan.priority ?? 'medium')}
                          </span>
                          <span className="text-xs text-surface-400">
                            {(plan.status ?? 'pending') === 'in_progress' ? '进行中' : '待开始'}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-medium text-surface-900">
                          {safeText(plan.title, '未命名计划')}
                        </p>
                        <p className="mt-2 text-xs text-surface-400">
                          {safeText(plan.subject, '未分类')} · 每日 {Number(plan.daily_minutes ?? 0)} 分钟 · 截止 {formatDate(plan.target_date)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card hover={false}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-brand-500" />
                快速进入
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <Link
                to="/wrong-book"
                className="rounded-xl border border-surface-100 bg-surface-0 p-4 transition hover:border-brand-200 hover:bg-brand-50"
              >
                <p className="text-sm font-medium text-surface-900">错题复盘</p>
                <p className="mt-1 text-sm text-surface-500">优先处理到期错题和高频失误。</p>
              </Link>
              <Link
                to="/flashcards"
                className="rounded-xl border border-surface-100 bg-surface-0 p-4 transition hover:border-brand-200 hover:bg-brand-50"
              >
                <p className="text-sm font-medium text-surface-900">卡片速刷</p>
                <p className="mt-1 text-sm text-surface-500">快速过一轮记忆卡片，适合零碎时间。</p>
              </Link>
              <Link
                to="/mock-exam"
                className="rounded-xl border border-surface-100 bg-surface-0 p-4 transition hover:border-brand-200 hover:bg-brand-50"
              >
                <p className="text-sm font-medium text-surface-900">模考闭环</p>
                <p className="mt-1 text-sm text-surface-500">用一组训练检查今天复习有没有转成输出。</p>
              </Link>
            </CardContent>
          </Card>

          <Card hover={false}>
            <CardHeader>
              <CardTitle>最近 7 天复习记录</CardTitle>
            </CardHeader>
            <CardContent>
              {recentReviewSummary.length === 0 ? (
                <div className="rounded-xl bg-surface-50 p-4 text-sm text-surface-500">
                  这几天还没有留下统一复习记录，开始一次今日复习后这里就会慢慢长出来。
                </div>
              ) : (
                <div className="space-y-3">
                  {recentReviewSummary.map((session) => (
                    <div key={session.date} className="rounded-xl border border-surface-100 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-surface-900">{session.date}</p>
                          <p className="mt-1 text-xs text-surface-500">
                            {session.started ? '已启动今日复习' : '未启动'} · 完成 {session.completedCount} / {session.initialTotal || 0}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-surface-900 font-display">{session.percent}%</p>
                          <p className="text-xs text-surface-400">完成率</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-100">
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all duration-300"
                          style={{ width: `${session.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <LogStudyModal
            show={showLogStudy}
            form={logForm}
            onClose={() => setShowLogStudy(false)}
            onChange={setLogForm}
            onSubmit={handleLogStudy}
          />
        </div>
      )}
    </div>
  );
};

export default ReviewHub;
