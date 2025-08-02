/**
 * 월세 조정 계산 유틸리티
 * 
 * 월세 계산 로직:
 * 1. 월세 고정 기간(rentFixedPeriod) 동안은 초기 월세(initialRent)를 유지
 * 2. 월세 고정 기간 이후부터는 월세 조정 시기(rentAdjustmentInterval)마다
 *    월세 조정 비율(rentAdjustmentRate)만큼 월세를 낮춤
 * 3. 예시: 
 *    - 초기 월세: 100,000円
 *    - 월세 고정 기간: 3년
 *    - 월세 조정 시기: 2년
 *    - 월세 조정 비율: 5%
 *    - 결과: 1-3년: 100,000円, 4-5년: 95,000円, 6-7년: 90,250円, ...
 */

export interface RentAdjustmentParams {
    initialRent: number; // 초기 월세 (円)
    rentFixedPeriod: number; // 월세 고정 기간 (년)
    rentAdjustmentInterval: number; // 월세 조정 시기 (년)
    rentAdjustmentRate: number; // 월세 조정 비율 (%)
}

/**
 * 특정 연도의 월세를 계산합니다.
 * @param year 계산할 연도 (1부터 시작)
 * @param params 월세 조정 파라미터
 * @returns 해당 연도의 월세 (円)
 */
export function calculateRentForYear(year: number, params: RentAdjustmentParams): number {
    const { initialRent, rentFixedPeriod, rentAdjustmentInterval, rentAdjustmentRate } = params;

    // 월세 고정 기간 내에는 초기 월세 유지
    if (year <= rentFixedPeriod) {
        return initialRent;
    }

    // 월세 고정 기간 이후부터 조정 계산
    const yearsAfterFixedPeriod = year - rentFixedPeriod;
    const adjustmentCount = Math.floor(yearsAfterFixedPeriod / rentAdjustmentInterval);

    // 조정 횟수만큼 월세를 낮춤 (복리 계산)
    const adjustmentMultiplier = Math.pow(1 - rentAdjustmentRate / 100, adjustmentCount);

    return Math.round(initialRent * adjustmentMultiplier);
}

/**
 * 연도별 월세 변화를 계산합니다.
 * @param totalYears 계산할 총 연도 수
 * @param params 월세 조정 파라미터
 * @returns 연도별 월세 배열 (인덱스 0부터 시작, 각 요소는 해당 연도의 월세)
 */
export function calculateRentSchedule(totalYears: number, params: RentAdjustmentParams): number[] {
    const rentSchedule: number[] = [];

    for (let year = 1; year <= totalYears; year++) {
        rentSchedule.push(calculateRentForYear(year, params));
    }

    return rentSchedule;
}

/**
 * 연간 임대료 수익을 계산합니다.
 * @param year 계산할 연도
 * @param params 월세 조정 파라미터
 * @returns 해당 연도의 연간 임대료 수익 (円)
 */
export function calculateAnnualRentIncome(year: number, params: RentAdjustmentParams): number {
    const monthlyRent = calculateRentForYear(year, params);
    return monthlyRent * 12;
}

/**
 * 전체 기간의 총 임대료 수익을 계산합니다.
 * @param totalYears 계산할 총 연도 수
 * @param params 월세 조정 파라미터
 * @returns 전체 기간의 총 임대료 수익 (円)
 */
export function calculateTotalRentIncome(totalYears: number, params: RentAdjustmentParams): number {
    let totalIncome = 0;

    for (let year = 1; year <= totalYears; year++) {
        totalIncome += calculateAnnualRentIncome(year, params);
    }

    return totalIncome;
}

/**
 * 월세 조정 정보를 문자열로 반환합니다 (디버깅용).
 * @param params 월세 조정 파라미터
 * @returns 월세 조정 정보 문자열
 */
export function getRentAdjustmentInfo(params: RentAdjustmentParams): string {
    const { initialRent, rentFixedPeriod, rentAdjustmentInterval, rentAdjustmentRate } = params;

    return `월세 조정 정보:
- 초기 월세: ${initialRent.toLocaleString()}円
- 월세 고정 기간: ${rentFixedPeriod}년
- 월세 조정 시기: ${rentAdjustmentInterval}년마다
- 월세 조정 비율: ${rentAdjustmentRate}%`;
}
