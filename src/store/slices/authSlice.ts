import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { setAuthToken, setAdminToken } from '../../services/api';

// Clean up other legacy keys, but PRESERVE products, cart, and authentication session data
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const protectedKeys = ['products', 'auth_token', 'auth_user', 'admin_token', 'admin_user'];
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && !protectedKeys.includes(key) && !key.startsWith('cart')) {
        localStorage.removeItem(key);
      }
    }
  } catch { }
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  color: string;
  size?: string;
  image: string;
}

export interface Order {
  id: string;
  date: string;
  time: string;
  items: OrderItem[];
  total: number;
  shippingAddress: {
    fullName: string;
    addressLine: string;
    city: string;
    zipCode: string;
    country: string;
    phone?: string;
  };
  paymentMethod: string;
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
}

export interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  addresses: {
    id: string;
    fullName: string;
    addressLine: string;
    city: string;
    zipCode: string;
    country: string;
    phone?: string;
  }[];
  orders: Order[];
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  admin: { email: string } | null;
  isAdminAuthenticated: boolean;
  allOrders: Order[];
  isLoginModalOpen: boolean;
  loading: boolean;
  error: string | null;
}

// Order formatting helper from backend response
export const formatOrder = (raw: any): Order => {
  const d = raw.createdAt ? new Date(raw.createdAt) : new Date();
  return {
    id: raw.orderId || raw.id || raw._id?.toString() || '',
    date: raw.date || d.toISOString().split('T')[0],
    time: raw.time || d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    items: (raw.items || []).map((it: any) => ({
      productId: it.productId || it.product || '',
      name: it.name || '',
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 1,
      color: it.color || 'Default',
      size: it.size,
      image: it.image || ''
    })),
    total: Number(raw.total) || 0,
    shippingAddress: {
      fullName: raw.shippingAddress?.fullName || '',
      addressLine: raw.shippingAddress?.addressLine || '',
      city: raw.shippingAddress?.city || '',
      zipCode: raw.shippingAddress?.zipCode || '',
      country: raw.shippingAddress?.country || '',
      phone: raw.shippingAddress?.phone || ''
    },
    paymentMethod: raw.paymentMethod || '',
    status: raw.status || ''
  };
};

// Address formatting helper
export const formatAddress = (raw: any): UserProfile['addresses'][0] => ({
  id: raw.id || raw._id?.toString() || 'addr_' + Math.random().toString(36).substring(2, 9),
  fullName: raw.fullName || '',
  addressLine: raw.addressLine || '',
  city: raw.city || '',
  zipCode: raw.zipCode || '',
  country: raw.country || '',
  phone: raw.phone || ''
});

// Async Thunks
export const loadUserSession = createAsyncThunk('auth/loadUserSession', async (_, { rejectWithValue }) => {
  try {
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!authToken) return rejectWithValue('No active session');

    const profile: any = await api.get('/users/profile');
    const myOrders: any = await api.get('/orders/myorders').catch(() => []);
    const formattedOrders = Array.isArray(myOrders) ? myOrders.map(formatOrder) : [];
    const fullProfile: UserProfile = {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      profilePicture: profile.profilePicture,
      addresses: Array.isArray(profile.addresses) ? profile.addresses.map(formatAddress) : [],
      orders: formattedOrders
    };
    // Persist fresh profile for next page load
    try { localStorage.setItem('auth_user', JSON.stringify(fullProfile)); } catch { }
    return fullProfile;
  } catch (err: any) {
    // On 401 → clear session. On network/other errors → return cached user as fallback
    if (err?.status === 401) {
      try {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      } catch { }
      return rejectWithValue('Session expired');
    }
    // Transient error — try to serve cached profile so user stays logged in
    try {
      const cachedUser = localStorage.getItem('auth_user');
      if (cachedUser) return JSON.parse(cachedUser) as UserProfile;
    } catch { }
    return rejectWithValue('No active session');
  }
});

export const loadAdminSession = createAsyncThunk('auth/loadAdminSession', async () => {
  const adminToken = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const cachedAdmin = typeof window !== 'undefined' ? localStorage.getItem('admin_user') : null;
  const admin: { email: string } | null = adminToken && cachedAdmin ? JSON.parse(cachedAdmin) : null;
  const isAdminAuthenticated = Boolean(adminToken && admin);

  let orders: Order[] = [];
  if (isAdminAuthenticated) {
    try {
      const ordersData: any = await api.get('/orders');
      if (Array.isArray(ordersData)) {
        orders = ordersData.map(formatOrder);
      }
    } catch { }
  }
  return { admin, orders, isAdminAuthenticated };
});

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const data: any = await api.post('/auth/login', { email, password });
      setAuthToken(data.token);

      const ordersData: any = await api.get('/orders/myorders').catch(() => []);
      const userOrders = Array.isArray(ordersData) ? ordersData.map(formatOrder) : [];

      const profile: UserProfile = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        profilePicture: data.profilePicture,
        addresses: Array.isArray(data.addresses) ? data.addresses.map(formatAddress) : [],
        orders: userOrders
      };

      try { localStorage.setItem('auth_user', JSON.stringify(profile)); } catch { }
      return profile;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || error.message || 'Login failed');
    }
  }
);

export const signupUser = createAsyncThunk(
  'auth/signupUser',
  async ({ name, email, password }: { name: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const data: any = await api.post('/auth/register', { name, email, password });
      setAuthToken(data.token);

      const profile: UserProfile = {
        name: data.name,
        email: data.email,
        addresses: [],
        orders: []
      };

      try { localStorage.setItem('auth_user', JSON.stringify(profile)); } catch { }
      return profile;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || error.message || 'Signup failed');
    }
  }
);

export const googleLoginUser = createAsyncThunk(
  'auth/googleLoginUser',
  async (info: { name: string; email: string; picture?: string; idToken?: string }, { rejectWithValue }) => {
    try {
      const data: any = await api.post('/auth/google', info);
      if (data.token) {
        setAuthToken(data.token);
      }

      const ordersData: any = await api.get('/orders/myorders').catch(() => []);
      const userOrders = Array.isArray(ordersData) ? ordersData.map(formatOrder) : [];

      const profile: UserProfile = {
        name: data.name || info.name,
        email: data.email || info.email,
        profilePicture: data.profilePicture || info.picture,
        phone: data.phone,
        addresses: Array.isArray(data.addresses) ? data.addresses.map(formatAddress) : [],
        orders: userOrders
      };

      try { localStorage.setItem('auth_user', JSON.stringify(profile)); } catch { }
      return profile;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || error.message || 'Google login failed');
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  setAuthToken(null);
  try { localStorage.removeItem('auth_user'); } catch { }
});

export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async ({ name, phone }: { name: string; phone?: string }, { getState }) => {
    const state = (getState() as any).auth as AuthState;
    if (!state.user) throw new Error('Not logged in');
    try {
      const res: any = await api.put('/users/profile', { name, phone });
      return { ...state.user, name: res.name || name, phone: res.phone || phone };
    } catch {
      return { ...state.user, name, phone };
    }
  }
);

export const addUserAddress = createAsyncThunk(
  'auth/addUserAddress',
  async (address: Omit<UserProfile['addresses'][0], 'id'>, { getState }) => {
    const state = (getState() as any).auth as AuthState;
    if (!state.user) throw new Error('Not logged in');
    try {
      const res: any = await api.post('/users/addresses', address);
      const updatedAddresses = Array.isArray(res)
        ? res.map(formatAddress)
        : [...state.user.addresses, { ...address, id: 'addr_' + Date.now() }];
      return { ...state.user, addresses: updatedAddresses };
    } catch {
      const newAddress = {
        ...address,
        id: 'addr_' + Math.random().toString(36).substring(2, 9)
      };
      return { ...state.user, addresses: [...state.user.addresses, newAddress] };
    }
  }
);

export const removeUserAddress = createAsyncThunk(
  'auth/removeUserAddress',
  async (id: string, { getState }) => {
    const state = (getState() as any).auth as AuthState;
    if (!state.user) throw new Error('Not logged in');
    try {
      const res: any = await api.delete(`/users/addresses/${id}`);
      const updatedAddresses = Array.isArray(res)
        ? res.map(formatAddress)
        : state.user.addresses.filter((a) => a.id !== id);
      return { ...state.user, addresses: updatedAddresses };
    } catch {
      return { ...state.user, addresses: state.user.addresses.filter((addr) => addr.id !== id) };
    }
  }
);

export const placeUserOrder = createAsyncThunk(
  'auth/placeUserOrder',
  async (
    {
      items,
      total,
      address,
      paymentMethod
    }: {
      items: OrderItem[];
      total: number;
      address: UserProfile['addresses'][0];
      paymentMethod: string;
    },
    { getState }
  ) => {
    const state = (getState() as any).auth as AuthState;
    if (!state.user) throw new Error('Cannot place order: User not logged in.');

    const res: any = await api.post('/orders', {
      items,
      total,
      shippingAddress: {
        fullName: address.fullName,
        addressLine: address.addressLine,
        city: address.city,
        zipCode: address.zipCode,
        country: address.country,
        phone: address.phone
      },
      paymentMethod
    });

    const newOrder = formatOrder(res);
    const updatedUser = {
      ...state.user,
      orders: [newOrder, ...state.user.orders]
    };
    return { order: newOrder, updatedUser };
  }
);

export const adminLoginUser = createAsyncThunk(
  'auth/adminLoginUser',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const data: any = await api.post('/auth/admin-login', { email, password });
      setAdminToken(data.token);
      const adminDetails = { email: data.email };
      try { localStorage.setItem('admin_user', JSON.stringify(adminDetails)); } catch { }

      let orders: Order[] = [];
      const ordersData: any = await api.get('/orders').catch(() => []);
      if (Array.isArray(ordersData)) {
        orders = ordersData.map(formatOrder);
      }
      return { admin: adminDetails, orders };
    } catch {
      return rejectWithValue('Admin login failed');
    }
  }
);

export const adminLogoutUser = createAsyncThunk('auth/adminLogoutUser', async () => {
  setAdminToken(null);
  try { localStorage.removeItem('admin_user'); } catch { }
});

export const updateOrderStatusThunk = createAsyncThunk(
  'auth/updateOrderStatus',
  async ({ orderId, status }: { orderId: string; status: Order['status'] }) => {
    // Send orderId directly; the backend accepts both Mongo ObjectIds and ORD-xxxxx values.
    await api.patch(`/orders/${orderId}/status`, { status });

    try {
      window.dispatchEvent(new CustomEvent('order_status_updated', { detail: { orderId, status } }));
    } catch (e) {
      console.warn('[updateOrderStatus dispatch warning]:', e);
    }

    return { orderId, status };
  }
);

export const refreshOrdersThunk = createAsyncThunk('auth/refreshOrders', async (_, { getState }) => {
  const state = (getState() as any).auth as AuthState;
  if (state.isAdminAuthenticated) {
    const ordersData: any = await api.get('/orders').catch(() => []);
    if (Array.isArray(ordersData)) {
      const formatted = ordersData.map(formatOrder);
      return { type: 'admin' as const, allOrders: formatted };
    }
  } else if (state.isAuthenticated && state.user) {
    const ordersData: any = await api.get('/orders/myorders').catch(() => []);
    if (Array.isArray(ordersData)) {
      const formatted = ordersData.map(formatOrder);
      return { type: 'user' as const, userOrders: formatted };
    }
  }
  return null;
});

// Hydrate initial state from localStorage so there is no logged-out flash on page refresh
const getInitialState = (): AuthState => {
  try {
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const cachedUser = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    const adminToken = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    const cachedAdmin = typeof window !== 'undefined' ? localStorage.getItem('admin_user') : null;

    const user: UserProfile | null = authToken && cachedUser ? JSON.parse(cachedUser) : null;
    const admin: { email: string } | null = adminToken && cachedAdmin ? JSON.parse(cachedAdmin) : null;

    return {
      user,
      isAuthenticated: Boolean(authToken && user),
      admin,
      isAdminAuthenticated: Boolean(adminToken && admin),
      allOrders: [],
      isLoginModalOpen: false,
      loading: false,
      error: null
    };
  } catch {
    return {
      user: null,
      isAuthenticated: false,
      admin: null,
      isAdminAuthenticated: false,
      allOrders: [],
      isLoginModalOpen: false,
      loading: false,
      error: null
    };
  }
};

const initialState: AuthState = getInitialState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    openLoginModal(state) {
      state.isLoginModalOpen = true;
    },
    closeLoginModal(state) {
      state.isLoginModalOpen = false;
    }
  },
  extraReducers: (builder) => {
    builder.addCase(loadUserSession.fulfilled, (state, action) => {
      if (action.payload) {
        state.user = action.payload;
        state.isAuthenticated = true;
      } else {
        state.user = null;
        state.isAuthenticated = false;
      }
    });
    builder.addCase(loadUserSession.rejected, (state) => {
      state.user = null;
      state.isAuthenticated = false;
    });

    builder.addCase(loadAdminSession.fulfilled, (state, action) => {
      state.admin = action.payload.admin;
      state.isAdminAuthenticated = action.payload.isAdminAuthenticated;
      if (action.payload.orders.length > 0) {
        state.allOrders = action.payload.orders;
      }
    });

    builder.addCase(loginUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginUser.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    });
    builder.addCase(loginUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    builder.addCase(signupUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(signupUser.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    });
    builder.addCase(signupUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    builder.addCase(googleLoginUser.fulfilled, (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    });

    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
    });

    builder.addCase(updateUserProfile.fulfilled, (state, action) => {
      state.user = action.payload;
    });

    builder.addCase(addUserAddress.fulfilled, (state, action) => {
      state.user = action.payload;
    });

    builder.addCase(removeUserAddress.fulfilled, (state, action) => {
      state.user = action.payload;
    });

    builder.addCase(placeUserOrder.fulfilled, (state, action) => {
      state.user = action.payload.updatedUser;
      state.allOrders = [action.payload.order, ...state.allOrders];
    });

    builder.addCase(adminLoginUser.fulfilled, (state, action) => {
      state.admin = action.payload.admin;
      state.isAdminAuthenticated = true;
      state.allOrders = action.payload.orders;
    });

    builder.addCase(adminLogoutUser.fulfilled, (state) => {
      state.admin = null;
      state.isAdminAuthenticated = false;
    });

    builder.addCase(updateOrderStatusThunk.fulfilled, (state, action) => {
      const { orderId, status } = action.payload;
      state.allOrders = state.allOrders.map((ord) =>
        ord.id === orderId ? { ...ord, status } : ord
      );

      if (state.user) {
        state.user = {
          ...state.user,
          orders: state.user.orders.map((ord) => (ord.id === orderId ? { ...ord, status } : ord))
        };
      }
    });

    builder.addCase(refreshOrdersThunk.fulfilled, (state, action) => {
      if (!action.payload) return;
      if (action.payload.type === 'admin') {
        state.allOrders = action.payload.allOrders;
      } else if (action.payload.type === 'user' && state.user) {
        state.user.orders = action.payload.userOrders;
      }
    });
  }
});

export const { openLoginModal, closeLoginModal } = authSlice.actions;
export default authSlice.reducer;
