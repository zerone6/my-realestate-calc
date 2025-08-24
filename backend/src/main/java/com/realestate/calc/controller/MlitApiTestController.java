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
    private static final String K_SOURCE = "source";

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
            @RequestParam(required = false, name = "startYear") String startYear,
            @RequestParam(required = false, name = "endYear") String endYear,
            @RequestParam(required = false, name = "priceClassification") String priceClassification,
            @RequestParam(required = false, name = "quarter") String quarter,
            @RequestParam(required = false, name = "language") String language,
            @RequestParam(required = false, name = "mode", defaultValue = "service") String mode) {
        Map<String, String> qp = new HashMap<>();
        putIfPresent(qp, K_AREA, area);
        putIfPresent(qp, K_CITY, city);
        putIfPresent(qp, K_STATION, station);
        putIfPresent(qp, K_YEAR, year);
        // Do NOT forward startYear/endYear to upstream MLIT; used only for DB/expansion
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
                return handleDbMode(qp, hasCity, hasAreaOnly, startYear, endYear);
            }
            if ("mlit".equalsIgnoreCase(mode)) {
                return handleMlitMode(qp, hasAreaOnly, startYear, endYear);
            }
            return handleServiceMode(qp, hasCity, hasAreaOnly, startYear, endYear);
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
                ((ObjectNode) root).put(K_SOURCE, source);
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

    private ResponseEntity<String> handleDbMode(Map<String, String> qp, boolean hasCity, boolean hasAreaOnly,
            String startYear, String endYear) {
        String body;
        if (hasCity) {
            if (isBlank(qp.get(K_YEAR)) && (!isBlank(startYear) || !isBlank(endYear))) {
                body = queryService.jsonForCityRange(qp.get(K_CITY), startYear, endYear, qp.get(K_PRICE_CLASS),
                        qp.get(K_QUARTER));
            } else {
                body = queryService.jsonForCity(qp.get(K_CITY), qp.get(K_YEAR), qp.get(K_PRICE_CLASS),
                        qp.get(K_QUARTER));
            }
        } else if (hasAreaOnly) {
            if (isBlank(qp.get(K_YEAR)) && (!isBlank(startYear) || !isBlank(endYear))) {
                body = queryService.jsonForAreaRange(qp.get(K_AREA), startYear, endYear, qp.get(K_PRICE_CLASS),
                        qp.get(K_QUARTER));
            } else {
                body = queryService.jsonForArea(qp.get(K_AREA), qp.get(K_YEAR), qp.get(K_PRICE_CLASS),
                        qp.get(K_QUARTER));
            }
        } else {
            body = "{\"status\":\"OK\",\"source\":\"DB\",\"data\":[]}";
        }
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }

    private ResponseEntity<String> handleMlitMode(Map<String, String> qp, boolean hasAreaOnly, String startYear,
            String endYear) throws java.io.IOException {
        if (hasAreaOnly) {
            return handleMlitAreaMode(qp, startYear, endYear);
        }
        return handleMlitNonAreaMode(qp, startYear, endYear);
    }

    private ResponseEntity<String> handleMlitAreaMode(Map<String, String> qp, String startYear, String endYear)
            throws java.io.IOException {
        String singleYear = qp.get(K_YEAR);
        if (!isBlank(singleYear) || (isBlank(startYear) && isBlank(endYear))) {
            String body = batchService.fetchByPrefectureSplit(qp.get(K_AREA), singleYear, qp.get(K_PRICE_CLASS),
                    qp.get(K_LANGUAGE));
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
        }
        int[] se = parseYearRange(startYear, endYear);
        ObjectMapper mapper = new ObjectMapper();
        com.fasterxml.jackson.databind.node.ArrayNode combined = mapper.createArrayNode();
        for (int y = se[0]; y <= se[1]; y++) {
            String body = batchService.fetchByPrefectureSplit(qp.get(K_AREA), String.valueOf(y),
                    qp.get(K_PRICE_CLASS), qp.get(K_LANGUAGE));
            try {
                com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(body);
                com.fasterxml.jackson.databind.JsonNode data = root.path("data");
                if (data != null && data.isArray()) {
                    data.forEach(combined::add);
                }
            } catch (Exception ignore) {
                // Ignore bad chunk and continue combining others
            }
        }
        var out = mapper.createObjectNode();
        out.put("status", "OK");
        out.put(K_SOURCE, "MLIT");
        out.set("data", combined);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(out.toString());
    }

    private ResponseEntity<String> handleMlitNonAreaMode(Map<String, String> qp, String startYear, String endYear)
            throws java.io.IOException {
        if (isBlank(qp.get(K_YEAR)) && (!isBlank(startYear) || !isBlank(endYear))) {
            int[] se = parseYearRange(startYear, endYear);
            ObjectMapper mapper = new ObjectMapper();
            com.fasterxml.jackson.databind.node.ArrayNode combined = mapper.createArrayNode();
            for (int y = se[0]; y <= se[1]; y++) {
                Map<String, String> req = new java.util.HashMap<>(qp);
                req.put(K_YEAR, String.valueOf(y));
                String body = mlitFetchAndIngest(req).getBody();
                try {
                    com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(body);
                    com.fasterxml.jackson.databind.JsonNode data = root.path("data");
                    if (data != null && data.isArray())
                        data.forEach(combined::add);
                } catch (Exception ignore) {
                    // Ignore bad chunk and continue combining others
                }
            }
            var out = mapper.createObjectNode();
            out.put("status", "OK");
            out.put(K_SOURCE, "MLIT");
            out.set("data", combined);
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(out.toString());
        }
        return mlitFetchAndIngest(qp);
    }

    private ResponseEntity<String> handleServiceMode(Map<String, String> qp, boolean hasCity, boolean hasAreaOnly,
            String startYear, String endYear) throws java.io.IOException {
        if (hasCity) {
            return handleServiceCity(qp, startYear, endYear);
        }
        if (hasAreaOnly) {
            return handleServiceArea(qp, startYear, endYear);
        }
        return mlitFetchAndIngest(qp);
    }

    private ResponseEntity<String> handleServiceCity(Map<String, String> qp, String startYear, String endYear)
            throws java.io.IOException {
        String city = qp.get(K_CITY);
        String year = qp.get(K_YEAR);
        String priceClass = qp.get(K_PRICE_CLASS);
        String quarter = qp.get(K_QUARTER);

        if (!isBlank(quarter)) {
            return handleServiceCityQuarter(qp, city, year, priceClass, quarter, startYear, endYear);
        }
        return handleServiceCityNoQuarter(qp, city, year, priceClass, startYear, endYear);
    }

    private ResponseEntity<String> handleServiceCityQuarter(Map<String, String> qp, String city, String year,
            String priceClass, String quarter, String startYear, String endYear) throws java.io.IOException {
        if (!isBlank(year) || (isBlank(startYear) && isBlank(endYear))) {
            if (queryService.existsForCity(city, year, priceClass, quarter)) {
                String body = queryService.jsonForCity(city, year, priceClass, quarter);
                return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
            }
            return mlitFetchAndIngest(qp);
        }
        ensureCityQuarterForRange(qp, city, priceClass, quarter, startYear, endYear);
        String body = queryService.jsonForCityRange(city, startYear, endYear, priceClass, quarter);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }

    private ResponseEntity<String> handleServiceCityNoQuarter(Map<String, String> qp, String city, String year,
            String priceClass, String startYear, String endYear) throws java.io.IOException {
        if (!isBlank(year) || (isBlank(startYear) && isBlank(endYear))) {
            ensureCityCompletenessForYear(qp, city, year, priceClass);
            String body = queryService.jsonForCity(city, year, priceClass, null);
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
        }
        int[] se = parseYearRange(startYear, endYear);
        for (int y = se[0]; y <= se[1]; y++) {
            ensureCityCompletenessForYear(qp, city, String.valueOf(y), priceClass);
        }
        String body = queryService.jsonForCityRange(city, startYear, endYear, priceClass, null);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }

    private void ensureCityQuarterForRange(Map<String, String> qp, String city, String priceClass, String quarter,
            String startYear, String endYear) throws java.io.IOException {
        int[] se = parseYearRange(startYear, endYear);
        for (int y = se[0]; y <= se[1]; y++) {
            if (!queryService.existsForCity(city, String.valueOf(y), priceClass, quarter)) {
                Map<String, String> req = new java.util.HashMap<>(qp);
                req.put(K_YEAR, String.valueOf(y));
                mlitFetchAndIngest(req);
            }
        }
    }

    private void ensureCityCompletenessForYear(Map<String, String> qp, String city, String year, String priceClass)
            throws java.io.IOException {
        var missing = queryService.missingQuartersForCity(city, year, priceClass);
        if (!missing.isEmpty()) {
            for (Integer q : missing) {
                Map<String, String> qpQ = new java.util.HashMap<>(qp);
                qpQ.put(K_YEAR, year);
                qpQ.put(K_QUARTER, String.valueOf(q));
                mlitFetchAndIngest(qpQ);
            }
        }
    }

    private ResponseEntity<String> handleServiceArea(Map<String, String> qp, String startYear, String endYear)
            throws java.io.IOException {
        String area = qp.get(K_AREA);
        String priceClass = qp.get(K_PRICE_CLASS);
        String language = qp.get(K_LANGUAGE);
        String singleYear = qp.get(K_YEAR);
        String reqQuarter = qp.get(K_QUARTER);
        if (!isBlank(singleYear) || (isBlank(startYear) && isBlank(endYear))) {
            if (queryService.existsForArea(area, singleYear, priceClass, reqQuarter)) {
                String body = queryService.jsonForArea(area, singleYear, priceClass, reqQuarter);
                return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
            }
            String body = batchService.fetchByPrefectureSplit(area, singleYear, priceClass, language);
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
        }
        int[] se = parseYearRange(startYear, endYear);
        for (int y = se[0]; y <= se[1]; y++) {
            if (!isBlank(reqQuarter)) {
                if (!queryService.existsForArea(area, String.valueOf(y), priceClass, reqQuarter)) {
                    batchService.fetchByPrefectureSplit(area, String.valueOf(y), priceClass, language);
                }
            } else {
                if (!queryService.hasAllQuartersForArea(area, String.valueOf(y), priceClass)) {
                    batchService.fetchByPrefectureSplit(area, String.valueOf(y), priceClass, language);
                }
            }
        }
        String body = queryService.jsonForAreaRange(area, startYear, endYear, priceClass, reqQuarter);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private int[] parseYearRange(String startYear, String endYear) {
        int s = safeParseInt(startYear, 0);
        int e = safeParseInt(endYear, 0);
        if (s == 0 && e == 0) {
            int y = java.time.Year.now().getValue();
            return new int[] { y, y };
        }
        if (s == 0)
            s = e;
        if (e == 0)
            e = s;
        if (s > e) {
            int tmp = s;
            s = e;
            e = tmp;
        }
        return new int[] { s, e };
    }

    private int safeParseInt(String s, int fallback) {
        if (s == null || s.isBlank())
            return fallback;
        try {
            return Integer.parseInt(s.trim());
        } catch (NumberFormatException nfe) {
            return fallback;
        }
    }
}
