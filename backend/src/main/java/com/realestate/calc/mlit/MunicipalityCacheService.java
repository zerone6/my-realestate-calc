package com.realestate.calc.mlit;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.realestate.calc.mlit.dto.MunicipalityDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

@Service
public class MunicipalityCacheService {
    private static final Logger log = LoggerFactory.getLogger(MunicipalityCacheService.class);

    private final MlitApiClient mlitApiClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Cache file path (relative to backend module root by default)
    @Value("${mlit.cache.file:./data/mlit/municipalities_ja.json}")
    private String cacheFilePath;

    // Legacy path used in earlier version (wrong relative path): ./backend/data/...
    // when run from backend CWD
    @Value("${mlit.cache.legacyFile:./backend/data/mlit/municipalities_ja.json}")
    private String legacyCacheFilePath;

    // Force refresh toggle (ignore cache once)
    @Value("${mlit.cache.forceRefresh:false}")
    private boolean forceRefresh;

    public MunicipalityCacheService(MlitApiClient mlitApiClient) {
        this.mlitApiClient = mlitApiClient;
    }

    public Map<String, List<MunicipalityDto>> loadOrFetchAll() {
        Path path = Path.of(cacheFilePath).toAbsolutePath().normalize();
        Map<String, List<MunicipalityDto>> data = null;

        if (forceRefresh) {
            log.warn("mlit.cache.forceRefresh=true -> ignoring cache and fetching all...");
            data = fetchAll();
            writeAtomically(path, data);
            return data;
        }

        // 1) Try load existing cache (primary path)
        if (Files.exists(path)) {
            try {
                log.info("Loading MLIT municipalities from cache: {}", path);
                data = objectMapper.readValue(Files.readAllBytes(path), new TypeReference<>() {
                });
            } catch (IOException e) {
                log.warn("Failed to read cache file, will attempt to refetch: {}", e.getMessage());
            }
        }

        // 1b) Try legacy cache path if primary not usable
        if ((data == null || data.isEmpty()) && legacyCacheFilePath != null && !legacyCacheFilePath.isBlank()) {
            Path legacy = Path.of(legacyCacheFilePath).toAbsolutePath().normalize();
            if (Files.exists(legacy)) {
                try {
                    log.info("Loading MLIT municipalities from legacy cache: {}", legacy);
                    data = objectMapper.readValue(Files.readAllBytes(legacy), new TypeReference<>() {
                    });
                } catch (IOException e) {
                    log.warn("Failed to read legacy cache file: {}", e.getMessage());
                }
            }
        }

        // 2) If loaded but empty or invalid, refetch all
        if (data != null) {
            ensureAllPrefectureKeys(data);
            if (isAllEmpty(data)) {
                log.warn("Cache file exists but is effectively empty. Refetching all prefectures...");
                data = fetchAllWithPeriodicSave(path);
                return data;
            }

            // 3) Backfill only missing/empty prefectures to prefer reuse
            List<String> toBackfill = findEmptyOrMissingPrefectures(data);
            if (!toBackfill.isEmpty()) {
                log.info("Backfilling {} prefectures with empty/missing data: {}", toBackfill.size(), toBackfill);
                int counter = 0;
                for (String pref : toBackfill) {
                    try {
                        List<MunicipalityDto> list = mlitApiClient.getMunicipalitiesByPrefecture(pref, "ja");
                        data.put(pref, list);
                        log.info("Fetched municipalities for prefecture {}: {} entries", pref, list.size());
                        Thread.sleep(80);
                        // Periodic checkpoint save (every 5 prefectures)
                        if ((++counter % 5) == 0) {
                            writeAtomically(path, data);
                        }
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        log.warn("Interrupted while backfilling prefecture {}", pref);
                        break;
                    } catch (Exception ex) {
                        log.error("Failed to backfill prefecture {}: {}", pref, ex.getMessage());
                    }
                }
                writeAtomically(path, data);
            }
            return data;
        }

        // 4) No cache -> fetch all
        data = fetchAllWithPeriodicSave(path);
        return data;
    }

    private Map<String, List<MunicipalityDto>> fetchAll() {
        Map<String, List<MunicipalityDto>> data = new LinkedHashMap<>();
        for (int i = 1; i <= 47; i++) {
            String pref = String.format("%02d", i);
            try {
                List<MunicipalityDto> list = mlitApiClient.getMunicipalitiesByPrefecture(pref, "ja");
                data.put(pref, list);
                log.info("Fetched municipalities for prefecture {}: {} entries", pref, list.size());
                Thread.sleep(80);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                log.warn("Interrupted while fetching prefecture {}", pref);
                break;
            } catch (Exception ex) {
                log.error("Failed to fetch prefecture {}: {}", pref, ex.getMessage());
                data.put(pref, Collections.emptyList());
            }
        }
        ensureAllPrefectureKeys(data);
        return data;
    }

    private Map<String, List<MunicipalityDto>> fetchAllWithPeriodicSave(Path path) {
        Map<String, List<MunicipalityDto>> data = new LinkedHashMap<>();
        int counter = 0;
        for (int i = 1; i <= 47; i++) {
            String pref = String.format("%02d", i);
            try {
                List<MunicipalityDto> list = mlitApiClient.getMunicipalitiesByPrefecture(pref, "ja");
                data.put(pref, list);
                log.info("Fetched municipalities for prefecture {}: {} entries", pref, list.size());
                Thread.sleep(80);
                // Periodic checkpoint save (every 5 prefectures)
                if ((++counter % 5) == 0) {
                    writeAtomically(path, data);
                }
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                log.warn("Interrupted while fetching prefecture {}", pref);
                break;
            } catch (Exception ex) {
                log.error("Failed to fetch prefecture {}: {}", pref, ex.getMessage());
                data.put(pref, Collections.emptyList());
            }
        }
        ensureAllPrefectureKeys(data);
        writeAtomically(path, data);
        return data;
    }

    public Map<String, List<MunicipalityDto>> refreshAll() {
        Path path = Path.of(cacheFilePath).toAbsolutePath().normalize();
        return fetchAllWithPeriodicSave(path);
    }

    public String getCacheAbsolutePath() {
        return Path.of(cacheFilePath).toAbsolutePath().normalize().toString();
    }

    private void writeAtomically(Path path, Map<String, List<MunicipalityDto>> data) {
        try {
            Files.createDirectories(path.getParent());
            Path tmp = path.resolveSibling(path.getFileName().toString() + ".tmp");
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(tmp.toFile(), data);
            try {
                Files.move(tmp, path, java.nio.file.StandardCopyOption.REPLACE_EXISTING,
                        java.nio.file.StandardCopyOption.ATOMIC_MOVE);
            } catch (Exception nonAtomic) {
                // Fallback if filesystem does not support atomic move
                Files.move(tmp, path, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            }
            log.info("Saved MLIT municipalities cache to {}", path);
        } catch (IOException e) {
            log.error("Failed to write cache file {}: {}", path, e.getMessage());
        }
    }

    private void ensureAllPrefectureKeys(Map<String, List<MunicipalityDto>> data) {
        for (int i = 1; i <= 47; i++) {
            String pref = String.format("%02d", i);
            data.computeIfAbsent(pref, k -> new ArrayList<>());
        }
    }

    private boolean isAllEmpty(Map<String, List<MunicipalityDto>> data) {
        if (data == null || data.isEmpty())
            return true;
        boolean anyNonEmpty = false;
        for (int i = 1; i <= 47; i++) {
            String pref = String.format("%02d", i);
            List<MunicipalityDto> list = data.get(pref);
            if (list != null && !list.isEmpty()) {
                anyNonEmpty = true;
                break;
            }
        }
        return !anyNonEmpty;
    }

    private List<String> findEmptyOrMissingPrefectures(Map<String, List<MunicipalityDto>> data) {
        List<String> result = new ArrayList<>();
        for (int i = 1; i <= 47; i++) {
            String pref = String.format("%02d", i);
            List<MunicipalityDto> list = data.get(pref);
            if (list == null || list.isEmpty()) {
                result.add(pref);
            }
        }
        return result;
    }
}
