import React, { useMemo, useState } from 'react';
import {
  Clock3,
  FileDown,
  FileImage,
  Grid3X3,
  Info,
  Minus,
  Plus,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import type { EssayPaperQuestionInput } from '../../shared/ipc';

interface EditableQuestion extends EssayPaperQuestionInput {
  id: string;
}

const DEFAULT_QUESTIONS: EditableQuestion[] = [
  { id: 'q-1', title: '第一题：归纳概括题', word_count: 300, suggested_minutes: 20 },
  { id: 'q-2', title: '第二题：综合分析题', word_count: 400, suggested_minutes: 30 },
  { id: 'q-3', title: '第三题：公文写作题', word_count: 500, suggested_minutes: 40 },
  { id: 'q-4', title: '第四题：大作文', word_count: 1000, suggested_minutes: 70 },
];

function clampWordCount(value: number) {
  return Math.max(100, Math.min(3000, Math.round(value / 20) * 20));
}

const AnswerGrid: React.FC<{ count: number; compact?: boolean }> = ({ count, compact = false }) => {
  const previewCount = Math.min(count, compact ? 200 : 400);
  return (
    <div className="grid border-l border-t border-surface-400 bg-white" style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }}>
      {Array.from({ length: previewCount }, (_, index) => (
        <span key={index} className="relative aspect-square min-h-3 border-b border-r border-surface-400">
          {(index + 1) % 100 === 0 && <small className="absolute bottom-0 right-px text-[5px] leading-none text-surface-400">{index + 1}</small>}
        </span>
      ))}
    </div>
  );
};

const EssayPractice: React.FC = () => {
  const [title, setTitle] = useState('申论纸笔训练答题纸');
  const [candidateInfo, setCandidateInfo] = useState(true);
  const [questions, setQuestions] = useState<EditableQuestion[]>(DEFAULT_QUESTIONS);
  const [exporting, setExporting] = useState<'pdf' | 'png' | null>(null);

  const totalWords = useMemo(() => questions.reduce((sum, question) => sum + question.word_count, 0), [questions]);
  const totalMinutes = useMemo(() => questions.reduce((sum, question) => sum + question.suggested_minutes, 0), [questions]);

  const patchQuestion = (id: string, patch: Partial<EditableQuestion>) => {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, ...patch } : question));
  };

  const addQuestion = () => {
    setQuestions((current) => [...current, {
      id: `q-${Date.now()}`,
      title: `第 ${current.length + 1} 题`,
      word_count: 400,
      suggested_minutes: 30,
    }]);
  };

  const exportPaper = async (format: 'pdf' | 'png') => {
    if (!title.trim()) {
      toast.error('请填写答题纸标题');
      return;
    }
    if (questions.length === 0) {
      toast.error('至少保留一道题');
      return;
    }
    setExporting(format);
    try {
      const result = await window.api.data.exportEssayPaper({
        title: title.trim(),
        candidate_info: candidateInfo,
        format,
        questions: questions.map(({ title: questionTitle, word_count, suggested_minutes }) => ({
          title: questionTitle,
          word_count: clampWordCount(word_count),
          suggested_minutes: Math.max(1, Math.round(suggested_minutes)),
        })),
      });
      if (result.success) toast.success(`答题纸已保存：${result.path}`);
      else if (result.error) toast.error(result.error);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出失败');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-5 pb-12 lg:p-8">
      <header className="overflow-hidden rounded-3xl bg-surface-950 p-6 text-white lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-surface-300">
              <Grid3X3 className="h-3.5 w-3.5" />
              第二阶段 · 申论纸笔训练
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">按题数、字数与建议用时生成标准答题纸</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-surface-300">
              每 100 格显示一次字数定位；PDF 适合打印，PNG 适合平板手写或分享。导出内容只包含答题格，不生成或代写申论答案。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
            <div className="rounded-xl bg-white/5 px-4 py-3"><p className="text-xl font-bold">{questions.length}</p><p className="text-[11px] text-surface-400">题目</p></div>
            <div className="rounded-xl bg-white/5 px-4 py-3"><p className="text-xl font-bold">{totalWords}</p><p className="text-[11px] text-surface-400">总格数</p></div>
            <div className="col-span-2 rounded-xl bg-white/5 px-4 py-3 sm:col-span-1"><p className="text-xl font-bold">{totalMinutes}</p><p className="text-[11px] text-surface-400">建议分钟</p></div>
          </div>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-surface-950 dark:text-white">答题纸设置</h2>
              <button onClick={() => setQuestions(DEFAULT_QUESTIONS)} className="inline-flex items-center gap-1 text-xs font-semibold text-surface-500 hover:text-surface-900 dark:hover:text-white"><RotateCcw className="h-3.5 w-3.5" />恢复模板</button>
            </div>
            <label className="mt-4 block space-y-2"><span className="text-xs font-semibold text-surface-500">标题</span><input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-surface-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-surface-700" /></label>
            <label className="mt-4 flex items-center justify-between rounded-xl bg-surface-50 p-3 text-sm dark:bg-surface-800/70"><span><b className="block text-surface-900 dark:text-white">考生信息栏</b><small className="text-surface-500">姓名、准考证号、考场、座位号</small></span><input type="checkbox" checked={candidateInfo} onChange={(event) => setCandidateInfo(event.target.checked)} className="h-5 w-5" /></label>
          </div>

          <div className="space-y-3">
            {questions.map((question, index) => (
              <div key={question.id} className="rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-950 text-sm font-bold text-white dark:bg-white dark:text-surface-950">{index + 1}</span>
                  <button disabled={questions.length <= 1} onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))} className="rounded-lg p-2 text-surface-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 dark:hover:bg-rose-950/30"><Minus className="h-4 w-4" /></button>
                </div>
                <input value={question.title} onChange={(event) => patchQuestion(question.id, { title: event.target.value })} className="mt-3 w-full rounded-lg border border-surface-200 bg-transparent px-3 py-2 text-sm font-semibold dark:border-surface-700" />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="space-y-1"><span className="text-[11px] text-surface-500">字数 / 格数</span><input type="number" min={100} max={3000} step={20} value={question.word_count} onChange={(event) => patchQuestion(question.id, { word_count: clampWordCount(Number(event.target.value)) })} className="w-full rounded-lg border border-surface-200 bg-transparent px-3 py-2 text-sm dark:border-surface-700" /></label>
                  <label className="space-y-1"><span className="text-[11px] text-surface-500">建议用时（分钟）</span><input type="number" min={1} max={180} value={question.suggested_minutes} onChange={(event) => patchQuestion(question.id, { suggested_minutes: Math.max(1, Number(event.target.value)) })} className="w-full rounded-lg border border-surface-200 bg-transparent px-3 py-2 text-sm dark:border-surface-700" /></label>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addQuestion} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-surface-300 px-4 py-3 text-sm font-semibold text-surface-600 hover:border-brand-400 hover:text-brand-600 dark:border-surface-700 dark:text-surface-300"><Plus className="h-4 w-4" />添加题目</button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300">Print preview</p><h2 className="mt-1 text-2xl font-bold text-surface-950 dark:text-white">A4 预览</h2></div>
            <div className="flex gap-2">
              <button disabled={Boolean(exporting)} onClick={() => void exportPaper('png')} className="inline-flex items-center gap-2 rounded-lg border border-surface-200 px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:border-surface-700"><FileImage className="h-4 w-4" />{exporting === 'png' ? '生成中…' : '导出 PNG'}</button>
              <button disabled={Boolean(exporting)} onClick={() => void exportPaper('pdf')} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><FileDown className="h-4 w-4" />{exporting === 'pdf' ? '生成中…' : '导出 PDF'}</button>
            </div>
          </div>

          <div className="overflow-auto rounded-2xl border border-surface-200 bg-surface-200 p-4 dark:border-surface-800 dark:bg-surface-950">
            <div className="mx-auto aspect-[210/297] w-full max-w-[780px] overflow-hidden bg-white p-[5%] text-surface-950 shadow-xl">
              <div className="flex items-end justify-between border-b-2 border-surface-950 pb-3"><div><h3 className="text-base font-bold sm:text-xl">{title || '申论答题纸'}</h3><p className="mt-1 text-[7px] text-surface-500 sm:text-[10px]">纸笔训练 · 共 {questions.length} 题 · 建议 {totalMinutes} 分钟</p></div><Printer className="h-5 w-5" /></div>
              {candidateInfo && <div className="mt-3 border border-surface-900 p-2 text-[7px] sm:text-[10px]">姓名：____________　准考证号：____________________　考场：______　座位号：______</div>}
              <div className="mt-4 space-y-4">
                {questions.slice(0, 2).map((question, index) => (
                  <div key={question.id}><div className="mb-2 flex items-center justify-between text-[7px] font-semibold sm:text-[10px]"><span>{index + 1}. {question.title}</span><span className="inline-flex items-center gap-1 text-surface-500"><Clock3 className="h-2.5 w-2.5" />{question.suggested_minutes} 分钟 · {question.word_count} 格</span></div><AnswerGrid count={question.word_count} compact /></div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-6 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300"><Info className="mt-0.5 h-4 w-4 shrink-0" /><p>屏幕预览为缩略图；导出的 PDF/PNG 会按每道题的完整格数生成独立 A4 页面。大作文只提供答题空间，不生成范文。</p></div>
        </div>
      </section>
    </div>
  );
};

export default EssayPractice;
