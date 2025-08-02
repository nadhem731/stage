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
    return affectationService.findAll();
  }

  @GetMapping("/{id}")
  public Optional<Affectation> getById(@PathVariable Integer id) {
    return affectationService.findById(id);
  }

  @PostMapping
  public ResponseEntity<Affectation> create(@RequestBody AffectationRequest affectationRequest) {
    Affectation savedAffectation = affectationService.createAffectation(affectationRequest);
    return new ResponseEntity<>(savedAffectation, HttpStatus.CREATED);
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable Integer id) {
    affectationService.deleteById(id);
  }
}
