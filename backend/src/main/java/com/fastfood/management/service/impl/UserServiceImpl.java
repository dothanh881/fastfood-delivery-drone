package com.fastfood.management.service.impl;

import com.fastfood.management.dto.request.RegisterRequest;
import com.fastfood.management.dto.request.LoginRequest;
import com.fastfood.management.dto.response.JwtResponse;
import com.fastfood.management.dto.response.UserResponse;
import com.fastfood.management.entity.Role;
import com.fastfood.management.entity.User;
import com.fastfood.management.exception.ResourceNotFoundException;
import com.fastfood.management.mapper.UserMapper;
import com.fastfood.management.repository.RoleRepository;
import com.fastfood.management.repository.UserRepository;
import com.fastfood.management.service.api.UserService;
import com.fastfood.management.security.JwtTokenProvider;
import com.fastfood.management.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import jakarta.persistence.EntityNotFoundException;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
//
    @Override
    public UserResponse register(RegisterRequest registerRequest) {
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = User.builder()
                .email(registerRequest.getEmail())
                .username(registerRequest.getUsername())
                .passwordHash(passwordEncoder.encode(registerRequest.getPassword()))
                .fullName(registerRequest.getFullName())
                .phone(registerRequest.getPhoneNumber() != null ? registerRequest.getPhoneNumber() : "")
                .enabled(true)
                .roles(new HashSet<>())
                .build();

        Role customerRole = roleRepository.findByCode(Role.ROLE_CUSTOMER)
                .orElseThrow(() -> new ResourceNotFoundException("Role CUSTOMER not found"));

        user.getRoles().add(customerRole);
        User savedUser = userRepository.save(user);
        return userMapper.toResponse(savedUser);
    }
//
    @Override
    public JwtResponse login(LoginRequest loginRequest) {
        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        if (!user.isEnabled()) {
            throw new IllegalArgumentException("User account is disabled");
        }

        UserDetailsImpl principal = UserDetailsImpl.build(user);
        Authentication authentication = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities());
        String token = jwtTokenProvider.generateToken(authentication);

        Set<String> roles = user.getRoles().stream()
                .map(Role::getCode)
                .collect(Collectors.toSet());

        return new JwtResponse(token, user.getId(), user.getUsername(), user.getEmail(), roles);
    }
//
    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return userMapper.toResponse(user);
    }
//
    // Optional helper if needed elsewhere
    @Transactional(readOnly = true)
    public UserResponse getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return userMapper.toResponse(user);
    }
//
    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        List<User> users = userRepository.findAll();
        return users.stream()
                .map(userMapper::toResponse)
                .collect(Collectors.toList());
    }
//
    @Override
    public UserResponse updateUser(Long id, UserResponse userResponse) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (userResponse.getFullName() != null) {
            user.setFullName(userResponse.getFullName());
        }
        if (userResponse.getPhoneNumber() != null) {
            user.setPhone(userResponse.getPhoneNumber());
        }
        if (userResponse.getEmail() != null && !userResponse.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(userResponse.getEmail())) {
                throw new IllegalArgumentException("Email already exists");
            }
            user.setEmail(userResponse.getEmail());
        }

        User updatedUser = userRepository.save(user);
        return userMapper.toResponse(updatedUser);
    }
//
    @Override
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        user.setEnabled(false);
        userRepository.save(user);
    }
//
    @Override
    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("No authenticated user found");
        }
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .filter(User::isEnabled)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
    }
//
    @Override
    public JwtResponse refreshToken(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new IllegalArgumentException("Invalid refresh token");
        }
        String email = jwtTokenProvider.getUsernameFromToken(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!user.isEnabled()) {
            throw new IllegalArgumentException("User account is disabled");
        }
        UserDetailsImpl principal = UserDetailsImpl.build(user);
        Authentication authentication = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities());
        String newAccessToken = jwtTokenProvider.generateToken(authentication);

        Set<String> roles = user.getRoles().stream()
                .map(Role::getCode)
                .collect(Collectors.toSet());

        return new JwtResponse(newAccessToken, user.getId(), user.getUsername(), user.getEmail(), roles);
    }

    @Override
    public void logout(String refreshToken) {
        // Stateless JWT: no server-side session to invalidate in this basic implementation
    }
}