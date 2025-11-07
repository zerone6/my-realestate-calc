package com.realestate.calc.dto;

// This is a marker class for the frontend FormInputData type.
// The actual structure is defined in the frontend and will be deserialized into a Map or a more specific class if needed.
public class FormInputData {
    // Fields from shared/types/RealEstateForm.ts -> FormInputData
    private String name;
    private String acquisitionPrice;
    private String ownershipYears;
    private String sellingPrice;
    private String propertyType;
    private String isOwnerOccupied;
    private String isMultiHouse;
    private String otherIncome;
    private String taxRate;
    private String acquisitionTax;
    private String propertyTax;
    private String capitalGainsTax;
    private String comprehensiveRealEstateTax;
    private String rentIncome;
    private String maintenanceCost;
    private String loanInterest;
    private String otherExpenses;
    // 역에서 도보 시간(분) - optional
    private Integer walkMinutesToStation;

    public FormInputData() {
        // Default no-arg constructor required for serialization/deserialization frameworks (e.g., Jackson).
        // Intentionally left blank.
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAcquisitionPrice() {
        return acquisitionPrice;
    }

    public void setAcquisitionPrice(String acquisitionPrice) {
        this.acquisitionPrice = acquisitionPrice;
    }

    public String getOwnershipYears() {
        return ownershipYears;
    }

    public void setOwnershipYears(String ownershipYears) {
        this.ownershipYears = ownershipYears;
    }

    public String getSellingPrice() {
        return sellingPrice;
    }

    public void setSellingPrice(String sellingPrice) {
        this.sellingPrice = sellingPrice;
    }

    public String getPropertyType() {
        return propertyType;
    }

    public void setPropertyType(String propertyType) {
        this.propertyType = propertyType;
    }

    public String getIsOwnerOccupied() {
        return isOwnerOccupied;
    }

    public void setIsOwnerOccupied(String isOwnerOccupied) {
        this.isOwnerOccupied = isOwnerOccupied;
    }

    public String getIsMultiHouse() {
        return isMultiHouse;
    }

    public void setIsMultiHouse(String isMultiHouse) {
        this.isMultiHouse = isMultiHouse;
    }

    public String getOtherIncome() {
        return otherIncome;
    }

    public void setOtherIncome(String otherIncome) {
        this.otherIncome = otherIncome;
    }

    public String getTaxRate() {
        return taxRate;
    }

    public void setTaxRate(String taxRate) {
        this.taxRate = taxRate;
    }

    public String getAcquisitionTax() {
        return acquisitionTax;
    }

    public void setAcquisitionTax(String acquisitionTax) {
        this.acquisitionTax = acquisitionTax;
    }

    public String getPropertyTax() {
        return propertyTax;
    }

    public void setPropertyTax(String propertyTax) {
        this.propertyTax = propertyTax;
    }

    public String getCapitalGainsTax() {
        return capitalGainsTax;
    }

    public void setCapitalGainsTax(String capitalGainsTax) {
        this.capitalGainsTax = capitalGainsTax;
    }

    public String getComprehensiveRealEstateTax() {
        return comprehensiveRealEstateTax;
    }

    public void setComprehensiveRealEstateTax(String comprehensiveRealEstateTax) {
        this.comprehensiveRealEstateTax = comprehensiveRealEstateTax;
    }

    public String getRentIncome() {
        return rentIncome;
    }

    public void setRentIncome(String rentIncome) {
        this.rentIncome = rentIncome;
    }

    public String getMaintenanceCost() {
        return maintenanceCost;
    }

    public void setMaintenanceCost(String maintenanceCost) {
        this.maintenanceCost = maintenanceCost;
    }

    public String getLoanInterest() {
        return loanInterest;
    }

    public void setLoanInterest(String loanInterest) {
        this.loanInterest = loanInterest;
    }

    public String getOtherExpenses() {
        return otherExpenses;
    }

    public void setOtherExpenses(String otherExpenses) {
        this.otherExpenses = otherExpenses;
    }

    public Integer getWalkMinutesToStation() {
        return walkMinutesToStation;
    }

    public void setWalkMinutesToStation(Integer walkMinutesToStation) {
        this.walkMinutesToStation = walkMinutesToStation;
    }
}
