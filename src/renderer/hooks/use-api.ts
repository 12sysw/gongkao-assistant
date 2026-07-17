import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatLocalDate, selectDueFlashcards } from '../../shared/review-schedule';
import type {
  DailyRecordInput,
  ExamConfigInput,
  EssayReviewParams,
  FlashcardFilters,
  FlashcardInput,
  FlashcardReviewParams,
  FlashcardUpdate,
  KnowledgePointInput,
  KnowledgePointUpdate,
  MindMapInput,
  PomodoroRecordInput,
  QuestionFilters,
  QuestionInput,
  RagConfig,
  RagDocInput,
  RecommendationEventInput,
  ReviewSessionInput,
  StudyPlanInput,
  StudyPlanUpdate,
  WrongBookFilters,
  WrongBookInput,
  WrongBookUpdate,
  RagChatOptions,
} from '../../shared/ipc';

const api = window.api;

interface StreamCallbacks {
  onChunk?: (chunk: string) => void;
  onEnd?: () => void;
}

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

// ==================== 考试配置 ====================
export function useExamConfig() {
  return useQuery({
    queryKey: ['examConfig'],
    queryFn: () => api.examConfig.get(),
  });
}

export function useUpdateExamConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: ExamConfigInput) => api.examConfig.set(config),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['examConfig'] }),
  });
}

// ==================== 每日记录 ====================
export function useDailyStats(days: number = 30) {
  return useQuery({
    queryKey: ['dailyStats', days],
    queryFn: () => api.dailyRecord.getStats(days),
  });
}

export function useDailyRecordRange(start: string, end: string) {
  return useQuery({
    queryKey: ['dailyRecords', start, end],
    queryFn: () => api.dailyRecord.getRange(start, end),
  });
}

export function useLoadDailyRecordRange() {
  return useMutation({
    mutationFn: ({ start, end }: { start: string; end: string }) =>
      api.dailyRecord.getRange(start, end),
  });
}

export function useDailyRecord(date: string) {
  return useQuery({
    queryKey: ['dailyRecord', date],
    queryFn: () => api.dailyRecord.getByDate(date),
    enabled: Boolean(date),
  });
}

export function useDueReviews() {
  return useQuery({
    queryKey: ['dueReviews'],
    queryFn: () => api.wrongBook.getDueReview(),
  });
}

export function useWrongBookRecords(filters?: WrongBookFilters) {
  return useQuery({
    queryKey: ['wrongBookRecords', filters],
    queryFn: () => api.wrongBook.getAll(filters),
  });
}

// ==================== 学习计划 ====================
export function useStudyPlans() {
  return useQuery({
    queryKey: ['studyPlans'],
    queryFn: () => api.studyPlan.getAll(),
  });
}

// ==================== 记忆卡片 ====================
export function useFlashcards(filters?: FlashcardFilters) {
  return useQuery({
    queryKey: ['flashcards', filters],
    queryFn: () => api.flashcard.getAll(filters),
  });
}

export function useDueFlashcards(todayKey: string = formatLocalDate()) {
  const flashcardsQuery = useFlashcards();
  const dueFlashcards = useMemo(
    () => selectDueFlashcards(flashcardsQuery.data ?? [], todayKey),
    [flashcardsQuery.data, todayKey]
  );

  return {
    ...flashcardsQuery,
    data: dueFlashcards,
  };
}

// ==================== 成就 ====================
export function useAchievementDefinitions() {
  return useQuery({
    queryKey: ['achievementDefinitions'],
    queryFn: () => api.achievement.getAll(),
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: ['achievements'],
    queryFn: () => api.achievement.check(),
  });
}

// ==================== 思维导图 ====================
export function useMindMaps() {
  return useQuery({
    queryKey: ['mindMaps'],
    queryFn: () => api.mindMap.getAll(),
  });
}

export function useLoadMindMap() {
  return useMutation({
    mutationFn: (id: number) => api.mindMap.getById(id),
  });
}

export function useReviewSession(date: string) {
  return useQuery({
    queryKey: ['reviewSession', date],
    queryFn: () => api.reviewSession.get(date),
    enabled: Boolean(date),
  });
}

export function useRecentReviewSessions(days: number = 7) {
  return useQuery({
    queryKey: ['reviewSessions', days],
    queryFn: () => api.reviewSession.getRecent(days),
  });
}

export function useRecentRecommendationEvents(days: number = 7) {
  return useQuery({
    queryKey: ['recommendationEvents', days],
    queryFn: () => api.recommendationEvent.getRecent(days),
  });
}

export function useAddRecommendationEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (event: RecommendationEventInput) => api.recommendationEvent.add(event),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recommendationEvents'] }),
  });
}

// ==================== 用户知识点 ====================
export function useKnowledgePoints() {
  return useQuery({
    queryKey: ['knowledgePoints'],
    queryFn: () => api.knowledgePoint.getAll(),
  });
}

export function useAddKnowledgePoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (point: KnowledgePointInput) => api.knowledgePoint.add(point),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledgePoints'] }),
  });
}

export function useUpdateKnowledgePoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (point: KnowledgePointUpdate) => api.knowledgePoint.update(point),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledgePoints'] }),
  });
}

export function useDeleteKnowledgePoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.knowledgePoint.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledgePoints'] }),
  });
}

// ==================== RAG 知识库 ====================
export function useRagDocs(enabled = true) {
  return useQuery({
    queryKey: ['ragDocs'],
    queryFn: () => api.rag.docGetAll(),
    enabled,
  });
}

export function useRagSessions() {
  return useQuery({
    queryKey: ['ragSessions'],
    queryFn: () => api.rag.sessionGetAll(),
  });
}

export function useRagMessages(sessionId: number | null) {
  return useQuery({
    queryKey: ['ragMessages', sessionId],
    queryFn: () => api.rag.sessionGetMessages(sessionId!),
    enabled: sessionId !== null && sessionId > 0,
  });
}

export function useRagStream(callbacks: StreamCallbacks) {
  const callbacksRef = useLatestRef(callbacks);

  useEffect(() => {
    const unsubChunk = api.rag.onStreamChunk((chunk) => {
      callbacksRef.current.onChunk?.(chunk);
    });
    const unsubEnd = api.rag.onStreamEnd(() => {
      callbacksRef.current.onEnd?.();
    });

    return () => {
      unsubChunk();
      unsubEnd();
    };
  }, [callbacksRef]);
}

export function useSendRagChat() {
  return useMutation({
    mutationFn: ({ sessionId, message, options }: { sessionId: number; message: string; options?: RagChatOptions }) =>
      api.rag.chat(sessionId, message, options),
  });
}

export function useHuashengCatalog() {
  return useQuery({
    queryKey: ['huashengCatalog'],
    queryFn: () => api.rag.huashengCatalog(),
    staleTime: Infinity,
  });
}

export function useEssayReviewStream(callbacks: StreamCallbacks) {
  const callbacksRef = useLatestRef(callbacks);

  useEffect(() => {
    const unsubChunk = api.rag.onEssayStreamChunk((chunk) => {
      callbacksRef.current.onChunk?.(chunk);
    });
    const unsubEnd = api.rag.onEssayStreamEnd(() => {
      callbacksRef.current.onEnd?.();
    });

    return () => {
      unsubChunk();
      unsubEnd();
    };
  }, [callbacksRef]);
}

export function useEssayReview() {
  return useMutation({
    mutationFn: (params: EssayReviewParams) => api.rag.essayReview(params),
  });
}

export function useRagConfig() {
  return useQuery({
    queryKey: ['ragConfig'],
    queryFn: () => api.rag.configGet(),
  });
}

export function useAddRagDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (doc: RagDocInput) => api.rag.docAdd(doc),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ragDocs'] }),
  });
}

export function useDeleteRagDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.rag.docDelete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ragDocs'] }),
  });
}

export function useDeleteRagDocBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => api.rag.docDeleteBatch(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ragDocs'] }),
  });
}

export function useSyncQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.rag.syncQuestions(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ragDocs'] });
      qc.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

export function useCreateRagSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => api.rag.sessionCreate(title),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ragSessions'] }),
  });
}

export function useDeleteRagSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.rag.sessionDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ragSessions'] });
      qc.invalidateQueries({ queryKey: ['ragMessages'] });
    },
  });
}

export function useSaveRagConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: RagConfig) => api.rag.configSet(config),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ragConfig'] }),
  });
}

export function useTestRagConfig() {
  return useMutation({
    mutationFn: (params: { apiUrl: string; apiKey: string; model: string }) => api.rag.configTest(params),
  });
}

export function useAppVersion() {
  return useQuery({
    queryKey: ['appVersion'],
    queryFn: () => api.getAppVersion(),
    staleTime: Infinity,
  });
}

export function useExportData() {
  return useMutation({
    mutationFn: () => api.data.export(),
  });
}

export function useImportData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.data.import(),
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ==================== 知识图谱 ====================
export function useKnowledgeGraph() {
  return useQuery({
    queryKey: ['knowledgeGraph'],
    queryFn: () => api.kg.getGraph(),
  });
}

export function useBuildKnowledgeGraph() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.kg.build(),
    onSuccess: (result) => {
      if (!result?.error) {
        qc.invalidateQueries({ queryKey: ['knowledgeGraph'] });
      }
    },
  });
}

export function useClearKnowledgeGraph() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.kg.clear(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledgeGraph'] }),
  });
}

export function useChromaStatus() {
  return useQuery({
    queryKey: ['chromaStatus'],
    queryFn: () => api.rag.chromaStatus(),
    refetchInterval: 10000,
  });
}

export function useChromaMigrate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.rag.chromaMigrate(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chromaStatus'] }),
  });
}

// ==================== AI 个性化推荐 ====================
export function useAiRecommend() {
  return useQuery({
    queryKey: ['aiRecommend'],
    queryFn: () => api.rag.aiRecommend(),
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: false,
  });
}

// ==================== 通用 mutation ====================
export function useAddDailyRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: DailyRecordInput) => api.dailyRecord.add(record),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dailyStats'] });
      qc.invalidateQueries({ queryKey: ['dailyRecord'] });
      qc.invalidateQueries({ queryKey: ['dailyRecords'] });
    },
  });
}

export function useAddWrongRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: WrongBookInput) => api.wrongBook.add(record),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wrongBookRecords'] });
      qc.invalidateQueries({ queryKey: ['dueReviews'] });
      qc.invalidateQueries({ queryKey: ['dailyStats'] });
      qc.invalidateQueries({ queryKey: ['achievements'] });
    },
  });
}

// ==================== 错题本 ====================
export function useUpdateWrongRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: WrongBookUpdate) => api.wrongBook.update(record),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wrongBookRecords'] });
      qc.invalidateQueries({ queryKey: ['dueReviews'] });
    },
  });
}

export function useReviewWrongRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.wrongBook.review(id),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['wrongBookRecords'] }),
        qc.invalidateQueries({ queryKey: ['dueReviews'] }),
        qc.invalidateQueries({ queryKey: ['achievements'] }),
      ]),
  });
}

export function useDeleteWrongRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.wrongBook.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wrongBookRecords'] });
      qc.invalidateQueries({ queryKey: ['dueReviews'] });
    },
  });
}

export function useMarkWrongMastered() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.wrongBook.markMastered(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wrongBookRecords'] });
      qc.invalidateQueries({ queryKey: ['dueReviews'] });
      qc.invalidateQueries({ queryKey: ['achievements'] });
    },
  });
}

export function useAnalyzeWrongRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const result = await api.wrongBook.analyze(id);
      if (result?.error) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wrongBookRecords'] }),
  });
}

// ==================== 题目 ====================
export function useQuestions(filters?: QuestionFilters) {
  return useQuery({
    queryKey: ['questions', filters],
    queryFn: () => api.question.getAll(filters),
  });
}

export function useAddQuestion() {
  return useMutation({
    mutationFn: (q: QuestionInput) => api.question.add(q),
  });
}

// ==================== 记忆卡片 ====================
export function useAddFlashcard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (card: FlashcardInput) => api.flashcard.add(card),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flashcards'] }),
  });
}

export function useUpdateFlashcard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (card: FlashcardUpdate) => api.flashcard.update(card),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flashcards'] }),
  });
}

export function useReviewFlashcard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: FlashcardReviewParams) => api.flashcard.review(params),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['flashcards'] }),
        qc.invalidateQueries({ queryKey: ['achievements'] }),
      ]),
  });
}

export function useDeleteFlashcard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.flashcard.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flashcards'] }),
  });
}

// ==================== 学习计划 ====================
export function useAddStudyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: StudyPlanInput) => api.studyPlan.add(plan),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studyPlans'] }),
  });
}

export function useUpdateStudyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: StudyPlanUpdate) => api.studyPlan.update(plan),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studyPlans'] }),
  });
}

export function useDeleteStudyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.studyPlan.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studyPlans'] }),
  });
}

// ==================== 思维导图 ====================
export function useSaveMindMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MindMapInput) => api.mindMap.save(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mindMaps'] }),
  });
}

export function useDeleteMindMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.mindMap.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mindMaps'] }),
  });
}

// ==================== 复习会话 ====================
export function useSaveReviewSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (session: ReviewSessionInput) => api.reviewSession.set(session),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviewSessions'] });
      qc.invalidateQueries({ queryKey: ['dueReviews'] });
    },
  });
}

// ==================== 番茄钟 ====================
export function useAddPomodoroRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: PomodoroRecordInput) => api.pomodoroRecord.add(record),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dailyStats'] }),
  });
}

// ==================== 数据导入 ====================
export function useImportPdfs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dirPath: string) => api.rag.importPdfs(dirPath),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ragDocs'] });
      qc.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}
