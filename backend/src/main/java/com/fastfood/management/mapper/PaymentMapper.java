package com.fastfood.management.mapper;

import com.fastfood.management.dto.response.PaymentResponse;
import com.fastfood.management.entity.Payment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface PaymentMapper {

    @Mapping(target = "orderId", source = "order.id")
    @Mapping(target = "status", expression = "java(payment.getStatus() != null ? payment.getStatus().name() : null)")
    PaymentResponse paymentToPaymentResponse(Payment payment);

    List<PaymentResponse> paymentsToPaymentResponses(List<Payment> payments);
}