import { useState, useEffect, useRef } from 'react'
import { fieldDescriptions } from '../../../shared/data/fieldDescriptions'
import { FormInputData } from '../../../shared/types/RealEstateForm'
import { createDefaultFormData, calculateTotalPurchaseCost } from '../../../shared/utils/formUtils'
import { createInputChangeHandler } from '../hooks/useFormHandlers'
import DescriptionTooltip from './DescriptionTooltip'

// 접근성 강화를 위한 공용 안내 버튼 (라벨 외부에서 툴팁 트리거)
function InfoButton({ onClick, label }: Readonly<{ onClick: (e: React.MouseEvent) => void; label: string }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-2 inline-flex items-center text-gray-400 hover:text-blue-600 focus:outline-none"
      aria-label={`${label} 설명 보기`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
      </svg>
    </button>
  );
}

// 내부 계산을 단순화하기 위한 유틸 함수들 (컴포넌트 외부에 선언)
export function computeInitialMonthlyFees(src: FormInputData): FormInputData | null {
  const rent = parseFloat(src.rent) || 0
  const managementFeeRate = parseFloat(src.managementFeeRate) || 0
  const maintenanceFeeRate = parseFloat(src.maintenanceFeeRate) || 0
  const managementCommissionRate = parseFloat((src as any).managementCommissionRate) || 0

  const commissionFee = (src as any).managementCommissionFee
  const shouldRunOnce = src.managementFee === '0' && src.maintenanceFee === '0' && (commissionFee === '0' || !commissionFee)

  if (!(rent > 0 && shouldRunOnce)) return null

  let updated: FormInputData | null = null

  if (managementFeeRate > 0) {
    const managementFee = rent * (managementFeeRate / 100)
    updated = { ...(updated ?? src), managementFee: managementFee.toFixed(1) }
  }

  if (maintenanceFeeRate > 0) {
    const maintenanceFee = rent * (maintenanceFeeRate / 100)
    updated = { ...(updated ?? src), maintenanceFee: maintenanceFee.toFixed(1) }
  }

  if (managementCommissionRate > 0) {
    const commissionFeeCalc = rent * (managementCommissionRate / 100)
    updated = { ...(updated ?? src), managementCommissionFee: commissionFeeCalc.toFixed(1) } as any
  }

  return updated
}

export function computeFeesOnEnterMaintenanceTab(src: FormInputData): FormInputData | null {
  const rent = parseFloat(src.rent) || 0
  const managementFeeRate = parseFloat(src.managementFeeRate) || 0
  const maintenanceFeeRate = parseFloat(src.maintenanceFeeRate) || 0
  const managementCommissionRate = parseFloat((src as any).managementCommissionRate) || 0

  const shouldInitMgmt = src.managementFee === '0' && managementFeeRate > 0
  const shouldInitMaint = src.maintenanceFee === '0' && maintenanceFeeRate > 0
  const commissionFee = (src as any).managementCommissionFee
  const shouldInitCommission = (commissionFee === '0' || !commissionFee) && managementCommissionRate > 0

  if (!(rent > 0 && (shouldInitMgmt || shouldInitMaint || shouldInitCommission))) return null

  let updated: FormInputData | null = null
  if (shouldInitMgmt) {
    const calc = rent * (managementFeeRate / 100)
    updated = { ...(updated ?? src), managementFee: calc.toFixed(1) }
  }
  if (shouldInitMaint) {
    const calc = rent * (maintenanceFeeRate / 100)
    updated = { ...(updated ?? src), maintenanceFee: calc.toFixed(1) }
  }
  if (shouldInitCommission) {
    const calc = rent * (managementCommissionRate / 100)
    updated = { ...(updated ?? src), managementCommissionFee: calc.toFixed(1) } as any
  }

  return updated
}

interface FormProps {
  onCalculate: (form: FormInputData) => void
  onAutoSave: (form: FormInputData) => void
  defaultForm?: FormInputData | null
  onCalculateComplete?: () => void // 계산 완료 시 호출할 콜백
}

export default function MultiStepInputForm({ onCalculate, onAutoSave, defaultForm, onCalculateComplete }: Readonly<FormProps>) {
  // (컴포넌트 내부 로직 간소화) 유틸 함수는 컴포넌트 밖에서 선언
  const [form, setForm] = useState<FormInputData>(() => {
    // localStorage에서 저장된 폼 데이터 복원 시도
    try {
      const savedForm = localStorage.getItem('realEstateForm')
      if (savedForm) {
        const parsedForm = JSON.parse(savedForm)
        // 저장된 데이터가 유효한지 확인 (최소한 name 필드가 있는지)
        if (parsedForm && typeof parsedForm === 'object' && 'name' in parsedForm) {
          return parsedForm
        }
      }
    } catch (error) {
      console.warn('Failed to restore form data from localStorage:', error)
    }
    // 복원 실패 시 기본값 사용
    return createDefaultFormData()
  })
  const [currentStep, setCurrentStep] = useState(() => {
    // localStorage에서 현재 스텝도 복원
    try {
      const savedStep = localStorage.getItem('realEstateFormStep')
      if (savedStep) {
        const step = parseInt(savedStep, 10)
        if (step >= 0 && step <= 3) {
          return step
        }
      }
    } catch (error) {
      console.warn('Failed to restore step from localStorage:', error)
    }
    return 0
  })

  const STRUCTURE_LIFESPANS: { [key: string]: number } = {
    'RC': 47,
    'SRC': 47,
    '철골조': 34,
    '경량철골조': 19,
    '목조': 22
  };

  // 편집 모드 상태 관리 (미사용)
  // const [editingField, setEditingField] = useState<string | null>(null)
  // const [editValue, setEditValue] = useState('')

  // 설명 툴팁 상태 관리
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [tooltipDescription, setTooltipDescription] = useState('')

  // 포커스 관리를 위한 ref
  const nameInputRef = useRef<HTMLInputElement>(null)

  // 제비용 합계 계산
  const acquisitionCostTotal = [
    parseFloat(form.brokerageFee) || 0,
    parseFloat(form.registrationFee) || 0,
    parseFloat(form.acquisitionTax) || 0,
    parseFloat(form.stampDuty) || 0,
    parseFloat(form.loanFee) || 0,
    parseFloat(form.surveyFee) || 0,
    parseFloat(form.miscellaneousFees) || 0
  ].reduce((sum, cost) => sum + cost, 0)

  const totalPurchaseCost = calculateTotalPurchaseCost(form)
  const loanAmount = Math.max(0, totalPurchaseCost - (parseFloat(form.ownCapital) || 0))

  // 감가상각비 계산 (미사용)
  // const depreciationExpense = (parseFloat(form.buildingPrice) || 0) * 10000 / STRUCTURE_LIFESPANS[form.structure]

  // 연간 수익 계산 (미사용)
  // const annualIncome = (parseFloat(form.rent) || 0) * 10000 * 12;

  // 입주율 반영 수익 계산 (미사용)
  // const occupancyAdjustedIncome = annualIncome * (parseFloat(form.occupancyRate) / 100);

  // 스텝 정보
  const steps = [
    { title: '물건 정보', key: 'property' },
    { title: '제비용', key: 'acquisition' },
  { title: '유지·장기수선', key: 'maintenance' },
    { title: '대출 정보', key: 'loan' }
  ]

  useEffect(() => {
    if (defaultForm) {
      // defaultForm이 전달된 경우 우선 적용하고 localStorage에도 저장
      setForm(defaultForm)
      try {
        localStorage.setItem('realEstateForm', JSON.stringify(defaultForm))
      } catch (error) {
        console.warn('Failed to save defaultForm to localStorage:', error)
      }
    }
  }, [defaultForm])

  // 기본값 로드 후 관리비/수선비/관리수수료 자동 계산 실행 (복잡도 감소)
  useEffect(() => {
    const updated = computeInitialMonthlyFees(form)
    if (updated) setForm(updated)
  }, [form])

  useEffect(() => {
    const newMaxAge = STRUCTURE_LIFESPANS[form.structure];
    if (newMaxAge) {
      setForm(prevForm => ({
        ...prevForm,
        buildingAge: String(newMaxAge)
      }));
    }
  }, [form.structure]);

  const handleInputChange = createInputChangeHandler(form, setForm);

  // 1) 폼 변경 시 localStorage 저장
  useEffect(() => {
    try {
      localStorage.setItem('realEstateForm', JSON.stringify(form))
    } catch (error) {
      console.warn('Failed to save form data to localStorage:', error)
    }
  }, [form])

  // 2) 폼 변경 시 디바운스 자동 저장 (이름이 있을 때만)
  useEffect(() => {
    if ((form.name || '').trim() === '') return
    const t = setTimeout(() => onAutoSave(form), 500)
    return () => clearTimeout(t)
  }, [form, onAutoSave])

  // 현재 스텝이 변경될 때마다 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem('realEstateFormStep', currentStep.toString())
    } catch (error) {
      console.warn('Failed to save step to localStorage:', error)
    }
  }, [currentStep])

  const handleLabelClick = (fieldName: string, e: React.MouseEvent) => {
    e.preventDefault()
    const description = fieldDescriptions[fieldName]
    if (description) {
      setTooltipDescription(description.description)
      setTooltipPosition({ x: e.clientX, y: e.clientY })
      setTooltipVisible(true)
    }
  }


  const handleCalculateClick = () => {
    autoSave() // 계산하기 전 자동 저장
    onCalculate(form)
    onCalculateComplete?.() // 계산 완료 콜백 호출
  }

  // 자동 저장 함수
  const autoSave = () => {
    if (form.name.trim() !== '') {
      onAutoSave(form)
    }
  }

  const handleResetForm = () => {
    if (confirm('모든 입력 내용을 초기화하시겠습니까?')) {
      const defaultData = createDefaultFormData()
      setForm(defaultData)
      setCurrentStep(0)
      // localStorage도 초기화
      try {
        localStorage.removeItem('realEstateForm')
        localStorage.removeItem('realEstateFormStep')
      } catch (error) {
        console.warn('Failed to clear localStorage:', error)
      }
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      autoSave() // 다음 단계로 가기 전 자동 저장
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      autoSave() // 이전 단계로 가기 전 자동 저장
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (step: number) => {
    autoSave() // 단계 이동 전 자동 저장
    setCurrentStep(step)
  }

  // 유지비 탭 진입 시 초기값 반영 (복잡도 감소)
  useEffect(() => {
    const maintenanceIndex = steps.findIndex(s => s.key === 'maintenance')
    if (currentStep !== maintenanceIndex) return
    const updated = computeFeesOnEnterMaintenanceTab(form)
    if (updated) setForm(updated)
  }, [currentStep, steps, form])

  // 터치 관련 상태
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // 최소 스와이프 거리
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && currentStep < steps.length - 1) {
      nextStep()
    }
    if (isRightSwipe && currentStep > 0) {
      prevStep()
    }
  }

  // 각 스텝의 렌더링 함수들
  const renderPropertyInfo = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">물건 정보</h3>
      
      {/* 물건 이름 */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          물건 이름
        </label>
        <input
          ref={nameInputRef}
          type="text"
          id="name"
          name="name"
          value={form.name}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="예: 신주쿠 아파트"
        />
      </div>

      {/* 매입가와 자기자금 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="price" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              매입가 (万円)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('price', e)} label="매입가" />
          </div>
          <input
            type="number"
            id="price"
            name="price"
            value={form.price}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="5000"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="ownCapital" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              자기 자금 (万円)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('ownCapital', e)} label="자기 자금" />
          </div>
          <input
            type="number"
            id="ownCapital"
            name="ownCapital"
            value={form.ownCapital}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="1000"
          />
        </div>
      </div>

      {/* 표면이익율, 월세수익, 연간수익 */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="grossYield" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              표면 이익율 (%)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('grossYield', e)} label="표면 이익율" />
          </div>
          <input
            type="number"
            id="grossYield"
            name="grossYield"
            value={form.grossYield}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="6.0"
            step="0.1"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="rent" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              월세 수익 (万円)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('rent', e)} label="월세 수익" />
          </div>
          <input
            type="number"
            id="rent"
            name="rent"
            value={form.rent}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="25"
            step="0.1"
          />
        </div>
        <div>
          <div className="block text-sm font-medium text-gray-700 mb-1">
            연간 수익 (万円)
          </div>
          <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600">
            {((parseFloat(form.rent) || 0) * 12).toFixed(1)}
          </div>
        </div>
      </div>

      {/* 구조와 내용연수 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="structure" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              구조
            </label>
            <InfoButton onClick={(e) => handleLabelClick('structure', e)} label="구조" />
          </div>
          <select
            id="structure"
            name="structure"
            value={form.structure}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="RC">RC</option>
            <option value="SRC">SRC</option>
            <option value="철골조">철골조</option>
            <option value="경량철골조">경량철골조</option>
            <option value="목조">목조</option>
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="buildingAge" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              내용연수 (년)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('buildingAge', e)} label="내용연수" />
          </div>
          <input
            type="number"
            id="buildingAge"
            name="buildingAge"
            value={form.buildingAge}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="22"
          />
        </div>
      </div>

      {/* 건물면적과 건물가격 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="buildingArea" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              건물면적 (㎡)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('buildingArea', e)} label="건물면적" />
          </div>
          <input
            type="number"
            id="buildingArea"
            name="buildingArea"
            value={form.buildingArea}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="100"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="buildingPrice" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              건물 가격 (万円)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('buildingPrice', e)} label="건물 가격" />
          </div>
          <input
            type="number"
            id="buildingPrice"
            name="buildingPrice"
            value={form.buildingPrice}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="3000"
          />
        </div>
      </div>

      {/* 입주율 */}
      <div>
        <div className="flex items-center justify-between">
          <label 
            htmlFor="occupancyRate" 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            입주율 (%)
          </label>
          <InfoButton onClick={(e) => handleLabelClick('occupancyRate', e)} label="입주율" />
        </div>
        <input
          type="number"
          id="occupancyRate"
          name="occupancyRate"
          value={form.occupancyRate}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="100"
          min="0"
          max="100"
        />
      </div>
    </div>
  )

  const renderAcquisitionCosts = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">제비용</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="brokerageFee" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              중개수수료 (万円)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('brokerageFee', e)} label="중개수수료" />
          </div>
          <input
            type="number"
            id="brokerageFee"
            name="brokerageFee"
            value={form.brokerageFee}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="100"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="registrationFee" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              등기비 (万円)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('registrationFee', e)} label="등기비" />
          </div>
          <input
            type="number"
            id="registrationFee"
            name="registrationFee"
            value={form.registrationFee}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="50"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="acquisitionTax" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              부동산취득세 (万円)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('acquisitionTax', e)} label="부동산취득세" />
          </div>
          <input
            type="number"
            id="acquisitionTax"
            name="acquisitionTax"
            value={form.acquisitionTax}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="30"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="stampDuty" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              인지세 (万円)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('stampDuty', e)} label="인지세" />
          </div>
          <input
            type="number"
            id="stampDuty"
            name="stampDuty"
            value={form.stampDuty}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="1"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="loanFee" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              론 수수료 (万円)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('loanFee', e)} label="론 수수료" />
          </div>
          <input
            type="number"
            id="loanFee"
            name="loanFee"
            value={form.loanFee}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="50"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="surveyFee" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              조사비 (万円)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('surveyFee', e)} label="조사비" />
          </div>
          <input
            type="number"
            id="surveyFee"
            name="surveyFee"
            value={form.surveyFee}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="10"
          />
        </div>
        <div className="md:col-span-2">
          <div className="flex items-center justify-between">
            <label 
              htmlFor="miscellaneousFees" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              기타 비용 (万円)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('miscellaneousFees', e)} label="기타 비용" />
          </div>
          <input
            type="number"
            id="miscellaneousFees"
            name="miscellaneousFees"
            value={form.miscellaneousFees}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="20"
          />
        </div>
      </div>

      {/* 제비용 합계 */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="text-sm font-medium text-gray-700 mb-1">제비용 합계</div>
        <div className="text-lg font-semibold text-blue-600">{acquisitionCostTotal.toFixed(1)} 万円</div>
      </div>

      {/* 총 매입 비용 */}
      <div className="bg-green-50 p-4 rounded-lg">
        <div className="text-sm font-medium text-gray-700 mb-1">총 매입 비용</div>
        <div className="text-lg font-semibold text-green-600">{totalPurchaseCost.toFixed(1)} 万円</div>
        <div className="text-xs text-gray-500 mt-1">매입가 + 제비용</div>
      </div>
    </div>
  )

  const renderMaintenanceCosts = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">유지·장기수선</h3>
      
      {/* 월세 설정 */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="rentFixedPeriod" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              월세 고정 기간 (년)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('rentFixedPeriod', e)} label="월세 고정 기간" />
          </div>
          <input
            type="number"
            id="rentFixedPeriod"
            name="rentFixedPeriod"
            value={form.rentFixedPeriod}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="1"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="rentAdjustmentInterval" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              월세 조정 간격 (년)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('rentAdjustmentInterval', e)} label="월세 조정 간격" />
          </div>
          <input
            type="number"
            id="rentAdjustmentInterval"
            name="rentAdjustmentInterval"
            value={form.rentAdjustmentInterval}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="1"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="rentAdjustmentRate" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              월세 하락률 (%)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('rentAdjustmentRate', e)} label="월세 하락률" />
          </div>
          <input
            type="number"
            id="rentAdjustmentRate"
            name="rentAdjustmentRate"
            value={form.rentAdjustmentRate}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
            step="0.1"
          />
        </div>
      </div>

  {/* 고정자산세 */}
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="propertyTax" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
      고정자산세 (연간, 万円)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('propertyTax', e)} label="고정자산세" />
          </div>
        <input
          type="number"
          id="propertyTax"
          name="propertyTax"
          value={form.propertyTax}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="50"
        />
      </div>

      {/* 관리비 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="managementFeeRate" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              관리비율 (월간, %)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('managementFeeRate', e)} label="관리비율" />
          </div>
          <input
            type="number"
            id="managementFeeRate"
            name="managementFeeRate"
            value={form.managementFeeRate}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="5"
            step="0.1"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="managementFee" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              관리비 (월간, 万円)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('managementFee', e)} label="관리비" />
          </div>
          <input
            type="number"
            id="managementFee"
            name="managementFee"
            value={form.managementFee}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="15"
            step="0.1"
          />
        </div>
      </div>

  {/* 관리수수료 (신규) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="managementCommissionRate" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              관리수수료율 (월간, %)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('managementCommissionRate', e)} label="관리수수료율" />
          </div>
          <input
            type="number"
            id="managementCommissionRate"
            name="managementCommissionRate"
            value={form.managementCommissionRate}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="5"
            step="0.1"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="managementCommissionFee" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              관리수수료 (월간, 万円)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('managementCommissionFee', e)} label="관리수수료" />
          </div>
          <input
            type="number"
            id="managementCommissionFee"
            name="managementCommissionFee"
            value={form.managementCommissionFee}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="9"
            step="0.1"
          />
        </div>
      </div>

  {/* 장기수선 적립 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="maintenanceFeeRate" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              장기수선 적립 비율 (월간, %)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('maintenanceFeeRate', e)} label="장기수선 적립 비율" />
          </div>
          <input
            type="number"
            id="maintenanceFeeRate"
            name="maintenanceFeeRate"
            value={form.maintenanceFeeRate}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="3"
            step="0.1"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="maintenanceFee" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              장기수선 적립 (월간, 万円)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('maintenanceFee', e)} label="장기수선 적립" />
          </div>
          <input
            type="number"
            id="maintenanceFee"
            name="maintenanceFee"
            value={form.maintenanceFee}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="9"
            step="0.1"
          />
        </div>
      </div>

      {/* 보험료와 기타경비 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="insurance" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              보험료 (연간, 万円)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('insurance', e)} label="보험료" />
          </div>
          <input
            type="number"
            id="insurance"
            name="insurance"
            value={form.insurance}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="5"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="otherExpenses" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              기타경비 (연간, 万円)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('otherExpenses', e)} label="기타경비" />
          </div>
          <input
            type="number"
            id="otherExpenses"
            name="otherExpenses"
            value={form.otherExpenses}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="10"
          />
        </div>
      </div>
    </div>
  )

  const renderLoanInfo = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">대출 정보</h3>
      
      {/* 대출금액 표시 */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="text-sm font-medium text-gray-700 mb-1">대출 금액</div>
        <div className="text-lg font-semibold text-blue-600">{loanAmount.toFixed(1)} 万円</div>
        <div className="text-xs text-gray-500 mt-1">총 매입비용 - 자기자금</div>
      </div>

      {/* 금리와 대출기간 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="rate" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              금리 (%)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('rate', e)} label="금리" />
          </div>
          <input
            type="number"
            id="rate"
            name="rate"
            value={form.rate}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="2.0"
            step="0.1"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="term" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              대출 기간 (년)
            </label>
            <InfoButton onClick={(e) => handleLabelClick('term', e)} label="대출 기간" />
          </div>
          <input
            type="number"
            id="term"
            name="term"
            value={form.term}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="35"
          />
        </div>
      </div>

      {/* 시작일 */}
      <div>
        <div className="flex items-center justify-between">
          <label 
            htmlFor="startDate" 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            시작일
          </label>
          <InfoButton onClick={(e) => handleLabelClick('startDate', e)} label="시작일" />
        </div>
        <input
          type="date"
          id="startDate"
          name="startDate"
          value={form.startDate}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderPropertyInfo()
      case 1:
        return renderAcquisitionCosts()
      case 2:
        return renderMaintenanceCosts()
      case 3:
        return renderLoanInfo()
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      {/* 스텝 인디케이터 */}
      <div className="bg-gray-50 px-6 py-4">
        <div className="flex justify-between items-center">
          {steps.map((step, index) => (
            <button
              key={step.key}
              type="button"
              className={`flex items-center ${index <= currentStep ? 'text-blue-600' : 'text-gray-400'}`}
              onClick={() => goToStep(index)}
            >
              {(() => {
                let statusClass = ''
                if (index === currentStep) {
                  statusClass = 'bg-blue-600 text-white'
                } else if (index < currentStep) {
                  statusClass = 'bg-blue-100 text-blue-600'
                } else {
                  statusClass = 'bg-gray-200 text-gray-400'
                }
                return (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${statusClass}`}>
                    {index + 1}
                  </div>
                )
              })()}
              <span className="ml-2 text-sm font-medium hidden sm:block">
                {step.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div
        className="p-6 min-h-96"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {renderCurrentStep()}
      </div>

      {/* 네비게이션 버튼들 */}
      <div className="bg-gray-50 px-6 py-4">
        <div className="flex justify-between items-center">
          {/* 이전 버튼 */}
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              currentStep === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            이전
          </button>

          {/* 액션 버튼들 */}
          <div className="flex space-x-2">
            <button
              onClick={handleCalculateClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              계산하기
            </button>
            <button
              onClick={handleResetForm}
              className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              초기화
            </button>
          </div>

          {/* 다음 버튼 */}
          <button
            onClick={nextStep}
            disabled={currentStep === steps.length - 1}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              currentStep === steps.length - 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            다음
          </button>
        </div>
      </div>

      {/* 툴팁 */}
      {tooltipVisible && (
        <DescriptionTooltip
          description={tooltipDescription}
          position={tooltipPosition}
          onClose={() => setTooltipVisible(false)}
          isVisible={tooltipVisible}
        />
      )}
    </div>
  )
}
