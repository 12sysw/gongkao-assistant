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
  color: string;
  bg: string;
  border: string;
  items: Achievement[];
};

function getApi() {
  return (window as unknown as Window & { api: Record<string, unknown> }).api;
}

const GROUP_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  streak: { label: '坚持学习', color: 'text-brand-500', bg: 'bg-brand-50', border: 'border-brand-200' },
  questions: { label: '刷题达人', color: 'text-info', bg: 'bg-info-light', border: 'border-info-border' },
  study_time: { label: '时间投入', color: 'text-success-dark', bg: 'bg-success-light', border: 'border-success' },
  mastered: { label: '错题攻克', color: 'text-warning-dark', bg: 'bg-warning-light', border: 'border-warning' },
  flashcard: { label: '卡片复习', color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-200' },
  flashcard_master: { label: '卡片掌握', color: 'text-info-dark', bg: 'bg-info-light', border: 'border-info-border' },
  pomodoro: { label: '番茄专注', color: 'text-danger-dark', bg: 'bg-danger-light', border: 'border-danger' },
  checkin: { label: '每日打卡', color: 'text-success', bg: 'bg-success-light', border: 'border-success' },
};

/* ─── Sub-components ─── */

const SummaryBar: React.FC<{
  total: number;
  unlocked: number;
}> = ({ total, unlocked }) => {
  const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  return (
    <div className="surface">
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
          className="h-full bg-brand-gradient rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-surface-400 mt-2">已解锁 {pct}% 的成就</p>
    </div>
  );
};

const AchievementCard: React.FC<{
  achievement: Achievement;
  isNewlyUnlocked: boolean;
}> = ({ achievement, isNewlyUnlocked }) => {
  const isUnlocked = !!achievement.unlocked_at;
  const progress = achievement.progress ?? 0;
  const pct = Math.min(100, Math.round((progress / achievement.threshold) * 100));

  return (
    <div
      className={`relative p-4 rounded-xl border transition-all duration-300 ${
        isUnlocked
          ? 'bg-white border-brand-200 shadow-soft'
          : 'bg-surface-50 border-surface-200 opacity-70'
      } ${isNewlyUnlocked ? 'ring-2 ring-brand-400 animate-pulse' : ''}`}
    >
      {/* Icon + Info */}
      <div className="flex items-start gap-3">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
            isUnlocked ? 'bg-brand-50' : 'bg-surface-100 grayscale'
          }`}
        >
          {isUnlocked ? achievement.icon : <Lock className="w-5 h-5 text-surface-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`text-sm font-semibold ${isUnlocked ? 'text-surface-900' : 'text-surface-500'}`}>
              {achievement.title}
            </h4>
            {isUnlocked && <Star className="w-3.5 h-3.5 text-brand-500 fill-brand-500 shrink-0" />}
          </div>
          <p className={`text-xs mt-0.5 ${isUnlocked ? 'text-surface-500' : 'text-surface-400'}`}>
            {achievement.description}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {!isUnlocked && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-surface-400 mb-1">
            <span>{progress} / {achievement.threshold}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Unlocked badge */}
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
  const unlockedCount = group.items.filter((a) => a.unlocked_at).length;
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center justify-between w-full group"
      >
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
          <span className="text-xs text-surface-400">
            {unlockedCount}/{group.items.length}
          </span>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-surface-400 transition-transform duration-200 ${
            expanded ? 'rotate-90' : ''
          }`}
        />
      </button>
      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {group.items.map((a) => (
            <AchievementCard
              key={a.id}
              achievement={a}
              isNewlyUnlocked={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div className="text-center py-16 text-surface-400">
    <Trophy className="w-16 h-16 mx-auto mb-3 text-surface-200" />
    <p className="text-lg">暂无成就数据</p>
    <p className="text-sm mt-1">开始学习即可解锁成就</p>
  </div>
);

/* ─── Main Page ─── */

const Achievements: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAchievements = useCallback(async () => {
    try {
      const api = getApi();
      if (!api) return;
      const data = (await api.achievement.check()) as Achievement[];
      setAchievements(data || []);
    } catch (e) {
      console.error('加载成就失败', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  const total = achievements.length;
  const unlocked = achievements.filter((a) => a.unlocked_at).length;

  const groups: AchievementGroup[] = Object.entries(
    achievements.reduce<Record<string, Achievement[]>>((acc, a) => {
      if (!acc[a.type]) acc[a.type] = [];
      acc[a.type].push(a);
      return acc;
    }, {})
  ).map(([type, items]) => ({
    type,
    label: GROUP_META[type]?.label ?? type,
    color: GROUP_META[type]?.color ?? 'text-surface-600',
    bg: GROUP_META[type]?.bg ?? 'bg-surface-50',
    border: GROUP_META[type]?.border ?? 'border-surface-200',
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
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-surface-900 font-display">成就系统</h1>
        <p className="text-sm text-surface-500 mt-1">坚持学习，解锁成就，见证成长</p>
      </div>

      <SummaryBar total={total} unlocked={unlocked} />

      {groups.length > 0 ? (
        <div className="space-y-8">
          {groups.map((group) => (
            <GroupSection key={group.type} group={group} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
};

export default Achievements;
