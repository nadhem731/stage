package com.sys_res.esp.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sys_res.esp.entity.Affectation;
import com.sys_res.esp.repository.AffectationRepository;

@Service
public class AffectationService {
    @Autowired
    private AffectationRepository affectationRepository;

    public List<Affectation> findAll() {
        return affectationRepository.findAll();
    }

    public Optional<Affectation> findById(Integer id) {
        return affectationRepository.findById(id);
    }

    public Affectation save(Affectation affectation) {
        return affectationRepository.save(affectation);
    }

    public void deleteById(Integer id) {
        affectationRepository.deleteById(id);
    }
} 