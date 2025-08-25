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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sys_res.esp.dto.AffectationRequest;
import com.sys_res.esp.entity.Affectation;
import com.sys_res.esp.service.AffectationService;

@RestController
@RequestMapping("/api/affectations")
public class AffectationController {

  @Autowired
  private AffectationService affectationService;

  @GetMapping
  public List<Affectation> getAll() {
    List<Affectation> affectations = affectationService.findAll();
    System.out.println("DEBUG: Récupération de " + affectations.size() + " affectations");
    for (Affectation affectation : affectations) {
      System.out.println("DEBUG: Affectation - ID: " + affectation.getIdAffectation() + 
                       ", User ID: " + (affectation.getUser() != null ? affectation.getUser().getIdUser() : "null") + 
                       ", Classe ID: " + (affectation.getClasse() != null ? affectation.getClasse().getIdClasse() : "null"));
    }
    return affectations;
  }

  @GetMapping("/enseignants")
  public List<Affectation> getAffectationsEnseignants() {
    List<Affectation> allAffectations = affectationService.findAll();
    List<Affectation> affectationsEnseignants = allAffectations.stream()
        .filter(affectation -> affectation.getUser() != null && 
                affectation.getUser().getRole() != null &&
                "Enseignant".equals(affectation.getUser().getRole().getTypeRole()))
        .collect(java.util.stream.Collectors.toList());
    
    System.out.println("DEBUG: Récupération de " + affectationsEnseignants.size() + " affectations d'enseignants sur " + allAffectations.size() + " total");
    for (Affectation affectation : affectationsEnseignants) {
      System.out.println("DEBUG: Affectation enseignant - User: " + affectation.getUser().getNom() + " " + affectation.getUser().getPrenom() + 
                       ", Classe: " + (affectation.getClasse() != null ? affectation.getClasse().getNomClasse() : "null"));
    }
    return affectationsEnseignants;
  }

  @GetMapping("/{id}")
  public Optional<Affectation> getById(@PathVariable Integer id) {
    return affectationService.findById(id);
  }

  @PostMapping
  public ResponseEntity<?> create(@RequestBody AffectationRequest affectationRequest) {
    try {
      Affectation savedAffectation = affectationService.createAffectation(affectationRequest);
      return new ResponseEntity<>(savedAffectation, HttpStatus.CREATED);
    } catch (IllegalStateException e) {
      return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
    } catch (IllegalArgumentException e) {
      return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
    }
  }

  @GetMapping("/classe/{classeId}")
  public List<Affectation> getAffectationsByClasse(@PathVariable Integer classeId) {
    List<Affectation> allAffectations = affectationService.findAll();
    List<Affectation> affectationsClasse = allAffectations.stream()
        .filter(affectation -> affectation.getClasse() != null && 
                affectation.getClasse().getIdClasse().equals(classeId))
        .collect(java.util.stream.Collectors.toList());
    
    System.out.println("DEBUG: Récupération de " + affectationsClasse.size() + " affectations pour la classe ID: " + classeId);
    return affectationsClasse;
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Integer id) {
    try {
      affectationService.deleteById(id);
      return ResponseEntity.noContent().build();
    } catch (IllegalArgumentException e) {
      return ResponseEntity.notFound().build();
    }
  }
}
