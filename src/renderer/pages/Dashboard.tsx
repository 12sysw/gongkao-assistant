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
} from 'lucide-react';
import { useExamConfig, useDailyStats, useDueReviews, useWrongBookRecords } from '../hooks/use-api';

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

function getAccuracyColor(pct: number): string {
  if (pct < 50) return 'bg-red-500';
  if (pct < 70) return 'bg-yellow-500';
  if (pct < 85) return 'bg-blue-500';
  return 'bg-green-500';
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
    <div className="p-6 space-y-6">
      {/* 考试倒计时 */}
      {examConfig && (
        <div className={`rounded-2xl p-6 text-white ${countdown.passed ? 'bg-gray-500' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">{examConfig.name}</p>
              <p className="text-white/60 text-xs mt-1">{examConfig.date}</p>
            </div>
            {!countdown.passed && (
              <div className="text-right flex items-center gap-4">
                <div className="text-center">
                  <p className="text-4xl font-bold">{countdown.days}</p>
                  <p className="text-xs text-white/80">天</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold">{countdown.hours}</p>
                  <p className="text-xs text-white/80">小时</p>
                </div>
              </div>
            )}
          </div>
          {countdown.passed && <p className="text-center mt-2 text-white/80">考试已结束</p>}
        </div>
      )}

      {/* 核心数据 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Flame} iconColor="text-orange-500" bgColor="bg-orange-100" label="连续学习" value={`${stats?.streak || 0}天`} />
        <StatCard icon={BookOpen} iconColor="text-blue-500" bgColor="bg-blue-100" label="累计刷题" value={`${stats?.total_questions || 0}道`} />
        <StatCard icon={Clock} iconColor="text-green-500" bgColor="bg-green-100" label="学习时长" value={stats?.total_minutes ? formatMinutes(stats.total_minutes) : '0分钟'} />
        <StatCard icon={CheckCircle} iconColor="text-purple-500" bgColor="bg-purple-100" label="已掌握错题" value={`${stats?.mastered_count || 0}道`} />
      </div>

      {/* 待复习 + 正确率 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DueReviewCard dueReviews={dueReviews} />
        <AccuracyCard typeAccuracy={typeAccuracy} />
      </div>

      {/* 快捷入口 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">快捷功能</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickLink href="#/wrong-book" icon={AlertTriangle} iconColor="text-red-500" bgColor="bg-red-50" label="添加错题" />
          <QuickLink href="#/mock-exam" icon={Timer} iconColor="text-blue-500" bgColor="bg-blue-50" label="套题测评" />
          <QuickLink href="#/flashcards" icon={BookOpen} iconColor="text-purple-500" bgColor="bg-purple-50" label="记忆卡片" />
          <QuickLink href="#/pomodoro" icon={Clock} iconColor="text-green-500" bgColor="bg-green-50" label="番茄专注" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, iconColor, bgColor, label, value }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DueReviewCard({ dueReviews }: { dueReviews: any[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Target className="w-4 h-4 text-red-500" />
          待复习错题
        </h2>
        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600">{dueReviews.length} 道</span>
      </div>
      {dueReviews.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-300" />
          <p>暂无待复习的错题</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {dueReviews.slice(0, 5).map((item: any) => (
            <div key={item.id} className="flex items-center p-3 rounded-lg bg-gray-50 text-sm">
              <span className="px-2 py-0.5 rounded text-xs bg-primary-100 text-primary-700 mr-3 shrink-0">
                {item.type?.split('-')[1] || item.type}
              </span>
              <span className="text-gray-700 truncate flex-1">{item.content?.slice(0, 30)}...</span>
            </div>
          ))}
          {dueReviews.length > 5 && (
            <p className="text-xs text-gray-400 text-center py-2">还有 {dueReviews.length - 5} 道...</p>
          )}
        </div>
      )}
    </div>
  );
}

function AccuracyCard({ typeAccuracy }: { typeAccuracy: any[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-green-500" />
        各题型掌握情况
      </h2>
      {typeAccuracy.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>暂无数据</p>
          <p className="text-xs mt-1">开始添加错题后查看</p>
        </div>
      ) : (
        <div className="space-y-3">
          {typeAccuracy.map((item: any) => {
            const pct = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
            return (
              <div key={item.type}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">{item.type.split('-')[1] || item.type}</span>
                  <span className="text-gray-500">{item.correct}/{item.total} | {pct}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${getAccuracyColor(pct)} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuickLink({ href, icon: Icon, iconColor, bgColor, label }: any) {
  return (
    <a href={href} className={`flex items-center gap-3 p-3 rounded-lg ${bgColor} hover:opacity-80 transition-colors`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </a>
  );
}
