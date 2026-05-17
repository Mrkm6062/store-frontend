import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// These point to the newly restructured "theme-free" directory
import Home from '../themes/theme-free/pages/Home.jsx';
import Category from '../themes/theme-free/pages/Category.jsx';
import Categories from '../themes/theme-free/pages/Categories.jsx';
import Policy from '../themes/theme-free/pages/Policy.jsx';
import TrackOrder from '../themes/theme-free/pages/TrackOrder.jsx';
import Checkout from '../themes/theme-free/pages/Checkout.jsx';

const ThemeRenderer = () => {
  // In the future, you can conditionally switch between themes here
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/category/:categoryId" element={<Category />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/policy/:slug" element={<Policy />} />
        <Route path="/track" element={<TrackOrder />} />
        <Route path="/track/:orderId" element={<TrackOrder />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default ThemeRenderer;