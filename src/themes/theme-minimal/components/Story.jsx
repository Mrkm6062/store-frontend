import React, { useContext } from 'react';
import { Truck, Leaf, ShieldCheck, Clock } from 'lucide-react';
import { ThemeCustomizationContext, isLightColor } from '../../../themeLoader/themeRenderer.jsx';

const Story = () => {
  const customization = useContext(ThemeCustomizationContext);
  const primaryColor = customization?.global?.primaryColor || '#76b900';
  const isLightBg = isLightColor(primaryColor);

  const textColorClass = isLightBg ? 'text-slate-900' : 'text-white';
  const descColorClass = isLightBg ? 'text-slate-600' : 'text-green-50';
  const cardBgClass = isLightBg ? 'bg-black/5 border-black/10 hover:bg-black/10' : 'bg-white/10 border-white/20 hover:bg-white/20';

  const iconColor = isLightBg ? '#15803d' : '#76b900';

  const features = [
    {
      icon: <Truck size={32} style={{ color: iconColor }} />,
      title: "Fast Delivery",
      description: "Get your orders delivered to your doorstep quickly and safely."
    },
    {
      icon: <Leaf size={32} style={{ color: iconColor }} />,
      title: "Fresh Products",
      description: "We guarantee the freshness and quality of all our items."
    },
    {
      icon: <ShieldCheck size={32} style={{ color: iconColor }} />,
      title: "Secure Payments",
      description: "100% secure payment methods for your peace of mind."
    },
    {
      icon: <Clock size={32} style={{ color: iconColor }} />,
      title: "24/7 Support",
      description: "Our dedicated support team is always here to help you."
    }
  ];

  return (
    <div className="py-12 transition-colors duration-300" style={{ backgroundColor: primaryColor }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className={`text-2xl md:text-3xl font-extrabold mb-4 ${textColorClass}`}>Why Choose Us</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div key={index} className={`flex flex-col items-center text-center p-6 rounded-2xl border transition-all duration-300 group ${cardBgClass}`}>
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:-translate-y-1 transition-transform">
                {feature.icon}
              </div>
              <h3 className={`text-lg font-bold mb-2 ${textColorClass}`}>{feature.title}</h3>
              <p className={`text-sm leading-relaxed ${descColorClass}`}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Story;
