import api from './api';

export interface AddressRequest {
  receiverName: string;
  phone: string;
  line1: string;
  ward?: string;
  district?: string;
  city: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

export interface AddressDTO {
  id: number;
  receiverName: string;
  phone: string;
  line1: string;
  ward?: string;
  district?: string;
  city: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

export const listMyAddresses = async (userId: number): Promise<AddressDTO[]> => {
  const res = await api.get(`/addresses`, { params: { userId } });
  return res.data;
};

export const getDefaultAddress = async (userId: number): Promise<AddressDTO | null> => {
  try {
    const res = await api.get(`/addresses/default`, { params: { userId } });
    return res.data;
  } catch (e: any) {
    if (e.response?.status === 404) return null;
    throw e;
  }
};

export const createAddress = async (userId: number, payload: AddressRequest): Promise<AddressDTO> => {
  const res = await api.post(`/addresses`, payload, { params: { userId } });
  return res.data;
};

export const updateAddress = async (userId: number, id: number, payload: AddressRequest): Promise<AddressDTO> => {
  const res = await api.put(`/addresses/${id}`, payload, { params: { userId } });
  return res.data;
};

export const setDefaultAddress = async (userId: number, id: number): Promise<AddressDTO> => {
  const res = await api.put(`/addresses/${id}/default`, null, { params: { userId } });
  return res.data;
};