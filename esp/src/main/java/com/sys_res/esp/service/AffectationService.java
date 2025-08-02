package com.sys_res.esp.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sys_res.esp.dto.AffectationRequest;
import com.sys_res.esp.entity.Affectation;
import com.sys_res.esp.entity.Classe;
import com.sys_res.esp.entity.Salle;
import com.sys_res.esp.entity.Users;
import com.sys_res.esp.repository.AffectationRepository;
import com.sys_res.esp.repository.ClasseRepository;
import com.sys_res.esp.repository.SalleRepository;
import com.sys_res.esp.repository.UsersRepository;

@Service
public class AffectationService {

  @Autowired
  private AffectationRepository affectationRepository;

  @Autowired
  private UsersRepository usersRepository;

  @Autowired
  private SalleRepository salleRepository;

  @Autowired
  private ClasseRepository classeRepository;

  public List<Affectation> findAll() {
    return affectationRepository.findAll();
  }

  public Optional<Affectation> findById(Integer id) {
    return affectationRepository.findById(id);
  }

  public Affectation createAffectation(AffectationRequest affectationRequest) {
    Users user = usersRepository.findById(affectationRequest.getUserId())
      .orElseThrow(() -> new IllegalArgumentException("Invalid user ID"));
    Classe classe = classeRepository.findById(affectationRequest.getClasseId())
      .orElseThrow(() -> new IllegalArgumentException("Invalid class ID"));

    Salle salle = null;
    if (affectationRequest.getSalleId() != null) {
      salle = salleRepository.findById(affectationRequest.getSalleId())
        .orElse(null);
    }

    Affectation affectation = new Affectation();
    affectation.setUser(user);
    affectation.setClasse(classe);
    affectation.setSalle(salle);
    affectation.setDateAffectation(affectationRequest.getDateAffectation());

    return affectationRepository.save(affectation);
  }

  public void deleteById(Integer id) {
    affectationRepository.deleteById(id);
  }
}
