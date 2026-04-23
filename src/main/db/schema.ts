import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ==================== 题目 ====================
export const questions = sqliteTable('questions', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['行测-言语理解', '行测-数量关系', '行测-判断推理', '行测-资料分析', '行测-常识判断', '申论'] }).notNull(),
  content: text('content').notNull(),
  options: text('options'), // JSON 字符串
  answer: text('answer').notNull(),
  explanation: text('explanation').default(''),
  tags: text('tags').default(''),
  createdAt: text('created_at').default(sql`(datetime('now', 'localtime'))`),
});

// ==================== 错题记录 ====================
export const wrongRecords = sqliteTable('wrong_records', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  questionId: integer('question_id').notNull(),
  myAnswer: text('my_answer').notNull(),
  wrongCount: integer('wrong_count').default(1),
  lastWrongAt: text('last_wrong_at').default(sql`(datetime('now', 'localtime'))`),
  mastered: integer('mastered', { mode: 'boolean' }).default(false),
  reviewCount: integer('review_count').default(0),
  nextReviewAt: text('next_review_at').default(sql`(datetime('now', 'localtime', '+1 day'))`),
  note: text('note').default(''),
  createdAt: text('created_at').default(sql`(datetime('now', 'localtime'))`),
});

// ==================== 思维导图 ====================
export const mindMaps = sqliteTable('mind_maps', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  data: text('data').notNull().default('{}'),
  createdAt: text('created_at').default(sql`(datetime('now', 'localtime'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now', 'localtime'))`),
});

// ==================== 学习计划 ====================
export const studyPlans = sqliteTable('study_plans', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  targetDate: text('target_date').notNull(),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).default('medium'),
  status: text('status', { enum: ['pending', 'in_progress', 'completed'] }).default('pending'),
  description: text('description').default(''),
  dailyMinutes: integer('daily_minutes').default(60),
  createdAt: text('created_at').default(sql`(datetime('now', 'localtime'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now', 'localtime'))`),
});

// ==================== 每日记录 ====================
export const dailyRecords = sqliteTable('daily_records', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  date: text('date').notNull().unique(),
  studyMinutes: integer('study_minutes').default(0),
  questionsDone: integer('questions_done').default(0),
  wrongCount: integer('wrong_count').default(0),
  planId: integer('plan_id'),
  note: text('note').default(''),
  createdAt: text('created_at').default(sql`(datetime('now', 'localtime'))`),
});

// ==================== 成就 ====================
export const achievements = sqliteTable('achievements', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  threshold: integer('threshold').notNull(),
  unlockedAt: text('unlocked_at'),
});

// ==================== 记忆卡片 ====================
export const flashcards = sqliteTable('flashcards', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  front: text('front').notNull(),
  back: text('back').notNull(),
  category: text('category').default('常识-政治'),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }).default('medium'),
  reviewCount: integer('review_count').default(0),
  mastered: integer('mastered', { mode: 'boolean' }).default(false),
  nextReview: text('next_review').default(sql`(datetime('now', 'localtime'))`),
  createdAt: text('created_at').default(sql`(datetime('now', 'localtime'))`),
});

// ==================== 番茄钟记录 ====================
export const pomodoroRecords = sqliteTable('pomodoro_records', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  duration: integer('duration').default(25),
  mode: text('mode').default('work'),
  createdAt: text('created_at').default(sql`(datetime('now', 'localtime'))`),
});

// ==================== 考试配置 ====================
export const examConfig = sqliteTable('exam_config', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').default('2026年国考'),
  date: text('date').default('2025-12-01'),
});

// ==================== 鼓励语录 ====================
export const encourageQuotes = sqliteTable('encourage_quotes', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  author: text('author').notNull(),
  category: text('category', { enum: ['perseverance', 'confidence', 'method', 'wisdom'] }).notNull(),
});

// ==================== 类型导出 ====================
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type WrongRecord = typeof wrongRecords.$inferSelect;
export type NewWrongRecord = typeof wrongRecords.$inferInsert;
export type MindMap = typeof mindMaps.$inferSelect;
export type NewMindMap = typeof mindMaps.$inferInsert;
export type StudyPlan = typeof studyPlans.$inferSelect;
export type NewStudyPlan = typeof studyPlans.$inferInsert;
export type DailyRecord = typeof dailyRecords.$inferSelect;
export type NewDailyRecord = typeof dailyRecords.$inferInsert;
export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;
export type Flashcard = typeof flashcards.$inferSelect;
export type NewFlashcard = typeof flashcards.$inferInsert;
export type PomodoroRecord = typeof pomodoroRecords.$inferSelect;
export type NewPomodoroRecord = typeof pomodoroRecords.$inferInsert;
export type ExamConfig = typeof examConfig.$inferSelect;
export type EncourageQuote = typeof encourageQuotes.$inferSelect;
