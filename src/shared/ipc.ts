/**
 * 统一的 IPC 通道定义
 * 使用简单的命名空间:方法格式，避免 asar 打包问题
 */
export const IPC = {
  // 题目
  QUESTION_ADD: 'question:add',
  QUESTION_GET_ALL: 'question:get-all',
  QUESTION_GET_BY_ID: 'question:get-by-id',
  QUESTION_UPDATE: 'question:update',
  QUESTION_DELETE: 'question:delete',

  // 错题本
  WRONG_BOOK_ADD: 'wrong-book:add',
  WRONG_BOOK_GET_ALL: 'wrong-book:get-all',
  WRONG_BOOK_GET_BY_ID: 'wrong-book:get-by-id',
  WRONG_BOOK_UPDATE: 'wrong-book:update',
  WRONG_BOOK_DELETE: 'wrong-book:delete',
  WRONG_BOOK_MARK_MASTERED: 'wrong-book:mark-mastered',
  WRONG_BOOK_GET_DUE_REVIEW: 'wrong-book:get-due-review',
  WRONG_BOOK_ANALYZE: 'wrong-book:analyze',

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

  // 考试配置
  EXAM_CONFIG_GET: 'exam-config:get',
  EXAM_CONFIG_SET: 'exam-config:set',

  // 番茄钟
  POMODORO_RECORD_ADD: 'pomodoro:add',
  POMODORO_RECORD_GET_BY_DATE: 'pomodoro:get-by-date',
  POMODORO_RECORD_GET_RANGE: 'pomodoro:get-range',

  // 鼓励语录
  ENCOURAGE_GET_RANDOM: 'encourage:get-random',
  REVIEW_SESSION_GET: 'review-session:get',
  REVIEW_SESSION_SET: 'review-session:set',
  REVIEW_SESSION_GET_RECENT: 'review-session:get-recent',
  RECOMMENDATION_EVENT_ADD: 'recommendation-event:add',
  RECOMMENDATION_EVENT_GET_RECENT: 'recommendation-event:get-recent',

  // 数据导入导出
  DATA_EXPORT: 'data:export',
  DATA_IMPORT: 'data:import',

  // 聊天室
  CHAT_GENERATE_USER_SIG: 'chat:generate-user-sig',

  // RAG 知识库
  RAG_DOC_ADD: 'rag:doc:add',
  RAG_DOC_GET_ALL: 'rag:doc:get-all',
  RAG_DOC_GET_BY_ID: 'rag:doc:get-by-id',
  RAG_DOC_UPDATE: 'rag:doc:update',
  RAG_DOC_DELETE: 'rag:doc:delete',
  RAG_SYNC_QUESTIONS: 'rag:sync-questions',
  RAG_SEARCH: 'rag:search',
  RAG_EMBED_DOC: 'rag:embed-doc',
  RAG_CONFIG_GET: 'rag:config:get',
  RAG_CONFIG_SET: 'rag:config:set',
  RAG_SESSION_CREATE: 'rag:session:create',
  RAG_SESSION_GET_ALL: 'rag:session:get-all',
  RAG_SESSION_GET: 'rag:session:get',
  RAG_SESSION_DELETE: 'rag:session:delete',
  RAG_SESSION_ADD_MESSAGE: 'rag:session:add-message',
  RAG_SESSION_GET_MESSAGES: 'rag:session:get-messages',
  RAG_CHAT: 'rag:chat',
  RAG_STREAM_CHUNK: 'rag:stream-chunk',
  RAG_STREAM_END: 'rag:stream-end',
  RAG_IMPORT_PDFS: 'rag:import-pdfs',
  RAG_DOC_DELETE_BATCH: 'rag:doc:delete-batch',
  RAG_CHROMA_STATUS: 'rag:chroma-status',
  RAG_CHROMA_MIGRATE: 'rag:chroma-migrate',
  RAG_AI_RECOMMEND: 'rag:ai-recommend',

  // 自动更新
  UPDATE_CHECKING: 'update:checking',
  UPDATE_AVAILABLE: 'update:available',
  UPDATE_NOT_AVAILABLE: 'update:not-available',
  UPDATE_DOWNLOAD_PROGRESS: 'update:download-progress',
  UPDATE_DOWNLOADED: 'update:downloaded',
  UPDATE_ERROR: 'update:error',
  UPDATE_CHECK: 'update:check',
  UPDATE_DOWNLOAD: 'update:download',
  UPDATE_INSTALL: 'update:install',
} as const;

export type IpcChannel = typeof IPC[keyof typeof IPC];
export type Unsubscribe = () => void;

// API 类型定义（用于 preload 暴露）
export interface Api {
  question: {
    add: (q: any) => Promise<any>;
    getAll: (filters?: any) => Promise<any[]>;
    getById: (id: number) => Promise<any>;
    update: (q: any) => Promise<any>;
    delete: (id: number) => Promise<{ success: boolean }>;
  };
  wrongBook: {
    add: (record: any) => Promise<any>;
    getAll: (filters?: any) => Promise<any[]>;
    getById: (id: number) => Promise<any>;
    update: (record: any) => Promise<any>;
    delete: (id: number) => Promise<{ success: boolean }>;
    markMastered: (id: number) => Promise<{ success: boolean }>;
    getDueReview: () => Promise<any[]>;
    analyze: (recordId: number) => Promise<{ analysis: string }>;
  };
  mindMap: {
    save: (data: any) => Promise<any>;
    getAll: () => Promise<any[]>;
    getById: (id: number) => Promise<any>;
    delete: (id: number) => Promise<{ success: boolean }>;
  };
  studyPlan: {
    add: (plan: any) => Promise<any>;
    getAll: () => Promise<any[]>;
    update: (plan: any) => Promise<any>;
    delete: (id: number) => Promise<{ success: boolean }>;
  };
  dailyRecord: {
    add: (record: any) => Promise<any>;
    getByDate: (date: string) => Promise<any>;
    getRange: (start: string, end: string) => Promise<any[]>;
    getStats: (days: number) => Promise<any>;
  };
  achievement: {
    getAll: () => Promise<any[]>;
    check: () => Promise<any[]>;
  };
  flashcard: {
    add: (card: any) => Promise<any>;
    getAll: (filters?: any) => Promise<any[]>;
    update: (card: any) => Promise<any>;
    delete: (id: number) => Promise<{ success: boolean }>;
  };
  examConfig: {
    get: () => Promise<any>;
    set: (config: any) => Promise<any>;
  };
  pomodoroRecord: {
    add: (record: any) => Promise<any>;
    getByDate: (date: string) => Promise<any[]>;
    getRange: (start: string, end: string) => Promise<any[]>;
  };
  encourage: {
    getRandom: (category?: string) => Promise<any>;
  };
  reviewSession: {
    get: (date: string) => Promise<any>;
    set: (session: any) => Promise<any>;
    getRecent: (days: number) => Promise<any[]>;
  };
  recommendationEvent: {
    add: (event: any) => Promise<{ success: boolean }>;
    getRecent: (days: number) => Promise<any[]>;
  };
  data: {
    export: () => Promise<any>;
    import: () => Promise<any>;
  };
  chat: {
    generateUserSig: (userID: string) => Promise<string>;
  };
  rag: {
    docAdd: (doc: any) => Promise<any>;
    docGetAll: () => Promise<any[]>;
    docGetById: (id: number) => Promise<any>;
    docUpdate: (doc: any) => Promise<any>;
    docDelete: (id: number) => Promise<{ success: boolean }>;
    syncQuestions: () => Promise<{ synced: number }>;
    search: (query: string, topK?: number) => Promise<any[]>;
    embedDoc: (id: number) => Promise<{ success: boolean }>;
    configGet: () => Promise<any>;
    configSet: (config: any) => Promise<{ success: boolean }>;
    sessionCreate: (title?: string) => Promise<any>;
    sessionGetAll: () => Promise<any[]>;
    sessionGet: (id: number) => Promise<any>;
    sessionDelete: (id: number) => Promise<{ success: boolean }>;
    sessionAddMessage: (msg: any) => Promise<any>;
    sessionGetMessages: (sessionId: number) => Promise<any[]>;
    chat: (sessionId: number, message: string) => Promise<any>;
    onStreamChunk: (cb: (chunk: string) => void) => Unsubscribe;
    onStreamEnd: (cb: () => void) => Unsubscribe;
    importPdfs: (dirPath: string) => Promise<{ imported: number; skipped: number; errors: number }>;
    docDeleteBatch: (ids: number[]) => Promise<{ deleted: number }>;
    chromaStatus: () => Promise<{ running: boolean; port: number; host: string; dataDir: string }>;
    chromaMigrate: () => Promise<{ migrated: number; failed: number }>;
    aiRecommend: () => Promise<{ recommendations: string }>;
  };
  update: {
    check: () => Promise<void>;
    download: () => Promise<void>;
    install: () => void;
    onChecking: (cb: () => void) => Unsubscribe;
    onAvailable: (cb: (info: any) => void) => Unsubscribe;
    onNotAvailable: (cb: (info: any) => void) => Unsubscribe;
    onProgress: (cb: (progress: any) => void) => Unsubscribe;
    onDownloaded: (cb: (info: any) => void) => Unsubscribe;
    onError: (cb: (message: string) => void) => Unsubscribe;
  };
}
