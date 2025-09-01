package com.sys_res.esp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "rattrapage")
public class Rattrapage {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rattrapage")
    private Long idRattrapage;
    
    @Column(name = "id_enseignant", nullable = false)
    private Long idEnseignant;
    
    @Column(name = "id_seance")
    private Long idSeance;
    
    @Column(name = "date_absence", nullable = false)
    private LocalDate dateAbsence;
    
    @Column(name = "heure_debut_absence", nullable = false)
    private LocalTime heureDebutAbsence;
    
    @Column(name = "heure_fin_absence", nullable = false)
    private LocalTime heureFinAbsence;
    
    @Column(name = "classe", nullable = false, length = 50)
    private String classe;
    
    @Column(name = "matiere", nullable = false, length = 100)
    private String matiere;
    
    @Column(name = "motif", nullable = false, columnDefinition = "TEXT")
    private String motif;
    
    @Column(name = "date_rattrapage_proposee", nullable = false)
    private LocalDate dateRattrapageProposee;
    
    @Column(name = "heure_debut_rattrapage", nullable = false)
    private LocalTime heureDebutRattrapage;
    
    @Column(name = "heure_fin_rattrapage", nullable = false)
    private LocalTime heureFinRattrapage;
    
    @Column(name = "salle_preferee", length = 50)
    private String sallePreferee;
    
    @Column(name = "commentaire", columnDefinition = "TEXT")
    private String commentaire;
    
    @Column(name = "statut", length = 20)
    private String statut = "en_attente";
    
    @Column(name = "date_creation")
    private LocalDateTime dateCreation;
    
    @Column(name = "date_modification")
    private LocalDateTime dateModification;
    
    @Column(name = "message_admin", columnDefinition = "TEXT")
    private String messageAdmin;
    
    // Relations
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_enseignant", insertable = false, updatable = false)
    @JsonIgnore
    private Users enseignant;
    
    // Constructeurs
    public Rattrapage() {
        this.dateCreation = LocalDateTime.now();
        this.dateModification = LocalDateTime.now();
    }
    
    public Rattrapage(Long idEnseignant, LocalDate dateAbsence, LocalTime heureDebutAbsence, 
                     LocalTime heureFinAbsence, String classe, String matiere, String motif,
                     LocalDate dateRattrapageProposee, LocalTime heureDebutRattrapage, 
                     LocalTime heureFinRattrapage) {
        this();
        this.idEnseignant = idEnseignant;
        this.dateAbsence = dateAbsence;
        this.heureDebutAbsence = heureDebutAbsence;
        this.heureFinAbsence = heureFinAbsence;
        this.classe = classe;
        this.matiere = matiere;
        this.motif = motif;
        this.dateRattrapageProposee = dateRattrapageProposee;
        this.heureDebutRattrapage = heureDebutRattrapage;
        this.heureFinRattrapage = heureFinRattrapage;
    }
    
    // Méthodes de cycle de vie
    @PreUpdate
    public void preUpdate() {
        this.dateModification = LocalDateTime.now();
    }
    
    // Getters et Setters
    public Long getIdRattrapage() {
        return idRattrapage;
    }
    
    public void setIdRattrapage(Long idRattrapage) {
        this.idRattrapage = idRattrapage;
    }
    
    public Long getIdEnseignant() {
        return idEnseignant;
    }
    
    public void setIdEnseignant(Long idEnseignant) {
        this.idEnseignant = idEnseignant;
    }
    
    public Long getIdSeance() {
        return idSeance;
    }
    
    public void setIdSeance(Long idSeance) {
        this.idSeance = idSeance;
    }
    
    public LocalDate getDateAbsence() {
        return dateAbsence;
    }
    
    public void setDateAbsence(LocalDate dateAbsence) {
        this.dateAbsence = dateAbsence;
    }
    
    public LocalTime getHeureDebutAbsence() {
        return heureDebutAbsence;
    }
    
    public void setHeureDebutAbsence(LocalTime heureDebutAbsence) {
        this.heureDebutAbsence = heureDebutAbsence;
    }
    
    public LocalTime getHeureFinAbsence() {
        return heureFinAbsence;
    }
    
    public void setHeureFinAbsence(LocalTime heureFinAbsence) {
        this.heureFinAbsence = heureFinAbsence;
    }
    
    public String getClasse() {
        return classe;
    }
    
    public void setClasse(String classe) {
        this.classe = classe;
    }
    
    public String getMatiere() {
        return matiere;
    }
    
    public void setMatiere(String matiere) {
        this.matiere = matiere;
    }
    
    public String getMotif() {
        return motif;
    }
    
    public void setMotif(String motif) {
        this.motif = motif;
    }
    
    public LocalDate getDateRattrapageProposee() {
        return dateRattrapageProposee;
    }
    
    public void setDateRattrapageProposee(LocalDate dateRattrapageProposee) {
        this.dateRattrapageProposee = dateRattrapageProposee;
    }
    
    public LocalTime getHeureDebutRattrapage() {
        return heureDebutRattrapage;
    }
    
    public void setHeureDebutRattrapage(LocalTime heureDebutRattrapage) {
        this.heureDebutRattrapage = heureDebutRattrapage;
    }
    
    public LocalTime getHeureFinRattrapage() {
        return heureFinRattrapage;
    }
    
    public void setHeureFinRattrapage(LocalTime heureFinRattrapage) {
        this.heureFinRattrapage = heureFinRattrapage;
    }
    
    public String getSallePreferee() {
        return sallePreferee;
    }
    
    public void setSallePreferee(String sallePreferee) {
        this.sallePreferee = sallePreferee;
    }
    
    public String getCommentaire() {
        return commentaire;
    }
    
    public void setCommentaire(String commentaire) {
        this.commentaire = commentaire;
    }
    
    public String getStatut() {
        return statut;
    }
    
    public void setStatut(String statut) {
        this.statut = statut;
    }
    
    public LocalDateTime getDateCreation() {
        return dateCreation;
    }
    
    public void setDateCreation(LocalDateTime dateCreation) {
        this.dateCreation = dateCreation;
    }
    
    public LocalDateTime getDateModification() {
        return dateModification;
    }
    
    public void setDateModification(LocalDateTime dateModification) {
        this.dateModification = dateModification;
    }
    
    public Users getEnseignant() {
        return enseignant;
    }
    
    public void setEnseignant(Users enseignant) {
        this.enseignant = enseignant;
    }
    
    public String getMessageAdmin() {
        return messageAdmin;
    }
    
    public void setMessageAdmin(String messageAdmin) {
        this.messageAdmin = messageAdmin;
    }
    
    @Override
    public String toString() {
        return "Rattrapage{" +
                "idRattrapage=" + idRattrapage +
                ", idEnseignant=" + idEnseignant +
                ", classe='" + classe + '\'' +
                ", matiere='" + matiere + '\'' +
                ", statut='" + statut + '\'' +
                ", dateCreation=" + dateCreation +
                '}';
    }
}
