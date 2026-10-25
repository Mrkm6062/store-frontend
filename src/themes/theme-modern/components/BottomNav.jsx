import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, Package, User, Percent } from 'lucide-react';
import { ThemeCustomizationContext, isLightColor } from '../../../themeLoader/themeRenderer.jsx';

const BottomNav = ({ cartCount, onCartClick }) => {
  const location = useLocation();
  const customization = useContext(ThemeCustomizationContext);
  
  // Use the primary color from theme settings, or default to green
  const primaryColor = customization?.global?.primaryColor || '#e85d04';
  const activeColor = isLightColor(primaryColor) ? '#15803d' : primaryColor;

  const isActive = (path) => location.pathname === path;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#fffdf9]/95 backdrop-blur-xl border-t border-orange-100 shadow-[0_-8px_24px_rgba(91,45,19,0.08)] z-50 pb-safe">
      <div className="flex justify-around items-center h-[4.25rem]">
        {/* Home */}
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive('/') ? '' : 'text-stone-400 hover:text-stone-900'}`}
          style={isActive('/') ? { color: activeColor } : {}}
        >
          <Home size={20} />
          <span className="text-[10px] font-bold">Home</span>
        </Link>

        {/* Offers */}
        <Link 
          to="/offers" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive('/offers') ? '' : 'text-stone-400 hover:text-stone-900'}`}
          style={isActive('/offers') ? { color: activeColor } : {}}
        >
          <Percent size={20} />
          <span className="text-[10px] font-bold">Offers</span>
        </Link>
        
        {/* Track Orders */}
        <Link 
          to="/track" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive('/track') ? '' : 'text-stone-400 hover:text-stone-900'}`}
          style={isActive('/track') ? { color: activeColor } : {}}
        >
          <Package size={20} />
          <span className="text-[10px] font-bold">Orders</span>
        </Link>

        {/* Cart */}
        <button 
          onClick={onCartClick} 
          className="flex flex-col items-center justify-center w-full h-full space-y-1 text-stone-400 hover:text-stone-900 relative transition-colors"
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
          className="flex flex-col items-center justify-center w-full h-full space-y-1 text-stone-400 hover:text-stone-900 transition-colors"
        >
          <User size={20} />
          <span className="text-[10px] font-bold">Login</span>
        </Link>
      </div>
    </div>
  );
};

export default BottomNav;
