import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Container,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Grid,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  SvgIcon,
  StepIcon,
  Alert,
  AlertTitle,
  CircularProgress,
  Button,
  Link,
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import {
  RestaurantMenu,
  CheckCircle,
  LocalShipping,
  Kitchen,
  FlightTakeoff,
  TravelExplore,
  Restaurant,
  Schedule
} from '@mui/icons-material';
import { RootState } from '../store';
import TrackingMap from '../components/TrackingMap';
import api from '../services/api';
import { completeDelivery, completeDeliveryByDeliveryId, updateOrderStatus } from '../services/order';
import droneManagementService from '../services/droneManagementService';
import { droneService } from '../services/droneService';
import { useWebSocket } from '../hooks/useWebSocket';

// Order status steps
const steps = ['Đã tạo', 'Đã xác nhận', 'Đang chuẩn bị', 'Sẵn sàng giao hàng', 'Drone đang giao', 'Đã giao hàng'];
const statusToStep = {
  created: 0,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  delivering: 4,
  delivered: 5
} as const;

type StatusKey = keyof typeof statusToStep;

const backendToUIStatus: Record<string, StatusKey> = {
  CREATED: 'created',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY_FOR_DELIVERY: 'ready',
  READY: 'ready', // một số màn dùng READY
  ASSIGNED: 'delivering',
  OUT_FOR_DELIVERY: 'delivering',
  DELIVERING: 'delivering', // phòng ngừa backend trả DELIVERING
  DELIVERED: 'delivered',
  COMPLETED: 'delivered',
  REJECTED: 'confirmed',
  CANCELLED: 'confirmed',
  // Fallbacks for early states
  PENDING_PAYMENT: 'created',
  PAID: 'confirmed',
};

// Simple custom drone icon using SVG
const DroneIcon = (props: any) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <circle cx="4.5" cy="4.5" r="1.5" stroke="currentColor" fill="none" strokeWidth="1.5" />
    <circle cx="19.5" cy="4.5" r="1.5" stroke="currentColor" fill="none" strokeWidth="1.5" />
    <circle cx="4.5" cy="19.5" r="1.5" stroke="currentColor" fill="none" strokeWidth="1.5" />
    <circle cx="19.5" cy="19.5" r="1.5" stroke="currentColor" fill="none" strokeWidth="1.5" />
    <path d="M6 6 L10 10 M18 6 L14 10 M6 18 L10 14 M18 18 L14 14" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </SvgIcon>
);

// Styled components for enhanced UI
const ColoredStepper = styled(Stepper)(({ theme }) => ({
  '& .MuiStepLabel-root .Mui-completed': {
    color: theme.palette.success.main,
  },
  '& .MuiStepLabel-root .Mui-active': {
    color: theme.palette.primary.main,
    '& .MuiStepIcon-root': {
      animation: 'pulse 2s infinite',
    },
  },
  '& .MuiStepLabel-root .Mui-disabled': {
    color: theme.palette.grey[400],
  },
  '@keyframes pulse': {
    '0%': {
      transform: 'scale(1)',
      boxShadow: '0 0 0 0 rgba(25, 118, 210, 0.7)',
    },
    '70%': {
      transform: 'scale(1.05)',
      boxShadow: '0 0 0 10px rgba(25, 118, 210, 0)',
    },
    '100%': {
      transform: 'scale(1)',
      boxShadow: '0 0 0 0 rgba(25, 118, 210, 0)',
    },
  },
}));

const TimelineListItem = styled(ListItem)<{ isActive?: boolean; isCompleted?: boolean }>(({ theme, isActive, isCompleted }) => ({
  borderRadius: theme.spacing(1),
  marginBottom: theme.spacing(1),
  transition: 'all 0.3s ease-in-out',
  backgroundColor: isActive 
    ? theme.palette.primary.light + '20'
    : isCompleted 
    ? theme.palette.success.light + '15'
    : 'transparent',
  border: isActive 
    ? `2px solid ${theme.palette.primary.main}`
    : isCompleted
    ? `1px solid ${theme.palette.success.main}`
    : '1px solid transparent',
  transform: isActive ? 'scale(1.02)' : 'scale(1)',
  boxShadow: isActive 
    ? `0 4px 12px ${theme.palette.primary.main}25`
    : isCompleted
    ? `0 2px 8px ${theme.palette.success.main}15`
    : 'none',
  '&:hover': {
    backgroundColor: isActive 
      ? theme.palette.primary.light + '30'
      : isCompleted 
      ? theme.palette.success.light + '25'
      : theme.palette.grey[50],
  },
}));

const PulsingAvatar = styled(Avatar)<{ isActive?: boolean }>(({ theme, isActive }) => ({
  animation: isActive ? 'avatarPulse 2s infinite' : 'none',
  '@keyframes avatarPulse': {
    '0%': {
      transform: 'scale(1)',
      boxShadow: `0 0 0 0 ${theme.palette.primary.main}70`,
    },
    '70%': {
      transform: 'scale(1.1)',
      boxShadow: `0 0 0 10px ${theme.palette.primary.main}00`,
    },
    '100%': {
      transform: 'scale(1)',
      boxShadow: `0 0 0 0 ${theme.palette.primary.main}00`,
    },
  },
}));

interface OrderItemUI {
  id: string | number;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

interface OrderUI {
  id: number | string;
  status: StatusKey;
  items: OrderItemUI[];
  total: number;
  deliveryFee: number;
  address: string;
  storeAddress?: string;
  estimatedDelivery: string;
  paymentMethod: string;
  paymentStatus?: string;
}

// --- Helpers for coordinates ---
const isValidCoord = (lat?: number, lng?: number) => {
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
};
const normalizePair = (a?: number, b?: number) => {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const lat = Number(a);
  const lng = Number(b);
  // If first value looks like longitude (> 90 magnitude), swap
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 180) {
    return { lat: lng, lng: lat };
  }
  return { lat, lng };
};

// HCM center (near District 1: Ben Thanh Market)
const HCM_CENTER = { lat: 10.776, lng: 106.700 };
const EARTH_RADIUS_KM = 6371;
const MAX_RADIUS_KM = 2; // clamp within 2km

const toRad = (deg: number) => (deg * Math.PI) / 180;
const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
};

// Clamp a coordinate into a circle of MAX_RADIUS_KM around HCM_CENTER
const clampToHcmRadius = (p: { lat: number; lng: number } | null) => {
  if (!p || !isValidCoord(p.lat, p.lng)) return null;
  const dist = haversineKm(HCM_CENTER, p);
  if (dist <= MAX_RADIUS_KM) return p;
  // Project along the bearing from center to point, to the circle boundary
  // Compute bearing
  const lat1 = toRad(HCM_CENTER.lat);
  const lng1 = toRad(HCM_CENTER.lng);
  const lat2 = toRad(p.lat);
  const lng2 = toRad(p.lng);
  const dLng = lng2 - lng1;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = Math.atan2(y, x); // radians

  const angularDistance = MAX_RADIUS_KM / EARTH_RADIUS_KM; // radians
  const sinAd = Math.sin(angularDistance);
  const cosAd = Math.cos(angularDistance);

  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);

  const latClamped = Math.asin(
    sinLat1 * cosAd + cosLat1 * sinAd * Math.cos(bearing)
  );
  const lngClamped =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * sinAd * cosLat1,
      cosAd - sinLat1 * Math.sin(latClamped)
    );

  return { lat: (latClamped * 180) / Math.PI, lng: (lngClamped * 180) / Math.PI };
};

const OrderTracking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const auth = useSelector((state: RootState) => state.auth);
  const userId = auth.user ? Number(auth.user.id) : null;

  const [order, setOrder] = useState<OrderUI | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isArrivingSoon, setIsArrivingSoon] = useState(false);
  const [droneLocation, setDroneLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryId, setDeliveryId] = useState<number | null>(null);
  const [hasArrived, setHasArrived] = useState<boolean>(false);
  const [confirming, setConfirming] = useState<boolean>(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [canConfirm, setCanConfirm] = useState<boolean>(false);
  const [autoRunStarted, setAutoRunStarted] = useState<boolean>(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derive WebSocket endpoint from API base URL and Spring context-path
  const wsUrl = ((api.defaults.baseURL || 'http://localhost:8080/api').replace(/\/+$/, '')
    .replace(/\/api$/, '')) + '/api/ws';
  const { isConnected, subscribe, unsubscribe } = useWebSocket({ url: wsUrl });

  // Helper function to get step color
  const getStepColor = (stepIndex: number) => {
    if (stepIndex < activeStep) return 'success.main';
    if (stepIndex === activeStep) return 'primary.main';
    return 'grey.400';
  };

  // Helper function to get avatar background color
  const getAvatarBgColor = (stepIndex: number) => {
    if (stepIndex < activeStep) return 'success.main';
    if (stepIndex === activeStep) return 'primary.main';
    return 'grey.400';
  };

  // Auto confirm delivery helper (reused by button and onArrived)
  const confirmDelivery = async (auto: boolean) => {
    if (!order) return;
    if (!auto) setConfirming(true);
    setConfirmError(null);
    try {
      const orderIdNum = Number(order.id);
      const deliveryIdNum = Number(deliveryId);
      const useOrderEndpoint = !Number.isFinite(deliveryIdNum) || deliveryIdNum === orderIdNum;

      if (useOrderEndpoint) {
        await completeDelivery(orderIdNum);
      } else {
        try {
          await completeDeliveryByDeliveryId(deliveryIdNum);
        } catch (e: any) {
          const msg = (e?.response?.data?.error || e?.response?.data?.message || '').toString().toUpperCase();
          if (e?.response?.status === 400 || msg.includes('INVALID_ARGUMENT')) {
            await completeDelivery(orderIdNum);
          } else {
            throw e;
          }
        }
      }

      try { await updateOrderStatus(orderIdNum, 'COMPLETED'); } catch {}

      // Update drone status to IDLE/available
      try {
        if (Number.isFinite(deliveryIdNum) && deliveryIdNum !== orderIdNum) {
          const tracking = await droneManagementService.getDeliveryTracking(String(deliveryIdNum));
          const droneId = tracking?.droneId;
          if (droneId) {
            await droneManagementService.updateDroneStatus(String(droneId), 'IDLE');
          }
        }
      } catch {}

      setActiveStep(5);
    } catch (e: any) {
      setConfirmError(e?.response?.data?.message || 'Xác nhận thất bại, vui lòng thử lại');
    } finally {
      if (!auto) setConfirming(false);
    }
  };

  // Tự động chuyển sang DELIVERING và khởi động mô phỏng khi activeStep=4 (ASSIGNED/OUT_FOR_DELIVERY)
  useEffect(() => {
    const run = async () => {
      if (autoRunStarted) return;
      const hasDelivery = Number.isFinite(deliveryId);
      const shouldStart = hasDelivery && (activeStep === 4 || (!!order && (order.status === 'ready' || order.status === 'delivering')));
      if (!shouldStart) return;

      setAutoRunStarted(true);

      // Đồng bộ UI: chuyển trạng thái đơn sang delivering nếu chưa
      if (order && order.status !== 'delivering') {
        setOrder({ ...order, status: 'delivering' });
      }
      setActiveStep(4);

      // Cập nhật backend: chuyển order sang DELIVERING
      try { if (order) await updateOrderStatus(Number(order.id), 'DELIVERING'); } catch {}

      // Khởi động mô phỏng phía backend nếu có
      try { await droneService.startDelivery(String(deliveryId)); } catch { try { await droneManagementService.resumeDelivery(String(deliveryId)); } catch {} }

      // Cập nhật trạng thái drone -> DELIVERING nếu lấy được droneId
      try {
        const tracking = await droneManagementService.getDeliveryTracking(String(deliveryId!));
        const droneId = tracking?.droneId;
        if (droneId) {
          await droneManagementService.updateDroneStatus(String(droneId), 'DELIVERING');
        }
      } catch {}

      // Đẩy tiến độ mỗi giây để ETA giảm dần
      for (let t = 10; t >= 1; t--) {
        setTimeout(() => {
          droneManagementService.updateDeliveryProgress(String(deliveryId!), 1, t, 'IN_PROGRESS').catch(() => {});
        }, (10 - t) * 1000);
      }
    };
    run();
  }, [activeStep, order?.status, deliveryId, autoRunStarted]);

  // Bật lại realtime: subscribe các topic liên quan tới delivery để cập nhật trạng thái
  useEffect(() => {
    if (!isConnected || !subscribe) return;
    const subs: any[] = [];

    // Theo dõi ETA của chuyến giao để suy ra trạng thái đến nơi
    if (deliveryId) {
      const etaSub = subscribe('/topic/delivery/eta', (eta: any) => {
        try {
          if (!eta) return;
          const matches = String(eta.deliveryId || '') === String(deliveryId);
          if (!matches) return;
          const etaSeconds = Number(eta.etaSeconds ?? eta.eta ?? NaN);
          if (Number.isFinite(etaSeconds)) {
            setIsArrivingSoon(etaSeconds <= 180 && etaSeconds > 0);
            const arrived = etaSeconds <= 0;
            setHasArrived(arrived);
            if (arrived) {
              setActiveStep(5);
              setOrder(prev => prev ? { ...prev, status: 'delivered' } : prev);
            }
          }
          // Nếu backend gửi trường status cho delivery
          const dStatus = String(eta.status || eta.deliveryStatus || '').toUpperCase();
          if (dStatus === 'DELIVERED' || dStatus === 'COMPLETED') {
            setHasArrived(true);
            setActiveStep(5);
            setOrder(prev => prev ? { ...prev, status: 'delivered' } : prev);
          }
        } catch (e) {
          console.warn('Error handling ETA update', e);
        }
      });
      if (etaSub) subs.push(etaSub);
    }

    // Theo dõi GPS của drone để cập nhật vị trí hiển thị
    if (deliveryId) {
      const gpsSub = subscribe('/topic/drone/gps', (update: any) => {
        try {
          if (!update) return;
          const matches = String(update.deliveryId || '') === String(deliveryId);
          if (!matches) return;
          const fixed = clampToHcmRadius(normalizePair(update.latitude, update.longitude));
          if (fixed) {
            setDroneLocation(fixed);
          } else if (isValidCoord(update.latitude, update.longitude)) {
            setDroneLocation({ lat: Number(update.latitude), lng: Number(update.longitude) });
          }
        } catch (e) {
          console.warn('Error handling GPS update', e);
        }
      });
      if (gpsSub) subs.push(gpsSub);
    }

    // State/status của drone: nếu có, đồng bộ UI sang delivering/delivered
    const stateSub = subscribe('/topic/drone/state', (change: any) => {
      try {
        if (!change) return;
        const newStatus = String(change.newStatus || change.status || '').toUpperCase();
        if (newStatus === 'DELIVERING') {
          setActiveStep(4);
          setOrder(prev => prev ? { ...prev, status: 'delivering' } : prev);
        }
        if (newStatus === 'IDLE' || newStatus === 'RETURNING') {
          // Sau khi hoàn tất giao hàng, drone thường quay về/IDLE
          // Chỉ đánh dấu delivered nếu đã có hasArrived hoặc ETA=0
          if (hasArrived) {
            setActiveStep(5);
            setOrder(prev => prev ? { ...prev, status: 'delivered' } : prev);
          }
        }
      } catch (e) {
        console.warn('Error handling state update', e);
      }
    });
    if (stateSub) subs.push(stateSub);

    return () => {
      subs.forEach(s => unsubscribe && unsubscribe(s));
    };
  }, [isConnected, subscribe, unsubscribe, deliveryId, hasArrived]);

  // Realtime: subscribe vào topic đơn hàng để nhận trạng thái và GPS từ backend
  useEffect(() => {
    if (!isConnected || !subscribe || !id) return;
    const subs: any[] = [];

    const orderTopic = `/topic/orders/${id}`;
    const orderSub = subscribe(orderTopic, (msg: any) => {
      try {
        const type = String(msg?.type || '').toUpperCase();
        const payload = msg?.payload;

        if (type === 'ORDER_STATUS_CHANGED') {
          const raw = String(payload || '').toUpperCase();
          const uiStatus: StatusKey = backendToUIStatus[raw] || 'confirmed';
          setOrder(prev => prev ? { ...prev, status: uiStatus } : prev);
          setActiveStep(statusToStep[uiStatus]);
          setIsArrivingSoon(statusToStep[uiStatus] === 4);
        }

        if (type === 'GPS_UPDATE') {
          const lat = Number(payload?.lat);
          const lng = Number(payload?.lng);
          const etaMinutes = Number(payload?.etaMinutes);
          const fixed = clampToHcmRadius(normalizePair(lat, lng));
          if (fixed) setDroneLocation(fixed);
          else if (isValidCoord(lat, lng)) setDroneLocation({ lat, lng });
          if (Number.isFinite(etaMinutes)) {
            setIsArrivingSoon(etaMinutes <= 3 && etaMinutes > 0);
            const arrived = etaMinutes <= 0;
            setHasArrived(arrived);
            if (arrived) {
              setActiveStep(5);
              setOrder(prev => prev ? { ...prev, status: 'delivered' } : prev);
            }
          }
        }

        if (type === 'DELIVERY_ARRIVING') {
          setIsArrivingSoon(true);
        }
      } catch (e) {
        console.warn('Error handling order topic message', e);
      }
    });
    if (orderSub) subs.push(orderSub);

    return () => {
      subs.forEach(s => unsubscribe && unsubscribe(s));
    };
  }, [isConnected, subscribe, unsubscribe, id]);

  // API call to get current order status from server
  const fetchOrderFromAPI = async (orderId: string) => {
    try {
      console.log('Fetching order from API, orderId:', orderId);
      const response = await api.get(`/orders/${orderId}`);
      const raw = response.data;
      console.log('API response:', raw);
      
      const statusRaw = (raw.status || '').toString().trim().toUpperCase();
      const uiStatus: StatusKey = backendToUIStatus[statusRaw] || 'confirmed';
      
      
      // Handle address properly - it might be a string or object
      let address = 'N/A';
      if (typeof raw.address === 'string') {
        address = raw.address;
      } else if (raw.address && typeof raw.address === 'object') {
        const addr = raw.address;
        address = [
          addr.line1,
          addr.ward,
          addr.district,
          addr.city
        ].filter(Boolean).join(', ') || 'N/A';
      }
      // Fallback nếu backend lưu snapshot text
      if (address === 'N/A' && raw.addressSnapshot) {
        address = String(raw.addressSnapshot);
      }
      
      // Địa chỉ cửa hàng (nếu có từ backend)
      let storeAddress: string | undefined = undefined;
      const storeObj = (raw.store || raw.merchant || raw.vendor);
      if (storeObj && typeof storeObj.address === 'string') {
        storeAddress = storeObj.address;
      } else if (typeof raw.storeAddress === 'string') {
        storeAddress = raw.storeAddress;
      } else if (typeof raw.restaurantAddress === 'string') {
        storeAddress = raw.restaurantAddress;
      }
      
      // Handle orderItems from API response
      const rawItems = raw.orderItems || raw.items || [];
      console.log('Raw items from API:', rawItems);
      let items: OrderItemUI[] = Array.isArray(rawItems) ? rawItems.map((it: any) => ({
        id: it.id || it.menuItemId || 'item',
        name: it.menuItem?.name || it.name || it.nameSnapshot || 'Item',
        quantity: Number(it.quantity || 1),
        price: Number(it.unitPrice ?? it.menuItem?.price ?? it.price ?? 0),
        image: it.menuItem?.imageUrl || it.image || it.imageSnapshot,
      })) : [];

      // Fallback: nếu API không trả items/địa chỉ, lấy từ snapshot localStorage
      try {
        const prevStr = localStorage.getItem('currentOrder');
        if (prevStr) {
          const prevRaw = JSON.parse(prevStr);
          const prevId = String(prevRaw?.id ?? prevRaw?.orderId ?? '');
          if (prevId === String(orderId)) {
            if (items.length === 0) {
              const prevItemsRaw = prevRaw?.orderItems || prevRaw?.items || [];
              if (Array.isArray(prevItemsRaw) && prevItemsRaw.length > 0) {
                items = prevItemsRaw.map((it: any) => ({
                  id: it.id || it.menuItemId || 'item',
                  name: it.menuItem?.name || it.name || it.nameSnapshot || 'Item',
                  quantity: Number(it.quantity || 1),
                  price: Number(it.unitPrice ?? it.menuItem?.price ?? it.price ?? 0),
                  image: it.menuItem?.imageUrl || it.image || it.imageSnapshot,
                }));
              }
            }

            if (address === 'N/A') {
              let addr = 'N/A';
              if (typeof prevRaw.address === 'string') {
                addr = prevRaw.address;
              } else if (prevRaw.address && typeof prevRaw.address === 'object') {
                const a = prevRaw.address;
                addr = [a.line1, a.ward, a.district, a.city].filter(Boolean).join(', ') || 'N/A';
              } else if (typeof prevRaw.addressSnapshot === 'string') {
                addr = prevRaw.addressSnapshot;
              }
              address = addr;
            }

            if (!storeAddress) {
              let sAddr: string | undefined = undefined;
              const sObj = (prevRaw.store || prevRaw.merchant || prevRaw.vendor);
              if (sObj && typeof sObj.address === 'string') {
                sAddr = sObj.address;
              } else if (typeof prevRaw.storeAddress === 'string') {
                sAddr = prevRaw.storeAddress;
              } else if (typeof prevRaw.restaurantAddress === 'string') {
                sAddr = prevRaw.restaurantAddress;
              } else if (sObj && sObj.address && typeof sObj.address === 'object') {
                const sa = sObj.address;
                const joined = [sa.line1, sa.ward, sa.district, sa.city].filter(Boolean).join(', ');
                if (joined) sAddr = joined;
              }
              storeAddress = sAddr;
            }
          }
        }
      } catch (e) {
        console.warn('localStorage fallback parse failed:', e);
      }
      console.log('Processed items after fallback:', items);
      
      const ui: OrderUI = {
        id: raw.id || orderId,
        status: uiStatus,
        items,
        total: (items && items.length > 0)
          ? items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0)
          : Number(raw.totalAmount ?? raw.total ?? 0),
        deliveryFee: 0,
        address,
        storeAddress,
        estimatedDelivery: 'Đang tính...',
        paymentMethod: (raw.paymentMethod || '').toString(),
        paymentStatus: (raw.paymentStatus || '').toString(),
      };
      
      console.log('Final UI order from API:', ui);
      setOrder(ui);
      setActiveStep(statusToStep[uiStatus]);
      setIsArrivingSoon(statusToStep[uiStatus] === 4);
      // Lưu deliveryId nếu có
      const initialDeliveryId = raw?.delivery?.id;
      if (Number.isFinite(Number(initialDeliveryId))) {
        setDeliveryId(Number(initialDeliveryId));
      }

      // Fetch delivery tracking for ETA và toạ độ bản đồ
      try {
        const trackTargetId = initialDeliveryId || orderId;
        const trackRes = await api.get(`/deliveries/${trackTargetId}/track`);
        const t = trackRes.data || {};
        const deliveryStatusRaw = (t.deliveryStatus || '').toString().toUpperCase();
        // Chỉ điều chỉnh step từ tracking nếu đơn chưa ở trạng thái cuối (delivered)
        // và trạng thái tracking không phải là DELIVERED
        const trackedUiStatus: StatusKey = backendToUIStatus[deliveryStatusRaw] || 'confirmed';
        if (trackedUiStatus === 'delivered') {
          setActiveStep(statusToStep['delivered']);
        } else if (uiStatus !== 'delivered' && ['ASSIGNED','IN_PROGRESS','OUT_FOR_DELIVERY','DELIVERING'].includes(deliveryStatusRaw)) {
          setActiveStep(statusToStep['delivering']);
          // Đồng bộ trạng thái đơn sang delivering nếu tracking báo đang giao
          setOrder(prev => prev ? { ...prev, status: 'delivering' } : prev);
        }

        // Update ETA if available
        const eta = Number(t.estimatedMinutesRemaining);
        if (!Number.isNaN(eta) && eta > 0) {
          setOrder(prev => prev ? { ...prev, estimatedDelivery: `${eta} phút` } : prev);
        }

        // (helpers moved to module scope)

        // Update map coordinates if available
        // Hỗ trợ nhiều định dạng field từ backend (track/tracking)
        const curPair = normalizePair(
          Number(t.currentLat ?? t?.tracking?.currentLat ?? t.currentLatitude),
          Number(t.currentLng ?? t?.tracking?.currentLng ?? t.currentLongitude)
        );
        const destPair = normalizePair(
          Number(t.destinationLat ?? t?.tracking?.destinationLat ?? t.destLat ?? t.destinationLatitude),
          Number(t.destinationLng ?? t?.tracking?.destinationLng ?? t.destLng ?? t.destinationLongitude)
        );

        // Helper: distance km between two coords
        const kmDistance = (a?: {lat:number;lng:number}|null, b?: {lat:number;lng:number}|null) => {
          if (!a || !b) return Number.POSITIVE_INFINITY;
          const R = 6371;
          const dLat = (b.lat - a.lat) * Math.PI / 180;
          const dLng = (b.lng - a.lng) * Math.PI / 180;
          const aa = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(a.lat * Math.PI/180) * Math.cos(b.lat * Math.PI/180) * Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
          return R * c;
        };
        // Helper: lùi điểm khỏi đích ~150m để mô phỏng tiến dần
        const backoffFromDest = (dest: {lat:number;lng:number}, meters = 150) => {
          const dLat = meters / 111000;
          const dLng = meters / (111000 * Math.max(Math.cos(dest.lat * Math.PI/180), 0.1));
          return { lat: dest.lat - dLat, lng: dest.lng - dLng };
        };

        let clampedCur: {lat:number;lng:number} | null = null;
        let clampedDest: {lat:number;lng:number} | null = null;
        if (curPair && isValidCoord(curPair.lat, curPair.lng)) {
          const c = clampToHcmRadius(curPair);
          if (c) clampedCur = { lat: c.lat, lng: c.lng };
        }
        if (destPair && isValidCoord(destPair.lat, destPair.lng)) {
          const c = clampToHcmRadius(destPair);
          if (c) clampedDest = { lat: c.lat, lng: c.lng };
        }

        if (clampedDest) setCustomerLocation({ lat: clampedDest.lat, lng: clampedDest.lng });
        if (clampedCur) {
          // Hiển thị đúng tọa độ thực: không lùi điểm để mô phỏng
          setDroneLocation({ lat: clampedCur.lat, lng: clampedCur.lng });
        }
        // Fallback: nếu track thiếu toạ độ, thử /deliveries/{deliveryId}/detail
        const coordsMissing = !curPair || !isValidCoord(curPair.lat, curPair.lng) || !destPair || !isValidCoord(destPair.lat, destPair.lng);
        const deliveryIdFromRaw = raw?.delivery?.id;
        if ((coordsMissing || uiStatus === 'ready') && deliveryIdFromRaw) {
          try {
            const detailRes = await api.get(`/deliveries/${deliveryIdFromRaw}/detail`);
            const d = detailRes.data || {};
            const cp = d.currentPosition as number[] | undefined;
            const waypoints = (d.waypoints || {}) as Record<string, number[]>;
            const etaSec = Number(d.etaSec);

            let detailCur: {lat:number;lng:number} | null = null;
            if (Array.isArray(cp) && cp.length === 2) {
              const p = normalizePair(cp[0], cp[1]);
              const c = clampToHcmRadius(p);
              if (c && isValidCoord(c.lat, c.lng)) {
                detailCur = { lat: c.lat, lng: c.lng };
              }
            }
            const w0 = Array.isArray((waypoints as any).W0) ? (waypoints as any).W0 : undefined;
            const w2 = Array.isArray(waypoints.W2) ? waypoints.W2 : undefined;
            if (w2 && w2.length === 2) {
              const p2 = normalizePair(w2[0], w2[1]);
              const c2 = clampToHcmRadius(p2);
              if (c2 && isValidCoord(c2.lat, c2.lng)) {
                setCustomerLocation({ lat: c2.lat, lng: c2.lng });
                if (detailCur) {
                  setDroneLocation({ lat: detailCur.lat, lng: detailCur.lng });
                }
              }
            }
            // Nếu trạng thái READY, đặt drone tại vị trí cửa hàng (W0)
            if (uiStatus === 'ready' && w0 && w0.length === 2) {
              const p0 = normalizePair(w0[0], w0[1]);
              const c0 = clampToHcmRadius(p0);
              if (c0 && isValidCoord(c0.lat, c0.lng)) {
                setDroneLocation({ lat: c0.lat, lng: c0.lng });
              }
            }
            if (!Number.isNaN(etaSec) && etaSec > 0) {
              const etaMin = Math.round(etaSec / 60);
              setOrder(prev => prev ? { ...prev, estimatedDelivery: `${etaMin} phút` } : prev);
            }
          } catch (detailErr) {
            console.warn('Fallback detail fetch failed:', detailErr);
          }
        }
      } catch (e) {
        // ignore tracking errors for now
      }
      
      // Save to localStorage for future use
      localStorage.setItem('currentOrder', JSON.stringify(raw));
      
      return ui;
    } catch (err) {
      console.error('Error loading order from API:', err);
      throw err;
    }
  };

  // Poll tracking while delivering to keep ETA/map fresh
  useEffect(() => {
    if (!id) return;
    if (activeStep !== 4) return; // only when Drone đang giao

    let timer: any = null;
    const tick = async () => {
      try {
        // Ưu tiên dùng deliveryId nếu có, fallback sang order id
        const targetTrackId = Number.isFinite(Number(deliveryId)) ? String(deliveryId) : String(id);
        const trackRes = await api.get(`/deliveries/${targetTrackId}/track`);
        const t = trackRes.data || {};
        const eta = Number(t.estimatedMinutesRemaining);
        if (!Number.isNaN(eta) && eta >= 0) {
          setOrder(prev => prev ? { ...prev, estimatedDelivery: eta > 0 ? `${eta} phút` : 'Sắp đến nơi' } : prev);
          setIsArrivingSoon(eta > 0 && eta <= 5);
        }
        const curRaw = normalizePair(Number(t.currentLat), Number(t.currentLng));
        const destRaw = normalizePair(Number(t.destinationLat), Number(t.destinationLng));
        const cur = clampToHcmRadius(curRaw);
        const dest = clampToHcmRadius(destRaw);
        if (dest) setCustomerLocation({ lat: dest.lat, lng: dest.lng });
        if (cur) {
          // Làm mượt: nếu gần tới W2, lùi nhẹ để TrackingMap tiến dần
          const kmDistance = (a?: {lat:number;lng:number}|null, b?: {lat:number;lng:number}|null) => {
            if (!a || !b) return Number.POSITIVE_INFINITY;
            const R = 6371;
            const dLat = (b.lat - a.lat) * Math.PI / 180;
            const dLng = (b.lng - a.lng) * Math.PI / 180;
            const aa = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(a.lat * Math.PI/180) * Math.cos(b.lat * Math.PI/180) * Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
            return R * c;
          };
          const backoffFromDest = (dest2: {lat:number;lng:number}, meters = 150) => {
            const dLat = meters / 111000;
            const dLng = meters / (111000 * Math.max(Math.cos(dest2.lat * Math.PI/180), 0.1));
            return { lat: dest2.lat - dLat, lng: dest2.lng - dLng };
          };
          const distKm = kmDistance({ lat: cur.lat, lng: cur.lng }, dest ? { lat: dest.lat, lng: dest.lng } : null);
          const shouldBackoff = dest && distKm <= 0.02; // ~20m
          const adjusted = shouldBackoff ? backoffFromDest({ lat: dest!.lat, lng: dest!.lng }) : { lat: cur.lat, lng: cur.lng };
          setDroneLocation(adjusted);
        }
      } catch {}
    };

    // Immediate fetch then interval
    tick();
    timer = setInterval(tick, 10000);
    return () => timer && clearInterval(timer);
  }, [id, activeStep]);

  useEffect(() => {
    const loadOrder = async () => {
      if (!id) {
        setLoading(false);
        setError('Thiếu mã đơn hàng để theo dõi.');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Ưu tiên gọi API để lấy trạng thái mới nhất
        console.log('Attempting to load order from API first...');
        await fetchOrderFromAPI(id);
        console.log('Successfully loaded order from API');
      } catch (apiError) {
        console.warn('API call failed, trying localStorage fallback:', apiError);
        
        try {
          // Fallback to localStorage if API fails
          const rawStr = localStorage.getItem('currentOrder');
          console.log('Raw localStorage data:', rawStr);

          if (rawStr) {
            const raw = JSON.parse(rawStr);
            console.log('Parsed order data from localStorage:', raw);

            // Kiểm tra ID có khớp không
            if (raw.id && raw.id.toString() !== id) {
              console.log('Order ID mismatch in localStorage');
              throw new Error('Order ID mismatch');
            }

            const statusRaw = (raw.status || '').toString().trim().toUpperCase();
            const uiStatus: StatusKey = backendToUIStatus[statusRaw] || 'confirmed';

            // Xử lý địa chỉ: có thể là string hoặc object
            let address = 'N/A';
            if (typeof raw.address === 'string') {
              address = raw.address;
            } else if (raw.address && typeof raw.address === 'object') {
              const addr = raw.address;
              address = [addr.line1, addr.ward, addr.district, addr.city].filter(Boolean).join(', ') || 'N/A';
            }

            // Xử lý items từ localStorage
            const rawItems = raw.orderItems || raw.items || [];
            console.log('Raw items from localStorage:', rawItems);
            const items: OrderItemUI[] = Array.isArray(rawItems)
              ? rawItems.map((it: any) => ({
                  id: it.id || it.menuItemId || 'item',
                  name: it.menuItem?.name || it.name || it.nameSnapshot || 'Item',
                  quantity: Number(it.quantity || 1),
                  price: Number(it.unitPrice ?? it.menuItem?.price ?? it.price ?? 0),
                  image: it.menuItem?.imageUrl || it.image || it.imageSnapshot,
                }))
              : [];
            console.log('Processed items from localStorage:', items);

            const ui: OrderUI = {
              id: raw.id || id,
              status: uiStatus,
              items,
              total: Number(raw.totalAmount ?? raw.total ?? 0),
              deliveryFee: 0,
              address,
              storeAddress: (raw.storeAddress || raw.restaurantAddress),
              estimatedDelivery: '30-45 minutes',
              paymentMethod: (raw.paymentMethod || '').toString(),
              paymentStatus: (raw.paymentStatus || '').toString(),
            };
            const dId = raw?.delivery?.id;
            if (Number.isFinite(Number(dId))) {
              setDeliveryId(Number(dId));
            }

            console.log('Final UI order from localStorage:', ui);
            setOrder(ui);
            setActiveStep(statusToStep[uiStatus]);
            setIsArrivingSoon(statusToStep[uiStatus] === 4);

            console.log('Successfully loaded order from localStorage');
          } else {
            throw new Error('No order data found in localStorage');
          }
        } catch (localStorageError) {
          console.error('Both API and localStorage failed:', localStorageError);
          
          // Nếu có user đăng nhập, hiển thị lỗi API; nếu không, yêu cầu đăng nhập
          if (userId) {
            setError('Không thể tải thông tin đơn hàng từ server. Vui lòng thử lại sau.');
          } else {
            setError('Không tìm thấy dữ liệu đơn hàng. Vui lòng đăng nhập để tải từ server.');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id, userId]);

  // Khoá nút xác nhận 3s kể từ khi đơn chuyển sang đang giao
  useEffect(() => {
    const isDelivering = activeStep === 4 || (order && order.status === 'delivering');
    if (!isDelivering) {
      setCanConfirm(false);
      return;
    }
    setCanConfirm(false);
    const timer = setTimeout(() => setCanConfirm(true), 3000);
    return () => clearTimeout(timer);
  }, [activeStep, order?.status]);

  // Nếu đơn ở trạng thái sẵn sàng giao (ready), tự động chuyển UI sang đang giao để mô phỏng
  useEffect(() => {
    if (!order) return;
    if (order.status === 'ready') {
      setOrder(prev => prev ? { ...prev, status: 'delivering' } : prev);
      setActiveStep(statusToStep['delivering']);
    }
  }, [order]);

  const ErrorAlert = styled(Alert)`
    margin: 16px 0;
    border-radius: 8px;
  `;
  
  const RetryButton = styled(Button)`
    margin-top: 8px;
  `;

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <CircularProgress size={40} />
          <Typography variant="h6" color="text.secondary">
            Đang tải thông tin đơn hàng...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vui lòng chờ trong giây lát
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    // Luôn hiển thị bản đồ ngay cả khi có lỗi tải dữ liệu
    return (
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Theo Dõi Đơn Hàng
        </Typography>
        <Paper
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <Box sx={{ height: 400, borderRadius: 2, overflow: 'hidden', mb: 2, boxShadow: 2 }}>
            <TrackingMap height={400} orderId={id ? String(id) : undefined} simulate={false} />
          </Box>
          <ErrorAlert severity="warning">
            <AlertTitle>Lỗi tải dữ liệu</AlertTitle>
            {error}
            <RetryButton 
              variant="outlined" 
              color="warning" 
              size="small"
              onClick={() => window.location.reload()}
            >
              Thử lại
            </RetryButton>
          </ErrorAlert>
          {!userId && (
            <Box mt={2}>
              <Alert severity="info">
                <AlertTitle>Gợi ý</AlertTitle>
                Bạn có thể <Link href="/login">đăng nhập</Link> để tải dữ liệu đơn hàng từ server.
              </Alert>
            </Box>
          )}
        </Paper>
      </Box>
    );
  }

  if (!order) {
    // Fallback: hiển thị bản đồ và thông báo khi chưa tải được chi tiết đơn
    return (
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Theo Dõi Đơn Hàng
        </Typography>
        <Paper
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <Box sx={{ height: 400, borderRadius: 2, overflow: 'hidden', mb: 2, boxShadow: 2 }}>
            <TrackingMap height={400} orderId={id ? String(id) : undefined} simulate={false} />
          </Box>
          <Alert severity="info">
            <AlertTitle>Đang tải dữ liệu đơn hàng</AlertTitle>
            Chưa tải được chi tiết đơn hàng, đang hiển thị bản đồ demo để bạn theo dõi tuyến.
          </Alert>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Theo Dõi Đơn Hàng
      </Typography>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Paper 
            sx={{ 
              p: 3, 
              mb: 3,
              border: isArrivingSoon ? '2px solid #f44336' : 'none',
              boxShadow: isArrivingSoon ? '0 0 20px rgba(244, 67, 54, 0.3)' : 3,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Trạng Thái Đơn Hàng
              </Typography>
              
              {isArrivingSoon && (
                <Chip 
                  label=" Sắp tới!" 
                  color="error" 
                  sx={{ 
                    animation: 'pulse 1.5s infinite',
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
            
            <ColoredStepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
              {steps.map((label, index) => {
                const stepProps = {};
                const labelProps = {} as any;
                
                return (
                  <Step key={label} {...stepProps}>
                    <StepLabel 
                      {...labelProps}
                      StepIconProps={{
                        icon: index === 0 ? <Schedule /> :
                              index === 1 ? <RestaurantMenu /> :
                              index === 2 ? <Kitchen /> :
                              index === 3 ? <TravelExplore /> :
                              index === 4 ? <DroneIcon /> :
                              <CheckCircle />
                      }}
                      sx={{
                        '& .MuiStepLabel-label': {
                          color: getStepColor(index),
                          fontWeight: index === activeStep ? 600 : 400,
                        }
                      }}
                    >
                      {label}
                    </StepLabel>
                  </Step>
                );
              })}
            </ColoredStepper>
            
            <Box sx={{ mt: 4, mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                 Thời gian giao hàng dự kiến: <strong style={{ marginLeft: 8 }}>{order.estimatedDelivery}</strong>
              </Typography>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                 Địa chỉ giao hàng: <strong style={{ marginLeft: 8 }}>{order.address}</strong>
              </Typography>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                 Địa chỉ cửa hàng: <strong style={{ marginLeft: 8 }}>{order.storeAddress || '-'}</strong>
              </Typography>
            </Box>
            
            {((order.status === 'ready' || order.status === 'delivering') || activeStep === 4) && (
              <>
                <Box sx={{ height: 400, borderRadius: 2, overflow: 'hidden', mb: 2, boxShadow: 2 }}>
                  <TrackingMap
                    height={400}
                    orderId={String(order.id)}
                    droneLocation={droneLocation || undefined}
                    customerLocation={customerLocation || undefined}
                    simulate={order.status === 'delivering'}
                    autoArrivalSeconds={10}
                    onArrived={async () => {
                      setHasArrived(true);
                      setIsArrivingSoon(false);
                      await confirmDelivery(true);
                    }}
                    onArrivingSoon={() => setIsArrivingSoon(true)}
                  />
                </Box>
                {activeStep === 4 && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <AlertTitle>{hasArrived ? 'Drone đã tới điểm giao (W2)' : 'Đơn hàng đang giao'}</AlertTitle>
                        Vui lòng xác nhận đã nhận hàng để hoàn tất đơn.
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Button 
                          variant="contained" 
                          color="success" 
                          disabled={confirming || !canConfirm}
                          onClick={() => confirmDelivery(false)}
                        >
                          Tôi xác nhận đã nhận hàng
                        </Button>
                        {!canConfirm && (
                          <Typography variant="caption" color="text.secondary">
                            Vui lòng đợi 3 giây trước khi xác nhận
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {confirmError && (
                      <Typography variant="caption" color="error">{confirmError}</Typography>
                    )}
                  </Alert>
                )}
              </>
            )}
          </Paper>
          
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
               Lịch Sử Đơn Hàng
            </Typography>
            
            <List sx={{ p: 0 }}>
              <TimelineListItem 
                isCompleted={activeStep > 0}
                isActive={activeStep === 0}
              >
                <ListItemAvatar>
                  <PulsingAvatar 
                    sx={{ bgcolor: getAvatarBgColor(0) }}
                    isActive={activeStep === 0}
                  >
                    <Schedule />
                  </PulsingAvatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                       Đơn hàng đã tạo
                    </Typography>
                  }
                  secondary="Đơn hàng của bạn đã được tạo và đang chờ xác nhận"
                />
                <Typography variant="body2" color="text.secondary">
                  {new Date(Date.now() - 1000 * 60 * 20).toLocaleTimeString()}
                </Typography>
              </TimelineListItem>
              
              {activeStep >= 1 && (
                <TimelineListItem 
                  isCompleted={activeStep > 1}
                  isActive={activeStep === 1}
                >
                  <ListItemAvatar>
                    <PulsingAvatar 
                      sx={{ bgcolor: getAvatarBgColor(1) }}
                      isActive={activeStep === 1}
                    >
                      <RestaurantMenu />
                    </PulsingAvatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                         Đơn hàng đã xác nhận
                      </Typography>
                    }
                    secondary="Đơn hàng của bạn đã được tiếp nhận và xác nhận"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {new Date(Date.now() - 1000 * 60 * 15).toLocaleTimeString()}
                  </Typography>
                </TimelineListItem>
              )}
              
              {activeStep >= 2 && (
                <TimelineListItem 
                  isCompleted={activeStep > 2}
                  isActive={activeStep === 2}
                >
                  <ListItemAvatar>
                    <PulsingAvatar 
                      sx={{ bgcolor: getAvatarBgColor(2) }}
                      isActive={activeStep === 2}
                    >
                      <Kitchen />
                    </PulsingAvatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                         Đang chuẩn bị món ăn
                      </Typography>
                    }
                    secondary="Đầu bếp đang chuẩn bị những món ăn ngon cho bạn"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {new Date(Date.now() - 1000 * 60 * 10).toLocaleTimeString()}
                  </Typography>
                </TimelineListItem>
              )}
              
              {activeStep >= 3 && (
                <TimelineListItem 
                  isCompleted={activeStep > 3}
                  isActive={activeStep === 3}
                >
                  <ListItemAvatar>
                    <PulsingAvatar 
                      sx={{ bgcolor: getAvatarBgColor(3) }}
                      isActive={activeStep === 3}
                    >
                      <TravelExplore />
                    </PulsingAvatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                         Đang tìm drone để giao
                      </Typography>
                    }
                    secondary="Hệ thống đang chọn drone phù hợp cho đơn hàng của bạn"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {new Date(Date.now() - 1000 * 60 * 5).toLocaleTimeString()}
                  </Typography>
                </TimelineListItem>
              )}
              
              {activeStep >= 4 && (
                <TimelineListItem 
                  isCompleted={activeStep > 4}
                  isActive={activeStep === 4}
                >
                  <ListItemAvatar>
                    <PulsingAvatar 
                      sx={{ 
                        bgcolor: isArrivingSoon ? 'error.main' : getAvatarBgColor(4),
                        animation: isArrivingSoon ? 'avatarPulse 1s infinite' : activeStep === 4 ? 'avatarPulse 2s infinite' : 'none'
                      }}
                      isActive={activeStep === 4 || isArrivingSoon}
                    >
                      <DroneIcon />
                    </PulsingAvatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {isArrivingSoon ? " Drone sắp tới!" : " Drone đang giao hàng"}
                      </Typography>
                    }
                    secondary="Đơn hàng đang được drone vận chuyển tới vị trí của bạn"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {new Date(Date.now() - 1000 * 60 * 2).toLocaleTimeString()}
                  </Typography>
                </TimelineListItem>
              )}
              
              {activeStep >= 5 && (
                <TimelineListItem 
                  isCompleted={true}
                  isActive={false}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <CheckCircle />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                         Đã giao hàng thành công
                      </Typography>
                    }
                    secondary="Đơn hàng đã được giao thành công. Chúc bạn ngon miệng!"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {new Date().toLocaleTimeString()}
                  </Typography>
                </TimelineListItem>
              )}
            </List>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                 Chi Tiết Đơn Hàng
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Mã đơn hàng: #{order.id}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <List sx={{ mb: 2, '& .MuiListItem-root:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                {order.items.length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
                          Không có món ăn nào trong đơn hàng này
                        </Typography>
                      }
                    />
                  </ListItem>
                ) : (
                  order.items.map((item) => (
                    <ListItem key={item.id} sx={{ py: 1.5, px: 0, alignItems: 'center' }}>
                      <ListItemAvatar sx={{ mr: 2 }}>
                        <Avatar 
                          src={item.image} 
                          alt={item.name} 
                          variant="rounded" 
                          sx={{ width: 56, height: 56, borderRadius: 2, boxShadow: 1 }} 
                        />
                      </ListItemAvatar>
                      <ListItemText
                        sx={{ minWidth: 0, mr: 1 }}
                        primary={
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.25 }} noWrap>
                            {item.name}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Số lượng: {item.quantity}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Đơn giá: {item.price.toLocaleString('vi-VN')}đ
                            </Typography>
                          </Box>
                        }
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                      </Typography>
                    </ListItem>
                  ))
                )}
              </List>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Tạm tính:</Typography>
                <Typography variant="body2">{order.total.toLocaleString('vi-VN')}đ</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Phí giao hàng:</Typography>
                <Typography variant="body2">{order.deliveryFee.toLocaleString('vi-VN')}đ</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Tổng cộng:</Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {(order.items.length > 0
                    ? order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                    : order.total
                  ).toLocaleString('vi-VN')}đ
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="body2" color="text.secondary">
                 Phương thức thanh toán: {order.paymentMethod || 'Chưa xác định'}
              </Typography>
              {order.paymentStatus && (
                <Typography variant="body2" color="text.secondary">
                  Trạng thái thanh toán: {order.paymentStatus}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OrderTracking;