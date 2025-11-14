import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  IconButton,
  Badge,
  Stack,
  Alert,
  LinearProgress,
  Tooltip,
  TextField
} from '@mui/material';
import {
  Restaurant,
  CheckCircle,
  AccessTime,
  LocalShipping,
  Timer,
  Warning,
  Refresh,
  PlayArrow,
  Check,
  Print,
  Person,
  LocationOn,
  Phone
} from '@mui/icons-material';
import { FlightTakeoff } from '@mui/icons-material';

// Order priority levels
type Priority = 'URGENT' | 'HIGH' | 'NORMAL';

// Kitchen order item interface
interface KitchenOrderItem {
  id: number;
  name: string;
  quantity: number;
  specialInstructions?: string;
  imageUrl?: string;
}

// Kitchen order interface
interface KitchenOrder {
  id: number;
  orderCode: string;
  customerName: string;
  customerPhone?: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED';
  priority: Priority;
  items: KitchenOrderItem[];
  receivedTime: string;
  estimatedTime: number; // minutes
  elapsedTime: number; // minutes
  note?: string;
  type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableNumber?: string;
}

// Mock kitchen orders
const MOCK_KITCHEN_ORDERS: KitchenOrder[] = [
  {
    id: 1,
    orderCode: 'ORD-001',
    customerName: 'Nguyễn Văn A',
    customerPhone: '0901234567',
    status: 'PENDING',
    priority: 'URGENT',
    type: 'DELIVERY',
    receivedTime: '2025-10-20T10:30:00',
    estimatedTime: 15,
    elapsedTime: 12,
    note: 'Gọi trước 5 phút, không hành',
    items: [
      { id: 1, name: 'Classic Burger', quantity: 2, specialInstructions: 'No onions' },
      { id: 2, name: 'French Fries', quantity: 2 },
      { id: 3, name: 'Coca Cola', quantity: 2 }
    ]
  },
  {
    id: 2,
    orderCode: 'ORD-002',
    customerName: 'Trần Thị B',
    customerPhone: '0907654321',
    status: 'PREPARING',
    priority: 'HIGH',
    type: 'TAKEAWAY',
    receivedTime: '2025-10-20T10:25:00',
    estimatedTime: 20,
    elapsedTime: 8,
    items: [
      { id: 4, name: 'Fried Chicken', quantity: 1, specialInstructions: 'Extra crispy' },
      { id: 5, name: 'Chicken Wings', quantity: 1 },
      { id: 6, name: 'Sprite', quantity: 1 }
    ]
  },
  {
    id: 3,
    orderCode: 'ORD-003',
    customerName: 'Lê Văn C',
    status: 'PREPARING',
    priority: 'NORMAL',
    type: 'DINE_IN',
    tableNumber: 'A05',
    receivedTime: '2025-10-20T10:20:00',
    estimatedTime: 25,
    elapsedTime: 5,
    note: 'Không cay',
    items: [
      { id: 7, name: 'Pizza', quantity: 1 },
      { id: 8, name: 'Salad', quantity: 1 }
    ]
  },
  {
    id: 4,
    orderCode: 'ORD-004',
    customerName: 'Phạm Thị D',
    customerPhone: '0923456789',
    status: 'READY',
    priority: 'NORMAL',
    type: 'DELIVERY',
    receivedTime: '2025-10-20T10:15:00',
    estimatedTime: 20,
    elapsedTime: 18,
    items: [
      { id: 9, name: 'Cheeseburger', quantity: 3 },
      { id: 10, name: 'Onion Rings', quantity: 2 }
    ]
  },
  {
    id: 5,
    orderCode: 'ORD-005',
    customerName: 'Hoàng Văn E',
    status: 'PENDING',
    priority: 'NORMAL',
    type: 'DINE_IN',
    tableNumber: 'B12',
    receivedTime: '2025-10-20T10:28:00',
    estimatedTime: 15,
    elapsedTime: 2,
    items: [
      { id: 11, name: 'Hot Dog', quantity: 2 },
      { id: 12, name: 'Pepsi', quantity: 2 }
    ]
  },
  {
    id: 6,
    orderCode: 'ORD-006',
    customerName: 'Võ Thị F',
    customerPhone: '0945678901',
    status: 'READY',
    priority: 'HIGH',
    type: 'TAKEAWAY',
    receivedTime: '2025-10-20T10:10:00',
    estimatedTime: 15,
    elapsedTime: 15,
    items: [
      { id: 13, name: 'Chicken Sandwich', quantity: 1 },
      { id: 14, name: 'Coffee', quantity: 1 }
    ]
  }
];

const KitchenBoard: React.FC = () => {
  const [orders, setOrders] = useState<KitchenOrder[]>(MOCK_KITCHEN_ORDERS);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Update elapsed time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setOrders(prevOrders =>
        prevOrders.map(order => ({
          ...order,
          elapsedTime: Math.floor(
            (new Date().getTime() - new Date(order.receivedTime).getTime()) / 60000
          )
        }))
      );
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Priority configuration
  const priorityConfig: Record<Priority, { label: string; color: any; bgcolor: string }> = {
    URGENT: { label: 'Khẩn cấp', color: 'error', bgcolor: '#ffebee' },
    HIGH: { label: 'Cao', color: 'warning', bgcolor: '#fff3e0' },
    NORMAL: { label: 'Bình thường', color: 'success', bgcolor: '#e8f5e9' }
  };

  // Order type configuration
  const typeConfig = {
    DINE_IN: { label: 'Tại chỗ', icon: <Restaurant />, color: 'info' },
    TAKEAWAY: { label: 'Mang đi', icon: <Timer />, color: 'warning' },
    DELIVERY: { label: 'Giao hàng', icon: <FlightTakeoff />, color: 'primary' }
  };

  // Status configuration
  const statusConfig = {
    PENDING: { label: 'Chờ xử lý', color: 'default', icon: <AccessTime /> },
    PREPARING: { label: 'Đang chuẩn bị', color: 'warning', icon: <Restaurant /> },
    READY: { label: 'Sẵn sàng', color: 'success', icon: <CheckCircle /> },
    COMPLETED: { label: 'Hoàn thành', color: 'default', icon: <Check /> }
  };

  // Calculate statistics
  const stats = {
    pending: orders.filter(o => o.status === 'PENDING').length,
    preparing: orders.filter(o => o.status === 'PREPARING').length,
    ready: orders.filter(o => o.status === 'READY').length,
    urgent: orders.filter(o => o.priority === 'URGENT' && o.status !== 'COMPLETED').length,
    avgTime: orders.length > 0 
      ? Math.round(orders.reduce((sum, o) => sum + o.elapsedTime, 0) / orders.length) 
      : 0
  };

  // Handle status change
  const handleStatusChange = (orderId: number, newStatus: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED') => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    
    const order = orders.find(o => o.id === orderId);
    setSuccessMessage(`Order ${order?.orderCode} status updated to ${statusConfig[newStatus].label}`);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);

    // Remove completed orders after a delay
    if (newStatus === 'COMPLETED') {
      setTimeout(() => {
        setOrders(prevOrders => prevOrders.filter(o => o.id !== orderId));
      }, 2000);
    }
  };

  const handleStartCooking = (orderId: number) => {
    handleStatusChange(orderId, 'PREPARING');
  };

  const handleMarkReady = (orderId: number) => {
    handleStatusChange(orderId, 'READY');
  };

  const handleComplete = (orderId: number) => {
    handleStatusChange(orderId, 'COMPLETED');
  };

  const handlePrint = (order: KitchenOrder) => {
    console.log('Printing order:', order.orderCode);
    alert(`Printing order ${order.orderCode}`);
  };

  const getTimeColor = (order: KitchenOrder): string => {
    const percentage = (order.elapsedTime / order.estimatedTime) * 100;
    if (percentage >= 100) return 'error.main';
    if (percentage >= 80) return 'warning.main';
    return 'success.main';
  };

  const getProgressColor = (order: KitchenOrder): 'error' | 'warning' | 'success' => {
    const percentage = (order.elapsedTime / order.estimatedTime) * 100;
    if (percentage >= 100) return 'error';
    if (percentage >= 80) return 'warning';
    return 'success';
  };

  const formatTime = (date: string): string => {
    return new Date(date).toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatElapsedTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Apply date range filter and sort by receivedTime desc
  const filteredSorted = (() => {
    let list = orders;
    const start = filterStartDate ? new Date(`${filterStartDate}T00:00:00`) : null;
    const end = filterEndDate ? new Date(`${filterEndDate}T23:59:59`) : null;
    if (start) {
      list = list.filter(o => {
        const t = new Date(o.receivedTime).getTime();
        return !isNaN(t) && t >= start.getTime();
      });
    }
    if (end) {
      list = list.filter(o => {
        const t = new Date(o.receivedTime).getTime();
        return !isNaN(t) && t <= end.getTime();
      });
    }
    return list.slice().sort((a, b) => new Date(b.receivedTime).getTime() - new Date(a.receivedTime).getTime());
  })();

  // Group orders by status
  const pendingOrders = filteredSorted.filter(o => o.status === 'PENDING');
  const preparingOrders = filteredSorted.filter(o => o.status === 'PREPARING');
  const readyOrders = filteredSorted.filter(o => o.status === 'READY');

  // Render order card
  const renderOrderCard = (order: KitchenOrder) => {
    const priority = priorityConfig[order.priority];
    const type = typeConfig[order.type];
    const timePercentage = Math.min((order.elapsedTime / order.estimatedTime) * 100, 100);

    return (
      <Card
        key={order.id}
        sx={{
          mb: 2,
          bgcolor: priority.bgcolor,
          border: order.priority === 'URGENT' ? '2px solid' : 'none',
          borderColor: order.priority === 'URGENT' ? 'error.main' : 'transparent',
          boxShadow: order.priority === 'URGENT' ? 4 : 2,
          animation: order.priority === 'URGENT' && order.elapsedTime >= order.estimatedTime 
            ? 'pulse 2s infinite' 
            : 'none',
          '@keyframes pulse': {
            '0%': { boxShadow: '0 0 0 0 rgba(244, 67, 54, 0.7)' },
            '70%': { boxShadow: '0 0 0 10px rgba(244, 67, 54, 0)' },
            '100%': { boxShadow: '0 0 0 0 rgba(244, 67, 54, 0)' }
          }
        }}
      >
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: type.color + '.main' }}>
              {type.icon}
            </Avatar>
          }
          action={
            <Stack direction="row" spacing={1}>
              <Chip
                label={priority.label}
                color={priority.color}
                size="small"
                icon={order.priority === 'URGENT' ? <Warning /> : undefined}
              />
              <IconButton size="small" onClick={() => handlePrint(order)}>
                <Print />
              </IconButton>
            </Stack>
          }
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" fontWeight="bold">
                {order.orderCode}
              </Typography>
              {order.tableNumber && (
                <Chip
                  label={`Table ${order.tableNumber}`}
                  size="small"
                  color="info"
                  variant="outlined"
                />
              )}
            </Stack>
          }
          subheader={
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Person fontSize="small" />
                <Typography variant="body2">{order.customerName}</Typography>
              </Box>
              {order.customerPhone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Phone fontSize="small" />
                  <Typography variant="body2">{order.customerPhone}</Typography>
                </Box>
              )}
            </Stack>
          }
        />
        
        <CardContent>
          {/* Items List */}
          <List dense>
            {order.items.map((item, index) => (
              <React.Fragment key={item.id}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {item.quantity}x
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={item.name}
                    secondary={item.specialInstructions}
                    secondaryTypographyProps={{
                      color: 'error.main',
                      fontStyle: 'italic'
                    }}
                  />
                </ListItem>
                {index < order.items.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>

          {/* Special Note */}
          {order.note && (
            <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
              <strong>Note:</strong> {order.note}
            </Alert>
          )}

          {/* Time Progress */}
          <Box sx={{ mt: 2, mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AccessTime fontSize="small" />
                <Typography variant="body2">
                  Received: {formatTime(order.receivedTime)}
                </Typography>
              </Stack>
              <Typography 
                variant="body2" 
                fontWeight="bold"
                color={getTimeColor(order)}
              >
                {formatElapsedTime(order.elapsedTime)} / {order.estimatedTime} min
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={timePercentage}
              color={getProgressColor(order)}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>

          {/* Action Buttons */}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            {order.status === 'PENDING' && (
              <Button
                fullWidth
                variant="contained"
                color="warning"
                startIcon={<PlayArrow />}
                onClick={() => handleStartCooking(order.id)}
              >
                Start Cooking
              </Button>
            )}
            {order.status === 'PREPARING' && (
              <Button
                fullWidth
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                onClick={() => handleMarkReady(order.id)}
              >
                Mark Ready
              </Button>
            )}
            {order.status === 'READY' && (
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<Check />}
                onClick={() => handleComplete(order.id)}
              >
                Complete Order
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Kitchen Board
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time order display • Last updated: {currentTime.toLocaleTimeString('vi-VN')}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => setOrders([...MOCK_KITCHEN_ORDERS])}
        >
          Refresh
        </Button>
      </Box>

      {/* Date Filters */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <TextField
          label="Từ ngày"
          type="date"
          value={filterStartDate}
          onChange={(e) => setFilterStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
        <TextField
          label="Đến ngày"
          type="date"
          value={filterEndDate}
          onChange={(e) => setFilterEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
      </Stack>

      {/* Success Alert */}
      {showSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setShowSuccess(false)}>
          {successMessage}
        </Alert>
      )}

      {/* Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={6} md={2.4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
            <Typography variant="h3" fontWeight="bold" color="warning.dark">
              {stats.pending}
            </Typography>
            <Typography variant="body2" color="text.secondary">Chờ xử lý</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={6} md={2.4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light' }}>
            <Typography variant="h3" fontWeight="bold" color="info.dark">
              {stats.preparing}
            </Typography>
            <Typography variant="body2" color="text.secondary">Đang chuẩn bị</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={6} md={2.4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
            <Typography variant="h3" fontWeight="bold" color="success.dark">
              {stats.ready}
            </Typography>
            <Typography variant="body2" color="text.secondary">Sẵn sàng</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={6} md={2.4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light' }}>
            <Badge badgeContent={stats.urgent} color="error">
              <Warning sx={{ fontSize: 40, color: 'error.dark' }} />
            </Badge>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Urgent Orders
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={6} md={2.4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light' }}>
            <Typography variant="h3" fontWeight="bold" color="primary.dark">
              {stats.avgTime}m
            </Typography>
            <Typography variant="body2" color="text.secondary">Avg Time</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Kitchen Board - 3 Columns */}
      <Grid container spacing={2}>
        {/* Pending Orders */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: 'grey.50', minHeight: 400 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTime color="warning" />
              Chờ xử lý ({pendingOrders.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {pendingOrders.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <AccessTime sx={{ fontSize: 60, opacity: 0.3 }} />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Không có đơn hàng chờ xử lý
                </Typography>
              </Box>
            ) : (
              pendingOrders.map(order => renderOrderCard(order))
            )}
          </Paper>
        </Grid>

        {/* Preparing Orders */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: 'grey.50', minHeight: 400 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Restaurant color="info" />
              Đang chuẩn bị ({preparingOrders.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {preparingOrders.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <Restaurant sx={{ fontSize: 60, opacity: 0.3 }} />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Không có đơn hàng đang chuẩn bị
                </Typography>
              </Box>
            ) : (
              preparingOrders.map(order => renderOrderCard(order))
            )}
          </Paper>
        </Grid>

        {/* Ready Orders */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: 'grey.50', minHeight: 400 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle color="success" />
              Sẵn sàng ({readyOrders.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {readyOrders.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <CheckCircle sx={{ fontSize: 60, opacity: 0.3 }} />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Không có đơn hàng sẵn sàng
                </Typography>
              </Box>
            ) : (
              readyOrders.map(order => renderOrderCard(order))
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default KitchenBoard;
