import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Button, Stack, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert } from '@mui/material';
import { useMerchantSession } from '../../store/merchantSession';
import { fetchStaff, updateStaff, StaffDTO, lockUser, unlockUser } from '../../services/staff';

/**
 * M09 - Staff Management (Mock)
 * - TODO: Gọi API danh sách nhân viên, thêm/sửa/xóa, phân quyền (sau)
 * - Hiện hiển thị danh sách giả.
 */
type StaffVM = StaffDTO;

const MerchantStaff: React.FC = () => {
  const { currentStore } = useMerchantSession();
  const storeId = useMemo(() => currentStore ? Number(currentStore.id) : undefined, [currentStore]);
  const [rows, setRows] = useState<StaffVM[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffVM | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'MANAGER' | 'STAFF'>('STAFF');
  const [title, setTitle] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!storeId) return;
      setLoading(true);
      try {
        const list = await fetchStaff(storeId);
        setRows(list);
      } catch (e) {
        setMessage('Không tải được danh sách nhân viên');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [storeId]);

  // Chỉ chỉnh sửa profile; không thêm mới user theo yêu cầu

  const onOpenEdit = (r: StaffVM) => {
    setEditing(r);
    setFullName(r.fullName || '');
    setEmail(r.email || '');
    setPhone(r.phone || '');
    setRole(r.role);
    setTitle(r.title || '');
    setOpen(true);
  };

  const onSave = async () => {
    if (!storeId) return;
    setLoading(true);
    setMessage(null);
    try {
      if (!editing) return; // Không hỗ trợ tạo mới
      await updateStaff(editing.id, { fullName: fullName.trim(), phone: phone.trim(), role, title });
      const list = await fetchStaff(storeId);
      setRows(list);
      setOpen(false);
      setMessage('Đã lưu thông tin nhân viên');
    } catch (e) {
      setMessage('Lưu thất bại, vui lòng kiểm tra lại thông tin');
    } finally {
      setLoading(false);
    }
  };

  // Bỏ chức năng chặn/mở chặn nhân viên theo yêu cầu; chỉ khóa/mở khóa đăng nhập

  const onToggleLock = async (r: StaffVM) => {
    if (!storeId) return;
    setLoading(true);
    setMessage(null);
    try {
      if (r.enabled) {
        await lockUser(r.userId);
      } else {
        await unlockUser(r.userId);
      }
      const list = await fetchStaff(storeId);
      setRows(list);
    } catch {
      setMessage('Thao tác thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>Quản lý nhân viên</Typography>
      {message && (
        <Alert sx={{ mb: 2 }} severity={message.includes('thất bại') ? 'error' : 'success'} onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button variant="outlined" disabled={loading} onClick={async () => { if (!storeId) return; setLoading(true); try { const list = await fetchStaff(storeId); setRows(list); } finally { setLoading(false); } }}>Tải lại</Button>
      </Stack>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Họ tên</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>SĐT</TableCell>
            <TableCell>Vai trò</TableCell>
            <TableCell>Trạng thái</TableCell>
            <TableCell>Tài khoản</TableCell>
            <TableCell align="right">Thao tác</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} hover>
              <TableCell>{r.fullName}</TableCell>
              <TableCell>{r.email}</TableCell>
              <TableCell>{r.phone}</TableCell>
              <TableCell>
                <Chip label={r.role === 'MANAGER' ? 'Quản lý' : 'Nhân viên'} color={r.role === 'MANAGER' ? 'primary' : 'default'} size="small" />
              </TableCell>
              <TableCell>
                <Chip label={r.status === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động'} color={r.status === 'ACTIVE' ? 'success' : 'default'} size="small" />
              </TableCell>
              <TableCell>
                <Chip label={r.enabled ? 'Mở đăng nhập' : 'Đã khóa đăng nhập'} color={r.enabled ? 'success' : 'error'} size="small" />
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" onClick={() => onOpenEdit(r)}>Sửa</Button>
                  <Button size="small" color={r.enabled ? 'warning' : 'success'} onClick={() => onToggleLock(r)}>
                    {r.enabled ? 'Khoá đăng nhập' : 'Mở khoá đăng nhập'}
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Chỉnh sửa nhân viên</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Họ tên" value={fullName} onChange={(e) => setFullName(e.target.value)} fullWidth />
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth disabled={!!editing} />
            <TextField label="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
            <TextField select label="Vai trò" value={role} onChange={(e) => setRole(e.target.value as any)} fullWidth>
              <MenuItem value="MANAGER">Quản lý</MenuItem>
              <MenuItem value="STAFF">Nhân viên</MenuItem>
            </TextField>
            <TextField label="Chức danh (title)" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Huỷ</Button>
          <Button variant="contained" onClick={onSave} disabled={loading}>Lưu</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MerchantStaff;