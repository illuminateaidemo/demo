/* ============================================================
   Project Intelligence Platform - Form Field
   Reusable form field wrapper with label, various input types,
   error message, helper text, and required indicator.
   ============================================================ */

import React from 'react';

// ─── Props ───────────────────────────────────────────────────

interface BaseFieldProps {
  /** Field label */
  label: string;
  /** Input name attribute (also used as id if no id provided) */
  name: string;
  /** HTML id override */
  id?: string;
  /** Error message to display */
  error?: string;
  /** Helper text below the input */
  helperText?: string;
  /** Mark the field as required */
  required?: boolean;
  /** Disable the input */
  disabled?: boolean;
  /** Additional wrapper class */
  className?: string;
}

interface TextFieldProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'password' | 'url' | 'tel' | 'number' | 'date' | 'datetime-local' | 'time';
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'email' | 'tel' | 'url';
}

interface TextAreaFieldProps extends BaseFieldProps {
  type: 'textarea';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
}

interface SelectFieldProps extends BaseFieldProps {
  type: 'select';
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string | number; label: string; disabled?: boolean }>;
  placeholder?: string;
}

type FormFieldProps = TextFieldProps | TextAreaFieldProps | SelectFieldProps;

// ─── Type Guards ─────────────────────────────────────────────

function isTextArea(props: FormFieldProps): props is TextAreaFieldProps {
  return props.type === 'textarea';
}

function isSelect(props: FormFieldProps): props is SelectFieldProps {
  return props.type === 'select';
}

// ─── Component ───────────────────────────────────────────────

const FormField: React.FC<FormFieldProps> = (props) => {
  const {
    label,
    name,
    id,
    error,
    helperText,
    required = false,
    disabled = false,
    className = '',
  } = props;

  const fieldId = id || name;
  const hasError = !!error;

  const baseInputClasses = `
    block w-full rounded-md shadow-sm text-sm text-slate-900 placeholder-slate-400
    transition-colors duration-150
    disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
    ${hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'
    }
  `.trim();

  const renderInput = () => {
    if (isTextArea(props)) {
      return (
        <textarea
          id={fieldId}
          name={name}
          value={props.value}
          onChange={props.onChange}
          placeholder={props.placeholder}
          rows={props.rows || 3}
          disabled={disabled}
          required={required}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
          className={baseInputClasses}
        />
      );
    }

    if (isSelect(props)) {
      return (
        <select
          id={fieldId}
          name={name}
          value={props.value}
          onChange={props.onChange}
          disabled={disabled}
          required={required}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
          className={`${baseInputClasses} ${!props.value ? 'text-slate-400' : ''}`}
        >
          {props.placeholder && (
            <option value="" disabled>
              {props.placeholder}
            </option>
          )}
          {props.options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    // Default: text input
    const textProps = props as TextFieldProps;
    return (
      <input
        id={fieldId}
        name={name}
        type={textProps.type || 'text'}
        value={textProps.value}
        onChange={textProps.onChange}
        placeholder={textProps.placeholder}
        disabled={disabled}
        required={required}
        min={textProps.min}
        max={textProps.max}
        step={textProps.step}
        autoComplete={textProps.autoComplete}
        inputMode={textProps.inputMode}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
        className={baseInputClasses}
      />
    );
  };

  return (
    <div className={`${className}`}>
      {/* Label */}
      <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {/* Input */}
      {renderInput()}

      {/* Error message */}
      {hasError && (
        <p id={`${fieldId}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Helper text */}
      {!hasError && helperText && (
        <p id={`${fieldId}-helper`} className="mt-1 text-sm text-slate-500">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default FormField;
