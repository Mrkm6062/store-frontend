import React, { useState, useEffect } from 'react';
import { getPublicPolicies } from './api';

const StorePolicy = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const data = await getPublicPolicies();
        setPolicies(data);
      } catch (error) {
        console.error("Failed to fetch policies:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicies();
  }, []);

  if (loading || policies.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-200 mt-8">
      <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-8">Store Policies</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {policies.map((policy) => (
          <div key={policy._id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-3">{policy.title}</h3>
            <p className="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm">{policy.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StorePolicy;