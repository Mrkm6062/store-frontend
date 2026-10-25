import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../services/useStore';
import { useProducts } from '../../../services/useProducts';
import { getPublicCategories, getPublicOfferCategories } from '../../../services/api';
import StoreLayout from '../Layout';
import Banner from '../components/Banner';
import ProductGrid from '../components/ProductGrid';
import CategoryCard from '../components/CategoryCard';
import Story from '../components/Story';
import CartSidebar from '../components/CartSidebar';
import { ThemeCustomizationContext } from '../../../themeLoader/themeRenderer.jsx';
import { MapPin } from 'lucide-react';

const StoreHome = () => {
  const { store, loading: storeLoading, error: storeError } = useStore();
  const { products, loading: productsLoading, error: productsError } = useProducts();
  const navigate = useNavigate();
  const customization = useContext(ThemeCustomizationContext);
  const primaryColor = customization?.global?.primaryColor || '#e85d04';
  
  const [visibleCount, setVisibleCount] = useState(12);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [offerCategories, setOfferCategories] = useState([]);
  const [offerCategoriesLoading, setOfferCategoriesLoading] = useState(true);
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
  const [diningPreference, setDiningPreference] = useState(() => {
    try {
      const saved = localStorage.getItem('gb_dining_preference');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [deliverySettings, setDeliverySettings] = useState(null);

  useEffect(() => {
    const handleDiningUpdate = () => {
      try {
        const saved = localStorage.getItem('gb_dining_preference');
        setDiningPreference(saved ? JSON.parse(saved) : null);
      } catch (e) {}
    };
    window.addEventListener('dining-preference-updated', handleDiningUpdate);
    return () => window.removeEventListener('dining-preference-updated', handleDiningUpdate);
  }, []);

  useEffect(() => {
    if (store?._id) {
      const API_BASE_URL = import.meta.env.VITE_API_URL || '';
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

    getPublicOfferCategories()
      .then(data => {
        setOfferCategories(data);
        setOfferCategoriesLoading(false);
      })
      .catch(err => {
        console.error(err);
        setOfferCategoriesLoading(false);
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
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'description';
          document.head.appendChild(meta);
        }
        meta.content = store.metaDescription;
      }

      // Update Meta Keywords
      const rawKeywords = store.metaKeywords || store.seoSettings?.metaKeywords;
      if (rawKeywords) {
        const kwStr = Array.isArray(rawKeywords) ? rawKeywords.join(', ') : String(rawKeywords).trim();
        if (kwStr) {
          let metaKw = document.querySelector("meta[name='keywords']");
          if (!metaKw) {
            metaKw = document.createElement('meta');
            metaKw.name = 'keywords';
            document.head.appendChild(metaKw);
          }
          metaKw.content = kwStr;
        }
      }

      // Update Canonical Link
      const rawCanonical = (store.canonicalDomain || store.seoSettings?.canonicalDomain || '').trim();
      if (rawCanonical) {
        let cleanDomain = rawCanonical.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
        while (cleanDomain.toLowerCase().includes('.galibrand.cloud.galibrand.cloud')) {
          cleanDomain = cleanDomain.replace(/\.galibrand\.cloud\.galibrand\.cloud/gi, '.galibrand.cloud');
        }
        const currentPath = window.location.pathname;
        const fullCanonical = `https://${cleanDomain}${currentPath === '/' ? '' : currentPath}`;

        let canonicalLink = document.querySelector("link[rel='canonical']");
        if (!canonicalLink) {
          canonicalLink = document.createElement('link');
          canonicalLink.rel = 'canonical';
          document.head.appendChild(canonicalLink);
        }
        canonicalLink.href = fullCanonical;
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
    <StoreLayout store={store} cartCount={cart.length} onCartClick={() => setIsCartOpen(true)} hideBottomNav={false}>
      
      {/* Top Location Bar - Mobile only (hidden on desktop, and hidden when Dine-in is selected) */}
      {diningPreference?.orderType !== 'Dine-in' && (
        <div className="bg-[#fff5e8] border-b border-orange-100 md:hidden block">
          <div className="max-w-6xl mx-auto px-4 py-3 text-center flex flex-col justify-center items-center gap-1.5">
            {customerInfo?.pincode ? (
              <div className="flex flex-col items-center justify-center gap-1.5 w-full text-center">
                <div className="flex items-center justify-center gap-1.5 text-center">
                  <MapPin className="text-[#e85d04]" size={18} />
                  <span className="text-xs font-bold text-slate-800">
                    {customerInfo.customerName} - {customerInfo.addressLine1}, {customerInfo.city} ({customerInfo.pincode})
                  </span>
                </div>
                <button 
                  onClick={() => window.dispatchEvent(new Event('open-address-modal'))}
                  className="text-xs font-bold text-[#c94710] bg-white hover:bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-100 transition"
                >
                  Change Location
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 w-full text-center">
                <button 
                  onClick={() => window.dispatchEvent(new Event('open-address-modal'))}
                  className="px-4 py-2 text-white text-xs font-bold rounded-xl shadow-md hover:opacity-95 transition text-center flex items-center justify-center gap-1.5 mx-auto"
                  style={{ backgroundColor: primaryColor }}
                >
                  <MapPin size={16} />
                  Check Delivery
                </button>
              </div>
            )}
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
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 lg:px-10 pt-9 md:pt-14">
          <div className="flex flex-col items-center text-center mb-7 md:mb-10">
            <span className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#c94710]">Taste the tradition</span>
            <h2 className="text-2xl md:text-4xl font-black text-stone-900 tracking-tight text-center">Pick your favourite</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-stone-500">Fresh snacks and familiar flavours, chosen just the way you like them.</p>
          </div>

          <div className="grid grid-cols-4 gap-3 sm:gap-5 md:gap-8 lg:gap-10 justify-items-center">
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

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 lg:px-10 py-12 md:py-16">
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
          <div className="space-y-14 md:space-y-20">
            {categories
              .map(c => {
                const categoryProducts = products.filter(p => p.category === c._id);
                return { category: c, products: categoryProducts };
              })
              .filter(item => item.products.length > 0)
              .map(({ category, products: categoryProducts }) => (
                <div key={category._id} className="border-b border-orange-100/70 pb-12 last:border-b-0 last:pb-0">
                  <div className="flex justify-between items-end gap-4 mb-6 md:mb-7">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#c94710]">Freshly prepared</span>
                      <h2 className="mt-1 text-2xl sm:text-3xl md:text-4xl font-black text-stone-900 tracking-tight">
                        {category.name}
                      </h2>
                    </div>
                    <button onClick={() => navigate(`/category/${category.slug || category._id}`)} className="hidden sm:inline-flex shrink-0 items-center rounded-full border border-orange-200 bg-white px-4 py-2 text-xs font-extrabold text-[#c94710] shadow-sm transition hover:border-orange-300 hover:bg-orange-50">View all</button>
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
                      className="w-full md:w-auto px-8 py-3 rounded-xl border-2 bg-white text-sm font-extrabold transition-all duration-300 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:text-white text-center"
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

            {/* Offer Categories */}
            {offerCategories
              .map(oc => {
                const offerProducts = products.filter(p => 
                  p.offerCategories && p.offerCategories.some(id => (id._id || id) === oc._id)
                );
                return { offerCategory: oc, products: offerProducts };
              })
              .filter(item => item.products.length > 0)
              .map(({ offerCategory, products: offerProducts }) => (
                <div key={offerCategory._id} className="border-b border-orange-100/70 pb-12 last:border-b-0 last:pb-0">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <span style={{ backgroundColor: offerCategory.color }} className="w-3.5 h-3.5 rounded-full inline-block"></span>
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-stone-900 tracking-tight text-left">
                        {offerCategory.name}
                      </h2>
                    </div>
                  </div>
                  
                  <ProductGrid 
                    products={offerProducts.slice(0, 4)} 
                    onAddToCart={handleAddToCart} 
                    cart={cart}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveFromCart={handleRemoveFromCart}
                  />

                  <div className="mt-6 flex justify-center w-full">
                    <button 
                      onClick={() => navigate(`/offers?id=${offerCategory._id}`)}
                      className="w-full md:w-auto px-8 py-3 rounded-xl border-2 bg-white text-sm font-extrabold transition-all duration-300 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:text-white text-center"
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
                      View All {offerCategory.name}
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
        <div className="md:hidden fixed bottom-[4.25rem] left-0 right-0 bg-[#fffdf9]/95 backdrop-blur-xl border-t border-orange-100 shadow-[0_-10px_26px_rgba(91,45,19,0.08)] p-3.5 z-40 flex flex-col gap-2 pb-safe">
          {deliverySettings?.minimumOrderLimitThreshold > 0 && cartTotal < deliverySettings.minimumOrderLimitThreshold ? (
            <div className="text-[10px] font-bold text-center py-1.5 px-2 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 flex items-center justify-center gap-1.5">
              <span>⚠️</span>
              <span>Add ₹{deliverySettings.minimumOrderLimitThreshold - cartTotal} more to reach minimum order (₹{deliverySettings.minimumOrderLimitThreshold})</span>
            </div>
          ) : deliverySettings?.freeShippingThreshold > 0 ? (
            <div className={`text-[10px] font-bold text-center py-1 rounded-lg ${cartTotal >= deliverySettings.freeShippingThreshold ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
              {cartTotal >= deliverySettings.freeShippingThreshold ? (
                <span>Free delivery unlocked! 🎉</span>
              ) : (
                <span>Add ₹{deliverySettings.freeShippingThreshold - cartTotal} more to get free delivery</span>
              )}
            </div>
          ) : null}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">{cart.reduce((sum, item) => sum + item.qty, 0)} Items</p>
              <p className="text-xl font-extrabold text-[#9f2d19]">₹{cartTotal}</p>
            </div>
            <button onClick={() => setIsCartOpen(true)} style={{ backgroundColor: primaryColor }} className="text-white px-7 py-3 rounded-xl text-sm font-extrabold hover:opacity-90 shadow-lg transition">
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
