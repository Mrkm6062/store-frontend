import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { useStore } from './useStore';
import StoreLayout from './StoreLayout';
import { getPublicPolicies } from './api';

const PolicyPage = () => {
  const { slug } = useParams();
  const location = useLocation();
  const { store, loading: storeLoading } = useStore();
  
  // Instantly load policy from <Link> state, or fetch manually if accessed via direct URL
  const [policy, setPolicy] = useState(location.state?.policy || null);
  const [loading, setLoading] = useState(!policy);

  useEffect(() => {
    if (!policy) {
      const fetchPolicies = async () => {
        try {
          const data = await getPublicPolicies();
          const found = data.find(p => p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug);
          setPolicy(found);
        } catch (error) {
          console.error("Failed to fetch policy", error);
        } finally {
          setLoading(false);
        }
      };
      fetchPolicies();
    }
  }, [policy, slug]);

  if (storeLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-green-600 font-bold text-xl"><span className="animate-pulse">Loading Policy...</span></div>;
  if (!policy) return <Navigate to="/" />;

  return (
    <StoreLayout store={store} cartCount={0} onCartClick={() => alert('Please return to the home page to view your cart.')}>
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-8">{policy.title}</h1>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-gray-700 whitespace-pre-wrap leading-relaxed">
          {policy.description}
        </div>
      </div>
    </StoreLayout>
  );
};

export default PolicyPage;