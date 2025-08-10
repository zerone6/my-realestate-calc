import { useState, Fragment } from 'react';
import { RepaymentSchedule, TaxCalculation, FormInputData } from '../../../shared/types/RealEstateForm';

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
    
    const annualDepreciation = buildingPrice * 10000 / lifespan; // 연간 감가상각비 (엔 단위)
    const totalYears = Math.min(loanTerm, lifespan); // 대출기간과 내용연수 중 작은 값
    
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
      
      // 부동산 잔존가치
      const remainingValue = Math.max(0, buildingPrice * 10000 - (annualDepreciation * year));
      
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
      const netCashFlow = annualRent - totalExpenses - totalTax;
      
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
    { id: 'tax', name: '세금 계산' },
    { id: 'other', name: '기타' }
  ];

  // 요약 탭 렌더링
  const renderSummaryTab = () => (
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
    </div>
  );

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

    const annualSummary = currentSchedule.reduce((acc, item) => {
      acc.payment += item.payment;
      acc.principal += item.principal;
      acc.interest += item.interest;
      acc.rent += item.rent;
      acc.cashFlow += item.cashFlow || 0;
      return acc;
    }, { payment: 0, principal: 0, interest: 0, rent: 0, cashFlow: 0 });

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
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">추정 월세</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">월 상환금</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">원금</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이자</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CF</th>
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
                
                return (
                  <tr 
                    key={item.month}
                    className={`lg:hover:bg-gray-50 cursor-pointer relative ${isSelected ? 'bg-blue-50' : ''}`}
                    onClick={() => toggleTooltip(globalIndex)}
                  >
                    <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">{item.month}</td>
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
                      <span className="lg:hidden">{formatCurrency(item.cashFlow || 0, true)}</span>
                      <span className="hidden lg:inline">{formatCurrency(item.cashFlow || 0)}</span>
                    </td>
                    <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">
                      <span className="lg:hidden">{formatCurrency(item.remaining, true)}</span>
                      <span className="hidden lg:inline">{formatCurrency(item.remaining)}</span>
                    </td>
                    
                    {/* 모바일 툴팁 */}
                    {isSelected && (
                      <td className="lg:hidden absolute left-0 top-full z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-max">
                        <div className="text-xs space-y-1">
                          <div className="font-semibold text-gray-800">{item.month}회차 상세금액</div>
                          <div>상환일: {item.date}</div>
                          <div>추정 월세: {formatCurrency(item.rent)} 円</div>
                          <div>월 상환금: {formatCurrency(item.payment)} 円</div>
                          <div>원금: {formatCurrency(item.principal)} 円</div>
                          <div>이자: {formatCurrency(item.interest)} 円</div>
                          <div>CF: {formatCurrency(item.cashFlow || 0)} 円</div>
                          <div>대출 잔액: {formatCurrency(item.remaining)} 円</div>
                          <div className="text-gray-500 mt-2">다시 클릭하면 닫힙니다</div>
                        </div>
                      </td>
                    )}
                  </tr>
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
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">지출계</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">과세소득</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">법인세</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">지방세</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총세금</th>
                <th className="px-2 lg:px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">최종CF</th>
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

  // 기타 탭 렌더링
  const renderOtherTab = () => (
    <div className="space-y-4">
      <h3 className="text-base lg:text-lg font-bold">기타</h3>
      <p className="text-sm lg:text-base text-gray-500">추후 추가 기능이 제공될 예정입니다.</p>
    </div>
  );

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

  return (
    <div className="max-w-full lg:max-w-4xl mx-auto mt-6 bg-white p-4 lg:p-6 rounded-xl shadow-md space-y-4">
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
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
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
