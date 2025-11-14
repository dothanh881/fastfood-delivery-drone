import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Badge, Container, Box, Menu, MenuItem } from '@mui/material';
import { ShoppingCart, Person } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { useMerchantSession } from '../../store/merchantSession';
import { logout } from '../../store/slices/authSlice';

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items } = useSelector((state: RootState) => state.cart);
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { currentStore } = useMerchantSession();

  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

  // Dropdown state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleProfile = () => { handleMenuClose(); navigate('/profile'); };
  const handleLogout = () => { handleMenuClose(); dispatch(logout()); navigate('/login'); };

  // RBAC: hiển thị Merchant Portal nếu user có ROLE_MERCHANT/ROLE_ADMIN
  // hoặc đã có phiên staff (currentStore khác null)
  const hasMerchantRole = Array.isArray(user?.roles) && (
    user!.roles.includes('MERCHANT') ||
    user!.roles.includes('ROLE_MERCHANT') ||
    user!.roles.includes('ADMIN') ||
    user!.roles.includes('ROLE_ADMIN')
  );
  const hasMerchantAccess = hasMerchantRole || !!currentStore;

  return (
    <>
      <AppBar position="sticky">
        <Toolbar>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ flexGrow: 1, cursor: 'pointer', fontWeight: 'bold' }}
            onClick={() => navigate('/')}
          >
            FastFood Delivery
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              color="inherit" 
              onClick={() => navigate('/stores')}
              sx={{ mr: 2 }}
            >
              Stores
            </Button>
           
            {isAuthenticated && (
              <>
                <Button 
                  color="inherit" 
                  onClick={() => navigate('/orders/history')}
                  sx={{ mr: 2 }}
                >
                  Orders
                </Button>
                <Button 
                  color="inherit" 
                  onClick={() => navigate('/notifications')}
                  sx={{ mr: 2 }}
                >
                  Notifications
                </Button>
              </>
            )}
            <Button 
              color="inherit" 
              onClick={() => navigate('/cart')}
              sx={{ mr: 2 }}
            >
              <Badge badgeContent={cartItemCount} color="error">
                <ShoppingCart />
                
              </Badge>
            </Button>
            
            {isAuthenticated ? (
              <>
                <Button 
                  color="inherit"
                  onClick={handleMenuOpen}
                  startIcon={<Person />}
                >
                  {user?.fullName || user?.email || 'Account'}
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={menuOpen}
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem onClick={handleProfile}>Profile</MenuItem>
                  <MenuItem onClick={handleLogout}>Logout</MenuItem>
                </Menu>
              </>
            ) : (
              <Button 
                color="inherit"
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 2 }}>
        <Outlet />
      </Container>
    </>
  );
};

export default MainLayout;