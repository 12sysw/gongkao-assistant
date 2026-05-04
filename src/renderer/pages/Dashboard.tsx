import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Clock,
  Flame,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Focus,
  Cloud,
  CloudRain,
  Sun,
  Wind,
  Loader2,
  Quote,
  Sparkles,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { buildReviewRecommendations } from '../lib/review-recommendations';
import {
  useRecentReviewSessions,
  useRecentRecommendationEvents,
  useDueReviews,
  useFlashcards,
  useStudyPlans,
} from '../hooks/use-api';
import { fetchWeather, fetchSaying, fetchAnswer, type WeatherData } from '../lib/uapi';

function getApi() {
  return (window as unknown as Window & { api: Record<string, unknown> }).api;
}

interface DashboardStats {
  streak: number;
  total_questions: number;
  total_minutes: number;
  mastered_count: number;
  active_days: number;
}

interface RecentReviewSession {
  date: string;
  started: number;
  initial_total: number;
  completed_wrong_ids: number[];
  completed_flashcard_ids: number[];
}

interface ReviewDaySummary {
  date: string;
  label: string;
  started: boolean;
  completedCount: number;
  initialTotal: number;
  percent: number;
  fullyCompleted: boolean;
}

interface WrongRecord {
  id: number;
  type?: string | null;
}

interface Flashcard {
  id: number;
  category?: string | null;
  mastered?: number | null;
  next_review?: string | null;
}

interface StudyPlan {
  id: number;
  title?: string | null;
  subject?: string | null;
  priority?: 'low' | 'medium' | 'high' | null;
  status?: 'pending' | 'in_progress' | 'completed' | null;
  daily_minutes?: number | null;
}

interface RecommendationEvent {
  id: number;
  date: string;
  source: string;
  title: string;
  href: string;
  created_at: string | null;
}

const EMPTY_STATS: DashboardStats = {
  streak: 0,
  total_questions: 0,
  total_minutes: 0,
  mastered_count: 0,
  active_days: 0,
};

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function formatDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildRecentReviewSummary(sessions: RecentReviewSession[]): ReviewDaySummary[] {
  const sessionMap = new Map(
    sessions.map((session) => {
      const completedCount =
        (Array.isArray(session.completed_wrong_ids) ? session.completed_wrong_ids.length : 0) +
        (Array.isArray(session.completed_flashcard_ids) ? session.completed_flashcard_ids.length : 0);
      const initialTotal = Number(session.initial_total ?? 0);
      const percent = initialTotal > 0 ? Math.round((completedCount / initialTotal) * 100) : 0;
      return [
        session.date,
        {
          started: Boolean(session.started),
          completedCount,
          initialTotal,
          percent,
          fullyCompleted: initialTotal > 0 && completedCount >= initialTotal,
        },
      ];
    })
  );

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dateKey = formatDateKey(date);
    const session = sessionMap.get(dateKey);

    return {
      date: dateKey,
      label: WEEKDAY_LABELS[date.getDay()],
      started: session?.started ?? false,
      completedCount: session?.completedCount ?? 0,
      initialTotal: session?.initialTotal ?? 0,
      percent: session?.percent ?? 0,
      fullyCompleted: session?.fullyCompleted ?? false,
    };
  });
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [saying, setSaying] = useState('');
  const [answer, setAnswer] = useState('');
  const recentReviewQuery = useRecentReviewSessions(7);
  const recommendationEventsQuery = useRecentRecommendationEvents(7);
  const dueReviewsQuery = useDueReviews();
  const flashcardsQuery = useFlashcards();
  const studyPlansQuery = useStudyPlans();

  const [city] = useState(() => {
    try {
      return localStorage.getItem('dashboard_city') || '北京';
    } catch {
      return '北京';
    }
  });

  useEffect(() => {
    let cancelled = false;

    fetchWeather(city)
      .then((data) => {
        if (!cancelled) {
          setWeather(data);
          setWeatherLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setWeatherLoading(false);
      });

    fetchSaying()
      .then((text) => {
        if (!cancelled) setSaying(text);
      })
      .catch(() => {});

    fetchAnswer()
      .then((text) => {
        if (!cancelled) setAnswer(text);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [city]);

  const loadStats = useCallback(async () => {
    try {
      const api = getApi();
      if (!api) return;
      const data = (await api.dailyRecord.getStats(365)) as DashboardStats | null;
      if (data) setStats(data);
    } catch (e) {
      console.error('加载仪表盘数据失败', e);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formattedHours = (stats.total_minutes / 60).toFixed(1);
  const recentReviewSessions = (recentReviewQuery.data ?? []) as RecentReviewSession[];
  const recommendationEvents = (recommendationEventsQuery.data ?? []) as RecommendationEvent[];
  const dueReviews = (dueReviewsQuery.data ?? []) as WrongRecord[];
  const flashcards = (flashcardsQuery.data ?? []) as Flashcard[];
  const studyPlans = (studyPlansQuery.data ?? []) as StudyPlan[];
  const recentReviewSummary = useMemo(
    () => buildRecentReviewSummary(recentReviewSessions),
    [recentReviewSessions]
  );

  const reviewSummaryStats = useMemo(() => {
    const startedDays = recentReviewSummary.filter((day) => day.started).length;
    const averageCompletion =
      recentReviewSummary.length > 0
        ? Math.round(
            recentReviewSummary.reduce((sum, day) => sum + day.percent, 0) /
              recentReviewSummary.length
          )
        : 0;
    const bestDay = recentReviewSummary.reduce<ReviewDaySummary | null>((best, day) => {
      if (!best) return day;
      return day.percent > best.percent ? day : best;
    }, null);

    let completionStreak = 0;
    for (let index = recentReviewSummary.length - 1; index >= 0; index -= 1) {
      if (recentReviewSummary[index].fullyCompleted) {
        completionStreak += 1;
      } else {
        break;
      }
    }

    return {
      startedDays,
      averageCompletion,
      bestDay,
      completionStreak,
    };
  }, [recentReviewSummary]);

  const recommendations = useMemo(() => {
    return buildReviewRecommendations({
      dueReviews,
      flashcards,
      studyPlans,
      todayKey: formatDateKey(),
    });
  }, [dueReviews, flashcards, studyPlans]);

  return (
    <div className="p-6 space-y-6">
      <div className="bg-brand-gradient text-white px-6 py-5 rounded-2xl shadow-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/[0.08] rounded-full -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/[0.04] rounded-full translate-y-1/3 -translate-x-1/4" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold mb-1 font-display">公务员考试学习进度</h1>
            <p className="text-white/70 text-xs">持之以恒，循序渐进</p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold font-display">{stats.streak}</p>
              <p className="text-xs text-white/60 mt-0.5">连续学习(天)</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold font-display">{stats.total_questions.toLocaleString()}</p>
              <p className="text-xs text-white/60 mt-0.5">累计刷题(道)</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold font-display">{formattedHours}h</p>
              <p className="text-xs text-white/60 mt-0.5">学习时长</p>
            </div>
          </div>
        </div>
      </div>

      <WeatherBanner weather={weather} loading={weatherLoading} />

      {saying && <SayingBanner text={saying} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Flame}
          iconColor="text-brand-500"
          iconBgColor="bg-brand-100"
          label="连续学习"
          value={`${stats.streak}天`}
        />
        <StatCard
          icon={BookOpen}
          iconColor="text-brand-500"
          iconBgColor="bg-brand-100"
          label="累计刷题"
          value={`${stats.total_questions.toLocaleString()}道`}
        />
        <StatCard
          icon={Clock}
          iconColor="text-brand-500"
          iconBgColor="bg-brand-100"
          label="学习时长"
          value={`${formattedHours}小时`}
        />
        <StatCard
          icon={CheckCircle2}
          iconColor="text-brand-500"
          iconBgColor="bg-brand-100"
          label="已掌握错题"
          value={`${stats.mastered_count}道`}
        />
      </div>

      <RecommendationCard items={recommendations} />

      <RecommendationAdoptionCard
        events={recommendationEvents}
        loading={recommendationEventsQuery.isLoading}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <ReviewSummaryCard
          startedDays={reviewSummaryStats.startedDays}
          averageCompletion={reviewSummaryStats.averageCompletion}
          completionStreak={reviewSummaryStats.completionStreak}
          bestDay={reviewSummaryStats.bestDay}
          loading={recentReviewQuery.isLoading}
        />
        <ReviewHeatmapCard
          days={recentReviewSummary}
          loading={recentReviewQuery.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QuickLinks />
        <StudyStats stats={stats} />
        {answer && <AnswerCard text={answer} />}
      </div>

      <ReviewHistoryCard sessions={recentReviewSummary} loading={recentReviewQuery.isLoading} />
    </div>
  );
}

function RecommendationCard({ items }: { items: Array<{ title: string; body: string; href: string }> }) {
  const api = getApi();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-4 h-4 text-brand-500" />
          今日建议
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.title}
              to={item.href}
              onClick={() => {
                api?.recommendationEvent?.add?.({
                  date: formatDateKey(),
                  source: 'dashboard',
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
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationAdoptionCard({
  events,
  loading,
}: {
  events: RecommendationEvent[];
  loading: boolean;
}) {
  const totalClicks = events.length;
  const latest = events[0] ?? null;
  const topTitle =
    events.length > 0
      ? Object.entries(
          events.reduce<Record<string, number>>((acc, item) => {
            acc[item.title] = (acc[item.title] ?? 0) + 1;
            return acc;
          }, {})
        ).sort((a, b) => b[1] - a[1])[0][0]
      : '暂无';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-4 h-4 text-brand-500" />
          建议采纳反馈
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-surface-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            正在加载采纳记录...
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryTile label="近 7 天点击" value={`${totalClicks}次`} />
            <SummaryTile label="最常被点建议" value={topTitle} />
            <SummaryTile
              label="最近一次采纳"
              value={latest ? `${latest.date} · ${latest.source}` : '暂无'}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewSummaryCard({
  startedDays,
  averageCompletion,
  completionStreak,
  bestDay,
  loading,
}: {
  startedDays: number;
  averageCompletion: number;
  completionStreak: number;
  bestDay: ReviewDaySummary | null;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Focus className="w-4 h-4 text-brand-500" />
          统一复习摘要
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-surface-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            正在汇总最近 7 天数据...
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-4">
            <SummaryTile label="近 7 天启动" value={`${startedDays}天`} />
            <SummaryTile label="平均完成率" value={`${averageCompletion}%`} />
            <SummaryTile label="连续完成" value={`${completionStreak}天`} />
            <SummaryTile
              label="最好的一天"
              value={bestDay ? `${bestDay.label} · ${bestDay.percent}%` : '暂无'}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewHeatmapCard({
  days,
  loading,
}: {
  days: ReviewDaySummary[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Focus className="w-4 h-4 text-brand-500" />
          本周统一复习热力
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-surface-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            正在加载本周热力...
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-3">
            {days.map((day) => (
              <div key={day.date} className="text-center">
                <div
                  className={cn(
                    'mx-auto h-16 w-full rounded-xl border transition-all',
                    day.percent >= 100
                      ? 'border-brand-300 bg-brand-500/90'
                      : day.percent >= 60
                      ? 'border-brand-200 bg-brand-400/70'
                      : day.started
                      ? 'border-brand-100 bg-brand-200/80'
                      : 'border-surface-100 bg-surface-50'
                  )}
                  title={`${day.date} · 完成 ${day.completedCount}/${day.initialTotal || 0}`}
                />
                <p className="mt-2 text-xs text-surface-500">{day.label}</p>
                <p className="mt-1 text-xs text-surface-400">{day.percent}%</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-0 p-4">
      <p className="text-xs text-surface-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-surface-900 font-display">{value}</p>
    </div>
  );
}

function QuickLinks() {
  const links = [
    {
      icon: Focus,
      text: '统一复习',
      href: '/review',
    },
    {
      icon: ArrowRight,
      text: '套题测评',
      href: '/mock-exam',
    },
    {
      icon: ArrowRight,
      text: '错题本',
      href: '/wrong-book',
    },
    {
      icon: ArrowRight,
      text: '记忆卡片',
      href: '/flashcards',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>快捷功能</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {links.map((link, i) => (
            <Link
              key={i}
              to={link.href}
              className={cn(
                'flex items-center gap-3 p-4 rounded-xl border border-surface-100 transition-all duration-200',
                'bg-surface-0 hover:bg-brand-50 hover:border-brand-200 hover:shadow-soft'
              )}
            >
              <link.icon className={cn('w-5 h-5 text-brand-500')} />
              <span className="text-sm font-medium text-surface-800">{link.text}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewHistoryCard({
  sessions,
  loading,
}: {
  sessions: ReviewDaySummary[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Focus className="w-4 h-4 text-brand-500" />
          最近 7 天统一复习
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-surface-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            正在加载复习记录...
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl bg-surface-0 p-4 text-sm text-surface-500">
            还没有统一复习记录，去完成一次今日复习，这里就会开始积累趋势。
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.date} className="rounded-xl border border-surface-100 bg-surface-0 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-surface-900">{session.date}</p>
                    <p className="mt-1 text-xs text-surface-500">
                      {session.started ? '已启动统一复习' : '未启动'} · 完成 {session.completedCount} / {session.initialTotal || 0}
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
  );
}

function WeatherBanner({ weather, loading }: { weather: WeatherData | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-surface-100">
        <Loader2 className="w-5 h-5 text-surface-400 animate-spin" />
        <span className="text-sm text-surface-400">加载天气中...</span>
      </div>
    );
  }

  if (!weather) return null;

  const getWeatherIcon = (w: string): typeof Sun => {
    if (w.includes('雨')) return CloudRain;
    if (w.includes('云') || w.includes('阴')) return Cloud;
    if (w.includes('风')) return Wind;
    return Sun;
  };
  const Icon = getWeatherIcon(weather.weather);

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white border border-surface-100">
      <Icon className="w-8 h-8 text-brand-500" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-surface-900 font-display">{weather.temperature}°C</span>
          <span className="text-sm text-surface-500">{weather.weather}</span>
        </div>
        <p className="text-xs text-surface-400 truncate">
          {weather.city} · {weather.wind_direction}
          {weather.wind_power} · 湿度{weather.humidity}%
        </p>
      </div>
    </div>
  );
}

function SayingBanner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-50 border border-brand-100">
      <Quote className="w-5 h-5 text-brand-500 shrink-0" />
      <p className="text-sm text-brand-700 italic">{text}</p>
    </div>
  );
}

function AnswerCard({ text }: { text: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-500" />
          答案之书
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-surface-600 leading-relaxed">{text}</p>
      </CardContent>
    </Card>
  );
}

function StudyStats({ stats }: { stats: DashboardStats }) {
  const activeDays = stats.active_days || 0;
  const avgDailyMinutes = activeDays > 0 ? Math.round(stats.total_minutes / activeDays) : 0;
  const avgDailyHours = (avgDailyMinutes / 60).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>学习统计</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-500">累计学习天数</span>
            <span className="text-lg font-semibold text-surface-900 font-display">{activeDays}天</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-500">平均每日时长</span>
            <span className="text-lg font-semibold text-surface-900 font-display">{avgDailyHours}小时</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-500">累计刷题数量</span>
            <span className="text-lg font-semibold text-surface-900 font-display">{stats.total_questions.toLocaleString()}道</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-500">已掌握错题</span>
            <span className="text-lg font-semibold text-surface-900 font-display">{stats.mastered_count}道</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
