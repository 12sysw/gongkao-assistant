import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Flame,
  Trophy,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import dayjs from 'dayjs';

interface CheckinRecord {
  date: string;
  study_minutes: number;
  questions_done: number;
  note: string;
}

interface ExamConfig {
  name: string;
  date: string;
}

interface DailyRecordApiResponse {
  streak: number;
  active_days: number;
}

function getApi() {
  return (window as unknown as Window & { api: Record<string, unknown> }).api;
}

const TIME_OPTIONS = [30, 60, 90, 120, 180, 240, 300, 480];
const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

/* ─── Sub-components ─── */

const CountdownBanner: React.FC<{ examName: string; examDate: string; daysLeft: number }> = ({
  examName,
  examDate,
  daysLeft,
}) => (
  <div className="bg-gradient-to-r from-primary-600 to-indigo-600 rounded-2xl p-6 text-white">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-primary-100 text-sm">目标考试</p>
        <h2 className="text-xl font-bold mt-1">{examName}</h2>
        <p className="text-primary-200 text-sm mt-1">{examDate}</p>
      </div>
      <div className="text-center">
        <div className="text-5xl font-bold">{daysLeft}</div>
        <div className="text-primary-200 text-sm">天后考试</div>
      </div>
    </div>
  </div>
);

const StatCard: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}> = ({ icon, iconBg, label, value }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>{icon}</div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-800">{value}</p>
    </div>
  </div>
);

const TimeSelector: React.FC<{
  value: number;
  onChange: (minutes: number) => void;
}> = ({ value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">学习时长</label>
    <div className="grid grid-cols-4 gap-2">
      {TIME_OPTIONS.map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`py-2 rounded-lg text-sm transition-colors ${
            value === m ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {m >= 60 ? `${m / 60}h` : `${m}m`}
        </button>
      ))}
    </div>
  </div>
);

const CheckinCalendar: React.FC<{
  currentMonth: dayjs.Dayjs;
  checkedDates: string[];
  onPrev: () => void;
  onNext: () => void;
}> = ({ currentMonth, checkedDates, onPrev, onNext }) => {
  const days = useMemo(() => {
    const start = currentMonth.startOf('month');
    const startDay = start.day();
    const daysInMonth = currentMonth.daysInMonth();
    const result: { date: string; day: number; isCurrentMonth: boolean }[] = [];
    for (let i = 0; i < startDay; i++) result.push({ date: '', day: 0, isCurrentMonth: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = currentMonth.format('YYYY-MM') + '-' + String(d).padStart(2, '0');
      result.push({ date, day: d, isCurrentMonth: true });
    }
    return result;
  }, [currentMonth]);

  const todayStr = dayjs().format('YYYY-MM-DD');

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrev} className="p-1 hover:bg-gray-100 rounded">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-gray-800">{currentMonth.format('YYYY年MM月')}</h2>
        <button onClick={onNext} className="p-1 hover:bg-gray-100 rounded">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 py-2">
            {d}
          </div>
        ))}
        {days.map((d, i) => {
          if (!d.isCurrentMonth) return <div key={`e-${i}`} />;
          const isToday = d.date === todayStr;
          const isChecked = checkedDates.includes(d.date);
          return (
            <div
              key={d.date}
              className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-colors ${
                isToday
                  ? 'bg-primary-100 text-primary-700 font-bold ring-2 ring-primary-300'
                  : isChecked
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {d.day}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-100" /> 已打卡
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-primary-100 ring-1 ring-primary-300" /> 今天
        </span>
      </div>
    </div>
  );
};

/* ─── Main Page ─── */

const DailyCheckin: React.FC = () => {
  const [todayRecord, setTodayRecord] = useState<CheckinRecord | null>(null);
  const [streak, setStreak] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [checkedDates, setCheckedDates] = useState<string[]>([]);
  const [examName, setExamName] = useState('2026年国考');
  const [examDate, setExamDate] = useState('2025-12-01');
  const [note, setNote] = useState('');
  const [studyMinutes, setStudyMinutes] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  const loadData = useCallback(async () => {
    try {
      const api = getApi();
      if (!api) return;

      const today = dayjs().format('YYYY-MM-DD');
      const record = (await api.dailyRecord.getByDate(today)) as CheckinRecord | null;
      if (record) {
        setTodayRecord(record);
        setNote(record.note || '');
        setStudyMinutes(record.study_minutes || 0);
      }

      const stats = (await api.dailyRecord.getStats(365)) as DailyRecordApiResponse | null;
      if (stats) {
        setStreak(stats.streak || 0);
        setTotalDays(stats.active_days || 0);
      }

      const range = (await api.dailyRecord.getRange(
        dayjs().subtract(90, 'day').format('YYYY-MM-DD'),
        dayjs().format('YYYY-MM-DD')
      )) as CheckinRecord[];
      if (range) setCheckedDates(range.map((r) => r.date));

      const config = (await api.examConfig.get()) as ExamConfig | null;
      if (config) {
        setExamName(config.name);
        setExamDate(config.date);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const daysLeft = useMemo(() => Math.max(0, dayjs(examDate).diff(dayjs(), 'day')), [examDate]);

  const handleCheckin = useCallback(async () => {
    try {
      const api = getApi();
      const today = dayjs().format('YYYY-MM-DD');
      await api.dailyRecord.add({
        date: today,
        study_minutes: studyMinutes,
        questions_done: 0,
        wrong_count: 0,
        note,
      });
      await api.examConfig.set({ name: examName, date: examDate });
      setTodayRecord({ date: today, study_minutes: studyMinutes, questions_done: 0, note });
      loadData();
    } catch (e) {
      console.error(e);
    }
  }, [studyMinutes, note, examName, examDate, loadData]);

  const studyDisplay = useMemo(
    () => (studyMinutes >= 60 ? `${(studyMinutes / 60).toFixed(1)}h` : `${studyMinutes}m`),
    [studyMinutes]
  );

  const isCheckedIn = !!todayRecord;
  const canCheckin = studyMinutes > 0;

  return (
    <div className="p-6 space-y-6">
      <CountdownBanner examName={examName} examDate={examDate} daysLeft={daysLeft} />

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          iconBg="bg-orange-50"
          label="连续打卡"
          value={`${streak} 天`}
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-green-500" />}
          iconBg="bg-green-50"
          label="累计打卡"
          value={`${totalDays} 天`}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-blue-500" />}
          iconBg="bg-blue-50"
          label="今日学习"
          value={studyDisplay}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 打卡面板 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-primary-500" />
            今日打卡
          </h2>
          <div className="space-y-4">
            <TimeSelector value={studyMinutes} onChange={setStudyMinutes} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">今日总结</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none h-20 focus:outline-none focus:border-primary-400"
                placeholder="今天学了什么？"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">考试名称</label>
                <input
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                />
              </div>
              <div className="w-36">
                <label className="block text-sm font-medium text-gray-700 mb-1">考试日期</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                />
              </div>
            </div>

            <button
              onClick={handleCheckin}
              disabled={isCheckedIn || !canCheckin}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-colors ${
                isCheckedIn
                  ? 'bg-green-50 text-green-700 cursor-default'
                  : !canCheckin
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              {isCheckedIn ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> 已打卡
                </span>
              ) : (
                '立即打卡'
              )}
            </button>
          </div>
        </div>

        <CheckinCalendar
          currentMonth={currentMonth}
          checkedDates={checkedDates}
          onPrev={() => setCurrentMonth((m) => m.subtract(1, 'month'))}
          onNext={() => setCurrentMonth((m) => m.add(1, 'month'))}
        />
      </div>
    </div>
  );
};

export default DailyCheckin;
