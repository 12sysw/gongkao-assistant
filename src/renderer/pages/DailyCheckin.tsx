import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Flame,
  Trophy,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
  Square,
} from 'lucide-react';
import dayjs from 'dayjs';
import {
  useAddDailyRecord,
  useDailyRecord,
  useDailyRecordRange,
  useDailyStats,
  useExamConfig,
  useUpdateExamConfig,
} from '../hooks/use-api';
import type { DailyRecord } from '../../shared/ipc';

type CheckinRecord = Pick<DailyRecord, 'date' | 'study_minutes' | 'questions_done' | 'note'>;

const CHECKIN_TIMER_START_KEY = 'gongkao_checkin_timer_started_at';
const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

function formatStudyMinutes(minutes: number) {
  return minutes >= 60 ? `${(minutes / 60).toFixed(1)}h` : `${minutes}m`;
}

function formatElapsedTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const restSeconds = safeSeconds % 60;
  return [hours, minutes, restSeconds].map((value) => String(value).padStart(2, '0')).join(':');
}

/* ─── Sub-components ─── */

const CountdownBanner: React.FC<{ examName: string; examDate: string; daysLeft: number }> = ({
  examName,
  examDate,
  daysLeft,
}) => (
  <div className="bg-brand-gradient rounded-2xl p-6 text-white relative overflow-hidden">
    <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.08] rounded-full -translate-y-1/3 translate-x-1/4" />
    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/[0.04] rounded-full translate-y-1/3 -translate-x-1/4" />
    <div className="flex items-center justify-between relative">
      <div>
        <p className="text-white/80 text-sm">目标考试</p>
        <h2 className="text-xl font-bold mt-1 font-display">{examName}</h2>
        <p className="text-white/70 text-sm mt-1">{examDate}</p>
      </div>
      <div className="text-center">
        <div className="text-5xl font-bold font-display">{daysLeft}</div>
        <div className="text-white/70 text-sm">天后考试</div>
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
  <div className="surface dark:bg-surface-800 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-3">
    <div className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center`}>{icon}</div>
    <div>
      <p className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-surface-900 dark:text-surface-0 font-display">{value}</p>
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
    <div className="surface dark:bg-surface-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrev} className="p-2 rounded-xl text-surface-400 hover:text-surface-900 dark:hover:text-surface-0 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-surface-900 dark:text-surface-0 font-display">{currentMonth.format('YYYY年MM月')}</h2>
        <button onClick={onNext} className="p-2 rounded-xl text-surface-400 hover:text-surface-900 dark:hover:text-surface-0 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="text-center text-[11px] text-surface-400 py-2 font-medium">
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
              className={`aspect-square flex items-center justify-center text-sm rounded-xl transition-all duration-200 font-bold ${
                isToday
                  ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-500 ring-2 ring-brand-300 dark:ring-brand-700'
                  : isChecked
                  ? 'bg-success-light dark:bg-success/20 text-success-dark dark:text-success'
                  : 'text-surface-500 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700'
              }`}
            >
              {d.day}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-4 text-[11px] text-surface-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-success-light" /> 已打卡
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-brand-100 ring-1 ring-brand-300" /> 今天
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
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [note, setNote] = useState('');
  const [studyMinutes, setStudyMinutes] = useState(0);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(() => {
    const stored = Number(localStorage.getItem(CHECKIN_TIMER_START_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : null;
  });
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  const today = useMemo(() => dayjs(nowMs).format('YYYY-MM-DD'), [nowMs]);
  const rangeStart = useMemo(() => dayjs(today).subtract(90, 'day').format('YYYY-MM-DD'), [today]);
  const todayRecordQuery = useDailyRecord(today);
  const statsQuery = useDailyStats(365);
  const rangeQuery = useDailyRecordRange(rangeStart, today);
  const examConfigQuery = useExamConfig();
  const addDailyRecord = useAddDailyRecord();
  const updateExamConfig = useUpdateExamConfig();

  useEffect(() => {
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const record = todayRecordQuery.data ?? null;
    setTodayRecord(record);
    if (record) {
      setNote(record.note || '');
      setStudyMinutes(record.study_minutes || 0);
    } else {
      setStudyMinutes(0);
    }
  }, [todayRecordQuery.data]);

  useEffect(() => {
    const stats = statsQuery.data ?? null;
    if (stats) {
      setStreak(stats.streak || 0);
      setTotalDays(stats.active_days || 0);
    }
  }, [statsQuery.data]);

  useEffect(() => {
    setCheckedDates((rangeQuery.data ?? []).map((record) => record.date));
  }, [rangeQuery.data]);

  useEffect(() => {
    const config = examConfigQuery.data ?? null;
    if (config) {
      setExamName(config.name);
      setExamDate(config.date);
    }
  }, [examConfigQuery.data]);

  const daysLeft = useMemo(() => {
    if (!examDate) return 0;
    const diff = dayjs(examDate).diff(dayjs(), 'day');
    return isNaN(diff) ? 0 : Math.max(0, diff);
  }, [examDate]);

  const elapsedSeconds = useMemo(() => {
    if (!timerStartedAt) return 0;
    return Math.max(0, Math.floor((nowMs - timerStartedAt) / 1000));
  }, [nowMs, timerStartedAt]);

  const elapsedFullMinutes = useMemo(() => Math.floor(elapsedSeconds / 60), [elapsedSeconds]);

  const startTimer = useCallback(() => {
    const startedAt = Date.now();
    localStorage.setItem(CHECKIN_TIMER_START_KEY, String(startedAt));
    setTimerStartedAt(startedAt);
    setNowMs(startedAt);
  }, []);

  const resetTimer = useCallback(() => {
    localStorage.removeItem(CHECKIN_TIMER_START_KEY);
    setTimerStartedAt(null);
    setNowMs(Date.now());
  }, []);

  const handleCheckin = useCallback(async () => {
    if (!timerStartedAt || elapsedFullMinutes <= 0) return;

    try {
      await addDailyRecord.mutateAsync({
        date: today,
        study_minutes: elapsedFullMinutes,
        questions_done: 0,
        wrong_count: 0,
        note,
      });
      // Only save exam config if changed from current
      const currentConfig = examConfigQuery.data ?? null;
      if (!currentConfig || currentConfig.name !== examName || currentConfig.date !== examDate) {
        await updateExamConfig.mutateAsync({
          name: examName || currentConfig?.name || '2027国考',
          date: examDate || currentConfig?.date || '2026-12-01',
        });
      }
      const nextStudyMinutes = studyMinutes + elapsedFullMinutes;
      setTodayRecord({ date: today, study_minutes: nextStudyMinutes, questions_done: 0, note });
      setStudyMinutes(nextStudyMinutes);
      resetTimer();
    } catch (e) {
      console.error(e);
    }
  }, [
    addDailyRecord,
    today,
    timerStartedAt,
    elapsedFullMinutes,
    studyMinutes,
    note,
    examConfigQuery.data,
    examName,
    examDate,
    updateExamConfig,
    resetTimer,
  ]);

  const studyDisplay = useMemo(
    () => formatStudyMinutes(studyMinutes + elapsedFullMinutes),
    [elapsedFullMinutes, studyMinutes]
  );

  const isCheckedIn = !!todayRecord;
  const canCheckin = !!timerStartedAt && elapsedFullMinutes > 0 && !addDailyRecord.isPending;

  return (
    <div className="p-6 space-y-6">
      <CountdownBanner examName={examName} examDate={examDate} daysLeft={daysLeft} />

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<Flame className="w-5 h-5 text-brand-500" />}
          iconBg="bg-brand-100"
          label="连续打卡"
          value={`${streak} 天`}
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-success" />}
          iconBg="bg-success-light"
          label="累计打卡"
          value={`${totalDays} 天`}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-brand-500" />}
          iconBg="bg-brand-100"
          label="今日学习"
          value={studyDisplay}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 打卡面板 */}
        <div className="surface dark:bg-surface-800 hover:shadow-card-hover transition-all duration-300 p-5">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-0 mb-4 flex items-center font-display">
            <Calendar className="w-[18px] h-[18px] mr-2 text-brand-500" />
            今日打卡
          </h2>
          <div className="space-y-4">
            <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-900/40">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">开始时间</p>
                  <p className="mt-1 text-sm font-semibold text-surface-900 dark:text-surface-0">
                    {timerStartedAt ? dayjs(timerStartedAt).format('HH:mm:ss') : '--:--:--'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">系统时间</p>
                  <p className="mt-1 text-sm font-semibold text-surface-900 dark:text-surface-0">
                    {dayjs(nowMs).format('HH:mm:ss')}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">本次学习</p>
                  <p className="mt-1 font-mono text-lg font-bold text-brand-600 dark:text-brand-400">
                    {formatElapsedTime(elapsedSeconds)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {!timerStartedAt ? (
                  <button
                    type="button"
                    onClick={startTimer}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-brand-600 active:scale-[0.98]"
                  >
                    <Play className="h-4 w-4" />
                    开始学习
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCheckin}
                      disabled={!canCheckin}
                      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                        !canCheckin
                          ? 'cursor-not-allowed bg-surface-100 text-surface-400 dark:bg-surface-700'
                          : 'bg-brand-500 text-white shadow-md hover:bg-brand-600 active:scale-[0.98]'
                      }`}
                    >
                      <Square className="h-4 w-4" />
                      {addDailyRecord.isPending ? '保存中' : isCheckedIn ? '结束并追加' : '结束并打卡'}
                    </button>
                    <button
                      type="button"
                      onClick={resetTimer}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-surface-200 px-4 py-3 text-sm font-semibold text-surface-600 transition-colors hover:bg-white dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
                    >
                      <RotateCcw className="h-4 w-4" />
                      重置
                    </button>
                  </>
                )}
              </div>

              {timerStartedAt && elapsedFullMinutes === 0 && (
                <p className="mt-3 text-xs text-surface-400">满 1 分钟后可打卡。</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-900 dark:text-surface-0 mb-1">今日总结</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 border-2 border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-xl text-sm resize-none h-20 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 placeholder:text-surface-400"
                placeholder="今天学了什么？"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-surface-900 dark:text-surface-0 mb-1">考试名称</label>
                <input
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border-2 border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 placeholder:text-surface-400"
                />
              </div>
              <div className="w-36">
                <label className="block text-sm font-semibold text-surface-900 dark:text-surface-0 mb-1">考试日期</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border-2 border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 placeholder:text-surface-400"
                />
              </div>
            </div>

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
