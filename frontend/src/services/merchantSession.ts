// Vietnamese comments:
// Dịch vụ cho phiên merchant: trả danh sách store với role từ /me/stores.
// Sử dụng axios client chung để đảm bảo baseURL và Authorization header.
import api from './api';

export interface MyStoreInfo {
  store_id: string;
  store_name: string;
  role: 'MANAGER' | 'STAFF';
  isManager?: boolean;
  permissions?: string[];
}

// Mock dữ liệu chỉ dùng cho phát triển nội bộ (không fallback tự động)
const MOCK_STORES: MyStoreInfo[] = [
  { store_id: 'store-001', store_name: 'FastFood Lê Lợi', role: 'MANAGER' },
  { store_id: 'store-002', store_name: 'FastFood Nguyễn Huệ', role: 'STAFF' },
];

export async function fetchMyStores(userId?: string | number): Promise<MyStoreInfo[]> {
  // Gọi API thật với tham số userId theo yêu cầu backend; nếu lỗi -> []
  try {
    const token = localStorage.getItem('token');
    // Lấy userId từ tham số hoặc từ localStorage
    const id = userId ?? (() => {
      try { const raw = localStorage.getItem('user'); return raw ? JSON.parse(raw)?.id : undefined; } catch { return undefined; }
    })();
    if (token && id) {
      const res = await api.get('/me/stores', { params: { userId: Number(id) } });
      if (res.status === 200 && Array.isArray(res.data)) {
        const data = res.data;
        // Chuẩn hoá kiểu dữ liệu từ backend (id number -> string)
        const normalized: MyStoreInfo[] = data.map((s: any) => ({
          store_id: String(s.store_id ?? s.id ?? ''),
          store_name: String(s.store_name ?? s.name ?? ''),
          role: (s.role === 'MANAGER' ? 'MANAGER' : 'STAFF'),
          isManager: !!s.isManager,
          permissions: Array.isArray(s.permissions) ? s.permissions : [],
        }));
        return normalized;
      }
    }
  } catch {
    // ignore
  }
  // Không fallback sang mock để tránh trường hợp khách hàng bị coi là staff
  return [];
}