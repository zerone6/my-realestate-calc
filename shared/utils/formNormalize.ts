import { FormInputData } from '../types/RealEstateForm'
import { createDefaultFormData } from './formUtils'

// 오래된 저장 데이터(필드 누락/타입 불일치)를 현재 스키마로 맞추기 위한 정규화
export function normalizeForm(raw: any): FormInputData {
  const base = createDefaultFormData() as any
  const src = (raw && typeof raw === 'object') ? raw : {}
  // 문자열이어야 할 숫자 필드 목록 (FormInputData 정의 기반, 일부 확장 가능)
  const numericStringFields = [
    'price','ownCapital','buildingPrice','grossYield','rent','occupancyRate','brokerageFee','registrationFee','acquisitionTax','stampDuty','loanFee','surveyFee','miscellaneousFees','otherMiscellaneousFees','rentFixedPeriod','rentAdjustmentInterval','rentAdjustmentRate','propertyTax','managementFeeRate','managementFee','managementCommissionRate','managementCommissionFee','maintenanceFeeRate','maintenanceFee','insurance','otherExpenses','rate','term','buildingAge','buildingArea'
  ]
  const merged: any = { ...base, ...src }
  numericStringFields.forEach(k => {
    const v = merged[k]
    if (v === null || v === undefined || v === '') return
    if (typeof v === 'number') merged[k] = String(v)
    else if (typeof v !== 'string') {
      try { merged[k] = String(v) } catch { merged[k] = '0' }
    }
    if (isNaN(parseFloat(merged[k]))) merged[k] = '0'
  })
  // date 필드 보정 (startDate 존재 안하면 오늘 날짜로 두거나 base 값 유지)
  if (!merged.startDate) merged.startDate = base.startDate
  return merged as FormInputData
}
