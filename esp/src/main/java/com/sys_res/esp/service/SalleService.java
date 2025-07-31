package com.sys_res.esp.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sys_res.esp.entity.Salle;
import com.sys_res.esp.repository.SalleRepository;

@Service
public class SalleService {
    @Autowired
    private SalleRepository salleRepository;

    public List<Salle> findAll() { return salleRepository.findAll(); }
    public Optional<Salle> findById(Long id) { return salleRepository.findById(id); }
    public Salle save(Salle salle) { return salleRepository.save(salle); }
    public void deleteById(Long id) { salleRepository.deleteById(id); }
} 