import React from 'react';

export default function Badge({
  children,
  variant = 'oliva', // 'oliva', 'oxido', 'stock', 'lowstock'
  className = '',
}) {
  return (
    <span className={`bricor-badge bricor-badge-${variant} ${className}`}>
      {children}
    </span>
  );
}
