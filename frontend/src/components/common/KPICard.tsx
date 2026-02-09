/* ============================================================
   Project Intelligence Platform - KPI Card
   Displays a key metric with title, large value, trend indicator,
   subtitle, and optional sparkline area.
   ============================================================ */

import React from 'react';

// ─── Trend Direction ─────────────────────────────────────────

type TrendDirection = 'up' | 'down' | 'neutral';

// ─── Props ───────────────────────────────────────────────────

interface KPICardProps {
  /** KPI label / title */
  title: string;
  /** The main metric value (formatted string, e.g. "$1.2M", "87%") */
  value: string;
  /** Trend direction indicator */
  trend?: TrendDirection;
  /** Trend label (e.g. "+12% vs last month") */
  trendLabel?: string;
  /** Whether upward trend is positive (default: true). Set to false for metrics where up = bad (e.g., costs). */
  upIsGood?: boolean;
  /** Subtitle / secondary info line */
  subtitle?: string;
  /** Icon rendered to the left of the title */
  icon?: React.ReactNode;
  /** Optional sparkline or mini chart area (rendered below the value) */
  sparkline?: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ─── Trend Icons ─────────────────────────────────────────────

const TrendUpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
  </svg>
);

const TrendDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const TrendNeutralIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
  </svg>
);

// ─── Component ───────────────────────────────────────────────

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  trend,
  trendLabel,
  upIsGood = true,
  subtitle,
  icon,
  sparkline,
  onClick,
  className = '',
}) => {
  // Determine trend color
  const getTrendColor = (): string => {
    if (!trend || trend === 'neutral') return 'text-slate-500';
    const isPositive = (trend === 'up' && upIsGood) || (trend === 'down' && !upIsGood);
    return isPositive ? 'text-emerald-600' : 'text-red-600';
  };

  const getTrendBgColor = (): string => {
    if (!trend || trend === 'neutral') return 'bg-slate-100';
    const isPositive = (trend === 'up' && upIsGood) || (trend === 'down' && !upIsGood);
    return isPositive ? 'bg-emerald-50' : 'bg-red-50';
  };

  const TrendIcon = trend === 'up' ? TrendUpIcon : trend === 'down' ? TrendDownIcon : TrendNeutralIcon;

  return (
    <div
      className={`
        bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 active:shadow-sm active:translate-y-0' : 'hover:shadow-md hover:border-slate-300'}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="p-5">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                {icon}
              </div>
            )}
            <span className="text-sm font-medium text-slate-500 truncate">{title}</span>
          </div>

          {/* Trend badge */}
          {trend && (
            <div
              className={`
                flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium
                ${getTrendColor()} ${getTrendBgColor()}
              `}
            >
              <TrendIcon className="w-3.5 h-3.5" />
              {trendLabel && <span>{trendLabel}</span>}
            </div>
          )}
        </div>

        {/* Main value */}
        <div className="text-2xl font-bold text-slate-900 leading-tight mb-1">
          {value}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>

      {/* Sparkline area */}
      {sparkline && (
        <div className="px-5 pb-4 -mt-1">
          {sparkline}
        </div>
      )}
    </div>
  );
};

export default KPICard;
