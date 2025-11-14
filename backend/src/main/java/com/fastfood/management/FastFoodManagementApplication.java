package com.fastfood.management;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class FastFoodManagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(FastFoodManagementApplication.class, args);
    }
}