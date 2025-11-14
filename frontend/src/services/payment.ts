import api from './api';

export interface PaymentRequestPayload {
  returnUrl: string;
  ipAddress?: string;
  locale?: string;
}

export interface VNPayResponse {
  paymentUrl: string;
  transactionReference: string;
}

export const createVNPayPayment = async (
  orderId: number,
  payload: PaymentRequestPayload
): Promise<VNPayResponse> => {
  const res = await api.post(`/payments/vnpay/${orderId}`, payload);
  return res.data as VNPayResponse;
};

export const getPaymentByOrder = async (orderId: number) => {
  const res = await api.get(`/payments/order/${orderId}`);
  return res.data;
};

export const simulateVNPayReturn = async (query: Record<string, string>) => {
  const params = new URLSearchParams(query as any).toString();
  const res = await api.get(`/payments/vnpay/return?${params}`);
  return res.data;
};