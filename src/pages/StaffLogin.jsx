import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Clock,
  User,
  LogOut,
  CheckCircle,
  Printer,
  MessageCircle,
  Download,
  FileText,
  Phone,
  Mail,
  X,
  Smartphone,
  Utensils,
  RefreshCw,
  Lock,
  Store as StoreIcon,
  Truck,
  AlertTriangle,
  ChefHat,
  MapPin,
  Check,
  Tag,
  ArrowRight,
  ChevronUp,
  Navigation
} from 'lucide-react';

import { generateReceiptPdf, downloadReceiptPdf, sendWhatsAppWithReceiptPdf } from '../utils/receiptPdf';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3011' : 'https://api.galibrand.cloud');

const StaffLogin = () => {
  const navigate = useNavigate();

  // -------------------------------------------------------------
  // Store Context & Public Data
  // -------------------------------------------------------------
  const [storeData, setStoreData] = useState(null);
  const [storeLoading, setStoreLoading] = useState(true);

  // -------------------------------------------------------------
  // Staff Auth State
  // -------------------------------------------------------------
  const [staffToken, setStaffToken] = useState(() => localStorage.getItem('gb_pos_staff_token') || '');
  const [staffData, setStaffData] = useState(() => {
    try {
      const saved = localStorage.getItem('gb_pos_staff_data');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Login form state
  const [loginStaffId, setLoginStaffId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginStoreCode, setLoginStoreCode] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // -------------------------------------------------------------
  // View Switcher (Counter POS vs Kitchen Area vs Delivery)
  // -------------------------------------------------------------
  const [activeView, setActiveView] = useState(() => {
    try {
      const saved = localStorage.getItem('gb_pos_staff_data');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed?.role === 'kitchen') return 'kitchen';
      if (parsed?.role === 'delivery') return 'delivery';
    } catch (e) {}
    return 'counter';
  });

  // Live Clock
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // -------------------------------------------------------------
  // Counter POS State
  // -------------------------------------------------------------
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [cart, setCart] = useState([]);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedTable, setSelectedTable] = useState('0');
  const [paymentType, setPaymentType] = useState('cash'); // 'cash' | 'upi' | 'card'
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMessage, setCouponMessage] = useState({ text: '', type: '' });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [billCustomerPhone, setBillCustomerPhone] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [waStatusMsg, setWaStatusMsg] = useState({ text: '', type: '' });

  // -------------------------------------------------------------
  // Kitchen Area (KDS) State
  // -------------------------------------------------------------
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [kitchenFilter, setKitchenFilter] = useState('active'); // 'active' | 'placed' | 'preparing' | 'wasted'
  const [deliveryStaffList, setDeliveryStaffList] = useState([]);
  const [shippingModal, setShippingModal] = useState({
    isOpen: false,
    order: null,
    deliveryStaffId: '',
    DeliveryPersonName: '',
    DeliveryPersonPhone: ''
  });
  const kitchenOrderIdsRef = useRef(new Set());

  // -------------------------------------------------------------
  // Delivery Staff Assigned Orders State
  // -------------------------------------------------------------
  const [myAssignedOrders, setMyAssignedOrders] = useState([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Store Data (Store resolution)
  useEffect(() => {
    const fetchStore = async () => {
      try {
        const headers = {
          'x-store-domain': window.location.hostname,
          'x-forwarded-host': window.location.hostname
        };
        const res = await fetch(`${API_BASE}/api/store/data`, { headers });
        if (res.ok) {
          const data = await res.json();
          setStoreData(data);
          if (data.storeId) setLoginStoreCode(data.storeId);
        }
      } catch (e) {
        console.warn('Failed to load store data:', e);
      } finally {
        setStoreLoading(false);
      }
    };
    fetchStore();
  }, []);

  const currentStoreId = staffData?.store?._id || staffData?.store?.storeId || storeData?._id || storeData?.storeId || loginStoreCode;

  // Sound chime for Kitchen orders
  const playKitchenTone = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (err) {}
  };

  // -------------------------------------------------------------
  // Staff Login Handler
  // -------------------------------------------------------------
  const handleStaffLogin = async (e) => {
    e.preventDefault();
    if (!loginStaffId || !loginPassword) {
      setLoginError('Staff ID and password are required.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await fetch(`${API_BASE}/api/store-staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: loginStaffId.trim(),
          password: loginPassword,
          storeCode: (loginStoreCode || storeData?.storeId || '').trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('gb_pos_staff_token', data.token);
        localStorage.setItem('gb_pos_staff_data', JSON.stringify(data.staff));
        if (data.staff?.store?.storeId) {
          localStorage.setItem('gb_pos_store_code', data.staff.store.storeId);
        }
        setStaffToken(data.token);
        setStaffData(data.staff);
        setLoginPassword('');

        // Direct staff to role-specific default view
        if (data.staff?.role === 'kitchen') {
          setActiveView('kitchen');
        } else if (data.staff?.role === 'delivery') {
          setActiveView('delivery');
        } else {
          setActiveView('counter');
        }
      } else {
        setLoginError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setLoginError(err.message || 'Network error logging in.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleStaffLogout = () => {
    localStorage.removeItem('gb_pos_staff_token');
    localStorage.removeItem('gb_pos_staff_data');
    setStaffToken('');
    setStaffData(null);
    setCart([]);
  };

  // -------------------------------------------------------------
  // Fetch POS Catalog (Products & Categories)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!currentStoreId) return;

    const fetchCatalog = async () => {
      setLoadingProducts(true);
      try {
        const res = await fetch(`${API_BASE}/api/store-staff/pos-catalog?storeId=${currentStoreId}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.warn('Error fetching POS catalog:', err);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchCatalog();
  }, [currentStoreId]);

  // -------------------------------------------------------------
  // Fetch Kitchen Orders & Delivery Staff List
  // -------------------------------------------------------------
  const fetchKitchenOrders = async () => {
    if (!currentStoreId) return;
    try {
      const res = await fetch(`${API_BASE}/api/store-staff/kitchen-orders?storeId=${currentStoreId}`);
      if (res.ok) {
        const data = await res.json();
        const incoming = data.orders || [];

        // Check for new orders to sound alert
        if (kitchenOrderIdsRef.current.size > 0) {
          const hasNew = incoming.some(o => !kitchenOrderIdsRef.current.has(o._id) && ['placed', 'preparing'].includes(o.orderStatus));
          if (hasNew) playKitchenTone();
        }
        kitchenOrderIdsRef.current = new Set(incoming.map(o => o._id));
        setKitchenOrders(incoming);
      }
    } catch (err) {
      console.warn('Error fetching kitchen orders:', err);
    }
  };

  const fetchDeliveryStaff = async () => {
    if (!currentStoreId) return;
    try {
      const res = await fetch(`${API_BASE}/api/store-staff/delivery-staff?storeId=${currentStoreId}`);
      if (res.ok) {
        const data = await res.json();
        setDeliveryStaffList(data.deliveryStaff || []);
      }
    } catch (err) {}
  };

  // Fetch Delivery staff assigned orders
  const fetchMyAssignedOrders = async () => {
    if (!staffToken) return;
    setDeliveryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/store-staff/orders`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyAssignedOrders(data.orders || []);
      }
    } catch (err) {
      console.warn('Error fetching assigned deliveries:', err);
    } finally {
      setDeliveryLoading(false);
    }
  };

  // Live polling for Kitchen (every 5 seconds)
  useEffect(() => {
    if (currentStoreId) {
      fetchKitchenOrders();
      fetchDeliveryStaff();
      const interval = setInterval(fetchKitchenOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [currentStoreId]);

  // Live polling for Delivery orders (every 6 seconds if delivery role)
  useEffect(() => {
    if (staffToken && (staffData?.role === 'delivery' || activeView === 'delivery')) {
      fetchMyAssignedOrders();
      const interval = setInterval(fetchMyAssignedOrders, 6000);
      return () => clearInterval(interval);
    }
  }, [staffToken, activeView, staffData?.role]);

  // -------------------------------------------------------------
  // Kitchen Actions: Start Preparing, Mark Wasted, Finish
  // -------------------------------------------------------------
  const handleStartPreparing = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE}/api/store-staff/kitchen-orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: 'preparing' })
      });
      if (res.ok) fetchKitchenOrders();
    } catch (err) {
      alert(`Error updating order: ${err.message}`);
    }
  };

  const handleMarkWasted = async (orderId) => {
    const reason = window.prompt("Reason for marking order as Wasted / Damaged:", "Food damaged / prepared & wasted");
    if (reason === null) return;
    try {
      const res = await fetch(`${API_BASE}/api/store-staff/kitchen-orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: 'wasted', wastedReason: reason || 'Damaged / Wasted' })
      });
      if (res.ok) fetchKitchenOrders();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleFinishKitchenOrder = (order) => {
    const isDineIn = order.orderType && order.orderType.toLowerCase() === 'dine-in';
    if (isDineIn) {
      submitFinishOrder(order._id, true);
    } else {
      const defaultStaff = deliveryStaffList.length > 0 ? deliveryStaffList[0] : null;
      setShippingModal({
        isOpen: true,
        order,
        deliveryStaffId: defaultStaff?._id || '',
        DeliveryPersonName: defaultStaff?.name || order.DeliveryPersonName || 'Store Delivery Staff',
        DeliveryPersonPhone: defaultStaff?.phone || order.DeliveryPersonPhone || ''
      });
    }
  };

  const submitFinishOrder = async (orderId, isDineIn, payload = {}) => {
    try {
      const res = await fetch(`${API_BASE}/api/store-staff/kitchen-orders/${orderId}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchKitchenOrders();
        setShippingModal({ isOpen: false, order: null, deliveryStaffId: '', DeliveryPersonName: '', DeliveryPersonPhone: '' });
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to finish order');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Delivery Staff: Mark Order as Delivered
  const handleMarkDeliveryDelivered = async (orderId) => {
    if (!window.confirm("Confirm you have delivered this order to the customer?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/store-staff/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`
        },
        body: JSON.stringify({ orderStatus: 'delivered' })
      });
      if (res.ok) {
        fetchMyAssignedOrders();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update order');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // -------------------------------------------------------------
  // Cart Actions & Create Counter Order
  // -------------------------------------------------------------
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item._id === product._id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          _id: product._id,
          name: product.name,
          price: Number(product.price) || 0,
          qty: 1,
          image: product.images && product.images[0] ? product.images[0] : null
        }
      ];
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item._id === productId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item._id !== productId));
  };

  const rawSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const finalTotal = Math.max(0, rawSubtotal - discountAmount);

  // Submit Counter Order (Initial status is 'placed' so it goes directly to kitchen)
  const handleCreateCounterOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmittingOrder(true);
    try {
      const orderItems = cart.map((item) => ({
        product: item._id,
        name: item.name,
        price: item.price,
        qty: item.qty
      }));

      const isDineIn = selectedTable && selectedTable !== '0';

      const orderPayload = {
        storeId: currentStoreId,
        customerName: customerPhone ? `Customer (${customerPhone})` : 'Walk-in Customer',
        customerPhone: customerPhone || '',
        customerEmail: '',
        orderItems,
        totalAmount: finalTotal,
        discountAmount,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        shippingCharge: 0,
        paymentMethod: paymentType,
        orderSource: 'counter',
        orderType: isDineIn ? 'Dine-in' : 'delivery',
        tableNumber: selectedTable || '0',
        orderBy: staffData?.staffId ? `${staffData.name} (${staffData.staffId})` : (staffData?.name || 'Counter Staff'),
        paymentStatus: 'paid',
        orderStatus: 'placed' // goes to kitchen!
      };

      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': currentStoreId
        },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (res.ok) {
        const created = data.order || data;
        setCompletedOrder(created);
        setBillCustomerPhone(customerPhone || created.customerPhone || '');
        setWaStatusMsg({ text: '', type: '' });
        setCart([]);
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setCustomerPhone('');
        setSelectedTable('0');
        fetchKitchenOrders();
      } else {
        alert(data.message || 'Failed to place order.');
      }
    } catch (err) {
      alert(`Network error creating order: ${err.message}`);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleOpenWhatsAppBill = async () => {
    if (!completedOrder) return;
    setIsGeneratingPdf(true);
    setWaStatusMsg({ text: '', type: '' });
    try {
      const receiptUrl = `${API_BASE}/api/orders/receipt/${completedOrder._id}`;
      const res = await sendWhatsAppWithReceiptPdf({
        order: completedOrder,
        store: storeMeta,
        staff: staffData,
        targetPhone: billCustomerPhone,
        receiptUrl
      });
      if (res?.message) {
        setWaStatusMsg({ text: res.message, type: res.success ? 'success' : 'error' });
      }
    } catch (err) {
      console.error('Error sharing receipt:', err);
      setWaStatusMsg({ text: `Failed to share receipt: ${err.message}`, type: 'error' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadReceiptPdf = () => {
    if (!completedOrder) return;
    try {
      downloadReceiptPdf(completedOrder, storeMeta, staffData);
      setWaStatusMsg({ text: '✓ PDF Receipt downloaded successfully!', type: 'success' });
    } catch (err) {
      alert(`Could not download PDF: ${err.message}`);
    }
  };

  const handlePrintReceipt = () => {
    if (!completedOrder) return;
    const printWin = window.open('', '_blank', 'width=400,height=600');
    if (!printWin) {
      alert('Please allow popups to print receipts.');
      return;
    }

    const storeName = storeMeta.storeName || 'Store Receipt';
    const orderNo = completedOrder._id ? completedOrder._id.slice(-6).toUpperCase() : '';
    const items = completedOrder.orderItems || [];

    const itemsHtml = items
      .map(
        (i) => `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;">
        <span>${i.qty}x ${i.name}</span>
        <span style="font-weight:bold;">₹${i.price * i.qty}</span>
      </div>
    `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt #${orderNo}</title>
        <style>
          body { font-family: monospace, sans-serif; padding: 15px; margin: 0; color: #000; width: 280px; }
          .center { text-align: center; }
          .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center">
          <h2 style="margin:0 0 5px;">${storeName}</h2>
          <p style="margin:0; font-size:11px;">${storeMeta.locationAddress || 'Thank you for your visit'}</p>
          <div class="divider"></div>
          <p style="margin:2px 0; font-size:12px;">RECEIPT #${orderNo}</p>
          <p style="margin:2px 0; font-size:11px;">${new Date().toLocaleString()}</p>
          ${completedOrder.tableNumber && completedOrder.tableNumber !== '0' ? `<p class="bold" style="margin:2px 0; font-size:12px;">TABLE: ${completedOrder.tableNumber}</p>` : ''}
          <p style="margin:2px 0; font-size:10px;">Staff: ${completedOrder.orderBy || staffData?.name}</p>
        </div>
        <div class="divider"></div>
        <div>${itemsHtml}</div>
        <div class="divider"></div>
        <div style="display:flex; justify-content:space-between; font-size:14px;" class="bold">
          <span>TOTAL:</span>
          <span>₹${completedOrder.totalAmount}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:11px; margin-top:4px;">
          <span>Payment:</span>
          <span style="text-transform:uppercase;">${completedOrder.paymentMethod || 'CASH'} (PAID)</span>
        </div>
        <div class="divider"></div>
        <div class="center" style="font-size:11px; margin-top:10px;">
          <p style="margin:0;">Thank you! Visit again.</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  };

  // -------------------------------------------------------------
  // 1. RENDER LOGIN FORM IF NOT AUTHENTICATED
  // -------------------------------------------------------------
  if (!staffToken || !staffData) {
    const brandName = storeData?.storeName || 'Store Staff Portal';
    const brandLogo = storeData?.logo || null;

    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-800">
          <div className="text-center mb-6">
            {brandLogo ? (
              <img src={brandLogo} alt={brandName} className="h-14 mx-auto mb-3 object-contain rounded-xl" />
            ) : (
              <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-orange-500/30">
                <Utensils size={28} />
              </div>
            )}
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{brandName}</h1>
            <p className="text-xs text-slate-500 mt-1 font-semibold uppercase tracking-wider">
              Staff Portal • Counter, Kitchen & Delivery
            </p>
          </div>

          {loginError && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleStaffLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Staff ID (Username) *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP01"
                  value={loginStaffId}
                  onChange={(e) => setLoginStaffId(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-mono font-bold text-sm text-slate-900 uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 font-bold text-sm text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Store ID / Code
              </label>
              <div className="relative">
                <StoreIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="e.g. GBS006"
                  value={loginStoreCode}
                  onChange={(e) => setLoginStoreCode(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 font-mono font-bold text-sm text-slate-800 uppercase focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-2 disabled:opacity-75"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Logging In...
                </>
              ) : (
                <>Log In to Staff Terminal →</>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-400 font-medium">
            Role-based dashboard for Counter, Kitchen Display (KDS), Cashier, and Delivery Staff.
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. RENDER AUTHENTICATED STAFF TERMINAL
  // -------------------------------------------------------------
  const activeStoreName = staffData?.store?.storeName || storeData?.storeName || 'Store POS';
  const tables = staffData?.store?.tables || ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  // Resolve Store Custom ID (e.g. GBS006) - NEVER show raw MongoDB ObjectId
  const rawIdCandidate = staffData?.store?.storeId || storeData?.storeId || loginStoreCode || '';
  const storeCustomId = (/^[0-9a-fA-F]{24}$/.test(rawIdCandidate))
    ? (staffData?.store?.storeSlug || storeData?.storeSlug || 'STORE')
    : (rawIdCandidate || staffData?.store?.storeSlug || storeData?.storeSlug || '');

  // Strict Role-Based Access Control: Staff can only access their assigned role's view
  const userRole = (staffData?.role || 'counter').toLowerCase();
  const isManager = userRole === 'manager';
  const canAccessCounter = isManager || ['counter', 'cashier', 'waiter'].includes(userRole);
  const canAccessKitchen = isManager || userRole === 'kitchen';
  const canAccessDelivery = isManager || userRole === 'delivery';

  // Force active view to role-permitted section (cannot access unauthorized views)
  const effectiveView = (() => {
    if (userRole === 'kitchen') return 'kitchen';
    if (userRole === 'delivery') return 'delivery';
    if (!canAccessCounter && canAccessKitchen) return 'kitchen';
    if (!canAccessCounter && canAccessDelivery) return 'delivery';
    if (isManager) return activeView;
    return 'counter';
  })();

  const filteredProducts = products.filter((p) => {
    const matchesCat =
      selectedCategory === 'ALL' ||
      (p.category && (
        p.category._id === selectedCategory || 
        p.category === selectedCategory || 
        String(p.category) === String(selectedCategory)
      )) ||
      (p.categoryName && p.categoryName === selectedCategory);
    const matchesSearch =
      !searchQuery.trim() ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 flex flex-col font-sans select-none">
      
      {/* Header (Responsive on Mobile & Desktop) */}
      <header className="min-h-16 bg-slate-900 text-white px-3 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 shrink-0 shadow-md z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black shadow-md shrink-0">
            {effectiveView === 'kitchen' ? <ChefHat size={20} /> : effectiveView === 'delivery' ? <Truck size={20} /> : <CreditCard size={18} />}
          </div>
          <div className="min-w-0">
            <h1 className="text-xs md:text-base font-black truncate max-w-[140px] sm:max-w-[200px] md:max-w-xs leading-tight">
              {activeStoreName}
            </h1>
            {storeCustomId && (
              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-mono text-[9px] md:text-[10px] font-black border border-orange-500/30">
                ID: {storeCustomId}
              </span>
            )}
          </div>
        </div>

        {/* View Switcher: Manager can switch; non-managers only see their assigned role terminal */}
        {isManager ? (
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveView('counter')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                effectiveView === 'counter'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <CreditCard size={14} />
              <span>Counter POS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('kitchen')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 relative ${
                effectiveView === 'kitchen'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Utensils size={14} />
              <span>Kitchen Area</span>
              {kitchenOrders.filter(o => ['placed', 'preparing'].includes(o.orderStatus)).length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-black leading-none animate-pulse">
                  {kitchenOrders.filter(o => ['placed', 'preparing'].includes(o.orderStatus)).length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveView('delivery')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                effectiveView === 'delivery'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Truck size={14} />
              <span>Delivery Orders</span>
              {myAssignedOrders.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-400 text-slate-900 text-[10px] font-black leading-none">
                  {myAssignedOrders.length}
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center">
            {canAccessKitchen && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black shadow-xs">
                <ChefHat size={16} />
                <span>Kitchen Display Terminal (KDS)</span>
                {kitchenOrders.filter(o => ['placed', 'preparing'].includes(o.orderStatus)).length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-black leading-none animate-pulse">
                    {kitchenOrders.filter(o => ['placed', 'preparing'].includes(o.orderStatus)).length}
                  </span>
                )}
              </div>
            )}
            {canAccessDelivery && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-black shadow-xs">
                <Truck size={16} />
                <span>Delivery Staff Terminal</span>
                {myAssignedOrders.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-400 text-slate-900 text-[10px] font-black leading-none">
                    {myAssignedOrders.length}
                  </span>
                )}
              </div>
            )}
            {canAccessCounter && !canAccessKitchen && !canAccessDelivery && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-orange-500/20 text-orange-300 border border-orange-500/40 text-xs font-black shadow-xs">
                <CreditCard size={16} />
                <span>Counter Sale POS Terminal</span>
              </div>
            )}
          </div>
        )}

        {/* Staff Profile & Logout */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-black text-slate-100 flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{staffData.name}</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end mt-0.5">
              <span className="px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 font-mono text-[10px] font-bold">
                {staffData.staffId}
              </span>
              <span className="capitalize text-[10px] text-slate-400">
                {staffData.role}
              </span>
            </div>
          </div>

          <button
            onClick={handleStaffLogout}
            title="Log Out"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* DIGITAL BILL SCREEN / MODAL (After Order Creation)        */}
      {/* ========================================================= */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 text-center relative">
              <button
                onClick={() => setCompletedOrder(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-white text-emerald-600 mx-auto flex items-center justify-center shadow-md mb-2 font-black">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-xl font-black">Order Placed & Sent to Kitchen!</h2>
              <p className="text-xs text-emerald-100 mt-1 font-semibold">
                Receipt #{completedOrder._id.slice(-6).toUpperCase()} • ₹{completedOrder.totalAmount} ({String(completedOrder.paymentMethod || 'cash').toUpperCase()})
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Customer Mobile (WhatsApp) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer WhatsApp Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="tel"
                      maxLength="10"
                      placeholder="Enter 10-digit customer mobile"
                      value={billCustomerPhone}
                      onChange={(e) => setBillCustomerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-green-500 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadReceiptPdf}
                    className="py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <Download size={14} className="text-slate-600" />
                    Download PDF
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenWhatsAppBill}
                    disabled={isGeneratingPdf}
                    className="py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-green-500/20 transition disabled:opacity-50"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Preparing PDF...
                      </>
                    ) : (
                      <>
                        <MessageCircle size={16} /> Send on WhatsApp
                      </>
                    )}
                  </button>
                </div>

                {waStatusMsg.text && (
                  <div
                    className={`text-xs font-bold p-2.5 rounded-xl flex items-center gap-1.5 ${
                      waStatusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                    }`}
                  >
                    <CheckCircle size={14} className="shrink-0" />
                    <span>{waStatusMsg.text}</span>
                  </div>
                )}
              </div>

              {/* Thermal Print Receipt */}
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                <Printer size={15} /> Print Receipt / Bill
              </button>

              {/* Kitchen View Button (if permitted) */}
              {canAccessKitchen && (
                <button
                  type="button"
                  onClick={() => {
                    setCompletedOrder(null);
                    setActiveView('kitchen');
                  }}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase rounded-xl transition flex items-center justify-center gap-2 shadow"
                >
                  <ChefHat size={15} /> View in Kitchen
                </button>
              )}

              {/* Start Next Order */}
              <button
                type="button"
                onClick={() => setCompletedOrder(null)}
                className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-xs uppercase tracking-wider rounded-xl border border-emerald-200 transition"
              >
                ✓ Start Next Order
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StaffLogin;
