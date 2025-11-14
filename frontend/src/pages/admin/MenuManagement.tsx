import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Drawer,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Chip,
  SelectChangeEvent,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Close
} from '@mui/icons-material';
import ImageUpload from '../../components/ImageUpload';
import { 
  getAllMenuItems, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem, 
  MenuItemViewModel, 
  MenuItemDTO,
  fetchCategories,
  fetchStores,
  CategoryDTO,
  StoreDTO
} from '../../services/menu';

// Remove hardcoded categories - now using dynamic data from API

const MenuManagement: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItemViewModel[]>([]);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [stores, setStores] = useState<StoreDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<MenuItemViewModel> | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Load menu items, categories, and stores on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [items, categoriesData, storesData] = await Promise.all([
        getAllMenuItems(),
        fetchCategories(),
        fetchStores()
      ]);
      setMenuItems(items);
      setCategories(categoriesData);
      setStores(storesData);
    } catch (err) {
      setError('Không thể tải dữ liệu');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDrawer = (item?: MenuItemViewModel) => {
    if (item) {
      setCurrentItem(item);
      setIsEditing(true);
    } else {
      setCurrentItem({
        name: '',
        category: '',
        store: '',
        price: 0,
        image: '',
        available: true
      });
      setIsEditing(false);
    }
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setCurrentItem(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setCurrentItem({
      ...currentItem,
      [name as string]: value
    });
  };

  const handleImageUploaded = (imagePath: string) => {
    setCurrentItem({
      ...currentItem,
      image: imagePath
    });
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    if (name === 'available') {
      setCurrentItem({
        ...currentItem,
        available: value === 'true'
      });
    } else {
      setCurrentItem({
        ...currentItem,
        [name]: value
      });
    }
  };

  const handleSaveItem = async () => {
    if (!currentItem?.name || !currentItem?.price || !currentItem?.category || !currentItem?.store) {
      setError('Vui lòng điền đầy đủ thông tin bao gồm category và store');
      return;
    }

    try {
      // Find category and store objects
      const selectedCategory = categories.find(cat => cat.name === currentItem.category);
      const selectedStore = stores.find(store => store.name === currentItem.store);

      if (!selectedCategory || !selectedStore) {
        setError('Category hoặc Store không hợp lệ');
        return;
      }

      const newItem: Omit<MenuItemDTO, 'id'> = {
        name: currentItem.name,
        description: currentItem.description || '',
        price: Number(currentItem.price),
        imageUrl: currentItem.image || '',
        available: currentItem.available ?? true,
        category: { id: selectedCategory.id, name: selectedCategory.name },
        store: { id: selectedStore.id, name: selectedStore.name }
      };

      if (isEditing && currentItem.id) {
        await updateMenuItem(Number(currentItem.id), newItem);
      } else {
        await createMenuItem(newItem);
      }

      await loadData(); // Reload the list
      handleCloseDrawer();
    } catch (err) {
      setError('Không thể lưu menu item');
      console.error('Error saving menu item:', err);
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await deleteMenuItem(id);
      await loadData(); // Reload the list
    } catch (err) {
      setError('Không thể xóa menu item');
      console.error('Error deleting menu item:', err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Menu Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDrawer()}
        >
          Add Item
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Image</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Store</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {menuItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Avatar 
                      src={item.image} 
                      alt={item.name} 
                      variant="rounded"
                      sx={{ width: 50, height: 50 }}
                    />
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.store}</TableCell>
                  <TableCell>${item.price.toLocaleString('en-US')}</TableCell>
                  <TableCell>
                    <Chip 
                      label={item.available ? 'Available' : 'Unavailable'} 
                      color={item.available ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      onClick={() => handleOpenDrawer(item)}
                      color="primary"
                      size="small"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton 
                      onClick={() => handleDeleteItem(item.id)}
                      color="error"
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        sx={{
          '& .MuiDrawer-paper': { width: { xs: '100%', sm: 400 } },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              {isEditing ? 'Edit Menu Item' : 'Add New Menu Item'}
            </Typography>
            <IconButton onClick={handleCloseDrawer}>
              <Close />
            </IconButton>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <ImageUpload
                onImageUploaded={handleImageUploaded}
                currentImage={currentItem?.image}
                folder="products"
                maxSize={10}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Item Name"
                name="name"
                value={currentItem?.name || ''}
                onChange={handleInputChange}
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={currentItem?.category || ''}
                  onChange={handleSelectChange}
                  label="Category"
                  required
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.name}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Store</InputLabel>
                <Select
                  name="store"
                  value={currentItem?.store || ''}
                  onChange={handleSelectChange}
                  label="Store"
                  required
                >
                  {stores.map((store) => (
                    <MenuItem key={store.id} value={store.name}>
                      {store.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Price"
                name="price"
                type="number"
                value={currentItem?.price || ''}
                onChange={handleInputChange}
                margin="normal"
                required
                InputProps={{
                  startAdornment: '$',
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Availability</InputLabel>
                <Select
                  name="available"
                  value={currentItem?.available ? 'true' : 'false'}
                  onChange={handleSelectChange}
                  label="Availability"
                >
                  <MenuItem value="true">Available</MenuItem>
                  <MenuItem value="false">Unavailable</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleSaveItem}
              >
                {isEditing ? 'Update Item' : 'Add Item'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Drawer>
    </Box>
  );
};

export default MenuManagement;