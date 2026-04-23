// ==================== 错题本 ====================
export interface Question {
  id: number;
  type: '行测-言语理解' | '行测-数量关系' | '行测-判断推理' | '行测-资料分析' | '行测-常识判断' | '申论';
  content: string;
  options?: string; // JSON 字符串，如 '["A.选项1","B.选项2","C.选项3","D.选项4"]'
  answer: string;
  explanation: string;
  tags: string; // 逗号分隔的标签
  created_at: string;
}

export interface WrongRecord {
  id: number;
  question_id: number;
  my_answer: string;
  wrong_count: number;
  last_wrong_at: string;
  mastered: number; // 0 未掌握, 1 已掌握
  review_count: number;
  next_review_at: string; // 间隔复习计划
  note: string; // 个人笔记
  created_at: string;
  // 关联数据
  question?: Question;
}

// ==================== 思维导图 ====================
export interface MindMapNode {
  id: string;
  topic: string;
  children?: MindMapNode[];
}

export interface MindMapData {
  id: number;
  title: string;
  subject: string; // 行测/申论/面试
  data: string; // JSON 序列化的 MindMapNode
  created_at: string;
  updated_at: string;
}

// ==================== 学习计划 ====================
export type PlanStatus = 'pending' | 'in_progress' | 'completed';
export type PlanPriority = 'low' | 'medium' | 'high';

export interface StudyPlan {
  id: number;
  title: string;
  subject: string;
  target_date: string;
  priority: PlanPriority;
  status: PlanStatus;
  description: string;
  daily_minutes: number; // 每日计划学习时长(分钟)
  created_at: string;
  updated_at: string;
}

export interface DailyRecord {
  id: number;
  date: string; // YYYY-MM-DD
  study_minutes: number;
  questions_done: number;
  wrong_count: number;
  plan_id?: number;
  note: string;
  created_at: string;
}

// ==================== 鼓励系统 ====================
export interface Achievement {
  id: number;
  type: 'streak' | 'questions' | 'study_time' | 'mastered' | 'flashcard' | 'flashcard_master' | 'pomodoro' | 'checkin';
  title: string;
  description: string;
  icon: string;
  threshold: number;
  unlocked_at: string | null;
  progress?: number;
}

export interface EncourageQuote {
  id: number;
  content: string;
  author: string;
  category: 'perseverance' | 'confidence' | 'method' | 'wisdom';
}

// ==================== IPC 通道类型 ====================
export const IPC_CHANNELS = {
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
} as const;
