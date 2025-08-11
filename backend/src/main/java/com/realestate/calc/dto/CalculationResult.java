package com.realestate.calc.dto;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;

public class CalculationResult {
    private String monthlyPayment;
    private String yearlyIncome;
    private String yearlyCost;
    private String yearlyProfit;
    private String yieldPercent;
    private String grossYield;
    private String equityYield; // 자기자본 대비 수익률
    private List<RepaymentSchedule> repaymentSchedule; // schedule → repaymentSchedule 변경

    public CalculationResult() {
        // Default constructor for Jackson deserialization and manual property setting.
    }

    // Use default constructor and setters to reduce constructor parameter count.

    // Getters and Setters
    public String getMonthlyPayment() {
        return monthlyPayment;
    }

    public void setMonthlyPayment(String monthlyPayment) {
        this.monthlyPayment = monthlyPayment;
    }

    public String getYearlyIncome() {
        return yearlyIncome;
    }

    public void setYearlyIncome(String yearlyIncome) {
        this.yearlyIncome = yearlyIncome;
    }

    public String getYearlyCost() {
        return yearlyCost;
    }

    public void setYearlyCost(String yearlyCost) {
        this.yearlyCost = yearlyCost;
    }

    public String getYearlyProfit() {
        return yearlyProfit;
    }

    public void setYearlyProfit(String yearlyProfit) {
        this.yearlyProfit = yearlyProfit;
    }

    public String getYieldPercent() {
        return yieldPercent;
    }

    public void setYieldPercent(String yieldPercent) {
        this.yieldPercent = yieldPercent;
    }

    public String getGrossYield() {
        return grossYield;
    }

    public void setGrossYield(String grossYield) {
        this.grossYield = grossYield;
    }

    public String getEquityYield() {
        return equityYield;
    }

    public void setEquityYield(String equityYield) {
        this.equityYield = equityYield;
    }

    public List<RepaymentSchedule> getRepaymentSchedule() {
        return repaymentSchedule;
    }

    public void setRepaymentSchedule(List<RepaymentSchedule> repaymentSchedule) {
        this.repaymentSchedule = repaymentSchedule;
    }

    public static class RepaymentSchedule {
        @JsonProperty("month")
        private int no;
        private String date;
    private double payment;
    private double principal;
    private double interest;
        @JsonProperty("remaining")
        private double balance;
        private double rent;
    private double reserve;
        private double cashFlow;

        public RepaymentSchedule() {
        }

    public RepaymentSchedule(int no, String date, double payment, double principal, double interest, double balance,
        double rent) {
            this.no = no;
            this.date = date;
            this.payment = payment;
            this.principal = principal;
            this.interest = interest;
            this.balance = balance;
            this.rent = rent;
        }

        // Getters and Setters
        public int getNo() {
            return no;
        }

        public void setNo(int no) {
            this.no = no;
        }

        public String getDate() {
            return date;
        }

        public void setDate(String date) {
            this.date = date;
        }

    public double getPayment() {
            return payment;
        }

    public void setPayment(double payment) {
            this.payment = payment;
        }

    public double getPrincipal() {
            return principal;
        }

    public void setPrincipal(double principal) {
            this.principal = principal;
        }

        public double getInterest() {
            return interest;
        }

        public void setInterest(double interest) {
            this.interest = interest;
        }

        public double getBalance() {
            return balance;
        }

        public void setBalance(double balance) {
            this.balance = balance;
        }

        public double getRent() {
            return rent;
        }

        public void setRent(double rent) {
            this.rent = rent;
        }

        public double getCashFlow() {
            return cashFlow;
        }

        public void setCashFlow(double cashFlow) {
            this.cashFlow = cashFlow;
        }

        public double getReserve() {
            return reserve;
        }

        public void setReserve(double reserve) {
            this.reserve = reserve;
        }
    }
}