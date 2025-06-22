package com.realestate.calc.service;

import com.realestate.calc.dto.CalculationRequest;
import com.realestate.calc.dto.CalculationResult;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class CalculationService {

        public CalculationResult calculate(CalculationRequest request) {
                // 클라이언트에서 서버로 이동한 계산 로직
                double price = request.getPrice() * 10000;
                double loan = request.getLoan() * 10000;
                double i = request.getRate() / 100 / 12;
                int n = request.getTerm() * 12;

                // 월 상환금 계산
                double monthlyPayment = i == 0 ? loan / n : loan * i / (1 - Math.pow(1 + i, -n));

                // 연간 수익 계산
                double yearlyIncome = request.getRent() * 12;
                // 연간 비용 = 유지비 + 이자 비용 (원금 상환은 비용이 아님)
                double yearlyInterestCost = 0;
                double remaining = loan;
                for (int j = 1; j <= 12; j++) {
                        double interest = remaining * i;
                        double principal = monthlyPayment - interest;
                        yearlyInterestCost += interest;
                        remaining -= principal;
                }
                double yearlyCost = request.getExpense() + yearlyInterestCost;
                double yearlyProfit = yearlyIncome - yearlyCost;
                double yieldPercent = (yearlyProfit / price) * 100;
                double grossYield = (yearlyIncome / price) * 100;

                // 상환 일정표 생성
                List<CalculationResult.RepaymentSchedule> repaymentSchedule = generateRepaymentSchedule(
                                loan, i, n, monthlyPayment, request.getStartDate());

                return new CalculationResult(
                                String.valueOf(Math.round(monthlyPayment)),
                                String.valueOf(Math.round(yearlyIncome)),
                                String.valueOf(Math.round(yearlyCost)),
                                String.valueOf(Math.round(yearlyProfit)),
                                String.format("%.2f", yieldPercent),
                                String.format("%.2f", grossYield),
                                repaymentSchedule);
        }

        private List<CalculationResult.RepaymentSchedule> generateRepaymentSchedule(
                        double loan, double i, int n, double monthlyPayment, String startDateStr) {

                List<CalculationResult.RepaymentSchedule> schedule = new ArrayList<>();
                LocalDate startDate = startDateStr != null && !startDateStr.isEmpty()
                                ? LocalDate.parse(startDateStr)
                                : LocalDate.now();

                double remaining = loan;

                for (int j = 1; j <= n; j++) {
                        double interest = remaining * i;
                        double principal = monthlyPayment - interest;
                        remaining -= principal;

                        LocalDate date = startDate.plusMonths(j - 1);
                        String dateStr = date.format(DateTimeFormatter.ISO_LOCAL_DATE);

                        schedule.add(new CalculationResult.RepaymentSchedule(
                                        j,
                                        dateStr,
                                        (int) Math.round(monthlyPayment),
                                        (int) Math.round(principal),
                                        (int) Math.round(interest),
                                        (int) Math.round(remaining)));
                }

                return schedule;
        }
}