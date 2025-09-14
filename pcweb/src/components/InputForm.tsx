import { useState, useEffect, useRef } from 'react'
import { fieldDescriptions } from '../../../shared/data/fieldDescriptions'
import { FormInputData } from '../../../shared/types/RealEstateForm'
import { createDefaultFormData, calculateTotalPurchaseCost } from '../../../shared/utils/formUtils'
import { validateFormData } from '../../../shared/utils/validation'
import DescriptionTooltip from './DescriptionTooltip'

// Accessible info button to show field descriptions (separate from label to satisfy a11y rules)
function InfoButton({ onClick, label }: Readonly<{ onClick: (e: React.MouseEvent) => void, label: string }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-2 text-gray-400 hover:text-blue-600"
      aria-label={`${label} 설명`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
      </svg>
    </button>
  )
}

interface FormProps {
  onCalculate: (form: FormInputData) => void
  onSave: (form: FormInputData) => void
  onDelete: (name: string) => void
  defaultForm?: FormInputData | null
}

export default function InputForm({ onCalculate, onSave, onDelete, defaultForm }: Readonly<FormProps>) {
  const [form, setForm] = useState<FormInputData>(createDefaultFormData())

  const STRUCTURE_LIFESPANS: { [key: string]: number } = {
    'RC': 47,
    'SRC': 47,
    '철골조': 34,
    '경량철골조': 19,
    '목조': 22
  };

  // 편집 모드 상태 관리 (미사용 코드 제거)

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

  // 감가상각비 계산 (건물가격 / 구조별 내용연수)
  const depreciationExpense = (parseFloat(form.buildingPrice) || 0) * 10000 / STRUCTURE_LIFESPANS[form.structure]

  // 연간 수익 계산 (만원 단위로 입력받아서 円으로 변환)
  const annualIncome = (parseFloat(form.rent) || 0) * 10000 * 12;

  // 입주율 반영 수익 계산 (미사용)
  // const occupancyAdjustedIncome = annualIncome * (parseFloat(form.occupancyRate) / 100);

  useEffect(() => {
    if (defaultForm) {
      setForm(defaultForm)
    }
  }, [defaultForm])

  useEffect(() => {
    const newMaxAge = STRUCTURE_LIFESPANS[form.structure];
    if (newMaxAge) {
      setForm(prevForm => ({
        ...prevForm,
        buildingAge: String(newMaxAge)
      }));
    }
  }, [form.structure]);

  // eslint-disable-next-line sonarjs/cognitive-complexity
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    let newForm = { ...form, [name]: value };

    // 표면이율 연동 계산
    const isRelatedToGrossYield = (name.startsWith('initialCost') && !name.endsWith('Name')) || ['price', 'rent', 'grossYield'].includes(name);

    if (isRelatedToGrossYield) {
      const totalCost = calculateTotalPurchaseCost(newForm);

      if (name === 'rent' || (name.startsWith('initialCost') && !name.endsWith('Name'))) {
        const rent = parseFloat(newForm.rent) || 0;
        if (totalCost > 0 && rent > 0) {
          const newGrossYield = (rent * 12 / totalCost * 100).toFixed(1);
          newForm = { ...newForm, grossYield: newGrossYield };
        }
        // totalCost가 0이거나 rent가 0일 때는 grossYield를 변경하지 않음 (기본값 유지)
      } else if (name === 'price') {
        // 매입가가 변경될 때 기존 표면이익율로 월세를 자동 계산
        const grossYield = parseFloat(newForm.grossYield) || 6.0; // 기본값 6.0% 사용
        if (totalCost > 0) {
          const newRent = (totalCost * grossYield / 100 / 12).toFixed(1);
          newForm = { ...newForm, rent: newRent };
        }
      } else if (name === 'grossYield') {
        const grossYield = parseFloat(value) || 0;
        if (totalCost > 0) {
          // totalCost(万円) * grossYield(%) / 100 / 12 = rent(万円)
          const newRent = (totalCost * grossYield / 100 / 12).toFixed(1);
          newForm = { ...newForm, rent: newRent };
        }
      }
    }

    // 관리비 비율/금액 연동
    if (name === 'managementFeeRate') {
      const rate = parseFloat(value) || 0;
      const rent = parseFloat(newForm.rent) || 0;
      const annualRentInYen = rent * 10000 * 12; // 만원을 원으로 변환 후 12개월
      const newManagementFee = (annualRentInYen * rate / 100 / 10000).toFixed(1); // 원을 만원으로 변환
      newForm = { ...newForm, managementFee: newManagementFee };
    } else if (name === 'managementFee') {
      const fee = parseFloat(value) || 0;
      const rent = parseFloat(newForm.rent) || 0;
      const annualRentInYen = rent * 10000 * 12; // 만원을 원으로 변환 후 12개월
      if (annualRentInYen > 0) {
        const newRate = (fee * 10000 / annualRentInYen * 100).toFixed(1); // 만원을 원으로 변환
        newForm = { ...newForm, managementFeeRate: newRate };
      }
    }

  // 장기수선 적립 비율/금액 연동
    if (name === 'maintenanceFeeRate') {
      const rate = parseFloat(value) || 0;
      const rent = parseFloat(newForm.rent) || 0;
      const annualRentInYen = rent * 10000 * 12; // 만원을 원으로 변환 후 12개월
      const newMaintenanceFee = (annualRentInYen * rate / 100 / 10000).toFixed(1); // 원을 만원으로 변환
      newForm = { ...newForm, maintenanceFee: newMaintenanceFee };
    } else if (name === 'maintenanceFee') {
      const cost = parseFloat(value) || 0;
      const rent = parseFloat(newForm.rent) || 0;
      const annualRentInYen = rent * 10000 * 12; // 만원을 원으로 변환 후 12개월
      if (annualRentInYen > 0) {
        const newRate = (cost * 10000 / annualRentInYen * 100).toFixed(1); // 만원을 원으로 변환
        newForm = { ...newForm, maintenanceFeeRate: newRate };
      }
    }

    // 기타경비는 금액만 입력 (비율 계산 제거)

    setForm(newForm);
  };

  // 동적 name 처리 유틸 (미사용) 제거

  // 인라인 편집 관련 유틸들 (미사용) 제거

  // 유지비 합계 계산
  const maintenanceTotal = [
    (parseFloat(form.propertyTax) || 0),
    (parseFloat(form.managementFee) || 0),
    (parseFloat(form.maintenanceFee) || 0),
    (parseFloat(form.insurance) || 0),
    (parseFloat(form.otherExpenses) || 0)
  ].reduce((sum, cost) => sum + cost, 0)

  const handleCalculate = () => {
    const validation = validateFormData(form)
    
    if (!validation.isValid) {
      alert(validation.errors.join('\\n'))
      return
    }

    onCalculate(form)
  }

  const handleSave = () => {
    if (!form.name) {
      alert("물건 이름을 입력하세요")
      return
    }
    onSave(form)
  }

  const handleDelete = () => {
    if (!form.name) {
      alert("삭제할 물건 이름을 입력하세요")
      return
    }
    onDelete(form.name)
  }

  // 라벨 클릭 시 설명 툴팁 표시
  const handleLabelClick = (fieldName: string, event: React.MouseEvent) => {
    const description = fieldDescriptions[fieldName]
    if (description) {
      const rect = event.currentTarget.getBoundingClientRect()
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      })
      setTooltipDescription(description.description)
      setTooltipVisible(true)
    }
  }

  // 툴팁 닫기
  const closeTooltip = () => {
    setTooltipVisible(false)
  }

  // 컴포넌트 마운트 시 첫 번째 입력 필드에 포커스
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [])

  return (
    <div className="max-w-6xl mx-auto bg-white p-6 rounded-xl shadow-md space-y-8">
      <h1 className="text-2xl font-bold text-center text-gray-800">부동산 수익 계산기</h1>

      {/* 첫 번째 블럭: 물건 정보 */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h2 className="text-lg font-semibold text-blue-800 mb-4">🏠 물건 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">물건 이름 *</label>
              <InfoButton onClick={(e) => handleLabelClick('name', e)} label="물건 이름" />
            </div>
            <input
              ref={nameInputRef}
              id="name"
              name="name"
              value={form.name}
              onChange={handleInputChange}
              placeholder="물건 이름을 입력하세요"
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors h-12"
            />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">매입가 *</label>
              <InfoButton onClick={(e) => handleLabelClick('price', e)} label="매입가" />
            </div>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              max="100000"
              value={form.price}
              onChange={handleInputChange}
              placeholder="매입가"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <div className="block text-sm font-medium text-gray-700 mb-1">총매입비용</div>
            <div className="border border-gray-300 p-3 w-full rounded-lg bg-gray-50 h-12 flex items-center justify-between">
              <span className="text-sm text-gray-600">매입가 + 제비용 합계</span>
              <span className="text-lg font-bold text-blue-600">
                {totalPurchaseCost.toLocaleString()} 万円
              </span>
            </div>
          </div>
        </div>

        {/* 역/도보시간 라인 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="station" className="block text-sm font-medium text-gray-700 mb-1">最寄り駅</label>
              <InfoButton onClick={(e) => handleLabelClick('station', e)} label="역" />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="station"
                name="station"
                value={form.station}
                onChange={handleInputChange}
                placeholder="역 이름"
                className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors h-12"
              />
              <select
                id="walkMinutesToStation"
                name="walkMinutesToStation"
                value={form.walkMinutesToStation !== undefined ? String(form.walkMinutesToStation) : ''}
                onChange={(e) => {
                  const v = e.target.value
                  const num = v === '' ? undefined : parseInt(v, 10)
                  setForm(prev => ({ ...prev, walkMinutesToStation: num }))
                }}
                className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-12"
                aria-label="역에서 도보 분"
              >
                <option value="">도보 분</option>
                {Array.from({ length: 20 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}분</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="grossYield" className="block text-sm font-medium text-gray-700 mb-1">表面利回り</label>
              <InfoButton onClick={(e) => handleLabelClick('grossYield', e)} label="표면이율" />
            </div>
            <input
              id="grossYield"
              name="grossYield"
              type="number"
              step="0.1"
              min="0"
              max="50"
              value={form.grossYield}
              onChange={handleInputChange}
              placeholder="표면이율"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">%</span>
          </div>
          {/* 관리수수료 (신규) */}
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="managementCommissionRate" className="block text-sm font-medium text-gray-700 mb-1">관리수수료율 (월간, %)</label>
              <InfoButton onClick={(e) => handleLabelClick('managementCommissionRate', e)} label="관리수수료율" />
            </div>
            <input
              id="managementCommissionRate"
              name="managementCommissionRate"
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={(form as any).managementCommissionRate || ''}
              onChange={handleInputChange}
              placeholder="관리수수료율"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">%</span>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="managementCommissionFee" className="block text-sm font-medium text-gray-700 mb-1">관리수수료 (월간, 万円)</label>
              <InfoButton onClick={(e) => handleLabelClick('managementCommissionFee', e)} label="관리수수료" />
            </div>
            <input
              id="managementCommissionFee"
              name="managementCommissionFee"
              type="number"
              min="0"
              max="100"
              value={(form as any).managementCommissionFee || ''}
              onChange={handleInputChange}
              placeholder="관리수수료"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="structure" className="block text-sm font-medium text-gray-700 mb-1">구조</label>
              <InfoButton onClick={(e) => handleLabelClick('structure', e)} label="구조" />
            </div>
            <select
              id="structure"
              name="structure"
              value={form.structure}
              onChange={handleInputChange}
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors h-12"
            >
              {Object.keys(STRUCTURE_LIFESPANS).map(key => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="buildingAge" className="block text-sm font-medium text-gray-700 mb-1">築年数</label>
              <InfoButton onClick={(e) => handleLabelClick('buildingAge', e)} label="築年数" />
            </div>
            <select
              id="buildingAge"
              name="buildingAge"
              value={form.buildingAge}
              onChange={handleInputChange}
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors h-12"
            >
              {Array.from({ length: STRUCTURE_LIFESPANS[form.structure] }, (_, i) => i + 1)
                .sort((a, b) => b - a)
                .map(year => (
                  <option key={year} value={year}>{year}년</option>
                ))}
            </select>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="buildingArea" className="block text-sm font-medium text-gray-700 mb-1">建物面積</label>
              <InfoButton onClick={(e) => handleLabelClick('buildingArea', e)} label="建物面積" />
            </div>
            <input
              id="buildingArea"
              name="buildingArea"
              type="number"
              min="0"
              max="10000"
              value={form.buildingArea}
              onChange={handleInputChange}
              placeholder="건물면적"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">m²</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="ownCapital" className="block text-sm font-medium text-gray-700 mb-1">자기자금</label>
              <InfoButton onClick={(e) => handleLabelClick('ownCapital', e)} label="자기자금" />
            </div>
            <input
              id="ownCapital"
              name="ownCapital"
              type="number"
              min="0"
              max="100000"
              value={form.ownCapital}
              onChange={handleInputChange}
              placeholder="자기자금"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="buildingPrice" className="block text-sm font-medium text-gray-700 mb-1">건물가격</label>
              <InfoButton onClick={(e) => handleLabelClick('buildingPrice', e)} label="건물가격" />
            </div>
            <input
              id="buildingPrice"
              name="buildingPrice"
              type="number"
              min="0"
              max="100000"
              value={form.buildingPrice}
              onChange={handleInputChange}
              placeholder="건물가격"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <div className="block text-sm font-medium text-gray-700 mb-1">감가상각비</div>
            <div className="border border-gray-300 p-3 w-full rounded-lg bg-gray-50 h-12 flex items-center justify-between">
              <span className="text-sm text-gray-600">건물가격 ÷ 내용연수</span>
              <span className="text-lg font-bold text-blue-600">
                {(depreciationExpense / 10000).toFixed(1)} 万円/년
              </span>
            </div>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="occupancyRate" className="block text-sm font-medium text-gray-700 mb-1">입주율</label>
              <InfoButton onClick={(e) => handleLabelClick('occupancyRate', e)} label="입주율" />
            </div>
            <input
              id="occupancyRate"
              name="occupancyRate"
              type="number"
              min="0"
              max="100"
              value={form.occupancyRate}
              onChange={handleInputChange}
              placeholder="입주율"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">%</span>
          </div>
        </div>
      </div>

      {/* 두 번째 블럭: 대출 정보 */}
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <h2 className="text-lg font-semibold text-green-800 mb-4">💰 대출 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="rate" className="block text-sm font-medium text-gray-700 mb-1">금리 (연간, %) *</label>
              <InfoButton onClick={(e) => handleLabelClick('rate', e)} label="금리" />
            </div>
            <input
              id="rate"
              name="rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.rate}
              onChange={handleInputChange}
              placeholder="금리"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">%</span>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="term" className="block text-sm font-medium text-gray-700 mb-1">대출 기간 (연간, 년) *</label>
              <InfoButton onClick={(e) => handleLabelClick('term', e)} label="대출 기간" />
            </div>
            <input
              id="term"
              name="term"
              type="number"
              min="1"
              max="35"
              value={form.term}
              onChange={handleInputChange}
              placeholder="대출 기간"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">년</span>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">대출 시작일</label>
              <InfoButton onClick={(e) => handleLabelClick('startDate', e)} label="대출 시작일" />
            </div>
            <input
              id="startDate"
              type="date"
              name="startDate"
              min={new Date().toISOString().split('T')[0]}
              value={form.startDate || ""}
              onChange={handleInputChange}
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors h-12"
            />
          </div>
          <div className="relative">
            <div className="block text-sm font-medium text-gray-700 mb-1">대출 금액</div>
            <div className="border border-gray-300 p-3 w-full rounded-lg bg-gray-50 h-12 flex items-center justify-between">
              <span className="text-sm text-gray-600">총매입비용 - 자기자금</span>
              <span className="text-lg font-bold text-green-600">
                {loanAmount.toLocaleString()} 万円
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 세 번째 블럭: 수익 및 유지비 */}
      <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
        <h2 className="text-lg font-semibold text-yellow-800 mb-4">📊 수익 및 유지비</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="rent" className="block text-sm font-medium text-gray-700 mb-1">월세 수익 (월간, 万円) *</label>
              <InfoButton onClick={(e) => handleLabelClick('rent', e)} label="월세 수익" />
            </div>
            <input
              id="rent"
              name="rent"
              type="number"
              min="0"
              max="1000000"
              value={form.rent}
              onChange={handleInputChange}
              placeholder="월세 수익"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <div className="block text-sm font-medium text-gray-700 mb-1">연간 수익 (연간, 円)</div>
            <div className="border border-gray-300 p-3 w-full rounded-lg bg-gray-50 h-12 flex items-center justify-between">
              <span className="text-sm text-gray-600">월세수익 x 12</span>
              <span className="text-lg font-bold text-yellow-600">
                {annualIncome.toLocaleString()} 円
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="managementFee" className="block text-sm font-medium text-gray-700 mb-1">관리비 (월간, 万円)</label>
              <InfoButton onClick={(e) => handleLabelClick('managementFee', e)} label="관리비" />
            </div>
            <input
              id="managementFee"
              name="managementFee"
              type="number"
              min="0"
              max="100"
              value={form.managementFee}
              onChange={handleInputChange}
              placeholder="관리비"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="managementFeeRate" className="block text-sm font-medium text-gray-700 mb-1">관리비율 (월간, %)</label>
              <InfoButton onClick={(e) => handleLabelClick('managementFeeRate', e)} label="관리비율" />
            </div>
            <input
              id="managementFeeRate"
              name="managementFeeRate"
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={form.managementFeeRate}
              onChange={handleInputChange}
              placeholder="관리비율"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">%</span>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="maintenanceFee" className="block text-sm font-medium text-gray-700 mb-1">장기수선 적립 (월간, 万円)</label>
              <InfoButton onClick={(e) => handleLabelClick('maintenanceFee', e)} label="장기수선 적립" />
            </div>
            <input
              id="maintenanceFee"
              name="maintenanceFee"
              type="number"
              min="0"
              max="100"
              value={form.maintenanceFee}
              onChange={handleInputChange}
              placeholder="장기수선 적립"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="maintenanceFeeRate" className="block text-sm font-medium text-gray-700 mb-1">장기수선 적립 비율 (월간, %)</label>
              <InfoButton onClick={(e) => handleLabelClick('maintenanceFeeRate', e)} label="장기수선 적립 비율" />
            </div>
            <input
              id="maintenanceFeeRate"
              name="maintenanceFeeRate"
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={form.maintenanceFeeRate}
              onChange={handleInputChange}
              placeholder="장기수선 적립 비율"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="propertyTax" className="block text-sm font-medium text-gray-700 mb-1">부동산세 (연간, 万円)</label>
              <InfoButton onClick={(e) => handleLabelClick('propertyTax', e)} label="부동산세" />
            </div>
            <input
              id="propertyTax"
              name="propertyTax"
              type="number"
              min="0"
              max="1000"
              value={form.propertyTax}
              onChange={handleInputChange}
              placeholder="부동산세"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="insurance" className="block text-sm font-medium text-gray-700 mb-1">보험료 (연간, 万円)</label>
              <InfoButton onClick={(e) => handleLabelClick('insurance', e)} label="보험료" />
            </div>
            <input
              id="insurance"
              name="insurance"
              type="number"
              min="0"
              max="100"
              value={form.insurance}
              onChange={handleInputChange}
              placeholder="보험료"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="otherExpenses" className="block text-sm font-medium text-gray-700 mb-1">기타 비용 (연간, 万円)</label>
              <InfoButton onClick={(e) => handleLabelClick('otherExpenses', e)} label="기타 비용" />
            </div>
            <input
              id="otherExpenses"
              name="otherExpenses"
              type="number"
              min="0"
              max="100"
              value={form.otherExpenses}
              onChange={handleInputChange}
              placeholder="기타 비용"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <div className="block text-sm font-medium text-gray-700 mb-1">유지·장기수선 합계 (연간, 万円)</div>
            <div className="border border-gray-300 p-3 w-full rounded-lg bg-gray-50 h-12 flex items-center justify-between">
              <span className="text-sm text-gray-600">자동 계산</span>
              <span className="text-lg font-bold text-yellow-600">
                {maintenanceTotal.toLocaleString()} 万円
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 네 번째 블럭: 제비용 */}
      <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
        <h2 className="text-lg font-semibold text-purple-800 mb-4">💼 제비용</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="brokerageFee" className="block text-sm font-medium text-gray-700 mb-1">중개수수료</label>
              <InfoButton onClick={(e) => handleLabelClick('brokerageFee', e)} label="중개수수료" />
            </div>
            <input
              id="brokerageFee"
              name="brokerageFee"
              type="number"
              min="0"
              max="1000"
              value={form.brokerageFee}
              onChange={handleInputChange}
              placeholder="중개수수료"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="registrationFee" className="block text-sm font-medium text-gray-700 mb-1">등기비용</label>
              <InfoButton onClick={(e) => handleLabelClick('registrationFee', e)} label="등기비용" />
            </div>
            <input
              id="registrationFee"
              name="registrationFee"
              type="number"
              min="0"
              max="500"
              value={form.registrationFee}
              onChange={handleInputChange}
              placeholder="등기비용"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="acquisitionTax" className="block text-sm font-medium text-gray-700 mb-1">취득세</label>
              <InfoButton onClick={(e) => handleLabelClick('acquisitionTax', e)} label="취득세" />
            </div>
            <input
              id="acquisitionTax"
              name="acquisitionTax"
              type="number"
              min="0"
              max="1000"
              value={form.acquisitionTax}
              onChange={handleInputChange}
              placeholder="취득세"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="stampDuty" className="block text-sm font-medium text-gray-700 mb-1">인지세</label>
              <InfoButton onClick={(e) => handleLabelClick('stampDuty', e)} label="인지세" />
            </div>
            <input
              id="stampDuty"
              name="stampDuty"
              type="number"
              min="0"
              max="100"
              value={form.stampDuty}
              onChange={handleInputChange}
              placeholder="인지세"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="loanFee" className="block text-sm font-medium text-gray-700 mb-1">대출수수료</label>
              <InfoButton onClick={(e) => handleLabelClick('loanFee', e)} label="대출수수료" />
            </div>
            <input
              id="loanFee"
              name="loanFee"
              type="number"
              min="0"
              max="200"
              value={form.loanFee}
              onChange={handleInputChange}
              placeholder="대출수수료"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="surveyFee" className="block text-sm font-medium text-gray-700 mb-1">감정비용</label>
              <InfoButton onClick={(e) => handleLabelClick('surveyFee', e)} label="감정비용" />
            </div>
            <input
              id="surveyFee"
              name="surveyFee"
              type="number"
              min="0"
              max="100"
              value={form.surveyFee}
              onChange={handleInputChange}
              placeholder="감정비용"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <label htmlFor="miscellaneousFees" className="block text-sm font-medium text-gray-700 mb-1">잡비</label>
              <InfoButton onClick={(e) => handleLabelClick('miscellaneousFees', e)} label="잡비" />
            </div>
            <input
              id="miscellaneousFees"
              name="miscellaneousFees"
              type="number"
              min="0"
              max="100"
              value={form.miscellaneousFees}
              onChange={handleInputChange}
              placeholder="잡비"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <div className="block text-sm font-medium text-gray-700 mb-1">제비용 합계</div>
            <div className="border border-gray-300 p-3 w-full rounded-lg bg-gray-50 h-12 flex items-center justify-between">
              <span className="text-sm text-gray-600">자동 계산</span>
              <span className="text-lg font-bold text-purple-600">
                {acquisitionCostTotal.toLocaleString()} 万円
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex flex-wrap gap-3 justify-center pt-4">
        <button
          onClick={handleCalculate}
          className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-lg"
        >
          계산하기
        </button>
        <button
          onClick={handleSave}
          className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-medium transition-colors focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-lg"
        >
          저장
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-medium transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-lg"
        >
          삭제
        </button>
      </div>

      {/* 설명 툴팁 */}
      <DescriptionTooltip
        isVisible={tooltipVisible}
        description={tooltipDescription}
        position={tooltipPosition}
        onClose={closeTooltip}
      />
    </div>
  )
}
