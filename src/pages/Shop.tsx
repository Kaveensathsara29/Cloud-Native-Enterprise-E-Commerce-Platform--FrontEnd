import React, { useState, useMemo } from 'react';
import { useShop, useAuth } from '../store/hooks';
import { ProductCard } from '../components/Card/ProductCard';
import { Grid, List, SlidersHorizontal, RotateCcw, Star, Zap } from 'lucide-react';
import './Shop.css';

interface ShopProps {
  onNavigate: (page: string, params?: { slug?: string }) => void;
}

export const Shop: React.FC<ShopProps> = ({ onNavigate }) => {
  const { products, addToCart, addToast } = useShop();
  const { isAuthenticated, openLoginModal } = useAuth();

  const handleListBuyNow = (e: React.MouseEvent, product: any) => {
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

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showInStockOnly, setShowInStockOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Categories list extraction
  const categoriesList = useMemo(() => {
    const list = new Set(products.map(p => p.category));
    return ['All', ...Array.from(list)];
  }, [products]);

  const catalogMaxPrice = useMemo(
    () => Math.max(300, ...products.map((product) => product.price)),
    [products]
  );

  // Filter Logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        const matchesPrice = maxPrice === null || p.price <= maxPrice;
        const matchesRating = p.rating >= minRating;
        const matchesStock = !showInStockOnly || p.inStock;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesCategory && matchesPrice && matchesRating && matchesStock && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        // relevance / default
        return 0;
      });
  }, [products, selectedCategory, maxPrice, minRating, sortBy, showInStockOnly, searchQuery]);

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setMaxPrice(null);
    setMinRating(0);
    setSortBy('relevance');
    setShowInStockOnly(false);
    setSearchQuery('');
  };

  return (
    <div className="shop-page-container container">

      {/* 1. Header Banner */}
      <div className="shop-header">
        <h1 className="gradient-text">Product Catalog</h1>
        <p>Explore high-fidelity items engineered with premium design principles.</p>
      </div>

      {/* 2. Shop Main Grid Layout (Sidebar Filters + Catalog) */}
      <div className="shop-main-layout">

        {/* Left Side Filters Sidebar */}
        <aside className="shop-sidebar-filters glass-panel">
          <div className="sidebar-header">
            <h3><SlidersHorizontal size={18} /> Filters</h3>
            <button className="reset-filters-btn" onClick={handleResetFilters}>
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          {/* Search Query inside filter bar */}
          <div className="filter-group">
            <h4>Search</h4>
            <input
              type="text"
              placeholder="Search catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input filter-search-input"
            />
          </div>

          {/* Categories Selector */}
          <div className="filter-group">
            <h4>Categories</h4>
            <div className="filter-choices">
              {categoriesList.map((cat) => (
                <label key={cat} className="filter-choice-label">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === cat}
                    onChange={() => setSelectedCategory(cat)}
                  />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range Slider */}
          <div className="filter-group">
            <div className="price-slider-headers">
              <h4>Max Price</h4>
              <span className="price-bubble">{maxPrice === null ? 'All' : `$${maxPrice}`}</span>
            </div>
            <input
              type="range"
              min="0"
              max={catalogMaxPrice}
              step="10"
              value={maxPrice ?? catalogMaxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="price-range-slider"
            />
            <div className="price-slider-limits">
              <span>$0</span>
              <span>${catalogMaxPrice}</span>
            </div>
          </div>

          {/* Ratings Radio Buttons */}
          <div className="filter-group">
            <h4>Min Rating</h4>
            <div className="filter-choices">
              {[0, 4, 4.5].map((stars) => (
                <label key={stars} className="filter-choice-label">
                  <input
                    type="radio"
                    name="rating"
                    checked={minRating === stars}
                    onChange={() => setMinRating(stars)}
                  />
                  <span>
                    {stars === 0 ? 'All Ratings' : `${stars} ★ & Above`}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Stock toggle */}
          <div className="filter-group">
            <label className="checkbox-filter-label">
              <input
                type="checkbox"
                checked={showInStockOnly}
                onChange={(e) => setShowInStockOnly(e.target.checked)}
              />
              <span>In Stock Only</span>
            </label>
          </div>
        </aside>

        {/* Right Side Catalog */}
        <main className="shop-catalog-area">

          {/* Top Actions Row */}
          <div className="catalog-actions-bar glass-panel">
            <span className="items-count">
              Showing <strong>{filteredProducts.length}</strong> items
            </span>

            <div className="catalog-actions-controls">

              {/* Sorter */}
              <div className="sorter-wrapper">
                <select
                  className="form-input sorter-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="relevance">Sort by Relevance</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                </select>
              </div>

              {/* View toggle (Grid/List) */}
              <div className="view-mode-toggle">
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  <Grid size={18} />
                </button>
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List View"
                >
                  <List size={18} />
                </button>
              </div>

            </div>
          </div>

          {/* Products Grid / List */}
          {filteredProducts.length === 0 ? (
            <div className="no-matches-found glass-panel">
              <div className="no-matches-icon">🔍</div>
              <h3>No products matched your filters</h3>
              <p>Try easing up on your filters, raising your maximum price, or resetting search keywords.</p>
              <button className="btn btn-primary" onClick={handleResetFilters}>
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className={`catalog-list-view ${viewMode === 'list' ? 'mode-list' : 'mode-grid'}`}>
              {filteredProducts.map((product) => (
                <div key={product.id} className="catalog-item-container">
                  {viewMode === 'grid' ? (
                    <ProductCard
                      product={product}
                      onNavigate={onNavigate}
                    />
                  ) : (
                    // Beautiful custom list view card
                    <div className="product-list-card glass-panel" onClick={() => onNavigate('product-detail', { slug: product.slug })}>
                      <img src={product.images[0]} alt={product.name} className="list-card-img" />
                      <div className="list-card-details">
                        <span className="list-card-cat">{product.category}</span>
                        <h3>{product.name}</h3>
                        <p>{product.description}</p>

                        <div className="list-card-rating">
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
                          <span>({product.reviewCount} Reviews)</span>
                        </div>
                      </div>

                      <div className="list-card-price-action">
                        <span className="list-card-price">${product.price.toFixed(2)}</span>
                        {product.originalPrice && (
                          <span className="list-card-orig-price">${product.originalPrice.toFixed(2)}</span>
                        )}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={(e) => handleListBuyNow(e, product)}
                          >
                            <Zap size={14} /> Buy Now
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('product-detail', { slug: product.slug });
                            }}
                          >
                            View details
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </main>

      </div>

    </div>
  );
};

export default Shop;
