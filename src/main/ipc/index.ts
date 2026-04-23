import { ipcMain, dialog } from 'electron';
import { eq, and, gte, lte, desc, asc, sql as drizzleSql } from 'drizzle-orm';
import { db, sqlite } from '../db';
import { IPC } from '../../shared/ipc';
import * as schema from '../db/schema';
import fs from 'fs';

export function registerIpcHandlers() {
  // ==================== 题目 ====================
  ipcMain.handle(IPC.QUESTION_ADD, (_, q: any) => {
    const result = db.insert(schema.questions).values({
      type: q.type,
      content: q.content,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation || '',
      tags: q.tags || '',
    }).returning().get();
    return result;
  });

  ipcMain.handle(IPC.QUESTION_GET_ALL, (_, filters?: any) => {
    let query = db.select().from(schema.questions).orderBy(desc(schema.questions.createdAt));
    if (filters?.type) query = db.select().from(schema.questions).where(eq(schema.questions.type, filters.type)).orderBy(desc(schema.questions.createdAt)) as any;
    if (filters?.limit) query = db.select().from(schema.questions).limit(filters.limit).orderBy(desc(schema.questions.createdAt)) as any;
    return query.all();
  });

  ipcMain.handle(IPC.QUESTION_GET_BY_ID, (_, id: number) => {
    return db.select().from(schema.questions).where(eq(schema.questions.id, id)).get();
  });

  ipcMain.handle(IPC.QUESTION_UPDATE, (_, q: any) => {
    db.update(schema.questions).set({
      type: q.type,
      content: q.content,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      tags: q.tags,
    }).where(eq(schema.questions.id, q.id)).run();
    return q;
  });

  ipcMain.handle(IPC.QUESTION_DELETE, (_, id: number) => {
    db.delete(schema.questions).where(eq(schema.questions.id, id)).run();
    return { success: true };
  });

  // ==================== 错题本 ====================
  ipcMain.handle(IPC.WRONG_BOOK_ADD, (_, record: any) => {
    const result = db.insert(schema.wrongRecords).values({
      questionId: record.question_id,
      myAnswer: record.my_answer,
      note: record.note || '',
    }).returning().get();
    return result;
  });

  ipcMain.handle(IPC.WRONG_BOOK_GET_ALL, (_, filters?: any) => {
    const rows = db.select().from(schema.wrongRecords).orderBy(desc(schema.wrongRecords.lastWrongAt)).all();
    // 关联题目数据
    return rows.map((r: any) => ({
      ...r,
      question: db.select().from(schema.questions).where(eq(schema.questions.id, r.questionId)).get(),
    }));
  });

  ipcMain.handle(IPC.WRONG_BOOK_GET_BY_ID, (_, id: number) => {
    const record = db.select().from(schema.wrongRecords).where(eq(schema.wrongRecords.id, id)).get();
    if (!record) return null;
    return {
      ...record,
      question: db.select().from(schema.questions).where(eq(schema.questions.id, record.questionId)).get(),
    };
  });

  ipcMain.handle(IPC.WRONG_BOOK_UPDATE, (_, record: any) => {
    db.update(schema.wrongRecords).set({
      myAnswer: record.my_answer,
      note: record.note,
      nextReviewAt: record.next_review_at,
    }).where(eq(schema.wrongRecords.id, record.id)).run();
    return record;
  });

  ipcMain.handle(IPC.WRONG_BOOK_DELETE, (_, id: number) => {
    db.delete(schema.wrongRecords).where(eq(schema.wrongRecords.id, id)).run();
    return { success: true };
  });

  ipcMain.handle(IPC.WRONG_BOOK_MARK_MASTERED, (_, id: number) => {
    db.update(schema.wrongRecords).set({ mastered: true }).where(eq(schema.wrongRecords.id, id)).run();
    return { success: true };
  });

  ipcMain.handle(IPC.WRONG_BOOK_GET_DUE_REVIEW, () => {
    const rows = db.select().from(schema.wrongRecords)
      .where(and(
        eq(schema.wrongRecords.mastered, false),
        gte(schema.wrongRecords.nextReviewAt, drizzleSql`datetime('now', 'localtime')`)
      ))
      .orderBy(asc(schema.wrongRecords.nextReviewAt))
      .all();
    return rows.map((r: any) => ({
      ...r,
      question: db.select().from(schema.questions).where(eq(schema.questions.id, r.questionId)).get(),
    }));
  });

  // ==================== 思维导图 ====================
  ipcMain.handle(IPC.MIND_MAP_SAVE, (_, data: any) => {
    if (data.id) {
      db.update(schema.mindMaps).set({
        title: data.title,
        subject: data.subject,
        data: data.data,
        updatedAt: drizzleSql`(datetime('now','localtime'))`,
      }).where(eq(schema.mindMaps.id, data.id)).run();
      return { id: data.id, title: data.title, subject: data.subject };
    } else {
      const result = db.insert(schema.mindMaps).values({
        title: data.title,
        subject: data.subject,
        data: data.data,
      }).returning().get();
      return result;
    }
  });

  ipcMain.handle(IPC.MIND_MAP_GET_ALL, () => {
    return db.select({
      id: schema.mindMaps.id,
      title: schema.mindMaps.title,
      subject: schema.mindMaps.subject,
      createdAt: schema.mindMaps.createdAt,
      updatedAt: schema.mindMaps.updatedAt,
    }).from(schema.mindMaps).orderBy(desc(schema.mindMaps.updatedAt)).all();
  });

  ipcMain.handle(IPC.MIND_MAP_GET_BY_ID, (_, id: number) => {
    return db.select().from(schema.mindMaps).where(eq(schema.mindMaps.id, id)).get();
  });

  ipcMain.handle(IPC.MIND_MAP_DELETE, (_, id: number) => {
    db.delete(schema.mindMaps).where(eq(schema.mindMaps.id, id)).run();
    return { success: true };
  });

  // ==================== 学习计划 ====================
  ipcMain.handle(IPC.STUDY_PLAN_ADD, (_, plan: any) => {
    const result = db.insert(schema.studyPlans).values({
      title: plan.title,
      subject: plan.subject,
      targetDate: plan.target_date,
      priority: plan.priority || 'medium',
      description: plan.description || '',
      dailyMinutes: plan.daily_minutes || 60,
    }).returning().get();
    return result;
  });

  ipcMain.handle(IPC.STUDY_PLAN_GET_ALL, () => {
    return db.select().from(schema.studyPlans)
      .orderBy(asc(schema.studyPlans.status), desc(schema.studyPlans.priority), asc(schema.studyPlans.targetDate))
      .all();
  });

  ipcMain.handle(IPC.STUDY_PLAN_UPDATE, (_, plan: any) => {
    db.update(schema.studyPlans).set({
      title: plan.title,
      subject: plan.subject,
      targetDate: plan.target_date,
      priority: plan.priority,
      status: plan.status,
      description: plan.description,
      dailyMinutes: plan.daily_minutes,
      updatedAt: drizzleSql`(datetime('now','localtime'))`,
    }).where(eq(schema.studyPlans.id, plan.id)).run();
    return plan;
  });

  ipcMain.handle(IPC.STUDY_PLAN_DELETE, (_, id: number) => {
    db.delete(schema.studyPlans).where(eq(schema.studyPlans.id, id)).run();
    return { success: true };
  });

  // ==================== 每日记录 ====================
  ipcMain.handle(IPC.DAILY_RECORD_ADD, (_, record: any) => {
    const existing = db.select().from(schema.dailyRecords).where(eq(schema.dailyRecords.date, record.date)).get();
    if (existing) {
      db.update(schema.dailyRecords).set({
        studyMinutes: existing.studyMinutes + (record.study_minutes || 0),
        questionsDone: existing.questionsDone + (record.questions_done || 0),
        wrongCount: existing.wrongCount + (record.wrong_count || 0),
        note: record.note || existing.note,
      }).where(eq(schema.dailyRecords.id, existing.id)).run();
    } else {
      db.insert(schema.dailyRecords).values({
        date: record.date,
        studyMinutes: record.study_minutes || 0,
        questionsDone: record.questions_done || 0,
        wrongCount: record.wrong_count || 0,
        planId: record.plan_id,
        note: record.note || '',
      }).run();
    }
    return { success: true };
  });

  ipcMain.handle(IPC.DAILY_RECORD_GET_BY_DATE, (_, date: string) => {
    return db.select().from(schema.dailyRecords).where(eq(schema.dailyRecords.date, date)).get();
  });

  ipcMain.handle(IPC.DAILY_RECORD_GET_RANGE, (_, start: string, end: string) => {
    return db.select().from(schema.dailyRecords)
      .where(and(gte(schema.dailyRecords.date, start), lte(schema.dailyRecords.date, end)))
      .orderBy(asc(schema.dailyRecords.date))
      .all();
  });

  ipcMain.handle(IPC.DAILY_RECORD_GET_STATS, (_, days: number) => {
    const totalStudy = db.select({
      totalMinutes: drizzleSql`COALESCE(SUM(study_minutes), 0)`,
      totalQuestions: drizzleSql`COALESCE(SUM(questions_done), 0)`,
      totalWrong: drizzleSql`COALESCE(SUM(wrong_count), 0)`,
      activeDays: drizzleSql`COUNT(*)`,
    }).from(schema.dailyRecords)
      .where(gte(schema.dailyRecords.date, drizzleSql`date('now', 'localtime', ${`-${days} days`})`))
      .get() as any;

    const masteredCount = db.select({ count: drizzleSql`COUNT(*)` })
      .from(schema.wrongRecords)
      .where(eq(schema.wrongRecords.mastered, true))
      .get() as any;

    // 连续天数计算
    const recentDays = db.select({ date: schema.dailyRecords.date })
      .from(schema.dailyRecords)
      .where(gte(schema.dailyRecords.date, drizzleSql`date('now', 'localtime', '-365 days')`))
      .orderBy(desc(schema.dailyRecords.date))
      .all();

    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    let checkDate = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      const found = recentDays.some((r: any) => r.date === dateStr);
      if (found) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr === today) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      ...totalStudy,
      streak,
      mastered_count: masteredCount?.count || 0,
    };
  });

  // ==================== 成就 ====================
  ipcMain.handle(IPC.ACHIEVEMENT_GET_ALL, () => {
    return db.select().from(schema.achievements).orderBy(asc(schema.achievements.type), asc(schema.achievements.threshold)).all();
  });

  ipcMain.handle(IPC.ACHIEVEMENT_CHECK, () => {
    const stats = db.select({
      totalMinutes: drizzleSql`COALESCE(SUM(study_minutes), 0)`,
      totalQuestions: drizzleSql`COALESCE(SUM(questions_done), 0)`,
    }).from(schema.dailyRecords).get() as any;

    const masteredCount = db.select({ count: drizzleSql`COUNT(*)` })
      .from(schema.wrongRecords).where(eq(schema.wrongRecords.mastered, true)).get() as any;

    const flashcardReviewCount = db.select({ count: drizzleSql`COALESCE(SUM(review_count), 0)` })
      .from(schema.flashcards).get() as any;

    const flashcardMasteredCount = db.select({ count: drizzleSql`COUNT(*)` })
      .from(schema.flashcards).where(eq(schema.flashcards.mastered, true)).get() as any;

    const pomodoroCount = db.select({ count: drizzleSql`COUNT(*)` })
      .from(schema.pomodoroRecords).get() as any;

    const checkinCount = db.select({ count: drizzleSql`COUNT(DISTINCT date)` })
      .from(schema.dailyRecords).get() as any;

    const recentDays = db.select({ date: schema.dailyRecords.date })
      .from(schema.dailyRecords)
      .where(gte(schema.dailyRecords.date, drizzleSql`date('now', 'localtime', '-365 days')`))
      .orderBy(desc(schema.dailyRecords.date))
      .all();

    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    let checkDate = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      const found = recentDays.some((r: any) => r.date === dateStr);
      if (found) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr === today) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const progressMap: Record<string, number> = {
      streak,
      questions: stats?.totalQuestions || 0,
      study_time: stats?.totalMinutes || 0,
      mastered: masteredCount?.count || 0,
      flashcard: flashcardReviewCount?.count || 0,
      flashcard_master: flashcardMasteredCount?.count || 0,
      pomodoro: pomodoroCount?.count || 0,
      checkin: checkinCount?.count || 0,
    };

    // 解锁成就
    for (const [type, progress] of Object.entries(progressMap)) {
      db.update(schema.achievements)
        .set({ unlockedAt: drizzleSql`(datetime('now','localtime'))` })
        .where(and(
          eq(schema.achievements.type, type),
          gte(drizzleSql`CAST(${schema.achievements.threshold} AS INTEGER)`, progress),
          drizzleSql`${schema.achievements.unlockedAt} IS NULL`
        ))
        .run();
    }

    const achievements = db.select().from(schema.achievements).orderBy(asc(schema.achievements.type), asc(schema.achievements.threshold)).all();
    return achievements.map((a: any) => ({ ...a, progress: progressMap[a.type] || 0 }));
  });

  // ==================== 记忆卡片 ====================
  ipcMain.handle(IPC.FLASHCARD_ADD, (_, card: any) => {
    const result = db.insert(schema.flashcards).values({
      front: card.front,
      back: card.back,
      category: card.category || '常识-政治',
      difficulty: card.difficulty || 'medium',
    }).returning().get();
    return result;
  });

  ipcMain.handle(IPC.FLASHCARD_GET_ALL, (_, filters?: any) => {
    let query = db.select().from(schema.flashcards).orderBy(asc(schema.flashcards.nextReview), desc(schema.flashcards.createdAt));
    if (filters?.category) {
      query = db.select().from(schema.flashcards).where(eq(schema.flashcards.category, filters.category)).orderBy(asc(schema.flashcards.nextReview)) as any;
    }
    if (filters?.mastered !== undefined) {
      query = db.select().from(schema.flashcards).where(eq(schema.flashcards.mastered, filters.mastered)).orderBy(asc(schema.flashcards.nextReview)) as any;
    }
    return query.all();
  });

  ipcMain.handle(IPC.FLASHCARD_UPDATE, (_, card: any) => {
    const updates: any = {};
    if (card.front !== undefined) updates.front = card.front;
    if (card.back !== undefined) updates.back = card.back;
    if (card.category !== undefined) updates.category = card.category;
    if (card.difficulty !== undefined) updates.difficulty = card.difficulty;
    if (card.review_count !== undefined) updates.reviewCount = card.review_count;
    if (card.mastered !== undefined) updates.mastered = card.mastered;
    if (card.next_review !== undefined) updates.nextReview = card.next_review;
    db.update(schema.flashcards).set(updates).where(eq(schema.flashcards.id, card.id)).run();
    return card;
  });

  ipcMain.handle(IPC.FLASHCARD_DELETE, (_, id: number) => {
    db.delete(schema.flashcards).where(eq(schema.flashcards.id, id)).run();
    return { success: true };
  });

  // ==================== 考试配置 ====================
  ipcMain.handle(IPC.EXAM_CONFIG_GET, () => {
    return db.select().from(schema.examConfig).orderBy(desc(schema.examConfig.id)).limit(1).get();
  });

  ipcMain.handle(IPC.EXAM_CONFIG_SET, (_, config: any) => {
    const existing = db.select().from(schema.examConfig).orderBy(desc(schema.examConfig.id)).limit(1).get();
    if (existing) {
      db.update(schema.examConfig).set({ name: config.name, date: config.date }).where(eq(schema.examConfig.id, existing.id)).run();
    } else {
      db.insert(schema.examConfig).values({ name: config.name, date: config.date }).run();
    }
    return config;
  });

  // ==================== 番茄钟 ====================
  ipcMain.handle(IPC.POMODORO_RECORD_ADD, (_, record: any) => {
    const result = db.insert(schema.pomodoroRecords).values({
      date: record.date,
      duration: record.duration || 25,
      mode: record.mode || 'work',
    }).returning().get();
    return result;
  });

  ipcMain.handle(IPC.POMODORO_RECORD_GET_BY_DATE, (_, date: string) => {
    return db.select().from(schema.pomodoroRecords).where(eq(schema.pomodoroRecords.date, date)).orderBy(asc(schema.pomodoroRecords.createdAt)).all();
  });

  ipcMain.handle(IPC.POMODORO_RECORD_GET_RANGE, (_, start: string, end: string) => {
    return db.select().from(schema.pomodoroRecords)
      .where(and(gte(schema.pomodoroRecords.date, start), lte(schema.pomodoroRecords.date, end)))
      .orderBy(asc(schema.pomodoroRecords.date), asc(schema.pomodoroRecords.createdAt))
      .all();
  });

  // ==================== 鼓励语录 ====================
  ipcMain.handle(IPC.ENCOURAGE_GET_RANDOM, (_, category?: string) => {
    if (category) {
      const rows = db.select().from(schema.encourageQuotes)
        .where(eq(schema.encourageQuotes.category, category as any))
        .all();
      return rows.length > 0 ? rows[Math.floor(Math.random() * rows.length)] : null;
    }
    const rows = db.select().from(schema.encourageQuotes).all();
    return rows.length > 0 ? rows[Math.floor(Math.random() * rows.length)] : null;
  });

  // ==================== 数据导入导出 ====================
  ipcMain.handle(IPC.DATA_EXPORT, async () => {
    const result = await dialog.showSaveDialog({
      title: '导出数据',
      defaultPath: 'gongkao-backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled) return { success: false };

    const tables = ['questions', 'wrong_records', 'mind_maps', 'study_plans', 'daily_records', 'achievements', 'flashcards', 'exam_config', 'pomodoro_records', 'encourage_quotes'];
    const data: any = {};
    for (const table of tables) {
      data[table] = db.all(drizzleSql`SELECT * FROM ${drizzleSql.raw(table)}`);
    }

    fs.writeFileSync(result.filePath!, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, path: result.filePath };
  });

  ipcMain.handle(IPC.DATA_IMPORT, async (_, filePath: string) => {
    if (!filePath) {
      const result = await dialog.showOpenDialog({
        title: '导入数据',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile'],
      });
      if (result.canceled) return { success: false };
      filePath = result.filePaths[0];
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const tables = ['questions', 'wrong_records', 'mind_maps', 'study_plans', 'daily_records', 'achievements', 'flashcards', 'exam_config', 'pomodoro_records', 'encourage_quotes'];
    for (const table of tables) {
      if (data[table] && Array.isArray(data[table])) {
        sqlite.prepare(`DELETE FROM ${table}`).run();
        for (const row of data[table]) {
          const cols = Object.keys(row).join(', ');
          const placeholders = Object.keys(row).map(() => '?').join(', ');
          const vals = Object.values(row);
          sqlite.prepare(`INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`).run(vals);
        }
      }
    }

    return { success: true };
  });
}
