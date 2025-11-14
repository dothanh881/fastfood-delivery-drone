import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, List, ListItem, ListItemText, Divider, TextField, MenuItem, Button } from '@mui/material';
import { useParams } from 'react-router-dom';

/**
 * M04 - Order Detail (Mock)
 * - TODO: Gọi API lấy chi tiết đơn theo ID, cập nhật trạng thái (sau)
 * - Hiện tại mock dữ liệu và cho phép đổi trạng thái local.
 */
interface OrderDetail {
  id: number;
  code: string;
  customer: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
}

const MOCK_DETAIL: OrderDetail = {
  id: 101,
  code: 'ORD-101',
  customer: 'Nguyễn Văn A',
  items: [
    { name: 'Burger Bò', qty: 2, price: 50000 },
    { name: 'Khoai chiên', qty: 1, price: 30000 },
  ],
  total: 130000,
  status: 'preparing',
};

const MerchantOrderDetail: React.FC = () => {
  const { id } = useParams();
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [status, setStatus] = useState<OrderDetail['status']>('pending');

  useEffect(() => {
    // TODO: Gọi API lấy chi tiết đơn hàng theo id (sau)
    setDetail({ ...MOCK_DETAIL, id: Number(id || MOCK_DETAIL.id) });
    setStatus(MOCK_DETAIL.status);
  }, [id]);

  const onUpdateStatus = () => {
    // TODO: Gọi API cập nhật trạng thái đơn hàng (sau)
    if (!detail) return;
    setDetail({ ...detail, status });
  };

  if (!detail) return null;

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Chi tiết đơn: {detail.code}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Khách hàng</Typography>
            <Typography>{detail.customer}</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>Món</Typography>
            <List>
              {detail.items.map((it, idx) => (
                <ListItem key={idx}>
                  <ListItemText primary={`${it.name} x${it.qty}`} secondary={`Giá: ${it.price.toLocaleString('vi-VN')} VND`} />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6">Tổng: {detail.total.toLocaleString('vi-VN')} VND</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Cập nhật trạng thái</Typography>
            <TextField select label="Trạng thái" value={status} onChange={(e) => setStatus(e.target.value as any)} fullWidth>
              <MenuItem value="pending">Chờ xử lý</MenuItem>
              <MenuItem value="preparing">Đang chuẩn bị</MenuItem>
              <MenuItem value="ready">Sẵn sàng</MenuItem>
              <MenuItem value="delivered">Đã giao</MenuItem>
            </TextField>
            <Button sx={{ mt: 2 }} variant="contained" onClick={onUpdateStatus}>Cập nhật</Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MerchantOrderDetail;