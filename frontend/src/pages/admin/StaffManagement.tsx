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
  Button,
  IconButton,
  Chip,
  Avatar,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  InputAdornment,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  Switch,
  FormControlLabel,
  Stack,
  Divider,
  SelectChangeEvent
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Person,
  Phone,
  Email,
  Badge as BadgeIcon,
  AdminPanelSettings,
  Restaurant,
  LocalShipping,
  Store,
  Refresh,
  Lock,
  CheckCircle,
  Cancel
} from '@mui/icons-material';

// Staff role types
type StaffRole = 'ADMIN' | 'MANAGER' | 'STAFF' | 'CHEF' | 'DELIVERY' | 'CASHIER';
type StaffStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';

// Mock data structure
interface Staff {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  storeName: string;
  avatar?: string;
  joinDate: string;
  lastLogin?: string;
  salary?: number;
  address?: string;
  emergencyContact?: string;
}

// Mock staff data
const MOCK_STAFF: Staff[] = [
  {
    id: 1,
    fullName: 'Lê Song Nhật Quyền',
    email: 'admin@fastfood.com',
    phone: '0901234567',
    role: 'ADMIN',
    status: 'ACTIVE',
    storeName: 'Head Office',
    joinDate: '2023-01-15',
    lastLogin: '2025-10-20T10:30:00',
    salary: 25000000,
    address: '123 Lê Lợi, Quận 1, TP.HCM',
    emergencyContact: '0909999888'
  },
  {
    id: 2,
    fullName: 'Đỗ Phú Thành',
    email: 'manager@fastfood.com',
    phone: '0907654321',
    role: 'MANAGER',
    status: 'ACTIVE',
    storeName: 'Downtown Store',
    joinDate: '2023-03-20',
    lastLogin: '2025-10-20T09:15:00',
    salary: 20000000,
    address: '456 Nguyễn Huệ, Quận 1, TP.HCM',
    emergencyContact: '0908888777'
  },
  {
    id: 3,
    fullName: 'Huỳnh Duy Khang',
    email: 'chef.khang@fastfood.com',
    phone: '0912345678',
    role: 'CHEF',
    status: 'ACTIVE',
    storeName: 'Downtown Store',
    joinDate: '2023-06-10',
    lastLogin: '2025-10-20T08:45:00',
    salary: 15000000,
    address: '789 Pasteur, Quận 3, TP.HCM',
    emergencyContact: '0907777666'
  },
  {
    id: 4,
    fullName: 'Nguyễn Thành Danh',
    email: 'staff.danh@fastfood.com',
    phone: '0923456789',
    role: 'STAFF',
    status: 'ACTIVE',
    storeName: 'Uptown Store',
    joinDate: '2024-01-05',
    lastLogin: '2025-10-20T07:30:00',
    salary: 10000000,
    address: '321 Võ Văn Tần, Quận 3, TP.HCM',
    emergencyContact: '0906666555'
  },
  {
    id: 5,
    fullName: 'Lê Hồng Phát',
    email: 'cashier.le@fastfood.com',
    phone: '0945678901',
    role: 'CASHIER',
    status: 'ACTIVE',
    storeName: 'Uptown Store',
    joinDate: '2024-05-20',
    lastLogin: '2025-10-20T10:15:00',
    salary: 9000000,
    address: '987 Cộng Hòa, Quận Tân Bình, TP.HCM',
    emergencyContact: '0904444333'
  },
  {
    id: 6,
    fullName: 'Trương Phú Kiệt',
    email: 'chef2.kiet@fastfood.com',
    phone: '0956789012',
    role: 'CHEF',
    status: 'ON_LEAVE',
    storeName: 'Uptown Store',
    joinDate: '2024-02-10',
    lastLogin: '2025-10-18T16:00:00',
    salary: 14000000,
    address: '123 Trường Chinh, Quận Tân Bình, TP.HCM',
    emergencyContact: '0903333222'
  },
  {
    id: 7,
    fullName: 'Trà Đức Toàn',
    email: 'staff2.toan@fastfood.com',
    phone: '0967890123',
    role: 'STAFF',
    status: 'INACTIVE',
    storeName: 'Downtown Store',
    joinDate: '2023-11-01',
    lastLogin: '2025-10-15T14:30:00',
    salary: 9500000,
    address: '456 Lý Thường Kiệt, Quận 10, TP.HCM',
    emergencyContact: '0902222111'
  }
];

const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>(MOCK_STAFF);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>(MOCK_STAFF);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStore, setFilterStore] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState<Partial<Staff>>({
    fullName: '',
    email: '',
    phone: '',
    role: 'STAFF',
    status: 'ACTIVE',
    storeName: '',
    salary: 0,
    address: '',
    emergencyContact: ''
  });

  // Role configuration
  const roleConfig: Record<StaffRole, { label: string; color: any; icon: any }> = {
    ADMIN: { label: 'Admin', color: 'error', icon: <AdminPanelSettings /> },
    MANAGER: { label: 'Manager', color: 'warning', icon: <BadgeIcon /> },
    STAFF: { label: 'Staff', color: 'info', icon: <Person /> },
    CHEF: { label: 'Chef', color: 'success', icon: <Restaurant /> },
    DELIVERY: { label: 'Delivery', color: 'primary', icon: <LocalShipping /> },
    CASHIER: { label: 'Cashier', color: 'secondary', icon: <Store /> }
  };

  // Status configuration
  const statusConfig: Record<StaffStatus, { label: string; color: any; icon: any }> = {
    ACTIVE: { label: 'Active', color: 'success', icon: <CheckCircle /> },
    INACTIVE: { label: 'Inactive', color: 'error', icon: <Cancel /> },
    ON_LEAVE: { label: 'On Leave', color: 'warning', icon: <Lock /> }
  };

  // Calculate statistics
  const stats = {
    total: staff.length,
    active: staff.filter(s => s.status === 'ACTIVE').length,
    inactive: staff.filter(s => s.status === 'INACTIVE').length,
    onLeave: staff.filter(s => s.status === 'ON_LEAVE').length,
    admins: staff.filter(s => s.role === 'ADMIN').length,
    managers: staff.filter(s => s.role === 'MANAGER').length,
    chefs: staff.filter(s => s.role === 'CHEF').length,
    delivery: staff.filter(s => s.role === 'DELIVERY').length
  };

  // Get unique stores
  const stores = Array.from(new Set(staff.map(s => s.storeName)));

  // Filter staff
  useEffect(() => {
    let filtered = staff;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone.includes(searchTerm)
      );
    }

    // Filter by status tab
    const statusMap: Record<number, StaffStatus[]> = {
      0: ['ACTIVE', 'INACTIVE', 'ON_LEAVE'], // All
      1: ['ACTIVE'],
      2: ['INACTIVE'],
      3: ['ON_LEAVE']
    };

    if (statusMap[selectedTab]) {
      filtered = filtered.filter(s => statusMap[selectedTab].includes(s.status));
    }

    // Filter by role
    if (filterRole !== 'all') {
      filtered = filtered.filter(s => s.role === filterRole);
    }

    // Filter by store
    if (filterStore !== 'all') {
      filtered = filtered.filter(s => s.storeName === filterStore);
    }

    setFilteredStaff(filtered);
  }, [searchTerm, selectedTab, filterRole, filterStore, staff]);

  const handleOpenDialog = (staffMember?: Staff) => {
    if (staffMember) {
      setSelectedStaff(staffMember);
      setFormData(staffMember);
      setIsEditing(true);
    } else {
      setSelectedStaff(null);
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        role: 'STAFF',
        status: 'ACTIVE',
        storeName: stores[0] || '',
        salary: 0,
        address: '',
        emergencyContact: ''
      });
      setIsEditing(false);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedStaff(null);
    setFormData({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'salary' ? Number(value) : value
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveStaff = () => {
    if (!formData.fullName || !formData.email || !formData.phone) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    if (isEditing && selectedStaff) {
      // Update existing staff
      const updatedStaff = staff.map(s =>
        s.id === selectedStaff.id ? { ...s, ...formData } as Staff : s
      );
      setStaff(updatedStaff);
      setSuccessMessage('Cập nhật nhân viên thành công!');
    } else {
      // Add new staff
      const newStaff: Staff = {
        id: Math.max(...staff.map(s => s.id)) + 1,
        ...formData,
        joinDate: new Date().toISOString().split('T')[0],
        lastLogin: new Date().toISOString()
      } as Staff;
      setStaff([...staff, newStaff]);
      setSuccessMessage('Thêm nhân viên mới thành công!');
    }

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    handleCloseDialog();
  };

  const handleDeleteConfirm = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (selectedStaff) {
      setStaff(staff.filter(s => s.id !== selectedStaff.id));
      setSuccessMessage('Xóa nhân viên thành công!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
    setDeleteDialogOpen(false);
    setSelectedStaff(null);
  };

  const handleToggleStatus = (staffId: number) => {
    const updatedStaff = staff.map(s =>
      s.id === staffId
        ? { ...s, status: s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' as StaffStatus }
        : s
    );
    setStaff(updatedStaff);
    setSuccessMessage('Cập nhật trạng thái thành công!');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Chưa đăng nhập';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Staff Management
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => setStaff([...MOCK_STAFF])}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Staff
          </Button>
        </Stack>
      </Box>

      {/* Success Alert */}
      {showSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setShowSuccess(false)}>
          {successMessage}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">Total Staff</Typography>
                  <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
                </Box>
                <Person sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">Active</Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">{stats.active}</Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">On Leave</Typography>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">{stats.onLeave}</Typography>
                </Box>
                <Lock sx={{ fontSize: 40, color: 'warning.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">Inactive</Typography>
                  <Typography variant="h4" fontWeight="bold" color="error.main">{stats.inactive}</Typography>
                </Box>
                <Cancel sx={{ fontSize: 40, color: 'error.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Tìm kiếm theo tên, email, SĐT..."
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
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={filterRole}
                  label="Role"
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <MenuItem value="all">All Roles</MenuItem>
                  {Object.entries(roleConfig).map(([key, config]) => (
                    <MenuItem key={key} value={key}>
                      {config.icon} {config.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Store</InputLabel>
                <Select
                  value={filterStore}
                  label="Store"
                  onChange={(e) => setFilterStore(e.target.value)}
                >
                  <MenuItem value="all">All Stores</MenuItem>
                  {stores.map(store => (
                    <MenuItem key={store} value={store}>{store}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
          <Tab label={`All (${stats.total})`} />
          <Tab label={<Badge badgeContent={stats.active} color="success">Active</Badge>} />
          <Tab label={<Badge badgeContent={stats.inactive} color="error">Inactive</Badge>} />
          <Tab label={<Badge badgeContent={stats.onLeave} color="warning">On Leave</Badge>} />
        </Tabs>
      </Paper>

      {/* Staff Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Staff</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Store</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Join Date</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStaff.map((member) => {
              const roleConf = roleConfig[member.role];
              const statusConf = statusConfig[member.status];

              return (
                <TableRow key={member.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: roleConf.color + '.main' }}>
                        {getInitials(member.fullName)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {member.fullName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {member.id}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Email fontSize="small" color="action" />
                        <Typography variant="body2">{member.email}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Phone fontSize="small" color="action" />
                        <Typography variant="body2">{member.phone}</Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={roleConf.label}
                      color={roleConf.color}
                      icon={roleConf.icon}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{member.storeName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusConf.label}
                      color={statusConf.color}
                      icon={statusConf.icon}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(member.joinDate)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(member.lastLogin)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenDialog(member)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={member.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}>
                        <IconButton
                          size="small"
                          color={member.status === 'ACTIVE' ? 'warning' : 'success'}
                          onClick={() => handleToggleStatus(member.id)}
                        >
                          {member.status === 'ACTIVE' ? <Lock /> : <CheckCircle />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteConfirm(member)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredStaff.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No staff members found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Staff Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit Staff Member' : 'Add New Staff Member'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name"
                name="fullName"
                value={formData.fullName || ''}
                onChange={handleInputChange}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Role</InputLabel>
                <Select
                  name="role"
                  value={formData.role || 'STAFF'}
                  label="Role"
                  onChange={handleSelectChange}
                >
                  {Object.entries(roleConfig).map(([key, config]) => (
                    <MenuItem key={key} value={key}>
                      {config.icon} {config.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Store</InputLabel>
                <Select
                  name="storeName"
                  value={formData.storeName || ''}
                  label="Store"
                  onChange={handleSelectChange}
                >
                  {stores.map(store => (
                    <MenuItem key={store} value={store}>{store}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status || 'ACTIVE'}
                  label="Status"
                  onChange={handleSelectChange}
                >
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <MenuItem key={key} value={key}>
                      {config.icon} {config.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Salary"
                name="salary"
                type="number"
                value={formData.salary || 0}
                onChange={handleInputChange}
                InputProps={{
                  endAdornment: <InputAdornment position="end">VND</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Emergency Contact"
                name="emergencyContact"
                value={formData.emergencyContact || ''}
                onChange={handleInputChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={formData.address || ''}
                onChange={handleInputChange}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveStaff} variant="contained" color="primary">
            {isEditing ? 'Update' : 'Add'} Staff
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedStaff?.fullName}</strong>? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StaffManagement;
