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

import com.sys_res.esp.entity.Role;
import com.sys_res.esp.service.RoleService;

@RestController
@RequestMapping("/api/roles")
public class RoleController {
    @Autowired
    private RoleService roleService;

    @GetMapping
    public List<Role> getAll() { return roleService.findAll(); }

    @GetMapping("/{id}")
    public Optional<Role> getById(@PathVariable String id) { return roleService.findById(id); }

    @PostMapping
    public Role create(@RequestBody Role role) { return roleService.save(role); }

    @PutMapping("/{id}")
    public Role update(@PathVariable String id, @RequestBody Role role) {
        role.setTypeRole(id);
        return roleService.save(role);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable String id) { roleService.deleteById(id); }
} 