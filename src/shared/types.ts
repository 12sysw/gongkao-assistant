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
