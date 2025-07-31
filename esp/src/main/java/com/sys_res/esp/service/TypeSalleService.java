package com.sys_res.esp.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sys_res.esp.entity.TypeSalle;
import com.sys_res.esp.repository.TypeSalleRepository;

@Service
public class TypeSalleService {
    @Autowired
    private TypeSalleRepository typeSalleRepository;

    public List<TypeSalle> findAll() { return typeSalleRepository.findAll(); }
    public Optional<TypeSalle> findById(String id) { return typeSalleRepository.findById(id); }
    public TypeSalle save(TypeSalle typeSalle) { return typeSalleRepository.save(typeSalle); }
    public void deleteById(String id) { typeSalleRepository.deleteById(id); }
} 