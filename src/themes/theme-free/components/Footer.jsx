import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { getPublicPolicies } from '../../../services/api';
import { Mail, Phone, MapPin, Send, ChevronRight } from 'lucide-react';
import { ThemeCustomizationContext } from '../../../themeLoader/themeRenderer.jsx';
import MapEmbed from './MapEmbed.jsx';
import { useStore } from '../../../services/useStore';

const SocialIcon = ({ platform, size = 18 }) => {
  const getPath = () => {
    switch(platform.toLowerCase()) {
      case 'facebook': return <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>;
      case 'instagram': return <><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></>;
      case 'twitter': return <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>;
      case 'linkedin': return <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></>;
      case 'youtube': return <><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2C5.12 19.5 12 19.5 12 19.5s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></>;
      default: return <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></>;
    }
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {getPath()}
    </svg>
  );
};

const Footer = ({ storeName }) => {
  const { store } = useStore();
  const [policies, setPolicies] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);
  const customization = useContext(ThemeCustomizationContext);
  const footerSettings = customization?.footer || {};

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const data = await getPublicPolicies();
        setPolicies(data);
      } catch (err) {
        console.error("Failed to fetch policies for footer:", err);
      }
    };

    const fetchSocialLinks = async () => {
      if (!store?._id) return;
      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${API_URL}/api/social-media?storeId=${store._id}`);
        if (res.ok) setSocialLinks(await res.json());
      } catch (err) {
        console.error("Failed to fetch social links:", err);
      }
    };

    fetchPolicies();
    fetchSocialLinks();
  }, [store?._id]);

  return (
    <footer className="border-t border-gray-100 mt-auto pt-16 pb-8 transition-colors duration-300" style={{ backgroundColor: footerSettings.bgColor || '#f8fafc', color: footerSettings.textColor || '#4b5563' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-12">
          
          {/* Brand & Social Section */}
          <div className="flex flex-col space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold mb-2" style={{ color: footerSettings.textColor || '#76b900' }}>{storeName}</h2>
              <p className="text-sm leading-relaxed pr-4 opacity-80">
                Fresh groceries and daily essentials delivered right to your doorstep. We guarantee quality and freshness in every single order.
              </p>
            </div>
            
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                {socialLinks.map(link => (
                  <a key={link._id} href={link.url} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-black/5 rounded-full hover:bg-[#76b900] hover:text-white hover:-translate-y-1 transition-all duration-300 shadow-sm border border-black/5" style={{ color: footerSettings.textColor || '#9ca3af' }}>
                    <SocialIcon platform={link.platform} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links Section */}
          <div>
            <h3 className="text-lg font-bold mb-5" style={{ color: footerSettings.textColor || '#111827' }}>Quick Links</h3>
            <ul className="space-y-3">
              {['Home', 'Shop Categories', 'Today\'s Offers', 'Track Order', 'Contact Us'].map((link, idx) => (
                <li key={idx}>
                  <Link to={link === 'Home' ? '/' : link === 'Shop Categories' ? '/categories' : link === 'Track Order' ? '/track' : '#'} className="text-sm opacity-80 hover:opacity-100 transition font-medium flex items-center gap-2 group w-fit">
                    <ChevronRight size={14} className="opacity-50 group-hover:opacity-100 transition-colors" />
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Support (Policies) */}
          <div>
            <h3 className="text-lg font-bold mb-5" style={{ color: footerSettings.textColor || '#111827' }}>Customer Support</h3>
            <ul className="space-y-3">
              {policies.length > 0 ? policies.map(policy => {
                const slug = policy.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return (
                  <li key={policy._id}>
                    <Link to={`/policy/${slug}`} state={{ policy }} className="text-sm opacity-80 hover:opacity-100 transition font-medium flex items-center gap-2 group w-fit">
                      <ChevronRight size={14} className="opacity-50 group-hover:opacity-100 transition-colors" />
                      {policy.title}
                    </Link>
                  </li>
                );
              }) : (
                <li className="text-sm opacity-60 italic">No policies available.</li>
              )}
            </ul>
          </div>

          {/* Newsletter & Contact Section */}
          <div>
            <h3 className="text-lg font-bold mb-5" style={{ color: footerSettings.textColor || '#111827' }}>Stay Updated</h3>
            <p className="text-sm opacity-80 mb-4">Get updates on fresh deals and exclusive offers straight to your inbox.</p>
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
              {(store?.supportPhoneNumbers?.length > 0 ? store.supportPhoneNumbers : ['+91 98765 43210']).map((phone, idx) => (
                <a key={idx} href={`tel:${phone}`} className="flex items-center gap-3 text-sm opacity-80 hover:opacity-100 transition-colors w-fit">
                  <Phone size={16} className="opacity-80" /> {phone}
                </a>
              ))}
              <a href={`mailto:${store?.supportEmail || `support@${storeName?.replace(/\s+/g, '').toLowerCase() || 'store'}.com`}`} className="flex items-center gap-3 text-sm opacity-80 hover:opacity-100 transition-colors w-fit">
                <Mail size={16} className="opacity-80" /> {store?.supportEmail || `support@${storeName?.replace(/\s+/g, '').toLowerCase() || 'store'}.com`}
              </a>
              {store?.mapLocation ? (
                <a href={store.mapLocation} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-sm opacity-80 hover:opacity-100 transition-colors w-fit">
                  <MapPin size={16} className="shrink-0 mt-0.5 opacity-80" /> <span className="whitespace-pre-wrap">{store?.locationAddress || '123 Fresh Market Street,\nGrocery City, 400001'}</span>
                </a>
              ) : (
                <div className="flex items-start gap-3 text-sm opacity-80 w-fit"><MapPin size={16} className="shrink-0 mt-0.5 opacity-80" /> <span className="whitespace-pre-wrap">{store?.locationAddress || '123 Fresh Market Street,\nGrocery City, 400001'}</span></div>
              )}
              <MapEmbed mapLocation={store?.mapLocation} />
            </div>
          </div>

        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-black/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left opacity-80 text-sm font-medium">
            &copy; {new Date().getFullYear()} {storeName}. All rights reserved.
          </div>
          <div className="text-center opacity-60 text-xs font-mono tracking-widest uppercase">
            POWERED BY GALIBRAND
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;