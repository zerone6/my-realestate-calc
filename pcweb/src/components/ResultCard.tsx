import { useState } from 'react';
import { RepaymentSchedule } from '../../../shared/types/RealEstateForm';

interface ResultProps {
  monthlyPayment: string;
  yearlyIncome: string;
  yearlyCost: string;
  yearlyProfit: string;
  yieldPercent: string;
  grossYield: string;
  schedule: RepaymentSchedule[];
}

export default function ResultCard({
  monthlyPayment,
  yearlyIncome,
  yearlyCost,
  yearlyProfit,
  yieldPercent,
  grossYield,
  schedule
}: ResultProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<number | null>(null); // 툴팁 표시용
  const itemsPerPage = 12;

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

  if (!schedule || schedule.length === 0) {
    return (
      <div className="max-w-full lg:max-w-4xl mx-auto mt-6 bg-white p-4 lg:p-6 rounded-xl shadow-md space-y-2">
        <h2 className="text-base lg:text-lg font-bold mb-4">계산 결과 요약</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4 text-sm lg:text-base">
          <div>매월 상환금: <strong>{formatCurrency(monthlyPayment)}</strong></div>
          <div>연간 수입: <strong>{formatCurrency(yearlyIncome)}</strong></div>
          <div>연간 지출: <strong>{formatCurrency(yearlyCost)}</strong></div>
          <div>연간 순이익: <strong>{formatCurrency(yearlyProfit)}</strong></div>
          <div>표면 수익률 (GRY): <strong>{grossYield} %</strong></div>
          <div>예상 수익률 (NRY): <strong>{yieldPercent} %</strong></div>
        </div>
        <div className="mt-6">
          <h3 className="text-base lg:text-lg font-bold mb-2">상환 일정표</h3>
          <p className="text-sm lg:text-base">상환 일정이 없습니다.</p>
        </div>
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
    <div className="max-w-full lg:max-w-4xl mx-auto mt-6 bg-white p-4 lg:p-6 rounded-xl shadow-md space-y-2">
      <h2 className="text-base lg:text-lg font-bold mb-4">계산 결과 요약</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4 text-sm lg:text-base">
        <div>매월 상환금: <strong>{formatCurrency(monthlyPayment)}</strong></div>
        <div>연간 수입: <strong>{formatCurrency(yearlyIncome)}</strong></div>
        <div>연간 지출: <strong>{formatCurrency(yearlyCost)}</strong></div>
        <div>연간 순이익: <strong>{formatCurrency(yearlyProfit)}</strong></div>
        <div>표면 수익률 (GRY): <strong>{grossYield} %</strong></div>
        <div>예상 수익률 (NRY): <strong>{yieldPercent} %</strong></div>
      </div>

      <div className="mt-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
          <div>
            <h3 className="text-base lg:text-lg font-bold">상환 일정표 - {currentPage}년차</h3>
            <p className="text-xs text-gray-500 lg:hidden mt-1">각 행을 클릭하면 엔 단위 상세금액을 볼 수 있습니다</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setCurrentPage(p => Math.max(1, p - 1));
                setSelectedRow(null); // 페이지 변경시 툴팁 닫기
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
                setSelectedRow(null); // 페이지 변경시 툴팁 닫기
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
    </div>
  );
}
