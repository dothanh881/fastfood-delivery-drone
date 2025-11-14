package com.fastfood.management.repository;

import com.fastfood.management.entity.Category;
import com.fastfood.management.entity.MenuItem;
import com.fastfood.management.entity.Store;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {
    List<MenuItem> findByCategoryAndAvailableTrue(Category category);
    Page<MenuItem> findByCategory(Category category, Pageable pageable);
    Page<MenuItem> findByAvailableTrue(Pageable pageable);
    Page<MenuItem> findByNameContainingAndAvailableTrue(String name, Pageable pageable);
    boolean existsByName(String name);
    Page<MenuItem> findByStoreAndAvailableTrue(Store store, Pageable pageable);
    Page<MenuItem> findByStoreAndNameContainingAndAvailableTrue(Store store, String name, Pageable pageable);
}