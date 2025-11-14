import api from './api';

export interface OrderItemDTO {
  id: number;
  quantity: number;
  unitPrice?: number;
  menuItem?: { id: number; name: string; imageUrl?: string; price?: number };
}

export interface OrderDTO {
  id: number;
  status: 'CREATED' | 'CONFIRMED' | 'PREPARING' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';
  totalAmount?: number;
  createdAt?: string;
  address?: { line1: string; ward?: string; district?: string; city: string };
  paymentMethod?: string;
  paymentStatus?: string;
  orderItems?: OrderItemDTO[];
  estimatedDelivery?: string;
}

// Backend OrderResponse for admin/merchant listing
export interface OrderResponseItem {
  id: number;
  menuItemId?: number;
  menuItemName?: string;
  quantity: number;
  unitPrice?: number;
}

export interface OrderResponse {
  id: number;
  orderCode?: string;
  status: 'CREATED' | 'CONFIRMED' | 'PREPARING' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';
  totalAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  address?: any;
  note?: string;
  items?: OrderResponseItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItemVM {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface OrderVM {
  id: string;
  status: 'CREATED' | 'CONFIRMED' | 'PREPARING' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';
  total: number;
  createdAt: string;
  items: OrderItemVM[];
}

function resolveImage(url?: string): string {
  if (!url) return '';
  const origin = (api.defaults.baseURL || '').replace(/\/+$/, '').replace(/\/api$/, '');
  return url.startsWith('/') ? `${origin}${url}` : url;
}

function mapBackendToUiStatus(s?: string): OrderVM['status'] {
  const val = String(s || '').toUpperCase();
  switch (val) {
    case 'READY_FOR_DELIVERY':
    case 'ASSIGNED':
    case 'OUT_FOR_DELIVERY':
    case 'DELIVERING':
      return 'DELIVERING';
    case 'DELIVERED':
    case 'COMPLETED':
      return 'COMPLETED';
    case 'REJECTED':
    case 'FAILED':
    case 'CANCELLED':
      return 'CANCELLED';
    case 'PREPARING':
      return 'PREPARING';
    case 'CONFIRMED':
      return 'CONFIRMED';
    case 'CREATED':
    default:
      return 'CREATED';
  }
}

// Normalize raw status to allowed union without using Array.includes (ES2016)
function normalizeOrderStatus(s?: string): OrderDTO['status'] {
  const val = String(s || '').toUpperCase();
  const allowed = ['CREATED','CONFIRMED','PREPARING','DELIVERING','COMPLETED','CANCELLED'];
  return (allowed.indexOf(val) !== -1) ? (val as OrderDTO['status']) : 'CREATED';
}

function toVM(order: OrderDTO): OrderVM {
  const items: OrderItemVM[] = Array.isArray(order.orderItems)
    ? order.orderItems.map((it) => ({
        id: String(it.id ?? `${order.id}-${Math.random()}`),
        name: it.menuItem?.name || (it as any).name || (it as any).nameSnapshot || 'Item',
        quantity: Number(it.quantity ?? 0),
        price: Number(it.unitPrice ?? it.menuItem?.price ?? (it as any).price ?? 0),
        image: resolveImage(it.menuItem?.imageUrl || (it as any).image || (it as any).imageSnapshot),
      }))
    : [];

  // Tính tổng tiền: ưu tiên dùng totalAmount từ backend; nếu thiếu hoặc bằng 0 nhưng có item thì tự tính
  const rawTotal = order.totalAmount;
  let computedTotal = Number(rawTotal ?? 0);
  if ((rawTotal == null || computedTotal === 0) && items.length > 0) {
    computedTotal = items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
  }

  return {
    id: String(order.id),
    status: mapBackendToUiStatus(order.status as any),
    total: computedTotal,
    createdAt: order.createdAt || '',
    items,
  };
}

// ===== Helpers for flexible parsing =====
function looksLikeOrderLoose(o: any): boolean {
  return o && typeof o === 'object' && (
    ('id' in o) || ('status' in o) || ('orderItems' in o) || ('items' in o) || ('totalAmount' in o)
  );
}

function coerceOrderLoose(o: any): OrderDTO | null {
  if (!o || typeof o !== 'object') return null;
  const idRaw = (o.id ?? o.orderId ?? o.code);
  const id = Number(idRaw);
  if (Number.isNaN(id)) return null;
  const status = normalizeOrderStatus(o.status);
  const totalAmount = Number(o.totalAmount ?? o.total ?? o.amount ?? 0);
  const createdAt = String(o.createdAt ?? o.createdDate ?? o.created_time ?? o.time ?? '');
  const itemsRaw = Array.isArray(o.orderItems) ? o.orderItems : (Array.isArray(o.items) ? o.items : undefined);
  const orderItems = Array.isArray(itemsRaw) ? itemsRaw.map((it: any) => ({
    id: Number(it.id ?? it.itemId ?? Math.random()),
    quantity: Number(it.quantity ?? it.qty ?? 0),
    unitPrice: (it.unitPrice ?? it.price ?? undefined) !== undefined ? Number(it.unitPrice ?? it.price) : undefined,
    menuItem: (it.menuItem || it.item) ? {
      id: Number((it.menuItem?.id ?? it.item?.id) ?? 0),
      name: String((it.menuItem?.name ?? it.item?.name) ?? ''),
      imageUrl: (it.menuItem?.imageUrl ?? it.item?.imageUrl) ? String(it.menuItem?.imageUrl ?? it.item?.imageUrl) : undefined,
      price: (it.menuItem?.price ?? it.item?.price) !== undefined ? Number(it.menuItem?.price ?? it.item?.price) : undefined,
    } : undefined,
  })) : undefined;
  return { id, status, totalAmount, createdAt, orderItems };
}

function findOrderArrayDeepLoose(obj: any): any[] | null {
  if (!obj || typeof obj !== 'object') return null;
  const keys = Object.keys(obj);
  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val)) {
      if (val.length === 0) return val;
      if (looksLikeOrderLoose(val[0])) return val;
      if (typeof val[0] === 'object') {
        const mapped = (val as any[]).map(coerceOrderLoose).filter(Boolean) as OrderDTO[];
        if (mapped.length > 0) return mapped as any[];
      }
    } else if (val && typeof val === 'object') {
      if (Array.isArray(val.content)) {
        const inner = val.content;
        if (inner.length === 0 || looksLikeOrderLoose(inner[0])) return inner;
        if (typeof inner[0] === 'object') {
          const mapped = (inner as any[]).map(coerceOrderLoose).filter(Boolean) as OrderDTO[];
          if (mapped.length > 0) return mapped as any[];
        }
      }
      const nested = findOrderArrayDeepLoose(val);
      if (nested) return nested;
    }
  }
  return null;
}

export async function getOrderById(userId: string | number, orderId: string | number): Promise<OrderDTO> {
  const res = await api.get(`/orders/${orderId}`, { params: { userId } });
  return res.data;
}

export async function listMyOrders(userId: string | number): Promise<OrderVM[]> {
  let data: any;
  try {
    // Ưu tiên endpoint compact để tránh payload quá lớn
    const res = await api.get('/orders/me/compact', { params: { userId } });
    data = res.data;
  } catch (e: any) {
    // Fallback sang endpoint đầy đủ nếu compact không có (404/500/403)
    try {
      const res2 = await api.get('/orders/me', { params: { userId } });
      data = res2.data;
    } catch (e2: any) {
      // Thử thêm lần nữa không kèm params nếu 403
      if (e2?.response?.status === 403) {
        try {
          const res3 = await api.get('/orders/me');
          data = res3.data;
        } catch (e3: any) {
          console.warn('listMyOrders: fallback failed', e3?.message || e3);
          return [];
        }
      } else {
        console.warn('listMyOrders: request failed', e2?.message || e2);
        return [];
      }
    }
  }

  // Một số môi trường trả về chuỗi (HTML hoặc JSON dạng text), cần xử lý an toàn
  if (typeof data === 'string') {
    const trimmed = data.trim();
    const looksJson = trimmed.startsWith('{') || trimmed.startsWith('[');
    if (looksJson) {
      try {
        data = JSON.parse(trimmed);
      } catch (e) {
        console.warn('listMyOrders: JSON parse failed for string body');
        return [];
      }
    } else {
      // Có thể là trang login HTML do auth chưa đúng
      console.warn('listMyOrders: HTML response instead of JSON (likely auth/session issue)');
      return [];
    }
  }

  let orders: OrderDTO[] = [];
  if (Array.isArray(data)) {
    if (data.length === 0 || looksLikeOrderLoose(data[0])) {
      orders = data as OrderDTO[];
    } else if (typeof data[0] === 'object') {
      const mapped = (data as any[]).map(coerceOrderLoose).filter(Boolean) as OrderDTO[];
      orders = mapped;
    }
  } else if (data && Array.isArray((data as any).content)) {
    const inner = (data as any).content;
    if (inner.length === 0 || looksLikeOrderLoose(inner[0])) {
      orders = inner as OrderDTO[];
    } else if (typeof inner[0] === 'object') {
      const mapped = (inner as any[]).map(coerceOrderLoose).filter(Boolean) as OrderDTO[];
      orders = mapped;
    }
  } else if (data && typeof data === 'object') {
    const candidates = ['data', 'orders', 'result', 'records', 'items', 'rows', 'list'];
    let found: any[] | undefined;
    for (const key of candidates) {
      const val = (data as any)[key];
      if (Array.isArray(val)) { found = val; break; }
      if (val && Array.isArray(val.content)) { found = val.content; break; }
    }
    if (found) {
      if (found.length === 0 || looksLikeOrderLoose(found[0])) {
        orders = found as OrderDTO[];
      } else if (typeof found[0] === 'object') {
        const mapped = (found as any[]).map(coerceOrderLoose).filter(Boolean) as OrderDTO[];
        orders = mapped;
      }
    } else {
      const deep = findOrderArrayDeepLoose(data);
      if (deep) {
        if (deep.length === 0 || looksLikeOrderLoose(deep[0])) {
          orders = deep as OrderDTO[];
        } else if (typeof deep[0] === 'object') {
          const mapped = (deep as any[]).map(coerceOrderLoose).filter(Boolean) as OrderDTO[];
          orders = mapped;
        }
      } else if ((data as any).id) {
        orders = [data as OrderDTO];
      } else {
        console.warn('listMyOrders: Unrecognized response structure', { keys: Object.keys(data || {}), sample: JSON.stringify(data).slice(0, 200) });
        orders = [];
      }
    }
  } else {
    console.warn('listMyOrders: Response is neither array nor object');
    orders = [];
  }
  return orders.map(toVM);
}

// Types used when creating an order from Checkout
export interface CreateOrderItemRequest { menuItemId: number; quantity: number }
export interface CreateOrderRequest {
  addressId: number;
  paymentMethod: string; // e.g. 'VNPAY' | 'COD'
  note?: string;
  items: CreateOrderItemRequest[];
}

export async function createOrder(userId: string | number, payload: CreateOrderRequest): Promise<OrderDTO> {
  const res = await api.post('/orders', payload, { params: { userId } });
  return res.data;
}

export async function getMyOrders(userId: string | number): Promise<OrderDTO[]> {
  // Thử gọi với userId (một số backend yêu cầu), nếu 403 thì fallback không kèm params
  let data: any;
  try {
    const res = await api.get('/orders/me', { params: { userId } });
    data = res.data;
  } catch (e: any) {
    if (e?.response?.status === 403) {
      const res2 = await api.get('/orders/me');
      data = res2.data;
    } else {
      throw e;
    }
  }

  // Một số môi trường trả về chuỗi (HTML hoặc JSON dạng text), cần xử lý an toàn
  if (typeof data === 'string') {
    const trimmed = data.trim();
    const looksJson = trimmed.startsWith('{') || trimmed.startsWith('[');
    if (looksJson) {
      try {
        data = JSON.parse(trimmed);
      } catch (e) {
        console.warn('getMyOrders: JSON parse failed for string body');
        return [];
      }
    } else {
      // Có thể là trang login HTML do auth chưa đúng
      console.warn('getMyOrders: HTML response instead of JSON (likely auth/session issue)');
      return [];
    }
  }

  // Helper: nhận diện một item trông giống OrderDTO
  const looksLikeOrder = (o: any) => {
    return o && typeof o === 'object' && (
      ('id' in o) || ('status' in o) || ('orderItems' in o) || ('totalAmount' in o)
    );
  };

  // Helper: cố gắng chuyển object bất kỳ về OrderDTO tối thiểu
  const coerceOrder = (o: any): OrderDTO | null => {
    if (!o || typeof o !== 'object') return null;
    const idRaw = (o.id ?? o.orderId ?? o.code);
    const id = Number(idRaw);
    if (Number.isNaN(id)) return null;
    const status = normalizeOrderStatus(o.status);
    const totalAmount = Number(o.totalAmount ?? o.total ?? o.amount ?? 0);
    const createdAt = String(o.createdAt ?? o.createdDate ?? o.created_time ?? o.time ?? '');
    const itemsRaw = Array.isArray(o.orderItems) ? o.orderItems : (Array.isArray(o.items) ? o.items : undefined);
    const orderItems = Array.isArray(itemsRaw) ? itemsRaw.map((it: any) => ({
      id: Number(it.id ?? it.itemId ?? Math.random()),
      quantity: Number(it.quantity ?? it.qty ?? 0),
      unitPrice: (it.unitPrice ?? it.price ?? undefined) !== undefined ? Number(it.unitPrice ?? it.price) : undefined,
      menuItem: (it.menuItem || it.item) ? {
        id: Number((it.menuItem?.id ?? it.item?.id) ?? 0),
        name: String((it.menuItem?.name ?? it.item?.name) ?? ''),
        imageUrl: (it.menuItem?.imageUrl ?? it.item?.imageUrl) ? String(it.menuItem?.imageUrl ?? it.item?.imageUrl) : undefined,
        price: (it.menuItem?.price ?? it.item?.price) !== undefined ? Number(it.menuItem?.price ?? it.item?.price) : undefined,
      } : undefined,
    })) : undefined;
    return { id, status, totalAmount, createdAt, orderItems };
  };

  // Helper: tìm mảng đơn hàng lồng sâu trong object
  const findOrderArrayDeep = (obj: any): any[] | null => {
    if (!obj || typeof obj !== 'object') return null;
    const keys = Object.keys(obj);
    for (const key of keys) {
      const val = obj[key];
      if (Array.isArray(val)) {
        if (val.length === 0) return val; // mảng rỗng vẫn hợp lệ
        if (looksLikeOrder(val[0])) return val;
        // Nếu phần tử là object, thử ép kiểu sang OrderDTO
        if (typeof val[0] === 'object') {
          const mapped = (val as any[])
            .map(coerceOrder)
            .filter(Boolean) as OrderDTO[];
          if (mapped.length > 0) return mapped as any[];
        }
      } else if (val && typeof val === 'object') {
        // Ưu tiên lấy val.content nếu là mảng
        if (Array.isArray(val.content)) {
          const inner = val.content;
          if (inner.length === 0 || looksLikeOrder(inner[0])) return inner;
          if (typeof inner[0] === 'object') {
            const mapped = (inner as any[])
              .map(coerceOrder)
              .filter(Boolean) as OrderDTO[];
            if (mapped.length > 0) return mapped as any[];
          }
        }
        const nested = findOrderArrayDeep(val);
        if (nested) return nested;
      }
    }
    return null;
  };

  let orders: OrderDTO[] = [];
  if (Array.isArray(data)) {
    // Nếu là mảng nhưng không phải OrderDTO, thử ép kiểu
    if (data.length === 0 || looksLikeOrder(data[0])) {
      orders = data as OrderDTO[];
    } else if (typeof data[0] === 'object') {
      const mapped = (data as any[])
        .map(coerceOrder)
        .filter(Boolean) as OrderDTO[];
      orders = mapped;
    }
  } else if (data && Array.isArray((data as any).content)) {
    orders = (data as any).content;
  } else if (data && typeof data === 'object') {
    // Unwrap common response wrappers: data, orders, result, records, items, rows, list
    const candidates = ['data', 'orders', 'result', 'records', 'items', 'rows', 'list'];
    let found: any[] | undefined;
    for (const key of candidates) {
      const val = (data as any)[key];
      if (Array.isArray(val)) { found = val; break; }
      if (val && Array.isArray(val.content)) { found = val.content; break; }
    }
    if (found) {
      if (found.length === 0 || looksLikeOrder(found[0])) {
        orders = found as OrderDTO[];
      } else if (typeof found[0] === 'object') {
        const mapped = (found as any[])
          .map(coerceOrder)
          .filter(Boolean) as OrderDTO[];
        orders = mapped;
      }
    } else {
      // Thử tìm sâu hơn trong object
      const deep = findOrderArrayDeep(data);
      if (deep) {
        if (deep.length === 0 || looksLikeOrder(deep[0])) {
          orders = deep as OrderDTO[];
        } else if (typeof deep[0] === 'object') {
          const mapped = (deep as any[])
            .map(coerceOrder)
            .filter(Boolean) as OrderDTO[];
          orders = mapped;
        }
      } else if ((data as any).id) {
        // Một số môi trường trả về đơn lẻ thay vì mảng
        orders = [data as OrderDTO];
      } else {
        const keys = Object.keys(data || {});
        console.warn('getMyOrders: Unrecognized response structure', { keys, sample: JSON.stringify(data).slice(0, 200) });
        return [];
      }
    }
  } else {
    console.warn('getMyOrders: Response is neither array nor object');
    return [];
  }

  return orders;
}

// ================================================
// Merchant / Staff / Admin specific order management functions
// ================================================

export interface StoreOrder {
  id: number;
  code?: string;
  customerName?: string;
  totalAmount: number;
  status: 'CREATED' | 'CONFIRMED' | 'PREPARING' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

// Stats DTO for merchant dashboard
export interface OrderStatsResponse {
  storeId?: number;
  start?: string;
  end?: string;
  totalRevenue: number;
  processingCount: number;
  deliveredCount: number;
  cancelledCount: number;
}

// New: list orders by status with pagination (for all roles)
export async function getOrdersByStatus(status: string, page: number = 0, size: number = 20, code?: string, storeId?: number): Promise<Page<OrderResponse>> {
  const params: any = { status, page, size };
  if (code && code.trim()) params.code = code.trim();
  if (storeId != null) params.storeId = storeId;
  const res = await api.get('/orders/status', {
    params,
  });
  return res.data;
}

// Get stats for merchant dashboard
export async function getOrderStats(storeId?: number, start?: string, end?: string): Promise<OrderStatsResponse> {
  const params: any = {};
  if (storeId != null) params.storeId = storeId;
  if (start) params.start = start;
  if (end) params.end = end;
  const res = await api.get('/orders/stats', { params });
  const data = res.data || {};
  return {
    storeId: Number(data.storeId ?? storeId ?? 0) || undefined,
    start: data.start || start,
    end: data.end || end,
    totalRevenue: Number(data.totalRevenue ?? 0),
    processingCount: Number(data.processingCount ?? 0),
    deliveredCount: Number(data.deliveredCount ?? 0),
    cancelledCount: Number(data.cancelledCount ?? 0),
  };
}

// Old function was pointing to /orders/store which backend doesn't expose; keep for compatibility if needed
export async function getOrdersByStore(status: string, page: number = 0, size: number = 10): Promise<Page<StoreOrder>> {
  const res = await api.get('/orders/status', {
    params: { status, page, size },
  });
  // Map to StoreOrder-like for legacy views
  const data: Page<OrderResponse> = res.data;
  return {
    content: (data.content || []).map((o) => ({
      id: o.id,
      code: String(o.id),
      customerName: undefined,
      totalAmount: Number(o.totalAmount || 0),
      status: o.status,
      createdAt: String(o.createdAt || ''),
    })),
    totalPages: data.totalPages || 0,
    totalElements: data.totalElements || 0,
    number: data.number || 0,
    size: data.size || size,
  };
}

// Update order status: backend expects PATCH and status as request param
export async function updateOrderStatus(orderId: number, status: string): Promise<OrderDTO> {
  const res = await api.patch(`/orders/${orderId}/status`, null, { params: { status } });
  return res.data;
}

// ================================
// Drone-related helpers for admin flow
// ================================

export interface DroneAssignmentResponse {
  success?: boolean;
  droneId?: string;
  deliveryId?: string;
  message?: string;
}

export interface DeliveryTrackingResponse {
  deliveryId: string | number;
  orderId?: string | number;
  droneId?: string;
  status?: string;
  etaSeconds?: number;
}

// Auto-assign a drone for an order
export async function assignDroneToOrder(orderId: number, start: boolean = true): Promise<DroneAssignmentResponse> {
  // Gửi thêm cờ 'start' để backend chuyển sang IN_PROGRESS và khởi động mô phỏng ngay
  const res = await api.post('/drone/assignments/auto', { orderId, start });
  return res.data;
}

// Mark delivery as completed for an order (backend should handle mapping order->delivery)
export async function completeDelivery(orderId: number): Promise<void> {
  // Try order-based endpoint first; backend may expose either
  try {
    await api.post(`/orders/${orderId}/complete`);
  } catch (err) {
    // Fallback to delivery-based endpoint if order-based doesn't exist
    try {
      await api.post(`/deliveries/${orderId}/complete`);
    } catch (err2) {
      throw err2;
    }
  }
}

// Preferred: complete by deliveryId (backend exposes /deliveries/{id}/complete)
export async function completeDeliveryByDeliveryId(deliveryId: number): Promise<void> {
  await api.post(`/deliveries/${deliveryId}/complete`);
}
