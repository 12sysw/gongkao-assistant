import { create } from 'zustand';

// 嘲讽和夸奖语录
const taunts = [
  '哎呀呀，这位同学的正确率有点感人啊～建议回去多刷题哦！',
  '考官微微一笑：这正确率...你确定不是来搞笑的吗？🤭',
  '温馨提示：考试时间不够用，但你的正确率还有很大提升空间！',
  '这正确率...出题老师都替你捏把汗！继续努力吧！',
  '据说多刷题能提高正确率，不信你试试？😉',
];

const praises = [
  '厉害了我的哥！这正确率，考公上岸指日可待！',
  '优秀！看来平时没少刷题，继续保持！',
  '棒棒哒！这个正确率让考官都竖起大拇指！👍',
  '稳！这水平，国考省考都不在话下！',
];

interface Question {
  id: number;
  type: string;
  content: string;
  options: string[];
  answer: string;
  explanation?: string;
}

interface Answer {
  questionId: number;
  type: string;
  myAnswer: string;
  correct: boolean;
}

interface ExamReport {
  totalQuestions: number;
  totalAnswered: number;
  correctCount: number;
  unansweredCount: number;
  accuracy: string;
  timeUsed: number;
  typeStats: Record<string, { correct: number; total: number; unanswered: number }>;
  weaknesses: any[];
  suggestions: string[];
  aiAnalysis?: string;
}

interface MockExamState {
  // 流程状态
  step: 'select' | 'exam' | 'result';
  setStep: (step: 'select' | 'exam' | 'result') => void;

  // 题目
  questions: Question[];
  setQuestions: (questions: Question[]) => void;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;

  // 答题
  answers: Map<number, Answer>;
  setAnswer: (questionId: number, answer: Answer) => void;
  clearAnswers: () => void;

  // 正式考试计时
  timeLeft: number;
  setTimeLeft: (time: number) => void;
  decrementTime: () => void;

  // 报告
  report: ExamReport | null;
  setReport: (report: ExamReport | null) => void;

  // AI分析
  aiAnalyzing: boolean;
  setAiAnalyzing: (analyzing: boolean) => void;
  aiAnalysisText: string;
  setAiAnalysisText: (text: string) => void;

  // 挑战模式
  challengeMode: boolean;
  setChallengeMode: (mode: boolean) => void;
  challengeCountdown: number | null;
  setChallengeCountdown: (countdown: number | null) => void;
  challengeTimer: number;
  setChallengeTimer: (timer: number) => void;
  incrementChallengeTimer: () => void;
  challengeResult: 'win' | 'lose' | null;
  setChallengeResult: (result: 'win' | 'lose' | null) => void;
  challengeMessage: string;
  setChallengeMessage: (message: string) => void;

  // 确认弹窗
  showConfirm: boolean;
  setShowConfirm: (show: boolean) => void;

  // 工具方法
  getRandomTaunt: () => string;
  getRandomPraise: () => string;
}

export const useMockExamStore = create<MockExamState>((set, get) => ({
  step: 'select',
  setStep: (step) => set({ step }),

  questions: [],
  setQuestions: (questions) => set({ questions }),
  currentIndex: 0,
  setCurrentIndex: (index) => set({ currentIndex: index }),

  answers: new Map(),
  setAnswer: (questionId, answer) => {
    const newAnswers = new Map(get().answers);
    newAnswers.set(questionId, answer);
    set({ answers: newAnswers });
  },
  clearAnswers: () => set({ answers: new Map() }),

  timeLeft: 120 * 60,
  setTimeLeft: (time) => set({ timeLeft: time }),
  decrementTime: () => set({ timeLeft: get().timeLeft - 1 }),

  report: null,
  setReport: (report) => set({ report }),

  aiAnalyzing: false,
  setAiAnalyzing: (analyzing) => set({ aiAnalyzing: analyzing }),
  aiAnalysisText: '',
  setAiAnalysisText: (text) => set({ aiAnalysisText: text }),

  challengeMode: false,
  setChallengeMode: (mode) => set({ challengeMode: mode }),
  challengeCountdown: null,
  setChallengeCountdown: (countdown) => set({ challengeCountdown: countdown }),
  challengeTimer: 0,
  setChallengeTimer: (timer) => set({ challengeTimer: timer }),
  incrementChallengeTimer: () => set({ challengeTimer: get().challengeTimer + 1 }),
  challengeResult: null,
  setChallengeResult: (result) => set({ challengeResult: result }),
  challengeMessage: '',
  setChallengeMessage: (message) => set({ challengeMessage: message }),

  showConfirm: false,
  setShowConfirm: (show) => set({ showConfirm: show }),

  getRandomTaunt: () => taunts[Math.floor(Math.random() * taunts.length)],
  getRandomPraise: () => praises[Math.floor(Math.random() * praises.length)],
}));