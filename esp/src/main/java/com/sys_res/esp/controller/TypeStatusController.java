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

import com.sys_res.esp.entity.TypeStatus;
import com.sys_res.esp.service.TypeStatusService;

@RestController
@RequestMapping("/api/typestatus")
public class TypeStatusController {
    @Autowired
    private TypeStatusService typeStatusService;

    @GetMapping
    public List<TypeStatus> getAll() { return typeStatusService.findAll(); }

    @GetMapping("/{id}")
    public Optional<TypeStatus> getById(@PathVariable String id) { return typeStatusService.findById(id); }

    @PostMapping
    public TypeStatus create(@RequestBody TypeStatus typeStatus) { return typeStatusService.save(typeStatus); }

    @PutMapping("/{id}")
    public TypeStatus update(@PathVariable String id, @RequestBody TypeStatus typeStatus) {
        typeStatus.setTypeStatus(id);
        return typeStatusService.save(typeStatus);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) { typeStatusService.deleteById(id); }
} 