import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface WishlistState {
  items: string[];
}

const initialState: WishlistState = {
  items: []
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    toggleWishlist(state, action: PayloadAction<string>) {
      const productId = action.payload;
      const index = state.items.indexOf(productId);
      if (index > -1) {
        state.items.splice(index, 1);
      } else {
        state.items.push(productId);
      }
    }
  }
});

export const { toggleWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
