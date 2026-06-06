import React, { useState, useEffect } from 'react';
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

const StoreHome = () => {
  const { store, loading: storeLoading, error: storeError } = useStore();
  const { products, loading: productsLoading, error: productsError } = useProducts();
  const navigate = useNavigate();
  
  const [visibleCount, setVisibleCount] = useState(12);
  const [categories, setCategories] = useState([]);
  const [toast, setToast] = useState(null);
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('gb_store_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('gb_store_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    getPublicCategories().then(setCategories).catch(console.error);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-green-600 font-bold text-xl tracking-wide">
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
      <Banner bannerUrl={store.banner} storeName={store.name} />

      {categories.length > 0 && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-12">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">BROWSE OUR COLLECTIONS</h2>
            <button onClick={() => navigate('/categories')} className="text-sm font-bold text-[#76b900] hover:text-green-700 transition whitespace-nowrap">
              Show All &rarr;
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8 md:gap-10">
            {categories.slice(0, 10).map(c => (
              <div key={c._id} className="w-full">
                <CategoryCard category={c} onClick={(cat) => navigate(`/category/${cat.slug || cat._id}`)} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Latest Products</h2>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-[340px] animate-pulse">
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
              products={products.slice(0, visibleCount)} 
              onAddToCart={handleAddToCart} 
              cart={cart}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveFromCart={handleRemoveFromCart}
            />
            {visibleCount < products.length && (
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

      {/* Why Choose Us Section */}
      <Story />

      {/* Mobile Sticky Bottom Cart Bar */}
      {cart.length > 0 && !isCartOpen && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] p-4 z-40 flex justify-between items-center pb-safe">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">{cart.reduce((sum, item) => sum + item.qty, 0)} Items</p>
            <p className="text-xl font-extrabold text-green-600">₹{cartTotal}</p>
          </div>
          <button onClick={() => setIsCartOpen(true)} className="bg-[#76b900] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#659e00] shadow-lg shadow-green-200 transition">
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
      />

      {/* Custom Toast Notification */}
      {toast && (
        <div className={`fixed top-10 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-3 transition-all animate-fadeIn ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-[#76b900] text-white'}`}>
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          {toast.message}
        </div>
      )}
    </StoreLayout>
  );
};

export default StoreHome;