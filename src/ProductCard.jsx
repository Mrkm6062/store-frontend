import React, { useState } from 'react';
import { Plus } from 'lucide-react';

const ProductCard = ({ product, onAddToCart }) => {
  const hasVariants = product.variants && product.variants.length > 0;
  const [selectedVariantId, setSelectedVariantId] = useState(hasVariants ? product.variants[0]._id : null);

  const selectedVariant = hasVariants ? product.variants.find(v => v._id === selectedVariantId) : null;
  
  const displayPrice = selectedVariant 
    ? selectedVariant.price 
    : (product.basePrice || product.price || 0);

  // Safely extract the image whether it's an array (new GCS uploads), a direct string, or legacy image field
  const displayImage = Array.isArray(product.images) && product.images.length > 0 
    ? product.images[0] 
    : (typeof product.images === 'string' ? product.images : product.image);
  
  // Calculate stock based on selected variant or total product stock
  const maxStock = selectedVariant ? selectedVariant.stock : (product.totalStock !== undefined ? product.totalStock : product.stock);
  const isOutOfStock = maxStock <= 0;

  const handleAdd = () => {
    const itemToAdd = selectedVariant
      ? { ...product, _id: `${product._id}-${selectedVariant._id}`, name: `${product.name} - ${selectedVariant.name}`, basePrice: selectedVariant.price, variants: [], maxStock, image: displayImage }
      : { ...product, maxStock, image: displayImage };
    onAddToCart(itemToAdd);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group">
      <div className="h-48 bg-gray-50 relative w-full overflow-hidden flex-shrink-0">
        {displayImage ? (
          <img 
            src={displayImage} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium bg-gray-100">
            No Image
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-2" title={product.name}>
          {product.name}
        </h3>
        
        {hasVariants && (
          <div className="my-2">
            <select 
              value={selectedVariantId || ''} 
              onChange={(e) => setSelectedVariantId(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-gray-700 bg-gray-50"
            >
              {product.variants.map(v => (
                <option key={v._id} value={v._id}>{v.name}</option>
              ))}
            </select>
          </div>
        )}

        <p className="text-green-600 font-bold text-xl mb-4 mt-auto flex items-baseline gap-1">
          ₹{displayPrice}
          {!hasVariants && product.unitType && <span className="text-sm font-medium text-gray-400">/{product.unitType}</span>}
        </p>
        <button 
          onClick={handleAdd}
          disabled={isOutOfStock}
          className={`w-full flex items-center justify-center gap-2 border-2 py-2.5 rounded-xl font-bold transition-colors ${
            isOutOfStock 
              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-white border-green-500 text-green-600 hover:bg-green-500 hover:text-white'
          }`}
        >
          <Plus size={18} />
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;