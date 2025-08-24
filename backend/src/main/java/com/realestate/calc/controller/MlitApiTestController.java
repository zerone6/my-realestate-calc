package com.realestate.calc.controller;

import com.realestate.calc.mlit.MlitApiClient;
import com.realestate.calc.mlit.MlitPriceIngestService;
import com.realestate.calc.mlit.MlitPriceBatchService;
import com.realestate.calc.mlit.MlitPriceQueryService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientResponseException;
import java.util.Objects;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/mlit")
public class MlitApiTestController {
    private final MlitApiClient client;
    private final MlitPriceIngestService ingestService;
    private final MlitPriceBatchService batchService;
    private final MlitPriceQueryService queryService;
    private static final String K_AREA = "area";
    private static final String K_CITY = "city";
    private static final String K_STATION = "station";
    private static final String K_YEAR = "year";
    private static final String K_PRICE_CLASS = "priceClassification";
    private static final String K_QUARTER = "quarter";
    private static final String K_LANGUAGE = "language";
    private static final String H_INGEST_ID = "X-MLIT-Ingest-Query-Id";
    private static final String H_INGEST_COUNT = "X-MLIT-Ingest-Count";
    private static final String H_INGEST_STATUS = "X-MLIT-Ingest-Status";

    public MlitApiTestController(MlitApiClient client, MlitPriceIngestService ingestService,
            MlitPriceBatchService batchService, MlitPriceQueryService queryService) {
        this.client = client;
        this.ingestService = ingestService;
        this.batchService = batchService;
        this.queryService = queryService;
    }

    @GetMapping(value = "/prices", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getPrices(
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String station,
            @RequestParam(required = false, name = "year") String year,
            @RequestParam(required = false, name = "priceClassification") String priceClassification,
            @RequestParam(required = false, name = "quarter") String quarter,
            @RequestParam(required = false, name = "language") String language,
            @RequestParam(required = false, name = "mode", defaultValue = "service") String mode) {
        Map<String, String> qp = new HashMap<>();
        putIfPresent(qp, K_AREA, area);
        putIfPresent(qp, K_CITY, city);
        putIfPresent(qp, K_STATION, station);
        putIfPresent(qp, K_YEAR, year);
        putIfPresent(qp, K_PRICE_CLASS, priceClassification);
        putIfPresent(qp, K_QUARTER, quarter);
        putIfPresent(qp, K_LANGUAGE, language);

        // Optional guard: require at least one location filter to avoid upstream 400s
        if (!qp.containsKey(K_AREA) && !qp.containsKey(K_CITY) && !qp.containsKey(K_STATION)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"error\":\"Missing required filter: provide area, city, or station\"}");
        }

        try {
            boolean hasCity = qp.containsKey(K_CITY);
            boolean hasAreaOnly = qp.containsKey(K_AREA) && !qp.containsKey(K_CITY) && !qp.containsKey(K_STATION);

            if ("db".equalsIgnoreCase(mode)) {
                return handleDbMode(qp, hasCity, hasAreaOnly);
            }
            if ("mlit".equalsIgnoreCase(mode)) {
                return handleMlitMode(qp, hasAreaOnly);
            }
            return handleServiceMode(qp, hasCity, hasAreaOnly);
        } catch (RestClientResponseException e) {
            // Propagate upstream HTTP status and body as-is for transparency
            String body = e.getResponseBodyAsString();
            int status = e.getStatusCode().value();
            return ResponseEntity.status(status)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Objects.toString(body, "{}"));
        } catch (java.io.IOException ioe) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"error\":\"Failed to fetch from MLIT API\",\"message\":\"" + ioe.getMessage() + "\"}");
        }
    }

    private static void putIfPresent(Map<String, String> map, String key, String value) {
        if (value != null && !value.isBlank()) {
            map.put(key, value);
        }
    }

    private static String addSourceField(String raw, String source) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(raw);
            if (root != null && root.isObject()) {
                ((ObjectNode) root).put("source", source);
                return mapper.writeValueAsString(root);
            }
        } catch (Exception ignore) {
            // If parsing fails, return raw body without source tag.
        }
        return raw;
    }

    private ResponseEntity<String> mlitFetchAndIngest(Map<String, String> qp) throws java.io.IOException {
        String raw = client.getPricesRaw(qp);
        var result = ingestService.ingestRaw(qp, raw);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .header(H_INGEST_ID, String.valueOf(result.getQueryId()))
                .header(H_INGEST_COUNT, String.valueOf(result.getRecordCount()))
                .header(H_INGEST_STATUS, String.valueOf(result.getStatus()))
                .body(addSourceField(raw, "MLIT"));
    }

    private ResponseEntity<String> handleDbMode(Map<String, String> qp, boolean hasCity, boolean hasAreaOnly) {
        String body;
        if (hasCity) {
            body = queryService.jsonForCity(qp.get(K_CITY), qp.get(K_YEAR), qp.get(K_PRICE_CLASS), qp.get(K_QUARTER));
        } else if (hasAreaOnly) {
            body = queryService.jsonForArea(qp.get(K_AREA), qp.get(K_YEAR), qp.get(K_PRICE_CLASS), qp.get(K_QUARTER));
        } else {
            body = "{\"status\":\"OK\",\"source\":\"DB\",\"data\":[]}";
        }
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }

    private ResponseEntity<String> handleMlitMode(Map<String, String> qp, boolean hasAreaOnly)
            throws java.io.IOException {
        if (hasAreaOnly) {
            String body = batchService.fetchByPrefectureSplit(qp.get(K_AREA), qp.get(K_YEAR), qp.get(K_PRICE_CLASS),
                    qp.get(K_LANGUAGE));
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
        }
        return mlitFetchAndIngest(qp);
    }

    private ResponseEntity<String> handleServiceMode(Map<String, String> qp, boolean hasCity, boolean hasAreaOnly)
            throws java.io.IOException {
        if (hasCity) {
            if (queryService.existsForCity(qp.get(K_CITY), qp.get(K_YEAR), qp.get(K_PRICE_CLASS), qp.get(K_QUARTER))) {
                String body = queryService.jsonForCity(qp.get(K_CITY), qp.get(K_YEAR), qp.get(K_PRICE_CLASS),
                        qp.get(K_QUARTER));
                return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
            }
            return mlitFetchAndIngest(qp);
        }
        if (hasAreaOnly) {
            if (queryService.existsForArea(qp.get(K_AREA), qp.get(K_YEAR), qp.get(K_PRICE_CLASS), qp.get(K_QUARTER))) {
                String body = queryService.jsonForArea(qp.get(K_AREA), qp.get(K_YEAR), qp.get(K_PRICE_CLASS),
                        qp.get(K_QUARTER));
                return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
            }
            String body = batchService.fetchByPrefectureSplit(qp.get(K_AREA), qp.get(K_YEAR), qp.get(K_PRICE_CLASS),
                    qp.get(K_LANGUAGE));
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
        }
        return mlitFetchAndIngest(qp);
    }
}
