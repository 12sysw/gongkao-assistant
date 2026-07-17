import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

type NativeButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragEnd' | 'onDragEnter' | 'onDragExit' | 'onDragLeave' | 'onDragOver' | 'onDragStart'>;

interface ButtonProps extends NativeButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  ripple?: boolean;
  fullWidth?: boolean;
}

const variantMap = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm hover:shadow-md',
  secondary:
    'bg-white dark:bg-dark-850 border border-surface-200 dark:border-white/10 text-surface-700 dark:text-dark-100 hover:bg-surface-50 dark:hover:bg-dark-800 hover:border-surface-300 dark:hover:border-white/20',
  ghost:
    'bg-transparent text-surface-600 dark:text-dark-300 hover:bg-surface-100 dark:hover:bg-white/10',
  danger:
    'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700 shadow-sm hover:shadow-md',
  success:
    'bg-success-500 text-white hover:bg-success-600 active:bg-success-700 shadow-sm hover:shadow-md',
  outline:
    'bg-transparent border-2 border-surface-200 dark:border-white/12 text-surface-700 dark:text-dark-100 hover:bg-surface-50 dark:hover:bg-white/5 hover:border-surface-300 dark:hover:border-white/20',
};

const sizeMap = {
  xs: 'px-2.5 py-1 text-xs rounded-lg font-medium h-7',
  sm: 'px-3 py-1.5 text-xs rounded-lg font-medium h-8',
  md: 'px-4 py-2 text-sm rounded-xl font-medium h-10',
  lg: 'px-5 py-2.5 text-base rounded-xl font-semibold h-11',
  xl: 'px-6 py-3 text-base rounded-xl font-semibold h-12',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  disabled,
  loading,
  icon,
  iconRight,
  iconPosition = 'left',
  ripple = true,
  fullWidth = false,
  onClick,
  type = 'button',
  ...props
}) => {
  const [rippleArray, setRippleArray] = useState<{ x: number; y: number; size: number; id: number }[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ripple && !disabled && !loading) {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      const id = Date.now();

      setRippleArray((prev) => [...prev, { x, y, size, id }]);

      setTimeout(() => {
        setRippleArray((prev) => prev.filter((r) => r.id !== id));
      }, 600);
    }

    if (onClick && !disabled && !loading) {
      onClick(e);
    }
  };

  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'tween', duration: 0.1 }}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-950',
        'overflow-hidden',
        variantMap[variant],
        sizeMap[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={isDisabled}
      onClick={handleClick}
      type={type}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {ripple && rippleArray.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 animate-ping pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      ))}

      {loading && (
        <Loader2 className="w-4 h-4 animate-spin" />
      )}

      {!loading && icon && iconPosition === 'left' && (
        <span className="flex-shrink-0">{icon}</span>
      )}

      <span className="flex-1">{children}</span>

      {!loading && (iconRight || (icon && iconPosition === 'right')) && (
        <span className="flex-shrink-0">{iconRight ?? icon}</span>
      )}
    </motion.button>
  );
};
