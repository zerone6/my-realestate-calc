package com.realestate.calc.dto;

import java.util.Map;

public class PropertyData {
    private String name;
    private Map<String, Object> form;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Map<String, Object> getForm() {
        return form;
    }

    public void setForm(Map<String, Object> form) {
        this.form = form;
    }
}
