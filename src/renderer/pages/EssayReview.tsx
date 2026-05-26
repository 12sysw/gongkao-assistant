import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, FileText, CheckCircle2, Image, Loader2, RotateCcw, Send } from 'lucide-react';
import { cn } from '../lib/utils';
import { useEssayReview, useEssayReviewStream } from '../hooks/use-api';

/* ─── AI OCR（多模态模型识别图片文字） ─── */
async function ocrImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const result = await window.api.ai.ocrImage(base64);
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result.text || '');
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

/* ─── 图片上传+OCR 组件 ─── */
const ImageOcrField: React.FC<{
  label: string;
  required?: boolean;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}> = ({ label, required, value, onChange, placeholder }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setOcrLoading(true);
    setOcrError('');
    try {
      const text = await ocrImage(f);
      onChange(text);
    } catch (err) {
      console.error('OCR failed:', err);
      setOcrError(err instanceof Error ? err.message : '识别失败');
    } finally {
      setOcrLoading(false);
    }
  }, [onChange]);

  const clear = () => {
    setFile(null);
    setPreview('');
    onChange('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-surface-900 dark:text-surface-0">
        {label} {required && <span className="text-danger">*</span>}
      </label>

      {!file ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-lg p-6 text-center cursor-pointer hover:border-brand-500 dark:hover:border-brand-500 transition-colors bg-surface-50 dark:bg-surface-800"
        >
          <Image className="w-8 h-8 text-surface-400 mx-auto mb-2" />
          <p className="text-sm text-surface-600 dark:text-surface-400">{placeholder || '点击上传截图，自动识别文字'}</p>
          <p className="text-xs text-surface-500 mt-1">支持拍照、截图、Ctrl+V 粘贴</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative inline-block">
            <img src={preview} alt={label} className="max-h-44 rounded-lg border border-surface-200 dark:border-surface-700" />
            <button onClick={clear} className="absolute -top-2 -right-2 w-6 h-6 bg-danger text-white rounded-full flex items-center justify-center shadow hover:bg-red-600">
              <RotateCcw className="w-3 h-3" />
            </button>
            {ocrLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-lg">
                <Loader2 className="w-5 h-5 text-white animate-spin mb-1" />
                <span className="text-xs text-white">AI 识别中...</span>
              </div>
            )}
            {ocrError && !ocrLoading && (
              <div className="mt-2 p-2 bg-danger-light dark:bg-danger/10 text-danger-dark dark:text-danger rounded-lg text-xs">
                {ocrError}
              </div>
            )}
          </div>

          {value && !ocrLoading && (
            <div className="p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 识别结果（可修正错别字）
              </p>
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2 border border-green-200 dark:border-green-500/20 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-green-400 resize-none"
                rows={Math.min(8, Math.max(3, Math.ceil(value.length / 40)))}
              />
            </div>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        className="hidden"
      />
    </div>
  );
};

/* ─── Main Component ─── */
export default function EssayReview() {
  const [topicText, setTopicText] = useState('');
  const [myAnswerText, setMyAnswerText] = useState('');
  const [stdAnswerText, setStdAnswerText] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewContent, setReviewContent] = useState('');
  const [showResult, setShowResult] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const essayReview = useEssayReview();

  useEssayReviewStream({
    onChunk: (chunk) => {
      setReviewContent((prev) => prev + chunk);
    },
    onEnd: () => {
      setReviewing(false);
    },
  });

  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [reviewContent]);

  const handleSubmit = async () => {
    if (!myAnswerText.trim() || reviewing) return;
    setReviewing(true);
    setReviewContent('');
    setShowResult(true);

    const combinedAnswer = stdAnswerText
      ? `【我的答案】\n${myAnswerText}\n\n【标准答案】\n${stdAnswerText}`
      : myAnswerText;

    try {
      await essayReview.mutateAsync({
        topic: topicText || '申论题目',
        material: stdAnswerText ? '已提供标准答案，请对比批改' : '',
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
    setTopicText('');
    setMyAnswerText('');
    setStdAnswerText('');
    setReviewContent('');
    setShowResult(false);
  };

  /* ─── Result View ─── */
  if (showResult) {
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
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">我的答案</p>
                <p className="text-xs text-blue-600 dark:text-blue-300 whitespace-pre-wrap">{myAnswerText}</p>
              </div>
              {stdAnswerText && (
                <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">标准答案</p>
                  <p className="text-xs text-amber-600 dark:text-amber-300 whitespace-pre-wrap">{stdAnswerText}</p>
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
          <Upload className="w-5 h-5 text-brand-500" />
          申论批改
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          <div className="p-4 bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20 rounded-xl">
            <p className="text-sm text-brand-700 dark:text-brand-400">
              拍照上传你想批改的题目和答案，OCR 自动识别文字。识别后可手动修正错别字，然后提交 AI 批改。
            </p>
          </div>

          <ImageOcrField
            label="题目"
            required
            value={topicText}
            onChange={setTopicText}
            placeholder="拍照上传题目截图"
          />

          <ImageOcrField
            label="我的答案"
            required
            value={myAnswerText}
            onChange={setMyAnswerText}
            placeholder="拍照上传你的手写答案"
          />

          <ImageOcrField
            label="标准答案"
            value={stdAnswerText}
            onChange={setStdAnswerText}
            placeholder="拍照上传标准答案（可选）"
          />

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!myAnswerText.trim() || !topicText.trim() || reviewing}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors',
                myAnswerText.trim() && topicText.trim()
                  ? 'bg-brand-500 text-white hover:bg-brand-600'
                  : 'bg-surface-200 text-surface-400 cursor-not-allowed dark:bg-surface-700 dark:text-surface-500'
              )}
            >
              <Send className="w-4 h-4" />
              提交批改
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-3 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors text-sm"
            >
              清空
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
