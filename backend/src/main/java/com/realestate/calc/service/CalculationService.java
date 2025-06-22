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

                // 연간 수익 계산 (입주율 반영)
                double yearlyIncome = request.getRent() * 12 * (request.getOccupancyRate() / 100.0);

                // 연간 지출 계산 (이자 비용을 상환 스케줄에서 직접 계산하여 명확성 확보)
                double annualMaintenanceCost = request.getExpense(); // 프론트엔드에서 계산된 연간 유지비 (円)

                double monthlyInterestRate = request.getRate() / 100 / 12.0;
                int termInMonths = request.getTerm() * 12;

                double occupancyRate = request.getOccupancyRate() / 100.0;
                double monthlyMaintenanceExpense = request.getExpense() / 12.0;

                List<CalculationResult.RepaymentSchedule> repaymentSchedule = generateRepaymentSchedule(
                                request.getTerm() * 12,
                                loan,
                                monthlyPayment,
                                request.getRate() / 100.0,
                                request.getRent(),
                                request.getStartDate(),
                                request.getRentFixedPeriod(),
                                request.getRentAdjustmentInterval(),
                                request.getRentAdjustmentRate(),
                                request.getOccupancyRate(),
                                request.getExpense());

                // 첫 12개월 동안의 이자 합계 계산
                double yearlyInterestCost = repaymentSchedule.stream()
                                .limit(12)
                                .mapToDouble(CalculationResult.RepaymentSchedule::getInterest)
                                .sum();

                // 연간 지출을 (유지비 + 연간 총 상환금)으로 계산
                double annualRepayment = monthlyPayment * 12;
                double yearlyCost = annualMaintenanceCost + annualRepayment;

                double yearlyProfit = yearlyIncome - yearlyCost;
                double yieldPercent = (price > 0) ? (yearlyProfit / price) * 100 : 0;
                double grossYield = (price > 0) ? (yearlyIncome / price) * 100 : 0;

                CalculationResult result = new CalculationResult(
                                String.valueOf(Math.round(monthlyPayment)),
                                String.valueOf(Math.round(yearlyIncome)),
                                String.valueOf(Math.round(yearlyCost)),
                                String.valueOf(Math.round(yearlyProfit)),
                                String.format("%.1f", yieldPercent),
                                String.format("%.1f", grossYield),
                                repaymentSchedule);

                result.setGrossYield(String.format("%.1f", grossYield));
                result.setYieldPercent(String.format("%.1f", yieldPercent));

                return result;
        }

        private List<CalculationResult.RepaymentSchedule> generateRepaymentSchedule(
                        int n, double loan, double monthlyPayment, double annualRate, double initialRent,
                        String startDate, int rentFixedPeriod, int rentAdjustmentInterval, double rentAdjustmentRate,
                        double occupancyRate, double annualMaintenanceCost) {

                List<CalculationResult.RepaymentSchedule> schedule = new ArrayList<>();
                double monthlyInterestRate = annualRate / 12.0;
                double remaining = loan;
                double currentRent = initialRent;

                double monthlyMaintenanceExpense = annualMaintenanceCost / 12.0;
                double occupancyRateDecimal = occupancyRate / 100.0;

                for (int j = 1; j <= n; j++) {
                        double interest = remaining * monthlyInterestRate;
                        double principal = monthlyPayment - interest;
                        remaining -= principal;

                        LocalDate date = LocalDate.parse(startDate).plusMonths(j - 1);
                        String dateStr = date.format(DateTimeFormatter.ISO_LOCAL_DATE);

                        CalculationResult.RepaymentSchedule scheduleItem = new CalculationResult.RepaymentSchedule(
                                        j,
                                        dateStr,
                                        (int) Math.round(monthlyPayment),
                                        (int) Math.round(principal),
                                        (int) Math.round(interest),
                                        (int) Math.round(remaining),
                                        (int) Math.round(currentRent));

                        double cashFlow = (currentRent * occupancyRateDecimal) - monthlyPayment
                                        - monthlyMaintenanceExpense;
                        scheduleItem.setCashFlow(cashFlow);

                        schedule.add(scheduleItem);

                        // Rent adjustment
                        if (j > rentFixedPeriod * 12) {
                                int monthsSinceFixedPeriodEnd = j - (rentFixedPeriod * 12);
                                if (monthsSinceFixedPeriodEnd > 0
                                                && monthsSinceFixedPeriodEnd % (rentAdjustmentInterval * 12) == 1) {
                                        // 조정 주기의 첫 달에만 월세를 조정합니다.
                                        currentRent *= (1 - (rentAdjustmentRate / 100.0));
                                }
                        }
                }

                return schedule;
        }
}