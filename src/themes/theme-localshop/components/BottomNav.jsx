import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, Package, User } from 'lucide-react';
import { ThemeCustomizationContext, isLightColor } from '../../../themeLoader/themeRenderer.jsx';

const BottomNav = ({ cartCount, onCartClick }) => {
  const location = useLocation();
  const customization = useContext(ThemeCustomizationContext);
  
  // Use the primary color from theme settings, or default to green
  const primaryColor = customization?.global?.primaryColor || '#76b900';
  const activeColor = isLightColor(primaryColor) ? '#15803d' : primaryColor;

  const isActive = (path) => location.pathname === path;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-5px_10px_rgba(0,0,0,0.05)] z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {/* Home */}
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive('/') ? '' : 'text-gray-500 hover:text-gray-900'}`} 
          style={isActive('/') ? { color: activeColor } : {}}
        >
          <Home size={20} />
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        
        {/* Track Orders */}
        <Link 
          to="/track" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive('/track') ? '' : 'text-gray-500 hover:text-gray-900'}`} 
          style={isActive('/track') ? { color: activeColor } : {}}
        >
          <Package size={20} />
          <span className="text-[10px] font-bold">Orders</span>
        </Link>

        {/* Cart */}
        <button 
          onClick={onCartClick} 
          className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500 hover:text-gray-900 relative transition-colors"
        >
          <div className="relative">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span 
                className="absolute -top-2 -right-2 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                style={{ backgroundColor: activeColor }}
              >
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold">Cart</span>
        </button>

        {/* Login / Profile */}
        <Link 
          to="/track" 
          className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500 hover:text-gray-900 transition-colors"
        >
          <User size={20} />
          <span className="text-[10px] font-bold">Login</span>
        </Link>
      </div>
    </div>
  );
};

export default BottomNav;