import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../../services/useStore';
import { useProducts } from '../../../services/useProducts';
import { getPublicCategories } from './api';
import StoreLayout from './StoreLayout';
import ProductGrid from './ProductGrid';

const CategoryPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { store, loading: storeLoading, error: storeError } = useStore();
  const { products, loading: productsLoading, error: productsError } = useProducts();
  
  const [visibleCount, setVisibleCount] = useState(12);
  const [category, setCategory] = useState(null);
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
    getPublicCategories().then(categories => {
      const currentCategory = categories.find(c => c._id === categoryId);
      setCategory(currentCategory);
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
    if (store && category) {
      document.title = `${category.name} - ${store.websiteTitle || store.name}`;
    }
  }, [store, category]);

  const filteredProducts = products.filter(p => p.category === categoryId);

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
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <button onClick={() => navigate('/')} className="text-sm font-bold text-slate-500 hover:text-slate-800 mb-4">&larr; Back to All Products</button>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {category ? `Products in ${category.name}` : 'Loading Category...'}
          </h2>
          {category?.description && <p className="text-gray-500 mt-2 text-lg">{category.description}</p>}
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-[260px] sm:h-[340px] animate-pulse">
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
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] p-4 z-40 flex justify-between items-center pb-safe">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">{cart.reduce((sum, item) => sum + item.qty, 0)} Items</p>
            <p className="text-xl font-extrabold text-green-600">₹{cartTotal}</p>
          </div>
          <button onClick={() => setIsCartOpen(true)} className="bg-[#76b900] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#659e00] shadow-lg shadow-green-200 transition">
            View Cart &rarr;
          </button>
        </div>
      )}

      {/* Cart Sidebar Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
            onClick={() => setIsCartOpen(false)}
          ></div>
          
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col transform transition-transform">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-2xl font-bold text-gray-800">Your Cart</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-500 hover:text-red-500 font-bold text-3xl leading-none">
                &times;
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <div className="text-6xl mb-4">🛒</div>
                  <p className="text-lg font-medium">Your cart is empty.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item._id} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100">
                          {(item.images?.length > 0 ? item.images[0] : item.image) ? (
                            <img src={item.images?.length > 0 ? item.images[0] : item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-medium">No Img</div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 line-clamp-1">{item.name}</p>
                          <p className="text-green-600 font-semibold">₹{item.price} <span className="text-gray-400 text-sm ml-1">x {item.qty} {item.unitType || ''}</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                          <button type="button" onClick={() => handleUpdateQuantity(item._id, -1)} className="px-2 py-1 text-gray-600 hover:text-black font-bold">-</button>
                          <span className="px-2 font-semibold text-sm">{item.qty}</span>
                          <button type="button" onClick={() => handleUpdateQuantity(item._id, 1)} className="px-2 py-1 text-gray-600 hover:text-black font-bold">+</button>
                        </div>
                        <button onClick={() => handleRemoveFromCart(item._id)} className="text-red-500 hover:text-red-700 text-sm font-bold bg-red-50 px-3 py-1.5 rounded-lg transition">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {cart.length > 0 && (
              <div className="p-5 border-t border-gray-100 bg-white">
                <div className="flex justify-between items-center text-sm mb-2 text-gray-500">
                  <span>Subtotal:</span>
                  <span>₹{cartTotal}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-2 text-gray-500">
                  <span>Shipping & Discounts:</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="flex justify-between items-center font-bold text-xl mb-6 text-gray-800">
                  <span>Estimated Total:</span>
                  <span className="text-green-600">₹{cartTotal}</span>
                </div>
                <button key="btn-proceed" type="button" onClick={() => { setIsCartOpen(false); navigate('/checkout'); }} className="w-full bg-[#76b900] text-white font-bold py-4 rounded-xl hover:bg-[#659e00] transition text-lg shadow-lg shadow-green-200">
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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

export default CategoryPage;