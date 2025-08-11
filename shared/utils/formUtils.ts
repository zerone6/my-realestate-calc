import { FormInputData, CalculationRequest } from '../types/RealEstateForm'
import { safeParseFloat, safeParseInt } from './validation'

/**
 * 폼 입력 데이터를 API 요청 형태로 변환
 */
export function convertFormToRequest(form: FormInputData): CalculationRequest {
    const totalPurchaseCost = calculateTotalPurchaseCost(form)
    // ownCapital 입력이 비어있는 경우에만 기본값(총 매입비용의 10%) 적용
    const hasOwnCapitalInput = typeof form.ownCapital === 'string' && form.ownCapital.trim() !== ''
    let ownCapital = hasOwnCapitalInput
        ? safeParseFloat(form.ownCapital)            // 사용자가 명시 입력 (0 포함) → 그대로 사용
        : totalPurchaseCost * 0.1                    // 미입력(빈문자열)일 때만 10% 기본값
    // 하한 0 보장
    ownCapital = Math.max(0, ownCapital)
    
    // 대출금액 계산 (만엔 단위) - 0도 허용 (@PositiveOrZero)
    const loan = Math.max(0, totalPurchaseCost - ownCapital)
    
    // 월세를 円 단위로 변환 (form.rent는 만円 단위)
    const monthlyRentInYen = safeParseFloat(form.rent) * 10000 // 万円 → 円 변환
    const annualRent = monthlyRentInYen * 12 // 円 단위
    
    const managementFeeFromRateAnnual = annualRent * (safeParseFloat(form.managementFeeRate) / 100) // 円/년
    const managementFeeFromAmountAnnual = safeParseFloat(form.managementFee) * 10000 * 12 // 万円(월) → 円/년
    // 관리수수료 (신규): 관리비와 동일한 방식으로 월 기준 계산 후 연 환산
    const commissionFromRateAnnual = annualRent * (safeParseFloat(form.managementCommissionRate) / 100)
    const commissionFromAmountAnnual = safeParseFloat(form.managementCommissionFee) * 10000 * 12
    const maintenanceFeeFromRateAnnual = annualRent * (safeParseFloat(form.maintenanceFeeRate) / 100) // 円/년
    const maintenanceFeeFromAmountAnnual = safeParseFloat(form.maintenanceFee) * 10000 * 12 // 万円(월) → 円/년
    const insuranceAmount = safeParseFloat(form.insurance) * 10000 // 万円 → 円 변환
    const otherExpensesAmount = safeParseFloat(form.otherExpenses) * 10000 // 万円 → 円 변환
    
    const totalMaintenanceCost = 
        safeParseFloat(form.propertyTax) * 10000 + // 고정자산세 (万円 → 円)
        Math.max(managementFeeFromRateAnnual, managementFeeFromAmountAnnual) + // 관리비 (연간 円)
        Math.max(commissionFromRateAnnual, commissionFromAmountAnnual) + // 관리수수료 (연간 円)
        Math.max(maintenanceFeeFromRateAnnual, maintenanceFeeFromAmountAnnual) + // 수선비/장기수선 적립 (연간 円)
        insuranceAmount + // 보험료 (円 단위)
        otherExpensesAmount // 기타경비 (円 단위)

    // 장기수선적립(수선비)과 기타비용 분리
    const annualReserveExpense = Math.max(maintenanceFeeFromRateAnnual, maintenanceFeeFromAmountAnnual)
    const annualNonReserveExpense = totalMaintenanceCost - annualReserveExpense

    return {
        name: form.name,
        price: safeParseFloat(form.price),
        totalPurchaseCost: totalPurchaseCost,
        ownCapital: ownCapital,
        loan: loan,
        rate: safeParseFloat(form.rate),
        term: safeParseInt(form.term),
        rent: monthlyRentInYen, // 円 단위로 변환된 월세
        grossYield: safeParseFloat(form.grossYield), // 사용자가 입력한 표면 이익률
        occupancyRate: safeParseFloat(form.occupancyRate),
    expense: totalMaintenanceCost,
    nonReserveExpense: annualNonReserveExpense,
    reserveExpense: annualReserveExpense,
        startDate: form.startDate,
        rentFixedPeriod: safeParseInt(form.rentFixedPeriod),
        rentAdjustmentInterval: safeParseInt(form.rentAdjustmentInterval),
        rentAdjustmentRate: safeParseFloat(form.rentAdjustmentRate)
    }
}

/**
 * 기본 폼 데이터 생성 (README 문서의 기본값 반영)
 */
export function createDefaultFormData(): FormInputData {
    return {
        // 첫 번째 블럭: 물건 정보 (README 기본값 적용)
        name: '네리마',
        price: '6000', // 기본 매입가격 6000만원
        grossYield: '6.0',
        structure: '목조',
        buildingAge: '22',
        buildingArea: '100', // 건물면적 예시값
        ownCapital: '0', // 자기자금은 자동 계산될 예정
        buildingPrice: '0', // 매입가격 입력 시 자동 계산
        occupancyRate: '100', // 입주율 100%로 수정

        // 두 번째 블럭: 대출 정보
        rate: '2.0',
        term: '35',
        startDate: new Date().toISOString().split('T')[0],

        // 세 번째 블럭: 수익 및 유지비 (README 기본값 적용)
        rent: '25', // 월세 수익 예시값 (만엔)
        rentFixedPeriod: '1',
        rentAdjustmentInterval: '1',
        rentAdjustmentRate: '0',

        // 수익 및 유지비 추가 항목들 (README 공식에 따른 기본값)
        propertyTax: '0', // 자동 계산될 예정
    managementFeeRate: '5', // 매달 임대료의 5%
    managementFee: '0',
    managementCommissionRate: '5', // 기본 5%
    managementCommissionFee: '0',
    maintenanceFeeRate: '10', // 기본 10%
        maintenanceFee: '0',
        insurance: '0', // 보험료 기본값 0으로 수정
        otherExpenses: '0',

        // 네 번째 블럭: 제비용 세부항목 (자동 계산될 예정)
        brokerageFee: '0', // 자동 계산: (매매가격 × 3%) + 6만엔 + 소비세
        registrationFee: '0', // 자동 계산: 구매 금액의 0.8% + 10만엔
        acquisitionTax: '0',
        stampDuty: '0',
        loanFee: '0',
        surveyFee: '0',
        miscellaneousFees: '0'
    }
}

/**
 * 총 매입비용 계산 (매입가 + 제비용)
 */
export function calculateTotalPurchaseCost(form: FormInputData): number {
    const price = safeParseFloat(form.price)
    const acquisitionCosts = [
        form.brokerageFee,
        form.registrationFee,
        form.acquisitionTax,
        form.stampDuty,
        form.loanFee,
        form.surveyFee,
        form.miscellaneousFees
    ].reduce((sum, cost) => sum + safeParseFloat(cost), 0)
    
    return price + acquisitionCosts
}

/**
 * 대출금액 계산
 */
export function calculateLoanAmount(form: FormInputData): number {
    const totalCost = calculateTotalPurchaseCost(form)
    const ownCapital = safeParseFloat(form.ownCapital)
    return Math.max(0, totalCost - ownCapital)
}

/**
 * 표면 수익률 계산
 */
export function calculateGrossYield(form: FormInputData): number {
    const price = safeParseFloat(form.price)
    const rent = safeParseFloat(form.rent)
    
    if (price <= 0) return 0
    
    const annualRent = rent * 12
    // 표면 이익율은 매입가만 기준으로 계산 (매입가는 만원 단위이므로 10000을 곱해서 원 단위로 변환)
    return (annualRent / (price * 10000)) * 100
}

/**
 * 건물가격 자동 계산 (매입가격의 25%)
 */
export function calculateBuildingPrice(price: number): number {
    return price * 0.25
}

/**
 * 중개수수료 자동 계산
 * 공식: (매매가격 × 3%) + 6만엔 + 소비세(합계금액의 10%)
 */
export function calculateBrokerageFee(price: number): number {
    const baseFee = price * 0.03 + 6 // 만엔 단위
    const withTax = baseFee * 1.1 // 소비세 10% 추가
    return Math.round(withTax * 100) / 100 // 소수점 둘째자리까지
}

/**
 * 등기비 자동 계산
 * - 소유권 이전 등기: 구매 금액의 0.4%
 * - 저당권 설정 등기: 구매 금액의 0.4%
 * - 추가 등기비: +10만엔
 */
export function calculateRegistrationFee(price: number): number {
    const ownershipTransfer = price * 0.004 // 0.4%
    const mortgageRegistration = price * 0.004 // 0.4%
    const additionalFee = 10 // 10만엔
    return ownershipTransfer + mortgageRegistration + additionalFee
}

/**
 * 부동산 취득세 자동 계산
 * - 건물: (건물가격 × 70% - 1200만엔) × 3%
 * - 토지: ((매입가격 - 건물가격) × 70% × 50%) × 3%
 * - 합계: 건물 + 토지 취득세
 */
export function calculateAcquisitionTax(price: number, buildingPrice: number): number {
    // 건물 취득세
    const buildingTaxableValue = Math.max(0, buildingPrice * 0.7 - 1200) // 1200만엔 공제
    const buildingTax = buildingTaxableValue * 0.03
    
    // 토지 취득세
    const landPrice = price - buildingPrice
    const landTaxableValue = landPrice * 0.7 * 0.5 // 70% × 50% 감면
    const landTax = landTaxableValue * 0.03
    
    return buildingTax + landTax
}

/**
 * 고정자산세 자동 계산 (건물만, 토지 제외)
 * - 건물: 건물가격 × 70% × 1.4%
 */
export function calculatePropertyTax(buildingPrice: number): number {
    // 건물 고정자산세만 계산 (토지 제외)
    const buildingTaxableValue = buildingPrice * 0.7 // 70% 평가
    const buildingTax = buildingTaxableValue * 0.014 // 1.4%
    
    return buildingTax
}

/**
 * 관리비 자동 계산 (매달 임대료의 5%)
 */
export function calculateManagementFee(monthlyRent: number): number {
    return monthlyRent * 0.05
}

/**
 * 수선비 자동 계산 (매달 임대료의 5%)
 */
export function calculateMaintenanceFee(monthlyRent: number): number {
    return monthlyRent * 0.05
}

/**
 * 제비용 합계 계산
 */
export function calculateTotalAcquisitionCosts(form: FormInputData): number {
    return [
        form.brokerageFee,
        form.registrationFee,
        form.acquisitionTax,
        form.stampDuty,
        form.loanFee,
        form.surveyFee,
        form.miscellaneousFees
    ].reduce((sum, cost) => sum + safeParseFloat(cost), 0)
}

/**
 * 자기자금 계산
 * 공식: 매입가격 - 대출금액 + 제비용합계
 */
export function calculateSelfCapital(price: number, loanAmount: number, acquisitionCosts: number): number {
    return price - loanAmount + acquisitionCosts
}

/**
 * 총 매입비용 계산
 * 공식: 매입가격 + 제비용합계
 */
export function calculateTotalPurchaseCostFromComponents(price: number, acquisitionCosts: number): number {
    return price + acquisitionCosts
}

/**
 * 폼 데이터 자동 계산 업데이트
 * 매입가격이나 관련 값이 변경될 때 자동으로 계산되는 값들을 업데이트
 */
export function updateCalculatedFields(form: FormInputData): FormInputData {
    const price = safeParseFloat(form.price)
    const rent = safeParseFloat(form.rent)
    
    // 건물가격 자동 계산 (매입가격의 25%)
    const calculatedBuildingPrice = calculateBuildingPrice(price)
    
    // 제비용 자동 계산
    const calculatedBrokerageFee = calculateBrokerageFee(price)
    const calculatedRegistrationFee = calculateRegistrationFee(price)
    
    // 부동산 취득세 자동 계산
    const calculatedAcquisitionTax = calculateAcquisitionTax(price, calculatedBuildingPrice)
    
    // 고정자산세 자동 계산 (건물만)
    const calculatedPropertyTax = calculatePropertyTax(calculatedBuildingPrice)
    
    // 관리비/수선비 자동 계산 (비율이 설정된 경우)
    const managementFeeRate = safeParseFloat(form.managementFeeRate)
    const maintenanceFeeRate = safeParseFloat(form.maintenanceFeeRate)
    
    return {
        ...form,
        buildingPrice: calculatedBuildingPrice.toString(),
        brokerageFee: calculatedBrokerageFee.toString(),
        registrationFee: calculatedRegistrationFee.toString(),
        acquisitionTax: calculatedAcquisitionTax.toString(),
        propertyTax: calculatedPropertyTax.toString(),
        // 비율이 설정된 경우에만 자동 계산
        ...(managementFeeRate > 0 && { managementFee: calculateManagementFee(rent).toString() }),
        ...(maintenanceFeeRate > 0 && { maintenanceFee: calculateMaintenanceFee(rent).toString() })
    }
}
