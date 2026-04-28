import { ipcMain, dialog, app } from 'electron';
import { eq } from 'drizzle-orm';
import { db, sqlite } from '../db';
import { IPC } from '../../shared/ipc';
import * as schema from '../db/schema';
import fs from 'fs';
import path from 'path';
import {
  applyFlashcardFilters,
  applyQuestionFilters,
  applyWrongBookFilters,
  buildAchievementProgress,
  formatLocalDate,
  formatLocalDateTime,
  getUnlockableAchievementIds,
  isDueReview,
  normalizeLegacyDateTime,
  sortStudyPlans,
  toLegacyAchievement,
  toLegacyDailyRecord,
  toLegacyExamConfig,
  toLegacyFlashcard,
  toLegacyMindMap,
  toLegacyPomodoroRecord,
  toLegacyQuestion,
  toLegacyQuote,
  toLegacyStudyPlan,
  toLegacyWrongRecord,
} from './contract-utils';

function getQuestionMap() {
  const questions = db.select().from(schema.questions).all();
  return new Map(questions.map((question) => [question.id, question]));
}

type FallbackMindMap = {
  id: number;
  title: string;
  subject: string;
  data: string;
  created_at: string;
  updated_at: string;
};

function getFallbackMindMapPath() {
  return path.join(app.getPath('userData'), 'mind_maps_fallback.json');
}

function readFallbackMindMaps(): FallbackMindMap[] {
  try {
    const filePath = getFallbackMindMapPath();
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[IPC] Failed to read fallback mind maps', error);
    return [];
  }
}

function writeFallbackMindMaps(maps: FallbackMindMap[]) {
  fs.writeFileSync(getFallbackMindMapPath(), JSON.stringify(maps, null, 2), 'utf-8');
}

function upsertFallbackMindMap(record: FallbackMindMap) {
  const maps = readFallbackMindMaps();
  const existingIndex = maps.findIndex((item) => item.id === record.id);

  if (existingIndex >= 0) {
    maps[existingIndex] = record;
  } else {
    maps.push(record);
  }

  writeFallbackMindMaps(maps);
  return record;
}

function removeFallbackMindMap(id: number) {
  writeFallbackMindMaps(readFallbackMindMaps().filter((item) => item.id !== id));
}

function mergeMindMaps(dbMaps: ReturnType<typeof toLegacyMindMap>[], fallbackMaps: FallbackMindMap[]) {
  const merged = new Map<number, any>();

  for (const item of dbMaps.filter(Boolean)) {
    merged.set(item.id, item);
  }

  for (const item of fallbackMaps) {
    merged.set(item.id, item);
  }

  return [...merged.values()].sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')));
}

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

    return toLegacyQuestion(result);
  });

  ipcMain.handle(IPC.QUESTION_GET_ALL, (_, filters?: any) => {
    const rows = db.select().from(schema.questions).all();
    return applyQuestionFilters(rows, filters).map((row) => toLegacyQuestion(row));
  });

  ipcMain.handle(IPC.QUESTION_GET_BY_ID, (_, id: number) => {
    const row = db.select().from(schema.questions).where(eq(schema.questions.id, id)).get();
    return toLegacyQuestion(row);
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

    const updated = db.select().from(schema.questions).where(eq(schema.questions.id, q.id)).get();
    return toLegacyQuestion(updated);
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

    const question = db.select().from(schema.questions).where(eq(schema.questions.id, result.questionId)).get();
    return toLegacyWrongRecord(result, question);
  });

  ipcMain.handle(IPC.WRONG_BOOK_GET_ALL, (_, filters?: any) => {
    const questionMap = getQuestionMap();
    const rows = db.select().from(schema.wrongRecords).all();
    const records = rows.map((row) => toLegacyWrongRecord(row, questionMap.get(row.questionId)));
    return applyWrongBookFilters(records, filters);
  });

  ipcMain.handle(IPC.WRONG_BOOK_GET_BY_ID, (_, id: number) => {
    const row = db.select().from(schema.wrongRecords).where(eq(schema.wrongRecords.id, id)).get();
    if (!row) return null;

    const question = db.select().from(schema.questions).where(eq(schema.questions.id, row.questionId)).get();
    return toLegacyWrongRecord(row, question);
  });

  ipcMain.handle(IPC.WRONG_BOOK_UPDATE, (_, record: any) => {
    const updates: Record<string, unknown> = {};
    if (record.my_answer !== undefined) updates.myAnswer = record.my_answer;
    if (record.note !== undefined) updates.note = record.note;
    if (record.next_review_at !== undefined) updates.nextReviewAt = normalizeLegacyDateTime(record.next_review_at);

    db.update(schema.wrongRecords).set(updates).where(eq(schema.wrongRecords.id, record.id)).run();

    const updated = db.select().from(schema.wrongRecords).where(eq(schema.wrongRecords.id, record.id)).get();
    if (!updated) return null;

    const question = db.select().from(schema.questions).where(eq(schema.questions.id, updated.questionId)).get();
    return toLegacyWrongRecord(updated, question);
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
    const questionMap = getQuestionMap();
    const rows = db.select().from(schema.wrongRecords).all();

    return rows
      .filter((row) => !row.mastered && isDueReview(row.nextReviewAt))
      .sort((a, b) => String(a.nextReviewAt ?? '').localeCompare(String(b.nextReviewAt ?? '')))
      .map((row) => toLegacyWrongRecord(row, questionMap.get(row.questionId)));
  });

  // ==================== 思维导图 ====================
  ipcMain.handle(IPC.MIND_MAP_SAVE, (_, data: any) => {
    const now = formatLocalDateTime();

    try {
      const isLocalFallbackId = typeof data.id === 'number' && data.id < 0;

      if (data.id && !isLocalFallbackId) {
        db.update(schema.mindMaps).set({
          title: data.title,
          subject: data.subject,
          data: data.data,
          updatedAt: now,
        }).where(eq(schema.mindMaps.id, data.id)).run();

        removeFallbackMindMap(data.id);
        const updated = db.select().from(schema.mindMaps).where(eq(schema.mindMaps.id, data.id)).get();
        return toLegacyMindMap(updated);
      }

      const result = db.insert(schema.mindMaps).values({
        title: data.title,
        subject: data.subject,
        data: data.data,
      }).returning().get();

      if (isLocalFallbackId) {
        removeFallbackMindMap(data.id);
      }

      return toLegacyMindMap(result);
    } catch (error) {
      console.error('[IPC] Mind map save fell back to JSON storage', error);

      const fallbackId = typeof data.id === 'number' ? data.id : -Date.now();
      const existing = readFallbackMindMaps().find((item) => item.id === fallbackId);
      return upsertFallbackMindMap({
        id: fallbackId,
        title: data.title,
        subject: data.subject,
        data: data.data,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      });
    }
  });

  ipcMain.handle(IPC.MIND_MAP_GET_ALL, () => {
    const fallbackMaps = readFallbackMindMaps();

    try {
      const dbMaps = db.select().from(schema.mindMaps).all()
        .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
        .map((row) => toLegacyMindMap(row));

      return mergeMindMaps(dbMaps, fallbackMaps);
    } catch (error) {
      console.error('[IPC] Mind map list read failed, using fallback only', error);
      return mergeMindMaps([], fallbackMaps);
    }
  });

  ipcMain.handle(IPC.MIND_MAP_GET_BY_ID, (_, id: number) => {
    const fallback = readFallbackMindMaps().find((item) => item.id === id);
    if (fallback) {
      return fallback;
    }

    try {
      const row = db.select().from(schema.mindMaps).where(eq(schema.mindMaps.id, id)).get();
      return toLegacyMindMap(row);
    } catch (error) {
      console.error('[IPC] Mind map detail read failed', error);
      return null;
    }
  });

  ipcMain.handle(IPC.MIND_MAP_DELETE, (_, id: number) => {
    try {
      if (id >= 0) {
        db.delete(schema.mindMaps).where(eq(schema.mindMaps.id, id)).run();
      }
    } catch (error) {
      console.error('[IPC] Mind map delete from database failed', error);
    }

    removeFallbackMindMap(id);
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

    return toLegacyStudyPlan(result);
  });

  ipcMain.handle(IPC.STUDY_PLAN_GET_ALL, () => {
    const rows = db.select().from(schema.studyPlans).all();
    return sortStudyPlans(rows).map((row) => toLegacyStudyPlan(row));
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
      updatedAt: formatLocalDateTime(),
    }).where(eq(schema.studyPlans.id, plan.id)).run();

    const updated = db.select().from(schema.studyPlans).where(eq(schema.studyPlans.id, plan.id)).get();
    return toLegacyStudyPlan(updated);
  });

  ipcMain.handle(IPC.STUDY_PLAN_DELETE, (_, id: number) => {
    db.delete(schema.studyPlans).where(eq(schema.studyPlans.id, id)).run();
    return { success: true };
  });

  // ==================== 每日记录 ====================
  ipcMain.handle(IPC.DAILY_RECORD_ADD, (_, record: any) => {
    const existing = db.select().from(schema.dailyRecords).where(eq(schema.dailyRecords.date, record.date)).get();
    if (existing) {
      const nextNote = record.note !== undefined && record.note !== '' ? record.note : existing.note;
      db.update(schema.dailyRecords).set({
        studyMinutes: existing.studyMinutes + (record.study_minutes || 0),
        questionsDone: existing.questionsDone + (record.questions_done || 0),
        wrongCount: existing.wrongCount + (record.wrong_count || 0),
        note: nextNote,
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
    const row = db.select().from(schema.dailyRecords).where(eq(schema.dailyRecords.date, date)).get();
    return toLegacyDailyRecord(row);
  });

  ipcMain.handle(IPC.DAILY_RECORD_GET_RANGE, (_, start: string, end: string) => {
    return db.select().from(schema.dailyRecords).all()
      .filter((row) => row.date >= start && row.date <= end)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map((row) => toLegacyDailyRecord(row));
  });

  ipcMain.handle(IPC.DAILY_RECORD_GET_STATS, (_, days: number) => {
    const cutoff = formatLocalDate(new Date(Date.now() - Math.max(days - 1, 0) * 86400000));
    const rows = db.select().from(schema.dailyRecords).all().filter((row) => row.date >= cutoff);
    const allWrongRecords = db.select().from(schema.wrongRecords).all();

    const stats = {
      total_minutes: rows.reduce((sum, row) => sum + Number(row.studyMinutes ?? 0), 0),
      total_questions: rows.reduce((sum, row) => sum + Number(row.questionsDone ?? 0), 0),
      total_wrong: rows.reduce((sum, row) => sum + Number(row.wrongCount ?? 0), 0),
      active_days: rows.length,
      streak: buildAchievementProgress({
        dailyRecords: rows,
        wrongRecords: allWrongRecords,
        flashcards: [],
        pomodoroRecords: [],
      }).streak,
      mastered_count: allWrongRecords.filter((row) => row.mastered).length,
    };

    return stats;
  });

  // ==================== 成就 ====================
  ipcMain.handle(IPC.ACHIEVEMENT_GET_ALL, () => {
    return db.select().from(schema.achievements).all()
      .sort((a, b) => a.type.localeCompare(b.type) || a.threshold - b.threshold)
      .map((row) => toLegacyAchievement(row));
  });

  ipcMain.handle(IPC.ACHIEVEMENT_CHECK, () => {
    const dailyRecords = db.select().from(schema.dailyRecords).all();
    const wrongRecords = db.select().from(schema.wrongRecords).all();
    const flashcards = db.select().from(schema.flashcards).all();
    const pomodoroRecords = db.select().from(schema.pomodoroRecords).all();
    const achievements = db.select().from(schema.achievements).all();

    const progressMap = buildAchievementProgress({
      dailyRecords,
      wrongRecords,
      flashcards,
      pomodoroRecords,
    });

    const now = formatLocalDateTime();
    const unlockableIds = getUnlockableAchievementIds(achievements, progressMap);
    for (const id of unlockableIds) {
      sqlite.prepare('UPDATE achievements SET unlocked_at = ? WHERE id = ? AND unlocked_at IS NULL').run(now, id);
    }

    return db.select().from(schema.achievements).all()
      .sort((a, b) => a.type.localeCompare(b.type) || a.threshold - b.threshold)
      .map((row) => toLegacyAchievement(row, progressMap[row.type] || 0));
  });

  // ==================== 记忆卡片 ====================
  ipcMain.handle(IPC.FLASHCARD_ADD, (_, card: any) => {
    const result = db.insert(schema.flashcards).values({
      front: card.front,
      back: card.back,
      category: card.category || '常识-政治',
      difficulty: card.difficulty || 'medium',
    }).returning().get();

    return toLegacyFlashcard(result);
  });

  ipcMain.handle(IPC.FLASHCARD_GET_ALL, (_, filters?: any) => {
    const rows = db.select().from(schema.flashcards).all();
    return applyFlashcardFilters(rows, filters).map((row) => toLegacyFlashcard(row));
  });

  ipcMain.handle(IPC.FLASHCARD_UPDATE, (_, card: any) => {
    const updates: Record<string, unknown> = {};
    if (card.front !== undefined) updates.front = card.front;
    if (card.back !== undefined) updates.back = card.back;
    if (card.category !== undefined) updates.category = card.category;
    if (card.difficulty !== undefined) updates.difficulty = card.difficulty;
    if (card.review_count !== undefined) updates.reviewCount = card.review_count;
    if (card.mastered !== undefined) updates.mastered = Boolean(card.mastered);
    if (card.next_review !== undefined) updates.nextReview = card.next_review;

    db.update(schema.flashcards).set(updates).where(eq(schema.flashcards.id, card.id)).run();

    const updated = db.select().from(schema.flashcards).where(eq(schema.flashcards.id, card.id)).get();
    return toLegacyFlashcard(updated);
  });

  ipcMain.handle(IPC.FLASHCARD_DELETE, (_, id: number) => {
    db.delete(schema.flashcards).where(eq(schema.flashcards.id, id)).run();
    return { success: true };
  });

  // ==================== 考试配置 ====================
  ipcMain.handle(IPC.EXAM_CONFIG_GET, () => {
    const row = db.select().from(schema.examConfig).all()
      .sort((a, b) => b.id - a.id)[0];
    return toLegacyExamConfig(row);
  });

  ipcMain.handle(IPC.EXAM_CONFIG_SET, (_, config: any) => {
    const existing = db.select().from(schema.examConfig).all().sort((a, b) => b.id - a.id)[0];
    if (existing) {
      db.update(schema.examConfig).set({ name: config.name, date: config.date }).where(eq(schema.examConfig.id, existing.id)).run();
    } else {
      db.insert(schema.examConfig).values({ name: config.name, date: config.date }).run();
    }

    return { name: config.name, date: config.date };
  });

  // ==================== 番茄钟 ====================
  ipcMain.handle(IPC.POMODORO_RECORD_ADD, (_, record: any) => {
    const result = db.insert(schema.pomodoroRecords).values({
      date: record.date,
      duration: record.duration || 25,
      mode: record.mode || 'work',
    }).returning().get();

    return toLegacyPomodoroRecord(result);
  });

  ipcMain.handle(IPC.POMODORO_RECORD_GET_BY_DATE, (_, date: string) => {
    return db.select().from(schema.pomodoroRecords).all()
      .filter((row) => row.date === date)
      .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))
      .map((row) => toLegacyPomodoroRecord(row));
  });

  ipcMain.handle(IPC.POMODORO_RECORD_GET_RANGE, (_, start: string, end: string) => {
    return db.select().from(schema.pomodoroRecords).all()
      .filter((row) => row.date >= start && row.date <= end)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))
      .map((row) => toLegacyPomodoroRecord(row));
  });

  // ==================== 鼓励语录 ====================
  ipcMain.handle(IPC.ENCOURAGE_GET_RANDOM, (_, category?: string) => {
    const rows = db.select().from(schema.encourageQuotes).all()
      .filter((row) => !category || row.category === category);

    if (rows.length === 0) return null;
    return toLegacyQuote(rows[Math.floor(Math.random() * rows.length)]);
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
      data[table] = sqlite.prepare(`SELECT * FROM ${table}`).all();
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

    sqlite.transaction(() => {
      for (const table of [...tables].reverse()) {
        sqlite.prepare(`DELETE FROM ${table}`).run();
      }

      for (const table of tables) {
        if (data[table] && Array.isArray(data[table])) {
          for (const row of data[table]) {
            const cols = Object.keys(row).join(', ');
            const placeholders = Object.keys(row).map(() => '?').join(', ');
            sqlite.prepare(`INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`).run(Object.values(row));
          }
        }
      }
    })();

    return { success: true };
  });
}
