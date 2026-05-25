import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  children: React.ReactNode;
}

const variantMap = {
  success: 'bg-success-light dark:bg-success/20 text-success-dark dark:text-success border border-success-light dark:border-success/30',
  warning: 'bg-warning-light dark:bg-warning/20 text-warning-dark dark:text-warning border border-warning-light dark:border-warning/30',
  error: 'bg-danger-light dark:bg-danger/20 text-danger-dark dark:text-danger border border-danger-light dark:border-danger/30',
  info: 'bg-info-light dark:bg-info/20 text-info-dark dark:text-info border border-info-border dark:border-info/30',
  default: 'bg-surface-50 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border border-surface-200 dark:border-surface-700',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  className,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-colors duration-200',
        'border',
        variantMap[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
