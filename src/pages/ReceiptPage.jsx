import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Printer, ArrowLeft, Truck, RefreshCcw, AlertTriangle, CheckCircle, Store } from 'lucide-react';
import { useStore } from '../services/useStore';

const ReceiptPage = () => {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const currentOrderId = orderId || searchParams.get('orderId') || searchParams.get('id');

  const { store: contextStore } = useStore();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentOrderId) {
      setLoading(false);
      setError('No order ID provided.');
      return;
    }

    let isMounted = true;
    const fetchOrder = async () => {
      setLoading(true);
      setError('');
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${API_BASE_URL}/api/public-order/${currentOrderId}`);
        if (!res.ok) {
          throw new Error('Order or receipt not found.');
        }
        const data = await res.json();
        if (isMounted) {
          setOrder(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load receipt.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrder();
    return () => { isMounted = false; };
  }, [currentOrderId]);

  const activeStore = (order && order.store && typeof order.store === 'object' && (order.store.storeName || order.store.name))
    ? order.store
    : (contextStore || {});

  const storeName = activeStore.storeName || activeStore.name || 'Store Receipt';
  const orderNumber = order?._id ? order._id.slice(-6).toUpperCase() : '';
  const orderDate = order?.createdAt
    ? new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '';

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <RefreshCcw className="animate-spin text-orange-600 mb-3" size={32} />
        <p className="text-slate-600 font-bold text-sm">Loading digital receipt...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-lg border border-slate-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Receipt Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">
            {error || 'The receipt for this order could not be located. Please verify your order number.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition"
            >
              Back to Store
            </Link>
            <Link
              to="/track"
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition"
            >
              Track Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-10 px-3 sm:px-4 text-slate-800">
      <style>
        {`
          @media print {
            body {
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .no-print {
              display: none !important;
            }
            .receipt-card {
              max-width: 100% !important;
              width: 100% !important;
              border: none !important;
              box-shadow: none !important;
              margin: 0 !important;
              padding: 0 !important;
              border-radius: 0 !important;
            }
          }
        `}
      </style>

      {/* Floating Action Bar (Hidden in Print) */}
      <div className="no-print max-w-lg mx-auto mb-4 flex items-center justify-between gap-3 px-1">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft size={16} />
          Back to Store
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to={`/track/${order._id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-xs transition"
          >
            <Truck size={14} />
            Track Order
          </Link>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition active:scale-95"
          >
            <Printer size={14} />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Digital Receipt Card */}
      <div className="receipt-card max-w-lg mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-7 text-center">
          {activeStore.logo ? (
            <img
              src={activeStore.logo}
              alt={storeName}
              className="max-h-12 w-auto mx-auto mb-3 rounded-lg object-contain bg-white/10 p-1"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3 text-white">
              <Store size={24} />
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">{storeName}</h1>
          {activeStore.locationAddress && (
            <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto leading-relaxed">
              {activeStore.locationAddress}
            </p>
          )}
          {(activeStore.storePhone || activeStore.whatsappNumber) && (
            <p className="text-[11px] text-slate-400 mt-1">
              Tel: {activeStore.storePhone || activeStore.whatsappNumber}
            </p>
          )}
          {activeStore.storeId && (
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-300">
              Store Code: {activeStore.storeId}
            </span>
          )}
        </div>

        {/* Invoice Info Bar */}
        <div className="p-5 sm:p-6 bg-slate-50 border-b border-dashed border-slate-200">
          <div className="flex justify-between items-start gap-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Digital Invoice / Receipt
              </span>
              <span className="text-lg font-black text-sky-600 block">#{orderNumber}</span>
              <span className="text-xs text-slate-500 font-medium block mt-0.5">{orderDate}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Order Type
              </span>
              <span className="text-xs font-bold text-slate-800 block mt-0.5">
                {order.tableNumber && order.tableNumber !== '0'
                  ? `Dine-in (Table ${order.tableNumber})`
                  : (order.orderType || 'Counter / Takeaway')}
              </span>
              {order.orderBy && (
                <span className="text-[11px] text-slate-500 block mt-0.5">Billed by: {order.orderBy}</span>
              )}
            </div>
          </div>
          {order.customerName && (
            <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600 flex justify-between">
              <span>Customer:</span>
              <span className="font-bold text-slate-800">{order.customerName}</span>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="p-5 sm:p-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="pb-2">Item</th>
                <th className="pb-2 text-center">Qty</th>
                <th className="pb-2 text-right">Price</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {(order.orderItems || []).map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-2.5 pr-2 font-bold text-slate-800 align-top">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{item.name}</span>
                      {item.foodType && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                            item.foodType === 'veg'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {item.foodType}
                        </span>
                      )}
                    </div>
                    {item.customText && (
                      <span className="text-[11px] text-slate-500 block font-normal">
                        Note: {item.customText}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-600 font-semibold align-top">
                    {item.qty}
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-500 font-medium align-top">
                    ₹{Number(item.price || 0).toFixed(2)}
                  </td>
                  <td className="py-2.5 pl-2 text-right text-slate-900 font-extrabold align-top">
                    ₹{Number((item.price || 0) * (item.qty || 1)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Breakdown */}
          <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-200 space-y-1.5 text-xs sm:text-sm">
            {order.discountAmount > 0 && (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>₹{((order.totalAmount || 0) + (order.discountAmount || 0) - (order.shippingCharge || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                  <span>-₹{Number(order.discountAmount).toFixed(2)}</span>
                </div>
              </>
            )}
            {order.shippingCharge > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Delivery Charge</span>
                <span>₹{Number(order.shippingCharge).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-base sm:text-lg font-black text-slate-900">
              <span>Grand Total</span>
              <span className="text-emerald-700">₹{Number(order.totalAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 text-xs text-slate-600">
              <span>Payment Mode</span>
              <span className="font-extrabold uppercase text-emerald-700 flex items-center gap-1">
                <CheckCircle size={13} className="text-emerald-600" />
                {String(order.paymentMethod || 'cash').toUpperCase()} (PAID ✓)
              </span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            <p className="font-bold text-slate-700">Thank you for visiting us!</p>
            <p className="mt-0.5">Please visit again soon.</p>
          </div>
        </div>

        {/* Action Button at Bottom (Hidden in Print) */}
        <div className="no-print p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            <Printer size={16} />
            Print / Save Receipt
          </button>
          <Link
            to={`/track/${order._id}`}
            className="flex-1 py-3 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-200 transition flex items-center justify-center gap-2 text-center"
          >
            <Truck size={16} />
            Track Live Status
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPage;
