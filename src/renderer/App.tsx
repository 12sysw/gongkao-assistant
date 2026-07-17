import React, { Component, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { SkeletonCard } from './components/ui/Skeleton';
import Sidebar from './components/Sidebar';
import UpdateNotification from './components/UpdateNotification';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const DashboardNew = lazy(() => import('./pages/DashboardNew'));
const WrongBook = lazy(() => import('./pages/WrongBook'));
const WrongBookNew = lazy(() => import('./pages/WrongBookNew'));
const StudyPlan = lazy(() => import('./pages/StudyPlan'));
const StudyPlanNew = lazy(() => import('./pages/StudyPlanNew'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const FlashcardsNew = lazy(() => import('./pages/FlashcardsNew'));
const Pomodoro = lazy(() => import('./pages/Pomodoro'));
const PomodoroNew = lazy(() => import('./pages/PomodoroNew'));
const DailyCheckin = lazy(() => import('./pages/DailyCheckin'));
const DailyCheckinNew = lazy(() => import('./pages/DailyCheckinNew'));
const Achievements = lazy(() => import('./pages/Achievements'));
const AchievementsNew = lazy(() => import('./pages/AchievementsNew'));
const Settings = lazy(() => import('./pages/Settings'));
const SettingsNew = lazy(() => import('./pages/SettingsNew'));
const ReviewHub = lazy(() => import('./pages/ReviewHub'));
const MindMap = lazy(() => import('./pages/MindMap'));
const Encourage = lazy(() => import('./pages/Encourage'));
const EncourageNew = lazy(() => import('./pages/EncourageNew'));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'));
const MockExam = lazy(() => import('./pages/MockExam'));
const MockExamNew = lazy(() => import('./pages/MockExamNew'));
const ExamPage = lazy(() => import('./pages/ExamPage'));
const ExamResult = lazy(() => import('./pages/ExamResult'));
const ChatRoom = lazy(() => import('./pages/ChatRoom'));
const RagChat = lazy(() => import('./pages/RagChat'));
const RagChatNew = lazy(() => import('./pages/RagChatNew'));
const QuestionBank = lazy(() => import('./pages/QuestionBank'));
const QuestionBankNew = lazy(() => import('./pages/QuestionBankNew'));
const RealPapers = lazy(() => import('./pages/RealPapers'));
const EssayReview = lazy(() => import('./pages/EssayReview'));
const KnowledgeGraph = lazy(() => import('./pages/KnowledgeGraph'));
const KnowledgeGraphNew = lazy(() => import('./pages/KnowledgeGraphNew'));
const BrutalReport = lazy(() => import('./pages/BrutalReport'));
const ComponentShowcase = lazy(() => import('./pages/ComponentShowcase'));

const RouteFallback: React.FC = () => (
  <div className="flex h-full items-center justify-center bg-surface-0 dark:bg-surface-950 p-6">
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  </div>
);

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center bg-surface-0 dark:bg-surface-950 p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-danger-50 dark:bg-danger-900/30 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-danger-500" />
            </div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-0">页面出了点问题</h2>
            <p className="text-sm font-medium text-surface-500 dark:text-surface-400">{this.state.error?.message || '发生了未知错误'}</p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition: Parameters<typeof motion.div>[0]['transition'] = {
  type: 'tween' as const,
  ease: 'easeInOut',
  duration: 0.15,
};

const AnimatedPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={pageTransition}
    className="h-full"
  >
    {children}
  </motion.div>
);

const App: React.FC = () => {
  const location = useLocation();
  return (
    <div className="flex h-screen overflow-hidden bg-surface-0 dark:bg-surface-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-surface-0 dark:bg-surface-950">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <Suspense fallback={<RouteFallback />}>
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<AnimatedPage><DashboardNew /></AnimatedPage>} />
                <Route path="/dashboard-old" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
                <Route path="/review" element={<AnimatedPage><ReviewHub /></AnimatedPage>} />
                <Route path="/mock-exam" element={<AnimatedPage><MockExamNew /></AnimatedPage>} />
                <Route path="/mock-exam-old" element={<AnimatedPage><MockExam /></AnimatedPage>} />
                <Route path="/exam" element={<AnimatedPage><ExamPage /></AnimatedPage>} />
                <Route path="/exam-result" element={<AnimatedPage><ExamResult /></AnimatedPage>} />
                <Route path="/wrong-book" element={<AnimatedPage><WrongBookNew /></AnimatedPage>} />
                <Route path="/wrong-book-old" element={<AnimatedPage><WrongBook /></AnimatedPage>} />
                <Route path="/mind-map" element={<AnimatedPage><MindMap /></AnimatedPage>} />
                <Route path="/study-plan" element={<AnimatedPage><StudyPlanNew /></AnimatedPage>} />
                <Route path="/study-plan-old" element={<AnimatedPage><StudyPlan /></AnimatedPage>} />
                <Route path="/encourage" element={<AnimatedPage><EncourageNew /></AnimatedPage>} />
                <Route path="/encourage-old" element={<AnimatedPage><Encourage /></AnimatedPage>} />
                <Route path="/flashcards" element={<AnimatedPage><FlashcardsNew /></AnimatedPage>} />
                <Route path="/flashcards-old" element={<AnimatedPage><Flashcards /></AnimatedPage>} />
                <Route path="/checkin" element={<AnimatedPage><DailyCheckinNew /></AnimatedPage>} />
                <Route path="/checkin-old" element={<AnimatedPage><DailyCheckin /></AnimatedPage>} />
                <Route path="/pomodoro" element={<AnimatedPage><PomodoroNew /></AnimatedPage>} />
                <Route path="/pomodoro-old" element={<AnimatedPage><Pomodoro /></AnimatedPage>} />
                <Route path="/knowledge" element={<AnimatedPage><KnowledgeBase /></AnimatedPage>} />
                <Route path="/achievements" element={<AnimatedPage><AchievementsNew /></AnimatedPage>} />
                <Route path="/achievements-old" element={<AnimatedPage><Achievements /></AnimatedPage>} />
                <Route path="/chat" element={<AnimatedPage><ChatRoom /></AnimatedPage>} />
                <Route path="/rag-chat" element={<AnimatedPage><RagChatNew /></AnimatedPage>} />
                <Route path="/rag-chat-old" element={<AnimatedPage><RagChat /></AnimatedPage>} />
                <Route path="/question-bank" element={<AnimatedPage><QuestionBankNew /></AnimatedPage>} />
                <Route path="/question-bank-old" element={<AnimatedPage><QuestionBank /></AnimatedPage>} />
                <Route path="/real-papers" element={<AnimatedPage><RealPapers /></AnimatedPage>} />
                <Route path="/essay-review" element={<AnimatedPage><EssayReview /></AnimatedPage>} />
                <Route path="/knowledge-graph" element={<AnimatedPage><KnowledgeGraphNew /></AnimatedPage>} />
                <Route path="/knowledge-graph-old" element={<AnimatedPage><KnowledgeGraph /></AnimatedPage>} />
                <Route path="/essay-review" element={<AnimatedPage><EssayReview /></AnimatedPage>} />
                <Route path="/knowledge-graph" element={<AnimatedPage><KnowledgeGraph /></AnimatedPage>} />
                <Route path="/brutal-report" element={<AnimatedPage><BrutalReport /></AnimatedPage>} />
                <Route path="/component-showcase" element={<AnimatedPage><ComponentShowcase /></AnimatedPage>} />
                <Route path="/settings" element={<AnimatedPage><Settings /></AnimatedPage>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AnimatePresence>
        </ErrorBoundary>
      </main>
      <UpdateNotification />
    </div>
  );
};

export default App;
