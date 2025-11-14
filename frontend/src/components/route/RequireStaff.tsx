import { useLocation, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useMerchantSession, MerchantStore } from "../../store/merchantSession";
import { fetchMyStores } from "../../services/merchantSession";

/**
 * A component to protect routes that require the user to have a 'STAFF' role.
 * It checks for authentication and the specific role.
 * If the user is not authenticated or doesn't have the role, it redirects them.
 */
const RequireStaff = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const { currentStore, setSession } = useMerchantSession();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasStaffRole = user?.roles?.includes('STAFF') || user?.roles?.includes('ROLE_STAFF');

  // Nếu là staff và chưa có currentStore thì gọi API để lấy cửa hàng của nhân viên
  useEffect(() => {
    if (isAuthenticated && hasStaffRole && !currentStore) {
      const run = async () => {
        setLoading(true);
        setError(null);
        try {
          const list = await fetchMyStores(user?.id);
          if (list && list.length > 0) {
            const s = list[0];
            const normalized: MerchantStore = {
              id: s.store_id,
              name: s.store_name,
              role: s.role,
            };
            setSession(normalized);
          } else {
            setError('Tài khoản STAFF chưa được gán vào cửa hàng nào.');
          }
        } catch (e) {
          setError('Không thể tải danh sách cửa hàng cho STAFF.');
        } finally {
          setLoading(false);
        }
      };
      run();
    }
  }, [isAuthenticated, hasStaffRole, currentStore, setSession, user]);

  if (!isAuthenticated || !hasStaffRole) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (loading || (!currentStore && isAuthenticated && hasStaffRole)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return children;
};

export default RequireStaff;