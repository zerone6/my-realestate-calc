package com.realestate.calc.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class SecretsConfig {
    @Value("${EXTERNAL_API_KEY:}")
    private String externalApiKey;

    @Value("${DB_PASSWORD:}")
    private String dbPassword;

    public String getExternalApiKey() {
        return externalApiKey;
    }

    public String getDbPassword() {
        return dbPassword;
    }
}
