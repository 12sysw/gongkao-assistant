import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div
    className={cn(
      'animate-pulse rounded-lg bg-surface-200 dark:bg-surface-700',
      className
    )}
  />
);

export const SkeletonLine: React.FC<{ width?: string; height?: string; className?: string }> = ({
  width = 'w-full',
  height = 'h-3.5',
  className,
}) => (
  <Skeleton className={cn(className, width, height)} />
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-3 p-4 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800', className)}>
    <Skeleton className="h-4 w-3/5" />
    <Skeleton className="h-3 w-4/5" />
    <Skeleton className="h-3 w-2/5" />
  </div>
);

export const SkeletonStat: React.FC = () => (
  <div className="flex items-center gap-3 p-4 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
    <Skeleton className="w-10 h-10 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-5 w-16" />
    </div>
  </div>
);