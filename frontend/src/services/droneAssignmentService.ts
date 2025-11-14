import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

export interface DroneStation {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  capacity: number;
  currentDrones: number;
  availableDrones: string[]; // drone IDs
  coverageRadius: number; // km
  status: 'active' | 'maintenance' | 'offline';
}

export interface AssignmentRequest {
  orderId: string;
  customerLocation: {
    lat: number;
    lng: number;
  };
  storeLocation: {
    lat: number;
    lng: number;
  };
  priority: 'normal' | 'high' | 'urgent';
  estimatedWeight: number; // grams
}

export interface AssignmentResult {
  success: boolean;
  droneId?: string;
  stationId?: string;
  estimatedDeliveryTime?: number; // minutes
  route?: {
    distance: number; // km
    duration: number; // minutes
    waypoints: Array<{lat: number; lng: number}>;
  };
  message: string;
}

export interface DroneCapability {
  maxWeight: number; // grams
  maxDistance: number; // km
  batteryLevel: number; // percentage
  currentLoad: number; // grams
}

export class DroneAssignmentService {
  
  // Mock drone stations data
  private static mockStations: DroneStation[] = [
    {
      id: 'station-1',
      name: 'Quận 1 Hub',
      location: { lat: 10.762622, lng: 106.660172 },
      capacity: 10,
      currentDrones: 7,
      availableDrones: ['drone-1', 'drone-2', 'drone-3'],
      coverageRadius: 5,
      status: 'active'
    },
    {
      id: 'station-2', 
      name: 'Quận 3 Hub',
      location: { lat: 10.786785, lng: 106.695053 },
      capacity: 8,
      currentDrones: 5,
      availableDrones: ['drone-4', 'drone-5'],
      coverageRadius: 4,
      status: 'active'
    },
    {
      id: 'station-3',
      name: 'Quận 7 Hub', 
      location: { lat: 10.731971, lng: 106.719444 },
      capacity: 12,
      currentDrones: 8,
      availableDrones: ['drone-6', 'drone-7', 'drone-8'],
      coverageRadius: 6,
      status: 'active'
    }
  ];

  // Calculate distance between two points using Haversine formula
  private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Find best station for delivery based on distance and availability
  private static findBestStation(customerLocation: {lat: number; lng: number}): DroneStation | null {
    const availableStations = this.mockStations.filter(station => 
      station.status === 'active' && station.availableDrones.length > 0
    );

    if (availableStations.length === 0) return null;

    // Find station with shortest distance to customer and available drones
    let bestStation = availableStations[0];
    let shortestDistance = this.calculateDistance(
      customerLocation.lat, customerLocation.lng,
      bestStation.location.lat, bestStation.location.lng
    );

    for (const station of availableStations) {
      const distance = this.calculateDistance(
        customerLocation.lat, customerLocation.lng,
        station.location.lat, station.location.lng
      );
      
      // Prefer stations within coverage radius and with more available drones
      if (distance <= station.coverageRadius && 
          (distance < shortestDistance || station.availableDrones.length > bestStation.availableDrones.length)) {
        bestStation = station;
        shortestDistance = distance;
      }
    }

    return shortestDistance <= bestStation.coverageRadius ? bestStation : null;
  }

  // Auto assign drone with station-based logic
  static async autoAssignDroneWithStation(request: AssignmentRequest): Promise<AssignmentResult> {
    try {
      // Find best station for this delivery
      const bestStation = this.findBestStation(request.customerLocation);
      
      if (!bestStation) {
        return {
          success: false,
          message: 'Không có trạm drone nào khả dụng trong khu vực giao hàng'
        };
      }

      // Select best drone from station
      const selectedDroneId = bestStation.availableDrones[0]; // Simple selection, can be improved

      // Calculate route: Store -> Customer -> Station
      const storeToCustomerDistance = this.calculateDistance(
        request.storeLocation.lat, request.storeLocation.lng,
        request.customerLocation.lat, request.customerLocation.lng
      );
      
      const customerToStationDistance = this.calculateDistance(
        request.customerLocation.lat, request.customerLocation.lng,
        bestStation.location.lat, bestStation.location.lng
      );

      const totalDistance = storeToCustomerDistance + customerToStationDistance;
      const estimatedTime = Math.ceil(totalDistance * 2); // 2 minutes per km (rough estimate)

      // Call backend API for actual assignment
      const response = await axios.post(`${API_BASE_URL}/drone/assignments/auto`, {
        orderId: request.orderId
      });

      if (response.data.success) {
        // Update station data (remove drone from available list)
        bestStation.availableDrones = bestStation.availableDrones.filter(id => id !== selectedDroneId);
        bestStation.currentDrones--;

        return {
          success: true,
          droneId: selectedDroneId,
          stationId: bestStation.id,
          estimatedDeliveryTime: estimatedTime,
          route: {
            distance: totalDistance,
            duration: estimatedTime,
            waypoints: [
              request.storeLocation,
              request.customerLocation,
              bestStation.location
            ]
          },
          message: `Đã gán drone ${selectedDroneId} từ ${bestStation.name}`
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Không thể gán drone'
        };
      }

    } catch (error) {
      console.error('Auto assignment error:', error);
      return {
        success: false,
        message: 'Lỗi hệ thống khi gán drone tự động'
      };
    }
  }

  // Get all drone stations
  static async getDroneStations(): Promise<DroneStation[]> {
    // In real implementation, this would call backend API
    return this.mockStations;
  }

  // Get station by ID
  static async getStationById(stationId: string): Promise<DroneStation | null> {
    return this.mockStations.find(station => station.id === stationId) || null;
  }

  // Check if location is within any station's coverage
  static isLocationCovered(location: {lat: number; lng: number}): boolean {
    return this.mockStations.some(station => {
      const distance = this.calculateDistance(
        location.lat, location.lng,
        station.location.lat, station.location.lng
      );
      return distance <= station.coverageRadius && station.status === 'active';
    });
  }

  // Get coverage map for visualization
  static getCoverageAreas(): Array<{center: {lat: number; lng: number}; radius: number; stationId: string}> {
    return this.mockStations
      .filter(station => station.status === 'active')
      .map(station => ({
        center: station.location,
        radius: station.coverageRadius * 1000, // convert to meters for map display
        stationId: station.id
      }));
  }
}

export default DroneAssignmentService;