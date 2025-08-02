package com.sys_res.esp.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sys_res.esp.entity.TypePlanning;
import com.sys_res.esp.repository.TypePlanningRepository;

import jakarta.validation.ValidationException;

@Service
public class TypePlanningService {

    @Autowired
    private TypePlanningRepository repository;

    public List<TypePlanning> findAll() {
        return repository.findAll();
    }

    public Optional<TypePlanning> findById(String typePlanning) {
        return repository.findById(typePlanning);
    }

    public TypePlanning save(TypePlanning typePlanning) {
        validateTypePlanning(typePlanning.getTypePlanning());
        return repository.save(typePlanning);
    }

    public void delete(String typePlanning) {
        repository.deleteById(typePlanning);
    }

    private void validateTypePlanning(String typePlanning) {
        if (!typePlanning.equals("cour") && !typePlanning.equals("soutenance")) {
            throw new ValidationException("Type must be 'cour' or 'soutenance'");
        }
    }
}
