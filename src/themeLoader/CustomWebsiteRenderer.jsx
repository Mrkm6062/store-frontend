import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const CustomWebsiteRenderer = ({ storeData }) => {
  const location = useLocation();
  const [trackingSettings, setTrackingSettings] = useState(null);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const headers = {
          'x-store-domain': window.location.hostname,
          'x-forwarded-host': window.location.hostname
        };
        const res = await fetch(`${API_URL}/api/tracking-settings/public`, { headers });
        if (res.ok) {
          setTrackingSettings(await res.json());
        }
      } catch (err) {
        console.error("Failed to load tracking in CustomWebsiteRenderer:", err);
      }
    };
    fetchTracking();
  }, []);

  // Set document title and favicon
  useEffect(() => {
    if (storeData) {
      document.title = storeData.websiteTitle || storeData.storeName || 'Custom Website';
      if (storeData.favicon) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = storeData.favicon;
      }
    }
  }, [storeData]);

  // Inject tracking scripts (GA4, GTM, Meta Pixel) into the parent page
  useEffect(() => {
    if (!trackingSettings) return;
    const cleanupElements = [];

    // Google Site Verification
    if (trackingSettings.googleSearchConsole?.enabled && trackingSettings.googleSearchConsole.verificationCode) {
      let code = trackingSettings.googleSearchConsole.verificationCode;
      if (code.includes('content=')) {
        const match = code.match(/content="([^"]+)"/);
        if (match) code = match[1];
      } else if (code.includes('=')) {
        code = code.split('=').pop().replace(/["']/g, '').trim();
      }
      let metaEl = document.querySelector('meta[name="google-site-verification"]');
      if (!metaEl) {
        metaEl = document.createElement('meta');
        metaEl.setAttribute('name', 'google-site-verification');
        document.head.appendChild(metaEl);
        cleanupElements.push(metaEl);
      }
      metaEl.setAttribute('content', code);
    }

    // Google Analytics 4
    if (trackingSettings.googleAnalytics?.enabled && trackingSettings.googleAnalytics.measurementId) {
      const gaId = trackingSettings.googleAnalytics.measurementId;
      if (!document.querySelector(`script[src*="${gaId}"]`)) {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        document.head.appendChild(script);
        cleanupElements.push(script);

        const inline = document.createElement('script');
        inline.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `;
        document.head.appendChild(inline);
        cleanupElements.push(inline);
      }
    }

    // Meta Pixel
    if (trackingSettings.facebookPixel?.enabled && trackingSettings.facebookPixel.pixelId) {
      const pixelId = trackingSettings.facebookPixel.pixelId;
      if (!document.querySelector(`script[src*="fbevents.js"]`)) {
        const inline = document.createElement('script');
        inline.innerHTML = `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `;
        document.head.appendChild(inline);
        cleanupElements.push(inline);
      }
    }

    return () => {
      cleanupElements.forEach(el => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
    };
  }, [trackingSettings]);

  const API_URL = import.meta.env.VITE_API_URL || '';
  const storeFolder = storeData?.storeSlug || storeData?.storeId;

  // Determine relative file path based on current browser path
  let relativePath = location.pathname.replace(/^\/+/, '');
  if (!relativePath || relativePath === '') {
    relativePath = storeData?.customWebsite?.entryPoint || 'index.html';
  } else if (!relativePath.includes('.')) {
    // If path has no extension like /about, try /about.html
    relativePath = `${relativePath}.html`;
  }

  // Construct website source URL (served through public GCS or backend proxy)
  const gcsBase = storeData?.customWebsite?.baseUrl;
  const iframeSrc = gcsBase 
    ? `${gcsBase}${relativePath}`
    : `${API_URL}/api/custom-website/public/serve/${relativePath}`;

  // If store has no custom website files uploaded
  const hasFiles = storeData?.customWebsite?.filesCount > 0 || Boolean(storeData?.customWebsite?.enabled);

  if (!hasFiles) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-md p-8 rounded-3xl border border-slate-700/60 shadow-2xl space-y-5">
          {storeData?.logo ? (
            <img 
              src={storeData.logo} 
              alt={storeData.storeName || "Store"} 
              className="w-20 h-20 object-contain mx-auto rounded-2xl bg-white/10 p-2 border border-white/10"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-green-500/20 text-green-400 mx-auto flex items-center justify-center font-black text-2xl border border-green-500/30">
              {(storeData?.storeName || 'G')[0].toUpperCase()}
            </div>
          )}

          <div>
            <h1 className="text-2xl font-black tracking-tight">{storeData?.storeName || 'Custom Website'}</h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Our website is currently under construction. Please check back soon!
            </p>
          </div>

          <div className="pt-4 border-t border-slate-700/50 flex flex-col gap-2 text-xs text-slate-400">
            {storeData?.supportEmail && (
              <div>Email: <a href={`mailto:${storeData.supportEmail}`} className="text-green-400 hover:underline">{storeData.supportEmail}</a></div>
            )}
            {storeData?.whatsappNumber && (
              <div>WhatsApp: <a href={`https://wa.me/${storeData.whatsappNumber}`} target="_blank" rel="noreferrer" className="text-green-400 hover:underline">+{storeData.whatsappNumber}</a></div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen overflow-hidden bg-white">
      <iframe
        src={iframeSrc}
        title={storeData?.storeName || "Custom Website"}
        className="w-full min-h-screen border-0 block"
        style={{
          width: '100%',
          minHeight: '100vh',
          height: '100vh',
          border: 'none',
          display: 'block'
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
};

export default CustomWebsiteRenderer;
