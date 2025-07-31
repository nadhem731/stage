package com.sys_res.esp.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sys_res.esp.dto.PlanningDto;
import com.sys_res.esp.entity.Classe;
import com.sys_res.esp.entity.Planning;
import com.sys_res.esp.entity.Salle;
import com.sys_res.esp.entity.Users;
import com.sys_res.esp.repository.ClasseRepository;
import com.sys_res.esp.repository.PlanningRepository;
import com.sys_res.esp.repository.SalleRepository;
import com.sys_res.esp.repository.UsersRepository;

@RestController
@RequestMapping("/api/planning")
public class PlanningController {
    @Autowired
    private PlanningRepository planningRepository;
    @Autowired
    private ClasseRepository classeRepository;
    @Autowired
    private SalleRepository salleRepository;
    @Autowired
    private UsersRepository usersRepository;

    @GetMapping
    public List<Planning> getAllPlannings() {
        return planningRepository.findAll();
    }

    @PostMapping
    public Planning createPlanning(@RequestBody PlanningDto dto) {
        Planning planning = new Planning();
        planning.setDateDebut(dto.getDateDebut());
        planning.setDateFin(dto.getDateFin());
        planning.setStatutTypeStatus(dto.getStatutTypeStatus());
        // Liaison classe
        Classe classe = classeRepository.findById(dto.getIdClasse()).orElseThrow();
        planning.setClasse(classe);
        // Liaison salle
        Salle salle = salleRepository.findById(dto.getIdSalle()).orElseThrow();
        planning.setSalle(salle);
        // Liaison user
        Users user = usersRepository.findById(dto.getIdUser()).orElseThrow();
        planning.setUser(user);
        return planningRepository.save(planning);
    }
}