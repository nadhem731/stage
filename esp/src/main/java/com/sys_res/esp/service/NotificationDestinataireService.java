package com.sys_res.esp.service;

import com.sys_res.esp.entity.NotificationDestinataire;
import com.sys_res.esp.entity.NotificationDestinataireId;
import com.sys_res.esp.repository.NotificationDestinataireRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class NotificationDestinataireService {
    @Autowired
    private NotificationDestinataireRepository notificationDestinataireRepository;

    public List<NotificationDestinataire> findAll() { return notificationDestinataireRepository.findAll(); }
    public Optional<NotificationDestinataire> findById(NotificationDestinataireId id) { return notificationDestinataireRepository.findById(id); }
    public NotificationDestinataire save(NotificationDestinataire notificationDestinataire) { return notificationDestinataireRepository.save(notificationDestinataire); }
    public void deleteById(NotificationDestinataireId id) { notificationDestinataireRepository.deleteById(id); }
} 