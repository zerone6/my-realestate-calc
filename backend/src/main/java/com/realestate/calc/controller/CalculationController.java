package com.realestate.calc.controller;

import com.realestate.calc.dto.CalculationRequest;
import com.realestate.calc.dto.CalculationResult;
import com.realestate.calc.service.CalculationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/calculation")
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:5174", "http://localhost:5175" }) // Vite 개발 서버 포트들
@Slf4j
public class CalculationController {

    @Autowired
    private CalculationService calculationService;

    @PostMapping("/calculate")
    public ResponseEntity<CalculationResult> calculate(@Valid @RequestBody CalculationRequest request) {
        try {
            CalculationResult result = calculationService.calculate(request);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Exception during calculation", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Real Estate Calculator Backend is running!");
    }
}