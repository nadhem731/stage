package com.sys_res.esp.service;

import com.microsoft.graph.models.Message;
import com.microsoft.graph.models.ItemBody;
import com.microsoft.graph.models.BodyType;
import com.microsoft.graph.models.Recipient;
import com.microsoft.graph.models.EmailAddress;
import com.microsoft.graph.models.UserSendMailParameterSet;
import com.microsoft.graph.requests.GraphServiceClient;
import com.sys_res.esp.entity.Planning;
import com.sys_res.esp.entity.Soutenance;
import com.sys_res.esp.entity.Rattrapage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class MicrosoftMailService {

    @Autowired
    private GraphServiceClient<okhttp3.Request> graphServiceClient;

    public void sendPlanningNotification(Planning planning, String recipientEmail, String recipientName) {
        if (graphServiceClient == null) {
            throw new RuntimeException("Microsoft Graph non configuré");
        }

        try {
            Message message = new Message();
            String subject = "Notification de cours: " + planning.getTypePlanning();

            // Corps du message
            ItemBody body = new ItemBody();
            body.contentType = BodyType.HTML;
            body.content = String.format("""
                <html>
                <body>
                    <h2>Nouveau cours programmé</h2>
                    <p>Bonjour %s,</p>
                    <p>Un nouveau cours a été programmé :</p>
                    <ul>
                        <li><strong>Matière :</strong> %s</li>
                        <li><strong>Date :</strong> %s</li>
                        <li><strong>Horaires :</strong> %s - %s</li>
                        <li><strong>Salle :</strong> %s</li>
                        <li><strong>Classe :</strong> %s</li>
                        <li><strong>Mode :</strong> %s</li>
                    </ul>
                    <p>Cordialement,<br/>Système de gestion ESPRIT</p>
                </body>
                </html>
                """,
                recipientName,
                planning.getTypePlanning(),
                planning.getDateDebut().toString(),
                planning.getHeureDebut().toString(),
                planning.getHeureFin().toString(),
                planning.getSalle().getNumSalle(),
                planning.getClasse().getNomClasse(),
                planning.getModeCours()
            );
            message.body = body;

            // Destinataire
            List<Recipient> toRecipients = new ArrayList<>();
            Recipient recipient = new Recipient();
            EmailAddress emailAddress = new EmailAddress();
            emailAddress.address = recipientEmail;
            emailAddress.name = recipientName;
            recipient.emailAddress = emailAddress;
            toRecipients.add(recipient);
            message.toRecipients = toRecipients;


            UserSendMailParameterSet sendMailParameters = UserSendMailParameterSet
                .newBuilder()
                .withMessage(message)
                .withSaveToSentItems(true)
                .build();

            // Envoyer le message
            graphServiceClient.me().sendMail(sendMailParameters)
                .buildRequest()
                .post();

        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de l'envoi de l'email: " + e.getMessage());
        }
    }

    public void sendSoutenanceNotification(Soutenance soutenance, String recipientEmail, String recipientName) {
        if (graphServiceClient == null) {
            throw new RuntimeException("Microsoft Graph non configuré");
        }

        try {
            Message message = new Message();
            message.subject = "Soutenance programmée - " + soutenance.getUser().getNom() + " " + soutenance.getUser().getPrenom();

            // Corps du message
            ItemBody body = new ItemBody();
            body.contentType = BodyType.HTML;
            body.content = String.format("""
                <html>
                <body>
                    <h2>Soutenance programmée</h2>
                    <p>Bonjour %s,</p>
                    <p>Une soutenance a été programmée :</p>
                    <ul>
                        <li><strong>Étudiant :</strong> %s</li>
                        <li><strong>Date :</strong> %s</li>
                        <li><strong>Heure :</strong> %s</li>
                        <li><strong>Salle :</strong> %s</li>
                        <li><strong>Durée :</strong> %s</li>
                        <li><strong>Jour :</strong> %s</li>
                    </ul>
                    <p>Merci de vous présenter 10 minutes avant l'heure prévue.</p>
                    <p>Cordialement,<br/>Système de gestion ESPRIT</p>
                </body>
                </html>
                """,
                recipientName,
                soutenance.getUser().getNom() + " " + soutenance.getUser().getPrenom(),
                soutenance.getDate(),
                soutenance.getHeureTime(),
                soutenance.getSalle().getNumSalle(),
                soutenance.getDuree(),
                soutenance.getJour()
            );
            message.body = body;

            // Destinataire
            List<Recipient> toRecipients = new ArrayList<>();
            Recipient recipient = new Recipient();
            EmailAddress emailAddress = new EmailAddress();
            emailAddress.address = recipientEmail;
            emailAddress.name = recipientName;
            recipient.emailAddress = emailAddress;
            toRecipients.add(recipient);
            message.toRecipients = toRecipients;

            // Créer les paramètres pour sendMail
            UserSendMailParameterSet sendMailParameters = UserSendMailParameterSet
                .newBuilder()
                .withMessage(message)
                .withSaveToSentItems(true)
                .build();

            // Envoyer le message
            graphServiceClient.me().sendMail(sendMailParameters)
                .buildRequest()
                .post();

        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de l'envoi de l'email soutenance: " + e.getMessage());
        }
    }

    public void sendRattrapageNotification(Rattrapage rattrapage, String recipientEmail, String recipientName, String status) {
        if (graphServiceClient == null) {
            throw new RuntimeException("Microsoft Graph non configuré");
        }

        try {
            Message message = new Message();
            String statusText = status.equals("approuve") ? "approuvée" : "refusée";
            message.subject = "Demande de rattrapage " + statusText;

            // Corps du message
            ItemBody body = new ItemBody();
            body.contentType = BodyType.HTML;
            body.content = String.format("""
                <html>
                <body>
                    <h2>Demande de rattrapage %s</h2>
                    <p>Bonjour %s,</p>
                    <p>Votre demande de rattrapage a été %s :</p>
                    <ul>
                        <li><strong>Classe :</strong> %s</li>
                        <li><strong>Matière :</strong> %s</li>
                        <li><strong>Date d'absence :</strong> %s</li>
                        <li><strong>Motif :</strong> %s</li>
                        <li><strong>Date proposée :</strong> %s</li>
                        <li><strong>Horaires proposés :</strong> %s - %s</li>
                    </ul>
                    %s
                    <p>Cordialement,<br/>Administration ESPRIT</p>
                </body>
                </html>
                """,
                statusText,
                recipientName,
                statusText,
                rattrapage.getClasse(),
                rattrapage.getMatiere(),
                rattrapage.getDateAbsence(),
                rattrapage.getMotif(),
                rattrapage.getDateRattrapageProposee(),
                rattrapage.getHeureDebutRattrapage(),
                rattrapage.getHeureFinRattrapage(),
                status.equals("approuve") ? 
                    "<p><strong>Le rattrapage sera programmé selon vos propositions.</strong></p>" :
                    "<p><strong>Veuillez contacter l'administration pour plus d'informations.</strong></p>"
            );
            message.body = body;

            // Destinataire
            List<Recipient> toRecipients = new ArrayList<>();
            Recipient recipient = new Recipient();
            EmailAddress emailAddress = new EmailAddress();
            emailAddress.address = recipientEmail;
            emailAddress.name = recipientName;
            recipient.emailAddress = emailAddress;
            toRecipients.add(recipient);
            message.toRecipients = toRecipients;

            // Créer les paramètres pour sendMail
            UserSendMailParameterSet sendMailParameters = UserSendMailParameterSet
                .newBuilder()
                .withMessage(message)
                .withSaveToSentItems(true)
                .build();

            // Envoyer le message
            graphServiceClient.me().sendMail(sendMailParameters)
                .buildRequest()
                .post();

        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de l'envoi de l'email rattrapage: " + e.getMessage());
        }
    }

    public void sendBulkNotification(List<String> recipients, String subject, String htmlContent) {
        if (graphServiceClient == null) {
            throw new RuntimeException("Microsoft Graph non configuré");
        }

        try {
            for (String recipientEmail : recipients) {
                Message message = new Message();
                message.subject = subject;

                ItemBody body = new ItemBody();
                body.contentType = BodyType.HTML;
                body.content = htmlContent;
                message.body = body;

                List<Recipient> toRecipients = new ArrayList<>();
                Recipient recipient = new Recipient();
                EmailAddress emailAddress = new EmailAddress();
                emailAddress.address = recipientEmail;
                recipient.emailAddress = emailAddress;
                toRecipients.add(recipient);
                message.toRecipients = toRecipients;

                // Créer les paramètres pour sendMail
                UserSendMailParameterSet sendMailParameters = UserSendMailParameterSet
                    .newBuilder()
                    .withMessage(message)
                    .withSaveToSentItems(true)
                    .build();

                graphServiceClient.me().sendMail(sendMailParameters)
                    .buildRequest()
                    .post();

                // Petite pause pour éviter le rate limiting
                Thread.sleep(100);
            }
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de l'envoi des emails en masse: " + e.getMessage());
        }
    }
}
