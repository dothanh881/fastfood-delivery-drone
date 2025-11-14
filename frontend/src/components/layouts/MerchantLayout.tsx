import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box, Drawer, Toolbar, List, ListItemButton, ListItemText, Typography, Divider } from '@mui/material';
import { useMerchantSession } from '../../store/merchantSession';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';

const drawerWidth = 240;

// Vietnamese comments:
// RBAC nav: Manager xem toàn bộ. Staff chỉ xem Orders, Inventory (read-only), Feedback.
const managerItems = [
  // Đã ẩn: Home, Inventory, Reports, Feedback
  { label: 'Dashboard', path: '/merchant/dashboard' },
  { label: 'Orders', path: '/merchant/orders' },
  { label: 'Menu', path: '/merchant/menu' },
  { label: 'Categories', path: '/merchant/categories' },
  { label: 'Staff', path: '/merchant/staff' },
  { label: 'Store Profile', path: '/merchant/profile' },
  { label: 'Store Settings', path: '/merchant/settings' },
];
const staffItems = [
  // Đã ẩn: Home, Inventory, Feedback
  { label: 'Orders', path: '/merchant/orders' },
];

/**
 * Layout cho Merchant/Kitchen Portal với thanh điều hướng trái.
 * Không gọi API. Dùng cho tất cả màn hình merchant.
 */
const MerchantLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentStore } = useMerchantSession();
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);

  const isAuthenticated = auth.isAuthenticated;
  const hasMerchantRole = Array.isArray(auth.user?.roles) && (
    auth.user!.roles.includes('MERCHANT') ||
    auth.user!.roles.includes('ROLE_MERCHANT') ||
    auth.user!.roles.includes('ADMIN') ||
    auth.user!.roles.includes('ROLE_ADMIN')
  );

  const renderItems = () => {
    const base = currentStore?.role === 'STAFF'
      ? staffItems
      : managerItems;
    // Nếu chưa đăng nhập và không có phiên store -> cho phép vào Merchant Login
    // Nếu đã đăng nhập/đã có phiên -> ẩn mục Login
    const filtered = base.filter(it => it.path !== '/merchant/login');
    // Hiển thị Merchant Login nếu không có quyền merchant và chưa chọn cửa hàng,
    // bất kể trạng thái đăng nhập customer
    if (!currentStore && !hasMerchantRole) {
      return [...filtered, { label: 'Login', path: '/merchant/login' }];
    }
    return filtered;
  };

  const handleLogout = () => {
    dispatch(logout());
    // Clear phiên merchant nếu có
    // useMerchantSession đã expose clearSession, nhưng không có ở đây; dùng localStorage key
    try { localStorage.removeItem('merchantSession'); } catch {}
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Sidebar trái */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={800}>Merchant Portal</Typography>
            {/* Vietnamese comments: hiển thị cửa hàng hiện tại và role nội bộ (nếu có) */}
            {currentStore && (
              <Typography variant="caption" color="text.secondary">
                {currentStore.name} — Role: {currentStore.role}
              </Typography>
            )}
          </Box>
          <Divider />
          <List>
            {renderItems().map((item) => {
              const isDashboard = item.label === 'Dashboard';
              const target = isDashboard && currentStore?.id
                ? `/merchant/dashboard/${currentStore.id}`
                : item.path;
              const selected = location.pathname === target || location.pathname.startsWith(target + '/');
              return (
                <ListItemButton
                  key={item.path}
                  selected={selected}
                  onClick={() => navigate(target)}
                >
                  <ListItemText primary={item.label} />
                </ListItemButton>
              );
            })}
            {isAuthenticated && (
              <>
                <Divider sx={{ my: 1 }} />
                <ListItemButton onClick={handleLogout}>
                  <ListItemText primary="Logout" />
                </ListItemButton>
              </>
            )}
          </List>
        </Box>
      </Drawer>

      {/* Khu vực nội dung */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default MerchantLayout;