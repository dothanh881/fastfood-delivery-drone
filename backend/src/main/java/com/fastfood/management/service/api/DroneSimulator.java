package com.fastfood.management.service.api;

import com.fastfood.management.entity.Delivery;

public interface DroneSimulator {
    
    /**
     * Bắt đầu simulation cho delivery
     * @param deliveryId ID của delivery cần simulate
     */
    void startSimulation(Long deliveryId);
    
    /**
     * Dừng simulation cho delivery
     * @param deliveryId ID của delivery cần dừng
     */
    void stopSimulation(Long deliveryId);
    
    /**
     * Thực hiện một tick simulation cho delivery
     * @param delivery Delivery object cần update
     */
    void tick(Delivery delivery);
    
    /**
     * Tính toán vị trí hiện tại của drone bằng linear interpolation
     * @param delivery Delivery object
     * @return Array [lat, lng] của vị trí hiện tại
     */
    double[] calculateCurrentPosition(Delivery delivery);
    
    /**
     * Tính toán ETA còn lại (seconds)
     * @param delivery Delivery object
     * @return ETA in seconds
     */
    int calculateRemainingETA(Delivery delivery);
    
    /**
     * Chuyển sang segment tiếp theo
     * @param delivery Delivery object
     * @return true nếu còn segment tiếp theo, false nếu đã hoàn thành
     */
    boolean moveToNextSegment(Delivery delivery);
    
    /**
     * Kiểm tra xem simulation có đang chạy cho delivery không
     * @param deliveryId ID của delivery cần kiểm tra
     * @return true nếu simulation đang chạy, false nếu không
     */
    boolean isSimulationRunning(Long deliveryId);
}