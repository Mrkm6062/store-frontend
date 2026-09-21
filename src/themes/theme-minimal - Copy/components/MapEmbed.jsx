import React from 'react';

const MapEmbed = ({ mapLocation }) => {
  // Basic validation to ensure it's a Google Maps embed link
  if (!mapLocation || !mapLocation.includes('google.com/maps/embed')) {
    return null; // Don't render anything if the link is invalid or missing
  }

  return (
    <div className="mt-6">
      <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm" style={{ paddingTop: '56.25%' /* 16:9 Aspect Ratio */ }}>
        <iframe
          className="absolute top-0 left-0 bottom-0 right-0 w-full h-full"
          src={mapLocation}
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Store Location Map"
        ></iframe>
      </div>
    </div>
  );
};

export default MapEmbed;