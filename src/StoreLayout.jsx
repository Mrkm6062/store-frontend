import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import { getPublicSocialMedia } from './api';
import { Facebook, Instagram, Twitter, Linkedin, Youtube, Link as LinkIcon } from 'lucide-react';

const StoreLayout = ({ children, store, cartCount, onCartClick }) => {
  const [socialLinks, setSocialLinks] = useState([]);

  useEffect(() => {
    getPublicSocialMedia().then(setSocialLinks).catch(console.error);
  }, []);

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
                let Icon = LinkIcon;
                switch(link.platform.toLowerCase()) {
                  case 'facebook': Icon = Facebook; break;
                  case 'instagram': Icon = Instagram; break;
                  case 'twitter': Icon = Twitter; break;
                  case 'linkedin': Icon = Linkedin; break;
                  case 'youtube': Icon = Youtube; break;
                }
                return (
                  <a key={link._id} href={link.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#76b900] hover:scale-110 transform transition-all duration-300">
                    <Icon size={26} strokeWidth={2.5} />
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <Footer storeName={store?.name || 'Store'} />
    </div>
  );
};

export default StoreLayout;