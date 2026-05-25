import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'elevated';
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hover = true,
  padding = 'md',
  variant = 'default',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700',
    elevated: 'bg-white dark:bg-surface-800 shadow-elevated border border-transparent',
  };

  return (
    <div
      className={cn(
        variantStyles[variant],
        'rounded-xl',
        hover && 'hover:shadow-card-hover hover:border-surface-200 dark:hover:border-surface-600 transition-all duration-200',
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn('flex items-center justify-between mb-4 border-b border-surface-100 dark:border-surface-700 pb-3', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className,
  ...props
}) => (
  <h3 className={cn('text-base font-semibold text-surface-900 dark:text-surface-0 flex items-center gap-2 font-display', className)} {...props}>
    {children}
  </h3>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn('', className)} {...props}>
    {children}
  </div>
);
