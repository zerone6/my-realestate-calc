package com.realestate.calc.mlit;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MlitPriceBatchService {
    private final JdbcTemplate jdbc;
    private final MlitApiClient client;
    private final MlitPriceIngestService ingest;
    private final ObjectMapper mapper = new ObjectMapper();

    public MlitPriceBatchService(JdbcTemplate jdbc, MlitApiClient client, MlitPriceIngestService ingest) {
        this.jdbc = jdbc;
        this.client = client;
        this.ingest = ingest;
    }

    public String fetchByPrefectureSplit(String area, String year, String priceClassification, String language)
            throws IOException {
        String priceClass = (priceClassification == null || priceClassification.isBlank()) ? "02" : priceClassification;
        String lang = (language == null || language.isBlank()) ? "ja" : language;

        List<String> cityIds = loadMunicipalities(area);

        ArrayNode combined = mapper.createArrayNode();
        for (String cityId : cityIds) {
            for (int q = 1; q <= 4; q++) {
                Map<String, String> qpReq = buildParams(cityId, year, priceClass, String.valueOf(q), lang);
                try {
                    String raw = client.getPricesRaw(qpReq);
                    // Log with area included (do not send area upstream)
                    Map<String, String> qpLog = new HashMap<>(qpReq);
                    qpLog.put(MlitPriceIngestService.KP_AREA, area);
                    ingest.ingestRaw(qpLog, raw);
                    addDataTo(combined, raw);
                    sleepQuietly(120);
                } catch (RestClientResponseException e) {
                    // Skip this chunk, continue others
                }
            }
        }

        ObjectNode out = mapper.createObjectNode();
        out.put("status", "OK");
        out.put("source", "MLIT");
        out.set("data", combined);
        return mapper.writeValueAsString(out);
    }

    public List<String> loadMunicipalities(String prefectureCode) {
        String sql = "SELECT id FROM municipality WHERE prefecture_code = ? ORDER BY id";
        return jdbc.query(sql, ps -> ps.setString(1, prefectureCode), (rs, i) -> rs.getString(1));
    }

    private Map<String, String> buildParams(String cityId, String year, String priceClass, String quarter,
            String lang) {
        Map<String, String> qp = new HashMap<>();
        qp.put(MlitPriceIngestService.KP_CITY, cityId);
        qp.put(MlitPriceIngestService.KP_YEAR, year);
        qp.put(MlitPriceIngestService.KP_PRICE_CLASS, priceClass);
        qp.put(MlitPriceIngestService.KP_QUARTER, quarter);
        qp.put(MlitPriceIngestService.KP_LANGUAGE, lang);
        return qp;
    }

    private void addDataTo(ArrayNode combined, String raw) throws IOException {
        JsonNode root = mapper.readTree(raw);
        JsonNode data = root.path("data");
        if (data != null && data.isArray()) {
            data.forEach(combined::add);
        }
    }

    private void sleepQuietly(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }
}
