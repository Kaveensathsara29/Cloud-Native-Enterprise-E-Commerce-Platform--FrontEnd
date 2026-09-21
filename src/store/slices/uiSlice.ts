import { createSlice, createAsyncThunk, type PayloadAction, type Dispatch } from '@reduxjs/toolkit';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export interface UIState {
  theme: 'light' | 'dark';
  toasts: ToastMessage[];
}

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    if (typeof document !== 'undefined') document.documentElement.classList.add('dark');
    return 'dark';
  }
  if (typeof document !== 'undefined') document.documentElement.classList.remove('dark');
  return 'light';
};

const initialState: UIState = {
  theme: getInitialTheme(),
  toasts: []
};

export const showToast = createAsyncThunk<
  string,
  { message: string; type?: 'success' | 'info' | 'warning' | 'error' },
  { dispatch: Dispatch }
>('ui/showToast', ({ message, type = 'success' }, { dispatch }) => {
  const id = Math.random().toString(36).substring(2, 9);
  dispatch(addToast({ id, message, type }));
  setTimeout(() => {
    dispatch(removeToast(id));
  }, 4000);
  return id;
});

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.theme = action.payload;
      if (typeof document !== 'undefined') {
        if (action.payload === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    },
    toggleTheme(state) {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      state.theme = nextTheme;
      if (typeof document !== 'undefined') {
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    },
    addToast(
      state,
      action: PayloadAction<{
        id: string;
        message: string;
        type?: 'success' | 'info' | 'warning' | 'error';
      }>
    ) {
      state.toasts.push({
        id: action.payload.id,
        message: action.payload.message,
        type: action.payload.type || 'success'
      });
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    }
  }
});

export const { setTheme, toggleTheme, addToast, removeToast } = uiSlice.actions;
export default uiSlice.reducer;
