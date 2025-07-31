package com.sys_res.esp.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sys_res.esp.entity.Role;
import com.sys_res.esp.repository.RoleRepository;

@Service
public class RoleService {
    @Autowired
    private RoleRepository roleRepository;

    public List<Role> findAll() { return roleRepository.findAll(); }
    public Optional<Role> findById(String id) { return roleRepository.findById(id); }
    public Role save(Role role) { return roleRepository.save(role); }
    public void deleteById(String id) { roleRepository.deleteById(id); }
} 