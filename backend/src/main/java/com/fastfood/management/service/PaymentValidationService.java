package com.fastfood.management.service;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Map;
import java.util.HashMap;
import java.util.TreeMap;

@Service
@Slf4j
public class PaymentValidationService {
    public void validatePaymentSignature(Map<String, String> incomingParams, String secretKey, String secureHash) {
        Map<String, String> params = new HashMap<>(incomingParams);
        params.remove("vnp_SecureHash");
        params.remove("vnp_SecureHashType");

        String calculatedHash = calculateHash(params, secretKey);
        
        log.info("Payment signature validation - Expected: {}, Actual: {}", calculatedHash, secureHash);

        if (!calculatedHash.equals(secureHash)) {
            log.error("Invalid payment signature. Expected: {}, Actual: {}", calculatedHash, secureHash);
            throw new IllegalArgumentException("Invalid payment signature");
        }
        
        log.info("Payment signature validated successfully");
    }

    public boolean validatePaymentStatus(String responseCode, String transactionStatus) {
        boolean isValid = "00".equals(responseCode) && "00".equals(transactionStatus);
        
        if (isValid) {
            log.info("Payment status validation successful - Response code: {}, Transaction status: {}", 
                    responseCode, transactionStatus);
        } else {
            log.warn("Payment status validation failed - Response code: {}, Transaction status: {}", 
                    responseCode, transactionStatus);
        }
        
        return isValid;
    }

    private String calculateHash(Map<String, String> params, String secretKey) {
        try {
            // Sort parameters và loại bỏ các tham số null hoặc rỗng
            Map<String, String> sortedParams = new TreeMap<>();
            for (Map.Entry<String, String> entry : params.entrySet()) {
                if (entry.getValue() != null && !entry.getValue().isEmpty()) {
                    sortedParams.put(entry.getKey(), entry.getValue());
                }
            }

            // Create hash data theo đúng format VNPay
            StringBuilder hashData = new StringBuilder();
            for (Map.Entry<String, String> entry : sortedParams.entrySet()) {
                if (hashData.length() > 0) {
                    hashData.append("&");
                }
                hashData.append(entry.getKey())
                        .append("=")
                        .append(entry.getValue());
            }

            log.debug("Hash data for validation: {}", hashData.toString());

            // Calculate HMAC-SHA512
            Mac hmacSha512 = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                    secretKey.getBytes("UTF-8"),
                    "HmacSHA512"
            );
            hmacSha512.init(secretKeySpec);
            byte[] hmacData = hmacSha512.doFinal(hashData.toString().getBytes("UTF-8"));
            StringBuilder sb = new StringBuilder(2 * hmacData.length);
            for (byte b : hmacData) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();

        } catch (Exception e) {
            log.error("Error calculating hash for payment validation", e);
            throw new RuntimeException("Error calculating hash for payment validation", e);
        }
    }
}
