package com.fastfood.management.mapper;

import com.fastfood.management.dto.response.OrderCompactResponse;
import com.fastfood.management.entity.Order;
import com.fastfood.management.entity.OrderItem;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

public class OrderMapper {

    public static OrderCompactResponse toCompact(Order o) {
        if (o == null) return null;
        return OrderCompactResponse.builder()
                .id(o.getId())
                .orderCode(o.getOrderCode())
                .status(o.getStatus() != null ? o.getStatus().name() : "CREATED")
                .total(o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                .createdAt(o.getCreatedAt())
                .orderItems(mapItems(o.getOrderItems()))
                .build();
    }

    private static List<OrderCompactResponse.Item> mapItems(List<OrderItem> items) {
        if (items == null || items.isEmpty()) return List.of();
        return items.stream().map(OrderMapper::toCompactItem).collect(Collectors.toList());
    }

    public static OrderCompactResponse.Item toCompactItem(OrderItem it) {
        if (it == null) return null;
        String name = it.getNameSnapshot();
        if (name == null && it.getMenuItem() != null) name = it.getMenuItem().getName();

        String image = it.getImageSnapshot();
        if (image == null && it.getMenuItem() != null) image = it.getMenuItem().getImageUrl();

        BigDecimal price = it.getUnitPrice();
        if (price == null && it.getMenuItem() != null) price = it.getMenuItem().getPrice();

        return OrderCompactResponse.Item.builder()
                .id(it.getId())
                .name(name != null ? name : "Item")
                .quantity(it.getQuantity())
                .price(price != null ? price : BigDecimal.ZERO)
                .image(image)
                .build();
    }
}