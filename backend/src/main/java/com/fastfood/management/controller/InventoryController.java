package com.fastfood.management.controller;

import com.fastfood.management.model.InventoryDTO;
import com.fastfood.management.service.api.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping("/store/{storeId}")
    @PreAuthorize("hasAnyRole('MERCHANT', 'STAFF')")
    public ResponseEntity<List<InventoryDTO>> getStoreInventory(@PathVariable Long storeId) {
        List<InventoryDTO> inventory = inventoryService.getInventoryByStore(storeId);
        return ResponseEntity.ok(inventory);
    }

    @PutMapping("/{inventoryId}")
    @PreAuthorize("hasAnyRole('MERCHANT', 'STAFF')")
    public ResponseEntity<InventoryDTO> updateStoreInventory(
            @PathVariable Long inventoryId,
            @RequestBody Map<String, Integer> payload) {
        Integer quantity = payload.get("quantity");
        if (quantity == null) {
            return ResponseEntity.badRequest().build();
        }
        InventoryDTO updatedInventory = inventoryService.updateInventory(inventoryId, quantity);
        return ResponseEntity.ok(updatedInventory);
    }
}