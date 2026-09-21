import React, { useContext, useEffect, useRef, useState } from 'react';
import { ThemeCustomizationContext } from '../../../themeLoader/themeRenderer.jsx';
import { getOptimizedImageUrl } from '../../../services/api';

const CategoryCard = ({ category, onClick }) => {
  const customization = useContext(ThemeCustomizationContext);
  const categorySettings = customization?.category || {};
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  // Generate initials for placeholder if no image exists
  const initials = category.name.substring(0, 2).toUpperCase();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={cardRef}
      onClick={() => onClick(category)} 
      className={`flex flex-col items-center gap-3 md:gap-4 cursor-pointer group w-full transition-all duration-700 ease-out transform ${
        isVisible 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 translate-y-5 scale-95'
      }`}
    >
      <div 
        className="w-full aspect-square rounded-full border border-gray-200 group-hover:border-[#76b900] flex items-center justify-center overflow-hidden shadow-sm transition-all duration-300 group-hover:shadow-lg"
        style={{ backgroundColor: categorySettings.bgColor || '#f0fdf4' }}
      >
        {category.image?.url ? (
          <img src={getOptimizedImageUrl(category.image.url, 186)} alt={category.name} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <span className="text-3xl md:text-5xl uppercase font-black text-[#76b900] tracking-wider transform group-hover:scale-110 transition-transform duration-500">{initials}</span>
        )}
      </div>
      <span className="text-[10px] sm:text-sm md:text-base lg:text-lg uppercase font-bold text-gray-700 group-hover:text-[#76b900] text-center text-balance line-clamp-2 leading-tight transition-colors w-full px-1">
        {category.name}
      </span>
    </div>
  );
};

export default CategoryCard;