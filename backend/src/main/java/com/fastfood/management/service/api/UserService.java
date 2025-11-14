package com.fastfood.management.service.api;

import com.fastfood.management.dto.request.LoginRequest;
import com.fastfood.management.dto.request.RegisterRequest;
import com.fastfood.management.dto.response.JwtResponse;
import com.fastfood.management.dto.response.UserResponse;
import com.fastfood.management.entity.User;

import java.util.List;

public interface UserService {
    JwtResponse login(LoginRequest loginRequest);
    UserResponse register(RegisterRequest registerRequest);
    UserResponse getUserById(Long id);
    User getCurrentUser();
    List<UserResponse> getAllUsers();
    UserResponse updateUser(Long id, UserResponse userResponse);
    void deleteUser(Long id);
    JwtResponse refreshToken(String refreshToken);
    void logout(String refreshToken);
}