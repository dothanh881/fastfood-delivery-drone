import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip, Stack, Button, TextField, LinearProgress } from '@mui/material';
import { useParams } from 'react-router-dom';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SaveIcon from '@mui/icons-material/Save';
import { fetchStoreById, StoreViewModel, updateStoreDetails } from '../../services/stores';

const StoreDetail: React.FC = () => {
  const { id } = useParams();
  const [store, setStore] = useState<StoreViewModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const s = await fetchStoreById(id);
      setStore(s);
      setName(s?.name || '');
      setPhone(s?.phone || '');
      setAddress(s?.address || '');
    } catch (e: any) {
      console.error('Load store failed', e);
      setError(e?.response?.data?.message || 'Không tải được thông tin cửa hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const handleSave = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await updateStoreDetails(id, { name: name.trim(), phone: phone.trim(), address: address.trim() });
      setStore(prev => prev ? { ...prev, name: name.trim(), phone: phone.trim(), address: address.trim() } : prev);
    } catch (e: any) {
      console.error('Update store failed', e);
      alert(e?.response?.data?.message || 'Lưu thay đổi thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await updateStoreDetails(id, { status: 'SUSPENDED' });
      setStore(prev => prev ? { ...prev, status: 'SUSPENDED', isOpen: false } : prev);
    } catch (e: any) {
      console.error('Suspend store failed', e);
      alert(e?.response?.data?.message || 'Khóa cửa hàng thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await updateStoreDetails(id, { status: 'ACTIVE' });
      setStore(prev => prev ? { ...prev, status: 'ACTIVE', isOpen: true } : prev);
    } catch (e: any) {
      console.error('Activate store failed', e);
      alert(e?.response?.data?.message || 'Mở khóa cửa hàng thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Chi tiết Cửa Hàng — {id}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Xem, chỉnh sửa và khóa/mở khóa cửa hàng. Không cho phép thêm mới.
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Tên cửa hàng</Typography>
              <TextField fullWidth value={name} onChange={(e) => setName(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Trạng thái</Typography>
              <Chip
                label={(store?.status || 'ACTIVE')}
                color={(store?.status === 'SUSPENDED') ? 'warning' : 'success'}
                size="small"
                icon={(store?.status === 'SUSPENDED') ? <BlockIcon /> : <CheckCircleIcon />}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Số điện thoại</Typography>
              <TextField fullWidth value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Địa chỉ</Typography>
              <TextField fullWidth value={address} onChange={(e) => setAddress(e.target.value)} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={2}>
        {store?.status === 'ACTIVE' ? (
          <Button variant="contained" color="warning" onClick={handleSuspend} disabled={saving} startIcon={<BlockIcon />}>Khóa</Button>
        ) : (
          <Button variant="outlined" color="success" onClick={handleActivate} disabled={saving} startIcon={<CheckCircleIcon />}>Mở khóa</Button>
        )}
        <Button variant="contained" color="primary" onClick={handleSave} disabled={saving} startIcon={<SaveIcon />}>Lưu thay đổi</Button>
      </Stack>
      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>{error}</Typography>
      )}
    </Box>
  );
};

export default StoreDetail;