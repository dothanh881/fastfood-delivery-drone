import { useLocation, Navigate } from "react-router-dom";
import { useMerchantSession, MerchantStore } from "../../store/merchantSession";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import React, { useEffect, useState } from "react";
import { CircularProgress, Box, Typography } from "@mui/material";
import { fetchMyStores } from "../../services/merchantSession";

const RequireManager = ({ children }: { children: JSX.Element }) => {
    const { currentStore, setSession, clearSession } = useMerchantSession();
    const location = useLocation();
    const auth = useSelector((state: RootState) => state.auth);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Luôn đồng bộ cửa hàng theo user đăng nhập hiện tại để tránh dính phiên cũ
        if (auth.isAuthenticated) {
            const fetchAndSetStore = async () => {
                setLoading(true);
                try {
                    // Xoá phiên cũ trong bộ nhớ nếu có (phòng ngừa leak cross-account)
                    if (currentStore) clearSession();
                    const list = await fetchMyStores(auth.user?.id);
                    if (list && list.length > 0) {
                        const s = list[0];
                        const normalized: MerchantStore = { id: s.store_id, name: s.store_name, role: s.role };
                        setSession(normalized);
                        console.log('Store loaded:', normalized);
                    } else {
                        console.log('No stores found for user');
                        setError("Tài khoản của bạn chưa được gán vào cửa hàng nào.");
                    }
                } catch (err: any) {
                    console.error('Failed to fetch stores:', err);
                    setError("Không thể tải thông tin cửa hàng. Vui lòng liên hệ quản trị viên.");
                } finally {
                    setLoading(false);
                }
            };
            fetchAndSetStore();
        }
    }, [auth.isAuthenticated, auth.user?.id]);

    if (loading || (!currentStore && auth.isAuthenticated)) {
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
    
    if (!currentStore) {
        // This case should now only be hit if the user is not authenticated
        // or if fetching stores failed and they are not authenticated.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const hasMerchantRole = auth.user && Array.isArray(auth.user.roles) && 
                            (auth.user.roles.includes('MERCHANT') || 
                             auth.user.roles.includes('ROLE_MERCHANT') ||
                             auth.user.roles.includes('MANAGER') ||
                             auth.user.roles.includes('ROLE_MANAGER') ||
                             auth.user.roles.includes('STORE_MANAGER'));

    const isManagerInStore = currentStore?.role === "MANAGER";

    console.log('Auth check:', {
        user: auth.user,
        roles: auth.user?.roles,
        hasMerchantRole,
        currentStore,
        isManagerInStore
    });

    // Allow access if user has merchant role OR is a manager in the store
    if (!hasMerchantRole && !isManagerInStore) {
        console.log('Redirecting to staff orders due to insufficient permissions');
        return <Navigate to="/staff/orders" state={{ from: location }} replace />;
    }

    return children;
};

export default RequireManager;