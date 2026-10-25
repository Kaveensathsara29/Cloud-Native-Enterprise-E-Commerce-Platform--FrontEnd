import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Monitor, ShieldCheck, Zap } from 'lucide-react';
import { useShop } from '../store/hooks';
import { ProductCard } from '../components/Card/ProductCard';
import './Home.css';

interface HomeProps {
  onNavigate: (page: string, params?: { slug?: string }) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { products } = useShop();
  const featuredProducts = products.filter((product) => product.featured);
  const trendingProducts = featuredProducts.length >= 3
    ? featuredProducts.slice(0, 6)
    : [...products].sort((a, b) => b.rating - a.rating).slice(0, 6);
  
  // Real-time Countdown Timer for Deal of the Day
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 42, seconds: 9 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          clearInterval(timer);
          return prev;
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (num: number) => num.toString().padStart(2, '0');

  const categories = [
    { name: 'Electronics', count: 4, icon: <Monitor size={24} />, class: 'cat-elec', slug: 'Electronics' },
    { name: 'Premium Apparel', count: 2, icon: <Zap size={24} />, class: 'cat-apparel', slug: 'Apparel' },
    { name: 'Accessories', count: 3, icon: <Sparkles size={24} />, class: 'cat-acc', slug: 'Accessories' }
  ];

  return (
    <div className="home-page-container">
      
      {/* 1. Parallax Hero Section */}
      <section className="hero-section container">
        <div className="hero-grid">
          
          {/* Hero Left Content */}
          <motion.div 
            className="hero-content"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="hero-badge">
              <Sparkles size={16} className="sparkle-icon" />
              <span>STREETWEAR &amp; TECH SPECS</span>
            </div>
            
            <h1 className="hero-title">
              Upgrade Your <span className="gradient-text">Workspace</span> &amp; Style.
            </h1>
            
            <p className="hero-subtitle">
              Discover a curated gallery of high-level electronics, performance apparel, and sleek waterproof gear finished in clean whites and electric master accents.
            </p>
            
            <div className="hero-cta-buttons">
              <button className="btn btn-primary" onClick={() => onNavigate('shop')}>
                Explore Shop <ArrowRight size={18} />
              </button>
              <button className="btn btn-secondary" onClick={() => onNavigate('shop')}>
                View Lookbook
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="hero-metrics">
              <div className="metric-item">
                <h3>8+</h3>
                <p>Premium Items</p>
              </div>
              <div className="metric-divider"></div>
              <div className="metric-item">
                <h3>100%</h3>
                <p>Carbon Neutral</p>
              </div>
              <div className="metric-divider"></div>
              <div className="metric-item">
                <h3>4.8★</h3>
                <p>Average Rating</p>
              </div>
            </div>
          </motion.div>

          {/* Hero Right Banner Artwork with Mouse Parallax feel */}
          <motion.div 
            className="hero-banner-art"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <div className="hero-art-backdrop"></div>
            
            {/* Main floating product frame */}
            <motion.div 
              className="floating-card smartwatch-card glass-panel"
              animate={{ y: [0, -12, 0] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
            >
              <img src="/assets/products/smartwatch.png" alt="Featured Watch" className="art-img" />
              <div className="art-info">
                <h4>Chronos Active</h4>
                <p>$189.99 <span className="discount-pill">-17%</span></p>
              </div>
            </motion.div>

            {/* Minor floating accents */}
            <motion.div 
              className="floating-card accessories-card glass-panel"
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 0.5 }}
            >
              <img src="/assets/products/backpack.png" alt="Waterproof backpack" className="art-img-small" />
              <span>Rolltop IPX-6</span>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* 2. Responsive Categories Section */}
      <section className="categories-section container">
        <h2 className="section-title">Shop by Category</h2>
        <p className="section-subtitle">Specially curated collections built around specific functional needs.</p>
        
        <div className="categories-grid">
          {categories.map((cat, idx) => (
            <motion.div 
              key={cat.name}
              className={`category-card ${cat.class} glass-panel`}
              whileHover={{ y: -8, scale: 1.02 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              onClick={() => onNavigate('shop')}
            >
              <div className="cat-icon-circle">{cat.icon}</div>
              <div className="cat-details">
                <h3>{cat.name}</h3>
                <span className="count-label">{cat.count} Products</span>
              </div>
              <ArrowRight className="cat-arrow" size={20} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3. Promo Banner with Countdown (Daily Deal) */}
      <section className="deal-of-the-day-section container">
        <div className="deal-banner glass-panel">
          <div className="deal-banner-content">
            <span className="deal-badge"><ShieldCheck size={14} /> DEAL OF THE DAY</span>
            <h2>Get 20% Off on Chronos Smartwatch</h2>
            <p>Experience advanced health metrics, AMOLED colors, and dynamic GPS tracking with our white-and-master theme favorite.</p>
            
            {/* Timer Displays */}
            <div className="countdown-timer-wrapper">
              <div className="timer-block">
                <span className="timer-val">{formatTime(timeLeft.hours)}</span>
                <span className="timer-unit">Hours</span>
              </div>
              <span className="timer-colon">:</span>
              <div className="timer-block">
                <span className="timer-val">{formatTime(timeLeft.minutes)}</span>
                <span className="timer-unit">Mins</span>
              </div>
              <span className="timer-colon">:</span>
              <div className="timer-block animate-pulse">
                <span className="timer-val">{formatTime(timeLeft.seconds)}</span>
                <span className="timer-unit">Secs</span>
              </div>
            </div>

            <div className="deal-buttons">
              <button 
                className="btn btn-primary"
                onClick={() => onNavigate('product-detail', { slug: 'chronos-active-smartwatch' })}
              >
                Claim Deal Now
              </button>
              <div className="coupon-hint">Use code <strong>ABCDE20</strong> at checkout</div>
            </div>
          </div>
          
          <div className="deal-banner-image">
            <img src="/assets/products/smartwatch.png" alt="Deal of the day" className="deal-img" />
          </div>
        </div>
      </section>

      {/* 4. Featured & Trending Catalog Slider */}
      <section className="trending-catalog container">
        <div className="trending-header">
          <div>
            <h2 className="section-title">Trending Now</h2>
            <p className="section-subtitle">Our top rated gear and items for this month.</p>
          </div>
          <button className="btn btn-outline" onClick={() => onNavigate('shop')}>
            View All Catalog
          </button>
        </div>

        <div className="grid-products trending-grid">
          {trendingProducts.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onNavigate={onNavigate} 
            />
          ))}
        </div>
      </section>

    </div>
  );
};

export default Home;
