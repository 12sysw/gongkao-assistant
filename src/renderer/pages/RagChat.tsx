import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Plus, Trash2, Send, Loader2, BookOpen, Settings, ChevronDown, ChevronRight, FileText, Database, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '../lib/utils';
import {
  useRagSessions,
  useRagMessages,
  useCreateRagSession,
  useDeleteRagSession,
  useRagConfig,
  useSaveRagConfig,
  useSyncQuestions,
  useChromaStatus,
  useChromaMigrate,
  useImportPdfs,
  useRagStream,
  useSendRagChat,
  useHuashengCatalog,
} from '../hooks/use-api';
import type { RagConfig, RagMessage, TeacherMode } from '../../shared/ipc';

type ChatMessage = RagMessage;
type RagSettings = RagConfig;

const TEACHER_MODE_OPTIONS: Array<{ id: TeacherMode; label: string; hint: string }> = [
  { id: 'huasheng-auto', label: '花生十三·自动识别', hint: '自动识别题型并调用对应方法' },
  { id: 'xingce-speed', label: '行测速解', hint: '速算、选项排除和考场用时' },
  { id: 'foundation', label: '基础讲解', hint: '先讲原理和识别标志' },
  { id: 'essay', label: '申论审题', hint: '审题、找点、加工和修改建议' },
  { id: 'wrong-review', label: '错因复盘', hint: '四类错因与下次提醒' },
  { id: 'planning', label: '备考规划', hint: '基础、强化、冲刺三阶段' },
  { id: 'general', label: '通用 RAG', hint: '仅使用用户知识库' },
];

const MODE_PROMPTS: Partial<Record<TeacherMode, string[]>> = {
  'huasheng-auto': ['资料分析怎么提速到 25 分钟？', '帮我识别这道题的题型和速解方法'],
  'xingce-speed': ['讲解截位直除和 415 份数法', '数量关系应该选做哪些题？'],
  essay: ['帮我审申论题，只给框架不代写', '如何从材料中找点并分类？'],
  'wrong-review': ['按知识盲区、技巧不熟、粗心、时间不够复盘这道错题'],
  planning: ['我还有 60 天备考，每天 3 小时，怎么安排？'],
};

function formatQuestionSyncSummary(result: { questionsImported?: number; questionsSkipped?: number; questionsUpdated?: number; questionsUnanswered?: number }) {
  if (result.questionsImported === undefined) return '';
  const updatedText = result.questionsUpdated
    ? `，更新 ${result.questionsUpdated} 题`
    : '';
  const unansweredText = result.questionsUnanswered
    ? `，其中 ${result.questionsUnanswered} 题未识别答案`
    : '';
  return `\n同步可测评题目：新增 ${result.questionsImported} 题${updatedText}，跳过 ${result.questionsSkipped ?? 0} 题${unansweredText}`;
}

/* ─── RAG Settings Modal ─── */

const RagSettingsPanel: React.FC<{
  config: RagSettings;
  onSave: (config: RagSettings) => void;
  onClose: () => void;
}> = ({ config, onSave, onClose }) => {
  const [form, setForm] = useState<RagSettings>(config);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importPath, setImportPath] = useState('');
  const syncMutation = useSyncQuestions();
  const importPdfs = useImportPdfs();
  const { data: chromaStatus } = useChromaStatus();
  const chromaMigrate = useChromaMigrate();
  const [migrating, setMigrating] = useState(false);

  const handleChromaMigrate = async () => {
    setMigrating(true);
    try {
      const result = await chromaMigrate.mutateAsync();
      if (result.error) alert(result.error);
      else alert(`迁移完成: 成功 ${result.migrated} 条, 失败 ${result.failed} 条`);
    } catch {
      alert('迁移失败');
    } finally {
      setMigrating(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncMutation.mutateAsync();
      alert(`同步完成：新增 ${result.synced} 条知识文档${formatQuestionSyncSummary(result)}`);
    } catch {
      alert('同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleImportPdfs = async () => {
    if (!importPath.trim()) return;
    setImporting(true);
    setShowImportDialog(false);
    try {
      const result = await importPdfs.mutateAsync(importPath);
      alert(`导入完成：知识文档新增 ${result.imported} 条，跳过 ${result.skipped} 条，失败 ${result.errors} 条${formatQuestionSyncSummary(result)}`);
    } catch (err) {
      alert(`导入失败: ${err}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-elevated w-full max-w-lg p-6 space-y-4">
        <h2 className="text-lg font-bold text-surface-900 dark:text-surface-0 font-display">RAG 配置</h2>

        <div className="space-y-4">
          {/* 向量模型配置 */}
          <div className="p-3 bg-surface-50 dark:bg-surface-900 rounded-lg space-y-3">
            <h3 className="text-sm font-medium text-surface-700 dark:text-surface-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              向量检索模型
            </h3>
            <label className="block">
              <span className="text-xs text-surface-500 dark:text-surface-400">Embedding API 地址</span>
              <input
                value={form.embedApiUrl}
                onChange={(e) => setForm({ ...form, embedApiUrl: e.target.value })}
                placeholder="https://router.tumuer.me/v1"
                className="w-full mt-1 px-3 py-2 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-brand-500"
              />
            </label>
            <label className="block">
              <span className="text-xs text-surface-500 dark:text-surface-400">Embedding API Key</span>
              <input
                type="password"
                value={form.embedApiKey}
                onChange={(e) => setForm({ ...form, embedApiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full mt-1 px-3 py-2 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-brand-500"
              />
            </label>
            <label className="block">
              <span className="text-xs text-surface-500 dark:text-surface-400">Embedding 模型</span>
              <input
                value={form.embedModel}
                onChange={(e) => setForm({ ...form, embedModel: e.target.value })}
                placeholder="Qwen3-VL-Embedding-8B"
                className="w-full mt-1 px-3 py-2 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-brand-500"
              />
            </label>
            <label className="block">
              <span className="text-xs text-surface-500 dark:text-surface-400">Reranker 模型 (可选)</span>
              <input
                value={form.rerankerModel}
                onChange={(e) => setForm({ ...form, rerankerModel: e.target.value })}
                placeholder="Qwen3-VL-Reranker-8B"
                className="w-full mt-1 px-3 py-2 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-brand-500"
              />
            </label>
          </div>

          {/* 对话模型配置 */}
          <div className="p-3 bg-surface-50 dark:bg-surface-900 rounded-lg space-y-3">
            <h3 className="text-sm font-medium text-surface-700 dark:text-surface-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              对话生成模型
            </h3>
            <label className="block">
              <span className="text-xs text-surface-500 dark:text-surface-400">LLM API 地址</span>
              <input
                value={form.llmApiUrl}
                onChange={(e) => setForm({ ...form, llmApiUrl: e.target.value })}
                placeholder="https://api.deepseek.com/v1"
                className="w-full mt-1 px-3 py-2 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-brand-500"
              />
            </label>
            <label className="block">
              <span className="text-xs text-surface-500 dark:text-surface-400">LLM API Key</span>
              <input
                type="password"
                value={form.llmApiKey}
                onChange={(e) => setForm({ ...form, llmApiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full mt-1 px-3 py-2 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-brand-500"
              />
            </label>
            <label className="block">
              <span className="text-xs text-surface-500 dark:text-surface-400">LLM 对话模型</span>
              <input
                value={form.llmModel}
                onChange={(e) => setForm({ ...form, llmModel: e.target.value })}
                placeholder="deepseek-chat"
                className="w-full mt-1 px-3 py-2 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-brand-500"
              />
            </label>
          </div>

          {/* ChromaDB 向量数据库状态 */}
          <div className="p-3 bg-surface-50 dark:bg-surface-900 rounded-lg space-y-2">
            <h3 className="text-sm font-medium text-surface-700 dark:text-surface-400 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${chromaStatus?.running ? 'bg-green-500' : 'bg-surface-300'}`}></span>
              ChromaDB 向量数据库
            </h3>
            <div className="text-xs text-surface-500 space-y-1">
              <p>状态：{chromaStatus?.running ? (
                <span className="text-green-600 font-medium">运行中 ({chromaStatus.host}:{chromaStatus.port})</span>
              ) : (
                <span className="text-surface-400">未启动（使用内存余弦相似度回退）</span>
              )}</p>
            </div>
            {chromaStatus?.running && (
              <button
                onClick={handleChromaMigrate}
                disabled={migrating}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-surface-200 dark:border-surface-600 rounded-lg text-xs hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-50"
              >
                {migrating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                {migrating ? '迁移中...' : '迁移已有向量到 ChromaDB'}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-surface-200 dark:border-surface-600 rounded-lg text-sm hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-50"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
              {syncing ? '同步中...' : '同步题库/可测评题'}
            </button>
            <button
              onClick={() => setShowImportDialog(true)}
              disabled={importing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-surface-200 dark:border-surface-600 rounded-lg text-sm hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-50"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {importing ? '导入中...' : '导入PDF题库'}
            </button>
          </div>
          <p className="text-xs text-surface-400">「导入PDF题库」会扫描目录下所有 PDF 文件，写入知识库并同步为套题测评可用题目</p>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-surface-100 dark:border-surface-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-surface-500 hover:text-surface-700">
            取消
          </button>
          <button
            onClick={() => { onSave(form); onClose(); }}
            className="px-5 py-2 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors"
          >
            保存
          </button>
        </div>
      </div>

      {/* PDF 导入对话框 */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-elevated w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-surface-900 dark:text-surface-0">导入PDF题库</h3>
            <div>
              <label className="block text-sm text-surface-600 mb-2">PDF 文件目录路径：</label>
              <input
                value={importPath}
                onChange={(e) => setImportPath(e.target.value)}
                placeholder="例如：E:\国考真题\公务员"
                className="w-full px-3 py-2 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg text-sm focus:outline-none focus:border-brand-500"
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

/* ─── Message Bubble ─── */

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3 max-w-3xl', isUser ? 'ml-auto flex-row-reverse' : '')}>
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
        isUser ? 'bg-brand-500' : 'bg-surface-600'
      )}>
        {isUser ? '你' : 'AI'}
      </div>
      <div className={cn('space-y-1', isUser ? 'text-right' : '')}>
        <div className={cn(
          'inline-block px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-2xl',
          isUser
            ? 'bg-brand-500 text-white rounded-br-md'
            : 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-400 rounded-bl-md'
        )}>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="text-left">
            <button
              onClick={() => setShowSources(!showSources)}
              className="text-xs text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 flex items-center gap-1"
            >
              {showSources ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              引用 {message.sources.length} 条资料
            </button>
            {showSources && (
              <div className="mt-1 p-2 bg-surface-50 dark:bg-surface-800 rounded-lg text-xs text-surface-500 dark:text-surface-400 space-y-1">
                {message.sources.map((s, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <span className="text-surface-400 shrink-0">[{i + 1}]</span>
                    <span className="text-surface-600">{s.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Main Page ─── */

const RagChat: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const sessionIdRef = useRef<number | null>(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [teacherMode, setTeacherMode] = useState<TeacherMode>(() => {
    const saved = localStorage.getItem('gongkao-teacher-mode') as TeacherMode | null;
    return TEACHER_MODE_OPTIONS.some((item) => item.id === saved) ? saved! : 'huasheng-auto';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [] } = useRagSessions();
  const { data: messages = [] } = useRagMessages(activeSessionId);
  const { data: ragConfig } = useRagConfig();
  const { data: huashengCatalog } = useHuashengCatalog();
  const createSession = useCreateRagSession();
  const deleteSession = useDeleteRagSession();
  const saveConfig = useSaveRagConfig();
  const sendRagChat = useSendRagChat();

  // Keep ref in sync so stream callbacks can access current sessionId
  useEffect(() => { sessionIdRef.current = activeSessionId; }, [activeSessionId]);
  useEffect(() => { localStorage.setItem('gongkao-teacher-mode', teacherMode); }, [teacherMode]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamContent, scrollToBottom]);

  useRagStream({
    onChunk: (chunk) => {
      setStreamContent((prev) => prev + chunk);
    },
    onEnd: () => {
      setStreaming(false);
      setStreamContent('');
      setPendingMessages([]);
      const sid = sessionIdRef.current;
      if (sid) {
        queryClient.invalidateQueries({ queryKey: ['ragMessages', sid] });
      }
    },
  });

  const handleNewSession = async () => {
    const session = await createSession.mutateAsync(undefined);
    setActiveSessionId(session.id);
  };

  const handleDeleteSession = async (id: number) => {
    await deleteSession.mutateAsync(id);
    if (activeSessionId === id) setActiveSessionId(null);
  };

  const handleSend = async () => {
    if (!input.trim() || !activeSessionId || streaming) return;

    const question = input.trim();
    setInput('');
    setStreaming(true);
    setStreamContent('');

    // 立即将用户消息加入显示列表（不等待 IPC 刷新）
    const optimisticUserMsg: ChatMessage = {
      id: Date.now(),
      session_id: activeSessionId,
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    };
    setPendingMessages((prev) => [...prev, optimisticUserMsg]);

    try {
      await sendRagChat.mutateAsync({ sessionId: activeSessionId, message: question, options: { teacher_mode: teacherMode } });
    } catch (err) {
      console.error('[RAG Chat] Error:', err);
      setStreaming(false);
      setStreamContent('');
      queryClient.invalidateQueries({ queryKey: ['ragMessages', activeSessionId] });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const displayMessages: ChatMessage[] = [...messages, ...pendingMessages.filter(
    (pm) => !messages.some((m) => m.role === 'user' && m.content === pm.content)
  )];
  if (streaming && streamContent) {
    displayMessages.push({
      id: -1,
      session_id: activeSessionId!,
      role: 'assistant',
      content: streamContent,
      created_at: '',
    });
  }

  const isConfigured = ragConfig?.llmApiUrl && ragConfig?.llmApiKey;

  return (
    <div className="flex h-full bg-surface-0 dark:bg-surface-900">
      {/* 会话列表侧栏 */}
      {sidebarOpen && (
        <div className="w-64 shrink-0 bg-surface-50 dark:bg-surface-800 border-r border-surface-200 dark:border-surface-700 flex flex-col">
          <div className="p-3 border-b border-surface-200 dark:border-surface-700">
            <button
              onClick={handleNewSession}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> 新对话
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors group',
                  activeSessionId === session.id
                    ? 'bg-brand-500/10 text-brand-700 dark:text-brand-400'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'
                )}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{session.title || '新对话'}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 text-surface-400 hover:text-danger-500 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-xs text-surface-400 text-center py-4">暂无对话</p>
            )}
          </div>
        </div>
      )}

      {/* 主对话区 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部栏 */}
        <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-surface-400 hover:text-surface-600 lg:hidden"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold text-surface-900 dark:text-surface-0 font-display flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-500" />
              智能问答
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Sparkles className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-violet-500" />
              <select value={teacherMode} onChange={(event) => setTeacherMode(event.target.value as TeacherMode)} disabled={streaming} className="rounded-lg border border-violet-200 bg-violet-50 py-1.5 pl-8 pr-8 text-xs font-semibold text-violet-700 outline-none dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300">
                {TEACHER_MODE_OPTIONS.map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}
              </select>
            </div>
            <button onClick={() => setShowSettings(true)} className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {!activeSessionId ? (
            <div className="flex flex-col items-center justify-center h-full text-surface-400">
              <BookOpen className="w-12 h-12 mb-4 text-surface-300" />
              <p className="text-lg font-medium">公考智能问答助手</p>
              <p className="text-sm mt-2">基于 RAG 检索增强的公考知识问答</p>
              {!isConfigured && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600"
                >
                  配置 API
                </button>
              )}
              {isConfigured && (
                <button
                  onClick={handleNewSession}
                  className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600"
                >
                  开始对话
                </button>
              )}
            </div>
          ) : (
            <>
              {displayMessages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 输入框 */}
        {activeSessionId && (
          <div className="shrink-0 px-4 pb-4">
            <div className="mx-auto mb-2 flex max-w-3xl flex-wrap items-center gap-2">
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">{TEACHER_MODE_OPTIONS.find((item) => item.id === teacherMode)?.label}</span>
              <span className="text-[11px] text-surface-500">{TEACHER_MODE_OPTIONS.find((item) => item.id === teacherMode)?.hint}</span>
              {(MODE_PROMPTS[teacherMode] ?? []).map((prompt) => <button key={prompt} onClick={() => setInput(prompt)} className="rounded-full border border-surface-200 px-2.5 py-1 text-[11px] text-surface-500 hover:border-violet-300 hover:text-violet-600 dark:border-surface-700">{prompt}</button>)}
            </div>
            <div className="flex gap-2 items-end max-w-3xl mx-auto">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的问题..."
                rows={1}
                className="flex-1 px-4 py-3 border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 resize-none placeholder:text-surface-400"
                style={{ maxHeight: 120 }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || streaming}
                className="p-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                {streaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 设置弹窗 */}
      {showSettings && ragConfig && (
        <RagSettingsPanel
          config={ragConfig}
          onSave={(c) => saveConfig.mutate(c)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default RagChat;
