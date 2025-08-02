package com.realestate.calc.dto;

import java.util.List;

public class CalculationResult {
    private String monthlyPayment;
    private String yearlyIncome;
    private String yearlyCost;
    private String yearlyProfit;
    private String yieldPercent;
    private String grossYield;
    private List<RepaymentSchedule> repaymentSchedule; // schedule → repaymentSchedule 변경

    public CalculationResult() {
    }

    public CalculationResult(String monthlyPayment, String yearlyIncome, String yearlyCost,
            String yearlyProfit, String yieldPercent, String grossYield,
            List<RepaymentSchedule> repaymentSchedule) {
        this.monthlyPayment = monthlyPayment;
        this.yearlyIncome = yearlyIncome;
        this.yearlyCost = yearlyCost;
        this.yearlyProfit = yearlyProfit;
        this.yieldPercent = yieldPercent;
        this.grossYield = grossYield;
        this.repaymentSchedule = repaymentSchedule;
    }

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

    public List<RepaymentSchedule> getRepaymentSchedule() {
        return repaymentSchedule;
    }

    public void setRepaymentSchedule(List<RepaymentSchedule> repaymentSchedule) {
        this.repaymentSchedule = repaymentSchedule;
    }

    public static class RepaymentSchedule {
        private int no;
        private String date;
        private int payment;
        private int principal;
        private double interest;
        private double balance;
        private double estimatedMonthlyRent;
        private double cashFlow;

        public RepaymentSchedule() {
        }

        public RepaymentSchedule(int no, String date, int payment, int principal, double interest, double balance,
                double estimatedMonthlyRent) {
            this.no = no;
            this.date = date;
            this.payment = payment;
            this.principal = principal;
            this.interest = interest;
            this.balance = balance;
            this.estimatedMonthlyRent = estimatedMonthlyRent;
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

        public int getPayment() {
            return payment;
        }

        public void setPayment(int payment) {
            this.payment = payment;
        }

        public int getPrincipal() {
            return principal;
        }

        public void setPrincipal(int principal) {
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

        public double getEstimatedMonthlyRent() {
            return estimatedMonthlyRent;
        }

        public void setEstimatedMonthlyRent(double estimatedMonthlyRent) {
            this.estimatedMonthlyRent = estimatedMonthlyRent;
        }

        public double getCashFlow() {
            return cashFlow;
        }

        public void setCashFlow(double cashFlow) {
            this.cashFlow = cashFlow;
        }
    }
}