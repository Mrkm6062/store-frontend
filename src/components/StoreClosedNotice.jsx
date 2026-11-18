import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

/**
 * Hook to manage live store operating hours, status, and countdown.
 */
export const useStoreHours = (storeId) => {
  const [storeOpenStatus, setStoreOpenStatus] = useState({ isOpen: true, reason: '', nextOpen: null });
  const [showClosedPopup, setShowClosedPopup] = useState(false);
  const [countdownCompact, setCountdownCompact] = useState('');
  const [countdownLong, setCountdownLong] = useState('');

  const fetchStatus = async () => {
    if (!storeId) return;
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_BASE_URL}/api/store-hours/public/status`, {
        headers: { 'x-store-id': storeId }
      });
      if (res.ok) {
        const data = await res.json();
        setStoreOpenStatus(data);
        if (!data.isOpen) {
          const popupShown = sessionStorage.getItem('store_closed_popup_shown');
          if (!popupShown) {
            setShowClosedPopup(true);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch store public open status", err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [storeId]);

  const handleClosePopup = () => {
    setShowClosedPopup(false);
    sessionStorage.setItem('store_closed_popup_shown', 'true');
  };

  // Live countdown calculation
  useEffect(() => {
    if (storeOpenStatus?.isOpen || !storeOpenStatus?.nextOpen) {
      setCountdownCompact('');
      setCountdownLong('');
      return;
    }

    const calculateCountdown = () => {
      let targetMs = storeOpenStatus.nextOpen.targetTimestamp;

      // Fallback calculation from targetIso or openTime
      if (!targetMs && storeOpenStatus.nextOpen.targetIso) {
        targetMs = new Date(storeOpenStatus.nextOpen.targetIso).getTime();
      }
      if (!targetMs && storeOpenStatus.nextOpen.openTime) {
        try {
          const [h, m] = storeOpenStatus.nextOpen.openTime.split(':').map(Number);
          const d = new Date();
          d.setHours(h, m, 0, 0);
          if (storeOpenStatus.nextOpen.day === "Tomorrow") {
            d.setDate(d.getDate() + 1);
          }
          targetMs = d.getTime();
        } catch (e) {}
      }

      if (!targetMs) return;

      const diffMs = targetMs - Date.now();
      if (diffMs <= 0) {
        setCountdownCompact('opening now');
        setCountdownLong('opening now');
        fetchStatus();
        return;
      }

      const totalSec = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      // Compact mobile-responsive single line (e.g., "1h 30m 45s" or "30m 45s")
      const compactArr = [];
      if (hours > 0) compactArr.push(`${hours}h`);
      if (minutes > 0 || hours > 0) compactArr.push(`${minutes}m`);
      compactArr.push(`${seconds}s`);
      setCountdownCompact(compactArr.join(' '));

      // Detailed natural language words for popup dialog
      const longArr = [];
      if (hours > 0) longArr.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
      if (minutes > 0 || hours > 0) longArr.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
      longArr.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
      setCountdownLong(longArr.join(' '));
    };

    calculateCountdown();
    const timer = setInterval(calculateCountdown, 1000);
    return () => clearInterval(timer);
  }, [storeOpenStatus]);

  return {
    storeOpenStatus,
    setStoreOpenStatus,
    showClosedPopup,
    setShowClosedPopup,
    handleClosePopup,
    countdownCompact,
    countdownLong,
    fetchStatus
  };
};

/**
 * Mobile-responsive 1-line top banner when store is closed.
 */
export const StoreClosedBanner = ({ storeOpenStatus, countdownCompact, countdownLong }) => {
  if (!storeOpenStatus || storeOpenStatus.isOpen) return null;

  const nextOpen = storeOpenStatus.nextOpen;
  const countdownText = countdownLong || countdownCompact;

  return (
    <div 
      className="w-full py-1.5 sm:py-2 px-2 sm:px-4 text-center font-bold bg-red-600 text-white transition-colors duration-300 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-1.5 whitespace-nowrap overflow-hidden text-center text-[11px] sm:text-xs md:text-sm">
        <AlertTriangle size={14} className="shrink-0 text-white animate-pulse" />
        {nextOpen ? (
          nextOpen.day === "Today" ? (
            <span className="truncate">
              Store is closed • Opens in <span className="font-black underline decoration-white/70">{countdownText || 'a few moments'}</span>
              <span className="hidden sm:inline font-semibold opacity-95 ml-1">({nextOpen.time})</span>
            </span>
          ) : (
            <span className="truncate">
              Store is closed today • Opens {nextOpen.day === "Tomorrow" ? "tomorrow" : `on ${nextOpen.day} (${nextOpen.date})`} at {nextOpen.time}
            </span>
          )
        ) : (
          <span className="truncate">
            Store is closed today {storeOpenStatus.reason ? `• ${storeOpenStatus.reason}` : '• Not accepting orders'}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Modal popup dialog alerting user of store closure when they first enter.
 */
export const StoreClosedPopup = ({ showClosedPopup, handleClosePopup, storeOpenStatus, countdownLong, primaryColor = '#e85d04' }) => {
  if (!showClosedPopup || !storeOpenStatus || storeOpenStatus.isOpen) return null;

  const nextOpen = storeOpenStatus.nextOpen;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-7 max-w-sm w-full text-center relative border border-slate-100 animate-scaleUp text-slate-800">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
          <Clock size={32} />
        </div>
        
        <h3 className="text-xl font-black text-slate-800 mb-1.5">
          {nextOpen?.day === "Today" ? "Store is Currently Closed" : "Store is Closed Today"}
        </h3>
        
        <p className="text-xs text-slate-500 mb-4">
          {storeOpenStatus.reason || "We are currently closed and not accepting online orders at the moment."}
        </p>

        {nextOpen ? (
          nextOpen.day === "Today" ? (
            <div className="bg-red-50/80 border border-red-100 rounded-2xl p-3.5 text-center mb-6">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-500 block mb-0.5">Opening Schedule</span>
              <span className="font-black text-red-700 block text-base">
                Opens Today at {nextOpen.time}
              </span>
              {countdownLong && (
                <span className="text-xs font-bold text-red-600 block mt-1">
                  (in {countdownLong})
                </span>
              )}
            </div>
          ) : (
            <div className="bg-red-50/80 border border-red-100 rounded-2xl p-3.5 text-center mb-6">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-500 block mb-0.5">Next Opening</span>
              <span className="font-black text-red-700 block text-sm">
                Kindly place your order {nextOpen.day === "Tomorrow" ? "tomorrow" : `on ${nextOpen.day} (${nextOpen.date})`} at {nextOpen.time}.
              </span>
            </div>
          )
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center mb-6 text-xs text-slate-500 font-medium">
            Please check back soon for our active opening hours!
          </div>
        )}

        <button
          type="button"
          onClick={handleClosePopup}
          className="w-full py-3 text-white font-extrabold rounded-xl shadow-lg transition-all text-sm cursor-pointer hover:opacity-90 active:scale-95"
          style={{ backgroundColor: primaryColor }}
        >
          Close & Continue Browsing
        </button>
      </div>
    </div>
  );
};
