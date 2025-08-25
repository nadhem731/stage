package com.sys_res.esp.dto;

import lombok.Data;

@Data
public class SalleCreationRequest {
    private String blocName;
    private Integer numberOfRooms;
    private Integer capacite;
    private Boolean disponibilite;
    private String typeSalleId;
}
