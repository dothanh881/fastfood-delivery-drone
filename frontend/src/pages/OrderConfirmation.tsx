import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Divider, Button } from '@mui/material';

const OrderConfirmation: React.FC = () => {
  const { id } = useParams();

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>Xác nhận đơn hàng</Typography>
      <Card>
        <CardContent>
          <Typography variant="h6">Đơn #{id}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Cảm ơn bạn đã đặt hàng!</Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Tóm tắt</Typography>
          <Typography variant="body2">- 2 x Cheese Burger</Typography>
          <Typography variant="body2">- 1 x Coke</Typography>
          <Box>
            <Typography variant="body2">Phí giao hàng: 15,000</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Tổng: $159,000</Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OrderConfirmation;