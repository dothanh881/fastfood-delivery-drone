package com.fastfood.management.mapper;

import com.fastfood.management.dto.response.UserResponse;
import com.fastfood.management.entity.Role;
import com.fastfood.management.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface UserMapper {
    
    @Mapping(target = "roles", expression = "java(mapRolesToStrings(user.getRoles()))")
    UserResponse toResponse(User user);
    
    default Set<String> mapRolesToStrings(Set<Role> roles) {
        if (roles == null) {
            return null;
        }
        return roles.stream()
                .map(Role::getCode)
                .collect(Collectors.toSet());
    }
}