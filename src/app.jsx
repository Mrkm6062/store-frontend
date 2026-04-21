import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Mainpanel from './pages/Mainpanel';
import ManageStore from './pages/ManageStore';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [stores, setStores] = useState([]);

  const handleLoginSuccess = (newToken, userStores) => {
    setToken(newToken);
    setStores(userStores || []);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setStores([]);
  };

  // Fetch stores on initial load if token exists
  useEffect(() => {
    const fetchMyStores = async () => {
      if (token && stores.length === 0) {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
          const response = await fetch(`${API_BASE_URL}/api/store/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setStores(data.stores || []);
          } else {
            handleLogout(); // Invalid token
          }
        } catch (error) {
          console.error("Failed to fetch stores", error);
          handleLogout();
        }
      }
    };
    fetchMyStores();
  }, [token]);

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!token ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/" 
          element={token ? <Mainpanel token={token} stores={stores} setStores={setStores} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/store/:storeId" 
          element={token ? <ManageStore token={token} onLogout={handleLogout} stores={stores} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="*" 
          element={<Navigate to={token ? "/" : "/login"} />} 
        />
      </Routes>
    </Router>
  );
}

export default App;