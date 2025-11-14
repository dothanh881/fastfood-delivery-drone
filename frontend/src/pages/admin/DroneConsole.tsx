import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  IconButton,
  Stack,
  Alert,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
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
  Speed,
  Height,
  Thermostat,
  Air,
  Visibility,
  ReportProblem,
  PlayArrow,
  Stop,
  Home,
  Navigation,
  MyLocation,
  Settings
} from '@mui/icons-material';

// Drone status types
type DroneStatus = 'IDLE' | 'TAKEOFF' | 'FLYING' | 'DELIVERING' | 'RETURNING' | 'LANDING' | 'CHARGING' | 'MAINTENANCE' | 'EMERGENCY';

// Weather condition
type WeatherCondition = 'CLEAR' | 'CLOUDY' | 'RAINY' | 'WINDY';

// Drone interface
interface Drone {
  id: string;
  name: string;
  model: string;
  status: DroneStatus;
  battery: number;
  location: {
    lat: number;
    lng: number;
    altitude: number;
  };
  speed: number; // km/h
  maxSpeed: number;
  range: number; // km
  maxRange: number;
  temperature: number; // °C
  flightTime: number; // minutes
  totalFlights: number;
  orderId?: string;
  orderDestination?: string;
  eta?: number; // minutes
  signal: number; // percentage
  lastMaintenance: string;
  nextMaintenance: number; // flights remaining
}

// Mock weather data
interface Weather {
  condition: WeatherCondition;
  temperature: number;
  windSpeed: number;
  visibility: number; // km
  humidity: number; // percentage
}

// Mock drones data
const MOCK_DRONES: Drone[] = [
  {
    id: 'DRN-001',
    name: 'Falcon Alpha',
    model: 'DJI Delivery Pro',
    status: 'DELIVERING',
    battery: 85,
    location: { lat: 10.7769, lng: 106.7009, altitude: 120 },
    speed: 45,
    maxSpeed: 60,
    range: 8,
    maxRange: 15,
    temperature: 35,
    flightTime: 12,
    totalFlights: 247,
    orderId: 'ORD-2025-001',
    orderDestination: '123 Lê Lợi, Q1',
    eta: 5,
    signal: 98,
    lastMaintenance: '2025-10-15',
    nextMaintenance: 53
  },
  {
    id: 'DRN-002',
    name: 'Eagle Beta',
    model: 'DJI Delivery Pro',
    status: 'RETURNING',
    battery: 45,
    location: { lat: 10.7850, lng: 106.7100, altitude: 100 },
    speed: 50,
    maxSpeed: 60,
    range: 3,
    maxRange: 15,
    temperature: 38,
    flightTime: 18,
    totalFlights: 189,
    orderId: 'ORD-2025-002',
    orderDestination: '456 Nguyễn Huệ, Q1',
    eta: 3,
    signal: 95,
    lastMaintenance: '2025-10-18',
    nextMaintenance: 11
  },
  {
    id: 'DRN-003',
    name: 'Hawk Gamma',
    model: 'DJI Delivery Lite',
    status: 'CHARGING',
    battery: 65,
    location: { lat: 10.7729, lng: 106.6989, altitude: 0 },
    speed: 0,
    maxSpeed: 50,
    range: 0,
    maxRange: 12,
    temperature: 28,
    flightTime: 0,
    totalFlights: 312,
    signal: 100,
    lastMaintenance: '2025-10-10',
    nextMaintenance: 88
  },
  {
    id: 'DRN-004',
    name: 'Swift Delta',
    model: 'DJI Delivery Pro',
    status: 'IDLE',
    battery: 100,
    location: { lat: 10.7729, lng: 106.6989, altitude: 0 },
    speed: 0,
    maxSpeed: 60,
    range: 0,
    maxRange: 15,
    temperature: 26,
    flightTime: 0,
    totalFlights: 156,
    signal: 100,
    lastMaintenance: '2025-10-19',
    nextMaintenance: 44
  },
  {
    id: 'DRN-005',
    name: 'Phoenix Epsilon',
    model: 'DJI Delivery Pro',
    status: 'MAINTENANCE',
    battery: 0,
    location: { lat: 10.7729, lng: 106.6989, altitude: 0 },
    speed: 0,
    maxSpeed: 60,
    range: 0,
    maxRange: 15,
    temperature: 24,
    flightTime: 0,
    totalFlights: 423,
    signal: 0,
    lastMaintenance: '2025-10-20',
    nextMaintenance: 100
  },
  {
    id: 'DRN-006',
    name: 'Sparrow Zeta',
    model: 'DJI Delivery Lite',
    status: 'FLYING',
    battery: 92,
    location: { lat: 10.7800, lng: 106.7050, altitude: 150 },
    speed: 48,
    maxSpeed: 50,
    range: 5,
    maxRange: 12,
    temperature: 36,
    flightTime: 8,
    totalFlights: 201,
    orderId: 'ORD-2025-003',
    orderDestination: '789 Pasteur, Q3',
    eta: 7,
    signal: 97,
    lastMaintenance: '2025-10-17',
    nextMaintenance: 99
  }
];

const MOCK_WEATHER: Weather = {
  condition: 'CLEAR',
  temperature: 32,
  windSpeed: 15,
  visibility: 10,
  humidity: 65
};

const DroneConsole: React.FC = () => {
  const [drones, setDrones] = useState<Drone[]>(MOCK_DRONES);
  const [weather, setWeather] = useState<Weather>(MOCK_WEATHER);
  const [selectedDrone, setSelectedDrone] = useState<Drone | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Status configuration
  const statusConfig: Record<DroneStatus, { label: string; color: any; icon: any }> = {
    IDLE: { label: 'Idle', color: 'default', icon: <Flight /> },
    TAKEOFF: { label: 'Taking Off', color: 'info', icon: <FlightTakeoff /> },
    FLYING: { label: 'Flying', color: 'primary', icon: <Flight /> },
    DELIVERING: { label: 'Delivering', color: 'warning', icon: <Navigation /> },
    RETURNING: { label: 'Returning', color: 'info', icon: <Home /> },
    LANDING: { label: 'Landing', color: 'info', icon: <FlightLand /> },
    CHARGING: { label: 'Charging', color: 'success', icon: <BatteryFull /> },
    MAINTENANCE: { label: 'Maintenance', color: 'error', icon: <Settings /> },
    EMERGENCY: { label: 'Emergency', color: 'error', icon: <ReportProblem /> }
  };

  // Weather configuration
  const weatherConfig: Record<WeatherCondition, { label: string; icon: string; color: string }> = {
    CLEAR: { label: 'Clear', icon: '☀️', color: '#FDB813' },
    CLOUDY: { label: 'Cloudy', icon: '☁️', color: '#95A5A6' },
    RAINY: { label: 'Rainy', icon: '🌧️', color: '#3498DB' },
    WINDY: { label: 'Windy', icon: '💨', color: '#7F8C8D' }
  };

  // Calculate statistics
  const stats = {
    total: drones.length,
    active: drones.filter(d => ['FLYING', 'DELIVERING', 'RETURNING', 'TAKEOFF', 'LANDING'].includes(d.status)).length,
    idle: drones.filter(d => d.status === 'IDLE').length,
    charging: drones.filter(d => d.status === 'CHARGING').length,
    maintenance: drones.filter(d => d.status === 'MAINTENANCE').length,
    avgBattery: Math.round(drones.reduce((sum, d) => sum + d.battery, 0) / drones.length),
    totalFlights: drones.reduce((sum, d) => sum + d.totalFlights, 0)
  };

  // Auto-refresh simulation
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setDrones(prevDrones =>
        prevDrones.map(drone => {
          // Simulate battery drain for active drones
          let newBattery = drone.battery;
          if (['FLYING', 'DELIVERING', 'RETURNING'].includes(drone.status)) {
            newBattery = Math.max(0, drone.battery - 1);
          }
          // Simulate charging
          if (drone.status === 'CHARGING') {
            newBattery = Math.min(100, drone.battery + 5);
          }

          // Simulate ETA countdown
          let newEta = drone.eta;
          if (drone.eta && drone.eta > 0) {
            newEta = Math.max(0, drone.eta - 1);
          }

          return {
            ...drone,
            battery: newBattery,
            eta: newEta,
            flightTime: ['FLYING', 'DELIVERING', 'RETURNING'].includes(drone.status)
              ? drone.flightTime + 1
              : drone.flightTime
          };
        })
      );
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleViewDetails = (drone: Drone) => {
    setSelectedDrone(drone);
    setDetailDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDetailDialogOpen(false);
    setSelectedDrone(null);
  };

  const handleDroneAction = (droneId: string, action: string) => {
    const drone = drones.find(d => d.id === droneId);
    if (!drone) return;

    let newStatus: DroneStatus = drone.status;
    let message = '';

    switch (action) {
      case 'deploy':
        newStatus = 'TAKEOFF';
        message = `${drone.name} is taking off`;
        break;
      case 'recall':
        newStatus = 'RETURNING';
        message = `${drone.name} is returning to base`;
        break;
      case 'emergency':
        newStatus = 'EMERGENCY';
        message = `${drone.name} emergency landing initiated`;
        break;
      case 'charge':
        newStatus = 'CHARGING';
        message = `${drone.name} started charging`;
        break;
      default:
        return;
    }

    setDrones(prevDrones =>
      prevDrones.map(d => (d.id === droneId ? { ...d, status: newStatus } : d))
    );

    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const getBatteryIcon = (battery: number) => {
    if (battery >= 80) return <BatteryFull />;
    if (battery >= 50) return <Battery80 />;
    if (battery >= 20) return <Battery50 />;
    return <Battery20 />;
  };

  const getBatteryColor = (battery: number): 'success' | 'warning' | 'error' => {
    if (battery >= 50) return 'success';
    if (battery >= 20) return 'warning';
    return 'error';
  };

  const formatLocation = (lat: number, lng: number): string => {
    return `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
  };

  const isFlightSafe = (): boolean => {
    return weather.windSpeed < 40 && weather.visibility > 5 && weather.condition !== 'RAINY';
  };

  // Render drone card
  const renderDroneCard = (drone: Drone) => {
    const config = statusConfig[drone.status];
    const isActive = ['FLYING', 'DELIVERING', 'RETURNING', 'TAKEOFF', 'LANDING'].includes(drone.status);

    return (
      <Card
        key={drone.id}
        sx={{
          position: 'relative',
          overflow: 'visible',
          '&:hover': {
            boxShadow: 6,
            transform: 'translateY(-4px)',
            transition: 'all 0.3s'
          }
        }}
      >
        <CardContent>
          {/* Status Badge */}
          <Box sx={{ position: 'absolute', top: -10, right: 10 }}>
            <Chip
              label={config.label}
              color={config.color}
              icon={config.icon}
              size="small"
            />
          </Box>

          {/* Drone Avatar */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 1 }}>
            <Avatar
              sx={{
                width: 60,
                height: 60,
                bgcolor: config.color + '.main',
                mr: 2
              }}
            >
              {config.icon}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                {drone.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {drone.id} • {drone.model}
              </Typography>
            </Box>
          </Box>

          {/* Battery & Signal */}
          <Grid container spacing={1} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Paper sx={{ p: 1, bgcolor: 'grey.50', textAlign: 'center' }}>
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                  {getBatteryIcon(drone.battery)}
                  <Typography variant="h6" fontWeight="bold" color={getBatteryColor(drone.battery) + '.main'}>
                    {drone.battery}%
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">Battery</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper sx={{ p: 1, bgcolor: 'grey.50', textAlign: 'center' }}>
                <Typography variant="h6" fontWeight="bold" color="primary.main">
                  {drone.signal}%
                </Typography>
                <Typography variant="caption" color="text.secondary">Signal</Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Flight Info */}
          {isActive && (
            <Box sx={{ mb: 2 }}>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Speed fontSize="small" color="action" />
                    <Typography variant="body2">Speed:</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="bold">
                    {drone.speed} km/h
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Height fontSize="small" color="action" />
                    <Typography variant="body2">Altitude:</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="bold">
                    {drone.location.altitude}m
                  </Typography>
                </Box>
                {drone.orderId && (
                  <>
                    <Divider />
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="primary">Order:</Typography>
                      <Typography variant="body2" fontWeight="bold">{drone.orderId}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2">ETA:</Typography>
                      <Typography variant="body2" fontWeight="bold" color="warning.main">
                        {drone.eta} min
                      </Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </Box>
          )}

          {/* Maintenance Warning */}
          {drone.nextMaintenance < 20 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="caption">
                Maintenance in {drone.nextMaintenance} flights
              </Typography>
            </Alert>
          )}

          {/* Action Buttons */}
          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              size="small"
              variant="outlined"
              onClick={() => handleViewDetails(drone)}
            >
              Details
            </Button>
            {drone.status === 'IDLE' && (
              <Tooltip title="Deploy Drone">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleDroneAction(drone.id, 'deploy')}
                >
                  <PlayArrow />
                </IconButton>
              </Tooltip>
            )}
            {isActive && (
              <Tooltip title="Recall to Base">
                <IconButton
                  size="small"
                  color="warning"
                  onClick={() => handleDroneAction(drone.id, 'recall')}
                >
                  <Home />
                </IconButton>
              </Tooltip>
            )}
            {isActive && (
              <Tooltip title="Emergency Land">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDroneAction(drone.id, 'emergency')}
                  >
                    <ReportProblem />
                  </IconButton>
                </Tooltip>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Drone Console
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time drone monitoring & control system
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                color="primary"
              />
            }
            label="Auto Refresh"
          />
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => setDrones([...MOCK_DRONES])}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {/* Success Alert */}
      {showSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setShowSuccess(false)}>
          {successMessage}
        </Alert>
      )}

      {/* Weather Alert */}
      {!isFlightSafe() && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Weather Warning:</strong> Current weather conditions may affect flight safety.
        </Alert>
      )}

      {/* Statistics & Weather */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Stats */}
        <Grid item xs={12} sm={6} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" fontWeight="bold" color="primary.main">
              {stats.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">Total Drones</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
            <Typography variant="h3" fontWeight="bold" color="success.dark">
              {stats.active}
            </Typography>
            <Typography variant="body2" color="text.secondary">Active</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.100' }}>
            <Typography variant="h3" fontWeight="bold">
              {stats.idle}
            </Typography>
            <Typography variant="body2" color="text.secondary">Idle</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light' }}>
            <Typography variant="h3" fontWeight="bold" color="info.dark">
              {stats.charging}
            </Typography>
            <Typography variant="body2" color="text.secondary">Charging</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
            <Typography variant="h3" fontWeight="bold" color="warning.dark">
              {stats.avgBattery}%
            </Typography>
            <Typography variant="body2" color="text.secondary">Avg Battery</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" fontWeight="bold" color="primary.main">
              {stats.totalFlights}
            </Typography>
            <Typography variant="body2" color="text.secondary">Total Flights</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Weather Panel */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: weatherConfig[weather.condition].color, color: 'white' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Typography variant="h2">{weatherConfig[weather.condition].icon}</Typography>
          </Grid>
          <Grid item xs>
            <Typography variant="h6" fontWeight="bold">
              {weatherConfig[weather.condition].label} Weather
            </Typography>
            <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Thermostat />
                <Typography variant="body2">{weather.temperature}°C</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Air />
                <Typography variant="body2">{weather.windSpeed} km/h</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Visibility />
                <Typography variant="body2">{weather.visibility} km</Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item>
            <Chip
              label={isFlightSafe() ? 'Flight Safe' : 'Flight Restricted'}
              color={isFlightSafe() ? 'success' : 'error'}
              icon={isFlightSafe() ? <CheckCircle /> : <Warning />}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Drones Grid */}
      <Grid container spacing={2}>
        {drones.map(drone => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={drone.id}>
            {renderDroneCard(drone)}
          </Grid>
        ))}
      </Grid>

      {/* Drone Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">{selectedDrone?.name} - Details</Typography>
            <Chip
              label={selectedDrone ? statusConfig[selectedDrone.status].label : ''}
              color={selectedDrone ? statusConfig[selectedDrone.status].color : 'default'}
              icon={selectedDrone ? statusConfig[selectedDrone.status].icon : undefined}
            />
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {selectedDrone && (
            <Grid container spacing={3}>
              {/* Technical Specs */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Technical Specifications
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Drone ID" secondary={selectedDrone.id} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Model" secondary={selectedDrone.model} />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Battery"
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={selectedDrone.battery}
                            color={getBatteryColor(selectedDrone.battery)}
                            sx={{ flex: 1, height: 8, borderRadius: 1 }}
                          />
                          <Typography variant="body2">{selectedDrone.battery}%</Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Speed"
                      secondary={`${selectedDrone.speed} / ${selectedDrone.maxSpeed} km/h`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Range"
                      secondary={`${selectedDrone.range} / ${selectedDrone.maxRange} km`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Temperature" secondary={`${selectedDrone.temperature}°C`} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Signal Strength" secondary={`${selectedDrone.signal}%`} />
                  </ListItem>
                </List>
              </Grid>

              {/* Flight Info */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Flight Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Location"
                      secondary={formatLocation(selectedDrone.location.lat, selectedDrone.location.lng)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Altitude" secondary={`${selectedDrone.location.altitude}m`} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Flight Time" secondary={`${selectedDrone.flightTime} minutes`} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Total Flights" secondary={selectedDrone.totalFlights} />
                  </ListItem>
                  {selectedDrone.orderId && (
                    <>
                      <ListItem>
                        <ListItemText primary="Current Order" secondary={selectedDrone.orderId} />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Destination" secondary={selectedDrone.orderDestination} />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="ETA" secondary={`${selectedDrone.eta} minutes`} />
                      </ListItem>
                    </>
                  )}
                </List>
              </Grid>

              {/* Maintenance Info */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Maintenance Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Last Maintenance" secondary={selectedDrone.lastMaintenance} />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Next Maintenance"
                      secondary={`In ${selectedDrone.nextMaintenance} flights`}
                    />
                  </ListItem>
                </List>
                {selectedDrone.nextMaintenance < 20 && (
                  <Alert severity="warning">
                    This drone requires maintenance soon!
                  </Alert>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          {selectedDrone?.status === 'IDLE' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrow />}
              onClick={() => {
                handleDroneAction(selectedDrone.id, 'deploy');
                handleCloseDialog();
              }}
            >
              Deploy
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DroneConsole;
