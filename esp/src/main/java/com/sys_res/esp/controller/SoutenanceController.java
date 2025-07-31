package com.sys_res.esp.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sys_res.esp.entity.Soutenance;
import com.sys_res.esp.repository.SoutenanceRepository;

@RestController
@RequestMapping("/api/soutenances")
public class SoutenanceController {
    @Autowired
    private SoutenanceRepository soutenanceRepository;

    @GetMapping
    public List<Soutenance> getAllSoutenances() {
        return soutenanceRepository.findAll();
    }

    @PostMapping
    public Soutenance createSoutenance(@RequestBody Soutenance soutenance) {
        return soutenanceRepository.save(soutenance);
    }
}