package com.fastfood.management.service.api;

import com.fastfood.management.dto.request.GpsUpdateRequest;
import com.fastfood.management.dto.response.DeliveryResponse;
import com.fastfood.management.dto.response.TrackingResponse;

import java.util.List;

public interface DeliveryService {
    // quản lý danh sách Đơn hàng Sẵn sàng Giao
    List<DeliveryResponse> getReadyForDelivery();
  
//- Gán drone cụ thể cho delivery
// Chuyển trạng thái delivery từ PENDING → ASSIGNED
    DeliveryResponse acceptDelivery(Long deliveryId, Long droneId);
    //Cập nhật Vị trí GPS Realtime
    DeliveryResponse updateGpsPosition(Long deliveryId, GpsUpdateRequest gpsRequest);
    DeliveryResponse completeDelivery(Long deliveryId);
    //Theo dõi Đơn hàng
    TrackingResponse trackDelivery(Long orderId);
}