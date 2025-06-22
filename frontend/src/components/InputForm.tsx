import { useState, useEffect, useRef } from 'react'
import { fieldDescriptions } from '../data/fieldDescriptions'
import DescriptionTooltip from './DescriptionTooltip'

interface FormProps {
  onCalculate: (form: any) => void
  onSave: (form: any) => void
  onDelete: (name: string) => void
  defaultForm?: any
}

export default function InputForm({ onCalculate, onSave, onDelete, defaultForm }: FormProps) {
  const [form, setForm] = useState({
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
    rentFixedPeriod: '1', // 월세 고정 기간 (년) - 초기 월세를 유지하는 기간
    rentAdjustmentInterval: '1', // 월세 조정 시기 (년) - 월세 고정 기간 이후 월세를 조정하는 주기
    rentAdjustmentRate: '0', // 월세 조정 비율 (%) - 매 조정 시기마다 월세를 낮출 비율, 기본값 0%

    // 수익 및 유지비 추가 항목들
    propertyTax: '0', // 고정자산세+도시계획세 (만엔)
    managementFeeRate: '0', // 관리비 비율 (%) - 연간 임대료 수익 대비
    managementFee: '0', // 관리비 (만엔) - 연간
    repairCostRate: '0', // 수선비 비율 (%) - 연간 임대료 수익 대비
    repairCost: '0', // 수선비 (만엔) - 연간
    otherExpensesRate: '0', // 기타경비 비율 (%) - 연간 임대료 수익 대비
    otherExpenses: '0', // 기타경비 (만엔) - 연간

    // 네 번째 블럭: 제비용 세부항목
    initialCost1: '0',
    initialCost2: '0',
    initialCost3: '0',
    initialCost4: '0',
    initialCost5: '0',
    initialCost1Name: '제비용 1',
    initialCost2Name: '제비용 2',
    initialCost3Name: '제비용 3',
    initialCost4Name: '제비용 4',
    initialCost5Name: '제비용 5',

    // 다섯 번째 블럭: 유지비 세부항목
    maintenance1: '0',
    maintenance2: '0',
    maintenance3: '0',
    maintenance4: '0',
    maintenance5: '0',
    maintenance1Name: '유지비 1',
    maintenance2Name: '유지비 2',
    maintenance3Name: '유지비 3',
    maintenance4Name: '유지비 4',
    maintenance5Name: '유지비 5'
  })

  const STRUCTURE_LIFESPANS: { [key: string]: number } = {
    'RC': 47,
    'SRC': 47,
    '철골조': 34,
    '경량철골조': 19,
    '목조': 22
  };

  // 편집 모드 상태 관리
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // 설명 툴팁 상태 관리
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [tooltipDescription, setTooltipDescription] = useState('')

  // 포커스 관리를 위한 ref
  const nameInputRef = useRef<HTMLInputElement>(null)

  // 제비용 합계 계산
  const initialCostTotal = [
    parseFloat(form.initialCost1) || 0,
    parseFloat(form.initialCost2) || 0,
    parseFloat(form.initialCost3) || 0,
    parseFloat(form.initialCost4) || 0,
    parseFloat(form.initialCost5) || 0
  ].reduce((sum, cost) => sum + cost, 0)

  const totalPurchaseCost = (parseFloat(form.price) || 0) * 10000 + initialCostTotal

  // 감가상각비 계산 (건물가격 / 구조별 내용연수)
  const depreciationExpense = (parseFloat(form.buildingPrice) || 0) * 10000 / STRUCTURE_LIFESPANS[form.structure]

  // 대출 금액 자동 계산 (총매입비용 - 자기자금)
  const loanAmount = Math.max(0, totalPurchaseCost - (parseFloat(form.ownCapital) || 0) * 10000)

  // 연간 수익 계산
  const annualIncome = (parseFloat(form.rent) || 0) * 12;

  // 입주율 반영 수익 계산
  const occupancyAdjustedIncome = annualIncome * (parseFloat(form.occupancyRate) / 100);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // 입력값 범위 검증
    const validationResult = validateInput(name, value);
    if (!validationResult.isValid) {
      alert(validationResult.message);
      return;
    }

    let newForm = { ...form, [name]: value };

    // 총매입비용 계산을 위한 함수
    const calculateTotalPurchaseCost = (currentForm: typeof form) => {
      const initialCosts = [
        parseFloat(currentForm.initialCost1) || 0,
        parseFloat(currentForm.initialCost2) || 0,
        parseFloat(currentForm.initialCost3) || 0,
        parseFloat(currentForm.initialCost4) || 0,
        parseFloat(currentForm.initialCost5) || 0,
      ].reduce((sum, cost) => sum + cost, 0);
      return (parseFloat(currentForm.price) || 0) * 10000 + initialCosts;
    };

    // 'price', 'initialCost', 'rent', 'grossYield'가 변경될 때 연동 계산
    const isRelatedToGrossYield = (name.startsWith('initialCost') && !name.endsWith('Name')) || ['price', 'rent', 'grossYield'].includes(name);

    if (isRelatedToGrossYield) {
      const totalPurchaseCost = calculateTotalPurchaseCost(newForm);

      if (name === 'rent' || name === 'price' || (name.startsWith('initialCost') && !name.endsWith('Name'))) {
        const rent = parseFloat(newForm.rent) || 0;
        if (totalPurchaseCost > 0) {
          const newGrossYield = (rent * 12 / totalPurchaseCost * 100).toFixed(1);
          newForm = { ...newForm, grossYield: newGrossYield };
        } else {
          newForm = { ...newForm, grossYield: '0.0' };
        }
      } else if (name === 'grossYield') {
        const grossYield = parseFloat(value) || 0;
        if (totalPurchaseCost > 0) {
          const newRent = (totalPurchaseCost * grossYield / 100 / 12).toFixed(0);
          newForm = { ...newForm, rent: newRent };
        }
      }
    }

    if (name === 'managementFeeRate') {
      // 관리비 비율이 변경되면 관리비 자동 계산
      const rate = parseFloat(value) || 0;
      const rent = parseFloat(newForm.rent) || 0;
      const annualRent = rent * 12; // 연간 임대료 수익
      const newManagementFee = (annualRent * rate / 100 / 10000).toFixed(1); // 만엔 단위로 변환
      newForm = { ...newForm, managementFee: newManagementFee };
    } else if (name === 'managementFee') {
      // 관리비가 변경되면 관리비 비율 자동 계산
      const fee = parseFloat(value) || 0;
      const rent = parseFloat(newForm.rent) || 0;
      const annualRent = rent * 12; // 연간 임대료 수익
      if (annualRent > 0) {
        const newRate = (fee * 10000 / annualRent * 100).toFixed(1);
        newForm = { ...newForm, managementFeeRate: newRate };
      }
    } else if (name === 'repairCostRate') {
      // 수선비 비율이 변경되면 수선비 자동 계산
      const rate = parseFloat(value) || 0;
      const rent = parseFloat(newForm.rent) || 0;
      const annualRent = rent * 12; // 연간 임대료 수익
      const newRepairCost = (annualRent * rate / 100 / 10000).toFixed(1); // 만엔 단위로 변환
      newForm = { ...newForm, repairCost: newRepairCost };
    } else if (name === 'repairCost') {
      // 수선비가 변경되면 수선비 비율 자동 계산
      const cost = parseFloat(value) || 0;
      const rent = parseFloat(newForm.rent) || 0;
      const annualRent = rent * 12; // 연간 임대료 수익
      if (annualRent > 0) {
        const newRate = (cost * 10000 / annualRent * 100).toFixed(1);
        newForm = { ...newForm, repairCostRate: newRate };
      }
    } else if (name === 'otherExpensesRate') {
      // 기타경비 비율이 변경되면 기타경비 자동 계산
      const rate = parseFloat(value) || 0;
      const rent = parseFloat(newForm.rent) || 0;
      const annualRent = rent * 12; // 연간 임대료 수익
      const newOtherExpenses = (annualRent * rate / 100 / 10000).toFixed(1); // 만엔 단위로 변환
      newForm = { ...newForm, otherExpenses: newOtherExpenses };
    } else if (name === 'otherExpenses') {
      // 기타경비가 변경되면 기타경비 비율 자동 계산
      const expenses = parseFloat(value) || 0;
      const rent = parseFloat(newForm.rent) || 0;
      const annualRent = rent * 12; // 연간 임대료 수익
      if (annualRent > 0) {
        const newRate = (expenses * 10000 / annualRent * 100).toFixed(1);
        newForm = { ...newForm, otherExpensesRate: newRate };
      }
    }

    setForm(newForm);
  };

  // 입력값 범위 검증 함수
  const validateInput = (name: string, value: string): { isValid: boolean; message?: string } => {
    const numValue = parseFloat(value);

    switch (name) {
      case 'price':
        if (numValue < 0) return { isValid: false, message: '매입가는 0 이상이어야 합니다.' };
        if (numValue > 100000) return { isValid: false, message: '매입가는 100,000万円 이하여야 합니다.' };
        break;
      case 'rate':
        if (numValue < 0) return { isValid: false, message: '금리는 0% 이상이어야 합니다.' };
        if (numValue > 100) return { isValid: false, message: '금리는 100% 이하여야 합니다.' };
        break;
      case 'term':
        if (numValue < 1) return { isValid: false, message: '대출 기간은 1년 이상이어야 합니다.' };
        if (numValue > 35) return { isValid: false, message: '대출 기간은 35년 이하여야 합니다.' };
        break;
      case 'rent':
        if (numValue < 0) return { isValid: false, message: '월세 수익은 0円 이상이어야 합니다.' };
        if (numValue > 1000000) return { isValid: false, message: '월세 수익은 1,000,000円 이하여야 합니다.' };
        break;
      case 'maintenanceCost':
        if (numValue < 0) return { isValid: false, message: '연간 유지비는 0円 이상이어야 합니다.' };
        if (numValue > 10000000) return { isValid: false, message: '연간 유지비는 10,000,000円 이하여야 합니다.' };
        break;
      case 'grossYield':
        if (numValue < 0) return { isValid: false, message: '표면이율은 0% 이상이어야 합니다.' };
        if (numValue > 50) return { isValid: false, message: '표면이율은 50% 이하여야 합니다.' };
        break;
      case 'buildingArea':
        if (numValue < 0) return { isValid: false, message: '건물면적은 0m² 이상이어야 합니다.' };
        if (numValue > 10000) return { isValid: false, message: '건물면적은 10,000m² 이하여야 합니다.' };
        break;
      case 'ownCapital':
        if (numValue < 0) return { isValid: false, message: '자기자금은 0万円 이상이어야 합니다.' };
        if (numValue > 100000) return { isValid: false, message: '자기자금은 100,000万円 이하여야 합니다.' };
        break;
      case 'buildingPrice':
        if (numValue < 0) return { isValid: false, message: '건물가격은 0万円 이상이어야 합니다.' };
        if (numValue > 100000) return { isValid: false, message: '건물가격은 100,000万円 이하여야 합니다.' };
        break;
      case 'occupancyRate':
        if (numValue < 0) return { isValid: false, message: '입주율은 0% 이상이어야 합니다.' };
        if (numValue > 100) return { isValid: false, message: '입주율은 100% 이하여야 합니다.' };
        break;
      case 'startDate':
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) return { isValid: false, message: '대출 시작일은 오늘 이후여야 합니다.' };
        break;
      case 'rentFixedPeriod':
        if (numValue < 1) return { isValid: false, message: '월세 고정 기간은 1년 이상이어야 합니다.' };
        if (numValue > 20) return { isValid: false, message: '월세 고정 기간은 20년 이하여야 합니다.' };
        break;
      case 'rentAdjustmentInterval':
        if (numValue < 1) return { isValid: false, message: '월세 조정 시기는 1년 이상이어야 합니다.' };
        if (numValue > 10) return { isValid: false, message: '월세 조정 시기는 10년 이하여야 합니다.' };
        break;
      case 'rentAdjustmentRate':
        if (numValue < 0) return { isValid: false, message: '월세 조정 비율은 0% 이상이어야 합니다.' };
        if (numValue > 100) return { isValid: false, message: '월세 조정 비율은 100% 이하여야 합니다.' };
        break;
      case 'propertyTax':
        if (numValue < 0) return { isValid: false, message: '고정자산세+도시계획세는 0万円 이상이어야 합니다.' };
        if (numValue > 10000) return { isValid: false, message: '고정자산세+도시계획세는 10,000万円 이하여야 합니다.' };
        break;
      case 'managementFeeRate':
        if (numValue < 0) return { isValid: false, message: '관리비 비율은 0% 이상이어야 합니다.' };
        if (numValue > 100) return { isValid: false, message: '관리비 비율은 100% 이하여야 합니다.' };
        break;
      case 'managementFee':
        if (numValue < 0) return { isValid: false, message: '관리비는 0万円 이상이어야 합니다.' };
        if (numValue > 10000) return { isValid: false, message: '관리비는 10,000万円 이하여야 합니다.' };
        break;
      case 'repairCostRate':
        if (numValue < 0) return { isValid: false, message: '수선비 비율은 0% 이상이어야 합니다.' };
        if (numValue > 100) return { isValid: false, message: '수선비 비율은 100% 이하여야 합니다.' };
        break;
      case 'repairCost':
        if (numValue < 0) return { isValid: false, message: '수선비는 0万円 이상이어야 합니다.' };
        if (numValue > 10000) return { isValid: false, message: '수선비는 10,000万円 이하여야 합니다.' };
        break;
      case 'otherExpensesRate':
        if (numValue < 0) return { isValid: false, message: '기타경비 비율은 0% 이상이어야 합니다.' };
      case 'otherExpenses':
        if (numValue < 0) return { isValid: false, message: '기타경비는 0万円 이상이어야 합니다.' };
        if (numValue > 10000) return { isValid: false, message: '기타경비는 10,000万円 이하여야 합니다.' };
        break;
    }

    // 제비용과 유지비 필드 검증
    if (name.startsWith('initialCost') && !name.endsWith('Name')) {
      if (numValue < 0) return { isValid: false, message: '제비용은 0円 이상이어야 합니다.' };
      if (numValue > 10000000) return { isValid: false, message: '제비용은 10,000,000円 이하여야 합니다.' };
    }

    if (name.startsWith('maintenance') && !name.endsWith('Name')) {
      if (numValue < 0) return { isValid: false, message: '유지비는 0円 이상이어야 합니다.' };
      if (numValue > 1000000) return { isValid: false, message: '유지비는 1,000,000円 이하여야 합니다.' };
    }

    return { isValid: true };
  };

  // 컴포넌트 마운트 시 첫 번째 입력 필드에 포커스
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [])

  // const update = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setForm({ ...form, [e.target.name]: e.target.value })
  // }

  // 동적 name을 처리하는 함수
  const updateWithDynamicName = (fieldName: string, value: string) => {
    // 입력값 범위 검증
    const validationResult = validateInput(fieldName, value);
    if (!validationResult.isValid) {
      alert(validationResult.message);
      return;
    }

    let newForm = { ...form, [fieldName]: value };

    // 제비용이 변경된 경우 표면이율 재계산
    if (fieldName.startsWith('initialCost') && !fieldName.endsWith('Name')) {
      // Re-trigger calculation logic
      const event = { target: { name: fieldName, value } } as React.ChangeEvent<HTMLInputElement>;
      handleInputChange(event);
    } else {
      setForm({ ...form, [fieldName]: value });
    }
  }

  // 편집 시작
  const startEditing = (fieldName: string, currentValue: string) => {
    setEditingField(fieldName)
    setEditValue(currentValue)
  }

  // 편집 완료
  const finishEditing = () => {
    if (editingField && editValue.trim()) {
      setForm(prevForm => ({ ...prevForm, [editingField]: editValue.trim() }))
    }
    setEditingField(null)
    setEditValue('')
  }

  // 편집 취소
  const cancelEditing = () => {
    setEditingField(null)
    setEditValue('')
  }

  // Enter 키로 편집 완료
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEditing()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  // 유지비 합계 계산
  const maintenanceTotal = [
    (parseFloat(form.propertyTax) || 0) * 10000,
    (parseFloat(form.managementFee) || 0) * 10000,
    (parseFloat(form.repairCost) || 0) * 10000,
    (parseFloat(form.otherExpenses) || 0) * 10000,
    parseFloat(form.maintenance1) || 0,
    parseFloat(form.maintenance2) || 0,
    parseFloat(form.maintenance3) || 0,
    parseFloat(form.maintenance4) || 0,
    parseFloat(form.maintenance5) || 0
  ].reduce((sum, cost) => sum + cost, 0)

  const handleCalculate = () => {
    // 필수 필드 검증
    if (!form.name || !form.price || !form.rate || !form.term || !form.rent) {
      alert('필수 필드를 모두 입력해주세요.')
      return
    }

    // 계산용 데이터 준비
    const calculationData = {
      ...form,
      price: form.price || '0',
      grossYield: form.grossYield || '0',
      buildingArea: form.buildingArea || '0',
      ownCapital: form.ownCapital || '0',
      buildingPrice: form.buildingPrice || '0',
      occupancyRate: form.occupancyRate || '0',
      rate: form.rate || '0',
      term: form.term || '0',
      rent: form.rent || '0',
      propertyTax: form.propertyTax || '0',
      managementFeeRate: form.managementFeeRate || '0',
      managementFee: form.managementFee || '0',
      repairCostRate: form.repairCostRate || '0',
      repairCost: form.repairCost || '0',
      otherExpensesRate: form.otherExpensesRate || '0',
      otherExpenses: form.otherExpenses || '0',
      initialCost1: form.initialCost1 || '0',
      initialCost2: form.initialCost2 || '0',
      initialCost3: form.initialCost3 || '0',
      initialCost4: form.initialCost4 || '0',
      initialCost5: form.initialCost5 || '0',
      maintenance1: form.maintenance1 || '0',
      maintenance2: form.maintenance2 || '0',
      maintenance3: form.maintenance3 || '0',
      maintenance4: form.maintenance4 || '0',
      maintenance5: form.maintenance5 || '0',
      loan: (loanAmount / 10000).toString(), // 万円 단위로 변환
      expense: maintenanceTotal.toString(),
      rentFixedPeriod: form.rentFixedPeriod || '1',
      rentAdjustmentInterval: form.rentAdjustmentInterval || '1',
      rentAdjustmentRate: form.rentAdjustmentRate || '0',
    };

    onCalculate(calculationData)
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

  return (
    <div className="max-w-6xl mx-auto bg-white p-6 rounded-xl shadow-md space-y-8">
      <h1 className="text-2xl font-bold text-center text-gray-800">부동산 수익 계산기</h1>

      {/* 첫 번째 블럭: 물건 정보 */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h2 className="text-lg font-semibold text-blue-800 mb-4">🏠 물건 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="relative">
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={(e) => handleLabelClick('name', e)}
            >
              물건 이름 *
            </label>
            <input
              ref={nameInputRef}
              name="name"
              value={form.name}
              onChange={handleInputChange}
              placeholder="물건 이름을 입력하세요"
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors h-12"
            />
          </div>
          <div className="relative">
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={(e) => handleLabelClick('price', e)}
            >
              매입가 *
            </label>
            <input
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
            <label className="block text-sm font-medium text-gray-700 mb-1">총매입비용</label>
            <div className="border border-gray-300 p-3 w-full rounded-lg bg-gray-50 h-12 flex items-center justify-between">
              <span className="text-sm text-gray-600">매입가 + 제비용 합계</span>
              <span className="text-lg font-bold text-blue-600">
                {totalPurchaseCost.toLocaleString()} 円
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={(e) => handleLabelClick('grossYield', e)}
            >
              表面利回り
            </label>
            <input
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
          <div className="relative">
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={(e) => handleLabelClick('structure', e)}
            >
              구조
            </label>
            <select
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
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={(e) => handleLabelClick('buildingAge', e)}
            >
              築年数
            </label>
            <select
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
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={(e) => handleLabelClick('buildingArea', e)}
            >
              建物面積
            </label>
            <input
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
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={(e) => handleLabelClick('ownCapital', e)}
            >
              자기자금
            </label>
            <input
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
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={(e) => handleLabelClick('buildingPrice', e)}
            >
              건물가격
            </label>
            <input
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
            <label className="block text-sm font-medium text-gray-700 mb-1">감가상각비</label>
            <div className="border border-gray-300 p-3 w-full rounded-lg bg-gray-50 h-12 flex items-center justify-between">
              <span className="text-sm text-gray-600">건물가격 ÷ 내용연수</span>
              <span className="text-lg font-bold text-blue-600">
                {(depreciationExpense / 10000).toFixed(1)} 万円/년
              </span>
            </div>
          </div>
          <div className="relative">
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={(e) => handleLabelClick('occupancyRate', e)}
            >
              입주율
            </label>
            <input
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
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-green-600 transition-colors"
              onClick={(e) => handleLabelClick('rate', e)}
            >
              금리 *
            </label>
            <input
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
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-green-600 transition-colors"
              onClick={(e) => handleLabelClick('term', e)}
            >
              대출 기간 *
            </label>
            <input
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
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-green-600 transition-colors"
              onClick={(e) => handleLabelClick('startDate', e)}
            >
              대출 시작일
            </label>
            <input
              type="date"
              name="startDate"
              min={new Date().toISOString().split('T')[0]}
              value={form.startDate || ""}
              onChange={handleInputChange}
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors h-12"
            />
          </div>
          <div className="relative">
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-green-600 transition-colors"
              onClick={(e) => handleLabelClick('loanAmount', e)}
            >
              대출 금액
            </label>
            <div className="border border-gray-300 p-3 w-full rounded-lg bg-gray-50 h-12 flex items-center justify-between">
              <span className="text-sm text-gray-600">총매입비용 - 자기자금</span>
              <span className="text-lg font-bold text-green-600">
                {(loanAmount / 10000).toFixed(1)} 万円
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
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-yellow-600 transition-colors"
              onClick={(e) => handleLabelClick('rent', e)}
            >
              월세 수익 *
            </label>
            <input
              name="rent"
              type="number"
              min="0"
              max="1000000"
              value={form.rent}
              onChange={handleInputChange}
              placeholder="월세 수익"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">円</span>
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">연간 수익</label>
            <div className="border border-gray-300 p-3 w-full rounded-lg bg-gray-50 h-12 flex items-center justify-between">
              <span className="text-sm text-gray-600">월세수익 x 12</span>
              <span className="text-lg font-bold text-yellow-600">
                {annualIncome.toLocaleString()} 円
              </span>
            </div>
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">입주율 반영 수익</label>
            <div className="border border-gray-300 p-3 w-full rounded-lg bg-gray-50 h-12 flex items-center justify-between">
              <span className="text-sm text-gray-600">연간수익 x 입주율</span>
              <span className="text-lg font-bold text-yellow-600">
                {occupancyAdjustedIncome.toLocaleString()} 円
              </span>
            </div>
          </div>
        </div>

        {/* 월세 조정 관련 필드들 - 내부 계산용으로만 사용 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="relative">
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-yellow-600 transition-colors"
              onClick={(e) => handleLabelClick('rentFixedPeriod', e)}
            >
              월세 고정 기간
            </label>
            <select
              name="rentFixedPeriod"
              value={form.rentFixedPeriod}
              onChange={handleInputChange}
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-yellow-600 transition-colors"
              onClick={(e) => handleLabelClick('rentAdjustmentInterval', e)}
            >
              월세 조정 시기
            </label>
            <select
              name="rentAdjustmentInterval"
              value={form.rentAdjustmentInterval}
              onChange={handleInputChange}
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-yellow-600 transition-colors"
              onClick={(e) => handleLabelClick('rentAdjustmentRate', e)}
            >
              월세 조정 비율
            </label>
            <input
              name="rentAdjustmentRate"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={form.rentAdjustmentRate}
              onChange={handleInputChange}
              placeholder="월세 조정 비율"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">%</span>
          </div>
        </div>
      </div>

      {/* 네 번째 블럭: 제비용 세부항목 */}
      <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
        <h2 className="text-lg font-semibold text-purple-800 mb-4">💸 제비용 세부항목</h2>
        <div className="mb-4 p-4 bg-white rounded-lg border border-purple-300">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-purple-800">제비용 합계:</span>
            <span className="text-2xl font-bold text-purple-600">{initialCostTotal.toLocaleString()} 円</span>
          </div>
        </div>
        <div className="text-sm text-purple-600 mb-4 italic">💡 라벨을 클릭하여 항목 이름을 변경할 수 있습니다</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((num) => (
            <div key={num} className="relative">
              <div className="flex items-center mb-1">
                {editingField === `initialCost${num}Name` ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={handleKeyPress}
                    className="text-sm font-medium text-gray-700 bg-white border border-purple-300 rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    autoFocus
                  />
                ) : (
                  <label
                    className="block text-sm font-medium text-gray-700 cursor-pointer hover:text-purple-600 transition-colors"
                    onClick={(e) => startEditing(`initialCost${num}Name`, form[`initialCost${num}Name` as keyof typeof form] as string)}
                    title="클릭하여 이름 변경"
                  >
                    {form[`initialCost${num}Name` as keyof typeof form]} *
                  </label>
                )}
              </div>
              <input
                name={`initialCost${num}`}
                type="number"
                min="0"
                max="10000000"
                value={form[`initialCost${num}` as keyof typeof form]}
                onChange={(e) => updateWithDynamicName(`initialCost${num}`, e.target.value)}
                placeholder=""
                className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors h-12"
              />
              <span className="absolute right-3 top-9 text-gray-500">円</span>
            </div>
          ))}
        </div>
      </div>

      {/* 다섯 번째 블럭: 유지비 세부항목 */}
      <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
        <h2 className="text-lg font-semibold text-orange-800 mb-4">🔧 유지비 세부항목</h2>
        <div className="mb-4 p-4 bg-white rounded-lg border border-orange-300">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-orange-800">연간 유지비 합계:</span>
            <span className="text-2xl font-bold text-orange-600">{maintenanceTotal.toLocaleString()} 円</span>
          </div>
        </div>

        {/* 고정 유지비 항목들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-yellow-600 transition-colors"
              onClick={(e) => handleLabelClick('propertyTax', e)}
            >
              고정자산세+도시계획세
            </label>
            <input
              name="propertyTax"
              type="number"
              min="0"
              max="10000"
              value={form.propertyTax}
              onChange={handleInputChange}
              placeholder="고정자산세+도시계획세"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-yellow-600 transition-colors"
              onClick={(e) => handleLabelClick('managementFeeRate', e)}
            >
              관리비 비율
            </label>
            <input
              name="managementFeeRate"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={form.managementFeeRate}
              onChange={handleInputChange}
              placeholder="관리비 비율"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">%</span>
          </div>
          <div className="relative">
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-yellow-600 transition-colors"
              onClick={(e) => handleLabelClick('managementFee', e)}
            >
              관리비
            </label>
            <input
              name="managementFee"
              type="number"
              min="0"
              max="10000"
              value={form.managementFee}
              onChange={handleInputChange}
              placeholder="관리비"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-yellow-600 transition-colors"
              onClick={(e) => handleLabelClick('repairCostRate', e)}
            >
              수선비 비율
            </label>
            <input
              name="repairCostRate"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={form.repairCostRate}
              onChange={handleInputChange}
              placeholder="수선비 비율"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">%</span>
          </div>
          <div className="relative">
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-yellow-600 transition-colors"
              onClick={(e) => handleLabelClick('repairCost', e)}
            >
              수선비
            </label>
            <input
              name="repairCost"
              type="number"
              min="0"
              max="10000"
              value={form.repairCost}
              onChange={handleInputChange}
              placeholder="수선비"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
          <div className="relative">
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-yellow-600 transition-colors"
              onClick={(e) => handleLabelClick('otherExpensesRate', e)}
            >
              기타경비 비율
            </label>
            <input
              name="otherExpensesRate"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={form.otherExpensesRate}
              onChange={handleInputChange}
              placeholder="기타경비 비율"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">%</span>
          </div>
          <div className="relative">
            <label
              className="block text-sm font-medium text-gray-700 mb-1 cursor-pointer hover:text-yellow-600 transition-colors"
              onClick={(e) => handleLabelClick('otherExpenses', e)}
            >
              기타경비
            </label>
            <input
              name="otherExpenses"
              type="number"
              min="0"
              max="10000"
              value={form.otherExpenses}
              onChange={handleInputChange}
              placeholder="기타경비"
              className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors h-12"
            />
            <span className="absolute right-3 top-9 text-gray-500">万円</span>
          </div>
        </div>

        <hr className="my-6 border-orange-300" />

        <div className="text-sm text-orange-600 mb-4 italic">💡 라벨을 클릭하여 항목 이름을 변경할 수 있습니다</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((num) => (
            <div key={num} className="relative">
              <div className="flex items-center mb-1">
                {editingField === `maintenance${num}Name` ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={handleKeyPress}
                    className="text-sm font-medium text-gray-700 bg-white border border-orange-300 rounded px-2 py-1 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    autoFocus
                  />
                ) : (
                  <label
                    className="block text-sm font-medium text-gray-700 cursor-pointer hover:text-orange-600 transition-colors"
                    onClick={(e) => startEditing(`maintenance${num}Name`, form[`maintenance${num}Name` as keyof typeof form] as string)}
                    title="클릭하여 이름 변경"
                  >
                    {form[`maintenance${num}Name` as keyof typeof form]} *
                  </label>
                )}
              </div>
              <input
                name={`maintenance${num}`}
                type="number"
                min="0"
                max="1000000"
                value={form[`maintenance${num}` as keyof typeof form]}
                onChange={(e) => updateWithDynamicName(`maintenance${num}`, e.target.value)}
                placeholder=""
                className="border border-gray-300 p-3 pr-12 w-full rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors h-12"
              />
              <span className="absolute right-3 top-9 text-gray-500">円</span>
            </div>
          ))}
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
