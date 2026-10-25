import React, { useState, useMemo } from 'react';
import { useAuth } from '../store/hooks';
import type { Order } from '../store/slices/authSlice';
import { useShop } from '../store/hooks';
import type { PromoCodeEntry } from '../store/slices/promoSlice';
import { type Product } from '../data/products';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, Plus, ShoppingBag, Box, Trash2, Edit,
  X, Check, LogOut, Package, RefreshCw, AlertCircle,
  Tag, Search, Star, Percent, Filter, CheckSquare, Square,
  ExternalLink, Eye, Cloud, UploadCloud
} from 'lucide-react';
import api from '../services/api';
import './AdminDashboard.css';

type AdminTab = 'overview' | 'analytics' | 'add' | 'products' | 'orders' | 'promo';

const getWhatsAppLink = (order: Order) => {
  const phone = order.shippingAddress.phone || '';
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const itemsText = order.items.map(item => `${item.name} (x${item.quantity})`).join(', ');
  const message = `Hello ${order.shippingAddress.fullName}, this is an update regarding your order ${order.id}. Current status: *${order.status}*. Total: $${order.total.toFixed(2)}. Items: ${itemsText}. Thank you!`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

export const AdminDashboard: React.FC = () => {
  const { admin, isAdminAuthenticated, adminLogout, allOrders, updateOrderStatus } = useAuth();
  const {
    products, addProduct, updateProduct, deleteProduct,
    adminPromoCodes, createAdminPromoCode, deleteAdminPromoCode, addToast
  } = useShop();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isAdminAuthenticated) navigate('/admin/login');
  }, [isAdminAuthenticated, navigate]);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // ── Add Product form state ──────────────────────────────────────
  const [newProduct, setNewProduct] = useState({
    name: '', category: 'Electronics', price: '', originalPrice: '',
    description: '', longDescription: '', imageUrl: '', inStock: true,
    freeShipping: false, shippingFee: '',
  });
  const [colorInput, setColorInput] = useState({ name: '', hex: '#FF6B00' });
  const [productColors, setProductColors] = useState<{ name: string; hex: string }[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [specInput, setSpecInput] = useState({ key: '', value: '' });
  const [productSpecs, setProductSpecs] = useState<{ [key: string]: string }>({});

  // ── Inventory controls ─────────────────────────────────────────
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);

  // ── Orders controls ────────────────────────────────────────────
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');

  // ── Promo code form ────────────────────────────────────────────
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState('');

  // ── Google Drive Storage state ──────────────────────────────────
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveStatus, setDriveStatus] = useState<{ configured: boolean; authUrl?: string } | null>(null);

  React.useEffect(() => {
    // Check Google Drive OAuth status from backend
    api.get<{ configured: boolean; authUrl: string }>('/drive/status')
      .then(res => setDriveStatus(res))
      .catch(() => setDriveStatus({ configured: false }));
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file selection triggers change if needed
    e.target.value = '';

    setIsUploadingToDrive(true);
    addToast('Uploading image to Google Drive storage (OAuth)...', 'info');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res: any = await api.upload('/upload', formData);
      if (res && res.url) {
        setNewProduct(prev => ({ ...prev, imageUrl: res.url }));
        addToast('Product image uploaded directly to Google Drive!', 'success');
      } else {
        throw new Error(res?.message || 'Google Drive upload failed');
      }
    } catch (err: any) {
      console.warn('[AdminDashboard] Google Drive upload error:', err);
      if (err.data?.requiresAuth && err.data?.authUrl) {
        setDriveStatus(prev => ({ ...prev, configured: false, authUrl: err.data.authUrl }));
        addToast('Google Drive OAuth authentication required. Click "Connect Google Drive" below.', 'error');
      } else {
        addToast(err.message || 'Failed to upload image to Google Drive.', 'error');
      }
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  // ── Analytics computations (All hooks called unconditionally) ───
  const totalSales = allOrders.reduce((s, o) => o.status !== 'Cancelled' ? s + o.total : s, 0);
  const avgOrderValue = allOrders.length > 0 ? totalSales / allOrders.length : 0;

  const revenueByCategory = useMemo(() => {
    const catMap: Record<string, number> = {};
    allOrders.forEach(order => {
      if (order.status === 'Cancelled') return;
      order.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId || p.name === item.name);
        const cat = prod?.category || 'Other';
        catMap[cat] = (catMap[cat] || 0) + item.price * item.quantity;
      });
    });
    return Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  }, [allOrders, products]);

  const maxCatRevenue = revenueByCategory[0]?.[1] || 1;

  const ordersByStatus = useMemo(() => {
    const counts: Record<string, number> = { Processing: 0, Shipped: 0, Delivered: 0, Cancelled: 0 };
    allOrders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts);
  }, [allOrders]);

  const maxStatusCount = Math.max(...ordersByStatus.map(([, c]) => c), 1);

  const inStockCount = products.filter(p => p.inStock).length;
  const outOfStockCount = products.length - inStockCount;

  if (!isAdminAuthenticated || !admin) {
    return (
      <div className="admin-loading-container container">
        <AlertCircle size={28} /><h2>Access Restricted</h2>
        <p>Redirecting to login portal...</p>
      </div>
    );
  }

  // ── Filtered lists ─────────────────────────────────────────────
  const filteredProducts = products.filter(p => {
    const q = inventorySearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  const filteredOrders = allOrders.filter(o => {
    const matchStatus = orderStatusFilter === 'All' || o.status === orderStatusFilter;
    const q = orderSearch.toLowerCase();
    const matchSearch = !q ||
      o.id.toLowerCase().includes(q) ||
      o.shippingAddress.fullName.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // ── Add Product helpers ────────────────────────────────────────
  const handleAddColor = () => {
    if (colorInput.name.trim()) {
      setProductColors([...productColors, { ...colorInput }]);
      setColorInput({ name: '', hex: '#FF6B00' });
    }
  };
  const handleSizeToggle = (size: string) =>
    setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  const handleAddSpec = () => {
    if (specInput.key.trim() && specInput.value.trim()) {
      setProductSpecs({ ...productSpecs, [specInput.key]: specInput.value });
      setSpecInput({ key: '', value: '' });
    }
  };
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isFreeShipping = newProduct.freeShipping;
    const created: Product = {
      id: "prod_" + Math.random().toString(36).substring(2, 9),
      name: newProduct.name,
      slug: newProduct.name.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '-'),
      description: newProduct.description || 'No description.',
      longDescription: newProduct.longDescription || 'No details.',
      price: parseFloat(newProduct.price),
      originalPrice: newProduct.originalPrice ? parseFloat(newProduct.originalPrice) : undefined,
      rating: 5.0, reviewCount: 0,
      category: newProduct.category,
      images: [newProduct.imageUrl.trim() || '/assets/products/smartwatch.png'],
      colors: productColors.length > 0 ? productColors : [{ name: 'Default', hex: '#FF6B00' }],
      sizes: selectedSizes.length > 0 ? selectedSizes : undefined,
      specs: productSpecs, reviews: [], inStock: newProduct.inStock, featured: false,
      freeShipping: isFreeShipping,
      shippingFee: isFreeShipping ? 0 : (newProduct.shippingFee ? parseFloat(newProduct.shippingFee) : 0)
    };
    try {
      await addProduct(created);
      setNewProduct({ name: '', category: 'Electronics', price: '', originalPrice: '', description: '', longDescription: '', imageUrl: '', inStock: true, freeShipping: false, shippingFee: '' });
      setProductColors([]); setSelectedSizes([]); setProductSpecs({});
      setActiveTab('products');
    } catch (error: any) {
      addToast(error?.message || 'Unable to publish product. Please try again.', 'error');
    }
  };

  // ── Inventory helpers ──────────────────────────────────────────
  const handleStartEdit = (p: Product) => { setEditingProductId(p.id); setEditingPrice(p.price.toString()); };
  const handleSavePrice = (p: Product) => { updateProduct({ ...p, price: parseFloat(editingPrice) || p.price }); setEditingProductId(null); };
  const handleToggleStock = (p: Product) => updateProduct({ ...p, inStock: !p.inStock });
  const handleToggleFeatured = (p: Product) => updateProduct({ ...p, featured: !p.featured });
  const handleToggleOnSale = (p: Product) => updateProduct({ ...p, onSale: !p.onSale });

  const toggleBulkSelect = (id: string) =>
    setBulkSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () => setBulkSelected(filteredProducts.map(p => p.id));
  const clearSelection = () => setBulkSelected([]);
  const bulkDelete = () => {
    if (!confirm(`Delete ${bulkSelected.length} product(s)?`)) return;
    bulkSelected.forEach(id => deleteProduct(id));
    setBulkSelected([]);
  };

  // ── Promo helpers ──────────────────────────────────────────────
  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    const disc = parseInt(newPromoDiscount);
    if (!newPromoCode.trim() || isNaN(disc) || disc < 1 || disc > 100) return;
    createAdminPromoCode(newPromoCode, disc);
    setNewPromoCode(''); setNewPromoDiscount('');
  };

  // ── Status badge ───────────────────────────────────────────────
  const statusClass = (s: Order['status']) => ({
    Processing: 'admin-status-processing', Shipped: 'admin-status-shipped',
    Delivered: 'admin-status-delivered', Cancelled: 'admin-status-cancelled',
  }[s] ?? '');

  // ── Sidebar nav items ──────────────────────────────────────────
  const navItems: { id: AdminTab; icon: React.ReactNode; label: string }[] = [
    { id: 'overview', icon: <BarChart3 size={18} />, label: 'Dashboard Summary' },
    { id: 'analytics', icon: <BarChart3 size={18} />, label: 'Analytics Charts' },
    { id: 'add', icon: <Plus size={18} />, label: 'Add New Item' },
    { id: 'products', icon: <Box size={18} />, label: 'Manage Inventory' },
    { id: 'orders', icon: <ShoppingBag size={18} />, label: 'Manage Orders' },
    { id: 'promo', icon: <Tag size={18} />, label: 'Promo Codes' },
  ];

  return (
    <div className="admin-dashboard-container container">

      {/* ── Sidebar ── */}
      <aside className="admin-sidebar glass-panel">
        <div className="admin-sidebar-header">
          <div className="admin-details">
            <h3>Admin Space</h3>
            <span>{admin.email}</span>
          </div>
        </div>

        <nav className="admin-sidebar-menu">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`admin-menu-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <button className="admin-logout-btn" onClick={() => { adminLogout(); navigate('/'); }}>
          <LogOut size={16} /> End Session
        </button>
      </aside>

      {/* ── Main viewport ── */}
      <main className="admin-main-viewport">

        {/* ═══════════════════════════════ TAB: OVERVIEW ═══════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="admin-tab-content anim-fade">
            <h2>System Overview</h2>



            <div className="admin-stats-grid">
              {[
                { label: 'Gross Sales', value: `$${totalSales.toFixed(2)}`, icon: <ShoppingBag size={20} />, accent: true },
                { label: 'Total Orders', value: allOrders.length, icon: <Package size={20} /> },
                { label: 'SKU Products', value: products.length, icon: <Box size={20} /> },
                { label: 'AVG Order Value', value: `$${avgOrderValue.toFixed(2)}`, icon: <RefreshCw size={20} /> },
                { label: 'In Stock', value: inStockCount, icon: <Check size={20} /> },
                { label: 'Out of Stock', value: outOfStockCount, icon: <AlertCircle size={20} /> },
              ].map(w => (
                <div key={w.label} className={`stat-widget-box glass-panel${w.accent ? ' accent-orange' : ''}`}>
                  <div className="stat-header"><span>{w.label}</span><span className="stat-icon">{w.icon}</span></div>
                  <h3>{w.value}</h3>
                </div>
              ))}
            </div>

            <div className="admin-overview-table-wrapper glass-panel">
              <h3>Recent Purchases</h3>
              <div className="admin-scrollable-table">
                <table className="admin-table">
                  <thead><tr><th>Order ID</th><th>Date</th><th>Customer</th><th>Items</th><th>Status</th><th>Total</th></tr></thead>
                  <tbody>
                    {allOrders.length === 0 ? (
                      <tr><td colSpan={6} className="empty-table-row">No orders yet.</td></tr>
                    ) : allOrders.slice(0, 8).map(o => (
                      <tr key={o.id}>
                        <td><strong>{o.id}</strong></td>
                        <td>{o.date}</td>
                        <td>{o.shippingAddress.fullName}</td>
                        <td>{o.items.length} item(s)</td>
                        <td><span className={`admin-status-badge ${statusClass(o.status)}`}>{o.status}</span></td>
                        <td><strong>${o.total.toFixed(2)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


        {/* ═══════════════════════════════ TAB: ANALYTICS ═══════════════════════════════ */}
        {activeTab === 'analytics' && (
          <div className="admin-tab-content anim-fade">
            <h2>Analytics Charts</h2>

            <div className="analytics-charts-grid">

              {/* Revenue by Category bar chart */}
              <div className="chart-panel glass-panel">
                <h3>Revenue by Category</h3>
                {revenueByCategory.length === 0 ? (
                  <p className="chart-empty-msg">Place orders to see category revenue data.</p>
                ) : (
                  <div className="bar-chart">
                    {revenueByCategory.map(([cat, rev]) => (
                      <div key={cat} className="bar-row">
                        <span className="bar-label">{cat}</span>
                        <div className="bar-track">
                          <div
                            className="bar-fill bar-orange"
                            style={{ width: `${(rev / maxCatRevenue) * 100}%` }}
                          />
                        </div>
                        <span className="bar-value">${rev.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Orders by Status bar chart */}
              <div className="chart-panel glass-panel">
                <h3>Orders by Status</h3>
                <div className="bar-chart">
                  {ordersByStatus.map(([status, count]) => (
                    <div key={status} className="bar-row">
                      <span className="bar-label">{status}</span>
                      <div className="bar-track">
                        <div
                          className={`bar-fill bar-status-${status.toLowerCase()}`}
                          style={{ width: `${(count / maxStatusCount) * 100}%` }}
                        />
                      </div>
                      <span className="bar-value">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stock health donut-style mini chart */}
              <div className="chart-panel glass-panel">
                <h3>Inventory Health</h3>
                <div className="stock-health-grid">
                  <div className="stock-health-item stock-in">
                    <span className="stock-health-count">{inStockCount}</span>
                    <span className="stock-health-label">In Stock</span>
                  </div>
                  <div className="stock-health-divider" />
                  <div className="stock-health-item stock-out">
                    <span className="stock-health-count">{outOfStockCount}</span>
                    <span className="stock-health-label">Out of Stock</span>
                  </div>
                </div>
                {products.length > 0 && (
                  <div className="health-track">
                    <div
                      className="health-fill"
                      style={{ width: `${(inStockCount / products.length) * 100}%` }}
                    />
                  </div>
                )}
                <p className="health-pct">{products.length > 0 ? Math.round((inStockCount / products.length) * 100) : 0}% availability</p>
              </div>

              {/* Promo code usage quick view */}
              <div className="chart-panel glass-panel">
                <h3>Active Promo Codes</h3>
                <div className="promo-summary-list">
                  {adminPromoCodes.map((p: PromoCodeEntry) => (
                    <div key={p.code} className="promo-summary-row">
                      <span className="promo-code-chip">{p.code}</span>
                      <span className="promo-pct-badge">{p.discount}% OFF</span>
                    </div>
                  ))}
                  {adminPromoCodes.length === 0 && <p className="chart-empty-msg">No active codes.</p>}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ═══════════════════════════════ TAB: ADD PRODUCT ═════════════════════════════ */}
        {activeTab === 'add' && (
          <div className="admin-tab-content anim-fade">
            <h2>Add Product</h2>
            <form onSubmit={handleProductSubmit} className="admin-product-form glass-panel">
              <div className="form-sections-grid">
                <div className="form-left-col">
                  <div className="form-group">
                    <label>Product Name</label>
                    <input type="text" className="form-input" placeholder="e.g. Chronos Edition 2.0"
                      value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} required />
                  </div>
                  <div className="form-group-row">
                    <div className="form-group">
                      <label>Retail Price ($)</label>
                      <input type="number" step="0.01" className="form-input" placeholder="199.99"
                        value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Original Price ($)</label>
                      <input type="number" step="0.01" className="form-input" placeholder="229.99"
                        value={newProduct.originalPrice} onChange={e => setNewProduct({ ...newProduct, originalPrice: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group-row">
                    <div className="form-group">
                      <label>Category</label>
                      <select className="form-input" value={newProduct.category}
                        onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}>
                        <option>Electronics</option><option>Accessories</option>
                        <option>Apparel</option><option>Home Decor</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label style={{ margin: 0 }}>Product Image</label>
                        {driveStatus && (
                          <div style={{ fontSize: '12px' }}>
                            {driveStatus.configured ? (
                              <span style={{ color: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                <Cloud size={14} /> Google Drive Active
                              </span>
                            ) : (
                              <a
                                href={driveStatus.authUrl || `http://localhost:5001/api/drive/authorize`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#ff6b00', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                                title="Click to authorize Google Drive OAuth storage"
                              >
                                <Cloud size={14} /> Connect Google Drive OAuth
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="image-upload-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Google Drive Image URL or upload below"
                          value={newProduct.imageUrl}
                          onChange={e => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                        />
                        <div className="file-upload-btn-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="file"
                            id="productImageFile"
                            accept="image/*"
                            style={{ display: 'none' }}
                            disabled={isUploadingToDrive}
                            onChange={handleImageUpload}
                          />
                          <label
                            htmlFor="productImageFile"
                            className="btn btn-sm btn-secondary"
                            style={{
                              cursor: isUploadingToDrive ? 'not-allowed' : 'pointer',
                              margin: 0,
                              padding: '8px 16px',
                              height: 'auto',
                              fontSize: '13px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              opacity: isUploadingToDrive ? 0.7 : 1
                            }}
                          >
                            <UploadCloud size={15} />
                            {isUploadingToDrive ? 'Uploading to Google Drive...' : 'Upload to Google Drive'}
                          </label>
                          {newProduct.imageUrl && (
                            <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: '600' }}>
                              ✔ {newProduct.imageUrl.includes('google') ? 'Google Drive Stored' : 'Loaded'}
                            </span>
                          )}
                        </div>
                        {newProduct.imageUrl && (
                          <div className="image-preview" style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img
                              src={newProduct.imageUrl}
                              alt="Preview"
                              style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}
                            />
                            {newProduct.imageUrl.includes('google') && (
                              <div style={{ fontSize: '12px' }}>
                                <span style={{ fontWeight: 600, color: '#0F172A', display: 'block' }}>☁ Stored in Google Drive</span>
                                <span style={{ color: '#64748B', fontSize: '11px' }}>Cloud OAuth URL generated</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Short Summary</label>
                    <input type="text" className="form-input" placeholder="One-line product summary"
                      value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Long Description</label>
                    <textarea rows={5} className="form-input text-area"
                      value={newProduct.longDescription} onChange={e => setNewProduct({ ...newProduct, longDescription: e.target.value })} />
                  </div>
                </div>
                <div className="form-right-col">
                  <div className="form-group checkbox-group">
                    <input type="checkbox" id="inStockCheck" checked={newProduct.inStock}
                      onChange={e => setNewProduct({ ...newProduct, inStock: e.target.checked })} />
                    <label htmlFor="inStockCheck">Mark as In Stock</label>
                  </div>
                  {/* ── Shipping Section ── */}
                  <div className="form-sub-panel">
                    <h4>Shipping</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          className={`size-selector-btn${newProduct.freeShipping ? ' active' : ''}`}
                          style={{ flex: 1, padding: '10px', fontWeight: 600 }}
                          onClick={() => setNewProduct({ ...newProduct, freeShipping: true, shippingFee: '' })}
                        >
                          🚚 Free Shipping
                        </button>
                        <button
                          type="button"
                          className={`size-selector-btn${!newProduct.freeShipping ? ' active' : ''}`}
                          style={{ flex: 1, padding: '10px', fontWeight: 600 }}
                          onClick={() => setNewProduct({ ...newProduct, freeShipping: false })}
                        >
                          💲 Set Fee
                        </button>
                      </div>
                      {newProduct.freeShipping ? (
                        <p style={{ fontSize: '13px', color: 'var(--success)', fontWeight: '600', margin: 0 }}>
                          ✔ This product ships for free
                        </p>
                      ) : (
                        <div className="form-group" style={{ margin: 0 }}>
                          <label>Shipping Fee ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-input"
                            placeholder="e.g. 9.99"
                            value={newProduct.shippingFee}
                            onChange={e => setNewProduct({ ...newProduct, shippingFee: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="form-sub-panel">
                    <h4>Colors</h4>
                    <div className="sub-panel-inputs">
                      <input type="text" className="form-input" placeholder="Color name"
                        value={colorInput.name} onChange={e => setColorInput({ ...colorInput, name: e.target.value })} />
                      <input type="color" value={colorInput.hex} className="color-wheel-picker"
                        onChange={e => setColorInput({ ...colorInput, hex: e.target.value })} />
                      <button type="button" className="btn btn-sm btn-primary" onClick={handleAddColor}><Plus size={14} /></button>
                    </div>
                    <div className="added-items-badges">
                      {productColors.map((c, i) => (
                        <span key={i} className="attribute-badge">
                          <span className="color-dot-indicator" style={{ backgroundColor: c.hex }} />{c.name}
                          <button type="button" onClick={() => setProductColors(productColors.filter((_, idx) => idx !== i))}><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="form-sub-panel">
                    <h4>Sizes</h4>
                    <div className="size-checkboxes-row">
                      {['S', 'M', 'L', 'XL', 'US 8', 'US 9', 'US 10', 'US 11'].map(s => (
                        <button key={s} type="button"
                          className={`size-selector-btn ${selectedSizes.includes(s) ? 'active' : ''}`}
                          onClick={() => handleSizeToggle(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-sub-panel">
                    <h4>Specifications</h4>
                    <div className="sub-panel-inputs">
                      <input type="text" className="form-input" placeholder="Key"
                        value={specInput.key} onChange={e => setSpecInput({ ...specInput, key: e.target.value })} />
                      <input type="text" className="form-input" placeholder="Value"
                        value={specInput.value} onChange={e => setSpecInput({ ...specInput, value: e.target.value })} />
                      <button type="button" className="btn btn-sm btn-primary" onClick={handleAddSpec}><Plus size={14} /></button>
                    </div>
                    <div className="added-items-badges">
                      {Object.keys(productSpecs).map(key => (
                        <span key={key} className="attribute-badge spec-badge">
                          <strong>{key}:</strong> {productSpecs[key]}
                          <button type="button" onClick={() => { const s = { ...productSpecs }; delete s[key]; setProductSpecs(s); }}><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="form-submit-actions">
                <button type="submit" className="btn btn-primary submit-final-product-btn">Publish Product</button>
              </div>
            </form>
          </div>
        )}

        {/* ═══════════════════════════════ TAB: INVENTORY ═══════════════════════════════ */}
        {activeTab === 'products' && (
          <div className="admin-tab-content anim-fade">
            <h2>Inventory Management</h2>

            {/* Search + Bulk toolbar */}
            <div className="inventory-toolbar glass-panel">
              <div className="toolbar-search">
                <Search size={16} className="toolbar-icon" />
                <input type="text" className="form-input toolbar-input" placeholder="Search by name or category…"
                  value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} />
              </div>
              <div className="toolbar-bulk-actions">
                {bulkSelected.length > 0 ? (
                  <>
                    <span className="bulk-count">{bulkSelected.length} selected</span>
                    <button className="btn btn-sm btn-danger" onClick={bulkDelete}><Trash2 size={14} /> Delete All</button>
                    <button className="btn btn-sm btn-ghost" onClick={clearSelection}><X size={14} /> Clear</button>
                  </>
                ) : (
                  <button className="btn btn-sm btn-ghost" onClick={selectAll}><CheckSquare size={14} /> Select All</button>
                )}
              </div>
            </div>

            <div className="admin-catalog-grid glass-panel">
              <div className="admin-scrollable-table">
                <table className="admin-table inventory-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}></th>
                      <th>Image</th><th>SKU Name</th><th>Category</th>
                      <th>Price</th><th>Stock</th><th>Featured</th><th>On Sale</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(prod => {
                      const isEditing = editingProductId === prod.id;
                      const isSelected = bulkSelected.includes(prod.id);
                      return (
                        <tr key={prod.id} className={`${!prod.inStock ? 'row-out-of-stock' : ''} ${isSelected ? 'row-selected' : ''}`}>
                          <td>
                            <button className="bulk-checkbox-btn" onClick={() => toggleBulkSelect(prod.id)}>
                              {isSelected ? <CheckSquare size={16} className="sq-checked" /> : <Square size={16} />}
                            </button>
                          </td>
                          <td><img src={prod.images[0]} alt={prod.name} className="inventory-prod-thumbnail" /></td>
                          <td>
                            <strong>{prod.name}</strong><br />
                            <span className="inventory-prod-id">{prod.id}</span>
                          </td>
                          <td>{prod.category}</td>
                          <td>
                            {isEditing ? (
                              <div className="inline-edit-price-wrapper">
                                <input type="text" value={editingPrice}
                                  onChange={e => setEditingPrice(e.target.value)} className="form-input inline-price-input" />
                                <button className="inline-action-btn check" onClick={() => handleSavePrice(prod)}><Check size={14} /></button>
                                <button className="inline-action-btn cancel" onClick={() => setEditingProductId(null)}><X size={14} /></button>
                              </div>
                            ) : (
                              <div className="inline-display-price-wrapper">
                                <span>${prod.price.toFixed(2)}</span>
                                <button className="edit-price-trigger" onClick={() => handleStartEdit(prod)}><Edit size={12} /></button>
                              </div>
                            )}
                          </td>
                          <td>
                            <button className={`stock-toggler-btn ${prod.inStock ? 'in-stock' : 'out-of-stock'}`}
                              onClick={() => handleToggleStock(prod)}>
                              {prod.inStock ? 'In Stock' : 'Out of Stock'}
                            </button>
                          </td>
                          <td>
                            <button className={`toggle-badge-btn ${prod.featured ? 'active-featured' : ''}`}
                              onClick={() => handleToggleFeatured(prod)} title="Toggle Featured">
                              <Star size={15} /> {prod.featured ? 'Yes' : 'No'}
                            </button>
                          </td>
                          <td>
                            <button className={`toggle-badge-btn ${prod.onSale ? 'active-sale' : ''}`}
                              onClick={() => handleToggleOnSale(prod)} title="Toggle On Sale">
                              <Percent size={15} /> {prod.onSale ? 'Yes' : 'No'}
                            </button>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                className="catalog-item-web-btn"
                                onClick={() => window.open(`/product/${prod.slug}`, '_blank')}
                                title="View Product on Live Web Store"
                              >
                                <ExternalLink size={14} />
                              </button>
                              <button className="catalog-item-delete-btn" onClick={() => deleteProduct(prod.id)} title="Delete">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <tr><td colSpan={9} className="empty-table-row">No products match your search.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════ TAB: ORDERS ══════════════════════════════════ */}
        {activeTab === 'orders' && (
          <div className="admin-tab-content anim-fade">
            <h2>Order Management</h2>

            <div className="orders-toolbar glass-panel">
              <div className="toolbar-search">
                <Search size={16} className="toolbar-icon" />
                <input type="text" className="form-input toolbar-input" placeholder="Search by Order ID or customer name…"
                  value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
              </div>
              <div className="toolbar-filter">
                <Filter size={16} className="toolbar-icon" />
                <select className="form-input toolbar-select" value={orderStatusFilter}
                  onChange={e => setOrderStatusFilter(e.target.value)}>
                  <option value="All">All Statuses</option>
                  <option>Processing</option><option>Shipped</option>
                  <option>Delivered</option><option>Cancelled</option>
                </select>
              </div>
              <span className="toolbar-count">{filteredOrders.length} order(s)</span>
            </div>

            <div className="admin-orders-log-grid glass-panel">
              <div className="admin-scrollable-table">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Ref ID</th><th>Date &amp; Time</th><th>Customer</th>
                      <th>Items</th><th>Total</th><th>Payment</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan={7} className="empty-table-row">No orders match your filters.</td></tr>
                    ) : filteredOrders.map(order => (
                      <tr key={order.id}>
                        <td><strong style={{ fontSize: '13px', letterSpacing: '0.02em' }}>{order.id}</strong></td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <strong style={{ fontSize: '13px' }}>{order.date}</strong>
                            {order.time && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>🕐 {order.time}</span>}
                          </div>
                        </td>
                        <td>
                          <div className="customer-info-detail-box">
                            <strong>{order.shippingAddress.fullName}</strong>
                            <p>{order.shippingAddress.city}, {order.shippingAddress.country}</p>
                            {order.shippingAddress.phone && (
                              <p className="customer-phone-number" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                📞 {order.shippingAddress.phone}
                              </p>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="admin-purchased-items-details">
                            {order.items.map((item, i) => (
                              <p key={i}>• {item.name} <strong>×{item.quantity}</strong></p>
                            ))}
                          </div>
                        </td>
                        <td><strong>${order.total.toFixed(2)}</strong></td>
                        <td>{order.paymentMethod}</td>
                        <td>
                          <div className="status-selector-whatsapp-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select
                              value={order.status}
                              onChange={async (e) => {
                                const newStatus = e.target.value as Order['status'];
                                try {
                                  await updateOrderStatus(order.id, newStatus);
                                  addToast(`Order ${order.id} status updated to "${newStatus}"`, 'success');
                                } catch (error: any) {
                                  addToast(error?.message || 'Unable to update order status.', 'error');
                                }
                              }}
                              className={`form-input admin-status-selector-dropdown ${statusClass(order.status)}`}
                              style={{ margin: 0 }}
                            >
                              <option value="Processing">Processing</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                            <button
                              className="order-copy-ref-btn"
                              onClick={() => {
                                navigator.clipboard?.writeText(order.id);
                                addToast(`Order ref #${order.id} copied to clipboard!`, 'info');
                              }}
                              title="Copy Order ID for Customer Tracking"
                            >
                              <Eye size={14} />
                            </button>
                            {order.shippingAddress.phone && (
                              <a
                                href={getWhatsAppLink(order)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="whatsapp-share-btn"
                                title="Send Status update via WhatsApp"
                              >
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.638 1.967 14.19 .943 11.64.943c-5.442 0-9.871 4.372-9.875 9.802-.001 1.762.476 3.483 1.382 5.013l-.934 3.41L5.75 18.23a9.7 9.7 0 0 0 4.872 1.309c.002.32-.002.32-.002-.685zM17.386 14.2c-.322-.16-.1.218-.1-.137a.384.384 0 0 0-.022-.055s-.594-.29-2.05-1.01c-.135-.067-.272-.1-.409-.1-.176 0-.348.056-.474.167-.2.176-.902.946-1.077 1.134-.148.16-.312.18-.535.08-.344-.154-1.31-.482-2.483-1.528-.9-.8-1.5-1.787-1.674-2.083-.173-.296-.018-.456.13-.604.134-.132.297-.347.446-.521.151-.173.2-.296.3-.494.1-.198.05-.371-.025-.52-.075-.148-.672-1.62-.922-2.22-.244-.588-.492-.51-.676-.51-.175-.008-.376-.008-.577-.008-.2 0-.528.075-.803.371-.277.297-1.056 1.027-1.056 2.507 0 1.48 1.08 2.91 1.23 3.107.152.198 2.126 3.227 5.15 4.537.718.311 1.28.496 1.72.636.721.229 1.378.196 1.9.117.58-.086 1.794-.73 2.046-1.436.252-.705.252-1.312.176-1.437-.076-.123-.277-.197-.599-.356z" />
                                </svg>
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════ TAB: PROMO CODES ════════════════════════════ */}
        {activeTab === 'promo' && (
          <div className="admin-tab-content anim-fade">
            <h2>Promo Code Manager</h2>

            {/* Create promo code form */}
            <form onSubmit={handleCreatePromo} className="promo-create-form glass-panel">
              <h3>Create New Code</h3>
              <div className="promo-form-row">
                <div className="form-group">
                  <label>Promo Code (e.g. SUMMER30)</label>
                  <input type="text" className="form-input" placeholder="YOURCODE"
                    value={newPromoCode} onChange={e => setNewPromoCode(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Discount Percentage (%)</label>
                  <input type="number" min={1} max={100} className="form-input" placeholder="25"
                    value={newPromoDiscount} onChange={e => setNewPromoDiscount(e.target.value)} required />
                </div>
                <div className="promo-submit-wrapper">
                  <button type="submit" className="btn btn-primary">
                    <Plus size={16} /> Create Code
                  </button>
                </div>
              </div>
            </form>

            {/* Active promo codes table */}
            <div className="promo-codes-table-wrapper glass-panel">
              <h3>Active Promo Codes ({adminPromoCodes.length})</h3>
              <div className="admin-scrollable-table">
                <table className="admin-table">
                  <thead>
                    <tr><th>Code</th><th>Discount</th><th>Usage</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {adminPromoCodes.length === 0 ? (
                      <tr><td colSpan={4} className="empty-table-row">No promo codes created yet.</td></tr>
                    ) : adminPromoCodes.map((p: PromoCodeEntry) => (
                      <tr key={p.code}>
                        <td>
                          <span className="promo-code-chip-lg">{p.code}</span>
                        </td>
                        <td>
                          <span className="promo-discount-value">{p.discount}% OFF</span>
                        </td>
                        <td>
                          <span className="promo-usage-hint">Share with customers at checkout</span>
                        </td>
                        <td>
                          <button className="catalog-item-delete-btn" onClick={() => deleteAdminPromoCode(p.code)} title="Delete code">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;
