import React from 'react';
import { formatCurrency, calculateDiscount } from '../../utils/currency';

export default function Price({ price, originalPrice, size = 'md', className = '' }) {
  const isPromo = originalPrice && originalPrice > price;
  const discount = isPromo ? calculateDiscount(price, originalPrice) : 0;

  return (
    <div className={`bricor-price-block ${className}`}>
      <div className="uk-flex uk-flex-middle u-gap-8px">
        <span
          className={`bricor-price-current ${isPromo ? 'bricor-price-promo' : ''}`}
          style={{ fontSize: size === 'lg' ? '1.9rem' : size === 'sm' ? '1.15rem' : '1.45rem' }}
        >
          {formatCurrency(price)}
        </span>
        {isPromo && discount > 0 && (
          <span className="bricor-badge bricor-badge-oxido u-font-size-0-65rem">
            -{discount}%
          </span>
        )}
      </div>
      {isPromo && (
        <span className="bricor-price-old">
          {formatCurrency(originalPrice)}
        </span>
      )}
    </div>
  );
}
