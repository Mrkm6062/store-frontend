import React, { useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import CustomPageRenderer from './CustomPageRenderer.jsx';

const DynamicRouteLoader = ({ ActiveTheme, componentName }) => {
  const location = useLocation();
  const [customPage, setCustomPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCustomPage, setIsCustomPage] = useState(false);

  useEffect(() => {
    const checkCustomPage = async () => {
      setLoading(true);
      setIsCustomPage(false);
      setCustomPage(null);

      const API_URL = import.meta.env.VITE_API_URL || '';
      const headers = {
        'x-store-domain': window.location.hostname,
        'x-forwarded-host': window.location.hostname
      };

      const path = location.pathname;

      // Immediately bypass reserved system files so React Router or CMS never intercepts them
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
      if (reservedSlugs.includes(slug)) {
        setLoading(false);
        return;
      }

      try {
        if (path === '/') {
          // 1. Check if there is a custom homepage configured
          const res = await fetch(`${API_URL}/api/custom-pages/homepage`, { headers });
          if (res.ok) {
            const page = await res.json();
            if (page && page._id) {
              setCustomPage(page);
              setIsCustomPage(true);
            }
          }
        } else {
          // 2. Check if there is a custom page matching this slug
          const slug = path.toLowerCase().replace(/^\/|\/$/g, '');
          const res = await fetch(`${API_URL}/api/custom-pages/page/${slug}`, { headers });
          if (res.ok) {
            const page = await res.json();
            if (page && page._id) {
              setCustomPage(page);
              setIsCustomPage(true);
            }
          }
        }
      } catch (err) {
        console.error("Error checking custom page:", err);
      } finally {
        setLoading(false);
      }
    };

    checkCustomPage();
  }, [location.pathname]);

  if (loading) {
    // Return a clean blank loading state to prevent page flicker while resolving the router
    return <div className="min-h-screen bg-white"></div>;
  }

  if (isCustomPage && customPage) {
    return <CustomPageRenderer pageData={customPage} />;
  }

  // Fallback to active theme components
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
