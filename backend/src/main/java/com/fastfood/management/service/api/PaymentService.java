package com.fastfood.management.service.api;

import com.fastfood.management.dto.request.PaymentRequest;
import com.fastfood.management.dto.response.PaymentResponse;
import com.fastfood.management.dto.response.VNPayResponse;

import java.util.Map;

public interface PaymentService {
    // Tạo thanh toán VNPay 
    VNPayResponse createVNPayPayment(Long orderId, PaymentRequest paymentRequest);

    // Xử lý VNPay return 
    PaymentResponse processVNPayReturn(Map<String, String> vnpParams);

    // Lấy Payment theo orderId
    PaymentResponse getPaymentByOrderId(Long orderId);
}