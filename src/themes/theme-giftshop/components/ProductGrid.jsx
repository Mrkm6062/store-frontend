import React from 'react';
import ProductCard from './ProductCard';

const ProductGrid = ({ products, onAddToCart, cart = [], onUpdateQuantity, onRemoveFromCart }) => {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
        <h3 className="text-xl text-gray-500 font-medium">No products found for this store.</h3>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 md:gap-8 justify-items-center">
      {products.map((product) => (
        <div key={product._id || product.id} className="w-full max-w-[260px]">
          <ProductCard 
            product={product} 
            onAddToCart={onAddToCart} 
            cart={cart}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveFromCart={onRemoveFromCart}
          />
        </div>
      ))}
    </div>
  );
};

export default ProductGrid;