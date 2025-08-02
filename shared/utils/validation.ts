import { FormInputData } from '../types/RealEstateForm'

/**
 * 숫자 문자열 유효성 검사
 */
export function isValidNumber(value: string): boolean {
    if (!value || value.trim() === '') return false
    const num = parseFloat(value)
    return !isNaN(num) && isFinite(num)
}

/**
 * 양수 검사
 */
export function isPositiveNumber(value: string): boolean {
    if (!isValidNumber(value)) return false
    return parseFloat(value) > 0
}

/**
 * 0 이상 검사
 */
export function isNonNegativeNumber(value: string): boolean {
    if (!isValidNumber(value)) return false
    return parseFloat(value) >= 0
}

/**
 * 백분율 검사 (0-100)
 */
export function isValidPercentage(value: string): boolean {
    if (!isValidNumber(value)) return false
    const num = parseFloat(value)
    return num >= 0 && num <= 100
}

/**
 * 날짜 유효성 검사
 */
export function isValidDate(dateString: string): boolean {
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date.getTime())
}

/**
 * 폼 데이터 유효성 검사
 */
export function validateFormData(form: FormInputData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // 필수 필드 검사
    if (!form.name.trim()) {
        errors.push('물건 이름을 입력해주세요.')
    }

    if (!isPositiveNumber(form.price)) {
        errors.push('매입가는 0보다 큰 숫자를 입력해주세요.')
    }

    if (!isNonNegativeNumber(form.ownCapital)) {
        errors.push('자기자금은 0 이상의 숫자를 입력해주세요.')
    }

    if (!isPositiveNumber(form.rate)) {
        errors.push('금리는 0보다 큰 숫자를 입력해주세요.')
    }

    if (!isPositiveNumber(form.term)) {
        errors.push('대출기간은 0보다 큰 숫자를 입력해주세요.')
    }

    if (!isPositiveNumber(form.rent)) {
        errors.push('월세는 0보다 큰 숫자를 입력해주세요.')
    }

    if (!isValidPercentage(form.occupancyRate)) {
        errors.push('입주율은 0-100 사이의 숫자를 입력해주세요.')
    }

    if (!isValidDate(form.startDate)) {
        errors.push('유효한 시작일을 입력해주세요.')
    }

    // 대출금액 vs 매입가 검사
    const price = parseFloat(form.price) * 10000
    const ownCapital = parseFloat(form.ownCapital) * 10000
    const loan = price - ownCapital

    if (loan < 0) {
        errors.push('자기자금이 매입가를 초과할 수 없습니다.')
    }

    return {
        isValid: errors.length === 0,
        errors
    }
}

/**
 * 문자열을 숫자로 변환 (안전한 변환)
 */
export function safeParseFloat(value: string, defaultValue: number = 0): number {
    if (!value || value.trim() === '') return defaultValue
    const parsed = parseFloat(value)
    return isNaN(parsed) ? defaultValue : parsed
}

/**
 * 문자열을 정수로 변환 (안전한 변환)
 */
export function safeParseInt(value: string, defaultValue: number = 0): number {
    if (!value || value.trim() === '') return defaultValue
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? defaultValue : parsed
}

/**
 * 숫자를 천단위 콤마가 있는 문자열로 변환
 */
export function formatNumber(value: number): string {
    return value.toLocaleString()
}

/**
 * 퍼센트를 소수점 1자리까지 표시
 */
export function formatPercentage(value: number): string {
    return value.toFixed(1)
}
