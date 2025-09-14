package com.realestate.calc.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.realestate.calc.dto.PropertyData;
import jakarta.annotation.PostConstruct;
import com.realestate.calc.exception.ValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class PropertyStorageService {
    private static final Logger log = LoggerFactory.getLogger(PropertyStorageService.class);
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper = new ObjectMapper();

    public PropertyStorageService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostConstruct
    void init() {
        log.info("PropertyStorageService initialized");
    }

    @Transactional
    public void save(String userId, List<PropertyData> data) {
        if (data == null)
            data = new ArrayList<>();
        long start = System.currentTimeMillis();
        if (!data.isEmpty()) {
            jdbc.batchUpdate(
                    "INSERT INTO property_data (user_id, name, form_json, updated_at) VALUES (?, ?, to_jsonb(?::json), now()) "
                            +
                            "ON CONFLICT (user_id, name) DO UPDATE SET form_json = EXCLUDED.form_json, updated_at = now()",
                    data, data.size(), (ps, pd) -> {
                        ps.setString(1, userId);
                        ps.setString(2, validateName(pd.getName()));
                        try {
                            normalizeNumericFields(pd.getForm());
                            ps.setString(3, mapper.writeValueAsString(pd.getForm()));
                        } catch (JsonProcessingException e) {
                            ps.setString(3, "{}");
                        }
                    });
            // Delete stale rows only if we have any current rows; empty list => do not
            // delete (policy)
            int deleted = jdbc.update(
                    "DELETE FROM property_data WHERE user_id = ? AND name NOT IN (" + placeholders(data.size()) + ")",
                    buildArgs(userId, data));
            long took = System.currentTimeMillis() - start;
            log.info("property.save userId={}, items={}, deleted={}, tookMs={}", userId, data.size(), deleted, took);
        } else {
            log.info("property.save userId={} items=0 (no delete per policy)", userId);
        }
    }

    public List<PropertyData> load(String userId) {
        List<PropertyData> rows = jdbc.query(
                "SELECT name, form_json, updated_at FROM property_data WHERE user_id = ? ORDER BY updated_at DESC",
                ps -> ps.setString(1, userId), (rs, i) -> {
                    String name = rs.getString(1);
                    String json = rs.getString(2);
                    java.sql.Timestamp ts = rs.getTimestamp(3);
                    try {
                        Map<String, Object> form = mapper.readValue(json,
                                new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {
                                });
                        PropertyData pd = new PropertyData();
                        pd.setName(name);
                        pd.setForm(form);
                        if (ts != null)
                            pd.setUpdatedAt(ts.toInstant());
                        return pd;
                    } catch (Exception e) {
                        return null;
                    }
                });
        rows.removeIf(r -> r == null);
        return rows;
    }

    private String validateName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new ValidationException("name", "이름은 2~80자여야 합니다");
        }
        String trimmed = name.trim();
        if (trimmed.length() < 2 || trimmed.length() > 80) {
            throw new ValidationException("name", "이름은 2~80자여야 합니다");
        }
        return trimmed;
    }

    private void normalizeNumericFields(Map<String, Object> form) {
        if (form == null)
            return;
        // Convert blank numeric strings to 0
        for (Map.Entry<String, Object> e : form.entrySet()) {
            Object v = e.getValue();
            if (v instanceof String s) {
                if (s.isBlank()) {
                    // Attempt numeric normalization policy: blank => 0
                    e.setValue(0);
                } else if (s.matches("^-?\\d+(,\\d{3})*$")) { // digits with optional commas
                    e.setValue(Integer.parseInt(s.replace(",", "")));
                }
            }
        }
    }

    private static String placeholders(int n) {
        return String.join(",", java.util.Collections.nCopies(n, "?"));
    }

    private static Object[] buildArgs(String userId, List<PropertyData> data) {
        Object[] arr = new Object[1 + data.size()];
        arr[0] = userId;
        for (int i = 0; i < data.size(); i++)
            arr[i + 1] = data.get(i).getName();
        return arr;
    }
}
