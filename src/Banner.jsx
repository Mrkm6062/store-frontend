import React from 'react';

const Banner = ({ bannerUrl, storeName }) => {
  if (!bannerUrl) return null;

  return (
    <div className="w-full h-48 md:h-64 lg:h-80 relative overflow-hidden bg-gray-900">
      <img 
        src={bannerUrl} 
        alt={`${storeName} Banner`} 
        className="w-full h-full object-cover opacity-80"
      />
      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
        <h2 className="text-white text-3xl md:text-5xl font-extrabold shadow-sm px-4 text-center tracking-tight">
          Welcome to {storeName}
        </h2>
      </div>
    </div>
  );
};

export default Banner;