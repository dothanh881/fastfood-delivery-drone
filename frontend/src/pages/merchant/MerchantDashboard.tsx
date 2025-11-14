import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, TextField, Stack, Divider, CircularProgress } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useMerchantSession } from '../../store/merchantSession';
import { getOrderStats, OrderStatsResponse } from '../../services/order';
import { ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

/**
 * M02 - Dashboard (Mock)
 * - TODO: Gọi API thống kê nhanh: đơn hôm nay, doanh thu, phản hồi (sau)
 * - Hiện tại hiển thị số liệu giả.
 */
const formatVND = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

const MerchantDashboard: React.FC = () => {
  const { currentStore } = useMerchantSession();
  const { storeId: storeIdParam } = useParams();
  const storeId = useMemo(() => {
    if (storeIdParam) return Number(storeIdParam);
    return currentStore ? Number(currentStore.id) : undefined;
  }, [storeIdParam, currentStore]);
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [stats, setStats] = useState<OrderStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Mặc định: thống kê hôm nay
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const d = `${yyyy}-${mm}-${dd}`;
    setStart(d);
    setEnd(d);
  }, []);

  const reload = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const res = await getOrderStats(storeId, start || undefined, end || undefined);
      setStats(res);
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [storeId, start, end]);


  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Dashboard
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        {currentStore && (
          <TextField
            label="Cửa hàng"
            value={currentStore.name}
            InputProps={{ readOnly: true }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 260 }}
          />
        )}
        <TextField
          label="Từ ngày"
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Đến ngày"
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Stack>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6">Doanh thu</Typography>
              <Typography variant="h4" fontWeight={700} color="primary">
                {loading ? '...' : `${formatVND(Number(stats?.totalRevenue || 0))} đ`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6">Đơn đang xử lý</Typography>
              <Typography variant="h4" fontWeight={700}>
                {loading ? '...' : Number(stats?.processingCount || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6">Đã giao</Typography>
              <Typography variant="h4" fontWeight={700}>
                {loading ? '...' : Number(stats?.deliveredCount || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6">Bị hủy</Typography>
              <Typography variant="h4" fontWeight={700}>
                {loading ? '...' : Number(stats?.cancelledCount || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Grid container spacing={2}>
        {/* Biểu đồ Pie: phân bổ trạng thái đơn hàng (theo cửa hàng hiện hành) */}
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Phân bổ trạng thái đơn hàng
              </Typography>
              {!stats ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
                  {loading ? <CircularProgress /> : <Typography color="text.secondary">Chọn cửa hàng để xem thống kê</Typography>}
                </Box>
              ) : (
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Đang xử lý', value: Number(stats.processingCount || 0) },
                          { name: 'Đã giao', value: Number(stats.deliveredCount || 0) },
                          { name: 'Hủy', value: Number(stats.cancelledCount || 0) },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {['#1976d2', '#2e7d32', '#d32f2f'].map((c, i) => (
                          <Cell key={`cell-${i}`} fill={c} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => String(val)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MerchantDashboard;