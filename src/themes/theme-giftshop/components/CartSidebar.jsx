import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';

const CartSidebar = ({ isCartOpen, setIsCartOpen, cart, onUpdateQuantity, onRemoveFromCart, cartTotal, primaryColor = '#76b900' }) => {
  const navigate = useNavigate();

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
                    <button onClick={() => onRemoveFromCart(item._id)} className="text-red-500 hover:text-red-700 text-sm font-bold bg-red-50 px-3 py-1.5 rounded-lg transition">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {cart.length > 0 && (
          <div className="p-5 border-t border-gray-100 bg-white">
            <div className="flex justify-between items-center text-sm mb-2 text-gray-500">
              <span>Subtotal:</span>
              <span>₹{cartTotal}</span>
            </div>
            <div className="flex justify-between items-center text-sm mb-2 text-gray-500">
              <span>Shipping & Discounts:</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="flex justify-between items-center font-bold text-xl mb-6 text-gray-800">
              <span>Estimated Total:</span>
              <span className="text-green-600">₹{cartTotal}</span>
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