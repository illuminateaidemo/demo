/* ============================================================
   Project Intelligence Platform - Modal Dialog
   Reusable modal with title, content, actions, close button,
   and backdrop click to dismiss.
   ============================================================ */

import React, { useEffect, useRef, useCallback } from 'react';

// ─── Size Variants ───────────────────────────────────────────

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[calc(100vw-2rem)]',
};

// ─── Props ───────────────────────────────────────────────────

interface ModalProps {
  /** Controls visibility */
  isOpen: boolean;
  /** Called when the modal should close */
  onClose: () => void;
  /** Modal title displayed in the header */
  title?: string;
  /** Optional subtitle under the title */
  subtitle?: string;
  /** Modal body content */
  children: React.ReactNode;
  /** Footer actions (buttons) - rendered in the footer bar */
  actions?: React.ReactNode;
  /** Size variant */
  size?: ModalSize;
  /** Disable backdrop click to close */
  disableBackdropClose?: boolean;
  /** Disable the close (X) button */
  hideCloseButton?: boolean;
  /** Additional CSS classes for the modal panel */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  actions,
  size = 'md',
  disableBackdropClose = false,
  hideCloseButton = false,
  className = '',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // Focus trap: focus the panel when opened
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (!disableBackdropClose && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={handleBackdropClick}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={`
          relative w-full ${SIZE_CLASSES[size]}
          bg-white rounded-xl shadow-xl
          animate-scale-in
          flex flex-col max-h-[calc(100vh-2rem)]
          focus:outline-none
          ${className}
        `}
      >
        {/* Header */}
        {(title || !hideCloseButton) && (
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-200 flex-shrink-0">
            <div>
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
              )}
            </div>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className="ml-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0 -mt-1"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Footer / Actions */}
        {actions && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/50 rounded-b-xl flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
