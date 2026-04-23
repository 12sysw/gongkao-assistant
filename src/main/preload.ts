import { contextBridge, ipcRenderer } from 'electron';

// 直接在 preload 中定义 IPC 通道，避免模块解析问题
const IPC_CHANNELS = {
  // 错题本
  WRONG_BOOK_ADD: 'wrong-book:add',
  WRONG_BOOK_GET_ALL: 'wrong-book:get-all',
  WRONG_BOOK_GET_BY_ID: 'wrong-book:get-by-id',
  WRONG_BOOK_UPDATE: 'wrong-book:update',
  WRONG_BOOK_DELETE: 'wrong-book:delete',
  WRONG_BOOK_MARK_MASTERED: 'wrong-book:mark-mastered',
  WRONG_BOOK_GET_DUE_REVIEW: 'wrong-book:get-due-review',

  // 题目
  QUESTION_ADD: 'question:add',
  QUESTION_GET_ALL: 'question:get-all',
  QUESTION_GET_BY_ID: 'question:get-by-id',
  QUESTION_UPDATE: 'question:update',
  QUESTION_DELETE: 'question:delete',

  // 思维导图
  MIND_MAP_SAVE: 'mind-map:save',
  MIND_MAP_GET_ALL: 'mind-map:get-all',
  MIND_MAP_GET_BY_ID: 'mind-map:get-by-id',
  MIND_MAP_DELETE: 'mind-map:delete',

  // 学习计划
  STUDY_PLAN_ADD: 'study-plan:add',
  STUDY_PLAN_GET_ALL: 'study-plan:get-all',
  STUDY_PLAN_UPDATE: 'study-plan:update',
  STUDY_PLAN_DELETE: 'study-plan:delete',

  // 每日记录
  DAILY_RECORD_ADD: 'daily-record:add',
  DAILY_RECORD_GET_BY_DATE: 'daily-record:get-by-date',
  DAILY_RECORD_GET_RANGE: 'daily-record:get-range',
  DAILY_RECORD_GET_STATS: 'daily-record:get-stats',

  // 成就
  ACHIEVEMENT_GET_ALL: 'achievement:get-all',
  ACHIEVEMENT_CHECK: 'achievement:check',

  // 记忆卡片
  FLASHCARD_ADD: 'flashcard:add',
  FLASHCARD_GET_ALL: 'flashcard:get-all',
  FLASHCARD_UPDATE: 'flashcard:update',
  FLASHCARD_DELETE: 'flashcard:delete',

  // 番茄钟记录
  POMODORO_RECORD_ADD: 'pomodoro-record:add',
  POMODORO_RECORD_GET_BY_DATE: 'pomodoro-record:get-by-date',
  POMODORO_RECORD_GET_RANGE: 'pomodoro-record:get-range',

  // 考试配置
  EXAM_CONFIG_GET: 'exam-config:get',
  EXAM_CONFIG_SET: 'exam-config:set',

  // 数据导出导入
  DATA_EXPORT: 'data:export',
  DATA_IMPORT: 'data:import',
};

const api = {
  // 错题本
  wrongBook: {
    add: (record: any) => ipcRenderer.invoke(IPC_CHANNELS.WRONG_BOOK_ADD, record),
    getAll: (filters?: any) => ipcRenderer.invoke(IPC_CHANNELS.WRONG_BOOK_GET_ALL, filters),
    getById: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.WRONG_BOOK_GET_BY_ID, id),
    update: (record: any) => ipcRenderer.invoke(IPC_CHANNELS.WRONG_BOOK_UPDATE, record),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.WRONG_BOOK_DELETE, id),
    markMastered: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.WRONG_BOOK_MARK_MASTERED, id),
    getDueReview: () => ipcRenderer.invoke(IPC_CHANNELS.WRONG_BOOK_GET_DUE_REVIEW),
  },

  // 题目
  question: {
    add: (q: any) => ipcRenderer.invoke(IPC_CHANNELS.QUESTION_ADD, q),
    getAll: (filters?: any) => ipcRenderer.invoke(IPC_CHANNELS.QUESTION_GET_ALL, filters),
    getById: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.QUESTION_GET_BY_ID, id),
    update: (q: any) => ipcRenderer.invoke(IPC_CHANNELS.QUESTION_UPDATE, q),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.QUESTION_DELETE, id),
  },

  // 思维导图
  mindMap: {
    save: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.MIND_MAP_SAVE, data),
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.MIND_MAP_GET_ALL),
    getById: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.MIND_MAP_GET_BY_ID, id),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.MIND_MAP_DELETE, id),
  },

  // 学习计划
  studyPlan: {
    add: (plan: any) => ipcRenderer.invoke(IPC_CHANNELS.STUDY_PLAN_ADD, plan),
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.STUDY_PLAN_GET_ALL),
    update: (plan: any) => ipcRenderer.invoke(IPC_CHANNELS.STUDY_PLAN_UPDATE, plan),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.STUDY_PLAN_DELETE, id),
  },

  // 每日记录
  dailyRecord: {
    add: (record: any) => ipcRenderer.invoke(IPC_CHANNELS.DAILY_RECORD_ADD, record),
    getByDate: (date: string) => ipcRenderer.invoke(IPC_CHANNELS.DAILY_RECORD_GET_BY_DATE, date),
    getRange: (start: string, end: string) => ipcRenderer.invoke(IPC_CHANNELS.DAILY_RECORD_GET_RANGE, start, end),
    getStats: (days: number) => ipcRenderer.invoke(IPC_CHANNELS.DAILY_RECORD_GET_STATS, days),
  },

  // 成就
  achievement: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.ACHIEVEMENT_GET_ALL),
    check: () => ipcRenderer.invoke(IPC_CHANNELS.ACHIEVEMENT_CHECK),
  },

  // 记忆卡片
  flashcard: {
    add: (card: any) => ipcRenderer.invoke(IPC_CHANNELS.FLASHCARD_ADD, card),
    getAll: (filters?: any) => ipcRenderer.invoke(IPC_CHANNELS.FLASHCARD_GET_ALL, filters),
    update: (card: any) => ipcRenderer.invoke(IPC_CHANNELS.FLASHCARD_UPDATE, card),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.FLASHCARD_DELETE, id),
  },

  // 考试配置
  examConfig: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.EXAM_CONFIG_GET),
    set: (config: any) => ipcRenderer.invoke(IPC_CHANNELS.EXAM_CONFIG_SET, config),
  },

  // 番茄钟记录
  pomodoroRecord: {
    add: (record: any) => ipcRenderer.invoke(IPC_CHANNELS.POMODORO_RECORD_ADD, record),
    getByDate: (date: string) => ipcRenderer.invoke(IPC_CHANNELS.POMODORO_RECORD_GET_BY_DATE, date),
    getRange: (start: string, end: string) => ipcRenderer.invoke(IPC_CHANNELS.POMODORO_RECORD_GET_RANGE, start, end),
  },

  // 数据导入导出
  data: {
    export: () => ipcRenderer.invoke(IPC_CHANNELS.DATA_EXPORT),
    import: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.DATA_IMPORT, filePath),
  },
};

contextBridge.exposeInMainWorld('api', api);
