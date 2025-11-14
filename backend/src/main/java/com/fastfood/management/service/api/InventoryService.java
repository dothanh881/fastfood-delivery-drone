package com.fastfood.management.service.api;

import com.fastfood.management.model.InventoryDTO;

import java.util.List;

public interface InventoryService {
    List<InventoryDTO> getInventoryByStore(Long storeId);
    InventoryDTO updateInventory(Long inventoryId, int quantity);
}