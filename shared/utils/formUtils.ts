import { FormInputData, CalculationRequest } from '../types/RealEstateForm'
import { safeParseFloat, safeParseInt } from './validation'

/**
 * 폼 입력 데이터를 API 요청 형태로 변환
 */
export function convertFormToRequest(form: FormInputData): CalculationRequest {
    const totalPurchaseCost = calculateTotalPurchaseCost(form)
    const ownCapital = safeParseFloat(form.ownCapital)
    
    // 대출금액 계산 (만엔 단위)
    const loan = Math.max(0, totalPurchaseCost - ownCapital)
    
    // 월세를 円 단위로 변환 (form.rent는 만円 단위)
    const monthlyRentInYen = safeParseFloat(form.rent) * 10000 // 万円 → 円 변환
    const annualRent = monthlyRentInYen * 12 // 円 단위
    
    const managementFeeFromRate = annualRent * (safeParseFloat(form.managementFeeRate) / 100) // 円 단위
    const managementFeeFromAmount = safeParseFloat(form.managementFee) * 10000 // 万円 → 円 변환
    const maintenanceFeeFromRate = annualRent * (safeParseFloat(form.maintenanceFeeRate) / 100) // 円 단위
    const maintenanceFeeFromAmount = safeParseFloat(form.maintenanceFee) * 10000 // 万円 → 円 변환
    const insuranceAmount = safeParseFloat(form.insurance) * 10000 // 万円 → 円 변환
    const otherExpensesAmount = safeParseFloat(form.otherExpenses) * 10000 // 万円 → 円 변환
    
    const totalMaintenanceCost = 
        safeParseFloat(form.propertyTax) * 10000 + // 고정자산세 (万円 → 円)
        Math.max(managementFeeFromRate, managementFeeFromAmount) + // 관리비 (모두 円 단위)
        Math.max(maintenanceFeeFromRate, maintenanceFeeFromAmount) + // 수선비 (모두 円 단위)
        insuranceAmount + // 보험료 (円 단위)
        otherExpensesAmount // 기타경비 (円 단위)

    return {
        name: form.name,
        price: safeParseFloat(form.price),
        loan: loan,
        rate: safeParseFloat(form.rate),
        term: safeParseInt(form.term),
        rent: monthlyRentInYen, // 円 단위로 변환된 월세
        occupancyRate: safeParseFloat(form.occupancyRate),
        expense: totalMaintenanceCost,
        startDate: form.startDate,
        rentFixedPeriod: safeParseInt(form.rentFixedPeriod),
        rentAdjustmentInterval: safeParseInt(form.rentAdjustmentInterval),
        rentAdjustmentRate: safeParseFloat(form.rentAdjustmentRate)
    }
}

/**
 * 기본 폼 데이터 생성
 */
export function createDefaultFormData(): FormInputData {
    return {
        // 첫 번째 블럭: 물건 정보
        name: '',
        price: '0',
        grossYield: '6.0',
        structure: '목조',
        buildingAge: '22',
        buildingArea: '0',
        ownCapital: '0',
        buildingPrice: '0',
        occupancyRate: '100',

        // 두 번째 블럭: 대출 정보
        rate: '2.0',
        term: '35',
        startDate: new Date().toISOString().split('T')[0],

        // 세 번째 블럭: 수익 및 유지비
        rent: '0',
        rentFixedPeriod: '1',
        rentAdjustmentInterval: '1',
        rentAdjustmentRate: '0',

        // 수익 및 유지비 추가 항목들
        propertyTax: '0',
        managementFeeRate: '0',
        managementFee: '0',
        maintenanceFeeRate: '0',
        maintenanceFee: '0',
        insurance: '0',
        otherExpenses: '0',

        // 네 번째 블럭: 제비용 세부항목
        brokerageFee: '0',
        registrationFee: '0',
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
    return (annualRent / (price * 10000)) * 100
}
