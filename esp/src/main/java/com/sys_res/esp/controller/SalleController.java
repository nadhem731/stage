package com.sys_res.esp.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sys_res.esp.entity.Salle;
import com.sys_res.esp.service.SalleService;
import com.sys_res.esp.service.TypeSalleService;

@RestController
@RequestMapping("/api/salles")
public class SalleController {
    @Autowired
    private SalleService salleService;

    @Autowired
    private TypeSalleService typeSalleService;

    @GetMapping
    public List<Salle> getAll() { return salleService.findAll(); }

    @GetMapping("/{id}")
    public Optional<Salle> getById(@PathVariable Long id) { return salleService.findById(id); }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Salle salle) {
        String typeSalleId = salle.getTypeSalle() != null ? salle.getTypeSalle().getTypeSalle() : null;
        if (typeSalleId == null || !typeSalleService.findById(typeSalleId).isPresent()) {
            return ResponseEntity.badRequest().body("Type de salle inexistant.");
        }
        try {
            Salle saved = salleService.save(salle);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur lors de l'ajout : " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public Salle update(@PathVariable Long id, @RequestBody Salle salle) {
        salle.setIdSalle(id);
        return salleService.save(salle);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { salleService.deleteById(id); }
} 