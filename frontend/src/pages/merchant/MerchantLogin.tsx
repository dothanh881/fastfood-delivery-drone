import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Stack, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { fetchMyStores } from '../../services/merchantSession';
import { useMerchantSession } from '../../store/merchantSession';

/**
 * M01 - Login Merchant (Mock)
 * - TODO: Gọi API đăng nhập Merchant (sẽ thực hiện sau)
 * - Hiện tại chỉ mock: nhập email/password -> điều hướng Dashboard
 */
const MerchantLogin: React.FC = () => {
  const navigate = useNavigate();
  const { setSession } = useMerchantSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Vietnamese comments:
  // Không cần chọn cửa hàng; sau khi đăng nhập sẽ tự lấy cửa hàng của tài khoản.

  const onLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    // TODO: Gọi API đăng nhập Merchant, nhận token/role, lưu state
    // Mock phiên: tự lấy cửa hàng gắn với tài khoản và role nội bộ
    try {
      const list = await fetchMyStores();
      const store = list[0];
      if (store) {
        setSession({ id: store.store_id, name: store.store_name, role: store.role });
      }
    } catch {
      // Bỏ qua lỗi mock
    }
    // Sau khi vào phiên -> chuyển sang Orders (vì Staff chỉ vận hành đơn)
    navigate('/merchant/orders');
  };

  return (
    <Box sx={{ py: 4, maxWidth: 480, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Merchant Login
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack spacing={2}>
        <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
        <TextField label="Mật khẩu" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
        
        <Button variant="contained" color="primary" onClick={onLogin}>Đăng nhập</Button>
      </Stack>
    </Box>
  );
};

export default MerchantLogin;