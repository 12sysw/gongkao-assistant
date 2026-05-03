type LegacyLikeRecord = Record<string, any>;

const statusOrder: Record<string, number> = {
  in_progress: 0,
  pending: 1,
  completed: 2,
};

const priorityOrder: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function truthyNumber(value: unknown): number {
  return value ? 1 : 0;
}

function getValue<T>(row: LegacyLikeRecord | null | undefined, camel: string, snake: string): T | undefined {
  if (!row) return undefined;
  if (row[camel] !== undefined) return row[camel] as T;
  if (row[snake] !== undefined) return row[snake] as T;
  return undefined;
}

export function formatLocalDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatLocalDateTime(date: Date = new Date()): string {
  return `${formatLocalDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function parseDateLike(value?: string | null): Date | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  let parsed: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    parsed = new Date(`${trimmed}T00:00:00`);
  } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    parsed = new Date(trimmed.replace(' ', 'T'));
  } else {
    parsed = new Date(trimmed);
  }

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeLegacyDateTime(value?: string | null): string | null {
  const parsed = parseDateLike(value);
  if (!parsed) return value ?? null;
  return formatLocalDateTime(parsed);
}

export function computeStreak(dates: string[], today: Date = new Date()): number {
  const dateSet = new Set(
    dates
      .filter(Boolean)
      .map((date) => date.slice(0, 10))
  );

  let streak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayKey = formatLocalDate(cursor);

  for (let i = 0; i < 365; i++) {
    const key = formatLocalDate(cursor);
    if (dateSet.has(key)) {
      streak++;
    } else if (key !== todayKey) {
      break;
    }

    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function isDueReview(nextReviewAt?: string | null, now: Date = new Date()): boolean {
  const parsed = parseDateLike(nextReviewAt);
  if (!parsed) return false;
  return parsed.getTime() <= now.getTime();
}

export function toLegacyQuestion(row: LegacyLikeRecord | null | undefined) {
  if (!row) return null;

  return {
    id: row.id,
    type: row.type,
    content: row.content,
    options: row.options ?? null,
    answer: row.answer,
    explanation: row.explanation ?? '',
    tags: row.tags ?? '',
    created_at: getValue<string>(row, 'createdAt', 'created_at') ?? null,
  };
}

export function toLegacyWrongRecord(record: LegacyLikeRecord | null | undefined, question?: LegacyLikeRecord | null) {
  if (!record) return null;

  const questionPayload = (toLegacyQuestion(question) ?? {}) as LegacyLikeRecord;

  return {
    type: questionPayload.type,
    content: questionPayload.content,
    options: questionPayload.options,
    answer: questionPayload.answer,
    explanation: questionPayload.explanation,
    tags: questionPayload.tags,
    id: record.id,
    question_id: getValue<number>(record, 'questionId', 'question_id') ?? null,
    my_answer: getValue<string>(record, 'myAnswer', 'my_answer') ?? '',
    wrong_count: getValue<number>(record, 'wrongCount', 'wrong_count') ?? 0,
    last_wrong_at: getValue<string>(record, 'lastWrongAt', 'last_wrong_at') ?? null,
    mastered: truthyNumber(getValue<boolean | number>(record, 'mastered', 'mastered')),
    review_count: getValue<number>(record, 'reviewCount', 'review_count') ?? 0,
    next_review_at: getValue<string>(record, 'nextReviewAt', 'next_review_at') ?? null,
    note: record.note ?? '',
    created_at: getValue<string>(record, 'createdAt', 'created_at') ?? null,
  };
}

export function toLegacyMindMap(row: LegacyLikeRecord | null | undefined) {
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    data: row.data,
    created_at: getValue<string>(row, 'createdAt', 'created_at') ?? null,
    updated_at: getValue<string>(row, 'updatedAt', 'updated_at') ?? null,
  };
}

export function toLegacyStudyPlan(row: LegacyLikeRecord | null | undefined) {
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    target_date: getValue<string>(row, 'targetDate', 'target_date') ?? null,
    priority: row.priority ?? 'medium',
    status: row.status ?? 'pending',
    description: row.description ?? '',
    daily_minutes: getValue<number>(row, 'dailyMinutes', 'daily_minutes') ?? 60,
    created_at: getValue<string>(row, 'createdAt', 'created_at') ?? null,
    updated_at: getValue<string>(row, 'updatedAt', 'updated_at') ?? null,
  };
}

export function toLegacyDailyRecord(row: LegacyLikeRecord | null | undefined) {
  if (!row) return null;

  return {
    id: row.id,
    date: row.date,
    study_minutes: getValue<number>(row, 'studyMinutes', 'study_minutes') ?? 0,
    questions_done: getValue<number>(row, 'questionsDone', 'questions_done') ?? 0,
    wrong_count: getValue<number>(row, 'wrongCount', 'wrong_count') ?? 0,
    plan_id: getValue<number>(row, 'planId', 'plan_id') ?? null,
    note: row.note ?? '',
    created_at: getValue<string>(row, 'createdAt', 'created_at') ?? null,
  };
}

export function toLegacyAchievement(row: LegacyLikeRecord | null | undefined, progress?: number) {
  if (!row) return null;

  const payload: LegacyLikeRecord = {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    icon: row.icon,
    threshold: row.threshold,
    unlocked_at: getValue<string | null>(row, 'unlockedAt', 'unlocked_at') ?? null,
  };

  if (progress !== undefined) {
    payload.progress = progress;
  }

  return payload;
}

export function toLegacyFlashcard(row: LegacyLikeRecord | null | undefined) {
  if (!row) return null;

  return {
    id: row.id,
    front: row.front,
    back: row.back,
    category: row.category ?? '常识-政治',
    difficulty: row.difficulty ?? 'medium',
    review_count: getValue<number>(row, 'reviewCount', 'review_count') ?? 0,
    mastered: truthyNumber(getValue<boolean | number>(row, 'mastered', 'mastered')),
    next_review: getValue<string>(row, 'nextReview', 'next_review') ?? null,
    created_at: getValue<string>(row, 'createdAt', 'created_at') ?? null,
  };
}

export function toLegacyExamConfig(row: LegacyLikeRecord | null | undefined) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    date: row.date,
  };
}

export function toLegacyPomodoroRecord(row: LegacyLikeRecord | null | undefined) {
  if (!row) return null;

  return {
    id: row.id,
    date: row.date,
    duration: row.duration ?? 25,
    mode: row.mode ?? 'work',
    created_at: getValue<string>(row, 'createdAt', 'created_at') ?? null,
  };
}

export function toLegacyQuote(row: LegacyLikeRecord | null | undefined) {
  if (!row) return null;

  return {
    id: row.id,
    text: row.content,
    content: row.content,
    author: row.author,
    category: row.category,
  };
}

export function applyQuestionFilters(rows: LegacyLikeRecord[], filters?: LegacyLikeRecord) {
  let result = [...rows];

  if (filters?.type) {
    result = result.filter((row) => row.type === filters.type);
  }

  if (filters?.tags) {
    result = result.filter((row) => String(row.tags ?? '').includes(String(filters.tags)));
  }

  result.sort((a, b) => String(getValue<string>(b, 'createdAt', 'created_at') ?? '').localeCompare(String(getValue<string>(a, 'createdAt', 'created_at') ?? '')));

  if (filters?.limit) {
    const limit = Number(filters.limit);
    if (!Number.isNaN(limit) && limit > 0) {
      result = result.slice(0, limit);
    }
  }

  return result;
}

export function applyWrongBookFilters(rows: ReturnType<typeof toLegacyWrongRecord>[], filters?: LegacyLikeRecord) {
  let result = rows.filter(Boolean) as LegacyLikeRecord[];

  if (filters?.mastered !== undefined) {
    const expected = Number(filters.mastered);
    result = result.filter((row) => Number(row.mastered) === expected);
  }

  if (filters?.type) {
    result = result.filter((row) => row.type === filters.type);
  }

  result.sort((a, b) => String(b.last_wrong_at ?? '').localeCompare(String(a.last_wrong_at ?? '')));

  return result;
}

export function applyFlashcardFilters(rows: LegacyLikeRecord[], filters?: LegacyLikeRecord) {
  let result = [...rows];

  if (filters?.category) {
    result = result.filter((row) => row.category === filters.category);
  }

  if (filters?.mastered !== undefined) {
    const expected = Number(filters.mastered);
    result = result.filter((row) => truthyNumber(row.mastered) === expected);
  }

  result.sort((a, b) => {
    const nextReviewCompare = String(getValue<string>(a, 'nextReview', 'next_review') ?? '').localeCompare(String(getValue<string>(b, 'nextReview', 'next_review') ?? ''));
    if (nextReviewCompare !== 0) return nextReviewCompare;
    return String(getValue<string>(b, 'createdAt', 'created_at') ?? '').localeCompare(String(getValue<string>(a, 'createdAt', 'created_at') ?? ''));
  });

  return result;
}

export function sortStudyPlans(rows: LegacyLikeRecord[]) {
  return [...rows].sort((a, b) => {
    const statusCompare = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
    if (statusCompare !== 0) return statusCompare;

    const priorityCompare = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
    if (priorityCompare !== 0) return priorityCompare;

    return String(getValue<string>(a, 'targetDate', 'target_date') ?? '').localeCompare(String(getValue<string>(b, 'targetDate', 'target_date') ?? ''));
  });
}

export function buildAchievementProgress(params: {
  dailyRecords: LegacyLikeRecord[];
  wrongRecords: LegacyLikeRecord[];
  flashcards: LegacyLikeRecord[];
  pomodoroRecords: LegacyLikeRecord[];
  today?: Date;
}) {
  const { dailyRecords, wrongRecords, flashcards, pomodoroRecords, today } = params;

  const totalMinutes = dailyRecords.reduce((sum, row) => sum + Number(getValue<number>(row, 'studyMinutes', 'study_minutes') ?? 0), 0);
  const totalQuestions = dailyRecords.reduce((sum, row) => sum + Number(getValue<number>(row, 'questionsDone', 'questions_done') ?? 0), 0);
  const streak = computeStreak(dailyRecords.map((row) => String(row.date)), today);
  const mastered = wrongRecords.filter((row) => Boolean(getValue<boolean | number>(row, 'mastered', 'mastered'))).length;
  const flashcard = flashcards.reduce((sum, row) => sum + Number(getValue<number>(row, 'reviewCount', 'review_count') ?? 0), 0);
  const flashcardMastered = flashcards.filter((row) => Boolean(getValue<boolean | number>(row, 'mastered', 'mastered'))).length;
  const pomodoro = pomodoroRecords.filter((row) => (row.mode ?? 'work') === 'work').length;
  const checkin = new Set(dailyRecords.map((row) => String(row.date))).size;

  return {
    streak,
    questions: totalQuestions,
    study_time: totalMinutes,
    mastered,
    flashcard,
    flashcard_master: flashcardMastered,
    pomodoro,
    checkin,
  };
}

export function getUnlockableAchievementIds(achievements: LegacyLikeRecord[], progressMap: Record<string, number>) {
  return achievements
    .filter((achievement) => {
      const unlockedAt = getValue<string | null>(achievement, 'unlockedAt', 'unlocked_at');
      return !unlockedAt && (progressMap[achievement.type] ?? 0) >= Number(achievement.threshold ?? 0);
    })
    .map((achievement) => achievement.id as number);
}
