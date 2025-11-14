package com.fastfood.management.service.api;

import com.fastfood.management.entity.Drone;
import com.fastfood.management.entity.DroneAssignment;
import com.fastfood.management.entity.Order;

import java.util.List;
import java.util.Optional;

public interface FleetService {
    
    /**
     * Tự động gán drone cho đơn hàng theo logic round-robin
     * @param order Đơn hàng cần gán drone
     * @return DroneAssignment nếu thành công, null nếu không có drone rảnh
     */
    Optional<DroneAssignment> autoAssignDrone(Order order);
    
    /**
     * Gán drone thủ công cho đơn hàng
     * @param order Đơn hàng cần gán
     * @param drone Drone được chỉ định
     * @param assignedBy Người thực hiện gán (admin/manager)
     * @return DroneAssignment
     */
    DroneAssignment manualAssignDrone(Order order, Drone drone, String assignedBy);
    
    /**
     * Lấy danh sách drone rảnh (IDLE)
     * @return Danh sách drone có thể gán
     */
    List<Drone> getAvailableDrones();
    
    /**
     * Chọn drone theo logic round-robin (lastAssignedAt cũ nhất)
     * @param availableDrones Danh sách drone rảnh
     * @return Drone được chọn
     */
    Optional<Drone> selectDroneRoundRobin(List<Drone> availableDrones);
    
    /**
     * Hoàn thành assignment và đặt drone về IDLE
     * @param assignmentId ID của assignment
     */
    void completeAssignment(Long assignmentId);
    
    /**
     * Lấy assignment hiện tại của drone
     * @param droneId ID của drone
     * @return Assignment đang active
     */
    Optional<DroneAssignment> getCurrentAssignment(Long droneId);
}