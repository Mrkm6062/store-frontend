import React, { useEffect } from 'react';

const CustomPageRenderer = ({ pageData }) => {
  useEffect(() => {
    if (!pageData) return;

    // 1. Inject SEO document Title
    document.title = pageData.seo?.metaTitle || pageData.title;

    // Helper to update/create meta tags dynamically
    const updateMetaTag = (name, property, content) => {
      if (!content) return;
      let el = null;
      if (name) el = document.querySelector(`meta[name="${name}"]`);
      if (property) el = document.querySelector(`meta[property="${property}"]`);

      if (!el) {
        el = document.createElement('meta');
        if (name) el.setAttribute('name', name);
        if (property) el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    updateMetaTag('description', null, pageData.seo?.metaDescription || pageData.description);
    updateMetaTag('keywords', null, pageData.seo?.keywords);
    updateMetaTag('robots', null, pageData.seo?.robots || 'index, follow');
    updateMetaTag('author', null, pageData.author || '');

    // OpenGraph tags
    updateMetaTag(null, 'og:title', pageData.seo?.ogTitle || pageData.title);
    updateMetaTag(null, 'og:description', pageData.seo?.ogDescription || pageData.description);
    updateMetaTag(null, 'og:image', pageData.seo?.ogImage || pageData.thumbnail || '');
    updateMetaTag(null, 'og:type', 'website');
    updateMetaTag(null, 'og:url', window.location.href);

    // Twitter Card tags
    updateMetaTag('twitter:card', null, 'summary_large_image');
    updateMetaTag('twitter:title', null, pageData.seo?.ogTitle || pageData.title);
    updateMetaTag('twitter:description', null, pageData.seo?.ogDescription || pageData.description);
    updateMetaTag('twitter:image', null, pageData.seo?.ogImage || pageData.thumbnail || '');

    // Canonical link tag
    const canonicalUrl = pageData.seo?.canonical || window.location.href;
    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);

    // Favicon link tag
    if (pageData.favicon) {
      let faviconEl = document.querySelector('link[rel="icon"]');
      if (!faviconEl) {
        faviconEl = document.createElement('link');
        faviconEl.setAttribute('rel', 'icon');
        document.head.appendChild(faviconEl);
      }
      faviconEl.setAttribute('href', pageData.favicon);
    }

    // Inject JSON-LD Schema (Structured Data)
    const schemaId = 'custom-page-jsonld';
    let schemaEl = document.getElementById(schemaId);
    if (!schemaEl) {
      schemaEl = document.createElement('script');
      schemaEl.id = schemaId;
      schemaEl.type = 'application/ld+json';
      document.head.appendChild(schemaEl);
    }
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": pageData.title,
      "description": pageData.seo?.metaDescription || pageData.description,
      "publisher": {
        "@type": "Organization",
        "name": window.location.hostname
      }
    };
    schemaEl.text = JSON.stringify(jsonLd);

    return () => {
      // Cleanup jsonld tag on navigating away
      if (schemaEl) schemaEl.remove();
    };
  }, [pageData]);

  const compileSource = () => {
    if (!pageData) return '';
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${pageData.headHTML || ''}
          <style>
            ${pageData.customCSS || ''}
          </style>
        </head>
        <body>
          ${pageData.bodyHTML || ''}
          <script>
            window.onerror = function(message, source, lineno, colno, error) {
              console.error(message + " on line " + lineno);
              return true;
            };
            try {
              ${pageData.customJS || ''}
            } catch(e) {
              console.error("Custom JS Error: " + e.message);
            }
          </script>
        </body>
      </html>
    `;
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-white m-0 p-0">
      <iframe
        title={pageData.title}
        srcDoc={compileSource()}
        sandbox="allow-scripts"
        className="w-full h-full border-none m-0 p-0"
      />
    </div>
  );
};

export default CustomPageRenderer;
