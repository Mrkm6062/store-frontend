import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../../../services/useStore';
import { useProducts } from '../../../services/useProducts';
import StoreLayout from '../Layout';
import { Star, ShoppingCart, Zap, ArrowLeft, Plus, Minus, PackageX, Home, ChevronRight, Share2, Heart, Maximize2, ZoomIn, RotateCw } from 'lucide-react';
import { ThemeCustomizationContext } from '../../../themeLoader/themeRenderer.jsx';
import { getPublicCategories, getImageProps, getOptimizedImageUrl } from '../../../services/api';
import CartSidebar from '../components/CartSidebar';

const compressImage = (file, maxSizeMB = 1) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(file);
    if (file.size <= maxSizeMB * 1024 * 1024) return resolve(file);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const MAX_DIMENSION = 1600;
        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        const attemptCompression = () => {
          canvas.toBlob((blob) => {
            if (blob.size <= maxSizeMB * 1024 * 1024 || quality <= 0.2) resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg', lastModified: Date.now() }));
            else { quality -= 0.1; attemptCompression(); }
          }, 'image/jpeg', quality);
        };
        attemptCompression();
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const ProductDetails = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { store, loading: storeLoading } = useStore();
  const { products, loading: productsLoading } = useProducts();
  const customization = useContext(ThemeCustomizationContext);
  const primaryColor = customization?.global?.primaryColor || '#76b900';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [productId]);

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [currentReviewPage, setCurrentReviewPage] = useState(1);
  const REVIEWS_PER_PAGE = 10;
  const [categoryName, setCategoryName] = useState('');
  const [categoryData, setCategoryData] = useState(null);
  
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customImageBase64, setCustomImageBase64] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [customText, setCustomText] = useState('');

  // Image Editor States
  const [showEditor, setShowEditor] = useState(false);
  const [rawImage, setRawImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    if (product?._id) {
      const saved = localStorage.getItem('gb_store_wishlist');
      if (saved) {
        try {
          const wishlist = JSON.parse(saved);
          setIsWishlisted(wishlist.some(item => item._id === product._id));
        } catch (e) {}
      }
    }
  }, [product]);

  const handleToggleWishlist = () => {
    if (!product) return;
    let wishlist = [];
    try {
      const saved = localStorage.getItem('gb_store_wishlist');
      wishlist = saved ? JSON.parse(saved) : [];
    } catch (e) {
      wishlist = [];
    }

    const exists = wishlist.some(item => item._id === product._id);
    let newWishlist;
    if (exists) {
      newWishlist = wishlist.filter(item => item._id !== product._id);
      setIsWishlisted(false);
      showToast('Removed from wishlist!', 'success');
    } else {
      const prodPrice = product.price !== undefined && product.price !== null ? product.price : (product.basePrice || 0);
      const prodImage = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : (product.image || '');
      newWishlist = [...wishlist, { _id: product._id, name: product.name, price: prodPrice, image: prodImage, slug: product.slug }];
      setIsWishlisted(true);
      showToast('Added to wishlist!', 'success');
    }
    localStorage.setItem('gb_store_wishlist', JSON.stringify(newWishlist));
    window.dispatchEvent(new Event('wishlist-updated'));
  };

  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('gb_store_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (product && product.category) {
      getPublicCategories().then(categories => {
        const cat = categories.find(c => c._id === product.category);
        if (cat) {
          setCategoryName(cat.name);
          setCategoryData(cat);
        }
      }).catch(console.error);
    }
  }, [product]);

  useEffect(() => {
    localStorage.setItem('gb_store_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const handleCartUpdate = () => {
      const saved = localStorage.getItem('gb_store_cart');
      if (saved) {
        try { setCart(JSON.parse(saved)); } catch(e) {}
      } else {
        setCart([]);
      }
    };
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  useEffect(() => {
    if (!productsLoading && products.length > 0) {
      const found = products.find(p => p.slug === productId || p._id === productId);
      if (found) {
        setProduct(found);
        if (found.variants?.length > 0) {
          setSelectedVariantId(found.variants[0]._id);
        }
        document.title = `${found.name} - ${store?.websiteTitle || store?.name || 'Store'}`;
      }
    }
  }, [productId, products, productsLoading, store]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!product?._id) return;
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${API_BASE_URL}/api/reviews/public/${product._id}`, {
          headers: {
            'x-store-domain': window.location.hostname,
            'x-forwarded-host': window.location.hostname
          }
        });
        if (res.ok) {
          setReviews(await res.json());
        }
      } catch (e) {
        console.error("Failed to load reviews", e);
      } finally {
        setLoadingReviews(false);
      }
    };
    fetchReviews();
  }, [product?._id]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCustomImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setRawImage(reader.result);
      setShowEditor(true);
    };
    reader.readAsDataURL(file);
    e.target.value = null; // reset input
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setOffset({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const handlePointerUp = () => setIsDragging(false);

  const handleApplyEdit = () => {
    setIsCompressing(true);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Get the aspect ratio from the product's customizable area
      const area = product.customizableArea || { width: 1, height: 1 };
      const aspectRatio = area.width / area.height;

      // Define max dimension for the output image, maintaining aspect ratio
      const CROP_MAX_DIMENSION = 800;
      let canvasWidth, canvasHeight;

      if (aspectRatio >= 1) { // Wider or square
        canvasWidth = CROP_MAX_DIMENSION;
        canvasHeight = CROP_MAX_DIMENSION / aspectRatio;
      } else { // Taller
        canvasHeight = CROP_MAX_DIMENSION;
        canvasWidth = CROP_MAX_DIMENSION * aspectRatio;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // The preview box has a max-width of 300px.
      const PREVIEW_WIDTH = 300;
      const previewHeight = PREVIEW_WIDTH / aspectRatio;

      // The ratio of final canvas size to preview size
      const ratio = canvasWidth / PREVIEW_WIDTH;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // Calculate the initial scale to fit the image into the preview box (cover, not contain)
      const s_fit = Math.max(PREVIEW_WIDTH / img.width, previewHeight / img.height);
      const w_rend = img.width * s_fit;
      const h_rend = img.height * s_fit;
      
      const finalScale = zoom * ratio;
      ctx.scale(finalScale, finalScale);
      
      // The offset is in preview pixels. We need to apply it before the final scale.
      const dx = -w_rend / 2 + (offset.x / zoom);
      const dy = -h_rend / 2 + (offset.y / zoom);

      ctx.drawImage(img, dx, dy, w_rend, h_rend);
      setCustomImageBase64(canvas.toDataURL('image/jpeg', 0.9));
      setRawImage(null);
      setShowEditor(false);
      setIsCompressing(false);
      setZoom(1); setRotation(0); setOffset({x:0, y:0});
    };
    img.src = rawImage;
  };

  if (storeLoading || productsLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 font-bold text-xl" style={{ color: primaryColor }}><span className="animate-pulse">Loading Product...</span></div>;
  }

  if (!product) {
    return (
      <StoreLayout store={store} cartCount={cart.length} onCartClick={() => setIsCartOpen(true)}>
        <div className="py-20 text-center flex flex-col items-center">
          <PackageX size={64} className="text-slate-300 mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Product Not Found</h2>
          <p className="text-slate-500 mb-6">The product you are looking for does not exist or has been removed.</p>
          <Link to="/" className="px-6 py-3 text-white font-bold rounded-xl" style={{ backgroundColor: primaryColor }}>Return to Shop</Link>
        </div>
      </StoreLayout>
    );
  }

  const hasVariants = product.variants && product.variants.length > 0;
  const selectedVariant = hasVariants ? product.variants.find(v => v._id === selectedVariantId) : null;

  // Unified Pricing & Discount logic for variants and normal products
  const productDiscount = typeof product.discount === 'number' && product.discount > 0 ? product.discount : 0;
  
  let displayPrice = 0;
  let originalPrice = 0;
  let discountPercent = 0;

  if (selectedVariant) {
    if (productDiscount > 0) {
      originalPrice = selectedVariant.price;
      displayPrice = selectedVariant.price - (selectedVariant.price * productDiscount / 100);
      discountPercent = productDiscount;
    } else if (selectedVariant.comparePrice && selectedVariant.comparePrice > selectedVariant.price) {
      originalPrice = selectedVariant.comparePrice;
      displayPrice = selectedVariant.price;
      discountPercent = Math.round(((selectedVariant.comparePrice - selectedVariant.price) / selectedVariant.comparePrice) * 100);
    } else {
      originalPrice = selectedVariant.price;
      displayPrice = selectedVariant.price;
      discountPercent = 0;
    }
  } else {
    originalPrice = product.basePrice || 0;
    displayPrice = product.price !== undefined && product.price !== null ? product.price : (product.basePrice || 0);
    if (productDiscount > 0) {
      discountPercent = productDiscount;
    } else if (originalPrice > displayPrice) {
      discountPercent = Math.round(((originalPrice - displayPrice) / originalPrice) * 100);
    }
  }
  const maxStock = selectedVariant ? selectedVariant.stock : (product.totalStock !== undefined ? product.totalStock : product.stock);
  const isOutOfStock = maxStock <= 0;
  const targetId = selectedVariant ? `${product._id}-${selectedVariant._id}` : product._id;

  const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : (product.image ? [product.image] : []);

  const totalReviewPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE);
  const paginatedReviews = reviews.slice((currentReviewPage - 1) * REVIEWS_PER_PAGE, currentReviewPage * REVIEWS_PER_PAGE);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    if ((product.isCustomizable || product.allowCustomText) && !customImageBase64 && !customText) {
      showToast('Please upload an image or enter custom text.', 'error');
      return;
    }
    
    setCart((prev) => {
      const existing = prev.find(item => item._id === targetId);
      if (existing) {
        if (existing.qty + quantity > maxStock) {
          showToast(`Only ${maxStock} units available.`, 'error');
          return prev;
        }
        return prev.map(item => item._id === targetId ? { ...item, qty: item.qty + quantity, customImageBase64: customImageBase64 || item.customImageBase64, customText: customText || item.customText } : item);
      }
      
      const itemToAdd = selectedVariant
        ? { ...product, _id: targetId, name: `${product.name} - ${selectedVariant.name}`, basePrice: selectedVariant.price, variants: [], maxStock, image: images[0], customImageBase64, customText }
        : { ...product, maxStock, image: images[0], customImageBase64, customText };
        
      return [...prev, { ...itemToAdd, price: displayPrice, qty: quantity }];
    });
    showToast('Added to cart!');
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    if ((product.isCustomizable || product.allowCustomText) && !customImageBase64 && !customText) {
      showToast('Please upload an image or enter custom text.', 'error');
      return;
    }
    
    let newCart = [...cart];
    const existing = newCart.find(item => item._id === targetId);
    
    if (existing) {
      if (existing.qty + quantity <= maxStock) {
        existing.qty += quantity;
        existing.customImageBase64 = customImageBase64 || existing.customImageBase64;
        existing.customText = customText || existing.customText;
      }
    } else {
      const itemToAdd = selectedVariant
        ? { ...product, _id: targetId, name: `${product.name} - ${selectedVariant.name}`, basePrice: selectedVariant.price, variants: [], maxStock, image: images[0], customImageBase64, customText }
        : { ...product, maxStock, image: images[0], customImageBase64, customText };
      newCart.push({ ...itemToAdd, price: displayPrice, qty: quantity });
    }
    
    setCart(newCart);
    localStorage.setItem('gb_store_cart', JSON.stringify(newCart));
    navigate('/checkout');
  };

  const handleUpdateQuantity = (id, delta) => {
    setCart((prev) => prev.map(item => {
      if (item._id === id) {
        const newQty = item.qty + delta;
        if (delta > 0 && newQty > item.maxStock) {
          showToast(`Sorry, only ${item.maxStock} units available in stock.`, 'error');
          return item;
        }
        return { ...item, qty: Math.max(1, newQty) };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item._id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  return (
    <StoreLayout store={store} cartCount={cart.length} onCartClick={() => setIsCartOpen(true)}>
      <style>{`
        .primary-file-input::file-selector-button {
          background-color: ${primaryColor} !important;
        }
        .primary-file-input:hover::file-selector-button {
          opacity: 0.9 !important;
        }
      `}</style>
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-6 lg:px-8 pt-8 pb-36 md:pt-12 md:pb-24 lg:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-12">
          
          <div className="lg:sticky lg:top-8 lg:h-fit flex gap-4 items-start px-0">
            {/* Vertical Thumbnails (Desktop) */}
            <div className="hidden lg:flex flex-col space-y-3">
              {images.map((img, index) => (
                <button 
                  key={index} 
                  onClick={() => setActiveImageIndex(index)} 
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${activeImageIndex === index ? 'border-[#76b900]' : 'border-gray-200 opacity-70 hover:opacity-100'}`}
                  style={activeImageIndex === index ? { borderColor: primaryColor } : {}}
                >
                  <img src={getOptimizedImageUrl(img, 186)} alt={`View ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Main Image Area */}
            <div className="flex-1 w-full">
              <div className="bg-slate-50 rounded-none lg:rounded-xl shadow-lg border border-gray-100 overflow-hidden relative aspect-square w-full max-w-lg mx-auto group">
                {images.length > 0 ? (
                  <img
                    {...getImageProps(images[activeImageIndex], 600)}
                    alt={product.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">No Image</div>
                )}

                {(product.isCustomizable || product.allowCustomText) && product.customizableArea && (
                  <div 
                      className={`absolute pointer-events-none z-10 flex items-center justify-center overflow-hidden transition-all duration-300 ${!customImageBase64 && !customText ? 'bg-white/80 border-2 border-dashed border-gray-400' : ''}`}
                      style={{
                          left: `${product.customizableArea.x}%`,
                          top: `${product.customizableArea.y}%`,
                          width: `${product.customizableArea.width}%`,
                          height: `${product.customizableArea.height}%`,
                      }}
                  >
                      {!customImageBase64 && !customText && (
                        <span className="text-black/60 font-bold text-center text-sm px-2">Your image or text here</span>
                      )}
                      {customImageBase64 && (
                          <img 
                            src={customImageBase64} 
                            className="absolute inset-0 w-full h-full object-contain transition-all duration-300" 
                            alt="Custom Print Preview" 
                            style={{ 
                              mixBlendMode: 'multiply',
                              filter: 'contrast(1.05) brightness(1.02) saturate(0.95)',
                              opacity: 0.93
                            }}
                          />
                      )}
                      {customText && (
                        <span 
                          className="absolute inset-0 flex items-center justify-center z-20 text-gray-800 font-extrabold text-center text-lg sm:text-2xl break-words px-2 transition-all duration-300" 
                          style={{ 
                            textShadow: '0 1px 1px rgba(255,255,255,0.6)', 
                            mixBlendMode: 'multiply',
                            opacity: 0.88,
                            letterSpacing: '-0.02em',
                            lineHeight: '1.1'
                          }}
                        >
                          {customText}
                        </span>
                      )}
                  </div>
                )}

                <button
                  onClick={() => showToast('Share functionality coming soon!', 'success')}
                  aria-label="Share this product"
                  className="absolute top-4 right-4 w-10 h-10 rounded-full shadow-md transition-all duration-200 flex items-center justify-center bg-white text-gray-600 hover:text-blue-500 z-10"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  onClick={handleToggleWishlist}
                  aria-label="Add to wishlist"
                  className="absolute top-16 right-4 w-10 h-10 rounded-full shadow-md transition-all duration-200 flex items-center justify-center bg-white text-gray-600 hover:text-red-500 z-10"
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                </button>

                <button
                  className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 hover:text-blue-600 z-10 transition-colors"
                  aria-label="View Full Screen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              
            {/* Mobile thumbnails removed from here and moved to right column */}
            </div>
          </div>

          {/* Right Column: Product Info */}
          <div className="space-y-6 px-5 pt-8 pb-32 bg-white rounded-t-[30px] -mt-10 relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] lg:space-y-6 lg:px-0 lg:pt-0 lg:pb-0 lg:bg-transparent lg:rounded-none lg:mt-0 lg:shadow-none">
            {/* Mobile Drawer Handle Indicator */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-2 block lg:hidden" />

            {/* Mobile Horizontal Thumbnails inside details card */}
            {images.length > 1 && (
              <div className="flex lg:hidden gap-3 overflow-x-auto pb-4 snap-x scrollbar-hide">
                {images.map((img, index) => (
                  <button 
                    key={index} 
                    onClick={() => setActiveImageIndex(index)} 
                    className={`w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all snap-start ${activeImageIndex === index ? 'border-[#76b900]' : 'border-gray-200 opacity-70 hover:opacity-100'}`}
                    style={activeImageIndex === index ? { borderColor: primaryColor } : {}}
                  >
                    <img src={img} alt={`View ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            
            {/* Breadcrumb Navigation */}
            <nav className="mb-4 hidden sm:block">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Link to="/" className="hover:text-blue-600">Home</Link>
                <span>/</span>
                {(categoryData || product.categoryName) && (
                  <>
                    {categoryData ? (
                      <Link to={`/category/${categoryData.slug || categoryData._id}`} className="hover:text-blue-600">{categoryData.name}</Link>
                    ) : (
                      <span>{product.categoryName}</span>
                    )}
                    <span>/</span>
                  </>
                )}
                <span className="text-gray-800 font-medium truncate max-w-[200px]">{product.name}</span>
              </div>
            </nav>

            <div>
              <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{product.name}</h3>
              <div className="flex items-center space-x-2 mb-4">
                <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {categoryName || product.categoryName || 'Product'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 py-2">
              <span className="text-3xl font-bold text-gray-900">₹{displayPrice.toLocaleString()}</span>
              {discountPercent > 0 && (
                <>
                  <span className="text-lg text-gray-500 line-through">₹{originalPrice.toLocaleString()}</span>
                  <span className="text-green-800 bg-green-50 text-sm font-bold px-2 py-1 rounded flex items-center">
                    {discountPercent}% OFF
                  </span>
                </>
              )}
            </div>

            {hasVariants && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Select {product.variantType && product.variantType !== 'option' ? (product.variantType.charAt(0).toUpperCase() + product.variantType.slice(1)) : 'Option'}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map(v => (
                    <button 
                      key={v._id} 
                      onClick={() => setSelectedVariantId(v._id)}
                      className={`px-5 py-2.5 border rounded-lg text-sm font-medium transition-colors ${selectedVariantId === v._id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 hover:border-gray-400'}`}
                      style={selectedVariantId === v._id ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10`, color: primaryColor } : {}}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
                {isOutOfStock && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                    <p className="text-red-700 font-semibold">This option is currently out of stock.</p>
                  </div>
                )}
              </div>
            )}

            {product.isCustomizable && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <label className="block text-sm font-bold text-blue-800 mb-2">Upload Custom Image (For Printing) <span className="text-red-500">*</span></label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleCustomImageUpload} 
                  className="primary-file-input w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:text-white transition-colors cursor-pointer"
                  disabled={isCompressing}
                />
                {isCompressing && <p className="text-xs text-blue-600 mt-2 font-bold animate-pulse">Processing image...</p>}
                {customImageBase64 && (
                  <div className="mt-3 relative inline-block">
                     <img src={customImageBase64} alt="Custom Preview" className="h-16 w-16 object-cover rounded-lg border border-blue-200 shadow-sm" />
                    <button type="button" onClick={() => setCustomImageBase64(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-600 transition">&times;</button>
                  </div>
                )}
              </div>
            )}

            {product.allowCustomText && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-sm font-bold text-slate-800 mb-2">Custom Text (Optional)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={customText} 
                    onChange={(e) => setCustomText(e.target.value)} 
                    placeholder="e.g. Happy Birthday John!" 
                    spellCheck="false"
                    className="flex-1 w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#76b900] text-sm"
                  />
                  <button 
                    type="button" 
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    style={{ backgroundColor: primaryColor }}
                    className="px-4 py-2 text-white font-bold rounded-xl hover:opacity-90 transition-colors whitespace-nowrap shadow-sm"
                  >
                    Preview
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">This text will be printed along with your product design.</p>
              </div>
            )}

            {product.description && (
              <div className="mt-6 border-t border-gray-100 pt-6">
                <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            {/* Mobile / Desktop Action Bar */}
            <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-white p-3 sm:p-4 border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40 lg:static lg:p-0 lg:border-none lg:shadow-none pb-safe lg:mt-6">
              <div className="flex items-stretch gap-2 sm:gap-4 max-w-7xl mx-auto">
                <div className="shrink-0">
                  <div className="flex items-center border border-gray-300 rounded-lg h-full">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 sm:px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-l-lg transition-colors"><Minus size={16} /></button>
                    <span className="px-2 sm:px-4 py-3 border-x border-gray-300 min-w-[40px] text-center font-bold text-gray-800">{quantity}</span>
                    <button onClick={() => setQuantity(Math.min(maxStock, quantity + 1))} className="px-3 sm:px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-r-lg transition-colors"><Plus size={16} /></button>
                  </div>
                </div>
                
                <button 
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="flex-1 bg-white py-3 px-2 sm:px-4 rounded-xl text-sm sm:text-base font-bold hover:bg-gray-50 transition-colors border-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  style={{ color: primaryColor, borderColor: primaryColor }}
                >
                  Add to Cart
                </button>
                
                <button 
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="flex-1 text-white py-3 px-2 sm:px-4 rounded-xl text-sm sm:text-base font-bold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  Buy Now
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      {!loadingReviews && reviews.length > 0 && (
        <div id="reviews" className="bg-white rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 md:p-10 mt-12 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-100 pb-6">
            <h3 className="text-2xl font-bold text-slate-800">Customer Reviews</h3>
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <Star className="fill-amber-400 text-amber-400" size={24} />
              <span className="text-2xl font-black text-slate-800">{Number(product.averageRating || 0).toFixed(1)}</span>
              <span className="text-sm font-medium text-slate-500">({product.totalReviews || 0} reviews)</span>
            </div>
          </div>
          
          <div className="space-y-6">
            {paginatedReviews.map(review => (
              <div key={review._id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:shadow-sm transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-bold text-slate-800 text-lg">{review.customerName || 'Anonymous'}</p>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">{new Date(review.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} size={16} className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'} />)}
                  </div>
                </div>
                <p className="text-slate-700 mb-4 leading-relaxed whitespace-pre-wrap">{review.review || 'No written feedback provided.'}</p>
                
                {review.reviewImages?.length > 0 && (
                  <div className="flex gap-3 flex-wrap mt-4">
                    {review.reviewImages.map((media, idx) => {
                      const isVideo = media.match(/\.(mp4|webm|mov|ogg|mkv)(\?.*)?$/i);
                      return isVideo ? (
                        <video key={idx} src={media} controls className="w-24 h-24 object-cover rounded-xl border border-slate-200 shadow-sm" />
                      ) : (
                        <a key={idx} href={media} target="_blank" rel="noopener noreferrer" className="block w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:opacity-80 transition">
                          <img src={media} alt="Review attachment" className="w-full h-full object-cover" />
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalReviewPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
              <button 
                onClick={() => setCurrentReviewPage(p => Math.max(1, p - 1))}
                disabled={currentReviewPage === 1}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
              >
                &larr; Previous
              </button>
              <span className="text-sm font-bold text-slate-500">
                Page {currentReviewPage} of {totalReviewPages}
              </span>
              <button 
                onClick={() => setCurrentReviewPage(p => Math.min(totalReviewPages, p + 1))}
                disabled={currentReviewPage === totalReviewPages}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      <CartSidebar 
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveFromCart={handleRemoveFromCart}
        cartTotal={cartTotal}
        primaryColor={primaryColor}
      />

      {/* Custom Toast Notification */}
      {toast && (
        <div 
          className="fixed top-10 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-3 transition-all animate-fadeIn text-white"
          style={{ backgroundColor: toast.type === 'error' ? '#ef4444' : primaryColor }}
        >
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          {toast.message}
        </div>
      )}

      {/* Custom Image Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col items-center">
             <h3 className="text-xl font-bold text-slate-800 mb-4">Edit Custom Image</h3>
             
             <div 
               className="relative w-full max-w-[300px] overflow-hidden bg-slate-100 rounded-2xl border-2 border-slate-200 cursor-move touch-none"
               onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp} onMouseLeave={handlePointerUp}
               onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp}
               style={{ 
                 aspectRatio: `${product.customizableArea?.width} / ${product.customizableArea?.height}`
               }}
             >
               <div className="absolute top-1/2 left-1/2 w-full h-full" style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${zoom})` }}>
                  <img 
                    src={rawImage} 
                    alt="Edit" 
                    className="absolute top-1/2 left-1/2 pointer-events-none" 
                    style={{ 
                      transform: `translate(calc(-50% + ${offset.x / zoom}px), calc(-50% + ${offset.y / zoom}px))`,
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }} 
                  />
               </div>
             </div>
             <p className="text-xs text-slate-400 mt-3 text-center font-medium">Drag to reposition the image.</p>

             <div className="w-full mt-6 space-y-4">
               <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                 <div className="flex items-center gap-2 w-20 text-slate-600"><ZoomIn size={18} /> <span className="text-sm font-bold">Zoom</span></div>
                 <input type="range" min="0.1" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#76b900]" />
               </div>
               <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600"><RotateCw size={18} /> <span className="text-sm font-bold">Rotate</span></div>
                  <div className="flex gap-2">
                    <button onClick={() => setRotation(r => r - 90)} className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:border-[#76b900] hover:text-[#76b900] transition-colors">-90°</button>
                    <button onClick={() => setRotation(r => r + 90)} className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:border-[#76b900] hover:text-[#76b900] transition-colors">+90°</button>
                  </div>
               </div>
             </div>

             <div className="flex w-full gap-3 mt-6">
               <button onClick={() => { setShowEditor(false); setRawImage(null); setZoom(1); setRotation(0); setOffset({x:0, y:0}); }} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
               <button onClick={handleApplyEdit} disabled={isCompressing} className="flex-1 py-3 bg-[#76b900] text-white font-bold rounded-xl hover:bg-[#659e00] transition-colors shadow-md disabled:opacity-50">
                 {isCompressing ? 'Processing...' : 'Apply & Save'}
               </button>
             </div>
          </div>
        </div>
      )}
    </StoreLayout>
  );
};

export default ProductDetails;