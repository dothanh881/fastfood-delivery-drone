package com.fastfood.management.controller;

import com.fastfood.management.dto.request.LoginRequest;
import com.fastfood.management.dto.request.RegisterRequest;
import com.fastfood.management.entity.User;
import com.fastfood.management.entity.StoreStaff;
import com.fastfood.management.entity.Store;
import com.fastfood.management.entity.Role;
import com.fastfood.management.repository.UserRepository;
import com.fastfood.management.repository.StoreRepository;
import com.fastfood.management.repository.StoreStaffRepository;
import com.fastfood.management.repository.RoleRepository;
import com.fastfood.management.security.JwtTokenProvider;
import com.fastfood.management.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import java.util.HashSet;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    // Phiên bản cơ bản: dùng trực tiếp UserRepository + PasswordEncoder để xác thực
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final StoreStaffRepository storeStaffRepository;
    private final StoreRepository storeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        // Tìm người dùng theo email
        User user = userRepository.findByEmail(loginRequest.getEmail()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Email không tồn tại"));
        }
        if (!user.isEnabled()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Tài khoản đang bị vô hiệu hoá"));
        }
        // (BCrypt)
        boolean matches = passwordEncoder.matches(loginRequest.getPassword(), user.getPasswordHash());
        if (!matches) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Sai mật khẩu"));
        }
        // Tạo token JWT cơ bản
        UserDetailsImpl principal = UserDetailsImpl.build(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        String token = jwtTokenProvider.generateToken(authentication);
        String refreshToken = jwtTokenProvider.generateRefreshToken(authentication);

        // Build roles list
        java.util.Set<String> roles = user.getRoles() != null
                ? user.getRoles().stream().map(Role::getCode).collect(java.util.stream.Collectors.toSet())
                : java.util.Collections.emptySet();

        // Build myStores payload similar to /me/stores for immediate role-based routing
        java.util.List<StoreStaff> activeStaff = storeStaffRepository.findByUserIdAndStatus(user.getId(), StoreStaff.StaffStatus.ACTIVE);
        java.util.List<Store> managerStores = storeRepository.findByManager(user);

        java.util.Map<Long, java.util.Map<String, Object>> payloadMap = new java.util.LinkedHashMap<>();

        for (Store s : managerStores) {
            payloadMap.put(s.getId(), java.util.Map.of(
                    "store_id", s.getId(),
                    "store_name", s.getName(),
                    "role", StoreStaff.StaffRole.MANAGER.name(),
                    "isManager", true,
                    "permissions", java.util.List.of("orders.view", "orders.approve", "inventory.view", "reports.view")
            ));
        }

        for (StoreStaff ss : activeStaff) {
            boolean isMgr = ss.getRole() == StoreStaff.StaffRole.MANAGER || (ss.getStore().getManager() != null && ss.getStore().getManager().getId().equals(user.getId()));
            java.util.List<String> perms = isMgr ? java.util.List.of("orders.view", "orders.approve", "inventory.view", "reports.view") : java.util.List.of("orders.view", "orders.approve", "inventory.view", "reports.view");
            java.util.Map<String, Object> entry = java.util.Map.of(
                    "store_id", ss.getStore().getId(),
                    "store_name", ss.getStore().getName(),
                    "role", ss.getRole().name(),
                    "isManager", isMgr,
                    "permissions", perms
            );
            payloadMap.put(ss.getStore().getId(), entry);
        }

        java.util.List<java.util.Map<String, Object>> myStores = new java.util.ArrayList<>(payloadMap.values());

        // return
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Đăng nhập thành công");
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("fullName", user.getFullName());
        response.put("roles", roles);
        response.put("token", token);
        response.put("refreshToken", refreshToken);
        response.put("myStores", myStores);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        // Phiên bản cơ bản: chỉ trả về thông báo, không quản lý session/JWT
        return ResponseEntity.ok(Map.of("message", "Đã đăng xuất"));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Email đã tồn tại"));
        }
        // Tạo user cơ bản
        User user = User.builder()
                .email(req.getEmail())
                .username(req.getUsername())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .fullName(req.getFullName())
                .phone(req.getPhoneNumber() != null ? req.getPhoneNumber() : "")
                .enabled(true)
                .roles(new HashSet<>())
                .build();
        // Gán role CUSTOMER nếu có, nếu chưa có thì tạo
        Role customerRole = roleRepository.findByCode(Role.ROLE_CUSTOMER)
                .orElseGet(() -> roleRepository.save(Role.builder().code(Role.ROLE_CUSTOMER).build()));
        user.getRoles().add(customerRole);
        User saved = userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of(
                        "message", "Đăng ký thành công",
                        "id", saved.getId(),
                        "email", saved.getEmail(),
                        "fullName", saved.getFullName()
                ));
    }
}