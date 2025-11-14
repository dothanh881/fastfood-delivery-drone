import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tabs,
  Tab,
  Tooltip,
  Switch,
  FormControlLabel,
  LinearProgress,
  Snackbar,
  TablePagination
} from '@mui/material';
import {
  Add,
  Flight,
  FlightTakeoff,
  FlightLand,
  BatteryFull,
  Battery80,
  Battery50,
  Battery20,
  Warning,
  CheckCircle,
  Refresh,
  LocationOn,
  Settings,
  Assignment,
  Stop,
  PlayArrow,
  Home,
  Build,
  PowerSettingsNew,
  Delete,
  Edit,
  Save
} from '@mui/icons-material';
import DroneMap from '../../components/DroneMap';
import { normalizePair, clampToHcmRadius } from '../../utils/geo';
import DroneAssignmentService, { DroneStation, AssignmentRequest } from '../../services/droneAssignmentService';
import DroneManagementService, { DroneFleet as DroneFleetType, DroneAssignment } from '../../services/droneManagementService';
import { useWebSocket } from '../../hooks/useWebSocket';
import { getOrdersByStatus, assignDroneToOrder, OrderResponse, Page as OrderPage } from '../../services/order';

interface DroneFleet {
  id: string;
  serialNumber: string;
  model: string;
  status: 'IDLE' | 'ASSIGNED' | 'DELIVERING' | 'RETURNING' | 'CHARGING' | 'MAINTENANCE' | 'OFFLINE';
  batteryLevel: number;
  currentLat: number;
  currentLng: number;
  homeLat: number;
  homeLng: number;
  stationId?: string;
  assignedOrderId?: string;
  deliveryId?: string;
  lastMaintenance?: string;
  totalFlights?: number;
  flightHours?: number;
  maxPayload: number;
  maxRange: number;
  isActive: boolean;
  lastAssignedAt?: string;
}

const DroneManagement: React.FC = () => {
  // Cờ môi trường để ẩn UI Trạm Drone (giả lập)
  const ENABLE_STATIONS = (process.env.REACT_APP_ENABLE_DRONE_STATIONS ?? 'false') === 'true';
  // New drone form state
  const [newDrone, setNewDrone] = useState<Partial<DroneFleetType>>({
    serialNumber: '',
    model: '',
    maxPayload: 0,
    maxRange: 0,
    homeLat: 0,
    homeLng: 0,
    isActive: true,
    status: 'IDLE'
  });

  const [creatingDrone, setCreatingDrone] = useState(false);

  // Route for selected drone's delivery
  const [selectedDroneRoute, setSelectedDroneRoute] = useState<{ lat: number; lng: number; type?: string }[] | null>(null);

  const [tabValue, setTabValue] = useState(0);
  const [drones, setDrones] = useState<DroneFleet[]>([]);
  const [stations, setStations] = useState<DroneStation[]>([]);
  const [selectedDrone, setSelectedDrone] = useState<DroneFleet | null>(null);
  const [selectedStation, setSelectedStation] = useState<DroneStation | null>(null);
  const [openDroneDialog, setOpenDroneDialog] = useState(false);
  const [_openStationDialog, setOpenStationDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_configDialogOpen, setConfigDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [droneStations, setDroneStations] = useState<DroneStation[]>([]);
  // Toggle to show exact DB coordinates (no normalization/clamping)
  const [exactDbMode, setExactDbMode] = useState(false);
  const [assignmentRequest, setAssignmentRequest] = useState<AssignmentRequest | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'success' | 'error' | 'info' | 'warning' });
  const [fleetStats, setFleetStats] = useState<{ total: number; idleCount: number; assignedCount: number; deliveringCount: number; returningCount: number; chargingCount: number; maintenanceCount: number; offlineCount: number; } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeAssignments, setActiveAssignments] = useState<DroneAssignment[]>([]);
  const [isEditingDrone, setIsEditingDrone] = useState(false);
  const [editDroneForm, setEditDroneForm] = useState<Partial<DroneFleetType>>({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  // Tab: Đơn chờ gán (READY_FOR_DELIVERY)
  const PendingOrdersTab: React.FC = () => {
    const [pending, setPending] = useState<OrderResponse[]>([]);
    const [pendingPageData, setPendingPageData] = useState<OrderPage<OrderResponse> | null>(null);
    const [pendingPage, setPendingPage] = useState(0);
    const [pendingSize, setPendingSize] = useState(10);
    const [pendingLoading, setPendingLoading] = useState(false);

    const fetchPending = async () => {
      setPendingLoading(true);
      try {
        const res = await getOrdersByStatus('READY_FOR_DELIVERY', pendingPage, pendingSize);
        setPendingPageData(res);
        setPending(res.content || []);
      } catch (e) {
        setSnackbar({ open: true, message: 'Không tải được danh sách đơn chờ gán', severity: 'error' });
      } finally {
        setPendingLoading(false);
      }
    };

    useEffect(() => { fetchPending(); /* eslint-disable-next-line */ }, [pendingPage, pendingSize]);

    const handleAssign = async (orderId: number) => {
      try {
        setPendingLoading(true);
        const result = await assignDroneToOrder(orderId, true);
        if (result?.success) {
          setSnackbar({ open: true, message: `Đã gán drone cho đơn #${orderId}`, severity: 'success' });
          // Reload pending list
          fetchPending();
          // Làm mới dữ liệu drone để phản ánh trạng thái mới
          loadDroneData();
        } else {
          setSnackbar({ open: true, message: result?.message || 'Gán drone thất bại', severity: 'error' });
        }
      } catch (e: any) {
        setSnackbar({ open: true, message: e?.message || 'Có lỗi khi gán drone', severity: 'error' });
      } finally {
        setPendingLoading(false);
      }
    };

    return (
      <Box>
        {pendingLoading && <LinearProgress sx={{ mb: 2 }} />}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Đơn Hàng Chờ Gán Drone</Typography>
          <Box>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchPending} disabled={pendingLoading}>
              {pendingLoading ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Mã đơn</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell>Tổng tiền</TableCell>
                <TableCell>Thời gian tạo</TableCell>
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pending.map((o) => (
                <TableRow key={o.id} hover>
                  <TableCell>{o.orderCode || String(o.id)}</TableCell>
                  <TableCell>{o.status}</TableCell>
                  <TableCell>{Number(o.totalAmount || 0).toLocaleString('vi-VN')} đ</TableCell>
                  <TableCell>{String(o.createdAt || '')}</TableCell>
                  <TableCell align="right">
                    <Button variant="contained" size="small" startIcon={<Assignment />} onClick={() => handleAssign(o.id)} disabled={pendingLoading}>
                      Gán drone
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {pending.length === 0 && !pendingLoading && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Alert severity="info">Không có đơn sẵn sàng giao cần gán drone.</Alert>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
          <Button variant="outlined" disabled={pendingPage <= 0 || pendingLoading} onClick={() => setPendingPage((p) => Math.max(0, p - 1))}>Trang trước</Button>
          <Button variant="outlined" disabled={pendingLoading || (pendingPageData ? pendingPage >= (pendingPageData.totalPages - 1) : false)} onClick={() => setPendingPage((p) => p + 1)}>Trang sau</Button>
        </Box>
      </Box>
    );
  };

  // Load drone data from API
  useEffect(() => {
    loadDroneData();
    if (ENABLE_STATIONS) {
      loadDroneStations();
    }
  }, [ENABLE_STATIONS, page, rowsPerPage, statusFilter]);

  // Tải thống kê fleet từ API
  const loadFleetStats = async () => {
    try {
      const stats = await DroneManagementService.getFleetStats();
      setFleetStats(stats);
    } catch (error) {
      console.warn('Không tải được thống kê fleet từ API');
    }
  };

  // Tải danh sách gán đang hoạt động
  const loadActiveAssignments = async () => {
    try {
      const assignments = await DroneManagementService.getActiveAssignments();
      setActiveAssignments(assignments);
    } catch (error) {
      console.warn('Không tải được danh sách gán tự động');
    }
  };

  const loadDroneStations = async () => {
    try {
      const stations = await DroneAssignmentService.getDroneStations();
      setDroneStations(stations);
    } catch (error) {
      console.error('Error loading drone stations:', error);
      setSnackbar({ open: true, message: 'Lỗi khi tải dữ liệu trạm drone', severity: 'error' });
    }
  };

  // WebSocket URL (derive from API base) and hook
  const wsUrl = ((process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api').replace(/\/+$/, '')
    .replace(/\/api$/, '')) + '/api/ws';

  const { isConnected, subscribe, unsubscribe } = useWebSocket({
    url: wsUrl,
    onConnect: () => { console.log('WS connected for DroneManagement'); },
    onDisconnect: () => { console.log('WS disconnected for DroneManagement'); },
    onError: (err) => { console.warn('WS error DroneManagement', err); }
  });

  const handleAutoAssignment = async () => {
    if (!assignmentRequest) return;

    try {
      setLoading(true);
      const result = await DroneAssignmentService.autoAssignDroneWithStation(assignmentRequest);
      
      if (result.success) {
        setSnackbar({ 
          open: true, 
          message: `Thành công: ${result.message}. Thời gian giao hàng ước tính: ${result.estimatedDeliveryTime} phút`, 
          severity: 'success' 
        });
        setAssignmentDialogOpen(false);
        // Refresh data
        loadDroneStations();
      } else {
        setSnackbar({ open: true, message: result.message, severity: 'error' });
      }
    } catch (error) {
      console.error('Auto assignment error:', error);
      setSnackbar({ open: true, message: 'Lỗi khi gán drone tự động', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const openAssignmentDialog = () => {
    // Mock assignment request - trong thực tế sẽ có form để nhập
    setAssignmentRequest({
      orderId: 'order-123',
      customerLocation: { lat: 10.762622, lng: 106.660172 },
      storeLocation: { lat: 10.786785, lng: 106.695053 },
      priority: 'normal',
      estimatedWeight: 500
    });
    setAssignmentDialogOpen(true);
  };

  const loadDroneData = async () => {
    try {
      setLoading(true);
      
      // Load real drone data from API (paged)
      const { drones: dronesData, total: totalCount } = await DroneManagementService.getDronesPage(page, rowsPerPage, statusFilter);
      console.log('Loaded drones (paged):', { page, rowsPerPage, statusFilter, totalCount });
      // Normalize and clamp coordinates to HCM radius for consistent map rendering
      const normalizedDrones = (dronesData || []).map((d: any) => {
        const cur = clampToHcmRadius(normalizePair(d.currentLat, d.currentLng));
        const home = clampToHcmRadius(normalizePair(d.homeLat, d.homeLng));
        return {
          ...d,
          currentLat: cur?.lat ?? d.currentLat,
          currentLng: cur?.lng ?? d.currentLng,
          homeLat: home?.lat ?? d.homeLat,
          homeLng: home?.lng ?? d.homeLng,
        };
      });
      setDrones(normalizedDrones);
      setTotal(totalCount || normalizedDrones.length);

      // Load fleet statistics
      loadFleetStats();

      // Load drone stations
      const stationsData = await DroneAssignmentService.getDroneStations();
      setStations(stationsData);

      // Load active assignments for tracking tab
      loadActiveAssignments();

      setError(null);
    } catch (err) {
      console.error('Error loading drone data:', err);
      setError('Không thể tải dữ liệu drone từ API. Đang sử dụng dữ liệu mẫu.');
      
      // Fallback to mock data if API fails
      const mockDrones: DroneFleet[] = [
        {
          id: 'drone-001',
          serialNumber: 'DRN-001-2024',
          model: 'FastFood Delivery Pro X1',
          status: 'IDLE',
          batteryLevel: 95,
          currentLat: 10.762622,
          currentLng: 106.660172,
          homeLat: 10.762622,
          homeLng: 106.660172,
          stationId: 'station-1',
          lastMaintenance: '2024-01-15',
          totalFlights: 245,
          flightHours: 120.5,
          maxPayload: 5,
          maxRange: 15,
          isActive: true
        },
        {
          id: 'drone-002',
          serialNumber: 'DRN-002-2024',
          model: 'FastFood Delivery Pro X1',
          status: 'DELIVERING',
          batteryLevel: 78,
          currentLat: 10.775622,
          currentLng: 106.670172,
          homeLat: 10.762622,
          homeLng: 106.660172,
          stationId: 'station-1',
          assignedOrderId: 'ORD-12345',
          lastMaintenance: '2024-01-10',
          totalFlights: 189,
          flightHours: 95.2,
          maxPayload: 5,
          maxRange: 15,
          isActive: true
        },
        {
          id: 'drone-003',
          serialNumber: 'DRN-003-2024',
          model: 'FastFood Delivery Lite',
          status: 'CHARGING',
          batteryLevel: 45,
          currentLat: 10.786785,
          currentLng: 106.700806,
          homeLat: 10.786785,
          homeLng: 106.700806,
          stationId: 'station-2',
          lastMaintenance: '2024-01-20',
          totalFlights: 156,
          flightHours: 78.3,
          maxPayload: 3,
          maxRange: 10,
          isActive: true
        }
      ];

      const mockStations: DroneStation[] = [
        {
          id: 'station-1',
          name: 'Trạm Drone Quận 1',
          location: {
            lat: 10.762622,
            lng: 106.660172
          },
          capacity: 5,
          currentDrones: 2,
          availableDrones: ['drone-001', 'drone-003'],
          coverageRadius: 5,
          status: 'active'
        },
        {
          id: 'station-2',
          name: 'Trạm Drone Quận 3',
          location: {
            lat: 10.786785,
            lng: 106.700806
          },
          capacity: 4,
          currentDrones: 2,
          availableDrones: ['drone-004', 'drone-005'],
          coverageRadius: 4,
          status: 'active'
        }
      ];

      // Also normalize mock data to ensure consistency
      const normalizedMock = mockDrones.map((d) => {
        const cur = clampToHcmRadius(normalizePair(d.currentLat, d.currentLng));
        const home = clampToHcmRadius(normalizePair(d.homeLat, d.homeLng));
        return {
          ...d,
          currentLat: cur?.lat ?? d.currentLat,
          currentLng: cur?.lng ?? d.currentLng,
          homeLat: home?.lat ?? d.homeLat,
          homeLng: home?.lng ?? d.homeLng,
        };
      });
      setDrones(normalizedMock);
      setTotal(normalizedMock.length);
      setStations(mockStations);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: 'success' | 'warning' | 'error' | 'info' | 'default' } = {
      'IDLE': 'success',
      'EN_ROUTE_TO_STORE': 'info',
      'AT_STORE': 'warning',
      'EN_ROUTE_TO_CUSTOMER': 'info',
      'DELIVERING': 'warning',
      'RETURNING': 'info',
      'CHARGING': 'warning',
      'MAINTENANCE': 'error',
      'OFFLINE': 'default'
    };
    return colors[status] || 'default';
  };

  const getBatteryIcon = (level: number) => {
    if (level > 80) return <BatteryFull color="success" />;
    if (level > 60) return <Battery80 color="success" />;
    if (level > 40) return <Battery50 color="warning" />;
    return <Battery20 color="error" />;
  };

  const getStatusIcon = (status: string) => {
    const icons: { [key: string]: React.ReactElement } = {
      'IDLE': <CheckCircle color="success" />,
      'EN_ROUTE_TO_STORE': <FlightTakeoff color="info" />,
      'AT_STORE': <LocationOn color="warning" />,
      'EN_ROUTE_TO_CUSTOMER': <Flight color="info" />,
      'DELIVERING': <Assignment color="warning" />,
      'RETURNING': <FlightLand color="info" />,
      'RETURN_TO_BASE': <FlightLand color="info" />,
      'CHARGING': <PowerSettingsNew color="warning" />,
      'MAINTENANCE': <Build color="error" />,
      'OFFLINE': <Warning color="disabled" />
    };
    return icons[status] || <Warning />;
  };

  // Bản dịch trạng thái sang tiếng Việt để hiển thị UI
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      IDLE: 'Sẵn sàng',
      ASSIGNED: 'Đã gán',
      EN_ROUTE_TO_STORE: 'Đến cửa hàng',
      AT_STORE: 'Tại cửa hàng',
      EN_ROUTE_TO_CUSTOMER: 'Đến khách hàng',
      ARRIVING: 'Sắp đến',
      DELIVERING: 'Đang giao',
      RETURNING: 'Trở về',
      RETURN_TO_BASE: 'Trở về',
      CHARGING: 'Đang sạc',
      MAINTENANCE: 'Bảo trì',
      OFFLINE: 'Ngoại tuyến',
    };
    return labels[status] || status;
  };

  const handleDroneAction = async (droneId: string, action: string) => {
    try {
      setLoading(true);
      
      switch (action) {
        case 'maintenance':
          await DroneManagementService.setDroneMaintenance(droneId);
          setSnackbar({
            open: true,
            message: 'Drone đã được đưa vào bảo trì',
            severity: 'success'
          });
          break;
          
        case 'activate':
          await DroneManagementService.activateDrone(droneId);
          setSnackbar({
            open: true,
            message: 'Drone đã được kích hoạt',
            severity: 'success'
          });
          break;
          
        case 'stop':
          const drone = drones.find(d => d.id === droneId);
          if (drone?.deliveryId) {
            await DroneManagementService.stopDelivery(drone.deliveryId);
            setSnackbar({
              open: true,
              message: 'Đã dừng delivery',
              severity: 'warning'
            });
          }
          break;
          
        case 'start':
          // This would typically trigger assignment dialog
          console.log(`Starting drone ${droneId}`);
          break;
          
        case 'return':
          await DroneManagementService.updateDroneStatus(droneId, 'RETURNING');
          setSnackbar({
            open: true,
            message: 'Drone đang trở về trạm',
            severity: 'info'
          });
          break;
          
        default:
          console.log(`Unknown action: ${action} for drone ${droneId}`);
      }
      
      // Reload data after action
      await loadDroneData();
      
    } catch (error) {
      console.error('Error performing drone action:', error);
      setSnackbar({
        open: true,
        message: 'Có lỗi xảy ra khi thực hiện hành động',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStationAction = (stationId: string, action: string) => {
    console.log(`Station ${stationId} action: ${action}`);
    // Implement station actions
  };

  const DroneFleetTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Quản Lý Fleet Drone ({drones.length} drones)
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDroneDialog(true)}
        >
          Thêm Drone
        </Button>
      </Box>

      {/* Bộ lọc trạng thái */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {['ALL','IDLE','ASSIGNED','DELIVERING','RETURNING','CHARGING','MAINTENANCE','OFFLINE'].map((st) => (
          <Chip
            key={st}
            label={st === 'ALL' ? 'Tất cả' : getStatusLabel(st)}
            color={statusFilter === st ? 'primary' : 'default'}
            onClick={() => { setStatusFilter(st); setPage(0); }}
            clickable
            size="small"
          />
        ))}
      </Box>

      <Grid container spacing={3}>
        {/* Fleet Overview Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  {fleetStats ? fleetStats.idleCount : drones.filter(d => d.status === 'IDLE').length}
                </Typography>
              </Box>
              <Typography color="text.secondary">Sẵn Sàng</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Flight color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  {fleetStats ? fleetStats.deliveringCount : drones.filter(d => d.status === 'DELIVERING').length}
                </Typography>
              </Box>
              <Typography color="text.secondary">Đang Giao</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PowerSettingsNew color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  {fleetStats ? fleetStats.chargingCount : drones.filter(d => d.status === 'CHARGING').length}
                </Typography>
              </Box>
              <Typography color="text.secondary">Đang Sạc</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Build color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  {fleetStats ? (fleetStats.maintenanceCount + fleetStats.offlineCount) : drones.filter(d => d.status === 'MAINTENANCE' || d.status === 'OFFLINE').length}
                </Typography>
              </Box>
              <Typography color="text.secondary">Bảo Trì</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Drone Table */}
        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Drone</TableCell>
                  <TableCell>Trạng Thái</TableCell>
                  <TableCell>Pin</TableCell>
                  <TableCell>Vị Trí</TableCell>
                  <TableCell>Trạm</TableCell>
                  <TableCell>Đơn Hàng</TableCell>
                  <TableCell>Thao Tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(statusFilter === 'ALL' ? drones : drones.filter(d => d.status === statusFilter)).map((drone) => (
                  <TableRow key={drone.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">{drone.serialNumber}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {drone.model}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getStatusIcon(drone.status)}
                        <Chip
                          label={getStatusLabel(drone.status)}
                          color={getStatusColor(drone.status)}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getBatteryIcon(drone.batteryLevel)}
                        <Typography sx={{ ml: 1 }}>{drone.batteryLevel}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {drone.currentLat.toFixed(4)}, {drone.currentLng.toFixed(4)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {stations.find(s => s.id === drone.stationId)?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {drone.assignedOrderId ? (
                        <Chip label={drone.assignedOrderId} size="small" color="primary" />
                      ) : (
                        <Typography color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Chi tiết">
                          <IconButton
                            size="small"
                            onClick={() => setSelectedDrone(drone)}
                          >
                            <Settings />
                          </IconButton>
                        </Tooltip>
                        {drone.status === 'IDLE' && (
                          <Tooltip title="Bắt đầu">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleDroneAction(drone.id, 'start')}
                            >
                              <PlayArrow />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(drone.status.includes('EN_ROUTE') || drone.status === 'DELIVERING') && (
                          <Tooltip title="Dừng">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDroneAction(drone.id, 'stop')}
                            >
                              <Stop />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Về trạm">
                          <IconButton
                            size="small"
                            onClick={() => handleDroneAction(drone.id, 'return')}
                          >
                            <Home />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa">
                          <IconButton
                            size="small"
                            onClick={async () => {
                              try {
                                setLoading(true);
                                await DroneManagementService.deleteDrone(drone.id);
                                setSnackbar({ open: true, message: 'Đã xóa drone', severity: 'success' });
                                await loadDroneData();
                              } catch (e) {
                                setSnackbar({ open: true, message: 'Xóa drone thất bại', severity: 'error' });
                              } finally {
                                setLoading(false);
                              }
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              labelRowsPerPage="Số dòng mỗi trang"
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  const StationManagementTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Quản Lý Trạm Drone ({stations.length} trạm)
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenStationDialog(true)}
        >
          Thêm Trạm
        </Button>
      </Box>

      <Grid container spacing={3}>
        {stations.map((station) => (
          <Grid item xs={12} md={6} key={station.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6">{station.name}</Typography>
                  <Chip
                    label={station.status}
                    color={station.status === 'active' ? 'success' : 'error'}
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Lat: {station.location.lat}, Lng: {station.location.lng}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="h4" color="primary">
                      {station.availableDrones.length}
                    </Typography>
                    <Typography variant="caption">Sẵn sàng</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h4">
                      {station.capacity}
                    </Typography>
                    <Typography variant="caption">Tổng số</Typography>
                  </Box>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={(station.availableDrones.length / station.capacity) * 100}
                  sx={{ mb: 2 }}
                />

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<Settings />}
                    onClick={() => setSelectedStation(station)}
                  >
                    Cài đặt
                  </Button>
                  <Button
                    size="small"
                    startIcon={<LocationOn />}
                    onClick={() => handleStationAction(station.id, 'view_map')}
                  >
                    Xem bản đồ
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const MapOverviewTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Tổng Quan Bản Đồ Fleet
      </Typography>
      <Box sx={{ mb: 1 }}>
        <FormControlLabel
          control={<Switch checked={exactDbMode} onChange={(e) => setExactDbMode(e.target.checked)} />}
          label="Hiển thị đúng tọa độ từ DB (không chuẩn hóa)"
        />
      </Box>
      <Paper sx={{ p: 2 }}>
        <DroneMap
          drones={drones.map(drone => ({
            id: drone.id,
            status: drone.status,
            currentLat: drone.currentLat,
            currentLng: drone.currentLng,
            batteryPct: drone.batteryLevel,
            assignedOrderId: drone.assignedOrderId
          }))}
          stations={(ENABLE_STATIONS ? stations : []).map(station => ({
            id: station.id,
            name: station.name,
            lat: station.location.lat,
            lng: station.location.lng,
            availableDrones: station.availableDrones.length,
            totalDrones: station.capacity,
            status: station.status === 'active' ? 'ACTIVE' : station.status === 'maintenance' ? 'MAINTENANCE' : 'OFFLINE'
          }))}
          height={600}
          showRoutes={false}
          exactDb={exactDbMode}
          onDroneClick={(droneId: string) => {
            const drone = drones.find(d => d.id === droneId);
            if (drone) setSelectedDrone(drone);
          }}
          onStationClick={(stationId: string) => {
            const station = stations.find(s => s.id === stationId);
            if (station) setSelectedStation(station);
          }}
        />
      </Paper>
    </Box>
  );

  const AutoAssignTrackingTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Theo Dõi Drone Auto-Assign
      </Typography>
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Drone</TableCell>
                <TableCell>Serial</TableCell>
                <TableCell>Đơn Hàng</TableCell>
                <TableCell>Chế Độ</TableCell>
                <TableCell>Thời Gian Gán</TableCell>
                <TableCell>Trạng Thái Giao</TableCell>
                <TableCell>ETA (phút)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeAssignments.map(a => (
                <TableRow key={a.id}>
                  <TableCell>{a.droneId}</TableCell>
                  <TableCell>{a.droneSerialNumber}</TableCell>
                  <TableCell>
                    {a.orderId ? <Chip label={a.orderId} size="small" color="primary" /> : '-'}
                  </TableCell>
                  <TableCell>{a.assignmentMode}</TableCell>
                  <TableCell>{new Date(a.assignedAt).toLocaleString()}</TableCell>
                  <TableCell>{a.deliveryStatus || '-'}</TableCell>
                  <TableCell>{a.etaSeconds ? Math.round(a.etaSeconds/60) : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );

  // When selectedDrone changes, if it has a deliveryId fetch the delivery tracking route
  useEffect(() => {
    let mounted = true;
    const loadRoute = async () => {
      if (!selectedDrone || !selectedDrone.deliveryId) {
        if (mounted) setSelectedDroneRoute(null);
        return;
      }

      try {
        setLoading(true);
        const tracking = await DroneManagementService.getDeliveryTracking(selectedDrone.deliveryId);
        const waypoints = tracking?.waypoints?.map((w: any) => {
          const p = clampToHcmRadius(normalizePair(w.lat, w.lng));
          return { lat: p?.lat ?? w.lat, lng: p?.lng ?? w.lng, type: w.type };
        }) || [];
        if (mounted) setSelectedDroneRoute(waypoints);
      } catch (err) {
        console.warn('Failed to load delivery tracking for drone', selectedDrone.id, err);
        if (mounted) setSelectedDroneRoute(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadRoute();
    return () => { mounted = false; };
  }, [selectedDrone]);

  // Subscribe to real-time updates for selectedDrone
  useEffect(() => {
    if (!isConnected || !selectedDrone || !subscribe) return;

    const subs: any[] = [];

    // GPS updates
    const gpsSub = subscribe('/topic/drone/gps', (update: any) => {
      try {
        // update may contain { droneId, deliveryId, latitude, longitude, batteryLevel }
        if (!update) return;
        const matches = update.droneId === selectedDrone.id || (selectedDrone.deliveryId && update.deliveryId === selectedDrone.deliveryId);
        if (matches) {
          const fixed = clampToHcmRadius(normalizePair(update.latitude, update.longitude));
          const lat = fixed?.lat ?? update.latitude;
          const lng = fixed?.lng ?? update.longitude;
          // update drones array and selectedDrone
          setDrones(prev => prev.map(d => d.id === update.droneId ? { ...d, currentLat: lat ?? d.currentLat, currentLng: lng ?? d.currentLng, batteryLevel: update.batteryLevel ?? d.batteryLevel } : d));
          setSelectedDrone(prev => prev && prev.id === update.droneId ? { ...prev, currentLat: lat ?? prev.currentLat, currentLng: lng ?? prev.currentLng, batteryLevel: update.batteryLevel ?? prev.batteryLevel } : prev);
        }
      } catch (e) {
        console.warn('Error handling GPS update', e);
      }
    });
    if (gpsSub) subs.push(gpsSub);

    // State/Status updates
    const stateSub = subscribe('/topic/drone/state', (change: any) => {
      try {
        if (!change) return;
        if (change.droneId === selectedDrone.id) {
          setDrones(prev => prev.map(d => d.id === change.droneId ? { ...d, status: change.newStatus } : d));
          setSelectedDrone(prev => prev && prev.id === change.droneId ? { ...prev, status: change.newStatus } : prev);
        }
      } catch (e) {
        console.warn('Error handling state update', e);
      }
    });
    if (stateSub) subs.push(stateSub);

    // Delivery ETA or route updates (optional) - subscribe if topic exists
    const etaSub = subscribe('/topic/delivery/eta', (eta: any) => {
      try {
        if (!eta) return;
        if (eta.deliveryId && selectedDrone.deliveryId && eta.deliveryId === selectedDrone.deliveryId) {
          // if server sends waypoints, update
          if (eta.waypoints && Array.isArray(eta.waypoints)) {
            const waypoints = eta.waypoints.map((w: any) => ({ lat: w.lat, lng: w.lng, type: w.type }));
            setSelectedDroneRoute(waypoints);
          }
        }
      } catch (e) {
        console.warn('Error handling ETA update', e);
      }
    });
    if (etaSub) subs.push(etaSub);

    return () => {
      subs.forEach(s => unsubscribe && unsubscribe(s));
    };
  }, [isConnected, selectedDrone, subscribe, unsubscribe]);

  // Create new drone handler
  const handleCreateDrone = async () => {
    try {
      setCreatingDrone(true);
      if (!newDrone.serialNumber || !newDrone.model) {
        setSnackbar({ open: true, message: 'Vui lòng nhập serial và model', severity: 'warning' });
        return;
      }

      const created = await DroneManagementService.createDrone(newDrone as any);
      setSnackbar({ open: true, message: 'Tạo drone thành công', severity: 'success' });
      setOpenDroneDialog(false);
      try {
        await loadDroneData();
      } catch (e) {
        setDrones(prev => [created as any, ...prev]);
      }
    } catch (err) {
      console.error('Create drone error:', err);
      // If create fails (backend/offline), add an optimistic local drone so user can see it on map.
      const timestamp = Date.now();
      const localId = `local-${timestamp}`;
      const lat = Number(newDrone.homeLat ?? 10.77653);
      const lng = Number(newDrone.homeLng ?? 106.700981);
      const localDrone: DroneFleet = {
        id: localId,
        serialNumber: newDrone.serialNumber || `LOCAL-${timestamp}`,
        model: newDrone.model || 'Unknown',
        status: 'IDLE',
        batteryLevel: 100,
        currentLat: lat,
        currentLng: lng,
        homeLat: Number(newDrone.homeLat ?? lat),
        homeLng: Number(newDrone.homeLng ?? lng),
        maxPayload: Number(newDrone.maxPayload ?? 0),
        maxRange: Number(newDrone.maxRange ?? 0),
        isActive: !!newDrone.isActive,
        totalFlights: 0,
        flightHours: 0
      } as DroneFleet;

      setDrones(prev => [localDrone, ...prev]);
      setSnackbar({ open: true, message: 'Không gửi được lên server — đã thêm drone cục bộ để thử nghiệm', severity: 'warning' });
      setOpenDroneDialog(false);
    } finally {
      setCreatingDrone(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Quản Lý Drone Fleet
        </Typography>
        <Box>
          {/* Ẩn button Gán Drone Tự Động cho demo */}
          {/* <Button
            variant="contained"
            startIcon={<Assignment />}
            onClick={openAssignmentDialog}
            sx={{ mr: 2 }}
            color="primary"
          >
            Gán Drone Tự Động
          </Button> */}
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadDroneData}
            sx={{ mr: 2 }}
            disabled={loading}
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Settings />}
            onClick={() => setConfigDialogOpen(true)}
          >
            Cấu hình
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        {(() => {
          const tabs = [
            { label: 'Fleet Drone', render: <DroneFleetTab /> },
            { label: 'Đơn chờ gán', render: <PendingOrdersTab /> },
            ...(ENABLE_STATIONS ? [{ label: 'Trạm Drone', render: <StationManagementTab /> }] : []),
            { label: 'Bản Đồ Tổng Quan', render: <MapOverviewTab /> },
            { label: 'Theo Dõi Auto-Assign', render: <AutoAssignTrackingTab /> }
          ];
          return (
            <>
              <Tabs
                value={Math.min(tabValue, tabs.length - 1)}
                onChange={(_, newValue) => setTabValue(newValue)}
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                {tabs.map((t, idx) => (
                  <Tab key={t.label} label={t.label} />
                ))}
              </Tabs>
              <Box sx={{ p: 3 }}>
                {tabs[Math.min(tabValue, tabs.length - 1)].render}
              </Box>
            </>
          );
        })()}
      </Paper>

      {/* Drone Detail Dialog */}
      <Dialog
        open={!!selectedDrone}
        onClose={() => setSelectedDrone(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedDrone && (
          <>
            <DialogTitle>
              Chi Tiết Drone: {selectedDrone.serialNumber}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Thông Tin Cơ Bản</Typography>
                  {isEditingDrone ? (
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1 }}>
                      <TextField label="Serial" value={editDroneForm.serialNumber || ''} onChange={(e) => setEditDroneForm({ ...editDroneForm, serialNumber: e.target.value })} />
                      <TextField label="Model" value={editDroneForm.model || ''} onChange={(e) => setEditDroneForm({ ...editDroneForm, model: e.target.value })} />
                      <TextField label="Pin (%)" type="number" value={editDroneForm.batteryLevel ?? selectedDrone.batteryLevel} onChange={(e) => setEditDroneForm({ ...editDroneForm, batteryLevel: Number(e.target.value) })} />
                      <TextField label="Tải trọng tối đa (kg)" type="number" value={editDroneForm.maxPayload ?? selectedDrone.maxPayload} onChange={(e) => setEditDroneForm({ ...editDroneForm, maxPayload: Number(e.target.value) })} />
                      <TextField label="Tầm bay (km)" type="number" value={editDroneForm.maxRange ?? selectedDrone.maxRange} onChange={(e) => setEditDroneForm({ ...editDroneForm, maxRange: Number(e.target.value) })} />
                    </Box>
                  ) : (
                    <>
                      <Typography>Model: {selectedDrone.model}</Typography>
                      <Typography>Trạng thái: {selectedDrone.status}</Typography>
                      <Typography>Pin: {selectedDrone.batteryLevel}%</Typography>
                      <Typography>Tải trọng tối đa: {selectedDrone.maxPayload}kg</Typography>
                      <Typography>Tầm bay: {selectedDrone.maxRange}km</Typography>
                    </>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Thống Kê</Typography>
                  {isEditingDrone ? (
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1 }}>
                      <TextField label="Home Lat" type="number" value={editDroneForm.homeLat ?? selectedDrone.homeLat} onChange={(e) => setEditDroneForm({ ...editDroneForm, homeLat: Number(e.target.value) })} />
                      <TextField label="Home Lng" type="number" value={editDroneForm.homeLng ?? selectedDrone.homeLng} onChange={(e) => setEditDroneForm({ ...editDroneForm, homeLng: Number(e.target.value) })} />
                      <TextField label="Vị trí Lat" type="number" value={editDroneForm.currentLat ?? selectedDrone.currentLat} onChange={(e) => setEditDroneForm({ ...editDroneForm, currentLat: Number(e.target.value) })} />
                      <TextField label="Vị trí Lng" type="number" value={editDroneForm.currentLng ?? selectedDrone.currentLng} onChange={(e) => setEditDroneForm({ ...editDroneForm, currentLng: Number(e.target.value) })} />
                    </Box>
                  ) : (
                    <>
                      <Typography>Tổng chuyến bay: {selectedDrone.totalFlights}</Typography>
                      <Typography>Giờ bay: {selectedDrone.flightHours}h</Typography>
                      <Typography>Bảo trì cuối: {selectedDrone.lastMaintenance}</Typography>
                      <Typography>Vị trí: {selectedDrone.currentLat?.toFixed(4)}, {selectedDrone.currentLng?.toFixed(4)}</Typography>
                    </>
                  )}
                </Grid>
              </Grid>

              {/* If drone is delivering, load and show route */}
              <Box sx={{ mt: 2 }}>
                {selectedDrone.deliveryId ? (
                  <>
                    <Typography variant="h6">Đang giao đơn: {selectedDrone.assignedOrderId}</Typography>
                    <Box sx={{ mb: 1 }}>
                      <FormControlLabel
                        control={<Switch checked={exactDbMode} onChange={(e) => setExactDbMode(e.target.checked)} />}
                        label="Hiển thị đúng tọa độ từ DB (không chuẩn hóa)"
                      />
                    </Box>
                    <DroneMap
                      drones={[{
                        id: selectedDrone.id,
                        status: selectedDrone.status,
                        currentLat: selectedDrone.currentLat,
                        currentLng: selectedDrone.currentLng,
                        batteryPct: selectedDrone.batteryLevel,
                        assignedOrderId: selectedDrone.assignedOrderId
                      }]}
                      stations={stations.map(s => ({ id: s.id, name: s.name, lat: s.location.lat, lng: s.location.lng, availableDrones: s.availableDrones.length, totalDrones: s.capacity, status: s.status === 'active' ? 'ACTIVE' : 'OFFLINE' }))}
                      height={300}
                      showRoutes={true}
                      selectedDroneId={selectedDrone.id}
                      route={selectedDroneRoute || undefined}
                      exactDb={exactDbMode}
                      onDroneClick={() => {}}
                    />
                  </>
                ) : (
                  <Alert severity="info" sx={{ mt: 2 }}>Drone không đang giao đơn</Alert>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedDrone(null)}>Đóng</Button>
              {!isEditingDrone && (
                <Button startIcon={<Edit />} onClick={() => {
                  setIsEditingDrone(true);
                  setEditDroneForm({
                    serialNumber: selectedDrone.serialNumber,
                    model: selectedDrone.model,
                    batteryLevel: selectedDrone.batteryLevel,
                    maxPayload: selectedDrone.maxPayload,
                    maxRange: selectedDrone.maxRange,
                    homeLat: selectedDrone.homeLat,
                    homeLng: selectedDrone.homeLng,
                    currentLat: selectedDrone.currentLat,
                    currentLng: selectedDrone.currentLng,
                    isActive: selectedDrone.isActive
                  });
                }}>Sửa</Button>
              )}
              {isEditingDrone && (
                <Button startIcon={<Save />} variant="contained" onClick={async () => {
                  try {
                    setLoading(true);
                    const updated = await DroneManagementService.updateDrone(selectedDrone.id, editDroneForm);
                    setSelectedDrone({ ...selectedDrone, ...updated } as any);
                    setDrones(prev => prev.map(d => d.id === selectedDrone.id ? { ...d, ...updated } as any : d));
                    setSnackbar({ open: true, message: 'Cập nhật drone thành công', severity: 'success' });
                    setIsEditingDrone(false);
                  } catch (e) {
                    setSnackbar({ open: true, message: 'Cập nhật drone thất bại', severity: 'error' });
                  } finally {
                    setLoading(false);
                  }
                }}>Lưu</Button>
              )}
              <Button color="error" startIcon={<Delete />} onClick={async () => {
                if (!selectedDrone) return;
                try {
                  setLoading(true);
                  await DroneManagementService.deleteDrone(selectedDrone.id);
                  setSnackbar({ open: true, message: 'Đã xóa drone', severity: 'success' });
                  setSelectedDrone(null);
                  await loadDroneData();
                } catch (e) {
                  setSnackbar({ open: true, message: 'Xóa drone thất bại', severity: 'error' });
                } finally {
                  setLoading(false);
                }
              }}>Xóa</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Station Detail Dialog */}
      <Dialog
        open={!!selectedStation}
        onClose={() => setSelectedStation(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedStation && (
          <>
            <DialogTitle>
              Chi Tiết Trạm: {selectedStation.name}
            </DialogTitle>
            <DialogContent>
              <Typography>Tọa độ: {selectedStation.location.lat}, {selectedStation.location.lng}</Typography>
              <Typography>Tổng drone: {selectedStation.capacity}</Typography>
              <Typography>Drone sẵn sàng: {selectedStation.availableDrones.length}</Typography>
              <Typography>Trạng thái: {selectedStation.status}</Typography>
              <Typography>Bán kính phủ sóng: {selectedStation.coverageRadius} km</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedStation(null)}>Đóng</Button>
              <Button variant="contained">Cập Nhật</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

        {/* Auto Assignment Dialog */}
        <Dialog open={assignmentDialogOpen} onClose={() => setAssignmentDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Gán Drone Tự Động</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Thông tin đơn hàng
              </Typography>
              {assignmentRequest && (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Mã đơn hàng"
                      value={assignmentRequest.orderId}
                      disabled
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Trọng lượng (g)"
                      value={assignmentRequest.estimatedWeight}
                      disabled
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Vị trí cửa hàng"
                      value={`${assignmentRequest.storeLocation.lat}, ${assignmentRequest.storeLocation.lng}`}
                      disabled
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Vị trí khách hàng"
                      value={`${assignmentRequest.customerLocation.lat}, ${assignmentRequest.customerLocation.lng}`}
                      disabled
                    />
                  </Grid>
                </Grid>
              )}
              
              {ENABLE_STATIONS && (
                <>
                  <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                    Trạm drone khả dụng
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Tên trạm</TableCell>
                          <TableCell>Vị trí</TableCell>
                          <TableCell>Drone khả dụng</TableCell>
                          <TableCell>Bán kính (km)</TableCell>
                          <TableCell>Trạng thái</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {droneStations.map((station) => (
                          <TableRow key={station.id}>
                            <TableCell>{station.name}</TableCell>
                            <TableCell>{`${station.location.lat.toFixed(4)}, ${station.location.lng.toFixed(4)}`}</TableCell>
                            <TableCell>{station.availableDrones.length}/{station.capacity}</TableCell>
                            <TableCell>{station.coverageRadius}</TableCell>
                            <TableCell>
                              <Chip 
                                label={station.status} 
                                color={station.status === 'active' ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssignmentDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleAutoAssignment} 
              variant="contained"
              disabled={loading}
              startIcon={<CheckCircle />}
            >
              {loading ? 'Đang xử lý...' : 'Gán Drone'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

      {/* Add Drone Dialog */}
      <Dialog open={openDroneDialog} onClose={() => setOpenDroneDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Thêm Drone Mới</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Serial Number"
                fullWidth
                value={newDrone.serialNumber || ''}
                onChange={(e) => setNewDrone({ ...newDrone, serialNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Model"
                fullWidth
                value={newDrone.model || ''}
                onChange={(e) => setNewDrone({ ...newDrone, model: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Max Payload (kg)"
                type="number"
                fullWidth
                value={newDrone.maxPayload ?? 0}
                onChange={(e) => setNewDrone({ ...newDrone, maxPayload: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Max Range (km)"
                type="number"
                fullWidth
                value={newDrone.maxRange ?? 0}
                onChange={(e) => setNewDrone({ ...newDrone, maxRange: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Home Lat"
                type="number"
                fullWidth
                value={newDrone.homeLat ?? 0}
                onChange={(e) => setNewDrone({ ...newDrone, homeLat: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Home Lng"
                type="number"
                fullWidth
                value={newDrone.homeLng ?? 0}
                onChange={(e) => setNewDrone({ ...newDrone, homeLng: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={!!newDrone.isActive} onChange={(e) => setNewDrone({ ...newDrone, isActive: e.target.checked })} />}
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDroneDialog(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreateDrone} disabled={creatingDrone}>{creatingDrone ? 'Đang tạo...' : 'Tạo Drone'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DroneManagement;
