package com.realestate.calc.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.realestate.calc.dto.PropertyData;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.IOException;
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
        try {
            Path dbDir = getDbDir();
            Files.createDirectories(dbDir);
            File userFile = dbDir.resolve(userId + JSON_EXT).toFile();
            ObjectMapper mapper = new ObjectMapper();
            mapper.writeValue(userFile, data);
            return ResponseEntity.ok().build();
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/load")
    public ResponseEntity<List<PropertyData>> loadData(@RequestParam String userId) {
        try {
            Path dbDir = getDbDir();
            Files.createDirectories(dbDir);
            File userFile = dbDir.resolve(userId + JSON_EXT).toFile();
            ObjectMapper mapper = new ObjectMapper();
            if (!userFile.exists()) {
                // Legacy fallback: files previously saved under backend/database
                Path cwd = Paths.get(System.getProperty("user.dir"));
                Path legacyDir = (cwd.getFileName() != null && cwd.getFileName().toString().equals(BACKEND_DIR_NAME))
                        ? cwd.resolve(DATABASE_DIR_NAME)
                        : cwd.resolve(BACKEND_DIR_NAME).resolve(DATABASE_DIR_NAME);
                File legacyFile = legacyDir.resolve(userId + JSON_EXT).toFile();
                if (!legacyFile.exists()) {
                    return ResponseEntity.ok(new ArrayList<>());
                }
                List<PropertyData> legacyData = mapper.readValue(legacyFile, new TypeReference<List<PropertyData>>() {
                });
                // Migrate to new location
                mapper.writeValue(userFile, legacyData);
                return ResponseEntity.ok(legacyData);
            }
            List<PropertyData> data = mapper.readValue(userFile, new TypeReference<List<PropertyData>>() {
            });
            return ResponseEntity.ok(data);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }
}
