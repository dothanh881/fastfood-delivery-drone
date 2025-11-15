package com.fastfood.management.controller;

import com.fastfood.management.entity.Role;
import com.fastfood.management.entity.User;
import com.fastfood.management.repository.RoleRepository;
import com.fastfood.management.repository.UserRepository;
import com.fastfood.management.security.JwtTokenProvider;
import com.fastfood.management.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.Map;

@RestController
@RequestMapping("/test")
@RequiredArgsConstructor
public class TestAuthController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping("/simple-login")
    public ResponseEntity<?> simpleLogin(@RequestBody Map<String, String> payload) {
        try {
            System.out.println("=== SIMPLE LOGIN TEST ===");
            System.out.println("Payload: " + payload);

            String email = payload.get("email");
            String password = payload.get("password");

            if (email == null || password == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing email or password"));
            }

            System.out.println("Looking for user: " + email);
            User user = userRepository.findByEmail(email).orElse(null);

            if (user == null) {
                System.err.println("User not found: " + email);
                return ResponseEntity.status(401).body(Map.of("error", "User not found"));
            }

            System.out.println("User found: " + user.getEmail());
            System.out.println("Checking password...");

            boolean matches = passwordEncoder.matches(password, user.getPasswordHash());

            if (!matches) {
                System.err.println("Password mismatch");
                return ResponseEntity.status(401).body(Map.of("error", "Wrong password"));
            }

            System.out.println("Password OK, generating token...");

            UserDetailsImpl principal = UserDetailsImpl.build(user);
            Authentication authentication = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
            String token = jwtTokenProvider.generateToken(authentication);

            System.out.println("=== LOGIN SUCCESS ===");

            return ResponseEntity.ok(Map.of(
                "message", "Login successful",
                "email", user.getEmail(),
                "token", token,
                "id", user.getId()
            ));

        } catch (Exception e) {
            System.err.println("=== SIMPLE LOGIN ERROR ===");
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getClass().getSimpleName(),
                "message", e.getMessage() != null ? e.getMessage() : "Unknown error"
            ));
        }
    }

    @GetMapping("/create-user")
    public ResponseEntity<?> createTestUser() {
        try {
            if (userRepository.existsByEmail("test@example.com")) {
                return ResponseEntity.ok(Map.of("message", "User already exists"));
            }

            Role customerRole = roleRepository.findByCode(Role.ROLE_CUSTOMER)
                .orElseGet(() -> roleRepository.save(Role.builder()
                    .code(Role.ROLE_CUSTOMER)
                    .name("Customer")
                    .build()));

            User user = User.builder()
                .email("test@example.com")
                .username("test")
                .passwordHash(passwordEncoder.encode("123"))
                .fullName("Test User")
                .phone("0000000000")
                .enabled(true)
                .roles(new HashSet<>())
                .build();

            user.getRoles().add(customerRole);
            userRepository.save(user);

            return ResponseEntity.ok(Map.of(
                "message", "Test user created",
                "email", "test@example.com",
                "password", "123"
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}

