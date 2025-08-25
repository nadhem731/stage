package com.sys_res.esp.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sys_res.esp.dto.SalleCreationRequest;
import com.sys_res.esp.entity.Salle;
import com.sys_res.esp.entity.TypeSalle;
import com.sys_res.esp.repository.SalleRepository;

@Service
public class SalleService {
    @Autowired
    private SalleRepository salleRepository;

    @Autowired
    private TypeSalleService typeSalleService;

    public List<Salle> findAll() { return salleRepository.findAll(); }
    public Optional<Salle> findById(Long id) { return salleRepository.findById(id); }
    public Salle save(Salle salle) { return salleRepository.save(salle); }
    public void deleteById(Long id) { salleRepository.deleteById(id); }

    public List<Salle> createMultipleSalles(SalleCreationRequest request) {
        List<Salle> createdSalles = new ArrayList<>();
        Optional<TypeSalle> typeSalleOptional = typeSalleService.findById(request.getTypeSalleId());

        if (!typeSalleOptional.isPresent()) {
            throw new IllegalArgumentException("Type de salle inexistant.");
        }
        TypeSalle typeSalle = typeSalleOptional.get();

        for (int i = 1; i <= request.getNumberOfRooms(); i++) {
            Salle salle = new Salle();
            salle.setBloc(request.getBlocName());
            salle.setNumSalle(String.format("%s-%02d", request.getBlocName(), i));
            salle.setCapacite(request.getCapacite());
            salle.setDisponibilite(request.getDisponibilite());
            salle.setTypeSalle(typeSalle);
            createdSalles.add(salleRepository.save(salle));
        }
        return createdSalles;
    }
}
