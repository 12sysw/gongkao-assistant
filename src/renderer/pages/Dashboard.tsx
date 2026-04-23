import React from 'react';
import {
  Clock,
  Flame,
  Target,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  CheckCircle,
  Timer,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { useExamConfig, useDailyStats, useDueReviews, useWrongBookRecords } from '../hooks/use-api';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { cn } from '../lib/utils';

function formatMinutes(m: number) {
  if (m < 60) return `${m}分钟`;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min > 0 ? `${h}小时${min}分钟` : `${h}小时`;
}

function getExamCountdown(date?: string): { days: number; hours: number; passed: boolean } {
  if (!date) return { days: 0, hours: 0, passed: false };
  const examDate = new Date(date);
  const now = new Date();
  const diff = examDate.getTime() - now.getTime();
  if (diff < 0) return { days: 0, hours: 0, passed: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return { days, hours, passed: false };
}

function getAccuracyVariant(pct: number): 'error' | 'warning' | 'info' | 'success' {
  if (pct < 50) return 'error';
  if (pct < 70) return 'warning';
  if (pct < 85) return 'info';
  return 'success';
}

export default function Dashboard() {
  const { data: examConfig } = useExamConfig();
  const { data: stats } = useDailyStats(30);
  const { data: dueReviews = [] } = useDueReviews();
  const { data: wrongRecords = [] } = useWrongBookRecords();

  const countdown = getExamCountdown(examConfig?.date);

  // 计算各题型正确率
  const typeAccuracy = React.useMemo(() => {
    const typeStats: Record<string, { correct: number; total: number }> = {};
    wrongRecords.forEach((r: any) => {
      if (!typeStats[r.type]) typeStats[r.type] = { correct: 0, total: 0 };
      typeStats[r.type].total++;
      if (r.mastered) typeStats[r.type].correct++;
    });
    return Object.entries(typeStats).map(([type, stat]) => ({ type, ...stat }));
  }, [wrongRecords]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* 考试倒计时 */}
      {examConfig && (
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl p-6 text-white',
            countdown.passed
              ? 'bg-slate-500'
              : 'gradient-primary'
          )}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-white/70" />
                <p className="text-white/80 text-sm font-medium">{examConfig.name}</p>
              </div>
              <p className="text-white/50 text-xs">{examConfig.date}</p>
            </div>
            {!countdown.passed ? (
              <div className="flex items-center gap-1">
                <div className="text-center px-3">
                  <p className="text-4xl font-bold tabular-nums">{countdown.days}</p>
                  <p className="text-xs text-white/70 mt-0.5">天</p>
                </div>
                <span className="text-white/30 text-2xl font-light pb-4">:</span>
                <div className="text-center px-3">
                  <p className="text-4xl font-bold tabular-nums">{countdown.hours}</p>
                  <p className="text-xs text-white/70 mt-0.5">小时</p>
                </div>
              </div>
            ) : (
              <p className="text-white/80 text-sm">考试已结束</p>
            )}
          </div>
        </div>
      )}

      {/* 核心数据 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Flame}
          iconColor="text-warning-500"
          iconBgColor="bg-warning-50"
          label="连续学习"
          value={`${stats?.streak || 0}天`}
        />
        <StatCard
          icon={BookOpen}
          iconColor="text-primary-500"
          iconBgColor="bg-primary-50"
          label="累计刷题"
          value={`${stats?.total_questions || 0}道`}
        />
        <StatCard
          icon={Clock}
          iconColor="text-success-500"
          iconBgColor="bg-success-50"
          label="学习时长"
          value={stats?.total_minutes ? formatMinutes(stats.total_minutes) : '0分钟'}
        />
        <StatCard
          icon={CheckCircle}
          iconColor="text-info-500"
          iconBgColor="bg-info-50"
          label="已掌握错题"
          value={`${stats?.mastered_count || 0}道`}
        />
      </div>

      {/* 待复习 + 正确率 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DueReviewCard dueReviews={dueReviews} />
        <AccuracyCard typeAccuracy={typeAccuracy} />
      </div>

      {/* 快捷入口 */}
      <Card padding="md">
        <CardHeader>
          <CardTitle>
            <Zap className="w-4 h-4 text-primary-500" />
            快捷功能
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickLink
              href="#/wrong-book"
              icon={AlertTriangle}
              iconColor="text-error-500"
              iconBgColor="bg-error-50"
              label="添加错题"
            />
            <QuickLink
              href="#/mock-exam"
              icon={Timer}
              iconColor="text-primary-500"
              iconBgColor="bg-primary-50"
              label="套题测评"
            />
            <QuickLink
              href="#/flashcards"
              icon={BookOpen}
              iconColor="text-warning-500"
              iconBgColor="bg-warning-50"
              label="记忆卡片"
            />
            <QuickLink
              href="#/pomodoro"
              icon={Clock}
              iconColor="text-success-500"
              iconBgColor="bg-success-50"
              label="番茄专注"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DueReviewCard({ dueReviews }: { dueReviews: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Target className="w-4 h-4 text-error-500" />
          待复习错题
        </CardTitle>
        <Badge variant="error">{dueReviews.length} 道</Badge>
      </CardHeader>
      <CardContent>
        {dueReviews.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 bg-success-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7 text-success-400" />
            </div>
            <p className="text-sm text-slate-500">暂无待复习的错题</p>
            <p className="text-xs text-slate-400 mt-1">继续保持！</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {dueReviews.slice(0, 5).map((item: any) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors group"
              >
                <Badge variant="info" className="shrink-0 text-[10px]">
                  {item.type?.split('-')[1] || item.type}
                </Badge>
                <span className="text-sm text-slate-700 truncate flex-1">
                  {item.content?.slice(0, 30)}...
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            ))}
            {dueReviews.length > 5 && (
              <p className="text-xs text-slate-400 text-center py-2">
                还有 {dueReviews.length - 5} 道...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AccuracyCard({ typeAccuracy }: { typeAccuracy: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <TrendingUp className="w-4 h-4 text-success-500" />
          各题型掌握情况
        </CardTitle>
      </CardHeader>
      <CardContent>
        {typeAccuracy.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm text-slate-500">暂无数据</p>
            <p className="text-xs text-slate-400 mt-1">开始添加错题后查看</p>
          </div>
        ) : (
          <div className="space-y-4">
            {typeAccuracy.map((item: any) => {
              const pct = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
              const variant = getAccuracyVariant(pct);
              return (
                <div key={item.type}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600 font-medium">
                      {item.type.split('-')[1] || item.type}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {item.correct}/{item.total}
                      </span>
                      <Badge variant={variant} className="text-[10px] min-w-[44px] justify-center">
                        {pct}%
                      </Badge>
                    </div>
                  </div>
                  <ProgressBar
                    value={pct}
                    variant={
                      variant === 'error'
                        ? 'error'
                        : variant === 'warning'
                        ? 'warning'
                        : variant === 'info'
                        ? 'primary'
                        : 'success'
                    }
                    size="sm"
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickLink({
  href,
  icon: Icon,
  iconColor,
  iconBgColor,
  label,
}: {
  href: string;
  icon: React.ElementType;
  iconColor: string;
  iconBgColor: string;
  label: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        'flex items-center gap-3 p-3.5 rounded-xl',
        'bg-slate-50 hover:bg-white',
        'border border-transparent hover:border-slate-200',
        'card-shadow hover:card-shadow-hover',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-0.5 group'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          iconBgColor
        )}
      >
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
        {label}
      </span>
      <ArrowRight className="w-3.5 h-3.5 text-slate-300 ml-auto opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
    </a>
  );
}
