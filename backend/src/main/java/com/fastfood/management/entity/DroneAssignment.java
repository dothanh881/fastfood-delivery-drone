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
@Table(name = "drone_assignments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class DroneAssignment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;
    
    @ManyToOne
    @JoinColumn(name = "drone_id", nullable = false)
    private Drone drone;
    
    @OneToOne
    @JoinColumn(name = "delivery_id", unique = true)
    private Delivery delivery;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_mode", nullable = false)
    private AssignmentMode assignmentMode;
    
    @Column(name = "assigned_by")
    private String assignedBy; // User ID hoặc "SYSTEM" cho auto-assign
    
    @CreatedDate
    @Column(name = "assigned_at", nullable = false, updatable = false)
    private LocalDateTime assignedAt;
    
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    public enum AssignmentMode {
        AUTO,   // Hệ thống tự động gán (round-robin)
        MANUAL  // Admin/Manager chỉ định trực tiếp
    }
}