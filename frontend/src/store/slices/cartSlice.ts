import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { loginSuccess, logout } from './authSlice';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  storeId?: string;
  storeName?: string;
}

interface CartState {
  items: CartItem[];
  totalAmount: number;
}

// Helpers for per-user cart persistence
const getStoredUser = (): { id?: string } | null => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getCartKey = (user: { id?: string } | null): string => {
  const userId = user?.id || 'guest';
  return `cart:${userId}`;
};

const recalcTotal = (items: CartItem[]): number => items.reduce((total, item) => total + item.price * item.quantity, 0);

const loadCartForUser = (user: { id?: string } | null): CartItem[] => {
  try {
    const key = getCartKey(user);
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
};

const saveCartForCurrentUser = (items: CartItem[]) => {
  const user = getStoredUser();
  const key = getCartKey(user);
  localStorage.setItem(key, JSON.stringify(items));
};

// Initial state loads cart per current user (or guest)
const initialItems = loadCartForUser(getStoredUser());
const initialState: CartState = {
  items: initialItems,
  totalAmount: recalcTotal(initialItems),
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.items.find(item => item.id === action.payload.id && item.storeId === action.payload.storeId);
      if (existingItem) {
        existingItem.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
      state.totalAmount = recalcTotal(state.items);
      saveCartForCurrentUser(state.items);
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
      state.totalAmount = recalcTotal(state.items);
      saveCartForCurrentUser(state.items);
    },
    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const item = state.items.find(item => item.id === action.payload.id);
      if (item) {
        item.quantity = action.payload.quantity;
      }
      state.totalAmount = recalcTotal(state.items);
      saveCartForCurrentUser(state.items);
    },
    clearCart: (state) => {
      state.items = [];
      state.totalAmount = 0;
      saveCartForCurrentUser(state.items);
    },
  },
  extraReducers: (builder) => {
    
    builder.addCase(loginSuccess, (state, action) => {
      const user = action.payload.user;
      const items = loadCartForUser(user);
      state.items = items;
      state.totalAmount = recalcTotal(items);
    });
    // Khi đăng xuất: back giỏ của khách  or rỗng 
    builder.addCase(logout, (state) => {
      const guestItems = loadCartForUser(null);
      state.items = guestItems;
      state.totalAmount = recalcTotal(guestItems);
    });
  },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;