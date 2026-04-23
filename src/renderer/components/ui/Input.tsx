import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-[#1c1917] mb-2 tracking-tight">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full px-3.5 py-2.5 text-sm text-[#1c1917] bg-white',
              'border-2 border-[#e7e5e4] rounded-xl',
              'placeholder:text-[#a8a29e]',
              'transition-all duration-200',
              'focus:outline-none focus:border-[#c2410c] focus:ring-2 focus:ring-[#c2410c]/10',
              'disabled:bg-[#f5f3f0] disabled:text-[#a8a29e] disabled:cursor-not-allowed',
              icon && 'pl-11',
              error && 'border-[#dc2626] focus:border-[#dc2626] focus:ring-[#dc2626]/10',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-[#dc2626] font-medium">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-[#a8a29e]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
