import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Lock, Star, ChevronRight } from 'lucide-react';

interface Achievement {
  id: number;
  type: string;
  title: string;
  description: string;
  icon: string;
  threshold: number;
  unlocked_at: string | null;
  progress?: number;
}

type AchievementGroup = {
  type: string;
  label: string;
  items: Achievement[];
};

function getApi() {
  return (window as unknown as Window & { api?: Record<string, any> }).api;
}

const FALLBACK_ACHIEVEMENTS: Achievement[] = [
  { id: 1, type: 'streak', title: '初出茅庐', description: '连续学习3天', icon: '🌱', threshold: 3, unlocked_at: null, progress: 0 },
  { id: 2, type: 'streak', title: '持之以恒', description: '连续学习7天', icon: '🔥', threshold: 7, unlocked_at: null, progress: 0 },
  { id: 3, type: 'streak', title: '百折不挠', description: '连续学习30天', icon: '💪', threshold: 30, unlocked_at: null, progress: 0 },
  { id: 4, type: 'streak', title: '铁杵磨针', description: '连续学习100天', icon: '🏆', threshold: 100, unlocked_at: null, progress: 0 },
  { id: 5, type: 'questions', title: '小试牛刀', description: '累计刷题50道', icon: '✏️', threshold: 50, unlocked_at: null, progress: 0 },
  { id: 6, type: 'questions', title: '题海战术', description: '累计刷题200道', icon: '📖', threshold: 200, unlocked_at: null, progress: 0 },
  { id: 7, type: 'questions', title: '千锤百炼', description: '累计刷题500道', icon: '🎯', threshold: 500, unlocked_at: null, progress: 0 },
  { id: 8, type: 'questions', title: '题神降世', description: '累计刷题1000道', icon: '👑', threshold: 1000, unlocked_at: null, progress: 0 },
  { id: 9, type: 'study_time', title: '入门弟子', description: '累计学习5小时', icon: '⏰', threshold: 300, unlocked_at: null, progress: 0 },
  { id: 10, type: 'study_time', title: '勤学苦练', description: '累计学习20小时', icon: '📚', threshold: 1200, unlocked_at: null, progress: 0 },
  { id: 11, type: 'study_time', title: '学海无涯', description: '累计学习50小时', icon: '🌟', threshold: 3000, unlocked_at: null, progress: 0 },
  { id: 12, type: 'study_time', title: '时间大师', description: '累计学习100小时', icon: '⭐', threshold: 6000, unlocked_at: null, progress: 0 },
  { id: 13, type: 'mastered', title: '知错能改', description: '掌握10道错题', icon: '✅', threshold: 10, unlocked_at: null, progress: 0 },
  { id: 14, type: 'mastered', title: '错题克星', description: '掌握50道错题', icon: '🛡️', threshold: 50, unlocked_at: null, progress: 0 },
  { id: 15, type: 'mastered', title: '完美主义', description: '掌握100道错题', icon: '💎', threshold: 100, unlocked_at: null, progress: 0 },
  { id: 16, type: 'flashcard', title: '初识卡片', description: '累计复习卡片10次', icon: '🃏', threshold: 10, unlocked_at: null, progress: 0 },
  { id: 17, type: 'flashcard', title: '卡片达人', description: '累计复习卡片50次', icon: '🎴', threshold: 50, unlocked_at: null, progress: 0 },
  { id: 18, type: 'flashcard', title: '记忆大师', description: '累计复习卡片200次', icon: '🧠', threshold: 200, unlocked_at: null, progress: 0 },
  { id: 19, type: 'flashcard_master', title: '入门掌握', description: '掌握5张卡片', icon: '📖', threshold: 5, unlocked_at: null, progress: 0 },
  { id: 20, type: 'flashcard_master', title: '熟练掌握', description: '掌握20张卡片', icon: '📚', threshold: 20, unlocked_at: null, progress: 0 },
  { id: 21, type: 'flashcard_master', title: '全部掌握', description: '掌握50张卡片', icon: '🎓', threshold: 50, unlocked_at: null, progress: 0 },
  { id: 22, type: 'pomodoro', title: '番茄新手', description: '完成5个番茄钟', icon: '🍅', threshold: 5, unlocked_at: null, progress: 0 },
  { id: 23, type: 'pomodoro', title: '番茄达人', description: '完成20个番茄钟', icon: '🫒', threshold: 20, unlocked_at: null, progress: 0 },
  { id: 24, type: 'pomodoro', title: '番茄专家', description: '完成50个番茄钟', icon: '🥫', threshold: 50, unlocked_at: null, progress: 0 },
  { id: 25, type: 'pomodoro', title: '番茄大师', description: '完成100个番茄钟', icon: '⏲️', threshold: 100, unlocked_at: null, progress: 0 },
  { id: 26, type: 'checkin', title: '首次打卡', description: '打卡1天', icon: '📌', threshold: 1, unlocked_at: null, progress: 0 },
  { id: 27, type: 'checkin', title: '坚持打卡', description: '打卡7天', icon: '🗓️', threshold: 7, unlocked_at: null, progress: 0 },
  { id: 28, type: 'checkin', title: '打卡达人', description: '打卡30天', icon: '✨', threshold: 30, unlocked_at: null, progress: 0 },
  { id: 29, type: 'checkin', title: '打卡传奇', description: '打卡100天', icon: '🏅', threshold: 100, unlocked_at: null, progress: 0 },
  { id: 30, type: 'review_flow', title: '今日一条龙', description: '完成1天统一复习', icon: '🧭', threshold: 1, unlocked_at: null, progress: 0 },
  { id: 31, type: 'review_flow', title: '坚持不断档', description: '完成7天统一复习', icon: '🎌', threshold: 7, unlocked_at: null, progress: 0 },
  { id: 32, type: 'review_flow', title: '复习工作台熟手', description: '完成30天统一复习', icon: '🛰', threshold: 30, unlocked_at: null, progress: 0 },
];

function mergeAchievements(base: Achievement[], progress: Achievement[]) {
  const progressMap = new Map(progress.map((item) => [item.id, item]));
  return base.map((item) => {
    const next = progressMap.get(item.id);
    return next
      ? { ...item, ...next, progress: next.progress ?? item.progress ?? 0 }
      : item;
  });
}

const GROUP_META: Record<string, { label: string; gradient: string }> = {
  streak: { label: '坚持学习', gradient: 'from-brand-500 to-brand-700' },
  questions: { label: '刷题达人', gradient: 'from-info to-info-dark' },
  study_time: { label: '时间投入', gradient: 'from-success to-success-dark' },
  mastered: { label: '错题攻克', gradient: 'from-warning to-warning-dark' },
  flashcard: { label: '卡片复习', gradient: 'from-brand-400 to-brand-600' },
  flashcard_master: { label: '卡片掌握', gradient: 'from-info to-brand-500' },
  pomodoro: { label: '番茄专注', gradient: 'from-danger to-danger-dark' },
  checkin: { label: '每日打卡', gradient: 'from-success to-brand-500' },
  review_flow: { label: '统一复习', gradient: 'from-brand-500 to-info' },
};

const SummaryBar: React.FC<{
  total: number;
  unlocked: number;
}> = ({ total, unlocked }) => {
  const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-surface-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-brand-500" />
          <span className="text-sm font-semibold text-surface-900">成就进度</span>
        </div>
        <span className="text-sm text-surface-500">
          <span className="text-brand-500 font-bold">{unlocked}</span> / {total}
        </span>
      </div>
      <div className="h-3 bg-surface-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-surface-400 mt-2">已解锁 {pct}% 的成就</p>
    </div>
  );
};

const AchievementCard: React.FC<{
  achievement: Achievement;
}> = ({ achievement }) => {
  const isUnlocked = !!achievement.unlocked_at;
  const progress = achievement.progress ?? 0;
  const pct = Math.min(100, Math.round((progress / achievement.threshold) * 100));

  return (
    <div
      className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
        isUnlocked ? 'bg-white border-brand-300 shadow-md' : 'bg-surface-0 border-surface-200'
      }`}
    >
      {!isUnlocked && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-surface-900 px-2 py-1 text-[10px] text-white/80">
          <Lock className="w-3 h-3" />
          未解锁
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
            isUnlocked ? 'bg-brand-50' : 'bg-surface-100 grayscale'
          }`}
        >
          <span className={isUnlocked ? '' : 'opacity-70'}>{achievement.icon}</span>
        </div>
        <div className="flex-1 min-w-0 pr-16">
          <div className="flex items-center gap-2">
            <h4 className={`text-sm font-semibold ${isUnlocked ? 'text-surface-900' : 'text-surface-700'}`}>
              {achievement.title}
            </h4>
            {isUnlocked && <Star className="w-3.5 h-3.5 text-brand-500 fill-brand-500 shrink-0" />}
          </div>
          <p className="text-xs mt-0.5 text-surface-500">{achievement.description}</p>
        </div>
      </div>

      {!isUnlocked && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-surface-500 mb-1">
            <span>{progress} / {achievement.threshold}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {isUnlocked && achievement.unlocked_at && (
        <p className="text-[11px] text-surface-400 mt-2">
          解锁于 {new Date(achievement.unlocked_at).toLocaleDateString('zh-CN')}
        </p>
      )}
    </div>
  );
};

const GroupSection: React.FC<{
  group: AchievementGroup;
}> = ({ group }) => {
  const meta = GROUP_META[group.type] || GROUP_META.streak;
  const unlockedCount = group.items.filter((item) => item.unlocked_at).length;
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded((value) => !value)}
        className="flex items-center justify-between w-full group"
      >
        <div className="flex items-center gap-3">
          <div className={`h-1 w-6 rounded-full bg-gradient-to-r ${meta.gradient}`} />
          <span className="text-sm font-semibold text-surface-900">{meta.label}</span>
          <span className="text-xs text-surface-400">
            {unlockedCount}/{group.items.length}
          </span>
        </div>
        <ChevronRight className={`w-4 h-4 text-surface-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {group.items.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      )}
    </div>
  );
};

const Achievements: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>(FALLBACK_ACHIEVEMENTS);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  const loadAchievements = useCallback(async () => {
    const api = getApi();

    if (!api?.achievement) {
      setAchievements(FALLBACK_ACHIEVEMENTS);
      setUsingFallback(true);
      setLoading(false);
      return;
    }

    try {
      const baseList = (await api.achievement.getAll()) as Achievement[];
      const safeBase = baseList && baseList.length > 0 ? baseList : FALLBACK_ACHIEVEMENTS;

      try {
        const progressList = (await api.achievement.check()) as Achievement[];
        setAchievements(mergeAchievements(safeBase, progressList || []));
        setUsingFallback(!baseList || baseList.length === 0);
      } catch (error) {
        console.error('加载成就进度失败，改为显示基础成就列表', error);
        setAchievements(mergeAchievements(safeBase, []));
        setUsingFallback(!baseList || baseList.length === 0);
      }
    } catch (error) {
      console.error('加载成就失败，改用内置成就模板', error);
      setAchievements(FALLBACK_ACHIEVEMENTS);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  const total = achievements.length;
  const unlocked = achievements.filter((achievement) => achievement.unlocked_at).length;

  const groups: AchievementGroup[] = Object.entries(
    achievements.reduce<Record<string, Achievement[]>>((acc, achievement) => {
      if (!acc[achievement.type]) acc[achievement.type] = [];
      acc[achievement.type].push(achievement);
      return acc;
    }, {})
  ).map(([type, items]) => ({
    type,
    label: GROUP_META[type]?.label ?? type,
    items: items.sort((a, b) => a.threshold - b.threshold),
  }));

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-surface-400 text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-surface-900 font-display">成就系统</h1>
        <p className="text-sm text-surface-500 mt-1">所有成就都会显示出来，方便你提前看到完整目标</p>
      </div>

      {usingFallback && (
        <div className="rounded-xl border border-warning/30 bg-warning-light px-4 py-3 text-sm text-warning-dark">
          当前未连接到应用数据接口，已改为显示内置成就清单。
        </div>
      )}

      <SummaryBar total={total} unlocked={unlocked} />

      <div className="space-y-8">
        {groups.map((group) => (
          <GroupSection key={group.type} group={group} />
        ))}
      </div>
    </div>
  );
};

export default Achievements;
