package com.realestate.calc.mlit;

import com.realestate.calc.mlit.dto.MunicipalityDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Service
public class MlitDbSyncService {
    private static final Logger log = LoggerFactory.getLogger(MlitDbSyncService.class);

    private final JdbcTemplate jdbcTemplate;
    private final MlitApiClient mlitApiClient;

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

    public MlitDbSyncService(JdbcTemplate jdbcTemplate, MlitApiClient mlitApiClient) {
        this.jdbcTemplate = jdbcTemplate;
        this.mlitApiClient = mlitApiClient;
    }

    public boolean isDbEmpty() {
        Integer p = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM prefecture", Integer.class);
        Integer m = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM municipality", Integer.class);
        return (p == null || p == 0) && (m == null || m == 0);
    }

    @Transactional
    public void refreshAllFromApi(String language) {
        String lang = (language == null || language.isBlank()) ? "ja" : language;
        int prefCount = 0;
        int muniCount = 0;

        for (int i = 1; i <= 47; i++) {
            String pref = String.format("%02d", i);
            try {
                String prefName = PREF_NAMES_JA.get(pref);
                // prefecture upsert
                jdbcTemplate.update(
                        "INSERT INTO prefecture(code, name, updated_at) VALUES(?, ?, now()) " +
                                "ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at",
                        pref, prefName);
                prefCount++;

                List<MunicipalityDto> list = mlitApiClient.getMunicipalitiesByPrefecture(pref, lang);
                if (list != null) {
                    for (MunicipalityDto m : list) {
                        jdbcTemplate.update(
                                "INSERT INTO municipality(id, name, prefecture_code, updated_at) VALUES(?,?,?, now()) "
                                        +
                                        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, prefecture_code = EXCLUDED.prefecture_code, updated_at = EXCLUDED.updated_at",
                                m.getId(), m.getName(), pref);
                        muniCount++;
                    }
                }
                // polite pacing; MLIT rate-limit friendliness
                sleepQuietly(80);
            } catch (Exception ex) {
                log.error("Failed to refresh prefecture {} from API: {}", pref, ex.getMessage());
            }
        }

        jdbcTemplate.update(
                "INSERT INTO mlit_cache_meta(key, last_refreshed, source) VALUES(?, ?, ?) " +
                        "ON CONFLICT (key) DO UPDATE SET last_refreshed = EXCLUDED.last_refreshed, source = EXCLUDED.source",
                "municipalities_ja", OffsetDateTime.now(), "XIT002 " + lang);

        log.info("DB refresh completed. prefectures={}, municipalities={}", prefCount, muniCount);
    }

    private void sleepQuietly(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }
}
