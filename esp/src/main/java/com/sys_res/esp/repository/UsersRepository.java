package com.sys_res.esp.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sys_res.esp.entity.Users;

public interface UsersRepository extends JpaRepository<Users, Long> {
    Optional<Users> findByEmail(String email);
    Optional<Users> findByIdentifiant(String identifiant);
}