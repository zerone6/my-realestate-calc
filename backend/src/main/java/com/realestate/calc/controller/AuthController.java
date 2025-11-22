package com.realestate.calc.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.realestate.calc.dto.UserCredential;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:5174", "http://localhost:5175" })
@Slf4j
public class AuthController {
    private static final String BACKEND_DIR_NAME = "backend";
    private static final String DATABASE_DIR_NAME = "database";
    private static final String USERS_DIR_NAME = "users";
    private static final String JSON_EXT = ".json";

    private static Path getUsersDir() {
        Path cwd = Paths.get(System.getProperty("user.dir"));
        Path root = cwd.getFileName() != null && cwd.getFileName().toString().equals(BACKEND_DIR_NAME)
                ? cwd.getParent()
                : cwd;
        return root.resolve(DATABASE_DIR_NAME).resolve(USERS_DIR_NAME);
    }

    @PostMapping("/signup")
    public ResponseEntity<String> signup(@RequestBody UserCredential credential) {
        if (credential == null || credential.getId() == null || credential.getId().isBlank()
                || credential.getPassword() == null || credential.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body("id and password are required");
        }

        try {
            Path dir = getUsersDir();
            Files.createDirectories(dir);
            Path userFile = dir.resolve(credential.getId() + JSON_EXT);

            if (Files.exists(userFile)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("User already exists");
            }

            ObjectMapper mapper = new ObjectMapper();
            mapper.writeValue(userFile.toFile(), credential);
            return ResponseEntity.status(HttpStatus.CREATED).body("Signed up");
        } catch (IOException e) {
            log.error("Signup failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Signup failed");
        }
    }
}
