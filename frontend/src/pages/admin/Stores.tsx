import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Card, CardContent, TextField, InputAdornment, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Stack, Button, Chip, LinearProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';
import { fetchStores, StoreViewModel, updateStoreDetails } from '../../services/stores';

const Stores: React.FC = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreViewModel[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await fetchStores(false); // admin: lấy tất cả, không chỉ open
      setStores(list);
    } catch (e: any) {
      console.error('Load stores failed', e);
      setError(e?.response?.data?.message || 'Không tải được danh sách cửa hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      (s.address || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q)
    );
  }, [query, stores]);

  const handleSuspend = async (id: string) => {
    try {
      setActionLoadingId(id);
      await updateStoreDetails(id, { status: 'SUSPENDED' });
      // Cập nhật lại danh sách
      setStores(prev => prev.map(s => s.id === id ? { ...s, status: 'SUSPENDED', isOpen: false } : s));
    } catch (e: any) {
      console.error('Suspend store failed', e);
      alert(e?.response?.data?.message || 'Khóa cửa hàng thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      setActionLoadingId(id);
      await updateStoreDetails(id, { status: 'ACTIVE' });
      setStores(prev => prev.map(s => s.id === id ? { ...s, status: 'ACTIVE', isOpen: true } : s));
    } catch (e: any) {
      console.error('Activate store failed', e);
      alert(e?.response?.data?.message || 'Mở khóa cửa hàng thất bại');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Quản lý Cửa Hàng
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Xem, chỉnh sửa và khóa cửa hàng. Không cho phép thêm mới.
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              fullWidth
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên, ID, địa chỉ, SĐT..."
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            />
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} disabled={loading}>
              {loading ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </Stack>
          {error && (
            <Typography variant="caption" color="error">{error}</Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading && <LinearProgress sx={{ mb: 2 }} />}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Tên cửa hàng</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell>Địa chỉ</TableCell>
                <TableCell>SĐT</TableCell>
                <TableCell align="right">Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>{s.id}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>
                    {s.status === 'ACTIVE' ? (
                      <Chip label="ACTIVE" color="success" size="small" icon={<CheckCircleIcon />} />
                    ) : (
                      <Chip label="SUSPENDED" color="warning" size="small" icon={<BlockIcon />} />
                    )}
                  </TableCell>
                  <TableCell>{s.address || '-'}</TableCell>
                  <TableCell>{s.phone || '-'}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <IconButton color="primary" onClick={() => navigate(`/admin/stores/${s.id}`)} aria-label="Xem chi tiết">
                        <VisibilityIcon />
                      </IconButton>
                      {s.status === 'ACTIVE' ? (
                        <Button size="small" variant="outlined" color="warning" onClick={() => handleSuspend(s.id)} disabled={actionLoadingId === s.id}>
                          {actionLoadingId === s.id ? 'Đang khóa...' : 'Khóa'}
                        </Button>
                      ) : (
                        <Button size="small" variant="outlined" color="success" onClick={() => handleActivate(s.id)} disabled={actionLoadingId === s.id}>
                          {actionLoadingId === s.id ? 'Đang mở...' : 'Mở khóa'}
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Không có cửa hàng phù hợp.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Stores;