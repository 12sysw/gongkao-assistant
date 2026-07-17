import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  FileSearch,
  FileText,
  FileUp,
  Loader2,
  Plus,
  ScanText,
  Sparkles,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import {
  PAPER_QUESTION_TYPES,
  parsePaperText,
  splitDraftContent,
  validateDraft,
  type PaperQuestionDraft,
} from '../../shared/paper-import-parser';

const TEXT_THRESHOLD = 120;
const MAX_OCR_PAGES = 20;

function newDraft(index: number): PaperQuestionDraft {
  return {
    localId: `manual-${Date.now()}-${index}`,
    enabled: true,
    number: String(index + 1),
    type: '行测-常识判断',
    material: '',
    content: '',
    options: ['A. ', 'B. ', 'C. ', 'D. '],
    answer: '',
    explanation: '',
    warnings: [],
  };
}

function fileBaseName(name: string) {
  return name.replace(/\.pdf$/i, '').trim();
}

function dataUrlToBlob(dataUrl: string) {
  const [metadata, data] = dataUrl.split(',');
  const mime = metadata.match(/data:([^;]+)/)?.[1] ?? 'image/png';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

let tesseractPromise: Promise<typeof import('tesseract.js')> | null = null;
async function getTesseract() {
  if (!tesseractPromise) tesseractPromise = import('tesseract.js');
  const module = await tesseractPromise;
  return ('default' in module ? module.default : module) as typeof import('tesseract.js');
}

const PaperImportWorkbench: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [paperTitle, setPaperTitle] = useState('');
  const [category, setCategory] = useState('国考行测');
  const [rawText, setRawText] = useState('');
  const [drafts, setDrafts] = useState<PaperQuestionDraft[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [parseMode, setParseMode] = useState<'text' | 'ocr' | 'manual'>('manual');
  const [busy, setBusy] = useState<'extract' | 'ocr' | 'ai' | 'commit' | null>(null);
  const [progress, setProgress] = useState('');

  const selectedDrafts = drafts.filter((draft) => draft.enabled);
  const issueCount = useMemo(
    () => selectedDrafts.reduce((sum, draft) => sum + validateDraft(draft).length, 0),
    [selectedDrafts]
  );

  const patchDraft = (localId: string, patch: Partial<PaperQuestionDraft>) => {
    setDrafts((current) => current.map((draft) => draft.localId === localId ? { ...draft, ...patch } : draft));
  };

  const parseAndSetDrafts = (text: string, mode: 'text' | 'ocr' | 'manual') => {
    const parsed = parsePaperText(text);
    setRawText(text);
    setParseMode(mode);
    setDrafts(parsed);
    setExpandedId(parsed[0]?.localId ?? null);
    if (parsed.length === 0) toast.error('未能自动识别题目，请检查原始文本或手动新增题目');
    else toast.success(`已生成 ${parsed.length} 道可编辑题目`);
  };

  const runOcr = async (buffer: ArrayBuffer) => {
    setBusy('ocr');
    setProgress('正在把扫描 PDF 转为图片…');
    const rendered = await window.api.rag.renderPdf(buffer, MAX_OCR_PAGES);
    if (rendered.error) throw new Error(rendered.error);
    if (rendered.pages.length === 0) throw new Error('PDF 页面渲染失败');

    const Tesseract = await getTesseract();
    const texts: string[] = [];
    for (let index = 0; index < rendered.pages.length; index += 1) {
      const page = rendered.pages[index];
      setProgress(`OCR 识别第 ${index + 1}/${rendered.pages.length} 页（最多 ${MAX_OCR_PAGES} 页）`);
      const result = await Tesseract.recognize(dataUrlToBlob(page.data_url), 'chi_sim+eng');
      texts.push(result.data.text.trim());
    }
    const text = texts.filter(Boolean).join('\n\n');
    if (!text.trim()) throw new Error('OCR 未识别到文字');
    parseAndSetDrafts(text, 'ocr');
  };

  const handleFile = async (selected: File) => {
    if (!/\.pdf$/i.test(selected.name)) {
      toast.error('请选择 PDF 文件');
      return;
    }
    setFile(selected);
    setPaperTitle(fileBaseName(selected.name));
    setBusy('extract');
    setProgress('正在优先提取 PDF 文本层…');
    try {
      const buffer = await selected.arrayBuffer();
      const result = await window.api.rag.parsePdf(buffer.slice(0));
      if (result.error) throw new Error(result.error);
      const compactLength = result.text.replace(/\s+/g, '').length;
      if (compactLength >= TEXT_THRESHOLD) {
        parseAndSetDrafts(result.text, 'text');
      } else {
        await runOcr(buffer.slice(0));
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'PDF 解析失败');
    } finally {
      setBusy(null);
      setProgress('');
    }
  };

  const handleAiStructure = async () => {
    if (!rawText.trim()) return;
    setBusy('ai');
    setProgress('AI 正在识别章节和题号…');
    try {
      const result = await window.api.rag.parsePdfAi(rawText);
      if (result.error) throw new Error(result.error);
      const normalized = result.sections.flatMap((section) => section.questions.map((question) => ({
        ...newDraft(drafts.length),
        localId: `ai-${Date.now()}-${section.title}-${question.number}`,
        number: question.number.replace(/\D/g, '') || question.number,
        type: parsePaperText(`${question.number} ${section.title}\n${question.content}`)[0]?.type ?? '行测-常识判断',
        content: question.content,
        options: [],
        warnings: ['AI 已分段，请继续校对选项和答案'],
      })));
      if (normalized.length === 0) throw new Error('AI 未返回可用题目');
      setDrafts(normalized);
      setExpandedId(normalized[0].localId);
      toast.success(`AI 已整理 ${normalized.length} 道题，请继续校对`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI 结构化失败');
    } finally {
      setBusy(null);
      setProgress('');
    }
  };

  const commit = async () => {
    const enabled = drafts.filter((draft) => draft.enabled);
    if (!paperTitle.trim()) {
      toast.error('请填写试卷名称');
      return;
    }
    if (enabled.length === 0) {
      toast.error('至少保留一道题目');
      return;
    }
    if (issueCount > 0 && !window.confirm(`当前仍有 ${issueCount} 项校验问题，确定按当前内容导入吗？`)) return;

    setBusy('commit');
    setProgress(`正在写入 0/${enabled.length} 道题…`);
    let imported = 0;
    try {
      for (let index = 0; index < enabled.length; index += 1) {
        const draft = enabled[index];
        const answer = draft.answer.trim().toUpperCase() || (draft.options[0]?.[0] ?? 'A');
        const missingAnswer = !draft.answer.trim() && draft.type !== '申论';
        await window.api.question.add({
          type: draft.type,
          content: splitDraftContent(draft),
          options: draft.options.length > 0 ? JSON.stringify(draft.options) : null,
          answer,
          explanation: [
            draft.explanation.trim(),
            missingAnswer ? `未识别到答案，已默认使用 ${answer}，请在题库中继续校对。` : '',
            `导入方式：${parseMode === 'ocr' ? '扫描件 OCR' : parseMode === 'text' ? 'PDF 文本层' : '人工录入'}`,
          ].filter(Boolean).join('\n'),
          tags: ['pdf_import', 'workbench_import', category.trim(), paperTitle.trim()].filter(Boolean).join(','),
        });
        imported += 1;
        setProgress(`正在写入 ${imported}/${enabled.length} 道题…`);
      }
      toast.success(`已导入 ${imported} 道题，真题入口和模考可直接读取`);
      navigate('/real-papers');
    } catch (error) {
      toast.error(`已导入 ${imported} 道，随后失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(null);
      setProgress('');
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-5 pb-12 lg:p-8">
      <header className="rounded-3xl border border-surface-200 bg-white p-6 dark:border-surface-800 dark:bg-surface-900 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
              <FileSearch className="h-3.5 w-3.5" />
              第一阶段 · 真题导入工作台
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-surface-950 dark:text-white">PDF → 解析 → 校对 → 题库 / 模考</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-surface-500 dark:text-surface-400">
              文本型 PDF 优先提取文字；文本层过少时自动渲染页面并使用本地 Tesseract OCR。所有题目必须经过可编辑预览后才会写入题库。
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={Boolean(busy)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-surface-800 disabled:opacity-50 dark:bg-white dark:text-surface-950"
          >
            <FileUp className="h-4 w-4" />
            选择 PDF 真题
          </button>
          <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) void handleFile(selected);
            event.target.value = '';
          }} />
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr_0.8fr]">
        <label className="space-y-2 rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
          <span className="text-xs font-semibold text-surface-500">试卷名称</span>
          <input value={paperTitle} onChange={(event) => setPaperTitle(event.target.value)} placeholder="例如：2025 国考行政执法卷" className="w-full rounded-lg border border-surface-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-surface-700" />
        </label>
        <label className="space-y-2 rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
          <span className="text-xs font-semibold text-surface-500">分类 / 考试类型</span>
          <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="国考行测 / 省考申论" className="w-full rounded-lg border border-surface-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-surface-700" />
        </label>
        <div className="rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
          <p className="text-xs font-semibold text-surface-500">当前来源</p>
          <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white">
            {parseMode === 'ocr' ? <ScanText className="h-4 w-4 text-violet-500" /> : <FileText className="h-4 w-4 text-blue-500" />}
            {file?.name ?? '尚未选择文件'}
          </div>
          <p className="mt-1 text-xs text-surface-500">{parseMode === 'ocr' ? '扫描件 OCR' : parseMode === 'text' ? 'PDF 文本层' : '等待导入'}</p>
        </div>
      </section>

      {busy && (
        <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800 dark:border-brand-900/60 dark:bg-brand-950/30 dark:text-brand-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          {progress}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-500">Raw text</p>
                <h2 className="mt-1 text-lg font-bold text-surface-950 dark:text-white">原始文本校验</h2>
              </div>
              <button disabled={!rawText || Boolean(busy)} onClick={() => parseAndSetDrafts(rawText, parseMode)} className="rounded-lg border border-surface-200 px-3 py-2 text-xs font-semibold disabled:opacity-40 dark:border-surface-700">
                重新规则解析
              </button>
            </div>
            <textarea value={rawText} onChange={(event) => setRawText(event.target.value)} placeholder="选择 PDF 后会显示提取文本，也可在此粘贴 OCR 文本…" className="mt-4 min-h-[360px] w-full resize-y rounded-xl border border-surface-200 bg-surface-50 p-3 text-xs leading-6 outline-none focus:border-brand-500 dark:border-surface-700 dark:bg-surface-950" />
            <button disabled={!rawText || Boolean(busy)} onClick={() => void handleAiStructure()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 disabled:opacity-40 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300">
              <WandSparkles className="h-4 w-4" />
              AI 辅助识别章节（可选）
            </button>
            <p className="mt-2 text-[11px] leading-5 text-surface-500">AI 功能需要在设置中配置模型；规则解析与本地 OCR 不依赖 AI API。</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300">Editable preview</p>
              <h2 className="mt-1 text-2xl font-bold text-surface-950 dark:text-white">标准试卷预览</h2>
              <p className="mt-1 text-sm text-surface-500">已选 {selectedDrafts.length} 题 · 校验问题 {issueCount} 项</p>
            </div>
            <button onClick={() => {
              const draft = newDraft(drafts.length);
              setDrafts((current) => [...current, draft]);
              setExpandedId(draft.localId);
            }} className="inline-flex items-center gap-2 rounded-lg border border-surface-200 px-3 py-2 text-sm font-semibold dark:border-surface-700">
              <Plus className="h-4 w-4" /> 手动新增
            </button>
          </div>

          {drafts.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-surface-300 bg-white text-center dark:border-surface-700 dark:bg-surface-900">
              <FileCheck2 className="h-12 w-12 text-surface-300" />
              <h3 className="mt-4 font-semibold text-surface-900 dark:text-white">等待 PDF 真题</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-surface-500">选择文件后，识别结果会在这里按题号展开校对。</p>
            </div>
          ) : drafts.map((draft, index) => {
            const validation = validateDraft(draft);
            const expanded = expandedId === draft.localId;
            return (
              <article key={draft.localId} className={cn('overflow-hidden rounded-2xl border bg-white dark:bg-surface-900', validation.length > 0 ? 'border-amber-300 dark:border-amber-900' : 'border-surface-200 dark:border-surface-800', !draft.enabled && 'opacity-55')}>
                <div className="flex items-center gap-3 p-4">
                  <input type="checkbox" checked={draft.enabled} onChange={(event) => patchDraft(draft.localId, { enabled: event.target.checked })} className="h-4 w-4 rounded" />
                  <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setExpandedId(expanded ? null : draft.localId)}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-950 text-sm font-bold text-white dark:bg-white dark:text-surface-950">{draft.number || index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-surface-950 dark:text-white">{draft.content || '未填写题干'}</span>
                      <span className="mt-1 flex items-center gap-2 text-xs text-surface-500"><span>{draft.type}</span><span>·</span><span>{draft.options.length} 个选项</span></span>
                    </span>
                    {validation.length > 0 ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">{validation.length} 项待校对</span> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <button onClick={() => setDrafts((current) => current.filter((item) => item.localId !== draft.localId))} className="rounded-lg p-2 text-surface-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"><Trash2 className="h-4 w-4" /></button>
                </div>

                {expanded && (
                  <div className="space-y-4 border-t border-surface-100 bg-surface-50/60 p-4 dark:border-surface-800 dark:bg-surface-950/30">
                    {validation.length > 0 && <div className="flex flex-wrap gap-2">{validation.map((warning) => <span key={warning} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><AlertCircle className="h-3 w-3" />{warning}</span>)}</div>}
                    <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                      <label className="space-y-1"><span className="text-xs text-surface-500">题号</span><input value={draft.number} onChange={(event) => patchDraft(draft.localId, { number: event.target.value })} className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-900" /></label>
                      <label className="space-y-1"><span className="text-xs text-surface-500">题型</span><select value={draft.type} onChange={(event) => patchDraft(draft.localId, { type: event.target.value as PaperQuestionDraft['type'] })} className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-900">{PAPER_QUESTION_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
                    </div>
                    <label className="block space-y-1"><span className="text-xs text-surface-500">共用材料（资料分析 / 申论）</span><textarea value={draft.material} onChange={(event) => patchDraft(draft.localId, { material: event.target.value })} className="min-h-20 w-full rounded-lg border border-surface-200 bg-white p-3 text-sm leading-6 dark:border-surface-700 dark:bg-surface-900" /></label>
                    <label className="block space-y-1"><span className="text-xs text-surface-500">题干</span><textarea value={draft.content} onChange={(event) => patchDraft(draft.localId, { content: event.target.value })} className="min-h-28 w-full rounded-lg border border-surface-200 bg-white p-3 text-sm leading-6 dark:border-surface-700 dark:bg-surface-900" /></label>
                    <div className="grid gap-2 sm:grid-cols-2">{Array.from({ length: Math.max(4, draft.options.length) }, (_, optionIndex) => {
                      const label = String.fromCharCode(65 + optionIndex);
                      const current = draft.options[optionIndex] ?? `${label}. `;
                      return <input key={label} value={current} onChange={(event) => { const next = [...draft.options]; next[optionIndex] = event.target.value; patchDraft(draft.localId, { options: next }); }} placeholder={`${label}. 选项`} className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-900" />;
                    })}</div>
                    <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                      <label className="space-y-1"><span className="text-xs text-surface-500">答案</span><select value={draft.answer} onChange={(event) => patchDraft(draft.localId, { answer: event.target.value })} className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-900"><option value="">未识别</option>{['A','B','C','D'].map((answer) => <option key={answer}>{answer}</option>)}</select></label>
                      <label className="space-y-1"><span className="text-xs text-surface-500">解析</span><textarea value={draft.explanation} onChange={(event) => patchDraft(draft.localId, { explanation: event.target.value })} className="min-h-20 w-full rounded-lg border border-surface-200 bg-white p-3 text-sm dark:border-surface-700 dark:bg-surface-900" /></label>
                    </div>
                  </div>
                )}
              </article>
            );
          })}

          {drafts.length > 0 && (
            <div className="sticky bottom-4 flex flex-col gap-3 rounded-2xl border border-surface-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-surface-700 dark:bg-surface-900/95 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm"><span className="font-bold text-surface-950 dark:text-white">导入 {selectedDrafts.length} 道题</span><span className="ml-2 text-surface-500">{issueCount > 0 ? `${issueCount} 项问题需确认` : '校验通过'}</span></div>
              <button onClick={() => void commit()} disabled={Boolean(busy) || selectedDrafts.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40">
                <Check className="h-4 w-4" />确认导入题库<ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default PaperImportWorkbench;
