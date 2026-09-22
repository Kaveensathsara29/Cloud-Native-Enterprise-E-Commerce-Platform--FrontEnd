import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAppDispatch, useAuth } from './store/hooks';
import { loadUserSession, loadAdminSession } from './store/slices/authSlice';
import { fetchProducts } from './store/slices/productsSlice';
import { fetchPromos } from './store/slices/promoSlice';
import Navbar from './components/Navbar/Navbar';
import CartDrawer from './components/CartDrawer/CartDrawer';
import { ToastContainer } from './components/Toast/Toast';
import Footer from './components/Footer/Footer';
import LoginModal from './components/LoginModal/LoginModal';

// Pages
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import Wishlist from './pages/Wishlist';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ScrollToTop from './utils/ScrollToTop';

// Read Google Client ID from environment variable or fallback to placeholder
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// AppInitializer to hydrate Redux state (sessions, products, promos) on startup
function AppInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const restoreSessions = async () => {
      await Promise.all([
        dispatch(loadUserSession()),
        dispatch(loadAdminSession())
      ]);
      setIsAuthReady(true);
    };

    restoreSessions();
    dispatch(fetchProducts());
    dispatch(fetchPromos());
  }, [dispatch]);

  if (!isAuthReady) {
    return (
      <div className="app-loading-screen" role="status" aria-label="Loading">
        <span className="app-loading-dot" />
        <span className="app-loading-dot" />
        <span className="app-loading-dot" />
      </div>
    );
  }

  return <>{children}</>;
}

// Protected Route wrapper - redirects to home and opens login modal if not authenticated
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, openLoginModal } = useAuth();
  if (!isAuthenticated) {
    openLoginModal();
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

// Admin Protected Route wrapper
function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAdminAuthenticated } = useAuth();
  return isAdminAuthenticated ? <>{children}</> : <Navigate to="/admin/login" replace />;
}

// Product detail wrapper to extract slug from URL params
function ProductDetailWrapper() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  return (
    <ProductDetail
      productSlug={slug || ''}
      onNavigate={(page, params) => {
        if (page === 'product-detail' && params?.slug) navigate(`/product/${params.slug}`);
        else if (page === 'shop') navigate('/shop');
        else navigate(`/${page}`);
      }}
    />
  );
}

// Inner layout that has access to router context
function AppLayout() {
  const navigate = useNavigate();
  const [isCartOpen, setIsCartOpen] = useState(false);

  const handleNavigate = (page: string, params?: { slug?: string }) => {
    if (page === 'product-detail' && params?.slug) {
      navigate(`/product/${params.slug}`);
    } else if (page === 'home') {
      navigate('/');
    } else {
      navigate(`/${page}`);
    }
  };

  // Determine active page from pathname for Navbar highlight
  const getActivePage = () => {
    const path = window.location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/shop')) return 'shop';
    if (path.startsWith('/wishlist')) return 'wishlist';
    if (path.startsWith('/profile')) return 'profile';
    return path.replace('/', '');
  };

  return (
    <>
      <Navbar
        onCartToggle={() => setIsCartOpen(!isCartOpen)}
        onNavigate={handleNavigate}
        activePage={getActivePage()}
      />

      <main style={{ flexGrow: 1 }}>
        <Routes>
          <Route path="/" element={<Home onNavigate={handleNavigate} />} />
          <Route path="/home" element={<Home onNavigate={handleNavigate} />} />
          <Route path="/shop" element={<Shop onNavigate={handleNavigate} />} />
          <Route path="/product/:slug" element={<ProductDetailWrapper />} />
          <Route path="/wishlist" element={<Wishlist onNavigate={handleNavigate} />} />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout onNavigate={(page) => navigate(`/${page === 'home' ? '' : page}`)} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <AdminProtectedRoute>
                <AdminDashboard />
              </AdminProtectedRoute>
            }
          />
          {/* Catch-all: redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onNavigate={(page) => navigate(`/${page === 'home' ? '' : page}`)}
      />

      {/* Global Login Modal */}
      <LoginModalWrapper />

      <ToastContainer />
      <Footer />
    </>
  );
}

// Separate component to consume Auth for the modal
function LoginModalWrapper() {
  const { isLoginModalOpen, closeLoginModal } = useAuth();
  return <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />;
}

function App() {
  return (
    <Provider store={store}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <BrowserRouter>
          <ScrollToTop />
          <AppInitializer>
            <AppLayout />
          </AppInitializer>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </Provider>
  );
}

export default App;
