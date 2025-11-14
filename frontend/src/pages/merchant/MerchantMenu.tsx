import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Button, Stack, TextField, InputAdornment } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { fetchMenuItems, searchMenuItems, deleteMenuItem } from '../../services/menu';
import { useMerchantSession } from '../../store/merchantSession';
import { Search } from '@mui/icons-material';

/**
 * M05 - Menu Management (Mock)
 * - TODO: Gọi API danh sách món, tìm kiếm/lọc (sau)
 * - Hiện hiển thị danh sách giả.
 */
type ItemVM = { id: string; name: string; price: number; image?: string; categoryName?: string };

const MerchantMenu: React.FC = () => {
  const navigate = useNavigate();
  const { currentStore } = useMerchantSession();
  const [items, setItems] = useState<ItemVM[]>([]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const storeId = currentStore ? Number(currentStore.id) : undefined;
      const data = await fetchMenuItems(0, 20, storeId);
      const vm: ItemVM[] = (data || []).map(d => ({
        id: d.id,
        name: d.name,
        price: d.price,
        image: d.image,
        categoryName: d.category || undefined,
      }));
      setItems(vm);
    } catch (e) {
      // noop
    }
  }, [currentStore?.id]);

  useEffect(() => { load(); }, [load]);

  const onSearch = async () => {
    const q = search.trim();
    if (!q) return load();
    try {
      const storeId = currentStore ? Number(currentStore.id) : undefined;
      const data = await searchMenuItems(q, 0, 20, storeId);
      const vm: ItemVM[] = (data || []).map(d => ({
        id: d.id,
        name: d.name,
        price: d.price,
        image: d.image,
        categoryName: d.category || undefined,
      }));
      setItems(vm);
    } catch {}
  };

  const onDelete = async (id: string) => {
    try {
      await deleteMenuItem(Number(id));
      await load();
    } catch {}
  };

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>Quản lý món</Typography>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button variant="contained" onClick={() => navigate('/merchant/menu/new')}>Thêm món</Button>
        <TextField
          placeholder="Tìm kiếm món"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' ? onSearch() : undefined}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
        />
        <Button variant="outlined" onClick={onSearch}>Tìm</Button>
      </Stack>
      <Table>
      <TableHead>
        <TableRow>
          <TableCell>Ảnh</TableCell>
          <TableCell>Tên món</TableCell>
          <TableCell>Giá (VND)</TableCell>
          <TableCell>Danh mục</TableCell>
          <TableCell align="right">Hành động</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((it) => (
          <TableRow key={it.id}>
            <TableCell>
              <Box component="img" src={it.image || '/placeholder-item.svg'} alt={it.name}
                   sx={{ width: 96, height: 96, borderRadius: 1, objectFit: 'cover', bgcolor: '#f5f5f5' }} />
            </TableCell>
            <TableCell>{it.name}</TableCell>
            <TableCell>{it.price.toLocaleString('vi-VN')}</TableCell>
            <TableCell>{it.categoryName || '-'}</TableCell>
            <TableCell align="right">
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button size="small" onClick={() => navigate(`/merchant/menu/new?id=${it.id}`)}>Sửa</Button>
                <Button size="small" color="error" onClick={() => onDelete(it.id)}>Xóa</Button>
              </Stack>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      </Table>
    </Box>
  );
};

export default MerchantMenu;