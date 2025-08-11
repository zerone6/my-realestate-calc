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

        private static class ScheduleParams {
                int months;
                double loan;
                double monthlyPayment;
                double annualRate;
                double initialRent;
                String startDate;
                int rentFixedPeriod;
                int rentAdjustmentInterval;
                double rentAdjustmentRate;
                double occupancyRate;
                double monthlyNonReserveExpense;
                double monthlyReserveExpense;
        }

        public CalculationResult calculate(CalculationRequest request) {
                // 요청 파라미터는 컨트롤러 레벨에서 검증됨

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

                // 파생 값 계산 준비

                double annualReserveExpense = (request.getReserveExpense() != null) ? request.getReserveExpense() : 0.0;
                double annualNonReserveExpense;
                if (request.getNonReserveExpense() != null) {
                        annualNonReserveExpense = request.getNonReserveExpense();
                } else if (request.getExpense() != null) {
                        annualNonReserveExpense = request.getExpense() - annualReserveExpense;
                } else {
                        annualNonReserveExpense = 0.0;
                }

                ScheduleParams params = new ScheduleParams();
                params.months = request.getTerm() * 12;
                params.loan = loan;
                params.monthlyPayment = monthlyPayment;
                params.annualRate = request.getRate() / 100.0;
                params.initialRent = request.getRent();
                params.startDate = request.getStartDate();
                params.rentFixedPeriod = request.getRentFixedPeriod();
                params.rentAdjustmentInterval = request.getRentAdjustmentInterval();
                params.rentAdjustmentRate = request.getRentAdjustmentRate();
                params.occupancyRate = request.getOccupancyRate();
                params.monthlyNonReserveExpense = annualNonReserveExpense / 12.0;
                params.monthlyReserveExpense = annualReserveExpense / 12.0;

                List<CalculationResult.RepaymentSchedule> repaymentSchedule = generateRepaymentSchedule(params);

                // 첫 12개월 동안의 이자 합계 계산
                // 첫 해 이자합계 등은 별도 탭에서 집계하므로 여기서 사용하지 않음

                // 연간 지출을 (유지비 + 연간 총 상환금)으로 계산
                double annualRepayment = monthlyPayment * 12;
                double yearlyCost = annualMaintenanceCost + annualRepayment;

                double yearlyProfit = yearlyIncome - yearlyCost;
                double yieldPercent = (totalPurchaseCost > 0) ? (yearlyProfit / totalPurchaseCost) * 100 : 0;

                // 표면 이익률 계산: 항상 매입가 대비 연간임대료로 계산 (자기자금 무관)
                double grossYield = (purchasePrice > 0) ? (yearlyIncome / purchasePrice) * 100 : 0;

                // 디버깅 로그 제거

                // 자기자본 대비 수익률 계산: 연간순이익 / 자기자본
                double ownCapital = (request.getOwnCapital() != null) ? request.getOwnCapital() * 10000 : 0; // 만원을 원으로
                                                                                                             // 변환
                double equityYield = (ownCapital > 0) ? (yearlyProfit / ownCapital) * 100 : 0;

                CalculationResult result = new CalculationResult();
                result.setMonthlyPayment(String.valueOf(Math.round(monthlyPayment)));
                result.setYearlyIncome(String.valueOf(Math.round(yearlyIncome)));
                result.setYearlyCost(String.valueOf(Math.round(yearlyCost)));
                result.setYearlyProfit(String.valueOf(Math.round(yearlyProfit)));
                result.setYieldPercent(String.format("%.1f", yieldPercent));
                result.setGrossYield(String.format("%.1f", grossYield));
                result.setEquityYield(String.format("%.1f", equityYield));
                result.setRepaymentSchedule(repaymentSchedule);

                return result;
        }

        private List<CalculationResult.RepaymentSchedule> generateRepaymentSchedule(ScheduleParams p) {

                List<CalculationResult.RepaymentSchedule> schedule = new ArrayList<>();
                double monthlyInterestRate = p.annualRate / 12.0;
                double remaining = p.loan;
                double currentRent = p.initialRent;

                double occupancyRateDecimal = p.occupancyRate / 100.0;

                // startDate가 null인 경우 현재 날짜를 사용
                LocalDate startLocalDate = (p.startDate != null && !p.startDate.isEmpty())
                                ? LocalDate.parse(p.startDate)
                                : LocalDate.now();

                for (int j = 1; j <= p.months; j++) {
                        double interest = remaining * monthlyInterestRate;
                        double principal = p.monthlyPayment - interest;
                        remaining = clampRemaining(remaining - principal);

                        LocalDate date = startLocalDate.plusMonths((long) j - 1);
                        String dateStr = date.format(DateTimeFormatter.ISO_LOCAL_DATE);

                        // 유효 월세: 입주율을 반영한 월세를 스케줄에 표시
                        double effectiveRent = round2(currentRent * occupancyRateDecimal);

                        CalculationResult.RepaymentSchedule scheduleItem = new CalculationResult.RepaymentSchedule(
                                        j,
                                        dateStr,
                                        round2(p.monthlyPayment),
                                        round2(principal),
                                        round2(interest),
                                        round2(remaining),
                                        round2(effectiveRent));

                        // 장기수선적립: 별도 전달된 월 적립금 사용
                        double monthlyReserve = round2(p.monthlyReserveExpense);
                        scheduleItem.setReserve(round2(monthlyReserve));

                        double cashFlow = effectiveRent - round2(p.monthlyPayment)
                                        - round2(p.monthlyNonReserveExpense) - monthlyReserve;
                        cashFlow = round2(cashFlow);
                        scheduleItem.setCashFlow(cashFlow);

                        schedule.add(scheduleItem);

                        if (isRentAdjustmentMonth(j, p)) {
                                currentRent *= (1 - (p.rentAdjustmentRate / 100.0));
                        }
                }

                return schedule;
        }

        private double round2(double v) {
                return Math.round(v * 100.0) / 100.0;
        }

        private double clampRemaining(double value) {
                if (value < 0 && Math.abs(value) < 1) {
                        return 0;
                }
                return value;
        }

        private boolean isRentAdjustmentMonth(int monthIndex, ScheduleParams p) {
                int fixedMonths = p.rentFixedPeriod * 12;
                if (monthIndex <= fixedMonths)
                        return false;
                if (p.rentAdjustmentInterval <= 0)
                        return false;
                if (p.rentAdjustmentRate == 0)
                        return false;
                int monthsSinceEnd = monthIndex - fixedMonths;
                int intervalMonths = p.rentAdjustmentInterval * 12;
                if (monthsSinceEnd <= 0 || intervalMonths <= 0)
                        return false;
                return monthsSinceEnd % intervalMonths == 1;
        }
}