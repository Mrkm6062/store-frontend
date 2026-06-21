import React from 'react';

const CategoryCard = ({ category, onClick }) => {
  // Generate initials for placeholder if no image exists
  const initials = category.name.substring(0, 2).toUpperCase();

  return (
    <div onClick={() => onClick(category)} className="flex flex-col items-center gap-3 cursor-pointer group min-w-[90px] shrink-0">
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-green-50 border border-gray-200 group-hover:border-[#76b900] flex items-center justify-center overflow-hidden shadow-sm transition-all duration-300 group-hover:shadow-lg">
        {category.image?.url ? (
          <img 
            src={category.image.url} 
            alt={category.name} 
            loading="lazy"
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" 
          />
        ) : (
          <span className="text-2xl font-black text-[#76b900] tracking-wider transform group-hover:scale-110 transition-transform duration-500">{initials}</span>
        )}
      </div>
      <span className="text-sm font-bold text-gray-700 group-hover:text-[#76b900] text-center text-balance line-clamp-2 leading-tight transition-colors w-full px-1">
        {category.name}
      </span>
    </div>
  );
};

export default CategoryCard;