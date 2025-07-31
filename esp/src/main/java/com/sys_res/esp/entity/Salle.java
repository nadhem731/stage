package com.sys_res.esp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "Salle")
public class Salle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_salle")
    private Long idSalle;

    @Column(name = "numSalle", length = 50)
    private String numSalle;

    @Column(name = "capacite")
    private Integer capacite;

    @Column(name = "disponibilite")
    private Boolean disponibilite;

    @Column(name = "bloc", length = 50)
    private String bloc;

    @ManyToOne
    @JoinColumn(name = "type_type_salle", referencedColumnName = "type_salle")
    private TypeSalle typeSalle;

    @ManyToOne
    @JoinColumn(name = "id_classe", referencedColumnName = "id_classe")
    private Classe classe;

    public void setIdSalle(Long idSalle) {
        this.idSalle = idSalle;
    }
} 