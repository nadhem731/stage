package com.sys_res.esp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.Map;

@Data
@Entity
@Table(name = "Users")
public class Users {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_user")
    private Long idUser;

    @Column(name = "nom", length = 100)
    private String nom;

    @Column(name = "prenom", length = 100)
    private String prenom;

    @Column(name = "email", length = 100, unique = true)
    private String email;

    @Column(name = "tel", length = 20)
    private String tel;

    @Column(name = "identifiant", length = 100)
    private String identifiant;

    @Column(name = "cin", length = 20, unique = true, nullable = false)
    private String cin;

    @Column(name = "matiere", length = 100)
    private String matiere;

    @ManyToOne
    @JoinColumn(name = "role_type_role", referencedColumnName = "type_role")
    private Role role;

    @ManyToOne
    @JoinColumn(name = "id_classe", referencedColumnName = "id_classe")
    private Classe classe;

    @Column(name = "password")
    private String password;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "disponibilite", columnDefinition = "jsonb")
    private Map<String, Object> disponibilite;

    public void setIdUser(Long idUser) {
        this.idUser = idUser;
    }

    public void setRoleTypeRole(String roleTypeRole) {
        if (this.role == null) {
            this.role = new Role();
        }
        this.role.setTypeRole(roleTypeRole);
    }

    public String getRoleTypeRole() {
        return this.role != null ? this.role.getTypeRole() : null;
    }
}
