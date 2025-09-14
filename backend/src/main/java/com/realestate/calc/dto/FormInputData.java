package com.realestate.calc.dto;

// This is a marker class for the frontend FormInputData type.
// The actual structure is defined in the frontend and will be deserialized into a Map or a more specific class if needed.
public class FormInputData {
    // Fields from shared/types/RealEstateForm.ts -> FormInputData
    public String name;
    public String acquisitionPrice;
    public String ownershipYears;
    public String sellingPrice;
    public String propertyType;
    public String isOwnerOccupied;
    public String isMultiHouse;
    public String otherIncome;
    public String taxRate;
    public String acquisitionTax;
    public String propertyTax;
    public String capitalGainsTax;
    public String comprehensiveRealEstateTax;
    public String rentIncome;
    public String maintenanceCost;
    public String loanInterest;
    public String otherExpenses;
    // 역에서 도보 시간(분) - optional
    public Integer walkMinutesToStation;
}
