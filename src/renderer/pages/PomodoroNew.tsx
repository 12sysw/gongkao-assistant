import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Timer, Play, Pause, RotateCcw, Coffee, Brain, Target, TrendingUp } from 'lucide-react';
import { PageContainer, PageHeader, PageSection } from '../components/ui/PageLayout';
import { StatCardModern } from '../components/ui/DataDisplay';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const Pomodoro: React.FC = () => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [completedPomodoros, setCompletedPomodoros] = useState(0);

  // 倒计时逻辑
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            // 倒计时结束
            setIsRunning(false);
            if (mode === 'work') {
              setCompletedPomodoros(prev => prev + 1);
              // 播放提示音（可选）
              // new Audio('/notification.mp3').play();
            }
            return;
          }
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, minutes, seconds, mode]);

  const progress = mode === 'work'
    ? ((25 * 60 - (minutes * 60 + seconds)) / (25 * 60)) * 100
    : ((5 * 60 - (minutes * 60 + seconds)) / (5 * 60)) * 100;

  const stats = {
    today: completedPomodoros,
    thisWeek: 24,
    totalTime: completedPomodoros * 25,
    streak: 7,
  };

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        title="番茄钟"
        subtitle="专注工作，高效学习"
        icon={<Timer className="w-7 h-7" />}
        badge={<Badge variant="primary" size="lg">{completedPomodoros} 个番茄</Badge>}
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCardModern
          label="今日番茄"
          value={stats.today}
          icon={<Target className="w-5 h-5" />}
          gradient="from-red-500 to-orange-500"
        />
        <StatCardModern
          label="本周番茄"
          value={stats.thisWeek}
          icon={<TrendingUp className="w-5 h-5" />}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCardModern
          label="今日时长"
          value={`${stats.totalTime}分钟`}
          icon={<Timer className="w-5 h-5" />}
          gradient="from-purple-500 to-indigo-500"
        />
        <StatCardModern
          label="连续天数"
          value={`${stats.streak}天`}
          change={12}
          icon={<Brain className="w-5 h-5" />}
          gradient="from-green-500 to-emerald-500"
        />
      </div>

      {/* 番茄钟主体 */}
      <PageSection>
        <Card variant="elevated" className="overflow-hidden">
          <CardContent className="p-12">
            {/* 模式切换 */}
            <div className="flex justify-center gap-3 mb-12">
              <Button
                variant={mode === 'work' ? 'primary' : 'outline'}
                onClick={() => {
                  setMode('work');
                  setMinutes(25);
                  setSeconds(0);
                  setIsRunning(false);
                }}
              >
                <Brain className="w-4 h-4" />
                工作
              </Button>
              <Button
                variant={mode === 'break' ? 'success' : 'outline'}
                onClick={() => {
                  setMode('break');
                  setMinutes(5);
                  setSeconds(0);
                  setIsRunning(false);
                }}
              >
                <Coffee className="w-4 h-4" />
                休息
              </Button>
            </div>

            {/* 圆形进度 */}
            <div className="relative w-80 h-80 mx-auto mb-12">
              {/* 背景圆 */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="160"
                  cy="160"
                  r="140"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-surface-100 dark:text-dark-850"
                />
                {/* 进度圆 */}
                <motion.circle
                  cx="160"
                  cy="160"
                  r="140"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 140}
                  initial={{ strokeDashoffset: 2 * Math.PI * 140 }}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 140 * (1 - progress / 100)
                  }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={mode === 'work' ? '#ef4444' : '#10b981'} />
                    <stop offset="100%" stopColor={mode === 'work' ? '#f97316' : '#059669'} />
                  </linearGradient>
                </defs>
              </svg>

              {/* 时间显示 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  key={`${minutes}:${seconds}`}
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-7xl font-bold text-surface-900 dark:text-dark-50 tabular-nums"
                >
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </motion.div>
                <p className="text-sm text-surface-500 dark:text-dark-400 mt-2">
                  {mode === 'work' ? '专注工作中' : '休息时间'}
                </p>
              </div>
            </div>

            {/* 控制按钮 */}
            <div className="flex justify-center gap-4">
              <Button
                size="lg"
                variant={isRunning ? 'secondary' : 'primary'}
                onClick={() => setIsRunning(!isRunning)}
                className="w-32"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-5 h-5" />
                    暂停
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    开始
                  </>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setMinutes(mode === 'work' ? 25 : 5);
                  setSeconds(0);
                  setIsRunning(false);
                }}
                className="w-32"
              >
                <RotateCcw className="w-5 h-5" />
                重置
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* 今日记录 */}
      <PageSection title="今日记录" className="mt-8">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              className={`aspect-square rounded-lg flex items-center justify-center text-xs font-semibold ${
                i < completedPomodoros
                  ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white'
                  : 'bg-surface-100 dark:bg-dark-850 text-surface-400 dark:text-dark-500'
              }`}
            >
              {i + 1}
            </motion.div>
          ))}
        </div>
      </PageSection>
    </PageContainer>
  );
};

export default Pomodoro;
