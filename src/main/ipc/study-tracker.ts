import fs from 'fs';
import path from 'path';
import { app, ipcMain } from 'electron';
import { IPC } from '../../shared/ipc';
import type { StudyTrackerActionResult, StudyTrackerStatus } from '../../shared/ipc';

interface TrackerModules {
  parseInput: {
    handleMessage: (
      message: { type: 'text'; text: string },
      options?: { sendMessage?: (message: string) => Promise<void> }
    ) => Promise<Record<string, any>>;
  };
  updateDaily: {
    updateDailyRecord: (parsed: Record<string, any>, note?: string) => Record<string, any>;
    readStatsCache: () => Record<string, any> | null;
    saveWrongQuestion: (question: Record<string, any>) => Record<string, any>[];
  };
  dailySummary: { buildSummaryMessage: () => string };
  reviewReminder: { buildReminderMessage: () => string };
}

function resolveSkillRoot() {
  const candidates = [
    path.resolve(__dirname, '../../skills/kaogong-study-tracker'),
    path.resolve(process.cwd(), 'dist/main/skills/kaogong-study-tracker'),
    path.resolve(process.cwd(), 'src/main/skills/kaogong-study-tracker'),
  ];
  return candidates.find((candidate) => fs.existsSync(path.join(candidate, 'SKILL.md'))) ?? candidates[0];
}

function getTrackerDataDir() {
  return path.join(app.getPath('home'), '.kaogong-study-tracker', 'data');
}

function requireTrackerModule(relativePath: string) {
  const modulePath = path.join(resolveSkillRoot(), relativePath);
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

function loadTrackerModules(): TrackerModules {
  // The bundled upstream files remain unchanged. The adapter only selects their data directory.
  process.env.KAOGONG_DATA_DIR = getTrackerDataDir();
  return {
    parseInput: requireTrackerModule('scripts/parse_input.js'),
    updateDaily: requireTrackerModule('scripts/update_daily.js'),
    dailySummary: requireTrackerModule('scripts/daily_summary.js'),
    reviewReminder: requireTrackerModule('scripts/review_reminder.js'),
  };
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export function getStudyTrackerStatus(): StudyTrackerStatus {
  const skillRoot = resolveSkillRoot();
  const dataDir = getTrackerDataDir();
  const available = fs.existsSync(path.join(skillRoot, 'SKILL.md'));
  let stats: Record<string, any> = {};

  if (available) {
    try {
      stats = loadTrackerModules().updateDaily.readStatsCache() ?? {};
    } catch (error) {
      console.error('[study-tracker] Unable to read stats cache', error);
    }
  }

  const wrongQuestions = readJson<any[]>(path.join(dataDir, 'wrong_questions.json'), []);
  const dailyDir = path.join(dataDir, 'daily');
  const dailyRecordCount = fs.existsSync(dailyDir)
    ? fs.readdirSync(dailyDir).filter((name) => name.endsWith('.json')).length
    : 0;

  return {
    available,
    total_days_studied: Number(stats.total_days_studied ?? dailyRecordCount),
    streak: Number(stats.streak ?? 0),
    module_accuracy: stats.module_accuracy ?? {},
    pending_review_count: wrongQuestions.filter((item) => item?.status !== '\u5df2\u638c\u63e1').length,
  };
}

function actionError(error: unknown): StudyTrackerActionResult {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[study-tracker] Action failed', error);
  return { success: false, kind: 'error', message };
}

async function recordStudyText(text: string): Promise<StudyTrackerActionResult> {
  const value = String(text ?? '').trim();
  if (!value) {
    return { success: false, kind: 'validation', message: '\u8bf7\u8f93\u5165\u6253\u5361\u5185\u5bb9\u3002' };
  }

  try {
    const tracker = loadTrackerModules();
    let reviewMessage = '';
    const parsed = await tracker.parseInput.handleMessage(
      { type: 'text', text: value },
      { sendMessage: async (message) => { reviewMessage = message; } }
    );

    if (parsed?._review) {
      return {
        success: true,
        kind: 'review',
        message: reviewMessage || '\u4e8c\u5237\u7ed3\u679c\u5df2\u8bb0\u5f55\u3002',
        status: getStudyTrackerStatus(),
      };
    }

    if (parsed?._export) {
      return {
        success: false,
        kind: 'validation',
        message: '\u5f53\u524d\u7cbe\u7b80\u7248\u4e0d\u5f00\u653e Excel \u5bfc\u51fa\uff0c\u8bf7\u8bb0\u5f55\u5b66\u4e60\u6216\u5f00\u59cb\u4e8c\u5237\u3002',
      };
    }

    if (parsed?.needs_clarification) {
      return { success: false, kind: 'clarification', message: parsed.needs_clarification, parsed };
    }

    if (parsed?.source === 'quick') {
      tracker.updateDaily.saveWrongQuestion(parsed);
      return {
        success: true,
        kind: 'wrong-question',
        message: '\u9519\u9898\u5df2\u8bb0\u5f55\uff0c\u5e76\u52a0\u5165\u4e8c\u5237\u961f\u5217\u3002',
        record: parsed,
        status: getStudyTrackerStatus(),
      };
    }

    if (!parsed?.has_exam && !parsed?.skip_today) {
      return {
        success: false,
        kind: 'clarification',
        message: '\u8bf7\u8bf4\u660e\u4eca\u5929\u5b66\u4e60\u7684\u6a21\u5757\u548c\u9519\u9898\u6570\uff0c\u4f8b\u5982\uff1a\u8d44\u6599\u5206\u6790\u9519 5 \u9053\u3002',
        parsed,
      };
    }

    const record = tracker.updateDaily.updateDailyRecord(parsed, value);
    return {
      success: true,
      kind: parsed.skip_today ? 'skip' : 'record',
      message: parsed.skip_today
        ? '\u4eca\u65e5\u4f11\u606f\u5df2\u8bb0\u5f55\u3002'
        : '\u5b66\u4e60\u8bb0\u5f55\u5df2\u4fdd\u5b58\u3002',
      record,
      status: getStudyTrackerStatus(),
    };
  } catch (error) {
    return actionError(error);
  }
}

function buildSummary(): StudyTrackerActionResult {
  try {
    return { success: true, kind: 'summary', message: loadTrackerModules().dailySummary.buildSummaryMessage() };
  } catch (error) {
    return actionError(error);
  }
}

function buildReviewReminder(): StudyTrackerActionResult {
  try {
    return {
      success: true,
      kind: 'review-reminder',
      message: loadTrackerModules().reviewReminder.buildReminderMessage(),
    };
  } catch (error) {
    return actionError(error);
  }
}

export function registerStudyTrackerHandlers() {
  ipcMain.handle(IPC.STUDY_TRACKER_STATUS, () => getStudyTrackerStatus());
  ipcMain.handle(IPC.STUDY_TRACKER_RECORD, (_event, text: string) => recordStudyText(text));
  ipcMain.handle(IPC.STUDY_TRACKER_SUMMARY, () => buildSummary());
  ipcMain.handle(IPC.STUDY_TRACKER_REVIEW, () => buildReviewReminder());
}
