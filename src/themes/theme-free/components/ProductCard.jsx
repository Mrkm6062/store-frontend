import React, { useState } from 'react';
import { Plus, Minus, Heart } from 'lucide-react';

const ProductCard = ({ product, onAddToCart, cart = [], onUpdateQuantity, onRemoveFromCart }) => {
  const hasVariants = product.variants && product.variants.length > 0;
  const [selectedVariantId, setSelectedVariantId] = useState(hasVariants ? product.variants[0]._id : null);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const selectedVariant = hasVariants ? product.variants.find(v => v._id === selectedVariantId) : null;
  
  const displayPrice = selectedVariant 
    ? selectedVariant.price 
    : (product.basePrice || product.price || 0);

  // Compute original price for discount badge (fallback to 15% markup if backend doesn't provide it)
  const originalPrice = product.compareAtPrice || product.basePrice || (displayPrice > 0 ? Math.round(displayPrice * 1.15) : 0);
  const discountPercent = originalPrice > displayPrice ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0;

  // Safely extract the image whether it's an array (new GCS uploads), a direct string, or legacy image field
  const displayImage = Array.isArray(product.images) && product.images.length > 0 
    ? product.images[0] 
    : (typeof product.images === 'string' ? product.images : product.image);
  
  // Calculate stock based on selected variant or total product stock
  const maxStock = selectedVariant ? selectedVariant.stock : (product.totalStock !== undefined ? product.totalStock : product.stock);
  const isOutOfStock = maxStock <= 0;

  const targetId = selectedVariant ? `${product._id}-${selectedVariant._id}` : product._id;
  const cartItem = cart.find(item => item._id === targetId);
  const cartQty = cartItem ? cartItem.qty : 0;

  const handleAdd = (e) => {
    e.stopPropagation();
    const itemToAdd = selectedVariant
      ? { ...product, _id: targetId, name: `${product.name} - ${selectedVariant.name}`, basePrice: selectedVariant.price, variants: [], maxStock, image: displayImage }
      : { ...product, maxStock, image: displayImage };
    onAddToCart(itemToAdd);
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    if (onUpdateQuantity) onUpdateQuantity(targetId, 1);
    else handleAdd(e); // Fallback if missing prop
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (cartQty === 1 && onRemoveFromCart) onRemoveFromCart(targetId);
    else if (onUpdateQuantity) onUpdateQuantity(targetId, -1);
  };

  // Try to use categoryName if available, else default to 'Fresh Item'
  const categoryName = product.categoryName || (typeof product.category === 'string' && product.category.length < 20 ? product.category : 'Fresh Item');

  return (
    <div className="relative bg-white rounded-2xl sm:rounded-[20px] border border-gray-100/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_-4px_rgba(34,197,94,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col group overflow-hidden">
      
      {/* Badges */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 flex flex-col gap-1.5">
        {discountPercent > 0 && (
          <span className="bg-red-500/95 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wide shadow-sm w-fit">
            {discountPercent}% OFF
          </span>
        )}
        <span className="bg-emerald-500/95 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold tracking-wide shadow-sm w-fit">
          Fresh
        </span>
      </div>

      {/* Wishlist Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); setIsWishlisted(!isWishlisted); }}
        className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 p-1.5 sm:p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-gray-400 hover:text-red-500 transition-colors"
      >
        <Heart size={16} className={isWishlisted ? "fill-red-500 text-red-500" : ""} />
      </button>

      {/* Image Area */}
      <div className="h-32 sm:h-48 relative w-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-green-50/50 to-white p-3 sm:p-5">
        {displayImage ? (
          <img 
            src={displayImage} 
            alt={product.name} 
            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-sm"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 font-medium">
            No Image
          </div>
        )}
        
        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold tracking-wider shadow-lg">
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-3 sm:p-4 flex flex-col flex-grow bg-white z-20">
        <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 line-clamp-1">
          {categoryName}
        </span>
        
        <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-2 line-clamp-2 leading-snug group-hover:text-green-600 transition-colors" title={product.name}>
          {product.name}
        </h3>
        
        {hasVariants && (
          <div className="mb-3">
            <select 
              value={selectedVariantId || ''} 
              onChange={(e) => setSelectedVariantId(e.target.value)}
              className="w-full text-xs sm:text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-gray-700 bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              {product.variants.map(v => (
                <option key={v._id} value={v._id}>{v.name}</option>
              ))}
            </select>
          </div>
        )}

        {!hasVariants && (
          <div className="mb-3">
             <span className="text-[11px] sm:text-xs font-semibold text-gray-500 bg-gray-100/80 px-2 py-1 rounded-md border border-gray-100">
              {product.unitType || '1 unit'}
            </span>
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col">
            {discountPercent > 0 && (
              <span className="text-[11px] sm:text-xs text-gray-400 line-through font-medium mb-0.5">
                ₹{originalPrice}
              </span>
            )}
            <span className="text-base sm:text-lg font-black text-gray-900 leading-none">
              ₹{displayPrice}
            </span>
          </div>

          {/* Action Button: Add or Stepper */}
          {cartQty > 0 ? (
            <div className="flex items-center bg-green-600 text-white rounded-xl shadow-md h-8 sm:h-9">
              <button 
                onClick={handleDecrement}
                className="w-8 sm:w-9 h-full flex items-center justify-center hover:bg-green-700 rounded-l-xl transition-colors active:scale-95"
              >
                <Minus size={16} />
              </button>
              <span className="w-6 sm:w-8 text-center text-sm font-bold">
                {cartQty}
              </span>
              <button 
                onClick={handleIncrement}
                disabled={cartQty >= maxStock}
                className={`w-8 sm:w-9 h-full flex items-center justify-center rounded-r-xl transition-colors active:scale-95 ${cartQty >= maxStock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
              >
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleAdd}
              disabled={isOutOfStock}
              className={`relative flex items-center justify-center h-8 sm:h-9 px-4 sm:px-5 rounded-xl font-extrabold text-xs sm:text-sm transition-all duration-300 active:scale-95 border ${
                isOutOfStock 
                  ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-600 hover:text-white hover:border-green-600 shadow-sm'
              }`}
            >
              {isOutOfStock ? 'SOLD' : 'ADD'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

export const ProductCardSkeleton = () => (
  <div className="bg-white rounded-2xl sm:rounded-[20px] border border-gray-100 shadow-sm animate-pulse flex flex-col h-full overflow-hidden">
    <div className="h-32 sm:h-48 bg-gray-200/60 w-full flex-shrink-0"></div>
    <div className="p-3 sm:p-4 flex flex-col flex-grow">
      <div className="h-3 w-16 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 sm:h-5 w-3/4 bg-gray-200 rounded mb-4"></div>
      <div className="h-6 w-1/3 bg-gray-200 rounded mb-4 mt-auto"></div>
      <div className="flex justify-between items-end mt-auto pt-2">
        <div className="h-6 w-16 bg-gray-200 rounded"></div>
        <div className="h-8 sm:h-9 w-16 sm:w-20 bg-gray-200 rounded-xl"></div>
      </div>
    </div>
  </div>
);