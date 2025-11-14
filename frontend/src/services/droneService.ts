import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

export interface DroneGpsUpdate {
  droneId: string;
  deliveryId: string;
  latitude: number;
  longitude: number;
  currentSegment: string;
  etaSeconds: number;
  timestamp: string;
  status: string;
}

export interface DroneStateChange {
  droneId: string;
  deliveryId: string;
  oldStatus: string;
  newStatus: string;
  currentSegment: string;
  message: string;
  timestamp: string;
}

export interface DeliveryEtaUpdate {
  deliveryId: string;
  orderId: string;
  droneId: string;
  etaSeconds: number;
  currentSegment: string;
  progressPercent: number;
  estimatedArrival: string;
  timestamp: string;
}

export interface ActiveDelivery {
  id: string;
  orderId: string;
  droneId: string;
  status: string;
  currentSegment: string;
  etaSeconds: number;
  progressPercent: number;
  customerName: string;
  customerAddress: string;
  startTime: string;
}

export const droneService = {
  // Get active deliveries
  getActiveDeliveries: async (): Promise<ActiveDelivery[]> => {
    const response = await axios.get(`${API_BASE_URL}/deliveries/active`);
    return response.data;
  },

  // Get delivery details
  getDeliveryDetail: async (deliveryId: string) => {
    const response = await axios.get(`${API_BASE_URL}/deliveries/${deliveryId}/detail`);
    return response.data;
  },

  // Get delivery events
  getDeliveryEvents: async (deliveryId: string) => {
    const response = await axios.get(`${API_BASE_URL}/deliveries/${deliveryId}/events`);
    return response.data;
  },

  // Start delivery simulation
  startDelivery: async (deliveryId: string) => {
    const response = await axios.post(`${API_BASE_URL}/deliveries/${deliveryId}/start`);
    return response.data;
  },

  // Get available drones
  getAvailableDrones: async () => {
    const response = await axios.get(`${API_BASE_URL}/drone/assignments/drones/available`);
    return response.data;
  },

  // Auto assign drone
  autoAssignDrone: async (orderId: string) => {
    const response = await axios.post(`${API_BASE_URL}/drone/assignments/auto`, { orderId });
    return response.data;
  },

  // Manual assign drone
  manualAssignDrone: async (orderId: string, droneId: string) => {
    const response = await axios.post(`${API_BASE_URL}/drone/assignments/manual`, { 
      orderId, 
      droneId 
    });
    return response.data;
  }
};