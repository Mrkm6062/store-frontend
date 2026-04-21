const API = import.meta.env.VITE_API_URL;

export const getStore = async () => {
  const response = await fetch(`${API}/api/store/tenant/info`);
  if (!response.ok) throw new Error('Store not available');
  return response.json();
};

export const getProducts = async () => {
  const response = await fetch(`${API}/api/store/tenant/products`);
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
};