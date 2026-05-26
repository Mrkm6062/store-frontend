import React, { useContext } from 'react';
import { ThemeCustomizationContext } from '../../../themeLoader/themeRenderer.jsx';

const CategoryCard = ({ category, onClick }) => {
  const customization = useContext(ThemeCustomizationContext);
  const categorySettings = customization?.category || {};

  // Generate initials for placeholder if no image exists
  const initials = category.name.substring(0, 2).toUpperCase();

  return (
    <div onClick={() => onClick(category)} className="flex flex-col items-center gap-3 cursor-pointer group min-w-[90px] shrink-0">
      <div 
        className="w-48 h-48 md:w-24 md:h-24 rounded-full border border-gray-200 group-hover:border-[#76b900] flex items-center justify-center overflow-hidden shadow-sm transition-all duration-300 group-hover:shadow-lg"
        style={{ backgroundColor: categorySettings.bgColor || '#f0fdf4' }}
      >
        {category.image?.url ? (
          <img src={category.image.url} alt={category.name} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <span className="text-2xl uppercase font-black text-[#76b900] tracking-wider transform group-hover:scale-110 transition-transform duration-500">{initials}</span>
        )}
      </div>
      <span className="text-sm uppercase font-bold text-gray-700 group-hover:text-[#76b900] text-center text-balance line-clamp-2 leading-tight transition-colors w-full px-1">
        {category.name}
      </span>
    </div>
  );
};

export default CategoryCard;