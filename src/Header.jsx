import React from 'react';
import { ShoppingCart, Search, User, Menu } from 'lucide-react';

const Header = ({ store, cartCount }) => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <button className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md md:hidden">
              <Menu size={24} />
            </button>
            {store?.logo ? (
              <img src={store?.logo} alt={store?.name} className="h-8 w-auto object-contain" />
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
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full relative transition">
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
    </header>
  );
};

export default Header;