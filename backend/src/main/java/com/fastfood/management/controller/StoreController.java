package com.fastfood.management.controller;

import com.fastfood.management.entity.MenuItem;
import com.fastfood.management.entity.Store;
import com.fastfood.management.repository.MenuItemRepository;
import com.fastfood.management.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/stores")
@RequiredArgsConstructor
public class StoreController {

    private final StoreRepository storeRepository;
    private final MenuItemRepository menuItemRepository;

    @GetMapping
    public ResponseEntity<List<Store>> listStores(@RequestParam(name = "open", required = false) Boolean open) {
        if (Boolean.TRUE.equals(open)) {
            return ResponseEntity.ok(storeRepository.findByStatus(Store.StoreStatus.ACTIVE));
        }
        return ResponseEntity.ok(storeRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getStore(@PathVariable Long id) {
        Store store = storeRepository.findById(id).orElse(null);
        if (store == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Không tìm thấy cửa hàng"));
        }
        return ResponseEntity.ok(store);
    }

    @GetMapping("/{id}/menu")
    public ResponseEntity<?> getStoreMenu(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Store store = storeRepository.findById(id).orElse(null);
        if (store == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Không tìm thấy cửa hàng"));
        }
        Page<MenuItem> result = menuItemRepository.findByStoreAndAvailableTrue(store, PageRequest.of(page, size));
        return ResponseEntity.ok(result.getContent());
    }

    // Cập nhật ảnh cửa hàng (imageUrl)
    @PutMapping("/{id}/image")
    public ResponseEntity<?> updateStoreImage(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        Store store = storeRepository.findById(id).orElse(null);
        if (store == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Không tìm thấy cửa hàng"));
        }
        String imageUrl = payload.get("imageUrl");
        if (imageUrl == null || imageUrl.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Thiếu imageUrl"));
        }
        store.setImageUrl(imageUrl);
        Store saved = storeRepository.save(store);
        return ResponseEntity.ok(saved);
    }

    // Cập nhật toàn bộ thông tin cửa hàng
    @PutMapping("/{id}")
    public ResponseEntity<?> updateStore(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Store store = storeRepository.findById(id).orElse(null);
        if (store == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Không tìm thấy cửa hàng"));
        }

        // Các trường cho phép cập nhật
        if (payload.containsKey("name")) {
            Object v = payload.get("name");
            if (v != null) store.setName(String.valueOf(v));
        }
        if (payload.containsKey("address")) {
            Object v = payload.get("address");
            store.setAddress(v == null ? null : String.valueOf(v));
        }
        if (payload.containsKey("phone")) {
            Object v = payload.get("phone");
            store.setPhone(v == null ? null : String.valueOf(v));
        }
        if (payload.containsKey("imageUrl")) {
            Object v = payload.get("imageUrl");
            store.setImageUrl(v == null ? null : String.valueOf(v));
        }
        if (payload.containsKey("lat")) {
            Object v = payload.get("lat");
            store.setLat(parseDouble(v));
        }
        if (payload.containsKey("lng")) {
            Object v = payload.get("lng");
            store.setLng(parseDouble(v));
        }
        if (payload.containsKey("status")) {
            Object v = payload.get("status");
            Store.StoreStatus status = parseStatus(v);
            if (status != null) store.setStatus(status);
        }

        Store saved = storeRepository.save(store);
        return ResponseEntity.ok(saved);
    }

    // Helpers
    private Double parseDouble(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(String.valueOf(v));
        } catch (Exception e) {
            return null;
        }
    }

    private Store.StoreStatus parseStatus(Object v) {
        if (v == null) return null;
        try {
            return Store.StoreStatus.valueOf(String.valueOf(v).toUpperCase());
        } catch (Exception e) {
            return null;
        }
    }
}