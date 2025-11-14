import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  InputAdornment,
  Tabs,
  Tab,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Edit,
  Warning,
  CheckCircle,
  Inventory,
  TrendingDown,
  Search,
  Refresh,
  Add,
  Remove
} from '@mui/icons-material';

// Mock data structure
interface InventoryItem {
  id: number;
  menuItemId: number;
  menuItemName: string;
  category: string;
  storeName: string;
  quantity: number;
  threshold: number;
  reserved: number;
  unit: string;
  lastUpdated: string;
  imageUrl?: string;
}

// Mock inventory data
const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: 1,
    menuItemId: 1,
    menuItemName: 'Classic Burger',
    category: 'Burgers',
    storeName: 'Downtown Store',
    quantity: 150,
    threshold: 50,
    reserved: 20,
    unit: 'units',
    lastUpdated: '2025-10-20T10:30:00',
    imageUrl: '/uploads/products/burger.jpg'
  },
  {
    id: 2,
    menuItemId: 2,
    menuItemName: 'Cheeseburger',
    category: 'Burgers',
    storeName: 'Downtown Store',
    quantity: 45,
    threshold: 60,
    reserved: 15,
    unit: 'units',
    lastUpdated: '2025-10-20T09:15:00',
    imageUrl: '/uploads/products/cheeseburger.jpg'
  },
  {
    id: 3,
    menuItemId: 3,
    menuItemName: 'Fried Chicken',
    category: 'Chicken',
    storeName: 'Downtown Store',
    quantity: 25,
    threshold: 40,
    reserved: 10,
    unit: 'units',
    lastUpdated: '2025-10-20T08:00:00',
    imageUrl: '/uploads/products/chicken.jpg'
  },
  {
    id: 4,
    menuItemId: 4,
    menuItemName: 'French Fries',
    category: 'Sides',
    storeName: 'Uptown Store',
    quantity: 200,
    threshold: 80,
    reserved: 30,
    unit: 'portions',
    lastUpdated: '2025-10-20T11:00:00',
    imageUrl: '/uploads/products/fries.jpg'
  },
  {
    id: 5,
    menuItemId: 5,
    menuItemName: 'Coca Cola',
    category: 'Drinks',
    storeName: 'Downtown Store',
    quantity: 180,
    threshold: 100,
    reserved: 25,
    unit: 'bottles',
    lastUpdated: '2025-10-20T10:45:00',
    imageUrl: '/uploads/products/coke.jpg'
  },
  {
    id: 6,
    menuItemId: 6,
    menuItemName: 'Chicken Wings',
    category: 'Chicken',
    storeName: 'Uptown Store',
    quantity: 15,
    threshold: 30,
    reserved: 5,
    unit: 'units',
    lastUpdated: '2025-10-20T07:30:00',
    imageUrl: '/uploads/products/wings.jpg'
  },
  {
    id: 7,
    menuItemId: 7,
    menuItemName: 'Pizza',
    category: 'Main',
    storeName: 'Downtown Store',
    quantity: 80,
    threshold: 40,
    reserved: 12,
    unit: 'units',
    lastUpdated: '2025-10-20T09:00:00',
    imageUrl: '/uploads/products/pizza.jpg'
  },
  {
    id: 8,
    menuItemId: 8,
    menuItemName: 'Ice Cream',
    category: 'Desserts',
    storeName: 'Uptown Store',
    quantity: 30,
    threshold: 50,
    reserved: 8,
    unit: 'scoops',
    lastUpdated: '2025-10-20T10:00:00',
    imageUrl: '/uploads/products/icecream.jpg'
  }
];

const InventoryManagement: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>(MOCK_INVENTORY);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>(MOCK_INVENTORY);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [newQuantity, setNewQuantity] = useState(0);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Calculate statistics
  const stats = {
    totalItems: inventory.length,
    lowStockItems: inventory.filter(item => item.quantity < item.threshold).length,
    criticalItems: inventory.filter(item => item.quantity < item.threshold * 0.5).length,
    totalValue: inventory.reduce((sum, item) => sum + item.quantity, 0)
  };

  // Filter inventory based on search and tab
  useEffect(() => {
    let filtered = inventory;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.menuItemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.storeName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by tab
    if (selectedTab === 1) {
      filtered = filtered.filter(item => item.quantity < item.threshold);
    } else if (selectedTab === 2) {
      filtered = filtered.filter(item => item.quantity < item.threshold * 0.5);
    }

    setFilteredInventory(filtered);
  }, [searchTerm, selectedTab, inventory]);

  const handleOpenEditDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setNewQuantity(item.quantity);
    setAdjustAmount(0);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedItem(null);
    setAdjustAmount(0);
  };

  const handleAdjustQuantity = (amount: number) => {
    const newValue = Math.max(0, newQuantity + amount);
    setNewQuantity(newValue);
    setAdjustAmount(amount);
  };

  const handleSaveQuantity = () => {
    if (selectedItem) {
      const updatedInventory = inventory.map(item =>
        item.id === selectedItem.id
          ? { ...item, quantity: newQuantity, lastUpdated: new Date().toISOString() }
          : item
      );
      setInventory(updatedInventory);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      handleCloseEditDialog();
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    const available = item.quantity - item.reserved;
    if (available < item.threshold * 0.5) {
      return { label: 'Critical', color: 'error' as const, icon: <Warning /> };
    } else if (available < item.threshold) {
      return { label: 'Low Stock', color: 'warning' as const, icon: <TrendingDown /> };
    }
    return { label: 'In Stock', color: 'success' as const, icon: <CheckCircle /> };
  };

  const getStockPercentage = (item: InventoryItem) => {
    return Math.min(((item.quantity - item.reserved) / item.threshold) * 100, 100);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Inventory Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => setInventory([...MOCK_INVENTORY])}
        >
          Refresh
        </Button>
      </Box>

      {/* Success Alert */}
      {showSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setShowSuccess(false)}>
          Inventory updated successfully!
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Items
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.totalItems}
                  </Typography>
                </Box>
                <Inventory sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Low Stock
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {stats.lowStockItems}
                  </Typography>
                </Box>
                <TrendingDown sx={{ fontSize: 40, color: 'warning.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Critical
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="error.main">
                    {stats.criticalItems}
                  </Typography>
                </Box>
                <Warning sx={{ fontSize: 40, color: 'error.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Quantity
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {stats.totalValue}
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder="Search by item name, category, or store..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
          <Tab label="All Items" />
          <Tab
            label={
              <Badge badgeContent={stats.lowStockItems} color="warning">
                Low Stock
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={stats.criticalItems} color="error">
                Critical
              </Badge>
            }
          />
        </Tabs>
      </Paper>

      {/* Inventory Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Item Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Store</TableCell>
              <TableCell align="center">Available</TableCell>
              <TableCell align="center">Reserved</TableCell>
              <TableCell align="center">Total</TableCell>
              <TableCell align="center">Threshold</TableCell>
              <TableCell>Stock Level</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredInventory.map((item) => {
              const status = getStockStatus(item);
              const available = item.quantity - item.reserved;
              const percentage = getStockPercentage(item);

              return (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {item.menuItemName}
                    </Typography>
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.storeName}</TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="bold">
                      {available} {item.unit}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="text.secondary">
                      {item.reserved}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="bold">
                      {item.quantity}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" color="text.secondary">
                      {item.threshold}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ width: '100%', minWidth: 100 }}>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        color={percentage < 50 ? 'error' : percentage < 100 ? 'warning' : 'success'}
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        {percentage.toFixed(0)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={status.label}
                      color={status.color}
                      icon={status.icon}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Update Quantity">
                      <IconButton
                        onClick={() => handleOpenEditDialog(item)}
                        color="primary"
                        size="small"
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredInventory.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No items found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Quantity Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Update Inventory - {selectedItem?.menuItemName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="caption" color="text.secondary">
                    Current Quantity
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {selectedItem?.quantity} {selectedItem?.unit}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="caption" color="text.secondary">
                    Reserved
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {selectedItem?.reserved} {selectedItem?.unit}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Quick Adjust
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {[-50, -10, -5, -1].map((amount) => (
                  <Button
                    key={amount}
                    variant="outlined"
                    size="small"
                    onClick={() => handleAdjustQuantity(amount)}
                    startIcon={<Remove />}
                  >
                    {Math.abs(amount)}
                  </Button>
                ))}
                {[1, 5, 10, 50].map((amount) => (
                  <Button
                    key={amount}
                    variant="outlined"
                    size="small"
                    onClick={() => handleAdjustQuantity(amount)}
                    startIcon={<Add />}
                    color="success"
                  >
                    {amount}
                  </Button>
                ))}
              </Box>

              <TextField
                fullWidth
                label="New Quantity"
                type="number"
                value={newQuantity}
                onChange={(e) => setNewQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">{selectedItem?.unit}</InputAdornment>,
                }}
                sx={{ mb: 2 }}
              />

              {adjustAmount !== 0 && (
                <Alert severity={adjustAmount > 0 ? 'success' : 'warning'} sx={{ mt: 1 }}>
                  {adjustAmount > 0 ? 'Adding' : 'Removing'} {Math.abs(adjustAmount)} {selectedItem?.unit}
                </Alert>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button onClick={handleSaveQuantity} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryManagement;


