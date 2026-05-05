import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import StoreHome from './StoreHome.jsx';
import PolicyPage from './PolicyPage.jsx';
import CategoryPage from './CategoryPage.jsx';
import StoreCategory from './StoreCategory.jsx';
import TrackOrder from './TrackOrder.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StoreHome />} />
        <Route path="/category/:categoryId" element={<CategoryPage />} />
        <Route path="/categories" element={<StoreCategory />} />
        <Route path="/policy/:slug" element={<PolicyPage />} />
        <Route path="/track" element={<TrackOrder />} />
        <Route path="/track/:orderId" element={<TrackOrder />} />
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </Router>
  );
}

export default App;