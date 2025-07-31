package com.sys_res.esp.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sys_res.esp.entity.TypeStatus;
import com.sys_res.esp.repository.TypeStatusRepository;

@Service
public class TypeStatusService {
    @Autowired
    private TypeStatusRepository typeStatusRepository;

    public List<TypeStatus> findAll() { return typeStatusRepository.findAll(); }
    public Optional<TypeStatus> findById(String id) { return typeStatusRepository.findById(id); }
    public TypeStatus save(TypeStatus typeStatus) { return typeStatusRepository.save(typeStatus); }
    public void deleteById(String id) { typeStatusRepository.deleteById(id); }
} 