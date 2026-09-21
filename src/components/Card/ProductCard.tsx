import React from 'react';
import { Heart, ShoppingCart, Star, Eye, Zap } from 'lucide-react';
import type { Product } from '../../data/products';
import { useShop, useAuth } from '../../store/hooks';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
  onNavigate: (page: string, params?: { slug?: string }) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onNavigate }) => {
  const { addToCart, wishlist, toggleWishlist, addToast } = useShop();
  const { isAuthenticated, openLoginModal } = useAuth();

  const isWishlisted = wishlist.includes(product.id);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      addToast('Please log in to add items to your cart.', 'warning');
      openLoginModal();
      return;
    }
    if (!product.inStock) {
      addToast(`${product.name} is out of stock.`, 'warning');
      return;
    }
    // Add default first color
    addToCart(product, product.colors[0], product.sizes ? product.sizes[0] : undefined);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      addToast('Please log in to purchase this item.', 'warning');
      openLoginModal();
      return;
    }
    if (!product.inStock) {
      addToast(`${product.name} is out of stock.`, 'warning');
      return;
    }
    addToCart(product, product.colors[0], product.sizes ? product.sizes[0] : undefined);
    onNavigate('checkout');
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleDetailsNavigate = () => {
    onNavigate('product-detail', { slug: product.slug });
  };

  return (
    <div className="product-card glass-panel" onClick={handleDetailsNavigate}>
      
      {/* Badge overlay */}
      <div className="product-card-badges">
        {!product.inStock && <span className="card-badge badge-out">Out of Stock</span>}
        {product.inStock && product.onSale && <span className="card-badge badge-sale">Sale</span>}
      </div>

      {/* Image Gallery Container */}
      <div className="product-card-image-wrapper">
        <img 
          src={product.images[0]} 
          alt={product.name} 
          className="product-card-img" 
          loading="lazy"
        />
        
        {/* Hover action bar */}
        <div className="product-card-hover-actions">
          <button 
            className="card-action-btn"
            onClick={handleQuickAdd}
            disabled={!product.inStock}
            title="Quick Add to Cart"
          >
            <ShoppingCart size={18} />
          </button>
          <button 
            className="card-action-btn card-action-buy"
            onClick={handleBuyNow}
            disabled={!product.inStock}
            title="Buy Now"
          >
            <Zap size={18} />
          </button>
          <button 
            className="card-action-btn"
            onClick={(e) => { e.stopPropagation(); handleDetailsNavigate(); }}
            title="View Details"
          >
            <Eye size={18} />
          </button>
        </div>
      </div>

      {/* Product Information */}
      <div className="product-card-info">
        <span className="product-card-category">{product.category}</span>
        
        <h3 className="product-card-name" title={product.name}>
          {product.name}
        </h3>
        
        {/* Rating and count */}
        <div className="product-card-rating">
          <div className="stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star 
                key={i} 
                size={14} 
                fill={i < Math.floor(product.rating) ? "var(--primary)" : "none"} 
                stroke={i < Math.floor(product.rating) ? "var(--primary)" : "var(--text-muted)"}
              />
            ))}
          </div>
          <span className="reviews-count">({product.reviewCount})</span>
        </div>

        {/* Pricing & Cart/Buy Button */}
        <div className="product-card-footer">
          <div className="product-card-price-wrapper">
            <span className="current-price">${product.price.toFixed(2)}</span>
            {product.originalPrice && (
              <span className="original-price">${product.originalPrice.toFixed(2)}</span>
            )}
          </div>
          
          <div className="product-card-footer-actions">
            <button
              className="card-buy-now-btn"
              onClick={handleBuyNow}
              disabled={!product.inStock}
              title="Buy Now Instantly"
            >
              <Zap size={13} /> Buy Now
            </button>
            <button 
              className={`card-wishlist-toggle ${isWishlisted ? 'active' : ''}`}
              onClick={handleWishlistToggle}
              title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
            >
              <Heart size={18} fill={isWishlisted ? "var(--primary)" : "none"} />
            </button>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default ProductCard;
