import React, { useState, useEffect, useMemo } from 'react';
import { useShop, useAuth } from '../store/hooks';
import { Star, Heart, ShoppingBag, ArrowLeft, Plus, Minus, Check, MessageSquare, Zap } from 'lucide-react';
import type { Review } from '../data/products';
import { ProductCard } from '../components/Card/ProductCard';
import './ProductDetail.css';

interface ProductDetailProps {
  productSlug: string;
  onNavigate: (page: string, params?: { slug?: string }) => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ productSlug, onNavigate }) => {
  const { products, addToCart, wishlist, toggleWishlist, addToast } = useShop();
  const { isAuthenticated, openLoginModal } = useAuth();

  // Find product by slug
  const product = useMemo(() => {
    return products.find((p) => p.slug === productSlug);
  }, [products, productSlug]);

  // Gallery Active Image
  const [activeImage, setActiveImage] = useState(product?.images[0] || '');
  
  // Options State
  const [selectedColor, setSelectedColor] = useState(product?.colors[0] || { name: 'Default', hex: '#FF6B00' });
  const [selectedSize, setSelectedSize] = useState(product?.sizes ? product.sizes[0] : undefined);
  const [quantity, setQuantity] = useState(1);
  
  // Tabs State (description / specs / reviews)
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'reviews'>('desc');
  
  // Write Review Form States
  const [reviewsList, setReviewsList] = useState<Review[]>(product?.reviews || []);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Update active states when product changes
  useEffect(() => {
    if (product) {
      setActiveImage(product.images[0]);
      setSelectedColor(product.colors[0]);
      setSelectedSize(product.sizes ? product.sizes[0] : undefined);
      setQuantity(1);
      setReviewsList(product.reviews);
    }
  }, [product]);

  // Math reviews averages
  const averageRating = useMemo(() => {
    if (!product) return 5;
    if (reviewsList.length === 0) return product.rating;
    const sum = reviewsList.reduce((acc, r) => acc + r.rating, 0);
    return Number((sum / reviewsList.length).toFixed(1));
  }, [reviewsList, product]);

  // Related products
  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter((p) => p.category === product.category && p.id !== product.id)
      .slice(0, 3);
  }, [products, product]);

  if (!product) {
    return (
      <div className="product-not-found container">
        <h2>Product Not Found</h2>
        <p>The product you are trying to view does not exist or has been removed.</p>
        <button className="btn btn-primary" onClick={() => onNavigate('shop')}>
          Back to Shop
        </button>
      </div>
    );
  }

  const isWishlisted = wishlist.includes(product.id);

  // Handle Cart Injection
  const handleAddToCart = () => {
    if (!isAuthenticated) {
      addToast('Please log in to add items to your cart.', 'warning');
      openLoginModal();
      return;
    }
    addToCart(product, selectedColor, selectedSize, quantity);
  };

  // Handle Direct Buy Now
  const handleBuyNow = () => {
    if (!isAuthenticated) {
      addToast('Please log in to purchase this item.', 'warning');
      openLoginModal();
      return;
    }
    addToCart(product, selectedColor, selectedSize, quantity);
    onNavigate('checkout');
  };

  // Review Form Submit Handler
  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) return;

    const newReview: Review = {
      id: "rev_" + Math.random().toString(36).substring(2, 9),
      userName: reviewName,
      rating: reviewRating,
      date: new Date().toISOString().split('T')[0],
      comment: reviewComment
    };

    setReviewsList((prev) => [newReview, ...prev]);
    setReviewName('');
    setReviewComment('');
    setReviewRating(5);
  };

  return (
    <div className="product-detail-container container">
      
      {/* Back button */}
      <button className="back-btn" onClick={() => onNavigate('shop')}>
        <ArrowLeft size={16} /> Back to Shop
      </button>

      {/* Main product columns */}
      <div className="product-detail-grid">
        
        {/* Left column: Image Showcase */}
        <div className="product-detail-gallery">
          <div className="main-image-panel glass-panel">
            <img src={activeImage} alt={product.name} className="gallery-main-img" />
          </div>
          
          {/* Thumbnails row */}
          {product.images.length > 1 && (
            <div className="gallery-thumbnails-row">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  className={`thumb-btn glass-panel ${activeImage === img ? 'active' : ''}`}
                  onClick={() => setActiveImage(img)}
                >
                  <img src={img} alt={`${product.name} thumb ${idx}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Configurations Area */}
        <div className="product-detail-buy-box">
          <span className="product-cat-tag">{product.category}</span>
          <h1 className="product-name">{product.name}</h1>

          {/* Rating */}
          <div className="product-rating-stats">
            <div className="stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  fill={i < Math.floor(averageRating) ? "var(--primary)" : "none"}
                  stroke={i < Math.floor(averageRating) ? "var(--primary)" : "var(--text-muted)"}
                />
              ))}
            </div>
            <span className="stat-text">
              <strong>{averageRating}</strong> ({reviewsList.length} reviews)
            </span>
          </div>

          {/* Pricing */}
          <div className="product-price-box">
            <span className="current-price">${product.price.toFixed(2)}</span>
            {product.originalPrice && (
              <>
                <span className="original-price">${product.originalPrice.toFixed(2)}</span>
                <span className="save-badge">
                  Save ${(product.originalPrice - product.price).toFixed(2)}
                </span>
              </>
            )}
          </div>

          <p className="product-short-desc">{product.description}</p>

          {/* Color Selector */}
          <div className="buy-option-group">
            <h4 className="option-title">Color: <strong>{selectedColor.name}</strong></h4>
            <div className="colors-palette">
              {product.colors.map((c) => (
                <button
                  key={c.hex}
                  className={`color-bubble-btn ${selectedColor.hex === c.hex ? 'active' : ''}`}
                  onClick={() => setSelectedColor(c)}
                  style={{ '--color-hex': c.hex } as React.CSSProperties}
                  title={c.name}
                >
                  {selectedColor.hex === c.hex && <Check size={14} className="color-check-icon" />}
                </button>
              ))}
            </div>
          </div>

          {/* Size Selector */}
          {product.sizes && (
            <div className="buy-option-group">
              <h4 className="option-title">Size: <strong>{selectedSize}</strong></h4>
              <div className="sizes-palette">
                {product.sizes.map((sz) => (
                  <button
                    key={sz}
                    className={`size-bubble-btn ${selectedSize === sz ? 'active' : ''}`}
                    onClick={() => setSelectedSize(sz)}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="buy-actions-row">
            
            {/* Quantity */}
            <div className="quantity-adjuster">
              <button 
                className="adjust-btn"
                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
              >
                <Minus size={16} />
              </button>
              <span className="adjust-val">{quantity}</span>
              <button 
                className="adjust-btn"
                onClick={() => setQuantity(prev => prev + 1)}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Cart Button */}
            <button 
              className="btn btn-secondary buy-cart-btn"
              onClick={handleAddToCart}
              disabled={!product.inStock}
            >
              <ShoppingBag size={20} />
              {product.inStock ? 'Add to Cart' : 'Out of Stock'}
            </button>

            {/* Direct Buy Now Button */}
            <button 
              className="btn btn-primary buy-now-direct-btn"
              onClick={handleBuyNow}
              disabled={!product.inStock}
            >
              <Zap size={20} />
              {product.inStock ? 'Buy Now' : 'Out of Stock'}
            </button>

            {/* Wishlist Button */}
            <button
              className={`buy-wishlist-btn ${isWishlisted ? 'active' : ''}`}
              onClick={() => toggleWishlist(product.id)}
              title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
            >
              <Heart size={20} fill={isWishlisted ? "var(--primary)" : "none"} />
            </button>

          </div>

          {/* Dynamic availability tag */}
          <div className="stock-status-wrapper">
            <span className={`stock-status-bullet ${product.inStock ? 'in-stock' : 'out-stock'}`}></span>
            <span className="stock-status-text">
              {product.inStock ? 'Items available in warehouse (Ready to ship)' : 'Temporarily unavailable'}
            </span>
          </div>

        </div>

      </div>

      {/* TABS (Description, Specs, Reviews) */}
      <section className="tabs-container">
        
        {/* Nav list */}
        <div className="tabs-nav-bar">
          <button 
            className={`tab-nav-btn ${activeTab === 'desc' ? 'active' : ''}`}
            onClick={() => setActiveTab('desc')}
          >
            Description
          </button>
          <button 
            className={`tab-nav-btn ${activeTab === 'specs' ? 'active' : ''}`}
            onClick={() => setActiveTab('specs')}
          >
            Specifications
          </button>
          <button 
            className={`tab-nav-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            Customer Reviews ({reviewsList.length})
          </button>
        </div>

        {/* Tab contents window */}
        <div className="tab-contents-window glass-panel">
          
          {/* Tab 1: Description */}
          {activeTab === 'desc' && (
            <div className="tab-panel-content animate-fade">
              <h3>Product Overview</h3>
              <p>{product.longDescription}</p>
            </div>
          )}

          {/* Tab 2: Specifications */}
          {activeTab === 'specs' && (
            <div className="tab-panel-content animate-fade">
              <h3>Technical Details</h3>
              <table className="specs-table">
                <tbody>
                  {Object.entries(product.specs).map(([key, val]) => (
                    <tr key={key}>
                      <td className="spec-key">{key}</td>
                      <td className="spec-val">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Reviews */}
          {activeTab === 'reviews' && (
            <div className="tab-panel-content reviews-tab-panel animate-fade">
              
              {/* Form and Stats columns */}
              <div className="reviews-grid">
                
                {/* List items columns */}
                <div className="reviews-list-col">
                  {reviewsList.length === 0 ? (
                    <div className="no-reviews-state">
                      <MessageSquare size={36} className="msg-icon" />
                      <p>No reviews yet. Be the first to review this product!</p>
                    </div>
                  ) : (
                    <div className="reviews-list-stack">
                      {reviewsList.map((rev) => (
                        <div key={rev.id} className="review-comment-card">
                          <div className="review-card-header">
                            <div>
                              <h4>{rev.userName}</h4>
                              <span className="review-date">{rev.date}</span>
                            </div>
                            <div className="stars">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={12}
                                  fill={i < rev.rating ? "var(--primary)" : "none"}
                                  stroke={i < rev.rating ? "var(--primary)" : "var(--text-muted)"}
                                />
                              ))}
                            </div>
                          </div>
                          <p>{rev.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit review column */}
                <div className="write-review-col glass-panel">
                  <h3>Write a Review</h3>
                  
                  <form className="review-form-element" onSubmit={handleReviewSubmit}>
                    
                    <div className="form-group">
                      <label>Name</label>
                      <input
                        type="text"
                        placeholder="Your name"
                        value={reviewName}
                        onChange={(e) => setReviewName(e.target.value)}
                        required
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Rating</label>
                      <div className="form-rating-stars">
                        {[1, 2, 3, 4, 5].map((stars) => (
                          <button
                            key={stars}
                            type="button"
                            className="rating-star-btn"
                            onClick={() => setReviewRating(stars)}
                          >
                            <Star
                              size={20}
                              fill={stars <= reviewRating ? "var(--primary)" : "none"}
                              stroke={stars <= reviewRating ? "var(--primary)" : "var(--text-muted)"}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Comment</label>
                      <textarea
                        rows={4}
                        placeholder="Write your thoughts..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        required
                        className="form-input textarea-field"
                      ></textarea>
                    </div>

                    <button type="submit" className="btn btn-primary submit-review-btn">
                      Submit Review
                    </button>
                  </form>
                </div>

              </div>

            </div>
          )}

        </div>

      </section>

      {/* RELATED PRODUCTS */}
      {relatedProducts.length > 0 && (
        <section className="related-products-section">
          <h2 className="related-title">You May Also Like</h2>
          <div className="grid-products">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
};

export default ProductDetail;
