package com.realestate.calc.controller;

import com.realestate.calc.mlit.MunicipalityCacheService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/mlit-cache")
public class MlitCacheController {
    private static final String KEY_CACHE_PATH = "cachePath";
    private static final String KEY_PREF_COUNT = "prefectureCount";
    private static final String KEY_DATA = "data";

    private final MunicipalityCacheService cacheService;

    public MlitCacheController(MunicipalityCacheService cacheService) {
        this.cacheService = cacheService;
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(Map.of(
                KEY_CACHE_PATH, cacheService.getCacheAbsolutePath()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refresh() {
        var data = cacheService.refreshAll();
        return ResponseEntity.ok(Map.of(
                KEY_CACHE_PATH, cacheService.getCacheAbsolutePath(),
                KEY_PREF_COUNT, data.size()));
    }

    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> all() {
        var data = cacheService.loadOrFetchAll();
        return ResponseEntity.ok(Map.of(
                KEY_DATA, data,
                KEY_PREF_COUNT, data.size(),
                KEY_CACHE_PATH, cacheService.getCacheAbsolutePath()));
    }
}
