import React, { useState, useEffect, Suspense, lazy, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Lazy load theme-free components
const FreeHome = lazy(() => import('../themes/theme-free/pages/Home.jsx'));
const FreeCategory = lazy(() => import('../themes/theme-free/pages/Category.jsx'));
const FreeCategories = lazy(() => import('../themes/theme-free/pages/Categories.jsx'));
const FreePolicy = lazy(() => import('../themes/theme-free/pages/Policy.jsx'));
const FreeTrackOrder = lazy(() => import('../themes/theme-free/pages/TrackOrder.jsx'));
const FreeCheckout = lazy(() => import('../themes/theme-free/pages/Checkout.jsx'));
const FreeWriteReview = lazy(() => import('../themes/theme-free/pages/WriteReview.jsx'));
const FreeProductDetails = lazy(() => import('../themes/theme-free/pages/ProductDetails.jsx'));

// Lazy load theme-modern components
const ModernHome = lazy(() => import('../themes/theme-modern/pages/Home.jsx').catch(() => import('../themes/theme-free/pages/Home.jsx')));
const ModernCategory = lazy(() => import('../themes/theme-modern/pages/Category.jsx').catch(() => import('../themes/theme-free/pages/Category.jsx')));
const ModernCategories = lazy(() => import('../themes/theme-modern/pages/Categories.jsx').catch(() => import('../themes/theme-free/pages/Categories.jsx')));
const ModernPolicy = lazy(() => import('../themes/theme-modern/pages/Policy.jsx').catch(() => import('../themes/theme-free/pages/Policy.jsx')));
const ModernTrackOrder = lazy(() => import('../themes/theme-modern/pages/TrackOrder.jsx').catch(() => import('../themes/theme-free/pages/TrackOrder.jsx')));
const ModernCheckout = lazy(() => import('../themes/theme-modern/pages/Checkout.jsx').catch(() => import('../themes/theme-free/pages/Checkout.jsx')));

// Lazy load theme-premium components
const PremiumHome = lazy(() => import('../themes/theme-premium/pages/Home.jsx').catch(() => import('../themes/theme-free/pages/Home.jsx')));
const PremiumCategory = lazy(() => import('../themes/theme-premium/pages/Category.jsx').catch(() => import('../themes/theme-free/pages/Category.jsx')));
const PremiumCategories = lazy(() => import('../themes/theme-premium/pages/Categories.jsx').catch(() => import('../themes/theme-free/pages/Categories.jsx')));
const PremiumPolicy = lazy(() => import('../themes/theme-premium/pages/Policy.jsx').catch(() => import('../themes/theme-free/pages/Policy.jsx')));
const PremiumTrackOrder = lazy(() => import('../themes/theme-premium/pages/TrackOrder.jsx').catch(() => import('../themes/theme-free/pages/TrackOrder.jsx')));
const PremiumCheckout = lazy(() => import('../themes/theme-premium/pages/Checkout.jsx').catch(() => import('../themes/theme-free/pages/Checkout.jsx')));

// Lazy load theme-minimal components
const MinimalHome = lazy(() => import('../themes/theme-minimal/pages/Home.jsx').catch(() => import('../themes/theme-free/pages/Home.jsx')));
const MinimalCategory = lazy(() => import('../themes/theme-minimal/pages/Category.jsx').catch(() => import('../themes/theme-free/pages/Category.jsx')));
const MinimalCategories = lazy(() => import('../themes/theme-minimal/pages/Categories.jsx').catch(() => import('../themes/theme-free/pages/Categories.jsx')));
const MinimalPolicy = lazy(() => import('../themes/theme-minimal/pages/Policy.jsx').catch(() => import('../themes/theme-free/pages/Policy.jsx')));
const MinimalTrackOrder = lazy(() => import('../themes/theme-minimal/pages/TrackOrder.jsx').catch(() => import('../themes/theme-free/pages/TrackOrder.jsx')));
const MinimalCheckout = lazy(() => import('../themes/theme-minimal/pages/Checkout.jsx').catch(() => import('../themes/theme-free/pages/Checkout.jsx')));

// Lazy load theme-giftshop components
const GiftshopHome = lazy(() => import('../themes/theme-giftshop/pages/Home.jsx').catch(() => import('../themes/theme-free/pages/Home.jsx')));
const GiftshopCategory = lazy(() => import('../themes/theme-giftshop/pages/Category.jsx').catch(() => import('../themes/theme-free/pages/Category.jsx')));
const GiftshopCategories = lazy(() => import('../themes/theme-giftshop/pages/Categories.jsx').catch(() => import('../themes/theme-free/pages/Categories.jsx')));
const GiftshopPolicy = lazy(() => import('../themes/theme-giftshop/pages/Policy.jsx').catch(() => import('../themes/theme-free/pages/Policy.jsx')));
const GiftshopTrackOrder = lazy(() => import('../themes/theme-giftshop/pages/TrackOrder.jsx').catch(() => import('../themes/theme-free/pages/TrackOrder.jsx')));
const GiftshopCheckout = lazy(() => import('../themes/theme-giftshop/pages/Checkout.jsx').catch(() => import('../themes/theme-free/pages/Checkout.jsx')));

const themesMap = {
  'theme-free': { Home: FreeHome, Category: FreeCategory, Categories: FreeCategories, Policy: FreePolicy, TrackOrder: FreeTrackOrder, Checkout: FreeCheckout, WriteReview: FreeWriteReview, ProductDetails: FreeProductDetails },
  'theme-modern': { Home: ModernHome, Category: ModernCategory, Categories: ModernCategories, Policy: ModernPolicy, TrackOrder: ModernTrackOrder, Checkout: ModernCheckout, WriteReview: FreeWriteReview, ProductDetails: FreeProductDetails },
  'theme-premium': { Home: PremiumHome, Category: PremiumCategory, Categories: PremiumCategories, Policy: PremiumPolicy, TrackOrder: PremiumTrackOrder, Checkout: PremiumCheckout, WriteReview: FreeWriteReview, ProductDetails: FreeProductDetails },
  'theme-minimal': { Home: MinimalHome, Category: MinimalCategory, Categories: MinimalCategories, Policy: MinimalPolicy, TrackOrder: MinimalTrackOrder, Checkout: MinimalCheckout, WriteReview: FreeWriteReview, ProductDetails: FreeProductDetails },
  'theme-giftshop': { Home: GiftshopHome, Category: GiftshopCategory, Categories: GiftshopCategories, Policy: GiftshopPolicy, TrackOrder: GiftshopTrackOrder, Checkout: GiftshopCheckout, WriteReview: FreeWriteReview, ProductDetails: FreeProductDetails },
  'theme-giftstore': { Home: GiftshopHome, Category: GiftshopCategory, Categories: GiftshopCategories, Policy: GiftshopPolicy, TrackOrder: GiftshopTrackOrder, Checkout: GiftshopCheckout, WriteReview: FreeWriteReview, ProductDetails: FreeProductDetails },
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

        if (previewThemeFolder) {
          resolvedTheme = themesMap[previewThemeFolder] ? previewThemeFolder : (themesMap[`theme-${previewThemeFolder}`] ? `theme-${previewThemeFolder}` : 'theme-free');
          actualThemeId = previewThemeId || previewThemeFolder.replace('theme-', '');
        } else if (storeData) {
          if (storeData.themeFolder && themesMap[storeData.themeFolder]) {
            resolvedTheme = storeData.themeFolder;
          } else if (storeData.theme) {
            resolvedTheme = themesMap[storeData.theme] ? storeData.theme : (themesMap[`theme-${storeData.theme}`] ? `theme-${storeData.theme}` : 'theme-free');
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
        <Suspense fallback={<div className="min-h-screen bg-white"></div>}>
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
        </Suspense>
      </Router>
    </ThemeCustomizationContext.Provider>
  );
};

export default ThemeRenderer;