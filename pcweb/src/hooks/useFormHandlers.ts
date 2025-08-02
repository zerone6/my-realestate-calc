import { FormInputData } from '../../../shared/types/RealEstateForm'
import { calculateTotalPurchaseCost } from '../../../shared/utils/formUtils'

const STRUCTURE_LIFESPANS: { [key: string]: number } = {
  'RC': 47,
  'SRC': 47,
  '철골조': 34,
  '경량철골조': 19,
  '목조': 22
}

// 표면이율 연동 계산
const updateGrossYieldCalculations = (newForm: FormInputData, name: string, value: string): FormInputData => {
  const totalCost = calculateTotalPurchaseCost(newForm);

  if (name === 'rent' || (name.startsWith('initialCost') && !name.endsWith('Name'))) {
    const rent = parseFloat(newForm.rent) || 0;
    if (totalCost > 0 && rent > 0) {
      const newGrossYield = (rent * 12 / totalCost * 100).toFixed(1);
      return { ...newForm, grossYield: newGrossYield };
    }
  } else if (name === 'price') {
    const grossYield = parseFloat(newForm.grossYield) || 6.0;
    if (totalCost > 0) {
      const newRent = (totalCost * grossYield / 100 / 12).toFixed(1);
      return { ...newForm, rent: newRent };
    }
  } else if (name === 'grossYield') {
    const grossYield = parseFloat(value) || 0;
    if (totalCost > 0) {
      const newRent = (totalCost * grossYield / 100 / 12).toFixed(1);
      return { ...newForm, rent: newRent };
    }
  }

  return newForm;
}

// 관리비와 관리비율 상호 연동
const updateManagementFeeCalculations = (newForm: FormInputData, name: string, value: string): FormInputData => {
  const annualRentInYen = (parseFloat(newForm.rent) || 0) * 10000 * 12;

  if (name === 'managementFeeRate') {
    const rate = parseFloat(value) || 0;
    if (annualRentInYen > 0) {
      const managementFeeInYen = annualRentInYen * (rate / 100);
      const managementFeeInManYen = (managementFeeInYen / 10000).toFixed(1);
      return { ...newForm, managementFee: managementFeeInManYen };
    }
  } else if (name === 'managementFee') {
    const feeInManYen = parseFloat(value) || 0;
    if (annualRentInYen > 0) {
      const feeInYen = feeInManYen * 10000;
      const rate = ((feeInYen / annualRentInYen) * 100).toFixed(1);
      return { ...newForm, managementFeeRate: rate };
    }
  }

  return newForm;
}

// 수선비와 수선비율 상호 연동
const updateMaintenanceFeeCalculations = (newForm: FormInputData, name: string, value: string): FormInputData => {
  const annualRentInYen = (parseFloat(newForm.rent) || 0) * 10000 * 12;

  if (name === 'maintenanceFeeRate') {
    const rate = parseFloat(value) || 0;
    if (annualRentInYen > 0) {
      const maintenanceFeeInYen = annualRentInYen * (rate / 100);
      const maintenanceFeeInManYen = (maintenanceFeeInYen / 10000).toFixed(1);
      return { ...newForm, maintenanceFee: maintenanceFeeInManYen };
    }
  } else if (name === 'maintenanceFee') {
    const feeInManYen = parseFloat(value) || 0;
    if (annualRentInYen > 0) {
      const feeInYen = feeInManYen * 10000;
      const rate = ((feeInYen / annualRentInYen) * 100).toFixed(1);
      return { ...newForm, maintenanceFeeRate: rate };
    }
  }

  return newForm;
}

// 제비용 변경 시 월세 재계산
const updateAcquisitionCostCalculations = (newForm: FormInputData, name: string): FormInputData => {
  const acquisitionCostFields = ['brokerageFee', 'registrationFee', 'acquisitionTax', 'stampDuty', 'loanFee', 'surveyFee', 'miscellaneousFees'];
  
  if (acquisitionCostFields.includes(name)) {
    const newTotalCost = calculateTotalPurchaseCost(newForm);
    if (newTotalCost > 0) {
      const grossYield = parseFloat(newForm.grossYield) || 6.0;
      if (grossYield > 0) {
        const newRent = (newTotalCost * grossYield / 100 / 12).toFixed(1);
        return { ...newForm, rent: newRent };
      }
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

    // 표면이율 연동 계산
    const isRelatedToGrossYield = (name.startsWith('initialCost') && !name.endsWith('Name')) || ['price', 'rent', 'grossYield'].includes(name);
    if (isRelatedToGrossYield) {
      newForm = updateGrossYieldCalculations(newForm, name, value);
    }

    // 관리비 관련 계산
    if (['managementFeeRate', 'managementFee'].includes(name)) {
      newForm = updateManagementFeeCalculations(newForm, name, value);
    }

    // 수선비 관련 계산
    if (['maintenanceFeeRate', 'maintenanceFee'].includes(name)) {
      newForm = updateMaintenanceFeeCalculations(newForm, name, value);
    }

    // 제비용 관련 계산
    newForm = updateAcquisitionCostCalculations(newForm, name);

    setForm(newForm);
  };
}
