import React, { useEffect, useState, useCallback } from 'react';
import { Trophy, Star, Flame, BookOpen, Clock, Target, RefreshCw, Layers, Timer, CalendarCheck, Sparkles } from 'lucide-react';

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

const ENCOURAGE_QUOTES = [
  { text: '行百里者半九十，越接近成功越要努力。', category: 'perseverance' },
  { text: '所有坚韧不拔的努力迟早会取得报酬的。', category: 'perseverance' },
  { text: '成大事不在于力量的大小，而在于能坚持多久。', category: 'perseverance' },
  { text: '不积跬步，无以至千里；不积小流，无以成江海。', category: 'perseverance' },
  { text: '书山有路勤为径，学海无涯苦作舟。', category: 'perseverance' },
  { text: '千磨万击还坚劲，任尔东西南北风。', category: 'perseverance' },
  { text: '自信人生二百年，会当水击三千里。', category: 'confidence' },
  { text: '天生我材必有用，千金散尽还复来。', category: 'confidence' },
  { text: '长风破浪会有时，直挂云帆济沧海。', category: 'confidence' },
  { text: '大鹏一日同风起，扶摇直上九万里。', category: 'confidence' },
  { text: '会当凌绝顶，一览众山小。', category: 'confidence' },
  { text: '博观而约取，厚积而薄发。', category: 'method' },
  { text: '学而不思则罔，思而不学则殆。', category: 'method' },
  { text: '温故而知新，可以为师矣。', category: 'method' },
  { text: '读书破万卷，下笔如有神。', category: 'method' },
  { text: '纸上得来终觉浅，绝知此事要躬行。', category: 'method' },
  { text: '业精于勤荒于嬉，行成于思毁于随。', category: 'method' },
  { text: '志之所趋，无远弗届，穷山距海，不能限也。', category: 'wisdom' },
  { text: '路漫漫其修远兮，吾将上下而求索。', category: 'wisdom' },
  { text: '功崇惟志，业广惟勤。', category: 'wisdom' },
  { text: '古之立大事者，不惟有超世之才，亦必有坚忍不拔之志。', category: 'wisdom' },
  { text: '锲而不舍，金石可镂。', category: 'wisdom' },
];

const STICKER_MESSAGES = [
  { emoji: '🌅', message: '新的一天，新的开始！今天也要元气满满！' },
  { emoji: '💪', message: '你已经比昨天的自己更强大了！' },
  { emoji: '🎯', message: '目标就在前方，坚持就是胜利！' },
  { emoji: '📚', message: '每一次学习都在为梦想蓄力！' },
  { emoji: '🔥', message: '燃烧吧，小宇宙！你是最棒的！' },
  { emoji: '⭐', message: '星光不负赶路人，时光不负有心人！' },
  { emoji: '🌟', message: '你正在成为更好的自己！' },
  { emoji: '🏆', message: '坚持学习的人，运气不会太差！' },
  { emoji: '💎', message: '每一道题都是通往成功的阶梯！' },
  { emoji: '🚀', message: '今天的努力，明天的底气！' },
];

// 随机取 n 个不重复元素
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

const Encourage: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [currentQuote, setCurrentQuote] = useState(ENCOURAGE_QUOTES[0]);
  const [sticker, setSticker] = useState(STICKER_MESSAGES[0]);
  const [dailyQuotes, setDailyQuotes] = useState<typeof ENCOURAGE_QUOTES>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockAchievement, setUnlockAchievement] = useState<Achievement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAchievements();
    randomQuote();
    randomSticker();
    refreshDailyQuotes();
  }, []);

  async function loadAchievements() {
    setLoading(true);
    setError(null);
    try {
      const api = (window as any).api;
      if (!api) {
        setError('API 未初始化');
        setLoading(false);
        return;
      }
      const data = await api.achievement.check();
      console.log('加载成就数据:', data);
      if (!data || data.length === 0) {
        setError('暂无成就数据');
      }
      setAchievements(data || []);
      // 检测新解锁的成就并显示弹窗
      if (data && data.length > 0) {
        const newlyUnlocked = data.filter((a: Achievement) => a.unlocked_at);
        if (newlyUnlocked.length > 0 && !showUnlockModal) {
          setUnlockAchievement(newlyUnlocked[0]);
          setShowUnlockModal(true);
          setTimeout(() => {
            setShowUnlockModal(false);
            setUnlockAchievement(null);
          }, 5000);
        }
      }
    } catch (e) {
      console.error('加载成就失败', e);
      setError('加载成就失败: ' + String(e));
    } finally {
      setLoading(false);
    }
  }

  function randomQuote() {
    setCurrentQuote(ENCOURAGE_QUOTES[Math.floor(Math.random() * ENCOURAGE_QUOTES.length)]);
  }

  function randomSticker() {
    setSticker(STICKER_MESSAGES[Math.floor(Math.random() * STICKER_MESSAGES.length)]);
  }

  function refreshDailyQuotes() {
    setDailyQuotes(pickRandom(ENCOURAGE_QUOTES, 3));
  }

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    randomQuote();
    randomSticker();
    refreshDailyQuotes();
    setTimeout(() => setIsRefreshing(false), 300);
  }, []);

  const unlockedCount = achievements.filter(a => a.unlocked_at).length;

  const typeLabels: Record<string, string> = {
    streak: '坚持学习',
    questions: '刷题达人',
    study_time: '时间投入',
    mastered: '错题攻克',
    flashcard: '卡片复习',
    flashcard_master: '卡片掌握',
    pomodoro: '番茄专注',
    checkin: '每日打卡',
  };

  const typeIcons: Record<string, React.ReactNode> = {
    streak: <Flame className="w-5 h-5 text-orange-500" />,
    questions: <BookOpen className="w-5 h-5 text-blue-500" />,
    study_time: <Clock className="w-5 h-5 text-green-500" />,
    mastered: <Target className="w-5 h-5 text-purple-500" />,
    flashcard: <Layers className="w-5 h-5 text-cyan-500" />,
    flashcard_master: <Sparkles className="w-5 h-5 text-amber-500" />,
    pomodoro: <Timer className="w-5 h-5 text-red-500" />,
    checkin: <CalendarCheck className="w-5 h-5 text-teal-500" />,
  };

  // 按类型分组
  const groupedAchievements: Record<string, Achievement[]> = {};
  for (const a of achievements) {
    if (!groupedAchievements[a.type]) groupedAchievements[a.type] = [];
    groupedAchievements[a.type].push(a);
  }

  // 排序：已有解锁的在前
  const sortedTypes = Object.keys(groupedAchievements).sort((a, b) => {
    const aUnlocked = groupedAchievements[a].filter(x => x.unlocked_at).length;
    const bUnlocked = groupedAchievements[b].filter(x => x.unlocked_at).length;
    return bUnlocked - aUnlocked;
  });

  return (
    <div className="p-6 space-y-6 pb-20">
      {/* 解锁弹窗 */}
      {showUnlockModal && unlockAchievement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowUnlockModal(false); setUnlockAchievement(null); }}>
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm mx-4 animate-bounce-in" onClick={e => e.stopPropagation()}>
            <div className="text-7xl mb-4 animate-bounce">{unlockAchievement.icon}</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">🎉 成就解锁！</h2>
            <p className="text-lg font-semibold text-primary-600 mb-1">{unlockAchievement.title}</p>
            <p className="text-sm text-gray-500 mb-4">{unlockAchievement.description}</p>
            <button onClick={() => { setShowUnlockModal(false); setUnlockAchievement(null); }}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors">
              太棒了！
            </button>
          </div>
        </div>
      )}

      {/* 鼓励语卡片 */}
      <div className={`bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600 rounded-2xl p-8 text-white relative overflow-hidden ${isRefreshing ? 'opacity-60' : ''} transition-opacity`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-4 right-4">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-6 relative">
          <div className="text-6xl animate-bounce">{sticker.emoji}</div>
          <div>
            <p className="text-2xl font-bold leading-relaxed">{currentQuote.text}</p>
            <p className="mt-3 text-primary-100 text-sm">{sticker.message}</p>
          </div>
        </div>
      </div>

      {/* 今日寄语 - 随机3条 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-yellow-500" />
            <h2 className="text-base font-semibold text-gray-800">今日寄语</h2>
          </div>
          <button onClick={refreshDailyQuotes} className="text-xs text-primary-600 hover:text-primary-700 transition-colors">
            换一批
          </button>
        </div>
        <div className="space-y-3">
          {dailyQuotes.map((q, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50">
              <span className="text-yellow-500 text-lg mt-0.5">💡</span>
              <p className="text-sm text-gray-700 leading-relaxed">{q.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 成就总览 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="text-base font-semibold text-gray-800">成就墙</h2>
          </div>
          {!loading && !error && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                已解锁 <span className="text-yellow-600 font-semibold">{unlockedCount}</span> / {achievements.length}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                解锁率 {achievements.length ? Math.round((unlockedCount / achievements.length) * 100) : 0}%
              </span>
            </div>
          )}
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="py-12 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p>加载成就中...</p>
          </div>
        )}

        {/* 错误状态 */}
        {error && !loading && (
          <div className="py-12 text-center">
            <p className="text-red-500 mb-3">{error}</p>
            <button
              onClick={loadAchievements}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
            >
              重新加载
            </button>
          </div>
        )}

        {/* 成就列表 */}
        {!loading && !error && achievements.length > 0 && (
          <>
            {/* 总进度条 */}
            <div className="w-full h-3 bg-gray-100 rounded-full mb-6 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-full transition-all duration-700 relative"
                style={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-shimmer" />
              </div>
            </div>

            {/* 筛选按钮 */}
            <div className="flex gap-2 mb-4">
              <span className="px-3 py-1.5 text-xs rounded-full bg-primary-100 text-primary-700 font-medium">
                全部 ({achievements.length})
              </span>
              <span className="px-3 py-1.5 text-xs rounded-full bg-green-100 text-green-700 font-medium">
                已解锁 ({unlockedCount})
              </span>
              <span className="px-3 py-1.5 text-xs rounded-full bg-gray-100 text-gray-700 font-medium">
                未解锁 ({achievements.length - unlockedCount})
              </span>
            </div>

            {/* 成就分组 */}
            <div className="space-y-6">
              {sortedTypes.map(type => {
                const items = groupedAchievements[type];
                if (!items || items.length === 0) return null;
                const typeUnlocked = items.filter(a => a.unlocked_at).length;

                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {typeIcons[type] || <Star className="w-5 h-5 text-gray-400" />}
                        <h3 className="text-sm font-medium text-gray-700">{typeLabels[type] || type}</h3>
                      </div>
                      <span className="text-xs text-gray-400">{typeUnlocked}/{items.length}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {items.map(achievement => {
                        const progress = achievement.progress ?? 0;
                        const progressPct = Math.min((progress / achievement.threshold) * 100, 100);
                        const isUnlocked = !!achievement.unlocked_at;

                        return (
                          <div
                            key={achievement.id}
                            className={`rounded-xl p-4 border-2 transition-all duration-300 relative overflow-hidden ${
                              isUnlocked
                                ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-md'
                                : 'border-gray-300 bg-gray-100 hover:border-gray-400'
                            }`}
                          >
                            {/* 解锁光芒效果 */}
                            {isUnlocked && (
                              <div className="absolute top-0 right-0 w-12 h-12 bg-yellow-200/40 rounded-full -translate-y-1/3 translate-x-1/3" />
                            )}

                            {/* 未解锁遮罩 */}
                            {!isUnlocked && (
                              <div className="absolute top-2 right-2">
                                <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded">🔒 未解锁</span>
                              </div>
                            )}

                            <div className={`text-3xl text-center mb-2 relative ${!isUnlocked ? 'grayscale opacity-50' : ''}`}>
                              {achievement.icon}
                            </div>
                            <p className={`text-sm font-medium text-center ${isUnlocked ? 'text-gray-800' : 'text-gray-500'}`}>
                              {achievement.title}
                            </p>
                            <p className="text-xs text-center text-gray-500 mt-1">
                              {achievement.description}
                            </p>

                            {/* 进度条 - 未解锁时显示 */}
                            {!isUnlocked && (
                              <div className="mt-3">
                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full transition-all duration-500"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                                <p className="text-xs text-center text-gray-400 mt-1">
                                  {progress} / {achievement.threshold}
                                </p>
                              </div>
                            )}

                            {isUnlocked && (
                              <div className="mt-2 text-center">
                                <span className="inline-flex items-center text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                                  ✅ 已解锁
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 学习建议 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">学习小贴士</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[
            { icon: '📝', title: '错题要反复看', desc: '艾宾浩斯遗忘曲线告诉我们：1天、3天、7天、14天复习效果最佳' },
            { icon: '🧠', title: '思维导图串联知识', desc: '将零散知识体系化，形成网状记忆，提取更快速' },
            { icon: '⏰', title: '番茄工作法', desc: '25分钟专注学习+5分钟休息，保持高效注意力' },
            { icon: '📊', title: '定期回顾进度', desc: '每周回顾学习数据，调整计划节奏，查漏补缺' },
            { icon: '🎯', title: '先攻薄弱环节', desc: '针对正确率低的题型集中突破，提分效果最明显' },
            { icon: '😴', title: '保证充足睡眠', desc: '睡眠是巩固记忆的关键，熬夜学习反而事倍功半' },
          ].map((tip, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <span className="text-2xl">{tip.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-800">{tip.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CSS 动画 */}
      <style>{`
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default Encourage;