import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  store?: string;
  storeId?: string;
  available: boolean;
}

interface MenuState {
  items: MenuItem[];
  filteredItems: MenuItem[];
  categories: string[];
  isLoading: boolean;
  error: string | null;
}

const initialState: MenuState = {
  items: [],
  filteredItems: [],
  categories: [],
  isLoading: false,
  error: null,
};

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    fetchMenuStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchMenuSuccess: (state, action: PayloadAction<MenuItem[]>) => {
      state.isLoading = false;
      state.items = action.payload;
      state.filteredItems = action.payload;
      // state.categories = [...new Set(action.payload.map(item => item.category))];
    },
    fetchMenuFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    filterByCategory: (state, action: PayloadAction<string>) => {
      if (action.payload === 'all') {
        state.filteredItems = state.items;
      } else {
        state.filteredItems = state.items.filter(item => item.category === action.payload);
      }
    },
    searchItems: (state, action: PayloadAction<string>) => {
      const searchTerm = action.payload.toLowerCase();
      state.filteredItems = state.items.filter(item => 
        item.name.toLowerCase().includes(searchTerm) || 
        item.description.toLowerCase().includes(searchTerm)
      );
    },
  },
});

export const { 
  fetchMenuStart, 
  fetchMenuSuccess, 
  fetchMenuFailure, 
  filterByCategory,
  searchItems
} = menuSlice.actions;

export default menuSlice.reducer;