import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2} from 'lucide-react';

const CartSidebar = ({ isCartOpen, setIsCartOpen, cart, onUpdateQuantity, onRemoveFromCart, cartTotal, primaryColor = '#76b900', store, deliverySettings: passedSettings }) => {
  const navigate = useNavigate();
  const [deliverySettings, setDeliverySettings] = React.useState(passedSettings || null);

  React.useEffect(() => {
    if (passedSettings) {
      setDeliverySettings(passedSettings);
      return;
    }
    const fetchSettings = async () => {
      if (store?._id) {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
          const settingsRes = await fetch(`${API_BASE_URL}/api/delivery-settings/public`, {
            headers: { 'x-store-id': store?._id }
          });
          if (settingsRes.ok) {
            const settings = await settingsRes.json();
            setDeliverySettings(settings);
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
    fetchSettings();
  }, [store, passedSettings]);

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
  const discountedTotal = Math.max(0, cartTotal - offerDiscount);

  const freeLimit = deliverySettings?.freeShippingThreshold || 0;
  const baseCharge = deliverySettings?.baseCharge || 0;

  const isShippingFree = freeLimit > 0 && discountedTotal >= freeLimit;
  const shippingCharge = isShippingFree ? 0 : baseCharge;
  const estimatedTotal = discountedTotal + shippingCharge;
  const amountNeededForFreeDelivery = freeLimit - discountedTotal;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-[90] ${isCartOpen ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsCartOpen(false)}
      ></div>
      
      {/* Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col z-[100] transform transition-transform duration-300 ease-in-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-2xl font-bold text-gray-800">Your Cart</h2>
          <button onClick={() => setIsCartOpen(false)} className="text-gray-500 hover:text-red-500 font-bold text-3xl leading-none">
            &times;
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart size={48} />
              <p className="text-lg font-medium">Your cart is empty.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item._id} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100 relative">
                      {(item.customImageBase64 || (item.images?.length > 0 ? item.images[0] : item.image)) ? (
                        <img src={item.images?.length > 0 ? item.images[0] : item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-medium">No Img</div>
                      )}
                      {item.customImageBase64 && (
                        <img src={item.customImageBase64} alt="Custom" className="absolute bottom-0 right-0 w-5 h-5 object-cover rounded shadow-sm border border-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 line-clamp-1">{item.name}</p>
                      <p className="text-green-600 font-semibold">₹{item.price} <span className="text-gray-400 text-sm ml-1">x {item.qty} {item.unitType || ''}</span></p>
                      {item.customText && (
                        <p className="text-xs text-gray-500 mt-0.5"><span className="font-semibold text-gray-700">Text:</span> {item.customText}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                      <button type="button" onClick={() => onUpdateQuantity(item._id, -1)} className="px-2 py-1 text-gray-600 hover:text-black font-bold">-</button>
                      <span className="px-2 font-semibold text-sm">{item.qty}</span>
                      <button type="button" onClick={() => onUpdateQuantity(item._id, 1)} className="px-2 py-1 text-gray-600 hover:text-black font-bold">+</button>
                    </div>
                    <button 
                      onClick={() => onRemoveFromCart(item._id)} 
                      className="text-red-500 hover:text-red-700 text-xs font-bold bg-red-50 p-2 rounded-lg transition"
                      title="Remove from Cart"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {cart.length > 0 && (
          <div className="p-5 border-t border-gray-100 bg-white">
            {/* Free Delivery Promo Message */}
            {freeLimit > 0 && (
              <div className={`p-3 rounded-xl text-xs font-bold mb-4 text-center ${isShippingFree ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                {isShippingFree ? (
                  <span>Free delivery unlocked! 🎉</span>
                ) : (
                  <span>Add ₹{amountNeededForFreeDelivery} more to get free delivery / shipping charges zero</span>
                )}
              </div>
            )}
            
            <div className="flex justify-between items-center text-sm mb-2 text-gray-500">
              <span>Subtotal:</span>
              <span className="font-bold text-gray-800">₹{cartTotal}</span>
            </div>
            {offerDiscount > 0 && (
              <div className="flex justify-between items-center text-sm mb-2 text-orange-600 font-bold">
                <span>Promo Discount ({appliedPromoNames.join(', ')}):</span>
                <span className="font-bold">-₹{offerDiscount}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm mb-2 text-gray-500">
              <span>Shipping Charges:</span>
              <span className={`font-bold ${shippingCharge === 0 ? 'text-green-600' : 'text-gray-800'}`}>
                {shippingCharge === 0 ? 'FREE' : `₹${shippingCharge}`}
              </span>
            </div>
            <div className="flex justify-between items-center font-bold text-xl mb-6 text-gray-800 border-t border-dashed border-gray-200 pt-3">
              <span>Estimated Total:</span>
              <span className="text-green-600">₹{estimatedTotal}</span>
            </div>
            <button type="button" onClick={() => { setIsCartOpen(false); navigate('/checkout'); }} className="w-full text-white font-bold py-4 rounded-xl transition text-lg shadow-lg hover:opacity-90" style={{ backgroundColor: primaryColor }}>
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartSidebar;