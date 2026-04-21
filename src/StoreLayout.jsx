import React from 'react';
import Header from './Header';
import Footer from './Footer';

const StoreLayout = ({ children, store, cartCount, onCartClick }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900 w-full overflow-x-hidden">
      <Header store={store} cartCount={cartCount} onCartClick={onCartClick} />
      <main className="flex-1 w-full flex flex-col">
        {children}
      </main>
      <Footer storeName={store?.name || 'Store'} />
    </div>
  );
};

export default StoreLayout;