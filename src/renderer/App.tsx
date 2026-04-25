import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import WrongBook from './pages/WrongBook';
import MindMap from './pages/MindMap';
import StudyPlan from './pages/StudyPlan';
import Encourage from './pages/Encourage';
import Flashcards from './pages/Flashcards';
import DailyCheckin from './pages/DailyCheckin';
import Pomodoro from './pages/Pomodoro';
import KnowledgeBase from './pages/KnowledgeBase';
import MockExam from './pages/MockExam';
import Settings from './pages/Settings';
import Achievements from './pages/Achievements';

const App: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-surface-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
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
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
