import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, User, Menu, X, ChevronRight } from 'lucide-react';
import { getPublicCategories } from './api';

const Header = ({ store, cartCount, onCartClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getPublicCategories().then(setCategories).catch(console.error);
  }, []);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md md:hidden">
              <Menu size={24} />
            </button>
            {store?.logo ? (
              <img src={store?.logo} alt={store?.name} className="h-10 sm:h-12 w-auto object-contain" />
            ) : (
              <h1 className="text-xl font-bold text-gray-900">{store?.name || 'Store'}</h1>
            )}
          </div>

          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm transition-colors"
                placeholder="Search products..."
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full hidden sm:block transition">
              <User size={24} />
            </button>
            <button onClick={onCartClick} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full relative transition">
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-green-600 rounded-full">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex md:hidden transition-opacity">
          <div className="w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-extrabold text-xl text-gray-800">Menu</h2>
              <button onClick={() => setIsMenuOpen(false)} className="p-1 text-gray-500 hover:bg-gray-200 rounded-full"><X size={24} /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Shop by Category</h3>
              <div className="space-y-1">
                <a href="/" className="block py-3 px-3 hover:bg-gray-50 rounded-xl font-bold text-[#76b900] flex justify-between items-center transition-colors">
                  All Products <ChevronRight size={18} className="text-[#76b900]"/>
                </a>
                {categories.map(c => (
                  <a key={c._id} href={`/?category=${c._id}`} className="block py-3 px-3 hover:bg-gray-50 rounded-xl font-semibold text-gray-700 flex justify-between items-center transition-colors">
                    {c.name} <ChevronRight size={18} className="text-gray-400"/>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;