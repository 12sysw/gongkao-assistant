import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200
                 shadow-sm hover:shadow-md"
      aria-label={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
      title={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      ) : (
        <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      )}
    </button>
  );
};
