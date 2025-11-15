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
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest) {
        try {
            System.out.println("=== LOGIN ATTEMPT: " + (loginRequest != null ? loginRequest.getEmail() : "null request") + " ===");

            // Validate input
            if (loginRequest == null || loginRequest.getEmail() == null || loginRequest.getPassword() == null) {
                System.err.println("Invalid request: missing email or password");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Email và password không được để trống"));
            }

            System.out.println("Step 1: Finding user by email: " + loginRequest.getEmail());
            // Tìm người dùng theo email
            User user = userRepository.findByEmail(loginRequest.getEmail()).orElse(null);
            if (user == null) {
                System.err.println("User not found: " + loginRequest.getEmail());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Email không tồn tại"));
            }
            System.out.println("Step 2: User found: " + user.getEmail() + ", enabled: " + user.isEnabled());

            if (!user.isEnabled()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Tài khoản đang bị vô hiệu hoá"));
            }

            System.out.println("Step 3: Checking password");
            // (BCrypt)
            boolean matches = passwordEncoder.matches(loginRequest.getPassword(), user.getPasswordHash());
            if (!matches) {
                System.err.println("Password mismatch for user: " + user.getEmail());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Sai mật khẩu"));
            }
            System.out.println("Step 4: Password matches, generating tokens");

            // Tạo token JWT cơ bản
            UserDetailsImpl principal = UserDetailsImpl.build(user);
            Authentication authentication = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
            String token = jwtTokenProvider.generateToken(authentication);
            String refreshToken = jwtTokenProvider.generateRefreshToken(authentication);

            System.out.println("Step 5: Building roles");
            // Build roles list - handle null safely
            java.util.Set<String> roles = new java.util.HashSet<>();
            if (user.getRoles() != null && !user.getRoles().isEmpty()) {
                roles = user.getRoles().stream()
                        .filter(r -> r != null && r.getCode() != null)
                        .map(Role::getCode)
                        .collect(java.util.stream.Collectors.toSet());
            }
            System.out.println("Step 6: User roles: " + roles);

            System.out.println("Step 7: Building response (skipping myStores for now)");
            // return - SIMPLIFIED without myStores to avoid errors
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Đăng nhập thành công");
            response.put("id", user.getId());
            response.put("email", user.getEmail());
            response.put("fullName", user.getFullName());
            response.put("roles", roles);
            response.put("token", token);
            response.put("refreshToken", refreshToken);
            response.put("myStores", new java.util.ArrayList<>()); // Empty for now

            System.out.println("=== LOGIN SUCCESS for " + user.getEmail() + " ===");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // Log exception for debugging
            System.err.println("=== LOGIN ERROR ===");
            System.err.println("Error message: " + e.getMessage());
            System.err.println("Error class: " + e.getClass().getName());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Lỗi hệ thống: " + e.getMessage(), "error", e.getClass().getSimpleName()));
        }
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
