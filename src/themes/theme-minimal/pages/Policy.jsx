import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { useStore } from '../../../services/useStore';
import StoreLayout from '../Layout';
import { getPublicPolicies } from '../../../services/api';
import { formatPolicyHtml } from '../../../utils/policyFormatter';

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

  const formattedHtml = formatPolicyHtml(policy.description);

  return (
    <StoreLayout store={store} cartCount={0} onCartClick={() => alert('Please return to the home page to view your cart.')}>
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <span className="block text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#c94710] mb-2">Good to know</span>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-stone-900 mb-8">{policy.title}</h1>
        <div className="bg-white p-8 md:p-10 rounded-[1.5rem] shadow-[0_8px_28px_rgba(91,45,19,0.08)] border border-orange-100">
          <div 
            className="policy-rendered-content text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formattedHtml }}
          />
        </div>
      </div>
    </StoreLayout>
  );
};

export default PolicyPage;
