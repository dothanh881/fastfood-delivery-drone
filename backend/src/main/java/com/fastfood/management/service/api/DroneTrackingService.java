package com.fastfood.management.service.api;

import java.util.List;
import java.util.Map;

public interface DroneTrackingService {
    
    /**
     * Cập nhật vị trí GPS của drone
     */
    void updateDroneGps(Long droneId, double lat, double lng, double batteryLevel);
    
    /**
     * Cập nhật tiến độ delivery
     */
    void updateDeliveryProgress(Long deliveryId, String currentSegment, int etaSeconds, String status);
    
    /**
     * Thông báo thay đổi trạng thái drone
     */
    void notifyDroneStatusChange(Long droneId, String oldStatus, String newStatus);
    
    /**
     * Thông báo cập nhật ETA của delivery
     */
    void notifyDeliveryEtaUpdate(Long deliveryId, int newEtaSeconds);
    
    /**
     * Lấy vị trí của tất cả drone đang hoạt động
     */
    List<Map<String, Object>> getAllActiveDronePositions();
    
    /**
     * Lấy thông tin tracking của một delivery
     */
    Map<String, Object> getDeliveryTrackingInfo(Long deliveryId);
    
    /**
     * Broadcast trạng thái fleet qua WebSocket
     */
    void broadcastFleetStatus();
}