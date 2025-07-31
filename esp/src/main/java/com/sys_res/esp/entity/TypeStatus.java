package com.sys_res.esp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "type_status")
public class TypeStatus {
    @Id
    @Column(name = "type_status", length = 50)
    private String typeStatus;

    public void setTypeStatus(String typeStatus) {
        this.typeStatus = typeStatus;
    }
} 