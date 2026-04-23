import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  children: React.ReactNode;
}

const variantMap = {
  success: 'bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]',
  warning: 'bg-[#fef9c3] text-[#854d0e] border border-[#fde047]',
  error: 'bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]',
  info: 'bg-[#dbeafe] text-[#1e40af] border border-[#bfdbfe]',
  default: 'bg-[#f5f3f0] text-[#57534e] border border-[#e7e5e4]',
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
