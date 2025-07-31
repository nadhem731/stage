package com.sys_res.esp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SignupRequest {
    @NotBlank
    private String nom;
    @NotBlank
    private String prenom;
    @NotBlank
    @Email
    private String email;
    @NotBlank
    private String tel;
    @NotBlank
    private String password;
    @NotBlank
    private String roleTypeRole;
    @NotBlank
    private String identifiant;
    @NotBlank
    private String cin;
}