import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, Image as ImageIcon, FileText, Loader2, Users, Settings2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import {
  SDK_APP_ID, PRESET_ROOMS,
  loginIM, logoutIM, setMyProfile, initPresetRooms, joinGroup, fetchHistory,
  sendTextMessage, sendImageMessage, sendFileMessage,
  onMessageReceived, onReady, onKickedOut, fetchGroupMembers,
  onMessageRevoked, revokeMessage,
} from '../lib/tencent-im';
import { useChatStore, ChatMessage, ChatUser } from '../stores/chat-store';
import TencentCloudChat from '@tencentcloud/chat';

async function generateUserSig(userID: string): Promise<string> {
  try {
    const sig = await (window as any).api?.chat?.generateUserSig(userID);
    if (sig) return sig;
  } catch (e) {
    console.error('[Chat] generateUserSig failed:', e);
  }
  return '';
}

// 从带设备后缀的 IM userID 中提取原始用户名
// 例如: "zzz_abc123" -> "zzz", "user_dev_abc" -> "user"
function extractUsername(imUserID: string): string {
  if (!imUserID) return '';
  // 设备后缀格式: _ + 6位字符 (如 _8dbho1)
  const match = imUserID.match(/^(.+)_[a-z0-9]{6}$/);
  return match ? match[1] : imUserID;
}

// 从本地存储获取用户昵称
function getStoredNick(imUserID: string): string | null {
  try {
    const username = extractUsername(imUserID);
    const users = JSON.parse(localStorage.getItem('chat_users') || '{}');
    return users[username]?.nick || null;
  } catch {
    return null;
  }
}

function toChatMessage(msg: any, selfID: string): ChatMessage {
  const isSelf = msg.from === selfID;
  // 优先使用 SDK 返回的昵称，如果为空或等于 userID 则尝试从本地存储获取
  let nick = msg.nick || '';
  if (!nick || nick === msg.from) {
    // 尝试从本地存储获取昵称
    const storedNick = getStoredNick(msg.from);
    if (storedNick) nick = storedNick;
  }
  // 最后回退到提取后的用户名（不带设备后缀）
  if (!nick) {
    nick = extractUsername(msg.from);
  }
  const base: ChatMessage = {
    id: msg.ID || msg.id || `${Date.now()}-${Math.random()}`,
    from: msg.from || '',
    nick,
    avatar: '',
    type: 'text',
    content: '',
    time: msg.time ? msg.time * 1000 : Date.now(),
    isSelf,
  };

  switch (msg.type) {
    case TencentCloudChat.TYPES.MSG_TEXT:
      base.type = 'text';
      base.content = msg.payload?.text || '';
      break;
    case TencentCloudChat.TYPES.MSG_IMAGE:
      base.type = 'image';
      base.content = '[图片]';
      base.imageUrl = msg.payload?.imageInfoArray?.[2]?.url || msg.payload?.imageInfoArray?.[0]?.url || '';
      break;
    case TencentCloudChat.TYPES.MSG_FILE:
      base.type = 'file';
      base.fileName = msg.payload?.fileName || '文件';
      base.fileSize = msg.payload?.fileSize || 0;
      base.fileUrl = msg.payload?.fileUrl || '';
      base.content = base.fileName || '文件';
      break;
    case TencentCloudChat.TYPES.MSG_TIPS:
      base.type = 'system';
      base.content = msg.payload?.text || msg.payload?.groupInfo?.notification || '[系统消息]';
      break;
    default:
      base.type = 'text';
      base.content = `[${msg.type}]`;
  }

  return base;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/* ───── 密码哈希 ───── */

async function hashPassword(password: string): Promise<string> {
  // 使用 Web Crypto API（需要安全上下文）或回退到简单哈希
  // Electron file:// 协议不是安全上下文，需要回退方案
  try {
    if (crypto?.subtle) {
      const data = new TextEncoder().encode(password);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return btoa(String.fromCharCode(...new Uint8Array(hash)));
    }
  } catch (e) {
    console.warn('[Chat] crypto.subtle not available, using fallback hash');
  }
  // 回退方案：使用简单但可用的哈希
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // 结合多次哈希增加复杂度
  const combined = password + hash.toString(36) + 'gongkao_salt_2024';
  let hash2 = 0;
  for (let i = 0; i < combined.length; i++) {
    hash2 = ((hash2 << 5) - hash2) + combined.charCodeAt(i);
    hash2 = hash2 & hash2;
  }
  return btoa(hash2.toString(36) + '_' + hash.toString(36));
}

/* ───── 用户存储 ───── */

interface StoredUser {
  username: string;
  nick: string;
  passwordHash: string;
  createdAt: number;
}

function getStoredUsers(): Record<string, StoredUser> {
  try { return JSON.parse(localStorage.getItem('chat_users') || '{}'); } catch { return {}; }
}

function saveUser(user: StoredUser) {
  const users = getStoredUsers();
  users[user.username] = user;
  localStorage.setItem('chat_users', JSON.stringify(users));
}

/* ───── Components ───── */

function LoginForm({ onLogin }: { onLogin: (userID: string, nick: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [username, setUsername] = useState('');
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 检查设备是否已注册账号
  const hasRegisteredAccount = Object.keys(getStoredUsers()).length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const uname = username.trim().toLowerCase();
    if (!uname || uname.length < 2 || uname.length > 16) { toast.error('用户名 2–16 个字符'); return; }
    if (!password || password.length < 4) { toast.error('密码至少 4 位'); return; }
    setLoading(true);

    try {
      const hash = await hashPassword(password);

      if (mode === 'register') {
        // 一个设备只能注册一个账号
        const users = getStoredUsers();
        const usernames = Object.keys(users);
        if (usernames.length > 0) {
          toast.error('此设备已注册账号，如需新账号请先联系管理员');
          setLoading(false);
          return;
        }
        const displayName = nick.trim() || uname;
        if (users[uname]) { toast.error('用户名已存在'); setLoading(false); return; }
        saveUser({ username: uname, nick: displayName, passwordHash: hash, createdAt: Date.now() });
        toast.success('注册成功，正在登录...');
        // 注册成功后自动登录
        setLoading(false);
        onLogin(uname, displayName);
      } else if (mode === 'reset') {
        const users = getStoredUsers();
        const user = users[uname];
        if (!user) { toast.error('用户名不存在'); setLoading(false); return; }
        user.passwordHash = hash;
        saveUser(user);
        toast.success('密码已重置，请登录');
        setMode('login');
        setPassword('');
        setLoading(false);
      } else {
        const users = getStoredUsers();
        const user = users[uname];
        if (!user || user.passwordHash !== hash) { toast.error('用户名或密码错误'); setLoading(false); return; }
        setLoading(false);
        onLogin(uname, user.nick);
      }
    } catch (err: any) {
      console.error('[Chat] handleSubmit error:', err);
      toast.error('操作失败: ' + (err.message || '未知错误'));
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-full bg-surface-0">
      <form onSubmit={handleSubmit} className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-card space-y-4">
        <div className="flex flex-col items-center gap-3 mb-1">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold font-display text-surface-900">公考学习交流</h1>
          <p className="text-sm text-surface-500">{mode === 'login' ? '登录加入聊天室' : mode === 'register' ? '注册新账号' : '重置密码'}</p>
        </div>

        {mode !== 'reset' && !hasRegisteredAccount && (
          <div className="flex gap-1 p-1 bg-surface-100 rounded-xl">
            <button type="button" onClick={() => setMode('login')}
              className={cn('flex-1 py-1.5 text-sm rounded-lg transition', mode === 'login' ? 'bg-white font-medium shadow-soft' : 'text-surface-500')}>
              登录
            </button>
            <button type="button" onClick={() => setMode('register')}
              className={cn('flex-1 py-1.5 text-sm rounded-lg transition', mode === 'register' ? 'bg-white font-medium shadow-soft' : 'text-surface-500')}>
              注册
            </button>
          </div>
        )}
        {mode !== 'reset' && hasRegisteredAccount && (
          <p className="text-xs text-center text-surface-400">此设备已注册账号，请直接登录</p>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">用户名</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="2–16 个字符" maxLength={16} autoFocus
              className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition" />
          </div>
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">昵称 <span className="text-surface-400 font-normal">(可选)</span></label>
              <input type="text" value={nick} onChange={e => setNick(e.target.value)}
                placeholder="显示名称，默认用用户名" maxLength={16}
                className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="至少 4 位"
              className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition" />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? '处理中...' : mode === 'login' ? '登录' : mode === 'register' ? '注册并进入' : '重置密码'}
        </button>
        {mode === 'login' && (
          <p className="text-[11px] text-center">
            <button type="button" onClick={() => setMode('reset')}
              className="text-brand-500 hover:underline">忘记密码？</button>
          </p>
        )}
        {mode === 'reset' && (
          <p className="text-[11px] text-center">
            <button type="button" onClick={() => setMode('login')}
              className="text-brand-500 hover:underline">返回登录</button>
          </p>
        )}
      </form>
    </div>
  );
}

function MessageBubble({ msg, revoked, onContextMenu }: { msg: ChatMessage; revoked?: boolean; onContextMenu?: (e: React.MouseEvent) => void }) {
  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] px-3 py-1 rounded-full bg-surface-100 text-surface-400">
          {msg.content}
        </span>
      </div>
    );
  }

  if (revoked) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] px-3 py-1 rounded-full bg-surface-100 text-surface-400">
          {msg.isSelf ? '你撤回了一条消息' : `${msg.nick || msg.from} 撤回了一条消息`}
        </span>
      </div>
    );
  }

  const isSelf = msg.isSelf;

  return (
    <div className={cn('flex gap-2.5 mb-3', isSelf ? 'flex-row-reverse' : 'flex-row')}
      onContextMenu={onContextMenu}>
      {!isSelf && (
        <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          {(msg.nick || msg.from).slice(0, 1)}
        </div>
      )}
      <div className={cn('max-w-[70%] min-w-0', isSelf ? 'items-end' : 'items-start')}>
        {!isSelf && (
          <p className="text-[11px] text-surface-400 mb-1 px-1">{msg.nick || msg.from}</p>
        )}
        <div className={cn(
          'rounded-2xl text-sm leading-relaxed overflow-hidden',
          isSelf
            ? 'bg-brand-500 text-white rounded-br-md'
            : 'bg-white border border-surface-100 text-surface-800 rounded-bl-md',
        )}>
          {msg.type === 'text' && (
            <div className="px-3.5 py-2.5 whitespace-pre-wrap break-words">{msg.content}</div>
          )}
          {msg.type === 'image' && msg.imageUrl && (
            <div className="p-1.5">
              <img src={msg.imageUrl} alt="图片" className="max-w-[280px] max-h-[200px] rounded-xl object-cover cursor-pointer"
                onClick={() => window.open(msg.imageUrl, '_blank')} />
            </div>
          )}
          {msg.type === 'file' && (
            <div className="px-3.5 py-2.5">
              <a href={msg.fileUrl} target="_blank" rel="noreferrer"
                className={cn('flex items-center gap-2 underline-offset-2 hover:underline',
                  isSelf ? 'text-white/90' : 'text-brand-600')}>
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate">{msg.fileName}</span>
                {msg.fileSize ? <span className="text-xs opacity-60 shrink-0">({formatFileSize(msg.fileSize)})</span> : null}
              </a>
            </div>
          )}
        </div>
        <p className={cn('text-[10px] text-surface-400 mt-1 px-1', isSelf && 'text-right')}>
          {new Date(msg.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

function OnlinePanel({ members, selfID }: { members: ChatUser[]; selfID: string }) {
  return (
    <div className="w-48 border-l border-surface-100 bg-surface-50 flex flex-col shrink-0">
      <div className="px-3 py-2.5 border-b border-surface-100 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 text-surface-400" />
        <span className="text-xs font-semibold text-surface-600">成员 ({members.length})</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {members.map(m => (
          <div key={m.userID} className={cn(
            'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs',
            m.userID === selfID ? 'bg-brand-50 text-brand-700' : 'text-surface-600 hover:bg-surface-100',
          )}>
            <div className="w-6 h-6 rounded-md bg-brand-100 text-brand-600 flex items-center justify-center text-[10px] font-bold shrink-0">
              {(m.nick || m.userID).slice(0, 1)}
            </div>
            <span className="truncate">{m.nick || m.userID}</span>
            {m.userID === selfID && <span className="text-[10px] text-brand-400 shrink-0">(我)</span>}
          </div>
        ))}
        {members.length === 0 && <p className="text-xs text-surface-400 text-center py-4">暂无成员</p>}
      </div>
    </div>
  );
}

/* ───── Main Page ───── */

export default function ChatRoom() {
  const store = useChatStore();
  const [inputText, setInputText] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showNickEdit, setShowNickEdit] = useState(false);
  const [editNick, setEditNick] = useState('');
  const [showPwdEdit, setShowPwdEdit] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: ChatMessage } | null>(null);
  const [revokedIds, setRevokedIds] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);
  const nextMsgIDRef = useRef<string | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const atBottomRef = useRef(true);
  const unsubMsgRef = useRef<(() => void) | null>(null);
  const unsubReadyRef = useRef<(() => void) | null>(null);
  const unsubKickRef = useRef<(() => void) | null>(null);
  const unsubRevokeRef = useRef<(() => void) | null>(null);
  const loginDoneRef = useRef(false);
  const sdkMessagesRef = useRef<Map<string, any>>(new Map());
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentRoomId = store.currentRoomId;
  const messages = currentRoomId ? (store.messages[currentRoomId] || []) : [];

  /* auto-scroll */
  const scrollToBottom = useCallback((force?: boolean) => {
    if (!listRef.current) return;
    if (force || atBottomRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    atBottomRef.current = scrollHeight - scrollTop - clientHeight < 80;
  }, []);

  /* login */
  const handleLogin = useCallback(async (userID: string, nick: string) => {
    store.setConnStatus('connecting');
    // 将 deviceID 追加到 IM userID，防止不同设备注册相同用户名导致身份冲突
    // 如果 userID 已包含 deviceID 后缀（自动登录场景），则不再追加
    const devSuffix = '_' + store.deviceID.slice(4, 10);
    const imUserID = userID.endsWith(devSuffix) ? userID : userID + devSuffix;

    // 如果当前已登录其他用户，先登出
    const currentUserID = store.selfUserID;
    if (currentUserID && currentUserID !== imUserID) {
      console.log('[Chat] Logging out previous user:', currentUserID);
      await logoutIM();
    }

    store.setSelfUserID(imUserID);
    store.setSelfNick(nick);

    if (!SDK_APP_ID) {
      toast.error('聊天服务未初始化，请重新打开应用');
      store.setConnStatus('error');
      return;
    }

    // UserSig 生成可能因云函数冷启动失败，重试一次
    let userSig = await generateUserSig(imUserID);
    console.log('[Chat] Generated UserSig for', imUserID, userSig ? 'success' : 'failed');
    if (!userSig) {
      await new Promise(r => setTimeout(r, 2000));
      userSig = await generateUserSig(imUserID);
    }
    if (!userSig) {
      toast.error('连接聊天服务失败，请稍后重试');
      store.setConnStatus('error');
      return;
    }

    try {
      try {
        await loginIM(imUserID, userSig);
      } catch (loginErr: any) {
        if (!String(loginErr?.message || loginErr).includes('重复登录')) {
          throw loginErr;
        }
      }

      store.setConnStatus('connected');
      toast.success('连接成功');

      // UserSig 自动续期（每 6 小时刷新一次，24 小时过期）
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = setInterval(async () => {
        try {
          const newSig = await generateUserSig(imUserID);
          if (newSig) {
            try { await loginIM(imUserID, newSig); } catch (e: any) {
              if (!String(e?.message || e).includes('重复登录')) throw e;
            }
          }
        } catch {}
      }, 6 * 60 * 60 * 1000);

      // 设置昵称（让其他人看到你的名字而不是 userID）
      setMyProfile(nick);

      // init listeners
      unsubMsgRef.current = onMessageReceived((msgs: any[]) => {
        const selfID = useChatStore.getState().selfUserID;
        const groupMsgs = msgs.filter((m: any) => m.conversationType === TencentCloudChat.TYPES.CONV_GROUP);
        // 存储 SDK 原始消息对象（用于撤回）
        for (const m of groupMsgs) {
          if (m.ID) sdkMessagesRef.current.set(m.ID, m);
        }
        // 按 roomId 分组路由消息，而不是全部塞到一个频道
        const msgsByRoom = new Map<string, any[]>();
        for (const m of groupMsgs) {
          const roomId = m.to; // SDK 消息的 to 字段就是群组 ID
          if (!roomId) continue;
          if (!msgsByRoom.has(roomId)) msgsByRoom.set(roomId, []);
          msgsByRoom.get(roomId)!.push(m);
        }
        for (const [roomId, roomMsgs] of msgsByRoom) {
          const chatMsgs = roomMsgs.map((m: any) => toChatMessage(m, selfID));
          useChatStore.getState().addMessages(roomId, chatMsgs);
        }
        setTimeout(() => scrollToBottom(true), 50);
      });

      unsubRevokeRef.current = onMessageRevoked((revokedList: any[]) => {
        setRevokedIds(prev => {
          const next = new Set(prev);
          for (const item of revokedList) {
            if (item.ID) next.add(item.ID);
          }
          return next;
        });
      });

      unsubReadyRef.current = onReady(() => {
        useChatStore.getState().setConnStatus('connected');
      });

      unsubKickRef.current = onKickedOut(() => {
        toast.error('您已在其他设备登录');
        useChatStore.getState().setConnStatus('idle');
      });

      await initPresetRooms();
      if (!useChatStore.getState().currentRoomId) {
        useChatStore.getState().setCurrentRoomId(PRESET_ROOMS[0].id);
      }
    } catch (err: any) {
      console.error('login failed', err);
      toast.error('连接失败: ' + (err.message || err.code || '未知错误'));
      store.setConnStatus('error');
    }
  }, [store, scrollToBottom]);

  /* auto-login on mount */
  useEffect(() => {
    if (store.selfUserID && store.selfNick && store.connStatus === 'idle' && !loginDoneRef.current) {
      loginDoneRef.current = true;
      handleLogin(store.selfUserID, store.selfNick);
    }
    return () => {
      unsubMsgRef.current?.();
      unsubReadyRef.current?.();
      unsubKickRef.current?.();
      unsubRevokeRef.current?.();
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* load messages on room switch */
  useEffect(() => {
    if (!currentRoomId || store.connStatus !== 'connected') return;

    const roomMessages = store.messages[currentRoomId];
    if (roomMessages && roomMessages.length > 0) return;

    let cancelled = false;
    (async () => {
      setLoadingHistory(true);
      try {
        try {
          await joinGroup(currentRoomId);
          // joined group
        } catch (joinErr: any) {
          console.warn('[Chat] joinGroup:', joinErr?.message || joinErr);
        }
        const convID = `GROUP${currentRoomId}`;
        const { messages: hist, nextReqMessageID, isCompleted } = await fetchHistory(convID);
        if (cancelled) return;
        const selfID = useChatStore.getState().selfUserID;
        // 存储 SDK 原始消息（用于撤回）
        for (const m of hist) {
          if (m.ID) sdkMessagesRef.current.set(m.ID, m);
        }
        const chatMsgs = hist.map((m: any) => toChatMessage(m, selfID));
        chatMsgs.reverse();
        nextMsgIDRef.current = nextReqMessageID;
        setHasMore(!isCompleted);
        // 标记已撤回的消息
        const revoked = new Set(revokedIds);
        for (const m of hist) {
          if (m.isRevoked && m.ID) revoked.add(m.ID);
        }
        if (revoked.size > revokedIds.size) setRevokedIds(revoked);
        useChatStore.getState().addMessages(currentRoomId, chatMsgs);
        setTimeout(() => scrollToBottom(true), 100);
      } catch (err) {
        console.error('load history failed', err);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();

    loadMembers(currentRoomId);
    return () => { cancelled = true; };
  }, [currentRoomId, store.connStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  /* load older messages */
  const loadOlder = useCallback(async () => {
    if (!currentRoomId || !nextMsgIDRef.current || !hasMore) return;
    setLoadingHistory(true);
    try {
      const convID = `GROUP${currentRoomId}`;
      const { messages: hist, nextReqMessageID, isCompleted } = await fetchHistory(convID, nextMsgIDRef.current);
      const selfID = useChatStore.getState().selfUserID;
      for (const m of hist) {
        if (m.ID) sdkMessagesRef.current.set(m.ID, m);
      }
      const chatMsgs = hist.map((m: any) => toChatMessage(m, selfID));
      chatMsgs.reverse();
      nextMsgIDRef.current = nextReqMessageID;
      setHasMore(!isCompleted);
      useChatStore.getState().prependMessages(currentRoomId, chatMsgs);
    } catch (err) {
      console.error('load older failed', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [currentRoomId, hasMore]);

  /* load members */
  const loadMembers = useCallback(async (groupID: string) => {
    try {
      const list = await fetchGroupMembers(groupID);
      const users: ChatUser[] = list.map((m: any) => ({
        userID: m.userID,
        nick: m.nick || m.userID,
        avatar: '',
        joinTime: m.joinTime || 0,
      }));
      store.setMembers(users);
    } catch {}
  }, [store]);

  /* send text */
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !currentRoomId || sending) return;
    setInputText('');
    setSending(true);
    try {
      const result = await sendTextMessage(currentRoomId, text);
      // 发送成功后，用 SDK 返回的真实消息对象添加到列表
      const sentMsg = result?.data?.message;
      if (sentMsg) {
        sdkMessagesRef.current.set(sentMsg.ID, sentMsg);
        const chatMsg = toChatMessage(sentMsg, store.selfUserID);
        store.addMessages(currentRoomId, [chatMsg]);
        setTimeout(() => scrollToBottom(true), 50);
      }
    } catch (err: any) {
      toast.error('发送失败: ' + (err.message || '未知错误'));
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [inputText, currentRoomId, sending, store, scrollToBottom]);

  /* send file/image */
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file || !currentRoomId) return;
    e.target.value = '';
    if (file.size > 10 * 1024 * 1024) { toast.error('文件不能超过 10MB'); return; }
    const toastID = toast.loading(type === 'image' ? '上传图片中...' : '上传文件中...');
    try {
      let result;
      if (type === 'image') {
        result = await sendImageMessage(currentRoomId, file);
      } else {
        result = await sendFileMessage(currentRoomId, file);
      }
      const sentMsg = result?.data?.message;
      if (sentMsg) {
        sdkMessagesRef.current.set(sentMsg.ID, sentMsg);
        const chatMsg = toChatMessage(sentMsg, store.selfUserID);
        store.addMessages(currentRoomId, [chatMsg]);
        setTimeout(() => scrollToBottom(true), 50);
      }
      toast.success('发送成功', { id: toastID });
    } catch (err: any) {
      toast.error('上传失败: ' + (err.message || '未知错误'), { id: toastID });
    }
  }, [currentRoomId, store, scrollToBottom]);

  /* recall message */
  const handleRecall = useCallback(async (msg: ChatMessage) => {
    // handleRecall
    if (!currentRoomId || !msg.isSelf) return;
    const sdkMsg = sdkMessagesRef.current.get(msg.id);
    // sdkMsg found
    if (!sdkMsg) { toast.error('无法撤回此消息'); return; }
    try {
      await revokeMessage(sdkMsg);
      setRevokedIds(prev => new Set(prev).add(msg.id));
      toast.success('已撤回');
    } catch (err: any) {
      toast.error('撤回失败: ' + (err?.message || '可能已超过撤回时限'));
    }
    setContextMenu(null);
  }, [currentRoomId]);

  /* context menu */
  const handleContextMenu = useCallback((e: React.MouseEvent, msg: ChatMessage) => {
    if (!msg.isSelf || msg.type === 'system') return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, msg });
  }, []);

  /* close context menu on click outside */
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  /* handle Enter key */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  /* change nickname */
  const handleChangeNick = useCallback(() => {
    setEditNick(store.selfNick);
    setShowNickEdit(true);
  }, [store]);

  const handleSaveNick = useCallback(() => {
    const nick = editNick.trim();
    if (nick.length < 2 || nick.length > 16) { toast.error('昵称 2-16 个字符'); return; }
    store.setSelfNick(nick);
    setMyProfile(nick);
    setShowNickEdit(false);
    toast.success('昵称已更新');
  }, [editNick, store]);

  /* change password */
  const handleChangePwd = useCallback(() => {
    setOldPwd(''); setNewPwd(''); setConfirmPwd('');
    setShowPwdEdit(true);
  }, []);

  const handleSavePwd = useCallback(async () => {
    if (!oldPwd || !newPwd) { toast.error('请填写完整'); return; }
    if (newPwd.length < 4) { toast.error('新密码至少 4 位'); return; }
    if (newPwd !== confirmPwd) { toast.error('两次密码不一致'); return; }
    const users = getStoredUsers();
    // selfUserID 是带设备后缀的，需要提取原始用户名查找
    const username = extractUsername(store.selfUserID);
    const user = users[username];
    if (!user) { toast.error('用户不存在'); return; }
    const oldHash = await hashPassword(oldPwd);
    if (oldHash !== user.passwordHash) { toast.error('原密码错误'); return; }
    const newHash = await hashPassword(newPwd);
    user.passwordHash = newHash;
    saveUser(user);
    setShowPwdEdit(false);
    toast.success('密码已修改');
  }, [oldPwd, newPwd, confirmPwd, store.selfUserID]);

  /* logout - only clear session, keep registered accounts */
  const handleLogout = useCallback(async () => {
    // 先登出腾讯 IM SDK
    await logoutIM();
    unsubMsgRef.current?.();
    unsubReadyRef.current?.();
    unsubKickRef.current?.();
    unsubRevokeRef.current?.();
    localStorage.removeItem('chat_user_id');
    localStorage.removeItem('chat_nick');
    store.setConnStatus('idle');
    store.setCurrentRoomId(null);
    store.setSelfUserID('');
    store.setSelfNick('');
    store.setMembers([]);
    loginDoneRef.current = false;
    PRESET_ROOMS.forEach(r => store.clearMessages(r.id));
    sdkMessagesRef.current.clear();
  }, [store]);

  /* ── render ── */

  if (store.connStatus === 'idle' || store.connStatus === 'error') {
    return <LoginForm onLogin={handleLogin} />;
  }

  if (store.connStatus === 'connecting') {
    return (
      <div className="flex items-center justify-center h-full bg-surface-0">
        <div className="flex flex-col items-center gap-3 text-surface-500">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <p className="text-sm">正在连接...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-surface-0">
      {/* left: room list */}
      <div className="w-52 border-r border-surface-100 flex flex-col shrink-0 bg-white">
        <div className="px-3.5 py-3 border-b border-surface-100">
          <h2 className="text-sm font-bold text-surface-800 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-brand-500" />
            聊天室
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {PRESET_ROOMS.map(room => {
            const isActive = currentRoomId === room.id;
            return (
              <button key={room.id}
                onClick={() => store.setCurrentRoomId(room.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-xl transition-all text-sm',
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-surface-600 hover:bg-surface-50',
                )}>
                <div className="font-medium truncate">{room.name}</div>
                <div className={cn('text-[11px] truncate mt-0.5', isActive ? 'text-brand-400' : 'text-surface-400')}>
                  {room.desc}
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-2 border-t border-surface-100">
          <button onClick={handleChangeNick}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-surface-400 hover:text-brand-500 hover:bg-brand-50 transition">
            <Settings2 className="w-3.5 h-3.5" />
            修改昵称
          </button>
          <button onClick={handleChangePwd}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-surface-400 hover:text-brand-500 hover:bg-brand-50 transition">
            <Settings2 className="w-3.5 h-3.5" />
            修改密码
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-surface-400 hover:text-red-500 hover:bg-red-50 transition">
            <LogOut className="w-3.5 h-3.5" />
            退出登录
          </button>
        </div>
      </div>

      {/* center: chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-surface-100 bg-white shrink-0">
          <div>
            <span className="text-sm font-bold text-surface-800">
              {PRESET_ROOMS.find(r => r.id === currentRoomId)?.name || ''}
            </span>
            <span className="text-xs text-surface-400 ml-2">{store.selfNick}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { if (currentRoomId) loadMembers(currentRoomId); }}
              className="p-2 rounded-lg hover:bg-surface-50 text-surface-400 hover:text-surface-600 transition"
              title="刷新成员列表">
              <Users className="w-4 h-4" />
            </button>
            <button onClick={() => setShowMembers(!showMembers)}
              className={cn('p-2 rounded-lg transition',
                showMembers ? 'bg-brand-50 text-brand-600' : 'text-surface-400 hover:bg-surface-50 hover:text-surface-600')}
              title="显示/隐藏成员">
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* messages */}
        <div ref={listRef} onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 py-3 bg-surface-0/50"
          style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(0,0,0,0.015) 39px, rgba(0,0,0,0.015) 40px)' }}>
          {hasMore && messages.length > 0 && (
            <div className="flex justify-center mb-3">
              <button onClick={loadOlder} disabled={loadingHistory}
                className="text-xs px-3 py-1 rounded-full bg-surface-100 text-surface-500 hover:bg-surface-200 transition disabled:opacity-50">
                {loadingHistory ? '加载中...' : '加载更早消息'}
              </button>
            </div>
          )}
          {loadingHistory && messages.length === 0 && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
            </div>
          )}
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg}
              revoked={revokedIds.has(msg.id)}
              onContextMenu={msg.isSelf ? (e) => handleContextMenu(e, msg) : undefined} />
          ))}
          {!loadingHistory && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-surface-400">
              <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">暂无消息</p>
              <p className="text-xs mt-1">发送第一条消息开始交流吧</p>
            </div>
          )}
        </div>

        {/* input */}
        <div className="px-4 py-3 border-t border-surface-100 bg-white shrink-0">
          <div className="flex items-end gap-2">
            <input ref={imageRef} type="file" accept="image/*" className="hidden"
              onChange={e => handleFileUpload(e, 'image')} />
            <input ref={fileRef} type="file" className="hidden"
              onChange={e => handleFileUpload(e, 'file')} />
            <button onClick={() => imageRef.current?.click()}
              className="p-2.5 rounded-xl text-surface-400 hover:text-brand-500 hover:bg-brand-50 transition shrink-0"
              title="发送图片">
              <ImageIcon className="w-[18px] h-[18px]" />
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="p-2.5 rounded-xl text-surface-400 hover:text-brand-500 hover:bg-brand-50 transition shrink-0"
              title="发送文件">
              <FileText className="w-[18px] h-[18px]" />
            </button>
            <textarea value={inputText} onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown} rows={1} placeholder="输入消息..."
              className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-0 text-sm
                         resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition
                         max-h-24 overflow-y-auto"
              style={{ fieldSizing: 'content' } as React.CSSProperties} />
            <button onClick={handleSend} disabled={!inputText.trim() || sending}
              className="p-2.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition disabled:opacity-40 shrink-0">
              <Send className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* right: members panel */}
      {showMembers && <OnlinePanel members={store.members} selfID={store.selfUserID} />}

      {/* context menu */}
      {contextMenu && (
        <div className="fixed z-50 bg-white rounded-xl shadow-elevated border border-surface-100 py-1 min-w-[100px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button onClick={() => handleRecall(contextMenu.msg)}
            className="w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 transition">
            撤回
          </button>
        </div>
      )}

      {/* password change dialog */}
      {showPwdEdit && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowPwdEdit(false)}>
          <div className="bg-white rounded-2xl p-6 w-80 shadow-elevated" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-surface-800 mb-4">修改密码</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-surface-500 mb-1">原密码</label>
                <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              </div>
              <div>
                <label className="block text-xs text-surface-500 mb-1">新密码</label>
                <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              </div>
              <div>
                <label className="block text-xs text-surface-500 mb-1">确认新密码</label>
                <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSavePwd()}
                  className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowPwdEdit(false)}
                className="px-4 py-1.5 rounded-lg text-sm text-surface-500 hover:bg-surface-50">取消</button>
              <button onClick={handleSavePwd}
                className="px-4 py-1.5 rounded-lg text-sm bg-brand-500 text-white hover:bg-brand-600">确认</button>
            </div>
          </div>
        </div>
      )}

      {/* nickname edit dialog */}
      {showNickEdit && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowNickEdit(false)}>
          <div className="bg-white rounded-2xl p-6 w-80 shadow-elevated" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-surface-800 mb-3">修改昵称</h3>
            <input value={editNick} onChange={e => setEditNick(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveNick()}
              maxLength={16} autoFocus
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowNickEdit(false)}
                className="px-4 py-1.5 rounded-lg text-sm text-surface-500 hover:bg-surface-50">取消</button>
              <button onClick={handleSaveNick}
                className="px-4 py-1.5 rounded-lg text-sm bg-brand-500 text-white hover:bg-brand-600">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
