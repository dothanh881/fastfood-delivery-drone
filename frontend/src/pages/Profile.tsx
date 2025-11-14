import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { Box, Card, CardContent, Typography, Stack, Button, Grid, TextField, Alert } from '@mui/material';
import { logout } from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { AddressDTO, createAddress, getDefaultAddress, updateAddress } from '../services/address';

const Profile: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  type AddressLocal = {
    receiverName: string;
    phone: string;
    line1: string;
    ward?: string;
    district?: string;
    city: string;
  };

  const [defaultAddress, setDefaultAddress] = useState<AddressDTO | null>(null);
  const [addrForm, setAddrForm] = useState<AddressLocal>({
    receiverName: '',
    phone: '',
    line1: '',
    ward: '',
    district: '',
    city: '',
  });
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      console.log('Profile.tsx: user object from Redux:', user);
      if (!user?.id) {
        console.log('Profile.tsx: No user ID, skipping address fetch.');
        return;
      }
      try {
        console.log(`Profile.tsx: Fetching default address for userId: ${user.id}`);
        const addr = await getDefaultAddress(Number(user.id));
        console.log('Profile.tsx: Fetched default address:', addr);
        if (mounted) {
          setDefaultAddress(addr);
          if (addr) {
            console.log('Profile.tsx: Setting address form with fetched data.');
            setAddrForm({
              receiverName: addr.receiverName || '',
              phone: addr.phone || '',
              line1: addr.line1 || '',
              ward: addr.ward || '',
              district: addr.district || '',
              city: addr.city || '',
            });
          }
        }
      } catch {
        // Fallback to local if backend not available
        try {
          const raw = localStorage.getItem(`address:${user.id}:default`);
          if (raw && mounted) {
            const addr = JSON.parse(raw) as AddressDTO;
            setDefaultAddress(addr);
            setAddrForm({
              receiverName: addr.receiverName || '',
              phone: addr.phone || '',
              line1: addr.line1 || '',
              ward: addr.ward || '',
              district: addr.district || '',
              city: addr.city || '',
            });
          }
        } catch {}
      }
    };
    load();
    return () => { mounted = false; };
  }, [user?.id]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddrForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveDefaultAddress = async () => {
    if (!user?.id) return;
    if (!addrForm.receiverName || !addrForm.phone || !addrForm.line1 || !addrForm.city) {
      setInfoMsg('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }
    if (!/^\d{10,11}$/.test(addrForm.phone)) {
      setInfoMsg('Số điện thoại phải 10–11 chữ số.');
      return;
    }
    try {
      if (defaultAddress?.id) {
        const updated = await updateAddress(Number(user.id), Number(defaultAddress.id), { ...addrForm });
        const refreshed = await getDefaultAddress(Number(user.id));
        setDefaultAddress(refreshed || updated);
        setInfoMsg('Đã cập nhật địa chỉ mặc định.');
        localStorage.setItem(`address:${user.id}:default`, JSON.stringify(refreshed || updated));
      } else {
        const saved = await createAddress(Number(user.id), { ...addrForm, isDefault: true });
        const refreshed = await getDefaultAddress(Number(user.id));
        setDefaultAddress(refreshed || saved);
        setInfoMsg('Đã lưu địa chỉ mặc định mới.');
        localStorage.setItem(`address:${user.id}:default`, JSON.stringify(refreshed || saved));
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Không thể lưu địa chỉ. Vui lòng thử lại.';
      setInfoMsg(msg);
    }
  };

  const onLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Card>
        <CardContent>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Thông tin tài khoản
          </Typography>

          <Stack spacing={1}>
            <Typography variant="body1"><strong>Họ tên:</strong> {user?.fullName || '—'}</Typography>
            <Typography variant="body1"><strong>Email:</strong> {user?.email || '—'}</Typography>
          </Stack>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Địa chỉ mặc định
            </Typography>
            {defaultAddress ? (
              <Box sx={{ mb: 2 }}>
                <Typography>{defaultAddress.receiverName} - {defaultAddress.phone}</Typography>
                <Typography>{defaultAddress.line1}</Typography>
                <Typography>{[defaultAddress.ward, defaultAddress.district, defaultAddress.city].filter(Boolean).join(', ')}</Typography>
              </Box>
            ) : (
              <Typography color="text.secondary">Chưa có địa chỉ mặc định.</Typography>
            )}

            <Typography variant="subtitle1" sx={{ mt: 2 }}>
              Nhập địa chỉ và đặt làm mặc định
            </Typography>
            {infoMsg && <Alert severity="info" sx={{ my: 1 }}>{infoMsg}</Alert>}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Họ tên người nhận"
                  name="receiverName"
                  value={addrForm.receiverName}
                  onChange={onChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Số điện thoại"
                  name="phone"
                  value={addrForm.phone}
                  onChange={onChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Địa chỉ"
                  name="line1"
                  value={addrForm.line1}
                  onChange={onChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Phường/Xã" name="ward" value={addrForm.ward} onChange={onChange} fullWidth />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Quận/Huyện" name="district" value={addrForm.district} onChange={onChange} fullWidth />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Thành phố" name="city" value={addrForm.city} onChange={onChange} fullWidth required />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" color="primary" onClick={saveDefaultAddress}>
                  Lưu làm mặc định
                </Button>
              </Grid>
          </Grid>
          </Box>


          <Stack direction="row" spacing={2} mt={3}>
            <Button variant="contained" color="primary" onClick={() => navigate('/')}>Về trang chủ</Button>
            <Button variant="outlined" color="error" onClick={onLogout}>Đăng xuất</Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile;