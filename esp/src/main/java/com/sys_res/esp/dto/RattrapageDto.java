package com.sys_res.esp.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

public class RattrapageDto {
    
    private Long idRattrapage;
    private Long idEnseignant;
    private String nomEnseignant;
    private String emailEnseignant;
    private Long idSeance;
    private LocalDate dateAbsence;
    private LocalTime heureDebutAbsence;
    private LocalTime heureFinAbsence;
    private String classe;
    private String matiere;
    private String motif;
    private LocalDate dateRattrapageProposee;
    private LocalTime heureDebutRattrapage;
    private LocalTime heureFinRattrapage;
    private String sallePreferee;
    private String commentaire;
    private String statut;
    private LocalDateTime dateCreation;
    private LocalDateTime dateModification;
    
    // Constructeurs
    public RattrapageDto() {}
    
    public RattrapageDto(Long idRattrapage, Long idEnseignant, String nomEnseignant, 
                        String emailEnseignant, LocalDate dateAbsence, String classe, 
                        String matiere, String statut, LocalDateTime dateCreation) {
        this.idRattrapage = idRattrapage;
        this.idEnseignant = idEnseignant;
        this.nomEnseignant = nomEnseignant;
        this.emailEnseignant = emailEnseignant;
        this.dateAbsence = dateAbsence;
        this.classe = classe;
        this.matiere = matiere;
        this.statut = statut;
        this.dateCreation = dateCreation;
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
    
    public String getNomEnseignant() {
        return nomEnseignant;
    }
    
    public void setNomEnseignant(String nomEnseignant) {
        this.nomEnseignant = nomEnseignant;
    }
    
    public String getEmailEnseignant() {
        return emailEnseignant;
    }
    
    public void setEmailEnseignant(String emailEnseignant) {
        this.emailEnseignant = emailEnseignant;
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
}
