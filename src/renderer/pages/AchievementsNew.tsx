import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Target, Flame, Star, Zap, Crown, Medal } from 'lucide-react';
import { PageContainer, PageHeader, PageSection } from '../components/ui/PageLayout';
import { StatCardModern } from '../components/ui/DataDisplay';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';

const ACHIEVEMENTS = [
  {
    id: 1,
    title: '首次打卡',
    description: '完成第一次学习打卡',
    icon: Target,
    color: 'from-blue-500 to-cyan-500',
    unlocked: true,
    unlockedAt: '2026-01-15',
    points: 10,
  },
  {
    id: 2,
    title: '连续打卡7天',
    description: '坚持学习7天不间断',
    icon: Flame,
    color: 'from-orange-500 to-red-500',
    unlocked: true,
    unlockedAt: '2026-02-01',
    points: 50,
  },
  {
    id: 3,
    title: '百题达人',
    description: '累计完成100道题目',
    icon: Star,
    color: 'from-yellow-500 to-orange-500',
    unlocked: true,
    unlockedAt: '2026-03-10',
    points: 100,
  },
  {
    id: 4,
    title: '学霸',
    description: '单次测评正确率达90%以上',
    icon: Crown,
    color: 'from-purple-500 to-pink-500',
    unlocked: true,
    unlockedAt: '2026-04-05',
    points: 150,
  },
  {
    id: 5,
    title: '连续打卡30天',
    description: '坚持学习一个月',
    icon: Trophy,
    color: 'from-green-500 to-emerald-500',
    unlocked: false,
    progress: 70,
    points: 200,
  },
  {
    id: 6,
    title: '千题挑战',
    description: '累计完成1000道题目',
    icon: Zap,
    color: 'from-indigo-500 to-purple-500',
    unlocked: false,
    progress: 45,
    points: 500,
  },
  {
    id: 7,
    title: '满分王者',
    description: '套题测评获得满分',
    icon: Medal,
    color: 'from-red-500 to-pink-500',
    unlocked: false,
    progress: 0,
    points: 300,
  },
  {
    id: 8,
    title: '全科精通',
    description: '五大题型全部达到80%正确率',
    icon: Award,
    color: 'from-cyan-500 to-blue-500',
    unlocked: false,
    progress: 60,
    points: 400,
  },
];

const Achievements: React.FC = () => {
  const unlockedCount = ACHIEVEMENTS.filter(a => a.unlocked).length;
  const totalPoints = ACHIEVEMENTS.filter(a => a.unlocked).reduce((sum, a) => sum + a.points, 0);

  return (
    <PageContainer>
      <PageHeader
        title="成就"
        subtitle="记录你的每一步成长"
        icon={<Trophy className="w-7 h-7" />}
        badge={<Badge variant="warning" size="lg">{unlockedCount}/{ACHIEVEMENTS.length} 已解锁</Badge>}
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCardModern
          label="已解锁"
          value={unlockedCount}
          icon={<Trophy className="w-5 h-5" />}
          gradient="from-yellow-500 to-orange-500"
        />
        <StatCardModern
          label="总积分"
          value={totalPoints}
          icon={<Star className="w-5 h-5" />}
          gradient="from-purple-500 to-pink-500"
        />
        <StatCardModern
          label="完成度"
          value={`${Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}%`}
          icon={<Target className="w-5 h-5" />}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCardModern
          label="排行榜"
          value="Top 15%"
          icon={<Crown className="w-5 h-5" />}
          gradient="from-green-500 to-emerald-500"
        />
      </div>

      {/* 已解锁成就 */}
      <PageSection title="已解锁" description="你已经获得的成就">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ACHIEVEMENTS.filter(a => a.unlocked).map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                variant="elevated"
                hover="lift"
                className={cn('overflow-hidden relative', `bg-gradient-to-br ${achievement.color}`)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                <CardContent className="p-6 relative">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm">
                      <achievement.icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white mb-1">{achievement.title}</h3>
                      <p className="text-xs text-white/80">{achievement.description}</p>
                    </div>
                    <Badge variant="outline" className="bg-white/20 border-white/30 text-white text-xs">
                      +{achievement.points} 积分
                    </Badge>
                    <p className="text-xs text-white/70">
                      {new Date(achievement.unlockedAt!).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </PageSection>

      {/* 进行中成就 */}
      <PageSection title="进行中" description="努力解锁这些成就吧" className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ACHIEVEMENTS.filter(a => !a.unlocked).map((achievement, index) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card variant="elevated" hover="border">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-surface-100 dark:bg-dark-850">
                      <achievement.icon className="w-6 h-6 text-surface-400 dark:text-dark-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-surface-900 dark:text-dark-50 mb-1">
                            {achievement.title}
                          </h3>
                          <p className="text-sm text-surface-600 dark:text-dark-300">
                            {achievement.description}
                          </p>
                        </div>
                        <Badge variant="outline" size="sm">
                          {achievement.points}分
                        </Badge>
                      </div>
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-surface-600 dark:text-dark-300">进度</span>
                          <span className="font-semibold text-brand-600 dark:text-brand-400">
                            {achievement.progress}%
                          </span>
                        </div>
                        <div className="h-2 bg-surface-100 dark:bg-dark-850 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${achievement.progress}%` }}
                            transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                            className="h-full bg-gradient-to-r from-brand-500 to-brand-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </PageSection>
    </PageContainer>
  );
};

export default Achievements;
