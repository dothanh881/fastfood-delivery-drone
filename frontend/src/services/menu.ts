import api from './api';

export interface CategoryDTO {
  id: number;
  name: string;
  sortOrder?: number;
  store?: { id: number };
}

export interface MenuItemDTO {
  id?: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  available?: boolean;
  category?: { id: number; name?: string };
  store?: { id: number; name?: string };
}

export async function fetchCategories(storeId?: number): Promise<CategoryDTO[]> {
  const res = await api.get('/menu/categories', { params: storeId != null ? { storeId } : undefined });
  return res.data;
}

export async function createCategory(payload: { name: string; sortOrder?: number; storeId?: number }): Promise<CategoryDTO> {
  const body: any = { name: payload.name.trim() };
  if (payload.sortOrder != null) body.sortOrder = payload.sortOrder;
  if (payload.storeId != null) body.store = { id: payload.storeId };
  const res = await api.post('/menu/categories', body);
  return res.data;
}

export async function updateCategory(id: number, payload: { name?: string; sortOrder?: number; storeId?: number }): Promise<CategoryDTO> {
  const body: any = {};
  if (payload.name != null) body.name = payload.name.trim();
  if (payload.sortOrder != null) body.sortOrder = payload.sortOrder;
  if (payload.storeId != null) body.store = { id: payload.storeId };
  const res = await api.put(`/menu/categories/${id}`, body);
  return res.data;
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/menu/categories/${id}`);
}

// View model cho Home/menuSlice
export interface MenuItemView {
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

const toViewModel = (d: any): MenuItemView => ({
  id: String(d.id),
  name: d.name || '',
  description: d.description || '',
  price: Number(d.price || 0),
  image: d.imageUrl || '',
  category: d?.category?.name || '',
  store: d?.store?.name || undefined,
  storeId: d?.store?.id != null ? String(d.store.id) : undefined,
  available: Boolean(d.available),
});

export async function fetchMenuItems(page = 0, size = 10, storeId?: number): Promise<MenuItemView[]> {
  const params: any = { page, size };
  if (storeId != null) params.storeId = storeId;
  const res = await api.get('/menu/items', { params });
  const data = Array.isArray(res.data) ? res.data : [];
  return data.map(toViewModel);
}

export async function searchMenuItems(name: string, page = 0, size = 10, storeId?: number): Promise<MenuItemView[]> {
  const params: any = { name, page, size };
  if (storeId != null) params.storeId = storeId;
  const res = await api.get('/menu/search', { params });
  const data = Array.isArray(res.data) ? res.data : [];
  return data.map(toViewModel);
}

// Admin view model
export interface MenuItemViewModel {
  id: number;
  name: string;
  description?: string;
  price: number;
  image: string;
  category: string;
  store: string;
  available: boolean;
}

const toAdminViewModel = (d: any): MenuItemViewModel => ({
  id: Number(d.id),
  name: d.name || '',
  description: d.description || '',
  price: Number(d.price || 0),
  image: d.imageUrl || '',
  category: d?.category?.name || '',
  store: d?.store?.name || '',
  available: Boolean(d.available),
});

export async function getAllMenuItems(page = 0, size = 20): Promise<MenuItemViewModel[]> {
  const res = await api.get('/menu/all', { params: { page, size } });
  const data = Array.isArray(res.data) ? res.data : [];
  return data.map(toAdminViewModel);
}

export interface StoreDTO { id: number; name: string }
export async function fetchStores(): Promise<StoreDTO[]> {
  const res = await api.get('/menu/stores');
  return Array.isArray(res.data) ? res.data : [];
}

export async function deleteMenuItem(id: number): Promise<void> {
  await api.delete(`/menu/items/${id}`);
}

export async function getMenuItemById(id: number): Promise<MenuItemDTO> {
  const res = await api.get(`/menu/items/${id}`);
  return res.data;
}

export async function createMenuItem(payload: MenuItemDTO): Promise<MenuItemDTO> {
  const res = await api.post('/menu/items', payload);
  return res.data;
}

export async function updateMenuItem(id: number, payload: MenuItemDTO): Promise<MenuItemDTO> {
  const res = await api.put(`/menu/items/${id}`, payload);
  return res.data;
}