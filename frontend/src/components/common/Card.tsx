/* ============================================================
   Project Intelligence Platform - Card Component
   Reusable card with optional title, subtitle, action slot,
   and content area.
   ============================================================ */

import React from 'react';

// ─── Props ───────────────────────────────────────────────────

interface CardProps {
  /** Card title */
  title?: string;
  /** Subtitle below the title */
  subtitle?: string;
  /** Actions rendered in the top-right of the header (buttons, links, etc.) */
  actions?: React.ReactNode;
  /** Card content */
  children: React.ReactNode;
  /** Remove default body padding */
  noPadding?: boolean;
  /** Make the card clickable with hover effects */
  interactive?: boolean;
  /** Click handler (requires interactive=true for visual feedback) */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Optional footer content */
  footer?: React.ReactNode;
}

// ─── Component ───────────────────────────────────────────────

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  actions,
  children,
  noPadding = false,
  interactive = false,
  onClick,
  className = '',
  footer,
}) => {
  const hasHeader = title || subtitle || actions;

  const cardClasses = `
    bg-white rounded-lg border border-slate-200 shadow-sm
    transition-all duration-200
    ${interactive ? 'cursor-pointer hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 active:shadow-sm active:translate-y-0' : 'hover:shadow-md hover:border-slate-300'}
    ${className}
  `.trim();

  return (
    <div className={cardClasses} onClick={onClick} role={onClick ? 'button' : undefined}>
      {/* Header */}
      {hasHeader && (
        <div className="flex items-start justify-between px-5 pt-5 pb-0">
          <div className="min-w-0">
            {title && (
              <h3 className="text-base font-semibold text-slate-900 leading-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className={noPadding ? '' : 'px-5 py-4'}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-lg">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
