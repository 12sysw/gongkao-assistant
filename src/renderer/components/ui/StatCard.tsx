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
  iconColor = 'text-[#c2410c]',
  iconBgColor = 'bg-[#fed7aa]',
  label,
  value,
  trend,
  className,
}) => {
  return (
    <div
      className={cn(
        'surface hover:shadow-card-hover transition-all duration-300',
        'hover:-translate-y-0.5',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0',
              iconBgColor
            )}
          >
            <Icon className={cn('w-[20px] h-[20px]', iconColor)} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#a8a29e] uppercase tracking-wider">{label}</p>
            <p className="text-xl font-bold text-[#1c1917] mt-0.5 tracking-tight font-display">{value}</p>
          </div>
        </div>
        {trend && (
          <span
            className={cn(
              'text-[11px] font-bold px-2.5 py-1 rounded-full',
              trend.isPositive
                ? 'bg-[#dcfce7] text-[#166534]'
                : 'bg-[#fee2e2] text-[#991b1b]'
            )}
          >
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
    </div>
  );
};
