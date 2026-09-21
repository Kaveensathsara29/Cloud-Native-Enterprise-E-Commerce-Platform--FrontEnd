import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Heart, Sun, Moon, Search, Menu, X, User, LogIn, LogOut } from 'lucide-react';
import { useShop, useAuth } from '../../store/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

interface NavbarProps {
  onCartToggle: () => void;
  onNavigate: (page: string, params?: { slug?: string }) => void;
  activePage?: string; // optional now — derived from useLocation
}

export const Navbar: React.FC<NavbarProps> = ({ onCartToggle }) => {
  const { cart, wishlist, theme, toggleTheme, products } = useShop();
  const { user, isAuthenticated, logout, openLoginModal } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof products>([]);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Derive active page from URL
  const getActivePage = () => {
    const path = location.pathname;
    if (path === '/' || path === '/home') return 'home';
    if (path.startsWith('/shop')) return 'shop';
    if (path.startsWith('/wishlist')) return 'wishlist';
    if (path.startsWith('/profile')) return 'profile';
    return path.replace('/', '');
  };

  const activePage = getActivePage();

  // Cart Count
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  // Live search
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, products]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setIsProfileDropdownOpen(false);
  }, [location.pathname]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setSearchQuery('');
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchResultClick = (slug: string) => {
    navigate(`/product/${slug}`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const navLinks = [
    { label: 'Home', value: 'home', path: '/' },
    { label: 'Shop', value: 'shop', path: '/shop' },
    { label: 'Wishlist', value: 'wishlist', path: '/wishlist' },
  ];

  return (
    <header className="navbar-header glass-panel">
      <div className="container navbar-container">

        {/* Mobile Menu Icon */}
        <button
          className="navbar-mobile-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Logo */}
        <div className="navbar-logo" onClick={() => navigate('/')}>
          <span className="logo-white">MASTER</span>
          <span className="logo-dot">.</span>
          <span className="logo-orange">NET</span>
        </div>

        {/* Desktop Nav Links */}
        <nav className="navbar-desktop-nav">
          {navLinks.map((link) => (
            <button
              key={link.value}
              className={`nav-link ${activePage === link.value ? 'active' : ''}`}
              onClick={() => navigate(link.path)}
            >
              {link.label}
              {activePage === link.value && (
                <motion.div
                  className="nav-link-indicator"
                  layoutId="navIndicator"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </nav>

        {/* Action Icons */}
        <div className="navbar-actions">

          {/* Search */}
          <div className="navbar-search-wrapper" ref={searchRef}>
            <button
              className={`action-icon-btn ${isSearchOpen ? 'active' : ''}`}
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label="Search"
            >
              <Search size={20} />
            </button>

            <AnimatePresence>
              {isSearchOpen && (
                <motion.div
                  className="navbar-search-dropdown glass-panel"
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="search-input-field-wrapper">
                    <input
                      type="text"
                      className="form-input search-field"
                      placeholder="Search products or categories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                    {searchQuery && (
                      <button className="clear-search" onClick={() => setSearchQuery('')}>
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {searchResults.length > 0 && (
                    <div className="search-results-list">
                      {searchResults.map((prod) => (
                        <div
                          key={prod.id}
                          className="search-result-item"
                          onClick={() => handleSearchResultClick(prod.slug)}
                        >
                          <img src={prod.images[0]} alt={prod.name} className="search-result-img" />
                          <div className="search-result-info">
                            <span className="search-result-name">{prod.name}</span>
                            <span className="search-result-cat">{prod.category}</span>
                          </div>
                          <span className="search-result-price">${prod.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchQuery.trim().length > 1 && searchResults.length === 0 && (
                    <div className="search-no-results">
                      No products found for "{searchQuery}"
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Toggle */}
          <button className="action-icon-btn" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Wishlist */}
          <button
            className={`action-icon-btn ${activePage === 'wishlist' ? 'active' : ''}`}
            onClick={() => navigate('/wishlist')}
            aria-label="Wishlist"
          >
            <Heart size={20} />
            {wishlist.length > 0 && (
              <span className="icon-badge badge-orange">{wishlist.length}</span>
            )}
          </button>

          {/* Cart */}
          <button className="action-icon-btn" onClick={onCartToggle} aria-label="Cart">
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="icon-badge badge-primary pulse-glow">{cartCount}</span>
            )}
          </button>

          {/* Profile Dropdown / Sign In */}
          <div className="navbar-profile-wrapper" ref={profileRef}>
            {isAuthenticated ? (
              <>
                <button
                  className="action-icon-btn"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  aria-label="Profile"
                  style={{ padding: 0, overflow: 'hidden', borderRadius: '50%', width: 36, height: 36 }}
                >
                  {user?.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={user.name}
                      style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <User size={20} />
                  )}
                </button>

                <AnimatePresence>
                  {isProfileDropdownOpen && (
                    <motion.div
                      className="navbar-profile-dropdown glass-panel"
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                    >
                      {user && (
                        <>
                          <div className="profile-dropdown-header">
                            {user.profilePicture ? (
                              <img
                                src={user.profilePicture}
                                alt={user.name}
                                style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div className="avatar">{user.name.charAt(0)}</div>
                            )}
                            <div className="user-details">
                              <span className="name">{user.name}</span>
                              <span className="email">{user.email}</span>
                            </div>
                          </div>
                          <div className="profile-dropdown-links">
                            <button onClick={() => { navigate('/profile'); setIsProfileDropdownOpen(false); }}>
                              <User size={15} /> Customer Portal &amp; Orders
                            </button>
                            <button onClick={() => { onCartToggle(); setIsProfileDropdownOpen(false); }}>
                              <ShoppingBag size={15} /> My Cart ({cartCount})
                            </button>

                            <button
                              style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                              onClick={() => { logout(); setIsProfileDropdownOpen(false); }}
                            >
                              <LogOut size={14} /> Sign Out
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <button
                id="navbar-signin-btn"
                className="action-icon-btn"
                onClick={openLoginModal}
                aria-label="Sign In"
                title="Sign In"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600, padding: '0.4rem 0.75rem', borderRadius: '10px' }}
              >
                <LogIn size={17} />
                <span style={{ display: 'inline' }}>Sign In</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Side Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="navbar-mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              className="navbar-mobile-menu glass-panel"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mobile-menu-header">
                <div className="navbar-logo" onClick={() => navigate('/')}>
                  <span className="logo-white">MASTER</span>
                  <span className="logo-dot">.</span>
                  <span className="logo-orange">NET</span>
                </div>
                <button className="close-menu-btn" onClick={() => setIsMobileMenuOpen(false)}>
                  <X size={24} />
                </button>
              </div>

              <div className="mobile-menu-links">
                {navLinks.map((link) => (
                  <button
                    key={link.value}
                    className={`mobile-nav-link ${activePage === link.value ? 'active' : ''}`}
                    onClick={() => navigate(link.path)}
                  >
                    {link.label}
                  </button>
                ))}

                <button
                  className={`mobile-nav-link ${activePage === 'profile' ? 'active' : ''}`}
                  onClick={() => navigate('/profile')}
                >
                  Dashboard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
