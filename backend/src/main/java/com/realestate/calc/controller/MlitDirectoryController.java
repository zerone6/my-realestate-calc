package com.realestate.calc.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/mlit")
public class MlitDirectoryController {
    private final JdbcTemplate jdbcTemplate;
    private static final String COL_PREF_CODE = "prefecture_code";

    public MlitDirectoryController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/prefectures")
    public ResponseEntity<List<Map<String, Object>>> prefectures() {
        List<Map<String, Object>> rows = jdbcTemplate.query("SELECT code, name FROM prefecture ORDER BY code",
                (rs, i) -> Map.of("code", rs.getString("code"), "name", rs.getString("name")));
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/municipalities")
    public ResponseEntity<List<Map<String, Object>>> municipalities(@RequestParam("pref") String pref) {
        List<Map<String, Object>> rows = jdbcTemplate.query(
                "SELECT id, name FROM municipality WHERE prefecture_code = ? ORDER BY id",
                ps -> ps.setString(1, pref),
                (rs, i) -> Map.of("id", rs.getString("id"), "name", rs.getString("name")));
        return ResponseEntity.ok(rows);
    }

    // 편의: 전체 그룹 형태로 반환 (코드 -> 리스트)
    @GetMapping("/municipalities-grouped")
    public ResponseEntity<Map<String, Object>> municipalitiesGrouped() {
        List<Map<String, String>> rows = jdbcTemplate.query(
                "SELECT id, name, prefecture_code FROM municipality ORDER BY prefecture_code, id",
                (rs, i) -> Map.of(
                        "id", rs.getString("id"),
                        "name", rs.getString("name"),
                        COL_PREF_CODE, rs.getString(COL_PREF_CODE)));
        Map<String, List<Map<String, String>>> grouped = rows.stream()
                .collect(Collectors.groupingBy(r -> r.get(COL_PREF_CODE)));
        Map<String, Object> body = new HashMap<>();
        body.put("data", grouped.entrySet().stream().collect(Collectors.toMap(
                Map.Entry::getKey,
                e -> e.getValue().stream()
                        .map(r -> Map.of("id", r.get("id"), "name", r.get("name")))
                        .toList())));
        body.put("prefectureCount", grouped.size());
        return ResponseEntity.ok(body);
    }
}
