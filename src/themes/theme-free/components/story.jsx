import React from 'react';
import { Truck, Leaf, ShieldCheck, Clock } from 'lucide-react';

const Story = () => {
  const features = [
    {
      icon: <Truck size={32} className="text-[#76b900]" />,
      title: "Fast Delivery",
      description: "Get your orders delivered to your doorstep quickly and safely."
    },
    {
      icon: <Leaf size={32} className="text-[#76b900]" />,
      title: "Fresh Products",
      description: "We guarantee the freshness and quality of all our items."
    },
    {
      icon: <ShieldCheck size={32} className="text-[#76b900]" />,
      title: "Secure Payments",
      description: "100% secure payment methods for your peace of mind."
    },
    {
      icon: <Clock size={32} className="text-[#76b900]" />,
      title: "24/7 Support",
      description: "Our dedicated support team is always here to help you."
    }
  ];

  return (
    <div className="py-12 bg-[#76b900]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">Why Choose Us</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-center text-center p-6 bg-white/10 rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 group">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:-translate-y-1 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-green-50 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Story;
