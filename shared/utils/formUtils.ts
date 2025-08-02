import { FormInputData, CalculationRequest } from '../types/RealEstateForm'
import { safeParseFloat, safeParseInt } from './validation'

/**
 * 폼 입력 데이터를 API 요청 형태로 변환
 */
export function convertFormToRequest(form: FormInputData): CalculationRequest {
    const price = safeParseFloat(form.price)
    const ownCapital = safeParseFloat(form.ownCapital)
    
    // 대출금액 계산 (만엔 단위)
    const loan = Math.max(0, price - ownCapital)
    
    // 연간 유지비 계산
    const annualRent = safeParseFloat(form.rent) * 12
    const managementFeeFromRate = annualRent * (safeParseFloat(form.managementFeeRate) / 100)
    const managementFeeFromAmount = safeParseFloat(form.managementFee)
    const repairCostFromRate = annualRent * (safeParseFloat(form.repairCostRate) / 100)
    const repairCostFromAmount = safeParseFloat(form.repairCost)
    const otherExpensesFromRate = annualRent * (safeParseFloat(form.otherExpensesRate) / 100)
    const otherExpensesFromAmount = safeParseFloat(form.otherExpenses)
    
    const totalMaintenanceCost = 
        safeParseFloat(form.propertyTax) + // 고정자산세
        Math.max(managementFeeFromRate, managementFeeFromAmount) + // 관리비 (비율 또는 금액 중 큰 값)
        Math.max(repairCostFromRate, repairCostFromAmount) + // 수선비
        Math.max(otherExpensesFromRate, otherExpensesFromAmount) // 기타경비

    return {
        name: form.name,
        price: price,
        loan: loan,
        rate: safeParseFloat(form.rate),
        term: safeParseInt(form.term),
        rent: safeParseFloat(form.rent),
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
        repairCostRate: '0',
        repairCost: '0',
        otherExpensesRate: '0',
        otherExpenses: '0',

        // 네 번째 블럭: 제비용 세부항목
        initialCost1: '0',
        initialCost2: '0',
        initialCost3: '0',
        initialCost4: '0',
        initialCost5: '0'
    }
}

/**
 * 총 매입비용 계산 (매입가 + 제비용)
 */
export function calculateTotalPurchaseCost(form: FormInputData): number {
    const price = safeParseFloat(form.price)
    const initialCosts = [
        form.initialCost1,
        form.initialCost2,
        form.initialCost3,
        form.initialCost4,
        form.initialCost5
    ].reduce((sum, cost) => sum + safeParseFloat(cost), 0)
    
    return price + initialCosts
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
