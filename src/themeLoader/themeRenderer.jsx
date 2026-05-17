import React, { Suspense, lazy } from "react";

// Define a map of lazy-loaded themes. This ensures Vite creates separate chunks
// for each theme, and the browser only downloads the CSS/JS for the active theme.
const themeMap = {
  'default': lazy(() => import('../themes/theme1/Layout')), // Adjust to your actual default layout path
  'theme-free': lazy(() => import('../themes/theme-free/Layout')),
  'minimal': lazy(() => import('../themes/minimal/Layout')),
  'modern': lazy(() => import('../themes/modern/Layout')),
  'premium': lazy(() => import('../themes/premium/Layout')),
};

const ThemeRenderer = ({ theme, storeData }) => {
  // Check if there is a preview theme in the URL
  const urlParams = new URLSearchParams(window.location.search);
  const previewTheme = urlParams.get('preview_theme');

  const activeThemeId = previewTheme || theme;

  // Fallback to the 'default' theme if the requested theme doesn't exist
  const SelectedTheme = themeMap[activeThemeId] || themeMap['default'];

  return (
    <Suspense fallback={<div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', color: '#666', fontFamily: 'sans-serif' }}>Loading store...</div>}>
      <SelectedTheme storeData={storeData} />
    </Suspense>
  );
};

export default ThemeRenderer;