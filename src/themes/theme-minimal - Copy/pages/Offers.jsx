import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../../services/useStore';
import { useProducts } from '../../../services/useProducts';
import { getPublicOfferCategories } from '../../../services/api';
import StoreLayout from '../Layout';
import ProductGrid from '../components/ProductGrid';
import CartSidebar from '../components/CartSidebar';
import { ThemeCustomizationContext } from '../../../themeLoader/themeRenderer.jsx';
import { Percent, Gift, ChevronRight, AlertTriangle } from 'lucide-react';

const OffersPage = () => {
  const { store, loading: storeLoading, error: storeError } = useStore();
  const { products, loading: productsLoading, error: productsError } = useProducts();
  const navigate = useNavigate();
  const location = useLocation();
  const customization = useContext(ThemeCustomizationContext);
  const primaryColor = customization?.global?.primaryColor || '#76b900';

  const [offerCategories, setOfferCategories] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [selectedOfferId, setSelectedOfferId] = useState('all');

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
    getPublicOfferCategories()
      .then(data => {
        setOfferCategories(data);
        setLoadingOffers(false);
        
        const queryParams = new URLSearchParams(location.search);
        const idFromQuery = queryParams.get('id') || location.state?.selectedOfferId;
        if (idFromQuery && data.some(oc => oc._id === idFromQuery)) {
          setSelectedOfferId(idFromQuery);
        } else {
          setSelectedOfferId('all');
        }
      })
      .catch(err => {
        console.error(err);
        setLoadingOffers(false);
      });
  }, [location.search, location.state]);

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

  // Filter products that belong to the active offer category
  const filteredProducts = products.filter(p => {
    const pOfferIds = (p.offerCategories || []).map(oc => oc._id || oc);
    if (selectedOfferId === 'all') {
      return pOfferIds.some(id => offerCategories.some(oc => oc._id === id));
    }
    return pOfferIds.includes(selectedOfferId);
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  return (
    <StoreLayout 
      store={store} 
      cartCount={cart.reduce((sum, item) => sum + item.qty, 0)}
      onCartClick={() => setIsCartOpen(true)}
    >
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slideUp">
          <div className="bg-red-600 text-white px-6 py-3.5 rounded-2xl shadow-xl font-bold flex items-center gap-3">
            <AlertTriangle size={18} />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Hero Banner Section */}
      <div className="relative py-16 px-6 overflow-hidden bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent)] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-extrabold uppercase tracking-widest mb-4">
            <Percent size={14} /> Today's Deals & Promos
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-sm">Special Store Offers</h1>
          <p className="text-lg text-white/95 max-w-2xl mx-auto font-medium">
            Explore exclusive Buy 1 Get 1 (B1G1) offers, bundle promotions, and percentage discounts across our items.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-left">
        
        {/* Deal Categories tabs */}
        {loadingOffers ? (
          <div className="flex justify-center py-10"><span className="text-slate-500 font-bold">Loading special offers...</span></div>
        ) : offerCategories.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-100 mb-10">
            <Gift className="mx-auto text-slate-400 mb-4" size={48} />
            <h3 className="text-xl font-bold text-slate-700">No active offers today</h3>
            <p className="text-slate-500 text-sm mt-1">Check back later for exciting promotions and coupon deals.</p>
          </div>
        ) : (
          <div className="mb-10">
            <div className="flex flex-wrap gap-3 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200">
              <button
                onClick={() => setSelectedOfferId('all')}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${selectedOfferId === 'all' ? 'bg-[#76b900] text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/50'}`}
              >
                All Deals ({products.filter(p => (p.offerCategories || []).length > 0).length})
              </button>
              {offerCategories.map(oc => {
                const count = products.filter(p => (p.offerCategories || []).map(id => id._id || id).includes(oc._id)).length;
                return (
                  <button
                    key={oc._id}
                    onClick={() => setSelectedOfferId(oc._id)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${selectedOfferId === oc._id ? 'bg-[#76b900] text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/50'}`}
                  >
                    <span style={{ backgroundColor: oc.color }} className="w-2.5 h-2.5 rounded-full inline-block"></span>
                    {oc.name} ({count})
                  </button>
                );
              })}
            </div>

            {/* Render Category Details if specific category selected */}
            {selectedOfferId !== 'all' && (
              (() => {
                const activeOffer = offerCategories.find(oc => oc._id === selectedOfferId);
                if (!activeOffer) return null;
                return (
                  <div style={{ borderColor: activeOffer.color + '30', backgroundColor: activeOffer.color + '05' }} className="p-6 rounded-3xl border mb-6 text-left animate-fadeIn">
                    <div className="flex items-center gap-3">
                      <span style={{ backgroundColor: activeOffer.color }} className="text-white text-xs font-extrabold uppercase px-3 py-1 rounded-full">
                        {activeOffer.offerType === 'B1G1' ? 'Buy 1 Get 1 Free' : activeOffer.offerType === 'B2G1' ? 'Buy 2 Get 1 Free' : activeOffer.offerType === 'DISCOUNT' ? `${activeOffer.discountPercentage}% Discount` : 'Promo Deal'}
                      </span>
                      {activeOffer.endDate && (
                        <span className="text-xs text-slate-400 font-semibold">Ends: {new Date(activeOffer.endDate).toLocaleDateString()}</span>
                      )}
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-800 mt-2">{activeOffer.name}</h2>
                    {activeOffer.description && <p className="text-slate-600 text-sm mt-1">{activeOffer.description}</p>}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* Products Grid */}
        {!productsLoading && (
          <div className="space-y-6">
            <h3 className="text-2xl font-extrabold text-slate-800">
              {selectedOfferId === 'all' ? 'Active Promo Products' : 'Offer Products'}
            </h3>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                <h3 className="text-lg text-slate-400 font-bold">No products found in this promotion.</h3>
              </div>
            ) : (
              <ProductGrid 
                products={filteredProducts} 
                onAddToCart={handleAddToCart}
                cart={cart}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveFromCart={handleRemoveFromCart}
              />
            )}
          </div>
        )}

      </div>

      {/* Cart Sidebar Drawer */}
      <CartSidebar 
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveFromCart={handleRemoveFromCart}
        cartTotal={cartTotal}
        primaryColor={primaryColor}
        store={store}
      />
    </StoreLayout>
  );
};

export default OffersPage;
