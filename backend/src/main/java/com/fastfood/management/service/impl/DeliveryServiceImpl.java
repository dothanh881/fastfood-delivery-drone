package com.fastfood.management.service.impl;

import com.fastfood.management.dto.request.GpsUpdateRequest;
import com.fastfood.management.dto.response.DeliveryResponse;
import com.fastfood.management.dto.response.TrackingResponse;
import com.fastfood.management.entity.Delivery;
import com.fastfood.management.entity.DeliveryEvent;
import com.fastfood.management.entity.Order;
import com.fastfood.management.entity.Drone;
import com.fastfood.management.repository.DeliveryRepository;
import com.fastfood.management.repository.OrderRepository;
import com.fastfood.management.repository.DroneRepository;
import com.fastfood.management.service.api.DeliveryService;
import com.fastfood.management.service.api.FleetService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class DeliveryServiceImpl implements DeliveryService {

    private final DeliveryRepository deliveryRepository;
    private final OrderRepository orderRepository;
    private final DroneRepository droneRepository;
    private final WebSocketService webSocketService;
    private final FleetService fleetService;

    // Hàm tiện ích: chuyển từ entity Delivery sang DTO DeliveryResponse (đơn giản hoá)
    private DeliveryResponse toResponse(Delivery delivery) {
        DeliveryResponse dto = new DeliveryResponse();
        dto.setId(delivery.getId());
        dto.setOrderId(delivery.getOrder() != null ? delivery.getOrder().getId() : null);
        dto.setDroneId(delivery.getDrone() != null ? delivery.getDrone().getId() : null);
        dto.setStatus(delivery.getStatus() != null ? delivery.getStatus().name() : null);
        dto.setStartLat(delivery.getStartLat());
        dto.setStartLng(delivery.getStartLng());
        dto.setDestLat(delivery.getDestLat());
        dto.setDestLng(delivery.getDestLng());
        dto.setCreatedAt(delivery.getCreatedAt());
        dto.setUpdatedAt(delivery.getUpdatedAt());
        // currentPosition: lấy từ sự kiện GPS cuối cùng nếu có
        DeliveryResponse.GpsPositionResponse gpsDto = null;
        if (delivery.getEvents() != null && !delivery.getEvents().isEmpty()) {
            Optional<DeliveryEvent> lastGps = delivery.getEvents().stream()
                    .filter(e -> e.getEventType() == DeliveryEvent.EventType.GPS_UPDATE)
                    .reduce((first, second) -> second);
            if (lastGps.isPresent()) {
                gpsDto = new DeliveryResponse.GpsPositionResponse();
                gpsDto.setLat(lastGps.get().getLat());
                gpsDto.setLng(lastGps.get().getLng());
                gpsDto.setSpeedKmh(lastGps.get().getSpeedKmh());
                gpsDto.setHeading(lastGps.get().getHeading());
                gpsDto.setBatteryPct(lastGps.get().getBatteryPct());
                gpsDto.setTimestamp(lastGps.get().getTs());
            }
        }
        dto.setCurrentPosition(gpsDto);
        return dto;
    }

    // Lấy danh sách đơn sẵn sàng giao (READY_FOR_DELIVERY) chuyển thành DeliveryResponse
    @Override
    @Transactional(readOnly = true)
    public List<DeliveryResponse> getReadyForDelivery() {
        // Tìm các đơn hàng có trạng thái READY_FOR_DELIVERY và có Delivery ở trạng thái PENDING
        List<Order> readyOrders = orderRepository.findByStatus(Order.OrderStatus.READY_FOR_DELIVERY, org.springframework.data.domain.Pageable.unpaged()).getContent();
        List<DeliveryResponse> result = new ArrayList<>();
        for (Order order : readyOrders) {
            Delivery delivery = order.getDelivery();
            if (delivery != null && delivery.getStatus() == Delivery.DeliveryStatus.PENDING) {
                result.add(toResponse(delivery));
            }
        }
        return result;
    }

    // Nhận giao: gán drone cho delivery và chuyển trạng thái sang ASSIGNED
    @Override
    public DeliveryResponse acceptDelivery(Long deliveryId, Long droneId) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy delivery với id: " + deliveryId));
        Drone drone = droneRepository.findById(droneId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy drone với id: " + droneId));
        delivery.setDrone(drone);
        delivery.setStatus(Delivery.DeliveryStatus.ASSIGNED);
        // Thêm event đánh dấu start
        DeliveryEvent startEvent = DeliveryEvent.builder()
                .delivery(delivery)
                .eventType(DeliveryEvent.EventType.DELIVERY_START)
                .ts(LocalDateTime.now())
                .build();
        delivery.getEvents().add(startEvent);
        deliveryRepository.save(delivery);
        return toResponse(delivery);
    }

    // Cập nhật GPS: thêm event GPS_UPDATE và nếu đang ASSIGNED thì chuyển sang IN_PROGRESS
    @Override
    public DeliveryResponse updateGpsPosition(Long deliveryId, GpsUpdateRequest gpsRequest) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy delivery với id: " + deliveryId));
        DeliveryEvent gpsEvent = DeliveryEvent.builder()
                .delivery(delivery)
                .eventType(DeliveryEvent.EventType.GPS_UPDATE)
                .lat(gpsRequest.getLat())
                .lng(gpsRequest.getLng())
                .speedKmh(gpsRequest.getSpeedKmh())
                .heading(gpsRequest.getHeading())
                .batteryPct(gpsRequest.getBatteryPct())
                .ts(LocalDateTime.now())
                .build();
        delivery.getEvents().add(gpsEvent);
        if (delivery.getStatus() == Delivery.DeliveryStatus.ASSIGNED) {
            delivery.setStatus(Delivery.DeliveryStatus.IN_PROGRESS);
        }
        deliveryRepository.save(delivery);

        // Phát WebSocket GPS realtime tới topic orders/{orderId}
        if (delivery.getOrder() != null) {
            Long orderId = delivery.getOrder().getId();
            Double speed = gpsRequest.getSpeedKmh();
            Double heading = gpsRequest.getHeading();
            Double battery = gpsRequest.getBatteryPct();
            // ETA đơn giản hoá: 0 phút (có thể tính toán thật sau)
            webSocketService.sendDroneGpsUpdate(orderId, gpsRequest.getLat(), gpsRequest.getLng(), 0, speed, heading, battery);
        }
        return toResponse(delivery);
    }

    // Hoàn tất giao: set trạng thái COMPLETED và thêm event DELIVERY_COMPLETE
    @Override
    public DeliveryResponse completeDelivery(Long deliveryId) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy delivery với id: " + deliveryId));

        // Chỉ cho phép hoàn tất khi order đang ở trạng thái OUT_FOR_DELIVERY
        Order order = delivery.getOrder();
        if (order != null && order.getStatus() != Order.OrderStatus.OUT_FOR_DELIVERY) {
            throw new IllegalStateException("Order phải ở trạng thái OUT_FOR_DELIVERY trước khi hoàn tất");
        }
        delivery.setStatus(Delivery.DeliveryStatus.COMPLETED);
        DeliveryEvent doneEvent = DeliveryEvent.builder()
                .delivery(delivery)
                .eventType(DeliveryEvent.EventType.DELIVERY_COMPLETE)
                .ts(LocalDateTime.now())
                .build();
        delivery.getEvents().add(doneEvent);
        deliveryRepository.save(delivery);

        // Cập nhật trạng thái đơn hàng sang DELIVERED nếu có
        if (order != null) {
            order.setStatus(Order.OrderStatus.DELIVERED);
            order.setUpdatedAt(LocalDateTime.now());
            orderRepository.save(order);
        }

        // Đưa drone về trạng thái IDLE qua FleetService (và broadcast state change)
        Drone drone = delivery.getDrone();
        if (drone != null) {
            try {
                fleetService.getCurrentAssignment(drone.getId())
                        .ifPresent(a -> fleetService.completeAssignment(a.getId()));
            } catch (Exception ex) {
                // Không chặn hoàn tất nếu không có assignment hiện tại
            }
        }
        return toResponse(delivery);
    }

    // Theo dõi theo orderId: tổng hợp thông tin hiện tại và lịch sử cơ bản
    @Override
    @Transactional(readOnly = true)
    public TrackingResponse trackDelivery(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với id: " + orderId));
        Delivery delivery = order.getDelivery();
        TrackingResponse tracking = new TrackingResponse();
        tracking.setOrderId(order.getId());
        tracking.setOrderStatus(order.getStatus() != null ? order.getStatus().name() : null);
        tracking.setDeliveryStatus(delivery != null && delivery.getStatus() != null ? delivery.getStatus().name() : null);
        tracking.setDestinationLat(delivery != null ? delivery.getDestLat() : null);
        tracking.setDestinationLng(delivery != null ? delivery.getDestLng() : null);
        // Lấy vị trí hiện tại từ event GPS cuối cùng
        if (delivery != null && delivery.getEvents() != null) {
            Optional<DeliveryEvent> lastGps = delivery.getEvents().stream()
                    .filter(e -> e.getEventType() == DeliveryEvent.EventType.GPS_UPDATE)
                    .reduce((first, second) -> second);
            if (lastGps.isPresent()) {
                tracking.setCurrentLat(lastGps.get().getLat());
                tracking.setCurrentLng(lastGps.get().getLng());
                tracking.setSpeedKmh(lastGps.get().getSpeedKmh());
                tracking.setBatteryPct(lastGps.get().getBatteryPct());
            }
            // Lịch sử (đơn giản chỉ lấy các điểm GPS)
            List<TrackingResponse.GpsHistoryPoint> history = delivery.getEvents().stream()
                    .filter(e -> e.getEventType() == DeliveryEvent.EventType.GPS_UPDATE)
                    .map(e -> {
                        TrackingResponse.GpsHistoryPoint p = new TrackingResponse.GpsHistoryPoint();
                        p.setLat(e.getLat());
                        p.setLng(e.getLng());
                        p.setTimestamp(e.getTs());
                        return p;
                    })
                    .collect(Collectors.toList());
            tracking.setHistory(history);
        }
        // Thời gian ước tính còn lại: đơn giản hoá -> null
        tracking.setEstimatedMinutesRemaining(null);
        return tracking;
    }
}