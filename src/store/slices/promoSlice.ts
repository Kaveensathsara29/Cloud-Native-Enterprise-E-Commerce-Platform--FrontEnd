import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export interface PromoCodeEntry {
  code: string;
  discount: number;
}

export interface PromoState {
  promoCode: string;
  discountPercentage: number;
  adminPromoCodes: PromoCodeEntry[];
}

const defaultPromos: PromoCodeEntry[] = [
  { code: 'ABCED20', discount: 20 },
  { code: 'ABCED50', discount: 50 }
];

export const fetchPromos = createAsyncThunk('promo/fetchPromos', async () => {
  try {
    const data: any = await api.get('/promos');
    if (Array.isArray(data) && data.length > 0) {
      return data.map((p: any) => ({ code: p.code, discount: Number(p.discount) }));
    }
  } catch (err) {
    console.warn('[PromoSlice] Backend promos fetch failed:', err);
  }
  return defaultPromos;
});

export const applyPromoCodeThunk = createAsyncThunk(
  'promo/applyPromoCode',
  async (code: string, { getState, rejectWithValue }) => {
    const formattedCode = code.toUpperCase().trim();
    try {
      const res: any = await api.post('/promos/validate', { code: formattedCode });
      if (res && res.valid) {
        return { code: formattedCode, discount: Number(res.discount) };
      }
    } catch {
      // Memory fallback check from state
      const state = (getState() as any).promo as PromoState;
      const match = state.adminPromoCodes.find((c) => c.code === formattedCode);
      if (match) {
        return { code: formattedCode, discount: match.discount };
      }
    }
    return rejectWithValue('Invalid promo code');
  }
);

export const createAdminPromoCodeThunk = createAsyncThunk(
  'promo/createAdminPromoCode',
  async ({ code, discount }: { code: string; discount: number }) => {
    const formatted = code.toUpperCase().trim();
    try {
      await api.post('/promos', { code: formatted, discount });
    } catch (err) {
      console.warn('[createAdminPromoCode API fallback]:', err);
    }
    return { code: formatted, discount };
  }
);

export const deleteAdminPromoCodeThunk = createAsyncThunk(
  'promo/deleteAdminPromoCode',
  async (code: string) => {
    const formatted = code.toUpperCase().trim();
    try {
      await api.delete(`/promos/${formatted}`);
    } catch (err) {
      console.warn('[deleteAdminPromoCode API fallback]:', err);
    }
    return formatted;
  }
);

const initialState: PromoState = {
  promoCode: '',
  discountPercentage: 0,
  adminPromoCodes: defaultPromos
};

const promoSlice = createSlice({
  name: 'promo',
  initialState,
  reducers: {
    removePromoCode(state) {
      state.promoCode = '';
      state.discountPercentage = 0;
    }
  },
  extraReducers: (builder) => {
    builder.addCase(fetchPromos.fulfilled, (state, action) => {
      state.adminPromoCodes = action.payload;
    });

    builder.addCase(applyPromoCodeThunk.fulfilled, (state, action) => {
      state.promoCode = action.payload.code;
      state.discountPercentage = action.payload.discount;
    });

    builder.addCase(createAdminPromoCodeThunk.fulfilled, (state, action) => {
      const filtered = state.adminPromoCodes.filter((c) => c.code !== action.payload.code);
      state.adminPromoCodes = [...filtered, action.payload];
    });

    builder.addCase(deleteAdminPromoCodeThunk.fulfilled, (state, action) => {
      state.adminPromoCodes = state.adminPromoCodes.filter((c) => c.code !== action.payload);
    });
  }
});

export const { removePromoCode } = promoSlice.actions;
export default promoSlice.reducer;
