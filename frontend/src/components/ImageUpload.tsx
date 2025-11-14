import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardMedia,
  IconButton,
  LinearProgress
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import api from '../services/api';

interface ImageUploadProps {
  onImageUploaded: (imagePath: string) => void;
  currentImage?: string;
  folder?: string;
  maxSize?: number; // in MB
  accept?: string;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUploaded,
  currentImage,
  folder = 'products',
  maxSize = 10,
  accept = 'image/*',
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync preview when parent passes a new currentImage (e.g., after reload)
  useEffect(() => {
    setPreview(currentImage || null);
  }, [currentImage]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WebP)');
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File quá lớn. Kích thước tối đa: ${maxSize}MB`);
      return;
    }

    setError(null);
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const response = await api.post(`/files/upload/${folder}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });

      if (response.data.path) {
        // Set preview to final URL and notify parent
        setPreview(response.data.path);
        onImageUploaded(response.data.path);
        setError(null);
      } else {
        throw new Error('Không nhận được đường dẫn ảnh từ server');
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(
        err.response?.data?.error || 
        err.message || 
        'Upload thất bại. Vui lòng thử lại.'
      );
      setPreview(currentImage || null);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    onImageUploaded('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/')) {
      const base = (api.defaults.baseURL || '').replace(/\/+$/, '');
      const origin = base.replace(/\/api$/, '');
      return `${origin}${imagePath}`;
    }
    return imagePath;
  };

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || uploading}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {uploading && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Đang upload... {uploadProgress}%
          </Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      {preview ? (
        <Card sx={{ maxWidth: 300, mb: 2 }}>
          <Box sx={{ position: 'relative' }}>
            <CardMedia
              component="img"
              height="200"
              image={preview.startsWith('data:') ? preview : getImageUrl(preview)}
              alt="Preview"
              sx={{ objectFit: 'cover' }}
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                const target = e.currentTarget;
                target.src = 'https://via.placeholder.com/300x200/f0f0f0/666666?text=Lỗi+tải+ảnh';
              }}
            />
            {!disabled && (
              <IconButton
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' }
                }}
                onClick={handleRemoveImage}
                disabled={uploading}
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        </Card>
      ) : (
        <Box
          sx={{
            border: '2px dashed #ddd',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            bgcolor: '#fafafa',
            cursor: disabled ? 'not-allowed' : 'pointer',
            '&:hover': disabled ? {} : {
              borderColor: '#bbb',
              bgcolor: '#f5f5f5'
            }
          }}
          onClick={disabled ? undefined : handleUploadClick}
        >
          <ImageIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Chưa có ảnh
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Button
          variant="contained"
          startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
          onClick={handleUploadClick}
          disabled={disabled || uploading}
        >
          {uploading ? 'Đang upload...' : preview ? 'Thay đổi ảnh' : 'Chọn ảnh'}
        </Button>

        {preview && !disabled && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleRemoveImage}
            disabled={uploading}
          >
            Xóa ảnh
          </Button>
        )}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Chấp nhận: JPG, PNG, GIF, WebP. Tối đa: {maxSize}MB
      </Typography>
    </Box>
  );
};

export default ImageUpload;