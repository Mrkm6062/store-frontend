import React, { useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import CustomPageRenderer from './CustomPageRenderer.jsx';

const DynamicRouteLoader = ({ ActiveTheme, componentName }) => {
  const location = useLocation();

  const [customPage, setCustomPage] = useState(() => {
    try {
      const path = location.pathname;
      const cached = localStorage.getItem(`gbs_custom_page_${path}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed._id) return parsed;
      }
    } catch (e) {}
    return null;
  });

  const [isCustomPage, setIsCustomPage] = useState(!!customPage);

  useEffect(() => {
    let isMounted = true;
    const checkCustomPage = async () => {
      const path = location.pathname;
      const cacheKey = `gbs_custom_page_${path}`;

      // Check synchronous cache first
      try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          if (parsed && parsed._id && isMounted) {
            setCustomPage(parsed);
            setIsCustomPage(true);
          }
        }
      } catch (e) {}

      // Bypass reserved system files
      const slug = path.toLowerCase().replace(/^\/|\/$/g, '');
      const reservedSlugs = [
        "manifest.webmanifest",
        "manifest.json",
        "sw.js",
        "robots.txt",
        "sitemap.xml",
        "favicon.ico",
        "llms.txt"
      ];
      if (reservedSlugs.includes(slug)) return;

      const API_URL = import.meta.env.VITE_API_URL || '';
      const headers = {
        'x-store-domain': window.location.hostname,
        'x-forwarded-host': window.location.hostname
      };

      try {
        let page = null;
        if (path === '/') {
          const res = await fetch(`${API_URL}/api/custom-pages/homepage`, { headers });
          if (res.ok) page = await res.json();
        } else {
          const res = await fetch(`${API_URL}/api/custom-pages/page/${slug}`, { headers });
          if (res.ok) page = await res.json();
        }

        if (!isMounted) return;

        if (page && page._id) {
          setCustomPage(page);
          setIsCustomPage(true);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(page));
          } catch (e) {}
        } else {
          setCustomPage(null);
          setIsCustomPage(false);
          localStorage.removeItem(cacheKey);
        }
      } catch (err) {
        console.error("Error checking custom page:", err);
      }
    };

    checkCustomPage();
    return () => { isMounted = false; };
  }, [location.pathname]);

  if (isCustomPage && customPage) {
    return <CustomPageRenderer pageData={customPage} />;
  }

  // Render theme components instantly with zero delay or white screen
  switch (componentName) {
    case 'Home':
      return <ActiveTheme.Home />;
    case 'Category':
      return <ActiveTheme.Category />;
    case 'Categories':
      return <ActiveTheme.Categories />;
    case 'Offers':
      return <ActiveTheme.Offers />;
    case 'Policy':
      return <ActiveTheme.Policy />;
    case 'TrackOrder':
      return <ActiveTheme.TrackOrder />;
    case 'Checkout':
      return <ActiveTheme.Checkout />;
    case 'WriteReview':
      return <ActiveTheme.WriteReview />;
    case 'ProductDetails':
      return <ActiveTheme.ProductDetails />;
    default:
      return <Navigate to="/" />;
  }
};

export default DynamicRouteLoader;
