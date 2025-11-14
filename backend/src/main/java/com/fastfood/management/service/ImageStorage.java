package com.fastfood.management.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Interface for image storage abstraction
 * Supports local storage now, can be extended for cloud storage (S3, MinIO, Cloudinary) later
 */
public interface ImageStorage {
    /**
     * Store uploaded file and return relative path for database storage
     * @param file The uploaded file
     * @param folder The folder category (e.g., "products", "stores")
     * @return Relative path starting with /uploads (e.g., /uploads/products/2025-01-18/uuid-filename.jpg)
     * @throws IOException if file storage fails
     */
    String store(MultipartFile file, String folder) throws IOException;
}