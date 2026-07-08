import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../services/useStore';
import { useProducts } from '../../../services/useProducts';
import { getPublicCategories } from '../../../services/api';
import StoreLayout from '../Layout';
import Banner from '../components/Banner';
import ProductGrid from '../components/ProductGrid';
import CategoryCard from '../components/CategoryCard';
import Story from '../components/story';
import CartSidebar from '../components/CartSidebar';
import { ThemeCustomizationContext } from '../../../themeLoader/themeRenderer.jsx';
import { MapPin } from 'lucide-react';

const StoreHome = () => {
  const { store, loading: storeLoading, error: storeError } = useStore();
  const { products, loading: productsLoading, error: productsError } = useProducts();
  const navigate = useNavigate();
  const customization = useContext(ThemeCustomizationContext);
  const primaryColor = customization?.global?.primaryColor || '#76b900';
  
  const [visibleCount, setVisibleCount] = useState(12);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('gb_store_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

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
    localStorage.setItem('gb_store_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const handleCartUpdate = () => {
      const saved = localStorage.getItem('gb_store_cart');
      if (saved) {
        try { setCart(JSON.parse(saved)); } catch(e) {}
      } else {
        setCart([]);
      }
    };
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  useEffect(() => {
    getPublicCategories()
      .then(data => {
        setCategories(data);
        setCategoriesLoading(false);
      })
      .catch(err => {
        console.error(err);
        setCategoriesLoading(false);
      });
  }, []);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAddToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        if (existing.qty >= product.maxStock) {
          showToast(`Sorry, only ${product.maxStock} units available in stock.`);
          return prev;
        }
        return prev.map(item => 
          item._id === product._id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      
      if (product.maxStock <= 0) return prev; // Fallback safeguard
      
      const resolvedPrice = product.basePrice || (product.variants?.length > 0 ? product.variants[0].price : product.price) || 0;
      return [...prev, { ...product, price: resolvedPrice, qty: 1 }];
    });
  };

  const handleUpdateQuantity = (id, delta) => {
    setCart((prev) => prev.map(item => {
      if (item._id === id) {
        const newQty = item.qty + delta;
        if (delta > 0 && newQty > item.maxStock) {
          showToast(`Sorry, only ${item.maxStock} units available in stock.`);
          return item;
        }
        return { ...item, qty: Math.max(1, newQty) };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item._id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  useEffect(() => {
    if (store) {
      // Update Document Title
      document.title = store.websiteTitle || store.name || 'Storefront';

      // Update Favicon
      if (store.favicon) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = store.favicon;
      }

      // Update Meta Description
      if (store.metaDescription) {
        let meta = document.querySelector("meta[name='description']");
        if (meta) {
          meta.content = store.metaDescription;
        }
      }

      // Inject dynamic Organization JSON-LD Schema
      let script = document.querySelector('#store-schema');
      if (!script) {
        script = document.createElement('script');
        script.id = 'store-schema';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": store.name,
        "url": store.subdomain ? `https://${store.subdomain}` : window.location.origin,
        "logo": store.logo || ""
      });
    }
  }, [store]);

  if (storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-bold text-xl tracking-wide" style={{ color: primaryColor }}>
        <span className="animate-pulse">Loading Store...</span>
      </div>
    );
  }

  if (storeError || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="h-24 w-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-4xl mb-2 shadow-inner">🏪</div>
        <h1 className="text-3xl font-extrabold text-gray-800">Store Not Available</h1>
        <p className="text-gray-500 text-lg">The store you are looking for does not exist or is inactive.</p>
      </div>
    );
  }

  return (
    <StoreLayout store={store} cartCount={cart.length} onCartClick={() => setIsCartOpen(true)} hideBottomNav={showAddressModal}>
      
      {/* Top Location Bar */}
      <div className="bg-slate-50 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:px-12 lg:px-16">
          {customerInfo?.pincode ? (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-left">
                <MapPin className="text-[#76b900]" size={18} />
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider hidden sm:block">Delivering to</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">
                    {customerInfo.customerName} - {customerInfo.addressLine1}, {customerInfo.city} ({customerInfo.pincode})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddressModal(true)}
                className="text-xs font-bold text-[#76b900] bg-[#f1f8e9] hover:bg-[#e8f5e9] px-3 py-1.5 rounded-lg transition shrink-0"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
              <div className="flex items-start sm:items-center gap-2">
                <MapPin className="text-gray-400" size={18} />
                <span className="text-xs sm:text-sm text-slate-600 font-semibold">
                  check delivery availability
                </span>
              </div>
              <button 
                onClick={() => setShowAddressModal(true)}
                className="w-full sm:w-auto px-4 py-2 bg-[#76b900] text-white text-xs font-bold rounded-xl shadow-md shadow-green-100 hover:opacity-95 transition shrink-0 text-center animate-pulse"
              >
                Add Address
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Address & Delivery Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
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
                className="text-slate-400 hover:text-red-500 transition-colors text-2xl font-bold leading-none p-1"
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
                      required 
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
              <div className="space-y-4">
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
                    required 
                    placeholder=" " 
                    value={modalLandmark} 
                    onChange={e => setModalLandmark(e.target.value)} 
                    className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" 
                  />
                  <label className="floating-label">Landmark</label>
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
                      className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" 
                    />
                    <label className="floating-label">Pincode</label>
                  </div>
                  <div className="relative">
                    <input 
                      type="tel" 
                      required 
                      placeholder=" " 
                      maxLength="10" 
                      value={modalAlternate} 
                      onChange={e => setModalAlternate(e.target.value.replace(/[^0-9]/g, ''))} 
                      className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" 
                    />
                    <label className="floating-label">Alternate Mobile</label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <input 
                      type="text" 
                      required 
                      placeholder=" " 
                      value={modalCity} 
                      onChange={e => setModalCity(e.target.value)} 
                      className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" 
                    />
                    <label className="floating-label">City</label>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      required 
                      placeholder=" " 
                      value={modalState} 
                      onChange={e => setModalState(e.target.value)} 
                      className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" 
                    />
                    <label className="floating-label">State</label>
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="pt-2">
                {checkResult.text && (
                  <div className={`p-3 rounded-xl text-xs font-bold mb-4 text-left ${checkResult.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                    {checkResult.type === 'success' ? '✅' : '⚠️'} {checkResult.text}
                  </div>
                )}
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowAddressModal(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-600 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={checkingDelivery}
                    className="flex-1 py-3 bg-[#76b900] text-white font-bold rounded-xl text-sm transition shadow-md shadow-green-50 disabled:opacity-50"
                  >
                    {checkingDelivery ? 'Checking...' : 'Check & Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoomIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-zoomIn {
          animation: zoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <Banner bannerUrl={store.banner} storeName={store.name} />

      {(categoriesLoading || categories.length > 0) && (
        <div className="max-w-5xl mx-auto w-full px-3 sm:px-12 lg:px-16 pt-8 md:pt-16">
          <div className="text-center mb-6 md:mb-10">
            <h2 className="text-lg md:text-3xl font-extrabold text-gray-900 tracking-tight text-center">Our Collections</h2>
          </div>
          
          <div className="grid grid-cols-4 gap-3 sm:gap-6 md:gap-12 justify-items-center">
            {categoriesLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="w-full aspect-square bg-gray-200/50 rounded-full animate-pulse"></div>
              ))
            ) : (
              categories.slice(0, 12).map(c => (
                <div key={c._id} className="w-full">
                  <CategoryCard category={c} onClick={(cat) => navigate(`/category/${cat.slug || cat._id}`)} />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto w-full px-3 sm:px-12 lg:px-16 py-12">
        {productsLoading || categoriesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 md:gap-8 justify-items-center">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-[340px] w-full max-w-[260px] animate-pulse">
                <div className="w-full h-32 sm:h-48 bg-gray-200"></div>
                <div className="p-3 sm:p-5 space-y-4"><div className="h-4 bg-gray-200 rounded w-3/4"></div><div className="h-6 bg-gray-200 rounded w-1/4"></div><div className="h-8 sm:h-10 bg-gray-200 rounded-xl w-full mt-2 sm:mt-4"></div></div>
              </div>
            ))}
          </div>
        ) : productsError ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-2xl font-bold border border-red-100 text-center text-lg">{productsError}</div>
        ) : (
          <div className="space-y-16">
            {categories
              .map(c => {
                const categoryProducts = products.filter(p => p.category === c._id);
                return { category: c, products: categoryProducts };
              })
              .filter(item => item.products.length > 0)
              .map(({ category, products: categoryProducts }) => (
                <div key={category._id} className="border-b border-gray-100 pb-10 last:border-b-0 last:pb-0">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                      {category.name}
                    </h2>
                  </div>
                  
                  <ProductGrid 
                    products={categoryProducts.slice(0, 4)} 
                    onAddToCart={handleAddToCart} 
                    cart={cart}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveFromCart={handleRemoveFromCart}
                  />

                  <div className="mt-6 flex justify-center w-full">
                    <button 
                      onClick={() => navigate(`/category/${category.slug || category._id}`)}
                      className="w-full md:w-auto px-8 py-3 bg-white border-2 font-bold rounded-xl transition-all duration-300 shadow-sm hover:shadow-md hover:text-white text-center"
                      style={{
                        borderColor: primaryColor,
                        color: primaryColor,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = primaryColor;
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = primaryColor;
                      }}
                    >
                      View All Products
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Why Choose Us Section */}
      <Story />

      {/* Mobile Sticky Bottom Cart Bar */}
      {cart.length > 0 && !isCartOpen && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] p-4 z-40 flex flex-col gap-2 pb-safe">
          {deliverySettings?.freeShippingThreshold > 0 && (
            <div className={`text-[10px] font-bold text-center py-1 rounded-lg ${cartTotal >= deliverySettings.freeShippingThreshold ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
              {cartTotal >= deliverySettings.freeShippingThreshold ? (
                <span>Free delivery unlocked! 🎉</span>
              ) : (
                <span>Add ₹{deliverySettings.freeShippingThreshold - cartTotal} more to get free delivery</span>
              )}
            </div>
          )}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">{cart.reduce((sum, item) => sum + item.qty, 0)} Items</p>
              <p className="text-xl font-extrabold text-green-600">₹{cartTotal}</p>
            </div>
            <button onClick={() => setIsCartOpen(true)} style={{ backgroundColor: primaryColor }} className="text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 shadow-lg transition">
              View Cart &rarr;
            </button>
          </div>
        </div>
      )}

      <CartSidebar 
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveFromCart={handleRemoveFromCart}
        cartTotal={cartTotal}
        primaryColor={primaryColor}
        store={store}
        deliverySettings={deliverySettings}
      />

      {/* Custom Toast Notification */}
      {toast && (
        <div 
          className="fixed top-10 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-3 transition-all animate-fadeIn text-white"
          style={{ backgroundColor: toast.type === 'error' ? '#ef4444' : primaryColor }}
        >
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          {toast.message}
        </div>
      )}
    </StoreLayout>
  );
};

export default StoreHome;