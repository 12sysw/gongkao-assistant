import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const api = (window as any).api;

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
    mutationFn: (config: { name: string; date: string }) => api.examConfig.set(config),
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

export function useDueReviews() {
  return useQuery({
    queryKey: ['dueReviews'],
    queryFn: () => api.wrongBook.getDueReview(),
  });
}

export function useWrongBookRecords() {
  return useQuery({
    queryKey: ['wrongBookRecords'],
    queryFn: () => api.wrongBook.getAll(),
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
export function useFlashcards(filters?: any) {
  return useQuery({
    queryKey: ['flashcards', filters],
    queryFn: () => api.flashcard.getAll(filters),
  });
}

// ==================== 成就 ====================
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

// ==================== RAG 知识库 ====================
export function useRagDocs() {
  return useQuery({
    queryKey: ['ragDocs'],
    queryFn: () => api.rag.docGetAll(),
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

export function useRagConfig() {
  return useQuery({
    queryKey: ['ragConfig'],
    queryFn: () => api.rag.configGet(),
  });
}

export function useAddRagDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (doc: any) => api.rag.docAdd(doc),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ragDocs'] }),
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
    mutationFn: (config: any) => api.rag.configSet(config),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ragConfig'] }),
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
    mutationFn: (record: any) => api.dailyRecord.add(record),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dailyStats'] });
      qc.invalidateQueries({ queryKey: ['dailyRecords'] });
    },
  });
}

export function useAddWrongRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: any) => api.wrongBook.add(record),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wrongBookRecords'] });
      qc.invalidateQueries({ queryKey: ['dueReviews'] });
      qc.invalidateQueries({ queryKey: ['dailyStats'] });
    },
  });
}

// ==================== 错题本 ====================
export function useUpdateWrongRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: any) => api.wrongBook.update(record),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wrongBookRecords'] });
      qc.invalidateQueries({ queryKey: ['dueReviews'] });
    },
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
    },
  });
}

// ==================== 题目 ====================
export function useAddQuestion() {
  return useMutation({
    mutationFn: (q: any) => api.question.add(q),
  });
}

// ==================== 记忆卡片 ====================
export function useAddFlashcard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (card: any) => api.flashcard.add(card),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flashcards'] }),
  });
}

export function useUpdateFlashcard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (card: any) => api.flashcard.update(card),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flashcards'] }),
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
    mutationFn: (plan: any) => api.studyPlan.add(plan),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studyPlans'] }),
  });
}

export function useUpdateStudyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: any) => api.studyPlan.update(plan),
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
    mutationFn: (data: any) => api.mindMap.save(data),
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
    mutationFn: (session: any) => api.reviewSession.set(session),
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
    mutationFn: (record: any) => api.pomodoroRecord.add(record),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dailyStats'] }),
  });
}

// ==================== 数据导入 ====================
export function useImportPdfs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dirPath: string) => api.rag.importPdfs(dirPath),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ragDocs'] }),
  });
}
