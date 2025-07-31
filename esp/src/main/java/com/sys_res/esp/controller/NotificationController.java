package com.sys_res.esp.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sys_res.esp.entity.Notification;
import com.sys_res.esp.service.NotificationService;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    @Autowired
    private NotificationService notificationService;

    @GetMapping
    public List<Notification> getAll() { return notificationService.findAll(); }

    @GetMapping("/{id}")
    public Optional<Notification> getById(@PathVariable Long id) { return notificationService.findById(id); }

    @PostMapping
    public Notification create(@RequestBody Notification notification) { return notificationService.save(notification); }

    @PutMapping("/{id}")
    public Notification update(@PathVariable Long id, @RequestBody Notification notification) {
        notification.setIdNotification(id);
        return notificationService.save(notification);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { notificationService.deleteById(id); }
} 