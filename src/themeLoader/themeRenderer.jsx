import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Lazy load theme-free components
const FreeHome = lazy(() => import('../themes/theme-free/pages/Home.jsx'));
const FreeCategory = lazy(() => import('../themes/theme-free/pages/Category.jsx'));
const FreeCategories = lazy(() => import('../themes/theme-free/pages/Categories.jsx'));
const FreePolicy = lazy(() => import('../themes/theme-free/pages/Policy.jsx'));
const FreeTrackOrder = lazy(() => import('../themes/theme-free/pages/TrackOrder.jsx'));
const FreeCheckout = lazy(() => import('../themes/theme-free/pages/Checkout.jsx'));

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

const themesMap = {
  'theme-free': { Home: FreeHome, Category: FreeCategory, Categories: FreeCategories, Policy: FreePolicy, TrackOrder: FreeTrackOrder, Checkout: FreeCheckout },
  'theme-modern': { Home: ModernHome, Category: ModernCategory, Categories: ModernCategories, Policy: ModernPolicy, TrackOrder: ModernTrackOrder, Checkout: ModernCheckout },
  'theme-premium': { Home: PremiumHome, Category: PremiumCategory, Categories: PremiumCategories, Policy: PremiumPolicy, TrackOrder: PremiumTrackOrder, Checkout: PremiumCheckout },
  'theme-minimal': { Home: MinimalHome, Category: MinimalCategory, Categories: MinimalCategories, Policy: MinimalPolicy, TrackOrder: MinimalTrackOrder, Checkout: MinimalCheckout },
};

const ThemeRenderer = () => {
  const [themeFolder, setThemeFolder] = useState('theme-free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        // 1. Support for Superadmin Live Preview (via URL query param)
        const urlParams = new URLSearchParams(window.location.search);
        const previewTheme = urlParams.get('preview_theme') || urlParams.get('theme');
        
        let resolvedTheme = 'theme-free';

        if (previewTheme) {
          // Smart fallback: supports both "theme-modern" and just "modern"
          resolvedTheme = themesMap[previewTheme] ? previewTheme : (themesMap[`theme-${previewTheme}`] ? `theme-${previewTheme}` : 'theme-free');
          setThemeFolder(resolvedTheme);
          setLoading(false);
          return;
        }

        // 2. Fetch the active theme from the resolved store context
        const API_URL = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${API_URL}/api/store/data`, {
          headers: {
            'x-store-domain': window.location.hostname,
            'x-forwarded-host': window.location.hostname
          }
        }); 
        
        if (res.ok) {
          const storeData = await res.json();
          if (storeData.theme) {
            resolvedTheme = themesMap[storeData.theme] ? storeData.theme : (themesMap[`theme-${storeData.theme}`] ? `theme-${storeData.theme}` : 'theme-free');
          }
        }
        
        setThemeFolder(resolvedTheme);
      } catch (err) {
        console.error("Failed to load store theme. Falling back to theme-free.", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTheme();
  }, []);

  // Show a clean blank screen instead of text while resolving the store
  if (loading) {
    return <div className="min-h-screen bg-white"></div>;
  }

  // Fallback to theme-free if the active theme folder isn't in our map
  const ActiveTheme = themesMap[themeFolder] || themesMap['theme-free'];

  return (
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
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default ThemeRenderer;