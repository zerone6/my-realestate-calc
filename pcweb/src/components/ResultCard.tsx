import { useState, useEffect, Fragment } from 'react';
import jsPDF from 'jspdf';
import { registerPretendardFont } from '../utils/pdfFonts';
import { RepaymentSchedule, TaxCalculation, FormInputData } from '../../../shared/types/RealEstateForm';

// 연간 자금 흐름 타입 (공용)
type YearlyFlow = {
  year: number;
  annualRent: number;
  annualPayment: number;
  annualPrincipal: number;
  annualInterest: number;
  annualMgmt: number;
  annualMaintenanceReserve: number;
  maintenanceSpent: number;
  annualPropTax: number;
  annualInsurance: number;
  annualOther: number;
  annualExpenseTotal: number; // 관리/수선 적립/세금/보험/기타 포함 (현금 유출)
  taxableIncome: number; // (임대수익 – 비용 – 이자 – 감가상각)
  annualDepreciation: number;
  corporateTax: number;
  localTax: number;
  totalTax: number;
  netCashFlowAfterTax: number; // 세후 CF
  cumulativeCFAfterTax: number;
  loanBalance: number;
  remainingValue: number; // 건물 잔존가치(감가)
  salePrice: number; // 매각가(시장경로)
  sellingFee: number; // 매각수수료
  netProceedsBeforeTax: number; // 세전 실수령액
  capitalGains: number; // 양도차익
  capitalGainsTax: number; // 양도소득세(법인세+지방세+사업세 합산)
  netProceedsAfterTax: number; // 세후 실수령액
};

// 멀티 라인 차트 (요구된 6개 지표 + 단위 스케일 & 스크롤)
const YearlyMultiLineChart = ({ data }: { data: YearlyFlow[] }) => {
  // 시리즈 정의 (요청 항목만)
  const rawSeries = [
    { key: 'netCashFlowAfterTax', label: '연간 CF(세후)', color: '#ef4444', getter: (d:YearlyFlow)=> d.netCashFlowAfterTax },
    { key: 'cumulativeCFAfterTax', label: '누적 CF', color: '#8b5cf6', getter: (d:YearlyFlow)=> d.cumulativeCFAfterTax },
    { key: 'loanBalance', label: '대출잔액', color: '#6b7280', getter: (d:YearlyFlow)=> d.loanBalance },
    { key: 'netProceedsAfterTax', label: '매각 순현금', color: '#10b981', getter: (d:YearlyFlow)=> d.netProceedsAfterTax }
  ] as const;
  const [visible, setVisible] = useState<Record<string, boolean>>(()=> rawSeries.reduce((m,s)=>{m[s.key]= true; return m;}, {} as Record<string, boolean>));
  const [scaleKey, setScaleKey] = useState<'円' | '천円' | '万円' | '백만円'>('万円');
  const scales: Record<typeof scaleKey, number> = { '円':1, '천円':1000, '万円':10000, '백만円':1000000 };
  const scale = scales[scaleKey];
  const toggleSeries = (key:string)=> setVisible(v=>({...v,[key]:!v[key]}));

  // 가로 스크롤 폭 (연차 많으면 자동 확장)
  const baseColWidth = 70; // 연 차트 간격
  const width = Math.max(900, data.length * baseColWidth);
  const height = 320; const padLeft = 48; const padRight=16; const padTop=24; const padBottom=40;
  const innerW = width - padLeft - padRight; const innerH = height - padTop - padBottom;
  const activeSeries = rawSeries.filter(s=> visible[s.key]);
  const values = data.flatMap(d => activeSeries.map(s=> s.getter(d)/scale));
  const maxYRaw = values.length? Math.max(...values):1;
  const minYRaw = Math.min(0, ...(values.length? values:[0]));
  // 축 라벨 수 동적 (값 차이가 클 때 여유)
  const ticks = 5;
  const yTicks = Array.from({length: ticks+1}, (_,i)=> minYRaw + (i*(maxYRaw-minYRaw))/ticks);
  const x = (i:number)=> padLeft + (data.length<=1? innerW/2 : (i/(data.length-1))*innerW);
  const y = (v:number)=> padTop + innerH - ((v - minYRaw)/(maxYRaw-minYRaw||1))*innerH;
  const pathFor = (sKey:string)=> data.map((d,i)=> `${i===0?'M':'L'} ${x(i)} ${y(((rawSeries.find(r=>r.key===sKey)!) .getter(d))/scale)}`).join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex flex-wrap items-center gap-4 mb-3 text-xs lg:text-sm">
        <div className="flex flex-wrap gap-3">
          {rawSeries.map(s=> (
            <label key={s.key} className="inline-flex items-center gap-1 cursor-pointer select-none">
              <input type="checkbox" checked={visible[s.key]} onChange={()=>toggleSeries(s.key)} />
              <span className="inline-flex items-center">
                <span className="w-3 h-3 rounded-sm mr-1" style={{backgroundColor:s.color}} />{s.label}
              </span>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">단위:</span>
          <select value={scaleKey} onChange={e=> setScaleKey(e.target.value as any)} className="border rounded px-1 py-0.5 text-xs">
            {Object.keys(scales).map(k=> <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="text-gray-400">(표시 값 ÷ {scale.toLocaleString()})</div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{minWidth: width}}>
        {/* Y Grid & labels */}
        {yTicks.map(t => (
          <g key={t}>
            <line x1={padLeft} x2={width-padRight} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeWidth={1} />
            <text x={8} y={y(t)+4} fontSize={10} fill="#6b7280">{Math.round(t).toLocaleString()}</text>
          </g>
        ))}
        {/* X Axis & ticks */}
        {data.map((d,i)=> (
          <g key={d.year}>
            <line x1={x(i)} x2={x(i)} y1={height - padBottom} y2={height - padBottom + 5} stroke="#9ca3af" />
            {(i%5===0 || i===data.length-1) && (
              <text x={x(i)} y={height - 8} fontSize={10} textAnchor="middle" fill="#6b7280">{d.year}</text>
            )}
          </g>
        ))}
        {/* Axes */}
        <line x1={padLeft} y1={height - padBottom} x2={width - padRight} y2={height - padBottom} stroke="#9ca3af" />
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={height - padBottom} stroke="#9ca3af" />
        {/* Lines */}
        {activeSeries.map(s=> <path key={s.key} d={pathFor(s.key)} fill="none" stroke={s.color} strokeWidth={2} />)}
      </svg>
    </div>
  );
};

interface CalculationResultProps {
  monthlyPayment: string;
  yearlyIncome: string;
  yearlyCost: string;
  yearlyProfit: string;
  yieldPercent: string;
  grossYield: string;
  equityYield: string;
  schedule: RepaymentSchedule[];
  taxCalculation: TaxCalculation;
  formData: FormInputData; // 추가된 prop
  onClose: () => void;
}

export function ResultCard({
  monthlyPayment,
  yearlyIncome,
  yearlyCost,
  yearlyProfit,
  yieldPercent,
  grossYield,
  equityYield,
  schedule,
  taxCalculation,
  formData, // 추가된 prop
  onClose
}: Readonly<CalculationResultProps>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<number | null>(null); // 툴팁 표시용
  const [activeTab, setActiveTab] = useState('summary'); // 탭 상태 관리
  const [selectedTaxYear, setSelectedTaxYear] = useState<number | null>(null); // 세금 계산 상세 보기용
  const itemsPerPage = 12;

  // 구조별 내용연수 매핑
  const STRUCTURE_LIFESPANS: { [key: string]: number } = {
    'RC': 47,
    'SRC': 47,
    '철골조': 34,
    '경량철골조': 19,
    '목조': 22
  };

  // 세금 계산 데이터 생성
  const generateTaxCalculations = (): TaxCalculation[] => {
    if (!formData || !schedule.length) return [];

    const buildingPrice = parseFloat(formData.buildingPrice) || 0;
    const structure = formData.structure;
    const lifespan = STRUCTURE_LIFESPANS[structure] || 22;
    const loanTerm = parseFloat(formData.term) || 35;

    // 연간 기본 비용들
    const annualPropertyTax = parseFloat(formData.propertyTax) || 0;
    const annualManagementFee = parseFloat(formData.managementFee) * 12 || 0;
    const annualInsurance = parseFloat(formData.insurance) || 0;
    const annualOtherExpenses = parseFloat(formData.otherExpenses) || 0;

    // 제비용 (첫해만)
    const acquisitionCosts = [
      parseFloat(formData.brokerageFee) || 0,
      parseFloat(formData.registrationFee) || 0,
      parseFloat(formData.acquisitionTax) || 0,
      parseFloat(formData.stampDuty) || 0,
      parseFloat(formData.loanFee) || 0,
      parseFloat(formData.surveyFee) || 0,
      parseFloat(formData.miscellaneousFees) || 0
    ].reduce((sum, cost) => sum + cost, 0) * 10000; // 만엔 -> 엔 변환

    const perYearDepreciation = lifespan > 0 ? (buildingPrice * 10000) / lifespan : 0; // 연간 감가상각비 (엔 단위)
    const totalYears = loanTerm; // 대출기간 전체를 표시, 내용연수 이후엔 감가상각 0

    const taxCalculations: TaxCalculation[] = [];

    for (let year = 1; year <= totalYears; year++) {
      // 해당 연도 스케줄 데이터 가져오기
      const yearStartIndex = (year - 1) * 12;
      const yearEndIndex = year * 12;
      const yearSchedule = schedule.slice(yearStartIndex, yearEndIndex);

      if (yearSchedule.length === 0) continue;

      // 연간 수입 및 비용 계산
      const annualRent = yearSchedule.reduce((sum, month) => sum + month.rent, 0);
      const annualInterest = yearSchedule.reduce((sum, month) => sum + month.interest, 0);

      // 감가상각: 내용연수 내에서만 발생
      const annualDepreciation = year <= lifespan ? perYearDepreciation : 0;
      // 부동산 잔존가치: 내용연수 이후 0 고정
      const depreciated = Math.min(year, lifespan) * perYearDepreciation;
      const remainingValue = Math.max(0, buildingPrice * 10000 - depreciated);

      // 과세소득 계산
      let totalExpenses = annualInterest + annualPropertyTax * 10000 + annualDepreciation +
        annualManagementFee * 10000 + annualInsurance * 10000 + annualOtherExpenses * 10000;

      // 첫해는 제비용 포함
      if (year === 1) {
        totalExpenses += acquisitionCosts;
      }

      const taxableIncome = Math.max(0, annualRent - totalExpenses);

      // 법인세 계산 (800만엔 이하 15%, 초과분 23.2%)
      let corporateTax = 0;
      if (taxableIncome <= 8000000) { // 800만엔 이하
        corporateTax = taxableIncome * 0.15;
      } else { // 800만엔 초과
        corporateTax = 8000000 * 0.15 + (taxableIncome - 8000000) * 0.232;
      }

      // 지방세 계산 (법인주민세 7% + 법인사업세 약 5%)
      const localTax = corporateTax * 0.07 + taxableIncome * 0.05;

      const totalTax = corporateTax + localTax;
      // 세후 CF(적립금 포함): 수선 적립은 제외(관리+세금+보험+기타만 비용으로 반영), 상환은 세금 표에서 제외이므로 유지
      const nonReserveExpenses = annualPropertyTax * 10000 + annualManagementFee * 10000 + annualInsurance * 10000 + annualOtherExpenses * 10000 + annualDepreciation + annualInterest;
      const netCashFlow = annualRent - nonReserveExpenses - totalTax;

      taxCalculations.push({
        year,
        annualDepreciation,
        remainingValue,
        annualRent,
        loanInterest: annualInterest,
        propertyTax: annualPropertyTax * 10000,
        managementFee: annualManagementFee * 10000,
        insurance: annualInsurance * 10000,
        otherExpenses: annualOtherExpenses * 10000,
        acquisitionCosts: year === 1 ? acquisitionCosts : undefined,
        taxableIncome,
        corporateTax,
        localTax,
        totalTax,
        netCashFlow
      });
    }

    return taxCalculations;
  };

  const taxCalculations = generateTaxCalculations();

  // 연간 자금 흐름 계산 (기타/요약 그래프 공용)

  // 내부 헬퍼들로 분리해 복잡도 낮추기
  const calcAnnualMgmt = (months: RepaymentSchedule[], mgmtRate: number, mgmtFixedMonthly: number) =>
    months.reduce((s, m) => s + Math.max(m.rent * (mgmtRate / 100), mgmtFixedMonthly), 0);
  const calcAnnualReserve = (months: RepaymentSchedule[], rate: number, fixedMonthly: number) =>
    months.reduce((s, m) => s + Math.max(m.rent * (rate / 100), fixedMonthly), 0);
  const calcSalePrice = (acq: number, year: number, after11: number) => {
    let price = acq;
    const y1 = Math.min(year, 5); price *= Math.pow(0.98, y1);
    if (year > 5) { const y2 = Math.min(year - 5, 5); price *= Math.pow(0.99, y2); }
    if (year > 10) { const y3 = year - 10; price *= Math.pow(1 + after11, y3); }
    return price;
  };
  const calcCorpTax = (income: number) => income <= 8000000 ? income * 0.15 : 8000000 * 0.15 + (income - 8000000) * 0.232;

  const computeYearlyFlows = (): YearlyFlow[] => {
    if (!formData || !schedule.length) return [];
    const termYears = Math.max(1, parseInt(formData.term || '1', 10));
    const mgmtRate = parseFloat(formData.managementFeeRate || '0') || 0;
    const mgmtComRate = parseFloat((formData as any).managementCommissionRate || '0') || 0;
    const maintRate = parseFloat(formData.maintenanceFeeRate || '0') || 0;
    const mgmtFixedMonthly = (parseFloat(formData.managementFee || '0') || 0) * 10000;
    const mgmtComFixedMonthly = (parseFloat((formData as any).managementCommissionFee || '0') || 0) * 10000;
    const maintFixedMonthly = (parseFloat(formData.maintenanceFee || '0') || 0) * 10000;
    const propTaxAnnual = (parseFloat(formData.propertyTax || '0') || 0) * 10000;
    const insuranceAnnual = (parseFloat(formData.insurance || '0') || 0) * 10000;
    const otherAnnual = (parseFloat(formData.otherExpenses || '0') || 0) * 10000;
    const acquisitionPriceYen = (parseFloat((formData.price as any) || '0') || 0) * 10000;
    const structureLifespan = STRUCTURE_LIFESPANS[formData.structure] || 22;
    const buildingPriceYen = (parseFloat(formData.buildingPrice) || 0) * 10000;
    const perYearDep = structureLifespan > 0 ? buildingPriceYen / structureLifespan : 0;
    const years: YearlyFlow[] = [];
    let cumulativeCFAfterTax = 0;
    let maintenanceReserve = 0;
    const saleGrowthAfter11 = 0.0; // 11년차 이후 0%
    for (let y = 1; y <= termYears; y++) {
      const yearStart = (y - 1) * 12;
      const yearEnd = Math.min(y * 12, schedule.length);
      const months = schedule.slice(yearStart, yearEnd);
      if (!months.length) break;
      const annualRent = months.reduce((s, m) => s + m.rent, 0);
      const annualPayment = months.reduce((s, m) => s + m.payment, 0);
      const annualPrincipal = months.reduce((s, m) => s + m.principal, 0);
      const annualInterest = months.reduce((s, m) => s + m.interest, 0);
      // 관리비 + 관리수수료를 합산하여 연간 관리비로 취급
      const annualMgmt = calcAnnualMgmt(months, mgmtRate, mgmtFixedMonthly)
        + calcAnnualMgmt(months, mgmtComRate, mgmtComFixedMonthly);
      const annualMaintenanceReserve = calcAnnualReserve(months, maintRate, maintFixedMonthly);
      maintenanceReserve += annualMaintenanceReserve;
      let maintenanceSpent = 0; if (y % 10 === 0) { maintenanceSpent = maintenanceReserve; maintenanceReserve = 0; }
      const annualPropTax = propTaxAnnual;
      const annualInsurance = insuranceAnnual;
      const annualOther = otherAnnual;
      const annualExpenseTotal = annualMgmt + annualMaintenanceReserve + annualPropTax + annualInsurance + annualOther;
      const annualNonReserveExpense = annualMgmt + annualPropTax + annualInsurance + annualOther; // 적립 제외 비용 묶음

      // 세금 계산(과세소득 = 임대수익 – 비용 – 이자 – 감가상각)
      const annualDepreciation = y <= structureLifespan ? perYearDep : 0;
      const taxableIncomeRaw = annualRent - (annualMgmt + annualPropTax + annualInsurance + annualOther) - annualInterest - annualDepreciation;
      const taxableIncome = Math.max(0, Math.floor(taxableIncomeRaw));
      const corporateTax = calcCorpTax(taxableIncome);
      const localTax = corporateTax * 0.07 + taxableIncome * 0.05;
      const totalTax = corporateTax + localTax;

      // 세후 CF (원리금 상환 포함한 현금 유출 + 세금 차감)
      // CF(세후, 적립금 포함) = 임대료 - 상환 - (관리+세금+보험+기타) - 세금
      const netCashFlowAfterTax = annualRent - annualPayment - annualNonReserveExpense - totalTax;
      cumulativeCFAfterTax += netCashFlowAfterTax;
      const loanBalance = months[months.length - 1]?.remaining ?? 0;
      const remainingValue = Math.max(0, buildingPriceYen - Math.min(y, structureLifespan) * perYearDep);
      // 매각가 경로
      const salePrice = calcSalePrice(acquisitionPriceYen, y, saleGrowthAfter11);
      const sellingFee = salePrice * 0.03;
      const netProceedsBeforeTax = Math.max(0, salePrice - sellingFee - loanBalance);
      const capitalGains = Math.max(0, salePrice - acquisitionPriceYen);
      const capCorp = calcCorpTax(capitalGains);
      const capLocal = capCorp * 0.07 + capitalGains * 0.05;
      const capitalGainsTax = capCorp + capLocal;
      const netProceedsAfterTax = Math.max(0, netProceedsBeforeTax - capitalGainsTax);
      years.push({
        year: y,
        annualRent, annualPayment, annualPrincipal, annualInterest, annualMgmt,
        annualMaintenanceReserve, maintenanceSpent, annualPropTax, annualInsurance, annualOther,
        annualExpenseTotal, taxableIncome, annualDepreciation, corporateTax, localTax, totalTax,
        netCashFlowAfterTax, cumulativeCFAfterTax, loanBalance, remainingValue,
        salePrice, sellingFee, netProceedsBeforeTax, capitalGains, capitalGainsTax, netProceedsAfterTax,
      });
    }
    return years;
  };

  // 모바일에서 만원 단위로 표시하기 위한 헬퍼 함수
  const formatCurrency = (value: string | number, isMobile: boolean = false) => {
    const numValue = typeof value === 'string' ? parseInt(value) : value;
    if (isMobile && numValue >= 10000) {
      return `${Math.round(numValue / 10000).toLocaleString()} 万円`;
    }
    return `${Math.round(numValue).toLocaleString()} 円`;
  };

  // 상환일을 모바일에서는 YYYY-MM 형태로, PC에서는 그대로 표시
  const formatDate = (dateStr: string, isMobile: boolean = false) => {
    if (isMobile && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        return `${parts[0]}-${parts[1]}`;
      }
    }
    return dateStr;
  };

  // 툴팁 토글 함수
  const toggleTooltip = (rowIndex: number) => {
    setSelectedRow(selectedRow === rowIndex ? null : rowIndex);
  };

  // 탭 정의
  const tabs = [
    { id: 'summary', name: '요약' },
    { id: 'schedule', name: '상환 일정표' },
    { id: 'tax', name: '연간 CF' },
    { id: 'other', name: '매각 계획' }
  ];

  // 요약 탭 렌더링
  const renderSummaryTab = () => {
    const yearly = computeYearlyFlows();
    return (
      <div className="space-y-4">
        <h3 className="text-base lg:text-lg font-bold">계산 결과 요약</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4 text-sm lg:text-base">
          <div>매월 상환금: <strong>{formatCurrency(monthlyPayment)}</strong></div>
          <div>연간 수입: <strong>{formatCurrency(yearlyIncome)}</strong></div>
          <div>연간 지출: <strong>{formatCurrency(yearlyCost)}</strong></div>
          <div>연간 순이익: <strong>{formatCurrency(yearlyProfit)}</strong></div>
          <div>표면 수익률 (GRY): <strong>{grossYield} %</strong></div>
          <div>예상 수익률 (NRY): <strong>{yieldPercent} %</strong></div>
          <div>자기자본 수익률: <strong>{equityYield} %</strong></div>
        </div>

        {yearly.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm lg:text-base font-semibold mb-2">주요 지표 추이</h4>
            <YearlyMultiLineChart data={yearly} />
          </div>
        )}
      </div>
    );
  };

  // (차트 컴포넌트는 파일 상단 전역에 정의)

  // 상환 일정표 탭 렌더링
  const renderScheduleTab = () => {
    if (!schedule || schedule.length === 0) {
      return (
        <div className="space-y-4">
          <h3 className="text-base lg:text-lg font-bold">상환 일정표</h3>
          <p className="text-sm lg:text-base">상환 일정이 없습니다.</p>
        </div>
      );
    }

    const totalPages = Math.ceil(schedule.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentSchedule = schedule.slice(startIndex, endIndex);

    // 요약 합계도 동일한 기준(적립금 포함 CF = reserve 제외)으로 계산
    const mgmtRateForSum = parseFloat(formData?.managementFeeRate || '0') || 0;
    const mgmtAmountMonthlyForSum = (parseFloat(formData?.managementFee || '0') || 0) * 10000;
    const mgmtComRateForSum = parseFloat((formData as any)?.managementCommissionRate || '0') || 0;
    const mgmtComAmountMonthlyForSum = (parseFloat((formData as any)?.managementCommissionFee || '0') || 0) * 10000;
    const propTaxMonthlyForSum = (parseFloat(formData?.propertyTax || '0') || 0) * 10000 / 12;
    const insuranceMonthlyForSum = (parseFloat(formData?.insurance || '0') || 0) * 10000 / 12;
    const otherMonthlyForSum = (parseFloat(formData?.otherExpenses || '0') || 0) * 10000 / 12;
    const annualSummary = currentSchedule.reduce((acc, item) => {
      acc.payment += item.payment;
      acc.principal += item.principal;
      acc.interest += item.interest;
      acc.rent += item.rent;
      const mgmtFromRate = item.rent * (mgmtRateForSum / 100);
      const mgmtMonthly = Math.max(mgmtFromRate, mgmtAmountMonthlyForSum);
      const comFromRate = item.rent * (mgmtComRateForSum / 100);
      const comMonthly = Math.max(comFromRate, mgmtComAmountMonthlyForSum);
      const nonReserveBundle = mgmtMonthly + comMonthly + propTaxMonthlyForSum + insuranceMonthlyForSum + otherMonthlyForSum;
      const cfExcludingReserve = item.rent - item.payment - nonReserveBundle; // 적립금 포함(요청 정의)
      acc.cashFlow += cfExcludingReserve;
      return acc;
    }, { payment: 0 as number, principal: 0 as number, interest: 0 as number, rent: 0 as number, cashFlow: 0 as number });

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
          <div>
            <h3 className="text-base lg:text-lg font-bold">상환 일정표 - {currentPage}년차</h3>
            <p className="text-xs text-gray-500 lg:hidden mt-1">각 행을 클릭하면 엔 단위 상세금액을 볼 수 있습니다</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setCurrentPage(p => Math.max(1, p - 1));
                setSelectedRow(null);
              }}
              disabled={currentPage === 1}
              className="px-2 lg:px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50 text-sm"
            >
              이전
            </button>
            <span className="text-sm">{currentPage} / {totalPages}</span>
            <button
              onClick={() => {
                setCurrentPage(p => Math.min(totalPages, p + 1));
                setSelectedRow(null);
              }}
              disabled={currentPage === totalPages}
              className="px-2 lg:px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50 text-sm"
            >
              다음
            </button>
          </div>
        </div>
        <div className="overflow-x-auto relative">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">회차</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상환일</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">월세(입주율반영)</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">월 상환금</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">원금</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이자</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상환 후 잔액</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">대출 잔액</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 relative">
              <tr className="bg-gray-100 font-bold">
                <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm" colSpan={2}>연간 합계</td>
                <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm">
                  <span className="lg:hidden">{formatCurrency(annualSummary.rent, true)}</span>
                  <span className="hidden lg:inline">{formatCurrency(annualSummary.rent)}</span>
                </td>
                <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm">
                  <span className="lg:hidden">{formatCurrency(annualSummary.payment, true)}</span>
                  <span className="hidden lg:inline">{formatCurrency(annualSummary.payment)}</span>
                </td>
                <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm">
                  <span className="lg:hidden">{formatCurrency(annualSummary.principal, true)}</span>
                  <span className="hidden lg:inline">{formatCurrency(annualSummary.principal)}</span>
                </td>
                <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm">
                  <span className="lg:hidden">{formatCurrency(annualSummary.interest, true)}</span>
                  <span className="hidden lg:inline">{formatCurrency(annualSummary.interest)}</span>
                </td>
                <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm">
                  <span className="lg:hidden">{formatCurrency(annualSummary.cashFlow, true)}</span>
                  <span className="hidden lg:inline">{formatCurrency(annualSummary.cashFlow)}</span>
                </td>
                <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm"></td>
              </tr>
              {currentSchedule.map((item, index) => {
                const globalIndex = (currentPage - 1) * itemsPerPage + index;
                const isSelected = selectedRow === globalIndex;
                const caret = isSelected ? '▼' : '▶';
                return (
                  <Fragment key={item.month}>
                    <tr
                      className={`lg:hover:bg-gray-50 cursor-pointer relative ${isSelected ? 'bg-blue-50' : ''}`}
                      onClick={() => toggleTooltip(globalIndex)}
                    >
                      <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm font-medium text-blue-600">
                        {item.month}회차 {caret}
                      </td>
                      <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">
                        <span className="lg:hidden">{formatDate(item.date, true)}</span>
                        <span className="hidden lg:inline">{item.date}</span>
                      </td>
                      <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">
                        <span className="lg:hidden">{formatCurrency(item.rent, true)}</span>
                        <span className="hidden lg:inline">{formatCurrency(item.rent)}</span>
                      </td>
                      <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">
                        <span className="lg:hidden">{formatCurrency(item.payment, true)}</span>
                        <span className="hidden lg:inline">{formatCurrency(item.payment)}</span>
                      </td>
                      <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">
                        <span className="lg:hidden">{formatCurrency(item.principal, true)}</span>
                        <span className="hidden lg:inline">{formatCurrency(item.principal)}</span>
                      </td>
                      <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">
                        <span className="lg:hidden">{formatCurrency(item.interest, true)}</span>
                        <span className="hidden lg:inline">{formatCurrency(item.interest)}</span>
                      </td>
                      <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">
                        {(() => {
                          const mgmtRate = parseFloat(formData?.managementFeeRate || '0') || 0;
                          const mgmtAmountMonthly = (parseFloat(formData?.managementFee || '0') || 0) * 10000;
                          const comRate = parseFloat((formData as any)?.managementCommissionRate || '0') || 0;
                          const comAmountMonthly = (parseFloat((formData as any)?.managementCommissionFee || '0') || 0) * 10000;
                          const mgmtFromRate = item.rent * (mgmtRate / 100);
                          const comFromRate = item.rent * (comRate / 100);
                          const mgmtMonthly = Math.max(mgmtFromRate, mgmtAmountMonthly);
                          const comMonthly = Math.max(comFromRate, comAmountMonthly);
                          const propTaxMonthly = (parseFloat(formData?.propertyTax || '0') || 0) * 10000 / 12;
                          const insuranceMonthly = (parseFloat(formData?.insurance || '0') || 0) * 10000 / 12;
                          const otherMonthly = (parseFloat(formData?.otherExpenses || '0') || 0) * 10000 / 12;
                          const nonReserveBundle = mgmtMonthly + comMonthly + propTaxMonthly + insuranceMonthly + otherMonthly;
                          const cfExcludingReserve = item.rent - item.payment - nonReserveBundle; // 요청 정의상 "적립금 포함"
                          return (
                            <>
                              <span className="lg:hidden">{formatCurrency(cfExcludingReserve, true)}</span>
                              <span className="hidden lg:inline">{formatCurrency(cfExcludingReserve)}</span>
                            </>
                          )
                        })()}
                      </td>
                      <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">
                        <span className="lg:hidden">{formatCurrency(item.remaining, true)}</span>
                        <span className="hidden lg:inline">{formatCurrency(item.remaining)}</span>
                      </td>
                    </tr>
                    {isSelected && (() => {
                      // 서버 스케줄 rent는 이미 입주율을 반영한 유효 월세 값
                      const rentReceived = item.rent;
                      const mgmtRate = parseFloat(formData?.managementFeeRate || '0') || 0;
                      const maintRate = parseFloat(formData?.maintenanceFeeRate || '0') || 0; // 장기수선적립 비율
                      const mgmtAmountMonthly = (parseFloat(formData?.managementFee || '0') || 0) * 10000;
                      const comRate = parseFloat((formData as any)?.managementCommissionRate || '0') || 0;
                      const comAmountMonthly = (parseFloat((formData as any)?.managementCommissionFee || '0') || 0) * 10000;
                      const maintAmountMonthly = (parseFloat(formData?.maintenanceFee || '0') || 0) * 10000; // 장기수선 적립 고정액
                      const mgmtFromRate = item.rent * (mgmtRate / 100);
                      const comFromRate = item.rent * (comRate / 100);
                      const maintFromRate = item.rent * (maintRate / 100);
                      const mgmtMonthly = Math.max(mgmtFromRate, mgmtAmountMonthly);
                      const comMonthly = Math.max(comFromRate, comAmountMonthly);
                      const reserveMonthly = Math.max(maintFromRate, maintAmountMonthly);
                      const propTaxMonthly = (parseFloat(formData?.propertyTax || '0') || 0) * 10000 / 12;
                      const insuranceMonthly = (parseFloat(formData?.insurance || '0') || 0) * 10000 / 12;
                      const otherMonthly = (parseFloat(formData?.otherExpenses || '0') || 0) * 10000 / 12;
                      const nonReserveBundle = mgmtMonthly + comMonthly + propTaxMonthly + insuranceMonthly + otherMonthly;
                      const cfExcludingReserve = rentReceived - item.payment - nonReserveBundle; // 요청 정의: 적립금 포함
                      const cfDetailed = cfExcludingReserve - reserveMonthly; // 요청 정의: 적립금 제외
                      return (
                        <tr className="bg-blue-50">
                          <td colSpan={8} className="px-2 lg:px-3 py-3">
                            <div className="text-xs lg:text-sm space-y-2">
                              <div className="font-semibold text-gray-800">{item.month}회차 월간 상세 캐시플로우</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div className="space-y-1 text-gray-700">
                                  <div className="flex justify-between"><span>입금 월세(입주율 반영):</span><span>{formatCurrency(rentReceived)}</span></div>
                                  <div className="flex justify-between"><span>대출 상환금:</span><span>{formatCurrency(item.payment)}</span></div>
                                  <div className="flex justify-between"><span>원금:</span><span>{formatCurrency(item.principal)}</span></div>
                                  <div className="flex justify-between"><span>이자:</span><span>{formatCurrency(item.interest)}</span></div>
                                </div>
                                <div className="space-y-1 text-gray-700">
                                  <div className="flex justify-between"><span>관리비(월):</span><span>{formatCurrency(mgmtMonthly)}</span></div>
                                  <div className="flex justify-between"><span>관리수수료(월):</span><span>{formatCurrency(comMonthly)}</span></div>
                                  <div className="flex justify-between"><span>장기수선 적립(월):</span><span>{formatCurrency(reserveMonthly)}</span></div>
                                  <div className="flex justify-between"><span>고정자산세(월):</span><span>{formatCurrency(propTaxMonthly)}</span></div>
                                  <div className="flex justify-between"><span>보험료(월):</span><span>{formatCurrency(insuranceMonthly)}</span></div>
                                  <div className="flex justify-between"><span>기타경비(월):</span><span>{formatCurrency(otherMonthly)}</span></div>
                                </div>
                                <div className="space-y-1 text-gray-700">
                                  <div className="flex justify-between font-medium border-t pt-1"><span>유지·세금 묶음(적립 제외):</span><span>{formatCurrency(nonReserveBundle)}</span></div>
                                  <div className="flex justify-between font-bold text-blue-600"><span>월간 CF(적립금 포함):</span><span>{formatCurrency(cfExcludingReserve)}</span></div>
                                  <div className="flex justify-between"><span>월간 CF(적립금 제외):</span><span>{formatCurrency(cfDetailed)}</span></div>
                                  <div className="flex justify-between text-gray-500"><span>대출 잔액:</span><span>{formatCurrency(item.remaining)}</span></div>
                                </div>
                              </div>
                              <div className="mt-1 text-gray-500">행을 다시 클릭하면 상세가 닫힙니다</div>
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 세금 계산 탭 렌더링
  const renderTaxTab = () => {
    if (!formData || taxCalculations.length === 0) {
      return (
        <div className="space-y-4">
          <h3 className="text-base lg:text-lg font-bold">세금 계산</h3>
          <p className="text-sm lg:text-base">세금 계산을 위한 데이터가 부족합니다.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
          <div>
            <h3 className="text-base lg:text-lg font-bold">세금 계산</h3>
            <p className="text-xs text-gray-500 mt-1">
              구조: {formData.structure}, 내용연수: {formData.buildingAge}년, 건물가격: {formatCurrency(parseFloat(formData.buildingPrice) * 10000)}
            </p>
            <p className="text-xs text-gray-500">연차를 클릭하면 상세 내역을 볼 수 있습니다</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연차</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연간수입</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">운영비용 합계</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">과세소득</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">법인세</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">지방세</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총세금</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">세후 CF</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {taxCalculations.map((tax) => {
                const totalExpenses = tax.loanInterest + tax.propertyTax + tax.annualDepreciation +
                  tax.managementFee + tax.insurance + tax.otherExpenses +
                  (tax.acquisitionCosts || 0);
                const isExpanded = selectedTaxYear === tax.year;

                return (
                  <Fragment key={tax.year}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedTaxYear(isExpanded ? null : tax.year)}
                    >
                      <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm font-medium text-blue-600">
                        {tax.year}년차 {isExpanded ? '▼' : '▶'}
                      </td>
                      <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">
                        <span className="lg:hidden">{formatCurrency(tax.annualRent, true)}</span>
                        <span className="hidden lg:inline">{formatCurrency(tax.annualRent)}</span>
                      </td>
                      <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">
                        <span className="lg:hidden">{formatCurrency(totalExpenses, true)}</span>
                        <span className="hidden lg:inline">{formatCurrency(totalExpenses)}</span>
                      </td>
                      <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">
                        <span className="lg:hidden">{formatCurrency(tax.taxableIncome, true)}</span>
                        <span className="hidden lg:inline">{formatCurrency(tax.taxableIncome)}</span>
                      </td>
                      <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">
                        <span className="lg:hidden">{formatCurrency(tax.corporateTax, true)}</span>
                        <span className="hidden lg:inline">{formatCurrency(tax.corporateTax)}</span>
                      </td>
                      <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">
                        <span className="lg:hidden">{formatCurrency(tax.localTax, true)}</span>
                        <span className="hidden lg:inline">{formatCurrency(tax.localTax)}</span>
                      </td>
                      <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm font-medium">
                        <span className="lg:hidden">{formatCurrency(tax.totalTax, true)}</span>
                        <span className="hidden lg:inline">{formatCurrency(tax.totalTax)}</span>
                      </td>
                      <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm font-bold text-blue-600">
                        <span className="lg:hidden">{formatCurrency(tax.netCashFlow, true)}</span>
                        <span className="hidden lg:inline">{formatCurrency(tax.netCashFlow)}</span>
                      </td>
                    </tr>

                    {/* 상세 내역 행 */}
                    {isExpanded && (
                      <tr className="bg-blue-50">
                        <td colSpan={8} className="px-2 lg:px-3 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs lg:text-sm">
                            <div className="space-y-2">
                              <h4 className="font-medium text-gray-800">지출 상세</h4>
                              <div className="space-y-1 text-gray-600">
                                <div className="flex justify-between">
                                  <span>대출이자:</span>
                                  <span>{formatCurrency(tax.loanInterest)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>고정자산세:</span>
                                  <span>{formatCurrency(tax.propertyTax)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>감가상각:</span>
                                  <span>{formatCurrency(tax.annualDepreciation)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>관리비:</span>
                                  <span>{formatCurrency(tax.managementFee)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h4 className="font-medium text-gray-800">&nbsp;</h4>
                              <div className="space-y-1 text-gray-600">
                                <div className="flex justify-between">
                                  <span>보험료:</span>
                                  <span>{formatCurrency(tax.insurance)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>기타경비:</span>
                                  <span>{formatCurrency(tax.otherExpenses)}</span>
                                </div>
                                {tax.acquisitionCosts && (
                                  <div className="flex justify-between">
                                    <span>제비용:</span>
                                    <span>{formatCurrency(tax.acquisitionCosts)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-medium border-t pt-1">
                                  <span>지출 합계:</span>
                                  <span>{formatCurrency(totalExpenses)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h4 className="font-medium text-gray-800">기타 정보</h4>
                              <div className="space-y-1 text-gray-600">
                                <div className="flex justify-between">
                                  <span>부동산 잔존가치:</span>
                                  <span>{formatCurrency(tax.remainingValue)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>법인세율:</span>
                                  <span>{tax.taxableIncome <= 8000000 ? '15%' : '15%/23.2%'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>지방세율:</span>
                                  <span>주민세 7% + 사업세 5%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-gray-500">
                            다시 클릭하면 상세 내역이 접힙니다
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 세금 계산 설명 */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-xs lg:text-sm">
          <h4 className="font-medium text-gray-800 mb-2">세금 계산 기준</h4>
          <ul className="space-y-1 text-gray-600">
            <li>• 법인세율: 소득 800만엔 이하 15%, 800만엔 초과 23.2%</li>
            <li>• 지방세: 법인주민세(법인세의 7%) + 법인사업세(소득의 약 5%)</li>
            <li>• 제비용은 첫해에만 포함됩니다</li>
            <li>• 수선비는 적립금 형태로 세금 계산에서 제외됩니다</li>
            <li>• 최종 캐시플로우 = 연간수입 - 총비용 - 총세금</li>
          </ul>
        </div>
      </div>
    );
  };

  // 매각 계획(간소화 + IRR & Equity Multiple 추가)
  const renderOtherTab = () => {
    if (!formData || !schedule.length) {
      return (
        <div className="space-y-4">
          <h3 className="text-base lg:text-lg font-bold">매각 계획</h3>
          <p className="text-sm lg:text-base">데이터가 부족합니다.</p>
        </div>
      );
    }
    const years = computeYearlyFlows();
    // 초기 투자 (자기자본 + 제비용)
    const acquisitionCosts = [
      formData.brokerageFee, formData.registrationFee, formData.acquisitionTax, formData.stampDuty,
      formData.loanFee, formData.surveyFee, formData.miscellaneousFees, (formData as any).otherMiscellaneousFees || '0'
    ].reduce((s,c)=> s + (parseFloat(c)||0),0) * 10000;
    const initialEquity = (parseFloat(formData.ownCapital)||0)*10000 + acquisitionCosts;

    // IRR 계산 함수
    const calcIRR = (flows:number[]): number | null => {
      let guess = 0.08; // 8%
      for(let i=0;i<50;i++){
        let npv=0; let dnpv=0;
        flows.forEach((cf,t)=>{ const denom=Math.pow(1+guess,t); npv+=cf/denom; dnpv+= -t*cf/denom/(1+guess); });
        if(Math.abs(npv) < 1) return guess*100;
        const next = guess - npv/dnpv;
        if(!isFinite(next) || next<=-0.9999) break;
        guess = next;
      }
      return null;
    };

    const saleRows = years.map(y=>{
      const annualCF = y.netCashFlowAfterTax; // 세후 CF
      const cumulativeCF = y.cumulativeCFAfterTax;
      const loanBal = y.loanBalance;
      const saleValue = y.salePrice; // 매각가 추정(경로)
      const sellingFee = y.sellingFee + y.capitalGainsTax; // 중개수수료 + 양도세(세금 등)
      const netSaleProceeds = Math.max(0, saleValue - sellingFee - loanBal); // 순현금 (세후)
      // IRR & Equity Multiple (매각을 해당 연차에 한다 가정)
      const flows: number[] = [-initialEquity];
      for(let t=0;t<y.year-1;t++){ flows.push(years[t].netCashFlowAfterTax); }
      // 매각 연도 CF + 순매각 현금 동시 수령
      flows.push(annualCF + netSaleProceeds);
      const irr = initialEquity>0 ? calcIRR(flows) : null;
      const equityMultiple = initialEquity>0 ? (flows.slice(1).reduce((s,c)=>s+c,0) / initialEquity) : null;
      return { year:y.year, annualCF, cumulativeCF, loanBal, saleValue, sellingFee, netSaleProceeds, irr, equityMultiple };
    });

    return (
      <div className="space-y-4">
        <h3 className="text-base lg:text-lg font-bold">매각 계획 (Holding 별 지표)</h3>
        <p className="text-xs text-gray-500">IRR은 해당 연도 말 매각 가정 (초기 투자 = 자기자본 + 제비용). 매각 비용 = 중개수수료 + 양도세 등.</p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연차</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연간 CF(세후)</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">누적 CF</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">대출잔액</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">잔존가치(매각가 추정)</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">매각 비용</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">매각 순현금</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IRR</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equity Multiple</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {saleRows.map(r=> (
                <tr key={r.year}>
                  <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium text-blue-600">{r.year}년차</td>
                  <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm">{formatCurrency(r.annualCF)}</td>
                  <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm">{formatCurrency(r.cumulativeCF)}</td>
                  <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm">{formatCurrency(r.loanBal)}</td>
                  <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm">{formatCurrency(r.saleValue)}</td>
                  <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm">{formatCurrency(r.sellingFee)}</td>
                  <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium text-blue-600">{formatCurrency(r.netSaleProceeds)}</td>
                  <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm">{r.irr!==null ? r.irr.toFixed(2)+' %':'-'}</td>
                  <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm">{r.equityMultiple!==null ? r.equityMultiple.toFixed(2)+' x':'-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-xs lg:text-sm">
          <h4 className="font-medium text-gray-800 mb-2">계산 기준</h4>
          <ul className="space-y-1 text-gray-600">
            <li>• 초기 투자 = 자기자본 + 제비용(모두 현금 지출 가정)</li>
            <li>• IRR: 연 8% 초기 추정치로 뉴턴-랩슨 50회 이내 수렴</li>
            <li>• 매각 비용 = 중개 수수료(3%) + 양도세(법인세+지방세)</li>
            <li>• 매각 순현금 = 매각가 - 매각비용 - 대출잔액</li>
            <li>• Equity Multiple = (총 회수 현금 / 초기 투자)</li>
          </ul>
        </div>
      </div>
    );
  };

  // 현재 활성 탭에 따른 컨텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return renderSummaryTab();
      case 'schedule':
        return renderScheduleTab();
      case 'tax':
        return renderTaxTab();
      case 'other':
        return renderOtherTab();
      default:
        return renderSummaryTab();
    }
  };

  // PDF Export (listen for global event from form header)
  useEffect(()=>{
    if(!formData || !schedule.length) return;
    // helpers defined outside handler to reduce nesting
    const fmtN=(n?:number|null)=> n===undefined||n===null||isNaN(n) ? '-' : Math.round(n).toLocaleString();
    const fmtP=(p?:number|null)=> p===undefined||p===null||isNaN(p) ? '-' : (p).toFixed(2)+'%';
    const buildSaleRows=(yearly:ReturnType<typeof computeYearlyFlows>)=>{
      const acquisitionCosts = [formData.brokerageFee, formData.registrationFee, formData.acquisitionTax, formData.stampDuty, formData.loanFee, formData.surveyFee, formData.miscellaneousFees, (formData as any).otherMiscellaneousFees || '0']
        .reduce((s,c)=> s + (parseFloat(c)||0),0) * 10000;
      const initialEquity = (parseFloat(formData.ownCapital||'0')||0)*10000 + acquisitionCosts;
      return yearly.map(yf=>{
        const sellingFee = yf.sellingFee + yf.capitalGainsTax;
        const netSale = Math.max(0, yf.salePrice - sellingFee - yf.loanBalance);
        const flows:number[] = [-initialEquity];
        for(let i=0;i<yf.year-1;i++){
          flows.push(yearly[i].netCashFlowAfterTax);
        }
        flows.push(yf.netCashFlowAfterTax + netSale);
        let irr: number | null = null;
        if(initialEquity>0){
          let guess=0.08;
          for(let iter=0; iter<50; iter++){
            let npv=0; let dnpv=0;
            for(let t=0;t<flows.length;t++){ const cf=flows[t]; const denom=Math.pow(1+guess,t); npv += cf/denom; dnpv += -t*cf/denom/(1+guess); }
            if(Math.abs(npv)<1){
              irr=guess*100; break;
            }
            const next= guess - npv/dnpv;
            if(!isFinite(next) || next<=-0.9999){
              break;
            }
            guess=next;
          }
        }
        let equityMultiple: number | null = null;
        if(initialEquity>0){
          let returned = 0;
          for(let idx=1; idx<flows.length; idx++) returned += flows[idx];
          equityMultiple = returned / initialEquity;
        }
        return { year:yf.year, annualCF: yf.netCashFlowAfterTax, cumulativeCF: yf.cumulativeCFAfterTax, loanBal: yf.loanBalance, saleValue: yf.salePrice, sellingFee, netSaleProceeds: netSale, irr, equityMultiple };
      });
    };
  const exportPdf = async ()=>{
      try {
  const doc = new jsPDF({unit:'pt', format:'a4'});
  registerPretendardFont();
  doc.setFont('Pretendard','normal');
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const marginX = 36; let y=40; const lineH=14;
  const addHeader=(title:string)=>{ if(y>pageH-60){ doc.addPage(); y=40;} doc.setFont('Pretendard','normal'); doc.setFontSize(14); doc.text(title, marginX, y); y+=lineH; doc.setFontSize(9); };
        const addTable=(headers:string[], rows:(string|number|null|undefined)[][])=>{
          const usableW = pageW - marginX*2; const colW = usableW/headers.length;
          if(y>pageH-60){ doc.addPage(); y=40; }
          // header
          doc.setFont('Pretendard','normal');
          for(let i=0;i<headers.length;i++){ doc.text(headers[i], marginX + i*colW + 2, y); }
          y+=lineH-4; doc.setFont('helvetica','normal');
          for(const r of rows){
            if(y>pageH-50){
              doc.addPage(); y=40; doc.setFont('Pretendard','normal');
              for(let i=0;i<headers.length;i++){ doc.text(headers[i], marginX + i*colW + 2, y); }
              y+=lineH-4; doc.setFont('helvetica','normal');
            }
            for(let i=0;i<r.length;i++){
              const c = r[i]; const txt = typeof c==='number'? fmtN(c): (c??'');
              doc.text(String(txt), marginX + i*colW + 2, y);
            }
            y+=lineH-2;
          }
          y+=4;
        };
        const yearly = computeYearlyFlows();
        const saleRows = buildSaleRows(yearly);
  doc.setFont('Pretendard','normal'); doc.setFontSize(18); doc.text('Real Estate Investment Report', marginX, y); y+=20; doc.setFontSize(10); doc.text('Generated: '+ new Date().toLocaleString(), marginX, y); y+=lineH;
        addHeader('1. Acquisition');
        addTable(['Item','Value','Item','Value'], [
          ['Purchase Price', fmtN(parseFloat((formData as any).price||'0')*10000), 'Building Price', fmtN(parseFloat(formData.buildingPrice||'0')*10000)],
            ['Equity', fmtN(parseFloat(formData.ownCapital||'0')*10000), 'Interest Rate', (parseFloat(formData.rate||'0')||0).toFixed(2)+'%'],
          ['Term (Y)', formData.term, 'Asking Price', fmtN(parseFloat((formData.price)||'0')*10000)],
        ]);
        addTable(['Cost','Amount','Cost','Amount'], [
          ['Acq Tax', fmtN(parseFloat(formData.acquisitionTax||'0')*10000), 'Broker Fee', fmtN(parseFloat(formData.brokerageFee||'0')*10000)],
          ['Registration', fmtN(parseFloat(formData.registrationFee||'0')*10000), 'Stamp Duty', fmtN(parseFloat(formData.stampDuty||'0')*10000)],
          ['Misc 1', fmtN(parseFloat(formData.miscellaneousFees||'0')*10000), 'Misc 2', fmtN(parseFloat((formData as any).otherMiscellaneousFees||'0')*10000)]
        ]);
        addTable(['Opex','Annual','Opex','Annual'], [
          ['Mgmt Fee', fmtN(parseFloat(formData.managementFee||'0')*10000*12), 'Maintenance', fmtN(parseFloat(formData.maintenanceFee||'0')*10000*12)],
          ['Property Tax', fmtN(parseFloat(formData.propertyTax||'0')*10000), 'Insurance', fmtN(parseFloat(formData.insurance||'0')*10000)],
          ['Other', fmtN(parseFloat(formData.otherExpenses||'0')*10000), '', '']
        ]);
        addHeader('2. Analysis');
        addTable(['Metric','Value','Metric','Value'], [
          ['Monthly Payment', monthlyPayment, 'Annual Income', yearlyIncome],
          ['Annual Expense', yearlyCost, 'Annual Profit', yearlyProfit],
          ['Gross Yield', grossYield+' %', 'Net Yield', yieldPercent+' %'],
          ['Equity Return', equityYield+' %', '', '']
        ]);
        const year1 = schedule.filter(r=> Math.ceil(r.month/12)===1);
        addTable(['Month','Rent','Pmt','Principal','Interest','Loan Bal'], year1.map(r=> [r.month, r.rent, r.payment, r.principal, r.interest, r.remaining]));
        addTable(['Year','Annual CF (After Tax)','Cumulative CF','Loan Bal'], yearly.slice(0,10).map(f=> [f.year, f.netCashFlowAfterTax, f.cumulativeCFAfterTax, f.loanBalance]));
        addTable(['Year','Net Sale Cash','Sale Price','Sale Costs','IRR','EM'], saleRows.slice(0,10).map(r=> [r.year, r.netSaleProceeds, r.saleValue, r.sellingFee, r.irr!==null? fmtP(r.irr):'-', r.equityMultiple? r.equityMultiple.toFixed(2)+'x':'-']));
        addHeader('3. Appendix');
        addTable(['No.','Rent','Pmt','Principal','Interest','Balance'], schedule.map(r=> [r.month, r.rent, r.payment, r.principal, r.interest, r.remaining]));
        addTable(['Year','Annual CF','Cumulative CF','Loan Bal','Net Sale Cash'], yearly.map(f=> [f.year, f.netCashFlowAfterTax, f.cumulativeCFAfterTax, f.loanBalance, f.netProceedsAfterTax]));
        addTable(['Year','Sale Price','Sale Costs','Net Cash','IRR','EM'], saleRows.map(r=> [r.year, r.saleValue, r.sellingFee, r.netSaleProceeds, r.irr!==null? fmtP(r.irr):'-', r.equityMultiple? r.equityMultiple.toFixed(2)+'x':'-']));
        doc.save('realestate_analysis.pdf');
      } catch(e){ console.error(e); }
    };
    window.addEventListener('exportPdf', exportPdf);
    return ()=> window.removeEventListener('exportPdf', exportPdf);
  },[formData, schedule, monthlyPayment, yearlyIncome, yearlyCost, yearlyProfit, grossYield, yieldPercent, equityYield, computeYearlyFlows]);

  return (
    <div className="max-w-full lg:max-w-[1440px] mx-auto mt-6 bg-white p-4 lg:p-6 rounded-xl shadow-md space-y-4">
      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedRow(null); // 탭 변경시 툴팁 닫기
                setSelectedTaxYear(null); // 탭 변경시 세금 계산 상세보기 닫기
                if (tab.id !== 'schedule') {
                  setCurrentPage(1); // 상환 일정표가 아닌 경우 페이지 초기화
                }
              }}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="mt-4">
        {renderTabContent()}
      </div>
    </div>
  );
}
