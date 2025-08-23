package com.realestate.calc.mlit.dto;

public class MunicipalityDto {
    private String id; // 市区町村コード（5桁）
    private String name; // 市区町村名（日本語 or 英語）

    public MunicipalityDto() {
    }

    public MunicipalityDto(String id, String name) {
        this.id = id;
        this.name = name;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
