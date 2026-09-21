import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type Product } from '../../data/products';
import { loadUserSession, loginUser, googleLoginUser, signupUser, logoutUser } from './authSlice';

export interface CartItem {
  product: Product;
  selectedColor: { name: string; hex: string };
  selectedSize?: string;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  activeUserEmail: string | null;
}

const getCartKey = (email?: string | null): string => {
  if (email && email.trim()) {
    return `cart_${email.toLowerCase().trim()}`;
  }
  return 'cart_guest';
};

const saveCartToStorage = (items: CartItem[], email: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    const key = getCartKey(email);
    localStorage.setItem(key, JSON.stringify(items));
  } catch {}
};

const loadCartFromStorage = (email?: string | null): CartItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const key = getCartKey(email);
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  return [];
};

const initialState: CartState = {
  items: loadCartFromStorage(null),
  activeUserEmail: null
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart(
      state,
      action: PayloadAction<{
        product: Product;
        color: { name: string; hex: string };
        size?: string;
        qty?: number;
      }>
    ) {
      const { product, color, size, qty = 1 } = action.payload;
      const existingItemIndex = state.items.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedColor.hex === color.hex &&
          item.selectedSize === size
      );

      if (existingItemIndex > -1) {
        state.items[existingItemIndex].quantity += qty;
      } else {
        state.items.push({ product, selectedColor: color, selectedSize: size, quantity: qty });
      }
      saveCartToStorage(state.items, state.activeUserEmail);
    },

    removeFromCart(
      state,
      action: PayloadAction<{ productId: string; colorHex: string; size?: string }>
    ) {
      const { productId, colorHex, size } = action.payload;
      state.items = state.items.filter(
        (i) =>
          !(i.product.id === productId && i.selectedColor.hex === colorHex && i.selectedSize === size)
      );
      saveCartToStorage(state.items, state.activeUserEmail);
    },

    updateCartQuantity(
      state,
      action: PayloadAction<{ productId: string; colorHex: string; size?: string; qty: number }>
    ) {
      const { productId, colorHex, size, qty } = action.payload;
      if (qty <= 0) {
        state.items = state.items.filter(
          (i) =>
            !(i.product.id === productId && i.selectedColor.hex === colorHex && i.selectedSize === size)
        );
      } else {
        state.items = state.items.map((item) =>
          item.product.id === productId &&
          item.selectedColor.hex === colorHex &&
          item.selectedSize === size
            ? { ...item, quantity: qty }
            : item
        );
      }
      saveCartToStorage(state.items, state.activeUserEmail);
    },

    clearCart(state) {
      state.items = [];
      saveCartToStorage([], state.activeUserEmail);
    },

    loadUserCart(state, action: PayloadAction<string | null | undefined>) {
      const email = action.payload || null;
      state.activeUserEmail = email;
      state.items = loadCartFromStorage(email);
    }
  },
  extraReducers: (builder) => {
    // Session restore on page refresh: just load the user's saved cart directly — no merging
    const restoreUserCart = (state: CartState, email: string) => {
      const normalizedEmail = email.toLowerCase().trim();
      state.activeUserEmail = normalizedEmail;
      state.items = loadCartFromStorage(normalizedEmail);
    };

    // Actual login: merge any guest cart items the user added before logging in
    const mergeGuestCart = (state: CartState, email: string) => {
      const normalizedEmail = email.toLowerCase().trim();
      state.activeUserEmail = normalizedEmail;

      const userSavedItems = loadCartFromStorage(normalizedEmail);

      if (state.items.length > 0 && userSavedItems.length > 0) {
        // Merge guest items into user cart (don't double-add existing ones)
        const merged = [...userSavedItems];
        for (const guestItem of state.items) {
          const matchIndex = merged.findIndex(
            (i) =>
              i.product.id === guestItem.product.id &&
              i.selectedColor.hex === guestItem.selectedColor.hex &&
              i.selectedSize === guestItem.selectedSize
          );
          if (matchIndex === -1) {
            // Only add guest item if it's not already in the user cart
            merged.push(guestItem);
          }
        }
        state.items = merged;
      } else if (userSavedItems.length > 0) {
        state.items = userSavedItems;
      }
      // else: keep the guest items as-is (user had no prior saved cart)

      saveCartToStorage(state.items, normalizedEmail);
    };

    // Page refresh / session restore → just restore, never merge
    builder.addCase(loadUserSession.fulfilled, (state, action) => {
      if (action.payload?.email) {
        restoreUserCart(state, action.payload.email);
      }
    });

    // Actual login actions → merge guest cart if present
    builder.addCase(loginUser.fulfilled, (state, action) => {
      if (action.payload?.email) {
        mergeGuestCart(state, action.payload.email);
      }
    });

    builder.addCase(signupUser.fulfilled, (state, action) => {
      if (action.payload?.email) {
        mergeGuestCart(state, action.payload.email);
      }
    });

    builder.addCase(googleLoginUser.fulfilled, (state, action) => {
      if (action.payload?.email) {
        mergeGuestCart(state, action.payload.email);
      }
    });

    // Logout: clear in-memory cart but keep it saved in localStorage for next login
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.items = [];
      state.activeUserEmail = null;
    });
  }
});

export const { addToCart, removeFromCart, updateCartQuantity, clearCart, loadUserCart } = cartSlice.actions;
export default cartSlice.reducer;

