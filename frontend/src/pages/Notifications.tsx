import React, { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Chip, Button } from '@mui/material';

interface NotificationVM {
  id: string;
  type: 'ORDER' | 'SYSTEM' | 'PROMO';
  title: string;
  message: string;
  createdAt: string;
  read?: boolean;
}

const Notifications: React.FC = () => {
  const [items, setItems] = useState<NotificationVM[]>([]);

  useEffect(() => {
    // TODO(WS/API): Ban đầu load từ API /notifications và subscribe WebSocket (STOMP)
    // Hiện đang mock dữ liệu để dựng UI
    setItems([
      { id: 'n1', type: 'ORDER', title: 'Đơn 1002', message: 'Đơn đang được giao', createdAt: '09:45', read: false },
      { id: 'n2', type: 'PROMO', title: 'Giảm giá 20%', message: 'Áp dụng cho burger hôm nay', createdAt: '08:10', read: true },
      { id: 'n3', type: 'SYSTEM', title: 'Cập nhật ứng dụng', message: 'Phiên bản mới đã sẵn sàng', createdAt: '07:00', read: true },
    ]);
  }, []);

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));

  const colorForType = (t: NotificationVM['type']) => {
    switch (t) {
      case 'ORDER': return 'info';
      case 'PROMO': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Thông báo</Typography>
        <Button variant="outlined" onClick={markAllRead}>Đánh dấu đã đọc</Button>
      </Box>
      <List>
        {items.map((n) => (
          <ListItem key={n.id} sx={{ bgcolor: n.read ? 'transparent' : 'action.hover', borderRadius: 1, mb: 1 }}>
            <Chip label={n.type} color={colorForType(n.type) as any} size="small" sx={{ mr: 2 }} />
            <ListItemText
              primary={n.title}
              secondary={`${n.message} · ${n.createdAt}`}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default Notifications;