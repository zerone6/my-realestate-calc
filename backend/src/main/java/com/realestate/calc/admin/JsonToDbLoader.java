package com.realestate.calc.admin;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.realestate.calc.mlit.dto.MunicipalityDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

// Deprecated: one-time local import utility. Keep available but disabled by default.
@Component
public class JsonToDbLoader implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(JsonToDbLoader.class);

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final Map<String, String> PREF_NAMES_JA = Map.ofEntries(
            Map.entry("01", "北海道"), Map.entry("02", "青森県"), Map.entry("03", "岩手県"), Map.entry("04", "宮城県"),
            Map.entry("05", "秋田県"), Map.entry("06", "山形県"), Map.entry("07", "福島県"), Map.entry("08", "茨城県"),
            Map.entry("09", "栃木県"), Map.entry("10", "群馬県"), Map.entry("11", "埼玉県"), Map.entry("12", "千葉県"),
            Map.entry("13", "東京都"), Map.entry("14", "神奈川県"), Map.entry("15", "新潟県"), Map.entry("16", "富山県"),
            Map.entry("17", "石川県"), Map.entry("18", "福井県"), Map.entry("19", "山梨県"), Map.entry("20", "長野県"),
            Map.entry("21", "岐阜県"), Map.entry("22", "静岡県"), Map.entry("23", "愛知県"), Map.entry("24", "三重県"),
            Map.entry("25", "滋賀県"), Map.entry("26", "京都府"), Map.entry("27", "大阪府"), Map.entry("28", "兵庫県"),
            Map.entry("29", "奈良県"), Map.entry("30", "和歌山県"), Map.entry("31", "鳥取県"), Map.entry("32", "島根県"),
            Map.entry("33", "岡山県"), Map.entry("34", "広島県"), Map.entry("35", "山口県"), Map.entry("36", "徳島県"),
            Map.entry("37", "香川県"), Map.entry("38", "愛媛県"), Map.entry("39", "高知県"), Map.entry("40", "福岡県"),
            Map.entry("41", "佐賀県"), Map.entry("42", "長崎県"), Map.entry("43", "熊本県"), Map.entry("44", "大分県"),
            Map.entry("45", "宮崎県"), Map.entry("46", "鹿児島県"), Map.entry("47", "沖縄県"));

    @Value("${mlit.jsonToDb.enabled:false}")
    private boolean enabled;

    @Value("${mlit.jsonToDb.path:./data/mlit/municipalities_ja.json}")
    private String jsonPath;

    public JsonToDbLoader(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        if (!enabled) {
            return;
        }
        Path path = Path.of(jsonPath).toAbsolutePath().normalize();
        if (!Files.exists(path)) {
            log.warn("JSON file not found for import: {}", path);
            return;
        }
        log.info("Loading municipalities JSON from {} into DB...", path);
        Map<String, List<MunicipalityDto>> data = objectMapper.readValue(Files.readAllBytes(path),
                new TypeReference<>() {
                });

        int prefCount = 0;
        int muniCount = 0;
        for (Map.Entry<String, List<MunicipalityDto>> e : data.entrySet()) {
            String pref = e.getKey();
            // prefecture upsert (with Japanese name)
            String prefName = PREF_NAMES_JA.getOrDefault(pref, null);
            jdbcTemplate.update(
                    "INSERT INTO prefecture(code, name, updated_at) VALUES(?, ?, now()) " +
                            "ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at",
                    pref, prefName);
            prefCount++;

            List<MunicipalityDto> list = e.getValue();
            if (list == null)
                continue;
            for (MunicipalityDto m : list) {
                jdbcTemplate.update(
                        "INSERT INTO municipality(id, name, prefecture_code, updated_at) VALUES(?,?,?, now()) " +
                                "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, prefecture_code = EXCLUDED.prefecture_code, updated_at = EXCLUDED.updated_at",
                        m.getId(), m.getName(), pref);
                muniCount++;
            }
        }
        jdbcTemplate.update(
                "INSERT INTO mlit_cache_meta(key, last_refreshed, source) VALUES(?, ?, ?) " +
                        "ON CONFLICT (key) DO UPDATE SET last_refreshed = EXCLUDED.last_refreshed, source = EXCLUDED.source",
                "municipalities_ja", OffsetDateTime.now(), "XIT002 ja");
        log.info("Import completed. prefectures={}, municipalities={}", prefCount, muniCount);
    }
}
