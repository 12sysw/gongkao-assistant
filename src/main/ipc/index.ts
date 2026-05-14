import { ipcMain, dialog, app } from 'electron';
import { eq } from 'drizzle-orm';
import { db, sqlite } from '../db';
import { IPC } from '../../shared/ipc';
import * as schema from '../db/schema';
import { checkForUpdates, downloadUpdate, quitAndInstall } from '../updater';
import * as chroma from '../chroma';
import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
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

function normalizeIdList(value: unknown) {
  if (!Array.isArray(value)) return '[]';
  return JSON.stringify(
    value
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 0)
  );
}

const IMPORT_TABLES = ['questions', 'wrong_records', 'mind_maps', 'study_plans', 'daily_records', 'review_sessions', 'recommendation_events', 'achievements', 'flashcards', 'exam_config', 'pomodoro_records', 'encourage_quotes'] as const;
const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024;

function assertValidImportFile(filePath: string) {
  if (path.extname(filePath).toLowerCase() !== '.json') {
    throw new Error('只能导入 JSON 备份文件');
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    throw new Error('导入路径不是有效文件');
  }

  if (stat.size > MAX_IMPORT_FILE_SIZE) {
    throw new Error('导入文件过大，请确认选择的是应用导出的备份文件');
  }
}

function parseImportPayload(filePath: string) {
  assertValidImportFile(filePath);

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('备份文件格式不正确');
  }

  const hasKnownTable = IMPORT_TABLES.some((table) => table in parsed);
  if (!hasKnownTable) {
    throw new Error('备份文件缺少可导入的数据表');
  }

  for (const table of IMPORT_TABLES) {
    const value = parsed[table];
    if (value !== undefined && !Array.isArray(value)) {
      throw new Error(`备份文件中的 ${table} 格式不正确`);
    }
  }

  return parsed as Record<string, unknown>;
}

// 将长 PDF 文本按题目/段落拆分为多个知识片段
function splitPdfText(text: string, fileName: string): { index: number; content: string }[] {
  const MAX_CHUNK = 3000;

  // 尝试按题目编号拆分（如 1.、1．、第1题、1、 等）
  const questionPattern = /(?:^|\n)\s*(?:\d{1,3}[.．、）]\s|第\d{1,3}题)/g;
  const matches = [...text.matchAll(questionPattern)];

  if (matches.length >= 3) {
    const chunks: { index: number; content: string }[] = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index!;
      const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
      const content = text.slice(start, end).trim();
      if (content.length > 10) {
        chunks.push({ index: i + 1, content });
      }
    }
    if (chunks.length > 0) return chunks;
  }

  // 未能按题目拆分时，按固定长度切分
  if (text.length <= MAX_CHUNK) {
    return [{ index: 1, content: text }];
  }

  const chunks: { index: number; content: string }[] = [];
  let pos = 0;
  let idx = 1;
  while (pos < text.length) {
    let end = Math.min(pos + MAX_CHUNK, text.length);
    // 在段落边界切分
    if (end < text.length) {
      const lastNewline = text.lastIndexOf('\n', end);
      if (lastNewline > pos + MAX_CHUNK * 0.5) end = lastNewline;
    }
    const content = text.slice(pos, end).trim();
    if (content.length > 10) {
      chunks.push({ index: idx++, content });
    }
    pos = end;
  }
  return chunks;
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
    // Validate question exists
    const question = db.select().from(schema.questions).where(eq(schema.questions.id, record.question_id)).get();
    if (!question) {
      throw new Error(`题目ID ${record.question_id} 不存在，请先创建题目`);
    }

    // Check for existing wrong record for this question (merge duplicates)
    const existing = db.select().from(schema.wrongRecords)
      .where(eq(schema.wrongRecords.questionId, record.question_id))
      .get();

    if (existing) {
      const now = formatLocalDateTime();
      db.update(schema.wrongRecords).set({
        myAnswer: record.my_answer ?? existing.myAnswer,
        wrongCount: (existing.wrongCount ?? 0) + 1,
        lastWrongAt: now,
        note: record.note !== undefined && record.note !== '' ? record.note : existing.note,
      }).where(eq(schema.wrongRecords.id, existing.id)).run();

      const updated = db.select().from(schema.wrongRecords).where(eq(schema.wrongRecords.id, existing.id)).get();
      return toLegacyWrongRecord(updated, question);
    }

    const result = db.insert(schema.wrongRecords).values({
      questionId: record.question_id,
      myAnswer: record.my_answer,
      note: record.note || '',
    }).returning().get();

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
    if (record.wrong_count !== undefined) updates.wrongCount = record.wrong_count;
    if (record.review_count !== undefined) updates.reviewCount = record.review_count;

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
    const reviewSessions = db.select().from(schema.reviewSessions).all();
    const achievements = db.select().from(schema.achievements).all();

    const progressMap = buildAchievementProgress({
      dailyRecords,
      wrongRecords,
      flashcards,
      pomodoroRecords,
      reviewSessions,
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

  ipcMain.handle(IPC.REVIEW_SESSION_GET, (_, date: string) => {
    const row = db.select().from(schema.reviewSessions).where(eq(schema.reviewSessions.date, date)).get();
    if (!row) {
      return {
        date,
        started: false,
        initial_total: 0,
        completed_wrong_ids: [],
        completed_flashcard_ids: [],
      };
    }

    return {
      date: row.date,
      started: !!row.started,
      initial_total: row.initialTotal ?? 0,
      completed_wrong_ids: JSON.parse(row.completedWrongIds ?? '[]'),
      completed_flashcard_ids: JSON.parse(row.completedFlashcardIds ?? '[]'),
    };
  });

  ipcMain.handle(IPC.REVIEW_SESSION_SET, (_, session: any) => {
    const payload = {
      date: String(session?.date ?? formatLocalDate()),
      started: Boolean(session?.started),
      initialTotal: Number(session?.initial_total ?? 0),
      completedWrongIds: normalizeIdList(session?.completed_wrong_ids),
      completedFlashcardIds: normalizeIdList(session?.completed_flashcard_ids),
      updatedAt: formatLocalDateTime(),
    };

    const existing = db.select().from(schema.reviewSessions).where(eq(schema.reviewSessions.date, payload.date)).get();
    if (existing) {
      db.update(schema.reviewSessions).set(payload).where(eq(schema.reviewSessions.id, existing.id)).run();
    } else {
      db.insert(schema.reviewSessions).values(payload).run();
    }

    return {
      date: payload.date,
      started: !!payload.started,
      initial_total: payload.initialTotal,
      completed_wrong_ids: JSON.parse(payload.completedWrongIds),
      completed_flashcard_ids: JSON.parse(payload.completedFlashcardIds),
    };
  });

  ipcMain.handle(IPC.REVIEW_SESSION_GET_RECENT, (_, days: number) => {
    const limit = Math.max(1, Math.min(Number(days) || 7, 30));
    return db.select().from(schema.reviewSessions).all()
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, limit)
      .map((row) => ({
        date: row.date,
        started: row.started ? 1 : 0,
        initial_total: row.initialTotal ?? 0,
        completed_wrong_ids: JSON.parse(row.completedWrongIds ?? '[]'),
        completed_flashcard_ids: JSON.parse(row.completedFlashcardIds ?? '[]'),
      }));
  });

  ipcMain.handle(IPC.RECOMMENDATION_EVENT_ADD, (_, event: any) => {
    db.insert(schema.recommendationEvents).values({
      date: String(event?.date ?? formatLocalDate()),
      source: String(event?.source ?? 'unknown'),
      title: String(event?.title ?? 'unknown'),
      href: String(event?.href ?? '/'),
    }).run();

    return { success: true };
  });

  ipcMain.handle(IPC.RECOMMENDATION_EVENT_GET_RECENT, (_, days: number) => {
    const limit = Math.max(1, Math.min(Number(days) || 7, 30));
    return db.select().from(schema.recommendationEvents).all()
      .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
      .slice(0, limit * 10)
      .map((row) => ({
        id: row.id,
        date: row.date,
        source: row.source,
        title: row.title,
        href: row.href,
        created_at: row.createdAt ?? null,
      }));
  });

  // ==================== 数据导入导出 ====================
  ipcMain.handle(IPC.DATA_EXPORT, async () => {
    const result = await dialog.showSaveDialog({
      title: '导出数据',
      defaultPath: 'gongkao-backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled) return { success: false };

    const data: any = {};
    for (const table of IMPORT_TABLES) {
      data[table] = sqlite.prepare(`SELECT * FROM ${table}`).all();
    }

    // Include AI config if available
    const aiConfigPath = path.join(app.getPath('userData'), 'ai_config.json');
    if (fs.existsSync(aiConfigPath)) {
      try {
        data._ai_config = JSON.parse(fs.readFileSync(aiConfigPath, 'utf-8'));
      } catch (_) { /* ignore */ }
    }

    fs.writeFileSync(result.filePath!, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, path: result.filePath };
  });

  ipcMain.handle(IPC.DATA_IMPORT, async () => {
    const result = await dialog.showOpenDialog({
      title: '导入数据',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled) return { success: false };

    const filePath = result.filePaths[0];
    const data = parseImportPayload(filePath);

    sqlite.transaction(() => {
      for (const table of [...IMPORT_TABLES].reverse()) {
        sqlite.prepare(`DELETE FROM ${table}`).run();
      }

      for (const table of IMPORT_TABLES) {
        if (data[table] && Array.isArray(data[table])) {
          for (const row of data[table]) {
            if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
            // Validate column names against actual DB columns
            const tableInfo = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
            const validCols = new Set(tableInfo.map((c) => c.name));
            const safeCols = Object.keys(row).filter((col) => validCols.has(col));
            if (safeCols.length === 0) continue;
            const cols = safeCols.join(', ');
            const placeholders = safeCols.map(() => '?').join(', ');
            const values = safeCols.map((col) => (row as Record<string, unknown>)[col]);
            sqlite.prepare(`INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`).run(...values);
          }
        }
      }
    })();

    // Restore AI config if present in backup
    if (data._ai_config) {
      const aiConfigPath = path.join(app.getPath('userData'), 'ai_config.json');
      try {
        fs.writeFileSync(aiConfigPath, JSON.stringify(data._ai_config, null, 2), 'utf-8');
      } catch (_) { /* ignore */ }
    }

    return { success: true };
  });

  // 聊天室 - 通过云函数生成 UserSig（SecretKey 仅存储在云函数环境变量中）
  ipcMain.handle(IPC.CHAT_GENERATE_USER_SIG, async (_event, userID: string) => {
    const url = 'https://1427868409-96ux8dbho1.ap-guangzhou.tencentscf.com';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID }),
      });
      if (!response.ok) {
        console.error('[Chat] UserSig generation failed: HTTP', response.status);
        return '';
      }
      const data = (await response.json()) as { userSig: string };
      return data.userSig;
    } catch (err) {
      console.error('[Chat] generateUserSig error:', err);
      return '';
    }
  });

  // ==================== RAG 知识库 ====================
  // RAG 配置
  const RAG_CONFIG_PATH = path.join(app.getPath('userData'), 'rag_config.json');

  function getRagConfig() {
    try {
      if (fs.existsSync(RAG_CONFIG_PATH)) {
        const config = JSON.parse(fs.readFileSync(RAG_CONFIG_PATH, 'utf-8'));
        // 兼容旧配置格式
        if (config.apiUrl && !config.embedApiUrl) {
          return {
            embedApiUrl: config.apiUrl,
            embedApiKey: config.apiKey,
            embedModel: config.embedModel || '',
            rerankerModel: config.rerankerModel || '',
            llmApiUrl: config.apiUrl,
            llmApiKey: config.apiKey,
            llmModel: config.llmModel || '',
          };
        }
        return config;
      }
    } catch (_) { /* ignore */ }
    return { embedApiUrl: '', embedApiKey: '', embedModel: '', rerankerModel: '', llmApiUrl: '', llmApiKey: '', llmModel: '' };
  }

  function saveRagConfig(config: any) {
    fs.writeFileSync(RAG_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  }

  ipcMain.handle(IPC.RAG_CONFIG_GET, () => getRagConfig());
  ipcMain.handle(IPC.RAG_CONFIG_SET, (_, config: any) => {
    saveRagConfig(config);
    return { success: true };
  });

  // Embedding 计算
  async function computeEmbedding(text: string, config: any): Promise<number[] | null> {
    if (!config.embedApiUrl || !config.embedApiKey || !config.embedModel) return null;
    try {
      const baseUrl = config.embedApiUrl.replace(/\/+$/, '');
      const resp = await fetch(`${baseUrl}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.embedApiKey}` },
        body: JSON.stringify({ model: config.embedModel, input: text }),
      });
      if (!resp.ok) return null;
      const data = (await resp.json()) as any;
      return data.data?.[0]?.embedding ?? null;
    } catch (err) {
      console.error('[RAG] Embedding error:', err);
      return null;
    }
  }

  // 余弦相似度
  function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
  }

  // RAG 文档 CRUD
  ipcMain.handle(IPC.RAG_DOC_ADD, (_, doc: any) => {
    const result = db.insert(schema.ragDocs).values({
      title: doc.title,
      content: doc.content,
      source: doc.source || 'manual',
      category: doc.category || 'common',
    }).returning().get();
    return {
      id: result.id,
      title: result.title,
      content: result.content,
      source: result.source,
      category: result.category,
      created_at: result.createdAt,
      updated_at: result.updatedAt,
    };
  });

  ipcMain.handle(IPC.RAG_DOC_GET_ALL, () => {
    const rows = sqlite.prepare(`
      SELECT id, title, content, source, category, created_at, updated_at
      FROM rag_docs ORDER BY created_at DESC
    `).all() as any[];
    return rows;
  });

  ipcMain.handle(IPC.RAG_DOC_GET_BY_ID, (_, id: number) => {
    return sqlite.prepare(`
      SELECT id, title, content, source, category, created_at, updated_at
      FROM rag_docs WHERE id = ?
    `).get(id) ?? null;
  });

  ipcMain.handle(IPC.RAG_DOC_UPDATE, (_, doc: any) => {
    db.update(schema.ragDocs).set({
      title: doc.title,
      content: doc.content,
      source: doc.source,
      category: doc.category,
      updatedAt: formatLocalDateTime(),
    }).where(eq(schema.ragDocs.id, doc.id)).run();
    const d = db.select().from(schema.ragDocs).where(eq(schema.ragDocs.id, doc.id)).get();
    if (!d) return null;
    return {
      id: d.id,
      title: d.title,
      content: d.content,
      source: d.source,
      category: d.category,
      created_at: d.createdAt,
      updated_at: d.updatedAt,
    };
  });

  ipcMain.handle(IPC.RAG_DOC_DELETE, async (_, id: number) => {
    db.delete(schema.ragDocs).where(eq(schema.ragDocs.id, id)).run();
    if (chroma.isChromaReady()) await chroma.deleteDocuments([id]);
    return { success: true };
  });

  // 同步题库为知识文档
  ipcMain.handle(IPC.RAG_SYNC_QUESTIONS, async () => {
    const questions = db.select().from(schema.questions).all();
    const existingDocs = db.select().from(schema.ragDocs).where(eq(schema.ragDocs.source, 'question_bank')).all();
    const existingIds = new Set(existingDocs.map((d) => d.title));

    let synced = 0;
    for (const q of questions) {
      const title = `题目#${q.id}: ${q.content.slice(0, 50)}`;
      if (existingIds.has(title)) continue;

      const content = [
        `类型: ${q.type}`,
        `题目: ${q.content}`,
        q.options ? `选项: ${q.options}` : '',
        `答案: ${q.answer}`,
        q.explanation ? `解析: ${q.explanation}` : '',
        q.tags ? `标签: ${q.tags}` : '',
      ].filter(Boolean).join('\n');

      db.insert(schema.ragDocs).values({
        title,
        content,
        source: 'question_bank',
        category: q.type,
      }).run();
      synced++;
    }
    return { synced };
  });

  // 批量删除文档
  ipcMain.handle(IPC.RAG_DOC_DELETE_BATCH, async (_, ids: number[]) => {
    const placeholders = ids.map(() => '?').join(',');
    sqlite.prepare(`DELETE FROM rag_docs WHERE id IN (${placeholders})`).run(...ids);
    if (chroma.isChromaReady()) await chroma.deleteDocuments(ids);
    return { deleted: ids.length };
  });

  // Embed 单个文档
  ipcMain.handle(IPC.RAG_EMBED_DOC, async (_, id: number) => {
    const config = getRagConfig();
    const doc = db.select().from(schema.ragDocs).where(eq(schema.ragDocs.id, id)).get();
    if (!doc) return { success: false };

    const text = `${doc.title}\n${doc.content}`;
    const embedding = await computeEmbedding(text, config);
    if (!embedding) return { success: false };

    db.update(schema.ragDocs).set({
      embedding: JSON.stringify(embedding),
      updatedAt: formatLocalDateTime(),
    }).where(eq(schema.ragDocs.id, id)).run();

    // Sync to ChromaDB
    if (chroma.isChromaReady()) {
      await chroma.addDocuments([{
        id: doc.id,
        content: doc.content,
        embedding,
        metadata: { title: doc.title, category: doc.category ?? 'common', source: doc.source ?? 'manual' },
      }]);
    }

    return { success: true };
  });

  // FTS5 + ChromaDB 向量混合搜索
  ipcMain.handle(IPC.RAG_SEARCH, async (_, query: string, topK: number = 5) => {
    const config = getRagConfig();

    // 阶段一: FTS5 召回
    let ftsResults: any[] = [];
    try {
      ftsResults = sqlite.prepare(`
        SELECT d.id, d.title, d.content, d.source, d.category, bm25(rag_fts) as rank
        FROM rag_fts
        JOIN rag_docs d ON d.id = rag_fts.rowid
        WHERE rag_fts MATCH ?
        ORDER BY rank
        LIMIT 20
      `).all(query);
    } catch (_) {
      // FTS5 可能因特殊字符报错，降级为 LIKE 搜索
      ftsResults = sqlite.prepare(`
        SELECT id, title, content, source, category, 0 as rank
        FROM rag_docs
        WHERE title LIKE ? OR content LIKE ?
        LIMIT 20
      `).all(`%${query}%`, `%${query}%`);
    }

    // 阶段二: 向量搜索
    const queryEmbedding = await computeEmbedding(query, config);
    if (queryEmbedding) {
      // 优先使用 ChromaDB，否则回退到内存余弦相似度
      let vectorResults: Array<{ id: number; title: string; content: string; source: string; category: string; score: number }>;

      if (chroma.isChromaReady()) {
        const chromaResults = await chroma.queryByEmbedding(queryEmbedding, topK * 2);
        vectorResults = chromaResults.map((r) => ({
          id: Number(r.id),
          title: r.metadata.title ?? '',
          content: r.content,
          source: r.metadata.source ?? '',
          category: r.metadata.category ?? '',
          score: r.score,
        }));
      } else {
        // Fallback: 内存余弦相似度
        const allDocs = db.select().from(schema.ragDocs).all();
        vectorResults = allDocs
          .filter((d) => d.embedding)
          .map((d) => {
            const emb = JSON.parse(d.embedding!);
            const score = cosineSimilarity(queryEmbedding, emb);
            return { id: d.id, title: d.title, content: d.content, source: d.source ?? '', category: d.category ?? '', score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, topK * 2);
      }

      // 合并 FTS 和向量结果，去重
      const merged = new Map<number, any>();
      for (const r of ftsResults) {
        merged.set(r.id, { ...r, ftsRank: r.rank, vectorScore: 0 });
      }
      for (const r of vectorResults) {
        if (merged.has(r.id)) {
          merged.get(r.id).vectorScore = r.score;
        } else {
          merged.set(r.id, { ...r, ftsRank: 0, vectorScore: r.score });
        }
      }
      return [...merged.values()]
        .sort((a, b) => b.vectorScore - a.vectorScore)
        .slice(0, topK);
    }

    return ftsResults.slice(0, topK);
  });

  // LLM 问答 (带流式推送)
  ipcMain.handle(IPC.RAG_CHAT, async (event, sessionId: number, message: string) => {
    const config = getRagConfig();
    if (!config.llmApiUrl || !config.llmApiKey) {
      event.sender.send(IPC.RAG_STREAM_END);
      return { error: '请先在 RAG 设置中配置对话模型 API' };
    }

    // 保存用户消息
    db.insert(schema.ragMessages).values({
      sessionId,
      role: 'user',
      content: message,
    }).run();

    // 检索相关文档 (ChromaDB 向量搜索 + FTS5 关键词搜索)
    const searchResults = await (async () => {
      const queryEmbedding = await computeEmbedding(message, config);
      let ftsResults: any[] = [];
      try {
        ftsResults = sqlite.prepare(`
          SELECT d.id, d.title, d.content, d.source, d.category, bm25(rag_fts) as rank
          FROM rag_fts JOIN rag_docs d ON d.id = rag_fts.rowid
          WHERE rag_fts MATCH ?
          ORDER BY rank LIMIT 10
        `).all(message);
      } catch (_) {
        ftsResults = sqlite.prepare(`
          SELECT id, title, content, source, category, 0 as rank
          FROM rag_docs WHERE title LIKE ? OR content LIKE ? LIMIT 10
        `).all(`%${message}%`, `%${message}%`);
      }

      if (queryEmbedding) {
        let vectorResults: Array<{ id: number; title: string; content: string; source: string; category: string; score: number }>;

        if (chroma.isChromaReady()) {
          const chromaResults = await chroma.queryByEmbedding(queryEmbedding, 10);
          vectorResults = chromaResults.map((r) => ({
            id: Number(r.id),
            title: r.metadata.title ?? '',
            content: r.content,
            source: r.metadata.source ?? '',
            category: r.metadata.category ?? '',
            score: r.score,
          }));
        } else {
          const allDocs = db.select().from(schema.ragDocs).all();
          vectorResults = allDocs
            .filter((d) => d.embedding)
            .map((d) => ({
              id: d.id, title: d.title, content: d.content, source: d.source ?? '', category: d.category ?? '',
              score: cosineSimilarity(queryEmbedding, JSON.parse(d.embedding!)),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        }

        const merged = new Map<number, any>();
        for (const r of ftsResults) merged.set(r.id, r);
        for (const r of vectorResults) {
          if (merged.has(r.id)) merged.get(r.id).score = r.score;
          else merged.set(r.id, r);
        }
        return [...merged.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5);
      }
      return ftsResults.slice(0, 5);
    })();

    // 构建上下文
    const context = searchResults.map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`).join('\n\n---\n\n');

    // 获取历史消息
    const history = db.select().from(schema.ragMessages)
      .where(eq(schema.ragMessages.sessionId, sessionId))
      .all()
      .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))
      .slice(-10);

    const messages = [
      { role: 'system', content: `你是一个公考知识助手。根据以下参考资料回答用户问题。如果资料中没有相关内容，请如实说明。回答时请引用资料编号如 [1] [2]。\n\n参考资料:\n${context}` },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    // 调用 LLM API
    const baseUrl = config.llmApiUrl.replace(/\/+$/, '');
    let answer = '';
    try {
      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.llmApiKey}` },
        body: JSON.stringify({
          model: config.llmModel || 'deepseek-chat',
          messages,
          max_tokens: 2000,
          stream: true,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        answer = `API 错误 (${resp.status}): ${errText.slice(0, 200)}`;
      } else {
        // 流式读取
        const reader = resp.body?.getReader();
        if (!reader) {
          answer = '无法读取响应流';
        } else {
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data:')) continue;
              const data = trimmed.slice(5).trim();
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  answer += delta;
                  event.sender.send(IPC.RAG_STREAM_CHUNK, delta);
                }
              } catch (_) { /* skip malformed chunks */ }
            }
          }
        }
      }
    } catch (err) {
      console.error('[RAG] LLM error:', err);
      answer = `请求失败: ${err}`;
    }

    // 先保存助手消息，再通知流结束，避免竞态
    if (answer) {
      db.insert(schema.ragMessages).values({
        sessionId,
        role: 'assistant',
        content: answer,
        sources: JSON.stringify(searchResults.map((r) => ({ id: r.id, title: r.title }))),
      }).returning().get();
    }

    // 更新会话标题
    db.update(schema.ragSessions).set({
      title: message.slice(0, 30),
      updatedAt: formatLocalDateTime(),
    }).where(eq(schema.ragSessions.id, sessionId)).run();

    event.sender.send(IPC.RAG_STREAM_END);

    return { answer, sources: searchResults.map((r) => ({ id: r.id, title: r.title, source: r.source })) };
  });

  // 错题 AI 分析 (RAG + LLM)
  ipcMain.handle(IPC.WRONG_BOOK_ANALYZE, async (event, recordId: number) => {
    const config = getRagConfig();
    if (!config.llmApiUrl || !config.llmApiKey) {
      return { error: '请先在智能问答中配置对话模型 API' };
    }

    const wrongRecord = db.select().from(schema.wrongRecords).where(eq(schema.wrongRecords.id, recordId)).get();
    if (!wrongRecord) return { error: '错题记录不存在' };

    const question = db.select().from(schema.questions).where(eq(schema.questions.id, wrongRecord.questionId)).get();
    if (!question) return { error: '题目不存在' };

    // 从知识库检索同类型题目
    let relatedDocs: any[] = [];
    try {
      relatedDocs = sqlite.prepare(`
        SELECT id, title, content FROM rag_docs WHERE category LIKE ? LIMIT 5
      `).all(`%${question.type}%`);
    } catch (_) { /* ignore */ }

    const context = relatedDocs.length > 0
      ? relatedDocs.map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`).join('\n\n')
      : '无相关参考资料';

    const prompt = `你是公务员考试辅导专家。请分析以下错题并给出学习建议。

题目类型：${question.type}
题目内容：${question.content}
选项：${question.options || '无'}
正确答案：${question.answer}
考生答案：${wrongRecord.myAnswer}
解析：${question.explanation || '无'}
错题次数：${wrongRecord.wrongCount}

参考资料：
${context}

请从以下方面分析：
1. 【错因分析】为什么会做错？是知识点不熟、审题不清还是计算错误？
2. 【知识点梳理】这道题涉及的核心考点和相关知识点
3. 【解题技巧】下次遇到类似题目的解题思路
4. 【举一反三】给出1-2道类似的真题或模拟题`;

    const baseUrl = config.llmApiUrl.replace(/\/+$/, '');
    let answer = '';
    try {
      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.llmApiKey}` },
        body: JSON.stringify({
          model: config.llmModel || 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          stream: true,
        }),
      });

      if (!resp.ok) return { error: `API 错误: ${resp.status}` };

      const reader = resp.body?.getReader();
      if (!reader) return { error: '无法读取响应流' };

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              answer += delta;
              event.sender.send(IPC.RAG_STREAM_CHUNK, delta);
            }
          } catch (_) { /* skip malformed chunks */ }
        }
      }
    } catch (err) {
      console.error('[AI] Wrong question analysis error:', err);
      return { error: `请求失败: ${err}` };
    }

    event.sender.send(IPC.RAG_STREAM_END);

    // 保存分析结果到错题记录
    db.update(schema.wrongRecords).set({ note: answer }).where(eq(schema.wrongRecords.id, recordId)).run();

    return { analysis: answer };
  });

  // RAG 会话 CRUD
  ipcMain.handle(IPC.RAG_SESSION_CREATE, (_, title?: string) => {
    const row = db.insert(schema.ragSessions).values({ title: title || '新对话' }).returning().get();
    return { id: row.id, title: row.title, created_at: row.createdAt, updated_at: row.updatedAt };
  });

  ipcMain.handle(IPC.RAG_SESSION_GET_ALL, () => {
    return db.select().from(schema.ragSessions).all()
      .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
      .map((r) => ({ id: r.id, title: r.title, created_at: r.createdAt, updated_at: r.updatedAt }));
  });

  ipcMain.handle(IPC.RAG_SESSION_GET, (_, id: number) => {
    const r = db.select().from(schema.ragSessions).where(eq(schema.ragSessions.id, id)).get();
    if (!r) return null;
    return { id: r.id, title: r.title, created_at: r.createdAt, updated_at: r.updatedAt };
  });

  ipcMain.handle(IPC.RAG_SESSION_DELETE, (_, id: number) => {
    db.delete(schema.ragMessages).where(eq(schema.ragMessages.sessionId, id)).run();
    db.delete(schema.ragSessions).where(eq(schema.ragSessions.id, id)).run();
    return { success: true };
  });

  ipcMain.handle(IPC.RAG_SESSION_ADD_MESSAGE, (_, msg: any) => {
    return db.insert(schema.ragMessages).values({
      sessionId: msg.session_id,
      role: msg.role,
      content: msg.content,
      sources: msg.sources ? JSON.stringify(msg.sources) : '[]',
    }).returning().get();
  });

  ipcMain.handle(IPC.RAG_SESSION_GET_MESSAGES, (_, sessionId: number) => {
    return db.select().from(schema.ragMessages)
      .where(eq(schema.ragMessages.sessionId, sessionId))
      .all()
      .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))
      .map((m) => ({
        id: m.id,
        session_id: m.sessionId,
        role: m.role,
        content: m.content,
        sources: m.sources ? JSON.parse(m.sources) : [],
        created_at: m.createdAt,
      }));
  });

  // 批量导入 PDF 文件到知识库
  ipcMain.handle(IPC.RAG_IMPORT_PDFS, async (_, dirPath: string) => {
    if (!dirPath || !fs.existsSync(dirPath)) {
      return { imported: 0, skipped: 0, errors: 0, message: '目录不存在' };
    }

    const pdfFiles: string[] = [];
    function walkDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.name.toLowerCase().endsWith('.pdf')) {
          pdfFiles.push(fullPath);
        }
      }
    }
    walkDir(dirPath);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // 获取现有文档标题，避免重复导入
    const existingDocs = db.select().from(schema.ragDocs).all();
    const existingTitles = new Set(existingDocs.map((d) => d.title));

    for (const filePath of pdfFiles) {
      try {
        const fileName = path.basename(filePath, '.pdf');

        if (existingTitles.has(fileName)) {
          skipped++;
          continue;
        }

        const dataBuffer = fs.readFileSync(filePath);
        const pdfParser = new PDFParse(new Uint8Array(dataBuffer));
        const pdfData = await pdfParser.getText();
        pdfParser.destroy();
        const text = pdfData.text?.trim();

        if (!text || text.length < 50) {
          skipped++;
          continue;
        }

        // 从文件路径推断分类
        const relPath = path.relative(dirPath, filePath);
        const parts = relPath.split(/[/\\]/);
        const category = parts.length > 1 ? parts[0] : '国考真题';

        // 判断是真题还是解析
        const isAnswer = fileName.includes('答案') || fileName.includes('解析') || fileName.includes('参考答案');

        // 如果文本很长，按章节/题目拆分
        const chunks = splitPdfText(text, fileName);
        for (const chunk of chunks) {
          const title = chunks.length > 1
            ? `${fileName} (${chunk.index}/${chunks.length})`
            : fileName;

          if (existingTitles.has(title)) {
            skipped++;
            continue;
          }

          db.insert(schema.ragDocs).values({
            title,
            content: chunk.content,
            source: isAnswer ? 'pdf_answer' : 'pdf_exam',
            category,
          }).run();
          existingTitles.add(title);
          imported++;
        }
      } catch (err) {
        console.error(`[RAG] Failed to parse PDF: ${filePath}`, err);
        errors++;
      }
    }

    return { imported, skipped, errors };
  });

  // ==================== ChromaDB 管理 ====================
  ipcMain.handle(IPC.RAG_CHROMA_STATUS, () => chroma.getStatus());

  ipcMain.handle(IPC.RAG_CHROMA_MIGRATE, async () => {
    if (!chroma.isChromaReady()) {
      return { migrated: 0, failed: 0, error: 'ChromaDB 服务未启动' };
    }
    const docs = db.select().from(schema.ragDocs).all();
    const withEmbedding = docs
      .filter((d) => d.embedding)
      .map((d) => ({
        id: d.id,
        content: d.content,
        embedding: d.embedding!,
        title: d.title,
        category: d.category ?? 'common',
        source: d.source ?? 'manual',
      }));
    return chroma.migrateFromSqlite(withEmbedding);
  });

  // ==================== AI 个性化推荐 ====================
  ipcMain.handle(IPC.RAG_AI_RECOMMEND, async () => {
    const config = getRagConfig();
    if (!config.llmApiUrl || !config.llmApiKey) {
      return { recommendations: '' };
    }

    // 收集用户学习数据
    const wrongRecords = db.select().from(schema.wrongRecords).all();
    const questions = db.select().from(schema.questions).all();
    const dailyRecords = db.select().from(schema.dailyRecords).all();
    const flashcards = db.select().from(schema.flashcards).all();
    const studyPlans = db.select().from(schema.studyPlans).all();
    const pomodoroRecords = db.select().from(schema.pomodoroRecords).all();

    // 统计错题分布
    const questionMap = new Map(questions.map((q) => [q.id, q]));
    const wrongByType: Record<string, { total: number; mastered: number }> = {};
    for (const wr of wrongRecords) {
      const q = questionMap.get(wr.questionId);
      const type = q?.type ?? '未分类';
      if (!wrongByType[type]) wrongByType[type] = { total: 0, mastered: 0 };
      wrongByType[type].total++;
      if (wr.mastered) wrongByType[type].mastered++;
    }

    // 最近7天学习情况
    const today = formatLocalDate();
    const weekAgo = formatLocalDate(new Date(Date.now() - 6 * 86400000));
    const recentDays = dailyRecords.filter((r) => r.date >= weekAgo && r.date <= today);
    const totalMinutes = recentDays.reduce((sum, r) => sum + (r.studyMinutes ?? 0), 0);
    const totalQuestions = recentDays.reduce((sum, r) => sum + (r.questionsDone ?? 0), 0);
    const activeDays = recentDays.length;

    // 番茄钟统计
    const recentPomodoros = pomodoroRecords.filter((r) => r.date >= weekAgo && r.date <= today);
    const pomodoroCount = recentPomodoros.filter((r) => r.mode === 'work').length;

    // 待复习错题数
    const dueWrong = wrongRecords.filter((r) => !r.mastered && isDueReview(r.nextReviewAt)).length;

    // 待复习卡片数
    const dueFlashcards = flashcards.filter((f) => !f.mastered && String(f.nextReview ?? '').slice(0, 10) <= today).length;

    // 学习计划状态
    const activePlans = studyPlans.filter((p) => p.status !== 'completed');

    const prompt = `你是一位公务员考试备考规划师。根据以下学习数据，给出今天的个性化学习建议。

## 学习数据概览
- 最近7天学习 ${activeDays} 天，共 ${totalMinutes} 分钟，做题 ${totalQuestions} 道
- 完成番茄钟 ${pomodoroCount} 个
- 题库总题数：${questions.length}
- 错题总数：${wrongRecords.length}，已掌握：${wrongRecords.filter((r) => r.mastered).length}

## 错题分布
${Object.entries(wrongByType).map(([type, stat]) => `- ${type}：${stat.total}题（已掌握${stat.mastered}）`).join('\n')}

## 当前待办
- 待复习错题：${dueWrong} 道
- 待复习卡片：${dueFlashcards} 张
- 进行中的学习计划：${activePlans.length} 个${activePlans.length > 0 ? '（' + activePlans.map((p) => p.title).join('、') + '）' : ''}

## 要求
请给出3-5条具体的、可执行的今日学习建议，包括：
1. 今天应该优先做什么（基于薄弱环节和待复习项）
2. 建议的时间分配
3. 需要重点突破的题型和知识点
4. 学习节奏建议

用简洁的中文回答，不要使用markdown格式，每条建议用【序号】开头。`;

    const baseUrl = config.llmApiUrl.replace(/\/+$/, '');
    try {
      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.llmApiKey}` },
        body: JSON.stringify({
          model: config.llmModel || 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          stream: false,
        }),
      });

      if (!resp.ok) return { recommendations: '' };
      const data = (await resp.json()) as any;
      const content = data.choices?.[0]?.message?.content ?? '';
      return { recommendations: content };
    } catch (err) {
      console.error('[AI Recommend] Error:', err);
      return { recommendations: '' };
    }
  });

  // ==================== 自动更新 ====================
  ipcMain.handle(IPC.UPDATE_CHECK, async () => {
    await checkForUpdates();
  });

  ipcMain.handle(IPC.UPDATE_DOWNLOAD, async () => {
    await downloadUpdate();
  });

  ipcMain.handle(IPC.UPDATE_INSTALL, () => {
    quitAndInstall();
  });
}
