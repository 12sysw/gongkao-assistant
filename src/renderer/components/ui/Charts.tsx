import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Loader2, Clock, PieChart as PieIcon, Radar as RadarIcon, TrendingUp } from 'lucide-react';

const BRAND = '#c2410c';
const COLORS = ['#c2410c', '#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'];

interface DailyRecord {
  date: string;
  study_minutes: number;
  questions_done: number;
  wrong_count: number;
}

interface WrongRecord {
  type?: string | null;
  mastered: number;
  wrong_count: number;
}

interface FlashcardRecord {
  category: string;
  mastered: number;
}

/* ─── Learning Duration Bar Chart ─── */

export function StudyDurationChart({
  records,
  loading,
}: {
  records: DailyRecord[];
  loading: boolean;
}) {
  const data = useMemo(() => {
    const last30 = records.slice(-30);
    return last30.map((r) => ({
      date: r.date.slice(5),
      minutes: r.study_minutes || 0,
    }));
  }, [records]);

  if (loading) {
    return <ChartSkeleton icon={Clock} title="学习时长趋势" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-500" />
          学习时长趋势
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyChart message="暂无学习记录" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-200, #e5e5e5)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--surface-400, #a3a3a3)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--surface-400, #a3a3a3)" unit="分钟" />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid var(--surface-200, #e5e5e5)',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="minutes" fill={BRAND} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Question Type Accuracy Pie Chart ─── */

export function TypeAccuracyChart({
  records,
  loading,
}: {
  records: WrongRecord[];
  loading: boolean;
}) {
  const data = useMemo(() => {
    const groups: Record<string, { total: number; mastered: number }> = {};
    for (const r of records) {
      const label = (r.type?.split('-')[1] || r.type || '其他') as string;
      if (!groups[label]) groups[label] = { total: 0, mastered: 0 };
      groups[label].total++;
      if (r.mastered) groups[label].mastered++;
    }
    return Object.entries(groups).map(([name, g]) => ({
      name,
      value: g.total,
      mastered: g.mastered,
      rate: g.total > 0 ? Math.round((g.mastered / g.total) * 100) : 0,
    }));
  }, [records]);

  if (loading) {
    return <ChartSkeleton icon={PieIcon} title="题型掌握分布" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieIcon className="w-4 h-4 text-brand-500" />
          题型掌握分布
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyChart message="暂无错题记录" />
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="60%" height={220}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {data.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-surface-600 dark:text-surface-400">{d.name}</span>
                  <span className="text-surface-400 ml-auto">{d.mastered}/{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Knowledge Mastery Radar Chart ─── */

export function MasteryRadarChart({
  wrongRecords,
  flashcards,
  loading,
}: {
  wrongRecords: WrongRecord[];
  flashcards: FlashcardRecord[];
  loading: boolean;
}) {
  const data = useMemo(() => {
    const groups: Record<string, { total: number; mastered: number }> = {};

    for (const r of wrongRecords) {
      const label = (r.type?.split('-')[1] || r.type || '其他') as string;
      if (!groups[label]) groups[label] = { total: 0, mastered: 0 };
      groups[label].total++;
      if (r.mastered) groups[label].mastered++;
    }

    for (const f of flashcards) {
      const label = f.category || '综合';
      if (!groups[label]) groups[label] = { total: 0, mastered: 0 };
      groups[label].total++;
      if (f.mastered) groups[label].mastered++;
    }

    return Object.entries(groups).map(([subject, g]) => ({
      subject,
      mastery: g.total > 0 ? Math.round((g.mastered / g.total) * 100) : 0,
      fullMark: 100,
    }));
  }, [wrongRecords, flashcards]);

  if (loading) {
    return <ChartSkeleton icon={RadarIcon} title="知识点掌握雷达" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RadarIcon className="w-4 h-4 text-brand-500" />
          知识点掌握雷达
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length < 3 ? (
          <EmptyChart message="数据不足，需要至少 3 个分类" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid stroke="var(--surface-200, #e5e5e5)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar
                name="掌握率"
                dataKey="mastery"
                stroke={BRAND}
                fill={BRAND}
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Progress Trend Line Chart ─── */

export function ProgressTrendChart({
  records,
  loading,
}: {
  records: DailyRecord[];
  loading: boolean;
}) {
  const data = useMemo(() => {
    const last30 = records.slice(-30);
    return last30.map((r) => ({
      date: r.date.slice(5),
      questions: r.questions_done || 0,
      wrong: r.wrong_count || 0,
    }));
  }, [records]);

  if (loading) {
    return <ChartSkeleton icon={TrendingUp} title="做题趋势" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-500" />
          做题趋势
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyChart message="暂无做题记录" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-200, #e5e5e5)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--surface-400, #a3a3a3)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--surface-400, #a3a3a3)" />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid var(--surface-200, #e5e5e5)',
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="questions" stroke={BRAND} strokeWidth={2} dot={{ r: 3 }} name="做题数" />
              <Line type="monotone" dataKey="wrong" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="错题数" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Helpers ─── */

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[180px] text-sm font-medium text-surface-400 dark:text-surface-500">
      {message}
    </div>
  );
}

function ChartSkeleton({ icon: Icon, title }: { icon: React.FC<{ className?: string }>; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-brand-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-surface-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          正在加载...
        </div>
      </CardContent>
    </Card>
  );
}