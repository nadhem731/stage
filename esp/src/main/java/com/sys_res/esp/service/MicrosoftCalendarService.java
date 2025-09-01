package com.sys_res.esp.service;

import com.microsoft.graph.models.Event;
import com.microsoft.graph.models.DateTimeTimeZone;
import com.microsoft.graph.models.ItemBody;
import com.microsoft.graph.models.BodyType;
import com.microsoft.graph.models.Attendee;
import com.microsoft.graph.models.AttendeeType;
import com.microsoft.graph.models.EmailAddress;
import com.microsoft.graph.requests.GraphServiceClient;
import com.sys_res.esp.entity.Planning;
import com.sys_res.esp.entity.Soutenance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class MicrosoftCalendarService {

    @Autowired
    private GraphServiceClient<okhttp3.Request> graphServiceClient;

    private static final String TIMEZONE = "Africa/Tunis";
    
    // Mapper les emails locaux vers les emails Azure AD
    private String mapToAzureEmail(String localEmail) {
        if (localEmail.endsWith("@esprit.tn")) {
            // Remplacer @esprit.tn par le domaine Azure AD configuré
            String username = localEmail.replace("@esprit.tn", "");
            return username + "@7aloufatngmail.onmicrosoft.com";
        }
        return localEmail; // Retourner tel quel si déjà au bon format
    }

    public String createCalendarEvent(Planning planning, String userEmail) {
        if (graphServiceClient == null) {
            throw new RuntimeException("Microsoft Graph non configuré");
        }

        try {
            Event event = new Event();
            event.subject = "Cours: " + planning.getTypePlanning();
            
            // Description
            ItemBody body = new ItemBody();
            body.contentType = BodyType.TEXT;
            body.content = String.format(
                "Cours: %s\nClasse: %s\nSalle: %s\nEnseignant: %s\nMode: %s",
                planning.getTypePlanning(),
                planning.getClasse().getNomClasse(),
                planning.getSalle().getNumSalle(),
                planning.getUser().getNom() + " " + planning.getUser().getPrenom(),
                planning.getModeCours()
            );
            event.body = body;

            // Dates et heures
            LocalDate courseDate = planning.getDateDebut().toLocalDate();
            LocalTime startTime = planning.getHeureDebut().toLocalTime();
            LocalTime endTime = planning.getHeureFin().toLocalTime();

            ZonedDateTime startDateTime = ZonedDateTime.of(courseDate, startTime, ZoneId.of(TIMEZONE));
            ZonedDateTime endDateTime = ZonedDateTime.of(courseDate, endTime, ZoneId.of(TIMEZONE));

            DateTimeTimeZone start = new DateTimeTimeZone();
            start.dateTime = startDateTime.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
            start.timeZone = TIMEZONE;
            event.start = start;

            DateTimeTimeZone end = new DateTimeTimeZone();
            end.dateTime = endDateTime.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
            end.timeZone = TIMEZONE;
            event.end = end;

            // Créer l'événement dans le calendrier de l'utilisateur
            Event createdEvent = graphServiceClient.users(userEmail).events()
                .buildRequest()
                .post(event);

            return createdEvent.id;
        } catch (Exception e) {
            System.err.println("ERREUR DÉTAILLÉE Microsoft Graph:");
            System.err.println("User Email: " + userEmail);
            System.err.println("Exception Type: " + e.getClass().getName());
            System.err.println("Message: " + e.getMessage());
            if (e.getCause() != null) {
                System.err.println("Cause: " + e.getCause().getMessage());
            }
            
            // Vérifier si c'est une erreur 401 (utilisateur inexistant)
            if (e.getMessage().contains("401")) {
                System.err.println("ATTENTION: L'utilisateur " + userEmail + " n'existe pas dans le tenant Azure AD ou n'a pas les permissions calendrier.");
                System.err.println("Solutions possibles:");
                System.err.println("1. Créer l'utilisateur dans Azure AD");
                System.err.println("2. Vérifier que l'email correspond à un utilisateur existant");
                System.err.println("3. Accorder les permissions calendrier à l'utilisateur");
                return null; // Retourner null au lieu de lancer une exception
            }
            
            e.printStackTrace();
            throw new RuntimeException("Erreur lors de la création de l'événement calendrier: " + e.getMessage());
        }
    }

    public String createSoutenanceEvent(Soutenance soutenance, String userEmail) {
        if (graphServiceClient == null) {
            throw new RuntimeException("Microsoft Graph non configuré");
        }

        try {
            Event event = new Event();
            event.subject = "Soutenance: " + soutenance.getUser().getNom() + " " + soutenance.getUser().getPrenom();
            
            // Description
            ItemBody body = new ItemBody();
            body.contentType = BodyType.TEXT;
            body.content = String.format(
                "Soutenance de: %s\nSalle: %s\nDurée: %s\nJury: %s",
                soutenance.getUser().getNom() + " " + soutenance.getUser().getPrenom(),
                soutenance.getSalle().getNumSalle(),
                soutenance.getDuree(),
                getJuryNames(soutenance)
            );
            event.body = body;

            // Dates et heures
            LocalDate soutenanceDate = soutenance.getDate().toLocalDate();
            LocalTime startTime = soutenance.getHeureTime().toLocalTime();
            LocalTime endTime = startTime.plusMinutes(30); // 30 minutes par soutenance

            ZonedDateTime startDateTime = ZonedDateTime.of(soutenanceDate, startTime, ZoneId.of(TIMEZONE));
            ZonedDateTime endDateTime = ZonedDateTime.of(soutenanceDate, endTime, ZoneId.of(TIMEZONE));

            DateTimeTimeZone start = new DateTimeTimeZone();
            start.dateTime = startDateTime.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
            start.timeZone = TIMEZONE;
            event.start = start;

            DateTimeTimeZone end = new DateTimeTimeZone();
            end.dateTime = endDateTime.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
            end.timeZone = TIMEZONE;
            event.end = end;

            // Ajouter les membres du jury comme participants
            List<Attendee> attendees = new ArrayList<>();
            // Note: Vous devrez récupérer les emails des membres du jury depuis votre base de données
            
            event.attendees = attendees;

            // Créer l'événement dans le calendrier de l'utilisateur
            Event createdEvent = graphServiceClient.users(userEmail).events()
                .buildRequest()
                .post(event);

            return createdEvent.id;
        } catch (Exception e) {
            System.err.println("ERREUR DÉTAILLÉE Microsoft Graph (Soutenance):");
            System.err.println("User Email: " + userEmail);
            System.err.println("Exception Type: " + e.getClass().getName());
            System.err.println("Message: " + e.getMessage());
            if (e.getCause() != null) {
                System.err.println("Cause: " + e.getCause().getMessage());
            }
            
            // Vérifier si c'est une erreur 401 (utilisateur inexistant)
            if (e.getMessage().contains("401")) {
                System.err.println("ATTENTION: L'utilisateur " + userEmail + " n'existe pas dans le tenant Azure AD ou n'a pas les permissions calendrier.");
                System.err.println("Solutions possibles:");
                System.err.println("1. Créer l'utilisateur dans Azure AD");
                System.err.println("2. Vérifier que l'email correspond à un utilisateur existant");
                System.err.println("3. Accorder les permissions calendrier à l'utilisateur");
                return null; // Retourner null au lieu de lancer une exception
            }
            
            e.printStackTrace();
            throw new RuntimeException("Erreur lors de la création de l'événement soutenance: " + e.getMessage());
        }
    }

    public void deleteCalendarEvent(String eventId, String userEmail) {
        if (graphServiceClient == null) {
            throw new RuntimeException("Microsoft Graph non configuré");
        }

        try {
            graphServiceClient.users(userEmail).events(eventId)
                .buildRequest()
                .delete();
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la suppression de l'événement: " + e.getMessage());
        }
    }

    public void updateCalendarEvent(String eventId, Planning planning, String userEmail) {
        if (graphServiceClient == null) {
            throw new RuntimeException("Microsoft Graph non configuré");
        }

        try {
            Event event = new Event();
            event.subject = "Cours: " + planning.getTypePlanning();
            
            // Mettre à jour la description
            ItemBody body = new ItemBody();
            body.contentType = BodyType.TEXT;
            body.content = String.format(
                "Cours: %s\nClasse: %s\nSalle: %s\nEnseignant: %s\nMode: %s",
                planning.getTypePlanning(),
                planning.getClasse().getNomClasse(),
                planning.getSalle().getNumSalle(),
                planning.getUser().getNom() + " " + planning.getUser().getPrenom(),
                planning.getModeCours()
            );
            event.body = body;

            graphServiceClient.users(userEmail).events(eventId)
                .buildRequest()
                .patch(event);
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la mise à jour de l'événement: " + e.getMessage());
        }
    }

    private String getJuryNames(Soutenance soutenance) {
        // Cette méthode devra être implémentée pour récupérer les noms du jury
        // depuis la base de données ou depuis l'objet soutenance
        return "Jury à définir";
    }

    private Attendee createAttendee(String email, String name) {
        Attendee attendee = new Attendee();
        attendee.type = AttendeeType.REQUIRED;
        
        EmailAddress emailAddress = new EmailAddress();
        emailAddress.address = email;
        emailAddress.name = name;
        attendee.emailAddress = emailAddress;
        
        return attendee;
    }
}
