package com.sys_res.esp.config;

import com.azure.identity.ClientSecretCredential;
import com.azure.identity.ClientSecretCredentialBuilder;
import com.microsoft.graph.authentication.TokenCredentialAuthProvider;
import com.microsoft.graph.requests.GraphServiceClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.List;

@Configuration
public class MicrosoftGraphConfig {

    @Value("${microsoft.graph.client-id:}")
    private String clientId;

    @Value("${microsoft.graph.client-secret:}")
    private String clientSecret;

    @Value("${microsoft.graph.tenant-id:}")
    private String tenantId;

    private static final List<String> SCOPES = Arrays.asList(
        "https://graph.microsoft.com/.default"
    );

    @Bean
    public GraphServiceClient<okhttp3.Request> graphServiceClient() {
        if (clientId == null || clientId.isEmpty() || 
            clientSecret == null || clientSecret.isEmpty() || 
            tenantId == null || tenantId.isEmpty()) {
            return null; // Configuration Microsoft non disponible
        }

        try {
            ClientSecretCredential credential = new ClientSecretCredentialBuilder()
                .clientId(clientId)
                .clientSecret(clientSecret)
                .tenantId(tenantId)
                .build();

            TokenCredentialAuthProvider authProvider = new TokenCredentialAuthProvider(SCOPES, credential);

            return GraphServiceClient.builder()
                .authenticationProvider(authProvider)
                .buildClient();
        } catch (Exception e) {
            System.err.println("Erreur lors de la configuration Microsoft Graph: " + e.getMessage());
            return null;
        }
    }

    public boolean isMicrosoftConfigured() {
        return clientId != null && !clientId.isEmpty() && 
               clientSecret != null && !clientSecret.isEmpty() && 
               tenantId != null && !tenantId.isEmpty();
    }
}
