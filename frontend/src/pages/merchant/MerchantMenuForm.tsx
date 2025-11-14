import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, TextField, Grid, Button, MenuItem, Stack, IconButton } from '@mui/material';
import { ImageOutlined, CloudUpload, DeleteOutline } from '@mui/icons-material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMerchantSession } from '../../store/merchantSession';
import { fetchCategories, createMenuItem, updateMenuItem, getMenuItemById, CategoryDTO } from '../../services/menu';
import { uploadImage } from '../../services/files';

/**
 * M06 - Menu Form (Mock)
 * - TODO: Gọi API thêm/sửa món (sau). Nếu có id -> chế độ sửa.
 * - Hiện tại chỉ mock form nhập và log dữ liệu.
 */
interface FormCategory { id: number; name: string }

const MerchantMenuForm: React.FC = () => {
  const { currentStore } = useMerchantSession();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const itemId = params.get('id');
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [imageUrl, setImageUrl] = useState('');
  const [categories, setCategories] = useState<FormCategory[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onClearImage = () => setImageUrl('');

  const readImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const dims = { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
        URL.revokeObjectURL(url);
        resolve(dims);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const storeId = currentStore ? Number(currentStore.id) : undefined;
        const data: CategoryDTO[] = await fetchCategories(storeId);
        setCategories(data.map(c => ({ id: c.id, name: c.name })));
        if (data.length && categoryId === '') setCategoryId(data[0].id);
        if (itemId) {
          const item = await getMenuItemById(Number(itemId));
          setName(item.name || '');
          setPrice(Number(item.price || 0));
          setCategoryId(item.category?.id || (data[0]?.id ?? ''));
          setImageUrl(item.imageUrl || '');
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStore?.id, itemId]);

  const onUploadImage = async (file?: File | null) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert('Định dạng ảnh không hợp lệ. Chấp nhận: JPG, PNG, GIF, WebP');
      return;
    }
    if (file.size > MAX_SIZE) {
      alert('Ảnh vượt quá 10MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }
    try {
      setUploading(true);
      const url = await uploadImage(file, 'menu-items');
      setImageUrl(url);
    } catch {
      // noop
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async () => {
    if (!name.trim() || price <= 0 || !categoryId) return;
    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        price: Number(price),
        imageUrl: imageUrl || undefined,
        available: true,
        category: { id: Number(categoryId) },
        store: currentStore ? { id: Number(currentStore.id) } : undefined,
      };
      if (itemId) {
        await updateMenuItem(Number(itemId), payload);
      } else {
        await createMenuItem(payload);
      }
      alert('Đã lưu món thành công');
      navigate('/merchant/menu');
    } catch (e) {
      alert('Lưu món thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>Thêm/Sửa món</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField label="Tên món" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Giá" type="number" fullWidth value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField select label="Danh mục" fullWidth value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>Ảnh món</Typography>
          <Box
            sx={{
              position: 'relative',
              borderRadius: 3,
              overflow: 'hidden',
              width: '100%',
              maxWidth: 360,
              height: 220,
              bgcolor: imageUrl ? '#fff' : '#fafbfc',
              border: imageUrl ? '1px solid #e0e3e7' : '2px dashed #d0d7de',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: imageUrl ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              onUploadImage(file || null);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            {imageUrl ? (
              <Box component="img" src={imageUrl} alt="preview"
                   sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Stack alignItems="center" spacing={1}>
                <ImageOutlined sx={{ fontSize: 40, color: '#9aa1a9' }} />
                <Typography variant="body2" color="text.secondary">Chưa có ảnh</Typography>
              </Stack>
            )}
            {imageUrl ? (
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onClearImage(); }}
                          sx={{ position: 'absolute', top: 8, right: 8, bgcolor: '#eceff1', '&:hover': { bgcolor: '#e2e6ea' } }}>
                <DeleteOutline sx={{ color: '#5f6368' }} />
              </IconButton>
            ) : null}
          </Box>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-start" sx={{ mt: 2, flexWrap: 'wrap' }}>
            <Button variant="contained" color="warning" component="label" startIcon={<CloudUpload />} disabled={uploading}>
              Thay đổi ảnh
              <input ref={fileInputRef} hidden accept="image/jpeg,image/png,image/gif,image/webp" type="file" onChange={(e) => onUploadImage(e.target.files?.[0] || null)} />
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteOutline />} onClick={onClearImage} disabled={uploading || !imageUrl}>
              Xóa ảnh
            </Button>
            <Typography variant="caption" color="text.secondary">
              Chấp nhận: JPG, PNG, GIF, WebP. Tối đa: 10MB. Khuyến nghị (không bắt buộc) ≥ 800×600
            </Typography>
          </Stack>
        </Grid>
        <Grid item xs={12}>
          <Button variant="contained" onClick={onSubmit} disabled={saving || !currentStore?.id}>Lưu</Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MerchantMenuForm;