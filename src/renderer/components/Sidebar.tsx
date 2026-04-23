import React, { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils';

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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col h-full shrink-0 transition-all duration-300 ease-out',
        'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo 区域 */}
      <div className="h-14 flex items-center px-3 border-b border-white/5 shrink-0">
        <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-glow-primary shrink-0">
          公
        </div>
        {!collapsed && (
          <span className="ml-2.5 text-sm font-semibold text-white/90 truncate animate-fade-in">
            公考小助手
          </span>
        )}
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-xl text-sm font-medium transition-all duration-200',
                'group relative',
                collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
                isActive
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-400 rounded-r-full" />
                )}
                <Icon className={cn('w-[18px] h-[18px] shrink-0', !collapsed && 'mr-2.5')} />
                {!collapsed && <span className="truncate">{label}</span>}
                {/* Tooltip for collapsed mode */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg border border-white/10">
                    {label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 底部 */}
      <div className="p-2 border-t border-white/5 shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full flex items-center justify-center py-2 rounded-xl',
            'text-slate-500 hover:text-slate-300 hover:bg-white/5',
            'transition-all duration-200'
          )}
          title={collapsed ? '展开' : '收起'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-1.5 text-xs">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>收起</span>
            </div>
          )}
        </button>
        {!collapsed && (
          <p className="text-[10px] text-slate-600 text-center mt-2 animate-fade-in">
            v1.1.0 · 坚持就是胜利
          </p>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
