import React from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

const variantStyles = {
  default: 'bg-surface-100 dark:bg-dark-800 text-surface-700 dark:text-dark-200 border border-surface-200 dark:border-white/10',
  primary: 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-900',
  success: 'bg-success-100 dark:bg-success-950 text-success-700 dark:text-success-400 border border-success-200 dark:border-success-900',
  warning: 'bg-warning-100 dark:bg-warning-950 text-warning-700 dark:text-warning-400 border border-warning-200 dark:border-warning-900',
  danger: 'bg-danger-100 dark:bg-danger-950 text-danger-700 dark:text-danger-400 border border-danger-200 dark:border-danger-900',
  info: 'bg-info-100 dark:bg-info-950 text-info-700 dark:text-info-400 border border-info-200 dark:border-info-900',
  outline: 'bg-transparent border border-surface-300 dark:border-white/20 text-surface-700 dark:text-dark-200',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

const dotColors = {
  default: 'bg-surface-500',
  primary: 'bg-brand-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
  outline: 'bg-surface-500',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  dot = false,
  removable = false,
  onRemove,
  className,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold rounded-lg',
        'transition-colors duration-200',
        variantStyles[variant],
        sizeStyles[size],
        removable && 'pr-1',
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
      )}
      <span>{children}</span>
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
          type="button"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};

interface TagProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  selected?: boolean;
  onRemove?: () => void;
}

export const Tag: React.FC<TagProps> = ({
  variant = 'default',
  selected = false,
  onRemove,
  className,
  children,
  ...props
}) => {
  const tagVariants = {
    default: selected
      ? 'bg-surface-200 dark:bg-dark-700 text-surface-900 dark:text-dark-50'
      : 'bg-surface-100 dark:bg-dark-800 text-surface-700 dark:text-dark-200 hover:bg-surface-150 dark:hover:bg-dark-750',
    primary: selected
      ? 'bg-brand-500 text-white'
      : 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-900',
    success: selected
      ? 'bg-success-500 text-white'
      : 'bg-success-100 dark:bg-success-950 text-success-700 dark:text-success-400 hover:bg-success-200 dark:hover:bg-success-900',
    warning: selected
      ? 'bg-warning-500 text-white'
      : 'bg-warning-100 dark:bg-warning-950 text-warning-700 dark:text-warning-400 hover:bg-warning-200 dark:hover:bg-warning-900',
    danger: selected
      ? 'bg-danger-500 text-white'
      : 'bg-danger-100 dark:bg-danger-950 text-danger-700 dark:text-danger-400 hover:bg-danger-200 dark:hover:bg-danger-900',
    info: selected
      ? 'bg-info-500 text-white'
      : 'bg-info-100 dark:bg-info-950 text-info-700 dark:text-info-400 hover:bg-info-200 dark:hover:bg-info-900',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
        'transition-all duration-200 cursor-pointer',
        tagVariants[variant],
        selected && 'shadow-sm',
        className
      )}
      {...props}
    >
      <span>{children}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
          type="button"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
