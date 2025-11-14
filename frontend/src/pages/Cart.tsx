import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Paper, 
  Divider,
  IconButton,
  TextField,
  Card,
  CardMedia,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { Add, Remove, Delete, ShoppingBag } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { removeFromCart, updateQuantity, clearCart } from '../store/slices/cartSlice';

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, totalAmount } = useSelector((state: RootState) => state.cart);
  const [selectedStoreId, setSelectedStoreId] = React.useState<string | undefined>(undefined);

  const grouped = React.useMemo(() => {
    const map: Record<string, { storeId: string; storeName: string; items: typeof items; total: number }> = {};
    items.forEach((it) => {
      const key = it.storeId || 'unknown';
      const name = it.storeName || 'Không xác định';
      if (!map[key]) {
        map[key] = { storeId: key, storeName: name, items: [], total: 0 };
      }
      map[key].items.push(it);
      map[key].total += it.price * it.quantity;
    });
    return map;
  }, [items]);
  
  const handleQuantityChange = (id: string, quantity: number) => {
    if (quantity >= 1) {
      dispatch(updateQuantity({ id, quantity }));
    } else {
      dispatch(removeFromCart(id));
    }
  };
  
  const handleRemoveItem = (id: string) => {
    dispatch(removeFromCart(id));
  };
  
  const handleClearCart = () => {
    dispatch(clearCart());
  };
  
  const handleCheckout = () => {
    if (!selectedStoreId) return;
    navigate('/checkout', { state: { selectedStoreId } });
  };
  
  if (items.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <ShoppingBag sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Giỏ hàng trống
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Hãy thêm món ăn vào giỏ, chúng sẽ hiển thị tại đây.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => navigate('/')}
        >
          Xem thực đơn
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Giỏ hàng của bạn
      </Typography>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: { xs: 3, md: 0 } }}>
            {Object.values(grouped).map((group) => (
              <Box key={group.storeId} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{group.storeName}</Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedStoreId === group.storeId}
                        onChange={(e) => setSelectedStoreId(e.target.checked ? group.storeId : undefined)}
                      />
                    }
                    label="Chọn cửa hàng này"
                  />
                </Box>
                <Divider sx={{ my: 1 }} />
                <List>
                  {group.items.map((item) => (
                    <React.Fragment key={`${group.storeId}-${item.id}`}>
                      <ListItem
                        secondaryAction={
                          <IconButton edge="end" onClick={() => handleRemoveItem(item.id)}>
                            <Delete />
                          </IconButton>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar 
                            variant="rounded"
                            src={item.image} 
                            alt={item.name}
                            sx={{ width: 60, height: 60, mr: 2 }}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={item.name}
                          secondary={`${item.price.toLocaleString('vi-VN')}đ`}
                          primaryTypographyProps={{ fontWeight: 'medium' }}
                          secondaryTypographyProps={{ color: 'primary', fontWeight: 'bold' }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                          <IconButton 
                            size="small"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          >
                            <Remove fontSize="small" />
                          </IconButton>
                          <TextField
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                            inputProps={{ 
                              min: 1, 
                              style: { textAlign: 'center', width: '30px', padding: '5px' } 
                            }}
                            variant="standard"
                          />
                          <IconButton 
                            size="small"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                        </Box>
                        <Typography variant="body1" sx={{ ml: 2, fontWeight: 'bold' }}>
                          {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                        </Typography>
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  ))}
                </List>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                    Tạm tính cửa hàng: {group.total.toLocaleString('vi-VN')}đ
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
              </Box>
            ))}
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button 
                variant="outlined" 
                color="error" 
                onClick={handleClearCart}
              >
                Clear Cart
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tóm tắt đơn hàng
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Tạm tính (cửa hàng đã chọn)</Typography>
              <Typography variant="body1">{(selectedStoreId ? (grouped[selectedStoreId]?.total || 0) : 0).toLocaleString('vi-VN')}đ</Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">Tổng thanh toán</Typography>
              <Typography variant="h6" color="primary">
                {(selectedStoreId ? (grouped[selectedStoreId]?.total || 0) : 0).toLocaleString('vi-VN')}đ
              </Typography>
            </Box>
            
            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              onClick={handleCheckout}
              disabled={!selectedStoreId}
            >
              Thanh toán cửa hàng đã chọn
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Cart;