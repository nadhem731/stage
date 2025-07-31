package com.sys_res.esp.repository;

import com.sys_res.esp.entity.NotificationDestinataire;
import com.sys_res.esp.entity.NotificationDestinataireId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationDestinataireRepository extends JpaRepository<NotificationDestinataire, NotificationDestinataireId> {
} 