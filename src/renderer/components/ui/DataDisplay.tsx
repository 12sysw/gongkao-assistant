import React from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, Edit2, Trash2, Copy, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card, CardContent } from './Card';
import { Badge } from './Badge';

interface ListItemCardProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger';
  }>;
  onClick?: () => void;
  gradient?: string;
}

export const ListItemCard: React.FC<ListItemCardProps> = ({
  title,
  subtitle,
  badge,
  meta,
  actions,
  onClick,
  gradient,
}) => {
  const [showActions, setShowActions] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className="relative"
    >
      <Card
        variant="elevated"
        hover="lift"
        className={cn(
          'cursor-pointer group',
          gradient && `bg-gradient-to-br ${gradient}`
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-surface-900 dark:text-dark-50 truncate">
                  {title}
                </h3>
                {badge}
              </div>
              {subtitle && (
                <p className="text-sm text-surface-600 dark:text-dark-300 line-clamp-2">
                  {subtitle}
                </p>
              )}
              {meta && (
                <div className="mt-3 flex items-center gap-2 text-xs text-surface-500 dark:text-dark-400">
                  {meta}
                </div>
              )}
            </div>
            {actions && actions.length > 0 && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActions(!showActions);
                  }}
                  className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-dark-800 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="w-4 h-4 text-surface-600 dark:text-dark-300" />
                </button>
                {showActions && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowActions(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-dark-900 rounded-xl shadow-elevated border border-surface-200 dark:border-white/10 z-20 py-1">
                      {actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick();
                            setShowActions(false);
                          }}
                          className={cn(
                            'w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors',
                            action.variant === 'danger'
                              ? 'text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/20'
                              : 'text-surface-700 dark:text-dark-200 hover:bg-surface-50 dark:hover:bg-dark-850'
                          )}
                        >
                          {action.icon}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface DataTableProps {
  headers: string[];
  rows: Array<{
    id: string | number;
    cells: React.ReactNode[];
    onClick?: () => void;
  }>;
  emptyText?: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  headers,
  rows,
  emptyText = '暂无数据',
}) => {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-surface-500 dark:text-dark-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-200 dark:border-white/10">
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="px-4 py-3 text-left text-xs font-semibold text-surface-600 dark:text-dark-300 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100 dark:divide-white/5">
          {rows.map((row) => (
            <motion.tr
              key={row.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                'transition-colors',
                row.onClick && 'cursor-pointer hover:bg-surface-50 dark:hover:bg-dark-850'
              )}
              onClick={row.onClick}
            >
              {row.cells.map((cell, idx) => (
                <td
                  key={idx}
                  className="px-4 py-4 text-sm text-surface-900 dark:text-dark-50"
                >
                  {cell}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface StatCardModernProps {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  gradient: string;
}

export const StatCardModern: React.FC<StatCardModernProps> = ({
  label,
  value,
  change,
  icon,
  gradient,
}) => {
  return (
    <Card
      variant="elevated"
      hover="lift"
      className={cn('overflow-hidden relative', `bg-gradient-to-br ${gradient}`)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white">
            {icon}
          </div>
          {change !== undefined && (
            <Badge
              variant="outline"
              className="bg-white/20 border-white/30 text-white text-xs"
            >
              {change > 0 ? '+' : ''}{change}%
            </Badge>
          )}
        </div>
        <p className="text-sm text-white/80 font-medium mb-1">{label}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </CardContent>
    </Card>
  );
};

interface ProgressCardProps {
  title: string;
  current: number;
  total: number;
  color?: string;
  icon?: React.ReactNode;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  title,
  current,
  total,
  color = 'bg-brand-500',
  icon,
}) => {
  const percentage = Math.round((current / total) * 100);

  return (
    <Card variant="elevated" hover="border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 rounded-lg bg-surface-100 dark:bg-dark-850 text-surface-700 dark:text-dark-300">
                {icon}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-surface-900 dark:text-dark-50">
                {title}
              </h3>
              <p className="text-sm text-surface-600 dark:text-dark-300">
                {current} / {total}
              </p>
            </div>
          </div>
          <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
            {percentage}%
          </span>
        </div>
        <div className="h-2.5 bg-surface-100 dark:bg-dark-850 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={cn('h-full rounded-full', color)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
