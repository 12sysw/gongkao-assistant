const assert = require('node:assert/strict');

const {
  buildExportPdfHtml,
  buildAchievementProgress,
  computeStreak,
  formatLocalDateTime,
  getUnlockableAchievementIds,
  isDueReview,
  sanitizeExportFileName,
  sortStudyPlans,
  toLegacyFlashcard,
  toLegacyKnowledgePoint,
  toLegacyWrongRecord,
} = require('../dist/main/main/ipc/contract-utils.js');
const { parsePaperText, validateDraft } = require('../dist/main/shared/paper-import-parser.js');
const { buildGongkaoEssayReviewPrompt } = require('../dist/main/main/ipc/gongkao-skill.js');
const { buildEssayPaperHtml } = require('../dist/main/main/ipc/essay-paper.js');
const { buildHuasheng13SystemPrompt, getHuasheng13Catalog, getHuasheng13Context } = require('../dist/main/main/ipc/huasheng13.js');
const { IPC } = require('../dist/main/shared/ipc.js');
const fs = require('node:fs');
const path = require('node:path');
const { verifySnapshot } = require('../scripts/verify-kaogong-study-tracker.js');
const {
  addDaysAsLocalDate,
  getNextFlashcardReview,
  getNextWrongReview,
  isFlashcardDue,
  selectDueFlashcards,
} = require('../dist/main/shared/review-schedule.js');

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

run('knowledge point serializer keeps snake_case contract', () => {
  assert.deepEqual(
    toLegacyKnowledgePoint({
      id: 12,
      title: '资料分析-基期比重',
      category: 'formula',
      content: '先找现期比重，再用增长率修正。',
      tags: '资料分析 比重 易错',
      createdAt: '2026-05-29 09:10:00',
      updatedAt: '2026-05-29 09:20:00',
    }),
    {
      id: 12,
      title: '资料分析-基期比重',
      category: 'formula',
      content: '先找现期比重，再用增长率修正。',
      tags: '资料分析 比重 易错',
      created_at: '2026-05-29 09:10:00',
      updated_at: '2026-05-29 09:20:00',
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

run('PDF export escapes HTML and sanitizes filenames', () => {
  const html = buildExportPdfHtml(
    {
      title: '<img src=x onerror=alert(1)>错题&统计',
      columns: [{ key: 'content', label: '题目<script>' }],
      data: [{ content: '<script>alert("x")</script>&答案' }],
    },
    '2026/05/26'
  );

  assert.equal(html.includes('<img src=x'), false);
  assert.equal(html.includes('<script>alert'), false);
  assert.equal(html.includes('&lt;img src=x onerror=alert(1)&gt;错题&amp;统计'), true);
  assert.equal(html.includes('题目&lt;script&gt;'), true);
  assert.equal(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;答案'), true);
  assert.equal(sanitizeExportFileName('CON'), 'gongkao-export');
  assert.equal(sanitizeExportFileName('错题<>:"/\\|?*统计. '), '错题_________统计');
});

run('review schedule uses one local-date interval policy', () => {
  const now = new Date(2026, 3, 28, 9, 30, 0);

  assert.equal(addDaysAsLocalDate(1, now), '2026-04-29');
  assert.deepEqual(getNextWrongReview(0, now), {
    review_count: 1,
    interval_days: 1,
    next_review_at: '2026-04-29',
  });
  assert.deepEqual(getNextWrongReview(4, now), {
    review_count: 5,
    interval_days: 30,
    next_review_at: '2026-05-28',
  });
  assert.deepEqual(getNextFlashcardReview(4, true, now), {
    review_count: 5,
    interval_days: 30,
    mastered: 1,
    next_review: '2026-05-28',
  });
  assert.deepEqual(getNextFlashcardReview(4, false, now), {
    review_count: 5,
    interval_days: 1,
    mastered: 0,
    next_review: '2026-04-29',
  });
  assert.equal(isFlashcardDue({ mastered: 0, next_review: '2026-04-28 10:00:00' }, '2026-04-28'), true);
  assert.equal(isFlashcardDue({ mastered: 1, next_review: '2026-04-28' }, '2026-04-28'), false);
  assert.deepEqual(
    selectDueFlashcards(
      [
        { id: 1, mastered: 0, next_review: '2026-04-28' },
        { id: 2, mastered: 0, next_review: '2026-04-29' },
        { id: 3, mastered: 1, next_review: '2026-04-27' },
      ],
      '2026-04-28'
    ).map((card) => card.id),
    [1]
  );
});

run('paper import parser extracts editable questions and answers', () => {
  const drafts = parsePaperText(`\u7b2c\u4e00\u90e8\u5206 \u8a00\u8bed\u7406\u89e3
1. \u4e0b\u5217\u8bcd\u8bed\u586b\u5165\u6700\u6070\u5f53\u7684\u662f\uff1a
A. \u7532
B. \u4e59
C. \u4e19
D. \u4e01
\u7b54\u6848\uff1aB

2. \u6587\u6bb5\u610f\u5728\u8bf4\u660e\uff1a
A. \u6625
B. \u590f
C. \u79cb
D. \u51ac
\u7b54\u6848\uff1aC`);

  assert.equal(drafts.length, 2);
  assert.equal(drafts[0].number, '1');
  assert.equal(drafts[0].answer, 'B');
  assert.equal(drafts[0].options.length, 4);
  assert.equal(drafts[0].type, '\u884c\u6d4b-\u8a00\u8bed\u7406\u89e3');
  assert.deepEqual(validateDraft(drafts[0]), []);
});

run('essay review prompt enforces timing review and rewrite checklist', () => {
  const prompt = buildGongkaoEssayReviewPrompt({
    typeLabel: '\u6982\u62ec\u5f52\u7eb3\u9898',
    topic: '\u6982\u62ec\u4e3b\u8981\u95ee\u9898\u3002\u5efa\u8bae\u7528\u65f6 20 \u5206\u949f\uff0c\u5b9e\u9645\u7528\u65f6 28 \u5206\u949f\u3002',
    answer: '\u4f5c\u7b54\u5185\u5bb9',
  });
  assert.equal(prompt.includes('\u7528\u65f6\u590d\u76d8'), true);
  assert.equal(prompt.includes('\u6539\u5199\u6e05\u5355'), true);
});


run('essay answer sheet HTML escapes input and creates exact grids', () => {
  const html = buildEssayPaperHtml({
    title: '<script>\u7533\u8bba</script>',
    candidate_info: true,
    format: 'pdf',
    questions: [{ title: '\u7b2c\u4e00\u9898', word_count: 100, suggested_minutes: 20 }],
  });
  assert.equal(html.includes('<script>\u7533\u8bba</script>'), false);
  assert.equal(html.includes('&lt;script&gt;\u7533\u8bba&lt;/script&gt;'), true);
  assert.equal((html.match(/<i>/g) || []).length, 100);
});

run('essay answer sheet IPC is registered', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'ipc', 'index.ts'), 'utf8');
  assert.equal(source.includes('registerEssayPaperHandler();'), true);
});

run('PDF OCR fallback IPC is declared and registered', () => {
  assert.equal(IPC.RAG_RENDER_PDF, 'rag:render-pdf');
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'ipc', 'index.ts'), 'utf8');
  assert.equal(source.includes('ipcMain.handle(IPC.RAG_RENDER_PDF'), true);
});


run('huasheng13 bundled skill catalog is available', () => {
  const catalog = getHuasheng13Catalog();
  assert.equal(catalog.available, true);
  assert.equal(catalog.references.length >= 25, true);
  assert.equal(catalog.modes.some((mode) => mode.id === 'xingce-speed'), true);
});

run('huasheng13 routes speed questions to method references', () => {
  const result = getHuasheng13Context('\u589e\u957f\u91cf\u600e\u4e48\u7528 415 \u4efd\u6570\u6cd5\u901f\u7b97', 'xingce-speed');
  assert.equal(result.context.includes('415'), true);
  assert.equal(result.sources.some((source) => source.source.includes('ziliao')), true);
  const prompt = buildHuasheng13SystemPrompt('xingce-speed', result.context, '');
  assert.equal(prompt.includes('\u9898\u578b\u8bc6\u522b'), true);
  assert.equal(prompt.includes('\u6613\u9519\u70b9'), true);
});

run('huasheng13 routes essay mode without full essay ghostwriting', () => {
  const result = getHuasheng13Context('\u7533\u8bba\u5927\u4f5c\u6587\u5982\u4f55\u5ba1\u9898\u7acb\u610f', 'essay');
  assert.equal(result.sources.some((source) => source.source.includes('shenlun')), true);
  const prompt = buildHuasheng13SystemPrompt('essay', result.context, '');
  assert.equal(prompt.includes('\u4e0d\u5f97\u4ee3\u5199\u5b8c\u6574\u8303\u6587'), true);
});

run('huasheng13 catalog IPC and preload bridge are registered', () => {
  const mainSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'ipc', 'index.ts'), 'utf8');
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'preload.ts'), 'utf8');
  assert.equal(mainSource.includes('IPC.HUASHENG_CATALOG_GET'), true);
  assert.equal(preloadSource.includes('huashengCatalog'), true);
});


run('kaogong-study-tracker source and build snapshots are byte-identical', () => {
  const projectRoot = path.join(__dirname, '..');
  const sourceResult = verifySnapshot(path.join(projectRoot, 'src', 'main', 'skills', 'kaogong-study-tracker'));
  const buildResult = verifySnapshot(path.join(projectRoot, 'dist', 'main', 'skills', 'kaogong-study-tracker'));
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const packagedSnapshotRule = packageJson.build.files.find(
    (entry) =>
      typeof entry === 'object' &&
      entry.from === 'dist/main/skills/kaogong-study-tracker' &&
      entry.to === 'dist/main/skills/kaogong-study-tracker'
  );

  assert.equal(sourceResult.fileCount, 28);
  assert.equal(buildResult.fileCount, 28);
  assert.equal(sourceResult.commit, 'cf9fafd3c607650f48470c0faced14a2d165cf39');
  assert.equal(buildResult.commit, sourceResult.commit);
  assert.equal(fs.existsSync(path.join(projectRoot, 'dist', 'main', 'skills', 'kaogong-study-tracker', 'SKILL.md')), true);
  assert.deepEqual(packagedSnapshotRule?.filter, ['**/*']);
  assert.equal(fs.existsSync(path.join(projectRoot, 'scripts', 'verify-packaged-study-tracker.js')), true);
});

run('study tracker exposes only the four core desktop actions', () => {
  assert.equal(IPC.STUDY_TRACKER_STATUS, 'study-tracker:status');
  assert.equal(IPC.STUDY_TRACKER_RECORD, 'study-tracker:record');
  assert.equal(IPC.STUDY_TRACKER_SUMMARY, 'study-tracker:summary');
  assert.equal(IPC.STUDY_TRACKER_REVIEW, 'study-tracker:review');
  assert.equal(IPC.STUDY_TRACKER_EXPORT, undefined);
  assert.equal(IPC.STUDY_TRACKER_OPEN_DATA, undefined);
  assert.equal(IPC.STUDY_TRACKER_OPEN_SOURCE, undefined);

  const mainSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'ipc', 'index.ts'), 'utf8');
  const adapterSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'ipc', 'study-tracker.ts'), 'utf8');
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'preload.ts'), 'utf8');
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'App.tsx'), 'utf8');
  const sidebarSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'components', 'Sidebar.tsx'), 'utf8');

  assert.equal(mainSource.includes('registerStudyTrackerHandlers();'), true);
  assert.equal(adapterSource.includes("ipcMain.handle(IPC.STUDY_TRACKER_STATUS"), true);
  assert.equal(adapterSource.includes("ipcMain.handle(IPC.STUDY_TRACKER_RECORD"), true);
  assert.equal(adapterSource.includes("ipcMain.handle(IPC.STUDY_TRACKER_SUMMARY"), true);
  assert.equal(adapterSource.includes("ipcMain.handle(IPC.STUDY_TRACKER_REVIEW"), true);
  assert.equal(preloadSource.includes('exportWorkbook'), false);
  assert.equal(preloadSource.includes('openData'), false);
  assert.equal(preloadSource.includes('openSource'), false);
  assert.equal(appSource.includes('path="/study-tracker"'), true);
  assert.equal(sidebarSource.includes("path: '/study-tracker'"), true);
});


run('core desktop navigation keeps only eight primary entries', () => {
  const projectRoot = path.join(__dirname, '..');
  const sidebarSource = fs.readFileSync(
    path.join(projectRoot, 'src', 'renderer', 'components', 'Sidebar.tsx'),
    'utf8'
  );
  const primaryPaths = Array.from(sidebarSource.matchAll(/\{ path: '([^']+)', label:/g), (match) => match[1]);

  assert.deepEqual(primaryPaths, [
    '/',
    '/review',
    '/mock-exam',
    '/question-bank',
    '/essay-review',
    '/rag-chat',
    '/study-tracker',
    '/settings',
  ]);
});

run('non-core desktop routes and duplicate shells stay removed', () => {
  const projectRoot = path.join(__dirname, '..');
  const appSource = fs.readFileSync(path.join(projectRoot, 'src', 'renderer', 'App.tsx'), 'utf8');
  const removedRoutes = [
    '/pomodoro',
    '/achievements',
    '/chat',
    '/mind-map',
    '/knowledge-graph',
    '/component-showcase',
    '/brutal-report',
    '/checkin',
    '/encourage',
  ];
  const preservedSecondaryRoutes = [
    '/wrong-book',
    '/real-papers',
    '/paper-import',
    '/essay-practice',
    '/skill-tree',
  ];
  const removedPages = [
    'Achievements.tsx',
    'AchievementsNew.tsx',
    'BrutalReport.tsx',
    'ChatRoom.tsx',
    'ComponentShowcase.tsx',
    'DailyCheckin.tsx',
    'DailyCheckinNew.tsx',
    'Dashboard.tsx',
    'Encourage.tsx',
    'EncourageNew.tsx',
    'ExamPage.tsx',
    'ExamResult.tsx',
    'Flashcards.tsx',
    'FlashcardsNew.tsx',
    'KnowledgeBase.tsx',
    'KnowledgeGraph.tsx',
    'KnowledgeGraphNew.tsx',
    'MindMap.tsx',
    'MockExamNew.tsx',
    'Pomodoro.tsx',
    'PomodoroNew.tsx',
    'QuestionBankNew.tsx',
    'RagChatNew.tsx',
    'SettingsNew.tsx',
    'StudyPlan.tsx',
    'StudyPlanNew.tsx',
    'WrongBookNew.tsx',
  ];

  for (const route of removedRoutes) {
    assert.equal(appSource.includes(`path="${route}"`), false, `${route} should not be registered`);
  }
  for (const route of preservedSecondaryRoutes) {
    assert.equal(appSource.includes(`path="${route}"`), true, `${route} should remain available`);
  }
  for (const page of removedPages) {
    assert.equal(fs.existsSync(path.join(projectRoot, 'src', 'renderer', 'pages', page)), false, `${page} should stay deleted`);
  }

  const registeredRoutes = Array.from(appSource.matchAll(/<Route path="([^"]+)"/g), (match) => match[1]);
  assert.equal(new Set(registeredRoutes).size, registeredRoutes.length, 'App routes should not be duplicated');
});

run('non-core renderer dependencies stay removed', () => {
  const projectRoot = path.join(__dirname, '..');
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const removedDependencies = [
    '@radix-ui/react-dialog',
    '@radix-ui/react-slot',
    '@tencentcloud/chat',
    'dayjs',
    'react-hook-form',
    'recharts',
    'tim-upload-plugin',
    'zod',
  ];

  for (const dependency of removedDependencies) {
    assert.equal(dependencies[dependency], undefined, `${dependency} should stay removed`);
  }
  assert.equal(fs.existsSync(path.join(projectRoot, 'src', 'renderer', 'lib', 'tencent-im.ts')), false);
  assert.equal(fs.existsSync(path.join(projectRoot, 'src', 'renderer', 'stores', 'chat-store.ts')), false);
});

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('All IPC contract smoke tests passed.');
