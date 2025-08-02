package com.sys_res.esp.service;

import com.sys_res.esp.entity.Planning;
import com.sys_res.esp.repository.PlanningRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class PlanningService {

  @Autowired
  private PlanningRepository planningRepository;

  public List<Planning> findAll() {
    return planningRepository.findAll();
  }

  public Optional<Planning> findById(Long id) {
    return planningRepository.findById(Math.toIntExact(id));
  }

  public Planning save(Planning planning) {
    return planningRepository.save(planning);
  }

  public void deleteById(Long id) {
    planningRepository.deleteById(Math.toIntExact(id));
  }
}