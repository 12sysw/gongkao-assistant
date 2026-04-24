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
        'flex flex-col h-full shrink-0 transition-all duration-300',
        'bg-surface-900 shadow-sidebar',
        collapsed ? 'w-16' : 'w-[220px]'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 shrink-0 border-b border-white/[0.06]">
        <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm font-display shadow-lg shrink-0">
          公
        </div>
        {!collapsed && (
          <div className="ml-3">
            <span className="text-sm font-bold text-white block tracking-wide font-display">
              公考小助手
            </span>
            <span className="text-[10px] text-surface-400 tracking-widest">
              CIVIL SERVICE
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-lg text-[13px] font-medium transition-all duration-200',
                'group relative',
                collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                isActive
                  ? 'bg-brand-500/[0.15] text-brand-300 shadow-none'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-white/[0.04]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('w-[18px] h-[18px] shrink-0', !collapsed && 'mr-3', isActive && 'text-brand-400')} />
                {!collapsed && <span className="truncate">{label}</span>}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-surface-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 border border-white/[0.06]">
                    {label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.06] shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full flex items-center justify-center py-2 rounded-lg',
            'text-surface-500 hover:text-surface-300 hover:bg-white/[0.04]',
            'transition-colors duration-200'
          )}
          title={collapsed ? '展开' : '收起'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-surface-500">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>收起</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
