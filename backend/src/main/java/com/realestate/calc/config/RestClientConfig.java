package com.realestate.calc.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestClientConfig {
    @Bean
    public RestTemplate restTemplate() {
        // Buffering factory allows multiple reads of response body for
        // logging/decompression logic
        SimpleClientHttpRequestFactory base = new SimpleClientHttpRequestFactory();
        base.setConnectTimeout(5000);
        base.setReadTimeout(15000);
        return new RestTemplate(new BufferingClientHttpRequestFactory(base));
    }
}
