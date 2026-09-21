import React, { useState } from 'react';
import { useShop } from '../store/hooks';
import { useAuth } from '../store/hooks';
import {
  Truck, CreditCard, CheckCircle, ArrowLeft, ArrowRight, ShieldCheck, Tag,
  Smartphone, QrCode, Wallet, Landmark, Banknote, Zap, Check, Copy, Printer
} from 'lucide-react';
import confetti from 'canvas-confetti';
import './Checkout.css';

interface CheckoutProps {
  onNavigate: (page: string) => void;
}

export const Checkout: React.FC<CheckoutProps> = ({ onNavigate }) => {
  const { cart, discountPercentage, promoCode, clearCart, addToast } = useShop();
  const { user, placeOrder } = useAuth();

  // Stepper state: 'shipping' | 'payment' | 'completed'
  const [step, setStep] = useState<'shipping' | 'payment' | 'completed'>('shipping');


  const [shippingForm, setShippingForm] = useState({
    fullName: (user?.name) || '',
    addressLine: (user?.addresses?.[0]?.addressLine) || '',
    city: (user?.addresses?.[0]?.city) || '',
    zipCode: (user?.addresses?.[0]?.zipCode) || '',
    country: (user?.addresses?.[0]?.country) || 'Sri Lanka',
    phone: user?.phone || ''
  });


  // Form Fields - Payment Method Choice: 'card' (1st Choice) | 'cardless' (2nd Choice)
  const [paymentChoice, setPaymentChoice] = useState<'card' | 'cardless'>('card');

  // Form Fields - Card Payment
  const [cardForm, setCardForm] = useState({
    cardName: user?.name || '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: ''
  });
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Form Fields - Cardless Payment
  const [cardlessMethod, setCardlessMethod] = useState<'upi' | 'cod' | 'wallet' | 'netbanking' | 'bnpl' | 'crypto'>('cod');
  const [upiId, setUpiId] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('PayPal');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [selectedBnpl, setSelectedBnpl] = useState('3 Monthly Payments (0% Interest)');
  const [copiedUpi, setCopiedUpi] = useState(false);

  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  // Redirect if cart empty and order not placed yet
  if (cart.length === 0 && !user?.orders.length && !completedOrder) {
    return (
      <div className="checkout-empty-container container">
        <h2>Your Cart is Empty</h2>
        <p>You must add items to your cart before proceeding to checkout.</p>
        <button className="btn btn-primary" onClick={() => onNavigate('shop')}>
          Go to Shop
        </button>
      </div>
    );
  }

  // Billing Math — per-product shipping logic
  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const discountAmount = subtotal * (discountPercentage / 100);
  const tax = (subtotal - discountAmount) * 0.08; // 8% sales tax

  // Per-product shipping: freeShipping=true → $0; shippingFee set → use it; else global flat rule
  const globalFlatFee = subtotal > 150 || subtotal === 0 ? 0 : 15.0;
  const hasGlobalFeeItem = cart.some(item => !item.product.freeShipping && !item.product.shippingFee);
  const shipping =
    cart.reduce((acc, item) => {
      if (item.product.freeShipping) return acc;
      if (item.product.shippingFee && item.product.shippingFee > 0) return acc + item.product.shippingFee;
      return acc;
    }, 0) + (hasGlobalFeeItem ? globalFlatFee : 0);

  const finalTotal = subtotal - discountAmount + tax + shipping;

  // Validation
  const isShippingValid = () => {
    return (
      shippingForm.fullName.trim() !== '' &&
      shippingForm.addressLine.trim() !== '' &&
      shippingForm.city.trim() !== '' &&
      shippingForm.zipCode.trim() !== '' &&
      shippingForm.country.trim() !== '' &&
      shippingForm.phone.trim() !== ''
    );
  };

  const isCardPaymentValid = () => {
    const cleanedNum = cardForm.cardNumber.replace(/\s+/g, '');
    const cleanExpiry = cardForm.cardExpiry.replace(/\//g, '');
    return (
      cardForm.cardName.trim() !== '' &&
      cleanedNum.length >= 15 && cleanedNum.length <= 16 &&
      cleanExpiry.length === 4 &&
      cardForm.cardCvv.length >= 3 && cardForm.cardCvv.length <= 4
    );
  };

  const isCardlessPaymentValid = () => {
    if (cardlessMethod === 'upi') {
      return true; // UPI ID or QR Scan
    }
    if (cardlessMethod === 'wallet') {
      return Boolean(selectedWallet);
    }
    if (cardlessMethod === 'netbanking') {
      return Boolean(selectedBank);
    }
    if (cardlessMethod === 'bnpl') {
      return Boolean(selectedBnpl);
    }
    if (cardlessMethod === 'crypto') {
      return true;
    }
    return true;
  };

  const isPaymentValid = () => {
    if (paymentChoice === 'card') {
      return isCardPaymentValid();
    } else {
      return isCardlessPaymentValid();
    }
  };

  const handleNextStep = () => {
    if (step === 'shipping' && isShippingValid()) {
      setStep('payment');
    }
  };

  const handleBackStep = () => {
    if (step === 'payment') {
      setStep('shipping');
    }
  };

  // Card Formatters
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  const getCardType = () => {
    const num = cardForm.cardNumber.replace(/\s+/g, '');
    if (num.startsWith('4')) return 'visa';
    if (num.startsWith('5')) return 'mastercard';
    return 'generic';
  };

  const copyUpiHandler = () => {
    navigator.clipboard.writeText('store@upi');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPaymentValid() || !isShippingValid() || isPlacing) return;

    setIsPlacing(true);

    // Build items payload
    const orderItems = cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      color: item.selectedColor.name,
      size: item.selectedSize,
      image: item.product.images[0]
    }));

    // Determine payment description
    let paymentDesc = '';
    if (paymentChoice === 'card') {
      paymentDesc = `Credit Card (•••• ${cardForm.cardNumber.slice(-4)})`;
    } else {
      if (cardlessMethod === 'upi') {
        paymentDesc = `Cardless - UPI (${upiId.trim() || 'QR Code Scan'})`;
      } else if (cardlessMethod === 'cod') {
        paymentDesc = `Cardless - Cash on Delivery (COD)`;
      } else if (cardlessMethod === 'wallet') {
        paymentDesc = `Cardless - ${selectedWallet} Digital Wallet`;
      } else if (cardlessMethod === 'netbanking') {
        paymentDesc = `Cardless - Net Banking (${selectedBank})`;
      } else if (cardlessMethod === 'bnpl') {
        paymentDesc = `Cardless - Pay Later (${selectedBnpl})`;
      } else {
        paymentDesc = `Cardless - Crypto Web3 Instant Pay`;
      }
    }

    try {
      // Place the order via AuthContext (saves to MongoDB)
      const placed = await placeOrder(
        orderItems,
        finalTotal,
        {
          id: "addr_temp",
          fullName: shippingForm.fullName,
          addressLine: shippingForm.addressLine,
          city: shippingForm.city,
          zipCode: shippingForm.zipCode,
          country: shippingForm.country,
          phone: shippingForm.phone
        },
        paymentDesc
      );

      setCompletedOrder(placed);
      setStep('completed');
      clearCart();

      // Trigger celebration confetti explosion
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FF6B00', '#FFA057', '#FFFFFF', '#0A0A09']
      });
    } catch (err: any) {
      console.error('Failed to complete order:', err);
      addToast(
        err?.message || 'Unable to complete the order. Please check the backend connection and try again.',
        'error'
      );
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <div className="checkout-page-container container">

      {/* Stepper Header Progress */}
      <div className="checkout-stepper-progress">
        <div className={`step-node ${step === 'shipping' || step === 'payment' || step === 'completed' ? 'active' : ''}`}>
          <div className="node-circle"><Truck size={16} /></div>
          <span>Shipping</span>
        </div>
        <div className={`step-connector ${step === 'payment' || step === 'completed' ? 'active' : ''}`}></div>
        <div className={`step-node ${step === 'payment' || step === 'completed' ? 'active' : ''}`}>
          <div className="node-circle"><CreditCard size={16} /></div>
          <span>Payment</span>
        </div>
        <div className={`step-connector ${step === 'completed' ? 'active' : ''}`}></div>
        <div className={`step-node ${step === 'completed' ? 'active' : ''}`}>
          <div className="node-circle"><CheckCircle size={16} /></div>
          <span>Confirmation</span>
        </div>
      </div>

      {/* Three Step Funnels */}
      {step === 'completed' ? (

        // Final Success Screen with Customer Mini Bill / Order Receipt
        <div className="checkout-completed-box glass-panel animate-fade">
          <div className="success-icon-bounce">🎉</div>
          <h2>Payment Successful &amp; Order Confirmed!</h2>
          <p className="success-desc">
            Your transaction has been processed via <strong>{completedOrder?.paymentMethod || 'Selected Payment Method'}</strong>. Below is your official Mini Bill receipt.
          </p>

          {/* CUSTOMER MINI BILL RECEIPT */}
          <div className="mini-bill-card">

            {/* Bill Header */}
            <div className="mini-bill-header">
              <div className="bill-brand">
                <span className="brand-icon">🍊</span>
                <div>
                  <h3 className="brand-title">MASTER STORE</h3>
                  <span className="tax-invoice-label">Official Tax Invoice &amp; Mini Bill</span>
                </div>
              </div>
              <div className="bill-status-box">
                <span className="status-badge paid">
                  <CheckCircle size={14} /> PAID / CONFIRMED
                </span>
                <span className="bill-date">{completedOrder?.date} • {completedOrder?.time}</span>
              </div>
            </div>

            <div className="mini-bill-divider"></div>

            {/* Invoice Info Grid */}
            <div className="mini-bill-info-grid">
              <div className="bill-info-item">
                <span className="info-label">Order Ref No.</span>
                <span className="info-val order-id-highlight">{completedOrder?.id}</span>
              </div>

              <div className="bill-info-item">
                <span className="info-label">Customer Name</span>
                <span className="info-val">{completedOrder?.shippingAddress.fullName}</span>
              </div>

              <div className="bill-info-item">
                <span className="info-label">Payment Method</span>
                <span className="info-val payment-method-badge">{completedOrder?.paymentMethod}</span>
              </div>

              <div className="bill-info-item">
                <span className="info-label">Delivery Destination</span>
                <span className="info-val">
                  {completedOrder?.shippingAddress.addressLine}, {completedOrder?.shippingAddress.city}, {completedOrder?.shippingAddress.zipCode}, {completedOrder?.shippingAddress.country}
                </span>
              </div>
            </div>

            {/* Items Table Breakdown */}
            <div className="mini-bill-table-wrapper">
              <table className="mini-bill-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {completedOrder?.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="item-cell">
                        <img src={item.image} alt={item.name} className="mini-bill-item-img" />
                        <div className="mini-bill-item-details">
                          <span className="item-title">{item.name}</span>
                          <span className="item-sub">Color: {item.color}{item.size ? ` | Size: ${item.size}` : ''}</span>
                        </div>
                      </td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-right">${item.price.toFixed(2)}</td>
                      <td className="text-right">${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals Summary */}
            <div className="mini-bill-totals-section">
              <div className="mini-bill-total-row">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="mini-bill-total-row discount">
                  <span>Discount ({discountPercentage}%)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="mini-bill-total-row">
                <span>Estimated Sales Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="mini-bill-total-row">
                <span>Shipping &amp; Logistics</span>
                <span style={shipping === 0 ? { color: 'var(--success)', fontWeight: 700 } : {}}>
                  {shipping === 0 ? 'FREE 🚚' : `$${shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="mini-bill-total-row grand-total">
                <span>Total Amount Paid</span>
                <span className="grand-total-price">${completedOrder?.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Bill Footer Note */}
            <div className="mini-bill-footer-note">
              <p>Thank you for shopping with Master Store! A copy of this mini bill has been saved to your account profile.</p>
            </div>

          </div>

          <div className="success-actions">
            <button className="btn btn-outline print-bill-btn" onClick={() => window.print()}>
              <Printer size={16} /> Print Mini Bill
            </button>
            <button className="btn btn-primary" onClick={() => onNavigate('profile')}>
              Go to Dashboard
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('shop')}>
              Continue Shopping
            </button>
          </div>
        </div>

      ) : (

        // Shipping & Payment Two-Column layout
        <div className="checkout-layout-grid">

          {/* Left Form Column */}
          <div className="checkout-form-column glass-panel">

            {/* Step 1: Shipping Form */}
            {step === 'shipping' && (
              <div className="shipping-step-form">
                <h3>Delivery Address</h3>
                <p className="step-hint-text">Please enter the destination details for your shipment.</p>

                <div className="checkout-fields-grid">
                  <div className="form-group full-width">
                    <label>Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. John Doe"
                      value={shippingForm.fullName}
                      onChange={(e) => setShippingForm({ ...shippingForm, fullName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Street Address</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 100 Main St, Apt 4"
                      value={shippingForm.addressLine}
                      onChange={(e) => setShippingForm({ ...shippingForm, addressLine: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. San Jose"
                      value={shippingForm.city}
                      onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>ZIP / Postal Code</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 95112"
                      value={shippingForm.zipCode}
                      onChange={(e) => setShippingForm({ ...shippingForm, zipCode: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Country</label>
                    <select
                      className="form-input"
                      value={shippingForm.country}
                      onChange={(e) => setShippingForm({ ...shippingForm, country: e.target.value })}
                    >
                      <option>Sri Lanka</option>
                      <option>United States</option>
                      <option>Canada</option>
                      <option>United Kingdom</option>
                      <option>Germany</option>
                      <option>Japan</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label>Phone Number (WhatsApp)</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. +15550192834"
                      value={shippingForm.phone}
                      onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="step-buttons">
                  <button
                    className="btn btn-secondary"
                    onClick={() => onNavigate('shop')}
                  >
                    <ArrowLeft size={16} /> Return to Shop
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={handleNextStep}
                    disabled={!isShippingValid()}
                  >
                    Next: Payment Options <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Payment Gateway with 2 Choices */}
            {step === 'payment' && (
              <div className="payment-step-form">

                <div className="payment-header-with-back">
                  <button className="back-step-btn" onClick={handleBackStep}>
                    <ArrowLeft size={16} /> Shipping Details
                  </button>
                  <h3>Select Payment Method</h3>
                </div>

                {/* 2 MAIN CHOICE TABS: 1st Card Payment, 2nd Cardless Payment */}
                <div className="payment-choice-tabs">
                  <button
                    className={`payment-choice-btn ${paymentChoice === 'card' ? 'active' : ''}`}
                    onClick={() => setPaymentChoice('card')}
                  >
                    <CreditCard size={20} />
                    <div className="choice-btn-text">
                      <span className="choice-title">Card Payment</span>
                      <span className="choice-sub">Credit / Debit Card</span>
                    </div>
                  </button>

                  <button
                    className={`payment-choice-btn ${paymentChoice === 'cardless' ? 'active' : ''}`}
                    onClick={() => setPaymentChoice('cardless')}
                  >
                    <Smartphone size={20} />
                    <div className="choice-btn-text">
                      <span className="choice-title">Cardless Payment</span>
                      <span className="choice-sub">UPI, Wallets, NetBanking &amp; BNPL</span>
                    </div>
                  </button>
                </div>

                {/* CHOICE 1: CARD PAYMENT */}
                {paymentChoice === 'card' && (
                  <div className="payment-method-panel animate-fade">

                    {/* INTERACTIVE 3D FLIPPING CARD COMPONENT */}
                    <div className="credit-card-preview-container">
                      <div className={`preview-credit-card ${isCardFlipped ? 'flipped' : ''}`}>

                        {/* Front Face */}
                        <div className="card-face card-front">
                          <div className="card-chip"></div>
                          <div className="card-network-logo">
                            {getCardType() === 'visa' && <span className="network-logo visa">VISA</span>}
                            {getCardType() === 'mastercard' && <span className="network-logo master">Mastercard</span>}
                            {getCardType() === 'generic' && <span className="network-logo generic">SecureCard</span>}
                          </div>

                          <div className="card-preview-number">
                            {cardForm.cardNumber || '•••• •••• •••• ••••'}
                          </div>

                          <div className="card-preview-footer">
                            <div className="footer-col">
                              <label>Cardholder</label>
                              <span>{cardForm.cardName.toUpperCase() || 'YOUR NAME'}</span>
                            </div>
                            <div className="footer-col">
                              <label>Expires</label>
                              <span>{cardForm.cardExpiry || 'MM/YY'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Back Face */}
                        <div className="card-face card-back">
                          <div className="magnetic-strip"></div>
                          <div className="cvv-strip">
                            <div className="sig-lines"></div>
                            <span className="cvv-preview-val">{cardForm.cardCvv || '•••'}</span>
                          </div>
                          <p className="card-back-disclaimer">Simulated gateway transaction. No actual charges are made.</p>
                        </div>

                      </div>
                    </div>

                    <form onSubmit={handlePlaceOrder} className="checkout-fields-grid">

                      <div className="form-group full-width">
                        <label>Cardholder Name</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. John Doe"
                          value={cardForm.cardName}
                          onChange={(e) => setCardForm({ ...cardForm, cardName: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group full-width">
                        <label>Card Number</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="4000 1234 5678 9010"
                          maxLength={19}
                          value={cardForm.cardNumber}
                          onChange={(e) => setCardForm({ ...cardForm, cardNumber: formatCardNumber(e.target.value) })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Expiration Date</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="MM/YY"
                          maxLength={5}
                          value={cardForm.cardExpiry}
                          onChange={(e) => setCardForm({ ...cardForm, cardExpiry: formatExpiry(e.target.value) })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>CVV / Security Code</label>
                        <input
                          type="password"
                          className="form-input"
                          placeholder="123"
                          maxLength={4}
                          value={cardForm.cardCvv}
                          onChange={(e) => setCardForm({ ...cardForm, cardCvv: e.target.value.replace(/[^0-9]/g, '') })}
                          onFocus={() => setIsCardFlipped(true)}
                          onBlur={() => setIsCardFlipped(false)}
                          required
                        />
                      </div>

                      <div className="gateway-notice full-width">
                        <ShieldCheck size={18} className="notice-icon" />
                        <span>Encrypted SSL 256-bit Secure Gateway Simulation</span>
                      </div>

                      <div className="step-buttons full-width">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleBackStep}
                        >
                          Back
                        </button>

                        <button
                          type="submit"
                          className="btn btn-primary place-order-btn"
                          disabled={!isCardPaymentValid() || isPlacing}
                        >
                          {isPlacing ? 'Processing Order...' : `Pay $${finalTotal.toFixed(2)} with Card`}
                        </button>
                      </div>

                    </form>

                  </div>
                )}

                {/* CHOICE 2: CARDLESS PAYMENT */}
                {paymentChoice === 'cardless' && (
                  <div className="payment-method-panel cardless-panel animate-fade">

                    {/* Cardless Sub Navigation */}
                    <div className="cardless-nav-pills">
                      <button
                        type="button"
                        className={`cardless-pill ${cardlessMethod === 'cod' ? 'active' : ''}`}
                        onClick={() => setCardlessMethod('cod')}
                      >
                        <Truck size={15} /> Cash on Delivery (COD)
                      </button>
                      <button
                        type="button"
                        className={`cardless-pill ${cardlessMethod === 'upi' ? 'active' : ''}`}
                        onClick={() => setCardlessMethod('upi')}
                      >
                        <QrCode size={15} /> UPI / Instant QR
                      </button>
                      <button
                        type="button"
                        className={`cardless-pill ${cardlessMethod === 'wallet' ? 'active' : ''}`}
                        onClick={() => setCardlessMethod('wallet')}
                      >
                        <Wallet size={15} /> Digital Wallets
                      </button>
                      <button
                        type="button"
                        className={`cardless-pill ${cardlessMethod === 'netbanking' ? 'active' : ''}`}
                        onClick={() => setCardlessMethod('netbanking')}
                      >
                        <Landmark size={15} /> Net Banking
                      </button>
                      <button
                        type="button"
                        className={`cardless-pill ${cardlessMethod === 'bnpl' ? 'active' : ''}`}
                        onClick={() => setCardlessMethod('bnpl')}
                      >
                        <Banknote size={15} /> Pay Later (BNPL)
                      </button>
                      <button
                        type="button"
                        className={`cardless-pill ${cardlessMethod === 'crypto' ? 'active' : ''}`}
                        onClick={() => setCardlessMethod('crypto')}
                      >
                        <Zap size={15} /> Web3 / Crypto
                      </button>
                    </div>

                    <form onSubmit={handlePlaceOrder} className="cardless-content-box">

                      {/* Sub-option 1: Cash on Delivery (COD) */}
                      {cardlessMethod === 'cod' && (
                        <div className="cardless-section-container animate-fade">
                          <div className="cod-pay-box glass-panel">
                            <div className="cod-header-icon">
                              <Truck size={40} className="cod-truck-icon" />
                            </div>
                            <h4>Cash on Delivery (COD)</h4>
                            <p>Pay with Cash, UPI QR scan, or Card terminal right at your doorstep upon package delivery!</p>

                            <div className="cod-perks-grid">
                              <div className="cod-perk-item">
                                <span className="cod-perk-badge">✓ Zero Prepayment</span>
                                <p>No advance payment or card details required online.</p>
                              </div>
                              <div className="cod-perk-item">
                                <span className="cod-perk-badge">✓ Doorstep Verification</span>
                                <p>Inspect your shipment before making final payment.</p>
                              </div>
                              <div className="cod-perk-item">
                                <span className="cod-perk-badge">✓ Flexible Payment</span>
                                <p>Pay using Cash or scan driver's QR code on arrival.</p>
                              </div>
                            </div>

                            <div className="cod-verification-notice">
                              <input type="checkbox" id="cod-verify-check" defaultChecked required />
                              <label htmlFor="cod-verify-check">
                                I confirm my shipping address is valid and I will pay <strong>${finalTotal.toFixed(2)}</strong> upon delivery.
                              </label>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sub-option 2: UPI & QR Code */}
                      {cardlessMethod === 'upi' && (
                        <div className="cardless-section-container">
                          <div className="qr-pay-wrapper glass-panel">
                            <div className="qr-code-display">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=store@upi&pn=OrangeStore&am=${finalTotal.toFixed(2)}&cu=USD`}
                                alt="UPI Payment QR Code"
                                className="qr-image"
                              />
                              <span className="qr-hint">Scan with any UPI App</span>
                            </div>
                            <div className="qr-details">
                              <h4>Instant Scan &amp; Pay</h4>
                              <p>Scan this QR code using Google Pay, PhonePe, Paytm, BHIM, or your mobile banking app to pay <strong>${finalTotal.toFixed(2)}</strong>.</p>

                              <div className="upi-copy-row">
                                <span className="upi-id-badge">Merchant VPA: store@upi</span>
                                <button type="button" className="copy-upi-btn" onClick={copyUpiHandler}>
                                  {copiedUpi ? <Check size={14} /> : <Copy size={14} />}
                                  {copiedUpi ? 'Copied!' : 'Copy VPA'}
                                </button>
                              </div>

                              <div className="supported-upi-apps">
                                <span className="app-badge gpay">GPay</span>
                                <span className="app-badge phonepe">PhonePe</span>
                                <span className="app-badge paytm">Paytm</span>
                                <span className="app-badge bhim">BHIM</span>
                              </div>
                            </div>
                          </div>

                          <div className="form-group full-width" style={{ marginTop: '20px' }}>
                            <label>Or Enter Your UPI ID (Optional)</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="username@upi or 9876543210@paytm"
                              value={upiId}
                              onChange={(e) => setUpiId(e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {/* Sub-option 2: Digital Wallets */}
                      {cardlessMethod === 'wallet' && (
                        <div className="cardless-section-container">
                          <h4>Select Preferred Digital Wallet</h4>
                          <div className="wallets-grid">
                            {[
                              { name: 'PayPal', desc: 'Fast & Secure PayPal 1-Click Pay', icon: '🅿️' },
                              { name: 'Apple Pay', desc: 'Touch ID / Face ID Direct Checkout', icon: '🍎' },
                              { name: 'Google Pay', desc: 'Pay instantly via saved Google Account', icon: '🌐' },
                              { name: 'Samsung Pay', desc: 'Mobile wallet NFC and online pay', icon: '📱' }
                            ].map((w) => (
                              <div
                                key={w.name}
                                className={`wallet-card-option glass-panel ${selectedWallet === w.name ? 'selected' : ''}`}
                                onClick={() => setSelectedWallet(w.name)}
                              >
                                <span className="wallet-icon">{w.icon}</span>
                                <div>
                                  <h5>{w.name}</h5>
                                  <p>{w.desc}</p>
                                </div>
                                <div className="option-radio-dot"></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sub-option 3: Net Banking */}
                      {cardlessMethod === 'netbanking' && (
                        <div className="cardless-section-container">
                          <h4>Select Bank for Direct Internet Banking</h4>
                          <div className="banks-grid">
                            {[
                              'HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank',
                              'Chase Bank', 'Bank of America', 'HSBC Global', 'Wells Fargo'
                            ].map((b) => (
                              <button
                                key={b}
                                type="button"
                                className={`bank-select-btn ${selectedBank === b ? 'selected' : ''}`}
                                onClick={() => setSelectedBank(b)}
                              >
                                <Landmark size={18} />
                                <span>{b}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sub-option 4: BNPL / EMI */}
                      {cardlessMethod === 'bnpl' && (
                        <div className="cardless-section-container">
                          <h4>Cardless EMI &amp; Pay Later Plans</h4>
                          <div className="bnpl-plans-list">
                            {[
                              { plan: '3 Monthly Payments (0% Interest)', installment: `$${(finalTotal / 3).toFixed(2)}/mo`, provider: 'Klarna Pay in 3' },
                              { plan: '4 Interest-Free Bi-Weekly Payments', installment: `$${(finalTotal / 4).toFixed(2)}/fortnight`, provider: 'Afterpay' },
                              { plan: '6 Monthly Payments (Low EMI)', installment: `$${(finalTotal / 6 * 1.02).toFixed(2)}/mo`, provider: 'Affirm EMI' }
                            ].map((item) => (
                              <div
                                key={item.plan}
                                className={`bnpl-plan-card glass-panel ${selectedBnpl === item.plan ? 'selected' : ''}`}
                                onClick={() => setSelectedBnpl(item.plan)}
                              >
                                <div className="bnpl-info">
                                  <h5>{item.plan}</h5>
                                  <span className="provider-tag">{item.provider}</span>
                                </div>
                                <span className="installment-amount">{item.installment}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sub-option 5: Crypto Wallet */}
                      {cardlessMethod === 'crypto' && (
                        <div className="cardless-section-container">
                          <div className="crypto-pay-box glass-panel">
                            <Zap size={32} className="crypto-zap-icon" />
                            <h4>Web3 Instant Crypto Pay</h4>
                            <p>Pay with Bitcoin (BTC), Ethereum (ETH), or USDT directly using MetaMask, Phantom, or WalletConnect.</p>
                            <span className="crypto-amount-badge">Total: {(finalTotal / 3200).toFixed(4)} ETH / ${finalTotal.toFixed(2)} USDT</span>
                          </div>
                        </div>
                      )}

                      <div className="gateway-notice full-width">
                        <ShieldCheck size={18} className="notice-icon" />
                        <span>Cardless Payment Gateway: Verified Instant Processing</span>
                      </div>

                      <div className="step-buttons full-width">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleBackStep}
                        >
                          Back
                        </button>

                        <button
                          type="submit"
                          className="btn btn-primary place-order-btn"
                          disabled={!isPaymentValid() || isPlacing}
                        >
                          {isPlacing ? 'Processing Order...' : `Complete Cardless Order ($${finalTotal.toFixed(2)})`}
                        </button>
                      </div>

                    </form>

                  </div>
                )}

              </div>
            )}

          </div>

          {/* Right Summary Invoice Column */}
          <div className="checkout-summary-column glass-panel">
            <h3>Order Summary</h3>

            {/* Products small list */}
            <div className="summary-products-list">
              {cart.map((item, index) => (
                <div key={index} className="summary-product-item">
                  <img src={item.product.images[0]} alt={item.product.name} className="summary-prod-img" />
                  <div className="summary-prod-info">
                    <h4>{item.product.name}</h4>
                    <span>Qty: {item.quantity} | {item.selectedColor.name}</span>
                  </div>
                  <span className="summary-prod-price">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations math breakdown */}
            <div className="summary-billing-box">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountPercentage > 0 && (
                <div className="summary-row discount">
                  <span className="discount-tag">
                    <Tag size={12} /> Discount ({discountPercentage}%)
                  </span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              {promoCode && (
                <div className="promo-details">
                  Coupon applied: <strong>{promoCode}</strong>
                </div>
              )}
              <div className="summary-row">
                <span>Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
              </div>

              <div className="summary-row total">
                <span>Total Amount</span>
                <span className="final-total">${finalTotal.toFixed(2)}</span>
              </div>
            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default Checkout;
