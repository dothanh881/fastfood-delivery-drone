package com.fastfood.management.bootstrap;

import com.fastfood.management.entity.Delivery;
import com.fastfood.management.entity.Drone;
import com.fastfood.management.entity.DroneAssignment;
import com.fastfood.management.entity.Order;
import com.fastfood.management.repository.DeliveryRepository;
import com.fastfood.management.repository.DroneRepository;
import com.fastfood.management.repository.OrderRepository;
import com.fastfood.management.service.api.DroneSimulator;
import com.fastfood.management.service.api.FleetService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
@RequiredArgsConstructor
@Slf4j
public class AutoAssignScheduler {

    private final FleetService fleetService;
    private final OrderRepository orderRepository;
    private final DeliveryRepository deliveryRepository;
    private final DroneRepository droneRepository;
    private final DroneSimulator droneSimulator;

    private final AtomicBoolean running = new AtomicBoolean(false);

    /**
     * Chu kỳ kiểm tra tự động: mỗi 5 giây (có thể điều chỉnh bằng property `drone.autoAssign.pollDelayMs`).
     * Lấy tối đa số lượng bằng với số drone IDLE hiện có và auto-assign theo thứ tự đơn cũ nhất.
     */
    @Scheduled(fixedDelayString = "${drone.autoAssign.pollDelayMs:5000}")
    public void pollAndAssign() {
        if (!running.compareAndSet(false, true)) {
            return; // tránh job chồng nhau
        }
        try {
            List<Drone> available = fleetService.getAvailableDrones();
            if (available == null || available.isEmpty()) {
                return;
            }

            int capacity = Math.max(1, available.size());
            Pageable oldestN = PageRequest.of(0, capacity, Sort.by(Sort.Direction.ASC, "createdAt"));
            Page<Order> page = orderRepository.findByStatus(Order.OrderStatus.READY_FOR_DELIVERY, oldestN);
            List<Order> candidates = page.getContent();
            if (candidates.isEmpty()) {
                return;
            }

            for (Order order : candidates) {
                // Bảo vệ thêm: chỉ auto-assign các đơn đã thanh toán
                if (order.getPaymentStatus() != Order.PaymentStatus.PAID) {
                    continue;
                }

                Optional<DroneAssignment> opt = fleetService.autoAssignDrone(order);
                if (opt.isEmpty()) {
                    break; // hết drone rảnh
                }
                DroneAssignment assignment = opt.get();

                // Cập nhật trạng thái order/delivery/drone để bắt đầu giao hàng
                order.setStatus(Order.OrderStatus.OUT_FOR_DELIVERY);
                order.setUpdatedAt(LocalDateTime.now());
                orderRepository.save(order);

                Delivery delivery = assignment.getDelivery();
                delivery.setStatus(Delivery.DeliveryStatus.IN_PROGRESS);
                delivery.setCurrentSegment("W0_W1");
                delivery.setSegmentStartTime(LocalDateTime.now());
                deliveryRepository.save(delivery);

                Drone drone = assignment.getDrone();
                drone.setStatus(Drone.DroneStatus.EN_ROUTE_TO_STORE);
                droneRepository.save(drone);

                // Bắt đầu mô phỏng bay
                droneSimulator.startSimulation(delivery.getId());
                log.info("Auto-assigned order {} to drone {} and started simulation (delivery {}).", order.getId(), drone.getId(), delivery.getId());
            }
        } catch (Exception e) {
            log.error("Auto-assign scheduler error: {}", e.getMessage());
        } finally {
            running.set(false);
        }
    }
}