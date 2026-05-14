import React, { useState, useEffect, useRef } from 'react';
import { PenTool, Send, Loader2, RotateCcw, FileText } from 'lucide-react';

const api = (window as any).api;

const ESSAY_TYPES = [
  { value: 'summary', label: '概括归纳' },
  { value: 'analysis', label: '综合分析' },
  { value: 'solution', label: '提出对策' },
  { value: 'application', label: '贯彻执行' },
  { value: 'essay', label: '大作文' },
];

const EssayReview: React.FC = () => {
  const [type, setType] = useState('summary');
  const [topic, setTopic] = useState('');
  const [material, setMaterial] = useState('');
  const [answer, setAnswer] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [reviewContent, setReviewContent] = useState('');
  const [showResult, setShowResult] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubChunk = api.rag.onEssayStreamChunk?.((chunk: string) => {
      setReviewContent((prev) => prev + chunk);
    });
    const unsubEnd = api.rag.onEssayStreamEnd?.(() => {
      setStreaming(false);
    });
    return () => { unsubChunk?.(); unsubEnd?.(); };
  }, []);

  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [reviewContent]);

  const handleSubmit = async () => {
    if (!topic.trim() || !answer.trim() || streaming) return;
    setStreaming(true);
    setReviewContent('');
    setShowResult(true);
    try {
      await api.rag.essayReview({ topic, material, answer, type });
    } catch (err) {
      console.error('[EssayReview] Error:', err);
      setStreaming(false);
    }
  };

  const handleReset = () => {
    setTopic('');
    setMaterial('');
    setAnswer('');
    setReviewContent('');
    setShowResult(false);
  };

  const inputClass = 'w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 resize-none placeholder:text-surface-400';

  if (showResult) {
    return (
      <div className="flex flex-col h-full bg-surface-0">
        <div className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-surface-200">
          <h1 className="text-base font-bold text-surface-900 font-display flex items-center gap-2">
            <PenTool className="w-5 h-5 text-brand-500" />
            申论批改结果
          </h1>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-surface-500 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重新批改
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6" ref={resultRef}>
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="p-4 bg-surface-50 rounded-xl border border-surface-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-surface-400" />
                <span className="text-xs font-medium text-surface-500">
                  {ESSAY_TYPES.find((t) => t.value === type)?.label} · 题目要求
                </span>
              </div>
              <p className="text-sm text-surface-700 line-clamp-3">{topic}</p>
            </div>

            <div className="p-6 bg-white rounded-xl border border-surface-200 shadow-soft">
              {streaming && !reviewContent && (
                <div className="flex items-center gap-2 text-sm text-surface-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI 正在批改中...
                </div>
              )}
              {reviewContent && (
                <div className="text-sm text-surface-700 whitespace-pre-wrap leading-relaxed">
                  {reviewContent}
                  {streaming && <span className="inline-block w-1.5 h-4 bg-brand-500 animate-pulse ml-0.5 align-middle" />}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-0">
      <div className="h-14 shrink-0 flex items-center px-6 border-b border-surface-200">
        <h1 className="text-base font-bold text-surface-900 font-display flex items-center gap-2">
          <PenTool className="w-5 h-5 text-brand-500" />
          申论 AI 批改
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="p-4 bg-brand-50 border border-brand-200 rounded-xl">
            <p className="text-sm text-brand-700">
              输入申论题目和你的答案，AI 将从立意、内容、结构、语言等维度进行专业批改，并给出修改建议。
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-900 mb-2">题目类型</label>
            <div className="flex flex-wrap gap-2">
              {ESSAY_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm border-2 transition-colors ${
                    type === t.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                      : 'border-surface-200 text-surface-600 hover:border-surface-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-900 mb-2">
              题目要求 <span className="text-danger">*</span>
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className={inputClass}
              rows={3}
              placeholder="例如：根据给定材料，概括当前基层治理面临的主要问题。要求：全面准确，条理清晰，不超过300字。"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-900 mb-2">
              给定材料 <span className="text-surface-400 font-normal">（可选，粘贴材料摘要）</span>
            </label>
            <textarea
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className={inputClass}
              rows={5}
              placeholder="粘贴题目对应的给定材料（可只粘贴关键段落）..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-900 mb-2">
              你的答案 <span className="text-danger">*</span>
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className={inputClass}
              rows={8}
              placeholder="输入你写的申论答案..."
            />
            {answer && (
              <p className="text-xs text-surface-400 mt-1 text-right">
                已输入 {answer.length} 字
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!topic.trim() || !answer.trim() || streaming}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-brand-500 to-orange-500 text-white rounded-xl hover:from-brand-600 hover:to-orange-600 disabled:opacity-50 transition-all font-medium"
            >
              {streaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {streaming ? '批改中...' : '提交批改'}
            </button>
            <button
              onClick={handleReset}
              className="px-5 py-3 border border-surface-200 text-surface-600 rounded-xl hover:bg-surface-50 transition-colors"
            >
              清空
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EssayReview;
