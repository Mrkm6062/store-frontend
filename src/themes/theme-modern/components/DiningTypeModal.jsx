import React, { useState, useEffect } from 'react';
import { Utensils, Bike, Check, X, ChevronRight, ArrowLeft } from 'lucide-react';

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
  const [step, setStep] = useState('choice'); // 'choice' | 'table'
  const [selectedTable, setSelectedTable] = useState(tables[0] || '1');
  const [currentPreference, setCurrentPreference] = useState(() => {
    try {
      const saved = localStorage.getItem('gb_dining_preference');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // 1. Check for QR code table param in URL on load
  useEffect(() => {
    if (!isRestaurant) return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      let scannedTable = urlParams.get('table') || urlParams.get('tableNumber') || urlParams.get('tableno') || urlParams.get('t');

      // Also check hash or pathname if applicable
      if (!scannedTable && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#\/?/, ''));
        scannedTable = hashParams.get('table') || hashParams.get('tableNumber');
      }

      if (scannedTable) {
        const cleanTable = String(scannedTable).trim();
        const pref = {
          orderType: 'Dine-in',
          tableNumber: cleanTable,
          fromQr: true,
          updatedAt: Date.now()
        };
        localStorage.setItem('gb_dining_preference', JSON.stringify(pref));
        setCurrentPreference(pref);
        window.dispatchEvent(new Event('dining-preference-updated'));
        setIsOpen(false);
        return;
      }

      // If no QR param, show prompt to direct visitors on first arrival
      const promptShown = sessionStorage.getItem('gb_dining_prompt_shown');
      if (!promptShown) {
        setStep('choice');
        setIsOpen(true);
      }
    } catch (err) {
      console.error('Error checking dining QR parameter:', err);
    }
  }, [isRestaurant]);

  // Listen for open-dining-modal event (from header or checkout "Change" button)
  useEffect(() => {
    const handleOpen = () => {
      setStep('choice');
      setIsOpen(true);
    };
    const handleUpdated = () => {
      try {
        const saved = localStorage.getItem('gb_dining_preference');
        if (saved) {
          const parsed = JSON.parse(saved);
          setCurrentPreference(parsed);
          if (parsed.tableNumber) setSelectedTable(parsed.tableNumber);
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

  if (!isRestaurant) return null;

  const handleSelectDelivery = () => {
    const pref = {
      orderType: 'delivery',
      tableNumber: '0',
      fromQr: false,
      updatedAt: Date.now()
    };
    localStorage.setItem('gb_dining_preference', JSON.stringify(pref));
    sessionStorage.setItem('gb_dining_prompt_shown', 'true');
    setCurrentPreference(pref);
    window.dispatchEvent(new Event('dining-preference-updated'));
    setIsOpen(false);
  };

  const handleSelectDineIn = () => {
    setStep('table');
  };

  const handleConfirmTable = (tableToConfirm) => {
    const finalTable = String(tableToConfirm || selectedTable || tables[0] || '1').trim();
    const pref = {
      orderType: 'Dine-in',
      tableNumber: finalTable,
      fromQr: false,
      updatedAt: Date.now()
    };
    localStorage.setItem('gb_dining_preference', JSON.stringify(pref));
    setCurrentPreference(pref);
    window.dispatchEvent(new Event('dining-preference-updated'));
    setIsOpen(false);
  };

  const handleClose = () => {
    sessionStorage.setItem('gb_dining_prompt_shown', 'true');
    // If user closes without making an explicit selection on first visit, default to delivery
    if (!currentPreference) {
      handleSelectDelivery();
    } else {
      setIsOpen(false);
    }
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
          {currentPreference && (
            <button
              onClick={handleClose}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-orange-100/60 transition"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}

          {step === 'table' && (
            <button
              onClick={() => setStep('choice')}
              className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 mb-2 transition"
            >
              <ArrowLeft size={14} /> Back to Options
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <Utensils size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {step === 'choice' ? `Welcome to ${store?.name || 'our restaurant'}!` : 'Select Your Table'}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                {step === 'choice' ? 'How would you like to order today?' : 'Please choose your table number to serve your order'}
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
                      Get food delivered to your home or office address
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-blue-400 group-hover:translate-x-1 transition" />
              </button>
            </div>
          ) : (
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
                className="w-full py-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-base shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Confirm Table {selectedTable} & Start Ordering
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiningTypeModal;
