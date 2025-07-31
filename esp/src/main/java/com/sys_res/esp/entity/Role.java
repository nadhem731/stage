package com.sys_res.esp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "Role")
public class Role {
    @Id
    @Column(name = "type_role", length = 50)
    private String typeRole;

    public void setTypeRole(String typeRole) {
        this.typeRole = typeRole;
    }
} 