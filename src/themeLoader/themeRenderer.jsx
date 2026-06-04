import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import theme-free components
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

const themesMap = {
  'theme-free': { Home: FreeHome, Category: FreeCategory, Categories: FreeCategories, Policy: FreePolicy, TrackOrder: FreeTrackOrder, Checkout: FreeCheckout, WriteReview: FreeWriteReview, ProductDetails: FreeProductDetails },
  'theme-modern': { Home: ModernHome, Category: ModernCategory, Categories: ModernCategories, Policy: ModernPolicy, TrackOrder: ModernTrackOrder, Checkout: ModernCheckout, WriteReview: FreeWriteReview, ProductDetails: FreeProductDetails },
  'theme-premium': { Home: PremiumHome, Category: PremiumCategory, Categories: PremiumCategories, Policy: PremiumPolicy, TrackOrder: PremiumTrackOrder, Checkout: PremiumCheckout, WriteReview: FreeWriteReview, ProductDetails: FreeProductDetails },
  'theme-minimal': { Home: MinimalHome, Category: MinimalCategory, Categories: MinimalCategories, Policy: MinimalPolicy, TrackOrder: MinimalTrackOrder, Checkout: MinimalCheckout, WriteReview: FreeWriteReview, ProductDetails: FreeProductDetails },
  'theme-giftshop': { Home: GiftshopHome, Category: GiftshopCategory, Categories: GiftshopCategories, Policy: GiftshopPolicy, TrackOrder: GiftshopTrackOrder, Checkout: GiftshopCheckout, WriteReview: FreeWriteReview, ProductDetails: GiftshopProductDetails },
  'theme-giftstore': { Home: GiftshopHome, Category: GiftshopCategory, Categories: GiftshopCategories, Policy: GiftshopPolicy, TrackOrder: GiftshopTrackOrder, Checkout: GiftshopCheckout, WriteReview: FreeWriteReview, ProductDetails: GiftshopProductDetails },
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
      if (data.global.fontFamily) document.body.style.fontFamily = data.global.fontFamily;
      
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
            <Route path="/" element={<ActiveTheme.Home />} />
            <Route path="/category/:categoryId" element={<ActiveTheme.Category />} />
            <Route path="/categories" element={<ActiveTheme.Categories />} />
            <Route path="/policy/:slug" element={<ActiveTheme.Policy />} />
            <Route path="/track" element={<ActiveTheme.TrackOrder />} />
            <Route path="/track/:orderId" element={<ActiveTheme.TrackOrder />} />
            <Route path="/checkout" element={<ActiveTheme.Checkout />} />
            <Route path="/review/:orderId/:productId" element={<ActiveTheme.WriteReview />} />
            <Route path="/product/:productId" element={<ActiveTheme.ProductDetails />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
      </Router>
    </ThemeCustomizationContext.Provider>
  );
};

export default ThemeRenderer;