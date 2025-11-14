package com.fastfood.management.dto.response;

import lombok.Data;

@Data
public class CategoryResponse {
    private Long id;
    private String name;
    private int menuItemCount;
}