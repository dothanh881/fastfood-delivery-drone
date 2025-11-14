package com.fastfood.management.controller;

import com.fastfood.management.service.CloudinaryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/files")
@CrossOrigin(origins = "*")
public class FileController {
    private static final Logger log = LoggerFactory.getLogger(FileController.class);
    
    private final CloudinaryService cloudinaryService;

    public FileController(CloudinaryService cloudinaryService) {
        this.cloudinaryService = cloudinaryService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestPart("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "File is empty"));
            }

            // Validate file type (basic image validation)
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Only image files are allowed"));
            }

            // Upload to Cloudinary and get URL
            String cloudinaryUrl = cloudinaryService.uploadImage(file, "products");
            
            log.info("File uploaded successfully to Cloudinary: {}", cloudinaryUrl);
            return ResponseEntity.ok(Map.of("path", cloudinaryUrl));
            
        } catch (IOException e) {
            log.error("File upload failed", e);
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "File upload failed: " + e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.error("Invalid file", e);
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping(value = "/upload/{folder}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadToFolder(
            @PathVariable String folder,
            @RequestPart("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "File is empty"));
            }

            // Validate file type
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Only image files are allowed"));
            }

            // Upload to Cloudinary in specified folder
            String cloudinaryUrl = cloudinaryService.uploadImage(file, folder);
            
            log.info("File uploaded to Cloudinary folder '{}': {}", folder, cloudinaryUrl);
            return ResponseEntity.ok(Map.of("path", cloudinaryUrl));
            
        } catch (IOException e) {
            log.error("File upload to folder '{}' failed", folder, e);
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "File upload failed: " + e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.error("Invalid file for folder '{}'", folder, e);
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
}