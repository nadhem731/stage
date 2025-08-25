package com.sys_res.esp.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sys_res.esp.dto.SalleCreationRequest;
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
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erreur lors de l'ajout : " + e.getMessage());
        }
    }

    @PostMapping("/batch")
    public ResponseEntity<?> createMultiple(@RequestBody SalleCreationRequest request) {
        try {
            List<Salle> createdSalles = salleService.createMultipleSalles(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdSalles);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erreur lors de la création des salles : " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Salle> update(@PathVariable Long id, @RequestBody Salle salleDetails) {
        return salleService.findById(id)
                .map(existingSalle -> {
                    if (salleDetails.getNumSalle() != null) {
                        existingSalle.setNumSalle(salleDetails.getNumSalle());
                    }
                    if (salleDetails.getCapacite() != null) {
                        existingSalle.setCapacite(salleDetails.getCapacite());
                    }
                    if (salleDetails.getBloc() != null) {
                        existingSalle.setBloc(salleDetails.getBloc());
                    }
                    // Handle boolean wrapper for disponibilite
                    if (salleDetails.getDisponibilite() != null) {
                        existingSalle.setDisponibilite(salleDetails.getDisponibilite());
                    }
                    if (salleDetails.getTypeSalle() != null && salleDetails.getTypeSalle().getTypeSalle() != null) {
                        typeSalleService.findById(salleDetails.getTypeSalle().getTypeSalle())
                            .ifPresent(existingSalle::setTypeSalle);
                    }
                    return ResponseEntity.ok(salleService.save(existingSalle));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { salleService.deleteById(id); }
}
