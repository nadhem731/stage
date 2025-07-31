package com.sys_res.esp.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sys_res.esp.entity.Soutenance;
import com.sys_res.esp.repository.SoutenanceRepository;

@Service
public class SoutenanceService {
    @Autowired
    private SoutenanceRepository soutenanceRepository;

    public List<Soutenance> findAll() { return soutenanceRepository.findAll(); }
    public Optional<Soutenance> findById(Long id) { return soutenanceRepository.findById(id); }
    public Soutenance save(Soutenance soutenance) { return soutenanceRepository.save(soutenance); }
    public void deleteById(Long id) { soutenanceRepository.deleteById(id); }
} 