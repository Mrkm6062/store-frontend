import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DynamicRouteLoader from './DynamicRouteLoader.jsx';

// Import theme-free components
export const isLightColor = (color) => {
  if (!color) return false;
  const cleanColor = color.trim().toLowerCase();
  
  if (cleanColor.startsWith('rgb')) {
    const match = cleanColor.match(/\d+/g);
    if (match && match.length >= 3) {
      const r = parseInt(match[0], 10);
      const g = parseInt(match[1], 10);
      const b = parseInt(match[2], 10);
      const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
      return hsp > 127.5;
    }
  }
  
  let hex = cleanColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
    return hsp > 127.5;
  }
  return false;
};

import FreeHome from '../themes/theme-free/pages/Home.jsx';
import FreeCategory from '../themes/theme-free/pages/Category.jsx';
import FreeCategories from '../themes/theme-free/pages/Categories.jsx';
import FreePolicy from '../themes/theme-free/pages/Policy.jsx';
import FreeTrackOrder from '../themes/theme-free/pages/TrackOrder.jsx';
import FreeCheckout from '../themes/theme-free/pages/Checkout.jsx';
import FreeWriteReview from '../themes/theme-free/pages/WriteReview.jsx';
import FreeProductDetails from '../themes/theme-free/pages/ProductDetails.jsx';

// Import theme-modern components
import ModernHome from '../themes/theme-modern/pages/Home.jsx';
import ModernCategory from '../themes/theme-modern/pages/Category.jsx';
import ModernCategories from '../themes/theme-modern/pages/Categories.jsx';
import ModernPolicy from '../themes/theme-modern/pages/Policy.jsx';
import ModernTrackOrder from '../themes/theme-modern/pages/TrackOrder.jsx';
import ModernCheckout from '../themes/theme-modern/pages/Checkout.jsx';

// Import theme-premium components
import PremiumHome from '../themes/theme-premium/pages/Home.jsx';
import PremiumCategory from '../themes/theme-premium/pages/Category.jsx';
import PremiumCategories from '../themes/theme-premium/pages/Categories.jsx';
import PremiumPolicy from '../themes/theme-premium/pages/Policy.jsx';
import PremiumTrackOrder from '../themes/theme-premium/pages/TrackOrder.jsx';
import PremiumCheckout from '../themes/theme-premium/pages/Checkout.jsx';

// Import theme-minimal components
import MinimalHome from '../themes/theme-minimal/pages/Home.jsx';
import MinimalCategory from '../themes/theme-minimal/pages/Category.jsx';
import MinimalCategories from '../themes/theme-minimal/pages/Categories.jsx';
import MinimalPolicy from '../themes/theme-minimal/pages/Policy.jsx';
import MinimalTrackOrder from '../themes/theme-minimal/pages/TrackOrder.jsx';
import MinimalCheckout from '../themes/theme-minimal/pages/Checkout.jsx';

// Import theme-giftshop components
import GiftshopHome from '../themes/theme-giftshop/pages/Home.jsx';
import GiftshopCategory from '../themes/theme-giftshop/pages/Category.jsx';
import GiftshopCategories from '../themes/theme-giftshop/pages/Categories.jsx';
import GiftshopPolicy from '../themes/theme-giftshop/pages/Policy.jsx';
import GiftshopTrackOrder from '../themes/theme-giftshop/pages/TrackOrder.jsx';
import GiftshopCheckout from '../themes/theme-giftshop/pages/Checkout.jsx';
import GiftshopProductDetails from '../themes/theme-giftshop/pages/ProductDetails.jsx';
import GiftshopOffers from '../themes/theme-giftshop/pages/Offers.jsx';

// Import theme-localshop components
import LocalshopHome from '../themes/theme-localshop/pages/Home.jsx';
import LocalshopCategory from '../themes/theme-localshop/pages/Category.jsx';
import LocalshopCategories from '../themes/theme-localshop/pages/Categories.jsx';
import LocalshopPolicy from '../themes/theme-localshop/pages/Policy.jsx';
import LocalshopTrackOrder from '../themes/theme-localshop/pages/TrackOrder.jsx';
import LocalshopCheckout from '../themes/theme-localshop/pages/Checkout.jsx';
import LocalshopProductDetails from '../themes/theme-localshop/pages/ProductDetails.jsx';
import LocalshopWriteReview from '../themes/theme-localshop/pages/WriteReview.jsx';
import LocalshopOffers from '../themes/theme-localshop/pages/Offers.jsx';

const themesMap = {
  'theme-free': { Home: FreeHome, Category: FreeCategory, Categories: FreeCategories, Policy: FreePolicy, TrackOrder: FreeTrackOrder, Checkout: FreeCheckout, WriteReview: FreeWriteReview, ProductDetails: FreeProductDetails, Offers: FreeHome },
  'theme-modern': { Home: ModernHome, Category: ModernCategory, Categories: ModernCategories, Policy: ModernPolicy, TrackOrder: ModernTrackOrder, Checkout: ModernCheckout, WriteReview: FreeWriteReview, ProductDetails: FreeProductDetails, Offers: ModernHome },
  'theme-premium': { Home: PremiumHome, Category: PremiumCategory, Categories: PremiumCategories, Policy: PremiumPolicy, TrackOrder: PremiumTrackOrder, Checkout: PremiumCheckout, WriteReview: FreeWriteReview, ProductDetails: FreeProductDetails, Offers: PremiumHome },
  'theme-minimal': { Home: MinimalHome, Category: MinimalCategory, Categories: MinimalCategories, Policy: MinimalPolicy, TrackOrder: MinimalTrackOrder, Checkout: MinimalCheckout, WriteReview: FreeWriteReview, ProductDetails: FreeProductDetails, Offers: MinimalHome },
  'theme-giftshop': { Home: GiftshopHome, Category: GiftshopCategory, Categories: GiftshopCategories, Policy: GiftshopPolicy, TrackOrder: GiftshopTrackOrder, Checkout: GiftshopCheckout, WriteReview: FreeWriteReview, ProductDetails: GiftshopProductDetails, Offers: GiftshopOffers },
  'theme-giftstore': { Home: GiftshopHome, Category: GiftshopCategory, Categories: GiftshopCategories, Policy: GiftshopPolicy, TrackOrder: GiftshopTrackOrder, Checkout: GiftshopCheckout, WriteReview: FreeWriteReview, ProductDetails: GiftshopProductDetails, Offers: GiftshopOffers },
  'theme-localshop': { Home: LocalshopHome, Category: LocalshopCategory, Categories: LocalshopCategories, Policy: LocalshopPolicy, TrackOrder: LocalshopTrackOrder, Checkout: LocalshopCheckout, WriteReview: LocalshopWriteReview, ProductDetails: LocalshopProductDetails, Offers: LocalshopOffers },
};


export const ThemeCustomizationContext = createContext(null);

const ThemeRenderer = () => {
  const [themeFolder, setThemeFolder] = useState('theme-free');
  const [loading, setLoading] = useState(true);
  const [customization, setCustomization] = useState(null);

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const headers = {
          'x-store-domain': window.location.hostname,
          'x-forwarded-host': window.location.hostname
        };

        // 1. Fetch the active theme from the resolved store context
        const res = await fetch(`${API_URL}/api/store/data`, { headers }); 
        let storeData = null;
        if (res.ok) {
          storeData = await res.json();
        }

        // 2. Support for Superadmin Live Preview (via URL query param)
        const urlParams = new URLSearchParams(window.location.search);
        const previewThemeFolder = urlParams.get('preview_theme');
        const previewThemeId = urlParams.get('preview_id');
        
        let resolvedTheme = 'theme-free';
        let actualThemeId = 'default';

        // Helper to strip "themes/" or slashes from the folder name
        const sanitizeFolder = (folder) => {
          if (!folder) return null;
          return folder.includes('/') ? folder.split('/').pop() : folder;
        };

        const cleanPreviewFolder = sanitizeFolder(previewThemeFolder);
        const cleanStoreFolder = sanitizeFolder(storeData?.themeFolder);
        const cleanStoreTheme = sanitizeFolder(storeData?.theme);

        if (cleanPreviewFolder) {
          resolvedTheme = themesMap[cleanPreviewFolder] ? cleanPreviewFolder : (themesMap[`theme-${cleanPreviewFolder}`] ? `theme-${cleanPreviewFolder}` : 'theme-free');
          actualThemeId = previewThemeId || cleanPreviewFolder.replace('theme-', '');
        } else if (storeData) {
          if (cleanStoreFolder && themesMap[cleanStoreFolder]) {
            resolvedTheme = cleanStoreFolder;
          } else if (cleanStoreTheme) {
            resolvedTheme = themesMap[cleanStoreTheme] ? cleanStoreTheme : (themesMap[`theme-${cleanStoreTheme}`] ? `theme-${cleanStoreTheme}` : 'theme-free');
          }
          actualThemeId = storeData.theme || 'default';
        }
        
        setThemeFolder(resolvedTheme);

        // 3. Fetch Theme Customizations
        const customRes = await fetch(`${API_URL}/api/theme-customization/public?themeId=${actualThemeId}`, { headers });
        if (customRes.ok) {
          const customData = await customRes.json();
          if (customData && Object.keys(customData).length > 0) {
            setCustomization(customData);
            applyThemeStyles(customData);
          }
        }

        // 4. Fetch and Inject Google & Tracking Settings
        try {
          const trackingRes = await fetch(`${API_URL}/api/tracking-settings/public`, { headers });
          if (trackingRes.ok) {
            const trackingData = await trackingRes.json();
            
            // a) Google Site Verification (Search Console)
            if (trackingData.googleSearchConsole?.enabled && trackingData.googleSearchConsole.verificationCode) {
              if (!document.querySelector('meta[name="google-site-verification"]')) {
                const meta = document.createElement('meta');
                meta.name = 'google-site-verification';
                let code = trackingData.googleSearchConsole.verificationCode;
                if (code.includes('content=')) {
                  const match = code.match(/content="([^"]+)"/);
                  if (match) code = match[1];
                } else if (code.includes('=')) {
                  code = code.split('=').pop().replace(/["']/g, '').trim();
                }
                meta.content = code;
                document.head.appendChild(meta);
              }
            }

            // b) Google Analytics 4 (GA4)
            if (trackingData.googleAnalytics?.enabled && trackingData.googleAnalytics.measurementId) {
              const gaId = trackingData.googleAnalytics.measurementId;
              if (!document.querySelector(`script[src*="${gaId}"]`)) {
                const script = document.createElement('script');
                script.async = true;
                script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
                document.head.appendChild(script);

                const inlineScript = document.createElement('script');
                inlineScript.innerHTML = `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}');
                `;
                document.head.appendChild(inlineScript);
              }
            }

            // c) Google Tag Manager (GTM)
            if (trackingData.googleTagManager?.enabled && trackingData.googleTagManager.containerId) {
              const gtmId = trackingData.googleTagManager.containerId;
              if (!document.querySelector(`script[src*="gtm.js?id=${gtmId}"]`)) {
                const inlineScript = document.createElement('script');
                inlineScript.innerHTML = `
                  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                  })(window,document,'script','dataLayer','${gtmId}');
                `;
                document.head.appendChild(inlineScript);

                if (!document.getElementById(`gtm-noscript-${gtmId}`)) {
                  const noscript = document.createElement('noscript');
                  noscript.id = `gtm-noscript-${gtmId}`;
                  noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
                  document.body.insertBefore(noscript, document.body.firstChild);
                }
              }
            }

            // d) Meta Pixel (Facebook Pixel)
            if (trackingData.facebookPixel?.enabled && trackingData.facebookPixel.pixelId) {
              const pixelId = trackingData.facebookPixel.pixelId;
              if (!document.querySelector(`script[src*="fbevents.js"]`)) {
                const inlineScript = document.createElement('script');
                inlineScript.innerHTML = `
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
                document.head.appendChild(inlineScript);

                if (!document.getElementById(`fb-noscript-${pixelId}`)) {
                  const noscript = document.createElement('noscript');
                  noscript.id = `fb-noscript-${pixelId}`;
                  noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />`;
                  document.body.appendChild(noscript);
                }
              }
            }
          }
        } catch (trackErr) {
          console.error("Failed to load or inject tracking tags", trackErr);
        }

        // 5. Fetch and Inject PWA Settings
        try {
          const pwaRes = await fetch(`${API_URL}/api/pwa/public`, { headers });
          if (pwaRes.ok) {
            const pwaData = await pwaRes.json();
            if (pwaData && pwaData.enabled) {
              // Generate dynamic manifest JSON
              const manifest = {
                name: pwaData.appName,
                short_name: pwaData.shortName,
                theme_color: pwaData.themeColor,
                background_color: pwaData.backgroundColor,
                display: "standalone",
                orientation: "portrait",
                scope: "/",
                start_url: window.location.origin + "/",
                icons: [
                  {
                    src: pwaData.icon192,
                    sizes: "192x192",
                    type: "image/png"
                  },
                  {
                    src: pwaData.icon512,
                    sizes: "512x512",
                    type: "image/png"
                  }
                ]
              };

              // Inject theme-color meta tag
              let themeColorMeta = document.querySelector('meta[name="theme-color"]');
              if (!themeColorMeta) {
                themeColorMeta = document.createElement('meta');
                themeColorMeta.name = 'theme-color';
                document.head.appendChild(themeColorMeta);
              }
              themeColorMeta.content = pwaData.themeColor;

              // Inject Apple mobile web app capabilities
              let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
              if (!appleMeta) {
                appleMeta = document.createElement('meta');
                appleMeta.name = 'apple-mobile-web-app-capable';
                appleMeta.content = 'yes';
                document.head.appendChild(appleMeta);
              }

              let appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
              if (!appleTitleMeta) {
                appleTitleMeta = document.createElement('meta');
                appleTitleMeta.name = 'apple-mobile-web-app-title';
                document.head.appendChild(appleTitleMeta);
              }
              appleTitleMeta.content = pwaData.shortName;

              // Inject Apple touch icons
              let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
              if (!appleIcon) {
                appleIcon = document.createElement('link');
                appleIcon.rel = 'apple-touch-icon';
                document.head.appendChild(appleIcon);
              }
              appleIcon.href = pwaData.icon192;

              // Build and inject manifest as dynamic Blob URL
              const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
              const manifestURL = URL.createObjectURL(blob);
              
              let manifestLink = document.querySelector('link[rel="manifest"]');
              if (!manifestLink) {
                manifestLink = document.createElement('link');
                manifestLink.rel = 'manifest';
                document.head.appendChild(manifestLink);
              }
              manifestLink.href = manifestURL;

              // Register PWA Service Worker
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js')
                  .then(reg => console.log('PWA Service Worker registered:', reg.scope))
                  .catch(err => console.error('PWA Service Worker registration failed:', err));
              }
            }
          }
        } catch (pwaErr) {
          console.error("Failed to load or inject PWA manifest", pwaErr);
        }
      } catch (err) {
        console.error("Failed to load store theme. Falling back to theme-free.", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTheme();
  }, []);

  // Dynamically inject CSS variables to the document root
  const applyThemeStyles = (data) => {
    const root = document.documentElement;
    if (data.global) {
      if (data.global.primaryColor) root.style.setProperty('--color-primary', data.global.primaryColor);
      if (data.global.secondaryColor) root.style.setProperty('--color-secondary', data.global.secondaryColor);
      if (data.global.borderRadius) root.style.setProperty('--border-radius', data.global.borderRadius);
      if (data.global.fontFamily) {
        document.body.style.fontFamily = data.global.fontFamily;
        
        // Dynamically load selected Google Font in storefront
        try {
          const fontName = data.global.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
          const standardFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Trebuchet MS', 'sans-serif', 'serif', 'monospace', 'system-ui'];
          if (fontName && !standardFonts.includes(fontName)) {
            const fontId = `google-font-${fontName.toLowerCase().replace(/\s+/g, '-')}`;
            if (!document.getElementById(fontId)) {
              const link = document.createElement('link');
              link.id = fontId;
              link.rel = 'stylesheet';
              link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700;800&display=swap`;
              document.head.appendChild(link);
            }
          }

          // Inject global style override to force all Tailwind and UI elements to use the selected font
          const styleId = 'dynamic-theme-font-overrides';
          let styleTag = document.getElementById(styleId);
          if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
          }
          styleTag.innerHTML = `
            body, html, .font-sans, button, input, select, textarea, [class*="font-"], h1, h2, h3, h4, h5, h6, p, span, a, li {
              font-family: ${data.global.fontFamily} !important;
            }
          `;
        } catch (e) {
          console.error("Failed to load custom web font:", e);
        }
      }
      
      if (data.global.officialfaviconimage) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = data.global.officialfaviconimage;
      }
    }
  };

  // Show a clean blank screen instead of text while resolving the store
  if (loading) {
    return <div className="min-h-screen bg-white"></div>;
  }

  // Fallback to theme-free if the active theme folder isn't in our map
  const ActiveTheme = themesMap[themeFolder] || themesMap['theme-free'];

  return (
    <ThemeCustomizationContext.Provider value={customization}>
      <Router>
          <Routes>
            <Route path="/" element={<DynamicRouteLoader ActiveTheme={ActiveTheme} componentName="Home" />} />
            <Route path="/category/:categoryId" element={<ActiveTheme.Category />} />
            <Route path="/categories" element={<ActiveTheme.Categories />} />
            <Route path="/offers" element={<ActiveTheme.Offers />} />
            <Route path="/policy/:slug" element={<ActiveTheme.Policy />} />
            <Route path="/track" element={<ActiveTheme.TrackOrder />} />
            <Route path="/track/:orderId" element={<ActiveTheme.TrackOrder />} />
            <Route path="/checkout" element={<ActiveTheme.Checkout />} />
            <Route path="/review/:orderId/:productId" element={<ActiveTheme.WriteReview />} />
            <Route path="/product/:productId" element={<ActiveTheme.ProductDetails />} />
            <Route path="*" element={<DynamicRouteLoader ActiveTheme={ActiveTheme} componentName="NotFound" />} />
          </Routes>
      </Router>
    </ThemeCustomizationContext.Provider>
  );
};

export default ThemeRenderer;