package com.realestate.calc.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.realestate.calc.dto.PropertyData;
import com.realestate.calc.exception.AuthRequiredException;
import com.realestate.calc.service.PropertyStorageService;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/storage")
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:5174", "http://localhost:5175" })
public class StorageController {
    private static final String BACKEND_DIR_NAME = "backend";
    private static final String DATABASE_DIR_NAME = "database";
    private static final String JSON_EXT = ".json";
    private final PropertyStorageService service;
    private static final Logger log = LoggerFactory.getLogger(StorageController.class);
    private final ObjectMapper mapper = new ObjectMapper();

    public StorageController(PropertyStorageService service) {
        this.service = service;
    }

    private static Path getDbDir() {
        Path cwd = Paths.get(System.getProperty("user.dir"));
        // If running from backend module, go up to project root
        Path root = cwd.getFileName() != null && cwd.getFileName().toString().equals(BACKEND_DIR_NAME)
                ? cwd.getParent()
                : cwd;
        return root.resolve(DATABASE_DIR_NAME);
    }

    @PostMapping("/save")
    public ResponseEntity<Void> saveData(@RequestParam String userId, @RequestBody List<PropertyData> data) {
        if (userId == null || userId.isBlank())
            throw new AuthRequiredException();
        Path dbDir = getDbDir();
        try {
            Files.createDirectories(dbDir);
            File userFile = dbDir.resolve(userId + JSON_EXT).toFile();
            mapper.writeValue(userFile, data);
        } catch (Exception io) {
            log.warn("Legacy file backup failed userId={} err={}", userId, io.toString());
        }
        service.save(userId, data);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/load")
    public ResponseEntity<List<PropertyData>> loadData(@RequestParam String userId) {
        if (userId == null || userId.isBlank())
            throw new AuthRequiredException();
        java.util.List<PropertyData> rows = service.load(userId);
        if (!rows.isEmpty())
            return ResponseEntity.ok(rows);
        // Fallback to legacy file
        Path dbDir = getDbDir();
        try {
            Files.createDirectories(dbDir);
            File userFile = dbDir.resolve(userId + JSON_EXT).toFile();
            if (!userFile.exists()) {
                return ResponseEntity.ok(new ArrayList<>());
            }
            List<PropertyData> data = mapper.readValue(userFile, new TypeReference<List<PropertyData>>() {
            });
            return ResponseEntity.ok(data);
        } catch (Exception io) {
            log.warn("Legacy file load failed userId={} err={}", userId, io.toString());
            return ResponseEntity.ok(new ArrayList<>());
        }
    }
}
