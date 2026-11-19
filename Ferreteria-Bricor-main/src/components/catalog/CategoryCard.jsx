import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function CategoryCard({ category, onSelect }) {
  return (
    <div
      className="bricor-category-card u-cursor-pointer"
      onClick={() => onSelect(category.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect(category.id);
        }
      }}
      aria-label={`Explorar categoría ${category.name}`}
    >
      <img
        src={category.image}
        alt={category.name}
        className="bricor-category-card-img"
        loading="lazy"
      />
      <div className="bricor-category-card-overlay">
        <h3 className="bricor-category-card-title">{category.name}</h3>
        <div className="bricor-category-card-count">
          <span>{category.itemCount} referencias</span>
          <ArrowRight size={14} className="category-card-arrowright-01" />
        </div>
      </div>
    </div>
  );
}
