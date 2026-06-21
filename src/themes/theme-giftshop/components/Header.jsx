import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Search, User, Menu, X, ChevronRight, Home, Heart, Package } from 'lucide-react';
import { getPublicCategories, getOptimizedImageUrl } from '../../../services/api';
import { ThemeCustomizationContext, isLightColor } from '../../../themeLoader/themeRenderer.jsx';
import { useProducts } from '../../../services/useProducts';

const Header = ({ store, cartCount, onCartClick, onWishlistClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [categories, setCategories] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [customerToken, setCustomerToken] = useState(() => localStorage.getItem('gb_customer_token'));
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('gb_customer_name') || '');

  useEffect(() => {
    const handleCustomerUpdate = () => {
      setCustomerToken(localStorage.getItem('gb_customer_token'));
      setCustomerName(localStorage.getItem('gb_customer_name') || '');
    };
    window.addEventListener('customer-login-updated', handleCustomerUpdate);
    window.addEventListener('storage', handleCustomerUpdate);
    return () => {
      window.removeEventListener('customer-login-updated', handleCustomerUpdate);
      window.removeEventListener('storage', handleCustomerUpdate);
    };
  }, []);


  const customization = useContext(ThemeCustomizationContext);
  const { products } = useProducts();

  const headerSettings = customization?.header || {};
  const offerBanner = headerSettings.offerBanner || { Enabled: true, text: store?.offerText || '🎉 Special Offer: Free delivery on all orders over ₹500!', bgColor: '#76b900', textColor: '#ffffff' };
  const isLightBanner = isLightColor(offerBanner.bgColor || '#76b900');
  const bannerTextColor = offerBanner.textColor || (isLightBanner ? '#111827' : '#ffffff');
  const primaryColor = customization?.global?.primaryColor || '#76b900';

  useEffect(() => {
    getPublicCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    // Load the initial count and listen for changes across tabs & same tab
    const updateWishlistCount = () => {
      const saved = localStorage.getItem('gb_store_wishlist');
      if (saved) {
        try { setWishlistCount(JSON.parse(saved).length); } catch(e) {}
      } else {
        setWishlistCount(0);
      }
    };
    updateWishlistCount();
    window.addEventListener('storage', updateWishlistCount);
    window.addEventListener('wishlist-updated', updateWishlistCount);
    return () => {
      window.removeEventListener('storage', updateWishlistCount);
      window.removeEventListener('wishlist-updated', updateWishlistCount);
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      // Fast local filtering using the products already loaded in context
      const results = products.filter(product => 
        product.name?.toLowerCase().includes(query) ||
        product.categoryName?.toLowerCase().includes(query) ||
        (product.tags && product.tags.some(tag => tag.toLowerCase().includes(query)))
      );
      
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  return (
    <header className="shadow-sm sticky top-0 z-50 transition-colors duration-300" style={{ backgroundColor: headerSettings.bgColor || '#ffffff', color: headerSettings.textColor || '#000000' }}>
      {/* Offer Header */}
      {offerBanner.Enabled !== false && (
        <div 
          className="py-1.5 sm:py-2 text-xs sm:text-sm font-medium w-full overflow-hidden transition-colors duration-300 flex"
          style={{ backgroundColor: offerBanner.bgColor, color: bannerTextColor }}
        >
          <style>
            {`
              @keyframes scrolling-text {
                0% { transform: translateX(100vw); }
                100% { transform: translateX(-100%); }
              }
            `}
          </style>
          <div className="whitespace-nowrap" style={{ animation: 'scrolling-text 20s linear infinite' }}>
            {offerBanner.text}
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          <div className="flex-1 flex justify-start items-center">
            <button onClick={() => setIsMenuOpen(true)} aria-label="Open menu" className="p-2 -ml-2 hover:bg-black/5 rounded-md md:hidden transition-colors" style={{ color: headerSettings.textColor || '#4b5563' }}>
              <Menu size={24} />
            </button>
          </div>

          <div className="flex-1 flex justify-center items-center">
            <Link to="/" className="flex items-center justify-center">
              {(headerSettings.officialdesktopLogo || headerSettings.officialmobileLogo || store?.logo) ? (
                <>
                  <img src={getOptimizedImageUrl(headerSettings.officialmobileLogo || headerSettings.officialdesktopLogo || store?.logo, 160)} alt={store?.name} width="120" height="60" className="h-12 w-auto object-contain md:hidden" />
                  <img src={getOptimizedImageUrl(headerSettings.officialdesktopLogo || store?.logo, 160)} alt={store?.name} width="160" height="80" className="h-16 w-auto object-contain hidden md:block" />
                </>
              ) : (
                <h1 className="text-xl font-bold" style={{ color: headerSettings.textColor || '#111827' }}>{store?.name || 'Store'}</h1>
              )}
            </Link>
          </div>

          <div className="flex-1 flex justify-end items-center gap-2 sm:gap-4">
            <Link to="/" className="p-2 hover:bg-black/5 rounded-full hidden md:block transition-colors" style={{ color: headerSettings.textColor || '#4b5563' }} title="Home">
              <Home size={24} />
            </Link>
            <button onClick={() => setIsSearchOpen(true)} aria-label="Search products" className="p-2 hover:bg-black/5 rounded-full transition-colors" style={{ color: headerSettings.textColor || '#4b5563' }}>
              <Search size={24} />
            </button>
            <button onClick={onWishlistClick} aria-label="Wishlist" className="p-2 hover:bg-black/5 rounded-full relative transition-colors" style={{ color: headerSettings.textColor || '#4b5563' }} title="Wishlist">
              <Heart size={24} />
              {wishlistCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
                  {wishlistCount}
                </span>
              )}
            </button>
            {customerToken ? (
              <div className="hidden md:flex items-center gap-1.5 relative group">
                <Link to="/track" className="p-2 hover:bg-black/5 rounded-full transition-colors flex items-center" style={{ color: headerSettings.textColor || '#4b5563' }} title="Track Orders & History">
                  <Package size={24} />
                </Link>
                <button type="button" aria-label="Account details" className="flex items-center gap-1 hover:bg-black/5 px-2.5 py-1.5 rounded-xl transition-colors text-sm font-bold" style={{ color: headerSettings.textColor || '#4b5563' }}>
                  <User size={20} />
                  <span className="max-w-[80px] truncate hidden sm:inline">{customerName || 'Account'}</span>
                </button>
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl py-2 w-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link to="/track" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-semibold">Order History</Link>
                  <button 
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('gb_customer_token');
                      localStorage.removeItem('gb_customer_email');
                      localStorage.removeItem('gb_customer_name');
                      window.dispatchEvent(new Event('customer-login-updated'));
                      window.location.reload();
                    }} 
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-semibold border-t border-gray-100 mt-1"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/track" className="hidden md:flex p-2 hover:bg-black/5 rounded-full transition-colors items-center" style={{ color: headerSettings.textColor || '#4b5563' }} title="Login / Track Orders">
                <User size={24} />
              </Link>
            )}
            <button onClick={onCartClick} aria-label="Shopping cart" className="hidden md:block p-2 hover:bg-black/5 rounded-full relative transition-colors" style={{ color: headerSettings.textColor || '#4b5563' }}>
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
                <a 
                  href="/" 
                  style={{ color: window.location.pathname === '/' || window.location.pathname === '' ? primaryColor : '#374151' }}
                  className={`block py-3 px-3 hover:bg-gray-50 rounded-xl flex justify-between items-center transition-colors ${window.location.pathname === '/' || window.location.pathname === '' ? 'font-bold' : 'font-semibold'}`}
                >
                  All Products <ChevronRight size={18} style={{ color: window.location.pathname === '/' || window.location.pathname === '' ? primaryColor : '#9ca3af' }}/>
                </a>
                {categories.map(c => {
                  const categoryPath = `/category/${c.slug || c._id}`;
                  const isActive = window.location.pathname === categoryPath;
                  return (
                    <a 
                      key={c._id} 
                      href={categoryPath} 
                      style={{ color: isActive ? primaryColor : '#374151' }}
                      className={`block py-3 px-3 hover:bg-gray-50 rounded-xl flex justify-between items-center transition-colors ${isActive ? 'font-bold' : 'font-semibold'}`}
                    >
                      {c.name} <ChevronRight size={18} style={{ color: isActive ? primaryColor : '#9ca3af' }}/>
                    </a>
                  );
                })}
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
                        href={`/product/${product.slug || product._id}`} 
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100 group"
                      >
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {displayImage ? (
                            <img src={getOptimizedImageUrl(displayImage, 323)} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs text-center leading-none">No img</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h4 className="text-sm font-bold text-gray-800 truncate">{product.name}</h4>
                          <p className="text-[11px] sm:text-xs text-gray-500 truncate">{product.categoryName || product.category || 'Product'}</p>
                          <p className="text-xs sm:text-sm font-bold text-[#76b900] mt-0.5">₹{displayPrice}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg group-hover:bg-[#76b900] group-hover:text-white transition-colors">
                            View
                          </span>
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