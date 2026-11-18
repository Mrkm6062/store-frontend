import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../../../services/useStore';
import StoreLayout from '../Layout';
import { ShoppingCart, Trash2, ArrowLeft, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { ThemeCustomizationContext } from '../../../themeLoader/themeRenderer.jsx';

const CartPage = () => {
  const navigate = useNavigate();
  const { store, loading: storeLoading, error: storeError } = useStore();
  const customization = useContext(ThemeCustomizationContext);
  const primaryColor = customization?.global?.primaryColor || '#e85d04';

  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('gb_store_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [deliverySettings, setDeliverySettings] = useState(null);

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
    localStorage.setItem('gb_store_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
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

  const handleUpdateQuantity = (id, delta) => {
    setCart((prev) => prev.map(item => {
      if (item._id === id) {
        const newQty = item.qty + delta;
        if (delta > 0 && item.maxStock && newQty > item.maxStock) {
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

  const calculateOfferDiscount = (cartItems) => {
    let totalDiscount = 0;
    const offerGroupItems = {};
    const promoNamesMap = {};

    for (const item of cartItems) {
      const activeOffers = (item.offerCategories || []).filter(oc => {
        if (!oc.active) return false;
        const now = new Date();
        if (oc.startDate && now < new Date(oc.startDate)) return false;
        if (oc.endDate && now > new Date(oc.endDate)) return false;
        return oc.offerType === 'B1G1' || oc.offerType === 'B2G1';
      });

      if (activeOffers.length > 0) {
        const bestOffer = activeOffers.find(oc => oc.offerType === 'B1G1') || activeOffers[0];
        const offerId = bestOffer._id || bestOffer;
        const offerName = bestOffer.name || 'Promo';
        promoNamesMap[offerId] = offerName;
        
        if (!offerGroupItems[offerId]) {
          offerGroupItems[offerId] = {
            offerType: bestOffer.offerType,
            prices: []
          };
        }

        const itemPrice = item.price;
        for (let i = 0; i < item.qty; i++) {
          offerGroupItems[offerId].prices.push(itemPrice);
        }
      }
    }

    const appliedPromos = [];

    for (const offerId in offerGroupItems) {
      const group = offerGroupItems[offerId];
      group.prices.sort((a, b) => b - a);

      const count = group.prices.length;
      let groupDiscount = 0;
      if (group.offerType === 'B1G1') {
        const freeCount = Math.floor(count / 2);
        if (freeCount > 0) {
          const cheapestItems = group.prices.slice(-freeCount);
          groupDiscount = cheapestItems.reduce((sum, p) => sum + p, 0);
        }
      } else if (group.offerType === 'B2G1') {
        const freeCount = Math.floor(count / 3);
        if (freeCount > 0) {
          const cheapestItems = group.prices.slice(-freeCount);
          groupDiscount = cheapestItems.reduce((sum, p) => sum + p, 0);
        }
      }

      if (groupDiscount > 0) {
        totalDiscount += groupDiscount;
        if (promoNamesMap[offerId]) {
          appliedPromos.push(promoNamesMap[offerId]);
        }
      }
    }

    return {
      totalDiscount,
      appliedPromoNames: appliedPromos
    };
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const { totalDiscount: offerDiscount, appliedPromoNames } = calculateOfferDiscount(cart);
  const discountedTotal = Math.max(0, cartTotal - offerDiscount);

  const freeLimit = deliverySettings?.freeShippingThreshold || 0;
  const baseCharge = deliverySettings?.baseCharge || 0;
  const minOrderLimit = Number(deliverySettings?.minimumOrderLimitThreshold || 0);
  const isBelowMinOrder = minOrderLimit > 0 && cartTotal < minOrderLimit;
  const amountNeededForMinOrder = Math.max(0, minOrderLimit - cartTotal);
  const minOrderProgress = minOrderLimit > 0 ? Math.min(100, Math.round((cartTotal / minOrderLimit) * 100)) : 100;

  const isShippingFree = freeLimit > 0 && discountedTotal >= freeLimit;
  const shippingCharge = isShippingFree ? 0 : baseCharge;
  const estimatedTotal = discountedTotal;
  const amountNeededForFreeDelivery = Math.max(0, freeLimit - discountedTotal);

  if (storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-bold text-xl" style={{ color: primaryColor }}>
        <span className="animate-pulse">Loading Cart...</span>
      </div>
    );
  }

  return (
    <StoreLayout store={store} cartCount={cart.length} onCartClick={() => {}}>
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* Breadcrumb / Top Bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-orange-100">
          <div>
            <Link to="/" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors mb-2">
              <ArrowLeft size={16} className="mr-1" /> Continue Shopping
            </Link>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-stone-900">Your Shopping Cart</h1>
          </div>
          <span className="text-sm font-bold text-slate-500 bg-orange-50 px-4 py-2 rounded-xl border border-orange-100">
            {cart.reduce((sum, item) => sum + item.qty, 0)} Items
          </span>
        </div>

        {cart.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-orange-100 shadow-[0_8px_30px_rgba(91,45,19,0.06)] max-w-lg mx-auto">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-400">
              <ShoppingCart size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Your Cart is Empty</h2>
            <p className="text-slate-500 mb-8 text-sm">Looks like you haven't added any items to your cart yet.</p>
            <Link 
              to="/" 
              style={{ backgroundColor: primaryColor }}
              className="inline-flex items-center gap-2 px-8 py-4 text-white font-extrabold rounded-2xl shadow-lg hover:opacity-90 transition text-base"
            >
              Start Shopping <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Items */}
            <div className="lg:col-span-7 space-y-4">
              {cart.map((item) => (
                <div key={item._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-white border border-orange-100 rounded-2xl shadow-[0_4px_16px_rgba(91,45,19,0.05)] gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100 relative">
                      {(item.customImageBase64 || (item.images?.length > 0 ? item.images[0] : item.image)) ? (
                        <img src={item.images?.length > 0 ? item.images[0] : item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-medium">No Img</div>
                      )}
                      {item.customImageBase64 && (
                        <img src={item.customImageBase64} alt="Custom" className="absolute bottom-0 right-0 w-6 h-6 object-cover rounded shadow-sm border border-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{item.name}</h3>
                      <p className="text-[#c94710] font-black text-lg">
                        ₹{item.price} 
                        <span className="text-gray-400 text-xs font-semibold ml-1.5">x {item.qty} {item.unitType || ''}</span>
                      </p>
                      {item.customText && (
                        <p className="text-xs text-slate-500 mt-1"><span className="font-semibold text-slate-700">Text:</span> {item.customText}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                    <div className="flex items-center bg-orange-50 rounded-xl border border-orange-100 p-1">
                      <button 
                        type="button" 
                        onClick={() => handleUpdateQuantity(item._id, -1)} 
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-black font-bold text-base rounded-lg hover:bg-white transition"
                      >
                        -
                      </button>
                      <span className="px-3 font-extrabold text-sm">{item.qty}</span>
                      <button 
                        type="button" 
                        onClick={() => handleUpdateQuantity(item._id, 1)} 
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-black font-bold text-base rounded-lg hover:bg-white transition"
                      >
                        +
                      </button>
                    </div>

                    <div className="font-extrabold text-slate-800 text-base min-w-[70px] text-right">
                      ₹{item.price * item.qty}
                    </div>

                    <button 
                      onClick={() => handleRemoveFromCart(item._id)} 
                      className="text-red-500 hover:text-red-700 text-xs font-bold bg-red-50 p-2.5 rounded-xl transition hover:bg-red-100"
                      title="Remove Item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-4 flex justify-between items-center">
                <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition">
                  <ArrowLeft size={16} /> Add More Products
                </Link>
                <button 
                  onClick={() => { if (window.confirm('Are you sure you want to clear your cart?')) setCart([]); }}
                  className="text-xs font-bold text-slate-400 hover:text-red-500 transition"
                >
                  Clear Entire Cart
                </button>
              </div>
            </div>

            {/* Right Column: Order Summary & Threshold Guard */}
            <div className="lg:col-span-5">
              <div className="bg-white p-6 sm:p-7 rounded-[1.35rem] shadow-[0_8px_28px_rgba(91,45,19,0.07)] border border-orange-100 sticky top-24">
                <h2 className="text-xl font-black text-slate-800 mb-5 border-b pb-3">Order Summary</h2>

                {/* Minimum Order Limit Alert Banner */}
                {minOrderLimit > 0 && (
                  <div className={`p-4 rounded-2xl text-xs font-bold mb-5 ${isBelowMinOrder ? 'bg-amber-50 text-amber-900 border-2 border-amber-300 shadow-sm' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                    {isBelowMinOrder ? (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="flex items-center gap-1.5 font-black text-amber-900 text-sm">
                            <AlertCircle size={18} className="text-amber-600" /> Minimum Order Required: ₹{minOrderLimit}
                          </span>
                          <span className="text-xs font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                            ₹{cartTotal} / ₹{minOrderLimit}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-amber-800 mt-1 leading-relaxed">
                          Please add <span className="font-black text-amber-950 underline decoration-amber-500 underline-offset-2">₹{amountNeededForMinOrder}</span> more worth of products to your cart to reach the store's minimum order requirement.
                        </p>
                        <div className="w-full bg-amber-200/80 h-2.5 rounded-full mt-3 overflow-hidden">
                          <div 
                            className="bg-amber-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${minOrderProgress}%` }}
                          />
                        </div>
                        <Link 
                          to="/" 
                          className="inline-flex items-center gap-1 mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                        >
                          + Browse Products to Add ₹{amountNeededForMinOrder}
                        </Link>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-800 text-xs">
                        <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                        <span>Minimum order threshold of ₹{minOrderLimit} satisfied! You can now proceed to checkout.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Free Delivery Promo Message */}
                {freeLimit > 0 && (
                  <div className={`p-3 rounded-xl text-xs font-bold mb-4 text-center ${isShippingFree ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                    {isShippingFree ? (
                      <span>Free delivery unlocked! 🎉</span>
                    ) : (
                      <span>Add ₹{amountNeededForFreeDelivery} more for FREE shipping</span>
                    )}
                  </div>
                )}

                <div className="space-y-3 mb-5 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>Items Subtotal:</span>
                    <span className="font-bold text-slate-800">₹{cartTotal}</span>
                  </div>
                  {offerDiscount > 0 && (
                    <div className="flex justify-between text-orange-600 font-bold">
                      <span>Promo Discount ({appliedPromoNames.join(', ')}):</span>
                      <span>-₹{offerDiscount}</span>
                    </div>
                  )}

                </div>

                <div className="flex justify-between items-center font-extrabold text-xl mb-6 text-slate-900 border-t border-dashed border-gray-200 pt-4">
                  <span>Estimated Total:</span>
                  <span className="text-[#9f2d19]">₹{estimatedTotal}</span>
                </div>

                {isBelowMinOrder ? (
                  <button 
                    type="button" 
                    disabled={true} 
                    className="w-full bg-slate-200 text-slate-500 font-extrabold py-4 rounded-2xl transition text-base shadow-none cursor-not-allowed flex flex-col items-center justify-center gap-0.5"
                  >
                    <span>Add ₹{amountNeededForMinOrder} More to Checkout</span>
                    <span className="text-xs font-medium text-slate-400">Minimum Order Required: ₹{minOrderLimit}</span>
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => navigate('/checkout')} 
                    className="w-full text-white font-extrabold py-4 rounded-2xl transition text-lg shadow-lg hover:opacity-90 flex items-center justify-center gap-2" 
                    style={{ backgroundColor: primaryColor }}
                  >
                    Proceed to Checkout <ArrowRight size={20} />
                  </button>
                )}

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                  <ShieldCheck size={16} />
                  <span>Secure SSL Checkout & Fast Delivery</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StoreLayout>
  );
};

export default CartPage;
