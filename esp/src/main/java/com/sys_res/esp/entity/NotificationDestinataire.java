package com.sys_res.esp.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "Notification_destinataire")
@IdClass(NotificationDestinataireId.class)
public class NotificationDestinataire {
    @Id
    @ManyToOne
    @JoinColumn(name = "id_user", referencedColumnName = "id_user")
    private Users user;

    @Id
    @ManyToOne
    @JoinColumn(name = "id_notification", referencedColumnName = "idNotification")
    private Notification notification;

    // Getters and Setters
    public Users getUser() {
        return user;
    }

    public void setUser(Users user) {
        this.user = user;
    }

    public Notification getNotification() {
        return notification;
    }

    public void setNotification(Notification notification) {
        this.notification = notification;
    }
} 