import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Navigation,
  QrCode,
  Download,
  FileText,
  MessageCircle,
  ShieldCheck
} from 'lucide-react';
import { generateReceiptPdf, downloadReceiptPdf, sendWhatsAppWithReceiptPdf } from '../utils/receiptPdf';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3011' : 'https://api.galibrand.cloud');

const StaffLogin = () => {
  const navigate = useNavigate();
  const { role: urlRole } = useParams();

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


  // -------------------------------------------------------------
  // Secure Staff OTP Login State
  // -------------------------------------------------------------
  const [authMode, setAuthMode] = useState('otp'); // 'otp' | 'password'
  const [otpStoreId, setOtpStoreId] = useState(() => localStorage.getItem('gb_pos_store_code') || '');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpStatus, setOtpStatus] = useState({ text: '', type: '' });
  const [resendCountdown, setResendCountdown] = useState(0);

  // Resend Countdown Timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Password Login form state
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
  const [checkoutSettings, setCheckoutSettings] = useState(null);
  const [upiModal, setUpiModal] = useState({
    isOpen: false,
    order: null,
    loading: false,
    successMsg: '',
    errorMsg: '',
    manualUtr: ''
  });
  const [billCustomerPhone, setBillCustomerPhone] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [waStatusMsg, setWaStatusMsg] = useState({ text: '', type: '' });

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

  // Fetch store checkout & payment settings (to check if online payment / Razorpay is enabled)
  useEffect(() => {
    if (!currentStoreId) return;
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/checkout-settings/public`, {
          headers: { 'x-store-id': currentStoreId }
        });
        if (res.ok) {
          const data = await res.json();
          setCheckoutSettings(data);
        }
      } catch (err) {
        console.warn('Failed to load checkout settings:', err);
      }
    };
    fetchSettings();
  }, [currentStoreId]);

  const isOnlinePaymentEnabled = Boolean(checkoutSettings?.razorpayEnabled);


  // -------------------------------------------------------------
  // URL Role Synchronization: /staff-login/<role>
  // -------------------------------------------------------------
  useEffect(() => {
    if (!staffToken || !staffData) return;
    const userRole = (staffData.role || 'counter').toLowerCase();
    const isManager = userRole === 'manager';

    if (isManager) {
      if (urlRole === 'kitchen') {
        setActiveView('kitchen');
      } else if (urlRole === 'delivery') {
        setActiveView('delivery');
      } else if (urlRole === 'counter' || urlRole === 'cashier') {
        setActiveView('counter');
      } else if (urlRole === 'manager') {
        setActiveView('counter');
      } else {
        navigate('/staff-login/manager', { replace: true });
      }
    } else {
      const expectedRole = (userRole === 'waiter' || userRole === 'cashier') ? 'counter' : userRole;
      if (urlRole !== expectedRole) {
        navigate(`/staff-login/${expectedRole}`, { replace: true });
      }
      setActiveView(expectedRole === 'counter' ? 'counter' : expectedRole);
    }
  }, [staffToken, staffData, urlRole, navigate]);

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

  // -------------------------------------------------------------
  // OTP AUTH HANDLERS (Store ID + Staff Email -> LandingMailConfig)
  // -------------------------------------------------------------
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otpStoreId.trim() || !otpEmail.trim()) {
      setOtpStatus({ text: 'Please enter both Store ID and Staff Email.', type: 'error' });
      return;
    }

    setIsSendingOtp(true);
    setOtpStatus({ text: '', type: '' });

    try {
      const res = await fetch(`${API_BASE}/api/store-staff/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: otpStoreId.trim(),
          email: otpEmail.trim().toLowerCase()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsOtpSent(true);
        setResendCountdown(60);
        setOtpStatus({
          text: `✓ OTP verification code sent to ${otpEmail.trim()}. Valid for 10 minutes.`,
          type: 'success'
        });
      } else {
        setOtpStatus({ text: data.message || 'Failed to send OTP.', type: 'error' });
      }
    } catch (err) {
      setOtpStatus({ text: err.message || 'Network error sending OTP.', type: 'error' });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setOtpStatus({ text: 'Please enter the complete 6-digit OTP code.', type: 'error' });
      return;
    }

    setIsVerifyingOtp(true);
    setOtpStatus({ text: '', type: '' });

    try {
      const res = await fetch(`${API_BASE}/api/store-staff/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: otpStoreId.trim(),
          email: otpEmail.trim().toLowerCase(),
          otp: otpCode.trim()
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
        setOtpCode('');
        setIsOtpSent(false);

        // Redirect to /staff-login/<role>
        const targetRole = (data.staff?.role || 'counter').toLowerCase();
        if (targetRole === 'kitchen') {
          setActiveView('kitchen');
          navigate('/staff-login/kitchen');
        } else if (targetRole === 'delivery') {
          setActiveView('delivery');
          navigate('/staff-login/delivery');
        } else if (targetRole === 'manager') {
          setActiveView('counter');
          navigate('/staff-login/manager');
        } else if (targetRole === 'cashier') {
          setActiveView('counter');
          navigate('/staff-login/cashier');
        } else {
          setActiveView('counter');
          navigate('/staff-login/counter');
        }
      } else {
        setOtpStatus({ text: data.message || 'Invalid or expired OTP code.', type: 'error' });
      }
    } catch (err) {
      setOtpStatus({ text: err.message || 'Network error verifying OTP.', type: 'error' });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Password Staff Login Handler
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

        const targetRole = (data.staff?.role || 'counter').toLowerCase();
        if (targetRole === 'kitchen') {
          setActiveView('kitchen');
          navigate('/staff-login/kitchen');
        } else if (targetRole === 'delivery') {
          setActiveView('delivery');
          navigate('/staff-login/delivery');
        } else if (targetRole === 'manager') {
          setActiveView('counter');
          navigate('/staff-login/manager');
        } else if (targetRole === 'cashier') {
          setActiveView('counter');
          navigate('/staff-login/cashier');
        } else {
          setActiveView('counter');
          navigate('/staff-login/counter');
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
    navigate('/staff-login', { replace: true });
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

  // Razorpay Dynamic Loader for UPI collection
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && 'Razorpay' in window) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleOpenUpiModal = (order) => {
    setUpiModal({
      isOpen: true,
      order,
      loading: false,
      successMsg: '',
      errorMsg: '',
      manualUtr: ''
    });
  };

  const handleCollectUpiRazorpay = async () => {
    const order = upiModal.order;
    if (!order) return;

    setUpiModal((prev) => ({ ...prev, loading: true, errorMsg: '', successMsg: '' }));
    try {
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        throw new Error('Razorpay SDK failed to load. Check your internet connection.');
      }

      // Create Razorpay order via backend
      const res = await fetch(`${API_BASE}/api/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': currentStoreId
        },
        body: JSON.stringify({
          amount: order.totalAmount,
          storeId: currentStoreId,
          orderId: order._id
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to initialize payment gateway.');
      }

      const rzpOrder = await res.json();
      const razorpayKey = rzpOrder.keyId || checkoutSettings?.razorpayKeyId;

      if (!razorpayKey) {
        throw new Error('Razorpay API Key is not configured by the store owner.');
      }

      const options = {
        key: razorpayKey,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency || 'INR',
        name: storeMeta.storeName || 'Store Payment',
        description: `Order #${order._id.slice(-6).toUpperCase()} Payment (Delivery)`,
        order_id: rzpOrder.id,
        prefill: {
          name: order.customerName || 'Customer',
          contact: order.customerPhone || ''
        },
        theme: {
          color: '#4f46e5'
        },
        handler: async function (paymentResponse) {
          try {
            // 1. Verify Razorpay signature
            await fetch(`${API_BASE}/api/orders/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...paymentResponse, orderId: order._id })
            });

            // 2. Update staff order status to mark as paid via UPI
            await fetch(`${API_BASE}/api/store-staff/orders/${order._id}/status`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${staffToken}`
              },
              body: JSON.stringify({
                paymentStatus: 'paid',
                paymentMethod: 'upi',
                paymentId: paymentResponse.razorpay_payment_id
              })
            });

            fetchMyAssignedOrders();
            setUpiModal((prev) => ({
              ...prev,
              loading: false,
              successMsg: `✓ Payment of ₹${order.totalAmount} received successfully via UPI!`
            }));
          } catch (verifyErr) {
            setUpiModal((prev) => ({
              ...prev,
              loading: false,
              errorMsg: `Payment succeeded but verification failed: ${verifyErr.message}`
            }));
          }
        },
        modal: {
          ondismiss: function () {
            setUpiModal((prev) => ({ ...prev, loading: false }));
          }
        }
      };

      const paymentObj = new window.Razorpay(options);
      paymentObj.open();
    } catch (err) {
      setUpiModal((prev) => ({ ...prev, loading: false, errorMsg: err.message }));
    }
  };

  const handleManualUpiConfirm = async () => {
    const order = upiModal.order;
    if (!order) return;

    setUpiModal((prev) => ({ ...prev, loading: true, errorMsg: '', successMsg: '' }));
    try {
      const res = await fetch(`${API_BASE}/api/store-staff/orders/${order._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`
        },
        body: JSON.stringify({
          paymentStatus: 'paid',
          paymentMethod: 'upi',
          paymentId: upiModal.manualUtr ? `UPI-${upiModal.manualUtr.trim()}` : `UPI-${Date.now()}`
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update order payment.');
      }

      fetchMyAssignedOrders();
      setUpiModal((prev) => ({
        ...prev,
        loading: false,
        successMsg: `✓ Confirmed! Order #${order._id.slice(-6).toUpperCase()} marked as PAID via UPI.`
      }));
    } catch (err) {
      setUpiModal((prev) => ({ ...prev, loading: false, errorMsg: err.message }));
    }
  };

  const handleSendUpiWhatsAppLink = () => {
    const order = upiModal.order;
    if (!order) return;
    const cleanPhone = (order.customerPhone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const orderNo = order._id.slice(-6).toUpperCase();
    const storeName = storeMeta.storeName || 'Our Store';

    let text = `👋 Hello ${order.customerName || 'Customer'},\n\n`;
    text += `Your order *#${orderNo}* from *${storeName}* is out for delivery with our delivery executive *${staffData?.name || 'Staff'}*.\n\n`;
    text += `💵 *Total Amount Due:* ₹${order.totalAmount}\n\n`;
    text += `Please have your UPI app ready or pay when our delivery executive arrives.\n`;
    text += `Thank you!`;

    const encoded = encodeURIComponent(text);
    const waUrl = phoneWithCountry
      ? `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(waUrl, '_blank');
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
              onClick={() => { setActiveView('counter'); navigate('/staff-login/counter'); }}
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
              onClick={() => { setActiveView('kitchen'); navigate('/staff-login/kitchen'); }}
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
              onClick={() => { setActiveView('delivery'); navigate('/staff-login/delivery'); }}
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
      {/* VIEW 1: COUNTER POS                                       */}
      {/* ========================================================= */}
      {effectiveView === 'counter' && canAccessCounter && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* Catalog Left (Full width on mobile, 70% on desktop) */}
          <div className="w-full md:w-[68%] lg:w-[70%] xl:w-[72%] flex flex-col border-r border-slate-200 bg-slate-50 overflow-hidden pb-16 md:pb-0">
            {/* Search toolbar */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 shadow-xs">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search products by item name, barcode, or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="px-4 py-3 bg-white border-b border-slate-200 flex gap-2 overflow-x-auto shrink-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition border ${
                  selectedCategory === 'ALL'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Menu
              </button>
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => setSelectedCategory(cat._id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition border ${
                    selectedCategory === cat._id
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {loadingProducts ? (
                <div className="h-full flex items-center justify-center text-slate-400 font-bold text-sm">
                  Loading Menu Items...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Utensils size={36} className="mb-2 text-slate-300" />
                  <p className="font-extrabold text-sm">No items found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map((p) => {
                    const inCart = cart.find((c) => c._id === p._id);
                    return (
                      <div
                        key={p._id}
                        onClick={() => addToCart(p)}
                        className="bg-white rounded-2xl border border-slate-200 hover:border-orange-500 shadow-xs hover:shadow-md transition p-3 flex flex-col justify-between cursor-pointer group"
                      >
                        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 mb-2.5">
                          {p.images && p.images[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                              No Image
                            </div>
                          )}
                          {inCart && (
                            <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-black flex items-center justify-center shadow-md">
                              {inCart.qty}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs md:text-sm text-slate-800 line-clamp-1 group-hover:text-orange-600 transition">
                            {p.name}
                          </h4>
                          <p className="text-sm font-black text-slate-900 mt-1">₹{p.price}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cart Right (Desktop only: 30%) */}
          <div className="hidden md:flex md:w-[32%] lg:w-[30%] xl:w-[28%] bg-white flex-col border-l border-slate-200 overflow-hidden">
            {/* Cart Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-orange-600" />
                <h3 className="font-black text-sm text-slate-900">Current Order ({cart.reduce((s, i) => s + i.qty, 0)})</h3>
              </div>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-red-500 font-bold hover:underline">
                  Clear
                </button>
              )}
            </div>

            {/* Dine-in Table Selector / Delivery Toggle */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-600">Dining Mode:</span>
                <span className="text-[10px] font-bold text-orange-600">
                  {selectedTable === '0' ? '🛵 Delivery' : `🍽️ Dine-in (Table ${selectedTable})`}
                </span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedTable('0')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition border ${
                    selectedTable === '0'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  🛵 Delivery
                </button>
                {tables.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTable(t)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition border ${
                      selectedTable === t
                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    T-{t}
                  </button>
                ))}
              </div>

              {/* Customer phone input */}
              <input
                type="tel"
                placeholder="Customer Phone (for WhatsApp bill)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500 bg-white"
              />
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-bold text-center">
                  <ShoppingCart size={32} className="mb-2 text-slate-300" />
                  Cart is empty. Tap items to add.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item._id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-extrabold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[11px] font-mono text-slate-500">₹{item.price} × {item.qty} = ₹{item.price * item.qty}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateCartQty(item._id, -1)} className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100">
                        -
                      </button>
                      <span className="font-black text-xs min-w-[16px] text-center">{item.qty}</span>
                      <button onClick={() => updateCartQty(item._id, 1)} className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100">
                        +
                      </button>
                      <button onClick={() => removeFromCart(item._id)} className="text-red-400 hover:text-red-600 ml-1">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Checkout Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
              <div className="flex justify-between items-center text-base font-black text-slate-900">
                <span>Total Amount:</span>
                <span className="text-emerald-700">₹{finalTotal}</span>
              </div>

              {/* Payment selector */}
              <div className="grid grid-cols-3 gap-1.5">
                {['cash', 'upi', 'card'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPaymentType(p)}
                    className={`py-1.5 rounded-lg text-xs font-black uppercase transition border ${
                      paymentType === p
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Send to Kitchen & Create Order */}
              <button
                type="button"
                onClick={handleCreateCounterOrder}
                disabled={cart.length === 0 || isSubmittingOrder}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                {isSubmittingOrder ? <RefreshCw size={14} className="animate-spin" /> : <Utensils size={14} />}
                Place Order & Send to Kitchen (₹{finalTotal})
              </button>
            </div>
          </div>

          {/* Floating Mobile Cart Summary Bar (Mobile Only) */}
          {cart.length > 0 && (
            <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl z-30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black shadow-md shrink-0">
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900">{cart.reduce((s, i) => s + i.qty, 0)} Items</span>
                    <span className="text-xs font-black text-emerald-700">₹{finalTotal}</span>
                  </div>
                  <span className="text-[10px] font-bold text-orange-600">
                    {selectedTable === '0' ? '🛵 Delivery' : `🍽️ Table ${selectedTable}`}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileCartOpen(true)}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-600/30 transition flex items-center gap-1.5"
              >
                <span>Review & Pay</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Mobile Cart Drawer Modal (Slides up on Mobile) */}
          {isMobileCartOpen && (
            <div className="md:hidden fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200">
              <div className="bg-white rounded-t-3xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-250">
                {/* Drawer Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={18} className="text-orange-600" />
                    <h3 className="font-black text-sm text-slate-900">Current Order ({cart.reduce((s, i) => s + i.qty, 0)} items)</h3>
                  </div>
                  <button
                    onClick={() => setIsMobileCartOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Dining Mode & Customer Phone */}
                <div className="p-3 bg-slate-50/80 border-b border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-500">Dining Mode:</span>
                    <span className="text-[11px] font-bold text-orange-600">
                      {selectedTable === '0' ? '🛵 Delivery' : `🍽️ Table ${selectedTable}`}
                    </span>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setSelectedTable('0')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition border ${
                        selectedTable === '0' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      🛵 Delivery
                    </button>
                    {tables.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTable(t)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition border ${
                          selectedTable === t ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        T-{t}
                      </button>
                    ))}
                  </div>

                  <input
                    type="tel"
                    placeholder="Customer Mobile (for WhatsApp Bill)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-orange-500 bg-white"
                  />
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[140px] max-h-[35vh]">
                  {cart.map((item) => (
                    <div key={item._id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-extrabold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[11px] font-mono text-slate-500">₹{item.price} × {item.qty} = ₹{item.price * item.qty}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateCartQty(item._id, -1)} className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600">
                          -
                        </button>
                        <span className="font-black text-xs min-w-[16px] text-center">{item.qty}</span>
                        <button onClick={() => updateCartQty(item._id, 1)} className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600">
                          +
                        </button>
                        <button onClick={() => removeFromCart(item._id)} className="text-red-400 hover:text-red-600 ml-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Checkout Section in Drawer */}
                <div className="p-4 border-t border-slate-200 bg-white space-y-3">
                  <div className="flex justify-between items-center text-base font-black text-slate-900">
                    <span>Total Amount:</span>
                    <span className="text-emerald-700">₹{finalTotal}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {['cash', 'upi', 'card'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPaymentType(p)}
                        className={`py-2 rounded-xl text-xs font-black uppercase transition border ${
                          paymentType === p ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileCartOpen(false);
                      handleCreateCounterOrder();
                    }}
                    disabled={cart.length === 0 || isSubmittingOrder}
                    className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    {isSubmittingOrder ? <RefreshCw size={14} className="animate-spin" /> : <Utensils size={14} />}
                    Place Order & Send to Kitchen (₹{finalTotal})
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: KITCHEN AREA (KDS)                                */}
      {/* ========================================================= */}
      {effectiveView === 'kitchen' && canAccessKitchen && (
        <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
          {/* Sub Toolbar */}
          <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-sm">
                <ChefHat size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800">Kitchen Display System (KDS)</h2>
                <p className="text-xs text-slate-500">Live incoming counter & table orders for kitchen preparation</p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setKitchenFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  kitchenFilter === 'active' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Active ({kitchenOrders.filter(o => ['placed', 'preparing'].includes(o.orderStatus)).length})
              </button>
              <button
                onClick={() => setKitchenFilter('placed')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  kitchenFilter === 'placed' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Placed ({kitchenOrders.filter(o => o.orderStatus === 'placed').length})
              </button>
              <button
                onClick={() => setKitchenFilter('preparing')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  kitchenFilter === 'preparing' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                🍳 Cooking ({kitchenOrders.filter(o => o.orderStatus === 'preparing').length})
              </button>
              <button
                onClick={() => setKitchenFilter('wasted')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  kitchenFilter === 'wasted' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                ⚠️ Wasted ({kitchenOrders.filter(o => o.orderStatus === 'wasted').length})
              </button>
            </div>
          </div>

          {/* Orders Grid */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {(() => {
              const filtered = kitchenOrders.filter((order) => {
                if (kitchenFilter === 'active') return ['placed', 'preparing'].includes(order.orderStatus);
                return order.orderStatus === kitchenFilter;
              });

              if (filtered.length === 0) {
                return (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                    <Utensils size={36} className="text-amber-400 mb-2" />
                    <h3 className="text-base font-extrabold text-slate-800">No Orders in this Kitchen Queue</h3>
                    <p className="text-xs text-slate-400 mt-1">Orders placed from counter or storefront appear here live.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filtered.map((order) => {
                    const isDineIn = order.orderType && order.orderType.toLowerCase() === 'dine-in';
                    const isPrep = order.orderStatus === 'preparing';
                    const isWasted = order.orderStatus === 'wasted';

                    return (
                      <div
                        key={order._id}
                        className={`bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden ${
                          isPrep ? 'border-amber-400 ring-2 ring-amber-400/30' : isWasted ? 'border-rose-300' : 'border-slate-200'
                        }`}
                      >
                        {/* Header */}
                        <div className={`p-3.5 border-b flex items-center justify-between ${
                          isDineIn ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-slate-900">
                              #{order._id.slice(-6).toUpperCase()}
                            </span>
                            {isDineIn ? (
                              <span className="px-2 py-0.5 rounded-md bg-orange-500 text-white text-[10px] font-black uppercase">
                                🍽️ Table {order.tableNumber || '1'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black uppercase">
                                🛵 Delivery
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Customer & Status */}
                        <div className="p-4 flex-1 flex flex-col space-y-3">
                          <div className="flex justify-between items-start text-xs border-b border-slate-100 pb-2">
                            <div>
                              <p className="font-extrabold text-slate-800">{order.customerName || 'Walk-in Guest'}</p>
                              {order.customerPhone && (
                                <p className="text-[11px] text-slate-400 font-mono">📞 {order.customerPhone}</p>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              isPrep ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse' : isWasted ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {order.orderStatus}
                            </span>
                          </div>

                          {/* Items List */}
                          <div className="flex-1 space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Kitchen Items ({order.orderItems?.length || 0})
                            </span>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {order.orderItems?.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-800 font-black flex items-center justify-center text-xs shrink-0">
                                      {item.qty}×
                                    </span>
                                    <span className="font-extrabold text-slate-800">{item.name}</span>
                                  </div>
                                  <span className="font-bold text-slate-500 font-mono text-[11px]">₹{item.price * item.qty}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {order.wastedReason && (
                            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                              <strong>Damage/Waste:</strong> {order.wastedReason}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        {!isWasted && (
                          <div className="p-3 bg-slate-50/70 border-t border-slate-100 space-y-2">
                            {order.orderStatus === 'placed' && (
                              <button
                                onClick={() => handleStartPreparing(order._id)}
                                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                              >
                                <ChefHat size={14} /> 👨‍🍳 Start Preparing
                              </button>
                            )}

                            {/* FINISH BUTTON */}
                            <button
                              onClick={() => handleFinishKitchenOrder(order)}
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle size={15} /> Finish ({isDineIn ? 'Served / Deliver' : 'Ship to Customer'})
                            </button>

                            <button
                              onClick={() => handleMarkWasted(order._id)}
                              className="w-full py-1 text-rose-600 hover:bg-rose-50 rounded-lg font-bold text-[11px] transition text-center"
                            >
                              ⚠️ Mark Damaged / Wasted
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3: DELIVERY MONITOR (Assigned Delivery Staff)        */}
      {/* ========================================================= */}
      {effectiveView === 'delivery' && canAccessDelivery && (
        <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
          <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-sm">
                <Truck size={18} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800">My Assigned Delivery Orders</h2>
                <p className="text-xs text-slate-500">
                  Showing shipped orders assigned to <span className="font-extrabold text-slate-700">{staffData?.name}</span>
                </p>
              </div>
            </div>
            <button
              onClick={fetchMyAssignedOrders}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
            >
              <RefreshCw size={13} className={deliveryLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {myAssignedOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                <Truck size={36} className="text-indigo-400 mb-2" />
                <h3 className="text-base font-extrabold text-slate-800">No Assigned Deliveries</h3>
                <p className="text-xs text-slate-400 mt-1">Orders assigned to you for delivery will show here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {myAssignedOrders.map((order) => {
                  const addr = order.address || {};
                  const fullAddress = [addr.addressLine1, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
                  const mapUrl = fullAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}` : '';

                  return (
                    <div key={order._id} className="bg-white rounded-2xl border border-indigo-200 shadow-sm flex flex-col overflow-hidden">
                      <div className="p-3.5 bg-indigo-50/80 border-b border-indigo-100 flex items-center justify-between">
                        <span className="font-mono font-black text-indigo-950">#{order._id.slice(-6).toUpperCase()}</span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800 text-[10px] font-black uppercase">
                          Shipped
                        </span>
                      </div>

                      <div className="p-4 flex-1 space-y-3 text-xs">
                        <div>
                          <p className="font-black text-slate-800 text-sm">{order.customerName || 'Customer'}</p>
                          {order.customerPhone && (
                            <div className="flex items-center gap-2 mt-1">
                              <a
                                href={`tel:${order.customerPhone}`}
                                className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg font-bold flex items-center gap-1 hover:bg-green-100"
                              >
                                📞 Call {order.customerPhone}
                              </a>
                              <a
                                href={`https://wa.me/91${order.customerPhone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1 hover:bg-emerald-700"
                              >
                                💬 WhatsApp
                              </a>
                            </div>
                          )}
                        </div>

                        {fullAddress && (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
                            <p className="font-bold text-slate-700 flex items-center gap-1 mb-0.5">
                              <MapPin size={12} className="text-red-500" /> Delivery Address:
                            </p>
                            <p className="leading-relaxed">{fullAddress}</p>
                            {mapUrl && (
                              <a
                                href={mapUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline mt-1"
                              >
                                Open in Google Maps →
                              </a>
                            )}
                          </div>
                        )}

                        <div className="border-t border-slate-100 pt-2 space-y-1">
                          <p className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Items:</p>
                          {order.orderItems?.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-slate-700">
                              <span>{item.qty}× {item.name}</span>
                              <span className="font-mono">₹{item.price * item.qty}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs font-black">
                          <span className="text-slate-600">Payment Status:</span>
                          {order.paymentStatus === 'paid' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-extrabold flex items-center gap-1">
                              ✓ PAID (₹{order.totalAmount} • {String(order.paymentMethod || 'UPI').toUpperCase()})
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-extrabold flex items-center gap-1">
                              PENDING (₹{order.totalAmount} • {String(order.paymentMethod || 'COD').toUpperCase()})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-2">
                        {/* Collect UPI Payment Button (Available ONLY if store owner enabled online payment & order is not yet paid) */}
                        {isOnlinePaymentEnabled && order.paymentStatus !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => handleOpenUpiModal(order)}
                            className="w-full py-2.5 px-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2"
                          >
                            <QrCode size={15} /> Collect UPI Payment (₹{order.totalAmount})
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleMarkDeliveryDelivered(order._id)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow transition flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle size={15} /> {order.paymentStatus === 'paid' ? 'Mark Delivered ✓' : 'Mark Delivered & Paid ✓'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ASSIGN DELIVERY STAFF (Kitchen -> Shipped)         */}
      {/* ========================================================= */}
      {shippingModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck size={20} className="text-indigo-600" />
                <h3 className="font-black text-slate-900 text-base">Assign Delivery Staff & Ship</h3>
              </div>
              <button
                onClick={() => setShippingModal({ isOpen: false, order: null, deliveryStaffId: '', DeliveryPersonName: '', DeliveryPersonPhone: '' })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Order <span className="font-bold text-slate-800">#{shippingModal.order?._id.slice(-6).toUpperCase()}</span> is ready for delivery. Choose the delivery person to assign:
              </p>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Select Store Delivery Staff
                </label>
                <select
                  value={shippingModal.deliveryStaffId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const staff = deliveryStaffList.find(s => s._id === selId);
                    setShippingModal({
                      ...shippingModal,
                      deliveryStaffId: selId,
                      DeliveryPersonName: staff ? staff.name : shippingModal.DeliveryPersonName,
                      DeliveryPersonPhone: staff ? (staff.phone || '') : shippingModal.DeliveryPersonPhone
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  <option value="">-- Select Registered Delivery Staff --</option>
                  {deliveryStaffList.map(staff => (
                    <option key={staff._id} value={staff._id}>
                      {staff.name} {staff.phone ? `(${staff.phone})` : `[${staff.staffId}]`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Delivery Person Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={shippingModal.DeliveryPersonName}
                  onChange={(e) => setShippingModal({ ...shippingModal, DeliveryPersonName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Delivery Person Phone
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={shippingModal.DeliveryPersonPhone}
                  onChange={(e) => setShippingModal({ ...shippingModal, DeliveryPersonPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShippingModal({ isOpen: false, order: null, deliveryStaffId: '', DeliveryPersonName: '', DeliveryPersonPhone: '' })}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    submitFinishOrder(shippingModal.order._id, false, {
                      deliveryStaffId: shippingModal.deliveryStaffId || null,
                      DeliveryPersonName: shippingModal.DeliveryPersonName || 'Store Delivery Staff',
                      DeliveryPersonPhone: shippingModal.DeliveryPersonPhone || ''
                    });
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow transition"
                >
                  Confirm & Mark Shipped →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* ========================================================= */}
      {/* MODAL: COLLECT UPI PAYMENT (For Delivery Staff)           */}
      {/* ========================================================= */}
      {upiModal.isOpen && upiModal.order && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-700 text-white p-6 relative">
              <button
                onClick={() => setUpiModal({ isOpen: false, order: null, loading: false, successMsg: '', errorMsg: '', manualUtr: '' })}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-white mx-auto flex items-center justify-center mb-2 font-black">
                <QrCode size={26} />
              </div>
              <h2 className="text-lg font-black text-center">Collect UPI Payment</h2>
              <p className="text-xs text-indigo-100 text-center font-bold mt-0.5">
                Order #{upiModal.order._id.slice(-6).toUpperCase()} • Amount: ₹{upiModal.order.totalAmount}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Customer details pill */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <p className="font-extrabold text-slate-800">{upiModal.order.customerName || 'Customer'}</p>
                  <p className="text-slate-500 font-mono">{upiModal.order.customerPhone || 'No Phone'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Due</span>
                  <span className="text-base font-black text-indigo-700">₹{upiModal.order.totalAmount}</span>
                </div>
              </div>

              {/* Status messages */}
              {upiModal.successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-extrabold flex items-center gap-2">
                  <CheckCircle size={18} className="shrink-0 text-emerald-600" />
                  <span>{upiModal.successMsg}</span>
                </div>
              )}

              {upiModal.errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={18} className="shrink-0 text-red-500" />
                  <span>{upiModal.errorMsg}</span>
                </div>
              )}

              {/* Action 1: Open Razorpay QR / UPI Flow */}
              {!upiModal.successMsg && (
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={upiModal.loading}
                    onClick={handleCollectUpiRazorpay}
                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {upiModal.loading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" /> Initializing UPI Gateway...
                      </>
                    ) : (
                      <>
                        <QrCode size={18} /> Show Customer UPI QR / Apps
                      </>
                    )}
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">or verify shop QR</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  {/* Manual UPI reference confirmation */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Customer Paid to Store QR? (Optional UTR / Ref)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 12-digit UPI Ref / UTR (Optional)"
                      value={upiModal.manualUtr}
                      onChange={(e) => setUpiModal(prev => ({ ...prev, manualUtr: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      disabled={upiModal.loading}
                      onClick={handleManualUpiConfirm}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
                    >
                      <Check size={14} /> Confirm UPI Received
                    </button>
                  </div>

                  {/* Send payment reminder on WhatsApp */}
                  {upiModal.order.customerPhone && (
                    <button
                      type="button"
                      onClick={handleSendUpiWhatsAppLink}
                      className="w-full py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle size={14} className="text-green-600" /> Send Amount Reminder on WhatsApp
                    </button>
                  )}
                </div>
              )}

              {/* Close / Done */}
              <button
                type="button"
                onClick={() => setUpiModal({ isOpen: false, order: null, loading: false, successMsg: '', errorMsg: '', manualUtr: '' })}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                {upiModal.successMsg ? '✓ Close & Return' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StaffLogin;
