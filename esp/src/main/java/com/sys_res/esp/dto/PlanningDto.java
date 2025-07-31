package com.sys_res.esp.dto;

import java.sql.Date;

import lombok.Data;

@Data
public class PlanningDto {
    private Long idPlanning;
    private Date dateDebut;
    private Date dateFin;
    private String statutTypeStatus;
    private Long idSalle;
    private Long idUser;
    private Integer idClasse;
    // Ajoutez d'autres champs si besoin
} 