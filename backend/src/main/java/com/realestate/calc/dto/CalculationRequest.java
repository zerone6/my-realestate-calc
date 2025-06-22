package com.realestate.calc.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class CalculationRequest {

    @NotNull(message = "물건 이름은 필수입니다")
    private String name;

    @NotNull(message = "매입가는 필수입니다")
    @Positive(message = "매입가는 양수여야 합니다")
    private Double price;

    @NotNull(message = "대출 금액은 필수입니다")
    @Positive(message = "대출 금액은 양수여야 합니다")
    private Double loan;

    @NotNull(message = "금리는 필수입니다")
    @Positive(message = "금리는 양수여야 합니다")
    private Double rate;

    @NotNull(message = "대출 기간은 필수입니다")
    @Positive(message = "대출 기간은 양수여야 합니다")
    private Integer term;

    @NotNull(message = "월세 수익은 필수입니다")
    @Positive(message = "월세 수익은 양수여야 합니다")
    private Double rent;

    @NotNull(message = "연간 유지비는 필수입니다")
    private Double expense;

    private String startDate;

    private double occupancyRate;
    private int rentFixedPeriod;
    private int rentAdjustmentInterval;
    private double rentAdjustmentRate;

    // Getters and Setters
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public Double getLoan() {
        return loan;
    }

    public void setLoan(Double loan) {
        this.loan = loan;
    }

    public Double getRate() {
        return rate;
    }

    public void setRate(Double rate) {
        this.rate = rate;
    }

    public Integer getTerm() {
        return term;
    }

    public void setTerm(Integer term) {
        this.term = term;
    }

    public Double getRent() {
        return rent;
    }

    public void setRent(Double rent) {
        this.rent = rent;
    }

    public Double getExpense() {
        return expense;
    }

    public void setExpense(Double expense) {
        this.expense = expense;
    }

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }

    public double getOccupancyRate() {
        return occupancyRate;
    }

    public void setOccupancyRate(double occupancyRate) {
        this.occupancyRate = occupancyRate;
    }

    public int getRentFixedPeriod() {
        return rentFixedPeriod;
    }

    public void setRentFixedPeriod(int rentFixedPeriod) {
        this.rentFixedPeriod = rentFixedPeriod;
    }

    public int getRentAdjustmentInterval() {
        return rentAdjustmentInterval;
    }

    public void setRentAdjustmentInterval(int rentAdjustmentInterval) {
        this.rentAdjustmentInterval = rentAdjustmentInterval;
    }

    public double getRentAdjustmentRate() {
        return rentAdjustmentRate;
    }

    public void setRentAdjustmentRate(double rentAdjustmentRate) {
        this.rentAdjustmentRate = rentAdjustmentRate;
    }
}