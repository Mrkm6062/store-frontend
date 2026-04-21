import React from 'react';

const Footer = ({ storeName }) => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-500 text-sm font-medium">
          &copy; {new Date().getFullYear()} {storeName}. All rights reserved.
        </div>
        <div className="text-center text-gray-400 text-xs mt-2 font-mono tracking-widest">
          POWERED BY GALIBRAND
        </div>
      </div>
    </footer>
  );
};

export default Footer;