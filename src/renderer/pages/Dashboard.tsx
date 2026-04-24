import {
  Clock,
  Flame,
  BookOpen,
  CheckCircle2,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { cn } from '../lib/utils';

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Hero banner */}
      <div className="bg-brand-gradient text-white px-6 py-5 rounded-2xl shadow-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/[0.08] rounded-full -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/[0.04] rounded-full translate-y-1/3 -translate-x-1/4" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold mb-1 font-display">公务员考试学习进度</h1>
            <p className="text-white/70 text-xs">持之以恒，循序渐进</p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold font-display">15</p>
              <p className="text-xs text-white/60 mt-0.5">连续学习(天)</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold font-display">1,248</p>
              <p className="text-xs text-white/60 mt-0.5">累计刷题(道)</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold font-display">42.5h</p>
              <p className="text-xs text-white/60 mt-0.5">学习时长</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Flame}
          iconColor="text-brand-500"
          iconBgColor="bg-brand-100"
          label="连续学习"
          value="15天"
        />
        <StatCard
          icon={BookOpen}
          iconColor="text-brand-500"
          iconBgColor="bg-brand-100"
          label="累计刷题"
          value="1,248道"
        />
        <StatCard
          icon={Clock}
          iconColor="text-brand-500"
          iconBgColor="bg-brand-100"
          label="学习时长"
          value="42.5小时"
        />
        <StatCard
          icon={CheckCircle2}
          iconColor="text-brand-500"
          iconBgColor="bg-brand-100"
          label="已掌握错题"
          value="312道"
        />
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickLinks />
        <StudyStats />
      </div>
    </div>
  );
}

function QuickLinks() {
  const links = [
    {
      icon: ArrowRight,
      text: '套题测评',
      href: '/mock-exam',
    },
    {
      icon: ArrowRight,
      text: '错题本',
      href: '/wrong-book',
    },
    {
      icon: ArrowRight,
      text: '记忆卡片',
      href: '/flashcards',
    },
    {
      icon: ArrowRight,
      text: '番茄专注',
      href: '/pomodoro',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>快捷功能</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {links.map((link, i) => (
            <Link
              key={i}
              to={link.href}
              className={cn(
                'flex items-center gap-3 p-4 rounded-xl border border-surface-100 transition-all duration-200',
                'bg-surface-0 hover:bg-brand-50 hover:border-brand-200 hover:shadow-soft'
              )}
            >
              <link.icon className={cn('w-5 h-5 text-brand-500')} />
              <span className="text-sm font-medium text-surface-800">{link.text}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StudyStats() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>学习统计</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-500">本周学习天数</span>
            <span className="text-lg font-semibold text-surface-900 font-display">6天</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-500">平均每日时长</span>
            <span className="text-lg font-semibold text-surface-900 font-display">7.1小时</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-500">今日学习进度</span>
            <span className="text-lg font-semibold text-surface-900 font-display">85%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-500">今日学习时长</span>
            <span className="text-lg font-semibold text-surface-900 font-display">5小时32分</span>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-surface-100">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-brand-400" />
            <span className="text-sm font-medium text-surface-600">学习计划</span>
          </div>
          <div className="space-y-2">
            {[
              { label: '言语', pct: 78 },
              { label: '数量', pct: 45 },
              { label: '判断', pct: 82 },
              { label: '资料', pct: 69 },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 bg-surface-0 rounded-lg">
                <span className="text-xs text-surface-500 w-12">{item.label}</span>
                <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${item.pct}%` }} />
                </div>
                <span className="text-xs text-surface-500 w-12 text-right">{item.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
