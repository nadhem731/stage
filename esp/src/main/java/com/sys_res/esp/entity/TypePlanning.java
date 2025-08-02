package com.sys_res.esp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Pattern;

@Entity
@Table(name = "type_planning")
public class TypePlanning {

    @Id
    @Column(name = "type_planning", length = 50)
    @Pattern(regexp = "cour|soutenance", message = "Type must be 'cour' or 'soutenance'")
    private String typePlanning;

    public TypePlanning() {
    }

    public TypePlanning(String typePlanning) {
        this.typePlanning = typePlanning;
    }

    public String getTypePlanning() {
        return typePlanning;
    }

    public void setTypePlanning(String typePlanning) {
        this.typePlanning = typePlanning;
    }
}
