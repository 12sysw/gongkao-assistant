import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-surface-950/60 dark:bg-surface-950/80 backdrop-blur-sm transition-opacity duration-300" />

      {/* Modal */}
      <div
        className={cn(
          'relative surface dark:bg-surface-800 shadow-card-hover w-full',
          'animate-slide-up',
          sizeMap[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || description) && (
          <div className="px-6 pt-6 pb-3">
            <div className="flex items-start justify-between">
              <div>
                {title && (
                  <h3 className="text-xl font-bold text-surface-900 dark:text-surface-0 font-display tracking-tight">{title}</h3>
                )}
                {description && (
                  <p className="mt-1.5 text-sm font-medium text-surface-500 dark:text-surface-400">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-surface-400 hover:text-surface-900 dark:hover:text-surface-0 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
};
