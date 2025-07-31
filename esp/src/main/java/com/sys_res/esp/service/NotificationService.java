package com.sys_res.esp.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sys_res.esp.entity.Notification;
import com.sys_res.esp.repository.NotificationRepository;

@Service
public class NotificationService {
    @Autowired
    private NotificationRepository notificationRepository;

    public List<Notification> findAll() { return notificationRepository.findAll(); }
    public Optional<Notification> findById(Long id) { return notificationRepository.findById(id); }
    public Notification save(Notification notification) { return notificationRepository.save(notification); }
    public void deleteById(Long id) { notificationRepository.deleteById(id); }
} 