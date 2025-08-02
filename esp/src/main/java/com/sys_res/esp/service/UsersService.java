package com.sys_res.esp.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sys_res.esp.entity.Role;
import com.sys_res.esp.entity.Users;
import com.sys_res.esp.repository.RoleRepository;
import com.sys_res.esp.repository.UsersRepository;

@Service
public class UsersService {

    private final UsersRepository usersRepository;
    private final RoleRepository roleRepository;

    @Autowired
    public UsersService(UsersRepository usersRepository, RoleRepository roleRepository) {
        this.usersRepository = usersRepository;
        this.roleRepository = roleRepository;
    }

    public List<Users> findAll() {
        return usersRepository.findAll();
    }

    public Optional<Users> findById(Long id) {
        return usersRepository.findById(id);
    }

     public List<Users> findByRole(String roleType) {
        Optional<Role> role = roleRepository.findById(roleType);
        if (role.isEmpty()) {
            // Handle the case where the role doesn't exist
            return List.of(); // Or throw an exception
        }
        return usersRepository.findByRole(role.get());
    }

    public Users save(Users user) {
        return usersRepository.save(user);
    }

    public void deleteById(Long id) {
        usersRepository.deleteById(id);
    }

     public Optional<Users> findByEmail(String email) {
        return usersRepository.findByEmail(email);
    }

    public Optional<Users> findByIdentifiant(String identifiant) {
        return usersRepository.findByIdentifiant(identifiant);
    }
}