import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
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

const RouteFallback: React.FC = () => (
  <div className="flex h-full items-center justify-center bg-surface-0">
    <div className="flex items-center gap-3 rounded-2xl border border-surface-200 bg-white px-5 py-4 text-sm font-medium text-surface-500 shadow-soft">
      <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
      正在加载页面...
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-surface-0">
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
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <UpdateNotification />
    </div>
  );
};

export default App;
