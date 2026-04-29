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