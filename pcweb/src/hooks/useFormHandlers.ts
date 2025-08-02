import { FormInputData } from '../../../shared/types/RealEstateForm'
import { 
  calculateBuildingPrice,
  calculateBrokerageFee,
  calculateRegistrationFee,
  calculateAcquisitionTax,
  calculatePropertyTax
} from '../../../shared/utils/formUtils'

const STRUCTURE_LIFESPANS: { [key: string]: number } = {
  'RC': 47,
  'SRC': 47,
  '철골조': 34,
  '경량철골조': 19,
  '목조': 22
}

// 표면이율 연동 계산
const updateGrossYieldCalculations = (newForm: FormInputData, name: string, value: string): FormInputData => {
  const purchasePrice = parseFloat(newForm.price) || 0; // 매입가만 사용 (표면 이익율 계산용)

  if (name === 'rent' || (name.startsWith('initialCost') && !name.endsWith('Name'))) {
    const rent = parseFloat(newForm.rent) || 0;
    if (purchasePrice > 0 && rent > 0) {
      const newGrossYield = (rent * 12 / purchasePrice * 100).toFixed(1);
      return { ...newForm, grossYield: newGrossYield };
    }
  } else if (name === 'price') {
    const grossYield = parseFloat(newForm.grossYield) || 6.0;
    if (purchasePrice > 0) {
      const newRent = (purchasePrice * grossYield / 100 / 12).toFixed(1);
      return { ...newForm, rent: newRent };
    }
  } else if (name === 'grossYield') {
    const grossYield = parseFloat(value) || 0;
    if (purchasePrice > 0) {
      const newRent = (purchasePrice * grossYield / 100 / 12).toFixed(1);
      return { ...newForm, rent: newRent };
    }
  }

  return newForm;
}

// 관리비와 관리비율 상호 연동
const updateManagementFeeCalculations = (newForm: FormInputData, name: string, value: string): FormInputData => {
  const monthlyRentInManYen = parseFloat(newForm.rent) || 0; // 만엔 단위 월세

  if (name === 'managementFeeRate') {
    const rate = parseFloat(value) || 0;
    if (monthlyRentInManYen > 0) {
      const managementFeeInManYen = monthlyRentInManYen * (rate / 100);
      return { ...newForm, managementFee: managementFeeInManYen.toFixed(1) };
    }
  } else if (name === 'managementFee') {
    const feeInManYen = parseFloat(value) || 0;
    if (monthlyRentInManYen > 0) {
      const rate = ((feeInManYen / monthlyRentInManYen) * 100).toFixed(1);
      return { ...newForm, managementFeeRate: rate };
    }
  } else if (name === 'rent') {
    // 월세가 변경된 경우 관리비율에 따라 관리비 재계산
    const rate = parseFloat(newForm.managementFeeRate) || 0;
    if (monthlyRentInManYen > 0 && rate > 0) {
      const managementFeeInManYen = monthlyRentInManYen * (rate / 100);
      return { ...newForm, managementFee: managementFeeInManYen.toFixed(1) };
    }
  }

  return newForm;
}

// 수선비와 수선비율 상호 연동
const updateMaintenanceFeeCalculations = (newForm: FormInputData, name: string, value: string): FormInputData => {
  const monthlyRentInManYen = parseFloat(newForm.rent) || 0; // 만엔 단위 월세

  if (name === 'maintenanceFeeRate') {
    const rate = parseFloat(value) || 0;
    if (monthlyRentInManYen > 0) {
      const maintenanceFeeInManYen = monthlyRentInManYen * (rate / 100);
      return { ...newForm, maintenanceFee: maintenanceFeeInManYen.toFixed(1) };
    }
  } else if (name === 'maintenanceFee') {
    const feeInManYen = parseFloat(value) || 0;
    if (monthlyRentInManYen > 0) {
      const rate = ((feeInManYen / monthlyRentInManYen) * 100).toFixed(1);
      return { ...newForm, maintenanceFeeRate: rate };
    }
  } else if (name === 'rent') {
    // 월세가 변경된 경우 수선비율에 따라 수선비 재계산
    const rate = parseFloat(newForm.maintenanceFeeRate) || 0;
    if (monthlyRentInManYen > 0 && rate > 0) {
      const maintenanceFeeInManYen = monthlyRentInManYen * (rate / 100);
      return { ...newForm, maintenanceFee: maintenanceFeeInManYen.toFixed(1) };
    }
  }

  return newForm;
}

// 제비용 자동 계산 업데이트 (README 공식 적용)
const updateAcquisitionCostAutoCalculations = (newForm: FormInputData, name: string): FormInputData => {
  const price = parseFloat(newForm.price) || 0;
  
  // 매입가격이 변경된 경우 자동 계산
  if (name === 'price' && price > 0) {
    // 건물가격: 매입가격의 25%
    const buildingPrice = calculateBuildingPrice(price);
    
    // 중개수수료: (매매가격 × 3%) + 6만엔 + 소비세(합계금액의 10%)
    const brokerageFee = calculateBrokerageFee(price);
    
    // 등기비: 소유권 이전 등기(0.4%) + 저당권 설정 등기(0.4%) + 추가 등기비(10만엔)
    const registrationFee = calculateRegistrationFee(price);
    
    // 부동산 취득세: 건물 + 토지 계산
    const acquisitionTax = calculateAcquisitionTax(price, buildingPrice);
    
    // 고정자산세: 건물만 계산 (토지 제외)
    const propertyTax = calculatePropertyTax(buildingPrice);
    
    // 자기자금 계산: 총 제비용을 먼저 계산
    const totalAcquisitionCosts = brokerageFee + registrationFee + acquisitionTax;
    const selfCapital = totalAcquisitionCosts; // 제비용 그대로 자기자금에 입력
    
    return {
      ...newForm,
      buildingPrice: buildingPrice.toFixed(0),
      brokerageFee: brokerageFee.toFixed(1),
      registrationFee: registrationFee.toFixed(1),
      acquisitionTax: acquisitionTax.toFixed(1),
      propertyTax: propertyTax.toFixed(1),
      ownCapital: selfCapital.toFixed(0) // 자기자금 자동 설정
    };
  }
  
  return newForm;
}

// 유지비 자동 계산 업데이트 (README 공식 적용)
const updateMaintenanceCostAutoCalculations = (newForm: FormInputData, name: string): FormInputData => {
  const rent = parseFloat(newForm.rent) || 0;
  
  // 월세가 변경된 경우 관리비/수선비 자동 계산 (비율이 설정된 경우)
  if (name === 'rent' && rent > 0) {
    const managementFeeRate = parseFloat(newForm.managementFeeRate) || 0;
    const maintenanceFeeRate = parseFloat(newForm.maintenanceFeeRate) || 0;
    
    let updatedForm = { ...newForm };
    
    // 관리비율이 설정된 경우 관리비 자동 계산
    if (managementFeeRate > 0) {
      const managementFee = rent * (managementFeeRate / 100);
      updatedForm.managementFee = managementFee.toFixed(1);
    }
    
    // 수선비율이 설정된 경우 수선비 자동 계산
    if (maintenanceFeeRate > 0) {
      const maintenanceFee = rent * (maintenanceFeeRate / 100);
      updatedForm.maintenanceFee = maintenanceFee.toFixed(1);
    }
    
    return updatedForm;
  }
  
  // 관리비율이 변경된 경우 관리비 자동 계산
  if (name === 'managementFeeRate') {
    const rate = parseFloat(newForm.managementFeeRate) || 0;
    if (rate > 0 && rent > 0) {
      const managementFee = rent * (rate / 100);
      return { ...newForm, managementFee: managementFee.toFixed(1) };
    } else if (rate === 0) {
      // 비율이 0이면 관리비도 0으로 설정
      return { ...newForm, managementFee: '0' };
    }
  }
  
  // 수선비율이 변경된 경우 수선비 자동 계산
  if (name === 'maintenanceFeeRate') {
    const rate = parseFloat(newForm.maintenanceFeeRate) || 0;
    if (rate > 0 && rent > 0) {
      const maintenanceFee = rent * (rate / 100);
      return { ...newForm, maintenanceFee: maintenanceFee.toFixed(1) };
    } else if (rate === 0) {
      // 비율이 0이면 수선비도 0으로 설정
      return { ...newForm, maintenanceFee: '0' };
    }
  }
  
  return newForm;
}

export const createInputChangeHandler = (
  form: FormInputData,
  setForm: (form: FormInputData) => void
) => {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newForm = { ...form, [name]: value };

    // 자동 계산 로직 적용 (README 공식 기반)
    newForm = updateAcquisitionCostAutoCalculations(newForm, name);

    // 표면이율 연동 계산
    const isRelatedToGrossYield = (name.startsWith('initialCost') && !name.endsWith('Name')) || ['price', 'rent', 'grossYield'].includes(name);
    if (isRelatedToGrossYield) {
      newForm = updateGrossYieldCalculations(newForm, name, value);
    }

    // 관리비 관련 계산 (개선된 로직)
    if (['managementFeeRate', 'managementFee', 'rent'].includes(name)) {
      newForm = updateManagementFeeCalculations(newForm, name, value);
    }

    // 수선비 관련 계산 (개선된 로직)
    if (['maintenanceFeeRate', 'maintenanceFee', 'rent'].includes(name)) {
      newForm = updateMaintenanceFeeCalculations(newForm, name, value);
    }

    setForm(newForm);
  };
}
