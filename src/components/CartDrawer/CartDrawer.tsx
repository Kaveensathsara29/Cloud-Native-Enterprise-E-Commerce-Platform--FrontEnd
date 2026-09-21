import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, ArrowRight, Tag } from 'lucide-react';
import { useShop, useAuth } from '../../store/hooks';
import './CartDrawer.css';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, onNavigate }) => {
  const { 
    cart, 
    updateCartQuantity, 
    removeFromCart, 
    discountPercentage, 
    promoCode, 
    applyPromoCode, 
    removePromoCode,
    addToast
  } = useShop();
  const { isAuthenticated, openLoginModal } = useAuth();

  const [couponInput, setCouponInput] = useState('');

  // Math totals — per-product shipping logic
  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const discountAmount = subtotal * (discountPercentage / 100);

  // Per-product shipping: freeShipping=true → $0; shippingFee set → use it; else global rule
  const globalFlatFee = subtotal > 150 || subtotal === 0 ? 0 : 15.0;
  const hasGlobalFeeItem = cart.some(item => !item.product.freeShipping && !item.product.shippingFee);
  const shipping =
    cart.reduce((acc, item) => {
      if (item.product.freeShipping) return acc;
      if (item.product.shippingFee && item.product.shippingFee > 0) return acc + item.product.shippingFee;
      return acc;
    }, 0) + (hasGlobalFeeItem ? globalFlatFee : 0);

  const finalTotal = subtotal - discountAmount + shipping;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (couponInput.trim()) {
      const success = await applyPromoCode(couponInput);
      if (success) setCouponInput('');
    }
  };

  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      addToast('Please log in to proceed to checkout and complete your purchase.', 'warning');
      openLoginModal();
      return;
    }
    onClose();
    onNavigate('checkout');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Semi-transparent Backdrop */}
          <motion.div 
            className="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Sliding Side Panel */}
          <motion.div 
            className="cart-drawer glass-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          >
            {/* Header */}
            <div className="cart-drawer-header">
              <h2 className="cart-drawer-title">Shopping Cart ({cart.length})</h2>
              <button className="cart-close-btn" onClick={onClose} aria-label="Close Cart">
                <X size={24} />
              </button>
            </div>

            {/* Cart Items Area */}
            <div className="cart-drawer-body">
              {cart.length === 0 ? (
                <div className="cart-empty-state">
                  <div className="empty-cart-icon">🛒</div>
                  <h3>Your cart is empty</h3>
                  <p>Looks like you haven't added anything to your cart yet.</p>
                  <button className="btn btn-primary" onClick={onClose}>
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="cart-items-list">
                  {cart.map((item, index) => (
                    <motion.div 
                      key={`${item.product.id}-${item.selectedColor.hex}-${item.selectedSize}-${index}`} 
                      className="cart-item-card"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      layout
                    >
                      <img 
                        src={item.product.images[0]} 
                        alt={item.product.name} 
                        className="cart-item-img" 
                      />
                      
                      <div className="cart-item-info">
                        <h4 className="cart-item-name">{item.product.name}</h4>
                        
                        {/* Selected options details */}
                        <div className="cart-item-options">
                          <span className="color-indicator">
                            Color: <span className="color-circle" style={{ backgroundColor: item.selectedColor.hex }} /> 
                            {item.selectedColor.name}
                          </span>
                          {item.selectedSize && (
                            <span className="size-indicator">
                              Size: <strong>{item.selectedSize}</strong>
                            </span>
                          )}
                        </div>

                        {/* Controls & Price Row */}
                        <div className="cart-item-controls-price">
                          <div className="quantity-controller">
                            <button 
                              className="qty-btn"
                              onClick={() => updateCartQuantity(item.product.id, item.selectedColor.hex, item.selectedSize, item.quantity - 1)}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="qty-value">{item.quantity}</span>
                            <button 
                              className="qty-btn"
                              onClick={() => updateCartQuantity(item.product.id, item.selectedColor.hex, item.selectedSize, item.quantity + 1)}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          
                          <span className="cart-item-total-price">
                            ${(item.product.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button 
                        className="cart-item-remove-btn"
                        onClick={() => removeFromCart(item.product.id, item.selectedColor.hex, item.selectedSize)}
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkout Pricing Math Summary */}
            {cart.length > 0 && (
              <div className="cart-drawer-footer">
                
                {/* Coupon Code section */}
                <form className="coupon-code-form" onSubmit={handleApplyCoupon}>
                  {promoCode ? (
                    <div className="applied-coupon">
                      <Tag size={16} className="coupon-icon" />
                      <span>Coupon <strong>{promoCode}</strong> applied</span>
                      <button type="button" className="remove-coupon-btn" onClick={removePromoCode}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="coupon-input-wrapper">
                      <input 
                        type="text" 
                        placeholder="Enter coupon (ABCDE20)" 
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        className="form-input coupon-input"
                      />
                      <button type="submit" className="btn btn-secondary apply-coupon-btn">
                        Apply
                      </button>
                    </div>
                  )}
                </form>

                {/* Math Breakdowns */}
                <div className="billing-breakdowns">
                  <div className="billing-row">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {discountPercentage > 0 && (
                    <div className="billing-row discount">
                      <span>Discount ({discountPercentage}%)</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="billing-row">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? 'FREE 🚚' : `$${shipping.toFixed(2)}`}</span>
                  </div>
                  {/* Show hint only when global rule applies and subtotal is below free threshold */}
                  {hasGlobalFeeItem && globalFlatFee > 0 && (
                    <p className="shipping-hint">Add ${(150 - subtotal).toFixed(2)} more for Free Shipping</p>
                  )}
                  <div className="billing-row total">
                    <span>Total</span>
                    <span className="total-price">${finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Checkout Trigger */}
                <button 
                  className="btn btn-primary checkout-trigger-btn"
                  onClick={handleProceedToCheckout}
                >
                  Proceed to Checkout <ArrowRight size={18} />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
