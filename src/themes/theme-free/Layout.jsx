import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { getPublicSocialMedia } from '../../services/api';
import { Link as LinkIcon } from 'lucide-react';
import BottomNav from './components/BottomNav';

const SocialIcon = ({ platform, size = 26, className }) => {
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
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {getPath()}
    </svg>
  );
};

const StoreLayout = ({ children, store, cartCount, onCartClick }) => {
  const [socialLinks, setSocialLinks] = useState([]);

  useEffect(() => {
    getPublicSocialMedia().then(setSocialLinks).catch(console.error);
  }, []);

  const isProductPage = typeof window !== 'undefined' && window.location.pathname.includes('/product/');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900 w-full overflow-clip">
      <Header store={store} cartCount={cartCount} onCartClick={onCartClick} />
      <main className="flex-1 w-full flex flex-col">
        {children}
      </main>
      
      {/* Social Media Footer Section */}
      {socialLinks.length > 0 && (
        <div className="bg-white border-t border-gray-200 py-8 mt-10">
          <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-5">
            <h3 className="text-gray-500 font-bold text-sm uppercase tracking-widest">Connect with us</h3>
            <div className="flex gap-6">
              {socialLinks.map(link => {
                return (
                  <a key={link._id} href={link.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#76b900] hover:scale-110 transform transition-all duration-300">
                    <SocialIcon platform={link.platform} size={26} />
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <Footer storeName={store?.name || 'Store'} />
      <BottomNav cartCount={cartCount} onCartClick={onCartClick} />

      {store?.whatsappSupportEnabled && store?.whatsappNumber && (
        <a
          href={`https://wa.me/${store.whatsappNumber.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`fixed ${isProductPage ? 'bottom-36' : 'bottom-20'} md:bottom-6 right-6 z-40 bg-[#25D366] text-white p-3.5 rounded-full shadow-2xl hover:bg-[#20ba5a] transition-all duration-300 hover:scale-110 flex items-center justify-center border border-white/20`}
          aria-label="Contact Support on WhatsApp"
        >
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap tracking-wide flex items-center gap-1 border border-white/10">
            Contact Us!
            <span className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900/95 rotate-45 border-r border-b border-white/10"></span>
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.729-1.463L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.725 1.45 5.236 0 9.5-4.26 9.504-9.5.002-2.54-1.002-4.93-2.826-6.753-1.824-1.823-4.24-2.828-6.78-2.828-5.243 0-9.513 4.268-9.517 9.51-.002 1.603.486 3.17 1.411 4.566l-.979 3.573 3.667-.962zm10.702-7.11c-.273-.137-1.62-.8-1.871-.892-.252-.093-.437-.137-.62.137-.183.274-.7.892-.857 1.077-.158.183-.317.206-.59.068-.273-.137-1.155-.426-2.2-1.358-.813-.726-1.36-1.62-1.52-1.894-.158-.274-.017-.422.122-.56.124-.124.273-.317.41-.476.136-.158.182-.27.273-.456.09-.186.046-.35-.022-.486-.068-.137-.62-1.492-.849-2.04-.223-.538-.466-.464-.62-.464-.158-.002-.34-.002-.523-.002-.183 0-.482.068-.734.34-.252.274-.963.94-.963 2.29 0 1.35.983 2.65 1.12 2.83.137.185 1.93 2.947 4.676 4.13.654.282 1.164.45 1.562.576.657.21 1.256.18 1.728.11.526-.077 1.62-.663 1.85-1.302.23-.64.23-1.187.16-1.302-.07-.11-.25-.205-.52-.34z"/>
          </svg>
        </a>
      )}
    </div>
  );
};

export default StoreLayout;