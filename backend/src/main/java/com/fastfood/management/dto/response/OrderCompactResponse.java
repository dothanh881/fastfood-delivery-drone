package com.fastfood.management.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderCompactResponse {
    private Long id;
    private String orderCode;
    private String status;
    private BigDecimal total;
    private LocalDateTime createdAt;
    private List<Item> orderItems;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Item {
        private Long id;
        private String name;
        private Integer quantity;
        private BigDecimal price;
        private String image;
    }
}