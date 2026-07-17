import { useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Clock,
  BarChart3,
  Target,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Pause,
  Play,
} from 'lucide-react';
import { useMockExamStore } from '../stores/mock-exam-store';
import { useQuestions, useRagConfig } from '../hooks/use-api';
import type { QuestionRecord } from '../../shared/ipc';
import { toast } from 'sonner';

// ==================== 题目生成 ====================
const QUESTION_TYPES = ['常识判断', '言语理解', '数量关系', '判断推理', '资料分析'];
const EXAM_COUNTS: Record<string, number> = { '常识判断': 20, '言语理解': 40, '数量关系': 15, '判断推理': 40, '资料分析': 20 };
const DEFAULT_FULL_EXAM_COUNT = Object.values(EXAM_COUNTS).reduce((sum, count) => sum + count, 0);
const SCREEN_PRACTICE_TYPES = QUESTION_TYPES.filter((type) => type !== '资料分析');
const SCREEN_EXAM_COUNTS: Record<string, number> = {
  '常识判断': 20,
  '言语理解': 40,
  '数量关系': 15,
  '判断推理': 40,
};
const SCREEN_FULL_EXAM_COUNT = Object.values(SCREEN_EXAM_COUNTS).reduce((sum, count) => sum + count, 0);
const FALLBACK_QUESTION_ID_OFFSET = 9_000_000;

interface ExamQuestion {
  id: number;
  type: string;
  content: string;
  options: string[];
  answer: string;
  explanation: string;
}

type PaperInfo = {
  key: string;
  title: string;
  category: string;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseOptions(raw: string | null | undefined): string[] {
  if (!raw) return ['A.选项一', 'B.选项二', 'C.选项三', 'D.选项四'];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
  } catch {}
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length >= 2) return lines;
  return ['A.选项一', 'B.选项二', 'C.选项三', 'D.选项四'];
}

function inferQuestionTypeFromNumber(number: string | null | undefined): string {
  const value = Number.parseInt(String(number ?? ''), 10);
  if (!Number.isFinite(value) || value < 1 || value > 135) return '';
  return inferQuestionTypeByPosition(value - 1);
}

function inferQuestionTypeByPosition(index: number): string {
  const number = index + 1;
  if (number <= 20) return '常识判断';
  if (number <= 60) return '言语理解';
  if (number <= 75) return '数量关系';
  if (number <= 115) return '判断推理';
  return '资料分析';
}

function canonicalType(type: string): string {
  return `行测-${type}`;
}

function normalizeQuestionText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\u3000/g, ' ')
    .trim();
}

function getQuestionCore(content: string): string {
  const normalized = normalizeQuestionText(content);
  const marker = '【题目】';
  const markerIndex = normalized.lastIndexOf(marker);
  if (markerIndex >= 0) {
    return normalized.slice(markerIndex + marker.length).trim();
  }
  return normalized;
}

function getQuestionTags(question: QuestionRecord): string[] {
  return String(question.tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getPaperInfo(question: QuestionRecord): PaperInfo | null {
  const tags = getQuestionTags(question);
  if (!tags.includes('pdf_import') && !tags.includes('pdf_exam')) return null;

  const ignored = new Set(['pdf_import', 'pdf_exam', 'pdf_answer', 'question_bank', 'manual']);
  const title = [...tags].reverse().find((tag) => !ignored.has(tag) && !/^\d+个分片合并$/.test(tag));
  if (!title) return null;

  const category = tags.find((tag) => !ignored.has(tag) && tag !== title && !/^\d+个分片合并$/.test(tag)) ?? '未分类';
  return {
    key: `${category}::${title}`,
    title,
    category,
  };
}

function isXingcePaper(paper: PaperInfo): boolean {
  return /行测|行政职业能力测验/.test(`${paper.category} ${paper.title}`);
}

function isLikelyXingceQuestion(question: QuestionRecord): boolean {
  const paper = getPaperInfo(question);
  if (paper) return isXingcePaper(paper);
  const text = `${question.type} ${question.tags}`.replace(/\s+/g, '');
  return /行测|行政职业能力测验|常识判断|言语理解|数量关系|判断推理|资料分析/.test(text);
}

function normalizeQuestionType(
  rawType: string | null | undefined,
  content = '',
  number?: string,
  paper?: PaperInfo,
  indexInPaper = -1,
): string {
  const normalizedContent = normalizeQuestionText(content);
  if (normalizedContent.startsWith('【资料】')) return '资料分析';
  if (paper && isXingcePaper(paper) && indexInPaper >= 0) return inferQuestionTypeByPosition(indexInPaper);

  const raw = String(rawType ?? '');
  const explicitType = raw.replace(/^行测-/, '');
  if (QUESTION_TYPES.includes(explicitType)) return explicitType;

  const rawText = raw.replace(/\s+/g, '');
  if (/资料|材料分析|统计|图表|增长率|比重/.test(rawText)) return '资料分析';
  if (/判断|图形推理|定义判断|类比推理|逻辑判断/.test(rawText)) return '判断推理';
  if (/数量|数学运算|数字推理|数资/.test(rawText)) return '数量关系';
  if (/言语|逻辑填空|片段阅读|语句表达|阅读理解|中心理解/.test(rawText)) return '言语理解';
  if (/常识|政治|法律|经济|科技|人文|历史|地理|时政/.test(rawText)) return '常识判断';

  const numberedType = inferQuestionTypeFromNumber(number);
  if (numberedType) return numberedType;

  const text = `${raw} ${content}`.replace(/\s+/g, '');
  if (/资料|材料分析|统计|图表|增长率|比重/.test(text)) return '资料分析';
  if (/言语|逻辑填空|片段阅读|语句表达|阅读理解|中心理解/.test(text)) return '言语理解';
  if (/数量|数学运算|数字推理|数资/.test(text)) return '数量关系';
  if (/判断|图形推理|定义判断|类比推理|逻辑判断/.test(text)) return '判断推理';
  if (/常识|政治|法律|经济|科技|人文|历史|地理|时政/.test(text)) return '常识判断';

  return '常识判断';
}

function hasCompleteMaterial(question: QuestionRecord): boolean {
  const display = splitQuestionDisplay(question.content);
  return display.material.length >= 20 && display.question.length >= 8;
}

function hasUsableContent(question: QuestionRecord, type: string): boolean {
  const content = getQuestionCore(question.content);
  if (content.length < 8) return false;
  if (type === '资料分析') return hasCompleteMaterial(question);
  return true;
}

function getQuestionDedupeKey(question: QuestionRecord): string {
  return getQuestionCore(question.content).replace(/\s+/g, '').slice(0, 180);
}

function toExamQuestion(q: QuestionRecord, type: string): ExamQuestion {
  const options = parseOptions(q.options);
  const fallbackAnswer = options[0]?.[0]?.toUpperCase() || 'A';
  return {
    id: q.id,
    type: canonicalType(type),
    content: q.content,
    options,
    answer: q.answer || fallbackAnswer,
    explanation: q.explanation || '',
  };
}

function makePlaceholderQuestion(type: string, index: number): ExamQuestion {
  const typeIndex = Math.max(0, QUESTION_TYPES.indexOf(type));
  return {
    id: FALLBACK_QUESTION_ID_OFFSET + typeIndex * 10000 + index,
    type: canonicalType(type),
    content: type === '资料分析'
      ? `【资料】\n当前题库没有可用于资料分析模块的完整材料，请重新导入带资料页的真题 PDF。\n\n【题目】【${type}】第${index + 1}题：题库不足，无法生成真实资料分析题。`
      : `【${type}】第${index + 1}题：当前模块题库不足，请继续导入对应题型真题。`,
    options: ['A.题库不足', 'B.题库不足', 'C.题库不足', 'D.题库不足'],
    answer: 'A',
    explanation: '当前模块题库不足，请导入真实题目。',
  };
}

function makeRepeatedExamQuestion(question: ExamQuestion, syntheticId: number): ExamQuestion {
  return {
    ...question,
    id: syntheticId,
  };
}

function appendFromPool(target: ExamQuestion[], pool: ExamQuestion[], count: number, offset: number) {
  if (count <= 0 || pool.length === 0) return;
  for (let i = 0; i < count; i++) {
    target.push(makeRepeatedExamQuestion(pool[i % pool.length], offset + i));
  }
}

function buildPaperIndexLookup(questions: QuestionRecord[]) {
  const groups = new Map<string, { paper: PaperInfo; questions: QuestionRecord[] }>();
  for (const question of questions) {
    const paper = getPaperInfo(question);
    if (!paper) continue;

    const existing = groups.get(paper.key);
    if (existing) {
      existing.questions.push(question);
    } else {
      groups.set(paper.key, { paper, questions: [question] });
    }
  }

  const lookup = new Map<number, { paper: PaperInfo; index: number }>();
  for (const group of groups.values()) {
    group.questions
      .sort((a, b) => a.id - b.id)
      .forEach((question, index) => lookup.set(question.id, { paper: group.paper, index }));
  }
  return lookup;
}

function prioritizeQuestionRecords(questions: QuestionRecord[]): QuestionRecord[] {
  const realPaperQuestions = questions.filter((question) => getPaperInfo(question));
  const regularQuestions = questions.filter((question) => !getPaperInfo(question));
  return [...shuffle(realPaperQuestions), ...shuffle(regularQuestions)];
}

function toTypedExamQuestion(
  question: QuestionRecord,
  paperMeta?: { paper: PaperInfo; index: number },
): ExamQuestion | null {
  const normalizedType = normalizeQuestionType(
    question.type,
    question.content,
    undefined,
    paperMeta?.paper,
    paperMeta?.index ?? -1,
  );
  if (!QUESTION_TYPES.includes(normalizedType)) return null;
  if (!hasUsableContent(question, normalizedType)) return null;
  return toExamQuestion(question, normalizedType);
}

function getTrainingQuestionCandidates(allQuestions: QuestionRecord[]): QuestionRecord[] {
  const realPaperQuestions = allQuestions.filter((question) => getPaperInfo(question) && isLikelyXingceQuestion(question));
  if (realPaperQuestions.length > 0) return realPaperQuestions;
  return allQuestions.filter(isLikelyXingceQuestion);
}

function groupQuestionsByType(questions: QuestionRecord[]) {
  const byType: Record<string, ExamQuestion[]> = {};
  const paperIndexLookup = buildPaperIndexLookup(questions);
  const seen = new Set<string>();

  for (const question of prioritizeQuestionRecords(questions)) {
    const examQuestion = toTypedExamQuestion(question, paperIndexLookup.get(question.id));
    if (!examQuestion) continue;

    const dedupeKey = getQuestionDedupeKey(question);
    if (!dedupeKey || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const normalizedType = examQuestion.type.replace(/^行测-/, '');
    if (!byType[normalizedType]) byType[normalizedType] = [];
    byType[normalizedType].push(examQuestion);
  }
  return byType;
}

function buildRealQuestionSet(
  allQuestions: QuestionRecord[],
  perTypeCount: number | Record<string, number>,
  fallbackTotal: number,
  typeList: string[] = QUESTION_TYPES,
): ExamQuestion[] {
  const byType = groupQuestionsByType(getTrainingQuestionCandidates(allQuestions));
  const result: ExamQuestion[] = [];
  const shouldShuffleFinal = typeof perTypeCount === 'number';

  typeList.forEach((type) => {
    const typeIndex = Math.max(0, QUESTION_TYPES.indexOf(type));
    const needed = typeof perTypeCount === 'number' ? perTypeCount : perTypeCount[type];
    const pool = byType[type] || [];
    const picked = pool.slice(0, needed);
    result.push(...picked);

    const missing = needed - picked.length;
    if (missing <= 0) return;
    if (pool.length > 0) {
      appendFromPool(result, pool, missing, FALLBACK_QUESTION_ID_OFFSET + typeIndex * 10000);
      return;
    }

    for (let i = 0; i < missing; i++) {
      result.push(makePlaceholderQuestion(type, i));
    }
  });

  const targetTotal = shouldShuffleFinal
    ? Math.min(fallbackTotal, typeList.length * perTypeCount)
    : DEFAULT_FULL_EXAM_COUNT;

  const sliced = result.slice(0, targetTotal);
  return shouldShuffleFinal ? shuffle(sliced) : sliced;
}

function buildPaperExamQuestions(allQuestions: QuestionRecord[], paperKey: string, skipDataAnalysis = false): ExamQuestion[] {
  const paperQuestions = allQuestions
    .map((question) => ({ question, paper: getPaperInfo(question) }))
    .filter((item): item is { question: QuestionRecord; paper: PaperInfo } => item.paper?.key === paperKey)
    .sort((a, b) => a.question.id - b.question.id);

  if (paperQuestions.length === 0) return [];

  const result: ExamQuestion[] = [];
  for (const [index, item] of paperQuestions.entries()) {
    const type = normalizeQuestionType(item.question.type, item.question.content, undefined, item.paper, index);
    if (!QUESTION_TYPES.includes(type)) continue;
    if (skipDataAnalysis && type === '资料分析') continue;

    if (type === '资料分析' && !hasCompleteMaterial(item.question)) {
      result.push({
        ...makePlaceholderQuestion(type, index),
        id: FALLBACK_QUESTION_ID_OFFSET + 500_000 + index,
        explanation: `${item.paper.title} 第${index + 1}题缺少完整资料，请在题库页重新同步结构化题后再训练。`,
      });
      continue;
    }

    if (!hasUsableContent(item.question, type)) continue;
    result.push(toExamQuestion(item.question, type));
  }

  return result;
}

function loadExamQuestions(allQuestions: QuestionRecord[] | null | undefined, paperKey?: string | null, skipDataAnalysis = false): ExamQuestion[] {
  try {
    if (!allQuestions || allQuestions.length === 0) {
      return generateFallbackFull();
    }

    if (paperKey) {
      const paperQuestions = buildPaperExamQuestions(allQuestions, paperKey, skipDataAnalysis);
      if (paperQuestions.length > 0) return paperQuestions;
    }

    if (skipDataAnalysis) {
      return buildRealQuestionSet(allQuestions, SCREEN_EXAM_COUNTS, SCREEN_FULL_EXAM_COUNT, SCREEN_PRACTICE_TYPES);
    }

    return buildRealQuestionSet(allQuestions, EXAM_COUNTS, DEFAULT_FULL_EXAM_COUNT);
  } catch (err) {
    console.error('[MockExam] Failed to load questions from DB:', err);
    return generateFallbackFull();
  }
}

function loadChallengeQuestions(allQuestions: QuestionRecord[] | null | undefined): ExamQuestion[] {
  try {
    if (!allQuestions || allQuestions.length === 0) {
      return generateFallbackChallenge();
    }

    return buildRealQuestionSet(allQuestions, 5, 20, SCREEN_PRACTICE_TYPES);
  } catch {
    return generateFallbackChallenge();
  }
}

function getPaperTitleByKey(questions: QuestionRecord[] | null | undefined, paperKey: string | null): string | null {
  if (!questions || !paperKey) return null;
  for (const question of questions) {
    const paper = getPaperInfo(question);
    if (paper?.key === paperKey) return paper.title;
  }
  return null;
}

function generateFallbackFull(): ExamQuestion[] {
  const questions: ExamQuestion[] = [];
  QUESTION_TYPES.forEach((type, typeIndex) => {
    const count = EXAM_COUNTS[type];
    for (let i = 0; i < count; i++) {
      questions.push({
        id: typeIndex * 100 + i,
        type: `行测-${type}`,
        content: `【${type}】第${i + 1}题：题库为空，请先在题库中导入真题。`,
        options: ['A.选项一', 'B.选项二', 'C.选项三', 'D.选项四'],
        answer: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
        explanation: '请导入真实题目',
      });
    }
  });
  return questions;
}

function generateFallbackChallenge(): ExamQuestion[] {
  const questions: ExamQuestion[] = [];
  QUESTION_TYPES.forEach((type, typeIndex) => {
    for (let i = 0; i < 5; i++) {
      questions.push({
        id: typeIndex * 100 + i + 1000,
        type: `行测-${type}`,
        content: `【${type}挑战题${i + 1}】题库为空，请先导入真题。`,
        options: ['A.选项一', 'B.选项二', 'C.选项三', 'D.选项四'],
        answer: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
        explanation: '请导入真实题目',
      });
    }
  });
  return shuffle(questions);
}

function splitQuestionDisplay(content: string): { material: string; question: string } {
  const normalized = normalizeQuestionText(content);
  const materialMatch = normalized.match(/^【资料】\s*([\s\S]*?)(?:\n\s*\n)?【题目】\s*([\s\S]*)$/);
  if (!materialMatch) return { material: '', question: normalized };
  return {
    material: materialMatch[1].trim(),
    question: materialMatch[2].trim(),
  };
}

function QuestionContent({ content, large = false }: { content: string; large?: boolean }) {
  const display = splitQuestionDisplay(content);
  const questionClass = large ? 'text-xl mb-8' : 'text-lg mb-6';
  return (
    <div className="space-y-5">
      {display.material && (
        <div className="rounded-lg border border-info/20 bg-info-light/60 dark:bg-info/10 px-4 py-3">
          <div className="text-xs font-semibold text-info-dark dark:text-info uppercase tracking-wide mb-2">资料</div>
          <div className="whitespace-pre-wrap text-sm leading-7 text-surface-700 dark:text-surface-200">{display.material}</div>
        </div>
      )}
      <p className={`${questionClass} whitespace-pre-wrap text-surface-900 dark:text-surface-0 leading-relaxed`}>
        {display.question}
      </p>
    </div>
  );
}

// ==================== AI 分析 ====================
async function analyzeWithAI(
  report: any,
  ragConfig: any,
  onStream: (text: string) => void
): Promise<string | null> {
  // Try RAG config first, then fall back to localStorage ai_config
  let config: { apiUrl: string; apiKey: string; model: string } | null = null;

  try {
    if (ragConfig?.llmApiUrl && ragConfig?.llmApiKey) {
      const baseUrl = ragConfig.llmApiUrl.replace(/\/+$/, '');
      config = {
        apiUrl: `${baseUrl}/chat/completions`,
        apiKey: ragConfig.llmApiKey,
        model: ragConfig.llmModel || 'deepseek-chat',
      };
    }
  } catch {}

  if (!config) {
    const savedConfig = localStorage.getItem('ai_config');
    if (!savedConfig) return null;
    const parsed = JSON.parse(savedConfig);
    if (!parsed.apiKey || !parsed.apiUrl) return null;
    config = { apiUrl: parsed.apiUrl, apiKey: parsed.apiKey, model: parsed.model || 'deepseek-chat' };
  }

  const prompt = `你是公务员考试资深辅导老师，擅长通过答题数据分析考生的薄弱环节并给出精准建议。

答题概况：
- 题目总数：${report.totalQuestions}
- 已答题：${report.totalAnswered}
- 答对：${report.correctCount}
- 正确率：${report.accuracy}%
- 答题用时：${Math.floor(report.timeUsed / 60)}分钟

分题型详情：
${report.weaknesses.map((w: any) => `${w.type.split('-')[1]}：${w.correct}/${w.total}题 正确率${w.accuracy.toFixed(0)}%`).join('\n')}

请按以下结构输出（不要使用markdown标记）：

【整体评分】
用一段话给出整体表现评价和预估分数

【薄弱环节分析】
针对正确率低于70%的题型，指出常见失分原因和需要复习的知识点

【提分建议】
给出3-5条可立即执行的复习建议

【时间管理】
分析答题节奏是否合理`;

  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: prompt }], max_tokens: 1500, stream: true }),
    });

    if (!response.ok) return null;

    const reader = response.body?.getReader();
    if (!reader) return null;

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const json = JSON.parse(line.slice(6));
            const content = json.choices?.[0]?.delta?.content || '';
            if (content) {
              fullText += content;
              onStream(fullText);
            }
          } catch {}
        }
      }
    }

    return fullText || null;
  } catch {
    return null;
  }
}

// ==================== 格式化工具 ====================
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function generateSuggestions(weaknesses: any[], unanswered: number, timeUsed: number): string[] {
  const suggestions: string[] = [];
  const minutes = Math.floor(timeUsed / 60);

  if (minutes < 90) suggestions.push('时间较短，建议仔细检查是否有漏题或粗心错误');
  else if (minutes > 115) suggestions.push('时间较紧，建议加强限时训练');

  const weak = weaknesses.filter(w => w.accuracy < 60);
  if (weak.length > 0) suggestions.push(`重点突破：${weak.map(w => w.type.split('-')[1]).join('、')} 正确率低于60%`);

  if (unanswered > 10) suggestions.push(`有${unanswered}题未作答，建议考试时先跳过难题`);

  const strong = weaknesses.filter(w => w.accuracy >= 80);
  if (strong.length > 0) suggestions.push(`保持优势：${strong.map(w => w.type.split('-')[1]).join('、')} 表现优秀`);

  if (suggestions.length === 0) suggestions.push('整体表现均衡，继续保持！');
  return suggestions;
}

// ==================== 主组件 ====================
export default function MockExam() {
  const store = useMockExamStore();
  const [searchParams] = useSearchParams();
  const selectedPaperKey = searchParams.get('paper');
  const skipDataAnalysis = searchParams.get('skipData') === '1';
  const {
    data: questionData,
    refetch: refetchQuestions,
  } = useQuestions();
  const { data: ragConfig } = useRagConfig();
  const selectedPaperTitle = getPaperTitleByKey(questionData, selectedPaperKey);

  const loadQuestionData = useCallback(async (): Promise<QuestionRecord[]> => {
    const questionResult = await refetchQuestions();
    return questionResult.data ?? questionData ?? [];
  }, [questionData, refetchQuestions]);

  // 正式考试计时器
  useEffect(() => {
    if (store.step === 'exam' && !store.challengeMode && !store.isPaused && store.timeLeft > 0) {
      const timer = setInterval(() => {
        if (store.timeLeft <= 1) {
          handleSubmit();
        } else {
          store.decrementTime();
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [store.step, store.challengeMode, store.isPaused, store.timeLeft]);

  // 挑战模式倒计时
  useEffect(() => {
    if (store.challengeCountdown !== null && store.challengeCountdown > 0) {
      const countdown = store.challengeCountdown;
      const timer = setTimeout(() => countdown !== null && store.setChallengeCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (store.challengeCountdown === 0) {
      store.setChallengeCountdown(null);
      loadQuestionData().then((allQuestions) => {
        const questions = loadChallengeQuestions(allQuestions);
        store.setQuestions(questions);
        store.clearAnswers();
        store.setCurrentIndex(0);
        store.setChallengeMode(true);
        store.setChallengeTimer(0);
        store.setStep('exam');
      });
    }
  }, [loadQuestionData, store.challengeCountdown]);

  // 挑战模式计时（20分钟倒计时）
  useEffect(() => {
    if (store.challengeMode && !store.challengeResult) {
      const timer = setInterval(() => {
        store.incrementChallengeTimer();
        if (store.challengeTimeLeft <= 1) {
          finishChallenge();
        } else {
          store.decrementChallengeTime();
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [store.challengeMode, store.challengeResult, store.challengeTimeLeft]);

  // 开始正式考试
  const startExam = useCallback(async () => {
    store.setChallengeMode(false);
    store.clearAnswers();
    store.setCurrentIndex(0);
    store.setTimeLeft(120 * 60);
    store.resetPauseStats();
    const allQuestions = await loadQuestionData();
    const questions = loadExamQuestions(allQuestions, selectedPaperKey, skipDataAnalysis);
    store.setQuestions(questions);
    store.setStep('exam');
  }, [loadQuestionData, selectedPaperKey, skipDataAnalysis]);

  // 开始挑战模式
  const startChallenge = useCallback(() => {
    store.setChallengeCountdown(3);
    store.setChallengeResult(null);
    store.setChallengeTimeLeft(20 * 60);
  }, []);

  // 答题
  const handleAnswer = useCallback((answer: string) => {
    const q = store.questions[store.currentIndex];
    store.setAnswer(q.id, { questionId: q.id, type: q.type, myAnswer: answer, correct: answer === q.answer });

    if (store.challengeMode) {
      if (store.currentIndex < store.questions.length - 1) {
        setTimeout(() => store.setCurrentIndex(store.currentIndex + 1), 150);
      } else {
        setTimeout(() => finishChallenge(), 200);
      }
    } else {
      if (store.currentIndex < store.questions.length - 1) {
        setTimeout(() => store.setCurrentIndex(store.currentIndex + 1), 200);
      }
    }
  }, [store.currentIndex, store.questions, store.challengeMode]);

  // 完成挑战
  const finishChallenge = useCallback(() => {
    const answers = store.answers;
    const correctCount = Array.from(answers.values()).filter(a => a.correct).length;
    const accuracy = (correctCount / store.questions.length) * 100;

    store.setStep('select');
    store.setChallengeMode(false);

    if (accuracy < 60) {
      store.setChallengeResult('lose');
      store.setChallengeMessage(store.getRandomTaunt());
    } else {
      store.setChallengeResult('win');
      store.setChallengeMessage(store.getRandomPraise());
    }
  }, [store.answers, store.questions.length]);

  // 重置挑战
  const resetChallenge = useCallback(() => {
    store.setChallengeResult(null);
    store.setChallengeMode(false);
    store.setStep('select');
    store.clearAnswers();
    store.setQuestions([]);
  }, []);

  // 交卷确认
  const handleSubmit = useCallback(() => {
    store.setShowConfirm(true);
  }, []);

  // 确认交卷
  const confirmSubmit = useCallback(() => {
    store.setShowConfirm(false);

    const answers = store.answers;
    const answerList = Array.from(answers.values());
    const correctCount = answerList.filter(a => a.correct).length;
    const totalAnswered = answerList.length;
    const totalQuestions = store.questions.length;
    const unansweredCount = totalQuestions - totalAnswered;
    const accuracy = totalAnswered > 0 ? (correctCount / totalAnswered * 100).toFixed(1) : '0';
    const timeUsed = 120 * 60 - store.timeLeft;
    const pauseSeconds = store.getPauseSeconds();

    // 按题型统计
    const typeStats: Record<string, { correct: number; total: number; unanswered: number }> = {};
    store.questions.forEach(q => {
      if (!typeStats[q.type]) typeStats[q.type] = { correct: 0, total: 0, unanswered: 0 };
      typeStats[q.type].total++;
      const ans = answers.get(q.id);
      if (ans) { if (ans.correct) typeStats[q.type].correct++; }
      else { typeStats[q.type].unanswered++; }
    });

    const weaknesses = Object.entries(typeStats)
      .map(([type, stat]) => ({ type, accuracy: stat.total > 0 ? (stat.correct / stat.total * 100) : 0, ...stat }))
      .sort((a, b) => a.accuracy - b.accuracy);

    const suggestions = generateSuggestions(weaknesses, unansweredCount, timeUsed);

    const report = { totalQuestions, totalAnswered, correctCount, unansweredCount, accuracy, timeUsed, pauseCount: store.pauseCount, pauseSeconds, typeStats, weaknesses, suggestions, aiAnalysis: undefined };
    store.setReport(report);
    store.setStep('result');

    // 后台AI分析
    store.setAiAnalyzing(true);
    store.setAiAnalysisText('');
    analyzeWithAI(report, ragConfig, (text) => store.setAiAnalysisText(text)).then(aiAnalysis => {
      if (aiAnalysis && store.report) {
        store.setReport({ ...store.report, aiAnalysis });
      }
      store.setAiAnalyzing(false);
    }).catch(() => store.setAiAnalyzing(false));
  }, [ragConfig, store.answers, store.questions, store.timeLeft, store.pauseCount]);

  // 重置考试
  const resetExam = useCallback(() => {
    store.setStep('select');
    store.setReport(null);
    store.setAiAnalysisText('');
    store.setAiAnalyzing(false);
  }, []);

  // ==================== 渲染 ====================
  const { step, questions, currentIndex, answers, timeLeft, report, showConfirm, challengeMode, challengeCountdown, challengeTimer, challengeTimeLeft, challengeResult, challengeMessage, aiAnalyzing, aiAnalysisText } = store;

  // 选择界面
  if (step === 'select') {
    return <SelectPage startExam={startExam} startChallenge={startChallenge} challengeCountdown={challengeCountdown} challengeResult={challengeResult} challengeMessage={challengeMessage} resetChallenge={resetChallenge} questions={questions} answers={answers} challengeTimer={challengeTimer} selectedPaperKey={selectedPaperKey} selectedPaperTitle={selectedPaperTitle} skipDataAnalysis={skipDataAnalysis} />;
  }

  // 答题界面
  if (step === 'exam') {
    return <ExamPage questions={questions} currentIndex={currentIndex} answers={answers} timeLeft={timeLeft} isPaused={store.isPaused} togglePause={store.togglePause} challengeMode={challengeMode} challengeTimeLeft={challengeTimeLeft} handleAnswer={handleAnswer} handleSubmit={handleSubmit} showConfirm={showConfirm} confirmSubmit={confirmSubmit} setShowConfirm={store.setShowConfirm} setCurrentIndex={store.setCurrentIndex} />;
  }

  // 结果界面
  if (step === 'result' && report) {
    return <ResultPage report={report} aiAnalyzing={aiAnalyzing} aiAnalysisText={aiAnalysisText} resetExam={resetExam} />;
  }

  return null;
}

// ==================== 选择页面 ====================
function SelectPage({ startExam, startChallenge, challengeCountdown, challengeResult, challengeMessage, resetChallenge, questions, answers, challengeTimer, selectedPaperKey, selectedPaperTitle, skipDataAnalysis }: any) {
  const isPaperMode = Boolean(selectedPaperKey);

  return (
    <div className="min-h-screen bg-surface-0 dark:bg-surface-900 p-6 space-y-6">
      {/* 主标题 */}
      <div className="bg-brand-gradient text-white text-center py-6 px-4 rounded-2xl shadow-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.08] rounded-full -translate-y-1/3 translate-x-1/4" />
        <h1 className="text-xl font-semibold font-display">智能套题测评</h1>
        <p className="text-sm text-white/70 mt-1">模拟真实考试，AI分析薄弱环节</p>
      </div>

      {/* 考试模式选择 */}
      <div className="max-w-2xl mx-auto space-y-4">
        {/* 正式考试 */}
        <button onClick={startExam} className="w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-6 hover:border-brand-300 dark:hover:border-brand-500 hover:shadow-card-hover transition-all text-left group">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-0 font-display">
                {isPaperMode ? '真题屏幕训练' : '行政职业能力测验'}
              </h3>
              <p className="text-sm font-medium text-surface-500 dark:text-surface-400 mt-1">
                {isPaperMode
                  ? `${selectedPaperTitle || '已选择真题'} | ${skipDataAnalysis ? '跳过资料分析' : '按真题顺序训练'} | 120分钟`
                  : '135题 | 120分钟 | 常识+言语+数量+判断+资料'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-brand-500 group-hover:translate-x-1 transition-transform">
              <Clock className="w-5 h-5" />
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </button>

        {/* 挑战模式 */}
        <button onClick={startChallenge} className="w-full bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-500/10 dark:to-brand-500/20 border-2 border-brand-200 dark:border-brand-500/30 rounded-xl p-6 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-card-hover transition-all text-left group">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-brand-700 dark:text-brand-400 font-display">挑战模式</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-brand-500 text-white rounded-full uppercase tracking-wider">限时</span>
              </div>
              <p className="text-sm text-brand-600/70 dark:text-brand-400/70 mt-1">25题 | 20分钟倒计时 | 60%正确率通关</p>
            </div>
            <div className="flex items-center gap-2 text-brand-500 group-hover:translate-x-1 transition-transform">
              <Target className="w-5 h-5" />
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </button>

        {/* 申论（即将上线） */}
        <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-6 opacity-60">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-0 font-display">申论</h3>
          <p className="text-sm font-medium text-surface-500 dark:text-surface-400 mt-1">即将上线</p>
        </div>
      </div>

      <div className="bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 rounded-xl p-4">
        <p className="text-sm text-brand-700 dark:text-brand-400">
          {isPaperMode
            ? '提示：当前从真题入口进入，电脑训练用于常识、言语、数量、判断等屏幕适配题型；资料分析建议在真题入口打印后纸面练习。'
            : '提示：套题训练优先从真题入口中的结构化题库抽题，并按国考行测题型分布组卷。'}
        </p>
      </div>

      {/* 倒计时弹窗 */}
      {challengeCountdown !== null && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
          <div className="text-center">
            <div className="text-9xl font-bold text-white font-display">{challengeCountdown}</div>
            {challengeCountdown > 0 && <p className="text-3xl text-white/70 mt-4">准备好了吗...</p>}
          </div>
        </div>
      )}

      {/* 挑战结果弹窗 */}
      {challengeResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-surface-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-elevated">
            <div className="text-5xl mb-4">{challengeResult === 'win' ? '🎉' : '😅'}</div>
            <h2 className={`text-xl font-bold mb-2 font-display ${challengeResult === 'win' ? 'text-success-dark' : 'text-danger-dark'}`}>
              {challengeResult === 'win' ? '挑战成功！' : '挑战失败'}
            </h2>
            <p className="text-surface-600 dark:text-surface-400 mb-2">正确率：{Math.round((Array.from(answers.values()).filter((a: any) => a.correct).length / questions.length) * 100)}%</p>
            <p className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-2">用时：{challengeTimer}秒</p>
            <p className={`text-base font-medium mt-4 ${challengeResult === 'win' ? 'text-success-dark' : 'text-danger-dark'}`}>{challengeMessage}</p>
            <button onClick={resetChallenge} className="mt-6 w-full px-4 py-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-medium">再来一次</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 答题页面 ====================
function ExamPage({ questions, currentIndex, answers, timeLeft, isPaused, togglePause, challengeMode, challengeTimeLeft, handleAnswer, handleSubmit, showConfirm, confirmSubmit, setShowConfirm, setCurrentIndex }: any) {
  const q = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // 挑战模式全屏
  if (challengeMode) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col bg-surface-0 dark:bg-surface-900">
        {/* 顶部状态栏 */}
        <div className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 px-6 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <span className="text-xl font-semibold text-surface-900 dark:text-surface-0 font-display">挑战模式</span>
              <span className="text-surface-500 dark:text-surface-400">第 {currentIndex + 1} / {questions.length} 题</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-surface-500 dark:text-surface-400">已答 {answers.size} 题</span>
              <div className={`flex items-center gap-2 font-mono text-lg px-3 py-1 rounded-full border-2 ${challengeTimeLeft < 60 ? 'border-danger bg-danger-light dark:bg-danger/20 text-danger-dark dark:text-danger' : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-800 text-surface-900 dark:text-surface-0'}`}>
                <Clock className="w-5 h-5" />
                {formatTime(challengeTimeLeft)}
              </div>
            </div>
          </div>
          <div className="max-w-4xl mx-auto mt-3">
            <div className="w-full h-2 bg-surface-100 dark:bg-surface-700 rounded-full">
              <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* 题目内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {q && (
              <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-8">
                <QuestionContent content={q.content} large />
                <div className="space-y-4">
                  {q.options.map((opt: string, i: number) => {
                    const isSelected = answers.get(q.id)?.myAnswer === opt[0];
                    return (
                      <button key={i} onClick={() => handleAnswer(opt[0])} className={`w-full text-left p-4 rounded-xl border-2 transition-all text-base ${isSelected ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-surface-900 dark:text-surface-0' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600 hover:bg-surface-0 dark:hover:bg-surface-700 text-surface-900 dark:text-surface-0'}`}>
                        <span className="font-medium">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部提示 */}
        <div className="p-4 text-center text-surface-500 dark:text-surface-400 text-sm border-t border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">选择答案后自动跳转下一题 · 剩余时间 {formatTime(challengeTimeLeft)} · 共 {questions.length} 题</div>
      </div>
    );
  }

  // 正式考试模式
  return (
    <div className="h-screen flex flex-col bg-surface-0 dark:bg-surface-900">
      {/* 顶部状态栏 */}
      <div className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-surface-600 dark:text-surface-400">{q?.type}</span>
            <span className="text-sm font-medium text-surface-500 dark:text-surface-400">第 {currentIndex + 1} / {questions.length} 题</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-surface-500 dark:text-surface-400">已答 {answers.size} 题</span>
            <button onClick={togglePause} className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 px-3 py-1.5 text-sm font-semibold text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-700">
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? '??' : '??'}
            </button>
            <div className={`flex items-center gap-1 font-mono text-lg ${timeLeft < 600 ? 'text-danger' : 'text-surface-900 dark:text-surface-0'}`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-2">
          <div className="w-full h-2 bg-surface-100 dark:bg-surface-700 rounded-full">
            <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* 题目内容 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {q && (
            <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-6">
              <QuestionContent content={q.content} />
              <div className="space-y-3">
                {q.options.map((opt: string, i: number) => {
                  const isSelected = answers.get(q.id)?.myAnswer === opt[0];
                  return (
                    <button key={i} onClick={() => handleAnswer(opt[0])} className={`w-full text-left p-4 rounded-xl border-2 transition-all text-base ${isSelected ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-surface-900 dark:text-surface-0' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600 hover:bg-surface-0 dark:hover:bg-surface-700 text-surface-900 dark:text-surface-0'}`}>
                      <span className="font-medium">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部导航 */}
      <div className="bg-white dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-0 disabled:opacity-30 hover:bg-surface-50 dark:hover:bg-surface-700 rounded-lg transition-all">上一题</button>
          <button onClick={handleSubmit} className="px-6 py-2 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600 transition-all">交卷</button>
          <button onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))} disabled={currentIndex === questions.length - 1} className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-0 disabled:opacity-30 hover:bg-surface-50 dark:hover:bg-surface-700 rounded-lg transition-all">下一题</button>
        </div>
      </div>

      {/* 题号导航 */}
      <div className="bg-surface-0 dark:bg-surface-900 border-t border-surface-200 dark:border-surface-700 px-4 py-2">
        <div className="w-full max-w-[1500px] mx-auto max-h-48 overflow-y-auto pr-1">
          <div className="flex gap-1.5 flex-wrap">
            {questions.map((question: any, i: number) => {
              const isSelected = currentIndex === i;
              const hasAnswer = answers.has(question.id);
              return (
                <button
                  key={question.id ?? i}
                  onClick={() => setCurrentIndex(i)}
                  aria-label={`跳转到第 ${i + 1} 题`}
                  className={`min-w-9 h-8 px-1.5 text-xs font-medium rounded border-2 transition-all tabular-nums ${
                    isSelected ? 'border-brand-500 bg-brand-500 text-white' :
                    hasAnswer ? 'border-surface-200 dark:border-surface-700 bg-brand-50 dark:bg-brand-500/10 text-surface-900 dark:text-surface-0' :
                    'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-500 dark:text-surface-400 hover:border-surface-300 dark:hover:border-surface-600'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 交卷确认 */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-surface-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-elevated">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-3 font-display">确认交卷？</h3>
            <div className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-4 space-y-1">
              <p>已答题数：{answers.size} / {questions.length}</p>
              <p>未答题数：{questions.length - answers.size}</p>
              {questions.length - answers.size > 0 && <p className="text-danger">还有 {questions.length - answers.size} 题未作答</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700 transition-all">继续答题</button>
              <button onClick={confirmSubmit} className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all">确认交卷</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 结果页面 ====================
function ResultPage({ report, aiAnalyzing, aiAnalysisText, resetExam }: any) {
  return (
    <div className="min-h-screen bg-surface-0 dark:bg-surface-900 p-6 space-y-6">
      {/* 主标题 */}
      <div className="text-center py-6">
        <h1 className="text-xl font-semibold text-surface-900 dark:text-surface-0 font-display">测评报告</h1>
      </div>

      {/* 核心数据 */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-4 text-center hover:shadow-card-hover transition-all">
          <p className="text-3xl font-bold text-surface-900 dark:text-surface-0 font-display">{report.correctCount}</p>
          <p className="text-sm font-medium text-surface-500 dark:text-surface-400 mt-1">正确题数</p>
        </div>
        <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-4 text-center hover:shadow-card-hover transition-all">
          <p className="text-3xl font-bold text-surface-900 dark:text-surface-0 font-display">{report.unansweredCount}</p>
          <p className="text-sm font-medium text-surface-500 dark:text-surface-400 mt-1">未作答</p>
        </div>
        <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-4 text-center hover:shadow-card-hover transition-all">
          <p className="text-3xl font-bold text-brand-600 font-display">{report.accuracy}%</p>
          <p className="text-sm font-medium text-surface-500 dark:text-surface-400 mt-1">正确率</p>
        </div>
        <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-4 text-center hover:shadow-card-hover transition-all">
          <p className="text-3xl font-bold text-surface-900 dark:text-surface-0 font-display">{formatTime(report.timeUsed)}</p>
          <p className="text-sm font-medium text-surface-500 dark:text-surface-400 mt-1">用时</p>
        </div>
      </div>

      {/* 各题型正确率 */}
      <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-6">
        <h2 className="text-base font-semibold text-surface-900 dark:text-surface-0 mb-4 flex items-center gap-2 font-display">
          <BarChart3 className="w-5 h-5 text-brand-500" />各题型正确率
        </h2>
        <div className="space-y-4">
          {report.weaknesses.map((w: any) => {
            const pct = w.accuracy;
            let colorClass = 'bg-brand-500';
            if (pct < 50) colorClass = 'bg-danger';
            else if (pct < 70) colorClass = 'bg-warning';
            else if (pct < 85) colorClass = 'bg-brand-400';
            return (
              <div key={w.type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-surface-600 dark:text-surface-400">{w.type.split('-')[1]}</span>
                  <span className="text-sm font-medium text-surface-500 dark:text-surface-400">{w.correct}/{w.total} | {pct.toFixed(0)}%</span>
                </div>
                <div className="w-full h-3 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                  <div className={`h-full ${colorClass} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI分析 */}
      {(aiAnalyzing || aiAnalysisText || report.aiAnalysis) ? (
        <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-6">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-0 mb-4 flex items-center gap-2 font-display">
            <Target className="w-5 h-5 text-brand-500" />
            AI深度分析
            {aiAnalyzing && <span className="text-xs text-surface-400 dark:text-surface-400 ml-2">分析中...</span>}
          </h2>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-surface-600 dark:text-surface-400">
            {(aiAnalysisText || report.aiAnalysis || '').split('\n').map((line: string, i: number) => (
              <p key={i} className="mb-2">{line}</p>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-6">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-0 mb-4 flex items-center gap-2 font-display">
            <Target className="w-5 h-5 text-brand-500" />智能分析建议
          </h2>
          <div className="space-y-3">
            {report.suggestions.map((s: string, i: number) => (
              <div key={i} className="bg-surface-0 dark:bg-surface-700 rounded-lg p-3 text-sm font-medium text-surface-600 dark:text-surface-400">{s}</div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-surface-0 dark:bg-surface-700 rounded-lg text-xs text-surface-500 dark:text-surface-400">配置AI接口后可获得更详细的深度分析，<a href="#/settings" className="text-brand-500 hover:text-brand-600 underline">去设置</a></div>
        </div>
      )}

      {/* 薄弱提示 */}
      {report.weaknesses.filter((w: any) => w.accuracy < 60).length > 0 && (
        <div className="bg-danger-light dark:bg-danger/10 border border-danger/20 dark:border-danger/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-danger mt-0.5" />
            <div>
              <p className="font-medium text-surface-900 dark:text-surface-0">需要重点突破</p>
              <p className="text-sm font-medium text-surface-600 dark:text-surface-400 mt-1">{report.weaknesses.filter((w: any) => w.accuracy < 60).map((w: any) => w.type.split('-')[1]).join('、')} 正确率较低</p>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-center gap-4">
        <button onClick={resetExam} className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-700 hover:border-surface-300 dark:hover:border-surface-600 transition-all">
          <RefreshCw className="w-4 h-4" />
          再测一次
        </button>
      </div>
    </div>
  );
}
