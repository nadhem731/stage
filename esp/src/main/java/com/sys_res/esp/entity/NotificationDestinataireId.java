package com.sys_res.esp.entity;

import java.io.Serializable;

public class NotificationDestinataireId implements Serializable {
    private Long user;
    private Long notification;

    // Default constructor
    public NotificationDestinataireId() {}

    // Parameterized constructor
    public NotificationDestinataireId(Long user, Long notification) {
        this.user = user;
        this.notification = notification;
    }

    // Equals and HashCode (required for @IdClass)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        NotificationDestinataireId that = (NotificationDestinataireId) o;
        return user.equals(that.user) && notification.equals(that.notification);
    }

    @Override
    public int hashCode() {
        return 31 * user.hashCode() + notification.hashCode();
    }

    // Getters and Setters
    public Long getUser() {
        return user;
    }

    public void setUser(Long user) {
        this.user = user;
    }

    public Long getNotification() {
        return notification;
    }

    public void setNotification(Long notification) {
        this.notification = notification;
    }
} 