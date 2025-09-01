package com.sys_res.esp.service;

import com.sys_res.esp.entity.Planning;
import com.sys_res.esp.entity.Soutenance;
import com.sys_res.esp.entity.Users;
import com.sys_res.esp.entity.Classe;
import com.sys_res.esp.repository.PlanningRepository;
import com.sys_res.esp.repository.SoutenanceRepository;
import com.sys_res.esp.repository.UsersRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.util.ByteArrayDataSource;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.layout.element.Text;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.properties.HorizontalAlignment;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private PlanningRepository planningRepository;

    @Autowired
    private SoutenanceRepository soutenanceRepository;

    @Autowired
    private UsersRepository usersRepository;
    
    @Autowired
    private com.sys_res.esp.repository.AffectationRepository affectationRepository;
    
    @Autowired
    private MicrosoftCalendarService microsoftCalendarService;

    public void sendPlanningNotificationToAllTeachers() {
        try {
            // Récupérer tous les enseignants
            List<Users> enseignants = usersRepository.findByRole_TypeRole("Enseignant");
            
            for (Users enseignant : enseignants) {
                try {
                    sendPlanningNotificationToTeacher(enseignant.getIdUser());
                    System.out.println("Email envoyé à: " + enseignant.getEmail());
                } catch (Exception e) {
                    System.err.println("Erreur envoi email à " + enseignant.getEmail() + ": " + e.getMessage());
                }
            }
            
            System.out.println("Notifications traitées pour " + enseignants.size() + " enseignants");
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi des notifications: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void sendPlanningNotificationToTeacher(Long teacherId) throws MessagingException {
        try {
            // Récupérer l'enseignant
            Users teacher = usersRepository.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Enseignant non trouvé avec l'ID: " + teacherId));
            
            System.out.println("DEBUG: Envoi email à l'enseignant: " + teacher.getNom() + " " + teacher.getPrenom() + " (" + teacher.getEmail() + ")");
            
            // Récupérer les plannings de l'enseignant
            List<Planning> plannings = planningRepository.findByUserId(teacherId);
            System.out.println("DEBUG: Nombre de plannings trouvés: " + plannings.size());
            
            // Récupérer les soutenances où l'enseignant est membre du jury
            List<Soutenance> soutenances = soutenanceRepository.findValidatedSoutenancesByJuryMember(teacherId);
            System.out.println("DEBUG: Nombre de soutenances trouvées: " + soutenances.size());
            
            // Envoyer emails séparés selon le contenu
            if (!plannings.isEmpty()) {
                sendCoursesNotificationToTeacher(teacher, plannings);
            }
            
            if (!soutenances.isEmpty()) {
                sendSoutenancesNotificationToTeacher(teacher, soutenances);
            }
            
            System.out.println("DEBUG: Emails envoyés avec succès à " + teacher.getEmail());
            
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi de l'email à l'enseignant " + teacherId + ": " + e.getMessage());
            // En mode développement, simuler l'envoi d'email
            try {
                Users teacher = usersRepository.findById(teacherId)
                    .orElseThrow(() -> new RuntimeException("Enseignant non trouvé avec l'ID: " + teacherId));
                List<Planning> plannings = planningRepository.findByUserId(teacherId);
                List<Soutenance> soutenances = soutenanceRepository.findValidatedSoutenancesByJuryMember(teacherId);
                
                System.out.println("INFO: Mode développement - Email simulé pour " + teacher.getEmail());
                System.out.println("INFO: Contenu de l'email généré avec succès (plannings: " + plannings.size() + ", soutenances: " + soutenances.size() + ")");
            } catch (Exception ex) {
                System.out.println("INFO: Mode développement - Email simulé");
            }
            System.out.println("INFO: La sauvegarde continue normalement");
        }
    }

    // Méthode séparée pour les emails de cours
    public void sendCoursesNotificationToTeacher(Users teacher, List<Planning> plannings) throws MessagingException {
        try {
            // Synchroniser avec Microsoft Calendar - Créer les événements de cours
            syncCoursesToMicrosoftCalendar(teacher, plannings);
            
            // Générer le contenu HTML spécifique aux cours
            String htmlContent = generateCoursesEmailContent(teacher, plannings);
            
            // Générer le PDF des cours avec orientation paysage
            byte[] pdfData = generateCoursesPdf(teacher, plannings);
            String pdfFileName = "Emploi_du_temps_Cours_" + teacher.getNom() + "_" + teacher.getPrenom() + "_" + 
                new java.text.SimpleDateFormat("dd_MM_yyyy").format(new java.util.Date()) + ".pdf";
            
            // Envoyer l'email avec le PDF en pièce jointe
            String subject = "📚 Votre emploi du temps des cours - ESPRIT";
            if (pdfData.length > 0) {
                sendHtmlEmailWithPdf(teacher.getEmail(), subject, htmlContent, pdfData, pdfFileName);
            } else {
                sendHtmlEmail(teacher.getEmail(), subject, htmlContent);
            }
            
            System.out.println("DEBUG: Email des cours envoyé à " + teacher.getEmail());
            
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi de l'email des cours: " + e.getMessage());
        }
    }

    // Méthode séparée pour les emails de soutenances
    public void sendSoutenancesNotificationToTeacher(Users teacher, List<Soutenance> soutenances) throws MessagingException {
        try {
            // Synchroniser avec Microsoft Calendar - Créer les événements de soutenances
            syncSoutenancesToMicrosoftCalendar(teacher, soutenances);
            
            // Générer le contenu HTML spécifique aux soutenances
            String htmlContent = generateSoutenancesEmailContent(teacher, soutenances);
            
            // Générer le PDF des soutenances avec orientation portrait
            byte[] pdfData = generateSoutenancesPdf(teacher, soutenances);
            String pdfFileName = "Planning_Soutenances_" + teacher.getNom() + "_" + teacher.getPrenom() + "_" + 
                new java.text.SimpleDateFormat("dd_MM_yyyy").format(new java.util.Date()) + ".pdf";
            
            // Envoyer l'email avec le PDF en pièce jointe
            String subject = "🎓 Votre planning de soutenances - ESPRIT";
            if (pdfData.length > 0) {
                sendHtmlEmailWithPdf(teacher.getEmail(), subject, htmlContent, pdfData, pdfFileName);
            } else {
                sendHtmlEmail(teacher.getEmail(), subject, htmlContent);
            }
            
            System.out.println("DEBUG: Email des soutenances envoyé à " + teacher.getEmail());
            
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi de l'email des soutenances: " + e.getMessage());
        }
    }

    // Contenu HTML spécifique aux cours
    private String generateCoursesEmailContent(Users teacher, List<Planning> plannings) {
        StringBuilder html = new StringBuilder();
        
        // En-tête HTML
        html.append("<!DOCTYPE html>")
            .append("<html lang='fr'>")
            .append("<head>")
            .append("<meta charset='UTF-8'>")
            .append("<meta name='viewport' content='width=device-width, initial-scale=1.0'>")
            .append("<title>Emploi du temps des cours - ESPRIT</title>")
            .append("<style>")
            .append("body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f0f8ff; }")
            .append(".container { max-width: 900px; margin: 0 auto; background: white; border-radius: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); overflow: hidden; }")
            .append(".header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 35px; text-align: center; }")
            .append(".header h1 { margin: 0; font-size: 32px; font-weight: 700; }")
            .append(".header p { margin: 15px 0 0 0; font-size: 18px; opacity: 0.95; }")
            .append(".content { padding: 35px; }")
            .append(".stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }")
            .append(".stat-card { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 20px; text-align: center; border-left: 5px solid #059669; }")
            .append(".stat-number { font-size: 28px; font-weight: 700; color: #059669; }")
            .append(".stat-label { font-size: 14px; color: #374151; margin-top: 8px; }")
            .append(".schedule-grid { display: grid; grid-template-columns: 140px repeat(6, 1fr); gap: 2px; background: #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 25px; }")
            .append(".grid-header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 15px 10px; text-align: center; font-weight: 700; font-size: 14px; }")
            .append(".grid-cell { background: white; padding: 10px; min-height: 80px; font-size: 12px; }")
            .append(".course-item { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-left: 4px solid #059669; padding: 8px; margin-bottom: 6px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }")
            .append(".course-title { font-weight: 700; color: #047857; font-size: 12px; }")
            .append(".course-details { font-size: 10px; color: #6b7280; margin-top: 4px; }")
            .append(".footer { background: #f9fafb; padding: 25px; text-align: center; color: #6b7280; font-size: 14px; }")
            .append(".empty-state { text-align: center; padding: 50px; color: #9ca3af; font-style: italic; font-size: 16px; }")
            .append("</style>")
            .append("</head>")
            .append("<body>");

        // Contenu principal
        html.append("<div class='container'>")
            .append("<div class='header'>")
            .append("<h1>📚 Emploi du temps des cours</h1>")
            .append("<p>").append(teacher.getPrenom()).append(" ").append(teacher.getNom()).append("</p>")
            .append("</div>")
            .append("<div class='content'>");

        // Statistiques
        html.append("<div class='stats'>")
            .append("<div class='stat-card'>")
            .append("<div class='stat-number'>").append(plannings.size()).append("</div>")
            .append("<div class='stat-label'>Cours programmés</div>")
            .append("</div>")
            .append("<div class='stat-card'>")
            .append("<div class='stat-number'>").append(getUniqueClasses(plannings).size()).append("</div>")
            .append("<div class='stat-label'>Classes enseignées</div>")
            .append("</div>")
            .append("<div class='stat-card'>")
            .append("<div class='stat-number'>").append(getTotalHours(plannings)).append("h</div>")
            .append("<div class='stat-label'>Heures totales</div>")
            .append("</div>")
            .append("</div>");

        // Grille des cours
        if (plannings.isEmpty()) {
            html.append("<div class='empty-state'>Aucun cours programmé pour le moment</div>");
        } else {
            html.append(generateCoursesGrid(plannings));
        }

        // Pied de page
        html.append("</div>")
            .append("<div class='footer'>")
            .append("<p>📧 Email généré automatiquement par le système ESPRIT</p>")
            .append("<p>Date: ").append(new java.text.SimpleDateFormat("dd/MM/yyyy").format(new java.util.Date()))
            .append("</p>")
            .append("</div>")
            .append("</div>")
            .append("</body>")
            .append("</html>");

        return html.toString();
    }

    // Contenu HTML spécifique aux soutenances - même style que les cours
    private String generateSoutenancesEmailContent(Users teacher, List<Soutenance> soutenances) {
        StringBuilder html = new StringBuilder();
        
        // En-tête HTML avec même style que les cours
        html.append("<!DOCTYPE html>")
            .append("<html lang='fr'>")
            .append("<head>")
            .append("<meta charset='UTF-8'>")
            .append("<meta name='viewport' content='width=device-width, initial-scale=1.0'>")
            .append("<title>Planning des soutenances - ESPRIT</title>")
            .append("<style>")
            .append("body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #fef7ff; }")
            .append(".container { max-width: 900px; margin: 0 auto; background: white; border-radius: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); overflow: hidden; }")
            .append(".header { background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 35px; text-align: center; }")
            .append(".header h1 { margin: 0; font-size: 32px; font-weight: 700; }")
            .append(".header p { margin: 15px 0 0 0; font-size: 18px; opacity: 0.95; }")
            .append(".content { padding: 35px; }")
            .append(".stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }")
            .append(".stat-card { background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-radius: 12px; padding: 20px; text-align: center; border-left: 5px solid #7c3aed; }")
            .append(".stat-number { font-size: 28px; font-weight: 700; color: #7c3aed; }")
            .append(".stat-label { font-size: 14px; color: #374151; margin-top: 8px; }")
            .append(".schedule-grid { display: grid; grid-template-columns: 140px repeat(6, 1fr); gap: 2px; background: #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 25px; }")
            .append(".grid-header { background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 15px 10px; text-align: center; font-weight: 700; font-size: 14px; }")
            .append(".grid-cell { background: white; padding: 10px; min-height: 80px; font-size: 12px; }")
            .append(".soutenance-item { background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-left: 4px solid #7c3aed; padding: 8px; margin-bottom: 6px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }")
            .append(".soutenance-title { font-weight: 700; color: #5b21b6; font-size: 12px; }")
            .append(".soutenance-details { font-size: 10px; color: #6b7280; margin-top: 4px; }")
            .append(".footer { background: #f9fafb; padding: 25px; text-align: center; color: #6b7280; font-size: 14px; }")
            .append(".empty-state { text-align: center; padding: 50px; color: #9ca3af; font-style: italic; font-size: 16px; }")
            .append("</style>")
            .append("</head>")
            .append("<body>");

        // Contenu principal
        html.append("<div class='container'>")
            .append("<div class='header'>")
            .append("<h1>🎓 Planning des soutenances</h1>")
            .append("<p>").append(teacher.getPrenom()).append(" ").append(teacher.getNom()).append("</p>")
            .append("</div>")
            .append("<div class='content'>");

        // Statistiques
        html.append("<div class='stats'>")
            .append("<div class='stat-card'>")
            .append("<div class='stat-number'>").append(soutenances.size()).append("</div>")
            .append("<div class='stat-label'>Soutenances programmées</div>")
            .append("</div>")
            .append("<div class='stat-card'>")
            .append("<div class='stat-number'>").append(getUniqueSoutenanceDays(soutenances).size()).append("</div>")
            .append("<div class='stat-label'>Jours concernés</div>")
            .append("</div>")
            .append("<div class='stat-card'>")
            .append("<div class='stat-number'>").append(getTotalSoutenanceHours(soutenances)).append("h</div>")
            .append("<div class='stat-label'>Heures totales</div>")
            .append("</div>")
            .append("</div>");

        // Grille des soutenances - même style que les cours
        if (soutenances.isEmpty()) {
            html.append("<div class='empty-state'>Aucune soutenance programmée pour le moment</div>");
        } else {
            html.append(generateSoutenancesGrid(soutenances));
        }

        // Pied de page
        html.append("</div>")
            .append("<div class='footer'>")
            .append("<p>📧 Email généré automatiquement par le système ESPRIT</p>")
            .append("<p>Date: ").append(new java.text.SimpleDateFormat("dd/MM/yyyy").format(new java.util.Date()))
            .append("</p>")
            .append("</div>")
            .append("</div>")
            .append("</body>")
            .append("</html>");

        return html.toString();
    }

    private String generateEmailContent(Users teacher, List<Planning> plannings, List<Soutenance> soutenances) {
        StringBuilder html = new StringBuilder();
        
        // En-tête HTML
        html.append("<!DOCTYPE html>")
            .append("<html lang='fr'>")
            .append("<head>")
            .append("<meta charset='UTF-8'>")
            .append("<meta name='viewport' content='width=device-width, initial-scale=1.0'>")
            .append("<title>Emploi du temps - ESPRIT</title>")
            .append("<style>")
            .append("body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f7fa; }")
            .append(".container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }")
            .append(".header { background: linear-gradient(135deg, #CB0920 0%, #8B0000 100%); color: white; padding: 30px; text-align: center; }")
            .append(".header h1 { margin: 0; font-size: 28px; font-weight: 700; }")
            .append(".header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.9; }")
            .append(".content { padding: 30px; }")
            .append(".section { margin-bottom: 30px; }")
            .append(".section-title { color: #CB0920; font-size: 20px; font-weight: 600; margin-bottom: 15px; border-bottom: 2px solid #CB0920; padding-bottom: 5px; }")
            .append(".schedule-grid { display: grid; grid-template-columns: 120px repeat(6, 1fr); gap: 1px; background: #e0e0e0; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }")
            .append(".grid-header { background: #CB0920; color: white; padding: 12px 8px; text-align: center; font-weight: 600; font-size: 14px; }")
            .append(".grid-cell { background: white; padding: 8px; min-height: 60px; font-size: 12px; }")
            .append(".course-item { background: #e8f5e8; border-left: 4px solid #059669; padding: 6px; margin-bottom: 4px; border-radius: 4px; }")
            .append(".soutenance-item { background: #e8f0ff; border-left: 4px solid #3b82f6; padding: 6px; margin-bottom: 4px; border-radius: 4px; }")
            .append(".course-title { font-weight: 600; color: #059669; font-size: 11px; }")
            .append(".soutenance-title { font-weight: 600; color: #3b82f6; font-size: 11px; }")
            .append(".course-details, .soutenance-details { font-size: 10px; color: #666; margin-top: 2px; }")
            .append(".stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px; }")
            .append(".stat-card { background: #f8f9fa; border-radius: 8px; padding: 15px; text-align: center; border-left: 4px solid #CB0920; }")
            .append(".stat-number { font-size: 24px; font-weight: 700; color: #CB0920; }")
            .append(".stat-label { font-size: 12px; color: #666; margin-top: 5px; }")
            .append(".footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }")
            .append(".empty-state { text-align: center; padding: 40px; color: #666; font-style: italic; }")
            .append("</style>")
            .append("</head>")
            .append("<body>");

        // Contenu principal
        html.append("<div class='container'>")
            .append("<div class='header'>")
            .append("<h1>📅 Emploi du temps - ").append(teacher.getNom()).append(" ").append(teacher.getPrenom()).append("</h1>")
            .append("<p>Voici votre planning mis à jour pour la semaine</p>")
            .append("</div>")
            .append("<div class='content'>");

        // Statistiques
        html.append("<div class='stats'>")
            .append("<div class='stat-card'>")
            .append("<div class='stat-number'>").append(plannings.size()).append("</div>")
            .append("<div class='stat-label'>Cours programmés</div>")
            .append("</div>")
            .append("<div class='stat-card'>")
            .append("<div class='stat-number'>").append(soutenances.size()).append("</div>")
            .append("<div class='stat-label'>Soutenances</div>")
            .append("</div>")
            .append("<div class='stat-card'>")
            .append("<div class='stat-number'>").append(getUniqueClasses(plannings).size()).append("</div>")
            .append("<div class='stat-label'>Classes enseignées</div>")
            .append("</div>")
            .append("</div>");

        // Section Cours
        html.append("<div class='section'>")
            .append("<h2 class='section-title'>📚 Mes Cours</h2>");
        
        if (plannings.isEmpty()) {
            html.append("<div class='empty-state'>Aucun cours programmé pour le moment</div>");
        } else {
            html.append(generateCoursesGrid(plannings));
        }
        
        html.append("</div>");

        // Section Soutenances
        html.append("<div class='section'>")
            .append("<h2 class='section-title'>🎓 Mes Soutenances</h2>");
        
        if (soutenances.isEmpty()) {
            html.append("<div class='empty-state'>Aucune soutenance programmée pour le moment</div>");
        } else {
            html.append(generateSoutenancesGrid(soutenances));
        }
        
        html.append("</div>");

        // Pied de page
        html.append("</div>")
            .append("<div class='footer'>")
            .append("<p>📧 Cet email a été généré automatiquement par le système de gestion des plannings ESPRIT</p>")
            .append("<p>Date de génération: ").append(new java.text.SimpleDateFormat("dd/MM/yyyy").format(new java.util.Date()))
            .append("</p>")
            .append("</div>")
            .append("</div>")
            .append("</body>")
            .append("</html>");

        return html.toString();
    }

    private String generateCoursesGrid(List<Planning> plannings) {
        StringBuilder grid = new StringBuilder();
        String[] days = {"Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"};
        String[] timeSlots = {"09:00-12:15", "13:30-16:45"};

        // Grouper les cours par jour et créneau
        Map<String, Map<String, List<Planning>>> scheduleMap = new HashMap<>();
        
        for (Planning planning : plannings) {
            String day = getDayFromDate(planning.getDateDebut());
            String timeSlot = getTimeSlotFromTime(planning.getHeureDebut());
            
            scheduleMap.computeIfAbsent(day, k -> new HashMap<>())
                      .computeIfAbsent(timeSlot, k -> new ArrayList<>())
                      .add(planning);
        }

        // Générer la grille HTML
        grid.append("<div class='schedule-grid'>");
        
        // En-têtes
        grid.append("<div class='grid-header'>Horaire</div>");
        for (String day : days) {
            grid.append("<div class='grid-header'>").append(day).append("</div>");
        }

        // Lignes pour chaque créneau
        for (String timeSlot : timeSlots) {
            grid.append("<div class='grid-header'>").append(timeSlot).append("</div>");
            
            for (String day : days) {
                grid.append("<div class='grid-cell'>");
                
                List<Planning> coursesInSlot = scheduleMap.getOrDefault(day, new HashMap<>())
                                                              .getOrDefault(timeSlot, new ArrayList<>());
                
                if (!coursesInSlot.isEmpty()) {
                    for (Planning cours : coursesInSlot) {
                        grid.append("<div class='course-item'>")
                            .append("<div class='course-title'>")
                            .append(cours.getClasse() != null ? cours.getClasse().getNomClasse() : "N/A")
                            .append("</div>")
                            .append("<div class='course-details'>")
                            .append("Salle: ").append(cours.getSalle() != null ? cours.getSalle().getNumSalle() : "N/A")
                            .append("<br>Matière: ").append(cours.getUser() != null && cours.getUser().getMatiere() != null ? cours.getUser().getMatiere() : "Matière")
                            .append("<br>Mode: ").append(cours.getModeCours() != null ? cours.getModeCours() : "présentiel")
                            .append("</div>")
                            .append("</div>");
                    }
                }
                
                grid.append("</div>");
            }
        }
        
        grid.append("</div>");
        return grid.toString();
    }

    private String generateSoutenancesGrid(List<Soutenance> soutenances) {
        StringBuilder grid = new StringBuilder();
        String[] days = {"Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"};
        String[] timeSlots = {"09:00-12:15", "13:30-16:45"};

        // Grouper les soutenances par jour et créneau
        Map<String, Map<String, List<Soutenance>>> scheduleMap = new HashMap<>();
        
        for (Soutenance soutenance : soutenances) {
            String day = getDayFromDate(soutenance.getDate());
            String timeSlot = getSoutenanceTimeSlot(soutenance.getHeureTime());
            
            scheduleMap.computeIfAbsent(day, k -> new HashMap<>())
                      .computeIfAbsent(timeSlot, k -> new ArrayList<>())
                      .add(soutenance);
        }

        // Générer la grille HTML
        grid.append("<div class='schedule-grid'>");
        
        // En-têtes
        grid.append("<div class='grid-header'>Horaire</div>");
        for (String day : days) {
            grid.append("<div class='grid-header'>").append(day).append("</div>");
        }

        // Lignes pour chaque créneau
        for (String timeSlot : timeSlots) {
            grid.append("<div class='grid-header'>").append(timeSlot).append("</div>");
            
            for (String day : days) {
                grid.append("<div class='grid-cell'>");
                
                List<Soutenance> soutenancesInSlot = scheduleMap.getOrDefault(day, new HashMap<>())
                                                              .getOrDefault(timeSlot, new ArrayList<>());
                
                if (!soutenancesInSlot.isEmpty()) {
                    for (Soutenance soutenance : soutenancesInSlot) {
                        grid.append("<div class='soutenance-item'>")
                            .append("<div class='soutenance-title'>")
                            .append(soutenance.getUser() != null ? 
                                soutenance.getUser().getPrenom() + " " + soutenance.getUser().getNom() : "Étudiant")
                            .append("</div>")
                            .append("<div class='soutenance-details'>")
                            .append("🕐 ").append(soutenance.getHeureTime() != null ? soutenance.getHeureTime().toString().substring(0, 5) : "N/A")
                            .append("<br>🏢 ").append(soutenance.getSalle() != null ? soutenance.getSalle().getNumSalle() : "Salle N/A")
                            .append("</div>")
                            .append("</div>");
                    }
                }
                
                grid.append("</div>");
            }
        }
        
        grid.append("</div>");
        return grid.toString();
    }

    // Méthodes utilitaires pour les statistiques
    private int getTotalHours(List<Planning> plannings) {
        return plannings.size() * 6; // Chaque cours = 6h (3h15 matin + 3h15 après-midi)
    }

    private List<String> getUniqueSoutenanceDays(List<Soutenance> soutenances) {
        return soutenances.stream()
                .map(s -> getDayFromDate(s.getDate()))
                .distinct()
                .sorted((a, b) -> {
                    String[] days = {"Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"};
                    return Integer.compare(Arrays.asList(days).indexOf(a), Arrays.asList(days).indexOf(b));
                })
                .collect(Collectors.toList());
    }

    private int getTotalSoutenanceHours(List<Soutenance> soutenances) {
        return soutenances.size() * 1; // Chaque soutenance = 1h (approximation)
    }

    // Méthode pour déterminer le créneau horaire d'une soutenance
    private String getSoutenanceTimeSlot(java.sql.Time heureTime) {
        if (heureTime == null) return "Autre";
        
        try {
            String time = heureTime.toString();
            String hourMinute = time.substring(0, 5);
            if (hourMinute.compareTo("09:00") >= 0 && hourMinute.compareTo("12:15") <= 0) {
                return "09:00-12:15";
            } else if (hourMinute.compareTo("13:30") >= 0 && hourMinute.compareTo("16:45") <= 0) {
                return "13:30-16:45";
            }
        } catch (Exception e) {
            // Ignore
        }
        
        return "Autre";
    }

    // Envoyer l'emploi du temps de classe aux étudiants lors de la validation des cours
    public void sendClassScheduleToStudents(List<Planning> plannings) {
        try {
            System.out.println("=== DEBUT ENVOI EMAILS ETUDIANTS ===");
            System.out.println("Nombre de plannings reçus: " + plannings.size());
            
            // Grouper les plannings par classe
            Map<Classe, List<Planning>> planningsByClass = plannings.stream()
                .filter(p -> p.getClasse() != null)
                .collect(Collectors.groupingBy(Planning::getClasse));

            System.out.println("Nombre de classes trouvées: " + planningsByClass.size());

            for (Map.Entry<Classe, List<Planning>> entry : planningsByClass.entrySet()) {
                Classe classe = entry.getKey();
                List<Planning> classPlannings = entry.getValue();
                
                System.out.println("Traitement classe: " + classe.getNomClasse() + " avec " + classPlannings.size() + " plannings");
                
                // Récupérer les étudiants via la table Affectation
                List<Users> students = affectationRepository.findStudentsByClasseId(classe.getIdClasse());
                System.out.println("Nombre d'étudiants trouvés pour " + classe.getNomClasse() + " via Affectation: " + students.size());
                
                for (Users student : students) {
                    System.out.println("Tentative d'envoi email à: " + student.getEmail());
                    try {
                        String subject = "📅 Emploi du temps - " + classe.getNomClasse();
                        String content = generateStudentClassScheduleEmail(student, classe, classPlannings);
                        
                        // Générer le PDF de l'emploi du temps
                        byte[] pdfBytes = generateStudentSchedulePdf(student, classe, classPlannings);
                        String pdfFileName = "Emploi_du_temps_" + classe.getNomClasse() + "_" + 
                                           student.getNom() + "_" + student.getPrenom() + "_" + 
                                           new java.text.SimpleDateFormat("dd-MM-yyyy").format(new java.util.Date()) + ".pdf";
                        
                        // Synchroniser avec Microsoft Calendar pour l'étudiant
                        syncStudentClassScheduleToMicrosoftCalendar(student, classPlannings);
                        
                        // Envoyer email avec PDF en pièce jointe
                        sendHtmlEmailWithPdf(student.getEmail(), subject, content, pdfBytes, pdfFileName);
                        System.out.println("Email avec PDF envoyé avec succès à: " + student.getEmail());
                        
                    } catch (Exception e) {
                        System.err.println("Erreur lors de l'envoi email à " + student.getEmail() + ": " + e.getMessage());
                        // Fallback: envoyer email simple sans PDF
                        try {
                            MimeMessage message = mailSender.createMimeMessage();
                            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                            helper.setTo(student.getEmail());
                            String subject = "📅 Emploi du temps - " + classe.getNomClasse();
                            helper.setSubject(subject);
                            helper.setText(generateStudentClassScheduleEmail(student, classe, classPlannings), true);
                            mailSender.send(message);
                            System.out.println("Email simple envoyé (sans PDF) à: " + student.getEmail());
                        } catch (Exception fallbackEx) {
                            System.err.println("Erreur lors de l'envoi email fallback à " + student.getEmail() + ": " + fallbackEx.getMessage());
                        }
                    }
                }
            }
            
        } catch (Exception e) {
            System.err.println("❌ Erreur globale lors de l'envoi des emails aux étudiants: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // Envoyer l'emploi du temps personnel aux étudiants concernés par les soutenances
    public void sendSoutenanceScheduleToStudents(List<Soutenance> soutenances) {
        try {
            for (Soutenance soutenance : soutenances) {
                Users student = soutenance.getUser();
                if (student != null && student.getEmail() != null) {
                    try {
                        String subject = "🎓 Votre soutenance programmée";
                        String content = generateStudentSoutenanceEmail(student, soutenance);
                        
                        MimeMessage message = mailSender.createMimeMessage();
                        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                        
                        helper.setTo(student.getEmail());
                        helper.setSubject(subject);
                        helper.setText(content, true);
                        helper.setFrom("noreply@esprit.tn");
                        
                        // Synchroniser avec Microsoft Calendar pour l'étudiant
                        syncStudentSoutenanceToMicrosoftCalendar(student, soutenance);
                        
                        mailSender.send(message);
                        System.out.println("Email de soutenance envoyé à: " + student.getEmail());
                        
                    } catch (Exception e) {
                        System.err.println("Erreur lors de l'envoi de l'email de soutenance à " + student.getEmail() + ": " + e.getMessage());
                    }
                }
            }
            
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi des emails de soutenance: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // Générer le contenu email pour l'emploi du temps d'une classe (étudiants) - Format tableau paysage
    private String generateStudentClassScheduleEmail(Users student, com.sys_res.esp.entity.Classe classe, List<Planning> plannings) {
        StringBuilder html = new StringBuilder();
        
        // En-tête HTML avec orientation paysage
        html.append("<!DOCTYPE html>")
            .append("<html lang='fr'>")
            .append("<head>")
            .append("<meta charset='UTF-8'>")
            .append("<meta name='viewport' content='width=device-width, initial-scale=1.0'>")
            .append("<title>Emploi du temps - ").append(classe.getNomClasse()).append("</title>")
            .append("<style>")
            .append("@page { size: landscape; margin: 15mm; }")
            .append("@media print { body { -webkit-print-color-adjust: exact; } }")
            .append("body { font-family: 'Arial', sans-serif; margin: 0; padding: 15px; background-color: #ffffff; font-size: 12px; }")
            .append(".container { width: 100%; max-width: 1200px; margin: 0 auto; }")
            .append(".header { text-align: center; margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; border-radius: 8px; }")
            .append(".header h1 { margin: 0; font-size: 24px; font-weight: bold; }")
            .append(".header p { margin: 8px 0 0 0; font-size: 16px; }")
            .append(".schedule-table { width: 100%; border-collapse: collapse; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }")
            .append(".schedule-table th, .schedule-table td { border: 2px solid #e5e7eb; padding: 8px; text-align: center; vertical-align: middle; }")
            .append(".schedule-table th { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; font-weight: bold; font-size: 13px; }")
            .append(".time-header { background: linear-gradient(135deg, #1f2937 0%, #374151 100%) !important; color: white; font-weight: bold; width: 120px; }")
            .append(".day-header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%) !important; color: white; font-weight: bold; }")
            .append(".schedule-table td { background: #ffffff; height: 80px; position: relative; }")
            .append(".course-block { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid #3b82f6; border-radius: 6px; padding: 6px; margin: 2px; height: 90%; display: flex; flex-direction: column; justify-content: center; }")
            .append(".course-title { font-weight: bold; color: #1e40af; font-size: 11px; margin-bottom: 2px; }")
            .append(".course-details { font-size: 9px; color: #374151; line-height: 1.2; }")
            .append(".course-online { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%) !important; border-color: #f59e0b !important; }")
            .append(".course-online .course-title { color: #92400e !important; }")
            .append(".empty-cell { background: #f9fafb; }")
            .append(".footer { text-align: center; margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px; color: #6b7280; font-size: 11px; }")
            .append("</style>")
            .append("</head>")
            .append("<body>");

        // Contenu principal
        html.append("<div class='container'>")
            .append("<div class='header'>")
            .append("<h1>📅 EMPLOI DU TEMPS - ").append(classe.getNomClasse()).append("</h1>")
            .append("<p>").append(student.getPrenom()).append(" ").append(student.getNom()).append(" - Année universitaire 2024-2025</p>")
            .append("</div>");

        // Tableau emploi du temps
        html.append(generateStudentScheduleTable(plannings));

        // Pied de page
        html.append("<div class='footer'>")
            .append("<p><strong>📧 Document généré automatiquement par le système ESPRIT</strong></p>")
            .append("<p>Date de génération: ").append(new java.text.SimpleDateFormat("dd/MM/yyyy 'à' HH:mm").format(new java.util.Date()))
            .append(" | Classe: ").append(classe.getNomClasse()).append(" | Total cours: ").append(plannings.size()).append("</p>")
            .append("<p style='margin-top: 10px; font-size: 10px;'>🟦 Présentiel | 🟨 En ligne</p>")
            .append("</div>")
            .append("</div>")
            .append("</body>")
            .append("</html>");

        return html.toString();
    }

    // Générer le tableau emploi du temps pour les étudiants
    private String generateStudentScheduleTable(List<Planning> plannings) {
        StringBuilder table = new StringBuilder();
        
        System.out.println("DEBUG: generateStudentScheduleTable - Nombre de plannings reçus: " + plannings.size());
        
        // Créer une map pour organiser les cours par jour et créneau
        Map<String, Map<String, Planning>> scheduleMap = new HashMap<>();
        String[] days = {"Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"};
        String[] timeSlots = {"09:00-12:15", "13:30-16:45"};
        
        // Initialiser la map
        for (String day : days) {
            scheduleMap.put(day, new HashMap<>());
            for (String slot : timeSlots) {
                scheduleMap.get(day).put(slot, null);
            }
        }
        
        // Remplir la map avec les plannings
        for (Planning planning : plannings) {
            String day = getDayFromDate(planning.getDateDebut());
            String timeSlot = getTimeSlotFromTime(planning.getHeureDebut());
            
            System.out.println("DEBUG: Planning - Jour: " + day + ", Créneau: " + timeSlot + ", Classe: " + 
                (planning.getClasse() != null ? planning.getClasse().getNomClasse() : "N/A"));
            
            if (scheduleMap.containsKey(day) && timeSlot != null && !timeSlot.equals("Non défini")) {
                scheduleMap.get(day).put(timeSlot, planning);
            }
        }
        
        // Générer le tableau HTML
        table.append("<table class='schedule-table'>")
             .append("<thead>")
             .append("<tr>")
             .append("<th class='time-header'>Horaire</th>");
        
        for (String day : days) {
            table.append("<th class='day-header'>").append(day).append("</th>");
        }
        table.append("</tr></thead><tbody>");
        
        // Générer les lignes pour chaque créneau horaire
        for (String timeSlot : timeSlots) {
            table.append("<tr>")
                 .append("<td class='time-header'><strong>").append(timeSlot).append("</strong></td>");
            
            for (String day : days) {
                Planning planning = scheduleMap.get(day).get(timeSlot);
                table.append("<td>");
                
                if (planning != null) {
                    String courseClass = "course-block";
                    if ("en_ligne".equals(planning.getModeCours())) {
                        courseClass += " course-online";
                    }
                    
                    table.append("<div class='").append(courseClass).append("'>")
                         .append("<div class='course-title'>").append(planning.getUser() != null && planning.getUser().getMatiere() != null ? planning.getUser().getMatiere() : "Matière").append("</div>")
                         .append("<div class='course-details'>")
                         .append("Salle: ").append(planning.getSalle() != null ? planning.getSalle().getNumSalle() : "N/A").append("<br>")
                         .append("Enseignant: ").append(planning.getUser() != null ? planning.getUser().getPrenom() + " " + planning.getUser().getNom() : "N/A").append("<br>")
                         .append("Mode: ").append("en_ligne".equals(planning.getModeCours()) ? "🟨 En ligne" : "🟦 Présentiel")
                         .append("</div>")
                         .append("</div>");
                } else {
                    table.append("<div class='empty-cell'></div>");
                }
                
                table.append("</td>");
            }
            table.append("</tr>");
        }
        
        table.append("</tbody></table>");
        return table.toString();
    }

    // Générer le PDF de l'emploi du temps pour un étudiant
    private byte[] generateStudentSchedulePdf(Users student, com.sys_res.esp.entity.Classe classe, List<Planning> plannings) throws Exception {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            System.out.println("DEBUG PDF: generateStudentSchedulePdf - Nombre de plannings: " + plannings.size());
            
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            pdfDoc.setDefaultPageSize(PageSize.A4.rotate()); // Orientation paysage
            Document document = new Document(pdfDoc);

            // Titre principal
            Paragraph title = new Paragraph("EMPLOI DU TEMPS - " + classe.getNomClasse())
                .setTextAlignment(TextAlignment.CENTER)
                .setFontSize(18)
                .setBold()
                .setMarginBottom(10);
            document.add(title);

            // Informations étudiant
            Paragraph studentInfo = new Paragraph(student.getPrenom() + " " + student.getNom() + " - Année universitaire 2024-2025")
                .setTextAlignment(TextAlignment.CENTER)
                .setFontSize(12)
                .setMarginBottom(20);
            document.add(studentInfo);

            // Créer le tableau emploi du temps avec style amélioré
            Table table = new Table(7); // 7 colonnes (horaire + 6 jours)
            table.setWidth(UnitValue.createPercentValue(100));
            table.setBorder(new SolidBorder(new DeviceRgb(0, 51, 102), 2)); // Bordure bleue ESPRIT
            table.setMarginTop(20);

            // En-têtes avec style ESPRIT
            DeviceRgb headerColor = new DeviceRgb(0, 51, 102); // Bleu ESPRIT
            Cell headerTimeCell = new Cell().add(new Paragraph("HORAIRE")
                .setBold()
                .setFontColor(ColorConstants.WHITE)
                .setFontSize(12)
                .setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(headerColor)
                .setPadding(10)
                .setBorder(new SolidBorder(ColorConstants.WHITE, 1));
            table.addHeaderCell(headerTimeCell);
            
            String[] days = {"Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"};
            for (String day : days) {
                Cell headerCell = new Cell().add(new Paragraph(day)
                    .setBold()
                    .setFontColor(ColorConstants.WHITE)
                    .setFontSize(12)
                    .setTextAlignment(TextAlignment.CENTER))
                    .setBackgroundColor(headerColor)
                    .setPadding(10)
                    .setBorder(new SolidBorder(ColorConstants.WHITE, 1));
                table.addHeaderCell(headerCell);
            }

            // Organiser les cours par jour et créneau
            Map<String, Map<String, Planning>> scheduleMap = new HashMap<>();
            String[] timeSlots = {"09:00-12:15", "13:30-16:45"};
            
            for (String day : days) {
                scheduleMap.put(day, new HashMap<>());
                for (String slot : timeSlots) {
                    scheduleMap.get(day).put(slot, null);
                }
            }
            
            for (Planning planning : plannings) {
                String day = getDayFromDate(planning.getDateDebut());
                String timeSlot = getTimeSlotFromTime(planning.getHeureDebut());
                
                System.out.println("DEBUG PDF: Planning - Jour: " + day + ", Créneau: " + timeSlot + ", Classe: " + 
                    (planning.getClasse() != null ? planning.getClasse().getNomClasse() : "N/A"));
                
                if (scheduleMap.containsKey(day) && timeSlot != null && !timeSlot.equals("Non défini")) {
                    scheduleMap.get(day).put(timeSlot, planning);
                }
            }

            // Remplir le tableau avec style amélioré
            DeviceRgb timeSlotColor = new DeviceRgb(240, 240, 240); // Gris clair pour les créneaux
            
            for (String timeSlot : timeSlots) {
                // Cellule horaire avec style
                Cell timeCell = new Cell().add(new Paragraph(timeSlot)
                    .setBold()
                    .setFontSize(11)
                    .setTextAlignment(TextAlignment.CENTER))
                    .setBackgroundColor(timeSlotColor)
                    .setPadding(8)
                    .setBorder(new SolidBorder(new DeviceRgb(200, 200, 200), 1));
                table.addCell(timeCell);
                
                for (String day : days) {
                    Planning planning = scheduleMap.get(day).get(timeSlot);
                    Cell cell = new Cell();
                    cell.setPadding(8);
                    cell.setBorder(new SolidBorder(new DeviceRgb(200, 200, 200), 1));
                    cell.setMinHeight(80); // Hauteur minimale pour les cellules
                    
                    if (planning != null) {
                        // Contenu du cours avec mise en forme améliorée
                        Paragraph courseTitle = new Paragraph(planning.getUser() != null && planning.getUser().getMatiere() != null ? planning.getUser().getMatiere() : "Matière")
                            .setBold()
                            .setFontSize(11)
                            .setFontColor(new DeviceRgb(0, 51, 102))
                            .setMarginBottom(5);
                        
                        Paragraph courseDetails = new Paragraph()
                            .setFontSize(9)
                            .setMarginBottom(2);
                        
                        // Icônes et informations
                        courseDetails.add(new Text("🏢 Salle: " + (planning.getSalle() != null ? planning.getSalle().getNumSalle() : "N/A") + "\n"));
                        courseDetails.add(new Text("👨‍🏫 " + (planning.getUser() != null ? planning.getUser().getPrenom() + " " + planning.getUser().getNom() : "N/A") + "\n"));
                        
                        // Mode avec couleur et icône
                        Text modeText;
                        if ("en_ligne".equals(planning.getModeCours())) {
                            modeText = new Text("💻 En ligne")
                                .setFontColor(new DeviceRgb(255, 140, 0))
                                .setBold();
                            cell.setBackgroundColor(new DeviceRgb(255, 250, 240)); // Orange très clair
                        } else {
                            modeText = new Text("🏫 Présentiel")
                                .setFontColor(new DeviceRgb(0, 100, 200))
                                .setBold();
                            cell.setBackgroundColor(new DeviceRgb(240, 248, 255)); // Bleu très clair
                        }
                        courseDetails.add(modeText);
                        
                        cell.add(courseTitle);
                        cell.add(courseDetails);
                    } else {
                        // Cellule vide avec style
                        cell.add(new Paragraph("")
                            .setTextAlignment(TextAlignment.CENTER)
                            .setFontSize(10)
                            .setFontColor(new DeviceRgb(150, 150, 150)));
                        cell.setBackgroundColor(new DeviceRgb(250, 250, 250)); // Gris très clair
                    }
                    
                    table.addCell(cell);
                }
            }

            document.add(table);

            // Légende avec style amélioré
            Table legendTable = new Table(2);
            legendTable.setWidth(UnitValue.createPercentValue(60));
            legendTable.setHorizontalAlignment(HorizontalAlignment.CENTER);
            legendTable.setMarginTop(20);
            
            // Légende Présentiel
            Cell presCell = new Cell()
                .add(new Paragraph("🏫 Présentiel")
                    .setBold()
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(new DeviceRgb(240, 248, 255))
                .setBorder(new SolidBorder(new DeviceRgb(0, 100, 200), 1))
                .setPadding(8);
            
            // Légende En ligne
            Cell onlineCell = new Cell()
                .add(new Paragraph("💻 En ligne")
                    .setBold()
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(new DeviceRgb(255, 250, 240))
                .setBorder(new SolidBorder(new DeviceRgb(255, 140, 0), 1))
                .setPadding(8);
            
            legendTable.addCell(presCell);
            legendTable.addCell(onlineCell);
            document.add(legendTable);

            // Pied de page avec style ESPRIT
            Paragraph footer = new Paragraph()
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(30)
                .setBorderTop(new SolidBorder(new DeviceRgb(0, 51, 102), 1))
                .setPaddingTop(10);
            
            footer.add(new Text("📅 Document généré automatiquement par le système ESPRIT\n")
                .setFontSize(9)
                .setBold()
                .setFontColor(new DeviceRgb(0, 51, 102)));
            
            footer.add(new Text("Date de génération: " + 
                new java.text.SimpleDateFormat("dd/MM/yyyy à HH:mm").format(new java.util.Date()))
                .setFontSize(8)
                .setFontColor(new DeviceRgb(100, 100, 100)));
            
            document.add(footer);

            document.close();
            return baos.toByteArray();
        }
    }

    // Générer le contenu email pour la soutenance d'un étudiant
    private String generateStudentSoutenanceEmail(Users student, Soutenance soutenance) {
        StringBuilder html = new StringBuilder();
        
        // En-tête HTML
        html.append("<!DOCTYPE html>")
            .append("<html lang='fr'>")
            .append("<head>")
            .append("<meta charset='UTF-8'>")
            .append("<meta name='viewport' content='width=device-width, initial-scale=1.0'>")
            .append("<title>Votre soutenance programmée</title>")
            .append("<style>")
            .append("body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #fef7ff; }")
            .append(".container { max-width: 700px; margin: 0 auto; background: white; border-radius: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); overflow: hidden; }")
            .append(".header { background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 35px; text-align: center; }")
            .append(".header h1 { margin: 0; font-size: 32px; font-weight: 700; }")
            .append(".header p { margin: 15px 0 0 0; font-size: 18px; opacity: 0.95; }")
            .append(".content { padding: 35px; }")
            .append(".soutenance-card { background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 5px solid #7c3aed; }")
            .append(".detail-row { display: flex; align-items: center; margin-bottom: 15px; padding: 10px; background: white; border-radius: 8px; }")
            .append(".detail-icon { font-size: 20px; margin-right: 15px; width: 30px; }")
            .append(".detail-text { font-size: 16px; color: #374151; }")
            .append(".detail-label { font-weight: 600; color: #5b21b6; }")
            .append(".instructions { background: #f8fafc; padding: 20px; border-radius: 8px; margin-top: 25px; }")
            .append(".instructions h3 { color: #7c3aed; margin-top: 0; }")
            .append(".instructions ul { margin: 10px 0; padding-left: 20px; }")
            .append(".instructions li { margin-bottom: 8px; color: #4b5563; }")
            .append(".footer { background: #f9fafb; padding: 25px; text-align: center; color: #6b7280; font-size: 14px; }")
            .append("</style>")
            .append("</head>")
            .append("<body>");

        // Contenu principal
        html.append("<div class='container'>")
            .append("<div class='header'>")
            .append("<h1>🎓 Votre soutenance</h1>")
            .append("<p>").append(student.getPrenom()).append(" ").append(student.getNom()).append("</p>")
            .append("</div>")
            .append("<div class='content'>");

        // Détails de la soutenance
        html.append("<div class='soutenance-card'>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-icon'>📅</span>")
            .append("<span class='detail-text'><span class='detail-label'>Date:</span> ")
            .append(soutenance.getDate() != null ? soutenance.getDate().toString() : "À définir")
            .append("</span>")
            .append("</div>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-icon'>🕐</span>")
            .append("<span class='detail-text'><span class='detail-label'>Heure:</span> ")
            .append(soutenance.getHeureTime() != null ? soutenance.getHeureTime().toString().substring(0, 5) : "À définir")
            .append("</span>")
            .append("</div>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-icon'>🏢</span>")
            .append("<span class='detail-text'><span class='detail-label'>Salle:</span> ")
            .append(soutenance.getSalle() != null ? soutenance.getSalle().getNumSalle() : "À définir")
            .append("</span>")
            .append("</div>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-icon'>⏱️</span>")
            .append("<span class='detail-text'><span class='detail-label'>Durée:</span> ")
            .append(soutenance.getDuree() != null ? soutenance.getDuree() : "30 minutes")
            .append("</span>")
            .append("</div>")
            .append("</div>");

        // Instructions
        html.append("<div class='instructions'>")
            .append("<h3>📋 Instructions importantes</h3>")
            .append("<ul>")
            .append("<li>Arrivez <strong>15 minutes avant</strong> l'heure prévue</li>")
            .append("<li>Préparez votre présentation et tous les documents nécessaires</li>")
            .append("<li>Vérifiez le matériel technique (ordinateur, projecteur)</li>")
            .append("<li>En cas d'empêchement, contactez immédiatement l'administration</li>")
            .append("<li>Respectez le temps imparti pour votre présentation</li>")
            .append("</ul>")
            .append("</div>");

        // Pied de page
        html.append("</div>")
            .append("<div class='footer'>")
            .append("<p>📧 Email généré automatiquement par le système ESPRIT</p>")
            .append("<p>Date: ").append(new java.text.SimpleDateFormat("dd/MM/yyyy").format(new java.util.Date()))
            .append(" | Bonne chance pour votre soutenance ! 🍀</p>")
            .append("</div>")
            .append("</div>")
            .append("</body>")
            .append("</html>");

        return html.toString();
    }

    private Set<String> getUniqueClasses(List<Planning> plannings) {
        return plannings.stream()
                       .filter(p -> p.getClasse() != null && p.getClasse().getNomClasse() != null)
                       .map(p -> p.getClasse().getNomClasse())
                       .collect(Collectors.toSet());
    }

    private Set<String> getUniqueDays(List<Planning> plannings) {
        return plannings.stream()
                       .filter(p -> p.getDateDebut() != null)
                       .map(p -> getDayFromDate(p.getDateDebut()))
                       .collect(Collectors.toSet());
    }

    private String getDayFromDate(java.sql.Date sqlDate) {
        try {
            if (sqlDate == null) {
                return "Non défini";
            }
            
            // Utiliser Calendar pour éviter les problèmes de compatibilité
            java.util.Calendar calendar = java.util.Calendar.getInstance();
            calendar.setTime(sqlDate);
            int dayOfWeek = calendar.get(java.util.Calendar.DAY_OF_WEEK);
            
            String[] days = {"Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"};
            return days[dayOfWeek - 1];
        } catch (Exception e) {
            System.err.println("Erreur lors de la conversion de date: " + e.getMessage());
            return "Non défini";
        }
    }

    private String getTimeSlotFromTime(java.sql.Time sqlTime) {
        if (sqlTime == null) {
            System.out.println("DEBUG: getTimeSlotFromTime - sqlTime est null");
            return "Non défini";
        }
        
        try {
            String time = sqlTime.toString();
            String hourMinute = time.substring(0, 5);
            System.out.println("DEBUG: getTimeSlotFromTime - Heure: " + hourMinute);
            
            if (hourMinute.compareTo("09:00") >= 0 && hourMinute.compareTo("12:15") <= 0) {
                System.out.println("DEBUG: Créneau matin détecté: 09:00-12:15");
                return "09:00-12:15";
            } else if (hourMinute.compareTo("13:30") >= 0 && hourMinute.compareTo("16:45") <= 0) {
                System.out.println("DEBUG: Créneau après-midi détecté: 13:30-16:45");
                return "13:30-16:45";
            }
            
            System.out.println("DEBUG: Aucun créneau correspondant pour: " + hourMinute);
        } catch (Exception e) {
            System.err.println("DEBUG: Erreur dans getTimeSlotFromTime: " + e.getMessage());
        }
        
        return "Autre";
    }

    private void sendHtmlEmail(String to, String subject, String htmlContent) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);
        helper.setFrom("noreply@esprit.tn");

        mailSender.send(message);
    }

    private void sendHtmlEmailWithPdf(String to, String subject, String htmlContent, byte[] pdfData, String pdfFileName) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);
        helper.setFrom("noreply@esprit.tn");
        
        // Attacher le PDF
        ByteArrayDataSource dataSource = new ByteArrayDataSource(pdfData, "application/pdf");
        helper.addAttachment(pdfFileName, dataSource);

        mailSender.send(message);
    }

    // PDF spécifique aux cours avec orientation paysage
    private byte[] generateCoursesPdf(Users teacher, List<Planning> plannings) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document document = new Document(pdfDoc, PageSize.A4.rotate()); // Orientation paysage
            
            // Fonts
            PdfFont titleFont = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
            PdfFont normalFont = PdfFontFactory.createFont(StandardFonts.HELVETICA);
            
            // Titre principal
            Paragraph title = new Paragraph("📚 Emploi du temps des cours - " + teacher.getPrenom() + " " + teacher.getNom())
                .setFont(titleFont)
                .setFontSize(20)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(25);
            document.add(title);
            
            // Date de génération
            Paragraph dateGen = new Paragraph("Généré le: " + new java.text.SimpleDateFormat("dd/MM/yyyy").format(new java.util.Date()))
                .setFont(normalFont)
                .setFontSize(10)
                .setTextAlignment(TextAlignment.RIGHT)
                .setMarginBottom(25);
            document.add(dateGen);
            
            // Statistiques améliorées
            Table statsTable = new Table(3).useAllAvailableWidth();
            statsTable.addCell(new Cell().add(new Paragraph("📚 Cours: " + plannings.size()).setFont(titleFont).setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(5, 150, 105))
                .setFontColor(com.itextpdf.kernel.colors.ColorConstants.WHITE)
                .setPadding(12));
            statsTable.addCell(new Cell().add(new Paragraph("🎯 Classes: " + getUniqueClasses(plannings).size()).setFont(titleFont).setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(5, 150, 105))
                .setFontColor(com.itextpdf.kernel.colors.ColorConstants.WHITE)
                .setPadding(12));
            statsTable.addCell(new Cell().add(new Paragraph("⏰ Heures: " + getTotalHours(plannings) + "h").setFont(titleFont).setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(5, 150, 105))
                .setFontColor(com.itextpdf.kernel.colors.ColorConstants.WHITE)
                .setPadding(12));
            document.add(statsTable);
            document.add(new Paragraph(" ").setMarginBottom(20));
            
            // Section Cours - Style grille horaire amélioré
            if (!plannings.isEmpty()) {
                
                // Créer la grille horaire comme dans planning_ens.js
                String[] weekDays = {"Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"};
                String[][] timeSlots = {{"09:00", "12:15"}, {"13:30", "16:45"}};
                
                // Tableau principal avec colonnes : Horaires + 6 jours
                Table scheduleTable = new Table(UnitValue.createPercentArray(new float[]{15, 14, 14, 14, 14, 14, 15})).useAllAvailableWidth();
                
                // En-tête avec style dégradé (simulé avec couleur unie)
                Cell headerHoraires = new Cell().add(new Paragraph("⏰ Horaires").setFont(titleFont).setFontSize(10).setTextAlignment(TextAlignment.CENTER))
                    .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(203, 9, 32))
                    .setPadding(12)
                    .setBorder(new com.itextpdf.layout.borders.SolidBorder(com.itextpdf.kernel.colors.ColorConstants.WHITE, 1));
                headerHoraires.setFontColor(com.itextpdf.kernel.colors.ColorConstants.WHITE);
                scheduleTable.addHeaderCell(headerHoraires);
                
                for (String day : weekDays) {
                    Cell headerDay = new Cell().add(new Paragraph("📅 " + day).setFont(titleFont).setFontSize(10).setTextAlignment(TextAlignment.CENTER))
                        .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(203, 9, 32))
                        .setPadding(12)
                        .setBorder(new com.itextpdf.layout.borders.SolidBorder(com.itextpdf.kernel.colors.ColorConstants.WHITE, 1));
                    headerDay.setFontColor(com.itextpdf.kernel.colors.ColorConstants.WHITE);
                    scheduleTable.addHeaderCell(headerDay);
                }
                
                // Lignes pour chaque créneau horaire
                for (int slotIndex = 0; slotIndex < timeSlots.length; slotIndex++) {
                    String[] slot = timeSlots[slotIndex];
                    
                    // Cellule horaire
                    Cell timeCell = new Cell()
                        .add(new Paragraph(slot[0]).setFont(titleFont).setFontSize(9).setTextAlignment(TextAlignment.CENTER))
                        .add(new Paragraph("-").setFont(normalFont).setFontSize(8).setTextAlignment(TextAlignment.CENTER))
                        .add(new Paragraph(slot[1]).setFont(titleFont).setFontSize(9).setTextAlignment(TextAlignment.CENTER))
                        .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(254, 242, 242))
                        .setPadding(8)
                        .setTextAlignment(TextAlignment.CENTER)
                        .setBorder(new com.itextpdf.layout.borders.SolidBorder(new com.itextpdf.kernel.colors.DeviceRgb(229, 231, 235), 1));
                    timeCell.setFontColor(new com.itextpdf.kernel.colors.DeviceRgb(203, 9, 32));
                    scheduleTable.addCell(timeCell);
                    
                    // Cellules pour chaque jour
                    for (String day : weekDays) {
                        Cell dayCell = new Cell()
                            .setPadding(4)
                            .setMinHeight(80)
                            .setBorder(new com.itextpdf.layout.borders.SolidBorder(new com.itextpdf.kernel.colors.DeviceRgb(229, 231, 235), 1))
                            .setBackgroundColor(slotIndex % 2 == 0 ? new com.itextpdf.kernel.colors.DeviceRgb(248, 249, 250) : com.itextpdf.kernel.colors.ColorConstants.WHITE);
                        
                        // Trouver les cours pour ce jour et ce créneau
                        boolean hasContent = false;
                        for (Planning planning : plannings) {
                            String planningDay = getDayFromDate(planning.getDateDebut());
                            String planningSlot = getTimeSlotFromTime(planning.getHeureDebut());
                            String expectedSlot = slot[0] + "-" + slot[1];
                            
                            if (planningDay.equals(day) && planningSlot.equals(expectedSlot)) {
                                hasContent = true;
                                
                                // Style carte de cours (inspiré du JS)
                                Paragraph courseCard = new Paragraph()
                                    .add(new com.itextpdf.layout.element.Text("🎯 " + (planning.getClasse() != null ? planning.getClasse().getNomClasse() : "Classe"))
                                        .setFont(titleFont).setFontSize(8))
                                    .add("\n")
                                    .add(new com.itextpdf.layout.element.Text("📍 " + (planning.getSalle() != null ? planning.getSalle().getNumSalle() : "Salle"))
                                        .setFont(normalFont).setFontSize(7))
                                    .add("\n")
                                    .add(new com.itextpdf.layout.element.Text("📚 " + (planning.getUser() != null && planning.getUser().getMatiere() != null ? planning.getUser().getMatiere() : "Matière"))
                                        .setFont(normalFont).setFontSize(7))
                                    .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(5, 150, 105))
                                    .setPadding(6)
                                    .setMargin(2)
                                    .setBorder(new com.itextpdf.layout.borders.SolidBorder(new com.itextpdf.kernel.colors.DeviceRgb(5, 150, 105), 2));
                                courseCard.setFontColor(com.itextpdf.kernel.colors.ColorConstants.WHITE);
                                
                                dayCell.add(courseCard);
                            }
                        }
                        
                        if (!hasContent) {
                            dayCell.add(new Paragraph("").setMargin(0));
                        }
                        
                        scheduleTable.addCell(dayCell);
                    }
                }
                
                document.add(scheduleTable);
            }
            
            // Pied de page
            Paragraph footer = new Paragraph("Document généré automatiquement par le système ESPRIT - Cours uniquement")
                .setFont(normalFont)
                .setFontSize(8)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(30);
            document.add(footer);
            
            document.close();
            return baos.toByteArray();
            
        } catch (Exception e) {
            System.err.println("Erreur lors de la génération du PDF des cours: " + e.getMessage());
            e.printStackTrace();
            return new byte[0];
        }
    }

    // PDF spécifique aux soutenances avec design amélioré
    private byte[] generateSoutenancesPdf(Users teacher, List<Soutenance> soutenances) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document document = new Document(pdfDoc, PageSize.A4.rotate()); // Orientation paysage comme les cours
            
            // Fonts
            PdfFont titleFont = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
            PdfFont normalFont = PdfFontFactory.createFont(StandardFonts.HELVETICA);
            
            // Titre principal
            Paragraph title = new Paragraph("🎓 Planning des soutenances - " + teacher.getPrenom() + " " + teacher.getNom())
                .setFont(titleFont)
                .setFontSize(20)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(25);
            document.add(title);
            
            // Date de génération
            Paragraph dateGen = new Paragraph("Généré le: " + new java.text.SimpleDateFormat("dd/MM/yyyy").format(new java.util.Date()))
                .setFont(normalFont)
                .setFontSize(10)
                .setTextAlignment(TextAlignment.RIGHT)
                .setMarginBottom(25);
            document.add(dateGen);
            
            // Statistiques des soutenances avec même style que les cours
            Table statsTable = new Table(3).useAllAvailableWidth();
            statsTable.addCell(new Cell().add(new Paragraph("🎓 Soutenances: " + soutenances.size()).setFont(titleFont).setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(5, 150, 105))
                .setFontColor(com.itextpdf.kernel.colors.ColorConstants.WHITE)
                .setPadding(12));
            statsTable.addCell(new Cell().add(new Paragraph("📅 Jours: " + getUniqueSoutenanceDays(soutenances).size()).setFont(titleFont).setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(5, 150, 105))
                .setFontColor(com.itextpdf.kernel.colors.ColorConstants.WHITE)
                .setPadding(12));
            statsTable.addCell(new Cell().add(new Paragraph("⏰ Heures: " + getTotalSoutenanceHours(soutenances) + "h").setFont(titleFont).setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(5, 150, 105))
                .setFontColor(com.itextpdf.kernel.colors.ColorConstants.WHITE)
                .setPadding(12));
            document.add(statsTable);
            document.add(new Paragraph(" ").setMarginBottom(20));
            
            // Grille horaire des soutenances - même style que les cours
            if (!soutenances.isEmpty()) {
                
                // Créer la grille horaire identique aux cours
                String[] weekDays = {"Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"};
                String[][] timeSlots = {{"09:00", "12:15"}, {"13:30", "16:45"}};
                
                // Tableau principal avec colonnes : Horaires + 6 jours
                Table scheduleTable = new Table(UnitValue.createPercentArray(new float[]{15, 14, 14, 14, 14, 14, 15})).useAllAvailableWidth();
                
                // En-tête avec style identique aux cours
                Cell headerHoraires = new Cell().add(new Paragraph("⏰ Horaires").setFont(titleFont).setFontSize(10).setTextAlignment(TextAlignment.CENTER))
                    .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(203, 9, 32))
                    .setPadding(12)
                    .setBorder(new com.itextpdf.layout.borders.SolidBorder(com.itextpdf.kernel.colors.ColorConstants.WHITE, 1));
                headerHoraires.setFontColor(com.itextpdf.kernel.colors.ColorConstants.WHITE);
                scheduleTable.addHeaderCell(headerHoraires);
                
                for (String day : weekDays) {
                    Cell headerDay = new Cell().add(new Paragraph("📅 " + day).setFont(titleFont).setFontSize(10).setTextAlignment(TextAlignment.CENTER))
                        .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(203, 9, 32))
                        .setPadding(12)
                        .setBorder(new com.itextpdf.layout.borders.SolidBorder(com.itextpdf.kernel.colors.ColorConstants.WHITE, 1));
                    headerDay.setFontColor(com.itextpdf.kernel.colors.ColorConstants.WHITE);
                    scheduleTable.addHeaderCell(headerDay);
                }
                
                // Lignes pour chaque créneau horaire
                for (int slotIndex = 0; slotIndex < timeSlots.length; slotIndex++) {
                    String[] slot = timeSlots[slotIndex];
                    
                    // Cellule horaire
                    Cell timeCell = new Cell()
                        .add(new Paragraph(slot[0]).setFont(titleFont).setFontSize(9).setTextAlignment(TextAlignment.CENTER))
                        .add(new Paragraph("-").setFont(normalFont).setFontSize(8).setTextAlignment(TextAlignment.CENTER))
                        .add(new Paragraph(slot[1]).setFont(titleFont).setFontSize(9).setTextAlignment(TextAlignment.CENTER))
                        .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(254, 242, 242))
                        .setPadding(8)
                        .setTextAlignment(TextAlignment.CENTER)
                        .setBorder(new com.itextpdf.layout.borders.SolidBorder(new com.itextpdf.kernel.colors.DeviceRgb(229, 231, 235), 1));
                    timeCell.setFontColor(new com.itextpdf.kernel.colors.DeviceRgb(203, 9, 32));
                    scheduleTable.addCell(timeCell);
                    
                    // Cellules pour chaque jour
                    for (String day : weekDays) {
                        Cell dayCell = new Cell()
                            .setPadding(4)
                            .setMinHeight(80)
                            .setBorder(new com.itextpdf.layout.borders.SolidBorder(new com.itextpdf.kernel.colors.DeviceRgb(229, 231, 235), 1))
                            .setBackgroundColor(slotIndex % 2 == 0 ? new com.itextpdf.kernel.colors.DeviceRgb(248, 249, 250) : com.itextpdf.kernel.colors.ColorConstants.WHITE);
                        
                        // Trouver les soutenances pour ce jour et ce créneau
                        boolean hasContent = false;
                        for (Soutenance soutenance : soutenances) {
                            String soutenanceDay = soutenance.getJour() != null ? soutenance.getJour() : "Non défini";
                            String soutenanceSlot = getSoutenanceTimeSlot(soutenance.getHeureTime());
                            String expectedSlot = slot[0] + "-" + slot[1];
                            
                            if (soutenanceDay.equals(day) && soutenanceSlot.equals(expectedSlot)) {
                                hasContent = true;
                                
                                // Style carte de soutenance (inspiré du style cours mais avec couleur différente)
                                Paragraph soutenanceCard = new Paragraph()
                                    .add(new com.itextpdf.layout.element.Text("🎓 " + (soutenance.getUser() != null ? 
                                        soutenance.getUser().getPrenom() + " " + soutenance.getUser().getNom() : "Étudiant"))
                                        .setFont(titleFont).setFontSize(8))
                                    .add("\n")
                                    .add(new com.itextpdf.layout.element.Text("📍 " + (soutenance.getSalle() != null ? soutenance.getSalle().getNumSalle() : "Salle"))
                                        .setFont(normalFont).setFontSize(7))
                                    .add("\n")
                                    .add(new com.itextpdf.layout.element.Text("⏱️ " + (soutenance.getDuree() != null ? soutenance.getDuree() : "30min"))
                                        .setFont(normalFont).setFontSize(7))
                                    .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(124, 58, 237))
                                    .setPadding(6)
                                    .setMargin(2)
                                    .setBorder(new com.itextpdf.layout.borders.SolidBorder(new com.itextpdf.kernel.colors.DeviceRgb(124, 58, 237), 2));
                                soutenanceCard.setFontColor(com.itextpdf.kernel.colors.ColorConstants.WHITE);
                                
                                dayCell.add(soutenanceCard);
                            }
                        }
                        
                        if (!hasContent) {
                            dayCell.add(new Paragraph("").setMargin(0));
                        }
                        
                        scheduleTable.addCell(dayCell);
                    }
                }
                
                document.add(scheduleTable);
            }
            
            // Pied de page
            Paragraph footer = new Paragraph("Document généré automatiquement par le système ESPRIT - Soutenances uniquement")
                .setFont(normalFont)
                .setFontSize(8)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(30);
            document.add(footer);
            
            document.close();
            return baos.toByteArray();
            
        } catch (Exception e) {
            System.err.println("Erreur lors de la génération du PDF des soutenances: " + e.getMessage());
            e.printStackTrace();
            return new byte[0];
        }
    }

    private byte[] generateSchedulePdf(Users teacher, List<Planning> plannings, List<Soutenance> soutenances) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document document = new Document(pdfDoc);
            
            // Fonts
            PdfFont titleFont = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
            PdfFont normalFont = PdfFontFactory.createFont(StandardFonts.HELVETICA);
            
            // Titre principal
            Paragraph title = new Paragraph("Emploi du temps - " + teacher.getPrenom() + " " + teacher.getNom())
                .setFont(titleFont)
                .setFontSize(18)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(20);
            document.add(title);
            
            // Date de génération
            Paragraph dateGen = new Paragraph("Généré le: " + new java.text.SimpleDateFormat("dd/MM/yyyy").format(new java.util.Date()))
                .setFont(normalFont)
                .setFontSize(10)
                .setTextAlignment(TextAlignment.RIGHT)
                .setMarginBottom(20);
            document.add(dateGen);
            
            // Statistiques
            Table statsTable = new Table(3).useAllAvailableWidth();
            statsTable.addCell(new Cell().add(new Paragraph("Cours: " + plannings.size()).setFont(normalFont).setTextAlignment(TextAlignment.CENTER)).setBackgroundColor(ColorConstants.LIGHT_GRAY));
            statsTable.addCell(new Cell().add(new Paragraph("Soutenances: " + soutenances.size()).setFont(normalFont).setTextAlignment(TextAlignment.CENTER)).setBackgroundColor(ColorConstants.LIGHT_GRAY));
            statsTable.addCell(new Cell().add(new Paragraph("Classes: " + getUniqueClasses(plannings).size()).setFont(normalFont).setTextAlignment(TextAlignment.CENTER)).setBackgroundColor(ColorConstants.LIGHT_GRAY));
            document.add(statsTable);
            document.add(new Paragraph(" "));
            
            // Section Cours - Style grille horaire
            if (!plannings.isEmpty()) {
                Paragraph coursTitle = new Paragraph("📚 Emploi du Temps - Mes Cours")
                    .setFont(titleFont)
                    .setFontSize(16)
                    .setMarginBottom(15);
                document.add(coursTitle);
                
                // Créer la grille horaire comme dans planning_ens.js
                String[] weekDays = {"Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"};
                String[][] timeSlots = {{"09:00", "12:15"}, {"13:30", "16:45"}};
                
                // Tableau principal avec colonnes : Horaires + 6 jours
                Table scheduleTable = new Table(UnitValue.createPercentArray(new float[]{15, 14, 14, 14, 14, 14, 15})).useAllAvailableWidth();
                
                // En-tête avec style dégradé (simulé avec couleur unie)
                Cell headerHoraires = new Cell().add(new Paragraph("⏰ Horaires").setFont(titleFont).setFontSize(10).setTextAlignment(TextAlignment.CENTER))
                    .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(203, 9, 32))
                    .setPadding(12)
                    .setBorder(new com.itextpdf.layout.borders.SolidBorder(com.itextpdf.kernel.colors.ColorConstants.WHITE, 1));
                headerHoraires.setFontColor(com.itextpdf.kernel.colors.ColorConstants.WHITE);
                scheduleTable.addHeaderCell(headerHoraires);
                
                for (String day : weekDays) {
                    Cell headerDay = new Cell().add(new Paragraph("📅 " + day).setFont(titleFont).setFontSize(10).setTextAlignment(TextAlignment.CENTER))
                        .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(203, 9, 32))
                        .setPadding(12)
                        .setBorder(new com.itextpdf.layout.borders.SolidBorder(com.itextpdf.kernel.colors.ColorConstants.WHITE, 1));
                    headerDay.setFontColor(com.itextpdf.kernel.colors.ColorConstants.WHITE);
                    scheduleTable.addHeaderCell(headerDay);
                }
                
                // Lignes pour chaque créneau horaire
                for (int slotIndex = 0; slotIndex < timeSlots.length; slotIndex++) {
                    String[] slot = timeSlots[slotIndex];
                    
                    // Cellule horaire
                    Cell timeCell = new Cell()
                        .add(new Paragraph(slot[0]).setFont(titleFont).setFontSize(9).setTextAlignment(TextAlignment.CENTER))
                        .add(new Paragraph("-").setFont(normalFont).setFontSize(8).setTextAlignment(TextAlignment.CENTER))
                        .add(new Paragraph(slot[1]).setFont(titleFont).setFontSize(9).setTextAlignment(TextAlignment.CENTER))
                        .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(254, 242, 242))
                        .setPadding(8)
                        .setTextAlignment(TextAlignment.CENTER)
                        .setBorder(new com.itextpdf.layout.borders.SolidBorder(new com.itextpdf.kernel.colors.DeviceRgb(229, 231, 235), 1));
                    timeCell.setFontColor(new com.itextpdf.kernel.colors.DeviceRgb(203, 9, 32));
                    scheduleTable.addCell(timeCell);
                    
                    // Cellules pour chaque jour
                    for (String day : weekDays) {
                        Cell dayCell = new Cell()
                            .setPadding(4)
                            .setMinHeight(80)
                            .setBorder(new com.itextpdf.layout.borders.SolidBorder(new com.itextpdf.kernel.colors.DeviceRgb(229, 231, 235), 1))
                            .setBackgroundColor(slotIndex % 2 == 0 ? new com.itextpdf.kernel.colors.DeviceRgb(248, 249, 250) : com.itextpdf.kernel.colors.ColorConstants.WHITE);
                        
                        // Trouver les cours pour ce jour et ce créneau
                        boolean hasContent = false;
                        for (Planning planning : plannings) {
                            String planningDay = getDayFromDate(planning.getDateDebut());
                            String planningSlot = getTimeSlotFromTime(planning.getHeureDebut());
                            String expectedSlot = slot[0] + "-" + slot[1];
                            
                            if (planningDay.equals(day) && planningSlot.equals(expectedSlot)) {
                                hasContent = true;
                                
                                // Style carte de cours (inspiré du JS)
                                Paragraph courseCard = new Paragraph()
                                    .add(new com.itextpdf.layout.element.Text("🎯 " + (planning.getClasse() != null ? planning.getClasse().getNomClasse() : "Classe"))
                                        .setFont(titleFont).setFontSize(8))
                                    .add("\n")
                                    .add(new com.itextpdf.layout.element.Text("📍 " + (planning.getSalle() != null ? planning.getSalle().getNumSalle() : "Salle"))
                                        .setFont(normalFont).setFontSize(7))
                                    .add("\n")
                                    .add(new com.itextpdf.layout.element.Text("📚 " + (planning.getUser() != null && planning.getUser().getMatiere() != null ? planning.getUser().getMatiere() : "Matière"))
                                        .setFont(normalFont).setFontSize(7))
                                    .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(5, 150, 105))
                                    .setPadding(6)
                                    .setMargin(2)
                                    .setBorder(new com.itextpdf.layout.borders.SolidBorder(new com.itextpdf.kernel.colors.DeviceRgb(5, 150, 105), 2));
                                courseCard.setFontColor(com.itextpdf.kernel.colors.ColorConstants.WHITE);
                                
                                dayCell.add(courseCard);
                            }
                        }
                        
                        if (!hasContent) {
                            dayCell.add(new Paragraph("").setMargin(0));
                        }
                        
                        scheduleTable.addCell(dayCell);
                    }
                }
                
                document.add(scheduleTable);
                document.add(new Paragraph(" "));
            }
            
            // Section Soutenances
            if (!soutenances.isEmpty()) {
                Paragraph soutenanceTitle = new Paragraph("🎓 Mes Soutenances")
                    .setFont(titleFont)
                    .setFontSize(14)
                    .setMarginBottom(10);
                document.add(soutenanceTitle);
                
                // Tableau des soutenances
                Table soutenanceTable = new Table(UnitValue.createPercentArray(new float[]{20, 15, 25, 15, 15, 10})).useAllAvailableWidth();
                
                // En-têtes
                soutenanceTable.addHeaderCell(new Cell().add(new Paragraph("Jour").setFont(titleFont)).setBackgroundColor(ColorConstants.GRAY));
                soutenanceTable.addHeaderCell(new Cell().add(new Paragraph("Heure").setFont(titleFont)).setBackgroundColor(ColorConstants.GRAY));
                soutenanceTable.addHeaderCell(new Cell().add(new Paragraph("Étudiant").setFont(titleFont)).setBackgroundColor(ColorConstants.GRAY));
                soutenanceTable.addHeaderCell(new Cell().add(new Paragraph("Salle").setFont(titleFont)).setBackgroundColor(ColorConstants.GRAY));
                soutenanceTable.addHeaderCell(new Cell().add(new Paragraph("Type").setFont(titleFont)).setBackgroundColor(ColorConstants.GRAY));
                soutenanceTable.addHeaderCell(new Cell().add(new Paragraph("Durée").setFont(titleFont)).setBackgroundColor(ColorConstants.GRAY));
                
                // Données
                for (Soutenance soutenance : soutenances) {
                    soutenanceTable.addCell(new Cell().add(new Paragraph(soutenance.getJour() != null ? soutenance.getJour() : "N/A").setFont(normalFont)));
                    soutenanceTable.addCell(new Cell().add(new Paragraph(soutenance.getHeureTime() != null ? soutenance.getHeureTime().toString() : "N/A").setFont(normalFont)));
                    soutenanceTable.addCell(new Cell().add(new Paragraph(soutenance.getUser() != null ? soutenance.getUser().getPrenom() + " " + soutenance.getUser().getNom() : "N/A").setFont(normalFont)));
                    soutenanceTable.addCell(new Cell().add(new Paragraph(soutenance.getSalle() != null ? soutenance.getSalle().getNumSalle() : "N/A").setFont(normalFont)));
                    soutenanceTable.addCell(new Cell().add(new Paragraph("Soutenance").setFont(normalFont)));
                    soutenanceTable.addCell(new Cell().add(new Paragraph(soutenance.getDuree() != null ? soutenance.getDuree() : "30min").setFont(normalFont)));
                }
                
                document.add(soutenanceTable);
            }
            
            // Pied de page
            Paragraph footer = new Paragraph("Document généré automatiquement par le système ESPRIT")
                .setFont(normalFont)
                .setFontSize(8)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(30);
            document.add(footer);
            
            document.close();
            return baos.toByteArray();
            
        } catch (Exception e) {
            System.err.println("Erreur lors de la génération du PDF: " + e.getMessage());
            e.printStackTrace();
            return new byte[0];
        }
    }

    /**
     * Synchronise les cours avec Microsoft Calendar
     */
    public void syncCoursesToMicrosoftCalendar(Users teacher, List<Planning> plannings) {
        try {
            System.out.println("DEBUG: Début synchronisation Microsoft Calendar pour les cours de " + teacher.getEmail());
            
            for (Planning planning : plannings) {
                try {
                    String eventId = microsoftCalendarService.createCalendarEvent(planning, teacher.getEmail());
                    System.out.println("DEBUG: Événement cours créé avec ID: " + eventId + " pour " + planning.getTypePlanning());
                } catch (Exception e) {
                    System.err.println("ERREUR: Impossible de créer l'événement cours pour " + planning.getTypePlanning() + ": " + e.getMessage());
                    // Continue avec les autres cours même si un échoue
                }
            }
            
            System.out.println("DEBUG: Synchronisation Microsoft Calendar terminée pour " + plannings.size() + " cours");
            
        } catch (Exception e) {
            System.err.println("ERREUR: Échec de la synchronisation Microsoft Calendar pour les cours: " + e.getMessage());
            // Ne pas faire échouer l'envoi d'email si la synchronisation échoue
        }
    }

    /**
     * Synchronise les soutenances avec Microsoft Calendar
     */
    private void syncSoutenancesToMicrosoftCalendar(Users teacher, List<Soutenance> soutenances) {
        try {
            System.out.println("DEBUG: Début synchronisation Microsoft Calendar pour les soutenances de " + teacher.getEmail());
            
            for (Soutenance soutenance : soutenances) {
                try {
                    String eventId = microsoftCalendarService.createSoutenanceEvent(soutenance, teacher.getEmail());
                    System.out.println("DEBUG: Événement soutenance créé avec ID: " + eventId + " pour " + 
                        (soutenance.getUser() != null ? soutenance.getUser().getNom() : "Étudiant"));
                } catch (Exception e) {
                    System.err.println("ERREUR: Impossible de créer l'événement soutenance: " + e.getMessage());
                    // Continue avec les autres soutenances même si une échoue
                }
            }
            
            System.out.println("DEBUG: Synchronisation Microsoft Calendar terminée pour " + soutenances.size() + " soutenances");
            
        } catch (Exception e) {
            System.err.println("ERREUR: Échec de la synchronisation Microsoft Calendar pour les soutenances: " + e.getMessage());
            // Ne pas faire échouer l'envoi d'email si la synchronisation échoue
        }
    }

    /**
     * Synchronise un planning complet (cours + soutenances) avec Microsoft Calendar
     */
    public void syncFullPlanningToMicrosoftCalendar(Users teacher) {
        try {
            System.out.println("DEBUG: Synchronisation complète Microsoft Calendar pour " + teacher.getEmail());
            
            // Récupérer les cours de l'enseignant
            List<Planning> plannings = planningRepository.findByUserId(teacher.getIdUser());
            if (!plannings.isEmpty()) {
                syncCoursesToMicrosoftCalendar(teacher, plannings);
            }
            
            // Récupérer les soutenances de l'enseignant
            List<Soutenance> soutenances = soutenanceRepository.findValidatedSoutenancesByJuryMember(teacher.getIdUser());
            if (!soutenances.isEmpty()) {
                syncSoutenancesToMicrosoftCalendar(teacher, soutenances);
            }
            
            System.out.println("DEBUG: Synchronisation complète terminée pour " + teacher.getEmail());
            
        } catch (Exception e) {
            System.err.println("ERREUR: Échec de la synchronisation complète Microsoft Calendar: " + e.getMessage());
        }
    }

    /**
     * Synchronise l'emploi du temps d'une classe avec Microsoft Calendar pour un étudiant
     */
    private void syncStudentClassScheduleToMicrosoftCalendar(Users student, List<Planning> classPlannings) {
        try {
            System.out.println("DEBUG: Début synchronisation Microsoft Calendar pour l'étudiant " + student.getEmail());
            
            for (Planning planning : classPlannings) {
                try {
                    // Créer un événement de cours pour l'étudiant
                    String eventId = microsoftCalendarService.createCalendarEvent(planning, student.getEmail());
                    System.out.println("DEBUG: Événement cours créé pour étudiant avec ID: " + eventId + 
                        " - Classe: " + (planning.getClasse() != null ? planning.getClasse().getNomClasse() : "N/A"));
                } catch (Exception e) {
                    System.err.println("ERREUR: Impossible de créer l'événement cours pour l'étudiant " + 
                        student.getEmail() + ": " + e.getMessage());
                    // Continue avec les autres cours même si un échoue
                }
            }
            
            System.out.println("DEBUG: Synchronisation Microsoft Calendar terminée pour l'étudiant " + 
                student.getEmail() + " (" + classPlannings.size() + " cours)");
            
        } catch (Exception e) {
            System.err.println("ERREUR: Échec de la synchronisation Microsoft Calendar pour l'étudiant " + 
                student.getEmail() + ": " + e.getMessage());
            // Ne pas faire échouer l'envoi d'email si la synchronisation échoue
        }
    }

    /**
     * Synchronise une soutenance avec Microsoft Calendar pour un étudiant
     */
    public void syncStudentSoutenanceToMicrosoftCalendar(Users student, Soutenance soutenance) {
        try {
            System.out.println("DEBUG: Début synchronisation soutenance Microsoft Calendar pour l'étudiant " + student.getEmail());
            
            String eventId = microsoftCalendarService.createSoutenanceEvent(soutenance, student.getEmail());
            System.out.println("DEBUG: Événement soutenance créé pour étudiant avec ID: " + eventId + 
                " - Étudiant: " + student.getNom() + " " + student.getPrenom());
            
        } catch (Exception e) {
            System.err.println("ERREUR: Impossible de créer l'événement soutenance pour l'étudiant " + 
                student.getEmail() + ": " + e.getMessage());
            // Ne pas faire échouer l'envoi d'email si la synchronisation échoue
        }
    }

    /**
     * Synchronise tous les événements d'un étudiant (cours de sa classe + sa soutenance)
     */
    public void syncFullStudentScheduleToMicrosoftCalendar(Users student) {
        try {
            System.out.println("DEBUG: Synchronisation complète Microsoft Calendar pour l'étudiant " + student.getEmail());
            
            // Récupérer la classe de l'étudiant via la table Affectation
            List<com.sys_res.esp.entity.Affectation> affectations = affectationRepository.findByUserId(student.getIdUser());
            
            for (com.sys_res.esp.entity.Affectation affectation : affectations) {
                if (affectation.getClasse() != null) {
                    // Récupérer les cours de la classe
                    List<Planning> classPlannings = planningRepository.findByClasseId(affectation.getClasse().getIdClasse());
                    if (!classPlannings.isEmpty()) {
                        syncStudentClassScheduleToMicrosoftCalendar(student, classPlannings);
                    }
                }
            }
            
            // Récupérer la soutenance de l'étudiant s'il en a une
            List<Soutenance> studentSoutenances = soutenanceRepository.findByEtudiantId(student.getIdUser());
            for (Soutenance soutenance : studentSoutenances) {
                syncStudentSoutenanceToMicrosoftCalendar(student, soutenance);
            }
            
            System.out.println("DEBUG: Synchronisation complète terminée pour l'étudiant " + student.getEmail());
            
        } catch (Exception e) {
            System.err.println("ERREUR: Échec de la synchronisation complète Microsoft Calendar pour l'étudiant " + 
                student.getEmail() + ": " + e.getMessage());
        }
    }

    /**
     * Envoyer un email de confirmation à l'enseignant lors de l'approbation d'une demande de rattrapage
     */
    public void sendRattrapageApprovalEmailToTeacher(com.sys_res.esp.entity.Rattrapage rattrapage) {
        try {
            // Récupérer l'enseignant
            Users teacher = usersRepository.findById(rattrapage.getIdEnseignant())
                .orElseThrow(() -> new RuntimeException("Enseignant non trouvé avec l'ID: " + rattrapage.getIdEnseignant()));
            
            System.out.println("DEBUG: Envoi email de confirmation rattrapage à l'enseignant: " + teacher.getEmail());
            
            // Générer le contenu HTML
            String htmlContent = generateRattrapageApprovalEmailContent(teacher, rattrapage);
            
            // Envoyer l'email
            String subject = "✅ Demande de rattrapage approuvée - ESPRIT";
            sendHtmlEmail(teacher.getEmail(), subject, htmlContent);
            
            System.out.println("DEBUG: Email de confirmation rattrapage envoyé à l'enseignant " + teacher.getEmail());
            
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi de l'email de confirmation rattrapage à l'enseignant: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Envoyer un email aux étudiants pour les informer du rattrapage de leur séance
     */
    public void sendRattrapageNotificationToStudents(com.sys_res.esp.entity.Rattrapage rattrapage) {
        try {
            System.out.println("DEBUG: Début envoi emails rattrapage aux étudiants");
            
            // Récupérer l'enseignant pour les informations
            Users teacher = usersRepository.findById(rattrapage.getIdEnseignant())
                .orElseThrow(() -> new RuntimeException("Enseignant non trouvé avec l'ID: " + rattrapage.getIdEnseignant()));
            
            // Récupérer les étudiants de la classe concernée
            List<Users> students = usersRepository.findStudentsByClassName(rattrapage.getClasse());
            System.out.println("DEBUG: Nombre d'étudiants trouvés pour la classe " + rattrapage.getClasse() + ": " + students.size());
            
            // Si aucun étudiant trouvé avec la méthode principale, essayer avec les variantes
            if (students.isEmpty()) {
                System.out.println("DEBUG: Aucun étudiant trouvé avec 'ETUDIANT', essai avec toutes les variantes...");
                students = usersRepository.findStudentsByClassNameAllVariants(rattrapage.getClasse());
                System.out.println("DEBUG: Nombre d'étudiants trouvés avec variantes pour la classe " + rattrapage.getClasse() + ": " + students.size());
            }
            
            // Si toujours aucun étudiant trouvé, essayer via la table Affectation
            if (students.isEmpty()) {
                System.out.println("DEBUG: Aucun étudiant trouvé avec classe directe, essai via table Affectation...");
                students = usersRepository.findStudentsByClassNameViaAffectation(rattrapage.getClasse());
                System.out.println("DEBUG: Nombre d'étudiants trouvés via Affectation pour la classe " + rattrapage.getClasse() + ": " + students.size());
            }
            
            for (Users student : students) {
                try {
                    System.out.println("DEBUG: Envoi email rattrapage à l'étudiant: " + student.getEmail());
                    
                    // Générer le contenu HTML pour l'étudiant
                    String htmlContent = generateRattrapageNotificationEmailContent(student, teacher, rattrapage);
                    
                    // Envoyer l'email
                    String subject = "📅 Information rattrapage - " + rattrapage.getMatiere() + " - ESPRIT";
                    sendHtmlEmail(student.getEmail(), subject, htmlContent);
                    
                    System.out.println("DEBUG: Email rattrapage envoyé à l'étudiant " + student.getEmail());
                    
                } catch (Exception e) {
                    System.err.println("Erreur lors de l'envoi de l'email rattrapage à l'étudiant " + student.getEmail() + ": " + e.getMessage());
                    // Continue avec les autres étudiants même si un échoue
                }
            }
            
            System.out.println("DEBUG: Emails de rattrapage envoyés à " + students.size() + " étudiants");
            
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi des emails de rattrapage aux étudiants: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Générer le contenu HTML de l'email de confirmation pour l'enseignant
     */
    private String generateRattrapageApprovalEmailContent(Users teacher, com.sys_res.esp.entity.Rattrapage rattrapage) {
        StringBuilder html = new StringBuilder();
        
        // En-tête HTML
        html.append("<!DOCTYPE html>")
            .append("<html lang='fr'>")
            .append("<head>")
            .append("<meta charset='UTF-8'>")
            .append("<meta name='viewport' content='width=device-width, initial-scale=1.0'>")
            .append("<title>Demande de rattrapage approuvée - ESPRIT</title>")
            .append("<style>")
            .append("body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f0f9ff; }")
            .append(".container { max-width: 700px; margin: 0 auto; background: white; border-radius: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); overflow: hidden; }")
            .append(".header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 35px; text-align: center; }")
            .append(".header h1 { margin: 0; font-size: 28px; font-weight: 700; }")
            .append(".header p { margin: 15px 0 0 0; font-size: 16px; opacity: 0.95; }")
            .append(".content { padding: 35px; }")
            .append(".approval-badge { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border: 2px solid #10b981; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px; }")
            .append(".approval-badge h2 { color: #059669; margin: 0; font-size: 24px; }")
            .append(".approval-badge p { color: #047857; margin: 10px 0 0 0; font-size: 16px; }")
            .append(".details-section { background: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 25px; }")
            .append(".section-title { color: #059669; font-size: 18px; font-weight: 600; margin-bottom: 15px; border-bottom: 2px solid #10b981; padding-bottom: 8px; }")
            .append(".detail-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }")
            .append(".detail-row:last-child { border-bottom: none; }")
            .append(".detail-label { font-weight: 600; color: #374151; }")
            .append(".detail-value { color: #6b7280; text-align: right; }")
            .append(".highlight { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }")
            .append(".highlight strong { color: #92400e; }")
            .append(".footer { background: #f9fafb; padding: 25px; text-align: center; color: #6b7280; font-size: 14px; }")
            .append("</style>")
            .append("</head>")
            .append("<body>");

        // Contenu principal
        html.append("<div class='container'>")
            .append("<div class='header'>")
            .append("<h1>✅ Demande Approuvée</h1>")
            .append("<p>Cher(e) ").append(teacher.getPrenom()).append(" ").append(teacher.getNom()).append("</p>")
            .append("</div>")
            .append("<div class='content'>");

        // Badge d'approbation
        html.append("<div class='approval-badge'>")
            .append("<h2>🎉 Votre demande de rattrapage a été approuvée !</h2>")
            .append("<p>L'administration a validé votre demande. Le rattrapage est maintenant programmé.</p>")
            .append("</div>");

        // Détails de la séance manquée
        html.append("<div class='details-section'>")
            .append("<h3 class='section-title'>📋 Séance manquée</h3>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-label'>Date d'absence :</span>")
            .append("<span class='detail-value'>").append(formatDate(rattrapage.getDateAbsence())).append("</span>")
            .append("</div>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-label'>Horaire :</span>")
            .append("<span class='detail-value'>").append(rattrapage.getHeureDebutAbsence()).append(" - ").append(rattrapage.getHeureFinAbsence()).append("</span>")
            .append("</div>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-label'>Classe :</span>")
            .append("<span class='detail-value'>").append(rattrapage.getClasse()).append("</span>")
            .append("</div>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-label'>Matière :</span>")
            .append("<span class='detail-value'>").append(rattrapage.getMatiere()).append("</span>")
            .append("</div>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-label'>Motif :</span>")
            .append("<span class='detail-value'>").append(rattrapage.getMotif()).append("</span>")
            .append("</div>")
            .append("</div>");

        // Détails du rattrapage programmé
        html.append("<div class='details-section'>")
            .append("<h3 class='section-title'>🔄 Rattrapage programmé</h3>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-label'>Nouvelle date :</span>")
            .append("<span class='detail-value'><strong>").append(formatDate(rattrapage.getDateRattrapageProposee())).append("</strong></span>")
            .append("</div>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-label'>Nouvel horaire :</span>")
            .append("<span class='detail-value'><strong>").append(rattrapage.getHeureDebutRattrapage()).append(" - ").append(rattrapage.getHeureFinRattrapage()).append("</strong></span>")
            .append("</div>");
        
        if (rattrapage.getSallePreferee() != null && !rattrapage.getSallePreferee().isEmpty()) {
            html.append("<div class='detail-row'>")
                .append("<span class='detail-label'>Salle :</span>")
                .append("<span class='detail-value'>").append(rattrapage.getSallePreferee()).append("</span>")
                .append("</div>");
        }
        
        html.append("</div>");

        // Message important
        html.append("<div class='highlight'>")
            .append("<strong>📢 Important :</strong> Les étudiants de la classe ").append(rattrapage.getClasse())
            .append(" ont été automatiquement informés du rattrapage par email. ")
            .append("Le rattrapage a été ajouté à votre emploi du temps.")
            .append("</div>");

        // Pied de page
        html.append("</div>")
            .append("<div class='footer'>")
            .append("<p>📧 Email généré automatiquement par le système ESPRIT</p>")
            .append("<p>Date: ").append(new java.text.SimpleDateFormat("dd/MM/yyyy à HH:mm").format(new java.util.Date()))
            .append("</p>")
            .append("</div>")
            .append("</div>")
            .append("</body>")
            .append("</html>");

        return html.toString();
    }

    /**
     * Générer le contenu HTML de l'email de notification pour les étudiants
     */
    private String generateRattrapageNotificationEmailContent(Users student, Users teacher, com.sys_res.esp.entity.Rattrapage rattrapage) {
        StringBuilder html = new StringBuilder();
        
        // En-tête HTML
        html.append("<!DOCTYPE html>")
            .append("<html lang='fr'>")
            .append("<head>")
            .append("<meta charset='UTF-8'>")
            .append("<meta name='viewport' content='width=device-width, initial-scale=1.0'>")
            .append("<title>Information rattrapage - ESPRIT</title>")
            .append("<style>")
            .append("body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #fef7ff; }")
            .append(".container { max-width: 700px; margin: 0 auto; background: white; border-radius: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); overflow: hidden; }")
            .append(".header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 35px; text-align: center; }")
            .append(".header h1 { margin: 0; font-size: 28px; font-weight: 700; }")
            .append(".header p { margin: 15px 0 0 0; font-size: 16px; opacity: 0.95; }")
            .append(".content { padding: 35px; }")
            .append(".info-badge { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px; }")
            .append(".info-badge h2 { color: #1d4ed8; margin: 0; font-size: 24px; }")
            .append(".info-badge p { color: #1e40af; margin: 10px 0 0 0; font-size: 16px; }")
            .append(".details-section { background: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 25px; }")
            .append(".section-title { color: #1d4ed8; font-size: 18px; font-weight: 600; margin-bottom: 15px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }")
            .append(".detail-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }")
            .append(".detail-row:last-child { border-bottom: none; }")
            .append(".detail-label { font-weight: 600; color: #374151; }")
            .append(".detail-value { color: #6b7280; text-align: right; }")
            .append(".highlight { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }")
            .append(".highlight strong { color: #92400e; }")
            .append(".footer { background: #f9fafb; padding: 25px; text-align: center; color: #6b7280; font-size: 14px; }")
            .append("</style>")
            .append("</head>")
            .append("<body>");

        // Contenu principal
        html.append("<div class='container'>")
            .append("<div class='header'>")
            .append("<h1>📅 Rattrapage Programmé</h1>")
            .append("<p>Cher(e) ").append(student.getPrenom()).append(" ").append(student.getNom()).append("</p>")
            .append("</div>")
            .append("<div class='content'>");

        // Badge d'information
        html.append("<div class='info-badge'>")
            .append("<h2>📢 Votre cours sera rattrapé</h2>")
            .append("<p>Un rattrapage a été programmé pour votre classe ").append(rattrapage.getClasse()).append("</p>")
            .append("</div>");

        // Détails du cours original
        html.append("<div class='details-section'>")
            .append("<h3 class='section-title'>📋 Cours manqué</h3>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-label'>Date manquée :</span>")
            .append("<span class='detail-value'>").append(formatDate(rattrapage.getDateAbsence())).append("</span>")
            .append("</div>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-label'>Horaire manqué :</span>")
            .append("<span class='detail-value'>").append(rattrapage.getHeureDebutAbsence()).append(" - ").append(rattrapage.getHeureFinAbsence()).append("</span>")
            .append("</div>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-label'>Matière :</span>")
            .append("<span class='detail-value'>").append(teacher.getMatiere() != null ? teacher.getMatiere() : rattrapage.getMatiere()).append("</span>")
            .append("</div>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-label'>Enseignant :</span>")
            .append("<span class='detail-value'>").append(teacher.getPrenom()).append(" ").append(teacher.getNom()).append("</span>")
            .append("</div>")
            .append("</div>");

        // Détails du rattrapage
        html.append("<div class='details-section'>")
            .append("<h3 class='section-title'>🔄 Nouveau rendez-vous</h3>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-label'>Date du rattrapage :</span>")
            .append("<span class='detail-value'><strong>").append(formatDate(rattrapage.getDateRattrapageProposee())).append("</strong></span>")
            .append("</div>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-label'>Horaire du rattrapage :</span>")
            .append("<span class='detail-value'><strong>").append(rattrapage.getHeureDebutRattrapage()).append(" - ").append(rattrapage.getHeureFinRattrapage()).append("</strong></span>")
            .append("</div>");
        
        if (rattrapage.getSallePreferee() != null && !rattrapage.getSallePreferee().isEmpty()) {
            html.append("<div class='detail-row'>")
                .append("<span class='detail-label'>Salle :</span>")
                .append("<span class='detail-value'><strong>").append(rattrapage.getSallePreferee()).append("</strong></span>")
                .append("</div>");
        }
        
        html.append("</div>");

        // Message important
        html.append("<div class='highlight'>")
            .append("<strong>⚠️ Attention :</strong> Votre présence est obligatoire au rattrapage. ")
            .append("Notez bien la nouvelle date et l'horaire dans votre agenda. ")
            .append("En cas d'empêchement, contactez immédiatement votre enseignant.")
            .append("</div>");

        // Pied de page
        html.append("</div>")
            .append("<div class='footer'>")
            .append("<p>📧 Email généré automatiquement par le système ESPRIT</p>")
            .append("<p>Date: ").append(new java.text.SimpleDateFormat("dd/MM/yyyy à HH:mm").format(new java.util.Date()))
            .append("</p>")
            .append("</div>")
            .append("</div>")
            .append("</body>")
            .append("</html>");

        return html.toString();
    }

    /**
     * Envoyer un email avec le lien Teams meeting aux étudiants d'une classe
     */
    public void sendTeamsMeetingEmailToStudents(Planning planning, String meetingUrl, List<String> studentEmails) {
        try {
            System.out.println("DEBUG: Début envoi emails Teams meeting aux étudiants");
            System.out.println("DEBUG: Nombre d'étudiants: " + studentEmails.size());
            System.out.println("DEBUG: URL de la réunion: " + meetingUrl);
            
            // Récupérer l'enseignant pour les informations
            Users teacher = planning.getUser();
            if (teacher == null) {
                System.err.println("ERREUR: Aucun enseignant associé au planning");
                return;
            }
            
            String courseName = planning.getTypePlanning();
            String className = planning.getClasse() != null ? planning.getClasse().getNomClasse() : "Classe inconnue";
            String teacherName = teacher.getPrenom() + " " + teacher.getNom();
            String subject = teacher.getMatiere() != null ? teacher.getMatiere() : courseName;
            
            // Formater la date et l'heure
            String meetingDate = planning.getDateDebut() != null ? 
                new java.text.SimpleDateFormat("dd/MM/yyyy").format(planning.getDateDebut()) : "Date non définie";
            String meetingTime = planning.getHeureDebut() != null ? planning.getHeureDebut().toString().substring(0, 5) : "Heure non définie";
            
            for (String studentEmail : studentEmails) {
                try {
                    System.out.println("DEBUG: Envoi email Teams à: " + studentEmail);
                    
                    // Récupérer les informations de l'étudiant
                    Optional<Users> studentOpt = usersRepository.findByEmail(studentEmail);
                    String studentName = studentOpt.isPresent() ? 
                        studentOpt.get().getPrenom() + " " + studentOpt.get().getNom() : "Étudiant";
                    
                    // Générer le contenu HTML pour l'étudiant
                    String htmlContent = generateTeamsMeetingEmailContent(
                        studentName, teacherName, subject, className, 
                        meetingDate, meetingTime, meetingUrl
                    );
                    
                    // Envoyer l'email
                    String emailSubject = "🎥 Invitation cours en ligne - " + subject + " - " + className;
                    sendHtmlEmail(studentEmail, emailSubject, htmlContent);
                    
                    System.out.println("DEBUG: Email Teams envoyé à " + studentEmail);
                    
                } catch (Exception e) {
                    System.err.println("Erreur lors de l'envoi de l'email Teams à " + studentEmail + ": " + e.getMessage());
                    // Continue avec les autres étudiants même si un échoue
                }
            }
            
            System.out.println("DEBUG: Emails Teams envoyés à " + studentEmails.size() + " étudiants");
            
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi des emails Teams aux étudiants: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Générer le contenu HTML de l'email d'invitation Teams pour les étudiants
     */
    private String generateTeamsMeetingEmailContent(String studentName, String teacherName, 
                                                   String subject, String className, 
                                                   String meetingDate, String meetingTime, 
                                                   String meetingUrl) {
        StringBuilder html = new StringBuilder();
        
        // En-tête HTML
        html.append("<!DOCTYPE html>")
            .append("<html lang='fr'>")
            .append("<head>")
            .append("<meta charset='UTF-8'>")
            .append("<meta name='viewport' content='width=device-width, initial-scale=1.0'>")
            .append("<title>Invitation cours en ligne - ESPRIT</title>")
            .append("<style>")
            .append("body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f0f9ff; }")
            .append(".container { max-width: 700px; margin: 0 auto; background: white; border-radius: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); overflow: hidden; }")
            .append(".header { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 35px; text-align: center; }")
            .append(".header h1 { margin: 0; font-size: 28px; font-weight: 700; }")
            .append(".header p { margin: 15px 0 0 0; font-size: 16px; opacity: 0.95; }")
            .append(".content { padding: 35px; }")
            .append(".meeting-badge { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid #0ea5e9; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px; }")
            .append(".meeting-badge h2 { color: #0284c7; margin: 0; font-size: 24px; }")
            .append(".meeting-badge p { color: #0369a1; margin: 10px 0 0 0; font-size: 16px; }")
            .append(".details-section { background: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 25px; }")
            .append(".section-title { color: #0284c7; font-size: 18px; font-weight: 600; margin-bottom: 15px; border-bottom: 2px solid #0ea5e9; padding-bottom: 8px; }")
            .append(".detail-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }")
            .append(".detail-row:last-child { border-bottom: none; }")
            .append(".detail-label { font-weight: 600; color: #374151; }")
            .append(".detail-value { color: #6b7280; text-align: right; }")
            .append(".join-button { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; margin: 20px 0; transition: all 0.3s ease; }")
            .append(".join-button:hover { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4); }")
            .append(".instructions { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; }")
            .append(".instructions strong { color: #92400e; }")
            .append(".footer { background: #f9fafb; padding: 25px; text-align: center; color: #6b7280; font-size: 14px; }")
            .append("</style>")
            .append("</head>")
            .append("<body>");

        // Contenu principal
        html.append("<div class='container'>")
            .append("<div class='header'>")
            .append("<h1>🎥 Cours en ligne</h1>")
            .append("<p>Cher(e) ").append(studentName).append("</p>")
            .append("</div>")
            .append("<div class='content'>");

        // Badge d'invitation
        html.append("<div class='meeting-badge'>")
            .append("<h2>📹 Rejoignez votre cours en ligne</h2>")
            .append("<p>Votre enseignant vous invite à participer au cours via Microsoft Teams</p>")
            .append("</div>");

        // Détails du cours
        html.append("<div class='details-section'>")
            .append("<h3 class='section-title'>📋 Détails du cours</h3>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-label'>Enseignant :</span>")
            .append("<span class='detail-value'><strong>").append(teacherName).append("</strong></span>")
            .append("</div>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-label'>Matière :</span>")
            .append("<span class='detail-value'><strong>").append(subject).append("</strong></span>")
            .append("</div>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-label'>Classe :</span>")
            .append("<span class='detail-value'>").append(className).append("</span>")
            .append("</div>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-label'>Date :</span>")
            .append("<span class='detail-value'><strong>").append(meetingDate).append("</strong></span>")
            .append("</div>")
            .append("<div class='detail-row'>")
            .append("<span class='detail-label'>Heure :</span>")
            .append("<span class='detail-value'><strong>").append(meetingTime).append("</strong></span>")
            .append("</div>")
            .append("</div>");

        // Bouton de participation
        html.append("<div style='text-align: center; margin: 30px 0;'>")
            .append("<a href='").append(meetingUrl).append("' class='join-button'>")
            .append("🚀 Rejoindre la réunion Teams")
            .append("</a>")
            .append("</div>");

        // Instructions
        html.append("<div class='instructions'>")
            .append("<strong>📝 Instructions :</strong>")
            .append("<ul>")
            .append("<li>Cliquez sur le bouton ci-dessus pour rejoindre la réunion</li>")
            .append("<li>Assurez-vous d'avoir Microsoft Teams installé ou utilisez la version web</li>")
            .append("<li>Connectez-vous avec votre compte ESPRIT si demandé</li>")
            .append("<li>Activez votre caméra et microphone selon les instructions de l'enseignant</li>")
            .append("<li>En cas de problème technique, contactez le support informatique</li>")
            .append("</ul>")
            .append("</div>");

        // Pied de page
        html.append("</div>")
            .append("<div class='footer'>")
            .append("<p>📧 Email généré automatiquement par le système ESPRIT</p>")
            .append("<p>Date: ").append(new java.text.SimpleDateFormat("dd/MM/yyyy à HH:mm").format(new java.util.Date()))
            .append("</p>")
            .append("</div>")
            .append("</div>")
            .append("</body>")
            .append("</html>");

        return html.toString();
    }

    /**
     * Envoie un email de bienvenue avec les identifiants à un nouvel utilisateur
     */
    public void sendWelcomeEmailToNewUser(Users user, String plainPassword) {
        try {
            // Debug: Vérifier les données de l'utilisateur
            System.out.println("DEBUG: Données utilisateur reçues:");
            System.out.println("  - Nom: " + user.getNom());
            System.out.println("  - Prénom: " + user.getPrenom());
            System.out.println("  - Email: " + user.getEmail());
            System.out.println("  - Identifiant: " + user.getIdentifiant());
            
            String subject = "🎓 Bienvenue sur la plateforme ESPRIT - Vos identifiants de connexion";
            String htmlContent = generateWelcomeEmailContent(user, plainPassword);
            
            sendHtmlEmail(user.getEmail(), subject, htmlContent);
            System.out.println("DEBUG: Email de bienvenue envoyé à " + user.getEmail());
            
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi de l'email de bienvenue à " + user.getEmail() + ": " + e.getMessage());
            // En mode développement, simuler l'envoi
            System.out.println("INFO: Mode développement - Email de bienvenue simulé pour " + user.getEmail());
            System.out.println("INFO: Identifiant: " + user.getIdentifiant() + ", Mot de passe: " + plainPassword);
        }
    }

    /**
     * Génère le contenu HTML de l'email de bienvenue
     */
    private String generateWelcomeEmailContent(Users user, String plainPassword) {
        StringBuilder html = new StringBuilder();
        
        // En-tête HTML
        html.append("<!DOCTYPE html>")
            .append("<html lang='fr'>")
            .append("<head>")
            .append("<meta charset='UTF-8'>")
            .append("<meta name='viewport' content='width=device-width, initial-scale=1.0'>")
            .append("<title>Bienvenue sur ESPRIT</title>")
            .append("<style>")
            .append("body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f0f8ff; }")
            .append(".container { max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); overflow: hidden; }")
            .append(".header { background: linear-gradient(135deg, #CB0920 0%, #8B0000 100%); color: white; padding: 40px 30px; text-align: center; }")
            .append(".header h1 { margin: 0; font-size: 28px; font-weight: 700; }")
            .append(".header p { margin: 15px 0 0 0; font-size: 16px; opacity: 0.95; }")
            .append(".content { padding: 40px 30px; }")
            .append(".welcome-message { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 5px solid #059669; }")
            .append(".credentials-box { background: linear-gradient(135deg, #fef7ff 0%, #f3e8ff 100%); border-radius: 12px; padding: 25px; margin: 25px 0; border: 2px solid #7c3aed; }")
            .append(".credentials-title { color: #7c3aed; font-size: 18px; font-weight: 700; margin-bottom: 15px; text-align: center; }")
            .append(".credential-item { background: white; border-radius: 8px; padding: 15px; margin: 10px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }")
            .append(".credential-label { font-weight: 600; color: #374151; font-size: 14px; }")
            .append(".credential-value { font-family: 'Courier New', monospace; font-size: 16px; color: #059669; font-weight: 700; margin-top: 5px; }")
            .append(".instructions { background: #fef3c7; border-radius: 12px; padding: 20px; margin: 25px 0; border-left: 5px solid #f59e0b; }")
            .append(".instructions h3 { color: #92400e; margin: 0 0 15px 0; font-size: 16px; }")
            .append(".instructions ul { margin: 0; padding-left: 20px; }")
            .append(".instructions li { margin: 8px 0; color: #78350f; }")
            .append(".login-button { display: inline-block; background: linear-gradient(135deg, #CB0920 0%, #8B0000 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; text-align: center; }")
            .append(".login-button:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(203, 9, 32, 0.3); }")
            .append(".footer { background: #f9fafb; padding: 25px; text-align: center; color: #6b7280; font-size: 14px; }")
            .append(".role-badge { display: inline-block; background: #059669; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 10px 0; }")
            .append("</style>")
            .append("</head>")
            .append("<body>");

        // Contenu principal
        html.append("<div class='container'>")
            .append("<div class='header'>")
            .append("<h1>🎓 Bienvenue sur ESPRIT</h1>")
            .append("<p>Votre compte a été créé avec succès</p>")
            .append("</div>")
            .append("<div class='content'>");

        // Message de bienvenue personnalisé
        html.append("<div class='welcome-message'>")
            .append("<h2 style='color: #059669; margin: 0 0 15px 0;'>Bonjour ").append(user.getPrenom()).append(" ").append(user.getNom()).append(" ! 👋</h2>")
            .append("<p style='margin: 0; color: #374151; line-height: 1.6;'>")
            .append("Nous sommes ravis de vous accueillir sur la plateforme de gestion des plannings ESPRIT. ")
            .append("Votre compte a été créé et vous pouvez maintenant accéder à tous les services disponibles.")
            .append("</p>");

        // Badge du rôle
        String roleText = user.getRole() != null ? user.getRole().getTypeRole() : "Utilisateur";
        html.append("<div style='margin-top: 15px;'>")
            .append("<span class='role-badge'>").append(roleText.toUpperCase()).append("</span>")
            .append("</div>")
            .append("</div>");

        // Boîte des identifiants
        html.append("<div class='credentials-box'>")
            .append("<div class='credentials-title'>🔑 Vos identifiants de connexion</div>")
            .append("<div class='credential-item'>")
            .append("<div class='credential-label'>Identifiant :</div>")
            .append("<div class='credential-value'>").append(user.getIdentifiant()).append("</div>")
            .append("</div>")
            .append("<div class='credential-item'>")
            .append("<div class='credential-label'>Mot de passe :</div>")
            .append("<div class='credential-value'>").append(plainPassword).append("</div>")
            .append("</div>")
            .append("</div>");

        // Instructions
        html.append("<div class='instructions'>")
            .append("<h3>📋 Instructions importantes :</h3>")
            .append("<ul>")
            .append("<li><strong>Conservez précieusement</strong> ces identifiants dans un endroit sûr</li>")
            .append("<li><strong>Changez votre mot de passe</strong> lors de votre première connexion</li>")
            .append("<li>Utilisez ces identifiants pour accéder à la plateforme de gestion des plannings</li>")
            .append("<li>En cas de problème de connexion, contactez l'administrateur système</li>");

        // Instructions spécifiques selon le rôle
        if (user.getRole() != null) {
            String role = user.getRole().getTypeRole().toLowerCase();
            if (role.contains("enseignant")) {
                html.append("<li><strong>Enseignants :</strong> Vous pourrez consulter vos plannings, gérer vos disponibilités et faire des demandes de rattrapage</li>");
            } else if (role.contains("etudiant")) {
                html.append("<li><strong>Étudiants :</strong> Vous recevrez automatiquement vos emplois du temps par email</li>");
            } else if (role.contains("admin")) {
                html.append("<li><strong>Administrateurs :</strong> Vous avez accès à toutes les fonctionnalités de gestion de la plateforme</li>");
            }
        }

        html.append("</ul>")
            .append("</div>");

        // Bouton de connexion
        html.append("<div style='text-align: center; margin: 30px 0;'>")
            .append("<a href='http://localhost:3000/login' class='login-button'>")
            .append("🚀 Se connecter à la plateforme")
            .append("</a>")
            .append("</div>");

        // Informations de contact
        html.append("<div style='background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;'>")
            .append("<h4 style='color: #374151; margin: 0 0 10px 0;'>📞 Besoin d'aide ?</h4>")
            .append("<p style='margin: 0; color: #6b7280; font-size: 14px;'>")
            .append("Contactez le support technique ESPRIT<br>")
            .append("Email: support@esprit.tn<br>")
            .append("Téléphone: +216 XX XXX XXX")
            .append("</p>")
            .append("</div>");

        // Pied de page
        html.append("</div>")
            .append("<div class='footer'>")
            .append("<p>📧 Email généré automatiquement par le système ESPRIT</p>")
            .append("<p>Date: ").append(new java.text.SimpleDateFormat("dd/MM/yyyy à HH:mm").format(new java.util.Date()))
            .append("</p>")
            .append("<p style='font-size: 12px; color: #9ca3af; margin-top: 15px;'>")
            .append("Cet email contient des informations confidentielles. Ne le partagez avec personne.")
            .append("</p>")
            .append("</div>")
            .append("</div>")
            .append("</body>")
            .append("</html>");

        return html.toString();
    }

    /**
     * Méthode utilitaire pour formater les dates
     */
    private String formatDate(java.time.LocalDate date) {
        if (date == null) return "N/A";
        
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        return date.format(formatter);
    }
}
