import React, { useMemo } from 'react';
import { Box, Paper, Typography, Chip, Stack } from '@mui/material';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { normalizePair, clampToHcmRadius, HCM_CENTER, haversineKm } from '../utils/geo';

type DroneItem = {
  id: string;
  status: string;
  currentLat?: number | null;
  currentLng?: number | null;
  homeLat?: number | null;
  homeLng?: number | null;
  batteryPct: number;
  assignedOrderId?: string;
};

type StationItem = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  availableDrones: number;
  totalDrones: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'OFFLINE';
};

interface Waypoint {
  lat: number;
  lng: number;
  type?: 'PICKUP' | 'DELIVERY' | 'RETURN' | string;
}

interface DroneMapProps {
  drones: DroneItem[];
  stations: StationItem[];
  height?: number;
  showRoutes?: boolean;
  onDroneClick?: (droneId: string) => void;
  onStationClick?: (stationId: string) => void;
  selectedDroneId?: string;
  route?: Waypoint[]; // waypoints for route (if any)
  // If true, render raw DB coordinates exactly (no normalize/clamp)
  exactDb?: boolean;
}

// Helper component: invalidate map size once mounted (fixes hidden container rendering)
const InvalidateSizeOnMount: React.FC = () => {
  const map = useMap();
  React.useEffect(() => {
    try { map.invalidateSize(); } catch {}
  }, [map]);
  return null;
};

// Helper component to fit map bounds when points change
const FitBounds: React.FC<{ points: [number, number][] }> = ({ points }) => {
  const map = useMap();
  React.useEffect(() => {
    if (!map) return;
    if (!points || points.length === 0) return;
    try {
      if (points.length === 1) {
        // single point: set view to city-level zoom
        map.setView(points[0] as any, 13);
      } else {
        map.fitBounds(points as any, { padding: [60, 60] });
      }
    } catch (e) {
      // ignore
    }
  }, [map, points]);
  return null;
};

const statusToColor = (status: string) => {
  switch (status) {
    case 'IDLE':
      return '#4caf50';
    case 'DELIVERING':
    case 'EN_ROUTE_TO_CUSTOMER':
    case 'EN_ROUTE_TO_STORE':
      return '#ff9800';
    case 'RETURNING':
      return '#2196f3';
    case 'CHARGING':
      return '#9e9e9e';
    case 'MAINTENANCE':
      return '#f44336';
    case 'OFFLINE':
      return '#757575';
    default:
      return '#607d8b';
  }
};

const DroneMap: React.FC<DroneMapProps> = ({
  drones,
  stations,
  height = 400,
  showRoutes = false,
  onDroneClick,
  onStationClick,
  selectedDroneId,
  route,
  exactDb = false
}) => {
  // Default center (Ho Chi Minh City) and default zoom
  const defaultCenter: [number, number] = [HCM_CENTER.lat, HCM_CENTER.lng];
  const defaultZoom = 13;

  // Prepare points to fit bounds: drones, stations, route
  const points = useMemo(() => {
    const pts: [number, number][] = [];
    drones.forEach(d => {
      if (exactDb) {
        const lat = (d.currentLat ?? d.homeLat) as number;
        const lng = (d.currentLng ?? d.homeLng) as number;
        if (typeof lat === 'number' && typeof lng === 'number') pts.push([lat, lng]);
      } else {
        const p = clampToHcmRadius(normalizePair(d.currentLat ?? d.homeLat ?? NaN as any, d.currentLng ?? d.homeLng ?? NaN as any));
        if (p) pts.push([p.lat, p.lng]);
      }
    });
    stations.forEach(s => {
      if (exactDb) {
        pts.push([s.lat, s.lng]);
      } else {
        const p = clampToHcmRadius(normalizePair(s.lat, s.lng));
        if (p) pts.push([p.lat, p.lng]);
      }
    });
    if (showRoutes && route && route.length) {
      route.forEach(r => {
        if (exactDb) {
          pts.push([r.lat, r.lng]);
        } else {
          const p = clampToHcmRadius(normalizePair(r.lat, r.lng));
          if (p) pts.push([p.lat, p.lng]);
        }
      });
    }
    return pts;
  }, [drones, stations, route, showRoutes, exactDb]);

  // Convert route to latlng tuples for Polyline
  const polyline: [number, number][] = useMemo(() => {
    if (!route || !route.length) return [];
    if (exactDb) {
      return route.map(r => [r.lat, r.lng]);
    }
    return route
      .map(r => clampToHcmRadius(normalizePair(r.lat, r.lng)))
      .filter((p): p is { lat: number; lng: number } => !!p)
      .map(p => [p.lat, p.lng]);
  }, [route, exactDb]);

  // Extract first (W0) and last (W2) waypoints for clear markers
  const w0 = useMemo(() => {
    if (!route || route.length === 0) return null;
    if (exactDb) {
      const wp = route[0];
      return { lat: wp.lat, lng: wp.lng, type: wp.type };
    }
    const p = clampToHcmRadius(normalizePair(route[0].lat, route[0].lng));
    return p ? { lat: p.lat, lng: p.lng, type: route[0].type } : null;
  }, [route, exactDb]);

  const w2 = useMemo(() => {
    if (!route || route.length === 0) return null;
    const last = route[route.length - 1];
    if (exactDb) {
      return { lat: last.lat, lng: last.lng, type: last.type };
    }
    const p = clampToHcmRadius(normalizePair(last.lat, last.lng));
    return p ? { lat: p.lat, lng: p.lng, type: last.type } : null;
  }, [route, exactDb]);

  // Single drone position (detail view) for dashed routing to W2
  const dronePos = useMemo(() => {
    if (!drones || drones.length === 0) return null;
    const d = drones.find(dd => dd.id === selectedDroneId) || drones[0];
    if (exactDb) {
      const lat = (d.currentLat ?? d.homeLat) as number;
      const lng = (d.currentLng ?? d.homeLng) as number;
      return (typeof lat === 'number' && typeof lng === 'number') ? { lat, lng } : null;
    }
    const p = clampToHcmRadius(
      normalizePair(
        (d.currentLat ?? d.homeLat) as any,
        (d.currentLng ?? d.homeLng) as any
      )
    );
    return p ? { lat: p.lat, lng: p.lng } : null;
  }, [drones, selectedDroneId, exactDb]);

  const formatLatLng = (lat: number, lng: number) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const w0Label = w0?.type ? w0.type : 'Store (W0)';
  const w2Label = w2?.type ? w2.type : 'Customer (W2)';

  // Helper: offset a point by meters (east, north) for visual separation
  const offsetByMeters = (p: { lat: number; lng: number }, eastMeters: number, northMeters: number) => {
    const metersPerDegLat = 111320; // approx
    const metersPerDegLng = 111320 * Math.cos((p.lat * Math.PI) / 180);
    return {
      lat: p.lat + northMeters / metersPerDegLat,
      lng: p.lng + eastMeters / metersPerDegLng,
    };
  };

  // If markers overlap within N meters, offset W0/W2 slightly for clarity
  const separationThresholdM = 15; // meters
  const w0Display = useMemo(() => {
    if (!w0) return null;
    if (dronePos && haversineKm(w0, dronePos) * 1000 < separationThresholdM) {
      return offsetByMeters(w0, 10, -10); // shift 10m east, 10m south
    }
    return w0;
  }, [w0, dronePos]);

  const w2Display = useMemo(() => {
    if (!w2) return null;
    if (dronePos && haversineKm(w2, dronePos) * 1000 < separationThresholdM) {
      return offsetByMeters(w2, -10, 10); // shift 10m west, 10m north
    }
    return w2;
  }, [w2, dronePos]);

  return (
    <Paper sx={{ p: 0, height }}>
      <Box sx={{ p: 1 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ pl: 1 }}>
          Bản đồ Drone
        </Typography>
      </Box>
      <Box sx={{ height: `calc(${height}px - 48px)`, width: '100%' }}>
        <MapContainer
          center={points.length ? (points[0] as [number, number]) : defaultCenter}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          {/* Ensure Leaflet recalculates size when the map first mounts */}
          <InvalidateSizeOnMount />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Fit bounds when points change */}
          {points.length > 0 && <FitBounds points={points} />}

          {/* Stations as larger circle markers */}
          {stations.map(station => (
            <CircleMarker
              key={`station-${station.id}`}
              center={exactDb ? [station.lat, station.lng] : ((clampToHcmRadius(normalizePair(station.lat, station.lng)) ? [clampToHcmRadius(normalizePair(station.lat, station.lng))!.lat, clampToHcmRadius(normalizePair(station.lat, station.lng))!.lng] : [station.lat, station.lng]) as [number, number])}
              radius={8}
              pathOptions={{ color: '#673ab7', fillColor: '#673ab7', fillOpacity: 0.9 }}
              eventHandlers={{
                click: () => onStationClick && onStationClick(station.id)
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.9} sticky>
                <div>
                  <strong>Station: {station.name}</strong>
                  <div>{station.availableDrones}/{station.totalDrones} available</div>
                  <div>Coords: {formatLatLng((exactDb ? station.lat : (clampToHcmRadius(normalizePair(station.lat, station.lng)) || {lat: station.lat, lng: station.lng}).lat), (exactDb ? station.lng : (clampToHcmRadius(normalizePair(station.lat, station.lng)) || {lat: station.lat, lng: station.lng}).lng))}</div>
                </div>
              </Tooltip>
              <Popup>
                <div>
                  <strong>{station.name}</strong>
                  <div>{station.availableDrones}/{station.totalDrones} available</div>
                  <div>Coords: {formatLatLng((exactDb ? station.lat : (clampToHcmRadius(normalizePair(station.lat, station.lng)) || {lat: station.lat, lng: station.lng}).lat), (exactDb ? station.lng : (clampToHcmRadius(normalizePair(station.lat, station.lng)) || {lat: station.lat, lng: station.lng}).lng))}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Drones as circle markers */}
          {drones.map(drone => {
            const p = exactDb
              ? ((drone.currentLat ?? drone.homeLat) && (drone.currentLng ?? drone.homeLng) ? { lat: (drone.currentLat ?? drone.homeLat) as number, lng: (drone.currentLng ?? drone.homeLng) as number } : null)
              : clampToHcmRadius(normalizePair(drone.currentLat ?? drone.homeLat ?? NaN as any, drone.currentLng ?? drone.homeLng ?? NaN as any));
            if (!p) return null;
            return (
              <CircleMarker
                key={`drone-${drone.id}`}
                center={[p.lat, p.lng]}
                radius={selectedDroneId === drone.id ? 9 : 6}
                pathOptions={{ color: statusToColor(drone.status), fillColor: statusToColor(drone.status), fillOpacity: 0.9 }}
                eventHandlers={{
                  click: () => onDroneClick && onDroneClick(drone.id),
                  mouseover: (e) => {
                    const map = (e.target as any)._map;
                    if (map) {
                      const targetZoom = Math.max(map.getZoom(), 16);
                      map.flyTo([p.lat, p.lng], targetZoom);
                    }
                  }
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95} sticky>
                  <div>
                    <strong>Drone: {drone.id}</strong>
                    <div>Status: {drone.status}</div>
                    <div>Battery: {drone.batteryPct}%</div>
                    <div>Coords: {formatLatLng(p.lat, p.lng)}</div>
                    {drone.assignedOrderId && <div>Order: {drone.assignedOrderId}</div>}
                  </div>
                </Tooltip>
                <Popup>
                  <div>
                    <strong>Drone: {drone.id}</strong>
                    <div>Status: {drone.status}</div>
                    <div>Battery: {drone.batteryPct}%</div>
                    <div>Coords: {formatLatLng(p.lat, p.lng)}</div>
                    {drone.assignedOrderId && <div>Order: {drone.assignedOrderId}</div>}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Route polyline */}
          {showRoutes && polyline.length > 0 && (
            <Polyline positions={polyline} pathOptions={{ color: '#ff5722', weight: 4, opacity: 0.9 }} />
          )}

          {/* W0 and W2 markers for clarity */}
          {showRoutes && w0 && (
            <CircleMarker
              center={w0Display ? [w0Display.lat, w0Display.lng] : [w0.lat, w0.lng]}
              radius={7}
              pathOptions={{ color: '#2196f3', fillColor: '#2196f3', fillOpacity: 0.9 }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95} sticky>
                <div>
                  <strong>{w0Label}</strong>
                  <div>Coords: {formatLatLng(w0.lat, w0.lng)}</div>
                </div>
              </Tooltip>
              <Popup>
                <div>
                  <strong>{w0Label}</strong>
                  <div>Coords: {formatLatLng(w0.lat, w0.lng)}</div>
                </div>
              </Popup>
            </CircleMarker>
          )}
          {/* Connector to indicate visual offset for W0 */}
          {showRoutes && w0Display && (w0Display.lat !== w0!.lat || w0Display.lng !== w0!.lng) && (
            <Polyline positions={[[w0!.lat, w0!.lng], [w0Display.lat, w0Display.lng]]} pathOptions={{ color: '#9e9e9e', weight: 2, opacity: 0.7, dashArray: '2 4' }} />
          )}
          {showRoutes && w2 && (
            <CircleMarker
              center={w2Display ? [w2Display.lat, w2Display.lng] : [w2.lat, w2.lng]}
              radius={7}
              pathOptions={{ color: '#f44336', fillColor: '#f44336', fillOpacity: 0.9 }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95} sticky>
                <div>
                  <strong>{w2Label}</strong>
                  <div>Coords: {formatLatLng(w2.lat, w2.lng)}</div>
                </div>
              </Tooltip>
              <Popup>
                <div>
                  <strong>{w2Label}</strong>
                  <div>Coords: {formatLatLng(w2.lat, w2.lng)}</div>
                </div>
              </Popup>
            </CircleMarker>
          )}
          {/* Connector to indicate visual offset for W2 */}
          {showRoutes && w2Display && (w2Display.lat !== w2!.lat || w2Display.lng !== w2!.lng) && (
            <Polyline positions={[[w2!.lat, w2!.lng], [w2Display.lat, w2Display.lng]]} pathOptions={{ color: '#9e9e9e', weight: 2, opacity: 0.7, dashArray: '2 4' }} />
          )}

          {/* Dashed routing from current drone position to W2 */}
          {showRoutes && dronePos && w2 && (
            <Polyline
              positions={[[dronePos.lat, dronePos.lng], [w2.lat, w2.lng]]}
              pathOptions={{ color: '#ff1744', weight: 3, opacity: 0.85, dashArray: '6 6' }}
            />
          )}
        </MapContainer>
      </Box>

      {/* Sidebar summary (fallback list) */}
      <Box sx={{ p: 1 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Chip label={`Drones: ${drones.length}`} size="small" />
          <Chip label={`Stations: ${stations.length}`} size="small" />
          {polyline.length > 0 && <Chip label={`Route points: ${polyline.length}`} size="small" />}
        </Stack>
      </Box>
    </Paper>
  );
};

export default DroneMap;

