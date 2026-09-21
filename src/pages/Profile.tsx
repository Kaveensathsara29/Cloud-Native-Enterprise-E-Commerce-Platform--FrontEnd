import React, { useState, useMemo } from 'react';
import { useAuth, useShop } from '../store/hooks';
import type { Order, OrderItem } from '../store/slices/authSlice';
import { 
  ShoppingBag, MapPin, User, ChevronDown, ChevronUp, Plus, Trash2, 
  ShieldCheck, Mail, Phone, ShoppingCart, Truck, CheckCircle2, 
  Clock, ArrowRight, RotateCcw, Lock, Crown, Sparkles, ExternalLink, AlertCircle
} from 'lucide-react';

import './Profile.css';

type DashboardTab = 'orders' | 'cart' | 'addresses' | 'settings';

export const Profile: React.FC = () => {
  const { user, allOrders, refreshOrders, updateProfile, addAddress, removeAddress } = useAuth();
  const { cart, addToCart, updateCartQuantity, removeFromCart, addToast } = useShop();


  const [activeTab, setActiveTab] = useState<DashboardTab>('orders');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');



  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressForm, setAddressForm] = useState({
    fullName: '',
    addressLine: '',
    city: '',
    zipCode: '',
    country: 'United States'
  });

  // Track expanded order IDs
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);

  React.useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
    }
  }, [user]);

  // Auto-sync customer orders on mount and listen for real-time admin status updates
  React.useEffect(() => {
    refreshOrders();

    const handleOrderUpdate = () => {
      refreshOrders();
    };

    window.addEventListener('order_status_updated', handleOrderUpdate);
    window.addEventListener('storage', handleOrderUpdate);

    return () => {
      window.removeEventListener('order_status_updated', handleOrderUpdate);
      window.removeEventListener('storage', handleOrderUpdate);
    };
  }, [refreshOrders]);

  // Real-time synchronization with admin panel order status changes
  const syncedOrders = useMemo(() => {
    if (!user) return [];
    const baseOrders = user.orders || [];
    return baseOrders.map((order) => {
      const adminMatch = allOrders.find((o) => o.id === order.id || (o as any).orderId === order.id);
      if (adminMatch && adminMatch.status !== order.status) {
        return { ...order, status: adminMatch.status };
      }
      return order;
    });
  }, [user, allOrders]);

  // Calculate Loyalty VIP Tier
  const totalSpent = useMemo(() => {
    if (!user) return 0;
    return syncedOrders.reduce((sum, order) => sum + order.total, 0);
  }, [user, syncedOrders]);

  const vipTier = useMemo(() => {
    if (!user) {
      return {
        name: 'Silver Explorer',
        icon: <ShieldCheck size={18} className="vip-icon silver" />,
        badgeClass: 'vip-silver',
        perks: 'Protected Account • Standard Member Privileges'
      };
    }
    if (syncedOrders.length >= 5 || totalSpent >= 500) {
      return {
        name: 'Diamond VIP Elite',
        icon: <Crown size={18} className="vip-icon diamond" />,
        badgeClass: 'vip-diamond',
        perks: 'Free Express Delivery • 10% Loyalty Points • 24/7 Priority Support'
      };
    }
    if (syncedOrders.length >= 2 || totalSpent >= 150) {
      return {
        name: 'Gold Member',
        icon: <Sparkles size={18} className="vip-icon gold" />,
        badgeClass: 'vip-gold',
        perks: 'Priority Dispatch • Exclusive Member Coupons'
      };
    }
    return {
      name: 'Silver Explorer',
      icon: <ShieldCheck size={18} className="vip-icon silver" />,
      badgeClass: 'vip-silver',
      perks: 'Protected Account • Standard Member Privileges'
    };
  }, [user, syncedOrders, totalSpent]);

  // Unique Account User ID Hash
  const uniqueAccountId = useMemo(() => {
    if (!user) return 'UID-US-0000';
    const seed = (user.email + user.name).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `UID-US-${(seed % 8999 + 1000).toString()}`;
  }, [user]);

  // Active in-transit shipments count
  const activeDeliveries = useMemo(() => {
    if (!user) return [];
    return syncedOrders.filter((o) => o.status === 'Processing' || o.status === 'Shipped');
  }, [user, syncedOrders]);

  // Active cart subtotal
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cart]);

  const cartTotalQty = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  if (!user) {
    return (
      <div className="profile-not-found container">
        <div className="empty-orders-icon">🔒</div>
        <h2>Access Restricted</h2>
        <p>Please log in with your verified account to access your unique customer portal.</p>
      </div>
    );
  }


  const maskEmail = (email: string) => email;

  const maskPhone = (phone?: string) => {
    if (!phone) return 'Not provided';
    return phone;
  };

  const maskAddress = (line: string) => line;


  const handleUpdateProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (profileName.trim()) {
      updateProfile(profileName, profilePhone);
      setIsEditingProfile(false);
      addToast("Profile details updated securely!", "success");
    }
  };

  const handleAddAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      addressForm.fullName.trim() &&
      addressForm.addressLine.trim() &&
      addressForm.city.trim() &&
      addressForm.zipCode.trim()
    ) {
      addAddress(addressForm);
      setIsAddressModalOpen(false);
      setAddressForm({
        fullName: '',
        addressLine: '',
        city: '',
        zipCode: '',
        country: 'United States'
      });
      addToast("New secure address saved!", "success");
    }
  };

  const handleRemoveAddress = (id: string) => {
    removeAddress(id);
    addToast("Address removed from account.", "info");
  };

  const toggleOrderExpand = (id: string) => {
    setExpandedOrders((prev) => 
      prev.includes(id) ? prev.filter((orderId) => orderId !== id) : [...prev, id]
    );
  };

  // One-click Reorder functionality
  const handleReorderOrder = (order: Order) => {
    order.items.forEach((item: OrderItem) => {
      // Create a compatible Product stub
      const productStub: any = {
        id: item.productId,
        name: item.name,
        price: item.price,
        images: [item.image],
        category: 'General',
        inStock: true,
        colors: [{ name: item.color, hex: '#FF6B00' }],
        rating: 5.0,
        reviewCount: 1,
        slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      };
      addToCart(productStub, { name: item.color, hex: '#FF6B00' }, item.size, item.quantity);
    });
    addToast(`Added ${order.items.length} items from Order #${order.id} to your cart!`, 'success');
    setActiveTab('cart');
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'Processing': return 'status-processing';
      case 'Shipped': return 'status-shipped';
      case 'Delivered': return 'status-delivered';
      case 'Cancelled': return 'status-cancelled';
      default: return '';
    }
  };

  const getStatusStepIndex = (status: Order['status']) => {
    switch (status) {
      case 'Processing': return 1;
      case 'Shipped': return 2;
      case 'Delivered': return 3;
      case 'Cancelled': return 0;
      default: return 1;
    }
  };

  const getWhatsAppLink = (order: Order) => {
    const phone = order.shippingAddress.phone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = `Hello support, I have an inquiry about my order ${order.id} (Status: ${order.status}).`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="profile-page-container container">
      
      {/* ── 1. Personalized User Hero Banner ─────────────────────────────── */}
      <div className="profile-unique-hero glass-panel">
        <div className="hero-user-identity">
          <div className="profile-header-avatar">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
            <span className="online-beacon" title="Account Active"></span>
          </div>

          <div className="profile-identity-meta">
            <div className="identity-title-row">
              <h1>Welcome, {user.name}</h1>
              <span className={`vip-tier-badge ${vipTier.badgeClass}`}>
                {vipTier.icon} {vipTier.name}
              </span>
            </div>
            <div className="identity-sub-row">
              <span className="user-account-id"><Lock size={13} /> {uniqueAccountId}</span>
              <span className="separator">•</span>
              <span className="user-email-text">{maskEmail(user.email)}</span>
              <span className="separator">•</span>
              <span className="tier-perks-text">{vipTier.perks}</span>
            </div>
          </div>
        </div>
      </div>



      {/* ── 2. Quick Stat Widgets (Cart, Orders, Deliveries, Security) ─────── */}
      <div className="profile-stats-grid">
        {/* Stat 1: Active Cart */}
        <div 
          className={`stat-widget glass-panel ${activeTab === 'cart' ? 'widget-active' : ''}`}
          onClick={() => setActiveTab('cart')}
        >
          <div className="stat-widget-icon icon-cart">
            <ShoppingCart size={22} />
          </div>
          <div className="stat-widget-info">
            <span className="stat-label">Isolated Cart</span>
            <strong className="stat-value">{cartTotalQty} items</strong>
            <span className="stat-subtext">${cartSubtotal.toFixed(2)} Subtotal</span>
          </div>
          <button className="stat-action-arrow" title="View Cart">
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Stat 2: Orders Count */}
        <div 
          className={`stat-widget glass-panel ${activeTab === 'orders' ? 'widget-active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <div className="stat-widget-icon icon-orders">
            <ShoppingBag size={22} />
          </div>
          <div className="stat-widget-info">
            <span className="stat-label">Lifetime Orders</span>
            <strong className="stat-value">{syncedOrders.length} Placed</strong>
            <span className="stat-subtext">${totalSpent.toFixed(2)} Spent</span>
          </div>
          <button className="stat-action-arrow" title="View Orders">
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Stat 3: Active Deliveries */}
        <div 
          className={`stat-widget glass-panel ${activeTab === 'orders' ? 'widget-active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <div className="stat-widget-icon icon-truck">
            <Truck size={22} />
          </div>
          <div className="stat-widget-info">
            <span className="stat-label">Active Deliveries</span>
            <strong className="stat-value">{activeDeliveries.length} in Transit</strong>
            <span className="stat-subtext">Live Status Tracking</span>
          </div>
          <button className="stat-action-arrow" title="Track Shipments">
            <ArrowRight size={16} />
          </button>
        </div>
      </div>




      {/* ── 3. Navigation Tabs ───────────────────────────────────────────── */}
      <div className="profile-tabs-bar glass-panel">
        <button 
          className={`profile-tab-btn ${activeTab === 'orders' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <ShoppingBag size={17} />
          <span>My Orders &amp; Tracking</span>
          {syncedOrders.length > 0 && <span className="tab-pill">{syncedOrders.length}</span>}
        </button>

        <button 
          className={`profile-tab-btn ${activeTab === 'cart' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('cart')}
        >
          <ShoppingCart size={17} />
          <span>My Active Cart</span>
          {cart.length > 0 && <span className="tab-pill tab-pill-primary">{cart.length}</span>}
        </button>


        <button 
          className={`profile-tab-btn ${activeTab === 'addresses' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('addresses')}
        >
          <MapPin size={17} />
          <span>Delivery Addresses</span>
          {user.addresses.length > 0 && <span className="tab-pill">{user.addresses.length}</span>}
        </button>

        <button 
          className={`profile-tab-btn ${activeTab === 'settings' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <User size={17} />
          <span>Profile Info</span>
        </button>
      </div>

      {/* ── 4. Main Tab Contents ─────────────────────────────────────────── */}
      <div className="profile-tab-content-area">

        {/* ── TAB 1: ORDERS & LIVE TRACKING ──────────────────────────────── */}
        {activeTab === 'orders' && (
          <div className="profile-orders-container glass-panel">
            <div className="orders-header-row">
              <div>
                <h3><ShoppingBag size={20} /> My Purchase Log &amp; Live Tracking</h3>
                <p>Track delivery status, review previous invoices, and reorder favourite items in one click.</p>
              </div>
              <span className="orders-count-badge">{syncedOrders.length} Total Orders</span>
            </div>

            {syncedOrders.length === 0 ? (
              <div className="empty-orders-state">
                <div className="empty-orders-icon">📦</div>
                <h3>No Orders Yet</h3>
                <p>Items you purchase will be securely tracked and recorded here.</p>
              </div>
            ) : (
              <div className="orders-history-list">
                {syncedOrders.map((order) => {
                  const isExpanded = expandedOrders.includes(order.id);
                  const stepIndex = getStatusStepIndex(order.status);

                  return (
                    <div key={order.id} className="order-history-card">
                      
                      {/* Collapsed Header */}
                      <div className="order-card-header" onClick={() => toggleOrderExpand(order.id)}>
                        <div className="header-meta-group">
                          <div className="order-reference">
                            <span>Order Reference</span>
                            <strong>{order.id}</strong>
                          </div>
                          <div className="order-date">
                            <span>Date &amp; Time</span>
                            <span>{order.date} • {order.time || '12:00 PM'}</span>
                          </div>
                        </div>
                        
                        <div className="header-status-group">
                          <span className={`order-status-badge ${getStatusColor(order.status)}`}>
                            {order.status === 'Delivered' && <CheckCircle2 size={13} style={{ marginRight: 4 }} />}
                            {order.status === 'Processing' && <Clock size={13} style={{ marginRight: 4 }} />}
                            {order.status === 'Shipped' && <Truck size={13} style={{ marginRight: 4 }} />}
                            {order.status === 'Cancelled' && <AlertCircle size={13} style={{ marginRight: 4 }} />}
                            {order.status}
                          </span>
                          
                          <div className="order-price-toggle">
                            <strong className="order-total-price">${order.total.toFixed(2)}</strong>
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>
                      </div>

                      {/* Visual 4-Step Order Tracker Bar or Cancelled Alert */}
                      {order.status === 'Cancelled' ? (
                        <div className="order-cancelled-notice">
                          <AlertCircle size={16} />
                          <span>This order was cancelled. Please contact customer support if you need assistance.</span>
                        </div>
                      ) : (
                        <div className="order-progress-stepper">
                          <div className={`step-node ${stepIndex >= 1 ? 'step-completed' : ''}`}>
                            <div className="step-circle"><Clock size={14} /></div>
                            <span>Processing</span>
                          </div>
                          <div className={`step-line ${stepIndex >= 2 ? 'line-completed' : ''}`}></div>
                          <div className={`step-node ${stepIndex >= 2 ? 'step-completed' : ''}`}>
                            <div className="step-circle"><Truck size={14} /></div>
                            <span>Shipped</span>
                          </div>
                          <div className={`step-line ${stepIndex >= 3 ? 'line-completed' : ''}`}></div>
                          <div className={`step-node ${stepIndex >= 3 ? 'step-completed' : ''}`}>
                            <div className="step-circle"><CheckCircle2 size={14} /></div>
                            <span>Delivered</span>
                          </div>
                        </div>
                      )}

                      {/* Expandable Order Details Panel */}
                      {isExpanded && (
                        <div className="order-card-expanded-panel">
                          
                          {/* Items listed */}
                          <div className="order-panel-items-list">
                            {order.items.map((item, index) => (
                              <div key={index} className="order-panel-item">
                                <img src={item.image} alt={item.name} className="item-img" />
                                <div className="item-meta">
                                  <h4>{item.name}</h4>
                                  <span className="item-option-details">
                                    Color: {item.color} {item.size && `| Size: ${item.size}`}
                                  </span>
                                </div>
                                <div className="item-math">
                                  <span>{item.quantity} x ${item.price.toFixed(2)}</span>
                                  <strong className="item-price-sum">
                                    ${(item.price * item.quantity).toFixed(2)}
                                  </strong>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Order Logistics & Quick Action Buttons */}
                          <div className="order-logistics-grid">
                            <div className="logistics-box">
                              <h5>Delivery Destination</h5>
                              <p><strong>{order.shippingAddress.fullName}</strong></p>
                              <p>{maskAddress(order.shippingAddress.addressLine)}</p>
                              <p>{order.shippingAddress.city}, {order.shippingAddress.zipCode}</p>
                              <p>{order.shippingAddress.country}</p>
                              <p className="masked-phone-note"><Phone size={12} /> {maskPhone(order.shippingAddress.phone)}</p>
                            </div>

                            <div className="logistics-box">
                              <h5>Invoice Summary</h5>
                              <p>Payment: {order.paymentMethod}</p>

                              <p>Total Paid: <span className="highlight-orange">${order.total.toFixed(2)}</span></p>
                              <p className="security-lock-note">
                                <ShieldCheck size={14} /> 256-Bit SSL Encrypted Verification
                              </p>

                              <div className="order-actions-buttons">
                                <button 
                                  className="reorder-btn"
                                  onClick={() => handleReorderOrder(order)}
                                >
                                  <RotateCcw size={15} /> Buy Again / Reorder
                                </button>
                                
                                <a 
                                  href={getWhatsAppLink(order)} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="support-order-btn"
                                >
                                  <ExternalLink size={14} /> Order Inquiry
                                </a>
                              </div>
                            </div>
                          </div>

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: MY ACTIVE CART & QUICK REORDER ───────────────────────── */}
        {activeTab === 'cart' && (
          <div className="profile-cart-container glass-panel">
            <div className="cart-panel-header">
              <div>
                <h3><ShoppingCart size={20} /> My Private Active Cart</h3>
                <p>This cart is uniquely isolated to your account. Your items remain saved safely across sessions.</p>
              </div>
              <span className="cart-count-badge">{cart.length} Unique Items</span>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart-view">
                <div className="empty-cart-icon">🛒</div>
                <h3>Your Cart is Currently Empty</h3>
                <p>Browse products or click "Buy Again" on any past order to quickly add items.</p>
              </div>
            ) : (
              <div className="profile-cart-layout">
                <div className="profile-cart-items-list">
                  {cart.map((item, idx) => (
                    <div key={idx} className="profile-cart-item-card">
                      <img src={item.product.images[0]} alt={item.product.name} className="cart-item-thumb" />
                      <div className="cart-item-details">
                        <h4>{item.product.name}</h4>
                        <div className="cart-item-variants">
                          <span className="color-indicator" style={{ backgroundColor: item.selectedColor.hex }}></span>
                          <span>{item.selectedColor.name}</span>
                          {item.selectedSize && <span>• Size {item.selectedSize}</span>}
                        </div>
                        <span className="cart-item-unit-price">${item.product.price.toFixed(2)} each</span>
                      </div>

                      <div className="cart-item-quantity-controls">
                        <button 
                          className="qty-btn"
                          onClick={() => updateCartQuantity(item.product.id, item.selectedColor.hex, item.selectedSize, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="qty-number">{item.quantity}</span>
                        <button 
                          className="qty-btn"
                          onClick={() => updateCartQuantity(item.product.id, item.selectedColor.hex, item.selectedSize, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>

                      <div className="cart-item-total-col">
                        <strong>${(item.product.price * item.quantity).toFixed(2)}</strong>
                        <button 
                          className="cart-item-delete"
                          onClick={() => removeFromCart(item.product.id, item.selectedColor.hex, item.selectedSize)}
                          title="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="profile-cart-summary-sidebar glass-panel">
                  <h4>Order Summary</h4>
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <strong>${cartSubtotal.toFixed(2)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Shipping</span>
                    <span className="free-shipping-tag">{cartSubtotal > 150 ? 'FREE' : '$15.00'}</span>
                  </div>
                  <div className="summary-divider"></div>
                  <div className="summary-row total-row">
                    <span>Estimated Total</span>
                    <strong>${(cartSubtotal + (cartSubtotal > 150 ? 0 : 15)).toFixed(2)}</strong>
                  </div>

                  <a href="/checkout" className="btn btn-primary checkout-full-btn">
                    Proceed to Secure Checkout <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: DELIVERY ADDRESSES ───────────────────────────────────── */}

        {activeTab === 'addresses' && (
          <div className="profile-addresses-container glass-panel">
            <div className="addresses-header-row">
              <div>
                <h3><MapPin size={20} /> Saved Delivery Addresses</h3>
                <p>Manage your verified shipping locations for quick one-click checkout.</p>
              </div>
              <button className="add-address-trigger-btn" onClick={() => setIsAddressModalOpen(true)}>
                <Plus size={16} /> Add New Address
              </button>
            </div>

            <div className="addresses-grid">
              {user.addresses.length === 0 ? (
                <div className="empty-address-box">
                  <MapPin size={32} className="faded-icon" />
                  <h4>No delivery addresses saved</h4>
                  <p>Add an address to make your next checkout fast and seamless.</p>
                  <button className="btn btn-primary" onClick={() => setIsAddressModalOpen(true)}>
                    <Plus size={16} /> Add Address
                  </button>
                </div>
              ) : (
                user.addresses.map((addr) => (
                  <div key={addr.id} className="address-card glass-panel">
                    <div className="address-card-top">
                      <strong className="recipient-name">{addr.fullName}</strong>
                      <button 
                        className="delete-addr-btn" 
                        onClick={() => handleRemoveAddress(addr.id)}
                        title="Delete Address"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="address-street">{maskAddress(addr.addressLine)}</p>
                    <p className="address-city-state">{addr.city}, {addr.zipCode}</p>
                    <p className="address-country">{addr.country}</p>
                    {addr.phone && (
                      <p className="address-phone"><Phone size={13} /> {maskPhone(addr.phone)}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB 5: PROFILE SETTINGS ─────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="profile-settings-container glass-panel">
            <div className="settings-header">
              <h3><User size={20} /> Personal Profile Settings</h3>
              <p>Keep your contact details up-to-date for shipment delivery confirmations.</p>
            </div>

            <div className="settings-content-box">
              {isEditingProfile ? (
                <form onSubmit={handleUpdateProfileSubmit} className="settings-form">
                  <div className="form-group">
                    <label>Full Display Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Phone Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="settings-btn-row">
                    <button type="submit" className="btn btn-primary">Save Changes</button>
                    <button type="button" className="btn btn-outline" onClick={() => setIsEditingProfile(false)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="profile-details-display">
                  <div className="display-row">
                    <span className="label"><User size={15} /> Account Name:</span>
                    <strong className="val">{user.name}</strong>
                  </div>
                  <div className="display-row">
                    <span className="label"><Mail size={15} /> Email Address:</span>
                    <strong className="val">{maskEmail(user.email)}</strong>
                  </div>
                  <div className="display-row">
                    <span className="label"><Phone size={15} /> Phone Number:</span>
                    <strong className="val">{maskPhone(user.phone)}</strong>
                  </div>
                  <div className="display-row">
                    <span className="label"><Crown size={15} /> Membership Status:</span>
                    <strong className="val highlight-orange">{vipTier.name}</strong>
                  </div>

                  <div className="edit-action-container">
                    <button className="btn btn-primary" onClick={() => setIsEditingProfile(true)}>
                      Edit Profile Information
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Add Address Modal Pop-Up */}
      {isAddressModalOpen && (
        <div className="address-modal-overlay">
          <div className="address-modal-content">
            <h3>Add New Shipping Address</h3>
            <form onSubmit={handleAddAddressSubmit} className="address-modal-form">
              <div className="form-group">
                <label>Recipient Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={addressForm.fullName}
                  onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                  placeholder="e.g. Jane Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label>Street Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={addressForm.addressLine}
                  onChange={(e) => setAddressForm({ ...addressForm, addressLine: e.target.value })}
                  placeholder="e.g. 123 Main St, Apt 4B"
                  required
                />
              </div>

              <div className="form-group-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    className="form-input"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    placeholder="e.g. New York"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Zip / Postal Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={addressForm.zipCode}
                    onChange={(e) => setAddressForm({ ...addressForm, zipCode: e.target.value })}
                    placeholder="e.g. 10001"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  className="form-input"
                  value={addressForm.country}
                  onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                  required
                />
              </div>

              <div className="modal-buttons">
                <button type="button" className="btn btn-outline" onClick={() => setIsAddressModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
