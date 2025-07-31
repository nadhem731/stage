package com.sys_res.esp.entity;

import java.sql.Date;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;

@Data
@Entity
@Table(name = "Affectation", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"id_user", "id_classe", "id_salle", "date_affectation"})
})
public class Affectation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_affectation")
    private Integer idAffectation;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_user", referencedColumnName = "id_user", nullable = false)
    private Users user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_classe", referencedColumnName = "id_classe", nullable = false)
    private Classe classe;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_salle", referencedColumnName = "id_salle", nullable = false)
    private Salle salle;

    @ManyToOne(optional = false)
    @JoinColumn(name = "id_planning", referencedColumnName = "idPlanning", nullable = false)
    private Planning planning;

    @Column(name = "date_affectation", nullable = false)
    private Date dateAffectation;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "lastmod")
    private LocalDateTime lastmod;

    @PrePersist
    protected void onCreate() {
        createdAt = lastmod = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        lastmod = LocalDateTime.now();
    }
} 