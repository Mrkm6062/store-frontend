import React, { useState, useEffect } from 'react';
import { useStore } from './useStore';
import { useProducts } from './useProducts';
import { placeOrder } from './api';
import StoreLayout from './StoreLayout';
import Banner from './Banner';
import ProductGrid from './ProductGrid';

const StoreHome = () => {
  const { store, loading: storeLoading, error: storeError } = useStore();
  const { products, loading: productsLoading, error: productsError } = useProducts();
  
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckout, setIsCheckout] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '', customerEmail: '', customerPhone: '', addressLine1: '', landmark: '', city: '', state: '', pincode: '', alternateNumber: ''
  });

  const handleAddToCart = (product) => {
    setCart((prev) => [...prev, product]);
    setIsCartOpen(true); // Automatically open the cart when an item is added
  };

  const handleRemoveFromCart = (indexToRemove) => {
    setCart((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setIsPlacingOrder(true);
    
    try {
      const orderItems = cart.map(item => ({
        product: item._id,
        name: item.name,
        price: item.price,
        qty: 1
      }));

      await placeOrder({
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        address: {
          addressLine1: formData.addressLine1,
          landmark: formData.landmark,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          mobileNumber: formData.customerPhone,
          alternateNumber: formData.alternateNumber,
        },
        orderItems,
        totalAmount: cartTotal
      });

      alert('Order placed successfully! We will contact you soon.');
      setCart([]);
      setIsCartOpen(false);
      setIsCheckout(false);
    } catch (error) {
      alert('Failed to place order: ' + error.message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

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
      
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Our Products</h2>
          <p className="text-gray-500 mt-2 text-lg">Fresh and featured items from {store.name}</p>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-[340px] animate-pulse">
                <div className="w-full h-48 bg-gray-200"></div>
                <div className="p-5 space-y-4"><div className="h-4 bg-gray-200 rounded w-3/4"></div><div className="h-6 bg-gray-200 rounded w-1/4"></div><div className="h-10 bg-gray-200 rounded-xl w-full mt-4"></div></div>
              </div>
            ))}
          </div>
        ) : productsError ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-2xl font-bold border border-red-100 text-center text-lg">{productsError}</div>
        ) : (
          <ProductGrid products={products} onAddToCart={handleAddToCart} />
        )}
      </div>

      {/* Cart Sidebar Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
            onClick={() => setIsCartOpen(false)}
          ></div>
          
          {/* Sidebar */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col transform transition-transform">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-2xl font-bold text-gray-800">{isCheckout ? 'Checkout' : 'Your Cart'}</h2>
              <button onClick={() => { setIsCartOpen(false); setIsCheckout(false); }} className="text-gray-500 hover:text-red-500 font-bold text-3xl leading-none">
                &times;
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5">
              {isCheckout ? (
                <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4">
                  <h3 className="font-bold text-slate-800 mb-2 border-b pb-2">Contact Details</h3>
                  <input type="text" required placeholder="Full Name" value={formData.customerName} onChange={(e) => setFormData({...formData, customerName: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]" />
                  <input type="email" placeholder="Email Address (Optional)" value={formData.customerEmail} onChange={(e) => setFormData({...formData, customerEmail: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]" />
                  <input type="tel" required placeholder="Mobile Number" value={formData.customerPhone} onChange={(e) => setFormData({...formData, customerPhone: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]" />
                  
                  <h3 className="font-bold text-slate-800 mt-6 mb-2 border-b pb-2">Delivery Address</h3>
                  <input type="text" required placeholder="Address Line 1 (House No, Building, Street)" value={formData.addressLine1} onChange={(e) => setFormData({...formData, addressLine1: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]" />
                  <input type="text" placeholder="Landmark" value={formData.landmark} onChange={(e) => setFormData({...formData, landmark: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" required placeholder="City" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]" />
                    <input type="text" required placeholder="State" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" required placeholder="Pincode" value={formData.pincode} onChange={(e) => setFormData({...formData, pincode: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]" />
                    <input type="tel" placeholder="Alternate Mobile" value={formData.alternateNumber} onChange={(e) => setFormData({...formData, alternateNumber: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]" />
                  </div>
                  
                  <div className="mt-4 pt-4 text-center">
                    <button type="button" onClick={() => setIsCheckout(false)} className="text-sm font-bold text-slate-500 hover:text-slate-800">
                      &larr; Back to Cart
                    </button>
                  </div>
                </form>
              ) : cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <div className="text-6xl mb-4">🛒</div>
                  <p className="text-lg font-medium">Your cart is empty.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-bold text-gray-800">{item.name}</p>
                          <p className="text-green-600 font-semibold">₹{item.price}</p>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveFromCart(idx)} className="text-red-500 hover:text-red-700 text-sm font-bold bg-red-50 px-3 py-1.5 rounded-lg transition">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {cart.length > 0 && (
              <div className="p-5 border-t border-gray-100 bg-white">
                <div className="flex justify-between items-center font-bold text-xl mb-6 text-gray-800">
                  <span>Total:</span>
                  <span className="text-green-600">₹{cartTotal}</span>
                </div>
                {isCheckout ? (
                  <button type="submit" form="checkout-form" disabled={isPlacingOrder} className="w-full bg-[#76b900] text-white font-bold py-4 rounded-xl hover:bg-[#659e00] transition text-lg shadow-lg shadow-green-200 disabled:opacity-50">
                    {isPlacingOrder ? 'Processing...' : 'Confirm & Place Order'}
                  </button>
                ) : (
                  <button onClick={() => setIsCheckout(true)} className="w-full bg-[#76b900] text-white font-bold py-4 rounded-xl hover:bg-[#659e00] transition text-lg shadow-lg shadow-green-200">
                    Proceed to Checkout
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </StoreLayout>
  );
};

export default StoreHome;