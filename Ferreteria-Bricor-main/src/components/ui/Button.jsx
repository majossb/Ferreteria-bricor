import React from 'react';

export default function Button({
  children,
  variant = 'primary', // 'primary', 'secondary', 'dark', 'outline-white'
  size = 'md', // 'sm', 'md'
  block = false,
  disabled = false,
  onClick,
  type = 'button',
  icon: Icon,
  className = '',
  ...props
}) {
  const variantClass = `bricor-btn-${variant}`;
  const sizeClass = size === 'sm' ? 'bricor-btn-sm' : '';
  const blockClass = block ? 'bricor-btn-block' : '';

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`bricor-btn ${variantClass} ${sizeClass} ${blockClass} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 17} className="bricor-btn-icon" />}
      <span>{children}</span>
    </button>
  );
}
