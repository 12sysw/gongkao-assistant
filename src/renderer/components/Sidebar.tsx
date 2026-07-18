import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Focus,
  BookX,
  Brain,
  CalendarCheck,
  Layers,
  Calendar,
  Timer,
  BookOpen,
  ClipboardList,
  Trophy,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Library,
  Files,
  FileUp,
  PenTool,
  Grid3X3,
  Network,
  GitBranch,
  LineChart,
  Moon,
  Sun,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: '学习中心',
    items: [
      { path: '/', label: '仪表盘', icon: LayoutDashboard },
      { path: '/review', label: '统一复习', icon: Focus },
      { path: '/mock-exam', label: '套题测评', icon: ClipboardList },
      { path: '/brutal-report', label: '残酷真相', icon: AlertCircle },
    ],
  },
  {
    title: '知识管理',
    items: [
      { path: '/wrong-book', label: '错题本', icon: BookX },
      { path: '/flashcards', label: '记忆卡片', icon: Layers },
      { path: '/mind-map', label: '思维导图', icon: Brain },
      { path: '/knowledge-graph', label: '知识图谱', icon: Network },
      { path: '/skill-tree', label: '能力追踪', icon: GitBranch },
      { path: '/study-tracker', label: '备考追踪', icon: LineChart },
      { path: '/knowledge', label: '知识速查', icon: BookOpen },
    ],
  },
  {
    title: '题库工具',
    items: [
      { path: '/question-bank', label: '题库管理', icon: Library },
      { path: '/real-papers', label: '真题入口', icon: Files },
      { path: '/paper-import', label: 'PDF 真题导入', icon: FileUp },
      { path: '/essay-review', label: '申论批改', icon: PenTool },
      { path: '/essay-practice', label: '申论答题纸', icon: Grid3X3 },
      { path: '/rag-chat', label: '智能问答', icon: Sparkles },
    ],
  },
  {
    title: '学习规划',
    items: [
      { path: '/study-plan', label: '学习计划', icon: CalendarCheck },
      { path: '/checkin', label: '打卡倒计时', icon: Calendar },
      { path: '/pomodoro', label: '番茄钟', icon: Timer },
      { path: '/achievements', label: '成就', icon: Trophy },
    ],
  },
  {
    title: '其他',
    items: [
      { path: '/chat', label: '聊天室', icon: MessageSquare },
      { path: '/settings', label: '设置', icon: Settings },
    ],
  },
];

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className={cn(
        'flex flex-col h-full shrink-0 transition-all duration-300 ease-smooth',
        'bg-surface-900 dark:bg-dark-950 shadow-sidebar',
        'border-r border-white/[0.06]',
        collapsed ? 'w-16' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 shrink-0 border-b border-white/[0.06]">
        <div className="w-9 h-9 bg-brand-gradient rounded-lg flex items-center justify-center text-white font-bold text-sm font-display shadow-lg shrink-0">
          公
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <span className="text-sm font-bold text-white block tracking-wide font-display">
              公考小助手
            </span>
            <span className="text-[10px] text-surface-400 tracking-widest">
              CIVIL SERVICE
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {navGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <div className="px-3 mb-2">
                <h4 className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">
                  {group.title}
                </h4>
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ path, label, icon: Icon }) => (
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
                        ? 'bg-brand-500/[0.15] text-brand-300 shadow-sm'
                        : 'text-surface-400 hover:text-surface-100 hover:bg-white/[0.06]'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn(
                          'w-[18px] h-[18px] shrink-0 transition-colors',
                          !collapsed && 'mr-3',
                          isActive && 'text-brand-400'
                        )}
                      />
                      {!collapsed && <span className="truncate">{label}</span>}
                      {collapsed && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-surface-800 dark:bg-dark-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 border border-white/[0.12]">
                          {label}
                          <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-4 border-transparent border-r-surface-800 dark:border-r-dark-900" />
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Controls */}
      <div className="p-3 border-t border-white/[0.06] shrink-0 space-y-1.5">
        <button
          onClick={toggleTheme}
          className={cn(
            'w-full flex items-center rounded-lg',
            'text-surface-400 hover:text-surface-100 hover:bg-white/[0.06]',
            'transition-all duration-200 group relative',
            collapsed ? 'justify-center py-2.5' : 'px-3 py-2.5 gap-3 text-[13px] font-medium'
          )}
          title={theme === 'light' ? '深色模式' : '浅色模式'}
        >
          {theme === 'light' ? (
            <Moon className="w-[18px] h-[18px]" />
          ) : (
            <Sun className="w-[18px] h-[18px]" />
          )}
          {!collapsed && <span>{theme === 'light' ? '深色模式' : '浅色模式'}</span>}
          {collapsed && (
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-surface-800 dark:bg-dark-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 border border-white/[0.12]">
              {theme === 'light' ? '深色模式' : '浅色模式'}
              <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-4 border-transparent border-r-surface-800 dark:border-r-dark-900" />
            </div>
          )}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full flex items-center rounded-lg',
            'text-surface-400 hover:text-surface-100 hover:bg-white/[0.06]',
            'transition-all duration-200',
            collapsed ? 'justify-center py-2.5' : 'justify-between px-3 py-2.5'
          )}
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {collapsed ? (
            <ChevronRight className="w-[18px] h-[18px]" />
          ) : (
            <>
              <span className="text-[13px] font-medium">收起侧边栏</span>
              <ChevronLeft className="w-[18px] h-[18px]" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
