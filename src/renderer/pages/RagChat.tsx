import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Plus, Trash2, Send, Loader2, BookOpen, Settings, ChevronDown, ChevronRight, FileText, Database } from 'lucide-react';
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
} from '../hooks/use-api';

const api = (window as any).api;

interface ChatMessage {
  id: number;
  session_id: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: { id: number; title: string; source: string }[];
  created_at: string;
}

interface RagSettings {
  embedApiUrl: string;
  embedApiKey: string;
  embedModel: string;
  rerankerModel: string;
  llmApiUrl: string;
  llmApiKey: string;
  llmModel: string;
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
  const { data: chromaStatus } = useChromaStatus();
  const chromaMigrate = useChromaMigrate();
  const [migrating, setMigrating] = useState(false);

  const handleChromaMigrate = async () => {
    setMigrating(true);
    try {
      const result: any = await chromaMigrate.mutateAsync();
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
      const result: any = await syncMutation.mutateAsync();
      alert(`同步完成: 新增 ${result.synced} 条知识文档`);
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
      const result: any = await api.rag.importPdfs(importPath);
      alert(`导入完成：新增 ${result.imported} 条，跳过 ${result.skipped} 条，失败 ${result.errors} 条`);
    } catch (err) {
      alert(`导入失败: ${err}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-elevated w-full max-w-lg p-6 space-y-4">
        <h2 className="text-lg font-bold text-surface-900 font-display">RAG 配置</h2>

        <div className="space-y-4">
          {/* 向量模型配置 */}
          <div className="p-3 bg-surface-50 rounded-lg space-y-3">
            <h3 className="text-sm font-medium text-surface-700 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              向量检索模型
            </h3>
            <label className="block">
              <span className="text-xs text-surface-500">Embedding API 地址</span>
              <input
                value={form.embedApiUrl}
                onChange={(e) => setForm({ ...form, embedApiUrl: e.target.value })}
                placeholder="https://router.tumuer.me/v1"
                className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
              />
            </label>
            <label className="block">
              <span className="text-xs text-surface-500">Embedding API Key</span>
              <input
                type="password"
                value={form.embedApiKey}
                onChange={(e) => setForm({ ...form, embedApiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
              />
            </label>
            <label className="block">
              <span className="text-xs text-surface-500">Embedding 模型</span>
              <input
                value={form.embedModel}
                onChange={(e) => setForm({ ...form, embedModel: e.target.value })}
                placeholder="Qwen3-VL-Embedding-8B"
                className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
              />
            </label>
            <label className="block">
              <span className="text-xs text-surface-500">Reranker 模型 (可选)</span>
              <input
                value={form.rerankerModel}
                onChange={(e) => setForm({ ...form, rerankerModel: e.target.value })}
                placeholder="Qwen3-VL-Reranker-8B"
                className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
              />
            </label>
          </div>

          {/* 对话模型配置 */}
          <div className="p-3 bg-surface-50 rounded-lg space-y-3">
            <h3 className="text-sm font-medium text-surface-700 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              对话生成模型
            </h3>
            <label className="block">
              <span className="text-xs text-surface-500">LLM API 地址</span>
              <input
                value={form.llmApiUrl}
                onChange={(e) => setForm({ ...form, llmApiUrl: e.target.value })}
                placeholder="https://api.deepseek.com/v1"
                className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
              />
            </label>
            <label className="block">
              <span className="text-xs text-surface-500">LLM API Key</span>
              <input
                type="password"
                value={form.llmApiKey}
                onChange={(e) => setForm({ ...form, llmApiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
              />
            </label>
            <label className="block">
              <span className="text-xs text-surface-500">LLM 对话模型</span>
              <input
                value={form.llmModel}
                onChange={(e) => setForm({ ...form, llmModel: e.target.value })}
                placeholder="deepseek-chat"
                className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
              />
            </label>
          </div>

          {/* ChromaDB 向量数据库状态 */}
          <div className="p-3 bg-surface-50 rounded-lg space-y-2">
            <h3 className="text-sm font-medium text-surface-700 flex items-center gap-2">
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
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-surface-200 rounded-lg text-xs hover:bg-surface-50 disabled:opacity-50"
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
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-surface-200 rounded-lg text-sm hover:bg-surface-50 disabled:opacity-50"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
              {syncing ? '同步中...' : '同步题库到知识库'}
            </button>
            <button
              onClick={() => setShowImportDialog(true)}
              disabled={importing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-surface-200 rounded-lg text-sm hover:bg-surface-50 disabled:opacity-50"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {importing ? '导入中...' : '导入PDF题库'}
            </button>
          </div>
          <p className="text-xs text-surface-400">「导入PDF题库」会扫描目录下所有 PDF 文件并提取文本到知识库</p>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-surface-100">
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
            : 'bg-surface-100 text-surface-800 rounded-bl-md'
        )}>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="text-left">
            <button
              onClick={() => setShowSources(!showSources)}
              className="text-xs text-surface-400 hover:text-surface-600 flex items-center gap-1"
            >
              {showSources ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              引用 {message.sources.length} 条资料
            </button>
            {showSources && (
              <div className="mt-1 p-2 bg-surface-50 rounded-lg text-xs text-surface-500 space-y-1">
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [] } = useRagSessions();
  const { data: messages = [] } = useRagMessages(activeSessionId);
  const { data: ragConfig } = useRagConfig();
  const createSession = useCreateRagSession();
  const deleteSession = useDeleteRagSession();
  const saveConfig = useSaveRagConfig();

  // Keep ref in sync so stream callbacks can access current sessionId
  useEffect(() => { sessionIdRef.current = activeSessionId; }, [activeSessionId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamContent, scrollToBottom]);

  // 监听流式响应
  useEffect(() => {
    const unsubChunk = api.rag.onStreamChunk?.((chunk: string) => {
      setStreamContent((prev) => prev + chunk);
    });
    const unsubEnd = api.rag.onStreamEnd?.(() => {
      setStreaming(false);
      setStreamContent('');
      setPendingMessages([]);
      // Refetch messages from DB so user+assistant messages appear
      const sid = sessionIdRef.current;
      if (sid) {
        queryClient.invalidateQueries({ queryKey: ['ragMessages', sid] });
      }
    });
    return () => { unsubChunk?.(); unsubEnd?.(); };
  }, [queryClient]);

  const handleNewSession = async () => {
    const session: any = await createSession.mutateAsync(undefined);
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
      await api.rag.chat(activeSessionId, question);
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
    (pm) => !messages.some((m: ChatMessage) => m.role === 'user' && m.content === pm.content)
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
    <div className="flex h-full bg-surface-0">
      {/* 会话列表侧栏 */}
      {sidebarOpen && (
        <div className="w-64 shrink-0 bg-surface-50 border-r border-surface-200 flex flex-col">
          <div className="p-3 border-b border-surface-200">
            <button
              onClick={handleNewSession}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> 新对话
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map((session: any) => (
              <div
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors group',
                  activeSessionId === session.id
                    ? 'bg-brand-500/10 text-brand-700'
                    : 'text-surface-600 hover:bg-surface-100'
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
        <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-surface-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-surface-400 hover:text-surface-600 lg:hidden"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold text-surface-900 font-display flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-500" />
              智能问答
            </h1>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100"
          >
            <Settings className="w-4 h-4" />
          </button>
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
            <div className="flex gap-2 items-end max-w-3xl mx-auto">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的问题..."
                rows={1}
                className="flex-1 px-4 py-3 border border-surface-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 resize-none placeholder:text-surface-400"
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
