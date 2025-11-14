import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Table, TableBody, TableCell, TableHead, TableRow, Alert } from '@mui/material';
import { useMerchantSession } from '../../store/merchantSession';
import { fetchCategories, createCategory, updateCategory, deleteCategory, CategoryDTO } from '../../services/menu';

/**
 * M07 - Category Management (Mock)
 * - TODO: Gọi API danh mục món: thêm/sửa/xóa (sau)
 * - Hiện hiển thị danh sách giả.
 */
interface CategoryVM { id: number; name: string; sortOrder?: number }

const MerchantCategories: React.FC = () => {
  const { currentStore } = useMerchantSession();
  const [cats, setCats] = useState<CategoryVM[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryVM | null>(null);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState<number | ''>('');

  const load = async () => {
    try {
      setLoading(true);
      const storeId = currentStore ? Number(currentStore.id) : undefined;
      const data: CategoryDTO[] = await fetchCategories(storeId);
      const vm: CategoryVM[] = data.map(c => ({ id: c.id, name: c.name, sortOrder: c.sortOrder }));
      const sorted = vm.sort((a, b) => {
        const soA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const soB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
        if (soA !== soB) return soA - soB;
        return a.name.localeCompare(b.name);
      });
      setCats(sorted);
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleOpenCreate = () => {
    setEditing(null);
    setName('');
    setSortOrder('');
    setOpen(true);
  };

  const handleOpenEdit = (c: CategoryVM) => {
    setEditing(c);
    setName(c.name);
    setSortOrder(c.sortOrder ?? '');
    setOpen(true);
  };

  const handleDelete = async (c: CategoryVM) => {
    try {
      await deleteCategory(c.id);
      await load();
    } catch {}
  };

  const handleSave = async () => {
    try {
      if (!name.trim()) return;
      if (!currentStore?.id) return; // Yêu cầu phải có storeId
      if (editing) {
        await updateCategory(editing.id, { name: name.trim(), sortOrder: sortOrder === '' ? undefined : Number(sortOrder), storeId: Number(currentStore.id) });
      } else {
        await createCategory({ name: name.trim(), sortOrder: sortOrder === '' ? undefined : Number(sortOrder), storeId: Number(currentStore.id) });
      }
      setOpen(false);
      await load();
    } catch {}
  };

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>Danh mục món</Typography>
      {!currentStore?.id && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Vui lòng chọn cửa hàng trước khi quản lý danh mục.
        </Alert>
      )}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button variant="contained" onClick={handleOpenCreate} disabled={!currentStore?.id}>Thêm danh mục</Button>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Tên danh mục</TableCell>
            <TableCell>Thứ tự</TableCell>
            <TableCell>ID</TableCell>
            <TableCell align="right">Hành động</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {cats.map((c) => (
            <TableRow key={c.id} hover>
              <TableCell>{c.name}</TableCell>
              <TableCell>{c.sortOrder ?? ''}</TableCell>
              <TableCell>{c.id}</TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" variant="outlined" onClick={() => handleOpenEdit(c)} disabled={!currentStore?.id}>Sửa</Button>
                  <Button size="small" color="error" onClick={() => handleDelete(c)} disabled={!currentStore?.id}>Xóa</Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Sửa danh mục' : 'Thêm danh mục'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Tên danh mục" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            <TextField label="Thứ tự (tùy chọn)" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value === '' ? '' : Number(e.target.value))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleSave}>{editing ? 'Lưu' : 'Tạo'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MerchantCategories;