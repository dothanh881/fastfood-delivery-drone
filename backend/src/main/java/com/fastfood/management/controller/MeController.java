package com.fastfood.management.controller;

import com.fastfood.management.entity.StoreStaff;
import com.fastfood.management.entity.Store;
import com.fastfood.management.entity.Role;
import com.fastfood.management.entity.User;
import com.fastfood.management.repository.StoreRepository;
import com.fastfood.management.repository.StoreStaffRepository;
import com.fastfood.management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/me")
@RequiredArgsConstructor
public class MeController {

    private final UserRepository userRepository;
    private final StoreStaffRepository storeStaffRepository;
    private final StoreRepository storeRepository;

    /**
     * Trả về danh sách cửa hàng mà người dùng thuộc (MANAGER/STAFF) với trạng thái ACTIVE.
     * Cho phép nếu user có ROLE_MERCHANT/ROLE_ADMIN hoặc thực sự có bản ghi staff ACTIVE.
     */
    @GetMapping("/stores")
    public ResponseEntity<?> getMyStores(@RequestParam("userId") Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Không tìm thấy người dùng"));
        }

        boolean isMerchant = user.getRoles().stream().anyMatch(r -> Role.ROLE_MERCHANT.equals(r.getCode()));
        boolean isAdmin = user.getRoles().stream().anyMatch(r -> Role.ROLE_ADMIN.equals(r.getCode()));

        List<StoreStaff> activeStaff = storeStaffRepository.findByUserIdAndStatus(user.getId(), StoreStaff.StaffStatus.ACTIVE);
        List<Store> managerStores = storeRepository.findByManager(user);

        if (!(isMerchant || isAdmin) && activeStaff.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không có quyền truy cập Merchant Portal"));
        }

        // Permissions mapping
        List<String> managerPermissions = List.of(
                "orders.view", "orders.approve", "inventory.view", "reports.view"
        );
        List<String> staffPermissions = List.of(
                "orders.view", "orders.approve", "inventory.view", "reports.view"
        );

        // Merge manager-owned stores and active staff memberships
        Map<Long, Map<String, Object>> payloadMap = new java.util.LinkedHashMap<>();

        // Add manager stores (owner/manager via global MERCHANT)
        for (Store s : managerStores) {
            payloadMap.put(s.getId(), Map.of(
                    "store_id", s.getId(),
                    "store_name", s.getName(),
                    "role", StoreStaff.StaffRole.MANAGER.name(),
                    "isManager", true,
                    "permissions", managerPermissions
            ));
        }

        // Add/merge active staff memberships
        for (StoreStaff ss : activeStaff) {
            boolean isMgr = ss.getRole() == StoreStaff.StaffRole.MANAGER || (ss.getStore().getManager() != null && ss.getStore().getManager().getId().equals(user.getId()));
            List<String> perms = isMgr ? managerPermissions : staffPermissions;

            Map<String, Object> entry = Map.of(
                    "store_id", ss.getStore().getId(),
                    "store_name", ss.getStore().getName(),
                    "role", ss.getRole().name(),
                    "isManager", isMgr,
                    "permissions", perms
            );
            payloadMap.put(ss.getStore().getId(), entry);
        }

        List<Map<String, Object>> payload = payloadMap.values().stream().collect(Collectors.toList());
        return ResponseEntity.ok(payload);
    }
}