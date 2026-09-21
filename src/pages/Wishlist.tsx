import React from 'react';
import { useShop } from '../store/hooks';
import { ProductCard } from '../components/Card/ProductCard';
import { Heart } from 'lucide-react';
import './Wishlist.css';

interface WishlistProps {
  onNavigate: (page: string, params?: { slug?: string }) => void;
}

export const Wishlist: React.FC<WishlistProps> = ({ onNavigate }) => {
  const { wishlist, products } = useShop();

  const wishlistedProducts = products.filter(p => wishlist.includes(p.id));

  return (
    <div className="wishlist-page-container container">
      <div className="wishlist-header">
        <h1 className="gradient-text"><Heart className="heart-inline-icon" size={32} fill="var(--primary)" /> Saved Wishlist</h1>
        <p>Products you have marked to keep track of for future purchasing.</p>
      </div>

      {wishlistedProducts.length === 0 ? (
        <div className="wishlist-empty-state glass-panel">
          <div className="empty-heart-anim">🤍</div>
          <h3>Your wishlist is currently empty</h3>
          <p>Add products to your wishlist by clicking the heart icon on cards or detail pages.</p>
          <button className="btn btn-primary" onClick={() => onNavigate('shop')}>
            Browse Products
          </button>
        </div>
      ) : (
        <div className="grid-products">
          {wishlistedProducts.map((p) => (
            <ProductCard key={p.id} product={p} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
