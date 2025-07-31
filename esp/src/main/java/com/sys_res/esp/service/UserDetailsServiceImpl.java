package com.sys_res.esp.service;

import java.util.Collections;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.sys_res.esp.entity.Users;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UsersService usersService;

    public UserDetailsServiceImpl(UsersService usersService) {
        this.usersService = usersService;
    }

    @Override
    public UserDetails loadUserByUsername(String identifiant) throws UsernameNotFoundException {
        Users user = usersService.findByIdentifiant(identifiant)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with identifiant: " + identifiant));
        
        // Crée un objet UserDetails avec les informations de l'utilisateur
        return new User(
                user.getIdentifiant(),              // Username (utilisé comme identifiant)
                user.getPassword(),           // Mot de passe haché
                Collections.singletonList(    // Autorités (rôles)
                    new SimpleGrantedAuthority("ROLE_" + user.getRole().getTypeRole())
                )
        );
    }
}