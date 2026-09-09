import React, { useContext, useEffect, useRef, useState } from 'react';
import { ThemeCustomizationContext } from '../../../themeLoader/themeRenderer.jsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Banner = ({ bannerUrl, storeName }) => {
  const customization = useContext(ThemeCustomizationContext);
  const bannerSettings = customization?.banner || {};
  const limit = bannerSettings.limit || 5;

  const scrollRef = useRef(null);
  const [activeSlide, setActiveSlide] = useState(0);

  // Convert to array in case backend returns a single string, and apply the limit
  const banners = bannerUrl ? (Array.isArray(bannerUrl) ? bannerUrl : [bannerUrl]).slice(0, limit) : [];

  // Auto-scroll effect
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        let nextScrollLeft = scrollLeft + clientWidth;
        
        // If we reached the end of the carousel, loop back to the first slide
        if (nextScrollLeft >= scrollWidth - 10) {
          nextScrollLeft = 0;
        }
        
        scrollRef.current.scrollTo({ left: nextScrollLeft, behavior: 'smooth' });
      }
    }, 3000); // 3 seconds

    return () => clearInterval(interval);
  }, [banners.length]);

  // Observer to update active dot on any scroll (auto, manual, click)
  useEffect(() => {
    if (banners.length <= 1 || !scrollRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.dataset.index, 10);
            setActiveSlide(index);
          }
        });
      },
      {
        root: scrollRef.current,
        threshold: 0.5,
      }
    );

    const slides = Array.from(scrollRef.current.children).filter(child => child.hasAttribute('data-index'));
    slides.forEach((slide) => observer.observe(slide));

    return () => {
      slides.forEach((slide) => observer.unobserve(slide));
    };
  }, [banners.length]);

  if (banners.length === 0) return null;

  const scrollToSlide = (index) => {
    if (scrollRef.current) {
      const slideWidth = scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({
        left: slideWidth * index,
        behavior: 'smooth',
      });
    }
  };

  const handlePrev = () => {
    const prevIndex = (activeSlide - 1 + banners.length) % banners.length;
    scrollToSlide(prevIndex);
  };

  const handleNext = () => {
    const nextIndex = (activeSlide + 1) % banners.length;
    scrollToSlide(nextIndex);
  };

  return (
    <div 
      className="w-full relative group border-b transition-colors duration-300"
      style={{ backgroundColor: bannerSettings.bgColor || '#f3f4f6', borderColor: bannerSettings.bgColor || '#e5e7eb' }}
    >
      <div ref={scrollRef} className="w-full flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {banners.map((url, index) => (
          <div key={index} data-index={index} className="w-full shrink-0 snap-center relative">
            <img 
              src={url}
              alt={`${storeName} Banner ${index + 1}`} 
              width="1600"
              height="599"
              className="w-full h-auto object-cover" 
              fetchpriority={index === 0 ? "high" : undefined}
              loading={index === 0 ? undefined : "lazy"}
            />
            {/* Future text overlays can use style={{ color: bannerSettings.textColor || '#111111' }} */}
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button onClick={handlePrev} aria-label="Previous slide" className="absolute top-1/2 left-2 md:left-4 -translate-y-1/2 bg-white/60 hover:bg-white text-slate-800 p-2 rounded-full shadow-md transition-all opacity-0 group-hover:opacity-100 z-10"><ChevronLeft size={24} /></button>
          <button onClick={handleNext} aria-label="Next slide" className="absolute top-1/2 right-2 md:right-4 -translate-y-1/2 bg-white/60 hover:bg-white text-slate-800 p-2 rounded-full shadow-md transition-all opacity-0 group-hover:opacity-100 z-10"><ChevronRight size={24} /></button>
        </>
      )}

      {/* Navigation Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {banners.map((_, index) => (
            <button key={index} onClick={() => scrollToSlide(index)} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${activeSlide === index ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'}`} aria-label={`Go to slide ${index + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Banner;