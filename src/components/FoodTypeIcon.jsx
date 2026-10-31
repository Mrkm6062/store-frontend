import React from 'react';

/**
 * Resolves raw food type string into normalized category:
 * 'veg' | 'non-veg' | 'egg' | 'vegan' | null
 */
export const resolveFoodType = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const val = raw.trim().toLowerCase();
  if (val.includes('vegan')) return 'vegan';
  if (val.includes('non') || val.includes('meat') || val.includes('chicken') || val.includes('fish') || val.includes('mutton')) return 'non-veg';
  if (val.includes('egg')) return 'egg';
  if (val.includes('veg')) return 'veg';
  return null;
};

/**
 * Standard Food Type Icon (Veg, Non-Veg, Contains Egg, Vegan)
 */
const FoodTypeIcon = ({ type, className = '', size = 15, showLabel = false }) => {
  const resolved = resolveFoodType(type);
  if (!resolved) return null;

  if (resolved === 'veg') {
    return (
      <span 
        className={`inline-flex shrink-0 items-center justify-center rounded-[3px] border border-green-600 bg-white p-[2px] shadow-2xs ${className}`}
        style={{ width: size, height: size }}
        title="Vegetarian (Veg)"
        aria-label="Vegetarian"
      >
        <span 
          className="rounded-full bg-green-600 shrink-0" 
          style={{ width: Math.max(Math.round(size * 0.45), 6), height: Math.max(Math.round(size * 0.45), 6) }}
        />
        {showLabel && <span className="ml-1 text-[10px] font-bold text-green-700">Veg</span>}
      </span>
    );
  }

  if (resolved === 'non-veg') {
    return (
      <span 
        className={`inline-flex shrink-0 items-center justify-center rounded-[3px] border border-red-600 bg-white p-[1px] shadow-2xs ${className}`}
        style={{ width: size, height: size }}
        title="Non-Vegetarian (Non-Veg)"
        aria-label="Non-Vegetarian"
      >
        <svg 
          viewBox="0 0 10 10" 
          className="shrink-0"
          style={{ width: Math.max(Math.round(size * 0.6), 7), height: Math.max(Math.round(size * 0.6), 7) }}
        >
          <polygon points="5,1.5 9,8.5 1,8.5" fill="#dc2626" />
        </svg>
        {showLabel && <span className="ml-1 text-[10px] font-bold text-red-700">Non-Veg</span>}
      </span>
    );
  }

  if (resolved === 'egg') {
    return (
      <span 
        className={`inline-flex shrink-0 items-center justify-center rounded-[3px] border border-amber-600 bg-white p-[1px] shadow-2xs ${className}`}
        style={{ width: size, height: size }}
        title="Contains Egg"
        aria-label="Contains Egg"
      >
        <svg 
          viewBox="0 0 10 12" 
          className="shrink-0"
          style={{ width: Math.max(Math.round(size * 0.55), 7), height: Math.max(Math.round(size * 0.65), 8) }}
        >
          <path d="M5 1 C2.8 1 1.5 4.5 1.5 7.5 C1.5 9.8 3 11 5 11 C7 11 8.5 9.8 8.5 7.5 C8.5 4.5 7.2 1 5 1 Z" fill="#d97706" />
        </svg>
        {showLabel && <span className="ml-1 text-[10px] font-bold text-amber-700">Egg</span>}
      </span>
    );
  }

  if (resolved === 'vegan') {
    return (
      <span 
        className={`inline-flex shrink-0 items-center justify-center rounded-[3px] border border-emerald-600 bg-white p-[1px] shadow-2xs ${className}`}
        style={{ width: size, height: size }}
        title="Vegan (100% Plant-Based)"
        aria-label="Vegan"
      >
        <svg 
          viewBox="0 0 12 12" 
          className="shrink-0"
          style={{ width: Math.max(Math.round(size * 0.7), 8), height: Math.max(Math.round(size * 0.7), 8) }}
        >
          <path d="M2.5 9.5 C2.5 5 5.5 2.5 9.5 2.5 C9.5 6.5 7 9.5 2.5 9.5 Z" fill="#059669" />
          <path d="M2.5 9.5 Q5.5 7 9.5 2.5" stroke="#ffffff" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        </svg>
        {showLabel && <span className="ml-1 text-[10px] font-bold text-emerald-700">Vegan</span>}
      </span>
    );
  }

  return null;
};

export default FoodTypeIcon;
