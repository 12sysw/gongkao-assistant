import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Flame, Target, TrendingUp, Award, CheckCircle2 } from 'lucide-react';
import { PageContainer, PageHeader, PageSection } from '../components/ui/PageLayout';
import { StatCardModern } from '../components/ui/DataDisplay';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';

const DailyCheckin: React.FC = () => {
  const [checkedDays, setCheckedDays] = useState<Set<string>>(new Set(['2026-06-14', '2026-06-13', '2026-06-12']));

  const stats = {
    streak: 7,
    total: 45,
    thisMonth: 14,
    rate: 93,
  };

  // 生成日历
  const generateCalendar = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startOffset = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const days = generateCalendar();
  const today = new Date().getDate();

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        title="打卡日历"
        subtitle="每日打卡，养成习惯"
        icon={<Calendar className="w-7 h-7" />}
        badge={<Badge variant="warning" size="lg"><Flame className="w-4 h-4" />连续 {stats.streak} 天</Badge>}
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCardModern
          label="连续打卡"
          value={`${stats.streak}天`}
          icon={<Flame className="w-5 h-5" />}
          gradient="from-orange-500 to-red-500"
        />
        <StatCardModern
          label="累计打卡"
          value={`${stats.total}天`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          gradient="from-green-500 to-emerald-500"
        />
        <StatCardModern
          label="本月打卡"
          value={`${stats.thisMonth}天`}
          icon={<Calendar className="w-5 h-5" />}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCardModern
          label="打卡率"
          value={`${stats.rate}%`}
          change={5}
          icon={<TrendingUp className="w-5 h-5" />}
          gradient="from-purple-500 to-indigo-500"
        />
      </div>

      {/* 日历 */}
      <PageSection>
        <Card variant="elevated">
          <CardContent className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-surface-900 dark:text-dark-50 text-center">
                2026年6月
              </h2>
            </div>

            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-3 mb-3">
              {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
                <div key={day} className="text-center text-sm font-semibold text-surface-600 dark:text-dark-300">
                  {day}
                </div>
              ))}
            </div>

            {/* 日期 */}
            <div className="grid grid-cols-7 gap-3">
              {days.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} />;
                }

                const dateStr = `2026-06-${String(day).padStart(2, '0')}`;
                const isChecked = checkedDays.has(dateStr);
                const isToday = day === today;
                const isFuture = day > today;

                return (
                  <motion.button
                    key={day}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                    disabled={isFuture}
                    className={cn(
                      'aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-200',
                      'text-sm font-semibold',
                      isToday && 'ring-2 ring-brand-500 ring-offset-2',
                      isChecked
                        ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl'
                        : isFuture
                        ? 'bg-surface-50 dark:bg-dark-850 text-surface-300 dark:text-dark-600 cursor-not-allowed'
                        : 'bg-surface-100 dark:bg-dark-850 text-surface-700 dark:text-dark-200 hover:bg-surface-200 dark:hover:bg-dark-800 cursor-pointer'
                    )}
                    onClick={() => {
                      if (!isFuture) {
                        setCheckedDays(prev => {
                          const next = new Set(prev);
                          if (next.has(dateStr)) {
                            next.delete(dateStr);
                          } else {
                            next.add(dateStr);
                          }
                          return next;
                        });
                      }
                    }}
                  >
                    <span className="text-lg">{day}</span>
                    {isChecked && <CheckCircle2 className="w-4 h-4 mt-1" />}
                  </motion.button>
                );
              })}
            </div>

            {/* 图例 */}
            <div className="flex items-center justify-center gap-6 mt-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-green-500 to-emerald-500" />
                <span className="text-surface-600 dark:text-dark-300">已打卡</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-surface-100 dark:bg-dark-850" />
                <span className="text-surface-600 dark:text-dark-300">未打卡</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-surface-50 dark:bg-dark-850 opacity-50" />
                <span className="text-surface-600 dark:text-dark-300">未来</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {/* 打卡成就 */}
      <PageSection title="打卡成就" className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: '新手上路', desc: '连续打卡3天', icon: Target, achieved: true },
            { title: '坚持不懈', desc: '连续打卡7天', icon: Flame, achieved: true },
            { title: '习惯养成', desc: '连续打卡30天', icon: Award, achieved: false },
          ].map((achievement, i) => (
            <Card
              key={i}
              variant="elevated"
              hover="lift"
              className={cn(
                achievement.achieved
                  ? 'bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-950 dark:to-brand-900'
                  : ''
              )}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'p-3 rounded-xl',
                    achievement.achieved
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-100 dark:bg-dark-850 text-surface-400 dark:text-dark-500'
                  )}>
                    <achievement.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-surface-900 dark:text-dark-50">
                        {achievement.title}
                      </h3>
                      {achievement.achieved && (
                        <CheckCircle2 className="w-4 h-4 text-success-500" />
                      )}
                    </div>
                    <p className="text-sm text-surface-600 dark:text-dark-300">
                      {achievement.desc}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageSection>
    </PageContainer>
  );
};

export default DailyCheckin;
