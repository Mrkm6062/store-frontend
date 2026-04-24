import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPublicPolicies } from './api';

const Footer = ({ storeName }) => {
  const [policies, setPolicies] = useState([]);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const data = await getPublicPolicies();
        setPolicies(data);
      } catch (err) {
        console.error("Failed to fetch policies for footer:", err);
      }
    };
    fetchPolicies();
  }, []);

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-center md:text-left">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">About {storeName}</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto md:mx-0 leading-relaxed">
              Thank you for shopping with us. We are dedicated to providing the best quality products directly to you.
            </p>
          </div>
          {policies.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Store Policies</h3>
              <ul className="space-y-2">
                {policies.map(policy => {
                  const slug = policy.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  return (
                    <li key={policy._id}>
                      <Link to={`/policy/${slug}`} state={{ policy }} className="text-sm text-gray-500 hover:text-[#76b900] transition font-medium">
                        {policy.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        
        <div className="border-t border-gray-100 pt-8">
          <div className="text-center text-gray-500 text-sm font-medium">
            &copy; {new Date().getFullYear()} {storeName}. All rights reserved.
          </div>
          <div className="text-center text-gray-400 text-xs mt-2 font-mono tracking-widest">
            POWERED BY GALIBRAND
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;