package com.realestate.calc.mlit.dto;

import java.util.List;

public class MunicipalitiesResponse {
    private String status; // e.g., "OK"
    private List<MunicipalityDto> data;

    public MunicipalitiesResponse() {
        // Intentionally empty: required for Jackson deserialization
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<MunicipalityDto> getData() {
        return data;
    }

    public void setData(List<MunicipalityDto> data) {
        this.data = data;
    }
}
