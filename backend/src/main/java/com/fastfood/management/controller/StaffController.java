package com.fastfood.management.controller;

import com.fastfood.management.entity.Role;
import com.fastfood.management.entity.Store;
import com.fastfood.management.entity.StoreStaff;
import com.fastfood.management.entity.User;
import com.fastfood.management.repository.RoleRepository;
import com.fastfood.management.repository.StoreRepository;
import com.fastfood.management.repository.StoreStaffRepository;
import com.fastfood.management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/staff")
@RequiredArgsConstructor
public class StaffController {

    private final StoreStaffRepository storeStaffRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<?> list(@RequestParam Long storeId,
                                  @RequestParam(required = false) String status) {
        List<StoreStaff> list;
        if (status != null) {
            StoreStaff.StaffStatus st;
            try { st = StoreStaff.StaffStatus.valueOf(status.toUpperCase()); }
            catch (IllegalArgumentException e) { return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Trạng thái không hợp lệ")); }
            list = storeStaffRepository.findByStoreIdAndStatus(storeId, st);
        } else {
            list = storeStaffRepository.findByStoreId(storeId);
        }

        List<Map<String, Object>> payload = new ArrayList<>();
        for (StoreStaff ss : list) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", ss.getId());
            item.put("storeId", ss.getStore().getId());
            item.put("userId", ss.getUser().getId());
            item.put("fullName", ss.getUser().getFullName());
            item.put("phone", ss.getUser().getPhone());
            item.put("email", ss.getUser().getEmail());
            item.put("role", ss.getRole().name());
            item.put("title", ss.getTitle());
            item.put("status", ss.getStatus().name());
            item.put("enabled", ss.getUser().isEnabled());
            payload.add(item);
        }
        return ResponseEntity.ok(payload);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> req) {
        try {
            Long storeId = ((Number) req.get("storeId")).longValue();
            String email = (String) req.getOrDefault("email", "");
            String fullName = (String) req.getOrDefault("fullName", "");
            String phone = (String) req.getOrDefault("phone", "");
            String title = (String) req.getOrDefault("title", "");
            String roleStr = (String) req.getOrDefault("role", "STAFF");

            Store store = storeRepository.findById(storeId).orElse(null);
            if (store == null) return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Không tìm thấy cửa hàng"));
            if (email == null || email.trim().isEmpty()) return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Email không được trống"));

            // Chỉ liên kết user đã tồn tại, không tạo mới
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Người dùng không tồn tại. Vui lòng tạo user trước"));
            }

            StoreStaff.StaffRole role = "MANAGER".equalsIgnoreCase(roleStr) ? StoreStaff.StaffRole.MANAGER : StoreStaff.StaffRole.STAFF;
            StoreStaff staff = StoreStaff.builder()
                    .store(store)
                    .user(user)
                    .title(title)
                    .role(role)
                    .status(StoreStaff.StaffStatus.ACTIVE)
                    .build();
            StoreStaff saved = storeStaffRepository.save(staff);

            Map<String, Object> payload = Map.of(
                    "id", saved.getId(),
                    "storeId", store.getId(),
                    "userId", user.getId(),
                    "fullName", user.getFullName(),
                    "phone", user.getPhone(),
                    "email", user.getEmail(),
                    "role", saved.getRole().name(),
                    "title", saved.getTitle(),
                    "status", saved.getStatus().name(),
                    "enabled", user.isEnabled()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(payload);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Không thể tạo nhân viên: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> req) {
        Optional<StoreStaff> existingOpt = storeStaffRepository.findById(id);
        if (existingOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Không tìm thấy nhân viên"));
        try {
            StoreStaff ss = existingOpt.get();
            String fullName = (String) req.get("fullName");
            String phone = (String) req.get("phone");
            String title = (String) req.get("title");
            String roleStr = (String) req.get("role");
            String statusStr = (String) req.get("status");

            if (fullName != null) ss.getUser().setFullName(fullName);
            if (phone != null) ss.getUser().setPhone(phone);
            userRepository.save(ss.getUser());
            if (title != null) ss.setTitle(title);
            if (roleStr != null) {
                ss.setRole("MANAGER".equalsIgnoreCase(roleStr) ? StoreStaff.StaffRole.MANAGER : StoreStaff.StaffRole.STAFF);
            }
            if (statusStr != null) {
                try { ss.setStatus(StoreStaff.StaffStatus.valueOf(statusStr.toUpperCase())); } catch (IllegalArgumentException ignored) {}
            }
            StoreStaff saved = storeStaffRepository.save(ss);
            return ResponseEntity.ok(Map.of(
                    "id", saved.getId(),
                    "storeId", saved.getStore().getId(),
                    "userId", saved.getUser().getId(),
                    "fullName", saved.getUser().getFullName(),
                    "phone", saved.getUser().getPhone(),
                    "email", saved.getUser().getEmail(),
                    "role", saved.getRole().name(),
                    "title", saved.getTitle(),
                    "status", saved.getStatus().name(),
                    "enabled", saved.getUser().isEnabled()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Không thể cập nhật nhân viên: " + e.getMessage()));
        }
    }

    // Khóa/mở khóa tài khoản user (ngăn đăng nhập)
    @PatchMapping("/user/{userId}/lock")
    public ResponseEntity<?> lockUser(@PathVariable Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Không tìm thấy người dùng"));
        User u = userOpt.get();
        u.setEnabled(false);
        userRepository.save(u);
        return ResponseEntity.ok(Map.of("userId", u.getId(), "enabled", u.isEnabled()));
    }

    @PatchMapping("/user/{userId}/unlock")
    public ResponseEntity<?> unlockUser(@PathVariable Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Không tìm thấy người dùng"));
        User u = userOpt.get();
        u.setEnabled(true);
        userRepository.save(u);
        return ResponseEntity.ok(Map.of("userId", u.getId(), "enabled", u.isEnabled()));
    }

    @PatchMapping("/{id}/block")
    public ResponseEntity<?> block(@PathVariable Long id) {
        Optional<StoreStaff> existingOpt = storeStaffRepository.findById(id);
        if (existingOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Không tìm thấy nhân viên"));
        StoreStaff ss = existingOpt.get();
        ss.setStatus(StoreStaff.StaffStatus.INACTIVE);
        StoreStaff saved = storeStaffRepository.save(ss);
        return ResponseEntity.ok(Map.of("id", saved.getId(), "status", saved.getStatus().name()));
    }

    @PatchMapping("/{id}/unblock")
    public ResponseEntity<?> unblock(@PathVariable Long id) {
        Optional<StoreStaff> existingOpt = storeStaffRepository.findById(id);
        if (existingOpt.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Không tìm thấy nhân viên"));
        StoreStaff ss = existingOpt.get();
        ss.setStatus(StoreStaff.StaffStatus.ACTIVE);
        StoreStaff saved = storeStaffRepository.save(ss);
        return ResponseEntity.ok(Map.of("id", saved.getId(), "status", saved.getStatus().name()));
    }
}