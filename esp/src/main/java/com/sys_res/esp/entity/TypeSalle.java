package com.sys_res.esp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "type_salle")
public class TypeSalle {
    @Id
    @Column(name = "type_salle", length = 50)
    private String typeSalle;

    public void setTypeSalle(String typeSalle) {
        this.typeSalle = typeSalle;
    }
} 