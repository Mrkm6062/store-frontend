import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../../../services/useStore';
import { placeOrder } from '../../../services/api';
import StoreLayout from '../Layout';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { ThemeCustomizationContext } from '../../../themeLoader/themeRenderer.jsx';

// Helper to dynamically load razorpay
const loadRazorpay = () => {
  return new Promise((resolve) => {
    if ('Razorpay' in window) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = (err) => {
      console.error("Razorpay script failed to load. You may have an adblocker enabled.", err);
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

const compressImage = (file, maxSizeMB = 1) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(file);
    if (file.size <= maxSizeMB * 1024 * 1024) return resolve(file);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const MAX_DIMENSION = 1600;
        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        const attemptCompression = () => {
          canvas.toBlob((blob) => {
            if (blob.size <= maxSizeMB * 1024 * 1024 || quality <= 0.2) resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg', lastModified: Date.now() }));
            else { quality -= 0.1; attemptCompression(); }
          }, 'image/jpeg', quality);
        };
        attemptCompression();
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const dataURLtoBlob = (dataurl) => {
  let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {type:mime});
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { store, loading: storeLoading, error: storeError } = useStore();
  const isPlanExpired = store?.subscriptionStatus === 'expired' || 
                        (store?.planExpiryDate && new Date() > new Date(store.planExpiryDate));
  const customization = useContext(ThemeCustomizationContext);
  const primaryColor = customization?.global?.primaryColor || '#76b900';
  
  const [toast, setToast] = useState(null);
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('gb_store_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
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
  const [storeOpenStatus, setStoreOpenStatus] = useState({ isOpen: true, reason: '' });
  const [loadingOpenStatus, setLoadingOpenStatus] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [customFiles, setCustomFiles] = useState({});

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const discountedTotal = cartTotal - discountAmount;

  let shippingCharge = 0;
  if (deliverySettings && deliverySettings.baseCharge > 0) {
    if (deliverySettings.freeShippingThreshold === 0 || discountedTotal < deliverySettings.freeShippingThreshold) {
      shippingCharge = deliverySettings.baseCharge;
    }
  }
  const finalTotal = discountedTotal + shippingCharge;

  // Redirect to home if cart is empty and order wasn't just placed
  useEffect(() => {
    if (cart.length === 0 && !orderSuccess && !storeLoading) {
      navigate('/');
    }
  }, [cart, navigate, orderSuccess, storeLoading]);

  useEffect(() => {
    if (store && store._id) {
      document.title = `Checkout - ${store.websiteTitle || store.name}`;
      const fetchDeliverySettings = async () => {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
          const [delRes, chkRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/delivery-settings/public`, { headers: { 'x-store-id': store._id } }),
            fetch(`${API_BASE_URL}/api/checkout-settings/public`, { headers: { 'x-store-id': store._id } })
          ]);
          if (delRes.ok) setDeliverySettings(await delRes.json());
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

  useEffect(() => {
    const checkOpenStatus = async () => {
      if (!store?._id) return;
      setLoadingOpenStatus(true);
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
        const res = await fetch(`${API_BASE_URL}/api/store-hours/public/status`, {
          headers: { 'x-store-id': store._id }
        });
        if (res.ok) {
          const data = await res.json();
          setStoreOpenStatus(data);
        }
      } catch (e) {
        console.error("Failed to fetch store open status", e);
      } finally {
        setLoadingOpenStatus(false);
      }
    };
    checkOpenStatus();
  }, [store?._id]);

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
        } catch (error) {}
      }
    };
    fetchPincodeDetails();
  }, [formData.pincode]);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

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
    
    if (!formData.customerName || !formData.customerName.trim()) return showToast('Full Name is required.'), setIsPlacingOrder(false);
    if (!formData.customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail.trim())) return showToast('Please enter a valid email address.'), setIsPlacingOrder(false);
    if (!formData.customerPhone || formData.customerPhone.trim().length < 10) return showToast('Mobile Number must be exactly 10 digits.'), setIsPlacingOrder(false);
    if (!formData.addressLine1 || !formData.addressLine1.trim()) return showToast('Address is required.'), setIsPlacingOrder(false);
    if (!formData.landmark || !formData.landmark.trim()) return showToast('Landmark is required.'), setIsPlacingOrder(false);
    if (!formData.city || !formData.city.trim()) return showToast('City is required.'), setIsPlacingOrder(false);
    if (!formData.state || !formData.state.trim()) return showToast('State is required.'), setIsPlacingOrder(false);
    if (!formData.pincode || formData.pincode.trim().length < 6) return showToast('Pincode must be exactly 6 digits.'), setIsPlacingOrder(false);
    if (!formData.alternateNumber || formData.alternateNumber.trim().length < 10) return showToast('Alternate Mobile Number must be exactly 10 digits.'), setIsPlacingOrder(false);

    if (deliverySettings) {
      if (deliverySettings.deliveryMode === 'state') {
        const allowed = deliverySettings.allowedStates.map(s => s.toLowerCase());
        if (!allowed.includes((formData.state || '').toLowerCase().trim())) {
          return showToast(`Sorry, we do not deliver to ${formData.state} at the moment.`), setIsPlacingOrder(false);
        }
      } else if (deliverySettings.deliveryMode === 'pincode') {
        if (!deliverySettings.allowedPincodes.includes((formData.pincode || '').trim())) {
          return showToast(`Sorry, we do not deliver to pincode ${formData.pincode} at the moment.`), setIsPlacingOrder(false);
        }
      }
    }

    try {
      const uploadedImages = {};
      const customizableItems = cart.filter(item => item.isCustomizable);
      
      for (const item of customizableItems) {
        if (!item.customImageBase64 && !customFiles[item._id] && !item.customText) {
          showToast(`Please upload an image or enter text for ${item.name}.`);
          setIsPlacingOrder(false);
          return;
        }
      }

      const itemsToUpload = customizableItems.filter(item => item.customImageBase64 || customFiles[item._id]);

      if (itemsToUpload.length > 0) {
        showToast('Processing custom images...', 'success');
        for (const item of itemsToUpload) {
          let fileToUpload = null;
          if (item.customImageBase64) {
             fileToUpload = dataURLtoBlob(item.customImageBase64);
          } else if (customFiles[item._id]) {
             fileToUpload = await compressImage(customFiles[item._id], 1);
          }
          
          if (fileToUpload) {
            const uploadData = new FormData();
            uploadData.append('storeId', store._id);
            uploadData.append('images', fileToUpload, 'custom_print.jpg');

            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
            const uploadRes = await fetch(`${API_BASE_URL}/api/upload/public`, { method: 'POST', body: uploadData });

            if (uploadRes.ok) {
              const uploadJson = await uploadRes.json();
              if (uploadJson.urls && uploadJson.urls.length > 0) uploadedImages[item._id] = uploadJson.urls[0];
            } else {
              throw new Error(`Image upload failed for ${item.name}`);
            }
          }
        }
      }

      const orderItems = cart.map(item => {
        const idParts = item._id.split('-');
        return { product: idParts[0], variantId: idParts[1] || null, name: item.name, price: item.price, qty: item.qty, customImage: uploadedImages[item._id] || null, customText: item.customText || null };
      });

      const response = await placeOrder({
        customerName: formData.customerName, customerEmail: formData.customerEmail, customerPhone: formData.customerPhone,
        address: { addressLine1: formData.addressLine1, landmark: formData.landmark, city: formData.city, state: formData.state, pincode: formData.pincode, mobileNumber: formData.customerPhone, alternateNumber: formData.alternateNumber },
        orderItems, totalAmount: finalTotal, couponCode: appliedCoupon ? appliedCoupon.code : null, discountAmount, shippingCharge, paymentMethod,
        WhasAppOrder: paymentMethod === 'whatsapp'
      });
      
      const createdOrder = response.order || response;
      const razorpayOrder = response.razorpayOrder;

      if (paymentMethod === 'whatsapp' && checkoutSettings?.whatsappNumber) {
        let itemsText = cart.map(item => `- ${item.qty}x ${item.name} (₹${item.price})`).join('%0A');
        let trackingLink = `${window.location.origin}/track/${createdOrder._id}`;
        let text = `Hello! I have placed an order (ID: ${createdOrder._id.slice(-6).toUpperCase()}).%0A%0A*Order Details:*%0A${itemsText}%0A%0ASubtotal: ₹${cartTotal}%0ADiscount: -₹${discountAmount}%0AShipping: ₹${shippingCharge}%0A*Total Amount: ₹${finalTotal}*%0A%0A*Customer Info:*%0AName: ${formData.customerName}%0APhone: ${formData.customerPhone}%0AAddress: ${formData.addressLine1}, ${formData.city}, ${formData.state} - ${formData.pincode}%0A%0A*Track Order Status:* ${trackingLink}`;
        
        let num = checkoutSettings.whatsappNumber.replace(/[^0-9]/g, '');
        if (num.length === 10) num = '91' + num;
        
        window.open(`https://wa.me/${num}?text=${text}`, '_blank');
      } else if (paymentMethod === 'razorpay' && checkoutSettings?.razorpayEnabled) {
        if (!razorpayOrder) {
          showToast('Failed to initialize Razorpay checkout.', 'error');
          setIsPlacingOrder(false);
          return;
        }

        const isLoaded = await loadRazorpay();
        if (!isLoaded) {
          showToast('Failed to load Razorpay SDK. Check your internet connection.', 'error');
          setIsPlacingOrder(false);
          return;
        }

        const options = {
          key: checkoutSettings.razorpayKeyId,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: store.websiteTitle || store.name,
          description: "Order Payment",
          order_id: razorpayOrder.id,
          handler: async function (paymentResponse) {
            try {
              const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
              const verifyRes = await fetch(`${API_BASE_URL}/api/orders/verify-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...paymentResponse, orderId: createdOrder._id })
              });
              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                showToast('Payment successful!', 'success');
                localStorage.setItem('gb_customer_info', JSON.stringify(formData));
                setCart([]);
                localStorage.removeItem('gb_store_cart');
                setOrderSuccess(true);
              } else {
                showToast('Payment verification failed.', 'error');
              }
            } catch (err) {
              showToast('Error verifying payment.', 'error');
            }
          },
          modal: {
            ondismiss: function() {
              showToast('Payment cancelled. Order saved as pending.', 'error');
              localStorage.setItem('gb_customer_info', JSON.stringify(formData));
              setCart([]);
              localStorage.removeItem('gb_store_cart');
              setOrderSuccess(true);
            }
          },
          prefill: {
            name: formData.customerName,
            email: formData.customerEmail,
            contact: formData.customerPhone
          },
          theme: { color: "#76b900" }
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.open();
        
        setIsPlacingOrder(false);
        return; // Prevent execution of the cart clearance directly below
      }

      localStorage.setItem('gb_customer_info', JSON.stringify(formData));
      setCart([]);
      localStorage.removeItem('gb_store_cart');
      setOrderSuccess(true);
    } catch (error) {
      showToast('Failed to place order: ' + error.message, 'error');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (storeLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 font-bold text-xl" style={{ color: primaryColor }}><span className="animate-pulse">Loading Store...</span></div>;
  if (storeError || !store) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Store Not Available</div>;

  if (orderSuccess) {
    return (
      <StoreLayout store={store} cartCount={0} onCartClick={() => {}} hideFooter={true}>
        <div className="max-w-2xl mx-auto px-4 py-20 text-center w-full">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={48} /></div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Order Placed Successfully!</h2>
          <p className="text-gray-500 mb-8 text-lg">Thank you for your purchase. You will receive tracking updates shortly.</p>
          <Link to="/" style={{ backgroundColor: primaryColor }} className="px-8 py-3.5 text-white font-bold rounded-xl hover:opacity-90 transition shadow-lg">Continue Shopping</Link>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout store={store} cartCount={cart.length} onCartClick={() => {}} hideFooter={true}>
      <style>{`
        .primary-file-input::file-selector-button {
          background-color: ${primaryColor} !important;
        }
        .primary-file-input:hover::file-selector-button {
          opacity: 0.9 !important;
        }
        .floating-label {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          background-color: transparent;
          transition: all 0.2s ease-out;
          pointer-events: none;
          color: #94a3b8;
          font-size: 0.875rem;
          padding: 0 4px;
        }
        .floating-input:focus ~ .floating-label,
        .floating-input:not(:placeholder-shown) ~ .floating-label {
          top: 0px;
          transform: translateY(-50%) scale(0.85);
          color: ${primaryColor};
          background-color: #ffffff;
          font-weight: 600;
        }
        .floating-input:focus {
          border-color: ${primaryColor} !important;
          box-shadow: 0 0 0 1px ${primaryColor};
        }
      `}</style>
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <div className="sticky top-[96px] md:top-[112px] z-30 bg-gray-50/95 backdrop-blur-sm py-2 mb-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 flex justify-start">
            <Link to="/" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft size={16} className="mr-1" /> Back to Cart
            </Link>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form */}
          <div className="lg:col-span-7 space-y-6">
            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-xl text-slate-800 mb-4 border-b pb-3">Contact Details</h3>
                <div className="space-y-4">
                  <div className="relative">
                    <input type="text" required placeholder=" " value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" />
                    <label className="floating-label">Full Name</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <input type="tel" required placeholder=" " maxLength="10" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value.replace(/[^0-9]/g, '')})} className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" />
                      <label className="floating-label">Mobile Number</label>
                    </div>
                    <div className="relative">
                      <input type="email" required placeholder=" " value={formData.customerEmail} onChange={e => setFormData({...formData, customerEmail: e.target.value})} className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" />
                      <label className="floating-label">Email Address</label>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-xl text-slate-800 mb-4 border-b pb-3">Delivery Address</h3>
                <div className="space-y-4">
                  <div className="relative">
                    <input type="text" required placeholder=" " value={formData.addressLine1} onChange={e => setFormData({...formData, addressLine1: e.target.value})} className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" />
                    <label className="floating-label">Address Line 1 (House No, Building, Street)</label>
                  </div>
                  <div className="relative">
                    <input type="text" required placeholder=" " value={formData.landmark} onChange={e => setFormData({...formData, landmark: e.target.value})} className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" />
                    <label className="floating-label">Landmark</label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <input type="text" required placeholder=" " maxLength="6" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value.replace(/[^0-9]/g, '')})} className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" />
                      <label className="floating-label">Pincode</label>
                    </div>
                    <div className="relative">
                      <input type="tel" required placeholder=" " maxLength="10" value={formData.alternateNumber} onChange={e => setFormData({...formData, alternateNumber: e.target.value.replace(/[^0-9]/g, '')})} className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" />
                      <label className="floating-label">Alternate Mobile</label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <input type="text" required placeholder=" " value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" />
                      <label className="floating-label">City</label>
                    </div>
                    <div className="relative">
                      <input type="text" required placeholder=" " value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" />
                      <label className="floating-label">State</label>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-xl text-slate-800 mb-4 border-b pb-3">Payment Method</h3>
                <div className="flex flex-col gap-3">
                  {checkoutSettings?.codEnabled !== false && <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${paymentMethod === 'cod' ? 'border-[#76b900] bg-green-50' : 'border-slate-200 bg-white'}`}><input type="radio" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="w-5 h-5 text-[#76b900]" /><span className="font-bold text-slate-800">Cash on Delivery (COD)</span></label>}
                  {checkoutSettings?.whatsappEnabled && <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${paymentMethod === 'whatsapp' ? 'border-[#76b900] bg-green-50' : 'border-slate-200 bg-white'}`}><input type="radio" value="whatsapp" checked={paymentMethod === 'whatsapp'} onChange={() => setPaymentMethod('whatsapp')} className="w-5 h-5 text-[#76b900]" /><span className="font-bold text-slate-800">Order via WhatsApp</span></label>}
                  {checkoutSettings?.razorpayEnabled && <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${paymentMethod === 'razorpay' ? 'border-[#76b900] bg-green-50' : 'border-slate-200 bg-white'}`}><input type="radio" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} className="w-5 h-5 text-[#76b900]" /><span className="font-bold text-slate-800">Pay Online (Razorpay)</span></label>}
                </div>
              </div>
            </form>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
              <h3 className="font-bold text-xl text-slate-800 mb-4 border-b pb-3">Order Summary</h3>
              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {cart.map((item) => (
                  <div key={item._id} className="flex flex-col text-sm border-b border-gray-50 pb-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                          {(item.images?.length > 0 ? item.images[0] : item.image) ? <img src={item.images?.length > 0 ? item.images[0] : item.image} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Img</div>}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 line-clamp-1">{item.name}</p>
                          <p className="text-gray-500">Qty: {item.qty}</p>
                          {item.customText && <p className="text-xs text-gray-500 mt-0.5"><span className="font-semibold text-gray-700">Text:</span> {item.customText}</p>}
                        </div>
                      </div>
                      <div className="font-bold text-gray-800">₹{item.price * item.qty}</div>
                    </div>
                    {item.isCustomizable && (
                      <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center gap-3">
                        {item.customImageBase64 ? (
                          <>
                            <img src={item.customImageBase64} alt="Custom" className="w-12 h-12 rounded object-cover border shadow-sm" />
                            <div className="text-xs text-green-700 font-bold flex flex-col">
                              <span>Custom Image Uploaded</span>
                              <span className="font-medium text-gray-500">Will be printed on item</span>
                            </div>
                          </>
                        ) : (
                           <div className="w-full">
                            <label className="block text-xs font-bold text-gray-700 mb-2">
                              Upload image to print on this product {!item.customText && <span className="text-red-500">*</span>}
                              {item.customText && <span className="text-gray-400 font-normal ml-1">(Optional)</span>}
                            </label>
                            <input type="file" accept="image/*" required={!item.customText && !customFiles[item._id]} onChange={e => { if (e.target.files[0]) setCustomFiles(prev => ({...prev, [item._id]: e.target.files[0]})); }} className="primary-file-input w-full text-xs text-gray-600 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:text-white transition-colors cursor-pointer" />
                            {customFiles[item._id] && (
                              <div className="mt-2 relative inline-block">
                                <img src={URL.createObjectURL(customFiles[item._id])} alt="Preview" className="h-16 w-16 object-cover rounded border border-gray-300 shadow-sm" />
                                <button type="button" onClick={() => { const newFiles = {...customFiles}; delete newFiles[item._id]; setCustomFiles(newFiles); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-600 transition">&times;</button>
                              </div>
                            )}
                           </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mb-6"><div className="flex gap-2"><input type="text" placeholder="Coupon Code" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} disabled={appliedCoupon} className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] font-mono uppercase text-sm" />{appliedCoupon ? <button type="button" onClick={() => { setAppliedCoupon(null); setDiscountAmount(0); setCouponCode(''); setCouponMessage({text: '', type: ''}); }} className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition text-sm">Remove</button> : <button type="button" onClick={handleApplyCoupon} disabled={isValidatingCoupon || !couponCode} className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition disabled:opacity-50 text-sm">{isValidatingCoupon ? '...' : 'Apply'}</button>}</div>{couponMessage.text && <p className={`text-xs font-bold mt-2 ${couponMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{couponMessage.text}</p>}</div>

              <div className="space-y-2 mb-4 text-sm text-gray-600">
                <div className="flex justify-between"><span>Subtotal:</span><span className="font-bold text-gray-800">₹{cartTotal}</span></div>
                {appliedCoupon && <div className="flex justify-between text-green-600 font-bold"><span>Discount ({appliedCoupon.code}):</span><span>-₹{discountAmount}</span></div>}
                <div className="flex justify-between"><span>Shipping:</span><span className="font-bold text-gray-800">{shippingCharge > 0 ? `₹${shippingCharge}` : 'Free'}</span></div>
              </div>
              <div className="flex justify-between items-center font-bold text-xl mb-6 border-t pt-4 text-gray-800"><span>Total:</span><span className="text-green-600">₹{finalTotal}</span></div>
              
              {/* Store Hours Check */}
              {isPlanExpired ? (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-xl text-left flex gap-2">
                  <span>⚠️</span>
                  <span>
                    Orders cannot be placed at this time because the store's subscription plan has expired.
                  </span>
                </div>
              ) : !storeOpenStatus.isOpen ? (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-xl text-left flex gap-2">
                  <span>⚠️</span>
                  <span>
                    {storeOpenStatus.reason || "We are currently closed and not accepting orders. Please try again during our store hours."}
                  </span>
                </div>
              ) : null}

              <button 
                type="submit" 
                form="checkout-form" 
                disabled={isPlacingOrder || !storeOpenStatus.isOpen || isPlanExpired} 
                style={{ backgroundColor: (storeOpenStatus.isOpen && !isPlanExpired) ? primaryColor : '#94a3b8' }} 
                className="w-full text-white font-bold py-4 rounded-xl hover:opacity-90 transition text-lg shadow-lg disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isPlacingOrder ? 'Processing...' : (isPlanExpired ? 'Subscription Expired' : (!storeOpenStatus.isOpen ? 'Store Closed' : 'Confirm & Place Order'))}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {toast && (
        <div 
          className="fixed top-10 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-3 transition-all animate-fadeIn text-white"
          style={{ backgroundColor: toast.type === 'error' ? '#ef4444' : primaryColor }}
        >
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          {toast.message}
        </div>
      )}
    </StoreLayout>
  );
};
export default CheckoutPage;