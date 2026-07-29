import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Flame,
  Clock,
  Target,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Calendar,
  BookOpen,
  Brain,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';
import {
  useDailyStats,
  useWrongBookRecords,
  useFlashcards,
  useDueReviews,
} from '../hooks/use-api';

// 数字滚动动画组件
const AnimatedNumber: React.FC<{ value: number; suffix?: string; duration?: number }> = ({
  value,
  suffix = '',
  duration = 2,
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);

      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(eased * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <span>
      {displayValue}
      {suffix}
    </span>
  );
};

// Hero 统计卡片
const HeroStatCard: React.FC<{
  title: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  gradient: string;
  trend?: number;
}> = ({ title, value, suffix = '', icon, gradient, trend }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="group relative overflow-hidden"
    >
      <div
        className={cn(
          'relative p-6 rounded-2xl backdrop-blur-xl border border-white/10',
          'bg-gradient-to-br',
          gradient,
          'hover:scale-[1.02] transition-transform duration-300'
        )}
      >
        {/* 背景光晕 */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* 图标 */}
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            {icon}
          </div>
          {trend && (
            <Badge variant="outline" className="bg-white/10 border-white/20 text-white">
              <TrendingUp className="w-3 h-3 mr-1" />
              +{trend}%
            </Badge>
          )}
        </div>

        {/* 数值 */}
        <div className="space-y-1">
          <p className="text-sm text-white/70 font-medium">{title}</p>
          <p className="text-4xl font-bold text-white tracking-tight">
            <AnimatedNumber value={value} suffix={suffix} />
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// 小型统计卡片
const MiniStatCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, icon, color }) => {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-50 dark:bg-dark-850 border border-surface-200 dark:border-white/10 hover:border-brand-500/50 transition-colors">
      <div className={cn('p-2 rounded-lg', color)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-surface-500 dark:text-dark-400 font-medium">{label}</p>
        <p className="text-lg font-bold text-surface-900 dark:text-dark-50 truncate">
          {value}
        </p>
      </div>
    </div>
  );
};

// 任务卡片
const TaskCard: React.FC<{
  title: string;
  description: string;
  count?: number;
  link: string;
  priority: 'high' | 'medium' | 'low';
}> = ({ title, description, count, link, priority }) => {
  const priorityColors = {
    high: 'border-danger-500/50 bg-danger-50 dark:bg-danger-950/20',
    medium: 'border-warning-500/50 bg-warning-50 dark:bg-warning-950/20',
    low: 'border-info-500/50 bg-info-50 dark:bg-info-950/20',
  };

  return (
    <Link to={link}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={cn(
          'p-4 rounded-xl border-2 transition-all duration-200',
          'hover:shadow-lg',
          priorityColors[priority]
        )}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-surface-900 dark:text-dark-50">{title}</h4>
          {count && (
            <Badge variant="danger" size="sm">
              {count}
            </Badge>
          )}
        </div>
        <p className="text-sm text-surface-600 dark:text-dark-300 mb-3">{description}</p>
        <div className="flex items-center text-xs text-brand-600 dark:text-brand-400 font-medium">
          开始复习 <ArrowRight className="w-3 h-3 ml-1" />
        </div>
      </motion.div>
    </Link>
  );
};

const Dashboard: React.FC = () => {
  const { data: stats } = useDailyStats();
  const { data: wrongRecords } = useWrongBookRecords();
  const { data: flashcards } = useFlashcards();
  const { data: dueReviews } = useDueReviews();

  // 计算统计数据
  const totalMinutes = stats?.total_minutes || 0;
  const streak = stats?.streak || 0;
  const totalQuestions = stats?.total_questions || 0;
  const wrongCount = wrongRecords?.filter((r) => !r.mastered).length || 0;
  const dueFlashcards = flashcards?.filter((f) => {
    if (!f.next_review) return true;
    return new Date(f.next_review) <= new Date();
  }).length || 0;


  // 今日学习时长（小时）
  const todayHours = (totalMinutes / 60).toFixed(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-0 via-brand-50/30 to-surface-50 dark:from-dark-950 dark:via-dark-925 dark:to-dark-900">
      <div className="max-w-[1600px] mx-auto p-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2 text-sm text-surface-500 dark:text-dark-400">
            <Calendar className="w-4 h-4" />
            <span>{new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}</span>
          </div>
          <h1 className="text-5xl font-bold text-surface-900 dark:text-dark-50 tracking-tight">
            学习中心
          </h1>
          <p className="text-lg text-surface-600 dark:text-dark-300">
            坚持就是胜利，今天也要加油 💪
          </p>
        </motion.div>

        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HeroStatCard
            title="今日学习"
            value={parseFloat(todayHours)}
            suffix="h"
            icon={<Clock className="w-6 h-6 text-white" />}
            gradient="from-blue-500 to-cyan-500"
            trend={12}
          />
          <HeroStatCard
            title="连续打卡"
            value={streak}
            suffix="天"
            icon={<Flame className="w-6 h-6 text-white" />}
            gradient="from-orange-500 to-pink-500"
          />
          <HeroStatCard
            title="累计做题"
            value={totalQuestions}
            suffix="题"
            icon={<Target className="w-6 h-6 text-white" />}
            gradient="from-purple-500 to-indigo-500"
            trend={8}
          />
        </div>

        {/* Mini Stats Row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <MiniStatCard
            label="待复习错题"
            value={wrongCount}
            icon={<AlertCircle className="w-5 h-5 text-danger-600" />}
            color="bg-danger-100 dark:bg-danger-950"
          />
          <MiniStatCard
            label="待复习卡片"
            value={dueFlashcards}
            icon={<BookOpen className="w-5 h-5 text-info-600" />}
            color="bg-info-100 dark:bg-info-950"
          />
          <MiniStatCard
            label="今日复习任务"
            value={dueReviews?.length || 0}
            icon={<CheckCircle2 className="w-5 h-5 text-success-600" />}
            color="bg-success-100 dark:bg-success-950"
          />
          <MiniStatCard
            label="连续学习"
            value={`${streak} 天`}
            icon={<Brain className="w-5 h-5 text-purple-600" />}
            color="bg-purple-100 dark:bg-purple-950"
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Tasks */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Today's Tasks */}
            <Card variant="elevated" padding="lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-100 dark:bg-brand-950">
                    <Sparkles className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-surface-900 dark:text-dark-50">
                      今日推荐
                    </h2>
                    <p className="text-sm text-surface-500 dark:text-dark-400">
                      AI 为你推荐的学习任务
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="ghost">
                  刷新
                </Button>
              </div>

              <div className="space-y-3">
                {wrongCount > 0 && (
                  <TaskCard
                    title="复习错题"
                    description={`你有 ${wrongCount} 道错题待复习`}
                    count={wrongCount}
                    link="/wrong-book"
                    priority="high"
                  />
                )}
                {dueFlashcards > 0 && (
                  <TaskCard
                    title="统一复习"
                    description={`${dueFlashcards} 张记忆卡片已到复习时间`}
                    count={dueFlashcards}
                    link="/review"
                    priority="medium"
                  />
                )}
                <TaskCard
                  title="套题测评"
                  description="完成一套模拟题，检验学习成果"
                  link="/mock-exam"
                  priority="low"
                />
              </div>
            </Card>

            {/* Quick Actions */}
            <Card variant="elevated" padding="lg">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-dark-50 mb-4">
                快捷入口
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Link to="/question-bank">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-6 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white cursor-pointer"
                  >
                    <BookOpen className="w-8 h-8 mb-3" />
                    <h4 className="font-semibold mb-1">开始刷题</h4>
                    <p className="text-sm opacity-90">题库管理</p>
                  </motion.div>
                </Link>
                <Link to="/mock-exam">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-6 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white cursor-pointer"
                  >
                    <Zap className="w-8 h-8 mb-3" />
                    <h4 className="font-semibold mb-1">模拟考试</h4>
                    <p className="text-sm opacity-90">套题测评</p>
                  </motion.div>
                </Link>
              </div>
            </Card>
          </motion.div>

          {/* Right Column - Stats & Progress */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            {/* Study tracking */}
            <Card variant="elevated" padding="lg">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-brand-100 p-2 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  <Target className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-dark-50">备考追踪</h3>
                  <p className="mt-1 text-sm leading-6 text-surface-500 dark:text-dark-400">
                    集中记录训练、复盘结果和薄弱模块，明确下一步学习重点。
                  </p>
                </div>
              </div>
              <Link to="/study-tracker" className="mt-5 block">
                <Button variant="outline" size="sm" fullWidth>
                  查看备考追踪
                </Button>
              </Link>
            </Card>

            {/* Achievements */}
            <Card variant="elevated" padding="lg">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-dark-50 mb-4">
                本周成就
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-success-50 dark:bg-success-950/20">
                  <div className="p-2 rounded-lg bg-success-500 text-white">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-surface-900 dark:text-dark-50">
                      连续打卡 {streak} 天
                    </p>
                    <p className="text-xs text-surface-500 dark:text-dark-400">
                      坚持就是胜利！
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-info-50 dark:bg-info-950/20">
                  <div className="p-2 rounded-lg bg-info-500 text-white">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-surface-900 dark:text-dark-50">
                      本周做题 {totalQuestions} 道
                    </p>
                    <p className="text-xs text-surface-500 dark:text-dark-400">
                      超过 68% 的用户
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
