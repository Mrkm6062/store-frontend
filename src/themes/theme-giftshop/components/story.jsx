import React, { useContext } from 'react';
import { Truck, Leaf, ShieldCheck, Clock, Star } from 'lucide-react';
import { ThemeCustomizationContext } from '../../../themeLoader/themeRenderer.jsx';

const Story = () => {
  const customization = useContext(ThemeCustomizationContext);
  const whyChooseUs = customization?.whyChooseUs || {};
  const primaryColor = customization?.global?.primaryColor || '#76b900';

  // Hide section completely if disabled
  if (whyChooseUs.enabled === false) return null;

  const defaultFeatures = [
    {
      icon: <Truck size={32} style={{ color: primaryColor }} />,
      title: "Fast Delivery",
      description: "Get your orders delivered to your doorstep quickly and safely."
    },
    {
      icon: <Leaf size={32} style={{ color: primaryColor }} />,
      title: "Fresh Products",
      description: "We guarantee the freshness and quality of all our items."
    },
    {
      icon: <ShieldCheck size={32} style={{ color: primaryColor }} />,
      title: "Secure Payments",
      description: "100% secure payment methods for your peace of mind."
    },
    {
      icon: <Clock size={32} style={{ color: primaryColor }} />,
      title: "24/7 Support",
      description: "Our dedicated support team is always here to help you."
    }
  ];

  // Use dynamic items if provided, otherwise fallback to defaults
  const activeItems = whyChooseUs.items?.filter(item => item.isActive) || [];
  const featuresToDisplay = activeItems.length > 0 ? activeItems : defaultFeatures;

  return (
    <div className="py-12 transition-colors duration-300" style={{ backgroundColor: primaryColor }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">{whyChooseUs.title || "Why Choose Us"}</h2>
          {whyChooseUs.subtitle && (
            <p className="text-white/80 max-w-2xl mx-auto">{whyChooseUs.subtitle}</p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {featuresToDisplay.map((feature, index) => (
            <div key={index} className="flex flex-col items-center text-center p-6 bg-white/10 rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 group">
              <div className={`w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:-translate-y-1 transition-transform overflow-hidden ${feature.icon && typeof feature.icon === 'string' ? 'p-0' : 'p-3'}`}>
                {feature.icon && typeof feature.icon === 'string' ? (
                  <img src={feature.icon} alt={feature.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
                ) : feature.icon ? (
                  feature.icon
                ) : (
                  <Star size={32} style={{ color: primaryColor }} />
                )}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-white/80 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Story;
