package com.fastfood.management.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
public class CloudinaryService {

    @Autowired
    private Cloudinary cloudinary;

    /**
     * Upload image to Cloudinary
     * @param file MultipartFile to upload
     * @param folder Folder name in Cloudinary (e.g., "menu-items", "stores")
     * @return Cloudinary URL of uploaded image
     * @throws IOException if upload fails
     */
    public String uploadImage(MultipartFile file, String folder) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be null or empty");
        }

        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("File must be an image");
        }

        // Generate unique public ID
        String publicId = folder + "/" + UUID.randomUUID().toString();

        // Upload to Cloudinary
        Map<String, Object> uploadResult = cloudinary.uploader().upload(
            file.getBytes(),
            ObjectUtils.asMap(
                "public_id", publicId,
                "folder", folder,
                "resource_type", "image",
                "quality", "auto",
                "fetch_format", "auto"
            )
        );

        // Return the secure URL
        return (String) uploadResult.get("secure_url");
    }

    /**
     * Delete image from Cloudinary
     * @param publicId Public ID of the image to delete
     * @return true if deletion was successful
     */
    public boolean deleteImage(String publicId) {
        try {
            Map<String, Object> result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            return "ok".equals(result.get("result"));
        } catch (IOException e) {
            return false;
        }
    }

    /**
     * Extract public ID from Cloudinary URL
     * @param cloudinaryUrl Full Cloudinary URL
     * @return Public ID or null if URL is invalid
     */
    public String extractPublicId(String cloudinaryUrl) {
        if (cloudinaryUrl == null || !cloudinaryUrl.contains("cloudinary.com")) {
            return null;
        }

        try {
            // Extract public ID from URL
            // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/image.jpg
            String[] parts = cloudinaryUrl.split("/");
            if (parts.length >= 2) {
                String lastPart = parts[parts.length - 1];
                String secondLastPart = parts[parts.length - 2];
                
                // Remove file extension
                String fileName = lastPart.split("\\.")[0];
                return secondLastPart + "/" + fileName;
            }
        } catch (Exception e) {
            // Return null if extraction fails
        }
        
        return null;
    }
}