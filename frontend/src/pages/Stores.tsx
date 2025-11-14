import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  CircularProgress,
  CardMedia,
  TextField,
  InputAdornment,
  Rating,
  Avatar,
  Stack,
  Divider,
  Paper,
  IconButton,
  Tooltip,
  Badge,
  Container,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  Search,
  LocationOn,
  Phone,
  AccessTime,
  DirectionsCar,
  DeliveryDining,
  Favorite,
  FavoriteBorder,
  Store as StoreIcon,
  GridView,
  ViewList
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { fetchStores, StoreViewModel } from '../services/stores';

// Extended Store interface for UI
interface ExtendedStoreViewModel extends StoreViewModel {
  rating?: number;
  reviewCount?: number;
  openTime?: string;
  closeTime?: string;
  distance?: string;
  deliveryTime?: string;
  minOrder?: number;
  isOpen?: boolean;
  isFeatured?: boolean;
  discount?: string;
  tags?: string[];
  popularItems?: string[];
}

// Mock data for stores UI while backend is not ready
const BACKEND_ORIGIN = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');
const MOCK_STORES: ExtendedStoreViewModel[] = [
  {
    id: 's1',
    name: 'FastFood Center - Quận 1',
    address: '123 Lê Lợi, P. Bến Nghé, Q1, TP.HCM',
    phone: '0901 234 567',
    image: `${BACKEND_ORIGIN}/images/menu/burgers/veggie-burger.jpg`,
    status: 'ACTIVE',
    rating: 4.8,
    reviewCount: 1250,
    openTime: '07:00',
    closeTime: '23:00',
    distance: '1.2 km',
    deliveryTime: '15-25 phút',
    minOrder: 50000,
    isOpen: true,
    isFeatured: true,
    discount: '20% OFF',
    tags: ['Giao nhanh', 'Ưu đãi', 'Top đánh giá'],
    popularItems: ['Burger Deluxe', 'Combo Meal', 'Chicken Wings']
  },
  {
    id: 's2',
    name: 'FastFood Drive - Quận 3',
    address: '45 Cách Mạng Tháng 8, Q3, TP.HCM',
    phone: '0902 345 678',
    image: `${BACKEND_ORIGIN}/images/menu/sides/french-fries.jpg`,
    status: 'ACTIVE',
    rating: 4.6,
    reviewCount: 980,
    openTime: '08:00',
    closeTime: '22:00',
    distance: '2.5 km',
    deliveryTime: '20-30 phút',
    minOrder: 40000,
    isOpen: true,
    isFeatured: false,
    discount: '15% OFF',
    tags: ['Drive-thru', 'Bãi đỗ xe'],
    popularItems: ['French Fries', 'Pizza', 'Milkshake']
  },
  {
    id: 's3',
    name: 'FastFood Express - Thủ Đức',
    address: '88 Võ Văn Ngân, TP. Thủ Đức',
    phone: '0903 456 789',
    image: `${BACKEND_ORIGIN}/images/menu/chicken/chicken-wings.jpg`,
    status: 'SUSPENDED',
    rating: 4.3,
    reviewCount: 650,
    openTime: '09:00',
    closeTime: '21:00',
    distance: '5.8 km',
    deliveryTime: '30-40 phút',
    minOrder: 45000,
    isOpen: false,
    isFeatured: false,
    tags: ['Đang bảo trì'],
    popularItems: ['Chicken Wings', 'Fried Rice']
  },
  {
    id: 's4',
    name: 'FastFood Premium - Quận 7',
    address: '234 Nguyễn Văn Linh, Q7, TP.HCM',
    phone: '0904 567 890',
    image: `${BACKEND_ORIGIN}/images/menu/burgers/veggie-burger.jpg`,
    status: 'ACTIVE',
    rating: 4.9,
    reviewCount: 2100,
    openTime: '06:00',
    closeTime: '24:00',
    distance: '3.2 km',
    deliveryTime: '20-30 phút',
    minOrder: 60000,
    isOpen: true,
    isFeatured: true,
    discount: '25% OFF',
    tags: ['Premium', 'Giao 24/7', 'Top đánh giá'],
    popularItems: ['Wagyu Burger', 'Lobster Roll', 'Truffle Fries']
  },
  {
    id: 's5',
    name: 'FastFood Station - Bình Thạnh',
    address: '56 Xô Viết Nghệ Tĩnh, Bình Thạnh, TP.HCM',
    phone: '0905 678 901',
    image: `${BACKEND_ORIGIN}/images/menu/sides/french-fries.jpg`,
    status: 'ACTIVE',
    rating: 4.5,
    reviewCount: 820,
    openTime: '08:00',
    closeTime: '22:30',
    distance: '4.1 km',
    deliveryTime: '25-35 phút',
    minOrder: 35000,
    isOpen: true,
    isFeatured: false,
    discount: '10% OFF',
    tags: ['Giá rẻ', 'Sinh viên'],
    popularItems: ['Student Combo', 'Mini Burger', 'Iced Tea']
  },
  {
    id: 's6',
    name: 'FastFood Garden - Quận 2',
    address: '789 Đường Đồng Văn Cống, Q2, TP.HCM',
    phone: '0906 789 012',
    image: `${BACKEND_ORIGIN}/images/menu/chicken/chicken-wings.jpg`,
    status: 'ACTIVE',
    rating: 4.7,
    reviewCount: 1450,
    openTime: '07:30',
    closeTime: '23:30',
    distance: '6.5 km',
    deliveryTime: '30-40 phút',
    minOrder: 55000,
    isOpen: true,
    isFeatured: true,
    discount: '18% OFF',
    tags: ['View đẹp', 'Sân vườn', 'Không gian thoáng'],
    popularItems: ['BBQ Ribs', 'Garden Salad', 'Fresh Smoothie']
  },
  {
    id: 's7',
    name: 'FastFood Night - Quận 10',
    address: '321 Sư Vạn Hạnh, Q10, TP.HCM',
    phone: '0907 890 123',
    image: `${BACKEND_ORIGIN}/images/menu/burgers/veggie-burger.jpg`,
    status: 'ACTIVE',
    rating: 4.4,
    reviewCount: 720,
    openTime: '17:00',
    closeTime: '03:00',
    distance: '2.8 km',
    deliveryTime: '20-30 phút',
    minOrder: 40000,
    isOpen: true,
    isFeatured: false,
    discount: '12% OFF',
    tags: ['Mở đêm', 'Ăn khuya'],
    popularItems: ['Late Night Burger', 'Hot Wings', 'Coffee']
  },
  {
    id: 's8',
    name: 'FastFood Campus - Thủ Đức',
    address: '12 Tô Vĩnh Diện, TP. Thủ Đức',
    phone: '0908 901 234',
    image: `${BACKEND_ORIGIN}/images/menu/sides/french-fries.jpg`,
    status: 'ACTIVE',
    rating: 4.6,
    reviewCount: 1680,
    openTime: '06:30',
    closeTime: '22:00',
    distance: '7.2 km',
    deliveryTime: '35-45 phút',
    minOrder: 30000,
    isOpen: true,
    isFeatured: false,
    tags: ['Gần trường', 'Giá sinh viên', 'WiFi miễn phí'],
    popularItems: ['Campus Combo', 'Study Snack', 'Energy Drink']
  }
];

const Stores: React.FC = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<ExtendedStoreViewModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'featured'>('all');

  // Ensure hooks are called before any early returns
  const filtered = useMemo(() => {
    let result = stores;

    // Filter by search
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(s => 
        s.name.toLowerCase().includes(q) || 
        (s.address || '').toLowerCase().includes(q) ||
        (s.tags || []).some(tag => tag.toLowerCase().includes(q))
      );
    }

    // Filter by status
    if (filterStatus === 'open') {
      result = result.filter(s => s.isOpen && s.status === 'ACTIVE');
    } else if (filterStatus === 'featured') {
      result = result.filter(s => s.isFeatured && s.status === 'ACTIVE');
    }

    // Sort: featured first, then by rating
    return result.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });
  }, [stores, search, filterStatus]);

  useEffect(() => {
    // TODO(API): Thay bằng fetchStores(openOnly) khi backend sẵn sàng
    (async () => {
      try {
        setLoading(true);
        const data = await fetchStores(true);
        setStores(data.length ? data : MOCK_STORES);
        setError('');
      } catch {
        // Fallback to mock when API fails
        setStores(MOCK_STORES);
        setError('');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleFavorite = (storeId: string) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(storeId)) {
        newSet.delete(storeId);
      } else {
        newSet.add(storeId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Paper sx={{ p: 4, mt: 4, textAlign: 'center' }}>
          <Typography color="error" variant="h6">{error}</Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => window.location.reload()}>
            Thử lại
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f8f9fa', minHeight: '100vh', pb: 6 }}>
      {/* Hero section */}
      <Box sx={{
        mb: 4,
        p: { xs: 3, md: 6 },
        borderRadius: 3,
        color: '#fff',
        background: 'linear-gradient(135deg, #FF3D00 0%, #FF7043 50%, #FFC107 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
          borderRadius: '50%',
          transform: 'translate(30%, -30%)'
        }
      }}>
        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h2" sx={{ fontWeight: 900, mb: 1, fontSize: { xs: '2rem', md: '3rem' } }}>
             Nhanh · Ngon · Rẻ
          </Typography>
          <Typography variant="h6" sx={{ mt: 2, opacity: 0.95, maxWidth: 600 }}>
            Chọn cửa hàng gần bạn và đặt món yêu thích ngay. Giao hàng nhanh chóng trong 30 phút!
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              size="large"
              sx={{ 
                bgcolor: 'white', 
                color: '#FF3D00',
                fontWeight: 600,
                px: 4,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
              }}
              onClick={() => navigate('/cart')}
            >
              Đặt ngay
            </Button>
            <Button 
              variant="outlined" 
              size="large"
              sx={{ 
                color: '#fff', 
                borderColor: 'rgba(255,255,255,0.8)',
                fontWeight: 600,
                px: 4,
                '&:hover': { 
                  borderColor: '#fff',
                  bgcolor: 'rgba(255,255,255,0.1)'
                }
              }}
              onClick={() => navigate('/orders/history')}
            >
              Xem đơn gần đây
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl">
        {/* Statistics removed as requested */}

        {/* Search and Filter */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.06)', border: '1px solid #eee' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm cửa hàng theo tên, địa chỉ hoặc tags..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <ToggleButtonGroup
                value={filterStatus}
                exclusive
                onChange={(_, value) => value && setFilterStatus(value)}
                fullWidth
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600
                  },
                  '& .MuiToggleButton-root.Mui-selected': {
                    bgcolor: 'rgba(255,61,0,0.1)',
                    color: '#FF3D00',
                    borderColor: '#FF3D00'
                  },
                  '& .MuiToggleButton-root:hover': {
                    bgcolor: 'rgba(255,61,0,0.06)'
                  }
                }}
              >
                <ToggleButton value="all">
                  Tất cả ({stores.length})
                </ToggleButton>
                <ToggleButton value="open">
                  Đang mở ({stores.filter(s => s.isOpen).length})
                </ToggleButton>
                <ToggleButton value="featured">
                  Nổi bật ({stores.filter(s => s.isFeatured).length})
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid item xs={12} md={2}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, value) => value && setViewMode(value)}
                fullWidth
                size="small"
                sx={{
                  '& .MuiToggleButton-root': { borderRadius: 2 },
                  '& .MuiToggleButton-root.Mui-selected': {
                    bgcolor: 'rgba(255,61,0,0.1)',
                    color: '#FF3D00',
                    borderColor: '#FF3D00'
                  }
                }}
              >
                <ToggleButton value="grid">
                  <GridView />
                </ToggleButton>
                <ToggleButton value="list">
                  <ViewList />
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Paper>

        {/* Store Results */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {filtered.length} cửa hàng được tìm thấy
          </Typography>
        </Box>

        {/* Store Cards */}
        {viewMode === 'grid' ? (
          <Grid container spacing={3}>
            {filtered.map((store) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={store.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    transition: 'all 0.3s',
                    opacity: store.isOpen ? 1 : 0.7,
                    borderRadius: 3,
                    boxShadow: 1,
                    border: '1px solid #eee',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 6
                    }
                  }}
                >
                  {/* Image with badges */}
                  <Box sx={{ position: 'relative' }}>
                    {store.image && (
                      <CardMedia
                        component="img"
                        height="180"
                        image={store.image}
                        alt={store.name}
                        sx={{ 
                          filter: !store.isOpen ? 'grayscale(100%)' : 'none'
                        }}
                      />
                    )}
                    {/* Gradient overlay for image */}
                    {store.image && (
                      <Box sx={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: '40%',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)'
                      }}/>
                    )}
                    
                    {/* Featured badge */}
                    {store.isFeatured && (
                      <Chip 
                        label="⭐ NỔI BẬT"
                        size="small"
                        sx={{ 
                          position: 'absolute', 
                          top: 10, 
                          left: 10,
                          bgcolor: '#FF3D00',
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                    )}

                    {/* Discount badge */}
                    {store.discount && store.isOpen && (
                      <Chip 
                        label={store.discount}
                        size="small"
                        sx={{ 
                          position: 'absolute', 
                          top: 10, 
                          right: 10,
                          bgcolor: '#FFC107',
                          color: '#000',
                          fontWeight: 700
                        }}
                      />
                    )}

                    {/* Favorite button */}
                    <IconButton
                      sx={{ 
                        position: 'absolute', 
                        bottom: 10, 
                        right: 10,
                        bgcolor: 'white',
                        '&:hover': { bgcolor: 'white' }
                      }}
                      onClick={() => toggleFavorite(store.id)}
                    >
                      {favorites.has(store.id) ? (
                        <Favorite color="error" />
                      ) : (
                        <FavoriteBorder />
                      )}
                    </IconButton>

                    {/* Status overlay */}
                    {!store.isOpen && (
                      <Box 
                        sx={{ 
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          bgcolor: 'rgba(0,0,0,0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Chip 
                          label="ĐÓNG CỬA"
                          sx={{ 
                            bgcolor: 'error.main',
                            color: 'white',
                            fontWeight: 700
                          }}
                        />
                      </Box>
                    )}
                  </Box>

                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Store name and rating */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {store.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Rating 
                          value={store.rating || 0} 
                          precision={0.1} 
                          size="small" 
                          readOnly 
                          sx={{
                            '& .MuiRating-iconFilled': { color: '#FFC107' },
                            '& .MuiRating-iconEmpty': { color: 'rgba(0,0,0,0.15)' }
                          }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {store.rating} ({store.reviewCount})
                        </Typography>
                      </Box>
                    </Box>

                    {/* Info */}
                    <Stack spacing={1} sx={{ mb: 2, flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                          {store.address}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTime fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {store.openTime} - {store.closeTime}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <DirectionsCar fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {store.distance}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <DeliveryDining fontSize="small" color="primary" />
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                          Giao trong {store.deliveryTime}
                        </Typography>
                      </Box>
                    </Stack>

                    {/* Tags */}
                    {store.tags && store.tags.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                        {store.tags.slice(0, 3).map((tag, idx) => (
                          <Chip 
                            key={idx}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 22, borderRadius: 1.5 }}
                          />
                        ))}
                      </Box>
                    )}

                    <Divider sx={{ mb: 2 }} />

                    {/* Action buttons */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button 
                        variant="contained" 
                        fullWidth
                        disabled={!store.isOpen}
                        onClick={() => navigate(`/stores/${store.id}/menu`)}
                        sx={{ fontWeight: 600, bgcolor: '#FF3D00', '&:hover': { bgcolor: '#e63600' } }}
                      >
                        Xem thực đơn
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          // List View
          <Stack spacing={2}>
            {filtered.map((store) => (
              <Card 
                key={store.id}
                sx={{ 
                  display: 'flex',
                  opacity: store.isOpen ? 1 : 0.7,
                  transition: 'all 0.3s',
                  borderRadius: 3,
                  boxShadow: 1,
                  border: '1px solid #eee',
                  '&:hover': {
                    boxShadow: 4
                  }
                }}
              >
                {/* Image */}
                <Box sx={{ position: 'relative', width: 240, flexShrink: 0 }}>
                  {store.image && (
                    <CardMedia
                      component="img"
                      sx={{ 
                        width: '100%', 
                        height: '100%',
                        objectFit: 'cover',
                        filter: !store.isOpen ? 'grayscale(100%)' : 'none'
                      }}
                      image={store.image}
                      alt={store.name}
                    />
                  )}
                  {store.image && (
                    <Box sx={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: '40%',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)'
                    }}/>
                  )}
                  
                  {store.isFeatured && (
                    <Chip 
                      label="⭐ NỔI BẬT"
                      size="small"
                      sx={{ 
                        position: 'absolute', 
                        top: 10, 
                        left: 10,
                        bgcolor: '#FF3D00',
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                  )}

                  {!store.isOpen && (
                    <Box 
                      sx={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        bgcolor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Chip 
                        label="ĐÓNG CỬA"
                        sx={{ bgcolor: 'error.main', color: 'white', fontWeight: 700 }}
                      />
                    </Box>
                  )}
                </Box>

                {/* Content */}
                <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {store.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Rating value={store.rating || 0} precision={0.1} size="small" readOnly />
                        <Typography variant="body2" color="text.secondary">
                          {store.rating} ({store.reviewCount} đánh giá)
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {store.discount && store.isOpen && (
                        <Chip 
                          label={store.discount}
                          sx={{ 
                            bgcolor: '#FFC107',
                            color: '#000',
                            fontWeight: 700
                          }}
                        />
                      )}
                      <IconButton onClick={() => toggleFavorite(store.id)}>
                        {favorites.has(store.id) ? (
                          <Favorite color="error" />
                        ) : (
                          <FavoriteBorder />
                        )}
                      </IconButton>
                    </Box>
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {store.address}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Phone fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {store.phone}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTime fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {store.openTime} - {store.closeTime}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DeliveryDining fontSize="small" color="primary" />
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                          {store.deliveryTime} • {store.distance}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {store.tags && store.tags.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      {store.tags.map((tag, idx) => (
                        <Chip 
                          key={idx}
                          label={tag}
                          size="small"
                          variant="outlined"
                          sx={{ borderRadius: 1.5 }}
                        />
                      ))}
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                    <Typography variant="body2" color="text.secondary">
                      Đơn tối thiểu: {store.minOrder?.toLocaleString()}đ
                    </Typography>
                    <Button 
                      variant="contained" 
                      disabled={!store.isOpen}
                      onClick={() => navigate(`/stores/${store.id}/menu`)}
                      sx={{ fontWeight: 600, px: 4, bgcolor: '#FF3D00', '&:hover': { bgcolor: '#e63600' } }}
                    >
                      Xem thực đơn
                    </Button>
                  </Box>
                </Box>
              </Card>
            ))}
          </Stack>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <StoreIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Không tìm thấy cửa hàng nào
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
            </Typography>
            <Button variant="outlined" onClick={() => { setSearch(''); setFilterStatus('all'); }}>
              Xóa bộ lọc
            </Button>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default Stores;