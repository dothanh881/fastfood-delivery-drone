import api from './api';

export interface StaffDTO {
  id: number;
  storeId: number;
  userId: number;
  fullName: string;
  phone: string;
  email: string;
  role: 'MANAGER' | 'STAFF';
  title?: string;
  status: 'ACTIVE' | 'INACTIVE';
  enabled: boolean;
}

export async function fetchStaff(storeId: number, status?: 'ACTIVE' | 'INACTIVE'): Promise<StaffDTO[]> {
  const params: any = { storeId };
  if (status) params.status = status;
  const res = await api.get('/staff', { params });
  return Array.isArray(res.data) ? res.data : [];
}

export async function createStaff(payload: { storeId: number; email: string; fullName?: string; phone?: string; role?: 'MANAGER' | 'STAFF'; title?: string }): Promise<StaffDTO> {
  const body: any = {
    storeId: payload.storeId,
    email: payload.email,
  };
  if (payload.fullName) body.fullName = payload.fullName;
  if (payload.phone) body.phone = payload.phone;
  if (payload.role) body.role = payload.role;
  if (payload.title) body.title = payload.title;
  const res = await api.post('/staff', body);
  return res.data;
}

export async function updateStaff(id: number, payload: { fullName?: string; phone?: string; role?: 'MANAGER' | 'STAFF'; title?: string; status?: 'ACTIVE' | 'INACTIVE' }): Promise<StaffDTO> {
  const res = await api.put(`/staff/${id}`, payload);
  return res.data;
}

export async function blockStaff(id: number): Promise<{ id: number; status: 'INACTIVE' | 'ACTIVE' }> {
  const res = await api.patch(`/staff/${id}/block`);
  return res.data;
}

export async function unblockStaff(id: number): Promise<{ id: number; status: 'INACTIVE' | 'ACTIVE' }> {
  const res = await api.patch(`/staff/${id}/unblock`);
  return res.data;
}

export async function lockUser(userId: number): Promise<{ userId: number; enabled: boolean }> {
  const res = await api.patch(`/staff/user/${userId}/lock`);
  return res.data;
}

export async function unlockUser(userId: number): Promise<{ userId: number; enabled: boolean }> {
  const res = await api.patch(`/staff/user/${userId}/unlock`);
  return res.data;
}