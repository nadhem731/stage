package com.sys_res.esp.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@Data
public class PlanningResponse {

    @JsonProperty("id_salle")
    private Long idSalle;

    @JsonProperty("id_classe")
    private Integer idClasse;

    @JsonProperty("jour")
    private String jour;

    @JsonProperty("heure_debut")
    private int heureDebut;

    @JsonProperty("heure_fin")
    private int heureFin;

}