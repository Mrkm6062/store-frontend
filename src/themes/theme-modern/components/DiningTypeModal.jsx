import React, { useState, useEffect } from 'react';
import { Utensils, Bike, Check, X, ChevronRight, ArrowLeft, MapPin, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const DiningTypeModal = ({ store }) => {
  const isRestaurant = Boolean(
    store?.isRestaurant !== false && (
      store?.isRestaurant === true ||
      store?.dineInEnabled === true ||
      (store?.tables && store.tables.length > 0) ||
      (store?.storeType && /restaurant|cafe|food|dine|bistro|dhaba|eatery/i.test(store.storeType)) ||
      true
    )
  );

  const tables = (store?.tables && Array.isArray(store.tables) && store.tables.length > 0)
    ? store.tables
    : ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState('choice'); // 'choice' | 'table' | 'pincode'
  const [selectedTable, setSelectedTable] = useState(tables[0] || '1');
  const [currentPreference, setCurrentPreference] = useState(() => {
    try {
      const saved = localStorage.getItem('gb_dining_preference');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [pincodeInput, setPincodeInput] = useState(() => {
    try {
      const pref = localStorage.getItem('gb_dining_preference');
      if (pref) {
        const parsed = JSON.parse(pref);
        if (parsed?.pincode) return parsed.pincode;
      }
      const cust = localStorage.getItem('gb_customer_info');
      if (cust) {
        const parsedCust = JSON.parse(cust);
        if (parsedCust?.pincode) return parsedCust.pincode;
      }
    } catch (e) {}
    return '';
  });

  const [locationInfo, setLocationInfo] = useState(null);
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState({ type: '', text: '' });

  // 1. Check for QR code table param in URL on load
  useEffect(() => {
    if (!isRestaurant) return;

    // Never auto-open on checkout page
    if (typeof window !== "undefined" && window.location.pathname.includes("/checkout")) {
      setIsOpen(false);
      return;
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);
      let scannedTable = urlParams.get("table") || urlParams.get("tableNumber") || urlParams.get("tableno") || urlParams.get("t");

      // Also check hash or pathname if applicable
      if (!scannedTable && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#\/?/, ""));
        scannedTable = hashParams.get("table") || hashParams.get("tableNumber");
      }

      if (scannedTable) {
        const cleanTable = String(scannedTable).trim();
        const pref = {
          orderType: "Dine-in",
          tableNumber: cleanTable,
          fromQr: true,
          updatedAt: Date.now()
        };
        localStorage.setItem("gb_dining_preference", JSON.stringify(pref));
        sessionStorage.setItem("gb_dining_prompt_shown", "true");
        setCurrentPreference(pref);
        window.dispatchEvent(new Event("dining-preference-updated"));
        setIsOpen(false);
        return;
      }

      // If customer ALREADY has a dining preference chosen or scanned, DO NOT open popup automatically!
      const savedPref = localStorage.getItem("gb_dining_preference");
      if (savedPref) {
        setIsOpen(false);
        return;
      }

      // If no QR param and no preference saved yet, show prompt to direct visitors on first arrival
      const promptShown = sessionStorage.getItem("gb_dining_prompt_shown");
      if (!promptShown) {
        setStep("choice");
        setIsOpen(true);
      }
    } catch (err) {
      console.error("Error checking dining QR parameter:", err);
    }
  }, [isRestaurant]);

  // Listen for open-dining-modal event (from header or checkout "Change" button)
  useEffect(() => {
    const handleOpen = () => {
      setStep('choice');
      setPincodeStatus({ type: '', text: '' });
      setIsOpen(true);
    };
    const handleUpdated = () => {
      try {
        const saved = localStorage.getItem('gb_dining_preference');
        if (saved) {
          const parsed = JSON.parse(saved);
          setCurrentPreference(parsed);
          if (parsed.tableNumber) setSelectedTable(parsed.tableNumber);
          if (parsed.pincode) setPincodeInput(parsed.pincode);
        }
      } catch (e) {}
    };

    window.addEventListener('open-dining-modal', handleOpen);
    window.addEventListener('dining-preference-updated', handleUpdated);
    return () => {
      window.removeEventListener('open-dining-modal', handleOpen);
      window.removeEventListener('dining-preference-updated', handleUpdated);
    };
  }, []);

  // Lookup city and state whenever 6-digit pincode is entered
  useEffect(() => {
    const clean = pincodeInput.trim();
    if (clean.length === 6) {
      let isCancelled = false;
      const fetchLocation = async () => {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || '';
          const res = await fetch(`${API_BASE_URL}/api/delivery-settings/public/pincode/${clean}`);
          if (res.ok && !isCancelled) {
            const data = await res.json();
            setLocationInfo({ city: data.city || '', state: data.state || '' });
          }
        } catch (e) {}
      };
      fetchLocation();
      return () => {
        isCancelled = true;
      };
    } else {
      setLocationInfo(null);
    }
  }, [pincodeInput]);

  if (!isRestaurant) return null;

  // Click on "Delivery" option in Choice step
  const handleSelectDelivery = () => {
    setPincodeStatus({ type: '', text: '' });
    setStep('pincode');
  };

  // Click on "Dine-in" option in Choice step
  const handleSelectDineIn = () => {
    setStep('table');
  };

  // Confirm Table selection for Dine-in
  const handleConfirmTable = (tableToConfirm) => {
    const finalTable = String(tableToConfirm || selectedTable || tables[0] || '1').trim();
    const pref = {
      orderType: 'Dine-in',
      tableNumber: finalTable,
      fromQr: false,
      updatedAt: Date.now()
    };
    localStorage.setItem('gb_dining_preference', JSON.stringify(pref));
    sessionStorage.setItem('gb_dining_prompt_shown', 'true');
    setCurrentPreference(pref);
    window.dispatchEvent(new Event('dining-preference-updated'));
    setIsOpen(false);
  };

  // Check delivery availability by Pincode
  const handleVerifyDeliveryPincode = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanPin = pincodeInput.trim();
    if (cleanPin.length !== 6) {
      setPincodeStatus({ type: 'error', text: 'Please enter a valid 6-digit pincode.' });
      return;
    }

    setCheckingDelivery(true);
    setPincodeStatus({ type: '', text: '' });

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || '';
      const storeId = store?._id;

      // Ensure city and state
      let city = locationInfo?.city || '';
      let state = locationInfo?.state || '';

      if (!city || !state) {
        try {
          const pinRes = await fetch(`${API_BASE_URL}/api/delivery-settings/public/pincode/${cleanPin}`);
          if (pinRes.ok) {
            const pinData = await pinRes.json();
            city = pinData.city || '';
            state = pinData.state || '';
            setLocationInfo({ city, state });
          }
        } catch (err) {}
      }

      // Check delivery availability using calculate endpoint
      let isAvailable = false;
      let reasonText = '';

      const calcRes = await fetch(`${API_BASE_URL}/api/delivery-settings/public/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storeId ? { 'x-store-id': storeId } : {})
        },
        body: JSON.stringify({
          storeId: storeId,
          pincode: cleanPin,
          district: city,
          state: state
        })
      });

      if (calcRes.ok) {
        const calcData = await calcRes.json();
        isAvailable = Boolean(calcData.available);
        if (isAvailable) {
          reasonText = calcData.message || (city ? `Delivery is available in ${city} (${cleanPin})!` : `Delivery is available in ${cleanPin}!`);
        } else {
          reasonText = calcData.message || `Sorry, delivery is not available for pincode ${cleanPin}.`;
        }
      } else {
        // Fallback: check public delivery settings directly
        const settingsRes = await fetch(`${API_BASE_URL}/api/delivery-settings/public`, {
          headers: storeId ? { 'x-store-id': storeId } : {}
        });
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          if (settings.deliveryMode === 'pincode') {
            const allowed = (settings.allowedPincodes || []).map((p) => String(p).trim());
            isAvailable = allowed.includes(cleanPin);
          } else if (settings.deliveryMode === 'state') {
            const allowedStates = (settings.allowedStates || []).map((s) => s.toLowerCase().trim());
            isAvailable = Boolean(state && allowedStates.includes(state.toLowerCase().trim()));
          } else {
            isAvailable = true;
          }
        } else {
          isAvailable = true;
        }

        if (isAvailable) {
          reasonText = city ? `Delivery is available in ${city} (${cleanPin})!` : `Delivery is available in ${cleanPin}!`;
        } else {
          reasonText = `Sorry, delivery is not available for pincode ${cleanPin}.`;
        }
      }

      if (isAvailable) {
        setPincodeStatus({ type: 'success', text: reasonText });

        const pref = {
          orderType: 'delivery',
          pincode: cleanPin,
          city: city || '',
          state: state || '',
          tableNumber: '0',
          fromQr: false,
          updatedAt: Date.now()
        };
        localStorage.setItem('gb_dining_preference', JSON.stringify(pref));
        sessionStorage.setItem('gb_dining_prompt_shown', 'true');
        setCurrentPreference(pref);

        // Pre-fill customer address info so user doesn't have to re-enter pincode later
        try {
          const savedCust = localStorage.getItem('gb_customer_info');
          const custObj = savedCust ? JSON.parse(savedCust) : {};
          custObj.pincode = cleanPin;
          if (city) custObj.city = city;
          if (state) custObj.state = state;
          localStorage.setItem('gb_customer_info', JSON.stringify(custObj));
          window.dispatchEvent(new Event('customer-info-updated'));
        } catch (e) {}

        window.dispatchEvent(new Event('dining-preference-updated'));

        setTimeout(() => {
          setIsOpen(false);
        }, 700);
      } else {
        setPincodeStatus({ type: 'error', text: reasonText });
      }
    } catch (err) {
      console.error('Error checking delivery availability:', err);
      setPincodeStatus({ type: 'error', text: 'Could not verify delivery right now. Please try again.' });
    } finally {
      setCheckingDelivery(false);
    }
  };

  const handleClose = () => {
    sessionStorage.setItem('gb_dining_prompt_shown', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all">
      <div 
        className="w-full max-w-md bg-[#fffdf9] rounded-[1.75rem] shadow-2xl border border-orange-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-orange-100/70 bg-gradient-to-b from-orange-50/80 to-transparent">
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-orange-100/60 transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          {(step === 'table' || step === 'pincode') && (
            <button
              onClick={() => {
                setStep('choice');
                setPincodeStatus({ type: '', text: '' });
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 mb-2 transition"
            >
              <ArrowLeft size={14} /> Back to Options
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-md ${
              step === 'pincode'
                ? 'bg-blue-600 text-white shadow-blue-600/20'
                : 'bg-orange-500 text-white shadow-orange-500/20'
            }`}>
              {step === 'pincode' ? <Bike size={20} /> : <Utensils size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {step === 'choice' 
                  ? `Welcome to ${store?.name || 'our restaurant'}!` 
                  : step === 'table'
                  ? 'Select Your Table'
                  : 'Check Delivery Availability'}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                {step === 'choice' 
                  ? 'How would you like to order today?' 
                  : step === 'table'
                  ? 'Please choose your table number to serve your order'
                  : 'Enter your 6-digit pincode to check if delivery is available'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {step === 'choice' ? (
            <div className="space-y-4">
              {/* Dine-in Option */}
              <button
                type="button"
                onClick={handleSelectDineIn}
                className="w-full p-4 rounded-2xl border-2 border-orange-200 hover:border-orange-500 bg-orange-50/40 hover:bg-orange-50 text-left transition duration-200 flex items-center justify-between group shadow-sm hover:shadow"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center group-hover:scale-105 transition">
                    <Utensils size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-slate-900">🍽️ Dine-in</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white uppercase tracking-wider">
                        At Restaurant
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Eating inside? Order directly to your table
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-orange-400 group-hover:translate-x-1 transition" />
              </button>

              {/* Delivery Option */}
              <button
                type="button"
                onClick={handleSelectDelivery}
                className="w-full p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/40 text-left transition duration-200 flex items-center justify-between group shadow-sm hover:shadow"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
                    <Bike size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-slate-900">🛵 Delivery</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white uppercase tracking-wider">
                        Doorstep
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Check delivery availability by pincode
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-blue-400 group-hover:translate-x-1 transition" />
              </button>
            </div>
          ) : step === 'table' ? (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Choose Table Number
                </label>
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-orange-200 focus:border-orange-500 focus:outline-none bg-white text-base font-extrabold text-slate-800 shadow-sm"
                >
                  {tables.map((t) => (
                    <option key={t} value={t}>
                      Table {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Table Selection Chips */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Quick Select Table:
                </p>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                  {tables.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTable(t)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition ${
                        selectedTable === t
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-105'
                          : 'bg-orange-50 text-slate-700 hover:bg-orange-100 border border-orange-100'
                      }`}
                    >
                      Table {t}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleConfirmTable(selectedTable)}
                className="w-full py-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-base shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <Check size={18} />
                Confirm Table {selectedTable} & Start Ordering
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyDeliveryPincode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Enter 6-Digit Delivery Pincode
                </label>
                <div className="relative">
                  <MapPin size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus
                    placeholder="e.g. 110001"
                    value={pincodeInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setPincodeInput(val);
                      if (pincodeStatus.text) {
                        setPincodeStatus({ type: '', text: '' });
                      }
                    }}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none bg-white text-base font-bold text-slate-900 tracking-wider shadow-sm transition"
                  />
                </div>
                {locationInfo?.city && (
                  <p className="text-xs font-semibold text-slate-500 mt-1.5 flex items-center gap-1">
                    <span>📍</span>
                    <span>{locationInfo.city}{locationInfo.state ? `, ${locationInfo.state}` : ''}</span>
                  </p>
                )}
              </div>

              {pincodeStatus.text && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 transition-all animate-in fade-in ${
                    pincodeStatus.type === 'error'
                      ? 'bg-rose-50 border border-rose-200 text-rose-700'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  }`}
                >
                  {pincodeStatus.type === 'error' ? (
                    <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
                  ) : (
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-bold">{pincodeStatus.text}</p>
                    {pincodeStatus.type === 'error' && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setStep('table')}
                          className="text-xs font-bold text-orange-600 hover:text-orange-700 underline flex items-center gap-1"
                        >
                          🍽️ Switch to Dine-in instead
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={checkingDelivery || pincodeInput.trim().length !== 6}
                className={`w-full py-4 rounded-xl font-extrabold text-base shadow-lg transition flex items-center justify-center gap-2 ${
                  checkingDelivery || pincodeInput.trim().length !== 6
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 cursor-pointer active:scale-[0.99]'
                }`}
              >
                {checkingDelivery ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Checking Availability...</span>
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    <span>Check Delivery & Proceed</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiningTypeModal;
