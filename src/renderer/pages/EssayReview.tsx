import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, FileText, CheckCircle2, Image, Loader2, RotateCcw, Send, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

const api = (window as any).api;

interface ExtractedQuestion {
  id: number;
  number: string;
  content: string;
}

interface QuestionSection {
  title: string;
  questions: ExtractedQuestion[];
}

/* ─── OCR (tesseract.js, same as WrongBook) ─── */
let tesseractPromise: Promise<any> | null = null;
async function getTesseract() {
  if (!tesseractPromise) {
    tesseractPromise = import('tesseract.js');
  }
  const mod = await tesseractPromise;
  return (mod.default || mod) as typeof import('tesseract.js');
}

async function ocrImage(
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  const Tesseract = await getTesseract();
  const result = await Tesseract.recognize(file, 'chi_sim+eng', {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  return result.data.text.trim();
}

/* ─── PDF 题目解析：按页提取 ─── */
function parsePdfToSections(text: string): QuestionSection[] {
  if (!text || text.trim().length === 0) return [];

  // 按常见的中文题号模式分割（如：一、二、1. 2. 第1题 第2题 等）
  const questionPattern = /(?:^|\n)(?=[一二三四五六七八九十]+[、.．]|\d+[、.．]|第[一二三四五六七八九十\d]+[题问])/gm;
  const parts = text.split(questionPattern).map(p => p.trim()).filter(p => p.length > 0);

  // 如果分割结果只有1个或没有，说明没有明显的题号分隔，按段落分割
  if (parts.length <= 1) {
    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
    const questions: ExtractedQuestion[] = paragraphs.map((para, i) => ({
      id: i,
      number: `${i + 1}`,
      content: para,
    }));
    return [{ title: '全部题目', questions }];
  }

  const questions: ExtractedQuestion[] = parts.map((part, i) => {
    // 提取题号（如果有的话）
    const numberMatch = part.match(/^([一二三四五六七八九十]+[、.．]|\d+[、.．]|第[一二三四五六七八九十\d]+[题问])/);
    const number = numberMatch ? numberMatch[1] : `${i + 1}`;

    return {
      id: i,
      number,
      content: part,
    };
  });

  return [{ title: '全部题目', questions }];
}

/* ─── Main Component ─── */
export default function EssayReview() {
  const [step, setStep] = useState<'upload' | 'select' | 'answer' | 'result'>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sections, setSections] = useState<QuestionSection[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [selectedQuestion, setSelectedQuestion] = useState<ExtractedQuestion | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('');

  const [myAnswerFile, setMyAnswerFile] = useState<File | null>(null);
  const [myAnswerPreview, setMyAnswerPreview] = useState<string>('');
  const [myAnswerOcr, setMyAnswerOcr] = useState('');
  const [myAnswerOcrLoading, setMyAnswerOcrLoading] = useState(false);
  const [myAnswerOcrProgress, setMyAnswerOcrProgress] = useState(0);

  const [stdAnswerFile, setStdAnswerFile] = useState<File | null>(null);
  const [stdAnswerPreview, setStdAnswerPreview] = useState<string>('');
  const [stdAnswerOcr, setStdAnswerOcr] = useState('');
  const [stdAnswerOcrLoading, setStdAnswerOcrLoading] = useState(false);
  const [stdAnswerOcrProgress, setStdAnswerOcrProgress] = useState(0);

  const [reviewing, setReviewing] = useState(false);
  const [reviewContent, setReviewContent] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const myAnswerInputRef = useRef<HTMLInputElement>(null);
  const stdAnswerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubChunk = api.rag.onEssayStreamChunk?.((chunk: string) => {
      setReviewContent((prev) => prev + chunk);
    });
    const unsubEnd = api.rag.onEssayStreamEnd?.(() => {
      setReviewing(false);
    });
    return () => { unsubChunk?.(); unsubEnd?.(); };
  }, []);

  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [reviewContent]);

  const extractQuestions = async (file: File) => {
    setPdfLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const result = await api.rag.parsePdf(buffer);
      const text = result.text || '';

      if (!text) {
        setSections([]);
        setExpandedSections(new Set());
        setStep('select');
        return;
      }

      // 使用 AI 提取题目
      const aiResult = await api.rag.parsePdfAi(text);
      if (aiResult.error) {
        console.error('[AI Parse] Error:', aiResult.error);
        setSections([]);
        setExpandedSections(new Set());
        setStep('select');
        return;
      }

      const sections: QuestionSection[] = (aiResult.sections || []).map((s: any, si: number) => ({
        title: s.title || `第 ${si + 1} 部分`,
        questions: (s.questions || []).map((q: any, qi: number) => ({
          id: si * 1000 + qi,
          number: q.number || `${qi + 1}`,
          content: q.content || '',
        })),
      }));

      setSections(sections);
      setExpandedSections(new Set(sections.map(s => s.title)));
      setStep('select');
    } catch (err) {
      console.error('解析 PDF 失败:', err);
    } finally {
      setPdfLoading(false);
    }
  };

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const handleImageUpload = useCallback(
    async (file: File, type: 'myAnswer' | 'stdAnswer') => {
      const preview = URL.createObjectURL(file);
      if (type === 'myAnswer') {
        setMyAnswerFile(file);
        setMyAnswerPreview(preview);
        setMyAnswerOcrLoading(true);
        setMyAnswerOcrProgress(0);
        try {
          const text = await ocrImage(file, setMyAnswerOcrProgress);
          setMyAnswerOcr(text);
        } catch (err) {
          console.error('OCR failed:', err);
        } finally {
          setMyAnswerOcrLoading(false);
        }
      } else {
        setStdAnswerFile(file);
        setStdAnswerPreview(preview);
        setStdAnswerOcrLoading(true);
        setStdAnswerOcrProgress(0);
        try {
          const text = await ocrImage(file, setStdAnswerOcrProgress);
          setStdAnswerOcr(text);
        } catch (err) {
          console.error('OCR failed:', err);
        } finally {
          setStdAnswerOcrLoading(false);
        }
      }
    },
    []
  );

  const handleSubmitReview = async () => {
    if (!myAnswerOcr.trim() || reviewing) return;
    setReviewing(true);
    setReviewContent('');
    setStep('result');

    const combinedAnswer = stdAnswerOcr
      ? `【我的答案】\n${myAnswerOcr}\n\n【标准答案】\n${stdAnswerOcr}`
      : myAnswerOcr;

    try {
      await api.rag.essayReview({
        topic: selectedQuestion?.content || '',
        material: stdAnswerOcr ? '已提供标准答案，请对比批改' : '',
        answer: combinedAnswer,
        type: 'summary',
      });
    } catch (err) {
      console.error('批改失败:', err);
      setReviewContent('批改请求失败，请检查 AI 配置后重试');
      setReviewing(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setPdfFile(null);
    setSections([]);
    setSelectedQuestion(null);
    setMyAnswerFile(null);
    setMyAnswerPreview('');
    setMyAnswerOcr('');
    setStdAnswerFile(null);
    setStdAnswerPreview('');
    setStdAnswerOcr('');
    setReviewContent('');
  };

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);

  /* ─── Result View ─── */
  if (step === 'result') {
    return (
      <div className="flex flex-col h-full bg-surface-0 dark:bg-surface-900">
        <div className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-surface-200 dark:border-surface-700">
          <h1 className="text-base font-bold text-surface-900 dark:text-surface-0 font-display flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-500" />
            批改结果
          </h1>
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors">
            <RotateCcw className="w-4 h-4" />
            继续批改
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6" ref={resultRef}>
          <div className="max-w-3xl mx-auto space-y-4">
            {selectedQuestion && (
              <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700">
                <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-1">{selectedSection} · {selectedQuestion.number}</p>
                <p className="text-sm text-surface-700 dark:text-surface-200 whitespace-pre-wrap">{selectedQuestion.content}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">我的答案</p>
                <p className="text-xs text-blue-600 dark:text-blue-300 whitespace-pre-wrap">{myAnswerOcr}</p>
              </div>
              {stdAnswerOcr && (
                <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">标准答案</p>
                  <p className="text-xs text-amber-600 dark:text-amber-300 whitespace-pre-wrap">{stdAnswerOcr}</p>
                </div>
              )}
            </div>
            <div className="p-6 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 shadow-soft">
              {reviewing && !reviewContent && (
                <div className="flex items-center gap-2 text-sm text-surface-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> AI 正在批改中...
                </div>
              )}
              {reviewContent && (
                <div className="text-sm text-surface-700 dark:text-surface-200 whitespace-pre-wrap leading-relaxed">
                  {reviewContent}
                  {reviewing && <span className="inline-block w-1.5 h-4 bg-brand-500 animate-pulse ml-0.5 align-middle" />}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-0 dark:bg-surface-900">
      <div className="h-14 shrink-0 flex items-center px-6 border-b border-surface-200 dark:border-surface-700">
        <h1 className="text-base font-bold text-surface-900 dark:text-surface-0 font-display flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-500" />
          申论批改
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Step 1: Upload PDF */}
          {step === 'upload' && (
            <div className="text-center py-12">
              <Upload className="w-12 h-12 text-surface-400 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-surface-900 dark:text-surface-0 mb-2">上传题库 PDF</h2>
              <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">
                自动按目录提取题目，选择你做过的进行批改
              </p>
              {pdfLoading ? (
                <div className="flex items-center justify-center gap-2 text-brand-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  正在解析 PDF...
                </div>
              ) : (
                <button
                  onClick={() => pdfInputRef.current?.click()}
                  className="px-6 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium"
                >
                  选择 PDF 文件
                </button>
              )}
              <input ref={pdfInputRef} type="file" accept=".pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPdfFile(f); extractQuestions(f); } }} className="hidden" />
            </div>
          )}

          {/* Step 2: Select Question (grouped by section) */}
          {step === 'select' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-surface-900 dark:text-surface-0">选择题目</h2>
                <button onClick={handleReset} className="text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">
                  重新上传
                </button>
              </div>
              <p className="text-sm text-surface-600 dark:text-surface-400">
                <span className="font-medium text-surface-800 dark:text-surface-200">{pdfFile?.name}</span>
                {' '}· 共 {sections.length} 个部分，{totalQuestions} 道题目
              </p>

              {sections.map((section) => (
                <div key={section.title} className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden">
                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedSections.has(section.title) ? <ChevronDown className="w-4 h-4 text-surface-400" /> : <ChevronRight className="w-4 h-4 text-surface-400" />}
                      <span className="text-sm font-semibold text-surface-900 dark:text-surface-0">{section.title}</span>
                    </div>
                    <span className="text-xs text-surface-500 dark:text-surface-400">{section.questions.length} 题</span>
                  </button>

                  {/* Questions in section */}
                  {expandedSections.has(section.title) && (
                    <div className="divide-y divide-surface-100 dark:divide-surface-700">
                      {section.questions.map((q) => (
                        <div
                          key={q.id}
                          onClick={() => {
                            setSelectedQuestion(q);
                            setSelectedSection(section.title);
                            setStep('answer');
                          }}
                          className="px-4 py-3 cursor-pointer hover:bg-brand-50/50 dark:hover:bg-brand-500/5 transition-colors"
                        >
                          <p className="text-sm text-surface-800 dark:text-surface-200 whitespace-pre-wrap leading-relaxed">{q.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {sections.length === 0 && (
                <div className="text-center py-12 text-surface-500 dark:text-surface-400">
                  未能提取到题目，请检查 PDF 格式
                </div>
              )}
            </div>
          )}

          {/* Step 3: Upload Answers */}
          {step === 'answer' && selectedQuestion && (
            <div className="space-y-6">
              {/* Question preview */}
              <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                <span className="text-xs font-medium text-brand-600 dark:text-brand-400">{selectedSection} · {selectedQuestion.number}</span>
                <p className="text-sm text-surface-700 dark:text-surface-300 mt-1 whitespace-pre-wrap">{selectedQuestion.content}</p>
              </div>

              {/* My answer */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-surface-900 dark:text-surface-0">
                  我的答案 <span className="text-danger">*</span>
                </label>
                {!myAnswerFile ? (
                  <div
                    onClick={() => myAnswerInputRef.current?.click()}
                    className="border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-lg p-8 text-center cursor-pointer hover:border-brand-500 dark:hover:border-brand-500 transition-colors bg-surface-50 dark:bg-surface-800"
                  >
                    <Image className="w-10 h-10 text-surface-400 mx-auto mb-3" />
                    <p className="text-sm text-surface-600 dark:text-surface-400">点击上传手写答案截图</p>
                    <p className="text-xs text-surface-500 mt-1">支持 JPG、PNG，自动识别文字</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative inline-block">
                      <img src={myAnswerPreview} alt="我的答案" className="max-h-48 rounded-lg border border-surface-200 dark:border-surface-700" />
                      <button onClick={() => { setMyAnswerFile(null); setMyAnswerPreview(''); setMyAnswerOcr(''); }} className="absolute -top-2 -right-2 w-6 h-6 bg-danger text-white rounded-full flex items-center justify-center shadow hover:bg-red-600">
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      {myAnswerOcrLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-lg">
                          <Loader2 className="w-6 h-6 text-white animate-spin mb-1" />
                          <span className="text-xs text-white">识别中 {myAnswerOcrProgress}%</span>
                        </div>
                      )}
                    </div>
                    {myAnswerOcr && !myAnswerOcrLoading && (
                      <div className="p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg">
                        <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 识别结果（可修正）
                        </p>
                        <textarea
                          value={myAnswerOcr}
                          onChange={(e) => setMyAnswerOcr(e.target.value)}
                          className="w-full px-3 py-2 border border-green-200 dark:border-green-500/20 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-green-400 resize-none"
                          rows={Math.min(8, Math.max(3, Math.ceil(myAnswerOcr.length / 40)))}
                        />
                      </div>
                    )}
                  </div>
                )}
                <input ref={myAnswerInputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'myAnswer'); }} className="hidden" />
              </div>

              {/* Standard answer (optional) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-surface-900 dark:text-surface-0">
                  标准答案 <span className="text-xs text-surface-400 font-normal">（可选）</span>
                </label>
                {!stdAnswerFile ? (
                  <div
                    onClick={() => stdAnswerInputRef.current?.click()}
                    className="border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-lg p-6 text-center cursor-pointer hover:border-brand-500 dark:hover:border-brand-500 transition-colors bg-surface-50 dark:bg-surface-800"
                  >
                    <Image className="w-8 h-8 text-surface-400 mx-auto mb-2" />
                    <p className="text-sm text-surface-600 dark:text-surface-400">点击上传标准答案（可选）</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative inline-block">
                      <img src={stdAnswerPreview} alt="标准答案" className="max-h-48 rounded-lg border border-surface-200 dark:border-surface-700" />
                      <button onClick={() => { setStdAnswerFile(null); setStdAnswerPreview(''); setStdAnswerOcr(''); }} className="absolute -top-2 -right-2 w-6 h-6 bg-danger text-white rounded-full flex items-center justify-center shadow hover:bg-red-600">
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      {stdAnswerOcrLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-lg">
                          <Loader2 className="w-6 h-6 text-white animate-spin mb-1" />
                          <span className="text-xs text-white">识别中 {stdAnswerOcrProgress}%</span>
                        </div>
                      )}
                    </div>
                    {stdAnswerOcr && !stdAnswerOcrLoading && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 标准答案识别结果（可修正）
                        </p>
                        <textarea
                          value={stdAnswerOcr}
                          onChange={(e) => setStdAnswerOcr(e.target.value)}
                          className="w-full px-3 py-2 border border-amber-200 dark:border-amber-500/20 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-amber-400 resize-none"
                          rows={Math.min(8, Math.max(3, Math.ceil(stdAnswerOcr.length / 40)))}
                        />
                      </div>
                    )}
                  </div>
                )}
                <input ref={stdAnswerInputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, 'stdAnswer'); }} className="hidden" />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSubmitReview}
                  disabled={!myAnswerOcr.trim() || myAnswerOcrLoading || stdAnswerOcrLoading}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors',
                    myAnswerOcr.trim() && !myAnswerOcrLoading && !stdAnswerOcrLoading
                      ? 'bg-brand-500 text-white hover:bg-brand-600'
                      : 'bg-surface-200 text-surface-400 cursor-not-allowed dark:bg-surface-700 dark:text-surface-500'
                  )}
                >
                  <Send className="w-4 h-4" />
                  提交批改
                </button>
                <button
                  onClick={() => setStep('select')}
                  className="px-4 py-3 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors text-sm"
                >
                  ← 返回
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
