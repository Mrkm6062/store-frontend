import React, { useState, useEffect } from 'react';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';

const WishlistSidebar = ({ isWishlistOpen, setIsWishlistOpen, primaryColor = '#76b900' }) => {
  const [wishlist, setWishlist] = useState([]);

  const loadWishlist = () => {
    try {
      const saved = localStorage.getItem('gb_store_wishlist');
      setWishlist(saved ? JSON.parse(saved) : []);
    } catch (e) {
      setWishlist([]);
    }
  };

  useEffect(() => {
    if (isWishlistOpen) {
      loadWishlist();
    }
  }, [isWishlistOpen]);

  useEffect(() => {
    window.addEventListener('wishlist-updated', loadWishlist);
    return () => window.removeEventListener('wishlist-updated', loadWishlist);
  }, []);

  const handleRemoveFromWishlist = (id, e) => {
    if (e) e.stopPropagation();
    const updated = wishlist.filter(item => item._id !== id);
    localStorage.setItem('gb_store_wishlist', JSON.stringify(updated));
    setWishlist(updated);
    window.dispatchEvent(new Event('wishlist-updated'));
  };

  const handleAddToCart = (product, e) => {
    if (e) e.stopPropagation();
    try {
      const savedCart = localStorage.getItem('gb_store_cart');
      let cart = savedCart ? JSON.parse(savedCart) : [];

      const existingIndex = cart.findIndex(item => item._id === product._id);
      if (existingIndex > -1) {
        cart[existingIndex].qty += 1;
      } else {
        cart.push({
          _id: product._id,
          name: product.name,
          price: product.price,
          image: product.image || (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : ''),
          qty: 1,
          maxStock: product.maxStock !== undefined ? product.maxStock : 99,
          unitType: product.unitType || 'piece'
        });
      }

      localStorage.setItem('gb_store_cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cart-updated'));
      
      // Also remove from wishlist when added to cart
      handleRemoveFromWishlist(product._id);
    } catch (err) {
      console.error("Failed to add to cart from wishlist:", err);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-[90] ${isWishlistOpen ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsWishlistOpen(false)}
      ></div>
      
      {/* Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col z-[100] transform transition-transform duration-300 ease-in-out ${isWishlistOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Heart className="fill-red-500 text-red-500" size={24} /> Your Wishlist
          </h2>
          <button onClick={() => setIsWishlistOpen(false)} className="text-gray-500 hover:text-red-500 font-bold text-3xl leading-none">
            &times;
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5">
          {wishlist.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
              <Heart size={48} className="text-slate-300" />
              <p className="text-lg font-medium text-slate-500">Your wishlist is empty.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {wishlist.map((item) => (
                <div key={item._id} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-medium">No Img</div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 line-clamp-1 text-sm">{item.name}</p>
                      <p className="text-green-600 font-semibold text-sm">₹{item.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => handleAddToCart(item, e)}
                      className="text-white bg-blue-600 hover:bg-blue-700 text-xs font-bold p-2 rounded-lg flex items-center gap-1 transition"
                      style={{ backgroundColor: primaryColor }}
                      title="Add to Cart"
                    >
                      <ShoppingCart size={14} /> Add
                    </button>
                    <button 
                      onClick={(e) => handleRemoveFromWishlist(item._id, e)}
                      className="text-red-500 hover:text-red-700 text-xs font-bold bg-red-50 p-2 rounded-lg transition"
                      title="Remove from Wishlist"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default WishlistSidebar;
