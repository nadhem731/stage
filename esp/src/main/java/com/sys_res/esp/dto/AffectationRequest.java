package com.sys_res.esp.dto;

import lombok.Data;

@Data
public class AffectationRequest {
    private Long userId;
    private Integer classeId;
    private String dateAffectation;
    private String type;
    private Long planningId;
}