package com.sys_res.esp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Entity
@Table(name = "Affectation")
public class Affectation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_affectation")
    private Integer idAffectation;

    @ManyToOne
    @JoinColumn(name = "id_user", referencedColumnName = "id_user")
    private Users user;

    @ManyToOne
    @JoinColumn(name = "id_classe", referencedColumnName = "id_classe")
    private Classe classe;

    @ManyToOne
    @JoinColumn(name = "id_salle", referencedColumnName = "id_salle")
    private Salle salle;

    @NotNull
    @Column(name = "date_affectation")
    private String dateAffectation;
}
