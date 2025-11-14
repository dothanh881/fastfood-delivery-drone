package com.fastfood.management.repository;

import com.fastfood.management.entity.Address;
import com.fastfood.management.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AddressRepository extends JpaRepository<Address, Long> {
    
    List<Address> findByUser(User user);
    
    List<Address> findByUserOrderByIsDefaultDesc(User user);
    
    Optional<Address> findByUserAndIsDefaultTrue(User user);
    
    List<Address> findByUserAndCity(User user, String city);
}
