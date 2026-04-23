import React, { useEffect, useState, useRef } from 'react';
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
import Tesseract from 'tesseract.js';

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

function parseOptions(options: string | null): string[] {
  if (!options) return [];
  try {
    const parsed = JSON.parse(options);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fallback: split by newline
  }
  return options.split('\n').filter(s => s.trim());
}

const WrongBook: React.FC = () => {
  const [records, setRecords] = useState<WrongRecordWithQuestion[]>([]);
  const [filterType, setFilterType] = useState<string>('');
  const [filterMastered, setFilterMastered] = useState<number | undefined>(0);
  const [searchText, setSearchText] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    type: '行测-言语理解',
    content: '',
    options: '',
    answer: '',
    explanation: '',
    tags: '',
    my_answer: '',
    note: '',
  });

  // OCR 相关状态
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRecords();
  }, [filterType, filterMastered]);

  async function loadRecords() {
    try {
      const api = (window as any).api;
      if (!api) return;
      const filters: any = {};
      if (filterType) filters.type = filterType;
      if (filterMastered !== undefined) filters.mastered = filterMastered;
      const data = await api.wrongBook.getAll(filters);
      setRecords(data || []);
    } catch (e) {
      console.error('加载错题失败', e);
    }
  }

  // OCR 图片识别
  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrProgress(0);

    try {
      const result = await Tesseract.recognize(file, 'chi_sim+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
          console.log('[OCR]', m.status, m.progress);
        },
      });

      const text = result.data.text.trim();
      console.log('[OCR] 识别结果:', text);

      if (text) {
        // 智能解析识别的文本
        const parsed = parseOcrText(text);
        setNewQuestion(prev => ({
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
  }

  // 解析OCR识别的文本，尝试提取题目和选项
  function parseOcrText(text: string): { content: string; options: string } {
    const lines = text.split('\n').filter(line => line.trim());

    // 尝试找出选项行（以A. B. C. D. 开头）
    const optionPattern = /^[A-Fa-f][.、．]/;
    const options: string[] = [];
    const contentLines: string[] = [];

    let foundOptions = false;
    for (const line of lines) {
      if (optionPattern.test(line.trim())) {
        foundOptions = true;
        // 标准化选项格式
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

  // 粘贴图片处理
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
              const result = await Tesseract.recognize(file, 'chi_sim+eng', {
                logger: (m) => {
                  if (m.status === 'recognizing text') {
                    setOcrProgress(Math.round(m.progress * 100));
                  }
                },
              });

              const text = result.data.text.trim();
              if (text) {
                const parsed = parseOcrText(text);
                setNewQuestion(prev => ({
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

  async function handleAdd() {
    try {
      const api = (window as any).api;
      if (!api) return;

      if (!newQuestion.content.trim()) {
        alert('请输入题目内容');
        return;
      }
      if (!newQuestion.answer.trim()) {
        alert('请输入正确答案');
        return;
      }

      // 先创建题目
      const q = await api.question.add({
        type: newQuestion.type,
        content: newQuestion.content,
        options: newQuestion.options || null,
        answer: newQuestion.answer,
        explanation: newQuestion.explanation,
        tags: newQuestion.tags,
      });

      console.log('[添加题目成功]', q);

      // 再创建错题记录
      await api.wrongBook.add({
        question_id: q.id,
        my_answer: newQuestion.my_answer,
        note: newQuestion.note,
      });

      setShowAddForm(false);
      setNewQuestion({
        type: '行测-言语理解',
        content: '',
        options: '',
        answer: '',
        explanation: '',
        tags: '',
        my_answer: '',
        note: '',
      });
      loadRecords();
    } catch (e) {
      console.error('添加错题失败', e);
      alert('添加失败: ' + String(e));
    }
  }

  async function handleMastered(id: number) {
    try {
      const api = (window as any).api;
      if (!api) return;
      await api.wrongBook.markMastered(id);
      loadRecords();
    } catch (e) {
      console.error('标记掌握失败', e);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定要删除这道错题吗？')) return;
    try {
      const api = (window as any).api;
      if (!api) return;
      await api.wrongBook.delete(id);
      loadRecords();
    } catch (e) {
      console.error('删除失败', e);
    }
  }

  async function handleReview(id: number) {
    try {
      const api = (window as any).api;
      if (!api) return;
      const record = records.find(r => r.id === id);
      if (!record) return;
      const intervals = [1, 3, 7, 14, 30];
      const nextDays = intervals[Math.min(record.wrong_count, intervals.length - 1)];
      const nextReview = new Date(Date.now() + nextDays * 86400000).toISOString();
      await api.wrongBook.update({
        id,
        my_answer: record.my_answer,
        note: record.note,
        next_review_at: nextReview,
      });
      loadRecords();
    } catch (e) {
      console.error('更新复习时间失败', e);
    }
  }

  const filteredRecords = records.filter(r =>
    !searchText || r.content?.includes(searchText) || r.tags?.includes(searchText)
  );

  const typeCounts: Record<string, { total: number; mastered: number }> = {};
  records.forEach(r => {
    if (!typeCounts[r.type]) typeCounts[r.type] = { total: 0, mastered: 0 };
    typeCounts[r.type].total++;
    if (r.mastered) typeCounts[r.type].mastered++;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">错题本</h1>
          <p className="text-sm text-gray-500 mt-1">记录错题，反复复习，查漏补缺</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          添加错题
        </button>
      </div>

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {QUESTION_TYPES.map(type => {
          const c = typeCounts[type] || { total: 0, mastered: 0 };
          return (
            <div
              key={type}
              onClick={() => setFilterType(filterType === type ? '' : type)}
              className={`cursor-pointer rounded-lg p-3 border transition-colors ${
                filterType === type ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className="text-xs text-gray-500">{type.split('-')[1]}</p>
              <p className="text-lg font-semibold text-gray-800">{c.total}</p>
              <p className="text-xs text-green-500">已掌握 {c.mastered}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索题目内容或标签..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
          />
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setFilterMastered(0)}
            className={`px-3 py-2 text-xs ${filterMastered === 0 ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-600'}`}
          >
            未掌握
          </button>
          <button
            onClick={() => setFilterMastered(1)}
            className={`px-3 py-2 text-xs border-l border-gray-200 ${filterMastered === 1 ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-600'}`}
          >
            已掌握
          </button>
          <button
            onClick={() => setFilterMastered(undefined)}
            className={`px-3 py-2 text-xs border-l border-gray-200 ${filterMastered === undefined ? 'bg-primary-50 text-primary-700' : 'bg-white text-gray-600'}`}
          >
            全部
          </button>
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookXIcon className="w-16 h-16 mx-auto mb-3 text-gray-300" />
          <p className="text-lg">暂无错题记录</p>
          <p className="text-sm mt-1">点击右上角添加你的第一道错题吧！</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map(record => {
            const opts = parseOptions(record.options);
            return (
              <div
                key={record.id}
                className={`bg-white rounded-xl border transition-colors ${
                  record.mastered ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
                }`}
              >
                <div
                  className="flex items-start p-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-xs bg-primary-100 text-primary-700">
                        {record.type}
                      </span>
                      {record.mastered && (
                        <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">已掌握</span>
                      )}
                      <span className="text-xs text-gray-400">错 {record.wrong_count} 次</span>
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-2">{record.content}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    {expandedId === record.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedId === record.id && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                    {opts.length > 0 && (
                      <div className="space-y-1">
                        {opts.map((opt, i) => (
                          <div
                            key={i}
                            className={`text-sm px-3 py-1.5 rounded ${
                              opt.startsWith(record.answer)
                                ? 'bg-green-50 text-green-700'
                                : opt.startsWith(record.my_answer)
                                ? 'bg-red-50 text-red-700 line-through'
                                : 'text-gray-600'
                            }`}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">我的答案：</span>
                        <span className="text-red-600 font-medium">{record.my_answer}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">正确答案：</span>
                        <span className="text-green-600 font-medium">{record.answer}</span>
                      </div>
                    </div>

                    {record.explanation && (
                      <div className="text-sm bg-blue-50 rounded-lg p-3 text-blue-800">
                        <span className="font-medium">解析：</span>{record.explanation}
                      </div>
                    )}

                    {record.note && (
                      <div className="text-sm bg-yellow-50 rounded-lg p-3 text-yellow-800">
                        <span className="font-medium">笔记：</span>{record.note}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      {!record.mastered && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMastered(record.id); }}
                            className="flex items-center px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            标记掌握
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleReview(record.id); }}
                            className="flex items-center px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs hover:bg-primary-600 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            已复习
                          </button>
                        </>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                        className="flex items-center px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 transition-colors ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        删除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">添加错题</h2>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* OCR 图片识别区域 */}
            <div className="mb-4 p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
              <div className="flex items-center justify-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700 transition-colors text-sm"
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
                <span className="text-xs text-gray-400">或直接 Ctrl+V 粘贴截图</span>
              </div>
              {ocrLoading && (
                <div className="mt-3">
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 transition-all duration-300"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">题目类型</label>
                <select
                  value={newQuestion.type}
                  onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                >
                  {QUESTION_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  题目内容
                  <span className="text-gray-400 font-normal ml-2">（可粘贴图片自动识别）</span>
                </label>
                <textarea
                  value={newQuestion.content}
                  onChange={e => setNewQuestion({ ...newQuestion, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                  rows={3}
                  placeholder="输入题目内容，或粘贴图片自动识别..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  选项 <span className="text-gray-400 font-normal">（每行一个，如：A.选项内容）</span>
                </label>
                <textarea
                  value={newQuestion.options}
                  onChange={e => setNewQuestion({ ...newQuestion, options: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                  rows={4}
                  placeholder={"A.选项一\nB.选项二\nC.选项三\nD.选项四"}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">我的答案</label>
                  <input
                    value={newQuestion.my_answer}
                    onChange={e => setNewQuestion({ ...newQuestion, my_answer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                    placeholder="如：A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">正确答案 *</label>
                  <input
                    value={newQuestion.answer}
                    onChange={e => setNewQuestion({ ...newQuestion, answer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                    placeholder="如：C"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">解析</label>
                <textarea
                  value={newQuestion.explanation}
                  onChange={e => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                  rows={2}
                  placeholder="输入答案解析..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标签 <span className="text-gray-400 font-normal">（逗号分隔）</span>
                </label>
                <input
                  value={newQuestion.tags}
                  onChange={e => setNewQuestion({ ...newQuestion, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                  placeholder="如：成语,逻辑填空"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">个人笔记</label>
                <textarea
                  value={newQuestion.note}
                  onChange={e => setNewQuestion({ ...newQuestion, note: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                  rows={2}
                  placeholder="记录你的思考..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  取消
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newQuestion.content || !newQuestion.answer}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BookXIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    <path d="m14.5 7-5 5" />
    <path d="m9.5 7 5 5" />
  </svg>
);

export default WrongBook;