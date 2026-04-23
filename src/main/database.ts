import Database from 'sql.js';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let db: Database.Database | null = null;
let dbPath: string = '';
let dbVersionPath: string = '';

// 当前数据库版本号，每次结构变更时递增
const CURRENT_DB_VERSION = 3;

export async function getDatabase(): Promise<Database.Database> {
  if (db) return db;

  const userDataPath = app.getPath('userData');
  dbPath = path.join(userDataPath, 'gongkao.db');
  dbVersionPath = path.join(userDataPath, 'db_version.json');

  const SQL = await Database({
    locateFile: (file: string) => path.join(__dirname, file)
  });

  // 如果数据库文件存在则加载
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // 启用外键
  db.run('PRAGMA foreign_keys = ON');

  // 初始化表结构
  initializeTables();

  // 执行数据库迁移
  runMigrations();

  return db;
}

function initializeTables() {
  if (!db) return;

  db.run(`
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

  db.run(`
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
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS mind_maps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
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

  db.run(`
    CREATE TABLE IF NOT EXISTS daily_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      study_minutes INTEGER DEFAULT 0,
      questions_done INTEGER DEFAULT 0,
      wrong_count INTEGER DEFAULT 0,
      plan_id INTEGER,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (plan_id) REFERENCES study_plans(id) ON DELETE SET NULL
    )
  `);

  db.run(`
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

  // 索引
  db.run('CREATE INDEX IF NOT EXISTS idx_wrong_records_mastered ON wrong_records(mastered)');
  db.run('CREATE INDEX IF NOT EXISTS idx_wrong_records_next_review ON wrong_records(next_review_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type)');
  db.run('CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records(date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_study_plans_status ON study_plans(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(type)');

  // 初始化成就数据
  initializeAchievements();
  saveDatabase();
}

function initializeAchievements() {
  if (!db) return;

  const countResult = db.exec('SELECT COUNT(*) as count FROM achievements');
  if (countResult.length > 0 && countResult[0].values[0][0] as number > 0) return;

  const achievements = [
    // 坚持学习
    { type: 'streak', title: '初出茅庐', description: '连续学习3天', icon: '🌱', threshold: 3 },
    { type: 'streak', title: '持之以恒', description: '连续学习7天', icon: '🔥', threshold: 7 },
    { type: 'streak', title: '百折不挠', description: '连续学习30天', icon: '💪', threshold: 30 },
    { type: 'streak', title: '铁杵磨针', description: '连续学习100天', icon: '🏆', threshold: 100 },
    // 刷题达人
    { type: 'questions', title: '小试牛刀', description: '累计刷题50道', icon: '✏️', threshold: 50 },
    { type: 'questions', title: '题海战术', description: '累计刷题200道', icon: '📖', threshold: 200 },
    { type: 'questions', title: '千锤百炼', description: '累计刷题500道', icon: '🎯', threshold: 500 },
    { type: 'questions', title: '题神降世', description: '累计刷题1000道', icon: '👑', threshold: 1000 },
    // 时间投入
    { type: 'study_time', title: '入门弟子', description: '累计学习5小时', icon: '⏰', threshold: 300 },
    { type: 'study_time', title: '勤学苦练', description: '累计学习20小时', icon: '📚', threshold: 1200 },
    { type: 'study_time', title: '学海无涯', description: '累计学习50小时', icon: '🌟', threshold: 3000 },
    { type: 'study_time', title: '时间大师', description: '累计学习100小时', icon: '⭐', threshold: 6000 },
    // 错题攻克
    { type: 'mastered', title: '知错能改', description: '掌握10道错题', icon: '✅', threshold: 10 },
    { type: 'mastered', title: '错题克星', description: '掌握50道错题', icon: '🛡️', threshold: 50 },
    { type: 'mastered', title: '完美主义', description: '掌握100道错题', icon: '💎', threshold: 100 },
    // 卡片复习
    { type: 'flashcard', title: '初识卡片', description: '累计复习卡片10次', icon: '🃏', threshold: 10 },
    { type: 'flashcard', title: '卡片达人', description: '累计复习卡片50次', icon: '🎴', threshold: 50 },
    { type: 'flashcard', title: '记忆大师', description: '累计复习卡片200次', icon: '🧠', threshold: 200 },
    // 卡片掌握
    { type: 'flashcard_master', title: '入门掌握', description: '掌握5张卡片', icon: '📖', threshold: 5 },
    { type: 'flashcard_master', title: '熟练掌握', description: '掌握20张卡片', icon: '📚', threshold: 20 },
    { type: 'flashcard_master', title: '全部掌握', description: '掌握50张卡片', icon: '🎓', threshold: 50 },
    // 番茄专注
    { type: 'pomodoro', title: '番茄新手', description: '完成5个番茄钟', icon: '🍅', threshold: 5 },
    { type: 'pomodoro', title: '番茄达人', description: '完成20个番茄钟', icon: '🫒', threshold: 20 },
    { type: 'pomodoro', title: '番茄专家', description: '完成50个番茄钟', icon: '🥫', threshold: 50 },
    { type: 'pomodoro', title: '番茄大师', description: '完成100个番茄钟', icon: '⏲️', threshold: 100 },
    // 每日打卡
    { type: 'checkin', title: '首次打卡', description: '打卡1天', icon: '📌', threshold: 1 },
    { type: 'checkin', title: '坚持打卡', description: '打卡7天', icon: '🗓️', threshold: 7 },
    { type: 'checkin', title: '打卡达人', description: '打卡30天', icon: '✨', threshold: 30 },
    { type: 'checkin', title: '打卡传奇', description: '打卡100天', icon: '🏅', threshold: 100 },
  ];

  for (const a of achievements) {
    db.run(
      'INSERT INTO achievements (type, title, description, icon, threshold) VALUES (?, ?, ?, ?, ?)',
      [a.type, a.title, a.description, a.icon, a.threshold]
    );
  }
}

// ==================== 数据库迁移系统 ====================

/**
 * 读取当前数据库版本号
 */
function getCurrentVersion(): number {
  try {
    if (fs.existsSync(dbVersionPath)) {
      const versionData = JSON.parse(fs.readFileSync(dbVersionPath, 'utf-8'));
      return versionData.version || 0;
    }
  } catch {
    // 版本文件损坏，默认为 0
  }
  return 0;
}

/**
 * 写入数据库版本号
 */
function setVersion(version: number) {
  fs.writeFileSync(dbVersionPath, JSON.stringify({ version, updatedAt: new Date().toISOString() }), 'utf-8');
}

/**
 * 迁移定义
 * 每次需要修改表结构时，在这里添加新的迁移函数
 * key = 目标版本号（迁移后到达的版本）
 * value = 迁移函数
 */
const migrations: Record<number, () => void> = {
  2: () => {
    if (!db) return;
    // 新增记忆卡片表
    try {
      db.run(`CREATE TABLE IF NOT EXISTS flashcards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        category TEXT DEFAULT '常识-政治',
        difficulty TEXT DEFAULT 'medium',
        review_count INTEGER DEFAULT 0,
        mastered INTEGER DEFAULT 0,
        next_review TEXT DEFAULT (datetime('now', 'localtime')),
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      )`);
      db.run('CREATE INDEX IF NOT EXISTS idx_flashcards_category ON flashcards(category)');
      db.run('CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review)');
    } catch (e) {
      console.error('Migration v2: flashcards table error', e);
    }
    // 新增考试配置表
    try {
      db.run(`CREATE TABLE IF NOT EXISTS exam_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT DEFAULT '2026年国考',
        date TEXT DEFAULT '2025-12-01'
      )`);
      // 插入默认配置
      const count = db.exec('SELECT COUNT(*) as c FROM exam_config');
      if (count.length === 0 || (count[0].values[0][0] as number) === 0) {
        db.run("INSERT INTO exam_config (name, date) VALUES ('2026年国考', '2025-12-01')");
      }
    } catch (e) {
      console.error('Migration v2: exam_config table error', e);
    }
    console.log('[数据库迁移] v2: 新增 flashcards 和 exam_config 表');
  },

  3: () => {
    if (!db) return;
    // 新增番茄钟记录表
    try {
      db.run(`CREATE TABLE IF NOT EXISTS pomodoro_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        duration INTEGER DEFAULT 25,
        mode TEXT DEFAULT 'work',
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      )`);
      db.run('CREATE INDEX IF NOT EXISTS idx_pomodoro_records_date ON pomodoro_records(date)');
    } catch (e) {
      console.error('Migration v3: pomodoro_records table error', e);
    }
    // 新增成就：记忆卡片、卡片掌握、番茄钟、打卡
    const newAchievements = [
      { type: 'flashcard', title: '初识卡片', description: '累计复习卡片10次', icon: '🃏', threshold: 10 },
      { type: 'flashcard', title: '卡片达人', description: '累计复习卡片50次', icon: '🎴', threshold: 50 },
      { type: 'flashcard', title: '记忆大师', description: '累计复习卡片200次', icon: '🧠', threshold: 200 },
      { type: 'flashcard_master', title: '入门掌握', description: '掌握5张卡片', icon: '📖', threshold: 5 },
      { type: 'flashcard_master', title: '熟练掌握', description: '掌握20张卡片', icon: '📚', threshold: 20 },
      { type: 'flashcard_master', title: '全部掌握', description: '掌握50张卡片', icon: '🎓', threshold: 50 },
      { type: 'pomodoro', title: '番茄新手', description: '完成5个番茄钟', icon: '🍅', threshold: 5 },
      { type: 'pomodoro', title: '番茄达人', description: '完成20个番茄钟', icon: '🫒', threshold: 20 },
      { type: 'pomodoro', title: '番茄专家', description: '完成50个番茄钟', icon: '🥫', threshold: 50 },
      { type: 'pomodoro', title: '番茄大师', description: '完成100个番茄钟', icon: '⏲️', threshold: 100 },
      { type: 'checkin', title: '首次打卡', description: '打卡1天', icon: '📌', threshold: 1 },
      { type: 'checkin', title: '坚持打卡', description: '打卡7天', icon: '🗓️', threshold: 7 },
      { type: 'checkin', title: '打卡达人', description: '打卡30天', icon: '✨', threshold: 30 },
      { type: 'checkin', title: '打卡传奇', description: '打卡100天', icon: '🏅', threshold: 100 },
    ];
    try {
      for (const a of newAchievements) {
        db.run(
          'INSERT OR IGNORE INTO achievements (type, title, description, icon, threshold) VALUES (?, ?, ?, ?, ?)',
          [a.type, a.title, a.description, a.icon, a.threshold]
        );
      }
    } catch (e) {
      console.error('Migration v3: new achievements error', e);
    }
    console.log('[数据库迁移] v3: 新增 pomodoro_records 表和14个新成就');
  },
};

/**
 * 执行数据库迁移
 * 从当前版本逐步迁移到最新版本
 */
function runMigrations() {
  if (!db) return;

  const currentVersion = getCurrentVersion();

  if (currentVersion >= CURRENT_DB_VERSION) {
    // 已是最新版本，无需迁移
    return;
  }

  console.log(`[数据库迁移] 当前版本: ${currentVersion}, 目标版本: ${CURRENT_DB_VERSION}`);

  // 迁移前自动备份
  backupDatabase(currentVersion);

  // 按版本顺序逐步执行迁移
  for (let v = currentVersion + 1; v <= CURRENT_DB_VERSION; v++) {
    if (migrations[v]) {
      console.log(`[数据库迁移] 执行迁移 v${v}...`);
      try {
        migrations[v]();
        console.log(`[数据库迁移] 迁移 v${v} 完成`);
      } catch (err) {
        console.error(`[数据库迁移] 迁移 v${v} 失败:`, err);
        // 迁移失败，回滚到备份
        restoreDatabase(currentVersion);
        console.error(`[数据库迁移] 已回滚到版本 ${currentVersion}`);
        return;
      }
    }
    setVersion(v);
  }

  saveDatabase();
  console.log(`[数据库迁移] 迁移完成，当前版本: ${CURRENT_DB_VERSION}`);
}

/**
 * 备份数据库
 */
function backupDatabase(fromVersion: number) {
  if (!db) return;
  try {
    const backupPath = path.join(app.getPath('userData'), `gongkao_v${fromVersion}_backup.db`);
    const data = db.export();
    fs.writeFileSync(backupPath, Buffer.from(data));
    console.log(`[数据库迁移] 备份已保存: ${backupPath}`);
  } catch (err) {
    console.error('[数据库迁移] 备份失败:', err);
  }
}

/**
 * 从备份恢复数据库
 */
function restoreDatabase(toVersion: number) {
  const backupPath = path.join(app.getPath('userData'), `gongkao_v${toVersion}_backup.db`);
  if (!fs.existsSync(backupPath)) {
    console.error(`[数据库迁移] 备份文件不存在: ${backupPath}`);
    return;
  }

  try {
    if (db) {
      db.close();
      db = null;
    }
    const buffer = fs.readFileSync(backupPath);
    // 注意：这里简化处理，实际需要重新加载
    fs.writeFileSync(dbPath, buffer);
    console.log(`[数据库迁移] 已从备份恢复到版本 ${toVersion}`);
  } catch (err) {
    console.error('[数据库迁移] 恢复失败:', err);
  }
}

export function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

export function getDbVersion(): number {
  return getCurrentVersion();
}
