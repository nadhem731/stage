package com.sys_res.esp.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sys_res.esp.entity.Role;
import com.sys_res.esp.entity.Users;

public interface UsersRepository extends JpaRepository<Users, Long> {
    Optional<Users> findByEmail(String email);
    Optional<Users> findByIdentifiant(String identifiant);
    List<Users> findByRole(Role role);
}