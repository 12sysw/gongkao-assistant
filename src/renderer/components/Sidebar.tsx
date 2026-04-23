import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookX,
  Brain,
  CalendarCheck,
  Layers,
  Calendar,
  Timer,
  BookOpen,
  ClipboardList,
  Settings,
} from 'lucide-react';

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/mock-exam', label: '套题测评', icon: ClipboardList },
  { path: '/wrong-book', label: '错题本', icon: BookX },
  { path: '/flashcards', label: '记忆卡片', icon: Layers },
  { path: '/mind-map', label: '思维导图', icon: Brain },
  { path: '/study-plan', label: '学习计划', icon: CalendarCheck },
  { path: '/checkin', label: '打卡倒计时', icon: Calendar },
  { path: '/pomodoro', label: '番茄钟', icon: Timer },
  { path: '/knowledge', label: '知识点速查', icon: BookOpen },
  { path: '/settings', label: '设置', icon: Settings },
];

const Sidebar: React.FC = () => {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      {/* Logo 区域 */}
      <div className="h-14 flex items-center px-4 border-b border-gray-100">
        <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
          公
        </div>
        <span className="ml-2.5 text-base font-semibold text-gray-800">公考小助手</span>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-4 h-4 mr-2.5" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* 底部 */}
      <div className="p-3 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 text-center">v1.1.0 · 坚持就是胜利</p>
      </div>
    </aside>
  );
};

export default Sidebar;
