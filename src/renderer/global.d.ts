/// <reference types="vite/client" />

interface Window {
  api: {
    wrongBook: {
      add: (record: any) => Promise<any>;
      getAll: (filters?: any) => Promise<any[]>;
      getById: (id: number) => Promise<any>;
      update: (record: any) => Promise<any>;
      delete: (id: number) => Promise<{ success: boolean }>;
      markMastered: (id: number) => Promise<{ success: boolean }>;
      getDueReview: () => Promise<any[]>;
    };
    question: {
      add: (q: any) => Promise<any>;
      getAll: (filters?: any) => Promise<any[]>;
      getById: (id: number) => Promise<any>;
      update: (q: any) => Promise<any>;
      delete: (id: number) => Promise<{ success: boolean }>;
    };
    mindMap: {
      save: (data: any) => Promise<any>;
      getAll: () => Promise<any[]>;
      getById: (id: number) => Promise<any>;
      delete: (id: number) => Promise<{ success: boolean }>;
    };
    studyPlan: {
      add: (plan: any) => Promise<any>;
      getAll: () => Promise<any[]>;
      update: (plan: any) => Promise<any>;
      delete: (id: number) => Promise<{ success: boolean }>;
    };
    dailyRecord: {
      add: (record: any) => Promise<any>;
      getByDate: (date: string) => Promise<any>;
      getRange: (start: string, end: string) => Promise<any[]>;
      getStats: (days: number) => Promise<any>;
    };
    achievement: {
      getAll: () => Promise<any[]>;
      check: () => Promise<any[]>;
    };
    flashcard: {
      add: (card: any) => Promise<any>;
      getAll: (filters?: any) => Promise<any[]>;
      update: (card: any) => Promise<any>;
      delete: (id: number) => Promise<{ success: boolean }>;
    };
    examConfig: {
      get: () => Promise<any>;
      set: (config: any) => Promise<any>;
    };
    pomodoroRecord: {
      add: (record: any) => Promise<any>;
      getByDate: (date: string) => Promise<any[]>;
      getRange: (start: string, end: string) => Promise<any[]>;
    };
    reviewSession: {
      get: (date: string) => Promise<any>;
      set: (session: any) => Promise<any>;
      getRecent: (days: number) => Promise<any[]>;
    };
    recommendationEvent: {
      add: (event: any) => Promise<{ success: boolean }>;
      getRecent: (days: number) => Promise<any[]>;
    };
    data: {
      export: () => Promise<any>;
      import: () => Promise<any>;
    };
    update: {
      check: () => Promise<void>;
      download: () => Promise<void>;
      install: () => void;
      onChecking: (cb: () => void) => () => void;
      onAvailable: (cb: (info: any) => void) => () => void;
      onNotAvailable: (cb: (info: any) => void) => () => void;
      onProgress: (cb: (progress: any) => void) => () => void;
      onDownloaded: (cb: (info: any) => void) => () => void;
      onError: (cb: (message: string) => void) => () => void;
    };
  };
}
