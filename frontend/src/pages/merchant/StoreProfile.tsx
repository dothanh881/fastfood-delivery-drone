import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, CardHeader, Avatar, Grid, TextField, Button, Typography, Stack, Alert } from '@mui/material';
import { useMerchantSession } from '../../store/merchantSession';
import ImageUpload from '../../components/ImageUpload';
import { fetchStoreById, updateStoreImage, StoreViewModel, updateStoreDetails } from '../../services/stores';

const StoreProfile: React.FC = () => {
  const { currentStore } = useMerchantSession();
  const [store, setStore] = useState<StoreViewModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const storeId = currentStore?.id;

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    fetchStoreById(storeId)
      .then((s) => {
        setStore(s);
        setName(s?.name || '');
        setPhone(s?.phone || '');
        setAddress(s?.address || '');
      })
      .catch(() => setMessage('Không tải được thông tin cửa hàng'))
      .finally(() => setLoading(false));
  }, [storeId]);

  const handleImageUploaded = async (path: string) => {
    if (!storeId) return;
    try {
      await updateStoreImage(storeId, path);
      setStore((prev) => (prev ? { ...prev, image: path } : prev));
      setMessage('Ảnh cửa hàng đã được cập nhật thành công');
    } catch (err) {
      setMessage('Cập nhật ảnh thất bại. Vui lòng thử lại');
    }
  };

  const onSave = async () => {
    if (!storeId) return;
    setLoading(true);
    setMessage(null);
    try {
      const updated = await updateStoreDetails(storeId, { name, phone, address });
      setStore((prev) => prev ? { ...prev, name: updated.name, phone: updated.phone || '', address: updated.address || '' } : prev);
      setMessage('Đã lưu thay đổi thông tin cửa hàng');
    } catch (err) {
      setMessage('Lưu thay đổi thất bại. Vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const onReload = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const s = await fetchStoreById(storeId);
      setStore(s);
      setName(s?.name || '');
      setPhone(s?.phone || '');
      setAddress(s?.address || '');
    } catch {
      setMessage('Không tải được thông tin cửa hàng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Store Profile
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Cập nhật thông tin cửa hàng của bạn (logo, mô tả, địa chỉ, liên hệ).
      </Typography>

      {message && (
        <Alert sx={{ mb: 2 }} severity={message.includes('thất bại') ? 'error' : 'success'} onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={<Avatar sx={{ bgcolor: 'secondary.main' }}>{(currentStore?.name || 'S')[0]}</Avatar>}
          title={currentStore?.name || 'Your Store'}
          subheader={`Role: ${currentStore?.role || 'MANAGER'}`}
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Ảnh cửa hàng</Typography>
              <ImageUpload
                folder="stores"
                currentImage={store?.image || ''}
                onImageUploaded={handleImageUploaded}
                accept="image/*"
                maxSize={10}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Tên cửa hàng" value={name} onChange={(e) => setName(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0123 456 789" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Địa chỉ" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button variant="contained" color="primary" disabled={loading} onClick={onSave}>Lưu thay đổi</Button>
            <Button variant="outlined" color="secondary" disabled={loading} onClick={onReload}>Tải lại</Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default StoreProfile;