package com.sys_res.esp.entity;

import java.sql.Date;
import java.sql.Time; // Import Time

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
@Table(name = "Planning")
public class Planning {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_planning")
    private Long idPlanning;

    @NotNull
    @Column(name = "date_debut")
    private Date dateDebut;

    @NotNull
    @Column(name = "date_fin")
    private Date dateFin;

    @NotNull
    @Column(name = "heure_debut") // New field
    private Time heureDebut;

    @NotNull
    @Column(name = "heure_fin") // New field
    private Time heureFin;


    @ManyToOne(optional = false)
    @JoinColumn(name = "id_classe", referencedColumnName = "id_classe", nullable = false)
    private Classe classe;

    @ManyToOne
    @JoinColumn(name = "id_salle", referencedColumnName = "id_salle", nullable = false)
    private Salle salle;

    @ManyToOne
    @JoinColumn(name = "id_user", referencedColumnName = "id_user", nullable = false)
    private Users user;

    @Column(name = "type_planning")
    private String typePlanning;

    @Column(name = "statut_validation")
    private String statutValidation = "en_cours"; // 'en_cours', 'valide'

    @Column(name = "mode_cours")
    private String modeCours = "presentiel"; // 'presentiel', 'en_ligne'

    // Getters and Setters
    public Long getIdPlanning() {
        return idPlanning;
    }

    public void setIdPlanning(Long idPlanning) {
        this.idPlanning = idPlanning;
    }

    public Date getDateDebut() {
        return dateDebut;
    }

    public void setDateDebut(Date dateDebut) {
        this.dateDebut = dateDebut;
    }

    public Date getDateFin() {
        return dateFin;
    }

    public void setDateFin(Date dateFin) {
        this.dateFin = dateFin;
    }

    // New getters and setters for heureDebut and heureFin
    public Time getHeureDebut() {
        return heureDebut;
    }

    public void setHeureDebut(Time heureDebut) {
        this.heureDebut = heureDebut;
    }

    public Time getHeureFin() {
        return heureFin;
    }

    public void setHeureFin(Time heureFin) {
        this.heureFin = heureFin;
    }


    public Classe getClasse() {
        return classe;
    }

    public void setClasse(Classe classe) {
        this.classe = classe;
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

    public String getTypePlanning() {
        return typePlanning;
    }

    public void setTypePlanning(String typePlanning) {
        this.typePlanning = typePlanning;
    }

    public String getStatutValidation() {
        return statutValidation;
    }

    public void setStatutValidation(String statutValidation) {
        this.statutValidation = statutValidation;
    }

    public String getModeCours() {
        return modeCours;
    }

    public void setModeCours(String modeCours) {
        this.modeCours = modeCours;
    }
}
