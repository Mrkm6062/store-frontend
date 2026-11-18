import React, { useState, useEffect, useContext } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  ArrowLeft,
  RefreshCcw,
  Key,
  LogOut,
  Receipt,
  ChefHat,
  UtensilsCrossed,
  UserCheck,
  Phone
} from 'lucide-react';
import { useStore } from '../../../services/useStore';
import { ThemeCustomizationContext } from '../../../themeLoader/themeRenderer.jsx';
import StoreLayout from '../Layout';

const TrackOrder = () => {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const directOrderId = orderId || searchParams.get('orderId') || searchParams.get('id');
  const navigate = useNavigate();
  const { store, loading: storeLoading, error: storeError } = useStore();
  const customization = useContext(ThemeCustomizationContext);
  const primaryColor = customization?.global?.primaryColor || '#e85d04';
  
  const [customerToken, setCustomerToken] = useState(localStorage.getItem('gb_customer_token') || null);
  const [customerEmail, setCustomerEmail] = useState(localStorage.getItem('gb_customer_email') || '');
  
  // Auth States
  const [authStep, setAuthStep] = useState(customerToken ? 'tracking' : 'email'); // 'email' | 'otp' | 'tracking'
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Orders State & Mobile Master-Detail View
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [mobileView, setMobileView] = useState(directOrderId ? 'details' : 'list'); // 'list' | 'details'

  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('gb_store_cart');
    return saved ? JSON.parse(saved) : [];
  });

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

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    if (store) {
      document.title = `Track Order - ${store.name}`;
      if (store.favicon) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = store.favicon;
      }
    }
  }, [store]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-store-id': store._id },
        body: JSON.stringify({ email: emailInput })
      });
      const data = await response.json();
      if (response.ok) {
        setCustomerEmail(emailInput);
        setAuthStep('otp');
      } else {
        setAuthError(data.message || 'Failed to send OTP.');
      }
    } catch (err) {
      setAuthError('Network error.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-store-id': store._id },
        body: JSON.stringify({ email: customerEmail, otp: otpInput })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('gb_customer_token', data.token);
        localStorage.setItem('gb_customer_email', data.email);
        setCustomerToken(data.token);
        setAuthStep('tracking');
      } else {
        setAuthError(data.message || 'Invalid OTP.');
      }
    } catch (err) {
      setAuthError('Network error.');
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoadingData(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/auth/orders`, {
        headers: { 
          'Authorization': `Bearer ${customerToken}`,
          'x-store-id': store._id 
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
        if (data.length > 0) {
          localStorage.setItem('gb_customer_name', data[0].customerName || '');
          window.dispatchEvent(new Event('customer-login-updated'));
          if (orderId) {
            const found = data.find(o => o._id === orderId);
            setSelectedOrder(found || data[0]);
            setMobileView('details');
          } else {
            setSelectedOrder(data[0]);
          }
        }
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!directOrderId) return;
    if (!customerToken) {
      setLoadingData(true);
      const baseUrl = import.meta.env.VITE_API_URL || '';
      fetch(`${baseUrl}/api/public-order/${directOrderId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data._id) {
            setSelectedOrder(data);
            setOrders([data]);
            setAuthStep('tracking');
            setMobileView('details');
          }
        })
        .catch(console.error)
        .finally(() => setLoadingData(false));
    }
  }, [directOrderId, customerToken]);

  useEffect(() => {
    if (authStep === 'tracking' && customerToken && store?._id) {
      fetchOrders();
    }
  }, [authStep, customerToken, store]);

  const handleLogout = () => {
    localStorage.removeItem('gb_customer_token');
    localStorage.removeItem('gb_customer_email');
    localStorage.removeItem('gb_customer_name');
    window.dispatchEvent(new Event('customer-login-updated'));
    setCustomerToken(null);
    setCustomerEmail('');
    setAuthStep('email');
    setOrders([]);
    setSelectedOrder(null);
    setMobileView('list');
  };

  if (storeLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-bold" style={{ color: primaryColor }}><RefreshCcw className="animate-spin mr-2" /> Loading Store...</div>;

  if (storeError || !store) return <div className="min-h-screen flex items-center justify-center">Store not found.</div>;

  const renderAuth = () => (
    <div className="max-w-md mx-auto bg-white p-8 rounded-[1.75rem] shadow-[0_8px_28px_rgba(91,45,19,0.08)] border border-orange-100 mt-12">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4" style={{ color: primaryColor }}><Key size={32} /></div>
        <h2 className="text-2xl font-extrabold text-slate-800">Track Your Orders</h2>
        <p className="text-slate-500 mt-2">{authStep === 'email' ? 'Enter your email to view your order history and tracking details.' : `Enter the verification code sent to ${customerEmail}`}</p>
      </div>
      {authError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold text-center mb-4">{authError}</div>}
      
      {authStep === 'email' ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
            <input required type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#e85d04]" placeholder="you@example.com" />
          </div>
          <button type="submit" disabled={authLoading} style={{ backgroundColor: primaryColor }} className="w-full py-3 text-white font-bold rounded-xl hover:opacity-90 transition disabled:opacity-50 shadow-lg">{authLoading ? 'Sending...' : 'Send OTP'}</button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">6-Digit OTP</label>
            <input required type="text" maxLength="6" value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#e85d04] text-center text-2xl tracking-[0.5em] font-mono" placeholder="••••••" />
          </div>
          <button type="submit" disabled={authLoading || otpInput.length !== 6} style={{ backgroundColor: primaryColor }} className="w-full py-3 text-white font-bold rounded-xl hover:opacity-90 transition disabled:opacity-50 shadow-lg">{authLoading ? 'Verifying...' : 'Verify & View Orders'}</button>
          <button type="button" onClick={() => setAuthStep('email')} className="w-full py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition">Use a different email</button>
        </form>
      )}
    </div>
  );

  // Status mapping for Dine-in orders (3 steps: Placed -> Preparing in Kitchen -> Order Served)
  const getDineInStep = (status) => {
    if (status === 'placed') return 1;
    if (status === 'preparing') return 2;
    if (status === 'delivered' || status === 'shipped' || status === 'finish') return 3;
    return 1;
  };

  // Status mapping for Delivery orders (4 steps: Placed -> Preparing -> Out for Delivery -> Delivered)
  const getDeliveryStep = (status) => {
    if (status === 'placed') return 1;
    if (status === 'preparing') return 2;
    if (status === 'shipped') return 3;
    if (status === 'delivered') return 4;
    return 1;
  };

  return (
    <StoreLayout store={store} cartCount={cart.length} onCartClick={() => navigate('/')} hideFooter={true}>
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft size={16} className="mr-1" /> Back to Store
          </Link>
          {customerToken ? (
            <button onClick={handleLogout} className="text-sm font-bold text-red-500 hover:text-red-700 flex items-center gap-1 transition">
              <LogOut size={16} /> Logout
            </button>
          ) : (
            <button onClick={() => setAuthStep('email')} className="text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition">
              <Key size={14} /> View All Past Orders
            </button>
          )}
        </div>

        {authStep !== 'tracking' ? renderAuth() : loadingData ? (
          <div className="text-center py-20 font-bold flex items-center justify-center" style={{ color: primaryColor }}><RefreshCcw className="animate-spin mr-2" /> Loading Orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center bg-white p-12 rounded-[1.75rem] shadow-[0_8px_28px_rgba(91,45,19,0.08)] border border-orange-100 mt-12">
            <Package size={64} className="mx-auto text-slate-300 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800">No Orders Found</h2>
            <p className="text-slate-500 mt-2 mb-6">We couldn't find any orders placed with {customerEmail}.</p>
            <Link to="/" style={{ backgroundColor: primaryColor }} className="px-6 py-3 text-white font-bold rounded-xl hover:opacity-90">Start Shopping</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Order History List (Desktop always visible; Mobile visible only in 'list' view) */}
            <div className={`lg:col-span-1 space-y-4 ${mobileView === 'details' ? 'hidden lg:block' : 'block'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-slate-800">Your Order History</h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">{orders.length}</span>
              </div>
              <div className="flex flex-col gap-3 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {orders.map(order => {
                  const isOrderDineIn = Boolean(
                    (order.orderType && order.orderType.toLowerCase() === 'dine-in') ||
                    (order.tableNumber && order.tableNumber !== '0' && order.tableNumber !== '')
                  );

                  return (
                    <button 
                      key={order._id}
                      onClick={() => { 
                        setSelectedOrder(order); 
                        setMobileView('details');
                        navigate(`/track/${order._id}`); 
                      }}
                      className={`text-left p-4 rounded-2xl border transition-all ${selectedOrder?._id === order._id ? 'border-orange-500 bg-orange-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-bold text-slate-800 text-sm">#{order._id.slice(-6).toUpperCase()}</span>
                          <div className="mt-1">
                            {isOrderDineIn ? (
                              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-extrabold bg-amber-100 text-amber-800 inline-block">
                                Dine-in {order.tableNumber && order.tableNumber !== '0' ? `• T-${order.tableNumber}` : ''}
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-extrabold bg-blue-100 text-blue-800 inline-block">
                                Delivery
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-100">
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                          order.orderStatus === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                          order.orderStatus === 'shipped' ? (isOrderDineIn ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-700') :
                          order.orderStatus === 'preparing' ? 'bg-amber-100 text-amber-800' :
                          order.orderStatus === 'canceled' ? 'bg-red-100 text-red-700' :
                          order.orderStatus === 'returned' ? 'bg-orange-100 text-orange-700' :
                          order.orderStatus === 'wasted' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {(() => {
                            if (isOrderDineIn && (order.orderStatus === 'shipped' || order.orderStatus === 'delivered' || order.orderStatus === 'finish')) return 'SERVED';
                            if (order.orderStatus === 'preparing') return 'PREPARING';
                            if (order.orderStatus === 'shipped') return 'OUT FOR DELIVERY';
                            if (order.orderStatus === 'delivered') return 'DELIVERED';
                            if (order.orderStatus === 'placed') return 'ORDER PLACED';
                            return order.orderStatus;
                          })()}
                        </span>
                        <span className="font-extrabold text-slate-800">₹{order.totalAmount}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Order Details & Tracking (Desktop always visible; Mobile visible in 'details' view) */}
            <div className={`lg:col-span-2 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
              
              {/* Mobile Back Button */}
              <div className="lg:hidden mb-4">
                <button
                  onClick={() => setMobileView('list')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-95 shadow-xs"
                >
                  <ArrowLeft size={14} /> Back to Order List ({orders.length})
                </button>
              </div>

              {selectedOrder && (() => {
                const isDineIn = Boolean(
                  (selectedOrder.orderType && selectedOrder.orderType.toLowerCase() === 'dine-in') ||
                  (selectedOrder.tableNumber && selectedOrder.tableNumber !== '0' && selectedOrder.tableNumber !== '')
                );
                const dineStep = getDineInStep(selectedOrder.orderStatus);
                const deliveryStep = getDeliveryStep(selectedOrder.orderStatus);
                const isCanceled = selectedOrder.orderStatus === 'canceled';
                const isReturned = selectedOrder.orderStatus === 'returned';
                const isWasted = selectedOrder.orderStatus === 'wasted';

                return (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h1 className="text-2xl font-extrabold text-slate-800">Order Details</h1>
                          {isDineIn ? (
                            <span className="text-xs uppercase tracking-wider px-2.5 py-0.5 rounded-full font-extrabold bg-amber-100 text-amber-800">
                              Dine-in {selectedOrder.tableNumber && selectedOrder.tableNumber !== '0' ? `• Table ${selectedOrder.tableNumber}` : ''}
                            </span>
                          ) : (
                            <span className="text-xs uppercase tracking-wider px-2.5 py-0.5 rounded-full font-extrabold bg-blue-100 text-blue-800">
                              Delivery
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500">ID: <span className="font-mono font-bold text-slate-700">#{selectedOrder._id.slice(-6).toUpperCase()}</span></p>
                      </div>
                      <div className="text-left sm:text-right flex flex-col sm:items-end gap-2.5">
                        <div>
                          <p className="text-sm font-bold text-slate-500">Total Paid</p>
                          <p className="text-xl font-extrabold" style={{ color: primaryColor }}>₹{selectedOrder.totalAmount}</p>
                        </div>
                        <a
                          href={`/receipt/${selectedOrder._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition hover:opacity-90 active:scale-95"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Receipt size={14} />
                          View Receipt
                        </a>
                      </div>
                    </div>

                    <div className="p-6 md:p-8">
                      {/* Tracking Timeline */}
                      <div className="mb-10">
                        {isCanceled || isReturned || isWasted ? (
                          <div className={`p-4 rounded-xl flex items-center gap-3 ${
                            isCanceled ? 'bg-red-50 text-red-700 border border-red-100' :
                            isWasted ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            'bg-orange-50 text-orange-700 border border-orange-100'
                          }`}>
                            <XCircle size={24} className="shrink-0" />
                            <div>
                              <p className="font-bold text-lg">
                                {isCanceled ? 'Order Canceled' : isWasted ? 'Order Voided' : 'Order Returned'}
                              </p>
                              <p className="text-sm opacity-80">
                                {isCanceled ? (selectedOrder.cancelReason ? `Reason: ${selectedOrder.cancelReason}` : 'This order has been canceled.') :
                                 isWasted ? (selectedOrder.wastedReason ? `Reason: ${selectedOrder.wastedReason}` : 'This order was voided by store.') :
                                 'Items from this order have been returned.'}
                              </p>
                            </div>
                          </div>
                        ) : isDineIn ? (
                          /* DINE-IN TIMELINE (3 Stages: Placed -> Preparing in Kitchen -> Order Served) */
                          <div className="relative">
                            {/* Desktop Progress Bar (Horizontal) */}
                            <div className="hidden md:block absolute top-6 left-[16.66%] right-[16.66%] h-1 bg-slate-100">
                              <div
                                className="h-full transition-all duration-500 rounded-full"
                                style={{
                                  backgroundColor: primaryColor,
                                  width: dineStep === 1 ? '0%' : dineStep === 2 ? '50%' : '100%'
                                }}
                              />
                            </div>

                            {/* Mobile Progress Bar (Vertical) */}
                            <div className="md:hidden absolute left-6 top-6 bottom-6 w-1 bg-slate-100 -translate-x-1/2">
                              <div
                                className="w-full transition-all duration-500 rounded-full"
                                style={{
                                  backgroundColor: primaryColor,
                                  height: dineStep === 1 ? '0%' : dineStep === 2 ? '50%' : '100%'
                                }}
                              />
                            </div>
                            
                            <div className="space-y-8 md:space-y-0 md:flex md:justify-between relative">
                              {/* Step 1: Placed */}
                              <div className="flex md:flex-col items-center md:text-center relative z-10 gap-4 md:gap-2 flex-1">
                                <div
                                  className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors ${dineStep >= 1 ? 'border-white text-white shadow-md' : 'bg-slate-100 border-white text-slate-400'}`}
                                  style={dineStep >= 1 ? { backgroundColor: primaryColor } : {}}
                                >
                                  <Package size={20} />
                                </div>
                                <div className="md:text-center">
                                  <p className={`font-bold text-sm ${dineStep >= 1 ? 'text-slate-800' : 'text-slate-400'}`}>Order Placed</p>
                                  <p className="text-xs text-slate-500">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                                </div>
                              </div>

                              {/* Step 2: Preparing in Kitchen */}
                              <div className="flex md:flex-col items-center md:text-center relative z-10 gap-4 md:gap-2 flex-1">
                                <div
                                  className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors ${dineStep >= 2 ? 'border-white text-white shadow-md' : 'bg-slate-100 border-white text-slate-400'}`}
                                  style={dineStep >= 2 ? { backgroundColor: primaryColor } : {}}
                                >
                                  <ChefHat size={20} />
                                </div>
                                <div className="md:text-center">
                                  <p className={`font-bold text-sm ${dineStep >= 2 ? 'text-slate-800' : 'text-slate-400'}`}>Preparing in Kitchen</p>
                                  <p className="text-xs text-slate-500">
                                    {selectedOrder.preparingAt ? new Date(selectedOrder.preparingAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (dineStep >= 2 ? 'Cooking in Progress' : 'Queued')}
                                  </p>
                                </div>
                              </div>

                              {/* Step 3: Order Served */}
                              <div className="flex md:flex-col items-center md:text-center relative z-10 gap-4 md:gap-2 flex-1">
                                <div
                                  className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors ${dineStep >= 3 ? 'border-white text-white shadow-md' : 'bg-slate-100 border-white text-slate-400'}`}
                                  style={dineStep >= 3 ? { backgroundColor: primaryColor } : {}}
                                >
                                  <UtensilsCrossed size={20} />
                                </div>
                                <div className="md:text-center">
                                  <p className={`font-bold text-sm ${dineStep >= 3 ? 'text-slate-800' : 'text-slate-400'}`}>Order Served</p>
                                  <p className="text-xs text-slate-500">
                                    {selectedOrder.deliveredAt ? new Date(selectedOrder.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (dineStep >= 3 ? 'Served at Table' : 'Pending')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* DELIVERY TIMELINE (4 Stages: Placed -> Preparing -> Out for Delivery -> Delivered) */
                          <div className="relative">
                            {/* Desktop Progress Bar (Horizontal) */}
                            <div className="hidden md:block absolute top-6 left-[12.5%] right-[12.5%] h-1 bg-slate-100">
                              <div
                                className="h-full transition-all duration-500 rounded-full"
                                style={{
                                  backgroundColor: primaryColor,
                                  width: deliveryStep === 1 ? '0%' : deliveryStep === 2 ? '33.33%' : deliveryStep === 3 ? '66.66%' : '100%'
                                }}
                              />
                            </div>

                            {/* Mobile Progress Bar (Vertical) */}
                            <div className="md:hidden absolute left-6 top-6 bottom-6 w-1 bg-slate-100 -translate-x-1/2">
                              <div
                                className="w-full transition-all duration-500 rounded-full"
                                style={{
                                  backgroundColor: primaryColor,
                                  height: deliveryStep === 1 ? '0%' : deliveryStep === 2 ? '33.33%' : deliveryStep === 3 ? '66.66%' : '100%'
                                }}
                              />
                            </div>
                            
                            <div className="space-y-8 md:space-y-0 md:flex md:justify-between relative">
                              {/* Step 1: Placed */}
                              <div className="flex md:flex-col items-center md:text-center relative z-10 gap-4 md:gap-2 flex-1">
                                <div
                                  className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors ${deliveryStep >= 1 ? 'border-white text-white shadow-md' : 'bg-slate-100 border-white text-slate-400'}`}
                                  style={deliveryStep >= 1 ? { backgroundColor: primaryColor } : {}}
                                >
                                  <Package size={20} />
                                </div>
                                <div className="md:text-center">
                                  <p className={`font-bold text-sm ${deliveryStep >= 1 ? 'text-slate-800' : 'text-slate-400'}`}>Order Placed</p>
                                  <p className="text-xs text-slate-500">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                                </div>
                              </div>

                              {/* Step 2: Preparing */}
                              <div className="flex md:flex-col items-center md:text-center relative z-10 gap-4 md:gap-2 flex-1">
                                <div
                                  className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors ${deliveryStep >= 2 ? 'border-white text-white shadow-md' : 'bg-slate-100 border-white text-slate-400'}`}
                                  style={deliveryStep >= 2 ? { backgroundColor: primaryColor } : {}}
                                >
                                  <ChefHat size={20} />
                                </div>
                                <div className="md:text-center">
                                  <p className={`font-bold text-sm ${deliveryStep >= 2 ? 'text-slate-800' : 'text-slate-400'}`}>Preparing</p>
                                  <p className="text-xs text-slate-500">
                                    {selectedOrder.preparingAt ? new Date(selectedOrder.preparingAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (deliveryStep >= 2 ? 'Kitchen Preparing' : 'Queued')}
                                  </p>
                                </div>
                              </div>

                              {/* Step 3: Out for Delivery */}
                              <div className="flex md:flex-col items-center md:text-center relative z-10 gap-4 md:gap-2 flex-1">
                                <div
                                  className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors ${deliveryStep >= 3 ? 'border-white text-white shadow-md' : 'bg-slate-100 border-white text-slate-400'}`}
                                  style={deliveryStep >= 3 ? { backgroundColor: primaryColor } : {}}
                                >
                                  <Truck size={20} />
                                </div>
                                <div className="md:text-center">
                                  <p className={`font-bold text-sm ${deliveryStep >= 3 ? 'text-slate-800' : 'text-slate-400'}`}>Out for Delivery</p>
                                  <p className="text-xs text-slate-500">
                                    {selectedOrder.shippedAt ? new Date(selectedOrder.shippedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (deliveryStep >= 3 ? 'Dispatched' : 'Pending')}
                                  </p>
                                </div>
                              </div>

                              {/* Step 4: Delivered */}
                              <div className="flex md:flex-col items-center md:text-center relative z-10 gap-4 md:gap-2 flex-1">
                                <div
                                  className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors ${deliveryStep >= 4 ? 'border-white text-white shadow-md' : 'bg-slate-100 border-white text-slate-400'}`}
                                  style={deliveryStep >= 4 ? { backgroundColor: primaryColor } : {}}
                                >
                                  <CheckCircle size={20} />
                                </div>
                                <div className="md:text-center">
                                  <p className={`font-bold text-sm ${deliveryStep >= 4 ? 'text-slate-800' : 'text-slate-400'}`}>Delivered</p>
                                  <p className="text-xs text-slate-500">
                                    {selectedOrder.deliveredAt ? new Date(selectedOrder.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (deliveryStep >= 4 ? 'Delivered' : 'Pending')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Service & Staff Details Attribution Cards (Mobile Responsive) */}
                      <div className="mb-8">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">Service & Staff Details</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          
                          {/* 1. Booked / Billed by */}
                          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                              <UserCheck size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Booked / Billed By</p>
                              <p className="text-sm font-extrabold text-slate-800 truncate">
                                {selectedOrder.orderBy || (selectedOrder.orderSource === 'counter' ? 'Counter POS' : selectedOrder.orderSource === 'staff' ? 'Staff POS' : 'Online Store')}
                              </p>
                              <p className="text-[11px] text-slate-500 capitalize">
                                {selectedOrder.orderSource ? `${selectedOrder.orderSource} Order` : 'Store Order'}
                                {isDineIn && selectedOrder.tableNumber && selectedOrder.tableNumber !== '0' ? ` • Table ${selectedOrder.tableNumber}` : ''}
                              </p>
                            </div>
                          </div>

                          {/* 2. Kitchen / Food Prepared by */}
                          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                              <ChefHat size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Food Prepared By</p>
                              <p className="text-sm font-extrabold text-slate-800 truncate">
                                {selectedOrder.preparedBy || ((isDineIn ? dineStep >= 2 : deliveryStep >= 2) ? 'Kitchen Chef' : 'Queued for Kitchen')}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {selectedOrder.preparingAt
                                  ? `Started ${new Date(selectedOrder.preparingAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                  : ((isDineIn ? dineStep >= 2 : deliveryStep >= 2) ? 'Cooking in Progress' : 'Awaiting Kitchen')}
                              </p>
                            </div>
                          </div>

                          {/* 3. Served (Dine-in) or Delivered (Delivery) */}
                          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                              {isDineIn ? <UtensilsCrossed size={18} /> : <Truck size={18} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                {isDineIn ? 'Served By' : 'Delivered By'}
                              </p>
                              <p className="text-sm font-extrabold text-slate-800 truncate">
                                {selectedOrder.DeliveryPersonName || (
                                  isDineIn
                                    ? (dineStep >= 3 ? 'Floor Staff' : 'Table Attendant')
                                    : (deliveryStep >= 3 ? 'Delivery Partner' : 'Pending Dispatch')
                                )}
                              </p>
                              {selectedOrder.DeliveryPersonPhone ? (
                                <a
                                  href={`tel:${selectedOrder.DeliveryPersonPhone}`}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline mt-0.5"
                                >
                                  <Phone size={11} /> {selectedOrder.DeliveryPersonPhone}
                                </a>
                              ) : (
                                <p className="text-[11px] text-slate-500">
                                  {isDineIn
                                    ? (selectedOrder.deliveredAt ? `Served ${new Date(selectedOrder.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Table Service')
                                    : (selectedOrder.deliveredAt ? `Delivered ${new Date(selectedOrder.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : (deliveryStep >= 3 ? 'Out on Route' : 'Waiting Assignment'))}
                                </p>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Items List */}
                      <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">Items in this order</h4>
                      <div className="space-y-4 mb-6">
                        {selectedOrder.orderItems?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <div>
                              <p className="font-bold text-slate-800">{item.name}</p>
                              <p className="text-slate-500">Qty: {item.qty} x ₹{item.price}</p>
                              {item.customText && (
                                <div className="mt-1 text-xs text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 w-fit">
                                  <span className="font-semibold">Text:</span> {item.customText}
                                </div>
                              )}
                            </div>
                            <div className="font-bold text-slate-800">₹{item.qty * item.price}</div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Financial Summary */}
                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm text-slate-600">
                            <span>Subtotal</span>
                            <span className="font-bold text-slate-800">₹{selectedOrder.totalAmount + (selectedOrder.discountAmount || 0) - (selectedOrder.shippingCharge || 0)}</span>
                          </div>
                          {selectedOrder.discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                              <span>Discount</span>
                              <span className="font-bold">-₹{selectedOrder.discountAmount}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm text-slate-600">
                            <span>Shipping</span>
                            <span className="font-bold text-slate-800">{selectedOrder.shippingCharge > 0 ? `₹${selectedOrder.shippingCharge}` : 'Free'}</span>
                          </div>
                          <div className="flex justify-between text-sm text-slate-600 mt-2 border-t border-slate-200 pt-2">
                            <span>Payment Method</span>
                            <span className="font-bold text-slate-800 uppercase">{selectedOrder.paymentMethod === 'whatsapp' ? 'WhatsApp' : selectedOrder.paymentMethod === 'razorpay' ? 'Online' : 'COD'}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </StoreLayout>
  );
};

export default TrackOrder;
