import React from 'react';

const Banner = ({ bannerUrl, storeName }) => {
  if (!bannerUrl) return null;

  return (
    <div className="w-full h-48 md:h-64 lg:h-80 relative overflow-hidden bg-gray-100 border-b border-gray-200">
      <img 
        src={bannerUrl} 
        alt={`${storeName} Banner`} 
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default Banner;