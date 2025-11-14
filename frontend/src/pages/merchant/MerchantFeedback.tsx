import React, { useMemo, useState } from 'react';
import { Box, Card, CardContent, Typography, Stack, Chip, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

// Vietnamese comments:
// M11 - Feedback Viewer (read-only)
// - Hiển thị phản hồi liên quan món/đơn của cửa hàng.
// - Chỉ đọc cho STAFF; MANAGER cũng xem để rà soát.
// - Dữ liệu mock, chưa gọi API.

interface FeedbackItem {
  id: string;
  orderCode: string;
  itemName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

const MOCK_FEEDBACK: FeedbackItem[] = [
  { id: 'fb-001', orderCode: 'ORD-0001', itemName: 'Burger Bò Phô Mai', rating: 5, comment: 'Ngon, giao nhanh!', createdAt: '2025-10-08 11:30' },
  { id: 'fb-002', orderCode: 'ORD-0007', itemName: 'Gà Rán Giòn', rating: 4, comment: 'Ổn, hơi mặn.', createdAt: '2025-10-08 12:15' },
  { id: 'fb-003', orderCode: 'ORD-0010', itemName: 'Trà Sữa Trân Châu', rating: 3, comment: 'Ngọt quá.', createdAt: '2025-10-08 13:05' },
];

const MerchantFeedback: React.FC = () => {
  const [q, setQ] = useState('');
  const data = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return MOCK_FEEDBACK;
    return MOCK_FEEDBACK.filter(f => (
      f.orderCode.toLowerCase().includes(s) ||
      f.itemName.toLowerCase().includes(s) ||
      f.comment.toLowerCase().includes(s)
    ));
  }, [q]);

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Phản hồi khách hàng (Mock)
      </Typography>
      {/* 
        -  viewer chỉ đọc; chưa cho phép chỉnh sửa/ẩn.
        - Sau này sẽ thêm filter theo thời gian/món/đơn.
      */}
      <TextField
        placeholder="Tìm theo mã đơn/món/nội dung"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
      />
      <Stack spacing={2}>
        {data.map(fb => (
          <Card key={fb.id}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6">{fb.itemName}</Typography>
                <Chip label={`⭐ ${fb.rating}/5`} color={fb.rating >= 4 ? 'success' : fb.rating >= 3 ? 'warning' : 'error'} size="small" />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Đơn: {fb.orderCode} • Lúc: {fb.createdAt}
              </Typography>
              <Typography>{fb.comment}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};

export default MerchantFeedback;