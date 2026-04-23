import React, { useEffect, useState } from 'react';
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

interface DashboardStats {
  total_questions: number;
  total_minutes: number;
  total_wrong: number;
  active_days: number;
  streak: number;
  mastered_count: number;
}

interface ExamConfig {
  name: string;
  date: string;
}

interface TypeAccuracy {
  type: string;
  correct: number;
  total: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);
  const [typeAccuracy, setTypeAccuracy] = useState<TypeAccuracy[]>([]);
  const [dueReviews, setDueReviews] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const api = (window as any).api;
      if (!api) return;

      const [statsData, config, dueList] = await Promise.all([
        api.dailyRecord.getStats(30),
        api.examConfig.get(),
        api.wrongBook.getDueReview(),
      ]);

      setStats(statsData);
      setExamConfig(config);
      setDueReviews(dueList || []);

      // 计算各题型正确率
      const wrongRecords = await api.wrongBook.getAll({});
      if (wrongRecords && wrongRecords.length > 0) {
        const typeStats: Record<string, { correct: number; total: number }> = {};
        wrongRecords.forEach((r: any) => {
          if (!typeStats[r.type]) typeStats[r.type] = { correct: 0, total: 0 };
          typeStats[r.type].total++;
          if (r.mastered) typeStats[r.type].correct++;
        });
        const accuracyList = Object.entries(typeStats).map(([type, stat]) => ({
          type,
          correct: stat.correct,
          total: stat.total,
        }));
        setTypeAccuracy(accuracyList);
      }
    } catch (e) {
      console.error('加载数据失败', e);
    }
  }

  // 计算考试倒计时
  function getExamCountdown(): { days: number; hours: number; passed: boolean } {
    if (!examConfig?.date) return { days: 0, hours: 0, passed: false };
    const examDate = new Date(examConfig.date);
    const now = new Date();
    const diff = examDate.getTime() - now.getTime();
    if (diff < 0) return { days: 0, hours: 0, passed: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return { days, hours, passed: false };
  }

  const countdown = getExamCountdown();

  const formatMinutes = (m: number) => {
    if (m < 60) return `${m}分钟`;
    const h = Math.floor(m / 60);
    const min = m % 60;
    return min > 0 ? `${h}小时${min}分钟` : `${h}小时`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* 考试倒计时 - 醒目显示 */}
      {examConfig && (
        <div className={`rounded-2xl p-6 text-white ${countdown.passed ? 'bg-gray-500' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">{examConfig.name}</p>
              <p className="text-white/60 text-xs mt-1">{examConfig.date}</p>
            </div>
            {!countdown.passed && (
              <div className="text-right">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold">{countdown.days}</p>
                    <p className="text-xs text-white/80">天</p>
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-bold">{countdown.hours}</p>
                    <p className="text-xs text-white/80">小时</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          {countdown.passed && (
            <p className="text-center mt-2 text-white/80">考试已结束</p>
          )}
        </div>
      )}

      {/* 核心数据 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">连续学习</p>
              <p className="text-xl font-bold text-gray-800">{stats?.streak || 0}天</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">累计刷题</p>
              <p className="text-xl font-bold text-gray-800">{stats?.total_questions || 0}道</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">学习时长</p>
              <p className="text-xl font-bold text-gray-800">{stats?.total_minutes ? formatMinutes(stats.total_minutes) : '0分钟'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">已掌握错题</p>
              <p className="text-xl font-bold text-gray-800">{stats?.mastered_count || 0}道</p>
            </div>
          </div>
        </div>
      </div>

      {/* 待复习提醒 + 各题型正确率 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 待复习错题 */}
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

        {/* 各题型掌握情况 */}
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
              {typeAccuracy.map(item => {
                const pct = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
                let color = 'bg-green-500';
                if (pct < 50) color = 'bg-red-500';
                else if (pct < 70) color = 'bg-yellow-500';
                else if (pct < 85) color = 'bg-blue-500';

                return (
                  <div key={item.type}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.type.split('-')[1] || item.type}</span>
                      <span className="text-gray-500">{item.correct}/{item.total} | {pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">快捷功能</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <a href="#/wrong-book" className="flex items-center gap-3 p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-gray-700">添加错题</span>
          </a>
          <a href="#/mock-exam" className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
            <Timer className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">套题测评</span>
          </a>
          <a href="#/flashcards" className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
            <BookOpen className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium text-gray-700">记忆卡片</span>
          </a>
          <a href="#/pomodoro" className="flex items-center gap-3 p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
            <Clock className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-gray-700">番茄专注</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;