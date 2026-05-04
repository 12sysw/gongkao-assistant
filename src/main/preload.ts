import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc';

function onChannel<T extends unknown[]>(channel: string, listener: (...args: T) => void) {
  const wrapped = (_event: Electron.IpcRendererEvent, ...args: T) => listener(...args);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

const api = {
  question: {
    add: (q: any) => ipcRenderer.invoke(IPC.QUESTION_ADD, q),
    getAll: (filters?: any) => ipcRenderer.invoke(IPC.QUESTION_GET_ALL, filters),
    getById: (id: number) => ipcRenderer.invoke(IPC.QUESTION_GET_BY_ID, id),
    update: (q: any) => ipcRenderer.invoke(IPC.QUESTION_UPDATE, q),
    delete: (id: number) => ipcRenderer.invoke(IPC.QUESTION_DELETE, id),
  },
  wrongBook: {
    add: (record: any) => ipcRenderer.invoke(IPC.WRONG_BOOK_ADD, record),
    getAll: (filters?: any) => ipcRenderer.invoke(IPC.WRONG_BOOK_GET_ALL, filters),
    getById: (id: number) => ipcRenderer.invoke(IPC.WRONG_BOOK_GET_BY_ID, id),
    update: (record: any) => ipcRenderer.invoke(IPC.WRONG_BOOK_UPDATE, record),
    delete: (id: number) => ipcRenderer.invoke(IPC.WRONG_BOOK_DELETE, id),
    markMastered: (id: number) => ipcRenderer.invoke(IPC.WRONG_BOOK_MARK_MASTERED, id),
    getDueReview: () => ipcRenderer.invoke(IPC.WRONG_BOOK_GET_DUE_REVIEW),
  },
  mindMap: {
    save: (data: any) => ipcRenderer.invoke(IPC.MIND_MAP_SAVE, data),
    getAll: () => ipcRenderer.invoke(IPC.MIND_MAP_GET_ALL),
    getById: (id: number) => ipcRenderer.invoke(IPC.MIND_MAP_GET_BY_ID, id),
    delete: (id: number) => ipcRenderer.invoke(IPC.MIND_MAP_DELETE, id),
  },
  studyPlan: {
    add: (plan: any) => ipcRenderer.invoke(IPC.STUDY_PLAN_ADD, plan),
    getAll: () => ipcRenderer.invoke(IPC.STUDY_PLAN_GET_ALL),
    update: (plan: any) => ipcRenderer.invoke(IPC.STUDY_PLAN_UPDATE, plan),
    delete: (id: number) => ipcRenderer.invoke(IPC.STUDY_PLAN_DELETE, id),
  },
  dailyRecord: {
    add: (record: any) => ipcRenderer.invoke(IPC.DAILY_RECORD_ADD, record),
    getByDate: (date: string) => ipcRenderer.invoke(IPC.DAILY_RECORD_GET_BY_DATE, date),
    getRange: (start: string, end: string) => ipcRenderer.invoke(IPC.DAILY_RECORD_GET_RANGE, start, end),
    getStats: (days: number) => ipcRenderer.invoke(IPC.DAILY_RECORD_GET_STATS, days),
  },
  achievement: {
    getAll: () => ipcRenderer.invoke(IPC.ACHIEVEMENT_GET_ALL),
    check: () => ipcRenderer.invoke(IPC.ACHIEVEMENT_CHECK),
  },
  flashcard: {
    add: (card: any) => ipcRenderer.invoke(IPC.FLASHCARD_ADD, card),
    getAll: (filters?: any) => ipcRenderer.invoke(IPC.FLASHCARD_GET_ALL, filters),
    update: (card: any) => ipcRenderer.invoke(IPC.FLASHCARD_UPDATE, card),
    delete: (id: number) => ipcRenderer.invoke(IPC.FLASHCARD_DELETE, id),
  },
  examConfig: {
    get: () => ipcRenderer.invoke(IPC.EXAM_CONFIG_GET),
    set: (config: any) => ipcRenderer.invoke(IPC.EXAM_CONFIG_SET, config),
  },
  pomodoroRecord: {
    add: (record: any) => ipcRenderer.invoke(IPC.POMODORO_RECORD_ADD, record),
    getByDate: (date: string) => ipcRenderer.invoke(IPC.POMODORO_RECORD_GET_BY_DATE, date),
    getRange: (start: string, end: string) => ipcRenderer.invoke(IPC.POMODORO_RECORD_GET_RANGE, start, end),
  },
  encourage: {
    getRandom: (category?: string) => ipcRenderer.invoke(IPC.ENCOURAGE_GET_RANDOM, category),
  },
  reviewSession: {
    get: (date: string) => ipcRenderer.invoke(IPC.REVIEW_SESSION_GET, date),
    set: (session: any) => ipcRenderer.invoke(IPC.REVIEW_SESSION_SET, session),
    getRecent: (days: number) => ipcRenderer.invoke(IPC.REVIEW_SESSION_GET_RECENT, days),
  },
  recommendationEvent: {
    add: (event: any) => ipcRenderer.invoke(IPC.RECOMMENDATION_EVENT_ADD, event),
    getRecent: (days: number) => ipcRenderer.invoke(IPC.RECOMMENDATION_EVENT_GET_RECENT, days),
  },
  data: {
    export: () => ipcRenderer.invoke(IPC.DATA_EXPORT),
    import: () => ipcRenderer.invoke(IPC.DATA_IMPORT),
  },
  chat: {
    generateUserSig: (userID: string) => ipcRenderer.invoke(IPC.CHAT_GENERATE_USER_SIG, userID),
  },
  update: {
    check: () => ipcRenderer.invoke(IPC.UPDATE_CHECK),
    download: () => ipcRenderer.invoke(IPC.UPDATE_DOWNLOAD),
    install: () => ipcRenderer.invoke(IPC.UPDATE_INSTALL),
    onChecking: (cb: () => void) => onChannel(IPC.UPDATE_CHECKING, cb),
    onAvailable: (cb: (info: any) => void) => onChannel(IPC.UPDATE_AVAILABLE, cb),
    onNotAvailable: (cb: (info: any) => void) => onChannel(IPC.UPDATE_NOT_AVAILABLE, cb),
    onProgress: (cb: (progress: any) => void) => onChannel(IPC.UPDATE_DOWNLOAD_PROGRESS, cb),
    onDownloaded: (cb: (info: any) => void) => onChannel(IPC.UPDATE_DOWNLOADED, cb),
    onError: (cb: (message: string) => void) => onChannel(IPC.UPDATE_ERROR, cb),
  },
};

contextBridge.exposeInMainWorld('api', api);
