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

    private final MunicipalityCacheService cacheService;

    public MlitCacheController(MunicipalityCacheService cacheService) {
        this.cacheService = cacheService;
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(Map.of(
                "cachePath", cacheService.getCacheAbsolutePath()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refresh() {
        var data = cacheService.refreshAll();
        return ResponseEntity.ok(Map.of(
                "cachePath", cacheService.getCacheAbsolutePath(),
                "prefectureCount", data.size()));
    }
}
