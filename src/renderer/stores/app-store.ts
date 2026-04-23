import { create } from 'zustand';

interface AppState {
  // 全局加载状态
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // 考试配置
  examConfig: { name: string; date: string } | null;
  setExamConfig: (config: { name: string; date: string } | null) => void;

  // 当前页面
  currentPage: string;
  setCurrentPage: (page: string) => void;

  // 主题
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),

  examConfig: null,
  setExamConfig: (config) => set({ examConfig: config }),

  currentPage: '/',
  setCurrentPage: (page) => set({ currentPage: page }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
