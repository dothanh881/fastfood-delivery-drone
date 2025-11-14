import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';


// Context phiên làm việc của Merchant/Kitchen: lưu store hiện tại và role nội bộ (MANAGER/STAFF)
// Dùng localStorage để giả lập /me/stores và phiên đăng nhập. Chưa gọi API thật.

export type MerchantRole = 'MANAGER' | 'STAFF';

export interface MerchantStore {
  id: string;
  name: string;
  role: MerchantRole;
}

interface MerchantSessionState {
  currentStore: MerchantStore | null;
  setSession: (store: MerchantStore) => void;
  clearSession: () => void;
}

const MerchantSessionContext = createContext<MerchantSessionState | undefined>(undefined);

const STORAGE_KEY = 'merchantSession';

export const MerchantSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStore, setCurrentStore] = useState<MerchantStore | null>(null);

  // Khởi tạo từ localStorage (mock phiên đăng nhập)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MerchantStore;
        setCurrentStore(parsed);
      }
    } catch {
      // Bỏ qua lỗi parse
    }
  }, []);

  const api = useMemo<MerchantSessionState>(() => ({
    currentStore,
    setSession: (store: MerchantStore) => {
      setCurrentStore(store);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      } catch {
        // Bỏ qua lỗi lưu
      }
    },
    clearSession: () => {
      setCurrentStore(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Bỏ qua lỗi
      }
    },
  }), [currentStore]);

  return (
    <MerchantSessionContext.Provider value={api}>
      {children}
    </MerchantSessionContext.Provider>
  );
};

export const useMerchantSession = (): MerchantSessionState => {
  const ctx = useContext(MerchantSessionContext);
  if (!ctx) throw new Error('useMerchantSession phải nằm trong MerchantSessionProvider');
  return ctx;
};