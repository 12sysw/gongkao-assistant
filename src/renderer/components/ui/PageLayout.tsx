import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  gradient?: boolean;
}

const maxWidthMap = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  xl: 'max-w-[1600px]',
  '2xl': 'max-w-[1800px]',
  full: 'max-w-full',
};

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className,
  maxWidth = 'xl',
  gradient = true,
}) => {
  return (
    <div
      className={cn(
        'min-h-screen',
        gradient
          ? 'bg-gradient-to-br from-surface-0 via-brand-50/20 to-surface-50 dark:from-dark-950 dark:via-dark-925 dark:to-dark-900'
          : 'bg-surface-0 dark:bg-dark-950',
        className
      )}
    >
      <div className={cn('mx-auto p-8', maxWidthMap[maxWidth])}>
        {children}
      </div>
    </div>
  );
};

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  badge,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            {icon && (
              <div className="p-3 rounded-xl bg-brand-100 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400">
                {icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl md:text-5xl font-bold text-surface-900 dark:text-dark-50 tracking-tight">
                  {title}
                </h1>
                {badge}
              </div>
              {subtitle && (
                <p className="text-lg text-surface-600 dark:text-dark-300 mt-2">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface PageSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export const PageSection: React.FC<PageSectionProps> = ({
  title,
  description,
  children,
  className,
  headerAction,
}) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('space-y-6', className)}
    >
      {(title || description || headerAction) && (
        <div className="flex items-start justify-between">
          <div>
            {title && (
              <h2 className="text-2xl font-bold text-surface-900 dark:text-dark-50 mb-1">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-surface-600 dark:text-dark-300">
                {description}
              </p>
            )}
          </div>
          {headerAction}
        </div>
      )}
      {children}
    </motion.section>
  );
};

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-dark-850 flex items-center justify-center mb-4 text-surface-400 dark:text-dark-500">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-surface-900 dark:text-dark-50 mb-2">
        {title}
      </h3>
      <p className="text-surface-600 dark:text-dark-300 text-center max-w-md mb-6">
        {description}
      </p>
      {action}
    </div>
  );
};

interface StatGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export const StatGrid: React.FC<StatGridProps> = ({ children, columns = 4 }) => {
  const colsMap = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', colsMap[columns])}>
      {children}
    </div>
  );
};
