import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  CircularProgress,
  CardActions,
  Container,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Badge,
  IconButton,
  Rating,
  Stack,
  Divider,
  Breadcrumbs,
  Link,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Search,
  ShoppingCart,
  Star,
  LocalOffer,
  AccessTime,
  LocationOn,
  Phone,
  Favorite,
  FavoriteBorder,
  AddShoppingCart,
  NavigateNext,
  Home,
  Store as StoreIcon,
  Restaurant
} from '@mui/icons-material';
import { fetchStoreMenu, fetchStoreById, MenuItemViewModel, StoreViewModel } from '../services/stores';
import { addToCart } from '../store/slices/cartSlice';

// Extended MenuItem interface for rich UI
interface ExtendedMenuItemViewModel extends MenuItemViewModel {
  rating?: number;
  reviewCount?: number;
  discount?: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  preparationTime?: string;
  calories?: number;
  tags?: string[];
}

interface ExtendedStoreViewModel extends StoreViewModel {
  rating?: number;
  reviewCount?: number;
  openTime?: string;
  closeTime?: string;
  isOpen?: boolean;
  deliveryTime?: string;
  minOrder?: number;
}

// Mock data for store menu while backend is not ready
const BACKEND_ORIGIN = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

const MOCK_STORE: ExtendedStoreViewModel = {
  id: 's1',
  name: 'FastFood Center - Quận 1',
  address: '123 Lê Lợi, P. Bến Nghé, Q1, TP.HCM',
  phone: '0901 234 567',
  image: `${BACKEND_ORIGIN}/images/menu/burgers/cheeseburger.jpg`,
  status: 'ACTIVE',
  rating: 4.8,
  reviewCount: 1250,
  openTime: '07:00',
  closeTime: '23:00',
  isOpen: true,
  deliveryTime: '15-25 phút',
  minOrder: 50000
};

const MOCK_MENU: ExtendedMenuItemViewModel[] = [
  // Burgers
  { 
    id: 'm1', 
    name: 'Classic Cheeseburger', 
    description: 'Bánh burger phô mai cổ điển với thịt bò Úc 100%, phô mai cheddar tan chảy, rau xà lách tươi', 
    price: 65000, 
    image: `${BACKEND_ORIGIN}/images/menu/burgers/cheeseburger.jpg`, 
    category: 'Burgers', 
    available: true,
    rating: 4.7,
    reviewCount: 320,
    discount: 10,
    isBestSeller: true,
    preparationTime: '8-10 phút',
    calories: 550,
    tags: ['Bò Úc', 'Phô mai']
  },
  { 
    id: 'm2', 
    name: 'Deluxe Burger', 
    description: 'Burger cao cấp với thịt bò Wagyu, phô mai premium, bacon giòn, trứng ốp la', 
    price: 129000, 
    image: `${BACKEND_ORIGIN}/images/menu/burgers/veggie-burger.jpg`, 
    category: 'Burgers', 
    available: true,
    rating: 4.9,
    reviewCount: 580,
    isNew: true,
    preparationTime: '12-15 phút',
    calories: 780,
    tags: ['Premium', 'Wagyu']
  },
  { 
    id: 'm3', 
    name: 'Veggie Burger', 
    description: 'Burger chay với patty từ đậu nành, rau củ tươi ngon, sốt đặc biệt', 
    price: 59000, 
    image: `${BACKEND_ORIGIN}/images/menu/burgers/veggie-burger.jpg`, 
    category: 'Burgers', 
    available: true,
    rating: 4.5,
    reviewCount: 180,
    preparationTime: '8-10 phút',
    calories: 420,
    tags: ['Chay', 'Healthy']
  },
  { 
    id: 'm4', 
    name: 'Chicken Burger', 
    description: 'Burger gà giòn rụm với sốt mayo cay, rau xà lách, cà chua', 
    price: 55000, 
    image: `${BACKEND_ORIGIN}/images/menu/burgers/cheeseburger.jpg`, 
    category: 'Burgers', 
    available: true,
    rating: 4.6,
    reviewCount: 240,
    isBestSeller: true,
    preparationTime: '8-10 phút',
    calories: 480,
    tags: ['Gà', 'Cay']
  },

  // Sides
  { 
    id: 'm5', 
    name: 'French Fries', 
    description: 'Khoai tây chiên giòn rụm với muối biển Himalaya', 
    price: 29000, 
    image: `${BACKEND_ORIGIN}/images/menu/sides/french-fries.jpg`, 
    category: 'Sides', 
    available: true,
    rating: 4.8,
    reviewCount: 890,
    isBestSeller: true,
    preparationTime: '5-7 phút',
    calories: 320,
    tags: ['Giòn', 'Hot']
  },
  { 
    id: 'm6', 
    name: 'Onion Rings', 
    description: 'Hành tây chiên giòn với lớp bột đặc biệt', 
    price: 35000, 
    image: `${BACKEND_ORIGIN}/images/menu/sides/french-fries.jpg`, 
    category: 'Sides', 
    available: true,
    rating: 4.6,
    reviewCount: 340,
    preparationTime: '6-8 phút',
    calories: 280,
    tags: ['Giòn']
  },
  { 
    id: 'm7', 
    name: 'Mozzarella Sticks', 
    description: 'Que phô mai mozzarella chiên giòn với sốt marinara', 
    price: 45000, 
    image: `${BACKEND_ORIGIN}/images/menu/sides/french-fries.jpg`, 
    category: 'Sides', 
    available: true,
    rating: 4.7,
    reviewCount: 420,
    preparationTime: '7-9 phút',
    calories: 380,
    tags: ['Phô mai']
  },

  // Chicken
  { 
    id: 'm8', 
    name: 'Chicken Wings (6pcs)', 
    description: 'Cánh gà chiên giòn với 3 loại sốt: BBQ, Buffalo, Honey Mustard', 
    price: 79000, 
    image: `${BACKEND_ORIGIN}/images/menu/chicken/chicken-wings.jpg`, 
    category: 'Chicken', 
    available: true,
    rating: 4.9,
    reviewCount: 650,
    isBestSeller: true,
    preparationTime: '12-15 phút',
    calories: 580,
    tags: ['Gà', 'Cay']
  },
  { 
    id: 'm9', 
    name: 'Fried Chicken (4pcs)', 
    description: 'Gà rán giòn tan theo công thức bí mật', 
    price: 99000, 
    image: `${BACKEND_ORIGIN}/images/menu/chicken/chicken-wings.jpg`, 
    category: 'Chicken', 
    available: true,
    rating: 4.8,
    reviewCount: 780,
    isBestSeller: true,
    discount: 15,
    preparationTime: '15-18 phút',
    calories: 720,
    tags: ['Gà', 'Giòn']
  },
  { 
    id: 'm10', 
    name: 'Chicken Nuggets (10pcs)', 
    description: 'Gà viên chiên giòn với sốt tùy chọn', 
    price: 49000, 
    image: `${BACKEND_ORIGIN}/images/menu/chicken/chicken-wings.jpg`, 
    category: 'Chicken', 
    available: true,
    rating: 4.6,
    reviewCount: 450,
    preparationTime: '8-10 phút',
    calories: 420,
    tags: ['Gà', 'Kids']
  },

  // Pizza
  { 
    id: 'm11', 
    name: 'Pepperoni Pizza', 
    description: 'Pizza pepperoni truyền thống với phô mai mozzarella', 
    price: 149000, 
    image: `${BACKEND_ORIGIN}/images/menu/pizza/pepperoni.jpg`, 
    category: 'Pizza', 
    available: true,
    rating: 4.7,
    reviewCount: 520,
    isBestSeller: true,
    preparationTime: '15-20 phút',
    calories: 680,
    tags: ['Pizza', 'Pepperoni']
  },
  { 
    id: 'm12', 
    name: 'Hawaiian Pizza', 
    description: 'Pizza Hawaii với thịt nguội và dứa tươi', 
    price: 139000, 
    image: `${BACKEND_ORIGIN}/images/menu/pizza/pepperoni.jpg`, 
    category: 'Pizza', 
    available: true,
    rating: 4.5,
    reviewCount: 380,
    preparationTime: '15-20 phút',
    calories: 620,
    tags: ['Pizza', 'Dứa']
  },
  { 
    id: 'm13', 
    name: 'Veggie Pizza', 
    description: 'Pizza rau củ với nấm, ớt chuông, ô liu, cà chua', 
    price: 129000, 
    image: `${BACKEND_ORIGIN}/images/menu/pizza/pepperoni.jpg`, 
    category: 'Pizza', 
    available: false,
    rating: 4.4,
    reviewCount: 210,
    preparationTime: '15-20 phút',
    calories: 520,
    tags: ['Pizza', 'Chay']
  },

  // Drinks
  { 
    id: 'm14', 
    name: 'Coca Cola', 
    description: 'Nước ngọt có ga Coca Cola', 
    price: 19000, 
    image: `${BACKEND_ORIGIN}/images/menu/drinks/coca-cola.jpg`, 
    category: 'Drinks', 
    available: true,
    rating: 4.8,
    reviewCount: 1200,
    preparationTime: '1-2 phút',
    calories: 140,
    tags: ['Có ga']
  },
  { 
    id: 'm15', 
    name: 'Pepsi', 
    description: 'Nước ngọt có ga Pepsi', 
    price: 19000, 
    image: `${BACKEND_ORIGIN}/images/menu/drinks/coca-cola.jpg`, 
    category: 'Drinks', 
    available: true,
    rating: 4.7,
    reviewCount: 980,
    preparationTime: '1-2 phút',
    calories: 140,
    tags: ['Có ga']
  },
  { 
    id: 'm16', 
    name: 'Fresh Orange Juice', 
    description: 'Nước cam tươi vắt 100%', 
    price: 35000, 
    image: `${BACKEND_ORIGIN}/images/menu/drinks/coca-cola.jpg`, 
    category: 'Drinks', 
    available: true,
    rating: 4.9,
    reviewCount: 560,
    preparationTime: '3-5 phút',
    calories: 110,
    tags: ['Tươi', 'Healthy']
  },
  { 
    id: 'm17', 
    name: 'Iced Coffee', 
    description: 'Cà phê đá Việt Nam đậm đà', 
    price: 29000, 
    image: `${BACKEND_ORIGIN}/images/menu/drinks/coca-cola.jpg`, 
    category: 'Drinks', 
    available: true,
    rating: 4.8,
    reviewCount: 720,
    isBestSeller: true,
    preparationTime: '3-5 phút',
    calories: 80,
    tags: ['Cà phê']
  },

  // Desserts
  { 
    id: 'm18', 
    name: 'Apple Pie', 
    description: 'Bánh táo nướng giòn tan với kem vanilla', 
    price: 39000, 
    image: `${BACKEND_ORIGIN}/images/menu/desserts/apple-pie.jpg`, 
    category: 'Desserts', 
    available: true,
    rating: 4.7,
    reviewCount: 420,
    preparationTime: '5-7 phút',
    calories: 320,
    tags: ['Ngọt', 'Nóng']
  },
  { 
    id: 'm19', 
    name: 'Chocolate Ice Cream', 
    description: 'Kem sô cô la Bỉ cao cấp', 
    price: 35000, 
    image: `${BACKEND_ORIGIN}/images/menu/desserts/apple-pie.jpg`, 
    category: 'Desserts', 
    available: true,
    rating: 4.8,
    reviewCount: 540,
    preparationTime: '2-3 phút',
    calories: 280,
    tags: ['Kem', 'Lạnh']
  },
  { 
    id: 'm20', 
    name: 'Cheesecake', 
    description: 'Bánh phô mai New York với sốt dâu tây', 
    price: 49000, 
    image: `${BACKEND_ORIGIN}/images/menu/desserts/apple-pie.jpg`, 
    category: 'Desserts', 
    available: true,
    rating: 4.9,
    reviewCount: 380,
    isNew: true,
    preparationTime: '3-5 phút',
    calories: 420,
    tags: ['Phô mai', 'Premium']
  },

  // Salads
  { 
    id: 'm21', 
    name: 'Caesar Salad', 
    description: 'Salad Caesar truyền thống với gà nướng, phô mai parmesan', 
    price: 69000, 
    image: `${BACKEND_ORIGIN}/images/menu/salads/caesar.jpg`, 
    category: 'Salads', 
    available: true,
    rating: 4.6,
    reviewCount: 280,
    preparationTime: '8-10 phút',
    calories: 380,
    tags: ['Salad', 'Healthy']
  },
  { 
    id: 'm22', 
    name: 'Greek Salad', 
    description: 'Salad Hy Lạp với phô mai feta, ô liu, cà chua', 
    price: 65000, 
    image: `${BACKEND_ORIGIN}/images/menu/salads/caesar.jpg`, 
    category: 'Salads', 
    available: true,
    rating: 4.5,
    reviewCount: 190,
    preparationTime: '8-10 phút',
    calories: 320,
    tags: ['Salad', 'Healthy']
  },

  // Japanese
  { 
    id: 'm23', 
    name: 'Teriyaki Chicken Bowl', 
    description: 'Cơm gà teriyaki Nhật Bản với rau củ', 
    price: 79000, 
    image: `${BACKEND_ORIGIN}/images/menu/japanese/teriyaki.jpg`, 
    category: 'Japanese', 
    available: true,
    rating: 4.7,
    reviewCount: 340,
    preparationTime: '12-15 phút',
    calories: 580,
    tags: ['Nhật', 'Gà']
  },
  { 
    id: 'm24', 
    name: 'Ramen', 
    description: 'Mì ramen Nhật Bản với thịt lợn xá xíu, trứng lòng đào', 
    price: 89000, 
    image: `${BACKEND_ORIGIN}/images/menu/japanese/teriyaki.jpg`, 
    category: 'Japanese', 
    available: true,
    rating: 4.8,
    reviewCount: 620,
    isBestSeller: true,
    preparationTime: '15-18 phút',
    calories: 680,
    tags: ['Nhật', 'Mì']
  },
];

const StoreMenu: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [items, setItems] = useState<ExtendedMenuItemViewModel[]>([]);
  const [store, setStore] = useState<ExtendedStoreViewModel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = ['all', ...Array.from(new Set(items.map(item => item.category)))];
    return cats;
  }, [items]);

  // Filter items by search and category
  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.tags || []).some(tag => tag.toLowerCase().includes(q))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category === selectedCategory);
    }

    // Sort: available first, best sellers first, then by rating
    return result.sort((a, b) => {
      if (a.available && !b.available) return -1;
      if (!a.available && b.available) return 1;
      if (a.isBestSeller && !b.isBestSeller) return -1;
      if (!a.isBestSeller && b.isBestSeller) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });
  }, [items, search, selectedCategory]);

  // Count items by category
  const getCategoryCount = (category: string) => {
    if (category === 'all') return items.length;
    return items.filter(item => item.category === category).length;
  };

  useEffect(() => {
    // TODO(API): Thay thế mock bằng fetchStoreById / fetchStoreMenu khi backend sẵn sàng
    (async () => {
      if (!id) {
        setStore(MOCK_STORE);
        setItems(MOCK_MENU);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [storeInfo, menu] = await Promise.all([
          fetchStoreById(id),
          fetchStoreMenu(id, 0, 100),
        ]);
        setStore(storeInfo || MOCK_STORE);
        setItems(menu.length ? menu : MOCK_MENU);
        setError('');
      } catch (e: any) {
        console.warn('API call failed, using mock data:', e.message || e);
        setStore(MOCK_STORE);
        setItems(MOCK_MENU);
        setError('');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const toggleFavorite = (itemId: string) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleAddToCart = (item: ExtendedMenuItemViewModel) => {
    if (!item.available) return;
    
    dispatch(
      addToCart({
        id: String(item.id),
        name: item.name,
        price: Number(item.price),
        quantity: 1,
        image: item.image || '',
        storeId: store?.id ? String(store.id) : (id ? String(id) : undefined),
        storeName: store?.name || 'Unknown'
      })
    );
    
    setSnackbarMessage(`Đã thêm ${item.name} vào giỏ hàng!`);
    setSnackbarOpen(true);
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
      <Container maxWidth="xl">
        {/* Breadcrumbs */}
        <Box sx={{ py: 2 }}>
          <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
            <Link 
              color="inherit" 
              href="#" 
              onClick={(e) => { e.preventDefault(); navigate('/'); }}
              sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              <Home sx={{ mr: 0.5 }} fontSize="small" />
              Trang chủ
            </Link>
            <Link 
              color="inherit" 
              href="#" 
              onClick={(e) => { e.preventDefault(); navigate('/stores'); }}
              sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              <StoreIcon sx={{ mr: 0.5 }} fontSize="small" />
              Cửa hàng
            </Link>
            <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
              <Restaurant sx={{ mr: 0.5 }} fontSize="small" />
              {store?.name || 'Thực đơn'}
            </Typography>
          </Breadcrumbs>
        </Box>

        {/* Store Header */}
        {store && (
          <Paper 
            sx={{ 
              mb: 3, 
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}
          >
            <Grid container>
              {/* Store Image */}
              {store.image && (
                <Grid item xs={12} md={4}>
                  <CardMedia
                    component="img"
                    sx={{ 
                      width: '100%', 
                      height: { xs: 200, md: '100%' },
                      objectFit: 'cover'
                    }}
                    image={store.image}
                    alt={store.name}
                  />
                </Grid>
              )}

              {/* Store Info */}
              <Grid item xs={12} md={8}>
                <Box sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h3" sx={{ fontWeight: 900, mb: 1, fontSize: { xs: '1.8rem', md: '2.5rem' } }}>
                        {store.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Rating value={store.rating || 0} precision={0.1} size="small" readOnly sx={{ color: '#FFC107' }} />
                        <Typography variant="body1">
                          {store.rating} ({store.reviewCount} đánh giá)
                        </Typography>
                      </Box>
                    </Box>
                    <Chip 
                      label={store.isOpen ? 'ĐANG MỞ CỬA' : 'ĐÓNG CỬA'}
                      sx={{ 
                        bgcolor: store.isOpen ? '#4CAF50' : '#f44336',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        px: 2
                      }}
                    />
                  </Box>

                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn />
                      <Typography variant="body1">{store.address}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone />
                      <Typography variant="body1">{store.phone}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTime />
                        <Typography variant="body1">
                          {store.openTime} - {store.closeTime}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ShoppingCart />
                        <Typography variant="body1">
                          Đơn tối thiểu: {store.minOrder?.toLocaleString()}đ
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>

                  <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button 
                      variant="contained" 
                      size="large"
                      sx={{ 
                        bgcolor: 'white', 
                        color: '#667eea',
                        fontWeight: 600,
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                      }}
                      onClick={() => navigate('/cart')}
                      startIcon={<ShoppingCart />}
                    >
                      Xem giỏ hàng
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="large"
                      sx={{ 
                        color: 'white', 
                        borderColor: 'white',
                        '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                      }}
                      onClick={() => navigate('/stores')}
                    >
                      Cửa hàng khác
                    </Button>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Search and Filter */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm món ăn theo tên, mô tả hoặc tags..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {filteredItems.length} món
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<ShoppingCart />}
                  onClick={() => navigate('/cart')}
                >
                  Giỏ hàng
                </Button>
              </Box>
            </Grid>
          </Grid>

          {/* Category Tabs */}
          <Box sx={{ mt: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={selectedCategory}
              onChange={(_, value) => setSelectedCategory(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1rem'
                }
              }}
            >
              {categories.map((category) => (
                <Tab
                  key={category}
                  value={category}
                  label={
                    <Badge badgeContent={getCategoryCount(category)} color="primary">
                      {category === 'all' ? 'Tất cả' : category}
                    </Badge>
                  }
                />
              ))}
            </Tabs>
          </Box>
        </Paper>

        {/* Menu Items */}
        <Grid container spacing={3}>
          {filteredItems.map((item) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  opacity: item.available ? 1 : 0.6,
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: item.available ? 'translateY(-8px)' : 'none',
                    boxShadow: item.available ? 6 : 1
                  }
                }}
              >
                {/* Image with badges */}
                <Box sx={{ position: 'relative' }}>
                  {item.image && (
                    <CardMedia
                      component="img"
                      height="180"
                      image={item.image}
                      alt={item.name}
                      sx={{ 
                        filter: !item.available ? 'grayscale(100%)' : 'none'
                      }}
                    />
                  )}

                  {/* Best Seller badge */}
                  {item.isBestSeller && (
                    <Chip 
                      icon={<Star sx={{ color: 'white !important' }} />}
                      label="BÁN CHẠY"
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

                  {/* New badge */}
                  {item.isNew && (
                    <Chip 
                      label="MỚI"
                      size="small"
                      sx={{ 
                        position: 'absolute', 
                        top: 10, 
                        left: item.isBestSeller ? 110 : 10,
                        bgcolor: '#4CAF50',
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                  )}

                  {/* Discount badge */}
                  {item.discount && item.available && (
                    <Chip 
                      label={`-${item.discount}%`}
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
                    onClick={() => toggleFavorite(item.id)}
                  >
                    {favorites.has(item.id) ? (
                      <Favorite color="error" />
                    ) : (
                      <FavoriteBorder />
                    )}
                  </IconButton>

                  {/* Unavailable overlay */}
                  {!item.available && (
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
                        label="HẾT HÀNG"
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
                  {/* Item name and rating */}
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, fontSize: '1.1rem' }}>
                      {item.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Rating value={item.rating || 0} precision={0.1} size="small" readOnly />
                      <Typography variant="caption" color="text.secondary">
                        ({item.reviewCount})
                      </Typography>
                    </Box>
                  </Box>

                  {/* Description */}
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 2, 
                      flexGrow: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {item.description}
                  </Typography>

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                      {item.tags.slice(0, 3).map((tag, idx) => (
                        <Chip 
                          key={idx}
                          label={tag}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Additional Info */}
                  <Stack direction="row" spacing={2} sx={{ mb: 2, fontSize: '0.85rem' }}>
                    {item.preparationTime && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime sx={{ fontSize: 16 }} color="action" />
                        <Typography variant="caption" color="text.secondary">
                          {item.preparationTime}
                        </Typography>
                      </Box>
                    )}
                    {item.calories && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocalOffer sx={{ fontSize: 16 }} color="action" />
                        <Typography variant="caption" color="text.secondary">
                          {item.calories} cal
                        </Typography>
                      </Box>
                    )}
                  </Stack>

                  <Divider sx={{ mb: 2 }} />

                  {/* Price and Action */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      {item.discount ? (
                        <>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              textDecoration: 'line-through',
                              color: 'text.secondary'
                            }}
                          >
                            {item.price.toLocaleString()}đ
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#FF3D00' }}>
                            {Math.round(item.price * (1 - item.discount / 100)).toLocaleString()}đ
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {item.price.toLocaleString()}đ
                        </Typography>
                      )}
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={!item.available}
                      onClick={() => handleAddToCart(item)}
                      startIcon={<AddShoppingCart />}
                      sx={{ fontWeight: 600 }}
                    >
                      Thêm
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Restaurant sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Không tìm thấy món ăn nào
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Thử thay đổi từ khóa tìm kiếm hoặc danh mục
            </Typography>
            <Button 
              variant="outlined" 
              onClick={() => { 
                setSearch(''); 
                setSelectedCategory('all'); 
              }}
            >
              Xóa bộ lọc
            </Button>
          </Paper>
        )}
      </Container>

      {/* Snackbar notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity="success" 
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StoreMenu;