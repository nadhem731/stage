package com.sys_res.esp.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sys_res.esp.entity.TypeSalle;
import com.sys_res.esp.service.TypeSalleService;

@RestController
@RequestMapping("/api/typesalle")
public class TypeSalleController {
    @Autowired
    private TypeSalleService typeSalleService;

    @GetMapping
    public List<TypeSalle> getAll() { return typeSalleService.findAll(); }

    @GetMapping("/{id}")
    public Optional<TypeSalle> getById(@PathVariable String id) { return typeSalleService.findById(id); }

    @PostMapping
    public TypeSalle create(@RequestBody TypeSalle typeSalle) { return typeSalleService.save(typeSalle); }

    @PutMapping("/{id}")
    public TypeSalle update(@PathVariable String id, @RequestBody TypeSalle typeSalle) {
        typeSalle.setTypeSalle(id);
        return typeSalleService.save(typeSalle);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) { typeSalleService.deleteById(id); }
} 