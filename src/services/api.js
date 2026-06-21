const API_BASE = import.meta.env.VITE_API_URL;

// 🔥 Extract subdomain from URL
const getSubdomain = () => {
  const host = window.location.hostname; // sabjiwala.galibrand.cloud
  const parts = host.split(".");

  // Fix for testing on localhost (e.g., sabjiwala.localhost)
  if (host.includes("localhost") && parts.length >= 2) {
    return parts[0].toLowerCase();
  }

  if (parts.length > 2) {
    return parts[0].toLowerCase();
  }

  return null;
};

// 🔹 Generic fetch wrapper
const request = async (endpoint, options = {}) => {
  const currentSubdomain = getSubdomain();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(currentSubdomain && { "x-store": currentSubdomain }),
      ...(options.headers || {})
    },
  });

  if (!res.ok) {
    throw new Error("API request failed");
  }

  return res.json();
};

// ✅ Store API
export const getStoreInfo = () => {
  return request("/api/store/tenant/info");
};

// ✅ Products API
export const getProducts = () => {
  return request("/api/store/tenant/products");
};

// ✅ Orders API
export const placeOrder = (orderData) => {
  return request("/api/orders", {
    method: "POST",
    body: JSON.stringify(orderData)
  });
};

// ✅ Policies API
export const getPublicPolicies = () => {
  return request("/api/policies/public");
};

// ✅ Social Media API
export const getPublicSocialMedia = () => {
  return request("/api/social-media/public");
};

// ✅ Categories API
export const getPublicCategories = () => {
  return request("/api/categories/public");
};

// ✅ Image Optimization helpers
export const getOptimizedImageUrl = (url, width) => {
  if (!url) return '';
  if (!url.includes('storage.googleapis.com/')) {
    return url;
  }
  const match = url.match(/storage\.googleapis\.com\/([^/]+)\/(.+)$/);
  if (match) {
    const relativePath = match[2];
    const whitelistedWidths = [80, 186, 56, 323, 600];
    if (whitelistedWidths.includes(width)) {
      return `${API_BASE || ''}/api/images/${relativePath}?w=${width}`;
    }
  }
  return url;
};

export const getImageProps = (url, fallbackWidth = 600, customSizes) => {
  if (!url) return { src: '' };
  if (!url.includes('storage.googleapis.com/')) {
    return { src: url };
  }
  const match = url.match(/storage\.googleapis\.com\/([^/]+)\/(.+)$/);
  if (match) {
    const relativePath = match[2];
    const baseUrl = `${API_BASE || ''}/api/images/${relativePath}`;
    
    // Default sizes based on fallback width
    const defaultSizes = fallbackWidth === 323 
      ? "(max-width: 640px) 50vw, 323px" 
      : "(max-width: 768px) 100vw, 600px";

    return {
      src: `${baseUrl}?w=${fallbackWidth}`,
      srcSet: `${baseUrl}?w=323 323w, ${baseUrl}?w=600 600w, ${url} 1200w`,
      sizes: customSizes || defaultSizes
    };
  }
  return { src: url };
};
