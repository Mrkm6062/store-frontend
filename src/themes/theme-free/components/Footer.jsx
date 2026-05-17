import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPublicPolicies } from '../../../services/api';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Send, ChevronRight } from 'lucide-react';

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
    <footer className="bg-gradient-to-b from-white to-green-50/40 border-t border-gray-100 mt-auto pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-12">
          
          {/* Brand & Social Section */}
          <div className="flex flex-col space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-[#76b900] mb-2">{storeName}</h2>
              <p className="text-gray-500 text-sm leading-relaxed pr-4">
                Fresh groceries and daily essentials delivered right to your doorstep. We guarantee quality and freshness in every single order.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <a href="#" className="p-2.5 bg-white text-gray-400 rounded-full hover:bg-[#76b900] hover:text-white hover:-translate-y-1 transition-all duration-300 shadow-sm border border-gray-100">
                <Facebook size={18} />
              </a>
              <a href="#" className="p-2.5 bg-white text-gray-400 rounded-full hover:bg-[#76b900] hover:text-white hover:-translate-y-1 transition-all duration-300 shadow-sm border border-gray-100">
                <Instagram size={18} />
              </a>
              <a href="#" className="p-2.5 bg-white text-gray-400 rounded-full hover:bg-[#76b900] hover:text-white hover:-translate-y-1 transition-all duration-300 shadow-sm border border-gray-100">
                <Twitter size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-5">Quick Links</h3>
            <ul className="space-y-3">
              {['Home', 'Shop Categories', 'Today\'s Offers', 'Track Order', 'Contact Us'].map((link, idx) => (
                <li key={idx}>
                  <Link to={link === 'Home' ? '/' : link === 'Shop Categories' ? '/categories' : link === 'Track Order' ? '/track' : '#'} className="text-sm text-gray-500 hover:text-[#76b900] transition font-medium flex items-center gap-2 group w-fit">
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-[#76b900] transition-colors" />
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Support (Policies) */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-5">Customer Support</h3>
            <ul className="space-y-3">
              {policies.length > 0 ? policies.map(policy => {
                const slug = policy.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return (
                  <li key={policy._id}>
                    <Link to={`/policy/${slug}`} state={{ policy }} className="text-sm text-gray-500 hover:text-[#76b900] transition font-medium flex items-center gap-2 group w-fit">
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-[#76b900] transition-colors" />
                      {policy.title}
                    </Link>
                  </li>
                );
              }) : (
                <li className="text-sm text-gray-400 italic">No policies available.</li>
              )}
            </ul>
          </div>

          {/* Newsletter & Contact Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-5">Stay Updated</h3>
            <p className="text-sm text-gray-500 mb-4">Get updates on fresh deals and exclusive offers straight to your inbox.</p>
            <form className="flex mb-6 shadow-sm" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="Your email address" 
                className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-l-xl focus:outline-none focus:border-[#76b900] transition-colors"
                required
              />
              <button type="submit" className="bg-[#76b900] text-white px-4 rounded-r-xl hover:bg-[#659e00] transition-colors flex items-center justify-center border border-[#76b900]">
                <Send size={18} />
              </button>
            </form>
            <div className="space-y-3">
              <a href="#" className="flex items-center gap-3 text-sm text-gray-500 hover:text-[#76b900] transition-colors w-fit"><Phone size={16} className="text-[#76b900]" /> +91 98765 43210</a>
              <a href="#" className="flex items-center gap-3 text-sm text-gray-500 hover:text-[#76b900] transition-colors w-fit"><Mail size={16} className="text-[#76b900]" /> support@{storeName?.replace(/\s+/g, '').toLowerCase() || 'store'}.com</a>
              <div className="flex items-start gap-3 text-sm text-gray-500 w-fit"><MapPin size={16} className="text-[#76b900] shrink-0 mt-0.5" /> <span>123 Fresh Market Street,<br />Grocery City, 400001</span></div>
            </div>
          </div>

        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left text-gray-500 text-sm font-medium">
            &copy; {new Date().getFullYear()} {storeName}. All rights reserved.
          </div>
          <div className="text-center text-gray-400 text-xs font-mono tracking-widest uppercase">
            POWERED BY GALIBRAND
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;