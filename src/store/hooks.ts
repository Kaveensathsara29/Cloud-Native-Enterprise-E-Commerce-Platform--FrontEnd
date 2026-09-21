import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';
import {
  openLoginModal,
  closeLoginModal,
  loginUser,
  signupUser,
  googleLoginUser,
  logoutUser,
  updateUserProfile,
  addUserAddress,
  removeUserAddress,
  placeUserOrder,
  adminLoginUser,
  adminLogoutUser,
  updateOrderStatusThunk,
  refreshOrdersThunk,
  type Order,
  type OrderItem,
  type UserProfile
} from './slices/authSlice';
import {
  fetchProducts,
  addProductThunk,
  updateProductThunk,
  deleteProductThunk
} from './slices/productsSlice';
import {
  addToCart as addToCartAction,
  removeFromCart as removeFromCartAction,
  updateCartQuantity as updateCartQuantityAction,
  clearCart as clearCartAction
} from './slices/cartSlice';
import { toggleWishlist as toggleWishlistAction } from './slices/wishlistSlice';
import {
  toggleTheme as toggleThemeAction,
  removeToast as removeToastAction,
  showToast
} from './slices/uiSlice';
import {
  fetchPromos,
  applyPromoCodeThunk,
  removePromoCode as removePromoCodeAction,
  createAdminPromoCodeThunk,
  deleteAdminPromoCodeThunk
} from './slices/promoSlice';
import type { Product } from '../data/products';

// Standard typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Redux-backed custom hook for Auth
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);



  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    admin: auth.admin,
    isAdminAuthenticated: auth.isAdminAuthenticated,
    allOrders: auth.allOrders,
    isLoginModalOpen: auth.isLoginModalOpen,
    loading: auth.loading,
    error: auth.error,


    openLoginModal: () => dispatch(openLoginModal()),
    closeLoginModal: () => dispatch(closeLoginModal()),

    login: async (email: string, password: string): Promise<boolean> => {
      const result = await dispatch(loginUser({ email, password }));
      if (loginUser.fulfilled.match(result)) {
        return true;
      }
      throw new Error((result.payload as string) || 'Login failed');
    },

    signup: async (name: string, email: string, password: string): Promise<boolean> => {
      const result = await dispatch(signupUser({ name, email, password }));
      if (signupUser.fulfilled.match(result)) {
        return true;
      }
      throw new Error((result.payload as string) || 'Signup failed');
    },

    googleLogin: async (info: { name: string; email: string; picture?: string; idToken?: string }) => {
      const result = await dispatch(googleLoginUser(info));
      if (googleLoginUser.rejected.match(result)) {
        throw new Error((result.payload as string) || 'Google login failed');
      }
    },

    logout: () => {
      dispatch(logoutUser());
    },

    updateProfile: async (name: string, phone?: string) => {
      await dispatch(updateUserProfile({ name, phone }));
    },

    addAddress: async (address: Omit<UserProfile['addresses'][0], 'id'>) => {
      await dispatch(addUserAddress(address));
    },

    removeAddress: async (id: string) => {
      await dispatch(removeUserAddress(id));
    },

    placeOrder: async (
      items: OrderItem[],
      total: number,
      address: UserProfile['addresses'][0],
      paymentMethod: string
    ): Promise<Order> => {
      const result = await dispatch(
        placeUserOrder({ items, total, address, paymentMethod })
      );
      if (placeUserOrder.fulfilled.match(result)) {
        return result.payload.order;
      }
      throw new Error(result.error.message || (result.payload as string) || 'Failed to place order');
    },

    adminLogin: async (email: string, password: string): Promise<boolean> => {
      const result = await dispatch(adminLoginUser({ email, password }));
      return adminLoginUser.fulfilled.match(result);
    },

    adminLogout: () => {
      dispatch(adminLogoutUser());
    },

    updateOrderStatus: async (orderId: string, status: Order['status']) => {
      const result = await dispatch(updateOrderStatusThunk({ orderId, status }));
      if (updateOrderStatusThunk.rejected.match(result)) {
        throw new Error((result.payload as string) || 'Failed to update order status');
      }
    },

    refreshOrders: async () => {
      await dispatch(refreshOrdersThunk());
    }
  };
};

// Redux-backed custom hook for Shop
export const useShop = () => {
  const dispatch = useAppDispatch();
  const products = useAppSelector((state) => state.products.products);
  const rawCart = useAppSelector((state) => state.cart.items);
  const wishlist = useAppSelector((state) => state.wishlist.items);
  const theme = useAppSelector((state) => state.ui.theme);
  const toasts = useAppSelector((state) => state.ui.toasts);
  const promoCode = useAppSelector((state) => state.promo.promoCode);
  const discountPercentage = useAppSelector((state) => state.promo.discountPercentage);
  const adminPromoCodes = useAppSelector((state) => state.promo.adminPromoCodes);

  // Hydrate cart: always use the latest product data (including shippingFee/freeShipping)
  // so admin panel changes are immediately reflected in cart and checkout totals
  const cart = rawCart.map((item) => {
    const freshProduct = products.find((p) => p.id === item.product.id);
    return freshProduct ? { ...item, product: freshProduct } : item;
  });

  const addToast = (
    message: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'success'
  ) => {
    dispatch(showToast({ message, type }));
  };

  const removeToast = (id: string) => {
    dispatch(removeToastAction(id));
  };

  const auth = useAppSelector((state) => state.auth);

  const addToCart = (
    product: Product,
    color: { name: string; hex: string },
    size?: string,
    qty = 1
  ) => {
    if (!auth.isAuthenticated) {
      addToast('Please log in to add items to your cart and make purchases.', 'warning');
      dispatch(openLoginModal());
      return;
    }
    if (!product.inStock) {
      addToast(`${product.name} is currently out of stock.`, 'warning');
      return;
    }
    dispatch(addToCartAction({ product, color, size, qty }));
    addToast(`Added ${product.name} to your cart!`, 'success');
  };

  const removeFromCart = (productId: string, colorHex: string, size?: string) => {
    const item = cart.find(
      (i) => i.product.id === productId && i.selectedColor.hex === colorHex && i.selectedSize === size
    );
    dispatch(removeFromCartAction({ productId, colorHex, size }));
    if (item) {
      addToast(`Removed ${item.product.name} from cart.`, 'info');
    }
  };

  const updateCartQuantity = (
    productId: string,
    colorHex: string,
    size: string | undefined,
    qty: number
  ) => {
    dispatch(updateCartQuantityAction({ productId, colorHex, size, qty }));
  };

  const clearCart = () => {
    dispatch(clearCartAction());
  };

  const toggleWishlist = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    const exists = wishlist.includes(productId);
    dispatch(toggleWishlistAction(productId));
    if (exists) {
      addToast(`Removed ${product?.name || 'Item'} from wishlist.`, 'info');
    } else {
      addToast(`Added ${product?.name || 'Item'} to wishlist!`, 'success');
    }
  };

  const toggleTheme = () => {
    dispatch(toggleThemeAction());
    const next = theme === 'light' ? 'Dark' : 'Light';
    addToast(`${next} mode activated!`, 'info');
  };

  const applyPromoCode = async (code: string): Promise<boolean> => {
    const result = await dispatch(applyPromoCodeThunk(code));
    if (applyPromoCodeThunk.fulfilled.match(result)) {
      addToast(`Coupon applied! ${result.payload.discount}% off your purchase.`, 'success');
      return true;
    }
    addToast('Invalid promo code.', 'error');
    return false;
  };

  const removePromoCode = () => {
    dispatch(removePromoCodeAction());
    addToast('Promo code removed.', 'info');
  };

  const addProduct = async (product: Product) => {
    await dispatch(addProductThunk(product)).unwrap();
    addToast(`Product "${product.name}" published successfully!`, 'success');
  };

  const updateProduct = async (product: Product) => {
    await dispatch(updateProductThunk(product));
    addToast(`Product "${product.name}" updated successfully!`, 'success');
  };

  const deleteProduct = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    await dispatch(deleteProductThunk(productId));
    if (product) {
      addToast(`Product "${product.name}" deleted.`, 'info');
    }
  };

  const createAdminPromoCode = async (code: string, discount: number) => {
    await dispatch(createAdminPromoCodeThunk({ code, discount }));
    addToast(`Promo code "${code.toUpperCase()}" created (${discount}% off)!`, 'success');
  };

  const deleteAdminPromoCode = async (code: string) => {
    await dispatch(deleteAdminPromoCodeThunk(code));
    addToast(`Promo code "${code}" removed.`, 'info');
  };

  const refreshProducts = async () => {
    await dispatch(fetchProducts());
    await dispatch(fetchPromos());
  };

  return {
    products,
    cart,
    wishlist,
    theme,
    toasts,
    promoCode,
    discountPercentage,
    adminPromoCodes,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    toggleWishlist,
    toggleTheme,
    applyPromoCode,
    removePromoCode,
    addToast,
    removeToast,
    addProduct,
    updateProduct,
    deleteProduct,
    createAdminPromoCode,
    deleteAdminPromoCode,
    refreshProducts
  };
};
