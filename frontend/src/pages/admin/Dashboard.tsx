import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge,
  Stack,
  Button,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  People,
  LocalShipping,
  AttachMoney,
  Restaurant,
  Warning,
  CheckCircle,
  Schedule,
  Refresh,
  LocalOffer,
  Store,
  Star,
  Timeline
} from '@mui/icons-material';
import { ResponsiveContainer, Tooltip as RTooltip, BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, Legend } from 'recharts';
import { fetchStores, StoreViewModel } from '../../services/stores';
import { getOrderStats, OrderStatsResponse } from '../../services/adminStats';

// Mock data types
interface KPIData {
  title: string;
  value: string | number;
  icon: React.ReactElement;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
}


interface TopProduct {
  id: string;
  name: string;
  category: string;
  orders: number;
  revenue: number;
  rating: number;
  trend: number;
}

interface ActivityItem {
  id: string;
  type: 'order' | 'delivery' | 'customer' | 'alert';
  message: string;
  time: string;
  icon: React.ReactElement;
  color: string;
}

// Pie colors
const PIE_COLORS = ['#1976d2', '#2e7d32', '#ed6c02'];

// Mock data for KPIs
const kpiData: KPIData[] = [
  { 
    title: 'Total Revenue', 
    value: '$45,287', 
    icon: <AttachMoney />, 
    change: '+12.5%', 
    trend: 'up',
    color: 'success'
  },
  { 
    title: 'Orders Today', 
    value: 246, 
    icon: <ShoppingCart />, 
    change: '+8.2%', 
    trend: 'up',
    color: 'primary'
  },
  { 
    title: 'Active Deliveries', 
    value: 38, 
    icon: <LocalShipping />, 
    change: '+15.3%', 
    trend: 'up',
    color: 'info'
  },
  { 
    title: 'New Customers', 
    value: 124, 
    icon: <People />, 
    change: '+5.7%', 
    trend: 'up',
    color: 'success'
  },
  { 
    title: 'Avg. Order Value', 
    value: '$34.50', 
    icon: <TrendingUp />, 
    change: '-2.1%', 
    trend: 'down',
    color: 'warning'
  },
  { 
    title: 'Customer Rating', 
    value: '4.8/5', 
    icon: <Star />, 
    change: '+0.2', 
    trend: 'up',
    color: 'warning'
  }
];


// Mock data for top products
const topProducts: TopProduct[] = [
  { 
    id: '1', 
    name: 'Burger Deluxe', 
    category: 'Burgers', 
    orders: 156, 
    revenue: 2340, 
    rating: 4.8,
    trend: 12
  },
  { 
    id: '2', 
    name: 'Pizza Margherita', 
    category: 'Pizza', 
    orders: 132, 
    revenue: 5940, 
    rating: 4.9,
    trend: 8
  },
  { 
    id: '3', 
    name: 'Chicken Wings', 
    category: 'Chicken', 
    orders: 98, 
    revenue: 1470, 
    rating: 4.7,
    trend: -3
  },
  { 
    id: '4', 
    name: 'Sushi Set', 
    category: 'Japanese', 
    orders: 87, 
    revenue: 4785, 
    rating: 4.9,
    trend: 15
  },
  { 
    id: '5', 
    name: 'Ramen Bowl', 
    category: 'Japanese', 
    orders: 76, 
    revenue: 1520, 
    rating: 4.6,
    trend: 5
  }
];

// Date helpers
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
const daysInMonth = (year: number, monthIndexZero: number) => new Date(year, monthIndexZero + 1, 0).getDate();

// Mock data for recent activities
const recentActivities: ActivityItem[] = [
  { 
    id: '1', 
    type: 'order', 
    message: 'New order #ORD-2024-001 received', 
    time: '2 mins ago',
    icon: <ShoppingCart />,
    color: '#1976d2'
  },
  { 
    id: '2', 
    type: 'delivery', 
    message: 'Order #ORD-2024-098 delivered successfully', 
    time: '8 mins ago',
    icon: <CheckCircle />,
    color: '#2e7d32'
  },
  { 
    id: '3', 
    type: 'customer', 
    message: 'New customer registered: Nguyễn Văn A', 
    time: '15 mins ago',
    icon: <People />,
    color: '#9c27b0'
  },
  { 
    id: '5', 
    type: 'delivery', 
    message: 'Drone #DRN-003 started delivery', 
    time: '45 mins ago',
    icon: <LocalShipping />,
    color: '#0288d1'
  }
];

const Dashboard: React.FC = () => {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<StoreViewModel[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<'day' | 'month'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`; // YYYY-MM
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => fmtDate(new Date()));
  const [stats, setStats] = useState<OrderStatsResponse | null>(null);
  const [series, setSeries] = useState<Array<{ date: string; label: string; revenue: number }>>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Format VND currency
  const formatVND = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(n || 0));

  // Load stores for options & count
  useEffect(() => {
    const loadStores = async () => {
      try {
        const list = await fetchStores(false);
        setStores(list);
      } catch (e) {
        console.warn('Load stores failed', e);
      }
    };
    loadStores();
  }, []);

  const computeRange = (): { start: string; end: string } => {
    if (filterType === 'day') {
      const d = new Date(selectedDate);
      return { start: fmtDate(d), end: fmtDate(endOfDay(d)) };
    }
    const [yyyyStr, mmStr] = selectedMonth.split('-');
    const yyyy = Number(yyyyStr), mm = Number(mmStr);
    const startDate = new Date(yyyy, mm - 1, 1);
    const endDate = new Date(yyyy, mm - 1, daysInMonth(yyyy, mm - 1));
    return { start: fmtDate(startDate), end: fmtDate(endOfDay(endDate)) };
  };

  // Load stats for selected filters
  useEffect(() => {
    const loadStats = async () => {
      try {
        setStatsLoading(true);
        setError(null);
        const { start, end } = computeRange();
        const res = await getOrderStats({ storeId: selectedStore !== 'ALL' ? selectedStore : undefined, start, end });
        setStats(res);
      } catch (e: any) {
        console.error('Load stats failed', e);
        setError(e?.response?.data?.message || 'Không tải được thống kê');
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore, filterType, selectedMonth, selectedDate]);

  // Build daily revenue series for month filter
  useEffect(() => {
    const buildSeries = async () => {
      if (filterType !== 'month') { setSeries([]); return; }
      try {
        setSeriesLoading(true);
        setError(null);
        const [yyyyStr, mmStr] = selectedMonth.split('-');
        const yyyy = Number(yyyyStr), mm = Number(mmStr);
        const totalDays = daysInMonth(yyyy, mm - 1);
        const promises: Promise<OrderStatsResponse>[] = [];
        const labels: string[] = [];
        for (let day = 1; day <= totalDays; day++) {
          const d = new Date(yyyy, mm - 1, day);
          const start = fmtDate(d);
          const end = fmtDate(endOfDay(d));
          labels.push(String(day).padStart(2, '0'));
          promises.push(getOrderStats({ storeId: selectedStore !== 'ALL' ? selectedStore : undefined, start, end }));
        }
        const results = await Promise.all(promises);
        setSeries(results.map((r, idx) => ({ date: `${yyyy}-${mmStr}-${labels[idx]}`, label: labels[idx], revenue: Number(r.totalRevenue || 0) })));
      } catch (e: any) {
        console.error('Build series failed', e);
        setError(e?.response?.data?.message || 'Không tải được dữ liệu biểu đồ');
      } finally {
        setSeriesLoading(false);
      }
    };
    buildSeries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, selectedMonth, selectedStore]);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLastUpdate(new Date());
      setLoading(false);
    }, 1000);
  };

  const storeCount = stores.length;
  const totalRevenue = stats ? stats.totalRevenue : 0;
  const delivered = stats ? stats.deliveredCount : 0;
  const processing = stats ? stats.processingCount : 0;
  const cancelled = stats ? stats.cancelledCount : 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600, mb: 0.5 }}>
            Thống kê tổng quan
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="outlined"
            startIcon={loading ? <Refresh className="rotating" /> : <Refresh />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Làm mới
          </Button>
          <Select size="small" value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
            <MenuItem value="day">Theo ngày</MenuItem>
            <MenuItem value="month">Theo tháng</MenuItem>
          </Select>
          {filterType === 'day' ? (
            <TextField size="small" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          ) : (
            <TextField size="small" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
          )}
          <Select size="small" value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} displayEmpty>
            <MenuItem value="ALL">Tất cả cửa hàng</MenuItem>
            {stores.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </Select>
        </Stack>
      </Box>

      {/* System Alerts removed per request */}

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3} lg={3}>
          <Paper elevation={2}>
            <Card sx={{ boxShadow: 'none' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                    <Store />
                  </Avatar>
                </Box>
                <Typography variant="body2" color="text.secondary">Số cửa hàng</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>{storeCount}</Typography>
              </CardContent>
            </Card>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={3}>
          <Paper elevation={2}>
            <Card sx={{ boxShadow: 'none' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: 'success.main', width: 48, height: 48 }}>
                    <AttachMoney />
                  </Avatar>
                </Box>
                <Typography variant="body2" color="text.secondary">Doanh thu ({filterType === 'day' ? 'ngày' : 'tháng'})</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>{formatVND(Number(totalRevenue))}</Typography>
              </CardContent>
            </Card>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={3}>
          <Paper elevation={2}>
            <Card sx={{ boxShadow: 'none' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: 'info.main', width: 48, height: 48 }}>
                    <ShoppingCart />
                  </Avatar>
                </Box>
                <Typography variant="body2" color="text.secondary">Đơn đang xử lý</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>{processing}</Typography>
              </CardContent>
            </Card>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={3}>
          <Paper elevation={2}>
            <Card sx={{ boxShadow: 'none' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: 'success.main', width: 48, height: 48 }}>
                    <CheckCircle />
                  </Avatar>
                </Box>
                <Typography variant="body2" color="text.secondary">Đơn giao thành công</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>{delivered}</Typography>
              </CardContent>
            </Card>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Revenue / Status Chart */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timeline color="primary" />
                {filterType === 'month' ? 'Doanh thu theo ngày trong tháng' : 'Phân bố trạng thái đơn theo ngày'}
              </Typography>
              <Chip label={filterType === 'month' ? 'Tháng' : 'Ngày'} color="primary" size="small" />
            </Box>
            <Divider sx={{ mb: 3 }} />

            {filterType === 'month' ? (
              <Box sx={{ height: 320 }}>
                {seriesLoading && <LinearProgress sx={{ mb: 2 }} />}
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series}>
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={(v) => formatVND(Number(v as any))} />
                    <RTooltip formatter={(value: number) => formatVND(Number(value))} />
                    <Legend />
                    <Bar dataKey="revenue" name="Doanh thu" fill="#1976d2" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {statsLoading && <LinearProgress sx={{ mb: 2, width: '100%' }} />}
                {!statsLoading && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[
                        { name: 'Đang xử lý', value: processing },
                        { name: 'Giao thành công', value: delivered },
                        { name: 'Đã hủy', value: cancelled },
                      ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                      </Pie>
                      <Legend />
                      <RTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Box>
            )}

            {/* Summary Stats */}
            <Box sx={{ display: 'flex', gap: 4, mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Tổng doanh thu</Typography>
                <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                  {formatVND(Number(totalRevenue))}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Đang xử lý</Typography>
                <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
                  {processing}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Thành công</Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {delivered}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Đã hủy</Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {cancelled}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        {/* Top Selling Items */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocalOffer color="warning" />
              Top Selling Items
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List sx={{ pt: 0 }}>
              {topProducts.map((product, index) => (
                <ListItem 
                  key={product.id}
                  sx={{ 
                    px: 0,
                    py: 1.5,
                    borderBottom: index < topProducts.length - 1 ? 1 : 0,
                    borderColor: 'divider'
                  }}
                >
                  <ListItemAvatar>
                    <Avatar 
                      sx={{ 
                        bgcolor: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#cd7f32' : 'grey.300',
                        color: index < 3 ? 'white' : 'text.secondary',
                        fontWeight: 600
                      }}
                    >
                      #{index + 1}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {product.name}
                        </Typography>
                        <Chip 
                          label={`${product.trend > 0 ? '+' : ''}${product.trend}%`}
                          size="small"
                          color={product.trend > 0 ? 'success' : 'error'}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {product.orders} orders
                          </Typography>
                          <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                            {formatVND(product.revenue)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Star sx={{ fontSize: 14, color: 'warning.main' }} />
                          <Typography variant="caption">{product.rating}</Typography>
                          <Typography variant="caption" color="text.secondary">• {product.category}</Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Activities */}
      <Grid container spacing={3}>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Schedule color="info" />
              Recent Activities
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List sx={{ pt: 0 }}>
              {recentActivities.map((activity) => (
                <ListItem 
                  key={activity.id}
                  sx={{ px: 0, py: 1.5 }}
                >
                  <ListItemAvatar>
                    <Badge 
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      variant="dot"
                      sx={{
                        '& .MuiBadge-badge': {
                          backgroundColor: activity.color,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          border: '2px solid white'
                        }
                      }}
                    >
                      <Avatar sx={{ bgcolor: activity.color, width: 36, height: 36 }}>
                        {React.cloneElement(activity.icon, { sx: { fontSize: 20 } })}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2">
                        {activity.message}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {activity.time}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* CSS for rotating animation */}
      <style>
        {`
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .rotating {
            animation: rotate 1s linear infinite;
          }
        `}
      </style>
    </Box>
  );
};

export default Dashboard;