import React, { useContext } from 'react';
import { ThemeCustomizationContext } from '../../../themeLoader/themeRenderer.jsx';

const Banner = ({ bannerUrl, storeName }) => {
  const customization = useContext(ThemeCustomizationContext);
  const bannerSettings = customization?.banner || {};
  const limit = bannerSettings.limit || 5;

  if (!bannerUrl) return null;

  // Convert to array in case backend returns a single string, and apply the limit
  const banners = (Array.isArray(bannerUrl) ? bannerUrl : [bannerUrl]).slice(0, limit);

  if (banners.length === 0) return null;

  return (
    <div 
      className="w-full h-48 md:h-64 lg:h-80 relative flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-b transition-colors duration-300"
      style={{ backgroundColor: bannerSettings.bgColor || '#f3f4f6', borderColor: bannerSettings.bgColor || '#e5e7eb' }}
    >
      {banners.map((url, index) => (
        <div key={index} className="w-full h-full shrink-0 snap-center relative">
          <img src={url} alt={`${storeName} Banner ${index + 1}`} className="w-full h-full object-cover" />
          {/* Future text overlays can use style={{ color: bannerSettings.textColor || '#111111' }} */}
        </div>
      ))}
    </div>
  );
};

export default Banner;