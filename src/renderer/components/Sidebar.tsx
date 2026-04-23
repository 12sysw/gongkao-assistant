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
        'flex flex-col h-full shrink-0 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]',
        'bg-[#1c1917]',
        collapsed ? 'w-16' : 'w-[220px]'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 shrink-0">
        <div className="w-8 h-8 bg-[#c2410c] rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-[0_4px_12px_rgba(194,65,12,0.3)] shrink-0 font-display">
          公
        </div>
        {!collapsed && (
          <span className="ml-3 text-sm font-bold text-[#fafaf9] truncate tracking-tight font-display">
            公考小助手
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-xl text-[13px] font-medium transition-all duration-300',
                'group relative',
                collapsed ? 'justify-center px-2 py-3' : 'px-3 py-2.5',
                isActive
                  ? 'bg-white/[0.08] text-[#fafaf9]'
                  : 'text-[#a8a29e] hover:text-[#d6d3d1] hover:bg-white/[0.04]'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-[#c2410c] rounded-r-full" />
                )}
                <Icon className={cn('w-[18px] h-[18px] shrink-0 transition-transform duration-300 group-hover:scale-110', !collapsed && 'mr-3')} />
                {!collapsed && <span className="truncate">{label}</span>}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2 py-1.5 bg-[#1c1917] text-[#fafaf9] text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap z-50 shadow-xl border border-white/[0.06]">
                    {label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.04] shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full flex items-center justify-center py-2.5 rounded-xl',
            'text-[#57534e] hover:text-[#a8a29e] hover:bg-white/[0.04]',
            'transition-all duration-300'
          )}
          title={collapsed ? '展开' : '收起'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-2 text-[11px] font-medium tracking-wide uppercase">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Collapse</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
