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
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full px-3 py-2.5 text-sm text-slate-900 bg-white',
              'border border-slate-200 rounded-xl',
              'placeholder:text-slate-400',
              'transition-all duration-200 ease-out',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400',
              'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
              icon && 'pl-10',
              error && 'border-error-300 focus:border-error-400 focus:ring-error-500/20',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-error-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
