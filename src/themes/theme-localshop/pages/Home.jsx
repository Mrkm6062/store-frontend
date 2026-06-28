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

  const [pincodeInput, setPincodeInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [checkResult, setCheckResult] = useState({ text: '', type: '' });
  const [showInputCard, setShowInputCard] = useState(false);

  useEffect(() => {
    if (customerInfo) {
      setPincodeInput(customerInfo.pincode || '');
      setAddressInput(customerInfo.addressLine1 || '');
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

  const checkDeliveryAvailability = async (e) => {
    e.preventDefault();
    if (!pincodeInput || pincodeInput.trim().length !== 6) {
      setCheckResult({ text: 'Please enter a valid 6-digit pincode.', type: 'error' });
      return;
    }
    if (!addressInput || !addressInput.trim()) {
      setCheckResult({ text: 'Please enter your address.', type: 'error' });
      return;
    }

    setCheckingDelivery(true);
    setCheckResult({ text: '', type: '' });

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      const settingsRes = await fetch(`${API_BASE_URL}/api/delivery-settings/public`, {
        headers: { 'x-store-id': store?._id }
      });
      if (!settingsRes.ok) throw new Error('Failed to load delivery settings.');
      const settings = await settingsRes.json();

      const pinRes = await fetch(`${API_BASE_URL}/api/delivery-settings/public/pincode/${pincodeInput.trim()}`);
      if (!pinRes.ok) throw new Error('Invalid pincode.');
      const pinData = await pinRes.json();

      const city = pinData.city || '';
      const state = pinData.state || '';

      let allowed = false;
      if (settings.deliveryMode === 'state') {
        const allowedStates = (settings.allowedStates || []).map(s => s.toLowerCase());
        allowed = allowedStates.includes(state.toLowerCase().trim());
      } else if (settings.deliveryMode === 'pincode') {
        const allowedPincodes = settings.allowedPincodes || [];
        allowed = allowedPincodes.includes(pincodeInput.trim());
      } else {
        allowed = true;
      }

      if (allowed) {
        const existingInfo = JSON.parse(localStorage.getItem('gb_customer_info') || '{}');
        const updatedInfo = {
          ...existingInfo,
          pincode: pincodeInput.trim(),
          addressLine1: addressInput.trim(),
          city,
          state
        };
        localStorage.setItem('gb_customer_info', JSON.stringify(updatedInfo));
        setCheckResult({ text: 'Delivery is available!', type: 'success' });
        window.dispatchEvent(new Event('customer-info-updated'));
        setTimeout(() => {
          setShowInputCard(false);
          setCheckResult({ text: '', type: '' });
        }, 1500);
      } else {
        setCheckResult({ text: 'Delivery not available to this pincode.', type: 'error' });
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
    <StoreLayout store={store} cartCount={cart.length} onCartClick={() => setIsCartOpen(true)}>
      
      {/* Mobile-only Delivery Check */}
      <div className="block md:hidden bg-slate-50 border-b border-gray-150 p-4">
        {customerInfo?.pincode ? (
          <div className="flex justify-between items-center bg-white border border-gray-200 rounded-xl p-3 shadow-sm text-left">
            <div className="flex items-center gap-2">
              <span className="text-[#76b900]">📍</span>
              <div className="text-left">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Delivering to</p>
                <p className="text-xs font-semibold text-slate-800">{customerInfo.pincode} - {customerInfo.city || 'Saved Address'}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowInputCard(true)}
              className="text-[10px] font-bold text-[#76b900] bg-[#f1f8e9] hover:bg-[#e8f5e9] px-2.5 py-1.5 rounded-lg transition"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-left">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-400 text-base">📍</span>
              <h4 className="font-bold text-slate-800 text-xs">Enter Pincode and Address to Check Delivery</h4>
            </div>
            <form onSubmit={checkDeliveryAvailability} className="space-y-3">
              <div>
                <input 
                  type="text" 
                  placeholder="Enter 6-digit Pincode"
                  maxLength="6"
                  required
                  value={pincodeInput}
                  onChange={e => setPincodeInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]"
                />
              </div>
              <div>
                <textarea 
                  placeholder="Enter Full Address details"
                  required
                  rows="2"
                  value={addressInput}
                  onChange={e => setAddressInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] resize-none"
                />
              </div>
              <button 
                type="submit" 
                disabled={checkingDelivery}
                className="w-full py-2 bg-[#76b900] text-white font-bold rounded-xl text-xs transition shadow-md shadow-green-50 disabled:opacity-50"
              >
                {checkingDelivery ? 'Checking availability...' : 'Check Delivery'}
              </button>
              {checkResult.text && (
                <p className={`text-[10px] font-bold mt-2 ${checkResult.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                  {checkResult.text}
                </p>
              )}
            </form>
          </div>
        )}

        {/* Change address modal overlay/card when already set */}
        {customerInfo?.pincode && showInputCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-sm p-5 border shadow-xl text-left">
              <h4 className="font-bold text-slate-800 text-sm mb-3">Change Delivery Location</h4>
              <form onSubmit={checkDeliveryAvailability} className="space-y-3">
                <div>
                  <input 
                    type="text" 
                    placeholder="Enter 6-digit Pincode"
                    maxLength="6"
                    required
                    value={pincodeInput}
                    onChange={e => setPincodeInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]"
                  />
                </div>
                <div>
                  <textarea 
                    placeholder="Enter Full Address"
                    required
                    rows="2"
                    value={addressInput}
                    onChange={e => setAddressInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] resize-none"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowInputCard(false)}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={checkingDelivery}
                    className="flex-1 py-1.5 bg-[#76b900] text-white hover:opacity-95 rounded-xl text-xs font-semibold transition"
                  >
                    {checkingDelivery ? 'Checking...' : 'Check & Save'}
                  </button>
                </div>
                {checkResult.text && (
                  <p className={`text-xs font-bold mt-2 ${checkResult.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                    {checkResult.text}
                  </p>
                )}
              </form>
            </div>
          </div>
        )}
      </div>

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
        <div className="md:hidden fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] p-4 z-40 flex justify-between items-center pb-safe">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">{cart.reduce((sum, item) => sum + item.qty, 0)} Items</p>
            <p className="text-xl font-extrabold text-green-600">₹{cartTotal}</p>
          </div>
          <button onClick={() => setIsCartOpen(true)} style={{ backgroundColor: primaryColor }} className="text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 shadow-lg transition">
            View Cart &rarr;
          </button>
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