import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../../../services/useStore';
import { useProducts } from '../../../services/useProducts';
import StoreLayout from '../Layout';
import { Star, ShoppingCart, Zap, ArrowLeft, Plus, Minus, PackageX, Home, ChevronRight, Share2, Heart, Maximize2 } from 'lucide-react';
import { ThemeCustomizationContext } from '../../../themeLoader/themeRenderer.jsx';
import { getPublicCategories } from '../../../services/api';

const ProductDetails = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { store, loading: storeLoading } = useStore();
  const { products, loading: productsLoading } = useProducts();
  const customization = useContext(ThemeCustomizationContext);
  const primaryColor = customization?.global?.primaryColor || '#76b900';

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

  if (storeLoading || productsLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-green-600 font-bold text-xl"><span className="animate-pulse">Loading Product...</span></div>;
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
  const displayPrice = selectedVariant ? selectedVariant.price : (product.basePrice || product.price || 0);
  const originalPrice = product.compareAtPrice || product.basePrice || (displayPrice > 0 ? Math.round(displayPrice * 1.15) : 0);
  const discountPercent = originalPrice > displayPrice ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0;
  const maxStock = selectedVariant ? selectedVariant.stock : (product.totalStock !== undefined ? product.totalStock : product.stock);
  const isOutOfStock = maxStock <= 0;
  const targetId = selectedVariant ? `${product._id}-${selectedVariant._id}` : product._id;

  const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : (product.image ? [product.image] : []);

  const totalReviewPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE);
  const paginatedReviews = reviews.slice((currentReviewPage - 1) * REVIEWS_PER_PAGE, currentReviewPage * REVIEWS_PER_PAGE);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    
    setCart((prev) => {
      const existing = prev.find(item => item._id === targetId);
      if (existing) {
        if (existing.qty + quantity > maxStock) {
          showToast(`Only ${maxStock} units available.`, 'error');
          return prev;
        }
        return prev.map(item => item._id === targetId ? { ...item, qty: item.qty + quantity } : item);
      }
      
      const itemToAdd = selectedVariant
        ? { ...product, _id: targetId, name: `${product.name} - ${selectedVariant.name}`, basePrice: selectedVariant.price, variants: [], maxStock, image: images[0] }
        : { ...product, maxStock, image: images[0] };
        
      return [...prev, { ...itemToAdd, price: displayPrice, qty: quantity }];
    });
    showToast('Added to cart!');
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    
    let newCart = [...cart];
    const existing = newCart.find(item => item._id === targetId);
    
    if (existing) {
      if (existing.qty + quantity <= maxStock) {
        existing.qty += quantity;
      }
    } else {
      const itemToAdd = selectedVariant
        ? { ...product, _id: targetId, name: `${product.name} - ${selectedVariant.name}`, basePrice: selectedVariant.price, variants: [], maxStock, image: images[0] }
        : { ...product, maxStock, image: images[0] };
      newCart.push({ ...itemToAdd, price: displayPrice, qty: quantity });
    }
    
    setCart(newCart);
    localStorage.setItem('gb_store_cart', JSON.stringify(newCart));
    navigate('/checkout');
  };

  return (
    <StoreLayout store={store} cartCount={cart.length} onCartClick={() => setIsCartOpen(true)}>
      <div className="max-w-7xl mx-auto w-full px-0 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-12">
          
          {/* Left Column: Images */}
          <div className="lg:sticky lg:top-8 lg:h-fit flex gap-4 items-start px-4 sm:px-0">
            {/* Vertical Thumbnails (Desktop) */}
            <div className="hidden lg:flex flex-col space-y-3">
              {images.map((img, index) => (
                <button 
                  key={index} 
                  onClick={() => setActiveImageIndex(index)} 
                  className={`w-20 h-24 rounded-lg overflow-hidden border-2 transition-colors ${activeImageIndex === index ? 'border-[#76b900]' : 'border-gray-200 opacity-70 hover:opacity-100'}`}
                  style={activeImageIndex === index ? { borderColor: primaryColor } : {}}
                >
                  <img src={img} alt={`View ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Main Image Area */}
            <div className="flex-1 w-full">
              <div className="aspect-[2/3] bg-slate-50 rounded-none lg:rounded-xl shadow-lg border border-gray-100 overflow-hidden relative max-w-lg mx-auto group">
                {images.length > 0 ? (
                  <img
                    src={images[activeImageIndex]}
                    alt={product.name}
                    loading="lazy"
                    className="w-full h-full object-cover md:object-contain transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">No Image</div>
                )}

                <button
                  onClick={() => showToast('Share functionality coming soon!', 'success')}
                  aria-label="Share this product"
                  className="absolute top-4 right-4 w-10 h-10 rounded-full shadow-md transition-all duration-200 flex items-center justify-center bg-white text-gray-600 hover:text-blue-500 z-10"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => showToast('Wishlist functionality coming soon!', 'success')}
                  aria-label="Add to wishlist"
                  className="absolute top-16 right-4 w-10 h-10 rounded-full shadow-md transition-all duration-200 flex items-center justify-center bg-white text-gray-600 hover:text-red-500 z-10"
                >
                  <Heart className="w-5 h-5" />
                </button>

                <button
                  className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 hover:text-blue-600 z-10 transition-colors"
                  aria-label="View Full Screen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              
              {/* Mobile Horizontal Thumbnails */}
              {images.length > 1 && (
                <div className="flex lg:hidden gap-3 mt-4 overflow-x-auto pb-2 px-4 snap-x">
                  {images.map((img, index) => (
                    <button 
                      key={index} 
                      onClick={() => setActiveImageIndex(index)} 
                      className={`w-16 h-20 shrink-0 rounded-lg overflow-hidden border-2 transition-all snap-start ${activeImageIndex === index ? 'border-[#76b900]' : 'border-gray-200 opacity-70 hover:opacity-100'}`}
                      style={activeImageIndex === index ? { borderColor: primaryColor } : {}}
                    >
                      <img src={img} alt={`View ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Product Info */}
          <div className="space-y-6 px-4 lg:px-0 mt-4 lg:mt-0 pb-32 lg:pb-0">
            
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
                <div className="flex items-center text-amber-400">
                  {'★'.repeat(Math.floor(product.averageRating || 0))}{'☆'.repeat(5 - Math.floor(product.averageRating || 0))}
              <a href="#reviews" className="text-gray-600 text-sm ml-2 font-medium hover:text-blue-600 hover:underline cursor-pointer">
                    ({product.averageRating || 0}) {product.totalReviews || 0} reviews
              </a>
                </div>
              </div>
              
              {product.description && (
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{product.description}</p>
              )}
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
                <h3 className="font-semibold text-gray-900 mb-3">Select Option</h3>
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

            {/* Mobile / Desktop Action Bar */}
            <div className="fixed bottom-[60px] md:bottom-0 left-0 right-0 bg-white p-3 sm:p-4 border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40 lg:static lg:p-0 lg:border-none lg:shadow-none pb-safe lg:mt-6">
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
                  className="flex-1 bg-white text-blue-600 py-3 px-2 sm:px-4 rounded-xl text-sm sm:text-base font-bold hover:bg-blue-50 transition-colors border-2 border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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

      {/* Custom Toast Notification */}
      {toast && (
        <div className={`fixed top-10 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-3 transition-all animate-fadeIn ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-[#76b900] text-white'}`}>
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          {toast.message}
        </div>
      )}
    </StoreLayout>
  );
};

export default ProductDetails;