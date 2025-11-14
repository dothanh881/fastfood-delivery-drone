import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Paper, 
  Divider,
  TextField,
  Card,
  CardMedia,
  CardContent,
  Skeleton,
  IconButton
} from '@mui/material';
import { Add, Remove, ShoppingCart } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addToCart } from '../store/slices/cartSlice';

// Mock data for initial development
const mockMenuItem = {
  id: '1',
  name: 'Cheeseburger Deluxe',
  description: 'Juicy beef patty with melted cheese, lettuce, tomato, pickles, and special sauce on a toasted sesame seed bun.',
  price: 7.99,
  images: [
    'https://source.unsplash.com/random/600x400/?cheeseburger',
    'https://source.unsplash.com/random/600x400/?burger',
    'https://source.unsplash.com/random/600x400/?fastfood',
    'https://source.unsplash.com/random/600x400/?food'
  ],
  category: 'Burgers',
  available: true,
  relatedItems: [
    {
      id: '2',
      name: 'French Fries',
      description: 'Crispy golden fries seasoned with salt',
      price: 2.99,
      image: 'https://source.unsplash.com/random/300x200/?fries',
      category: 'Sides',
      available: true
    },
    {
      id: '3',
      name: 'Coca Cola',
      description: 'Refreshing cola drink',
      price: 1.99,
      image: 'https://source.unsplash.com/random/300x200/?cola',
      category: 'Drinks',
      available: true
    },
    {
      id: '4',
      name: 'Chicken Nuggets',
      description: 'Crispy chicken nuggets with dipping sauce',
      price: 4.99,
      image: 'https://source.unsplash.com/random/300x200/?nuggets',
      category: 'Sides',
      available: true
    }
  ]
};

const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  
  useEffect(() => {
    // Simulate API call to fetch item details
    setLoading(true);
    setTimeout(() => {
      setItem(mockMenuItem);
      setLoading(false);
    }, 1000);
  }, [id]);
  
  const handleAddToCart = () => {
    if (item) {
      dispatch(addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: quantity,
        image: item.images[0],
        storeId: 'mock',
        storeName: 'Demo Store'
      }));
    }
  };
  
  const handleQuantityChange = (value: number) => {
    if (value >= 1 && value <= 10) {
      setQuantity(value);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ py: 4 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={400} />
            <Box sx={{ display: 'flex', mt: 2, gap: 1 }}>
              {[1, 2, 3, 4].map((_, index) => (
                <Skeleton key={index} variant="rectangular" width={80} height={60} />
              ))}
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton variant="text" height={60} />
            <Skeleton variant="text" height={30} />
            <Skeleton variant="text" height={100} />
            <Skeleton variant="rectangular" height={50} sx={{ mt: 2 }} />
          </Grid>
        </Grid>
      </Box>
    );
  }
  
  if (!item) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h5">Item not found</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          sx={{ mt: 2 }}
          onClick={() => navigate('/')}
        >
          Back to Menu
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ py: 4 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <div className="image-gallery">
            <img 
              src={item.images[selectedImage]} 
              alt={item.name} 
              className="main-image"
            />
            <div className="thumbnail-container">
              {item.images.map((image: string, index: number) => (
                <img 
                  key={index}
                  src={image}
                  alt={`${item.name} thumbnail ${index + 1}`}
                  className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                  onClick={() => setSelectedImage(index)}
                />
              ))}
            </div>
          </div>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="h4" component="h1" gutterBottom>
            {item.name}
          </Typography>
          
          <Typography variant="h5" color="primary" gutterBottom>
            ${item.price.toFixed(2)}
          </Typography>
          
          <Typography variant="body1" paragraph>
            {item.description}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton 
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1}
            >
              <Remove />
            </IconButton>
            
            <TextField
              value={quantity}
              onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
              inputProps={{ min: 1, max: 10, style: { textAlign: 'center' } }}
              sx={{ width: '60px', mx: 1 }}
            />
            
            <IconButton onClick={() => handleQuantityChange(quantity + 1)}>
              <Add />
            </IconButton>
          </Box>
          
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<ShoppingCart />}
            onClick={handleAddToCart}
            fullWidth
            sx={{ mb: 3 }}
          >
            Add to Cart
          </Button>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            You might also like
          </Typography>
          
          <Grid container spacing={2}>
            {item.relatedItems.map((relatedItem: any) => (
              <Grid item xs={12} sm={4} key={relatedItem.id}>
                <Card 
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/menu/${relatedItem.id}`)}
                >
                  <CardMedia
                    component="img"
                    height="120"
                    image={relatedItem.image}
                    alt={relatedItem.name}
                  />
                  <CardContent sx={{ p: 1 }}>
                    <Typography variant="subtitle2" noWrap>
                      {relatedItem.name}
                    </Typography>
                    <Typography variant="body2" color="primary">
                      ${relatedItem.price.toFixed(2)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ItemDetail;