import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../../services/useStore';
import { useProducts } from '../../../services/useProducts';
import { getPublicCategories } from '../../../services/api';
import StoreLayout from '../Layout';
import ProductGrid from '../components/ProductGrid';
import CategoryCard from '../components/CategoryCard';
import CartSidebar from '../components/CartSidebar';
import { ThemeCustomizationContext } from '../../../themeLoader/themeRenderer.jsx';
import { LayoutGrid } from 'lucide-react';

const CategoryPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { store, loading: storeLoading, error: storeError } = useStore();
  const { products, loading: productsLoading, error: productsError } = useProducts();
  const customization = useContext(ThemeCustomizationContext);
  const primaryColor = customization?.global?.primaryColor || '#76b900';
  
  const [visibleCount, setVisibleCount] = useState(12);
  const [category, setCategory] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [toast, setToast] = useState(null);
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('gb_store_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
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
    getPublicCategories().then(categories => {
      setAllCategories(categories);
      if (categoryId === 'all') {
        setCategory(null);
      } else {
        const currentCategory = categories.find(c => c.slug === categoryId || c._id === categoryId);
        setCategory(currentCategory);
      }
    }).catch(console.error);
  }, [categoryId]);

  useEffect(() => {
    setVisibleCount(12);
  }, [categoryId]);

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
      
      if (product.maxStock <= 0) return prev;
      
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
      document.title = category 
        ? `${category.name} - ${store.websiteTitle || store.name}`
        : `All Products - ${store.websiteTitle || store.name}`;
    }
  }, [store, category]);

  const filteredProducts = category ? products.filter(p => p.category === category._id) : products;

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
      <div className="max-w-5xl mx-auto w-full px-3 sm:px-12 lg:px-16 py-12">
        {/* Style block to hide scrollbars */}
        <style>{`
          .scrollbar-none::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-none {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>

        {/* Horizontal Category Selector */}
        <div className="border-b border-gray-200/80 bg-white sticky top-0 z-30 -mx-3 sm:-mx-12 lg:-mx-16 px-3 sm:px-12 lg:px-16 mb-8 py-4 shadow-sm backdrop-blur-md bg-white/95">
          <div className="max-w-5xl mx-auto flex items-center gap-3 overflow-x-auto scrollbar-none snap-x pb-1">
            {/* "All Products" Button */}
            <button
              onClick={() => navigate('/category/all')}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm snap-start shrink-0 transition-all duration-250 border ${
                !category 
                  ? 'text-white shadow-md shadow-green-150 scale-105' 
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              style={{ backgroundColor: !category ? primaryColor : undefined, borderColor: !category ? primaryColor : undefined }}
            >
              <LayoutGrid size={16} />
              <span>All Products</span>
            </button>

            {/* Other Categories */}
            {allCategories.map(c => {
              const isActive = category && category._id === c._id;
              return (
                <button
                  key={c._id}
                  onClick={() => navigate(`/category/${c.slug || c._id}`)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm snap-start shrink-0 transition-all duration-250 border ${
                    isActive 
                      ? 'text-white shadow-md shadow-green-150 scale-105' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  style={{ backgroundColor: isActive ? primaryColor : undefined, borderColor: isActive ? primaryColor : undefined }}
                >
                  {c.image ? (
                    <img 
                      src={c.image} 
                      alt={c.name} 
                      className="w-6 h-6 rounded-lg object-cover border border-slate-200/50" 
                    />
                  ) : (
                    <span className="text-base">📦</span>
                  )}
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 md:gap-8 justify-items-center">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-[260px] sm:h-[340px] w-full max-w-[260px] animate-pulse">
                <div className="w-full h-32 sm:h-48 bg-gray-200"></div>
                <div className="p-3 sm:p-5 space-y-4"><div className="h-4 bg-gray-200 rounded w-3/4"></div><div className="h-6 bg-gray-200 rounded w-1/4"></div><div className="h-8 sm:h-10 bg-gray-200 rounded-xl w-full mt-2 sm:mt-4"></div></div>
              </div>
            ))}
          </div>
        ) : productsError ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-2xl font-bold border border-red-100 text-center text-lg">{productsError}</div>
        ) : (
          <>
            <ProductGrid 
              products={filteredProducts.slice(0, visibleCount)} 
              onAddToCart={handleAddToCart} 
              cart={cart}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveFromCart={handleRemoveFromCart}
            />
            {visibleCount < filteredProducts.length && (
              <div className="mt-10 text-center flex justify-center">
                <button 
                  onClick={() => setVisibleCount(prev => prev + 12)} 
                  className="px-8 py-3 bg-white border-2 border-[#76b900] text-[#76b900] font-bold rounded-xl hover:bg-[#76b900] hover:text-white transition-colors shadow-sm hover:shadow-md"
                >
                  Load More Products
                </button>
              </div>
            )}
          </>
        )}
      </div>

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

export default CategoryPage;