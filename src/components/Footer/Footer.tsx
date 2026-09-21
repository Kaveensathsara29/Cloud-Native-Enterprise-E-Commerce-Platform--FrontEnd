import React, { useState } from 'react';
import { Send, Shield, Truck, RotateCcw, Lock } from 'lucide-react';
import { useShop } from '../../store/hooks';
import { Link } from 'react-router-dom';
import './Footer.css';

export const Footer: React.FC = () => {
  const { addToast } = useShop();
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      addToast(`Subscribed! Expect custom discounts at ${email}`, 'success');
      setEmail('');
    }
  };

  return (
    <footer className="footer-area">

      {/* Trust Badges Bar */}
      <div className="footer-trust-badges container">
        <div className="trust-badge-item">
          <Truck className="badge-icon" size={24} />
          <div className="badge-text">
            <h4>Free Shipping</h4>
            <p>On all orders above $150</p>
          </div>
        </div>
        <div className="trust-badge-item">
          <RotateCcw className="badge-icon" size={24} />
          <div className="badge-text">
            <h4>30 Days Returns</h4>
            <p>No questions asked policy</p>
          </div>
        </div>
        <div className="trust-badge-item">
          <Shield className="badge-icon" size={24} />
          <div className="badge-text">
            <h4>Secure Payments</h4>
            <p>SSL encrypted checkout</p>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="footer-main-grid container">

        {/* Brand Bio */}
        <div className="footer-column brand-bio">
          <div className="navbar-logo">
            <span className="logo-white">MASTER</span>
            <span className="logo-dot">.</span>
            <span className="logo-orange">NET</span>
          </div>
          <p className="brand-statement">
            A premium collection of high-tech gear, apparel, and lifestyle accessories designed to fit seamlessly into the modern minimalist workflow.
          </p>
          <div className="social-links-row">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="social-circle-link" aria-label="GitHub">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-circle-link" aria-label="Twitter">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
              </svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-circle-link" aria-label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
          </div>
        </div>

        {/* Categories Directory */}
        <div className="footer-column">
          <h3>Shop Catalog</h3>
          <ul className="footer-links-list">
            <li><a href="#electronics">Electronics</a></li>
            <li><a href="#apparel">Premium Apparel</a></li>
            <li><a href="#accessories">Accessories</a></li>
            <li><a href="#decor">Home Decor</a></li>
          </ul>
        </div>

        {/* Company Links */}
        <div className="footer-column">
          <h3>Company</h3>
          <ul className="footer-links-list">
            <li><a href="#about">About Us</a></li>
            <li><a href="#careers">Careers</a></li>
          </ul>
        </div>

        {/* Newsletter Section */}
        <div className="footer-column newsletter-col">
          <h3>Newsletter</h3>
          <p>Subscribe to receive customized alerts, new product launches, and exclusive master discount coupons.</p>
          <form className="newsletter-form" onSubmit={handleSubscribe}>
            <div className="newsletter-input-wrapper">
              <input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input newsletter-input"
              />
              <button type="submit" className="newsletter-submit-btn" aria-label="Subscribe">
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Bottom Legal / Copyright Area */}
      <div className="footer-bottom">
        <div className="footer-bottom-flex container">
          <span className="copyright-text">
            © {new Date().getFullYear()} MASTER.NET. All rights reserved.<br />
            <h5 className='dev'>Developed by KAVEEN SATHSARA.</h5>
          </span>
          <Link to="/admin/login" className="footer-admin-btn">
            <Lock size={14} /> Admin Panel
          </Link>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
