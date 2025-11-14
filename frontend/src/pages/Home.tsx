import React, { useEffect, useMemo, useState } from 'react';
import { 
  Grid, 
  Card, 
  CardMedia, 
  CardContent, 
  Typography, 
  CardActions, 
  Button, 
  TextField,
  Box,
  Chip,
  Skeleton,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { fetchMenuStart, fetchMenuSuccess, fetchMenuFailure, filterByCategory, searchItems } from '../store/slices/menuSlice';
import { addToCart } from '../store/slices/cartSlice';
import { fetchMenuItems, searchMenuItems } from '../services/menu';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { filteredItems, items, isLoading } = useSelector((state: RootState) => state.menu);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [error, setError] = useState<string | null>(null);

  // Load menu items from API
  useEffect(() => {
    const loadMenuItems = async () => {
      try {
        dispatch(fetchMenuStart());
        setError(null);
        const menuItems = await fetchMenuItems(0, 50);
        dispatch(fetchMenuSuccess(menuItems));
      } catch (err) {
        console.error('Failed to load menu items:', err);
        setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.');
        dispatch(fetchMenuFailure('Failed to load menu items'));
      }
    };

    loadMenuItems();
  }, [dispatch]);

  // Handle search with debounce
  useEffect(() => {
    const handleSearch = async () => {
      if (searchTerm.trim()) {
        try {
          dispatch(fetchMenuStart());
          const searchResults = await searchMenuItems(searchTerm, 0, 50);
          dispatch(fetchMenuSuccess(searchResults));
        } catch (err) {
          console.error('Search failed:', err);
          setError('Tìm kiếm thất bại. Vui lòng thử lại.');
          dispatch(fetchMenuFailure('Search failed'));
        }
      } else {
        // Load all items when search is cleared
        try {
          dispatch(fetchMenuStart());
          const menuItems = await fetchMenuItems(0, 50);
          dispatch(fetchMenuSuccess(menuItems));
        } catch (err) {
          console.error('Failed to load menu items:', err);
          setError('Không thể tải danh sách sản phẩm.');
          dispatch(fetchMenuFailure('Failed to load menu items'));
        }
      }
    };

    const timeoutId = setTimeout(handleSearch, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchTerm, dispatch]);

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    dispatch(filterByCategory(category));
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    dispatch(searchItems(event.target.value));
  };

  const handleAddToCart = (item: any) => {
    dispatch(addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image: item.image,
      storeId: item.storeId,
      storeName: item.store || 'Unknown'
    }));
  };

  const derivedCategories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => { if (i.category) set.add(i.category); });
    return Array.from(set);
  }, [items]);

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Our Menu
        </Typography>
        
        <Box sx={{ display: 'flex', mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search menu items..."
            variant="outlined"
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: <Search color="action" sx={{ mr: 1 }} />,
            }}
            sx={{ mr: 2 }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          <Chip 
            label="All" 
            onClick={() => handleCategoryFilter('all')}
            color={selectedCategory === 'all' ? 'primary' : 'default'}
            clickable
          />
          {derivedCategories.map((category) => (
            <Chip 
              key={category} 
              label={category} 
              onClick={() => handleCategoryFilter(category)}
              color={selectedCategory === category ? 'primary' : 'default'}
              clickable
            />
          ))}
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {isLoading ? (
          // Skeleton loading
          Array.from(new Array(6)).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card>
                <Skeleton variant="rectangular" height={200} />
                <CardContent>
                  <Skeleton variant="text" height={30} />
                  <Skeleton variant="text" height={20} />
                  <Skeleton variant="text" height={20} width="60%" />
                </CardContent>
                <CardActions>
                  <Skeleton variant="rectangular" width={100} height={36} />
                  <Skeleton variant="rectangular" width={36} height={36} sx={{ ml: 'auto' }} />
                </CardActions>
              </Card>
            </Grid>
          ))
        ) : (
          filteredItems.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="img"
                  height="200"
                  image={item.image}
                  alt={item.name}
                  loading="lazy"
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    const target = e.currentTarget;
                    if (target.src && !target.src.includes('placeholder')) {
                      target.src = 'https://via.placeholder.com/600x400/f0f0f0/666666?text=No+Image';
                    }
                  }}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/menu/${item.id}`)}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="div">
                    {item.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                  <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                    ${item.price.toLocaleString('vi-VN')}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    onClick={() => navigate(`/menu/${item.id}`)}
                  >
                    View Details
                  </Button>
                  <IconButton 
                    color="primary" 
                    sx={{ ml: 'auto' }}
                    onClick={() => handleAddToCart(item)}
                  >
                    <Add />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
};

export default Home;