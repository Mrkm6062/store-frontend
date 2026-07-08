import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Search, User, Menu, X, ChevronRight, Home, Heart, Package, Clock, AlertTriangle, MapPin } from 'lucide-react';
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
  const [storeOpenStatus, setStoreOpenStatus] = useState({ isOpen: true, reason: '', nextOpen: null });
  const [showClosedPopup, setShowClosedPopup] = useState(false);

  const [customerInfo, setCustomerInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('gb_customer_info');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalPhone, setModalPhone] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalAddress, setModalAddress] = useState('');
  const [modalLandmark, setModalLandmark] = useState('');
  const [modalPincode, setModalPincode] = useState('');
  const [modalAlternate, setModalAlternate] = useState('');
  const [modalCity, setModalCity] = useState('');
  const [modalState, setModalState] = useState('');

  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [checkResult, setCheckResult] = useState({ text: '', type: '' });
  const [deliverySettings, setDeliverySettings] = useState(null);

  useEffect(() => {
    if (store?._id) {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      fetch(`${API_BASE_URL}/api/delivery-settings/public`, {
        headers: { 'x-store-id': store?._id }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setDeliverySettings(data);
        })
        .catch(console.error);
    }
  }, [store]);

  useEffect(() => {
    if (customerInfo) {
      setModalName(customerInfo.customerName || '');
      setModalPhone(customerInfo.customerPhone || '');
      setModalEmail(customerInfo.customerEmail || '');
      setModalAddress(customerInfo.addressLine1 || '');
      setModalLandmark(customerInfo.landmark || '');
      setModalPincode(customerInfo.pincode || '');
      setModalAlternate(customerInfo.alternateNumber || '');
      setModalCity(customerInfo.city || '');
      setModalState(customerInfo.state || '');
    }
  }, [customerInfo]);

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('gb_customer_info');
        setCustomerInfo(saved ? JSON.parse(saved) : null);
      } catch (e) {}
    };
    window.addEventListener('customer-info-updated', handleUpdate);
    return () => window.removeEventListener('customer-info-updated', handleUpdate);
  }, []);

  useEffect(() => {
    const handleOpen = () => setShowAddressModal(true);
    window.addEventListener('open-address-modal', handleOpen);
    return () => window.removeEventListener('open-address-modal', handleOpen);
  }, []);

  useEffect(() => {
    const fetchCityState = async () => {
      if (modalPincode && modalPincode.trim().length === 6) {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
          const response = await fetch(`${API_BASE_URL}/api/delivery-settings/public/pincode/${modalPincode.trim()}`);
          if (response.ok) {
            const data = await response.json();
            setModalCity(data.city || '');
            setModalState(data.state || '');
          }
        } catch (e) {}
      }
    };
    fetchCityState();
  }, [modalPincode]);

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!modalPhone || modalPhone.trim().length < 10) {
      setCheckResult({ text: 'Mobile number must be at least 10 digits.', type: 'error' });
      return;
    }
    if (!modalPincode || modalPincode.trim().length !== 6) {
      setCheckResult({ text: 'Pincode must be exactly 6 digits.', type: 'error' });
      return;
    }

    setCheckingDelivery(true);
    setCheckResult({ text: '', type: '' });

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      const settingsRes = await fetch(`${API_BASE_URL}/api/delivery-settings/public`, {
        headers: { 'x-store-id': store?._id }
      });
      if (!settingsRes.ok) throw new Error('Failed to load store delivery settings.');
      const settings = await settingsRes.json();

      let allowed = false;
      if (settings.deliveryMode === 'state') {
        const allowedStates = (settings.allowedStates || []).map(s => s.toLowerCase());
        allowed = allowedStates.includes(modalState.toLowerCase().trim());
      } else if (settings.deliveryMode === 'pincode') {
        const allowedPincodes = settings.allowedPincodes || [];
        allowed = allowedPincodes.includes(modalPincode.trim());
      } else {
        allowed = true;
      }

      if (allowed) {
        const updatedInfo = {
          customerName: modalName.trim(),
          customerPhone: modalPhone.trim(),
          customerEmail: modalEmail.trim(),
          addressLine1: modalAddress.trim(),
          landmark: modalLandmark.trim(),
          pincode: modalPincode.trim(),
          alternateNumber: modalAlternate.trim(),
          city: modalCity.trim(),
          state: modalState.trim()
        };
        localStorage.setItem('gb_customer_info', JSON.stringify(updatedInfo));
        setCheckResult({ text: 'Delivery is available! Address saved.', type: 'success' });
        window.dispatchEvent(new Event('customer-info-updated'));
        setTimeout(() => {
          setShowAddressModal(false);
          setCheckResult({ text: '', type: '' });
        }, 1500);
      } else {
        setCheckResult({ text: `Sorry, we do not deliver to this location (${modalPincode}).`, type: 'error' });
      }
    } catch (err) {
      setCheckResult({ text: err.message || 'Verification failed. Try again.', type: 'error' });
    } finally {
      setCheckingDelivery(false);
    }
  };

  useEffect(() => {
    if (!store?._id) return;
    const fetchStatus = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
        const res = await fetch(`${API_BASE_URL}/api/store-hours/public/status`, {
          headers: { 'x-store-id': store._id }
        });
        if (res.ok) {
          const data = await res.json();
          setStoreOpenStatus(data);
          if (!data.isOpen) {
            const popupShown = sessionStorage.getItem('store_closed_popup_shown');
            if (!popupShown) {
              setShowClosedPopup(true);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch store public open status", err);
      }
    };
    fetchStatus();
  }, [store?._id]);

  const handleClosePopup = () => {
    setShowClosedPopup(false);
    sessionStorage.setItem('store_closed_popup_shown', 'true');
  };

  const getClosedText = () => {
    if (!storeOpenStatus.nextOpen) {
      return (
        <span className="flex items-center justify-center gap-1.5">
          <AlertTriangle size={16} />
          Store is currently closed today and not accepting orders.
        </span>
      );
    }
    const { day, date, time } = storeOpenStatus.nextOpen;
    const dayStr = day === "Tomorrow" ? "tomorrow" : `on ${day} (${date})`;
    return (
      <span className="flex items-center justify-center gap-1.5">
        <AlertTriangle size={16} />
        Store is closed today. Kindly order {dayStr} at {time}
      </span>
    );
  };
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
    <header className={`shadow-sm sticky top-0 transition-colors duration-300 ${showAddressModal ? 'z-[200]' : 'z-50'}`} style={{ backgroundColor: headerSettings.bgColor || '#ffffff', color: headerSettings.textColor || '#000000' }}>
      {/* Offer Header or Store Closed Notice */}
      {!storeOpenStatus.isOpen ? (
        <div 
          className="w-full py-2 px-4 text-center text-xs sm:text-sm font-bold transition-colors duration-300"
          style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
        >
          {getClosedText()}
        </div>
      ) : (
        offerBanner.Enabled !== false && (
          <div 
            className="w-full overflow-hidden flex relative py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors duration-300"
            style={{ backgroundColor: offerBanner.bgColor, color: bannerTextColor }}
          >
            <style>
              {`
                @keyframes marquee-infinite {
                  0% { transform: translate3d(0, 0, 0); }
                  100% { transform: translate3d(-50%, 0, 0); }
                }
              `}
            </style>
            <div 
              className="flex whitespace-nowrap animate-marquee" 
              style={{ animation: 'marquee-infinite 25s linear infinite' }}
            >
              {/* Group 1 */}
              <div className="flex justify-around min-w-full shrink-0 gap-16 px-8">
                <span>{offerBanner.text}</span>
                <span>{offerBanner.text}</span>
                <span>{offerBanner.text}</span>
              </div>
              {/* Group 2 */}
              <div className="flex justify-around min-w-full shrink-0 gap-16 px-8">
                <span>{offerBanner.text}</span>
                <span>{offerBanner.text}</span>
                <span>{offerBanner.text}</span>
              </div>
            </div>
          </div>
        )
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          <div className="flex-1 flex justify-start items-center relative gap-3">
            <button onClick={() => setIsMenuOpen(true)} aria-label="Open menu" className="p-2 -ml-2 hover:bg-black/5 rounded-md md:hidden transition-colors" style={{ color: headerSettings.textColor || '#4b5563' }}>
              <Menu size={24} />
            </button>

            {/* Desktop Location Bar - Hidden on mobile, visible on desktop */}
            <div className="hidden md:flex items-center gap-2 text-left">
              {customerInfo?.pincode ? (
                <div className="flex items-center gap-2 max-w-[200px] lg:max-w-[300px]">
                  <div className="truncate">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">Delivering to</p>
                    <p className="text-xs font-bold text-slate-700 truncate">
                      {customerInfo.customerName} - {customerInfo.addressLine1} ({customerInfo.pincode})
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowAddressModal(true)}
                    className="text-[10px] font-bold text-[#76b900] bg-[#f1f8e9] hover:bg-[#e8f5e9] px-2 py-1 rounded transition shrink-0 flex items-center gap-1"
                  >
                    <MapPin size={12} />
                    Change
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowAddressModal(true)}
                    className="px-2.5 py-1 bg-[#76b900] text-white text-[10px] font-bold rounded shadow-sm hover:opacity-95 transition shrink-0 whitespace-nowrap flex items-center gap-1.5"
                  >
                    <MapPin size={12} />
                    Check Delivery
                  </button>
                </div>
              )}
            </div>
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
      {/* Store Closed Popup Dialog */}
      {showClosedPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center relative border border-slate-100 animate-scaleUp">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Store is Closed Today</h3>
            <p className="text-sm text-slate-600 mb-6 text-left">
              We are currently closed and not accepting orders today.
              {storeOpenStatus.nextOpen ? (
                <>
                  <br />
                  <span className="font-bold text-red-600 block mt-2 text-base text-center">
                    Kindly place your order {storeOpenStatus.nextOpen.day === "Tomorrow" ? "tomorrow" : `on ${storeOpenStatus.nextOpen.day} (${storeOpenStatus.nextOpen.date})`} at {storeOpenStatus.nextOpen.time}.
                  </span>
                </>
              ) : (
                <span className="font-semibold block mt-2 text-center">Please check back soon for our opening hours!</span>
              )}
            </p>
            <button
              onClick={handleClosePopup}
              className="w-full py-3 bg-[#76b900] hover:bg-[#659e00] text-white font-bold rounded-xl shadow-lg transition-colors text-sm"
              style={{ backgroundColor: primaryColor }}
            >
              Close & Continue Browsing
            </button>
          </div>
        </div>
      )}

      {/* Address & Delivery Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn text-slate-800">
          {/* Backdrop click close */}
          <div className="absolute inset-0" onClick={() => setShowAddressModal(false)} />
          
          <div className="bg-white w-full rounded-t-3xl sm:rounded-2xl sm:max-w-lg shadow-2xl border-t sm:border border-slate-100 flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh] overflow-hidden relative z-10 animate-slideUp sm:animate-zoomIn">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <div className="text-left">
                <h3 className="text-base sm:text-lg font-bold text-slate-800">Check Delivery Address</h3>
                <p className="text-[10px] text-gray-500">Enter details to verify availability</p>
              </div>
              <button 
                onClick={() => setShowAddressModal(false)} 
                className="text-slate-400 hover:text-red-500 transition-colors text-2xl font-bold leading-none p-1 animate-none bg-transparent border-none outline-none shadow-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleSaveAddress} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Contact Details */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b pb-1 text-left">Contact Details</h4>
                <div className="relative">
                  <input 
                    type="text" 
                    required 
                    placeholder=" " 
                    value={modalName} 
                    onChange={e => setModalName(e.target.value)} 
                    className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" 
                  />
                  <label className="floating-label">Full Name</label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <input 
                      type="tel" 
                      required 
                      placeholder=" " 
                      maxLength="10" 
                      value={modalPhone} 
                      onChange={e => setModalPhone(e.target.value.replace(/[^0-9]/g, ''))} 
                      className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" 
                    />
                    <label className="floating-label">Mobile Number</label>
                  </div>
                  <div className="relative">
                    <input 
                      type="email" 
                      placeholder=" " 
                      value={modalEmail} 
                      onChange={e => setModalEmail(e.target.value)} 
                      className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" 
                    />
                    <label className="floating-label">Email Address</label>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="space-y-4 pt-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b pb-1 text-left">Delivery Address</h4>
                <div className="relative">
                  <input 
                    type="text" 
                    required 
                    placeholder=" " 
                    value={modalAddress} 
                    onChange={e => setModalAddress(e.target.value)} 
                    className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" 
                  />
                  <label className="floating-label">Address Line 1 (House No, Building, Street)</label>
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder=" " 
                    value={modalLandmark} 
                    onChange={e => setModalLandmark(e.target.value)} 
                    className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" 
                  />
                  <label className="floating-label">Landmark / Area (Optional)</label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <input 
                      type="text" 
                      required 
                      placeholder=" " 
                      maxLength="6" 
                      value={modalPincode} 
                      onChange={e => setModalPincode(e.target.value.replace(/[^0-9]/g, ''))} 
                      className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm font-mono tracking-wider" 
                    />
                    <label className="floating-label">Pincode</label>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder=" " 
                      value={modalAlternate} 
                      onChange={e => setModalAlternate(e.target.value.replace(/[^0-9]/g, ''))} 
                      className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" 
                    />
                    <label className="floating-label">Alternate Number</label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <input 
                      type="text" 
                      required 
                      disabled 
                      placeholder=" " 
                      value={modalCity} 
                      className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-slate-50 text-slate-500 text-sm" 
                    />
                    <label className="floating-label">City</label>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      required 
                      disabled 
                      placeholder=" " 
                      value={modalState} 
                      className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-slate-50 text-slate-500 text-sm" 
                    />
                    <label className="floating-label">State</label>
                  </div>
                </div>
              </div>

              {/* Status Alert */}
              {checkResult.text && (
                <div className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 border text-left animate-fadeIn ${
                  checkResult.type === 'success' 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-red-50 text-red-600 border-red-200'
                }`}>
                  <span>{checkResult.type === 'success' ? '✅' : '⚠️'}</span>
                  <span>{checkResult.text}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 pb-20 sm:pb-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddressModal(false)} 
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 font-bold rounded-xl transition text-sm text-slate-600"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={checkingDelivery || !modalCity || !modalState}
                  className="flex-1 py-3 text-white font-bold rounded-xl transition text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-center flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: primaryColor }}
                >
                  {checkingDelivery ? 'Verifying...' : 'Save & Check'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;