import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  X,
  ImageIcon,
  Loader2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

const QUESTION_TYPES = [
  '行测-言语理解',
  '行测-数量关系',
  '行测-判断推理',
  '行测-资料分析',
  '行测-常识判断',
  '申论',
];

interface WrongRecordWithQuestion {
  id: number;
  question_id: number;
  my_answer: string;
  wrong_count: number;
  last_wrong_at: string;
  mastered: number;
  review_count: number;
  next_review_at: string;
  note: string;
  created_at: string;
  type: string;
  content: string;
  options: string | null;
  answer: string;
  explanation: string;
  tags: string;
}

interface QuestionForm {
  type: string;
  content: string;
  options: string;
  answer: string;
  explanation: string;
  tags: string;
  my_answer: string;
  note: string;
}

interface TypeCount {
  total: number;
  mastered: number;
}

const DEFAULT_FORM: QuestionForm = {
  type: '行测-言语理解',
  content: '',
  options: '',
  answer: '',
  explanation: '',
  tags: '',
  my_answer: '',
  note: '',
};

function getApi() {
  return (window as unknown as Window & { api: Record<string, unknown> }).api;
}

function parseOptions(options: string | null): string[] {
  if (!options) return [];
  try {
    const parsed = JSON.parse(options);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fallback: split by newline
  }
  return options.split('\n').filter((s) => s.trim());
}

/* ─── OCR helpers ─── */

function parseOcrText(text: string): { content: string; options: string } {
  const lines = text.split('\n').filter((line) => line.trim());
  const optionPattern = /^[A-Fa-f][.、．]/;
  const options: string[] = [];
  const contentLines: string[] = [];

  let foundOptions = false;
  for (const line of lines) {
    if (optionPattern.test(line.trim())) {
      foundOptions = true;
      const cleaned = line.trim().replace(/^([A-Fa-f])[.、．]/, '$1.');
      options.push(cleaned);
    } else if (!foundOptions) {
      contentLines.push(line.trim());
    }
  }

  return {
    content: contentLines.join('\n'),
    options: options.join('\n'),
  };
}

let tesseractModulePromise: Promise<typeof import('tesseract.js')> | null = null;

async function getTesseract() {
  if (!tesseractModulePromise) {
    tesseractModulePromise = import('tesseract.js');
  }

  const module = await tesseractModulePromise;
  return ('default' in module ? module.default : module) as typeof import('tesseract.js');
}

async function recognizeQuestionImage(
  file: File,
  onProgress: (progress: number, status: string) => void
) {
  const Tesseract = await getTesseract();
  const result = await Tesseract.recognize(file, 'chi_sim+eng', {
    logger: (message: { status: string; progress: number }) => {
      onProgress(Math.round(message.progress * 100), message.status);
    },
  });

  return result.data.text.trim();
}

/* ─── Sub-components ─── */

const PageHeader: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold text-surface-900 font-display tracking-tight">错题本</h1>
      <p className="text-sm text-surface-400 mt-1">记录错题，反复复习，查漏补缺</p>
    </div>
    <Button onClick={onAdd}>
      <Plus className="w-4 h-4" />
      添加错题
    </Button>
  </div>
);

const TypeStats: React.FC<{
  filterType: string;
  typeCounts: Record<string, TypeCount>;
  onToggle: (type: string) => void;
}> = ({ filterType, typeCounts, onToggle }) => (
  <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
    {QUESTION_TYPES.map((type) => {
      const c = typeCounts[type] || { total: 0, mastered: 0 };
      const isActive = filterType === type;
      const masteryPct = c.total > 0 ? Math.round((c.mastered / c.total) * 100) : 0;

      return (
        <div
          key={type}
          onClick={() => onToggle(type)}
          className={`cursor-pointer rounded-2xl p-4 border-2 transition-all duration-300 ${
            isActive
              ? 'border-brand-500 bg-brand-50'
              : 'border-surface-200 bg-white hover:border-surface-300'
          }`}
        >
          <p className="text-xs text-surface-400 font-medium mb-1.5">{type.split('-')[1]}</p>
          <p className="text-xl font-bold text-surface-900 font-display">{c.total}</p>
          <div className="mt-2 h-1.5 w-full bg-surface-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                masteryPct >= 80
                  ? 'bg-success'
                  : masteryPct >= 50
                  ? 'bg-warning'
                  : 'bg-danger'
              }`}
              style={{ width: `${masteryPct}%` }}
            />
          </div>
        </div>
      );
    })}
  </div>
);

const SearchBar: React.FC<{
  value: string;
  onChange: (v: string) => void;
}> = ({ value, onChange }) => (
  <div className="relative flex-1">
    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-surface-400" />
    <input
      type="text"
      placeholder="搜索题目内容或标签..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-11 pr-4 py-2.5 border-2 border-surface-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all duration-200 placeholder:text-surface-400"
    />
  </div>
);

const MasterFilter: React.FC<{
  filterMastered: number | undefined;
  onChange: (v: number | undefined) => void;
}> = ({ filterMastered, onChange }) => (
  <div className="flex rounded-xl overflow-hidden border-2 border-surface-200">
    <button
      onClick={() => onChange(0)}
      className={`px-3 py-2.5 text-xs font-medium transition-all duration-200 ${
        filterMastered === 0
          ? 'bg-brand-500 text-white shadow-md'
          : 'bg-white text-surface-500 hover:bg-surface-50'
      }`}
    >
      未掌握
    </button>
    <button
      onClick={() => onChange(1)}
      className={`px-3 py-2.5 text-xs font-medium border-l border-surface-200 transition-all duration-200 ${
        filterMastered === 1
          ? 'bg-brand-500 text-white shadow-md'
          : 'bg-white text-surface-500 hover:bg-surface-50'
      }`}
    >
      已掌握
    </button>
    <button
      onClick={() => onChange(undefined)}
      className={`px-3 py-2.5 text-xs font-medium border-l border-surface-200 transition-all duration-200 ${
        filterMastered === undefined
          ? 'bg-brand-500 text-white shadow-md'
          : 'bg-white text-surface-500 hover:bg-surface-50'
      }`}
    >
      全部
    </button>
  </div>
);

const OptionDisplay: React.FC<{
  options: string[];
  answer: string;
  myAnswer: string;
}> = ({ options, answer, myAnswer }) => (
  <div className="space-y-1.5">
    {options.map((opt, i) => (
      <div
        key={i}
        className={`text-sm px-3.5 py-2 rounded-xl ${
          opt.startsWith(answer)
            ? 'bg-success-light text-success-dark font-semibold'
            : opt.startsWith(myAnswer)
            ? 'bg-danger-light text-danger-dark line-through opacity-60'
            : 'bg-surface-50 text-surface-600'
        }`}
      >
        {opt}
      </div>
    ))}
  </div>
);

const AnswerComparison: React.FC<{
  myAnswer: string;
  correctAnswer: string;
}> = ({ myAnswer, correctAnswer }) => (
  <div className="grid grid-cols-2 gap-4 text-sm">
    <div>
      <span className="text-surface-400">我的答案：</span>
      <span className="text-danger font-bold ml-1">{myAnswer}</span>
    </div>
    <div>
      <span className="text-surface-400">正确答案：</span>
      <span className="text-success font-bold ml-1">{correctAnswer}</span>
    </div>
  </div>
);

const InfoBox: React.FC<{
  label: string;
  content: string;
  bgClass: string;
  textClass: string;
}> = ({ label, content, bgClass, textClass }) => {
  if (!content) return null;
  return (
    <div className={`${bgClass} rounded-xl p-4 ${textClass}`}>
      <span className="font-bold text-xs uppercase tracking-wide">{label}：</span>
      <span className="block text-sm mt-1">{content}</span>
    </div>
  );
};

const RecordActions: React.FC<{
  record: WrongRecordWithQuestion;
  onMastered: (id: number) => void;
  onReview: (id: number) => void;
  onDelete: (id: number) => void;
}> = ({ record, onMastered, onReview, onDelete }) => (
  <div className="flex items-center gap-2 pt-2">
    {!record.mastered && (
      <>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMastered(record.id);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-success text-white rounded-xl text-xs font-semibold hover:bg-success-dark active:scale-[0.96] transition-all duration-200"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          标记掌握
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReview(record.id);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-500 text-white rounded-xl text-xs font-semibold hover:bg-brand-600 active:scale-[0.96] transition-all duration-200"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          已复习
        </button>
      </>
    )}
    <button
      onClick={(e) => {
        e.stopPropagation();
        onDelete(record.id);
      }}
      className="flex items-center gap-1.5 px-3.5 py-2 bg-danger-light text-danger rounded-xl text-xs font-semibold hover:bg-danger-light/80 active:scale-[0.96] transition-all duration-200 ml-auto"
    >
      <Trash2 className="w-3.5 h-3.5" />
      删除
    </button>
  </div>
);

const RecordItem: React.FC<{
  record: WrongRecordWithQuestion;
  isExpanded: boolean;
  onToggle: () => void;
  onMastered: (id: number) => void;
  onReview: (id: number) => void;
  onDelete: (id: number) => void;
}> = ({ record, isExpanded, onToggle, onMastered, onReview, onDelete }) => {
  const opts = useMemo(() => parseOptions(record.options), [record.options]);

  return (
    <div
      className={`surface transition-all duration-300 ${
        record.mastered
          ? 'border-success-light bg-success-light/10'
          : 'border-surface-200'
      }`}
    >
      <div
        className="flex items-start p-4 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-surface-50 text-surface-500">
              {record.type}
            </span>
            {record.mastered && (
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-success-light text-success-dark flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                已掌握
              </span>
            )}
            <span className="text-xs text-surface-400 font-medium">
              错 {record.wrong_count} 次
            </span>
          </div>
          <p className="text-sm text-surface-900 line-clamp-2 font-medium">{record.content}</p>
        </div>
        <div className="flex items-center gap-1 ml-3">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-surface-400 transition-transform duration-200" />
          ) : (
            <ChevronDown className="w-4 h-4 text-surface-400 transition-transform duration-200" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-surface-100 pt-3 space-y-3">
          {opts.length > 0 && (
            <OptionDisplay options={opts} answer={record.answer} myAnswer={record.my_answer} />
          )}
          <AnswerComparison myAnswer={record.my_answer} correctAnswer={record.answer} />
          <InfoBox label="解析" content={record.explanation} bgClass="bg-brand-50" textClass="text-brand-700" />
          <InfoBox label="笔记" content={record.note} bgClass="bg-warning-light" textClass="text-warning-dark" />
          <RecordActions
            record={record}
            onMastered={onMastered}
            onReview={onReview}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div className="text-center py-16">
    <div className="w-20 h-20 bg-surface-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
      <BookXIcon className="w-10 h-10 text-surface-400" />
    </div>
    <p className="text-base font-semibold text-surface-900 mb-1.5">暂无错题记录</p>
    <p className="text-sm text-surface-400">点击右上角添加你的第一道错题吧！</p>
  </div>
);

const BookXIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    <path d="m14.5 7-5 5" />
    <path d="m9.5 7 5 5" />
  </svg>
);

const OcrUpload: React.FC<{
  fileInputRef: React.RefObject<HTMLInputElement>;
  ocrLoading: boolean;
  ocrProgress: number;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ fileInputRef, ocrLoading, ocrProgress, onFileSelect }) => (
  <div className="mb-5 p-4 border-2 border-dashed border-surface-200 rounded-2xl bg-surface-50">
    <div className="flex items-center justify-center gap-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileSelect}
        className="hidden"
        id="image-upload"
      />
      <label
        htmlFor="image-upload"
        className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-xl cursor-pointer hover:bg-brand-600 active:scale-[0.96] transition-all duration-200 text-sm font-medium"
      >
        {ocrLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            识别中 {ocrProgress}%
          </>
        ) : (
          <>
            <ImageIcon className="w-4 h-4" />
            上传图片识别
          </>
        )}
      </label>
      <span className="text-xs text-surface-400">或直接 Ctrl+V 粘贴截图</span>
    </div>
    {ocrLoading && (
      <div className="mt-3">
        <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all duration-300 ease-out"
            style={{ width: `${ocrProgress}%` }}
          />
        </div>
      </div>
    )}
  </div>
);

const AddFormModal: React.FC<{
  show: boolean;
  form: QuestionForm;
  ocrLoading: boolean;
  ocrProgress: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onClose: () => void;
  onChange: (form: QuestionForm) => void;
  onSubmit: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({
  show,
  form,
  ocrLoading,
  ocrProgress,
  fileInputRef,
  onClose,
  onChange,
  onSubmit,
  onFileSelect,
}) => {
  if (!show) return null;

  const update = <K extends keyof QuestionForm>(key: K, value: QuestionForm[K]) => {
    onChange({ ...form, [key]: value });
  };

  const inputClass = "w-full px-3.5 py-2.5 border-2 border-surface-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all duration-200 placeholder:text-surface-400";

  return (
    <div className="fixed inset-0 bg-surface-950/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="surface shadow-card-hover w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-surface-900 font-display tracking-tight">添加错题</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-surface-400 hover:text-surface-900 hover:bg-surface-50 transition-colors duration-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <OcrUpload
          fileInputRef={fileInputRef}
          ocrLoading={ocrLoading}
          ocrProgress={ocrProgress}
          onFileSelect={onFileSelect}
        />

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-surface-900 mb-2">题目类型</label>
            <select
              value={form.type}
              onChange={(e) => update('type', e.target.value)}
              className={inputClass + ' bg-white'}
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-900 mb-2">
              题目内容
              <span className="text-surface-400 font-normal ml-2">（可粘贴图片自动识别）</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => update('content', e.target.value)}
              className={inputClass}
              rows={3}
              placeholder="输入题目内容，或粘贴图片自动识别..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-900 mb-2">
              选项 <span className="text-surface-400 font-normal">（每行一个，如：A.选项内容）</span>
            </label>
            <textarea
              value={form.options}
              onChange={(e) => update('options', e.target.value)}
              className={inputClass}
              rows={4}
              placeholder={'A.选项一\nB.选项二\nC.选项三\nD.选项四'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-surface-900 mb-2">我的答案</label>
              <input
                value={form.my_answer}
                onChange={(e) => update('my_answer', e.target.value)}
                className={inputClass}
                placeholder="如：A"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-surface-900 mb-2">正确答案 *</label>
              <input
                value={form.answer}
                onChange={(e) => update('answer', e.target.value)}
                className={inputClass}
                placeholder="如：C"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-900 mb-2">解析</label>
            <textarea
              value={form.explanation}
              onChange={(e) => update('explanation', e.target.value)}
              className={inputClass}
              rows={2}
              placeholder="输入答案解析..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-900 mb-2">
              标签 <span className="text-surface-400 font-normal">（逗号分隔）</span>
            </label>
            <input
              value={form.tags}
              onChange={(e) => update('tags', e.target.value)}
              className={inputClass}
              placeholder="如：成语,逻辑填空"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-surface-900 mb-2">个人笔记</label>
            <textarea
              value={form.note}
              onChange={(e) => update('note', e.target.value)}
              className={inputClass}
              rows={2}
              placeholder="记录你的思考..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-surface-500 hover:text-surface-900 rounded-xl hover:bg-surface-50 transition-all duration-200"
            >
              取消
            </button>
            <button
              onClick={onSubmit}
              disabled={!form.content || !form.answer}
              className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.96] transition-all duration-200 shadow-md"
            >
              添加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ─── */

const WrongBook: React.FC = () => {
  const [records, setRecords] = useState<WrongRecordWithQuestion[]>([]);
  const [filterType, setFilterType] = useState<string>('');
  const [filterMastered, setFilterMastered] = useState<number | undefined>(0);
  const [searchText, setSearchText] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState<QuestionForm>(DEFAULT_FORM);

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRecords = useCallback(async () => {
    try {
      const api = getApi();
      if (!api) return;
      const filters: Record<string, unknown> = {};
      if (filterType) filters.type = filterType;
      if (filterMastered !== undefined) filters.mastered = filterMastered;
      const data = (await api.wrongBook.getAll(filters)) as WrongRecordWithQuestion[];
      setRecords(data || []);
    } catch (e) {
      console.error('加载错题失败', e);
    }
  }, [filterType, filterMastered]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // OCR image select
  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setOcrLoading(true);
      setOcrProgress(0);

      try {
        const text = await recognizeQuestionImage(file, (progress, status) => {
          if (status === 'recognizing text') {
            setOcrProgress(progress);
          }
          console.log('[OCR]', status, progress / 100);
        });
        console.log('[OCR] 识别结果:', text);

        if (text) {
          const parsed = parseOcrText(text);
          setNewQuestion((prev) => ({
            ...prev,
            content: parsed.content || prev.content,
            options: parsed.options || prev.options,
          }));
        }
      } catch (err) {
        console.error('OCR识别失败:', err);
        alert('图片识别失败，请重试或手动输入');
      } finally {
        setOcrLoading(false);
        setOcrProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    []
  );

  // Paste image handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!showAddForm) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            setOcrLoading(true);
            setOcrProgress(0);

            try {
              const text = await recognizeQuestionImage(file, (progress, status) => {
                if (status === 'recognizing text') {
                  setOcrProgress(progress);
                }
              });
              if (text) {
                const parsed = parseOcrText(text);
                setNewQuestion((prev) => ({
                  ...prev,
                  content: parsed.content || prev.content,
                  options: parsed.options || prev.options,
                }));
              }
            } catch (err) {
              console.error('粘贴图片OCR失败:', err);
            } finally {
              setOcrLoading(false);
              setOcrProgress(0);
            }
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [showAddForm]);

  const handleAdd = async () => {
    try {
      const api = getApi();
      if (!api) return;

      if (!newQuestion.content.trim()) {
        alert('请输入题目内容');
        return;
      }
      if (!newQuestion.answer.trim()) {
        alert('请输入正确答案');
        return;
      }

      const q = (await api.question.add({
        type: newQuestion.type,
        content: newQuestion.content,
        options: newQuestion.options || null,
        answer: newQuestion.answer,
        explanation: newQuestion.explanation,
        tags: newQuestion.tags,
      })) as { id: number };

      console.log('[添加题目成功]', q);

      await api.wrongBook.add({
        question_id: q.id,
        my_answer: newQuestion.my_answer,
        note: newQuestion.note,
      });

      setShowAddForm(false);
      setNewQuestion(DEFAULT_FORM);
      loadRecords();
    } catch (e) {
      console.error('添加错题失败', e);
      alert('添加失败: ' + String(e));
    }
  };

  const handleMastered = async (id: number) => {
    try {
      const api = getApi();
      if (!api) return;
      await api.wrongBook.markMastered(id);
      loadRecords();
    } catch (e) {
      console.error('标记掌握失败', e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这道错题吗？')) return;
    try {
      const api = getApi();
      if (!api) return;
      await api.wrongBook.delete(id);
      loadRecords();
    } catch (e) {
      console.error('删除失败', e);
    }
  };

  const handleReview = async (id: number) => {
    try {
      const api = getApi();
      if (!api) return;
      const record = records.find((r) => r.id === id);
      if (!record) return;
      const newWrongCount = record.wrong_count + 1;
      const newReviewCount = record.review_count + 1;
      const intervals = [1, 3, 7, 14, 30];
      const nextDays = intervals[Math.min(newReviewCount, intervals.length - 1)];
      const nextReview = new Date(Date.now() + nextDays * 86400000).toISOString();
      await api.wrongBook.update({
        id,
        my_answer: record.my_answer,
        note: record.note,
        wrong_count: newWrongCount,
        review_count: newReviewCount,
        next_review_at: nextReview,
      });
      loadRecords();
    } catch (e) {
      console.error('更新复习时间失败', e);
    }
  };

  const filteredRecords = useMemo(
    () =>
      records.filter(
        (r) =>
          !searchText ||
          r.content?.includes(searchText) ||
          r.tags?.includes(searchText)
      ),
    [records, searchText]
  );

  const typeCounts = useMemo(() => {
    const counts: Record<string, TypeCount> = {};
    records.forEach((r) => {
      if (!counts[r.type]) counts[r.type] = { total: 0, mastered: 0 };
      counts[r.type].total++;
      if (r.mastered) counts[r.type].mastered++;
    });
    return counts;
  }, [records]);

  const handleTypeToggle = (type: string) => {
    setFilterType((prev) => (prev === type ? '' : type));
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader onAdd={() => setShowAddForm(true)} />

      <TypeStats filterType={filterType} typeCounts={typeCounts} onToggle={handleTypeToggle} />

      <div className="flex items-center gap-3">
        <SearchBar value={searchText} onChange={setSearchText} />
        <MasterFilter filterMastered={filterMastered} onChange={setFilterMastered} />
      </div>

      {filteredRecords.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => (
            <RecordItem
              key={record.id}
              record={record}
              isExpanded={expandedId === record.id}
              onToggle={() => setExpandedId(expandedId === record.id ? null : record.id)}
              onMastered={handleMastered}
              onReview={handleReview}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AddFormModal
        show={showAddForm}
        form={newQuestion}
        ocrLoading={ocrLoading}
        ocrProgress={ocrProgress}
        fileInputRef={fileInputRef}
        onClose={() => setShowAddForm(false)}
        onChange={setNewQuestion}
        onSubmit={handleAdd}
        onFileSelect={handleImageSelect}
      />
    </div>
  );
};

export default WrongBook;
