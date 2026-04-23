import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import * as schema from './schema';

const dbPath = path.join(app.getPath('userData'), 'gongkao.db');

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { sqlite };

// 初始化成就数据
export function initAchievements() {
  const existing = sqlite.prepare('SELECT COUNT(*) as count FROM achievements').get() as { count: number };
  if (existing.count > 0) return;

  const achievements = [
    { type: 'streak', title: '初出茅庐', description: '连续学习3天', icon: '🌱', threshold: 3 },
    { type: 'streak', title: '持之以恒', description: '连续学习7天', icon: '🔥', threshold: 7 },
    { type: 'streak', title: '百折不挠', description: '连续学习30天', icon: '💪', threshold: 30 },
    { type: 'streak', title: '铁杵磨针', description: '连续学习100天', icon: '🏆', threshold: 100 },
    { type: 'questions', title: '小试牛刀', description: '累计刷题50道', icon: '✏️', threshold: 50 },
    { type: 'questions', title: '题海战术', description: '累计刷题200道', icon: '📖', threshold: 200 },
    { type: 'questions', title: '千锤百炼', description: '累计刷题500道', icon: '🎯', threshold: 500 },
    { type: 'questions', title: '题神降世', description: '累计刷题1000道', icon: '👑', threshold: 1000 },
    { type: 'study_time', title: '入门弟子', description: '累计学习5小时', icon: '⏰', threshold: 300 },
    { type: 'study_time', title: '勤学苦练', description: '累计学习20小时', icon: '📚', threshold: 1200 },
    { type: 'study_time', title: '学海无涯', description: '累计学习50小时', icon: '🌟', threshold: 3000 },
    { type: 'study_time', title: '时间大师', description: '累计学习100小时', icon: '⭐', threshold: 6000 },
    { type: 'mastered', title: '知错能改', description: '掌握10道错题', icon: '✅', threshold: 10 },
    { type: 'mastered', title: '错题克星', description: '掌握50道错题', icon: '🛡️', threshold: 50 },
    { type: 'mastered', title: '完美主义', description: '掌握100道错题', icon: '💎', threshold: 100 },
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

  const stmt = sqlite.prepare(
    'INSERT INTO achievements (type, title, description, icon, threshold) VALUES (?, ?, ?, ?, ?)'
  );
  for (const a of achievements) {
    stmt.run(a.type, a.title, a.description, a.icon, a.threshold);
  }

  // 插入默认考试配置
  const configCount = sqlite.prepare('SELECT COUNT(*) as count FROM exam_config').get() as { count: number };
  if (configCount.count === 0) {
    sqlite.prepare("INSERT INTO exam_config (name, date) VALUES ('2026年国考', '2025-12-01')").run();
  }

  // 插入鼓励语录
  const quoteCount = sqlite.prepare('SELECT COUNT(*) as count FROM encourage_quotes').get() as { count: number };
  if (quoteCount.count === 0) {
    const quotes = [
      { content: '星光不问赶路人，时光不负有心人。', author: '佚名', category: 'perseverance' },
      { content: '道阻且长，行则将至。', author: '《荀子》', category: 'perseverance' },
      { content: '成功的路上并不拥挤，因为坚持的人不多。', author: '佚名', category: 'perseverance' },
      { content: '相信自己，你比你想象的更强大。', author: '佚名', category: 'confidence' },
      { content: '方法对了，事半功倍。', author: '佚名', category: 'method' },
      { content: '工欲善其事，必先利其器。', author: '《论语》', category: 'method' },
      { content: '学而不思则罔，思而不学则殆。', author: '孔子', category: 'wisdom' },
    ];
    const quoteStmt = sqlite.prepare('INSERT INTO encourage_quotes (content, author, category) VALUES (?, ?, ?)');
    for (const q of quotes) {
      quoteStmt.run(q.content, q.author, q.category);
    }
  }
}

export function closeDatabase() {
  sqlite.close();
}
