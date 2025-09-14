package com.realestate.calc.mlit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.realestate.calc.mlit.dto.MunicipalitiesResponse;
import com.realestate.calc.mlit.dto.MunicipalityDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.zip.GZIPInputStream;

@Component
public class MlitApiClient {
    private static final Logger log = LoggerFactory.getLogger(MlitApiClient.class);
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${REINFOLIB_MLIT_GO_JP:}")
    private String apiKey;

    private static final String BASE_URL = "https://www.reinfolib.mlit.go.jp/ex-api/external/XIT002";
    private static final String PRICES_URL = "https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001";

    public MlitApiClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<MunicipalityDto> getMunicipalitiesByPrefecture(String prefectureCode, String language)
            throws IOException {
        String url = BASE_URL + "?area=" + prefectureCode + (language != null ? ("&language=" + language) : "");

        HttpHeaders headers = new HttpHeaders();
        headers.set("Ocp-Apim-Subscription-Key", apiKey);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        headers.set("Accept-Encoding", "gzip");

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<byte[]> response = restTemplate.exchange(url, HttpMethod.GET, entity, byte[].class);

        byte[] bodyBytes = response.getBody();
        if (bodyBytes == null || bodyBytes.length == 0) {
            return Collections.emptyList();
        }

        String contentEncoding = response.getHeaders().getFirst(HttpHeaders.CONTENT_ENCODING);
        boolean isGzip = contentEncoding != null && contentEncoding.toLowerCase().contains("gzip");

        byte[] jsonBytes;
        if (isGzip || isLikelyGzip(bodyBytes)) {
            try (InputStream gis = new GZIPInputStream(new ByteArrayInputStream(bodyBytes))) {
                jsonBytes = gis.readAllBytes();
            }
        } else {
            jsonBytes = bodyBytes;
        }

        MunicipalitiesResponse wrapped = objectMapper.readValue(jsonBytes, MunicipalitiesResponse.class);
        if (wrapped == null || wrapped.getData() == null) {
            return Collections.emptyList();
        }
        return wrapped.getData();
    }

    private boolean isLikelyGzip(byte[] bytes) {
        // GZIP magic bytes: 0x1f 0x8b
        return bytes.length >= 2 && (bytes[0] == (byte) 0x1f) && (bytes[1] == (byte) 0x8b);
    }

    public String getPricesRaw(Map<String, String> queryParams) throws IOException {
        // Build URL with provided params (area/city/station only if present)
        StringBuilder sb = new StringBuilder(PRICES_URL).append("?");
        boolean first = true;
        for (Map.Entry<String, String> e : queryParams.entrySet()) {
            if (e.getValue() == null || e.getValue().isBlank())
                continue;
            if (!first)
                sb.append('&');
            first = false;
            sb.append(e.getKey()).append('=').append(urlEncode(e.getValue()))
                    .append("");
        }
        String url = sb.toString();
        if (log.isInfoEnabled()) {
            log.info("MLIT HTTP GET {} (params={})", url, queryParams);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.set("Ocp-Apim-Subscription-Key", apiKey);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        headers.set("Accept-Encoding", "gzip");

        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<byte[]> response = restTemplate.exchange(url, HttpMethod.GET, entity, byte[].class);
        if (log.isInfoEnabled()) {
            String enc = response.getHeaders().getFirst(HttpHeaders.CONTENT_ENCODING);
            log.info("MLIT HTTP {} -> status={}, encoding={}", url, response.getStatusCode().value(), enc);
        }
        byte[] bodyBytes = response.getBody();
        if (bodyBytes == null || bodyBytes.length == 0) {
            return "{}";
        }
        String contentEncoding = response.getHeaders().getFirst(HttpHeaders.CONTENT_ENCODING);
        boolean isGzip = contentEncoding != null && contentEncoding.toLowerCase().contains("gzip");
        byte[] jsonBytes;
        if (isGzip || isLikelyGzip(bodyBytes)) {
            try (InputStream gis = new GZIPInputStream(new ByteArrayInputStream(bodyBytes))) {
                jsonBytes = gis.readAllBytes();
            }
        } else {
            jsonBytes = bodyBytes;
        }
        return new String(jsonBytes);
    }

    private String urlEncode(String s) {
        try {
            return java.net.URLEncoder.encode(s, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            return s;
        }
    }
}
