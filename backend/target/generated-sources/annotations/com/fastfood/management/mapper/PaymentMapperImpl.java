package com.fastfood.management.mapper;

import com.fastfood.management.dto.response.PaymentResponse;
import com.fastfood.management.entity.Order;
import com.fastfood.management.entity.Payment;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2025-11-12T20:42:19+0700",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.44.0.v20251023-0518, environment: Java 21.0.8 (Eclipse Adoptium)"
)
@Component
public class PaymentMapperImpl implements PaymentMapper {

    @Override
    public PaymentResponse paymentToPaymentResponse(Payment payment) {
        if ( payment == null ) {
            return null;
        }

        PaymentResponse paymentResponse = new PaymentResponse();

        paymentResponse.setOrderId( paymentOrderId( payment ) );
        paymentResponse.setAmount( payment.getAmount() );
        paymentResponse.setCreatedAt( payment.getCreatedAt() );
        paymentResponse.setId( payment.getId() );
        paymentResponse.setProvider( payment.getProvider() );
        paymentResponse.setTransactionReference( payment.getTransactionReference() );

        paymentResponse.setStatus( payment.getStatus() != null ? payment.getStatus().name() : null );

        return paymentResponse;
    }

    @Override
    public List<PaymentResponse> paymentsToPaymentResponses(List<Payment> payments) {
        if ( payments == null ) {
            return null;
        }

        List<PaymentResponse> list = new ArrayList<PaymentResponse>( payments.size() );
        for ( Payment payment : payments ) {
            list.add( paymentToPaymentResponse( payment ) );
        }

        return list;
    }

    private Long paymentOrderId(Payment payment) {
        if ( payment == null ) {
            return null;
        }
        Order order = payment.getOrder();
        if ( order == null ) {
            return null;
        }
        Long id = order.getId();
        if ( id == null ) {
            return null;
        }
        return id;
    }
}
