import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Pane } from 'react-leaflet';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { GpsFixed } from '@mui/icons-material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const droneIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2343/2343627.png',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const customerIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

interface LocationPoint {
  lat: number;
  lng: number;
}

interface TrackingMapProps {
  orderId?: string;
  customerLocation?: LocationPoint;
  droneLocation?: LocationPoint;
  height?: number;
  onArrived?: () => void; // gọi khi drone tới W2
  simulate?: boolean; // bật mô phỏng chuyển động (mặc định tắt)
  autoArrivalSeconds?: number; // thời gian mô phỏng từ W0 tới W2
  onArrivingSoon?: () => void; // gọi khi sắp tới đích
}

// OSRM API service
const getRoute = async (start: LocationPoint, end: LocationPoint): Promise<LocationPoint[] | null> => {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
    );
    
    if (!response.ok) {
      throw new Error('OSRM API request failed');
    }
    
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      // Convert coordinates from [lng, lat] to [lat, lng]
      return data.routes[0].geometry.coordinates.map((coord: [number, number]) => ({
        lat: coord[1],
        lng: coord[0]
      }));
    }
    
    return null;
  } catch (error) {
    console.error('OSRM routing error:', error);
    return null;
  }
};

const TrackingMap: React.FC<TrackingMapProps> = ({
  orderId,
  customerLocation,
  droneLocation,
  height = 400,
  onArrived,
  simulate = false,
  autoArrivalSeconds = 10,
  onArrivingSoon,
}) => {
  const [routeCoordinates, setRouteCoordinates] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const [tileSource, setTileSource] = useState<'osm' | 'carto'>('osm');
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const interactionTimeoutRef = useRef<number | null>(null);
  const [followDrone, setFollowDrone] = useState<boolean>(false);

  // Keep map sized correctly on window resize
  useEffect(() => {
    const onResize = () => {
      const map = mapRef.current;
      if (map) {
        try { map.invalidateSize(); } catch {}
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Helper to validate point (exclude 0,0 and non-finite)
  const isValidPoint = (p?: LocationPoint | null): boolean => {
    if (!p) return false;
    const { lat, lng } = p;
    return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  };

  // Demo defaults (Ho Chi Minh City area)
  const demoCustomer: LocationPoint = { lat: 10.8231, lng: 106.6297 };
  const demoDrone: LocationPoint = { lat: 10.8331, lng: 106.6197 };
  // Demo store (Quận 1, HCMC)
  const demoStore: LocationPoint = { lat: 10.7761, lng: 106.7000 };

  // Safe locations: prefer valid props, fallback to demo
  const defaultCustomer: LocationPoint = useMemo(
    () => (isValidPoint(customerLocation) ? (customerLocation as LocationPoint) : demoCustomer),
    [customerLocation]
  );
  const defaultDrone: LocationPoint = useMemo(
    () => (isValidPoint(droneLocation) ? (droneLocation as LocationPoint) : demoDrone),
    [droneLocation]
  );

  // Mục tiêu W2 (khách hàng) thay vì cửa hàng
  const targetLocation: LocationPoint = defaultCustomer;

  // Calculate distance between drone and customer
  const calculateDistance = (point1: LocationPoint, point2: LocationPoint): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [routeDistance, setRouteDistance] = useState<number>(0);
  const [hasArrived, setHasArrived] = useState<boolean>(false);
  const notifiedArrivedRef = useRef<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(simulate);
  const arrivalSoonNotifiedRef = useRef<boolean>(false);

  // Simulate drone movement for demo
  const [currentDroneLocation, setCurrentDroneLocation] = useState<LocationPoint>(defaultDrone);

  // Create simple text labels for waypoints (W0 for drone, W2 for customer)
  const w0LabelIcon = useMemo(() => new L.DivIcon({
    html: '<div style="background:#1976d2;color:#fff;padding:2px 6px;border-radius:12px;font-size:12px;border:1px solid #0d47a1">W0</div>',
    className: 'w0-label',
    iconSize: [24, 24],
    iconAnchor: [12, -8]
  }), []);

  const w2LabelIcon = useMemo(() => new L.DivIcon({
    html: '<div style="background:#4caf50;color:#fff;padding:2px 6px;border-radius:12px;font-size:12px;border:1px solid #2e7d32">W2</div>',
    className: 'w2-label',
    iconSize: [24, 24],
    iconAnchor: [12, -8]
  }), []);

  useEffect(() => {
    // Nếu bật mô phỏng, chạy mô phỏng tuyến tính theo thời gian autoArrivalSeconds
    if (isMoving && !hasArrived) {
      const start = isValidPoint(defaultDrone) ? defaultDrone : { lat: 10.8331, lng: 106.6197 };
      const end = isValidPoint(targetLocation) ? targetLocation : { lat: 10.8231, lng: 106.6297 };
      const startTime = Date.now();
      const durationMs = Math.max(1000, (autoArrivalSeconds || 10) * 1000);
      const endTime = startTime + durationMs;

      arrivalSoonNotifiedRef.current = false;

      const interval = setInterval(() => {
        if (!isMounted) return;
        const now = Date.now();
        const fracRaw = (now - startTime) / (endTime - startTime);
        const frac = Math.max(0, Math.min(1, fracRaw));
        const next = {
          lat: start.lat + (end.lat - start.lat) * frac,
          lng: start.lng + (end.lng - start.lng) * frac,
        };
        setCurrentDroneLocation(next);

        // Gần đến: khi còn <= 15% thời gian hoặc cách < 100m
        const remainingFrac = 1 - frac;
        const distKm = calculateDistance(next, end);
        if (!arrivalSoonNotifiedRef.current && (remainingFrac <= 0.15 || distKm <= 0.1)) {
          arrivalSoonNotifiedRef.current = true;
          try { onArrivingSoon && onArrivingSoon(); } catch {}
        }

        if (frac >= 1) {
          clearInterval(interval);
          setIsMoving(false);
          setHasArrived(true);
          if (!notifiedArrivedRef.current) {
            notifiedArrivedRef.current = true;
            try { onArrived && onArrived(); } catch {}
          }
        }
      }, 200);

      return () => {
        clearInterval(interval);
      };
    }

    // Nếu không mô phỏng, ưu tiên dùng tọa độ thật nếu hợp lệ
    if (droneLocation) {
      if (isValidPoint(droneLocation)) {
        setCurrentDroneLocation(droneLocation);
        return;
      }
      // Tọa độ prop không hợp lệ: đặt về điểm demo
      setCurrentDroneLocation(defaultDrone);
    }
  }, [isMounted, droneLocation, targetLocation, isMoving, hasArrived, autoArrivalSeconds, defaultDrone]);

  // Chỉ tự động bắt đầu di chuyển khi bật simulate
  useEffect(() => {
    if (!simulate) return;
    const ready = isValidPoint(currentDroneLocation) && isValidPoint(targetLocation);
    if (!isMoving && ready && !hasArrived) {
      setIsMoving(true);
    }
  }, [currentDroneLocation, targetLocation, isMoving, hasArrived, simulate]);

  // Tự động bật theo dõi khi bắt đầu di chuyển để camera bám drone
  useEffect(() => {
    if (!mapRef.current) return;
    if (isMoving) {
      setFollowDrone(true);
      try {
        const map = mapRef.current;
        const minZoom = 14;
        const nextZoom = Math.max(map!.getZoom(), minZoom);
        map!.setView([currentDroneLocation.lat, currentDroneLocation.lng], nextZoom, { animate: true });
      } catch {}
    }
  }, [isMoving]);

  useEffect(() => {
    // Get route when locations are available
    const fetchRoute = async () => {
      if (currentDroneLocation && targetLocation && isMounted) {
        setLoading(true);
        setError(null);
        
        try {
          // Guard against invalid coordinates (0,0) or NaN
          if (!isValidPoint(currentDroneLocation) || !isValidPoint(targetLocation)) {
            // Fallback: draw straight line using safe demo points
            const start = isValidPoint(currentDroneLocation) ? currentDroneLocation : demoDrone;
            const end = isValidPoint(targetLocation) ? targetLocation : demoStore;
            setRouteCoordinates([start, end]);
            const distance = calculateDistance(currentDroneLocation, targetLocation);
            setRouteDistance(distance);
            const droneSpeed = 30; // km/h
            const timeInMinutes = Math.ceil((distance / droneSpeed) * 60);
            setEstimatedTime(timeInMinutes);
            setError('Tọa độ không hợp lệ cho routing (đang hiển thị tuyến thẳng)');
            setLoading(false);
            return;
          }

          // If start and destination are practically the same (<=50m), treat as arrived
          const distanceNow = calculateDistance(currentDroneLocation, targetLocation);
          if (distanceNow <= 0.05) { // ~50 meters
            setRouteCoordinates([]); // no polyline needed
            setRouteDistance(distanceNow);
            setEstimatedTime(0);
            setError(null);
            setLoading(false);
            setHasArrived(true);
            if (!notifiedArrivedRef.current) {
              notifiedArrivedRef.current = true;
              try { onArrived && onArrived(); } catch {}
            }
            return;
          }

          const route = await getRoute(currentDroneLocation, targetLocation);
          
          if (isMounted) {
            if (route) {
              setRouteCoordinates(route);
              
              // Calculate route distance and estimated time
              const distance = distanceNow;
              setRouteDistance(distance);
              
              // Estimate delivery time (assuming drone speed of 30 km/h)
              const droneSpeed = 30; // km/h
              const timeInHours = distance / droneSpeed;
              const timeInMinutes = Math.ceil(timeInHours * 60);
              setEstimatedTime(timeInMinutes);
            } else {
              // Fallback: draw straight line
              setRouteCoordinates([currentDroneLocation, targetLocation]);
              const distance = distanceNow;
              setRouteDistance(distance);
              const droneSpeed = 30; // km/h
              const timeInMinutes = Math.ceil((distance / droneSpeed) * 60);
              setEstimatedTime(timeInMinutes);
              setError('Không thể tải route từ OSRM API (đang hiển thị tuyến thẳng)');
            }
            setLoading(false);
          }
        } catch (err) {
          const distanceNow = calculateDistance(currentDroneLocation, targetLocation);
          if (isMounted) {
            // Fallback: draw straight line
            setRouteCoordinates([currentDroneLocation, targetLocation]);
            const distance = distanceNow;
            setRouteDistance(distance);
            const droneSpeed = 30; // km/h
            const timeInMinutes = Math.ceil((distance / droneSpeed) * 60);
            setEstimatedTime(timeInMinutes);
            setError('Không thể tải route từ OSRM API (đang hiển thị tuyến thẳng)');
            setLoading(false);
          }
        }
      }
    };

    fetchRoute();
  }, [currentDroneLocation, targetLocation, isMounted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Calculate map center
  const mapCenter: LocationPoint = useMemo(
    () => ({
      lat: (currentDroneLocation.lat + targetLocation.lat) / 2,
      lng: (currentDroneLocation.lng + targetLocation.lng) / 2
    }),
    [currentDroneLocation, targetLocation]
  );
  // Theo dõi drone: chỉ pan khi người dùng bật Follow và không đang tương tác
  const lastDroneRef = useRef<LocationPoint>(currentDroneLocation);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!followDrone) return;
    if (isUserInteracting) return;
    try {
      // Chỉ pan khi toạ độ hợp lệ, tránh pan tới (0,0) hoặc NaN gây map trống
      const isValid = isValidPoint(currentDroneLocation);
      const safeTarget: LocationPoint = isValid
        ? currentDroneLocation
        : (isValidPoint(targetLocation) ? targetLocation : demoStore);

      const prev = lastDroneRef.current;
      const deltaKm = calculateDistance(prev, safeTarget);
      if (deltaKm > 0.05) { // ~50m để tránh pan liên tục
        const minZoom = 14;
        const nextZoom = Math.max(map.getZoom(), minZoom);
        // Dùng setView để đồng bộ zoom tối thiểu, animate nhẹ
        map.setView([safeTarget.lat, safeTarget.lng], nextZoom, { animate: true });
        lastDroneRef.current = safeTarget;
      }
    } catch {}
  }, [currentDroneLocation, followDrone, isUserInteracting, targetLocation]);

  return (
    <Box sx={{ position: 'relative', height, width: '100%' }}>
      {hasArrived && (
        <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 1100 }}>
          <Alert severity="success" variant="filled">🚚 Drone đã đến điểm giao (W2)</Alert>
        </Box>
      )}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 1000,
            bgcolor: 'white',
            p: 1,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <CircularProgress size={20} />
          <Typography variant="caption">Đang tải route...</Typography>
        </Box>
      )}

      {/* Toggle theo dõi drone để tránh nhảy map ngoài ý muốn */}
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          right: loading ? 240 : 10,
          zIndex: 1000,
        }}
      >
        <Button 
          size="small"
          variant={followDrone ? 'contained' : 'outlined'}
          startIcon={<GpsFixed />}
          onClick={() => setFollowDrone(v => !v)}
        >
          {followDrone ? 'Đang theo dõi Drone' : 'Theo dõi Drone'}
        </Button>
        {simulate && (
        <Button 
          size="small"
          sx={{ ml: 1 }}
          variant={isMoving ? 'contained' : 'outlined'}
          color={isMoving ? 'warning' : 'primary'}
          onClick={() => setIsMoving(v => !v)}
        >
          {isMoving ? 'Tạm dừng di chuyển' : 'Bắt đầu di chuyển'}
        </Button>
        )}
      </Box>

      {error && (
        <Box sx={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 1000 }}>
          <Alert severity="warning" variant="filled">
            {error}
          </Alert>
        </Box>
      )}

      <MapContainer
        center={mapCenter}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        key={`map-${orderId || 'default'}`} // Force remount when orderId changes
        ref={mapRef}
        whenReady={() => {
          try {
            const map = mapRef.current;
            if (map) {
              setTimeout(() => { try { map.invalidateSize(); } catch {} }, 150);
              setTimeout(() => { try { map.invalidateSize(); } catch {} }, 400);

              // Theo dõi tương tác để không tự recenter khi người dùng zoom/drag
              map.on('zoomstart movestart dragstart', () => {
                setIsUserInteracting(true);
                if (interactionTimeoutRef.current) {
                  window.clearTimeout(interactionTimeoutRef.current);
                }
              });
              const endInteraction = () => {
                if (interactionTimeoutRef.current) {
                  window.clearTimeout(interactionTimeoutRef.current);
                }
                interactionTimeoutRef.current = window.setTimeout(() => {
                  setIsUserInteracting(false);
                }, 600);
              };
              map.on('zoomend moveend dragend', endInteraction);
            }
          } catch {}
        }}
      >
          {/* Single TileLayer with automatic fallback to Carto if OSM errors */}
          {tileSource === 'osm' ? (
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              eventHandlers={{
                tileerror: () => {
                  // Switch to Carto on tile load error
                  setTileSource('carto');
                }
                ,
                load: () => {
                  const map = mapRef.current;
                  if (map) {
                    try { map.invalidateSize(); } catch {}
                  }
                }
              }}
            />
          ) : (
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
              subdomains={["a","b","c","d"]}
              maxZoom={19}
              eventHandlers={{
                load: () => {
                  const map = mapRef.current;
                  if (map) { try { map.invalidateSize(); } catch {} }
                }
              }}
            />
          )}

          {/* Panes to control z-index: markers above route */}
          <Pane name="routes" style={{ zIndex: 400 }}>
            {routeCoordinates.length > 0 && (
              <Polyline
                positions={routeCoordinates}
                color="#ff5722"
                weight={5}
                opacity={0.8}
                dashArray="10, 5"
              />
            )}
          </Pane>

          <Pane name="markers" style={{ zIndex: 650 }}>
            {/* Drone Marker */}
            <Marker position={currentDroneLocation} icon={droneIcon} zIndexOffset={650}>
              <Popup>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                     Drone Giao Hàng
                  </Typography>
                  <Typography variant="caption" display="block">
                    Đơn hàng: #{orderId || 'DEMO'}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Khoảng cách còn lại: {routeDistance > 0 ? `${routeDistance.toFixed(2)} km` : 'Đang tính...'}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Thời gian dự kiến: {estimatedTime > 0 ? `${estimatedTime} phút` : 'Đang tính...'}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ color: '#666' }}>
                    GPS: {currentDroneLocation.lat.toFixed(4)}, {currentDroneLocation.lng.toFixed(4)}
                  </Typography>
                </Box>
              </Popup>
            </Marker>

            {/* Waypoint label W0 near drone */}
            <Marker position={currentDroneLocation} icon={w0LabelIcon} zIndexOffset={660} />

            {/* Pulsing marker to highlight movement */}
            <CircleMarker
              center={currentDroneLocation}
              radius={10}
              pathOptions={{ color: '#1976d2', fillColor: '#1976d2', fillOpacity: 0.25 }}
            />

            {/* W2 (Destination) Marker */}
            <Marker position={targetLocation} icon={customerIcon} zIndexOffset={650}>
              <Popup>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                     Điểm giao (W2)
                  </Typography>
                  <Typography variant="caption" display="block">
                    Điểm đến của drone
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ color: '#666' }}>
                    GPS: {targetLocation.lat.toFixed(4)}, {targetLocation.lng.toFixed(4)}
                  </Typography>
                </Box>
              </Popup>
            </Marker>

            {/* Waypoint label near W2 */}
            <Marker position={targetLocation} icon={w2LabelIcon} zIndexOffset={660} />

            {/* W2 Circle marker fallback */}
            <CircleMarker
              center={targetLocation}
              radius={8}
              pathOptions={{ color: '#4caf50', fillColor: '#4caf50', fillOpacity: 0.25 }}
            />
          </Pane>
      </MapContainer>

      {/* Map Info */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          p: 2,
          borderRadius: 2,
          zIndex: 1000,
          minWidth: 200,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: '#1976d2' }}>
          📍 Thông Tin Giao Hàng
        </Typography>
        
        <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
          🚁 Khoảng cách: {routeDistance > 0 ? `${routeDistance.toFixed(2)} km` : 'Đang tính...'}
        </Typography>
        
        <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
          ⏱️ Thời gian dự kiến: {estimatedTime > 0 ? `${estimatedTime} phút` : 'Đang tính...'}
        </Typography>
        
        <Typography variant="caption" display="block" sx={{ mb: 1, color: hasArrived ? '#2e7d32' : '#4caf50' }}>
          🎯 Trạng thái: {hasArrived ? 'Đã đến điểm giao (W2)' : 'Đang di chuyển tới W2'}
        </Typography>
        
        <Typography variant="caption" display="block" sx={{ fontSize: '0.7rem', color: '#666' }}>
          Powered by OpenStreetMap & OSRM
        </Typography>
      </Box>
    </Box>
  );
};

export default TrackingMap;