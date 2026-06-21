import React, { useState, useEffect, useContext } from 'react';
import { ThemeCustomizationContext, isLightColor } from '../../../themeLoader/themeRenderer.jsx';
import { ShoppingCart, Search, User, Menu, X, ChevronRight } from 'lucide-react';
import { getPublicCategories, getOptimizedImageUrl } from '../../../services/api';

const Header = ({ store, cartCount, onCartClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const customization = useContext(ThemeCustomizationContext);
  const primaryColor = customization?.global?.primaryColor || '#76b900';
  const isLightBanner = isLightColor(primaryColor);
  const bannerTextColor = isLightBanner ? '#111827' : '#ffffff';
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getPublicCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        try {
          const API_URL = import.meta.env.VITE_API_URL || '';
          const res = await fetch(`${API_URL}/api/store/products?search=${encodeURIComponent(searchQuery.trim())}`, {
            headers: {
              'x-store-domain': window.location.hostname,
              'x-forwarded-host': window.location.hostname
            }
          });
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data.products || data || []);
          }
        } catch (error) {
          console.error("Search failed:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      {/* Offer Header */}
      <div 
        className="px-4 py-1.5 sm:py-2 text-center text-xs sm:text-sm font-medium w-full transition-colors duration-300"
        style={{ backgroundColor: primaryColor, color: bannerTextColor }}
      >
        <p className="truncate max-w-7xl mx-auto">
          {store?.offerText || '🎉 Special Offer: Free delivery on all orders over ₹500!'}
        </p>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-1 flex justify-start items-center">
            <button onClick={() => setIsMenuOpen(true)} aria-label="Open menu" className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md md:hidden">
              <Menu size={24} />
            </button>
          </div>

          <div className="flex-1 flex justify-center items-center">
            {store?.logo ? (
              <img src={store?.logo} alt={store?.name} width="96" height="48" className="h-10 sm:h-12 w-auto object-contain" />
            ) : (
              <h1 className="text-xl font-bold text-gray-900">{store?.name || 'Store'}</h1>
            )}
          </div>

          <div className="flex-1 flex justify-end items-center gap-2 sm:gap-4">
            <button onClick={() => setIsSearchOpen(true)} aria-label="Search products" className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition">
              <Search size={24} />
            </button>
            <button aria-label="User account" className="p-2 text-gray-600 hover:bg-gray-100 rounded-full hidden sm:block transition">
              <User size={24} />
            </button>
            <button onClick={onCartClick} aria-label="Shopping cart" className="p-2 text-gray-600 hover:bg-gray-100 rounded-full relative transition">
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
              <button onClick={() => setIsMenuOpen(false)} aria-label="Close menu" className="p-1 text-gray-500 hover:bg-gray-200 rounded-full"><X size={24} /></button>
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

      {/* Search Popup Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4 transition-opacity">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <Search className="text-gray-400" size={24} />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-lg outline-none bg-transparent placeholder-gray-400 text-gray-800"
                placeholder="Search for products..."
              />
              <button onClick={() => setIsSearchOpen(false)} aria-label="Close search" className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {isSearching ? (
                <div className="text-center py-10 text-gray-500 flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#76b900] mb-4"></div>
                  <p>Searching for "{searchQuery}"...</p>
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="flex flex-col gap-2 pb-2">
                  {searchResults.slice(0, 5).map((product) => {
                    const displayImage = Array.isArray(product.images) && product.images.length > 0 
                      ? product.images[0] 
                      : (typeof product.images === 'string' ? product.images : product.image);
                    const displayPrice = product.variants && product.variants.length > 0 
                      ? product.variants[0].price 
                      : (product.basePrice || product.price || 0);

                    return (
                      <a 
                        key={product._id} 
                        href={`/?search=${searchQuery}`} 
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded-xl transition-colors"
                      >
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {displayImage ? (
                             <img src={getOptimizedImageUrl(displayImage, 300)} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs text-center leading-none">No img</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-gray-800 truncate">{product.name}</h4>
                          <p className="text-xs text-gray-500 truncate">{product.categoryName || product.category || 'Product'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#76b900]">₹{displayPrice}</p>
                        </div>
                      </a>
                    );
                  })}
                  
                  <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                    <a href={`/?search=${searchQuery}`} onClick={() => setIsSearchOpen(false)} className="inline-block px-6 py-2.5 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition shadow-md shadow-green-100">
                      View All {searchResults.length} Results
                    </a>
                  </div>
                </div>
              ) : searchQuery ? (
                <div className="text-center py-10 text-gray-500">
                  <p className="mb-4">No results found for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <p>Start typing to see live search results...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;