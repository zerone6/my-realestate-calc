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
                // 디버깅을 위한 로그 추가te
                System.out.println("DEBUG - ALL REQUEST VALUES:");
                System.out.println("  price: " + request.getPrice());
                System.out.println("  totalPurchaseCost: " + request.getTotalPurchaseCost());
                System.out.println("  loan: " + request.getLoan());
                System.out.println("  rate: " + request.getRate());
                System.out.println("  term: " + request.getTerm());
                System.out.println("  rent: " + request.getRent());
                System.out.println("  expense: " + request.getExpense());
                System.out.println("  occupancyRate: " + request.getOccupancyRate());
                System.out.println("  ownCapital: " + request.getOwnCapital());

                // 클라이언트에서 서버로 이동한 계산 로직
                double totalPurchaseCost = request.getTotalPurchaseCost() * 10000; // 만원을 원으로 변환
                double purchasePrice = request.getPrice() * 10000; // 매입가만 원으로 변환 (표면 이익율 계산용)
                double loan = request.getLoan() * 10000;
                double i = request.getRate() / 100 / 12;
                int n = request.getTerm() * 12;

                // 월 상환금 계산
                double monthlyPayment = i == 0 ? loan / n : loan * i / (1 - Math.pow(1 + i, -n));

                // 연간 수익 계산 (입주율 반영) - 프론트엔드에서 이미 원 단위로 변환되어 옴
                double yearlyIncome = request.getRent() * 12 * (request.getOccupancyRate() / 100.0);

                // 연간 지출 계산 (이자 비용을 상환 스케줄에서 직접 계산하여 명확성 확보)
                double annualMaintenanceCost = request.getExpense(); // 프론트엔드에서 이미 원 단위로 변환되어 옴

                double monthlyInterestRate = request.getRate() / 100 / 12.0;
                int termInMonths = request.getTerm() * 12;

                double occupancyRate = request.getOccupancyRate() / 100.0;

                List<CalculationResult.RepaymentSchedule> repaymentSchedule = generateRepaymentSchedule(
                                request.getTerm() * 12,
                                loan,
                                monthlyPayment,
                                request.getRate() / 100.0,
                                request.getRent(), // 이미 원 단위
                                request.getStartDate(),
                                request.getRentFixedPeriod(),
                                request.getRentAdjustmentInterval(),
                                request.getRentAdjustmentRate(),
                                request.getOccupancyRate(),
                                request.getExpense()); // 이미 원 단위

                // 첫 12개월 동안의 이자 합계 계산
                double yearlyInterestCost = repaymentSchedule.stream()
                                .limit(12)
                                .mapToDouble(CalculationResult.RepaymentSchedule::getInterest)
                                .sum();

                // 연간 지출을 (유지비 + 연간 총 상환금)으로 계산
                double annualRepayment = monthlyPayment * 12;
                double yearlyCost = annualMaintenanceCost + annualRepayment;

                double yearlyProfit = yearlyIncome - yearlyCost;
                double yieldPercent = (totalPurchaseCost > 0) ? (yearlyProfit / totalPurchaseCost) * 100 : 0;

                // 표면 이익률 계산: 항상 매입가 대비 연간임대료로 계산 (자기자금 무관)
                double grossYield = (purchasePrice > 0) ? (yearlyIncome / purchasePrice) * 100 : 0;

                // 디버깅 정보 추가
                System.out.println("DEBUG - YIELD CALCULATIONS:");
                System.out.println("  yearlyIncome: " + yearlyIncome);
                System.out.println("  purchasePrice: " + purchasePrice);
                System.out.println("  totalPurchaseCost: " + totalPurchaseCost);
                System.out.println("  grossYield calculation: (" + yearlyIncome + " / " + purchasePrice + ") * 100 = "
                                + grossYield);
                System.out.println("  yieldPercent calculation: (" + yearlyProfit + " / " + totalPurchaseCost
                                + ") * 100 = " + yieldPercent);

                // 자기자본 대비 수익률 계산: 연간순이익 / 자기자본
                double ownCapital = (request.getOwnCapital() != null) ? request.getOwnCapital() * 10000 : 0; // 만원을 원으로
                                                                                                             // 변환
                double equityYield = (ownCapital > 0) ? (yearlyProfit / ownCapital) * 100 : 0;

                CalculationResult result = new CalculationResult(
                                String.valueOf(Math.round(monthlyPayment)),
                                String.valueOf(Math.round(yearlyIncome)),
                                String.valueOf(Math.round(yearlyCost)),
                                String.valueOf(Math.round(yearlyProfit)),
                                String.format("%.1f", yieldPercent),
                                String.format("%.1f", grossYield),
                                String.format("%.1f", equityYield),
                                repaymentSchedule);

                result.setGrossYield(String.format("%.1f", grossYield));
                result.setYieldPercent(String.format("%.1f", yieldPercent));
                result.setEquityYield(String.format("%.1f", equityYield));

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

                // startDate가 null인 경우 현재 날짜를 사용
                LocalDate startLocalDate = (startDate != null && !startDate.isEmpty())
                                ? LocalDate.parse(startDate)
                                : LocalDate.now();

                for (int j = 1; j <= n; j++) {
                        double interest = remaining * monthlyInterestRate;
                        double principal = monthlyPayment - interest;
                        remaining -= principal;

                        LocalDate date = startLocalDate.plusMonths((long) j - 1);
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