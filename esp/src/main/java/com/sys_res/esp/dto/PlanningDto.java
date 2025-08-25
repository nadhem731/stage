package com.sys_res.esp.dto;

import java.sql.Date;

import lombok.Data;

@Data
public class PlanningDto {
    private Long idPlanning;
    private String dateDebut;  // Changé en String pour recevoir les données du frontend
    private String dateFin;    // Changé en String pour recevoir les données du frontend
    private String heureDebut; // Nouveau champ pour l'heure de début
    private String heureFin;   // Nouveau champ pour l'heure de fin
    private String typePlanning; // Nouveau champ pour le type de planning
    private Long idSalle;
    private Long idUser;
    private Integer idClasse;
    private String jour;       // Nouveau champ pour le jour
    private String modeCours;  // Nouveau champ pour le mode de cours (présentiel/en ligne)
} 