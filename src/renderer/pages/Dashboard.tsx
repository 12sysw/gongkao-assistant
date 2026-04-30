import { useEffect, useState, useCallback } from 'react';
import {
  Clock,
  Flame,
  BookOpen,
  CheckCircle2,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { cn } from '../lib/utils';

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

const EMPTY_STATS: DashboardStats = {
  streak: 0,
  total_questions: 0,
  total_minutes: 0,
  mastered_count: 0,
  active_days: 0,
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);

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

  return (
    <div className="p-6 space-y-6">
      {/* Hero banner */}
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

      {/* Stats grid */}
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

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickLinks />
        <StudyStats stats={stats} />
      </div>
    </div>
  );
}

function QuickLinks() {
  const links = [
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
    {
      icon: ArrowRight,
      text: '番茄专注',
      href: '/pomodoro',
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
            <span className="text-sm text-surface-500">累计刷题数</span>
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
