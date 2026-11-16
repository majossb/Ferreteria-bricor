import React from 'react';
import { Minus, Plus } from 'lucide-react';

export default function QuantitySelector({
  value = 1,
  min = 1,
  max = 99,
  onChange,
  className = '',
}) {
  const handleDecrease = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrease = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const handleInputChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      const clamped = Math.min(Math.max(min, val), max);
      onChange(clamped);
    }
  };

  return (
    <div className={`bricor-quantity-selector ${className}`}>
      <button
        type="button"
        aria-label="Disminuir cantidad"
        className="bricor-qty-btn"
        onClick={handleDecrease}
        disabled={value <= min}
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        className="bricor-qty-input"
        value={value}
        onChange={handleInputChange}
        min={min}
        max={max}
        aria-label="Cantidad de unidades"
      />
      <button
        type="button"
        aria-label="Aumentar cantidad"
        className="bricor-qty-btn"
        onClick={handleIncrease}
        disabled={value >= max}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
