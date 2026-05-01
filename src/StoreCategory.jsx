import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublicCategories } from './api';
import CategoryCard from './CategoryCard';
import StoreLayout from './StoreLayout';

const StoreCategory = ({ store, cartCount, onCartClick }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getPublicCategories()
      .then(data => { setCategories(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const handleCategoryClick = (category) => {
    navigate(`/?category=${category._id}`);
  };

  return (
    <StoreLayout store={store} cartCount={cartCount} onCartClick={onCartClick}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8 border-b pb-4">Browse All Categories</h1>
        
        {loading ? (
          <div className="flex justify-center py-10 text-gray-500 font-medium">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20 text-gray-500 font-medium bg-white rounded-2xl border border-gray-100">No categories found.</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-x-6 gap-y-10">
            {categories.map(c => (
              <CategoryCard key={c._id} category={c} onClick={handleCategoryClick} />
            ))}
          </div>
        )}
      </div>
    </StoreLayout>
  );
};

export default StoreCategory;