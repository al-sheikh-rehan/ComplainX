import React from 'react';
import {
  Droplets,
  Trash2,
  Zap,
  Footprints,
  Lightbulb,
  HelpCircle,
  Clock,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { ComplaintCategory, ComplaintPriority, ComplaintStatus } from '../types';

export const CategoryBadge: React.FC<{ category: ComplaintCategory; size?: 'sm' | 'md' }> = ({
  category,
  size = 'md',
}) => {
  const getDetails = (cat: ComplaintCategory) => {
    switch (cat) {
      case 'Water':
        return {
          icon: Droplets,
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
        };
      case 'Sanitation':
        return {
          icon: Trash2,
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'Electricity':
        return {
          icon: Zap,
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'Road':
        return {
          icon: Footprints,
          bg: 'bg-orange-50 text-orange-700 border-orange-200',
        };
      case 'Street Light':
        return {
          icon: Lightbulb,
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      case 'Other':
      default:
        return {
          icon: HelpCircle,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const { icon: Icon, bg } = getDetails(category);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${bg} ${sizeClasses}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{category}</span>
    </span>
  );
};

export const StatusBadge: React.FC<{ status: ComplaintStatus; size?: 'sm' | 'md' }> = ({
  status,
  size = 'md',
}) => {
  const getDetails = (st: ComplaintStatus) => {
    switch (st) {
      case 'Pending':
        return {
          icon: Clock,
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
        };
      case 'In Progress':
        return {
          icon: Wrench,
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-500',
        };
      case 'Resolved':
        return {
          icon: CheckCircle2,
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
        };
    }
  };

  const { icon: Icon, bg, dot } = getDetails(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${bg} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{status}</span>
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: ComplaintPriority; size?: 'sm' | 'md' }> = ({
  priority,
  size = 'md',
}) => {
  const getDetails = (pr: ComplaintPriority) => {
    switch (pr) {
      case 'High':
        return {
          icon: Flame,
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'Medium':
        return {
          icon: AlertTriangle,
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'Low':
      default:
        return {
          icon: CheckCircle2,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const { icon: Icon, bg } = getDetails(priority);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full border ${bg} ${sizeClasses}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3 h-3'} />
      <span>{priority} Priority</span>
    </span>
  );
};
