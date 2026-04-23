import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variantMap = {
  primary:
    'bg-[#c2410c] text-white hover:bg-[#9a3412] active:scale-[0.98] shadow-[0_2px_8px_rgba(194,65,12,0.3)] hover:shadow-[0_4px_16px_rgba(194,65,12,0.4)] transition-all duration-200',
  secondary:
    'bg-[#d6d3d1] text-[#1c1917] hover:bg-[#a8a29e] active:scale-[0.98] transition-all duration-200',
  ghost:
    'bg-transparent text-[#57534e] hover:bg-white/50 hover:text-[#1c1917] active:scale-[0.98] transition-all duration-200',
  danger:
    'bg-[#dc2626] text-white hover:bg-[#b91c1c] active:scale-[0.98] shadow-[0_2px_8px_rgba(220,38,38,0.3)] hover:shadow-[0_4px_16px_rgba(220,38,38,0.4)] transition-all duration-200',
  outline:
    'bg-transparent border-2 border-[#d6d3d1] text-[#57534e] hover:border-[#a8a29e] hover:text-[#1c1917] active:scale-[0.98] transition-all duration-200',
};

const sizeMap = {
  sm: 'px-3 py-1.5 text-xs rounded-lg font-medium',
  md: 'px-4 py-2 text-sm rounded-xl font-medium',
  lg: 'px-5 py-2.5 text-base rounded-2xl font-medium',
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
        'focus:outline-none focus:ring-2 focus:ring-[#c2410c]/30 focus:ring-offset-2 focus:ring-offset-[#f5f3f0]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0',
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
