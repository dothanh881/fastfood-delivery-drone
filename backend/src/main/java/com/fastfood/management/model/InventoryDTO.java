package com.fastfood.management.model;

import com.fastfood.management.entity.Inventory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryDTO {
    private Long id;
    private Long menuItemId;
    private String menuItemName;
    private Long storeId;
    private String storeName;
    private Integer quantity;
    private Integer threshold;
    private Integer reserved;
    private LocalDateTime updatedAt;

    public static InventoryDTO fromEntity(Inventory inv) {
        if (inv == null) return null;
        Long storeId = inv.getMenuItem() != null && inv.getMenuItem().getStore() != null
                ? inv.getMenuItem().getStore().getId() : null;
        String storeName = inv.getMenuItem() != null && inv.getMenuItem().getStore() != null
                ? inv.getMenuItem().getStore().getName() : null;
        return InventoryDTO.builder()
                .id(inv.getId())
                .menuItemId(inv.getMenuItem() != null ? inv.getMenuItem().getId() : null)
                .menuItemName(inv.getMenuItem() != null ? inv.getMenuItem().getName() : null)
                .storeId(storeId)
                .storeName(storeName)
                .quantity(inv.getQuantity())
                .threshold(inv.getThreshold())
                .reserved(inv.getReserved())
                .updatedAt(inv.getUpdatedAt())
                .build();
    }
}