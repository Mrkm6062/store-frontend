import React from 'react';
import { Plus } from 'lucide-react';

const ProductCard = ({ product, onAddToCart }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group">
      <div className="h-48 bg-gray-50 relative w-full overflow-hidden flex-shrink-0">
        {product.image ? (
          <img 
            src={product.image} 
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
        <p className="text-green-600 font-bold text-xl mb-4 mt-auto">
          ₹{product.price}
        </p>
        <button 
          onClick={() => onAddToCart(product)}
          className="w-full flex items-center justify-center gap-2 bg-white border-2 border-green-500 text-green-600 py-2.5 rounded-xl font-bold hover:bg-green-500 hover:text-white transition-colors"
        >
          <Plus size={18} />
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default ProductCard;