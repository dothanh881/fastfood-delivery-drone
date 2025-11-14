package com.fastfood.management.repository;

import com.fastfood.management.entity.Inventory;
import com.fastfood.management.entity.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {
    
    Optional<Inventory> findByMenuItemId(Long menuItemId);
    List<Inventory> findByMenuItemStoreId(Long storeId);
    
    @Query("SELECT i FROM Inventory i WHERE i.quantity <= i.threshold")
    List<Inventory> findLowStockItems();
    
    @Modifying
    @Query("UPDATE Inventory i SET i.reserved = i.reserved + :quantity WHERE i.menuItem.id = :menuItemId AND i.quantity - i.reserved >= :quantity")
    int reserveStock(Long menuItemId, int quantity);
    
    @Modifying
    @Query("UPDATE Inventory i SET i.quantity = i.quantity - :quantity, i.reserved = i.reserved - :quantity WHERE i.menuItem.id = :menuItemId AND i.reserved >= :quantity")
    int commitReservation(Long menuItemId, int quantity);
    
    @Modifying
    @Query("UPDATE Inventory i SET i.reserved = i.reserved - :quantity WHERE i.menuItem.id = :menuItemId AND i.reserved >= :quantity")
    int releaseReservation(Long menuItemId, int quantity);
}