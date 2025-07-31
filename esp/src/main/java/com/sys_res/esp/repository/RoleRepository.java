package com.sys_res.esp.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sys_res.esp.entity.Role;

public interface RoleRepository extends JpaRepository<Role, String> {
    Optional<Role> findByTypeRole(String typeRole);
}