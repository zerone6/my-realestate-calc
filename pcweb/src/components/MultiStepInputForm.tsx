import { useState, useEffect, useRef } from 'react'
import { fieldDescriptions } from '../../../shared/data/fieldDescriptions'
import { FormInputData } from '../../../shared/types/RealEstateForm'
import { createDefaultFormData, calculateTotalPurchaseCost } from '../../../shared/utils/formUtils'
import { createInputChangeHandler } from '../hooks/useFormHandlers'
import DescriptionTooltip from './DescriptionTooltip'

interface FormProps {
  onCalculate: (form: FormInputData) => void
  onSave: (form: FormInputData) => void
  onDelete: (name: string) => void
  defaultForm?: FormInputData | null
  onCalculateComplete?: () => void // 계산 완료 시 호출할 콜백
}

export default function MultiStepInputForm({ onCalculate, onSave, onDelete, defaultForm, onCalculateComplete }: Readonly<FormProps>) {
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
    { title: '유지비', key: 'maintenance' },
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

  // 기본값 로드 후 관리비/수선비 자동 계산 실행
  useEffect(() => {
    const rent = parseFloat(form.rent) || 0;
    const managementFeeRate = parseFloat(form.managementFeeRate) || 0;
    const maintenanceFeeRate = parseFloat(form.maintenanceFeeRate) || 0;
    
    // 월세가 있고 비율이 설정된 경우에만 초기 계산 (한 번만)
    if (rent > 0 && form.managementFee === '0' && form.maintenanceFee === '0') {
      let updatedForm = { ...form };
      
      if (managementFeeRate > 0) {
        const managementFee = rent * (managementFeeRate / 100);
        updatedForm.managementFee = managementFee.toFixed(1);
      }
      
      if (maintenanceFeeRate > 0) {
        const maintenanceFee = rent * (maintenanceFeeRate / 100);
        updatedForm.maintenanceFee = maintenanceFee.toFixed(1);
      }
      
      setForm(updatedForm);
    }
  }, [form.rent, form.managementFeeRate, form.maintenanceFeeRate, form.managementFee, form.maintenanceFee])

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

  // 폼 데이터가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem('realEstateForm', JSON.stringify(form))
    } catch (error) {
      console.warn('Failed to save form data to localStorage:', error)
    }
  }, [form])

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
    onCalculate(form)
    onCalculateComplete?.() // 계산 완료 콜백 호출
  }

  const handleSaveClick = () => {
    if (form.name.trim() === '') {
      alert('물건 이름을 입력해주세요.')
      return
    }
    onSave(form)
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
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (step: number) => {
    setCurrentStep(step)
  }

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
          <label 
            htmlFor="price" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('price', e)}
          >
            매입가 (万円)
          </label>
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
          <label 
            htmlFor="ownCapital" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('ownCapital', e)}
          >
            자기 자금 (万円)
          </label>
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
          <label 
            htmlFor="grossYield" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('grossYield', e)}
          >
            표면 이익율 (%)
          </label>
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
          <label 
            htmlFor="rent" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('rent', e)}
          >
            월세 수익 (万円)
          </label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            연간 수익 (万円)
          </label>
          <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600">
            {((parseFloat(form.rent) || 0) * 12).toFixed(1)}
          </div>
        </div>
      </div>

      {/* 구조와 내용연수 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label 
            htmlFor="structure" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('structure', e)}
          >
            구조
          </label>
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
          <label 
            htmlFor="buildingAge" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('buildingAge', e)}
          >
            내용연수 (년)
          </label>
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
          <label 
            htmlFor="buildingArea" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('buildingArea', e)}
          >
            건물면적 (㎡)
          </label>
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
          <label 
            htmlFor="buildingPrice" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('buildingPrice', e)}
          >
            건물 가격 (万円)
          </label>
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
        <label 
          htmlFor="occupancyRate" 
          className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
          onClick={(e) => handleLabelClick('occupancyRate', e)}
        >
          입주율 (%)
        </label>
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
          <label 
            htmlFor="brokerageFee" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('brokerageFee', e)}
          >
            중개수수료 (万円)
          </label>
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
          <label 
            htmlFor="registrationFee" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('registrationFee', e)}
          >
            등기비 (万円)
          </label>
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
          <label 
            htmlFor="acquisitionTax" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('acquisitionTax', e)}
          >
            부동산취득세 (万円)
          </label>
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
          <label 
            htmlFor="stampDuty" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('stampDuty', e)}
          >
            인지세 (万円)
          </label>
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
          <label 
            htmlFor="loanFee" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('loanFee', e)}
          >
            론 수수료 (万円)
          </label>
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
          <label 
            htmlFor="surveyFee" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('surveyFee', e)}
          >
            조사비 (万円)
          </label>
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
          <label 
            htmlFor="miscellaneousFees" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('miscellaneousFees', e)}
          >
            기타 비용 (万円)
          </label>
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
      <h3 className="text-lg font-semibold text-gray-800 mb-4">유지비</h3>
      
      {/* 월세 설정 */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label 
            htmlFor="rentFixedPeriod" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('rentFixedPeriod', e)}
          >
            월세 고정 기간 (년)
          </label>
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
          <label 
            htmlFor="rentAdjustmentInterval" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('rentAdjustmentInterval', e)}
          >
            월세 조정 간격 (년)
          </label>
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
          <label 
            htmlFor="rentAdjustmentRate" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('rentAdjustmentRate', e)}
          >
            월세 하락률 (%)
          </label>
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
        <label 
          htmlFor="propertyTax" 
          className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
          onClick={(e) => handleLabelClick('propertyTax', e)}
        >
          고정자산세 (万円)
        </label>
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
          <label 
            htmlFor="managementFeeRate" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('managementFeeRate', e)}
          >
            관리비율 (%)
          </label>
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
          <label 
            htmlFor="managementFee" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('managementFee', e)}
          >
            관리비 (万円)
          </label>
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

      {/* 수선비 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label 
            htmlFor="maintenanceFeeRate" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('maintenanceFeeRate', e)}
          >
            수선비율 (%)
          </label>
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
          <label 
            htmlFor="maintenanceFee" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('maintenanceFee', e)}
          >
            수선비 (万円)
          </label>
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
          <label 
            htmlFor="insurance" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('insurance', e)}
          >
            보험료 (万円)
          </label>
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
          <label 
            htmlFor="otherExpenses" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('otherExpenses', e)}
          >
            기타 경비 (万円)
          </label>
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
          <label 
            htmlFor="rate" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('rate', e)}
          >
            금리 (%)
          </label>
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
          <label 
            htmlFor="term" 
            className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => handleLabelClick('term', e)}
          >
            대출 기간 (년)
          </label>
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
        <label 
          htmlFor="startDate" 
          className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600"
          onClick={(e) => handleLabelClick('startDate', e)}
        >
          시작일
        </label>
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
            <div
              key={step.key}
              className={`flex items-center cursor-pointer ${
                index <= currentStep ? 'text-blue-600' : 'text-gray-400'
              }`}
              onClick={() => goToStep(index)}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index === currentStep
                    ? 'bg-blue-600 text-white'
                    : index < currentStep
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {index + 1}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:block">
                {step.title}
              </span>
            </div>
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
              onClick={handleSaveClick}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              저장
            </button>
            <button
              onClick={handleResetForm}
              className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              초기화
            </button>
            {form.name && (
              <button
                onClick={() => onDelete(form.name)}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                삭제
              </button>
            )}
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
