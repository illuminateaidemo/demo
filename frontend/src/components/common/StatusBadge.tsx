/* ============================================================
   Project Intelligence Platform - Status Badge
   Renders colored badges for various domain statuses.
   ============================================================ */

import React from 'react';
import {
  HealthStatus,
  ProjectStatus,
  TimesheetStatus,
  ExpenseStatus,
  AllocationStatus,
  OpportunityStatus,
  ApprovalStatus,
} from '../../types';

// ─── Color mapping ───────────────────────────────────────────

type BadgeColor = 'green' | 'amber' | 'red' | 'blue' | 'indigo' | 'gray' | 'purple';

const COLOR_CLASSES: Record<BadgeColor, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
  indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20',
  gray: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20',
  purple: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20',
};

// Dot indicator colors (optional leading dot)
const DOT_CLASSES: Record<BadgeColor, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  gray: 'bg-slate-400',
  purple: 'bg-purple-500',
};

// ─── Status → Color Resolution ───────────────────────────────

type AnyStatus =
  | HealthStatus
  | ProjectStatus
  | TimesheetStatus
  | ExpenseStatus
  | AllocationStatus
  | OpportunityStatus
  | ApprovalStatus
  | string;

function resolveColor(status: AnyStatus): BadgeColor {
  const s = String(status).toUpperCase();

  // Health statuses
  if (s === HealthStatus.GREEN || s === 'GREEN') return 'green';
  if (s === HealthStatus.AMBER || s === 'AMBER') return 'amber';
  if (s === HealthStatus.RED || s === 'RED') return 'red';

  // Green family
  if (
    [
      'ACTIVE', 'APPROVED', 'COMPLETED', 'CONFIRMED', 'WON',
      'PAID', 'POSTED', 'LOCKED', 'HEALTHY', 'ON_TRACK',
    ].includes(s)
  ) return 'green';

  // Amber family
  if (
    [
      'PENDING', 'SUBMITTED', 'PROPOSED', 'IN_PROGRESS', 'ON_HOLD',
      'AT_RISK', 'NEGOTIATION', 'QUALIFIED', 'ESCALATED', 'REVIEW',
      'DRAFT',
    ].includes(s)
  ) return 'amber';

  // Red family
  if (
    [
      'REJECTED', 'CRITICAL', 'OVERDUE', 'BLOCKED', 'CANCELLED',
      'LOST', 'ABANDONED',
    ].includes(s)
  ) return 'red';

  // Blue family
  if (['NEW', 'LEAD', 'PROPOSAL', 'INFO'].includes(s)) return 'blue';

  // Indigo family
  if (['RETAINER', 'MILESTONE', 'CAPPED_TM'].includes(s)) return 'indigo';

  // Purple family
  if (['WITHDRAWN', 'ARCHIVED'].includes(s)) return 'purple';

  // Fallback
  if (['INACTIVE', 'CLOSED', 'NONE'].includes(s)) return 'gray';

  return 'gray';
}

// ─── Label Formatting ────────────────────────────────────────

function formatLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Props ───────────────────────────────────────────────────

type BadgeSize = 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
  status: AnyStatus;
  /** Override the display label */
  label?: string;
  /** Override the auto-resolved color */
  color?: BadgeColor;
  /** Show a colored dot before the label */
  dot?: boolean;
  /** Badge size variant */
  size?: BadgeSize;
  /** Additional CSS classes */
  className?: string;
}

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

// ─── Component ───────────────────────────────────────────────

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  color,
  dot = false,
  size = 'md',
  className = '',
}) => {
  const resolvedColor = color || resolveColor(status);
  const displayLabel = label || formatLabel(String(status));

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap
        ${COLOR_CLASSES[resolvedColor]}
        ${SIZE_CLASSES[size]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_CLASSES[resolvedColor]}`} />
      )}
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
