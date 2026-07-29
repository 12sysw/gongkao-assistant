import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, BookOpenCheck, GitBranch, RefreshCw, RotateCcw, Send } from 'lucide-react';
import type { StudyTrackerActionResult, StudyTrackerStatus } from '../../shared/ipc';

const MODULES = ['\u8a00\u8bed\u7406\u89e3', '\u6570\u91cf\u5173\u7cfb', '\u5224\u65ad\u63a8\u7406', '\u8d44\u6599\u5206\u6790', '\u7533\u8bba'];
const EXAMPLES = [
  '\u8d44\u6599\u5206\u6790\u9519 5 \u9053\uff0c\u5224\u65ad\u63a8\u7406\u9519 3 \u9053',
  '\u4eca\u5929\u6ca1\u65f6\u95f4\uff0c\u4f11\u606f',
  '\u8d44\u6599-\u589e\u957f\u7387-\u516c\u5f0f\u4e0d\u719f-\u5f85\u4e8c\u5237',
];

const TEXT = {
  eyebrow: '\u5907\u8003\u8ffd\u8e2a',
  title: '\u4eca\u5929\u5b66\u4e86\u4ec0\u4e48\uff1f',
  refresh: '\u5237\u65b0',
  streak: '\u8fde\u7eed\u6253\u5361',
  days: '\u7d2f\u8ba1\u5b66\u4e60',
  pending: '\u5f85\u4e8c\u5237',
  dayUnit: '\u5929',
  itemUnit: '\u9053',
  quickTitle: '\u4e00\u53e5\u8bdd\u6253\u5361',
  placeholder: '\u4f8b\uff1a\u8d44\u6599\u5206\u6790\u9519 5 \u9053\uff0c\u5224\u65ad\u63a8\u7406\u9519 3 \u9053',
  save: '\u4fdd\u5b58\u8bb0\u5f55',
  accuracyTitle: '\u8fd1 7 \u65e5\u6b63\u786e\u7387',
  reviewTitle: '\u590d\u76d8\u4e0e\u4e8c\u5237',
  summary: '\u67e5\u770b\u4eca\u65e5\u603b\u7ed3',
  review: '\u5f00\u59cb\u4e8c\u5237',
  unavailable: '\u5907\u8003\u8ffd\u8e2a Skill \u672a\u968f\u5e94\u7528\u6b63\u786e\u6253\u5305\uff0c\u8bf7\u91cd\u65b0\u6784\u5efa\u3002',
  actionFailed: '\u64cd\u4f5c\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
};

function formatAccuracy(value: number | undefined) {
  if (typeof value !== 'number') return '--';
  return `${Math.round(value * 100)}%`;
}

const StudyTracker: React.FC = () => {
  const [status, setStatus] = useState<StudyTrackerStatus | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<StudyTrackerActionResult | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await window.api.studyTracker.status());
    } catch (error) {
      setResult({
        success: false,
        kind: 'error',
        message: error instanceof Error ? error.message : TEXT.actionFailed,
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = async (action: () => Promise<StudyTrackerActionResult>) => {
    setBusy(true);
    try {
      setResult(await action());
      await refresh();
    } catch (error) {
      setResult({
        success: false,
        kind: 'error',
        message: error instanceof Error ? error.message : TEXT.actionFailed,
      });
    } finally {
      setBusy(false);
    }
  };

  const record = () => {
    const value = input.trim();
    if (!value) return;
    void runAction(async () => {
      const actionResult = await window.api.studyTracker.record(value);
      if (actionResult.success) setInput('');
      return actionResult;
    });
  };

  const stats = [
    { label: TEXT.streak, value: status?.streak ?? 0, unit: TEXT.dayUnit },
    { label: TEXT.days, value: status?.total_days_studied ?? 0, unit: TEXT.dayUnit },
    { label: TEXT.pending, value: status?.pending_review_count ?? 0, unit: TEXT.itemUnit },
  ];

  return (
    <main className="h-full overflow-y-auto bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
        <header className="flex flex-col justify-between gap-5 border-b border-surface-200 pb-6 dark:border-surface-800 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-300">
              <BookOpenCheck className="h-4 w-4" />
              {TEXT.eyebrow}
            </div>
            <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-0">{TEXT.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/skill-tree"
              className="inline-flex items-center gap-2 border border-surface-200 bg-white px-3 py-2 text-sm font-medium text-surface-700 transition-colors hover:border-brand-300 hover:text-brand-700 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200"
            >
              <GitBranch className="h-4 w-4" />能力树
            </Link>
            <button
              onClick={() => void refresh()}
              className="inline-flex items-center gap-2 border border-surface-200 bg-white px-3 py-2 text-sm font-medium text-surface-700 transition-colors hover:border-brand-300 hover:text-brand-700 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200"
            >
              <RefreshCw className="h-4 w-4" />{TEXT.refresh}
            </button>
          </div>
        </header>

        {status && !status.available && (
          <section className="border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {TEXT.unavailable}
          </section>
        )}

        <section className="grid grid-cols-3 border border-surface-200 bg-white shadow-sm dark:border-surface-800 dark:bg-surface-900">
          {stats.map((stat, index) => (
            <article key={stat.label} className={`p-4 sm:p-5 ${index ? 'border-l border-surface-200 dark:border-surface-800' : ''}`}>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{stat.label}</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-surface-900 dark:text-surface-0 sm:text-3xl">
                {stat.value}<span className="ml-1 text-xs font-sans font-medium text-surface-400">{stat.unit}</span>
              </p>
            </article>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-800 dark:bg-surface-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-0">{TEXT.quickTitle}</h2>
              </div>
              <Send className="h-5 w-5 shrink-0 text-brand-500" />
            </div>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') record();
              }}
              placeholder={TEXT.placeholder}
              className="mt-5 min-h-32 w-full resize-y border border-surface-200 bg-surface-50 p-3 text-sm leading-6 text-surface-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 dark:border-surface-700 dark:bg-surface-950 dark:text-surface-100"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setInput(example)}
                  className="max-w-full truncate border border-surface-200 px-2.5 py-1.5 text-left text-xs text-surface-500 transition-colors hover:border-brand-300 hover:text-brand-700 dark:border-surface-700 dark:text-surface-400"
                >
                  {example}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                disabled={busy || !input.trim()}
                onClick={record}
                className="inline-flex items-center gap-2 bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {TEXT.save}
              </button>
            </div>
          </section>

          <section className="border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-800 dark:bg-surface-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-0">{TEXT.accuracyTitle}</h2>
              </div>
              <BarChart3 className="h-5 w-5 shrink-0 text-brand-500" />
            </div>
            <div className="mt-5 space-y-4">
              {MODULES.map((module) => {
                const accuracy = status?.module_accuracy?.[module];
                return (
                  <div key={module}>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-surface-600 dark:text-surface-300">{module}</span>
                      <span className="font-mono font-semibold tabular-nums text-surface-800 dark:text-surface-100">{formatAccuracy(accuracy)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden bg-surface-100 dark:bg-surface-800">
                      <div className="h-full bg-brand-500 transition-[width]" style={{ width: `${Math.max(0, Math.min(100, (accuracy ?? 0) * 100))}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <section className="flex flex-col justify-between gap-5 border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-800 dark:bg-surface-900 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
            <div>
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-0">{TEXT.reviewTitle}</h2>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button disabled={busy} onClick={() => void runAction(() => window.api.studyTracker.summary())} className="border border-surface-200 px-3 py-2 text-sm font-medium text-surface-700 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50 dark:border-surface-700 dark:text-surface-200">{TEXT.summary}</button>
            <button disabled={busy} onClick={() => void runAction(() => window.api.studyTracker.review())} className="bg-surface-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-surface-700 disabled:opacity-50 dark:bg-surface-100 dark:text-surface-900">{TEXT.review}</button>
          </div>
        </section>

        {result && (
          <section className={`border-l-2 p-5 ${result.success ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30' : 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30'}`}>
            <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-surface-900 dark:text-surface-0">{result.message}</p>
          </section>
        )}

      </div>
    </main>
  );
};

export default StudyTracker;
