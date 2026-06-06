import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../../../services/useStore';
import { useProducts } from '../../../services/useProducts';
import StoreLayout from '../Layout';
import { Star, ShoppingCart, Zap, ArrowLeft, Plus, Minus, PackageX, Home, ChevronRight } from 'lucide-react';
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
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <nav className="flex items-center text-sm font-medium text-slate-500 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <Link to="/" className="hover:text-slate-800 transition-colors flex items-center gap-1.5 shrink-0">
            <Home size={16} /> Home
          </Link>
          <ChevronRight size={14} className="mx-2 shrink-0 opacity-40" />
          {(categoryData || product.categoryName) && (
            <>
              {categoryData ? (
                <Link to={`/category/${categoryData.slug || categoryData._id}`} className="hover:text-slate-800 transition-colors truncate max-w-[150px] sm:max-w-xs shrink-0">{categoryData.name}</Link>
              ) : (
                <span className="truncate max-w-[150px] sm:max-w-xs shrink-0">{product.categoryName}</span>
              )}
              <ChevronRight size={14} className="mx-2 shrink-0 opacity-40" />
            </>
          )}
          <span className="text-slate-800 font-bold truncate max-w-[200px] sm:max-w-md shrink-0">{product.name}</span>
        </nav>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 p-6 md:p-10">
            
            {/* Left: Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-square w-full rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                {images.length > 0 ? (
                  <img src={images[activeImageIndex]} alt={product.name} className="w-full h-full object-contain mix-blend-multiply p-4" />
                ) : (
                  <span className="text-slate-300 font-medium">No Image Available</span>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                  {images.map((img, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all snap-start ${activeImageIndex === idx ? 'border-[#76b900]' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      style={activeImageIndex === idx ? { borderColor: primaryColor } : {}}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product Details */}
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{categoryName || product.categoryName || 'Product'}</span>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 leading-tight">{product.name}</h1>
              
              <div className="flex items-center gap-3 mb-6">
                {product.averageRating > 0 ? (
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                    <Star size={16} className="fill-amber-400 text-amber-400" />
                    <span className="font-bold text-amber-700 text-sm">{Number(product.averageRating).toFixed(1)}</span>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">No ratings yet</div>
                )}
                <a href="#reviews" className="text-sm font-medium text-blue-500 hover:underline">{product.totalReviews || 0} Reviews</a>
              </div>

              <div className="flex items-end gap-3 mb-8 pb-8 border-b border-slate-100">
                <span className="text-4xl font-black text-slate-900">₹{displayPrice}</span>
                {discountPercent > 0 && (
                  <>
                    <span className="text-xl text-slate-400 line-through font-medium mb-1">₹{originalPrice}</span>
                    <span className="text-sm font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg mb-1">{discountPercent}% OFF</span>
                  </>
                )}
              </div>

              {hasVariants && (
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Available Options</label>
                  <div className="flex flex-wrap gap-3">
                    {product.variants.map(v => (
                      <button 
                        key={v._id} 
                        onClick={() => setSelectedVariantId(v._id)}
                        className={`px-4 py-2 border-2 rounded-xl text-sm font-bold transition-all ${selectedVariantId === v._id ? 'border-[#76b900] bg-green-50 text-green-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                        style={selectedVariantId === v._id ? { borderColor: primaryColor, backgroundColor: `${primaryColor}15`, color: primaryColor } : {}}
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-2">Quantity</label>
                <div className="flex items-center w-fit border border-slate-200 rounded-xl bg-slate-50 h-12">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-full flex items-center justify-center text-slate-500 hover:text-slate-800 transition"><Minus size={18} /></button>
                  <span className="w-12 text-center font-bold text-slate-800">{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(maxStock, quantity + 1))} className="w-12 h-full flex items-center justify-center text-slate-500 hover:text-slate-800 transition"><Plus size={18} /></button>
                </div>
                <p className="text-xs text-slate-400 mt-2">{maxStock > 0 ? `${maxStock} units left in stock` : 'Out of stock'}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mt-auto">
                <button 
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  <ShoppingCart size={20} /> Add to Cart
                </button>
                <button 
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="flex-1 py-4 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Zap size={20} /> Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Product Description */}
        {product.description && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-10 mb-12">
            <h3 className="text-2xl font-bold text-slate-800 mb-6">Product Description</h3>
            <div className="prose max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
              {product.description}
            </div>
          </div>
        )}

        {/* Top Reviews Section */}
        <div id="reviews" className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-100 pb-6">
            <h3 className="text-2xl font-bold text-slate-800">Customer Reviews</h3>
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <Star className="fill-amber-400 text-amber-400" size={24} />
              <span className="text-2xl font-black text-slate-800">{Number(product.averageRating || 0).toFixed(1)}</span>
              <span className="text-sm font-medium text-slate-500">({product.totalReviews || 0} reviews)</span>
            </div>
          </div>
          
          {loadingReviews ? (
            <div className="py-10 text-center text-slate-400 font-bold animate-pulse">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="bg-slate-50 p-10 rounded-2xl border border-slate-100 text-center flex flex-col items-center">
              <Star size={48} className="text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">No reviews yet. Check back later after customers receive their orders!</p>
            </div>
          ) : (
            <>
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
                          <a key={idx} href={media} target="_blank" rel="noreferrer" className="block w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:opacity-80 transition">
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
            </>
          )}
        </div>
      </div>

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