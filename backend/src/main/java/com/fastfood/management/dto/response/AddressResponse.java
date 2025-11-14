package com.fastfood.management.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddressResponse {
    private Long id;
    private String receiverName;
    private String receiverPhone;
    private String addressLine1;
    private String addressLine2;
    private String ward;
    private String district;
    private String city;
    private Double latitude;
    private Double longitude;
    private Boolean isDefault;
}