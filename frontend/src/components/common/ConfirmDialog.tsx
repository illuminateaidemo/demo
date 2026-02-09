/* ============================================================
   Project Intelligence Platform - Confirm Dialog
   Confirmation dialog for destructive or significant actions.
   Built on top of the Modal component.
   ============================================================ */

import React, { useState, useCallback } from 'react';
import Modal from './Modal';

// ─── Variant ─────────────────────────────────────────────────

type ConfirmVariant = 'danger' | 'warning' | 'info';

const VARIANT_STYLES: Record<ConfirmVariant, {
  iconBg: string;
  iconColor: string;
  confirmBtn: string;
}> = {
  danger: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmBtn: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800',
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    confirmBtn: 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500 active:bg-amber-800',
  },
  info: {
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    confirmBtn: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 active:bg-indigo-800',
  },
};

const VARIANT_ICONS: Record<ConfirmVariant, React.ReactNode> = {
  danger: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  warning: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  info: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// ─── Props ───────────────────────────────────────────────────

interface ConfirmDialogProps {
  /** Controls visibility */
  isOpen: boolean;
  /** Called when the dialog should close (cancel or backdrop click) */
  onClose: () => void;
  /** Called when the user confirms the action */
  onConfirm: () => void | Promise<void>;
  /** Dialog title */
  title: string;
  /** Description / message body */
  message: string | React.ReactNode;
  /** Text for the confirm button */
  confirmLabel?: string;
  /** Text for the cancel button */
  cancelLabel?: string;
  /** Visual variant */
  variant?: ConfirmVariant;
  /** Disable the confirm button (useful while processing) */
  confirmDisabled?: boolean;
}

// ─── Component ───────────────────────────────────────────────

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  confirmDisabled = false,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const styles = VARIANT_STYLES[variant];
  const icon = VARIANT_ICONS[variant];

  const handleConfirm = useCallback(async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Error handling is delegated to the caller
    } finally {
      setIsProcessing(false);
    }
  }, [onConfirm, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      hideCloseButton
      actions={
        <>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium
                       bg-white text-slate-700 border border-slate-300
                       hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmDisabled || isProcessing}
            className={`
              inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium
              focus:outline-none focus:ring-2 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors
              ${styles.confirmBtn}
            `}
          >
            {isProcessing ? (
              <>
                <span className="spinner spinner-sm mr-2" />
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </>
      }
    >
      <div className="flex gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${styles.iconBg} ${styles.iconColor}`}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
          <div className="text-sm text-slate-600 leading-relaxed">
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
