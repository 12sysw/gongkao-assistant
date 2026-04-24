import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variantMap = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-600 shadow-card hover:shadow-card-hover active:scale-[0.98] transition-all duration-200',
  secondary:
    'bg-white border border-surface-200 text-surface-700 hover:bg-surface-50 hover:border-surface-300 transition-all duration-200',
  ghost:
    'bg-transparent text-surface-600 hover:bg-surface-100 transition-colors duration-200',
  danger:
    'bg-transparent text-danger hover:bg-danger-light transition-colors duration-200',
  outline:
    'bg-transparent border border-surface-200 text-surface-700 hover:bg-surface-50 hover:border-surface-300 transition-all duration-200',
};

const sizeMap = {
  sm: 'px-3 py-1.5 text-xs rounded-lg font-medium',
  md: 'px-4 py-2 text-sm rounded-xl font-medium',
  lg: 'px-5 py-2.5 text-base rounded-xl font-medium',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  disabled,
  ...props
}) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantMap[variant],
        sizeMap[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
