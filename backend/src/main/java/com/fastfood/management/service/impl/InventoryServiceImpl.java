package com.fastfood.management.service.impl;

import com.fastfood.management.entity.Inventory;
import com.fastfood.management.model.InventoryDTO;
import com.fastfood.management.repository.InventoryRepository;
import com.fastfood.management.service.api.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class InventoryServiceImpl implements InventoryService {

    private final InventoryRepository inventoryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<InventoryDTO> getInventoryByStore(Long storeId) {
        List<Inventory> list = inventoryRepository.findByMenuItemStoreId(storeId);
        return list.stream().map(InventoryDTO::fromEntity).collect(Collectors.toList());
    }

    @Override
    public InventoryDTO updateInventory(Long inventoryId, int quantity) {
        Inventory inv = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy inventory với id: " + inventoryId));
        inv.setQuantity(quantity);
        Inventory saved = inventoryRepository.save(inv);
        return InventoryDTO.fromEntity(saved);
    }
}