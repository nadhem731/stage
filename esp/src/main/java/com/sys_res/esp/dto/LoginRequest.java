package com.sys_res.esp.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank
    private String identifiant;
    @NotBlank
    private String password;
}