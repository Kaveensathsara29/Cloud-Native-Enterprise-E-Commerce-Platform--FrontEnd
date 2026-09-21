import React, { useState } from 'react';
import { useAuth, useShop } from '../store/hooks';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';
import './AdminLogin.css';

export const AdminLogin: React.FC = () => {
  const { adminLogin } = useAuth();
  const { addToast } = useShop();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      addToast("Please fill in email and password.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await adminLogin(email, password);
      if (success) {
        addToast("Admin session authenticated. Welcome back!", "success");
        navigate('/admin/dashboard');
      } else {
        addToast("Invalid admin credentials. Please try again.", "error");
      }
    } catch {
      addToast("Failed to connect to authentication gateway.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-login-container container">
      <div className="admin-login-card glass-panel">
        <div className="admin-login-header">
          <div className="admin-badge">
            <ShieldCheck size={28} />
          </div>
          <h2>Admin Portal Control</h2>
          <p className="admin-subtitle">Enter secure portal credentials to access inventory and sales registries.</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label>Secure Email</label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                className="form-input"
                placeholder="e.g. admin@master.net"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Gateway Password</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary admin-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Authenticating...' : 'Authenticate Access'} <ArrowRight size={16} />
          </button>
        </form>

        <div className="admin-hint-box">
          <p>Demo Admin Account:</p>
          <code>Email: admin@master.net</code><br />
          <code>Password: admin123</code>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
