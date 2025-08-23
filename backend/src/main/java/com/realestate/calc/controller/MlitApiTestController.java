package com.realestate.calc.controller;

import com.realestate.calc.mlit.MlitApiClient;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/mlit")
public class MlitApiTestController {
    private final MlitApiClient client;

    public MlitApiTestController(MlitApiClient client) {
        this.client = client;
    }

    @GetMapping(value = "/prices", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getPrices(
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String station,
            @RequestParam(required = false, name = "year") String year,
            @RequestParam(required = false, name = "priceClassification") String priceClassification,
            @RequestParam(required = false, name = "quarter") String quarter,
            @RequestParam(required = false, name = "language") String language) throws java.io.IOException {
        Map<String, String> qp = new HashMap<>();
        if (area != null && !area.isBlank())
            qp.put("area", area);
        if (city != null && !city.isBlank())
            qp.put("city", city);
        if (station != null && !station.isBlank())
            qp.put("station", station);
        if (year != null && !year.isBlank())
            qp.put("year", year);
        if (priceClassification != null && !priceClassification.isBlank())
            qp.put("priceClassification", priceClassification);
        if (quarter != null && !quarter.isBlank())
            qp.put("quarter", quarter);
        if (language != null && !language.isBlank())
            qp.put("language", language);
        String raw = client.getPricesRaw(qp);
        return ResponseEntity.ok(raw);
    }
}
