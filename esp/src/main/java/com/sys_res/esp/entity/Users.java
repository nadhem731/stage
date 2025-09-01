package com.sys_res.esp.entity;

import java.util.Map;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.fasterxml.jackson.annotation.JsonInclude;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "Users")
@JsonInclude(JsonInclude.Include.ALWAYS)
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

    @Column(name = "image_data")
    private byte[] imageData;
    
    @Column(name = "image_type")
    private String imageType;

    @Column(name = "status_compte", length = 20, nullable = false, columnDefinition = "varchar(20) default 'ACTIF'")
    private String statusCompte = "ACTIF";

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
    
    public String getImageUrl() {
        if (this.imageData == null || this.imageType == null) {
            return null;
        }
        String base64Image = java.util.Base64.getEncoder().encodeToString(this.imageData);
        return "data:" + this.imageType + ";base64," + base64Image;
    }
    
    public void setImageUrl(String imageUrl) {
        // Cette méthode est un setter factice pour la désérialisation JSON
        // L'URL de l'image est générée à partir de imageData et imageType
        // donc on ne fait rien ici
        if (imageUrl != null && imageUrl.startsWith("data:") && imageUrl.contains(";base64,")) {
            try {
                String base64Data = imageUrl.split(",")[1];
                this.imageData = java.util.Base64.getDecoder().decode(base64Data);
                this.imageType = imageUrl.split(";")[0].split(":")[1];
            } catch (Exception e) {
                // En cas d'erreur, on ne fait rien
                System.err.println("Erreur lors de la conversion de l'URL en image: " + e.getMessage());
            }
        }
    }
}
