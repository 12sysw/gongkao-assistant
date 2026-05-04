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
