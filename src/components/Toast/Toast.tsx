import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { useShop } from '../../store/hooks';
import './Toast.css';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useShop();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="toast-icon success-icon" size={20} />;
      case 'info':
        return <Info className="toast-icon info-icon" size={20} />;
      case 'warning':
        return <AlertTriangle className="toast-icon warning-icon" size={20} />;
      case 'error':
        return <XCircle className="toast-icon error-icon" size={20} />;
      default:
        return null;
    }
  };

  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={`toast-item ${toast.type}`}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            layout
          >
            <div className="toast-content">
              {getIcon(toast.type)}
              <span className="toast-message">{toast.message}</span>
            </div>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
