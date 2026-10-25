import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getImageProps } from '../../../services/api';
import { Plus, Minus, Heart, Star } from 'lucide-react';
import { ThemeCustomizationContext } from '../../../themeLoader/themeRenderer.jsx';

const ProductCard = ({ product, onAddToCart, cart = [], onUpdateQuantity, onRemoveFromCart, index }) => {
  const navigate = useNavigate();
  const customization = useContext(ThemeCustomizationContext);
  const cardSettings = customization?.productCard || {};
  const primaryColor = customization?.global?.primaryColor || '#e85d04';
  const hasVariants = product.variants && product.variants.length > 0;
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  const delayMs = index !== undefined ? (index % 4) * 100 : 0;
  
  const displayPrice = product.price !== undefined && product.price !== null ? product.price : (product.basePrice || 0);

  // Compute original price for discount badge
  const originalPrice = product.basePrice || product.compareAtPrice || (displayPrice > 0 ? Math.round(displayPrice * 1.15) : 0);
  const discountPercent = typeof product.discount === 'number' && product.discount > 0 
    ? product.discount 
    : (originalPrice > displayPrice ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0);

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
    <div 
      ref={cardRef}
      style={{ 
        transitionDelay: isVisible ? `${delayMs}ms` : '0ms'
      }}
      className={`w-full transition-all duration-700 ease-out transform ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="overflow-hidden rounded-[1.35rem] border border-orange-100/80 shadow-[0_5px_20px_rgba(91,45,19,0.07)] hover:shadow-[0_16px_34px_rgba(91,45,19,0.15)] transition-all duration-300 transform hover:-translate-y-1.5 group flex flex-col bg-white w-full">
      <div 
        className="relative overflow-hidden aspect-square bg-[#fff3e6] cursor-pointer"
        onClick={() => navigate(`/product/${product.slug || product._id}`)}
      >
        <img 
          {...getImageProps(displayImage || 'https://placehold.co/400x600/f8fafc/475569?text=No+Image', 323)}
          alt={product.name}
          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}
        />
        {!imageLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse w-full h-full" />}
        {discountPercent > 0 && !isOutOfStock && (
          <span className="absolute top-3 left-3 rounded-full bg-[#9f2d19] px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-white shadow-sm">
            {discountPercent}% OFF
          </span>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold tracking-wider shadow-lg">
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      <div 
        className="bg-white px-3.5 pt-3.5 pb-3 text-left flex-grow cursor-pointer"
        onClick={() => navigate(`/product/${product.slug || product._id}`)}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-orange-700/70">{categoryName}</span>
          {averageRating > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-amber-700"><Star size={11} className="fill-amber-400 text-amber-400" />{Number(averageRating).toFixed(1)}</span>
          )}
        </div>
        <p className="min-h-[2.5rem] font-bold text-[13px] leading-5 text-stone-800 group-hover:text-[#c94710] transition-colors" title={product.name}>
           {product.name.length > 40 
            ? product.name.slice(0, 40) + "..." 
           : product.name}
        </p>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
          <span className="text-lg font-extrabold text-[#9f2d19]">₹{displayPrice.toLocaleString()}</span>
          {discountPercent > 0 && (
            <>
              <span className="text-[11px] text-stone-400 line-through">₹{originalPrice.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-[#c94710]">Save {discountPercent}%</span>
            </>
          )}
        </div>
      </div>

      <div className="px-3.5 pb-3.5 pt-0 z-10">
        {cartQty > 0 && !hasVariants ? (
          <div className="flex items-center overflow-hidden rounded-xl text-white w-full h-11 shadow-sm" style={{ backgroundColor: primaryColor }}>
            <button 
              onClick={handleDecrement}
              className="w-11 h-full flex items-center justify-center hover:bg-black/10 transition-colors active:scale-95"
            >
              <Minus size={16} />
            </button>
            <span className="flex-1 text-center font-bold">
              {cartQty}
            </span>
            <button 
              onClick={handleIncrement}
              disabled={cartQty >= maxStock}
              className={`w-11 h-full flex items-center justify-center transition-colors active:scale-95 ${cartQty >= maxStock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black/10'}`}
            >
              <Plus size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAdd}
            disabled={isOutOfStock}
            style={!isOutOfStock ? { backgroundColor: primaryColor } : undefined}
            className={`w-full rounded-xl py-3 text-sm font-extrabold transition-all ${
              isOutOfStock ? 'bg-stone-200 text-stone-500 cursor-not-allowed' : 'text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:opacity-95'
            }`}
          >
            {isOutOfStock ? 'Out of Stock' : (hasVariants ? 'Buy Now' : 'Add to Cart')}
          </button>
        )}
      </div>
    </div>
  </div>
  );
};

export default ProductCard;

export const ProductCardSkeleton = () => (
  <div className="bg-white rounded-[1.35rem] border border-orange-100 shadow-sm animate-pulse flex flex-col h-full overflow-hidden">
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
