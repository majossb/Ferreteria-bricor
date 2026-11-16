import React from 'react';
import { CATEGORIES } from '../../data/categories';

export default function MainNavigation({ activeCategory, onSelectCategory }) {
  return (
    <nav className="bricor-category-nav" aria-label="Navegación de categorías del catálogo">
      <div className="uk-container">
        <ul className="bricor-category-nav-list">
          <li className={`bricor-category-nav-item ${!activeCategory ? 'active' : ''}`}>
            <a
              href="#todos"
              onClick={(e) => {
                e.preventDefault();
                onSelectCategory(null);
              }}
            >
              Todos los productos
            </a>
          </li>
          {CATEGORIES.map((cat) => (
            <li
              key={cat.id}
              className={`bricor-category-nav-item ${activeCategory === cat.id ? 'active' : ''}`}
            >
              <a
                href={`#${cat.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectCategory(cat.id);
                }}
              >
                {cat.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
