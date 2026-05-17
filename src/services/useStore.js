import { useState, useEffect } from 'react';
import { getStoreInfo } from './api';

export const useStore = () => {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const data = await getStoreInfo();
        setStore(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStore();
  }, []);

  return { store, loading, error };
};