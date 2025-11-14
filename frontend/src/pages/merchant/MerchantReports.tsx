import React, { useState } from 'react';
import { Box, Typography, Grid, TextField, Button, Paper } from '@mui/material';

/**
 * M10 - Reports (Mock)
 * - TODO: Gọi API báo cáo theo thời gian: doanh thu, số đơn (sau)
 * - Hiện hiển thị tổng giả theo khoảng ngày.
 */
const MerchantReports: React.FC = () => {
  const [from, setFrom] = useState('2024-01-01');
  const [to, setTo] = useState('2024-12-31');
  const [revenue, setRevenue] = useState(150000000);
  const [orders, setOrders] = useState(4200);

  const onRun = () => {
    // TODO: Gọi API tạo báo cáo theo khoảng ngày (sau)
    // Mock: thay đổi nhẹ số liệu
    setRevenue((r) => r + Math.round(Math.random() * 1000000 - 500000));
    setOrders((o) => o + Math.round(Math.random() * 50 - 25));
  };

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>Báo cáo</Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <TextField label="Từ ngày" type="date" fullWidth value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField label="Đến ngày" type="date" fullWidth value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button variant="contained" onClick={onRun} sx={{ height: '100%' }}>Chạy báo cáo</Button>
        </Grid>
      </Grid>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Doanh thu: {revenue.toLocaleString('vi-VN')} VND</Typography>
        <Typography variant="h6">Số đơn: {orders.toLocaleString('vi-VN')}</Typography>
        <Typography color="text.secondary">Khoảng thời gian: {from} → {to}</Typography>
      </Paper>
    </Box>
  );
};

export default MerchantReports;