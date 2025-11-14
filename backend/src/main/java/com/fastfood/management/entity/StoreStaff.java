package com.fastfood.management.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "store_staff")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class StoreStaff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "title")
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private StaffStatus status = StaffStatus.ACTIVE;

    
    // Thêm role nội bộ của cửa hàng (RBAC nhẹ) cho Merchant Portal
    // Không thay đổi role hệ thống, chỉ phân quyền chi tiết theo store_staff.role
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private StaffRole role = StaffRole.STAFF;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum StaffStatus {
        ACTIVE, INACTIVE
    }

    public enum StaffRole {
        MANAGER, STAFF
    }
}