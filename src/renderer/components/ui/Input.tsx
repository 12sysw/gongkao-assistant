import React, { forwardRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { X, Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  floatingLabel?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      clearable = false,
      onClear,
      floatingLabel = false,
      className,
      type = 'text',
      value,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = value !== undefined && value !== '';
    const isFloatingActive = floatingLabel && (isFocused || hasValue);

    const handleClear = () => {
      if (onClear) {
        onClear();
      }
    };

    const inputType = type === 'password' && showPassword ? 'text' : type;

    return (
      <div className="w-full">
        {label && !floatingLabel && (
          <label className="block text-sm font-semibold text-surface-900 dark:text-dark-50 mb-2 tracking-tight">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 dark:text-dark-400 z-10">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            type={inputType}
            value={value}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              'w-full px-3.5 py-2.5 text-sm text-surface-900 dark:text-dark-50 bg-white dark:bg-dark-900',
              'border-2 border-surface-200 dark:border-white/10 rounded-xl',
              'placeholder:text-surface-400 dark:placeholder:text-dark-500',
              'transition-all duration-200',
              'focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10',
              'disabled:bg-surface-50 dark:disabled:bg-dark-850 disabled:text-surface-400 dark:disabled:text-dark-600 disabled:cursor-not-allowed',
              icon && 'pl-11',
              (clearable || type === 'password') && 'pr-10',
              error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/10',
              floatingLabel && 'pt-6 pb-2',
              className
            )}
            {...props}
          />

          {floatingLabel && label && (
            <label
              className={cn(
                'absolute left-3.5 transition-all duration-200 pointer-events-none',
                'text-surface-400 dark:text-dark-500',
                isFloatingActive
                  ? 'top-1.5 text-xs font-medium'
                  : 'top-1/2 -translate-y-1/2 text-sm',
                isFocused && 'text-brand-500 dark:text-brand-400',
                error && 'text-danger-500',
                icon && (isFloatingActive ? 'left-3.5' : 'left-11')
              )}
            >
              {label}
            </label>
          )}

          {clearable && hasValue && !props.disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:text-dark-500 dark:hover:text-dark-300 transition-colors"
              tabIndex={-1}
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:text-dark-500 dark:hover:text-dark-300 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-danger-500 font-medium">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-surface-500 dark:text-dark-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
