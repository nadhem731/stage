package com.sys_res.esp.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sys_res.esp.entity.NotificationDestinataire;
import com.sys_res.esp.entity.NotificationDestinataireId;
import com.sys_res.esp.service.NotificationDestinataireService;

@RestController
@RequestMapping("/api/notificationdestinataires")
public class NotificationDestinataireController {
    @Autowired
    private NotificationDestinataireService notificationDestinataireService;

    @GetMapping
    public List<NotificationDestinataire> getAll() { return notificationDestinataireService.findAll(); }

    @GetMapping("/{user}/{notification}")
    public Optional<NotificationDestinataire> getById(@PathVariable Long user, @PathVariable Long notification) {
        NotificationDestinataireId id = new NotificationDestinataireId();
        id.setUser(user);
        id.setNotification(notification);
        return notificationDestinataireService.findById(id);
    }

    @PostMapping
    public NotificationDestinataire create(@RequestBody NotificationDestinataire notificationDestinataire) { return notificationDestinataireService.save(notificationDestinataire); }

    @DeleteMapping("/{user}/{notification}")
    public void delete(@PathVariable Long user, @PathVariable Long notification) {
        NotificationDestinataireId id = new NotificationDestinataireId();
        id.setUser(user);
        id.setNotification(notification);
        notificationDestinataireService.deleteById(id);
    }
} 