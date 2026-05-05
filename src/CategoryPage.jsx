import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from './useStore';
import { useProducts } from './useProducts';
import { placeOrder, getPublicCategories } from './api';
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
  const [isCheckout, setIsCheckout] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [formData, setFormData] = useState(() => {
    const savedInfo = localStorage.getItem('gb_customer_info');
    return savedInfo ? JSON.parse(savedInfo) : {
      customerName: '', customerEmail: '', customerPhone: '', addressLine1: '', landmark: '', city: '', state: '', pincode: '', alternateNumber: ''
    };
  });
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMessage, setCouponMessage] = useState({ text: '', type: '' });
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [deliverySettings, setDeliverySettings] = useState(null);
  const [checkoutSettings, setCheckoutSettings] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');

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

  // Fetch public delivery settings for this store
  useEffect(() => {
    if (store && store._id) {
      const fetchDeliverySettings = async () => {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
          const [delRes, chkRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/delivery-settings/public`, { headers: { 'x-store-id': store._id } }),
            fetch(`${API_BASE_URL}/api/checkout-settings/public`, { headers: { 'x-store-id': store._id } })
          ]);
          if (delRes.ok) {
            setDeliverySettings(await delRes.json());
          }
          if (chkRes.ok) {
            const chkData = await chkRes.json();
            setCheckoutSettings(chkData);
            if (!chkData.codEnabled && chkData.whatsappEnabled) setPaymentMethod('whatsapp');
            else if (!chkData.codEnabled && !chkData.whatsappEnabled && chkData.razorpayEnabled) setPaymentMethod('razorpay');
          }
        } catch (error) {
          console.error('Failed to fetch store settings', error);
        }
      };
      fetchDeliverySettings();
    }
  }, [store]);

  // Auto-fill City and State when a 6-digit Pincode is entered
  useEffect(() => {
    const fetchPincodeDetails = async () => {
      if (formData.pincode && formData.pincode.trim().length === 6) {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
          const response = await fetch(`${API_BASE_URL}/api/delivery-settings/public/pincode/${formData.pincode.trim()}`);
          if (response.ok) {
            const data = await response.json();
            setFormData(prev => ({ ...prev, city: data.city || prev.city, state: data.state || prev.state }));
          }
        } catch (error) {
          console.error('Failed to fetch pincode details', error);
        }
      }
    };
    fetchPincodeDetails();
  }, [formData.pincode]);

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
  const discountedTotal = cartTotal - discountAmount;

  let shippingCharge = 0;
  if (deliverySettings && deliverySettings.baseCharge > 0) {
    if (deliverySettings.freeShippingThreshold === 0 || discountedTotal < deliverySettings.freeShippingThreshold) {
      shippingCharge = deliverySettings.baseCharge;
    }
  }
  const finalTotal = discountedTotal + shippingCharge;

  // Clear applied coupon if the cart contents/total change
  useEffect(() => {
    if (appliedCoupon) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponCode('');
      setCouponMessage({ text: 'Cart changed. Please re-apply your coupon.', type: 'error' });
    }
  }, [cartTotal]);

  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault();
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    setCouponMessage({ text: '', type: '' });

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
      const response = await fetch(`${API_BASE_URL}/api/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-store-id': store._id },
        body: JSON.stringify({ code: couponCode, cartTotal })
      });
      const data = await response.json();
      if (response.ok) {
        setAppliedCoupon(data.coupon);
        setDiscountAmount(data.calculatedDiscount);
        setCouponMessage({ text: data.message, type: 'success' });
      } else {
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setCouponMessage({ text: data.message, type: 'error' });
      }
    } catch (error) {
      setCouponMessage({ text: 'Failed to validate coupon', type: 'error' });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setIsPlacingOrder(true);
    
    if (formData.pincode && formData.pincode.trim().length < 6) {
      showToast('Pincode must be exactly 6 digits.');
      setIsPlacingOrder(false);
      return;
    }

    if (formData.customerPhone && formData.customerPhone.trim().length < 10) {
      showToast('Mobile Number must be exactly 10 digits.');
      setIsPlacingOrder(false);
      return;
    }

    if (formData.alternateNumber && formData.alternateNumber.trim().length > 0 && formData.alternateNumber.trim().length < 10) {
      showToast('Alternate Mobile Number must be exactly 10 digits.');
      setIsPlacingOrder(false);
      return;
    }

    if (formData.customerEmail && formData.customerEmail.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.customerEmail.trim())) {
        showToast('Please enter a valid email address.');
        setIsPlacingOrder(false);
        return;
      }
    }

    // Validate Delivery Rules
    if (deliverySettings) {
      if (deliverySettings.deliveryMode === 'state') {
        const allowed = deliverySettings.allowedStates.map(s => s.toLowerCase());
        if (!allowed.includes((formData.state || '').toLowerCase().trim())) {
          showToast(`Sorry, we do not deliver to ${formData.state} at the moment.`);
          setIsPlacingOrder(false);
          return;
        }
      } else if (deliverySettings.deliveryMode === 'pincode') {
        if (!deliverySettings.allowedPincodes.includes((formData.pincode || '').trim())) {
          showToast(`Sorry, we do not deliver to pincode ${formData.pincode} at the moment.`);
          setIsPlacingOrder(false);
          return;
        }
      }
    }

    try {
      const orderItems = cart.map(item => {
        const idParts = item._id.split('-');
        return {
          product: idParts[0],
          variantId: idParts[1] || null,
          name: item.name,
          price: item.price,
          qty: item.qty
        };
      });

      const createdOrder = await placeOrder({
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
        totalAmount: finalTotal,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        discountAmount: discountAmount,
        shippingCharge: shippingCharge,
        paymentMethod: paymentMethod
      });

      if (paymentMethod === 'whatsapp' && checkoutSettings?.whatsappNumber) {
        let itemsText = cart.map(item => `- ${item.qty}x ${item.name} (₹${item.price})`).join('%0A');
        let trackingLink = `${window.location.origin}/track/${createdOrder._id}`;
        let text = `Hello! I have placed an order (ID: ${createdOrder._id.slice(-6).toUpperCase()}).%0A%0A*Order Details:*%0A${itemsText}%0A%0ASubtotal: ₹${cartTotal}%0ADiscount: -₹${discountAmount}%0AShipping: ₹${shippingCharge}%0A*Total Amount: ₹${finalTotal}*%0A%0A*Customer Info:*%0AName: ${formData.customerName}%0APhone: ${formData.customerPhone}%0AAddress: ${formData.addressLine1}, ${formData.city}, ${formData.state} - ${formData.pincode}%0A%0A*Track Order Status:* ${trackingLink}`;
        
        let num = checkoutSettings.whatsappNumber.replace(/[^0-9]/g, '');
        if (num.length === 10) num = '91' + num;
        
        window.open(`https://wa.me/${num}?text=${text}`, '_blank');
        showToast('Order saved. Redirecting to WhatsApp...', 'success');
      } else if (paymentMethod === 'razorpay') {
        showToast('Order saved! (Razorpay modal would load here)', 'success');
        // Note: Actual Razorpay requires <script> injection and order creation from the server
      } else {
        showToast('Order placed successfully! We will contact you soon.', 'success');
      }

      localStorage.setItem('gb_customer_info', JSON.stringify(formData));
      setCart([]);
      localStorage.removeItem('gb_store_cart');
      setIsCartOpen(false);
      setIsCheckout(false);
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponCode('');
      setCouponMessage({ text: '', type: '' });
    } catch (error) {
      showToast('Failed to place order: ' + error.message, 'error');
    } finally {
      setIsPlacingOrder(false);
    }
  };

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
            <p className="text-xl font-extrabold text-green-600">₹{finalTotal}</p>
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
                  <input type="tel" required placeholder="Mobile Number" maxLength="10" value={formData.customerPhone} onChange={(e) => setFormData({...formData, customerPhone: e.target.value.replace(/[^0-9]/g, '')})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]" />
                  
                  <h3 className="font-bold text-slate-800 mt-6 mb-2 border-b pb-2">Delivery Address</h3>
                  <input type="text" required placeholder="Address Line 1 (House No, Building, Street)" value={formData.addressLine1} onChange={(e) => setFormData({...formData, addressLine1: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]" />
                  <input type="text" placeholder="Landmark" value={formData.landmark} onChange={(e) => setFormData({...formData, landmark: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" required placeholder="City" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]" />
                    <input type="text" required placeholder="State" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" required placeholder="Pincode" maxLength="6" value={formData.pincode} onChange={(e) => setFormData({...formData, pincode: e.target.value.replace(/[^0-9]/g, '')})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]" />
                    <input type="tel" placeholder="Alternate Mobile" maxLength="10" value={formData.alternateNumber} onChange={(e) => setFormData({...formData, alternateNumber: e.target.value.replace(/[^0-9]/g, '')})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]" />
                  </div>
                  
                  <h3 className="font-bold text-slate-800 mt-6 mb-2 border-b pb-2">Payment Method</h3>
                  <div className="flex flex-col gap-3">
                    {checkoutSettings?.codEnabled !== false && (
                      <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition ${paymentMethod === 'cod' ? 'border-[#76b900] bg-green-50' : 'border-slate-200 bg-white'}`}><input type="radio" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="w-4 h-4 text-[#76b900]" /><span className="font-bold text-slate-700">Cash on Delivery (COD)</span></label>
                    )}
                    {checkoutSettings?.whatsappEnabled && (
                      <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition ${paymentMethod === 'whatsapp' ? 'border-[#76b900] bg-green-50' : 'border-slate-200 bg-white'}`}><input type="radio" value="whatsapp" checked={paymentMethod === 'whatsapp'} onChange={() => setPaymentMethod('whatsapp')} className="w-4 h-4 text-[#76b900]" /><span className="font-bold text-slate-700">Order via WhatsApp</span></label>
                    )}
                    {checkoutSettings?.razorpayEnabled && (
                      <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition ${paymentMethod === 'razorpay' ? 'border-[#76b900] bg-green-50' : 'border-slate-200 bg-white'}`}><input type="radio" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} className="w-4 h-4 text-[#76b900]" /><span className="font-bold text-slate-700">Pay Online (Razorpay)</span></label>
                    )}
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
                {isCheckout && (
                  <div className="mb-4">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Enter Coupon Code" 
                        value={couponCode} 
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        disabled={appliedCoupon}
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] font-mono uppercase text-sm"
                      />
                      {appliedCoupon ? (
                        <button type="button" onClick={() => { setAppliedCoupon(null); setDiscountAmount(0); setCouponCode(''); setCouponMessage({text: '', type: ''}); }} className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition text-sm">
                          Remove
                        </button>
                      ) : (
                        <button type="button" onClick={handleApplyCoupon} disabled={isValidatingCoupon || !couponCode} className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition disabled:opacity-50 text-sm">
                          {isValidatingCoupon ? '...' : 'Apply'}
                        </button>
                      )}
                    </div>
                    {couponMessage.text && <p className={`text-xs font-bold mt-2 ${couponMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{couponMessage.text}</p>}
                  </div>
                )}

                <div className="flex justify-between items-center text-sm mb-2 text-gray-500">
                  <span>Subtotal:</span>
                  <span>₹{cartTotal}</span>
                </div>
                {appliedCoupon && (
                    <div className="flex justify-between items-center text-sm mb-2 text-green-600 font-bold">
                      <span>Discount ({appliedCoupon.code}):</span>
                      <span>-₹{discountAmount}</span>
                    </div>
                )}
                <div className="flex justify-between items-center text-sm mb-2 text-gray-500">
                  <span>Shipping:</span>
                  <span>{shippingCharge > 0 ? `₹${shippingCharge}` : 'Free'}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-xl mb-6 text-gray-800">
                  <span>Total:</span>
                  <span className="text-green-600">₹{finalTotal}</span>
                </div>
                {isCheckout ? (
                  <button key="btn-confirm" type="submit" form="checkout-form" disabled={isPlacingOrder} className="w-full bg-[#76b900] text-white font-bold py-4 rounded-xl hover:bg-[#659e00] transition text-lg shadow-lg shadow-green-200 disabled:opacity-50">
                    {isPlacingOrder ? 'Processing...' : 'Confirm & Place Order'}
                  </button>
                ) : (
                  <button key="btn-proceed" type="button" onClick={() => setIsCheckout(true)} className="w-full bg-[#76b900] text-white font-bold py-4 rounded-xl hover:bg-[#659e00] transition text-lg shadow-lg shadow-green-200">
                    Proceed to Checkout
                  </button>
                )}
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