import React, { Component, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import Sidebar from './components/Sidebar';
import UpdateNotification from './components/UpdateNotification';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const ReviewHub = lazy(() => import('./pages/ReviewHub'));
const WrongBook = lazy(() => import('./pages/WrongBook'));
const MindMap = lazy(() => import('./pages/MindMap'));
const StudyPlan = lazy(() => import('./pages/StudyPlan'));
const Encourage = lazy(() => import('./pages/Encourage'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const DailyCheckin = lazy(() => import('./pages/DailyCheckin'));
const Pomodoro = lazy(() => import('./pages/Pomodoro'));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'));
const MockExam = lazy(() => import('./pages/MockExam'));
const Settings = lazy(() => import('./pages/Settings'));
const Achievements = lazy(() => import('./pages/Achievements'));
const ChatRoom = lazy(() => import('./pages/ChatRoom'));
const RagChat = lazy(() => import('./pages/RagChat'));
const QuestionBank = lazy(() => import('./pages/QuestionBank'));
const EssayReview = lazy(() => import('./pages/EssayReview'));
const KnowledgeGraph = lazy(() => import('./pages/KnowledgeGraph'));

const RouteFallback: React.FC = () => (
  <div className="flex h-full items-center justify-center bg-surface-0">
    <div className="flex items-center gap-3 rounded-2xl border border-surface-200 bg-white px-5 py-4 text-sm font-medium text-surface-500 shadow-soft">
      <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
      正在加载页面...
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
        <div className="flex h-full items-center justify-center bg-surface-0 p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-danger-50 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-danger-500" />
            </div>
            <h2 className="text-lg font-bold text-surface-900">页面出了点问题</h2>
            <p className="text-sm text-surface-500">{this.state.error?.message || '发生了未知错误'}</p>
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

const App: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-surface-0">
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/review" element={<ReviewHub />} />
              <Route path="/mock-exam" element={<MockExam />} />
              <Route path="/wrong-book" element={<WrongBook />} />
              <Route path="/mind-map" element={<MindMap />} />
              <Route path="/study-plan" element={<StudyPlan />} />
              <Route path="/encourage" element={<Encourage />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/checkin" element={<DailyCheckin />} />
              <Route path="/pomodoro" element={<Pomodoro />} />
              <Route path="/knowledge" element={<KnowledgeBase />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/chat" element={<ChatRoom />} />
              <Route path="/rag-chat" element={<RagChat />} />
              <Route path="/question-bank" element={<QuestionBank />} />
              <Route path="/essay-review" element={<EssayReview />} />
              <Route path="/knowledge-graph" element={<KnowledgeGraph />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <UpdateNotification />
    </div>
  );
};

export default App;
