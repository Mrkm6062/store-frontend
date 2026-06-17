import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Heart, Star } from 'lucide-react';
import { ThemeCustomizationContext } from '../../../themeLoader/themeRenderer.jsx';

const ProductCard = ({ product, onAddToCart, cart = [], onUpdateQuantity, onRemoveFromCart }) => {
  const navigate = useNavigate();
  const customization = useContext(ThemeCustomizationContext);
  const cardSettings = customization?.productCard || {};
  const hasVariants = product.variants && product.variants.length > 0;
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const displayPrice = product.basePrice || product.price || 0;

  // Compute original price for discount badge (fallback to 15% markup if backend doesn't provide it)
  const originalPrice = product.compareAtPrice || product.basePrice || (displayPrice > 0 ? Math.round(displayPrice * 1.15) : 0);
  const discountPercent = originalPrice > displayPrice ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0;

  // Safely extract the image whether it's an array (new GCS uploads), a direct string, or legacy image field
  const displayImage = Array.isArray(product.images) && product.images.length > 0 
    ? product.images[0] 
    : (typeof product.images === 'string' ? product.images : product.image);
  
  // Calculate stock based on selected variant or total product stock
  const maxStock = product.totalStock !== undefined ? product.totalStock : product.stock;
  const isOutOfStock = maxStock <= 0;

  // Extract rating data (assumes backend populates averageRating and totalReviews)
  const averageRating = product.averageRating || product.rating || 0;
  const totalReviews = product.totalReviews || product.reviewCount || product.numReviews || 0;

  const cartItem = !hasVariants ? cart.find(item => item._id === product._id) : null;
  const cartQty = cartItem ? cartItem.qty : 0;

  const handleAdd = (e) => {
    e.stopPropagation();
    if (hasVariants) {
      navigate(`/product/${product.slug || product._id}`);
      return;
    }

    const itemToAdd = { ...product, maxStock, image: displayImage };
    onAddToCart(itemToAdd);
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    if (onUpdateQuantity) onUpdateQuantity(product._id, 1);
    else handleAdd(e); // Fallback if missing prop
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (cartQty === 1 && onRemoveFromCart) onRemoveFromCart(product._id);
    else if (onUpdateQuantity) onUpdateQuantity(product._id, -1);
  };

  // Try to use categoryName if available, else default to 'Fresh Item'
  const categoryName = product.categoryName || (typeof product.category === 'string' && product.category.length < 20 ? product.category : 'Fresh Item');

  return (
    <div className="overflow-hidden shadow hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group flex flex-col bg-white">
      <div 
        className="relative overflow-hidden aspect-[2/3] bg-[#4b2d1e] cursor-pointer"
        onClick={() => navigate(`/product/${product.slug || product._id}`)}
      >
        <img 
          src={displayImage || 'https://placehold.co/400x600/f8fafc/475569?text=No+Image'}
          alt={product.name}
          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}
        />
        {!imageLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse w-full h-full" />}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold tracking-wider shadow-lg">
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      <div 
        className="bg-white -mb-6 pt-0 pb-1 px-1 text-left shadow-inner flex-grow cursor-pointer"
        onClick={() => navigate(`/product/${product.slug || product._id}`)}
      >
        <p className="py-2 px-1 font-semibold text-sm group-hover:text-blue-600 transition-colors" title={product.name}>
           {product.name.length > 40 
            ? product.name.slice(0, 40) + "..." 
           : product.name}
        </p>
        <div className="px-2 flex items-center mb-1 space-x-1">
          <div className="justify-center text-yellow-400 text-xl ">
            {'★'.repeat(Math.floor(averageRating || 0))}{'☆'.repeat(5 - Math.floor(averageRating || 0))}
          </div>
          <span className="text-gray-900 text-xs ml-1">({totalReviews || 0})</span>
        </div>

        <div className="px-1 flex items-baseline space-x-1 text-align-center">
          <span className="text-md font-semibold text-green-800">₹{displayPrice.toLocaleString()}</span>
          {discountPercent > 0 && (
            <>
              <span className="text-xs text-gray-500 line-through">₹{originalPrice.toLocaleString()}</span>
              <span className="bg-red-100 text-red-800 text-[10px] px-1.5 py-0.5 rounded-md font-bold">{discountPercent}%↓</span>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 z-10">
        {cartQty > 0 && !hasVariants ? (
          <div className="flex items-center bg-blue-600 text-white w-full h-12">
            <button 
              onClick={handleDecrement}
              className="w-12 h-full flex items-center justify-center hover:bg-blue-700 transition-colors active:scale-95"
            >
              <Minus size={16} />
            </button>
            <span className="flex-1 text-center font-bold">
              {cartQty}
            </span>
            <button 
              onClick={handleIncrement}
              disabled={cartQty >= maxStock}
              className={`w-12 h-full flex items-center justify-center transition-colors active:scale-95 ${cartQty >= maxStock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
            >
              <Plus size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAdd}
            disabled={isOutOfStock}
            className={`w-full py-3 font-semibold transition-all ${isOutOfStock ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {isOutOfStock ? 'Out of Stock' : (hasVariants ? 'Select Options' : 'Add to Cart')}
          </button>
        )}
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