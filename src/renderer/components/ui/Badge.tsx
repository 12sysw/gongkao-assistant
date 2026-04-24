import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  children: React.ReactNode;
}

const variantMap = {
  success: 'bg-success-light text-success-dark border border-success-light',
  warning: 'bg-warning-light text-warning-dark border border-warning-light',
  error: 'bg-danger-light text-danger-dark border border-danger-light',
  info: 'bg-info-light text-info-dark border border-info-border',
  default: 'bg-surface-50 text-surface-500 border border-surface-200',
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
