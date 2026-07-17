import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

type NativeCardProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragEnd' | 'onDragEnter' | 'onDragExit' | 'onDragLeave' | 'onDragOver' | 'onDragStart'>;

interface CardProps extends NativeCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled' | 'glass';
  hover?: 'none' | 'lift' | 'glow' | 'border' | false;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
  xl: 'p-8',
};

const variantStyles = {
  default: 'bg-white dark:bg-dark-900 border border-surface-200 dark:border-white/10',
  elevated: 'bg-white dark:bg-dark-900 shadow-card border border-transparent',
  outlined: 'bg-transparent border-2 border-surface-200 dark:border-white/12',
  filled: 'bg-surface-50 dark:bg-dark-850 border border-transparent',
  glass: 'glass border border-white/20 dark:border-white/10',
};

const hoverStyles = {
  none: '',
  lift: 'hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300',
  glow: 'hover:shadow-glow hover:border-brand-500/50 transition-all duration-300',
  border: 'hover:border-brand-500/50 dark:hover:border-brand-400/50 transition-all duration-200',
};

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  hover = 'lift',
  padding = 'md',
  animated = false,
  ...props
}) => {
  const classes = cn(
    'rounded-xl',
    variantStyles[variant],
    hover && hoverStyles[hover],
    paddingMap[padding],
    className
  );

  if (animated) {
    return (
      <motion.div
        className={classes}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        {...(props as React.ComponentProps<typeof motion.div>)}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={classes} {...props}>{children}</div>;
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div
    className={cn(
      'flex items-center justify-between mb-4 pb-3',
      'border-b border-surface-100 dark:border-white/8',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className,
  ...props
}) => (
  <h3
    className={cn(
      'text-base font-semibold text-surface-900 dark:text-dark-50',
      'flex items-center gap-2 font-display tracking-tight',
      className
    )}
    {...props}
  >
    {children}
  </h3>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn('text-surface-700 dark:text-dark-200', className)} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div
    className={cn(
      'flex items-center justify-between mt-4 pt-3',
      'border-t border-surface-100 dark:border-white/8',
      className
    )}
    {...props}
  >
    {children}
  </div>
);
