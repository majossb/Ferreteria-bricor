import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function FormField({
  label,
  id,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  error,
  required = false,
  helperText,
  as = 'input',
  children,
  className = '',
  ...props
}) {
  const Component = as;

  return (
    <div className={`bricor-form-group ${className}`}>
      {label && (
        <label htmlFor={id} className="bricor-label">
          {label} {required && <span style={{ color: 'var(--color-oxido)' }}>*</span>}
        </label>
      )}

      <Component
        id={id}
        name={id}
        type={as === 'input' ? type : undefined}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`bricor-input ${error ? 'bricor-input-error' : ''}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      >
        {children}
      </Component>

      {error ? (
        <div id={`${id}-error`} className="bricor-error-message">
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-piedra-dark)' }}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
}
