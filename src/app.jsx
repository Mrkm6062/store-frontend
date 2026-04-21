import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import StoreHome from './StoreHome.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StoreHome />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;