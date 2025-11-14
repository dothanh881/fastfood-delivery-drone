import api from './api';

export interface OrderStatsResponse {
  storeId?: number | null;
  start?: string | null;
  end?: string | null;
  totalRevenue: number; // BigDecimal on BE, number in FE
  processingCount: number;
  deliveredCount: number;
  cancelledCount: number;
}

export async function getOrderStats(params: { storeId?: number | string; start?: string; end?: string }): Promise<OrderStatsResponse> {
  const query: any = {};
  if (params.storeId != null && params.storeId !== '' && params.storeId !== 'ALL') {
    query.storeId = Number(params.storeId);
  }
  if (params.start) query.start = params.start;
  if (params.end) query.end = params.end;
  const res = await api.get('/orders/stats', { params: query });
  const d = res.data || {};
  return {
    storeId: (d.storeId ?? query.storeId ?? null),
    start: d.start ?? query.start ?? null,
    end: d.end ?? query.end ?? null,
    totalRevenue: Number(d.totalRevenue ?? 0),
    processingCount: Number(d.processingCount ?? 0),
    deliveredCount: Number(d.deliveredCount ?? 0),
    cancelledCount: Number(d.cancelledCount ?? 0),
  };
}