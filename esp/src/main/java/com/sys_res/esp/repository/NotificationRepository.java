package com.sys_res.esp.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sys_res.esp.entity.Notification;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
} 