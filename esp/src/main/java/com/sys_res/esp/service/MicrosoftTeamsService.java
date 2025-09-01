package com.sys_res.esp.service;

import com.microsoft.graph.models.OnlineMeeting;
import com.microsoft.graph.models.MeetingParticipants;
import com.microsoft.graph.models.MeetingParticipantInfo;
import com.microsoft.graph.models.IdentitySet;
import com.microsoft.graph.models.Identity;
import com.microsoft.graph.models.LobbyBypassSettings;
import com.microsoft.graph.models.LobbyBypassScope;
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
public class MicrosoftTeamsService {

    @Autowired
    private GraphServiceClient<okhttp3.Request> graphServiceClient;

    private static final String TIMEZONE = "Europe/Paris";

    public OnlineMeeting createTeamsMeeting(Planning planning, List<String> participantEmails) {
        // Utilisation d'un lien Teams "Meet Now" simplifié
        // Ce format redirige vers la création d'une nouvelle réunion instantanée
        
        try {
            OnlineMeeting meeting = new OnlineMeeting();
            
            // Générer les paramètres de la réunion
            String courseName = planning.getTypePlanning();
            String className = planning.getClasse().getNomClasse();
            String subject = "Cours: " + courseName + " - " + className;
            
            // Lien Teams "Meet Now" - redirige vers une nouvelle réunion
            String joinUrl = "https://teams.microsoft.com/l/meeting/new?subject=" + 
                            java.net.URLEncoder.encode(subject, "UTF-8");
            
            meeting.joinWebUrl = joinUrl;
            meeting.id = "cours-" + planning.getIdPlanning() + "-" + System.currentTimeMillis();
            meeting.subject = subject;
            
            return meeting;
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la création de la réunion Teams: " + e.getMessage());
        }
    }

    public OnlineMeeting createSoutenanceTeamsMeeting(Soutenance soutenance, List<String> juryEmails, String studentEmail) {
        if (graphServiceClient == null) {
            throw new RuntimeException("Microsoft Graph non configuré");
        }

        try {
            OnlineMeeting meeting = new OnlineMeeting();
            meeting.subject = "Soutenance: " + soutenance.getUser().getNom() + " " + soutenance.getUser().getPrenom();
            
            // Dates et heures
            LocalDate soutenanceDate = soutenance.getDate().toLocalDate();
            LocalTime startTime = soutenance.getHeureTime().toLocalTime();
            LocalTime endTime = startTime.plusMinutes(30); // 30 minutes par soutenance

            ZonedDateTime startDateTime = ZonedDateTime.of(soutenanceDate, startTime, ZoneId.of(TIMEZONE));
            ZonedDateTime endDateTime = ZonedDateTime.of(soutenanceDate, endTime, ZoneId.of(TIMEZONE));

            meeting.startDateTime = startDateTime.toOffsetDateTime();
            meeting.endDateTime = endDateTime.toOffsetDateTime();

            // Participants (jury + étudiant)
            MeetingParticipants participants = new MeetingParticipants();
            List<MeetingParticipantInfo> attendees = new ArrayList<>();
            
            // Ajouter l'étudiant
            if (studentEmail != null && !studentEmail.isEmpty()) {
                MeetingParticipantInfo student = new MeetingParticipantInfo();
                IdentitySet studentIdentity = new IdentitySet();
                Identity studentUser = new Identity();
                studentUser.id = studentEmail;
                studentUser.displayName = soutenance.getUser().getNom() + " " + soutenance.getUser().getPrenom();
                studentIdentity.user = studentUser;
                student.identity = studentIdentity;
                attendees.add(student);
            }
            
            // Ajouter les membres du jury
            for (String email : juryEmails) {
                MeetingParticipantInfo juryMember = new MeetingParticipantInfo();
                IdentitySet identity = new IdentitySet();
                Identity user = new Identity();
                user.id = email;
                user.displayName = email;
                identity.user = user;
                juryMember.identity = identity;
                attendees.add(juryMember);
            }
            
            participants.attendees = attendees;
            meeting.participants = participants;

            // Configuration du lobby - plus restrictive pour les soutenances
            LobbyBypassSettings lobbyBypass = new LobbyBypassSettings();
            lobbyBypass.scope = LobbyBypassScope.ORGANIZATION;
            meeting.lobbyBypassSettings = lobbyBypass;

            // Créer la réunion avec authentification application
            OnlineMeeting createdMeeting = graphServiceClient.communications().onlineMeetings()
                .buildRequest()
                .post(meeting);

            return createdMeeting;
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la création de la réunion Teams soutenance: " + e.getMessage());
        }
    }

    public void updateTeamsMeeting(String meetingId, String newSubject, List<String> participantEmails) {
        if (graphServiceClient == null) {
            throw new RuntimeException("Microsoft Graph non configuré");
        }

        try {
            OnlineMeeting meeting = new OnlineMeeting();
            meeting.subject = newSubject;

            // Mettre à jour les participants si fournis
            if (participantEmails != null && !participantEmails.isEmpty()) {
                MeetingParticipants participants = new MeetingParticipants();
                List<MeetingParticipantInfo> attendees = new ArrayList<>();
                
                for (String email : participantEmails) {
                    MeetingParticipantInfo participant = new MeetingParticipantInfo();
                    IdentitySet identity = new IdentitySet();
                    Identity user = new Identity();
                    user.id = email;
                    user.displayName = email;
                    identity.user = user;
                    participant.identity = identity;
                    attendees.add(participant);
                }
                
                participants.attendees = attendees;
                meeting.participants = participants;
            }

            graphServiceClient.communications().onlineMeetings(meetingId)
                .buildRequest()
                .patch(meeting);
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la mise à jour de la réunion Teams: " + e.getMessage());
        }
    }

    public void deleteTeamsMeeting(String meetingId) {
        if (graphServiceClient == null) {
            throw new RuntimeException("Microsoft Graph non configuré");
        }

        try {
            graphServiceClient.communications().onlineMeetings(meetingId)
                .buildRequest()
                .delete();
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la suppression de la réunion Teams: " + e.getMessage());
        }
    }

    public OnlineMeeting getMeetingDetails(String meetingId) {
        if (graphServiceClient == null) {
            throw new RuntimeException("Microsoft Graph non configuré");
        }

        try {
            return graphServiceClient.communications().onlineMeetings(meetingId)
                .buildRequest()
                .get();
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la récupération des détails de la réunion: " + e.getMessage());
        }
    }

    public String extractJoinUrl(OnlineMeeting meeting) {
        if (meeting != null && meeting.joinWebUrl != null) {
            return meeting.joinWebUrl;
        }
        return null;
    }

    public String extractMeetingId(OnlineMeeting meeting) {
        if (meeting != null && meeting.id != null) {
            return meeting.id;
        }
        return null;
    }
}
