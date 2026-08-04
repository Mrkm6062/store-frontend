import React, { useEffect, useState } from 'react';

const CustomPageRenderer = ({ pageData }) => {
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
        console.error("Failed to load tracking settings in CustomPageRenderer:", err);
      }
    };

    fetchTracking();
  }, []);

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

  // Inject tracking scripts to parent window (useful for Google Site Verification / GSC and tags)
  useEffect(() => {
    if (!trackingSettings) return;

    const cleanupElements = [];

    // 1. Google Site Verification
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

    // 2. Google Analytics 4
    if (trackingSettings.googleAnalytics?.enabled && trackingSettings.googleAnalytics.measurementId) {
      const gaId = trackingSettings.googleAnalytics.measurementId;
      if (!document.querySelector(`script[src*="${gaId}"]`)) {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        document.head.appendChild(script);
        cleanupElements.push(script);

        const inlineScript = document.createElement('script');
        inlineScript.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `;
        document.head.appendChild(inlineScript);
        cleanupElements.push(inlineScript);
      }
    }

    // 3. Google Tag Manager
    if (trackingSettings.googleTagManager?.enabled && trackingSettings.googleTagManager.containerId) {
      const gtmId = trackingSettings.googleTagManager.containerId;
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
        cleanupElements.push(inlineScript);

        if (!document.getElementById(`gtm-noscript-${gtmId}`)) {
          const noscript = document.createElement('noscript');
          noscript.id = `gtm-noscript-${gtmId}`;
          noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
          document.body.insertBefore(noscript, document.body.firstChild);
          cleanupElements.push(noscript);
        }
      }
    }

    // 4. Facebook Pixel
    if (trackingSettings.facebookPixel?.enabled && trackingSettings.facebookPixel.pixelId) {
      const pixelId = trackingSettings.facebookPixel.pixelId;
      if (!document.querySelector(`script[src*="fbevents.js"]`)) {
        const inlineScript = document.createElement('script');
        inlineScript.innerHTML = `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `;
        document.head.appendChild(inlineScript);
        cleanupElements.push(inlineScript);

        if (!document.getElementById(`fb-noscript-${pixelId}`)) {
          const noscript = document.createElement('noscript');
          noscript.id = `fb-noscript-${pixelId}`;
          noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />`;
          document.body.appendChild(noscript);
          cleanupElements.push(noscript);
        }
      }
    }

    return () => {
      cleanupElements.forEach(el => {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    };
  }, [trackingSettings]);



  const compileSource = () => {
    if (!pageData) return '';

    // Search Console meta tag
    let verificationMeta = '';
    if (trackingSettings?.googleSearchConsole?.enabled && trackingSettings.googleSearchConsole.verificationCode) {
      let code = trackingSettings.googleSearchConsole.verificationCode;
      if (code.includes('content=')) {
        const match = code.match(/content="([^"]+)"/);
        if (match) code = match[1];
      } else if (code.includes('=')) {
        code = code.split('=').pop().replace(/["']/g, '').trim();
      }
      verificationMeta = `<meta name="google-site-verification" content="${code}">`;
    }

    // GA4 tags
    let gaScript = '';
    if (trackingSettings?.googleAnalytics?.enabled && trackingSettings.googleAnalytics.measurementId) {
      const gaId = trackingSettings.googleAnalytics.measurementId;
      gaScript = `
        <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        </script>
      `;
    }

    // GTM tags
    let gtmHeadScript = '';
    let gtmBodyScript = '';
    if (trackingSettings?.googleTagManager?.enabled && trackingSettings.googleTagManager.containerId) {
      const gtmId = trackingSettings.googleTagManager.containerId;
      gtmHeadScript = `
        <script>
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${gtmId}');
        </script>
      `;
      gtmBodyScript = `
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
      `;
    }

    // Facebook Pixel tags
    let fbPixelHeadScript = '';
    let fbPixelBodyScript = '';
    if (trackingSettings?.facebookPixel?.enabled && trackingSettings.facebookPixel.pixelId) {
      const pixelId = trackingSettings.facebookPixel.pixelId;
      fbPixelHeadScript = `
        <script>
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
        </script>
      `;
      fbPixelBodyScript = `
        <noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" /></noscript>
      `;
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <base href="${window.location.href}">
          ${verificationMeta}
          ${gaScript}
          ${gtmHeadScript}
          ${fbPixelHeadScript}
          ${pageData.headHTML || ''}
          <style>
            ${pageData.customCSS || ''}
          </style>
        </head>
        <body>
          ${gtmBodyScript}
          ${fbPixelBodyScript}
          ${pageData.bodyHTML || ''}
          <script>
            window.onerror = function(message, source, lineno, colno, error) {
              console.error(message + " on line " + lineno);
              return true;
            };

            // Intercept internal link clicks to navigate the top-level parent window instead of inside the iframe
            document.addEventListener('click', function(e) {
              var target = e.target.closest('a');
              if (target && target.href) {
                var hrefAttr = target.getAttribute('href') || '';
                if (hrefAttr.startsWith('#') || hrefAttr.startsWith('javascript:')) {
                  return; // Let local anchors and js links execute inside the iframe
                }

                if (!target.target || target.target === '_self') {
                  try {
                    var url = new URL(target.href);
                    if (url.origin === window.parent.location.origin) {
                      e.preventDefault();
                      
                      var path = url.pathname + url.search + url.hash;
                      if (window.parent && typeof window.parent.navigateToStorePath === 'function') {
                        window.parent.navigateToStorePath(path);
                      } else {
                        window.parent.location.href = target.href;
                      }
                    }
                  } catch (err) {
                    // Ignore parsing errors
                  }
                }
              }
            });

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
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation allow-modals"
        className="w-full h-full border-none m-0 p-0"
      />
    </div>
  );
};

export default CustomPageRenderer;
