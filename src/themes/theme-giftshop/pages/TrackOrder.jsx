import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Package, Truck, CheckCircle, XCircle, ArrowLeft, RefreshCcw, Key, LogOut } from 'lucide-react';
import { useStore } from '../../../services/useStore';

const TrackOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { store, loading: storeLoading, error: storeError } = useStore();
  
  const [customerToken, setCustomerToken] = useState(localStorage.getItem('gb_customer_token') || null);
  const [customerEmail, setCustomerEmail] = useState(localStorage.getItem('gb_customer_email') || '');
  
  // Auth States
  const [authStep, setAuthStep] = useState(customerToken ? 'tracking' : 'email'); // 'email' | 'otp' | 'tracking'
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Orders State
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingData, setLoadingData] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';

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
          if (orderId) {
            const found = data.find(o => o._id === orderId);
            setSelectedOrder(found || data[0]);
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
    if (authStep === 'tracking' && customerToken && store?._id) {
      fetchOrders();
    }
  }, [authStep, customerToken, store]);

  const handleLogout = () => {
    localStorage.removeItem('gb_customer_token');
    localStorage.removeItem('gb_customer_email');
    setCustomerToken(null);
    setCustomerEmail('');
    setAuthStep('email');
    setOrders([]);
    setSelectedOrder(null);
  };

  if (storeLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-[#76b900] font-bold"><RefreshCcw className="animate-spin mr-2" /> Loading Store...</div>;

  if (storeError || !store) return <div className="min-h-screen flex items-center justify-center">Store not found.</div>;

  const renderAuth = () => (
    <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mt-12">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-50 text-[#76b900] rounded-full flex items-center justify-center mx-auto mb-4"><Key size={32} /></div>
        <h2 className="text-2xl font-extrabold text-slate-800">Track Your Orders</h2>
        <p className="text-slate-500 mt-2">{authStep === 'email' ? 'Enter your email to view your order history and tracking details.' : `Enter the verification code sent to ${customerEmail}`}</p>
      </div>
      {authError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold text-center mb-4">{authError}</div>}
      
      {authStep === 'email' ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
            <input required type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900]" placeholder="you@example.com" />
          </div>
          <button type="submit" disabled={authLoading} className="w-full py-3 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition disabled:opacity-50 shadow-lg shadow-green-100">{authLoading ? 'Sending...' : 'Send OTP'}</button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">6-Digit OTP</label>
            <input required type="text" maxLength="6" value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-center text-2xl tracking-[0.5em] font-mono" placeholder="••••••" />
          </div>
          <button type="submit" disabled={authLoading || otpInput.length !== 6} className="w-full py-3 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition disabled:opacity-50 shadow-lg shadow-green-100">{authLoading ? 'Verifying...' : 'Verify & View Orders'}</button>
          <button type="button" onClick={() => setAuthStep('email')} className="w-full py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition">Use a different email</button>
        </form>
      )}
    </div>
  );

  const getStatusStep = (status) => {
    if (status === 'placed') return 1;
    if (status === 'shipped') return 2;
    if (status === 'delivered') return 3;
    return 0;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft size={16} className="mr-1" /> Back to Store
          </Link>
          {customerToken && (
            <button onClick={handleLogout} className="text-sm font-bold text-red-500 hover:text-red-700 flex items-center gap-1 transition">
              <LogOut size={16} /> Logout
            </button>
          )}
        </div>

        {authStep !== 'tracking' ? renderAuth() : loadingData ? (
          <div className="text-center py-20 text-[#76b900] font-bold flex items-center justify-center"><RefreshCcw className="animate-spin mr-2" /> Loading Orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center bg-white p-12 rounded-3xl shadow-sm border border-slate-200 mt-12">
            <Package size={64} className="mx-auto text-slate-300 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800">No Orders Found</h2>
            <p className="text-slate-500 mt-2 mb-6">We couldn't find any orders placed with {customerEmail}.</p>
            <Link to="/" className="px-6 py-3 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00]">Start Shopping</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Order History List */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="font-bold text-lg text-slate-800 mb-4">Your Order History</h3>
              <div className="flex flex-col gap-3 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {orders.map(order => (
                  <button 
                    key={order._id}
                    onClick={() => { setSelectedOrder(order); navigate(`/track/${order._id}`); }}
                    className={`text-left p-4 rounded-2xl border transition-all ${selectedOrder?._id === order._id ? 'border-[#76b900] bg-green-50 shadow-sm' : 'border-slate-200 bg-white hover:border-[#76b900]'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-800 text-sm">#{order._id.slice(-6).toUpperCase()}</span>
                      <span className="text-xs font-bold text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold ${order.orderStatus === 'delivered' ? 'bg-blue-100 text-blue-700' : order.orderStatus === 'shipped' ? 'bg-indigo-100 text-indigo-700' : order.orderStatus === 'canceled' ? 'bg-red-100 text-red-700' : order.orderStatus === 'returned' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                        {order.orderStatus}
                      </span>
                      <span className="font-extrabold text-slate-800">₹{order.totalAmount}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column: Order Details & Tracking */}
            <div className="lg:col-span-2">
              {selectedOrder && (() => {
                const step = getStatusStep(selectedOrder.orderStatus);
                const isCanceled = selectedOrder.orderStatus === 'canceled';
                const isReturned = selectedOrder.orderStatus === 'returned';

                return (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h1 className="text-2xl font-extrabold text-slate-800">Order Details</h1>
                        <p className="text-slate-500 mt-1">ID: <span className="font-mono font-bold text-slate-700">{selectedOrder._id.slice(-6).toUpperCase()}</span></p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-bold text-slate-500">Total Paid</p>
                        <p className="text-xl text-[#76b900] font-extrabold">₹{selectedOrder.totalAmount}</p>
                      </div>
                    </div>

                    <div className="p-6 md:p-8">
                      {/* Tracking Timeline */}
                      <div className="mb-10">
                        {isCanceled || isReturned ? (
                          <div className={`p-4 rounded-xl flex items-center gap-3 ${isCanceled ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-orange-50 text-orange-700 border border-orange-100'}`}>
                            <XCircle size={24} />
                            <div>
                              <p className="font-bold text-lg">{isCanceled ? 'Order Canceled' : 'Order Returned'}</p>
                              <p className="text-sm opacity-80">{isCanceled ? 'This order has been canceled.' : 'Items from this order have been returned.'}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-1 bg-slate-100 transform md:-translate-x-1/2"></div>
                            <div className="absolute left-6 md:left-1/2 top-0 w-1 bg-[#76b900] transform md:-translate-x-1/2 transition-all duration-500" style={{ height: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
                            
                            <div className="space-y-8 md:space-y-0 md:flex md:justify-between relative">
                              <div className="flex md:flex-col items-center md:w-1/3 relative z-10 gap-4 md:gap-2">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors ${step >= 1 ? 'bg-[#76b900] border-white text-white shadow-md' : 'bg-slate-100 border-white text-slate-400'}`}>
                                  <Package size={20} />
                                </div>
                                <div className="md:text-center">
                                  <p className={`font-bold ${step >= 1 ? 'text-slate-800' : 'text-slate-400'}`}>Order Placed</p>
                                  <p className="text-xs text-slate-500">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="flex md:flex-col items-center md:w-1/3 relative z-10 gap-4 md:gap-2">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors ${step >= 2 ? 'bg-[#76b900] border-white text-white shadow-md' : 'bg-slate-100 border-white text-slate-400'}`}>
                                  <Truck size={20} />
                                </div>
                                <div className="md:text-center">
                                  <p className={`font-bold ${step >= 2 ? 'text-slate-800' : 'text-slate-400'}`}>Shipped</p>
                                </div>
                              </div>
                              <div className="flex md:flex-col items-center md:w-1/3 relative z-10 gap-4 md:gap-2">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors ${step >= 3 ? 'bg-[#76b900] border-white text-white shadow-md' : 'bg-slate-100 border-white text-slate-400'}`}>
                                  <CheckCircle size={20} />
                                </div>
                                <div className="md:text-center">
                                  <p className={`font-bold ${step >= 3 ? 'text-slate-800' : 'text-slate-400'}`}>Delivered</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
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
    </div>
  );
};

export default TrackOrder;