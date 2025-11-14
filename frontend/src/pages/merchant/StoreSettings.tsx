import React, { useState } from 'react';
import { Box, Card, CardContent, CardHeader, Grid, Typography, Switch, FormControlLabel, TextField, Slider, Stack, Button, Divider } from '@mui/material';
import { useMerchantSession } from '../../store/merchantSession';

const StoreSettings: React.FC = () => {
  const { currentStore } = useMerchantSession();

  const [enabledVNPay, setEnabledVNPay] = useState(true);
  const [openHours, setOpenHours] = useState({ open: '08:00', close: '22:00' });
  const [deliveryRadius, setDeliveryRadius] = useState<number>(3);

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Store Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Thiết lập hoạt động cho cửa hàng "{currentStore?.name || 'Your Store'}".
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="Giờ mở cửa" subheader="Thiết lập thời gian hoạt động trong ngày" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField type="time" label="Mở cửa" value={openHours.open} onChange={(e) => setOpenHours({ ...openHours, open: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField type="time" label="Đóng cửa" value={openHours.close} onChange={(e) => setOpenHours({ ...openHours, close: e.target.value })} fullWidth />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="Phương thức thanh toán" subheader="Bật/tắt các phương thức thanh toán hỗ trợ" />
        <CardContent>
          <Stack direction="row" spacing={3}>
            <FormControlLabel control={<Switch checked={enabledVNPay} onChange={(e) => setEnabledVNPay(e.target.checked)} />} label="VNPay" />
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="Bán kính giao hàng" subheader="Giới hạn khoảng cách giao hàng (km)" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Slider value={deliveryRadius} onChange={(_, v) => setDeliveryRadius(v as number)} step={0.5} min={1} max={10} valueLabelDisplay="auto" />
              <Typography variant="body2">Hiện tại: {deliveryRadius} km</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Divider sx={{ my: 2 }} />
      <Stack direction="row" spacing={2}>
        <Button variant="contained">Lưu cài đặt</Button>
        <Button variant="outlined">Khôi phục mặc định</Button>
      </Stack>
    </Box>
  );
};

export default StoreSettings;