import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

export interface DroneFleet {
  id: string;
  serialNumber: string;
  model: string;
  status: 'IDLE' | 'ASSIGNED' | 'DELIVERING' | 'RETURNING' | 'CHARGING' | 'MAINTENANCE' | 'OFFLINE';
  batteryLevel: number;
  currentLat: number;
  currentLng: number;
  homeLat: number;
  homeLng: number;
  maxPayload: number;
  maxRange: number;
  lastAssignedAt?: string;
  isActive: boolean;
  assignedOrderId?: string;
  deliveryId?: string;
  totalFlights?: number;
  flightHours?: number;
  lastMaintenance?: string;
}

export interface DroneAssignment {
  id: string;
  orderId: string;
  droneId: string;
  droneSerialNumber: string;
  assignmentMode: 'AUTO' | 'MANUAL';
  assignedBy: string;
  assignedAt: string;
  deliveryId?: string;
  deliveryStatus?: string;
  currentSegment?: number;
  etaSeconds?: number;
}

export interface PageMeta {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface DronePosition {
  droneId: string;
  serialNumber: string;
  lat: number;
  lng: number;
  batteryLevel: number;
  status: string;
  deliveryId?: string;
  orderId?: string;
  currentSegment?: number;
  etaSeconds?: number;
}

export interface DeliveryTracking {
  deliveryId: string;
  orderId: string;
  droneId: string;
  droneSerialNumber: string;
  currentLat: number;
  currentLng: number;
  batteryLevel: number;
  status: string;
  currentSegment: number;
  etaSeconds: number;
  etaMinutes: number;
  waypoints?: Array<{
    lat: number;
    lng: number;
    type: 'PICKUP' | 'DELIVERY' | 'RETURN';
  }>;
}

class DroneManagementService {
  private apiClient = axios.create({
    baseURL: `${API_BASE_URL}`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Drone Fleet Management
  async getAllDrones(): Promise<DroneFleet[]> {
    try {
      const response = await this.apiClient.get('/drone-management/drones');
      return response.data.drones || [];
    } catch (error) {
      console.error('Error fetching drones:', error);
      throw error;
    }
  }

  async getDronesPage(page: number, size: number, status?: string): Promise<{ drones: DroneFleet[]; page: PageMeta; total: number }>
  {
    try {
      const params: any = { page, size };
      if (status && status !== 'ALL') params.status = status;
      const response = await this.apiClient.get('/drone-management/drones', { params });
      const drones = response.data.drones || [];
      const pageMeta = response.data.page || { number: page, size, totalElements: Array.isArray(drones) ? drones.length : 0, totalPages: 1 };
      const total = Number(response.data.total ?? pageMeta.totalElements ?? (drones?.length || 0));
      return { drones, page: pageMeta, total };
    } catch (error) {
      console.error('Error fetching paged drones:', error);
      throw error;
    }
  }

  async getDroneDetail(droneId: string): Promise<DroneFleet> {
    try {
      const response = await this.apiClient.get(`/drone-management/drones/${droneId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching drone detail:', error);
      throw error;
    }
  }

  // Fleet stats
  async getFleetStats(): Promise<{ total: number; idleCount: number; assignedCount: number; deliveringCount: number; returningCount: number; chargingCount: number; maintenanceCount: number; offlineCount: number; }>
  {
    try {
      const response = await this.apiClient.get('/drone-management/stats');
      const d = response.data || {};
      return {
        total: Number(d.total ?? 0),
        idleCount: Number(d.idleCount ?? 0),
        assignedCount: Number(d.assignedCount ?? 0),
        deliveringCount: Number(d.deliveringCount ?? 0),
        returningCount: Number(d.returningCount ?? 0),
        chargingCount: Number(d.chargingCount ?? 0),
        maintenanceCount: Number(d.maintenanceCount ?? 0),
        offlineCount: Number(d.offlineCount ?? 0),
      };
    } catch (error) {
      console.error('Error fetching fleet stats:', error);
      throw error;
    }
  }

  async updateDroneStatus(droneId: string, status: string): Promise<void> {
    try {
      await this.apiClient.put(`/drone-management/drones/${droneId}/status`, {
        status
      });
    } catch (error) {
      console.error('Error updating drone status:', error);
      throw error;
    }
  }

  // Update drone details
  async updateDrone(droneId: string, payload: Partial<DroneFleet>): Promise<DroneFleet> {
    try {
      const response = await this.apiClient.put(`/drone-management/drones/${droneId}`, payload);
      return response.data;
    } catch (error) {
      console.error('Error updating drone:', error);
      throw error;
    }
  }

  async setDroneMaintenance(droneId: string): Promise<void> {
    try {
      await this.apiClient.post(`/drone-management/drones/${droneId}/maintenance`);
    } catch (error) {
      console.error('Error setting drone maintenance:', error);
      throw error;
    }
  }

  async activateDrone(droneId: string): Promise<void> {
    try {
      await this.apiClient.post(`/drone-management/drones/${droneId}/activate`);
    } catch (error) {
      console.error('Error activating drone:', error);
      throw error;
    }
  }

  // Delete drone
  async deleteDrone(droneId: string): Promise<void> {
    try {
      await this.apiClient.delete(`/drone-management/drones/${droneId}`);
    } catch (error) {
      console.error('Error deleting drone:', error);
      throw error;
    }
  }

  // Assignment Management
  async getActiveAssignments(): Promise<DroneAssignment[]> {
    try {
      const response = await this.apiClient.get('/drone-management/assignments/active');
      return response.data.assignments || [];
    } catch (error) {
      console.error('Error fetching active assignments:', error);
      throw error;
    }
  }

  async stopDelivery(deliveryId: string): Promise<void> {
    try {
      await this.apiClient.post(`/drone-management/deliveries/${deliveryId}/stop`);
    } catch (error) {
      console.error('Error stopping delivery:', error);
      throw error;
    }
  }

  async resumeDelivery(deliveryId: string): Promise<void> {
    try {
      await this.apiClient.post(`/drone-management/deliveries/${deliveryId}/resume`);
    } catch (error) {
      console.error('Error resuming delivery:', error);
      throw error;
    }
  }

  // Real-time Tracking
  async getAllDronePositions(): Promise<DronePosition[]> {
    try {
      const response = await this.apiClient.get('/drone-tracking/positions');
      return response.data.positions || [];
    } catch (error) {
      console.error('Error fetching drone positions:', error);
      throw error;
    }
  }

  async getDeliveryTracking(deliveryId: string): Promise<DeliveryTracking> {
    try {
      const response = await this.apiClient.get(`/drone-tracking/delivery/${deliveryId}`);
      return response.data.tracking;
    } catch (error) {
      console.error('Error fetching delivery tracking:', error);
      throw error;
    }
  }

  async broadcastFleetStatus(): Promise<void> {
    try {
      await this.apiClient.post('/drone-tracking/broadcast-fleet');
    } catch (error) {
      console.error('Error broadcasting fleet status:', error);
      throw error;
    }
  }

  // Testing endpoints
  async updateDroneGps(droneId: string, lat: number, lng: number, batteryLevel?: number): Promise<void> {
    try {
      await this.apiClient.post(`/drone-tracking/drone/${droneId}/gps`, {
        lat,
        lng,
        batteryLevel: batteryLevel || 100
      });
    } catch (error) {
      console.error('Error updating drone GPS:', error);
      throw error;
    }
  }

  async updateDeliveryProgress(
    deliveryId: string, 
    currentSegment: number, 
    etaSeconds: number, 
    status?: string
  ): Promise<void> {
    try {
      await this.apiClient.post(`/drone-tracking/delivery/${deliveryId}/progress`, {
        currentSegment,
        etaSeconds,
        status
      });
    } catch (error) {
      console.error('Error updating delivery progress:', error);
      throw error;
    }
  }

  // WebSocket connection for real-time updates
  connectToRealTimeUpdates(callbacks: {
    onDroneGpsUpdate?: (data: any) => void;
    onDeliveryProgress?: (data: any) => void;
    onDroneStatusChange?: (data: any) => void;
    onDeliveryEtaUpdate?: (data: any) => void;
    onFleetStatusUpdate?: (data: any) => void;
  }) {
    // This would typically use SockJS/STOMP for WebSocket connection
    // For now, we'll use polling as a fallback
    const pollInterval = setInterval(async () => {
      try {
        if (callbacks.onFleetStatusUpdate) {
          const positions = await this.getAllDronePositions();
          callbacks.onFleetStatusUpdate({
            type: 'FLEET_STATUS_UPDATE',
            drones: positions,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error polling for updates:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }

  // Create a new drone in the fleet
  async createDrone(payload: Partial<DroneFleet>): Promise<DroneFleet> {
    try {
      const response = await this.apiClient.post('/drone-management/drones', payload);
      return response.data;
    } catch (error) {
      console.error('Error creating drone:', error);
      throw error;
    }
  }
}

const droneManagementService = new DroneManagementService();
export default droneManagementService;
