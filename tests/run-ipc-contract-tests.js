const assert = require('node:assert/strict');

const {
  buildAchievementProgress,
  computeStreak,
  formatLocalDateTime,
  getUnlockableAchievementIds,
  isDueReview,
  sortStudyPlans,
  toLegacyFlashcard,
  toLegacyWrongRecord,
} = require('../dist/main/main/ipc/contract-utils.js');

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

run('wrong record serializer flattens question fields', () => {
  const record = {
    id: 8,
    questionId: 3,
    myAnswer: 'A',
    wrongCount: 2,
    lastWrongAt: '2026-04-28 09:00:00',
    mastered: true,
    reviewCount: 4,
    nextReviewAt: '2026-04-29 08:00:00',
    note: '复习语义逻辑',
    createdAt: '2026-04-28 09:00:00',
  };

  const question = {
    id: 3,
    type: '行测-判断推理',
    content: '下列哪项最符合定义？',
    options: '["A.甲","B.乙"]',
    answer: 'B',
    explanation: '关键词匹配即可。',
    tags: '定义判断',
    createdAt: '2026-04-27 20:00:00',
  };

  assert.deepEqual(toLegacyWrongRecord(record, question), {
    id: 8,
    question_id: 3,
    my_answer: 'A',
    wrong_count: 2,
    last_wrong_at: '2026-04-28 09:00:00',
    mastered: 1,
    review_count: 4,
    next_review_at: '2026-04-29 08:00:00',
    note: '复习语义逻辑',
    created_at: '2026-04-28 09:00:00',
    type: '行测-判断推理',
    content: '下列哪项最符合定义？',
    options: '["A.甲","B.乙"]',
    answer: 'B',
    explanation: '关键词匹配即可。',
    tags: '定义判断',
  });
});

run('flashcard serializer keeps snake_case contract', () => {
  assert.deepEqual(
    toLegacyFlashcard({
      id: 5,
      front: '共同富裕的本质要求？',
      back: '实现全体人民共同富裕',
      category: '常识-政治',
      difficulty: 'medium',
      reviewCount: 3,
      mastered: false,
      nextReview: '2026-04-30',
      createdAt: '2026-04-28 10:00:00',
    }),
    {
      id: 5,
      front: '共同富裕的本质要求？',
      back: '实现全体人民共同富裕',
      category: '常识-政治',
      difficulty: 'medium',
      review_count: 3,
      mastered: 0,
      next_review: '2026-04-30',
      created_at: '2026-04-28 10:00:00',
    }
  );
});

run('streak calculation uses local dates and tolerates missing today', () => {
  const today = new Date(2026, 3, 28, 9, 30, 0);

  assert.equal(computeStreak(['2026-04-27', '2026-04-26', '2026-04-25'], today), 3);
  assert.equal(computeStreak(['2026-04-28', '2026-04-27', '2026-04-26'], today), 3);
  assert.equal(computeStreak(['2026-04-28', '2026-04-26'], today), 1);
});

run('due review helper compares actual time direction correctly', () => {
  const now = new Date(2026, 3, 28, 12, 0, 0);

  assert.equal(isDueReview('2026-04-28 11:59:59', now), true);
  assert.equal(isDueReview('2026-04-28 12:00:01', now), false);
  assert.equal(isDueReview(formatLocalDateTime(now), now), true);
});

run('achievement progress only counts work pomodoros and distinct checkins', () => {
  const progress = buildAchievementProgress({
    dailyRecords: [
      { date: '2026-04-28', studyMinutes: 60, questionsDone: 20, wrongCount: 3 },
      { date: '2026-04-27', studyMinutes: 45, questionsDone: 10, wrongCount: 1 },
      { date: '2026-04-27', studyMinutes: 15, questionsDone: 5, wrongCount: 0 },
    ],
    wrongRecords: [
      { mastered: true },
      { mastered: false },
      { mastered: true },
    ],
    flashcards: [
      { reviewCount: 2, mastered: false },
      { reviewCount: 5, mastered: true },
    ],
    pomodoroRecords: [
      { mode: 'work' },
      { mode: 'shortBreak' },
      { mode: 'work' },
    ],
    reviewSessions: [
      { started: true, initialTotal: 3, completedWrongIds: [1], completedFlashcardIds: [2, 3] },
      { started: true, initialTotal: 2, completedWrongIds: [4], completedFlashcardIds: [] },
    ],
    today: new Date(2026, 3, 28, 9, 30, 0),
  });

  assert.deepEqual(progress, {
    streak: 2,
    questions: 35,
    study_time: 120,
    mastered: 2,
    flashcard: 7,
    flashcard_master: 1,
    pomodoro: 2,
    checkin: 2,
    review_flow: 1,
  });
});

run('unlock helper only returns reached and still-locked achievements', () => {
  const unlockable = getUnlockableAchievementIds(
    [
      { id: 1, type: 'questions', threshold: 50, unlockedAt: null },
      { id: 2, type: 'questions', threshold: 200, unlockedAt: null },
      { id: 3, type: 'streak', threshold: 7, unlockedAt: '2026-04-27 08:00:00' },
      { id: 4, type: 'streak', threshold: 30, unlockedAt: null },
    ],
    {
      questions: 120,
      streak: 12,
    }
  );

  assert.deepEqual(unlockable, [1]);
});

run('study plans sort active and high-priority items first', () => {
  const sorted = sortStudyPlans([
    { id: 1, status: 'completed', priority: 'low', targetDate: '2026-05-10' },
    { id: 2, status: 'pending', priority: 'medium', targetDate: '2026-05-08' },
    { id: 3, status: 'in_progress', priority: 'low', targetDate: '2026-05-12' },
    { id: 4, status: 'pending', priority: 'high', targetDate: '2026-05-09' },
  ]);

  assert.deepEqual(sorted.map((item) => item.id), [3, 4, 2, 1]);
});

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}

console.log('All IPC contract smoke tests passed.');
