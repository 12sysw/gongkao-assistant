import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  from: string;
  nick?: string;
  avatar?: string;
  type: 'text' | 'image' | 'file' | 'system';
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  imageUrl?: string;
  time: number;
  isSelf: boolean;
}

export interface ChatUser {
  userID: string;
  nick: string;
  avatar: string;
  joinTime: number;
}

export type ConnStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface ChatState {
  connStatus: ConnStatus;
  setConnStatus: (s: ConnStatus) => void;
  currentRoomId: string | null;
  setCurrentRoomId: (id: string | null) => void;
  messages: Record<string, ChatMessage[]>;
  addMessages: (roomId: string, msgs: ChatMessage[]) => void;
  prependMessages: (roomId: string, msgs: ChatMessage[]) => void;
  clearMessages: (roomId: string) => void;
  members: ChatUser[];
  setMembers: (users: ChatUser[]) => void;
  deviceID: string;
  selfUserID: string;
  setSelfUserID: (id: string) => void;
  selfNick: string;
  setSelfNick: (nick: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  connStatus: 'idle',
  setConnStatus: (connStatus) => set({ connStatus }),

  currentRoomId: null,
  setCurrentRoomId: (currentRoomId) => set({ currentRoomId }),

  messages: {},
  addMessages: (roomId, msgs) =>
    set((s) => {
      const prev = s.messages[roomId] || [];
      const existingIds = new Set(prev.map((m) => m.id));
      const newMsgs = msgs.filter((m) => !existingIds.has(m.id));
      if (newMsgs.length === 0) return s;
      // 限制每个房间最多保留 200 条消息，防止内存无限增长
      const combined = [...prev, ...newMsgs];
      const trimmed = combined.slice(-200);
      return { messages: { ...s.messages, [roomId]: trimmed } };
    }),
  prependMessages: (roomId, msgs) =>
    set((s) => {
      const prev = s.messages[roomId] || [];
      const existingIds = new Set(prev.map((m) => m.id));
      const newMsgs = msgs.filter((m) => !existingIds.has(m.id));
      if (newMsgs.length === 0) return s;
      // 限制每个房间最多保留 200 条消息
      const combined = [...newMsgs, ...prev];
      const trimmed = combined.slice(0, 200);
      return { messages: { ...s.messages, [roomId]: trimmed } };
    }),
  clearMessages: (roomId) =>
    set((s) => {
      const newMessages = { ...s.messages };
      delete newMessages[roomId];
      return { messages: newMessages };
    }),

  members: [],
  setMembers: (members) => set({ members }),

  // 设备绑定：首次生成后不变，每个设备只能有一个账号
  deviceID: (() => {
    let id = localStorage.getItem('chat_device_id');
    if (!id) {
      id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('chat_device_id', id);
    }
    return id;
  })(),

  selfUserID: localStorage.getItem('chat_user_id') || '',
  setSelfUserID: (id) => {
    localStorage.setItem('chat_user_id', id);
    set({ selfUserID: id });
  },

  selfNick: localStorage.getItem('chat_nick') || '',
  setSelfNick: (nick) => {
    localStorage.setItem('chat_nick', nick);
    set({ selfNick: nick });
  },
}));
