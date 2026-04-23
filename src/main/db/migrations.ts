import { sql } from 'drizzle-orm';
import { db, initAchievements } from './index';
import { questions, wrongRecords, mindMaps, studyPlans, dailyRecords, achievements, flashcards, examConfig, pomodoroRecords, encourageQuotes } from './schema';

// 初始化所有表（Drizzle 会自动处理 CREATE TABLE IF NOT EXISTS）
export function initDatabase() {
  // better-sqlite3 需要在 drizzle 之外创建表，因为 drizzle 不自动创建
  // 这里我们通过 db.run 执行建表语句

  // 题目表
  db.run(sql`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      options TEXT,
      answer TEXT NOT NULL,
      explanation TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 错题记录表
  db.run(sql`
    CREATE TABLE IF NOT EXISTS wrong_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      my_answer TEXT NOT NULL,
      wrong_count INTEGER DEFAULT 1,
      last_wrong_at TEXT DEFAULT (datetime('now', 'localtime')),
      mastered INTEGER DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      next_review_at TEXT DEFAULT (datetime('now', 'localtime', '+1 day')),
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 思维导图表
  db.run(sql`
    CREATE TABLE IF NOT EXISTS mind_maps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 学习计划表
  db.run(sql`
    CREATE TABLE IF NOT EXISTS study_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      target_date TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      description TEXT DEFAULT '',
      daily_minutes INTEGER DEFAULT 60,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 每日记录表
  db.run(sql`
    CREATE TABLE IF NOT EXISTS daily_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      study_minutes INTEGER DEFAULT 0,
      questions_done INTEGER DEFAULT 0,
      wrong_count INTEGER DEFAULT 0,
      plan_id INTEGER,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 成就表
  db.run(sql`
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      threshold INTEGER NOT NULL,
      unlocked_at TEXT
    )
  `);

  // 记忆卡片表
  db.run(sql`
    CREATE TABLE IF NOT EXISTS flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      category TEXT DEFAULT '常识-政治',
      difficulty TEXT DEFAULT 'medium',
      review_count INTEGER DEFAULT 0,
      mastered INTEGER DEFAULT 0,
      next_review TEXT DEFAULT (datetime('now', 'localtime')),
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 番茄钟记录表
  db.run(sql`
    CREATE TABLE IF NOT EXISTS pomodoro_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      duration INTEGER DEFAULT 25,
      mode TEXT DEFAULT 'work',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 考试配置表
  db.run(sql`
    CREATE TABLE IF NOT EXISTS exam_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT DEFAULT '2026年国考',
      date TEXT DEFAULT '2025-12-01'
    )
  `);

  // 鼓励语录表
  db.run(sql`
    CREATE TABLE IF NOT EXISTS encourage_quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      category TEXT NOT NULL
    )
  `);

  // 创建索引
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_wrong_records_mastered ON wrong_records(mastered)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_wrong_records_next_review ON wrong_records(next_review_at)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records(date)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_study_plans_status ON study_plans(status)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(type)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_flashcards_category ON flashcards(category)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review)`);
  db.run(sql`CREATE INDEX IF NOT EXISTS idx_pomodoro_records_date ON pomodoro_records(date)`);

  // 初始化成就和默认数据
  initAchievements();
}
