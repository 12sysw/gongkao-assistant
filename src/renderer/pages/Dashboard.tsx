import React from 'react';
import {
  Clock,
  Flame,
  Target,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
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
    <div className="p-6 space-y-6">
      {/* Exam countdown - sophisticated gradient banner */}
      {examConfig && (
        <div
          className={cn(
            'relative overflow-hidden rounded-3xl p-7 text-white',
            countdown.passed ? 'bg-[#57534e]' : 'bg-gradient-to-br from-[#c2410c] to-[#9a3412]'
          )}
        >
          {/* Ambient orbs */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/8 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/6 rounded-full translate-y-1/2 -translate-x-1/4" />

          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-white/80" />
                <p className="text-white/90 text-sm font-semibold">{examConfig.name}</p>
              </div>
              <p className="text-white/60 text-xs uppercase tracking-wide">{examConfig.date}</p>
            </div>
            {!countdown.passed ? (
              <div className="flex items-center gap-2">
                <div className="text-center px-4">
                  <p className="text-5xl font-bold tabular-nums tracking-tight">{countdown.days}</p>
                  <p className="text-[11px] text-white/70 mt-0.5 font-medium">天</p>
                </div>
                <span className="text-white/40 text-3xl font-light pb-5">:</span>
                <div className="text-center px-4">
                  <p className="text-5xl font-bold tabular-nums tracking-tight">{countdown.hours}</p>
                  <p className="text-[11px] text-white/70 mt-0.5 font-medium">小时</p>
                </div>
              </div>
            ) : (
              <p className="text-white/90 text-sm font-medium">考试已结束</p>
            )}
          </div>
        </div>
      )}

      {/* Core stats - asymmetric grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Flame}
          iconColor="text-[#c2410c]"
          iconBgColor="bg-[#fed7aa]"
          label="连续学习"
          value={`${stats?.streak || 0}天`}
        />
        <StatCard
          icon={BookOpen}
          iconColor="text-[#ca8a04]"
          iconBgColor="bg-[#fef9c3]"
          label="累计刷题"
          value={`${stats?.total_questions || 0}道`}
        />
        <StatCard
          icon={Clock}
          iconColor="text-[#16a34a]"
          iconBgColor="bg-[#dcfce7]"
          label="学习时长"
          value={stats?.total_minutes ? formatMinutes(stats.total_minutes) : '0分钟'}
        />
        <StatCard
          icon={CheckCircle2}
          iconColor="text-[#059669]"
          iconBgColor="bg-[#d1fae5]"
          label="已掌握错题"
          value={`${stats?.mastered_count || 0}道`}
        />
      </div>

      {/* Due reviews + Accuracy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DueReviewCard dueReviews={dueReviews} />
        <AccuracyCard typeAccuracy={typeAccuracy} />
      </div>

      {/* Quick links */}
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
              iconColor="text-red-500"
              iconBgColor="bg-red-50"
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
              iconColor="text-amber-500"
              iconBgColor="bg-amber-50"
              label="记忆卡片"
            />
            <QuickLink
              href="#/pomodoro"
              icon={Clock}
              iconColor="text-emerald-500"
              iconBgColor="bg-emerald-50"
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
          <Target className="w-[18px] h-[18px] text-[#dc2626]" />
          待复习错题
        </CardTitle>
        <Badge variant="error">{dueReviews.length} 道</Badge>
      </CardHeader>
      <CardContent>
        {dueReviews.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#dcfce7] rounded-3xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#16a34a]" />
            </div>
            <p className="text-base font-medium text-[#57534e]">暂无待复习的错题</p>
            <p className="text-sm text-[#a8a29e] mt-1.5">继续保持！</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1.5 custom-scrollbar">
            {dueReviews.slice(0, 5).map((item: any) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[#f5f3f0] hover:bg-white hover:shadow-sm transition-all duration-200 group"
              >
                <Badge variant="info" className="shrink-0 text-[10px] py-0.5">
                  {item.type?.split('-')[1] || item.type}
                </Badge>
                <span className="text-sm font-medium text-[#1c1917] truncate flex-1">
                  {item.content?.slice(0, 28)}...
                </span>
                <ArrowRight className="w-4 h-4 text-[#a8a29e] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            ))}
            {dueReviews.length > 5 && (
              <p className="text-xs text-[#a8a29e] text-center py-3 font-medium">
                还有 {dueReviews.length - 5} 道
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
          <TrendingUp className="w-[18px] h-[18px] text-[#16a34a]" />
          各题型掌握情况
        </CardTitle>
      </CardHeader>
      <CardContent>
        {typeAccuracy.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#f5f3f0] rounded-3xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-[#a8a29e]" />
            </div>
            <p className="text-base font-medium text-[#57534e]">暂无数据</p>
            <p className="text-sm text-[#a8a29e] mt-1.5">开始添加错题后查看</p>
          </div>
        ) : (
          <div className="space-y-5">
            {typeAccuracy.map((item: any) => {
              const pct = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
              const variant = getAccuracyVariant(pct);
              return (
                <div key={item.type} className="group">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-[#1c1917] font-semibold">
                      {item.type.split('-')[1] || item.type}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-[#a8a29e] font-medium">
                        {item.correct}/{item.total}
                      </span>
                      <Badge variant={variant} className="text-[10px] min-w-[44px] justify-center font-semibold py-0.5">
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
                    size="md"
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
        'flex items-center gap-3 p-4 rounded-2xl surface hover:shadow-card-hover transition-all duration-300',
        'hover:-translate-y-0.5 group'
      )}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110',
          iconBgColor
        )}
      >
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <span className="text-sm font-semibold text-[#1c1917] group-hover:text-[#c2410c] transition-colors">
        {label}
      </span>
      <ArrowRight className="w-4 h-4 text-[#a8a29e] ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
    </a>
  );
}
