import React, { useState, useEffect } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  AccessTime,
  Cancel,
  CheckCircle,
  FilterList,
  FlightTakeoff,
  GpsFixed,
  LocalShipping,
  LocationOn,
  Payment,
  Person,
  Phone,
  Receipt,
  Refresh,
  Restaurant,
  Search,
  Timeline,
  Visibility
} from '@mui/icons-material';
import { formatOrderCodeSuggestion } from '../../utils/orderCode';
import { 
  getOrdersByStatus, 
  updateOrderStatus, 
  getOrderById, 
  OrderResponse, 
  Page, 
  OrderDTO,
  assignDroneToOrder,
  completeDelivery,
  DroneAssignmentResponse,
  DeliveryTrackingResponse
} from '../../services/order';
import TrackingMap from '../../components/TrackingMap';
import PaginationBar from '../../components/PaginationBar';

// Order status types
type OrderStatus = 'CREATED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';

// Map UI status <-> backend status
const uiToBackendStatus: Record<OrderStatus, string> = {
  CREATED: 'CREATED',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY: 'READY_FOR_DELIVERY',
  DELIVERING: 'OUT_FOR_DELIVERY',
  COMPLETED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
};
const backendToUIStatus: Record<string, OrderStatus> = {
  CREATED: 'CREATED',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY_FOR_DELIVERY: 'READY',
  ASSIGNED: 'READY',
  OUT_FOR_DELIVERY: 'DELIVERING',
  DELIVERED: 'COMPLETED',
  REJECTED: 'CANCELLED',
  CANCELLED: 'CANCELLED',
  FAILED: 'CANCELLED',
};

// Mock data structure
interface OrderItem {
  id: number;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
}

interface Order {
  id: number;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  note?: string;
  items: OrderItem[];
  storeName: string;
  // Drone tracking information
  droneId?: number;
  deliveryId?: number;
  deliveryTracking?: DeliveryTrackingResponse;
}

// Mock orders data
const MOCK_ORDERS: Order[] = [
  {
    id: 1,
    orderCode: 'ORD-2025-001',
    customerName: 'Nguyễn Văn A',
    customerPhone: '0901234567',
    customerAddress: '123 Lê Lợi, Quận 1, TP.HCM',
    status: 'CREATED',
    totalAmount: 250000,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    createdAt: '2025-10-20T10:30:00',
    updatedAt: '2025-10-20T10:30:00',
    note: 'Gọi trước 5 phút',
    storeName: 'Downtown Store',
    items: [
      { id: 1, menuItemName: 'Classic Burger', quantity: 2, unitPrice: 85000, imageUrl: '/uploads/products/burger.jpg' },
      { id: 2, menuItemName: 'French Fries', quantity: 2, unitPrice: 40000, imageUrl: '/uploads/products/fries.jpg' }
    ]
  },
  {
    id: 2,
    orderCode: 'ORD-2025-002',
    customerName: 'Trần Thị B',
    customerPhone: '0907654321',
    customerAddress: '456 Nguyễn Huệ, Quận 1, TP.HCM',
    status: 'CONFIRMED',
    totalAmount: 180000,
    paymentMethod: 'VNPAY',
    paymentStatus: 'PAID',
    createdAt: '2025-10-20T09:15:00',
    updatedAt: '2025-10-20T09:20:00',
    storeName: 'Downtown Store',
    items: [
      { id: 3, menuItemName: 'Fried Chicken', quantity: 1, unitPrice: 120000 },
      { id: 4, menuItemName: 'Coca Cola', quantity: 2, unitPrice: 30000 }
    ]
  },
  {
    id: 3,
    orderCode: 'ORD-2025-003',
    customerName: 'Lê Văn C',
    customerPhone: '0912345678',
    customerAddress: '789 Pasteur, Quận 3, TP.HCM',
    status: 'PREPARING',
    totalAmount: 320000,
    paymentMethod: 'VNPAY',
    paymentStatus: 'PAID',
    createdAt: '2025-10-20T08:45:00',
    updatedAt: '2025-10-20T09:00:00',
    note: 'Không hành',
    storeName: 'Uptown Store',
    items: [
      { id: 5, menuItemName: 'Pizza', quantity: 1, unitPrice: 200000 },
      { id: 6, menuItemName: 'Chicken Wings', quantity: 1, unitPrice: 120000 }
    ]
  },
  {
    id: 4,
    orderCode: 'ORD-2025-004',
    customerName: 'Phạm Thị D',
    customerPhone: '0923456789',
    customerAddress: '321 Võ Văn Tần, Quận 3, TP.HCM',
    status: 'DELIVERING',
    totalAmount: 195000,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    createdAt: '2025-10-20T08:00:00',
    updatedAt: '2025-10-20T08:45:00',
    storeName: 'Downtown Store',
    items: [
      { id: 7, menuItemName: 'Cheeseburger', quantity: 2, unitPrice: 95000 },
      { id: 8, menuItemName: 'Ice Cream', quantity: 1, unitPrice: 50000 }
    ]
  },
  {
    id: 5,
    orderCode: 'ORD-2025-005',
    customerName: 'Hoàng Văn E',
    customerPhone: '0934567890',
    customerAddress: '654 Điện Biên Phủ, Quận Bình Thạnh, TP.HCM',
    status: 'COMPLETED',
    totalAmount: 275000,
    paymentMethod: 'VNPAY',
    paymentStatus: 'PAID',
    createdAt: '2025-10-20T07:00:00',
    updatedAt: '2025-10-20T08:15:00',
    storeName: 'Uptown Store',
    items: [
      { id: 9, menuItemName: 'Classic Burger', quantity: 3, unitPrice: 85000 },
      { id: 10, menuItemName: 'Coca Cola', quantity: 1, unitPrice: 30000 }
    ]
  },
  {
    id: 6,
    orderCode: 'ORD-2025-006',
    customerName: 'Võ Thị F',
    customerPhone: '0945678901',
    customerAddress: '987 Cộng Hòa, Quận Tân Bình, TP.HCM',
    status: 'CANCELLED',
    totalAmount: 150000,
    paymentMethod: 'COD',
    paymentStatus: 'FAILED',
    createdAt: '2025-10-20T06:30:00',
    updatedAt: '2025-10-20T06:45:00',
    note: 'Khách hủy đơn',
    storeName: 'Downtown Store',
    items: [
      { id: 11, menuItemName: 'Fried Chicken', quantity: 1, unitPrice: 120000 },
      { id: 12, menuItemName: 'French Fries', quantity: 1, unitPrice: 40000 }
    ]
  }
];

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [filterStore, setFilterStore] = useState<string>('all');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [pageData, setPageData] = useState<Page<OrderResponse> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  
  // Drone tracking states
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [droneAssigning, setDroneAssigning] = useState<number | null>(null);

  // Status configuration
  const statusConfig: Record<OrderStatus, { label: string; color: any; icon: any }> = {
    CREATED: { label: 'Mới tạo', color: 'default', icon: <Receipt /> },
    CONFIRMED: { label: 'Đã xác nhận', color: 'info', icon: <CheckCircle /> },
    PREPARING: { label: 'Đang chuẩn bị', color: 'warning', icon: <Restaurant /> },
    READY: { label: 'Sẵn sàng giao', color: 'info', icon: <FlightTakeoff /> },
    DELIVERING: { label: 'Đang giao', color: 'primary', icon: <FlightTakeoff /> },
    COMPLETED: { label: 'Hoàn thành', color: 'success', icon: <CheckCircle /> },
    CANCELLED: { label: 'Đã hủy', color: 'error', icon: <Cancel /> }
  };

  const statusTabs: OrderStatus[] = ['CREATED','CONFIRMED','PREPARING','DELIVERING','COMPLETED','CANCELLED'];
  // Thêm trạng thái READY để lọc riêng các đơn sẵn sàng giao
  const statusTabsReady: OrderStatus[] = ['CREATED','CONFIRMED','PREPARING','READY','DELIVERING','COMPLETED','CANCELLED'];
  const currentStatus: OrderStatus = statusTabsReady[selectedTab];

  const joinAddress = (addr: any): string => {
    if (!addr) return '-';
    const parts = [addr.line1, addr.ward, addr.district, addr.city].filter(Boolean);
    return parts.join(', ');
  };

  const mapOrderResponse = (o: OrderResponse): Order => ({
    id: o.id,
    orderCode: o.orderCode || formatOrderCodeSuggestion(String(o.id)),
    customerName: '-',
    customerPhone: '-',
    customerAddress: joinAddress(o.address),
    status: backendToUIStatus[(o.status as any) || 'CREATED'] as OrderStatus,
    totalAmount: Number(o.totalAmount || 0),
    paymentMethod: o.paymentMethod || 'COD',
    paymentStatus: (o.paymentStatus as any) || 'PENDING',
    createdAt: String(o.createdAt || ''),
    updatedAt: String(o.updatedAt || ''),
    note: o.note,
    items: (o.items || []).map(it => ({ id: it.id, menuItemName: it.menuItemName || `Item ${it.menuItemId}`, quantity: it.quantity, unitPrice: Number(it.unitPrice || 0) })),
    storeName: '-',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getOrdersByStatus(uiToBackendStatus[currentStatus], page, size);
      setPageData(res);
      setOrders((res.content || []).map(mapOrderResponse));
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [currentStatus, page, size]);

  // Calculate statistics
  const stats = {
    total: orders.length,
    created: orders.filter(o => o.status === 'CREATED').length,
    confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
    preparing: orders.filter(o => o.status === 'PREPARING').length,
    delivering: orders.filter(o => o.status === 'DELIVERING').length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
    cancelled: orders.filter(o => o.status === 'CANCELLED').length,
    revenue: orders.filter(o => o.status === 'COMPLETED').reduce((sum, o) => sum + o.totalAmount, 0),
    pending: orders.filter(o => ['CREATED', 'CONFIRMED', 'PREPARING', 'DELIVERING'].includes(o.status)).length
  };

  // Get unique stores
  const stores = Array.from(new Set(orders.map(o => o.storeName).filter(s => s && s !== '-')));

  // Filter orders
  useEffect(() => {
    let filtered = orders;

    // Filter by search term (ID/code)
    if (searchTerm) {
      filtered = filtered.filter(order =>
        String(order.orderCode).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by store
    if (filterStore !== 'all') {
      filtered = filtered.filter(order => order.storeName === filterStore);
    }

    // Filter by date range (createdAt)
    const start = filterStartDate ? new Date(`${filterStartDate}T00:00:00`) : null;
    const end = filterEndDate ? new Date(`${filterEndDate}T23:59:59`) : null;
    if (start) {
      filtered = filtered.filter(order => {
        const t = new Date(order.createdAt).getTime();
        return !isNaN(t) && t >= start.getTime();
      });
    }
    if (end) {
      filtered = filtered.filter(order => {
        const t = new Date(order.createdAt).getTime();
        return !isNaN(t) && t <= end.getTime();
      });
    }

    // Sort by createdAt descending
    filtered = filtered.slice().sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      const va = isNaN(ta) ? 0 : ta;
      const vb = isNaN(tb) ? 0 : tb;
      return vb - va;
    });

    setFilteredOrders(filtered);
  }, [searchTerm, filterStore, filterStartDate, filterEndDate, orders]);

  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const detail: OrderDTO = await getOrderById(0, order.id);
      const items: OrderItem[] = (detail.orderItems || []).map((it) => ({
        id: Number(it.id),
        menuItemName: it.menuItem?.name || 'Sản phẩm',
        quantity: Number(it.quantity || 0),
        unitPrice: Number(it.unitPrice ?? it.menuItem?.price ?? 0),
        imageUrl: it.menuItem?.imageUrl || undefined,
      }));
      setSelectedOrder((prev) => prev ? {
        ...prev,
        totalAmount: Number(detail.totalAmount ?? prev.totalAmount),
        paymentMethod: detail.paymentMethod || prev.paymentMethod,
        paymentStatus: (detail.paymentStatus as any) || prev.paymentStatus,
        createdAt: detail.createdAt || prev.createdAt,
        customerAddress: joinAddress(detail.address) || prev.customerAddress,
        items,
      } : { ...order, items });
    } catch (e: any) {
      setDetailError(e?.response?.data?.message || 'Không tải được chi tiết đơn hàng');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDialog = () => { setDetailDialogOpen(false); setSelectedOrder(null); };

  // Tính trạng thái backend mục tiêu từ UI hiện tại và UI tiếp theo
  const computeTargetBackendStatus = (currentUi: OrderStatus, nextUi: OrderStatus): string | null => {
    if (currentUi === 'PREPARING' && nextUi === 'DELIVERING') return 'READY_FOR_DELIVERY';
    if (currentUi === 'DELIVERING' && nextUi === 'COMPLETED') return 'DELIVERED';
    return uiToBackendStatus[nextUi] || null;
  };

  const handleUpdateStatus = async (orderId: number, currentStatus: OrderStatus, nextStatus: OrderStatus) => {
    const target = computeTargetBackendStatus(currentStatus, nextStatus);
    if (!target) return;
    try {
      await updateOrderStatus(orderId, target);
      
      // Auto-assign drone when status changes to READY_FOR_DELIVERY
      if (target === 'READY_FOR_DELIVERY') {
        try {
          setDroneAssigning(orderId);
          const droneAssignment = await assignDroneToOrder(orderId);
          setSuccessMessage(`Đã cập nhật trạng thái và gán drone #${droneAssignment.droneId} cho đơn hàng`);
        } catch (droneError: any) {
          setSuccessMessage(`Đã cập nhật trạng thái thành ${statusConfig[nextStatus].label}. Lỗi gán drone: ${droneError?.response?.data?.message || 'Không thể gán drone'}`);
        } finally {
          setDroneAssigning(null);
        }
      } else {
        setSuccessMessage(`Đã cập nhật trạng thái đơn hàng thành ${statusConfig[nextStatus].label}`);
      }
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchData();
    } catch (e: any) {
      setErrorMessage(e?.response?.data?.message || 'Cập nhật trạng thái thất bại');
      setShowError(true);
      setTimeout(() => setShowError(false), 4000);
    }
  };

  // Handle drone assignment manually
  const handleAssignDrone = async (orderId: number) => {
    try {
      setDroneAssigning(orderId);
      const result = await assignDroneToOrder(orderId);
      setSuccessMessage(`Đã gán drone #${result.droneId} cho đơn hàng #${orderId}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchData();
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || 'Không thể gán drone');
      setShowError(true);
      setTimeout(() => setShowError(false), 4000);
    } finally {
      setDroneAssigning(null);
    }
  };

  // Handle delivery tracking
  const handleViewTracking = (orderId: number) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setTrackingDialogOpen(true);
    }
  };

  // Handle complete delivery
  const handleCompleteDelivery = async (orderId: number) => {
    try {
      await completeDelivery(orderId);
      setSuccessMessage('Đã hoàn thành giao hàng');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setTrackingDialogOpen(false);
      fetchData();
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || 'Không thể hoàn thành giao hàng');
      setShowError(true);
      setTimeout(() => setShowError(false), 4000);
    }
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const flow: Record<OrderStatus, OrderStatus | null> = {
      CREATED: 'CONFIRMED',
      CONFIRMED: 'PREPARING',
      PREPARING: 'READY',
      READY: 'DELIVERING',
      DELIVERING: 'COMPLETED',
      COMPLETED: null,
      CANCELLED: null
    };
    return flow[currentStatus];
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString('vi-VN');

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Order Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchData}
        >
          Refresh
        </Button>
      </Box>

      {/* Success/Error Alerts */}
      {showSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setShowSuccess(false)}>
          {successMessage}
        </Alert>
      )}
      {showError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setShowError(false)}>
          {errorMessage}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">Tổng đơn hàng</Typography>
                  <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
                </Box>
                <Receipt sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">Đang xử lý</Typography>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">{stats.pending}</Typography>
                </Box>
                <AccessTime sx={{ fontSize: 40, color: 'warning.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">Hoàn thành</Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">{stats.completed}</Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">Doanh thu</Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {formatCurrency(stats.revenue)}
                  </Typography>
                </Box>
                <Payment sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            fullWidth
            placeholder="Tìm theo mã đơn (ID)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Cửa hàng</InputLabel>
            <Select
              value={filterStore}
              label="Cửa hàng"
              onChange={(e: SelectChangeEvent) => setFilterStore(e.target.value)}
              startAdornment={<FilterList sx={{ mr: 1, color: 'action.active' }} />}
            >
              <MenuItem value="all">Tất cả cửa hàng</MenuItem>
              {stores.map(store => (<MenuItem key={store} value={store}>{store}</MenuItem>))}
            </Select>
          </FormControl>
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
        </Box>

        <Tabs value={selectedTab} onChange={(_, v) => { setSelectedTab(v); setPage(0); }} variant="scrollable">
          <Tab label={statusConfig.CREATED.label} />
          <Tab label={statusConfig.CONFIRMED.label} />
          <Tab label={statusConfig.PREPARING.label} />
          <Tab label={statusConfig.READY.label} />
          <Tab label={statusConfig.DELIVERING.label} />
          <Tab label={statusConfig.COMPLETED.label} />
          <Tab label={statusConfig.CANCELLED.label} />
        </Tabs>
      </Paper>

      {/* Orders Table */}
      <TableContainer component={Paper}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Mã đơn</TableCell>
              <TableCell>Khách hàng</TableCell>
              <TableCell>Cửa hàng</TableCell>
              <TableCell>Số tiền</TableCell>
              <TableCell>Thanh toán</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Thời gian</TableCell>
              <TableCell align="center">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.map((order) => {
              const config = statusConfig[order.status];
              const nextStatus = getNextStatus(order.status);

              return (
                <TableRow key={order.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {order.orderCode}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {order.customerName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {order.customerPhone}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{order.storeName}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {formatCurrency(order.totalAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Chip
                        label={order.paymentMethod}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={order.paymentStatus}
                        size="small"
                        color={order.paymentStatus === 'PAID' ? 'success' : order.paymentStatus === 'FAILED' ? 'error' : 'warning'}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={config.label}
                      color={config.color}
                      icon={config.icon}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {formatDateTime(order.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Tooltip title="Xem chi tiết">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleViewDetails(order)}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      
                      {/* Ẩn Drone Assignment Button cho demo - chỉ dùng auto-assign */}
                      {/* {order.status === 'READY' && (
                        <Tooltip title="Gán drone">
                          <IconButton
                            size="small"
                            color="secondary"
                            disabled={droneAssigning === order.id}
                            onClick={() => handleAssignDrone(order.id)}
                          >
                            {droneAssigning === order.id ? <CircularProgress size={16} /> : <FlightTakeoff />}
                          </IconButton>
                        </Tooltip>
                      )} */}
                      
                      {/* Delivery Tracking Button - Hiển thị khi đang giao hàng */}
                      {order.status === 'DELIVERING' && (
                        <Tooltip title="Theo dõi giao hàng">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => handleViewTracking(order.id)}
                          >
                            <GpsFixed />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {nextStatus && (
                        <Tooltip title={`Chuyển sang ${statusConfig[nextStatus].label}`}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleUpdateStatus(order.id, order.status, nextStatus)}
                          >
                            {statusConfig[nextStatus].icon}
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    {loading ? 'Đang tải...' : 'Không tìm thấy đơn hàng nào'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography color="text.secondary">
            Tổng: {pageData?.totalElements || 0} • Trang {page + 1}/{pageData?.totalPages || 0}
          </Typography>
        </Stack>
        <PaginationBar
          page={page}
          totalPages={pageData?.totalPages || 0}
          onChange={(p) => setPage(p)}
          maxButtons={5}
        />
      </Box>

      {/* Order Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Chi tiết đơn hàng</Typography>
            {selectedOrder && (
              <Chip
                label={statusConfig[selectedOrder.status].label}
                color={statusConfig[selectedOrder.status].color}
                icon={statusConfig[selectedOrder.status].icon}
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedOrder && (
            <Grid container spacing={3}>
              {/* Order Info */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Thông tin đơn hàng
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Receipt fontSize="small" />
                      <Typography variant="body2">
                        <strong>Mã đơn:</strong> {selectedOrder.orderCode}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 3 }}>
                      Gợi ý mã đơn: {formatOrderCodeSuggestion(selectedOrder.id, selectedOrder.createdAt)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccessTime fontSize="small" />
                      <Typography variant="body2">
                        <strong>Thời gian:</strong> {formatDateTime(selectedOrder.createdAt)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Payment fontSize="small" />
                      <Typography variant="body2">
                        <strong>Thanh toán:</strong> {selectedOrder.paymentMethod} ({selectedOrder.paymentStatus})
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              {/* Customer Info */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Thông tin khách hàng
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person fontSize="small" />
                      <Typography variant="body2">
                        <strong>Tên:</strong> {selectedOrder.customerName}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone fontSize="small" />
                      <Typography variant="body2">
                        <strong>SĐT:</strong> {selectedOrder.customerPhone}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <LocationOn fontSize="small" />
                      <Typography variant="body2">
                        <strong>Địa chỉ:</strong> {selectedOrder.customerAddress}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              {/* Loading/Error for items */}
              {detailLoading && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={28} sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">Đang tải chi tiết đơn hàng...</Typography>
                  </Box>
                </Grid>
              )}
              {detailError && (
                <Grid item xs={12}>
                  <Alert severity="error">{detailError}</Alert>
                </Grid>
              )}

              {/* Order Items */}
              {!detailLoading && !detailError && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Chi tiết món ăn
                  </Typography>
                  <Paper sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
                    <List>
                      {selectedOrder.items.map((item, index) => (
                        <React.Fragment key={item.id}>
                          <ListItem sx={{ py: 1.5 }}>
                            <Avatar
                              src={item.imageUrl}
                              alt={item.menuItemName}
                              sx={{ mr: 2, width: 56, height: 56, bgcolor: 'grey.100' }}
                              variant="rounded"
                            />
                            <ListItemText
                              primary={item.menuItemName}
                              secondary={`${formatCurrency(item.unitPrice)} x ${item.quantity}`}
                            />
                            <Typography variant="body1" fontWeight="bold">
                              {formatCurrency(item.unitPrice * item.quantity)}
                            </Typography>
                          </ListItem>
                          {index < selectedOrder.items.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              )}

              {/* Note */}
              {selectedOrder.note && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <strong>Ghi chú:</strong> {selectedOrder.note}
                  </Alert>
                </Grid>
              )}

              {/* Total */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Tổng cộng</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {formatCurrency(selectedOrder.totalAmount)}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Đóng</Button>
          {selectedOrder && getNextStatus(selectedOrder.status) && (
            <Button
              variant="contained"
              disabled={loading || detailLoading}
              onClick={() => {
                const nextStatus = getNextStatus(selectedOrder.status);
                if (nextStatus) {
                  handleUpdateStatus(selectedOrder.id, selectedOrder.status, nextStatus);
                  handleCloseDialog();
                }
              }}
            >
              Chuyển sang {statusConfig[getNextStatus(selectedOrder.status)!].label}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delivery Tracking Dialog với TrackingMap */}
      <Dialog open={trackingDialogOpen} onClose={() => setTrackingDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Theo dõi giao hàng - Đơn hàng #{selectedOrder?.id}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {selectedOrder && (
            <TrackingMap
              orderId={String(selectedOrder.id)}
              onArrived={() => {
                try { /* tuỳ chọn: gọi completeDelivery */ } catch {}
                setTrackingDialogOpen(false);
                fetchData();
              }}
              height={480}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrackingDialogOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderManagement;
