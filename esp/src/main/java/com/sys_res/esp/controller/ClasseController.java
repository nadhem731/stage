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

import com.sys_res.esp.entity.Classe;
import com.sys_res.esp.repository.ClasseRepository;

@RestController
@RequestMapping("/api/classes")
public class ClasseController {
    @Autowired
    private ClasseRepository classeRepository;

    @GetMapping
    public List<Classe> getAll() {
        return classeRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Classe> getById(@PathVariable Integer id) {
        Optional<Classe> classe = classeRepository.findById(id);
        return classe.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public Classe create(@RequestBody Classe classe) {
        return classeRepository.save(classe);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Classe> update(@PathVariable Integer id, @RequestBody Classe updatedClasse) {
        return classeRepository.findById(id)
                .map(classe -> {
                    classe.setNomClasse(updatedClasse.getNomClasse());
                    // Si le champ description existe, décommentez la ligne suivante :
                    // classe.setDescription(updatedClasse.getDescription());
                    return ResponseEntity.ok(classeRepository.save(classe));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        if (classeRepository.existsById(id)) {
            classeRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
} 