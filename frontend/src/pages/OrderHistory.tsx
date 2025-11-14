import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, TablePagination, Stack, CircularProgress, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { listMyOrders, OrderVM } from '../services/order';

const OrderHistory: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [orders, setOrders] = useState<OrderVM[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Giữ đơn giản như phiên bản ban đầu

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      setError(null);
      listMyOrders(user.id)
        .then((data) => {
          console.log("API Response Data:", data);
          setOrders(Array.isArray(data) ? data : []);
        })
        .catch((error: any) => {
          // Log chi tiết để chẩn đoán nhanh
          const status = error?.response?.status;
          const url = error?.config?.url;
          const ct = error?.response?.headers?.['content-type'] || error?.response?.headers?.['Content-Type'];
          let bodySnippet = '';
          try {
            const raw = error?.response?.data;
            bodySnippet = typeof raw === 'string' ? raw.slice(0, 120) : JSON.stringify(raw)?.slice(0, 120);
          } catch {}
          console.error('Failed to fetch orders:', { status, url, contentType: ct, bodySnippet, error });

          setOrders([]);

          // Thông điệp người dùng rõ ràng hơn
          if (error?.message === 'HTML_RESPONSE_NOT_JSON') {
            setError('Máy chủ trả về HTML thay vì JSON. Vui lòng đăng nhập lại hoặc kiểm tra phiên làm việc.');
          } else if (error?.message === 'INVALID_ORDER_LIST_FORMAT') {
            setError('Định dạng dữ liệu đơn hàng không hợp lệ. Vui lòng thử lại sau.');
          } else if (!error?.response) {
            setError('Không thể kết nối tới máy chủ. Kiểm tra mạng hoặc server backend.');
          } else {
            setError(error?.response?.data?.message || `Lỗi tải đơn hàng (HTTP ${status}).`);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user]);

  const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number') return '--';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDateTime = (date?: string) => {
    if (!date) return '--';
    return new Date(date).toLocaleString('vi-VN');
  };

  // Status mapping to Vietnamese
  const statusLabels: Record<string, string> = {
    'CREATED': 'Mới tạo',
    'CONFIRMED': 'Đã xác nhận',
    'PREPARING': 'Đang chuẩn bị',
    'DELIVERING': 'Đang giao',
    'COMPLETED': 'Hoàn thành',
    'CANCELLED': 'Đã hủy'
  };

  const statusColor = (s: OrderVM['status']) => {
    switch (s) {
      case 'COMPLETED':
        return 'success';
      case 'DELIVERING':
        return 'info';
      case 'PREPARING':
        return 'warning';
      case 'CONFIRMED':
        return 'primary';
      case 'CREATED':
        return 'default';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    return statusLabels[status] || status;
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const safeOrders = Array.isArray(orders) ? orders : [];
  const pagedOrders = safeOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>Lịch sử đơn hàng</Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
      <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: 'grey.100' } }}>
                <TableCell>Mã đơn</TableCell>
                <TableCell>Thời gian</TableCell>
                <TableCell>Món</TableCell>
                <TableCell>Tổng</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="center">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(Array.isArray(pagedOrders) ? pagedOrders : []).map((o) => {
                const itemCount = o.items?.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0) ?? 0;
                return (
                  <TableRow key={o.id} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'grey.50' } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>#{o.id}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{formatDateTime(o.createdAt)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{itemCount} món</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {formatCurrency(o.total)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={getStatusLabel(o.status)} color={statusColor(o.status) as any} size="small" />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Button variant="outlined" size="small" onClick={() => navigate(`/order/tracking/${o.id}`)}>Theo dõi</Button>
                        <Button variant="contained" size="small" onClick={() => navigate(`/order/confirmation/${o.id}`)}>Xem xác nhận</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}

              {pagedOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      Không có đơn hàng nào
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={safeOrders.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage="Hàng mỗi trang"
        />
      </Paper>
      )}
    </Box>
  );
};

export default OrderHistory;