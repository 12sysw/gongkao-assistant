import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  iconColor = 'text-brand-500',
  iconBgColor = 'bg-brand-100',
  label,
  value,
  trend,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-white border border-surface-100 rounded-xl shadow-card hover:shadow-card-hover hover:border-surface-200 transition-all duration-200',
        className
      )}
    >
      <div className="flex items-start justify-between p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-11 h-11 rounded-lg flex items-center justify-center shrink-0',
              iconBgColor
            )}
          >
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
          <div>
            <p className="text-xs font-medium text-surface-500 tracking-wide">{label}</p>
            <p className="text-xl font-bold text-surface-900 mt-0.5 font-display">{value}</p>
          </div>
        </div>
        {trend && (
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            trend.isPositive ? 'bg-success-light text-success-dark' : 'bg-danger-light text-danger-dark'
          )}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
    </div>
  );
};
