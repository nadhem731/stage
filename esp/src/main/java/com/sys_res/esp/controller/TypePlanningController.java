package com.sys_res.esp.controller;

import java.util.List;

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

import com.sys_res.esp.entity.TypePlanning;
import com.sys_res.esp.service.TypePlanningService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/type-plannings")
public class TypePlanningController {

    @Autowired
    private TypePlanningService service;

    @GetMapping
    public List<TypePlanning> getAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<TypePlanning> getById(@PathVariable String id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<TypePlanning> create(@Valid @RequestBody TypePlanning typePlanning) {
        TypePlanning saved = service.save(typePlanning);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TypePlanning> update(@PathVariable String id, @Valid @RequestBody TypePlanning typePlanning) {
        if (!service.findById(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        typePlanning.setTypePlanning(id); // Ensure the ID remains consistent
        TypePlanning updated = service.save(typePlanning);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        if (!service.findById(id).isPresent()) {
            return ResponseEntity.notFound().build();
        }
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}