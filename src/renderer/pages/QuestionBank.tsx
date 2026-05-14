import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  FileText,
  Tag,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useRagDocs, useDeleteRagDocBatch, useSyncQuestions } from '../hooks/use-api';

const api = (window as any).api;

interface RagDoc {
  id: number;
  title: string;
  content: string;
  source: string;
  category: string;
  created_at: string;
  updated_at: string;
}

interface DocGroup {
  key: string;
  displayTitle: string;
  source: string;
  category: string;
  created_at: string;
  parts: RagDoc[];
  fullContent: string;
}

// 解析标题中的分片编号 "文件名 (2/6)" → { base: "文件名", part: 2, total: 6 }
function parsePartInfo(title: string): { base: string; part: number; total: number } {
  const m = title.match(/^(.+?)\s*\((\d+)\/(\d+)\)\s*$/);
  if (m) return { base: m[1].trim(), part: +m[2], total: +m[3] };
  return { base: title, part: 1, total: 1 };
}

const QuestionBank: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importPath, setImportPath] = useState('');

  const { data: docs = [], isLoading, refetch } = useRagDocs();
  const deleteDocBatch = useDeleteRagDocBatch();
  const syncMutation = useSyncQuestions();

  const categories = useMemo(
    () => ['all', ...new Set((docs as RagDoc[]).map((d) => d.category).filter(Boolean))],
    [docs],
  );
  const sources = useMemo(
    () => ['all', ...new Set((docs as RagDoc[]).map((d) => d.source).filter(Boolean))],
    [docs],
  );

  // 将分片文档合并为组，每组代表一篇完整的 PDF / 一道题目
  const groups = useMemo(() => {
    const filtered = (docs as RagDoc[]).filter((doc) => {
      if (!doc.content || doc.content.trim().length < 20) return false;
      const matchesSearch =
        !searchQuery ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'all' || doc.category === selectedCategory;
      const matchesSrc = selectedSource === 'all' || doc.source === selectedSource;
      return matchesSearch && matchesCat && matchesSrc;
    });

    const map = new Map<string, DocGroup>();
    for (const doc of filtered) {
      const info = parsePartInfo(doc.title);
      const groupKey = `${doc.source}::${doc.category}::${info.base}`;
      let group = map.get(groupKey);
      if (!group) {
        group = {
          key: groupKey,
          displayTitle: info.base,
          source: doc.source,
          category: doc.category,
          created_at: doc.created_at,
          parts: [],
          fullContent: '',
        };
        map.set(groupKey, group);
      }
      group.parts.push(doc);
      // 保留最新的 created_at
      if (doc.created_at > group.created_at) group.created_at = doc.created_at;
    }

    // 排序各分片并拼接完整内容
    for (const g of map.values()) {
      g.parts.sort((a, b) => {
        const pa = parsePartInfo(a.title).part;
        const pb = parsePartInfo(b.title).part;
        return pa - pb;
      });
      g.fullContent = g.parts.map((p) => p.content).join('\n\n');
    }

    // 排序：分类 → 年份降序 → 标题
    return [...map.values()].sort((a, b) => {
      if (a.category !== b.category) return (a.category || '').localeCompare(b.category || '');
      const ya = parseInt(a.displayTitle.match(/\d{4}/)?.[0] || '0');
      const yb = parseInt(b.displayTitle.match(/\d{4}/)?.[0] || '0');
      if (ya !== yb) return yb - ya;
      return a.displayTitle.localeCompare(b.displayTitle);
    });
  }, [docs, searchQuery, selectedCategory, selectedSource]);

  // 按分类分组用于显示
  const categoryGroups = useMemo(() => {
    const map = new Map<string, DocGroup[]>();
    for (const g of groups) {
      const cat = g.category || '未分类';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(g);
    }
    return map;
  }, [groups]);

  const handleImportPdfs = async () => {
    if (!importPath.trim()) return;
    setImporting(true);
    setShowImportDialog(false);
    try {
      const result: any = await api.rag.importPdfs(importPath);
      alert(`导入完成：新增 ${result.imported} 条，跳过 ${result.skipped} 条，失败 ${result.errors} 条`);
      refetch();
    } catch (err) {
      alert(`导入失败: ${err}`);
    } finally {
      setImporting(false);
    }
  };

  const handleSyncQuestions = async () => {
    try {
      const result: any = await syncMutation.mutateAsync();
      alert(`同步完成: 新增 ${result.synced} 条知识文档`);
      refetch();
    } catch {
      alert('同步失败');
    }
  };

  const handleDeleteGroup = async (group: DocGroup) => {
    if (!confirm(`确定要删除「${group.displayTitle}」（${group.parts.length} 个分片）吗？`)) return;
    try {
      await deleteDocBatch.mutateAsync(group.parts.map((p) => p.id));
      refetch();
    } catch {
      alert('删除失败');
    }
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      manual: '手动添加',
      question_bank: '题库同步',
      pdf_exam: 'PDF真题',
      pdf_answer: 'PDF解析',
    };
    return labels[source] || source;
  };

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      manual: 'bg-gray-100 text-gray-700',
      question_bank: 'bg-blue-100 text-blue-700',
      pdf_exam: 'bg-green-100 text-green-700',
      pdf_answer: 'bg-purple-100 text-purple-700',
    };
    return colors[source] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="h-full flex flex-col bg-surface-0">
      {/* 顶部栏 */}
      <div className="shrink-0 px-6 py-4 border-b border-surface-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-surface-900 font-display flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-500" />
            题库管理
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncQuestions}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              同步题库
            </button>
            <button
              onClick={() => setShowImportDialog(true)}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {importing ? '导入中...' : '导入PDF'}
            </button>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索题库内容..."
              className="w-full pl-10 pr-4 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
          >
            <option value="all">所有分类</option>
            {categories.filter((c): c is string => c !== 'all').map((cat: string) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
          >
            <option value="all">所有来源</option>
            {sources.filter((s): s is string => s !== 'all').map((src: string) => (
              <option key={src} value={src}>{getSourceLabel(src)}</option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex items-center gap-4 text-sm text-surface-500">
          <span>共 {(docs as RagDoc[]).length} 条知识文档</span>
          <span>显示 {groups.length} 篇</span>
        </div>
      </div>

      {/* 文档列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-surface-400">
            <BookOpen className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">暂无题库数据</p>
            <p className="text-sm mt-2">点击上方"导入PDF"按钮导入题库</p>
          </div>
        ) : (
          <div className="space-y-6">
            {[...categoryGroups.entries()].map(([category, catGroups]) => (
              <div key={category} className="space-y-2">
                <h2 className="text-lg font-bold text-surface-800 font-display flex items-center gap-2 sticky top-0 bg-surface-0 py-2">
                  <Tag className="w-5 h-5 text-brand-500" />
                  {category}
                  <span className="text-sm font-normal text-surface-400">({catGroups.length})</span>
                </h2>
                <div className="space-y-2">
                  {catGroups.map((group) => (
                    <div
                      key={group.key}
                      className="bg-white rounded-lg border border-surface-200 overflow-hidden hover:shadow-soft transition-shadow"
                    >
                      <div
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-50"
                        onClick={() => setExpandedKey(expandedKey === group.key ? null : group.key)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getSourceColor(group.source))}>
                              {getSourceLabel(group.source)}
                            </span>
                            {group.parts.length > 1 && (
                              <span className="text-xs text-surface-400">
                                {group.parts.length} 个分片
                              </span>
                            )}
                            <span className="text-xs text-surface-400">
                              {new Date(group.created_at).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                          <h3 className="text-sm font-medium text-surface-800 truncate">{group.displayTitle}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group); }}
                            className="p-1.5 text-surface-400 hover:text-danger-500 rounded-lg hover:bg-danger-50 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {expandedKey === group.key ? (
                            <ChevronDown className="w-5 h-5 text-surface-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-surface-400" />
                          )}
                        </div>
                      </div>
                      {expandedKey === group.key && (
                        <div className="px-4 py-3 bg-surface-50 border-t border-surface-200">
                          <div className="text-sm text-surface-700 whitespace-pre-wrap max-h-[32rem] overflow-y-auto leading-relaxed">
                            {group.fullContent}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 导入对话框 */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-elevated w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-surface-900">导入PDF题库</h3>
            <div>
              <label className="block text-sm text-surface-600 mb-2">PDF 文件目录路径：</label>
              <input
                value={importPath}
                onChange={(e) => setImportPath(e.target.value)}
                placeholder="例如：E:\国考真题\公务员"
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
              />
              <p className="text-xs text-surface-400 mt-1">支持递归扫描子目录中的所有 PDF 文件</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowImportDialog(false)}
                className="px-4 py-2 text-sm text-surface-500 hover:text-surface-700"
              >
                取消
              </button>
              <button
                onClick={handleImportPdfs}
                disabled={!importPath.trim() || importing}
                className="px-5 py-2 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
              >
                {importing ? '导入中...' : '开始导入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
