import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { type Product, MOCK_PRODUCTS } from '../../data/products';
import api from '../../services/api';

export interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
}

export const normalizeProduct = (p: any): Product => ({
  id: p.id || p._id?.toString() || p.slug,
  name: p.name || 'Unnamed Product',
  slug: p.slug || '',
  description: p.description || '',
  longDescription: p.longDescription || p.description || '',
  price: Number(p.price) || 0,
  originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
  rating: Number(p.rating) || 0.0,
  reviewCount: Number(p.reviewCount) || 0,
  category: p.category || 'General',
  images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [],
  colors: Array.isArray(p.colors)
    ? p.colors.map((c: any) => (typeof c === 'string' ? { name: c, hex: '#FF6B00' } : c))
    : [{ name: 'Active Orange', hex: '#FF6B00' }],
  sizes: p.sizes,
  specs: p.specs || {},
  reviews: Array.isArray(p.reviews) ? p.reviews : [],
  featured: p.featured || p.isFeatured || false,
  onSale: p.onSale || false,
  inStock: p.inStock !== undefined ? p.inStock : true,
  freeShipping: p.freeShipping === true,
  shippingFee: p.freeShipping === true ? 0 : (p.shippingFee !== undefined ? Number(p.shippingFee) : undefined),
});

export const fetchProducts = createAsyncThunk('products/fetchProducts', async () => {
  try {
    const data: any = await api.get('/products');
    if (Array.isArray(data) && data.length > 0) {
      const normalized = data.map(normalizeProduct);
      localStorage.setItem('products', JSON.stringify(normalized));
      return normalized;
    }
  } catch (err) {
    console.warn('[ProductsSlice] Backend products fetch failed, using fallback cache:', err);
  }

  const saved = localStorage.getItem('products');
  if (saved) {
    try {
      return JSON.parse(saved) as Product[];
    } catch {
      return MOCK_PRODUCTS;
    }
  }
  return MOCK_PRODUCTS;
});

export const addProductThunk = createAsyncThunk(
  'products/addProduct',
  async (product: Product) => {
    const res: any = await api.post('/products', {
      name: product.name,
      slug: product.slug,
      description: product.description,
      longDescription: product.longDescription,
      price: product.price,
      originalPrice: product.originalPrice,
      category: product.category,
      images: product.images,
      colors: product.colors,
      sizes: product.sizes,
      specs: product.specs,
      reviews: product.reviews,
      featured: product.featured,
      onSale: product.onSale,
      inStock: product.inStock,
      freeShipping: product.freeShipping,
      shippingFee: product.shippingFee,
    });
    return normalizeProduct(res);
  }
);

export const updateProductThunk = createAsyncThunk(
  'products/updateProduct',
  async (product: Product) => {
    try {
      const res: any = await api.put(`/products/${product.id}`, {
        name: product.name,
        slug: product.slug,
        price: product.price,
        originalPrice: product.originalPrice,
        description: product.description,
        longDescription: product.longDescription,
        category: product.category,
        images: product.images,
        colors: product.colors,
        sizes: product.sizes,
        specs: product.specs,
        reviews: product.reviews,
        featured: product.featured,
        onSale: product.onSale,
        inStock: product.inStock,
        freeShipping: product.freeShipping,
        shippingFee: product.shippingFee,
      });
      return normalizeProduct(res);
    } catch {
      return product;
    }
  }
);

export const deleteProductThunk = createAsyncThunk(
  'products/deleteProduct',
  async (productId: string) => {
    try {
      await api.delete(`/products/${productId}`);
    } catch (err) {
      console.warn('[deleteProduct API fallback]:', err);
    }
    return productId;
  }
);

const getInitialProducts = (): Product[] => {
  const saved = localStorage.getItem('products');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch { }
  }
  return MOCK_PRODUCTS;
};

const initialState: ProductsState = {
  products: getInitialProducts(),
  loading: false,
  error: null
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchProducts.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchProducts.fulfilled, (state, action) => {
      state.loading = false;
      state.products = action.payload;
      state.error = null;
    });
    builder.addCase(fetchProducts.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch products';
    });

    builder.addCase(addProductThunk.fulfilled, (state, action) => {
      state.products.push(action.payload);
      localStorage.setItem('products', JSON.stringify(state.products));
    });

    builder.addCase(updateProductThunk.fulfilled, (state, action) => {
      const index = state.products.findIndex((p) => p.id === action.payload.id);
      if (index > -1) {
        state.products[index] = action.payload;
      } else {
        state.products.push(action.payload);
      }
      localStorage.setItem('products', JSON.stringify(state.products));
    });

    builder.addCase(deleteProductThunk.fulfilled, (state, action) => {
      state.products = state.products.filter((p) => p.id !== action.payload);
      localStorage.setItem('products', JSON.stringify(state.products));
    });
  }
});

export default productsSlice.reducer;
