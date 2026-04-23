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
  iconColor = 'text-primary-600',
  iconBgColor = 'bg-primary-50',
  label,
  value,
  trend,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200/60 p-5',
        'card-shadow transition-all duration-300 ease-out',
        'hover:card-shadow-hover hover:-translate-y-0.5',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
              iconBgColor
            )}
          >
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{value}</p>
          </div>
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              trend.isPositive
                ? 'bg-success-50 text-success-700'
                : 'bg-error-50 text-error-700'
            )}
          >
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
    </div>
  );
};
