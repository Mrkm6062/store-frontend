import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, CheckCircle, Package, UploadCloud, X } from 'lucide-react';
import { useStore } from '../../../services/useStore';
import StoreLayout from '../Layout';
import { ThemeCustomizationContext } from '../../../themeLoader/themeRenderer.jsx';

const compressImage = (file, maxSizeMB = 5) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(file);
    if (file.size <= maxSizeMB * 1024 * 1024) return resolve(file); // Already under max size

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const MAX_DIMENSION = 1600; // Resize heavily if the image is massive
        
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

const WriteReview = () => {
  const { orderId, productId } = useParams();
  const { store, loading: storeLoading } = useStore();
  const customization = useContext(ThemeCustomizationContext);
  const primaryColor = customization?.global?.primaryColor || '#76b900';

  const [order, setOrder] = useState(null);
  const [product, setProduct] = useState(null);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [media, setMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = {
          'x-store-domain': window.location.hostname,
          'x-forwarded-host': window.location.hostname
        };

        // 1. Check if already reviewed
        const checkRes = await fetch(`${API_BASE_URL}/api/reviews/public/check/${orderId}/${productId}`, { headers });
        const checkData = await checkRes.json();
        if (checkData.hasReviewed) {
          setHasReviewed(true);
          setLoading(false);
          return;
        }

        // 2. Fetch Order Details to verify and get customer info & product info
        const orderRes = await fetch(`${API_BASE_URL}/api/public-order/${orderId}`);
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          setOrder(orderData);
          
          const foundProduct = orderData.orderItems?.find(item => item.product === productId || item._id === productId || item.product?._id === productId);
          if (foundProduct) {
             setProduct(foundProduct);
          } else {
             setProduct({ name: 'Product' });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    if (store) {
      fetchData();
    }
  }, [orderId, productId, store, API_BASE_URL]);

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setStatus('Compressing images...');

    const compressedFiles = await Promise.all(files.map(f => compressImage(f, 5))); // Target 5MB

    const uploadData = new FormData();
    uploadData.append('storeId', store._id);
    compressedFiles.forEach(file => uploadData.append('images', file));

    setStatus('Uploading...');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/upload/public`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        if (data.urls) setMedia(prev => [...prev, ...data.urls]);
        setStatus('');
      } else {
        setStatus('Failed to upload images. Ensure files are valid.');
      }
      setUploading(false);
      if (e.target) e.target.value = '';
    };
    xhr.onerror = () => { setStatus('Upload failed due to network error.'); setUploading(false); };
    xhr.send(uploadData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return setStatus('Please select a rating.');
    setSubmitting(true);
    setStatus('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/reviews/public`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-store-domain': window.location.hostname,
          'x-forwarded-host': window.location.hostname
        },
        body: JSON.stringify({
          orderId,
          productId,
          rating,
          review: reviewText,
          customerName: order?.customerName || 'Anonymous',
          reviewImages: media
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setStatus(data.message || 'Failed to submit review');
      }
    } catch (err) {
      setStatus('Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  if (storeLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-green-600 font-bold">Loading...</div>;

  return (
    <StoreLayout store={store} cartCount={0} onCartClick={() => {}}>
      <div className="max-w-2xl mx-auto px-4 py-12 w-full">
        {hasReviewed || success ? (
          <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 text-center">
            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{success ? 'Review Submitted!' : 'Already Reviewed'}</h2>
            <p className="text-slate-500 mb-8">
              {success 
                ? 'Thank you for your feedback. Your review will be visible once approved by the store.' 
                : 'You have already submitted a review for this product.'}
            </p>
            <Link to="/" className="px-8 py-3 text-white font-bold rounded-xl transition shadow-md" style={{ backgroundColor: primaryColor }}>
              Back to Store
            </Link>
          </div>
        ) : (
          <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Write a Review</h2>
            
            {product && (
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 mb-8">
                <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <Package size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 line-clamp-2 leading-snug">{product.name}</p>
                  <p className="text-xs text-slate-500 mt-1">Order: #{orderId.slice(-6).toUpperCase()}</p>
                </div>
              </div>
            )}

            {status && <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-200">{status}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Rate your experience <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star 
                        size={36} 
                        className={`${(hoverRating || rating) >= star ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'} transition-colors`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Add a written review (Optional)</label>
                <textarea 
                  rows="5"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="What did you like or dislike about this product?"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none resize-none transition focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': primaryColor }}
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Attach Photos</label>
                <div className="flex flex-wrap gap-4">
                  {media.map((url, idx) => (
                      <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group shrink-0">
                        <img src={url} className="w-full h-full object-cover" alt="Review Media" />
                        <button type="button" onClick={() => setMedia(media.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                      </div>
                  ))}
                  <label className={`w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-[#76b900] hover:text-[#76b900] transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <UploadCloud size={24} className="mb-1" />
                    <span className="text-xs font-bold">{uploading ? `${uploadProgress}%` : 'Upload'}</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleMediaUpload} disabled={uploading} />
                  </label>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={submitting || uploading || !rating}
                className="w-full py-3.5 text-white font-bold rounded-xl transition shadow-lg disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        )}
      </div>
    </StoreLayout>
  );
};

export default WriteReview;