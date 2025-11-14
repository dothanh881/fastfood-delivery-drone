package com.fastfood.management.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddressSimpleResponse {
    private Long id;
    private String receiverName;
    private String phone;
    private String line1;
    private String ward;
    private String district;
    private String city;
    private Double lat;
    private Double lng;
    private Boolean isDefault;
}