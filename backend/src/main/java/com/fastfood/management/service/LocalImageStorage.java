package com.fastfood.management.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.UUID;

@Service
public class LocalImageStorage implements ImageStorage {
    private static final Logger log = LoggerFactory.getLogger(LocalImageStorage.class);

    @Value("${app.upload-dir:uploads}")
    private String root;

    @Override
    public String store(MultipartFile file, String folder) throws IOException {
        if (file.isEmpty()) {
            throw new IOException("Cannot store empty file");
        }

        String date = LocalDate.now().toString();
        String safeName = UUID.randomUUID() + "-" + sanitize(file.getOriginalFilename());
        
        // Ensure absolute path by resolving root first
        Path rootPath = Paths.get(root).toAbsolutePath().normalize();
        
        // Create directory structure: uploads/folder/date
        Path dir = rootPath.resolve(folder).resolve(date);
        Files.createDirectories(dir);
        
        log.info("Creating directory: {}", dir);
        
        // Store file
        Path target = dir.resolve(safeName);
        file.transferTo(target.toFile());
        
        // Return relative path for database storage (always starts with /uploads)
        String relativePath = "/uploads/" + folder + "/" + date + "/" + safeName;
        
        log.info("File stored: {} -> {} (absolute: {})", file.getOriginalFilename(), relativePath, target);
        return relativePath;
    }

    private String sanitize(String name) {
        if (name == null || name.trim().isEmpty()) {
            return "file";
        }
        // Remove unsafe characters, keep only alphanumeric, dots, underscores, and hyphens
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}