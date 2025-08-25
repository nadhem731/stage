package com.sys_res.esp.entity;

import java.sql.Date;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Entity
@Table(name = "Soutenance")
public class Soutenance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idSoutenance;

    @NotNull
    private Date date;

    @NotNull
    private java.sql.Time heureTime;

    @NotNull
    private String duree;

    private String statutValidation = "en_cours"; // 'en_cours', 'valide'

    private String jour; // Jour de la semaine (Lundi, Mardi, etc.)

    @ManyToOne
    @JoinColumn(name = "id_salle", referencedColumnName = "id_salle", nullable = false)
    private Salle salle;

    @ManyToOne
    @JoinColumn(name = "id_user", referencedColumnName = "id_user", nullable = false)
    private Users user;

    

    // Getters and Setters
    public Long getIdSoutenance() {
        return idSoutenance;
    }

    public void setIdSoutenance(Long idSoutenance) {
        this.idSoutenance = idSoutenance;
    }

    public Date getDate() {
        return date;
    }

    public void setDate(Date date) {
        this.date = date;
    }

    public java.sql.Time getHeureTime() {
        return heureTime;
    }

    public void setHeureTime(java.sql.Time heureTime) {
        this.heureTime = heureTime;
    }

    public String getDuree() {
        return duree;
    }

    public void setDuree(String duree) {
        this.duree = duree;
    }

    public Salle getSalle() {
        return salle;
    }

    public void setSalle(Salle salle) {
        this.salle = salle;
    }

    public Users getUser() {
        return user;
    }

    public void setUser(Users user) {
        this.user = user;
    }


    public String getStatutValidation() {
        return statutValidation;
    }

    public void setStatutValidation(String statutValidation) {
        this.statutValidation = statutValidation;
    }

    public String getJour() {
        return jour;
    }

    public void setJour(String jour) {
        this.jour = jour;
    }
} 