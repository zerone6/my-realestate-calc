package com.realestate.calc.mlit;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Service
public class MlitPriceIngestService {
    private final JdbcTemplate jdbc;
    private final MlitApiClient client;
    private final ObjectMapper mapper = new ObjectMapper();

    // Query param keys
    public static final String KP_AREA = "area";
    public static final String KP_CITY = "city";
    public static final String KP_STATION = "station";
    public static final String KP_YEAR = "year";
    public static final String KP_PRICE_CLASS = "priceClassification";
    public static final String KP_QUARTER = "quarter";
    public static final String KP_LANGUAGE = "language";

    public MlitPriceIngestService(JdbcTemplate jdbc, MlitApiClient client) {
        this.jdbc = jdbc;
        this.client = client;
    }

    public static class IngestResult {
        private long queryId;
        private int recordCount;
        private String status;

        public long getQueryId() {
            return queryId;
        }

        public int getRecordCount() {
            return recordCount;
        }

        public String getStatus() {
            return status;
        }

        private void setQueryId(long v) {
            this.queryId = v;
        }

        private void setRecordCount(int v) {
            this.recordCount = v;
        }

        private void setStatus(String v) {
            this.status = v;
        }
    }

    public static class MlitIngestException extends RuntimeException {
        public MlitIngestException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public IngestResult ingest(Map<String, String> params) {
        ensureTables();
        try {
            String raw = client.getPricesRaw(params);
            return ingestRaw(params, raw);
        } catch (Exception e) {
            throw new MlitIngestException("Failed to fetch/ingest MLIT prices", e);
        }
    }

    public IngestResult ingestRaw(Map<String, String> params, String rawJson) {
        try {
            ensureTables();
            JsonNode root = mapper.readTree(rawJson);
            String status = root.path("status").asText("");
            JsonNode data = root.path("data");

            long qid = insertQueryLog(params, status, rawJson, data != null && data.isArray() ? data.size() : 0);

            int inserted = 0;
            if (data != null && data.isArray()) {
                for (JsonNode item : data) {
                    inserted += insertRecord(qid, item);
                }
            }

            IngestResult r = new IngestResult();
            r.setQueryId(qid);
            r.setRecordCount(inserted);
            r.setStatus(status);
            return r;
        } catch (Exception e) {
            throw new MlitIngestException("Failed to parse/ingest MLIT price JSON", e);
        }
    }

    private void ensureTables() {
        jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS mlit_price_query_log (
                      id BIGSERIAL PRIMARY KEY,
                      area VARCHAR(4),
                      city VARCHAR(8),
                      station VARCHAR(16),
                      year VARCHAR(8),
                      price_classification VARCHAR(4),
                      quarter VARCHAR(4),
                      language VARCHAR(8),
                      requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                      status TEXT,
                      record_count INT,
                      raw_json JSONB
                    );
                """);
        jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS mlit_price_record (
                      id BIGSERIAL PRIMARY KEY,
                      query_id BIGINT NOT NULL REFERENCES mlit_price_query_log(id) ON DELETE CASCADE,
                      price_category TEXT,
                      type TEXT,
                      region TEXT,
                      municipality_code VARCHAR(8),
                      prefecture TEXT,
                      municipality TEXT,
                      district_name TEXT,
                      trade_price_int BIGINT,
                      price_per_unit_int BIGINT,
                      floor_plan TEXT,
                      area_num NUMERIC,
                      unit_price_int BIGINT,
                      land_shape TEXT,
                      frontage TEXT,
                      total_floor_area_num NUMERIC,
                      building_year TEXT,
                      structure TEXT,
                      use TEXT,
                      purpose TEXT,
                      direction TEXT,
                      classification TEXT,
                      breadth TEXT,
                      city_planning TEXT,
                      coverage_ratio TEXT,
                      floor_area_ratio TEXT,
                      period TEXT,
                      renovation TEXT,
                      remarks TEXT,
                      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                    );
                """);
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_mlit_price_record_query ON mlit_price_record(query_id);");
        jdbc.execute("CREATE INDEX IF NOT EXISTS idx_mlit_price_record_muni ON mlit_price_record(municipality_code);");
    }

    private long insertQueryLog(Map<String, String> params, String status, String raw, int count) {
        Map<String, Object> p = new HashMap<>();
        p.put(KP_AREA, params.getOrDefault(KP_AREA, null));
        p.put(KP_CITY, params.getOrDefault(KP_CITY, null));
        p.put(KP_STATION, params.getOrDefault(KP_STATION, null));
        p.put(KP_YEAR, params.getOrDefault(KP_YEAR, null));
        p.put(KP_PRICE_CLASS, params.getOrDefault(KP_PRICE_CLASS, null));
        p.put(KP_QUARTER, params.getOrDefault(KP_QUARTER, null));
        p.put(KP_LANGUAGE, params.getOrDefault(KP_LANGUAGE, null));

        // Use returning to get id
        String sql = "INSERT INTO mlit_price_query_log(area,city,station,year,price_classification,quarter,language,status,record_count,raw_json) "
                +
                "VALUES (?,?,?,?,?,?,?,?,?,CAST(? AS JSONB)) RETURNING id";
        Long id = jdbc.queryForObject(
                sql,
                Long.class,
                p.get(KP_AREA), p.get(KP_CITY), p.get(KP_STATION), p.get(KP_YEAR),
                p.get(KP_PRICE_CLASS), p.get(KP_QUARTER), p.get(KP_LANGUAGE),
                status, count, raw);
        return java.util.Objects.requireNonNull(id, "Failed to insert mlit_price_query_log");
    }

    private int insertRecord(long qid, JsonNode n) {
        // Helper to extract numbers from string (digits only)
        Long trade = parseLong(n.path("TradePrice").asText(null));
        Long pricePerUnit = parseLong(n.path("PricePerUnit").asText(null));
        Long unitPrice = parseLong(n.path("UnitPrice").asText(null));
        BigDecimal area = parseDecimal(n.path("Area").asText(null));
        BigDecimal totalFloor = parseDecimal(n.path("TotalFloorArea").asText(null));

        String sql = """
                    INSERT INTO mlit_price_record(
                      query_id, price_category, type, region, municipality_code, prefecture, municipality, district_name,
                      trade_price_int, price_per_unit_int, floor_plan, area_num, unit_price_int, land_shape, frontage,
                      total_floor_area_num, building_year, structure, use, purpose, direction, classification,
                      breadth, city_planning, coverage_ratio, floor_area_ratio, period, renovation, remarks
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """;

        return jdbc.update(sql,
                qid,
                text(n, "PriceCategory"),
                text(n, "Type"),
                text(n, "Region"),
                text(n, "MunicipalityCode"),
                text(n, "Prefecture"),
                text(n, "Municipality"),
                text(n, "DistrictName"),
                trade,
                pricePerUnit,
                text(n, "FloorPlan"),
                area,
                unitPrice,
                text(n, "LandShape"),
                text(n, "Frontage"),
                totalFloor,
                text(n, "BuildingYear"),
                text(n, "Structure"),
                text(n, "Use"),
                text(n, "Purpose"),
                text(n, "Direction"),
                text(n, "Classification"),
                text(n, "Breadth"),
                text(n, "CityPlanning"),
                text(n, "CoverageRatio"),
                text(n, "FloorAreaRatio"),
                text(n, "Period"),
                text(n, "Renovation"),
                text(n, "Remarks"));
    }

    private static String text(JsonNode n, String field) {
        JsonNode v = n.get(field);
        if (v == null || v.isNull())
            return null;
        String s = v.asText();
        return (s == null || s.isBlank()) ? null : s;
    }

    private static Long parseLong(String s) {
        if (s == null)
            return null;
        String digits = s.replaceAll("\\D", "");
        if (digits.isEmpty())
            return null;
        try {
            return Long.parseLong(digits);
        } catch (Exception e) {
            return null;
        }
    }

    private static BigDecimal parseDecimal(String s) {
        if (s == null)
            return null;
        String norm = s.replaceAll("[^0-9.]", "");
        if (norm.isEmpty())
            return null;
        try {
            return new BigDecimal(norm);
        } catch (Exception e) {
            return null;
        }
    }

}
