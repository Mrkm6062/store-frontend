import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../../../services/useStore';
import { useProducts } from '../../../services/useProducts';
import { placeOrder } from '../../../services/api';
import StoreLayout from '../Layout';
import { CheckCircle, ArrowLeft, MapPin } from 'lucide-react';
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
  const primaryColor = customization?.global?.primaryColor || '#e85d04';
  
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
      customerName: '', customerEmail: '', customerPhone: '', addressLine1: '', landmark: '', city: '', state: '', pincode: '', alternateNumber: '', postOffice: '', locality: ''
    };
  });

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMessage, setCouponMessage] = useState({ text: '', type: '' });
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [deliverySettings, setDeliverySettings] = useState(null);
  const [checkoutSettings, setCheckoutSettings] = useState(null);
  
  // Restaurant & Dine-in ordering support
  const isRestaurant = store ? Boolean(
    store.isRestaurant !== false && (
      store.isRestaurant === true ||
      store.dineInEnabled === true ||
      (store.tables && store.tables.length > 0) ||
      (store.storeType && /restaurant|cafe|food|dine|bistro|dhaba|eatery/i.test(store.storeType)) ||
      true
    )
  ) : true;
  const availableTables = (store?.tables && Array.isArray(store.tables) && store.tables.length > 0)
    ? store.tables
    : ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

  const [diningPreference, setDiningPreference] = useState(() => {
    try {
      const saved = localStorage.getItem('gb_dining_preference');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    const handlePrefUpdate = () => {
      try {
        const saved = localStorage.getItem('gb_dining_preference');
        setDiningPreference(saved ? JSON.parse(saved) : null);
      } catch (e) {}
    };
    window.addEventListener('dining-preference-updated', handlePrefUpdate);
    window.addEventListener('storage', handlePrefUpdate);
    return () => {
      window.removeEventListener('dining-preference-updated', handlePrefUpdate);
      window.removeEventListener('storage', handlePrefUpdate);
    };
  }, []);

  const isDineIn = isRestaurant && diningPreference?.orderType === 'Dine-in';
  const currentTableNumber = diningPreference?.tableNumber || availableTables[0] || '1';

  const handleTableChange = (newTable) => {
    const updated = {
      ...(diningPreference || {}),
      orderType: 'Dine-in',
      tableNumber: String(newTable).trim(),
      updatedAt: Date.now()
    };
    localStorage.setItem('gb_dining_preference', JSON.stringify(updated));
    setDiningPreference(updated);
    window.dispatchEvent(new Event('dining-preference-updated'));
  };

  const handleSwitchToDelivery = () => {
    const updated = {
      orderType: 'delivery',
      tableNumber: '0',
      updatedAt: Date.now()
    };
    localStorage.setItem('gb_dining_preference', JSON.stringify(updated));
    setDiningPreference(updated);
    window.dispatchEvent(new Event('dining-preference-updated'));
  };

  const handleSwitchToDineIn = () => {
    const updated = {
      orderType: 'Dine-in',
      tableNumber: availableTables[0] || '1',
      updatedAt: Date.now()
    };
    localStorage.setItem('gb_dining_preference', JSON.stringify(updated));
    setDiningPreference(updated);
    window.dispatchEvent(new Event('dining-preference-updated'));
  };
  const [storeOpenStatus, setStoreOpenStatus] = useState({ isOpen: true, reason: '' });
  const [loadingOpenStatus, setLoadingOpenStatus] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [customFiles, setCustomFiles] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  
  const [editName, setEditName] = useState(formData.customerName || '');
  const [editPhone, setEditPhone] = useState(formData.customerPhone || '');
  const [editEmail, setEditEmail] = useState(formData.customerEmail || '');
  const [editAddress, setEditAddress] = useState(formData.addressLine1 || '');
  const [editLandmark, setEditLandmark] = useState(formData.landmark || '');
  const [editPincode, setEditPincode] = useState(formData.pincode || '');
  const [editAlternate, setEditAlternate] = useState(formData.alternateNumber || '');
  const [editCity, setEditCity] = useState(formData.city || '');
  const [editState, setEditState] = useState(formData.state || '');
  const [editPostOffice, setEditPostOffice] = useState(formData.postOffice || '');
  const [editLocality, setEditLocality] = useState(formData.locality || '');

  const [inlineOffices, setInlineOffices] = useState([]);
  const [availableOffices, setAvailableOffices] = useState([]);

  const [calculatedDelivery, setCalculatedDelivery] = useState({
    available: true,
    charge: 0,
    isFreeShipping: false,
    matchedLocationName: '',
    message: ''
  });

  const [isVerifying, setIsVerifying] = useState(false);
  const [modalResult, setModalResult] = useState({ text: '', type: '' });

  // Helper to get ONLY created delivery area options from DeliveryArea model & deliveryLocations
  const getCreatedAreaOptions = (pincode, city, state, deliverySettingsObj) => {
    const optionsMap = new Map();
    const cleanPin = (pincode || '').trim();
    const cleanCity = (city || '').toLowerCase().trim();
    const cleanState = (state || '').toLowerCase().trim();

    // 1. From DeliveryArea model (deliverySettingsObj?.areas)
    if (deliverySettingsObj?.areas && Array.isArray(deliverySettingsObj.areas)) {
      deliverySettingsObj.areas.forEach(area => {
        if (area.enabled === false) return;
        const areaPin = area.pincode ? String(area.pincode).trim() : '';
        const areaDist = area.district ? String(area.district).toLowerCase().trim() : '';
        const areaState = area.state ? String(area.state).toLowerCase().trim() : '';

        const pinMatch = cleanPin && areaPin === cleanPin;
        const distMatch = cleanCity && areaDist === cleanCity;
        const stateMatch = cleanState && areaState === cleanState;
        const isGeneralArea = !areaPin && !areaDist && !areaState;

        if (pinMatch || distMatch || stateMatch || isGeneralArea || !cleanPin) {
          if (area.name) {
            const key = area.name.trim();
            optionsMap.set(key, {
              _id: area._id,
              name: key,
              pincode: area.pincode || '',
              state: area.state || '',
              district: area.district || '',
              charge: area.charge !== undefined ? Number(area.charge) : null,
              type: area.type || 'area',
              isModelArea: true
            });
          }
        }
      });
    }

    // 2. From deliveryLocations array in deliverySettings
    if (deliverySettingsObj?.deliveryLocations && Array.isArray(deliverySettingsObj.deliveryLocations)) {
      deliverySettingsObj.deliveryLocations.forEach(loc => {
        if (loc.enabled === false) return;
        const locPin = loc.pincode ? String(loc.pincode).trim() : '';
        const locDist = loc.district ? String(loc.district).toLowerCase().trim() : '';
        const locState = loc.state ? String(loc.state).toLowerCase().trim() : '';

        const pinMatch = cleanPin && locPin === cleanPin;
        const distMatch = cleanCity && locDist === cleanCity;
        const stateMatch = cleanState && locState === cleanState;
        const isGeneralArea = !locPin && !locDist && !locState;

        if (pinMatch || distMatch || stateMatch || isGeneralArea || !cleanPin) {
          if (loc.name) {
            const key = loc.name.trim();
            if (!optionsMap.has(key)) {
              optionsMap.set(key, {
                name: key,
                pincode: loc.pincode || '',
                state: loc.state || '',
                district: loc.district || '',
                charge: loc.charge !== undefined ? Number(loc.charge) : null,
                type: loc.type || 'location',
                isModelArea: true
              });
            }
          }
        }
      });
    }

    return Array.from(optionsMap.values());
  };

  const handleAreaSelect = (areaName, isModal = false) => {
    if (!areaName) {
      if (isModal) {
        setEditPostOffice('');
        setEditLocality('');
      } else {
        setFormData(prev => ({ ...prev, postOffice: '', locality: '' }));
      }
      return;
    }

    const currentPin = isModal ? editPincode : formData.pincode;
    const currentCity = isModal ? editCity : formData.city;
    const currentState = isModal ? editState : formData.state;
    const options = getCreatedAreaOptions(currentPin, currentCity, currentState, deliverySettings);
    const matchedArea = options.find(o => o.name === areaName);

    if (isModal) {
      setEditPostOffice(areaName);
      setEditLocality(areaName);
      if (matchedArea) {
        if (matchedArea.pincode) setEditPincode(matchedArea.pincode);
        if (matchedArea.state) setEditState(matchedArea.state);
        if (matchedArea.district) setEditCity(matchedArea.district);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        postOffice: areaName,
        locality: areaName,
        ...(matchedArea?.pincode && { pincode: matchedArea.pincode }),
        ...(matchedArea?.state && { state: matchedArea.state }),
        ...(matchedArea?.district && { city: matchedArea.district })
      }));
    }
  };

  const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const minOrderLimit = Number(deliverySettings?.minimumOrderLimitThreshold || 0);
  const isBelowMinOrder = !isDineIn && minOrderLimit > 0 && cartTotal < minOrderLimit;
  const amountNeededForMinOrder = Math.max(0, minOrderLimit - cartTotal);

  const isCheckoutFormValid = isDineIn ? !!(
    formData.customerName && formData.customerName.trim() !== '' &&
    formData.customerPhone && formData.customerPhone.trim().length >= 10 &&
    currentTableNumber
  ) : !!(
    formData.pincode && formData.pincode.trim().length === 6 &&
    formData.locality && formData.locality.trim() !== '' && formData.locality !== 'Other' &&
    formData.city && formData.city.trim() !== '' &&
    formData.state && formData.state.trim() !== '' &&
    formData.addressLine1 && formData.addressLine1.trim() !== '' &&
    formData.customerName && formData.customerName.trim() !== '' &&
    formData.customerPhone && formData.customerPhone.trim().length >= 10 &&
    isEmailValid(formData.customerEmail) &&
    calculatedDelivery.available &&
    !isBelowMinOrder
  );

  useEffect(() => {
    setEditName(formData.customerName || '');
    setEditPhone(formData.customerPhone || '');
    setEditEmail(formData.customerEmail || '');
    setEditAddress(formData.addressLine1 || '');
    setEditLandmark(formData.landmark || '');
    setEditPincode(formData.pincode || '');
    setEditAlternate(formData.alternateNumber || '');
    setEditCity(formData.city || '');
    setEditState(formData.state || '');
    setEditPostOffice(formData.postOffice || '');
    setEditLocality(formData.locality || '');
  }, [formData]);

  // Inline Pincode Auto-fetch
  useEffect(() => {
    const fetchInlinePincodeDetails = async () => {
      if (formData.pincode && formData.pincode.trim().length === 6) {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || '';
          const response = await fetch(`${API_BASE_URL}/api/delivery-settings/public/pincode/${formData.pincode.trim()}`);
          if (response.ok) {
            const data = await response.json();
            const fetchedOffices = data.offices || [];
            setInlineOffices(fetchedOffices);

            const areaOpts = getCreatedAreaOptions(formData.pincode, data.city, data.state, deliverySettings);
            const defaultLocality = areaOpts.length > 0 ? areaOpts[0].name : '';

            setFormData(prev => ({
              ...prev,
              city: data.city || prev.city,
              state: data.state || prev.state,
              postOffice: prev.postOffice || defaultLocality,
              locality: prev.locality || defaultLocality
            }));
          }
        } catch (error) {}
      } else {
        setInlineOffices([]);
      }
    };
    fetchInlinePincodeDetails();
  }, [formData.pincode, deliverySettings]);

  // Edit Modal Pincode Auto-fetch
  useEffect(() => {
    const fetchEditPincodeDetails = async () => {
      if (editPincode && editPincode.trim().length === 6) {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || '';
          const response = await fetch(`${API_BASE_URL}/api/delivery-settings/public/pincode/${editPincode.trim()}`);
          if (response.ok) {
            const data = await response.json();
            const fetchedOffices = data.offices || [];
            setEditCity(data.city || '');
            setEditState(data.state || '');
            setAvailableOffices(fetchedOffices);

            const areaOpts = getCreatedAreaOptions(editPincode, data.city, data.state, deliverySettings);
            const defaultLocality = areaOpts.length > 0 ? areaOpts[0].name : '';

            if (!editPostOffice) {
              setEditPostOffice(defaultLocality);
              setEditLocality(defaultLocality);
            }
          }
        } catch (e) {}
      } else {
        setAvailableOffices([]);
      }
    };
    fetchEditPincodeDetails();
  }, [editPincode, deliverySettings]);

  useEffect(() => {
    const checkOpenStatus = async () => {
      if (!store?._id) return;
      setLoadingOpenStatus(true);
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || '';
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

  const handleSaveEditedAddress = async (e) => {
    e.preventDefault();
    if (!editPincode || editPincode.trim().length !== 6) {
      setModalResult({ text: 'Pincode must be exactly 6 digits.', type: 'error' });
      return;
    }
    if (!editPhone || editPhone.trim().length < 10) {
      setModalResult({ text: 'Mobile number must be at least 10 digits.', type: 'error' });
      return;
    }

    setIsVerifying(true);
    setModalResult({ text: '', type: '' });

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || '';
      const calcRes = await fetch(`${API_BASE_URL}/api/delivery-settings/public/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-store-id': store?._id },
        body: JSON.stringify({
          storeId: store?._id,
          state: editState.trim(),
          district: editCity.trim(),
          pincode: editPincode.trim(),
          postOffice: editPostOffice.trim(),
          locality: editLocality.trim(),
          subtotal: discountedTotal
        })
      });

      let calcData = { available: true };
      if (calcRes.ok) {
        calcData = await calcRes.json();
      }

      if (calcData.available) {
        const updatedInfo = {
          customerName: editName.trim(),
          customerPhone: editPhone.trim(),
          customerEmail: editEmail.trim(),
          addressLine1: editAddress.trim(),
          landmark: editLandmark.trim(),
          pincode: editPincode.trim(),
          alternateNumber: editAlternate.trim(),
          city: editCity.trim(),
          state: editState.trim(),
          postOffice: editPostOffice.trim(),
          locality: editLocality.trim()
        };
        localStorage.setItem('gb_customer_info', JSON.stringify(updatedInfo));
        setFormData(updatedInfo);
        setCalculatedDelivery(calcData);
        setModalResult({ text: 'Address updated & delivery fee updated!', type: 'success' });
        window.dispatchEvent(new Event('customer-info-updated'));
        setTimeout(() => {
          setShowEditModal(false);
          setModalResult({ text: '', type: '' });
        }, 1200);
      } else {
        setModalResult({ text: calcData.message || `Sorry, we do not deliver to this location (${editPincode}).`, type: 'error' });
      }
    } catch (err) {
      setModalResult({ text: err.message || 'Verification failed. Try again.', type: 'error' });
    } finally {
      setIsVerifying(false);
    }
  };

  const hasSavedDetails = !!(formData.pincode && formData.addressLine1 && formData.customerName);

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

  const { totalDiscount: offerDiscount, appliedPromoNames } = calculateOfferDiscount(cart);
  const discountedTotal = Math.max(0, cartTotal - discountAmount - offerDiscount);

  // Dynamic Calculate Delivery API call
  useEffect(() => {
    const calcDelivery = async () => {
      if (!store?._id) return;
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${API_BASE_URL}/api/delivery-settings/public/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-store-id': store._id },
          body: JSON.stringify({
            storeId: store._id,
            state: formData.state,
            district: formData.city,
            pincode: formData.pincode,
            postOffice: formData.postOffice,
            locality: formData.locality,
            subtotal: discountedTotal
          })
        });
        if (res.ok) {
          const data = await res.json();
          setCalculatedDelivery(data);
        }
      } catch (e) {
        console.error("Delivery calculation failed", e);
      }
    };
    calcDelivery();
  }, [store?._id, formData.state, formData.city, formData.pincode, formData.postOffice, formData.locality, discountedTotal]);

  let shippingCharge = isDineIn ? 0 : (calculatedDelivery.available ? (calculatedDelivery.charge !== undefined ? calculatedDelivery.charge : (deliverySettings?.baseCharge || 0)) : (deliverySettings?.baseCharge || 0));
  if (calculatedDelivery.isFreeShipping || isDineIn) shippingCharge = 0;
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
          const API_BASE_URL = import.meta.env.VITE_API_URL || '';
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
      const API_BASE_URL = import.meta.env.VITE_API_URL || '';
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

    if (!isDineIn) {
      if (isBelowMinOrder) {
        showToast(`Minimum order amount of ₹${minOrderLimit} is required to place an order. Please add ₹${amountNeededForMinOrder} more to your cart.`, 'error');
        setIsPlacingOrder(false);
        return;
      }
      
      if (!formData.pincode || formData.pincode.trim().length < 6) return showToast('Pincode must be exactly 6 digits.'), setIsPlacingOrder(false);
      if (!formData.locality || !formData.locality.trim()) return showToast('Please select a delivery area.'), setIsPlacingOrder(false);
      if (!formData.customerName || !formData.customerName.trim()) return showToast('Full Name is required.'), setIsPlacingOrder(false);
      if (!formData.customerEmail || !isEmailValid(formData.customerEmail)) return showToast('Please enter a valid email address.'), setIsPlacingOrder(false);
      if (!formData.customerPhone || formData.customerPhone.trim().length < 10) return showToast('Mobile Number must be at least 10 digits.'), setIsPlacingOrder(false);
      if (!formData.addressLine1 || !formData.addressLine1.trim()) return showToast('Address is required.'), setIsPlacingOrder(false);
      if (!formData.city || !formData.city.trim()) return showToast('City/District is required.'), setIsPlacingOrder(false);
      if (!formData.state || !formData.state.trim()) return showToast('State is required.'), setIsPlacingOrder(false);

      // Live Backend Delivery Verification before order creation
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || '';
        const checkRes = await fetch(`${API_BASE_URL}/api/delivery-settings/public/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-store-id': store?._id },
          body: JSON.stringify({
            storeId: store?._id,
            state: formData.state.trim(),
            district: formData.city.trim(),
            pincode: formData.pincode.trim(),
            postOffice: (formData.postOffice || '').trim(),
            locality: (formData.locality || '').trim(),
            subtotal: discountedTotal
          })
        });

        let liveCalc = { available: false };
        if (checkRes.ok) {
          liveCalc = await checkRes.json();
        }

        setCalculatedDelivery(liveCalc);

        if (!liveCalc.available) {
          showToast(liveCalc.message || `Pincode ${formData.pincode} is not deliverable.`);
          setIsPlacingOrder(false);
          return;
        }
      } catch (err) {
        showToast('Delivery verification failed. Please try again.');
        setIsPlacingOrder(false);
        return;
      }
    } else {
      // Dine-in Validations
      if (!formData.customerName || !formData.customerName.trim()) {
        showToast('Full Name is required.');
        setIsPlacingOrder(false);
        return;
      }
      if (!formData.customerPhone || formData.customerPhone.trim().length < 10) {
        showToast('Mobile Number must be at least 10 digits.');
        setIsPlacingOrder(false);
        return;
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

            const API_BASE_URL = import.meta.env.VITE_API_URL || '';
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

      const dineInAddress = {
        addressLine1: `Dine-in (Table ${currentTableNumber})`,
        landmark: `Table ${currentTableNumber}`,
        city: store?.locationAddress || "Restaurant",
        state: "",
        pincode: "000000",
        mobileNumber: formData.customerPhone,
        alternateNumber: formData.alternateNumber || "",
        postOffice: "",
        locality: ""
      };

      const response = await placeOrder({
        customerName: formData.customerName,
        customerEmail: formData.customerEmail || "",
        customerPhone: formData.customerPhone,
        address: isDineIn ? dineInAddress : {
          addressLine1: formData.addressLine1,
          landmark: formData.landmark,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          alternateNumber: formData.alternateNumber,
          postOffice: formData.postOffice,
          locality: formData.locality
        },
        orderItems,
        totalAmount: finalTotal,
        discountAmount: (discountAmount + offerDiscount),
        appliedCoupon: appliedCoupon ? appliedCoupon.code : null,
        paymentMethod,
        shippingCharge: isDineIn ? 0 : shippingCharge,
        orderSource: 'web',
        orderType: isDineIn ? 'Dine-in' : 'delivery',
        tableNumber: isDineIn ? String(currentTableNumber) : '0',
        orderBy: ''
      });

      const createdOrder = response?.order || response;
      if (!createdOrder || !createdOrder._id) {
        throw new Error(response?.message || 'Order creation failed');
      }

      if (paymentMethod === 'whatsapp') {
        const storePhone = (store.supportPhoneNumbers && store.supportPhoneNumbers.length > 0) ? store.supportPhoneNumbers[0] : (store.whatsappNumber || '');
        const cleanPhone = storePhone.replace(/[^0-9]/g, '');
        
        let messageText = `*New Order Placed! (Order #${createdOrder._id.slice(-6).toUpperCase()})*\n\n`;
        messageText += `*Customer:* ${formData.customerName}\n`;
        messageText += `*Phone:* ${formData.customerPhone}\n`;
        if (isDineIn) {
          messageText += `*Order Type:* 🍽️ Dine-in\n`;
          messageText += `*Table Number:* Table ${currentTableNumber}\n\n`;
        } else {
          messageText += `*Address:* ${formData.addressLine1}, ${formData.landmark ? formData.landmark + ', ' : ''}${formData.city}, ${formData.state} - ${formData.pincode}\n\n`;
        }
        messageText += `*Items Ordered:*\n`;
        cart.forEach(item => {
          messageText += `• ${item.name} x ${item.qty} = ₹${item.price * item.qty}\n`;
        });
        messageText += `\n*Subtotal:* ₹${cartTotal}\n`;
        if (offerDiscount > 0) messageText += `*Offer Discount:* -₹${offerDiscount}\n`;
        if (discountAmount > 0) messageText += `*Coupon Discount:* -₹${discountAmount}\n`;
        messageText += `*Shipping Charge:* ₹${shippingCharge}\n`;
        messageText += `*Total Payable:* ₹${finalTotal}\n`;

        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
        
        localStorage.setItem('gb_customer_info', JSON.stringify(formData));
        setCart([]);
        localStorage.removeItem('gb_store_cart');
        setOrderSuccess(true);
        window.open(whatsappUrl, '_blank');
        setIsPlacingOrder(false);
        return;
      }

      if (paymentMethod === 'razorpay') {
        const API_BASE_URL = import.meta.env.VITE_API_URL || '';
        const razorpayRes = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: finalTotal, currency: 'INR', orderId: createdOrder._id })
        });
        const razorpayOrder = await razorpayRes.json();

        const isLoaded = await loadRazorpay();
        if (!isLoaded) {
          showToast('Failed to load Razorpay SDK. Check your internet connection.');
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
              const API_BASE_URL = import.meta.env.VITE_API_URL || '';
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
          theme: { color: primaryColor }
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.open();
        
        setIsPlacingOrder(false);
        return;
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
      <StoreLayout store={store} cartCount={0} onCartClick={() => {}} hideFooter={true} hideHeader={true}>
        <div className="max-w-2xl mx-auto px-4 py-20 text-center w-full">
          <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6" style={{ color: primaryColor }}><CheckCircle size={48} /></div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Order Placed Successfully!</h2>
          <p className="text-gray-500 mb-8 text-lg">Thank you for your purchase. You will receive tracking updates shortly.</p>
          <Link to="/" style={{ backgroundColor: primaryColor }} className="px-8 py-3.5 text-white font-bold rounded-xl hover:opacity-90 transition shadow-lg">Continue Shopping</Link>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout store={store} cartCount={cart.length} onCartClick={() => {}} hideFooter={true} hideHeader={true} hideBottomNav={showEditModal}>
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
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="mb-8">
          <div className="sticky top-0 z-30 bg-[#fffaf3]/95 backdrop-blur-sm py-3 mb-5 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 flex justify-start">
            <Link to="/" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft size={16} className="mr-1" /> Back to Cart
            </Link>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-stone-900">Checkout</h1>
        </div>

        {/* Desktop View Layout (hidden lg:grid) */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-8">
          {/* Left Column: Form */}
          <div className="lg:col-span-7 space-y-6">
            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-6">
              
              {isDineIn ? (
                /* Dine-in Table Details Card */
                <div className="bg-white p-6 rounded-[1.35rem] shadow-[0_8px_28px_rgba(91,45,19,0.07)] border-2 border-orange-200">
                  <div className="flex items-center justify-between mb-4 border-b pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">🍽️</span>
                      <div>
                        <h3 className="font-extrabold text-xl text-slate-800">Dine-in Order</h3>
                        <p className="text-xs text-slate-500 font-semibold">Food will be served directly to your table</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSwitchToDelivery}
                      className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
                    >
                      Switch to Delivery 🛵
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-orange-50/70 border border-orange-200/80 rounded-2xl">
                      <label className="block text-xs font-black uppercase tracking-wider text-orange-950 mb-2">
                        Seated at Table Number:
                      </label>
                      <div className="flex items-center gap-3">
                        <select
                          value={currentTableNumber}
                          onChange={(e) => handleTableChange(e.target.value)}
                          className="flex-1 px-4 py-3 border-2 border-orange-300 rounded-xl focus:outline-none focus:border-orange-500 bg-white text-base font-black text-slate-900 shadow-sm"
                        >
                          {availableTables.map((t) => (
                            <option key={t} value={t}>
                              Table {t}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs font-extrabold text-orange-700 bg-orange-100 px-3 py-3 rounded-xl whitespace-nowrap">
                          🍽️ Table {currentTableNumber}
                        </span>
                      </div>

                      {/* Quick Table Switch Chips */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {availableTables.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleTableChange(t)}
                            className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition ${
                              currentTableNumber === t
                                ? 'bg-orange-600 text-white shadow-sm'
                                : 'bg-white text-slate-700 hover:bg-orange-100 border border-orange-200'
                            }`}
                          >
                            T-{t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Step 1: Delivery Location & Pincode First */}
                  <div className="bg-white p-6 rounded-[1.35rem] shadow-[0_8px_28px_rgba(91,45,19,0.07)] border border-orange-100">
                    <div className="flex items-center justify-between mb-4 border-b pb-3">
                      <div className="flex items-center gap-2">
                        <MapPin size={22} className="text-[#e85d04]" />
                        <h3 className="font-bold text-xl text-slate-800">1. Delivery Location & Pincode</h3>
                      </div>
                      {isRestaurant && (
                        <button
                          type="button"
                          onClick={handleSwitchToDineIn}
                          className="text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl transition"
                        >
                          Switch to Dine-in 🍽️
                        </button>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative">
                          <input 
                            type="text" 
                            required 
                            placeholder=" " 
                            maxLength="6" 
                            value={formData.pincode} 
                            onChange={e => {
                              const newPin = e.target.value.replace(/[^0-9]/g, '');
                              setFormData(prev => ({ ...prev, pincode: newPin, locality: '', postOffice: '' }));
                              setCalculatedDelivery({ available: false, charge: 0, isFreeShipping: false, matchedLocationName: '', message: 'Checking pincode...' });
                            }} 
                            className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm font-bold text-slate-800" 
                          />
                          <label className="floating-label">Enter 6-Digit Pincode *</label>
                        </div>

                        <div className="relative">
                          {(() => {
                            const areaOpts = getCreatedAreaOptions(formData.pincode, formData.city, formData.state, deliverySettings);
                            return (
                              <select
                                value={formData.locality || formData.postOffice}
                                onChange={e => handleAreaSelect(e.target.value, false)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm font-bold text-slate-800"
                              >
                                <option value="">-- Select Created Delivery Area * --</option>
                                {areaOpts.map((opt, idx) => (
                                  <option key={idx} value={opt.name}>
                                    {opt.name} {opt.charge !== null && opt.charge !== undefined ? `(Delivery Charge: ₹${opt.charge})` : ''}
                                  </option>
                                ))}
                              </select>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                          <input 
                            type="text" 
                            required 
                            readOnly
                            placeholder=" " 
                            value={formData.city} 
                            className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-slate-50 text-sm font-semibold text-slate-700 cursor-not-allowed" 
                          />
                          <label className="floating-label">City / District</label>
                        </div>
                        <div className="relative">
                          <input 
                            type="text" 
                            required 
                            readOnly
                            placeholder=" " 
                            value={formData.state} 
                            className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-slate-50 text-sm font-semibold text-slate-700 cursor-not-allowed" 
                          />
                          <label className="floating-label">State</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Street Address */}
                  <div className="bg-white p-6 rounded-[1.35rem] shadow-[0_8px_28px_rgba(91,45,19,0.07)] border border-orange-100">
                    <h3 className="font-bold text-xl text-slate-800 mb-4 border-b pb-3">2. Street Address & Landmark</h3>
                    <div className="space-y-4">
                      <div className="relative">
                        <input 
                          type="text" 
                          required 
                          placeholder=" " 
                          value={formData.addressLine1} 
                          onChange={e => setFormData({...formData, addressLine1: e.target.value})} 
                          className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm text-slate-800" 
                        />
                        <label className="floating-label">Address Line 1 (House No, Building, Street) *</label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative">
                          <input type="text" placeholder=" " value={formData.landmark} onChange={e => setFormData({...formData, landmark: e.target.value})} className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" />
                          <label className="floating-label">Landmark (Optional)</label>
                        </div>
                        <div className="relative">
                          <input type="tel" placeholder=" " maxLength="10" value={formData.alternateNumber} onChange={e => setFormData({...formData, alternateNumber: e.target.value.replace(/[^0-9]/g, '')})} className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" />
                          <label className="floating-label">Alternate Mobile Number</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Contact Details */}
              <div className="bg-white p-6 rounded-[1.35rem] shadow-[0_8px_28px_rgba(91,45,19,0.07)] border border-orange-100">
                <h3 className="font-bold text-xl text-slate-800 mb-4 border-b pb-3">3. Customer Contact Details</h3>
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
                      <input type="email" required={!isDineIn} placeholder=" " value={formData.customerEmail} onChange={e => setFormData({...formData, customerEmail: e.target.value})} className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" />
                      <label className="floating-label">{isDineIn ? 'Email Address (Optional)' : 'Email Address *'}</label>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Payment Method */}
              <div className="bg-white p-6 rounded-[1.35rem] shadow-[0_8px_28px_rgba(91,45,19,0.07)] border border-orange-100">
                <h3 className="font-bold text-xl text-slate-800 mb-4 border-b pb-3">Payment Method</h3>
                <div className="flex flex-col gap-3">
                  {checkoutSettings?.codEnabled !== false && <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${paymentMethod === 'cod' ? 'border-[#e85d04] bg-orange-50' : 'border-slate-200 bg-white'}`}><input type="radio" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="w-5 h-5 text-[#e85d04]" /><span className="font-bold text-slate-800">{isDineIn ? 'Pay at Counter / Cash' : 'Cash on Delivery (COD)'}</span></label>}
                  {checkoutSettings?.whatsappEnabled && <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${paymentMethod === 'whatsapp' ? 'border-[#e85d04] bg-orange-50' : 'border-slate-200 bg-white'}`}><input type="radio" value="whatsapp" checked={paymentMethod === 'whatsapp'} onChange={() => setPaymentMethod('whatsapp')} className="w-5 h-5 text-[#e85d04]" /><span className="font-bold text-slate-800">Order via WhatsApp</span></label>}
                  {checkoutSettings?.razorpayEnabled && <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${paymentMethod === 'razorpay' ? 'border-[#e85d04] bg-orange-50' : 'border-slate-200 bg-white'}`}><input type="radio" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} className="w-5 h-5 text-[#e85d04]" /><span className="font-bold text-slate-800">Pay Online (Razorpay)</span></label>}
                </div>
              </div>
            </form>
          </div>

          {/* Right Column: Order Summary Card */}
          <div className="lg:col-span-5">
            <div className="bg-white p-6 rounded-[1.35rem] shadow-[0_8px_28px_rgba(91,45,19,0.07)] border border-orange-100 sticky top-24">
              <h3 className="font-bold text-xl text-slate-800 mb-4 border-b pb-3">Order Summary</h3>
              <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {cart.map((item) => (
                  <div key={item._id} className="flex flex-col text-sm border-b border-gray-50 pb-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                          {(item.images?.length > 0 ? item.images[0] : item.image) ? <img src={item.images?.length > 0 ? item.images[0] : item.image} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Img</div>}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 line-clamp-1">{item.name}</p>
                          <p className="text-xs text-gray-500">Qty: {item.qty}</p>
                          {item.customText && <p className="text-[10px] text-gray-500 mt-0.5"><span className="font-semibold text-gray-700">Text:</span> {item.customText}</p>}
                        </div>
                      </div>
                      <div className="font-bold text-gray-800">₹{item.price * item.qty}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-6"><div className="flex gap-2"><input type="text" placeholder="Coupon Code" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} disabled={appliedCoupon} className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#e85d04] font-mono uppercase text-sm" />{appliedCoupon ? <button type="button" onClick={() => { setAppliedCoupon(null); setDiscountAmount(0); setCouponCode(''); setCouponMessage({text: '', type: ''}); }} className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition text-sm">Remove</button> : <button type="button" onClick={handleApplyCoupon} disabled={isValidatingCoupon || !couponCode} className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition disabled:opacity-50 text-sm">{isValidatingCoupon ? '...' : 'Apply'}</button>}</div>{couponMessage.text && <p className={`text-xs font-bold mt-2 ${couponMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{couponMessage.text}</p>}</div>

              <div className="space-y-2 mb-4 text-sm text-gray-600">
                <div className="flex justify-between"><span>Subtotal:</span><span className="font-bold text-gray-800">₹{cartTotal}</span></div>
                {offerDiscount > 0 && <div className="flex justify-between text-orange-600 font-bold"><span>Promo Discount ({appliedPromoNames.join(', ')}):</span><span>-₹{offerDiscount}</span></div>}
                {appliedCoupon && <div className="flex justify-between text-green-600 font-bold"><span>Discount ({appliedCoupon.code}):</span><span>-₹{discountAmount}</span></div>}
                
                <div className="flex justify-between items-center">
                  <span>{isDineIn ? 'Dining Service:' : 'Delivery Charge:'}</span>
                  <span className="font-bold text-gray-800">
                    {isDineIn ? (
                      <span className="text-green-600 font-bold">FREE (Dine-in)</span>
                    ) : calculatedDelivery.isFreeShipping ? (
                      <span className="text-green-600 font-bold">FREE</span>
                    ) : shippingCharge > 0 ? (
                      `₹${shippingCharge}`
                    ) : (
                      'FREE'
                    )}
                  </span>
                </div>
                {!isDineIn && calculatedDelivery.matchedLocationName && (
                  <p className="text-[11px] text-green-600 font-bold text-right -mt-1 mb-1">
                    ✓ Matched Area: {calculatedDelivery.matchedLocationName} {shippingCharge > 0 ? `(₹${shippingCharge})` : '(Free Delivery)'}
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center font-bold text-xl mb-6 border-t pt-4 text-gray-800"><span>Total:</span><span className="text-green-600">₹{finalTotal}</span></div>
              
              {/* Minimum Order Limit Warning */}
              {!isDineIn && minOrderLimit > 0 && (
                <div className={`mb-4 p-4 rounded-2xl text-left ${isBelowMinOrder ? 'bg-amber-50 border-2 border-amber-300 text-amber-900 shadow-sm' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'}`}>
                  {isBelowMinOrder ? (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-1.5 font-black text-amber-900 text-sm">
                          <span>⚠️</span> Minimum Order Required: ₹{minOrderLimit}
                        </span>
                        <span className="text-xs font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                          ₹{cartTotal} / ₹{minOrderLimit}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-amber-800 leading-snug">
                        This store has a minimum order limit of <span className="font-black text-amber-950">₹{minOrderLimit}</span>. Please add <span className="font-black text-amber-950 underline decoration-amber-500 underline-offset-2">₹{amountNeededForMinOrder}</span> more worth of products to your cart.
                      </p>
                      <div className="w-full bg-amber-200/80 h-2 rounded-full mt-2.5 overflow-hidden">
                        <div 
                          className="bg-amber-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.round((cartTotal / minOrderLimit) * 100))}%` }}
                        />
                      </div>
                      <Link 
                        to="/" 
                        className="inline-flex items-center gap-1 mt-3 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                      >
                        + Add More Products (₹{amountNeededForMinOrder} Needed)
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                      <span className="text-emerald-600 text-base">✓</span>
                      <span>Minimum order requirement of ₹{minOrderLimit} satisfied!</span>
                    </div>
                  )}
                </div>
              )}

              {isPlanExpired ? (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-xl text-left flex gap-2">
                  <span>⚠️</span>
                  <span>Orders cannot be placed at this time because the store's subscription plan has expired.</span>
                </div>
              ) : !storeOpenStatus.isOpen ? (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-xl text-left flex gap-2">
                  <span>⚠️</span>
                  <span>{storeOpenStatus.reason || "We are currently closed and not accepting orders. Please try again during our store hours."}</span>
                </div>
              ) : (formData.pincode && formData.pincode.trim().length === 6 && !calculatedDelivery.available) ? (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-xl text-left flex gap-2">
                  <span>⚠️</span>
                  <span>Pincode is not deliverable. Please select a valid delivery area or pincode.</span>
                </div>
              ) : null}

              <button 
                type="submit" 
                form="checkout-form" 
                disabled={isPlacingOrder || !storeOpenStatus.isOpen || isPlanExpired || !isCheckoutFormValid || isBelowMinOrder} 
                style={{ backgroundColor: (storeOpenStatus.isOpen && !isPlanExpired && isCheckoutFormValid && !isBelowMinOrder) ? primaryColor : '#94a3b8' }} 
                className="w-full text-white font-bold py-4 rounded-xl hover:opacity-90 transition text-lg shadow-lg disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isPlacingOrder ? 'Processing...' : 
                 isPlanExpired ? 'Subscription Expired' : 
                 !storeOpenStatus.isOpen ? 'Store Closed' : 
                 isBelowMinOrder ? `Add ₹${amountNeededForMinOrder} More To Order (Min ₹${minOrderLimit})` :
                 isDineIn ? (
                   !formData.customerName ? 'Enter Your Name' :
                   (!formData.customerPhone || formData.customerPhone.length < 10) ? 'Enter Mobile Number' :
                   `Confirm & Place Order (Table ${currentTableNumber})`
                 ) : (
                   (formData.pincode && formData.pincode.trim().length === 6 && !calculatedDelivery.available) ? 'Pincode is not deliverable' : 
                   !formData.pincode || formData.pincode.trim().length < 6 ? 'Enter 6-Digit Pincode' : 
                   !formData.locality ? 'Select Delivery Area' : 
                   !formData.addressLine1 ? 'Enter Street Address' : 
                   (!formData.customerName || !formData.customerPhone || !isEmailValid(formData.customerEmail)) ? 'Fill Contact Details' : 
                   'Confirm & Place Order'
                 )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile View Layout (block lg:hidden) */}
        <div className="block lg:hidden space-y-6 mt-6">
          {isDineIn ? (
            <div className="space-y-6">
              {/* Dine-in Table Card */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-orange-200 text-left">
                <div className="flex justify-between items-center mb-3 border-b pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🍽️</span>
                    <div>
                      <h3 className="font-black text-base text-slate-900">Dine-in Order</h3>
                      <p className="text-[11px] font-semibold text-slate-500">Served directly to your table</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSwitchToDelivery}
                    className="text-[11px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg"
                  >
                    Delivery? 🛵
                  </button>
                </div>

                <div className="mb-4 p-3 bg-orange-50 rounded-xl border border-orange-100">
                  <label className="block text-[11px] font-bold text-orange-900 uppercase tracking-wider mb-1.5">
                    Table Number
                  </label>
                  <select
                    value={currentTableNumber}
                    onChange={(e) => handleTableChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-orange-300 rounded-lg text-sm font-extrabold text-slate-900 focus:outline-none"
                  >
                    {availableTables.map((t) => (
                      <option key={t} value={t}>Table {t}</option>
                    ))}
                  </select>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {availableTables.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleTableChange(t)}
                        className={`px-2.5 py-1 text-xs font-bold rounded ${currentTableNumber === t ? 'bg-orange-600 text-white' : 'bg-white text-slate-700 border border-orange-200'}`}
                      >
                        T-{t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your name"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      maxLength="10"
                      placeholder="Enter 10-digit mobile number"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value.replace(/[^0-9]/g, '') })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="Enter email for receipt"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-base text-slate-800 mb-4 border-b pb-3 text-left">Order Summary</h3>
                <div className="space-y-4 mb-6">
                  {cart.map((item) => (
                    <div key={item._id} className="flex flex-col text-xs sm:text-sm border-b border-gray-50 pb-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                            {(item.images?.length > 0 ? item.images[0] : item.image) ? (
                              <img src={item.images?.length > 0 ? item.images[0] : item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Img</div>
                            )}
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-gray-800 line-clamp-1">{item.name}</p>
                            <p className="text-gray-500">Qty: {item.qty}</p>
                          </div>
                        </div>
                        <div className="font-bold text-gray-800">₹{item.price * item.qty}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 mb-4 text-xs sm:text-sm text-gray-600 text-left">
                  <div className="flex justify-between"><span>Subtotal:</span><span className="font-bold text-gray-800">₹{cartTotal}</span></div>
                  {offerDiscount > 0 && <div className="flex justify-between text-orange-600 font-bold"><span>Promo Discount ({appliedPromoNames.join(', ')}):</span><span>-₹{offerDiscount}</span></div>}
                  {appliedCoupon && <div className="flex justify-between text-green-600 font-bold"><span>Discount ({appliedCoupon.code}):</span><span>-₹{discountAmount}</span></div>}
                  <div className="flex justify-between items-center">
                    <span>Dining Service:</span>
                    <span className="text-green-600 font-bold">FREE (Dine-in)</span>
                  </div>
                </div>
                <div className="flex justify-between items-center font-bold text-lg mb-6 border-t pt-4 text-gray-800">
                  <span>Total:</span><span className="text-green-600">₹{finalTotal}</span>
                </div>
              </div>

              {/* Mobile Payment Method */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-base text-slate-800 mb-4 border-b pb-3 text-left">Payment Method</h3>
                <div className="flex flex-col gap-3">
                  {checkoutSettings?.codEnabled !== false && (
                    <label className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition ${paymentMethod === 'cod' ? 'border-[#e85d04] bg-orange-50' : 'border-slate-200 bg-white'}`}>
                      <input type="radio" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="w-5 h-5 text-[#e85d04]" />
                      <span className="font-bold text-sm text-slate-800">Pay at Counter / Cash</span>
                    </label>
                  )}
                  {checkoutSettings?.whatsappEnabled && (
                    <label className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition ${paymentMethod === 'whatsapp' ? 'border-[#e85d04] bg-orange-50' : 'border-slate-200 bg-white'}`}>
                      <input type="radio" value="whatsapp" checked={paymentMethod === 'whatsapp'} onChange={() => setPaymentMethod('whatsapp')} className="w-5 h-5 text-[#e85d04]" />
                      <span className="font-bold text-sm text-slate-800">Order via WhatsApp</span>
                    </label>
                  )}
                  {checkoutSettings?.razorpayEnabled && (
                    <label className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition ${paymentMethod === 'razorpay' ? 'border-[#e85d04] bg-orange-50' : 'border-slate-200 bg-white'}`}>
                      <input type="radio" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} className="w-5 h-5 text-[#e85d04]" />
                      <span className="font-bold text-sm text-slate-800">Pay Online (Razorpay)</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Mobile Place Order Button */}
              <button 
                type="button" 
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || !storeOpenStatus.isOpen || isPlanExpired || !isCheckoutFormValid} 
                style={{ backgroundColor: (storeOpenStatus.isOpen && !isPlanExpired && isCheckoutFormValid) ? primaryColor : '#94a3b8' }} 
                className="w-full text-white font-bold py-4 rounded-xl hover:opacity-90 transition text-base shadow-lg disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isPlacingOrder ? 'Processing...' : 
                 isPlanExpired ? 'Subscription Expired' : 
                 !storeOpenStatus.isOpen ? 'Store Closed' : 
                 !formData.customerName ? 'Enter Your Name' :
                 (!formData.customerPhone || formData.customerPhone.length < 10) ? 'Enter Mobile Number' :
                 `Confirm & Place Order (Table ${currentTableNumber})`}
              </button>
            </div>
          ) : hasSavedDetails ? (
            <>
              {/* Delivery Address Summary */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-left">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <h3 className="font-bold text-base text-slate-800">Delivery Address</h3>
                  <button 
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className="text-xs font-bold text-[#c94710] bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition"
                  >
                    Edit Location
                  </button>
                </div>
                <div className="space-y-2 text-xs sm:text-sm text-slate-700">
                  <p><span className="font-semibold text-slate-500">Pincode:</span> <span className="font-bold text-slate-900">{formData.pincode}</span></p>
                  <p><span className="font-semibold text-slate-500">Area / Locality:</span> {formData.postOffice || formData.locality || '-'}</p>
                  <p><span className="font-semibold text-slate-500">City / District:</span> {formData.city}, {formData.state}</p>
                  <p><span className="font-semibold text-slate-500">Address:</span> {formData.addressLine1}</p>
                  <p><span className="font-semibold text-slate-500">Customer:</span> {formData.customerName} ({formData.customerPhone})</p>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-base text-slate-800 mb-4 border-b pb-3 text-left">Order Summary</h3>
                <div className="space-y-4 mb-6">
                  {cart.map((item) => (
                    <div key={item._id} className="flex flex-col text-xs sm:text-sm border-b border-gray-50 pb-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                            {(item.images?.length > 0 ? item.images[0] : item.image) ? <img src={item.images?.length > 0 ? item.images[0] : item.image} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Img</div>}
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-gray-800 line-clamp-1">{item.name}</p>
                            <p className="text-gray-500">Qty: {item.qty}</p>
                          </div>
                        </div>
                        <div className="font-bold text-gray-800">₹{item.price * item.qty}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 mb-4 text-xs sm:text-sm text-gray-600 text-left">
                  <div className="flex justify-between"><span>Subtotal:</span><span className="font-bold text-gray-800">₹{cartTotal}</span></div>
                  {offerDiscount > 0 && <div className="flex justify-between text-orange-600 font-bold"><span>Promo Discount ({appliedPromoNames.join(', ')}):</span><span>-₹{offerDiscount}</span></div>}
                  {appliedCoupon && <div className="flex justify-between text-green-600 font-bold"><span>Discount ({appliedCoupon.code}):</span><span>-₹{discountAmount}</span></div>}
                  <div className="flex justify-between items-center">
                    <span>Delivery Charge:</span>
                    <span className="font-bold text-gray-800">
                      {calculatedDelivery.isFreeShipping ? (
                        <span className="text-green-600 font-bold">FREE</span>
                      ) : shippingCharge > 0 ? (
                        `₹${shippingCharge}`
                      ) : (
                        'FREE'
                      )}
                    </span>
                  </div>
                  {calculatedDelivery.matchedLocationName && (
                    <p className="text-[11px] text-green-600 font-bold text-right -mt-1 mb-1">
                      ✓ Matched Area: {calculatedDelivery.matchedLocationName} {shippingCharge > 0 ? `(₹${shippingCharge})` : '(Free Delivery)'}
                    </p>
                  )}
                </div>
                <div className="flex justify-between items-center font-bold text-lg mb-6 border-t pt-4 text-gray-800">
                  <span>Total:</span><span className="text-green-600">₹{finalTotal}</span>
                </div>
              </div>

              {/* Mobile Minimum Order Limit Warning */}
              {minOrderLimit > 0 && (
                <div className={`p-4 rounded-2xl text-left ${isBelowMinOrder ? 'bg-amber-50 border-2 border-amber-300 text-amber-900 shadow-sm' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'}`}>
                  {isBelowMinOrder ? (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-1.5 font-black text-amber-900 text-sm">
                          <span>⚠️</span> Minimum Order: ₹{minOrderLimit}
                        </span>
                        <span className="text-xs font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                          ₹{cartTotal} / ₹{minOrderLimit}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-amber-800 leading-snug">
                        This store requires a minimum order of <span className="font-black text-amber-950">₹{minOrderLimit}</span>. Please add <span className="font-black text-amber-950 underline decoration-amber-500 underline-offset-2">₹{amountNeededForMinOrder}</span> more to your cart.
                      </p>
                      <div className="w-full bg-amber-200/80 h-2 rounded-full mt-2.5 overflow-hidden">
                        <div 
                          className="bg-amber-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.round((cartTotal / minOrderLimit) * 100))}%` }}
                        />
                      </div>
                      <Link 
                        to="/" 
                        className="inline-flex items-center gap-1 mt-3 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                      >
                        + Add More Products (₹{amountNeededForMinOrder} Needed)
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                      <span className="text-emerald-600 text-base">✓</span>
                      <span>Minimum order requirement of ₹{minOrderLimit} satisfied!</span>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile Payment Method */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-base text-slate-800 mb-4 border-b pb-3 text-left">Payment Method</h3>
                <div className="flex flex-col gap-3">
                  {checkoutSettings?.codEnabled !== false && (
                    <label className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition ${paymentMethod === 'cod' ? 'border-[#e85d04] bg-orange-50' : 'border-slate-200 bg-white'}`}>
                      <input type="radio" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="w-5 h-5 text-[#e85d04]" />
                      <span className="font-bold text-sm text-slate-800">Cash on Delivery (COD)</span>
                    </label>
                  )}
                  {checkoutSettings?.whatsappEnabled && (
                    <label className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition ${paymentMethod === 'whatsapp' ? 'border-[#e85d04] bg-orange-50' : 'border-slate-200 bg-white'}`}>
                      <input type="radio" value="whatsapp" checked={paymentMethod === 'whatsapp'} onChange={() => setPaymentMethod('whatsapp')} className="w-5 h-5 text-[#e85d04]" />
                      <span className="font-bold text-sm text-slate-800">Order via WhatsApp</span>
                    </label>
                  )}
                  {checkoutSettings?.razorpayEnabled && (
                    <label className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition ${paymentMethod === 'razorpay' ? 'border-[#e85d04] bg-orange-50' : 'border-slate-200 bg-white'}`}>
                      <input type="radio" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} className="w-5 h-5 text-[#e85d04]" />
                      <span className="font-bold text-sm text-slate-800">Pay Online (Razorpay)</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Mobile Place Order Button */}
              <button 
                type="button" 
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || !storeOpenStatus.isOpen || isPlanExpired || !isCheckoutFormValid || isBelowMinOrder} 
                style={{ backgroundColor: (storeOpenStatus.isOpen && !isPlanExpired && isCheckoutFormValid && !isBelowMinOrder) ? primaryColor : '#94a3b8' }} 
                className="w-full text-white font-bold py-4 rounded-xl hover:opacity-90 transition text-base shadow-lg disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isPlacingOrder ? 'Processing...' : 
                 isPlanExpired ? 'Subscription Expired' : 
                 !storeOpenStatus.isOpen ? 'Store Closed' : 
                 isBelowMinOrder ? `Add ₹${amountNeededForMinOrder} More To Order (Min ₹${minOrderLimit})` :
                 'Confirm & Place Order'}
              </button>
            </>
          ) : (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
              <p className="text-sm font-bold text-slate-700 mb-3">Please enter your pincode and delivery address to calculate shipping and place order.</p>
              <button 
                type="button" 
                onClick={() => setShowEditModal(true)} 
                className="px-6 py-3 text-white font-bold rounded-xl shadow-md text-sm"
                style={{ backgroundColor: primaryColor }}
              >
                Enter Delivery Pincode & Address
              </button>
            </div>
          )}
        </div>

        {/* Edit Address Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-bold text-slate-800">Enter Delivery Pincode & Location</h3>
                <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-red-500 transition-colors text-2xl leading-none">
                  &times;
                </button>
              </div>

              {/* Scrollable Form */}
              <form onSubmit={handleSaveEditedAddress} className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. Location & Pincode First */}
                <div className="space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b pb-1">1. Delivery Location & Area</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <input 
                        type="text" 
                        required 
                        placeholder=" " 
                        maxLength="6" 
                        value={editPincode} 
                        onChange={e => {
                          const newPin = e.target.value.replace(/[^0-9]/g, '');
                          setEditPincode(newPin);
                          setEditLocality('');
                          setEditPostOffice('');
                        }} 
                        className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm font-bold text-slate-800" 
                      />
                      <label className="floating-label">6-Digit Pincode *</label>
                    </div>

                    <div className="relative">
                      {(() => {
                        const areaOpts = getCreatedAreaOptions(editPincode, editCity, editState, deliverySettings);
                        return (
                          <select
                            value={editLocality || editPostOffice}
                            onChange={e => handleAreaSelect(e.target.value, true)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm font-bold text-slate-800"
                          >
                            <option value="">-- Select Created Delivery Area * --</option>
                            {areaOpts.map((opt, idx) => (
                              <option key={idx} value={opt.name}>
                                {opt.name} {opt.charge !== null && opt.charge !== undefined ? `(Delivery Charge: ₹${opt.charge})` : ''}
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <input 
                        type="text" 
                        required 
                        readOnly
                        placeholder=" " 
                        value={editCity} 
                        className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-slate-50 text-sm font-semibold text-slate-700 cursor-not-allowed" 
                      />
                      <label className="floating-label">City / District</label>
                    </div>
                    <div className="relative">
                      <input 
                        type="text" 
                        required 
                        readOnly
                        placeholder=" " 
                        value={editState} 
                        className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-slate-50 text-sm font-semibold text-slate-700 cursor-not-allowed" 
                      />
                      <label className="floating-label">State</label>
                    </div>
                  </div>
                </div>

                {/* 2. Street Address */}
                <div className="space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b pb-1">2. Street Address & Landmark</h4>
                  <div className="relative">
                    <input 
                      type="text" 
                      required 
                      placeholder=" " 
                      value={editAddress} 
                      onChange={e => setEditAddress(e.target.value)} 
                      className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm text-slate-800" 
                    />
                    <label className="floating-label">Address Line 1 (House No, Building, Street) *</label>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder=" " 
                      value={editLandmark} 
                      onChange={e => setEditLandmark(e.target.value)} 
                      className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" 
                    />
                    <label className="floating-label">Landmark (Optional)</label>
                  </div>
                </div>

                {/* 3. Customer Info */}
                <div className="space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b pb-1">3. Customer Details</h4>
                  <div className="relative">
                    <input 
                      type="text" 
                      required 
                      placeholder=" " 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" 
                    />
                    <label className="floating-label">Full Name</label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <input 
                        type="tel" 
                        required 
                        placeholder=" " 
                        maxLength="10" 
                        value={editPhone} 
                        onChange={e => setEditPhone(e.target.value.replace(/[^0-9]/g, ''))} 
                        className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" 
                      />
                      <label className="floating-label">Mobile Number</label>
                    </div>
                    <div className="relative">
                      <input 
                        type="email" 
                        required 
                        placeholder=" " 
                        value={editEmail} 
                        onChange={e => setEditEmail(e.target.value)} 
                        className="floating-input w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none bg-white text-sm" 
                      />
                      <label className="floating-label">Email Address</label>
                    </div>
                  </div>
                </div>

                {/* Status and Action Buttons */}
                <div className="pt-2">
                  {modalResult.text && (
                    <div className={`p-3 rounded-xl text-xs font-bold mb-4 text-left ${modalResult.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                      {modalResult.type === 'success' ? '✅' : '⚠️'} {modalResult.text}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setShowEditModal(false)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-600 transition"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isVerifying}
                      className="flex-1 py-3 bg-[#e85d04] text-white font-bold rounded-xl text-sm transition shadow-md shadow-orange-100 disabled:opacity-50"
                    >
                      {isVerifying ? 'Checking...' : 'Save & Check Delivery'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
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
