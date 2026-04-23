import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Settings, SkipForward, Coffee, Brain } from 'lucide-react';
import dayjs from 'dayjs';

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

interface ModeConfig {
  label: string;
  color: string;
  bg: string;
}

interface HistoryRecord {
  date: string;
  minutes: number;
}

const MODES: Record<TimerMode, ModeConfig> = {
  work: { label: '专注', color: 'text-red-500', bg: 'from-red-500 to-pink-600' },
  shortBreak: { label: '短休息', color: 'text-green-500', bg: 'from-green-500 to-emerald-600' },
  longBreak: { label: '长休息', color: 'text-blue-500', bg: 'from-blue-500 to-indigo-600' },
};

const MODE_BUTTONS: { key: TimerMode; icon: React.ReactNode; label: string }[] = [
  { key: 'work', icon: <Brain className="w-4 h-4" />, label: MODES.work.label },
  { key: 'shortBreak', icon: <Coffee className="w-4 h-4" />, label: MODES.shortBreak.label },
  { key: 'longBreak', icon: <Coffee className="w-4 h-4" />, label: MODES.longBreak.label },
];

function getApi() {
  return (window as unknown as Window & { api: Record<string, unknown> }).api;
}

function formatTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/* ─── Sub-components ─── */

const SettingsPanel: React.FC<{
  workMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  onWorkChange: (v: number) => void;
  onShortChange: (v: number) => void;
  onLongChange: (v: number) => void;
}> = ({ workMin, shortBreakMin, longBreakMin, onWorkChange, onShortChange, onLongChange }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <h2 className="text-sm font-semibold text-gray-700 mb-3">番茄钟设置</h2>
    <div className="grid grid-cols-3 gap-4 mb-4">
      <NumberInput label="专注(分钟)" value={workMin} onChange={onWorkChange} min={1} max={120} />
      <NumberInput label="短休息(分钟)" value={shortBreakMin} onChange={onShortChange} min={1} max={30} />
      <NumberInput label="长休息(分钟)" value={longBreakMin} onChange={onLongChange} min={1} max={60} />
    </div>
  </div>
);

const NumberInput: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}> = ({ label, value, onChange, min, max }) => (
  <div>
    <label className="block text-xs text-gray-500 mb-1">{label}</label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Math.max(min, Math.min(max, +e.target.value)))}
      className="w-full px-3 py-2 border rounded-lg text-sm"
      min={min}
      max={max}
    />
  </div>
);

const ModeSelector: React.FC<{
  mode: TimerMode;
  onSwitch: (m: TimerMode) => void;
}> = ({ mode, onSwitch }) => (
  <div className="flex justify-center gap-2">
    {MODE_BUTTONS.map(({ key, icon, label }) => (
      <button
        key={key}
        onClick={() => onSwitch(key)}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          mode === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {icon} {label}
      </button>
    ))}
  </div>
);

const TimerDisplay: React.FC<{
  mode: TimerMode;
  timeLeft: number;
  progress: number;
  completed: number;
}> = ({ mode, timeLeft, progress, completed }) => (
  <div className={`bg-gradient-to-br ${MODES[mode].bg} rounded-2xl p-10 text-white text-center relative overflow-hidden`}>
    <div
      className="absolute bottom-0 left-0 h-1.5 bg-white/20 transition-all duration-1000"
      style={{ width: `${progress}%` }}
    />
    <div className="text-7xl font-mono font-bold tracking-wider">{formatTime(timeLeft)}</div>
    <div className="text-lg opacity-80 mt-2">{MODES[mode].label}</div>
    {mode === 'work' && completed > 0 && (
      <div className="text-sm opacity-60 mt-1">第 {completed + 1} 个番茄</div>
    )}
  </div>
);

const TimerControls: React.FC<{
  isRunning: boolean;
  onToggle: () => void;
  onReset: () => void;
  onSkip: () => void;
}> = ({ isRunning, onToggle, onReset, onSkip }) => (
  <div className="flex justify-center gap-3">
    <button
      onClick={onReset}
      className="flex items-center gap-2 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm transition-colors"
    >
      <RotateCcw className="w-4 h-4" /> 重置
    </button>
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white text-sm transition-colors ${
        isRunning ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-primary-600 hover:bg-primary-700'
      }`}
    >
      {isRunning ? (
        <>
          <Pause className="w-4 h-4" /> 暂停
        </>
      ) : (
        <>
          <Play className="w-4 h-4" /> 开始
        </>
      )}
    </button>
    <button
      onClick={onSkip}
      className="flex items-center gap-2 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm transition-colors"
    >
      <SkipForward className="w-4 h-4" /> 跳过
    </button>
  </div>
);

const ProgressTracker: React.FC<{
  completed: number;
}> = ({ completed }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <h2 className="text-sm font-semibold text-gray-700 mb-3">今日进度</h2>
    <div className="flex gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
            i < completed ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'
          }`}
        >
          {i < completed ? '✓' : i + 1}
        </div>
      ))}
    </div>
    <p className="text-xs text-gray-400 mt-2">每4个番茄后长休息 · 目标8个/天</p>
  </div>
);

const TipCard: React.FC<{
  workMin: number;
  shortBreakMin: number;
  longBreakMin: number;
}> = ({ workMin, shortBreakMin, longBreakMin }) => (
  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
    <p className="font-semibold mb-1">💡 番茄工作法</p>
    <p>
      专注 {workMin} 分钟 → 休息 {shortBreakMin} 分钟，每4个循环后长休息 {longBreakMin} 分钟。专注时段自动记录到学习时长。
    </p>
  </div>
);

/* ─── Main Page ─── */

const Pomodoro: React.FC = () => {
  const [workMin, setWorkMin] = useState(25);
  const [shortBreakMin, setShortBreakMin] = useState(5);
  const [longBreakMin, setLongBreakMin] = useState(15);
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getModeMinutes = useCallback(
    (m: TimerMode) => (m === 'work' ? workMin : m === 'shortBreak' ? shortBreakMin : longBreakMin),
    [workMin, shortBreakMin, longBreakMin]
  );

  const loadHistory = useCallback(async () => {
    try {
      const api = getApi();
      if (!api) return;
      const records = (await api.dailyRecord.getRange(
        dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
        dayjs().format('YYYY-MM-DD')
      )) as { date: string; study_minutes: number }[];
      if (records) setHistory(records.map((r) => ({ date: r.date, minutes: r.study_minutes || 0 })));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadHistory]);

  const switchMode = useCallback(
    (m: TimerMode) => {
      setMode(m);
      const mins = getModeMinutes(m);
      setTimeLeft(mins * 60);
      setIsRunning(false);
    },
    [getModeMinutes]
  );

  const handleTimerEnd = useCallback(() => {
    setIsRunning(false);
    if (mode === 'work') {
      setCompleted((prev) => {
        const newCount = prev + 1;
        const today = dayjs().format('YYYY-MM-DD');
        (async () => {
          try {
            const api = getApi();
            if (api) {
              await api.dailyRecord.add({
                date: today,
                study_minutes: workMin,
                questions_done: 0,
                wrong_count: 0,
                note: '',
              });
              if (api.pomodoroRecord) {
                await api.pomodoroRecord.add({ date: today, duration: workMin, mode: 'work' });
              }
              loadHistory();
            }
          } catch (e) {
            console.error(e);
          }
        })();
        if (newCount % 4 === 0) switchMode('longBreak');
        else switchMode('shortBreak');
        return newCount;
      });
    } else {
      switchMode('work');
    }
  }, [mode, workMin, switchMode, loadHistory]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, handleTimerEnd]);

  const reset = () => {
    setIsRunning(false);
    setTimeLeft(getModeMinutes(mode) * 60);
  };

  const skip = () => {
    setIsRunning(false);
    setTimeLeft(0);
    handleTimerEnd();
  };

  const currentMinutes = getModeMinutes(mode);
  const progress = ((currentMinutes * 60 - timeLeft) / (currentMinutes * 60)) * 100;
  const totalWeekMin = history.reduce((s, h) => s + h.minutes, 0);

  const handleWorkChange = (v: number) => {
    setWorkMin(v);
    if (mode === 'work') setTimeLeft(v * 60);
  };
  const handleShortChange = (v: number) => {
    setShortBreakMin(v);
    if (mode === 'shortBreak') setTimeLeft(v * 60);
  };
  const handleLongChange = (v: number) => {
    setLongBreakMin(v);
    if (mode === 'longBreak') setTimeLeft(v * 60);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">番茄钟</h1>
          <p className="text-sm text-gray-500 mt-1">
            已完成 {completed} 个专注时段 · 本周 {Math.round((totalWeekMin / 60) * 10) / 10} 小时
          </p>
        </div>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {showSettings && (
        <SettingsPanel
          workMin={workMin}
          shortBreakMin={shortBreakMin}
          longBreakMin={longBreakMin}
          onWorkChange={handleWorkChange}
          onShortChange={handleShortChange}
          onLongChange={handleLongChange}
        />
      )}

      <ModeSelector mode={mode} onSwitch={switchMode} />

      <TimerDisplay mode={mode} timeLeft={timeLeft} progress={progress} completed={completed} />

      <TimerControls
        isRunning={isRunning}
        onToggle={() => setIsRunning((r) => !r)}
        onReset={reset}
        onSkip={skip}
      />

      <ProgressTracker completed={completed} />

      <TipCard workMin={workMin} shortBreakMin={shortBreakMin} longBreakMin={longBreakMin} />
    </div>
  );
};

export default Pomodoro;
