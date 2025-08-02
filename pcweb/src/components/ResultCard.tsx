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
  const itemsPerPage = 12;

  if (!schedule || schedule.length === 0) {
    return (
      <div className="max-w-full lg:max-w-4xl mx-auto mt-6 bg-white p-4 lg:p-6 rounded-xl shadow-md space-y-2">
        <h2 className="text-base lg:text-lg font-bold mb-4">계산 결과 요약</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4 text-sm lg:text-base">
          <div>매월 상환금: <strong>{parseInt(monthlyPayment).toLocaleString()} 円</strong></div>
          <div>연간 수입: <strong>{parseInt(yearlyIncome).toLocaleString()} 円</strong></div>
          <div>연간 지출: <strong>{parseInt(yearlyCost).toLocaleString()} 円</strong></div>
          <div>연간 순이익: <strong>{parseInt(yearlyProfit).toLocaleString()} 円</strong></div>
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
        <div>매월 상환금: <strong>{parseInt(monthlyPayment).toLocaleString()} 円</strong></div>
        <div>연간 수입: <strong>{parseInt(yearlyIncome).toLocaleString()} 円</strong></div>
        <div>연간 지출: <strong>{parseInt(yearlyCost).toLocaleString()} 円</strong></div>
        <div>연간 순이익: <strong>{parseInt(yearlyProfit).toLocaleString()} 円</strong></div>
        <div>표면 수익률 (GRY): <strong>{grossYield} %</strong></div>
        <div>예상 수익률 (NRY): <strong>{yieldPercent} %</strong></div>
      </div>

      <div className="mt-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
          <h3 className="text-base lg:text-lg font-bold">상환 일정표 - {currentPage}년차</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 lg:px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50 text-sm"
            >
              이전
            </button>
            <span className="text-sm">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 lg:px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50 text-sm"
            >
              다음
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
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
            <tbody className="bg-white divide-y divide-gray-200">
              <tr className="bg-gray-100 font-bold">
                <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm" colSpan={2}>연간 합계</td>
                <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm">{Math.round(annualSummary.rent).toLocaleString()} 円</td>
                <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm">{Math.round(annualSummary.payment).toLocaleString()} 円</td>
                <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm">{Math.round(annualSummary.principal).toLocaleString()} 円</td>
                <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm">{Math.round(annualSummary.interest).toLocaleString()} 円</td>
                <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm">{Math.round(annualSummary.cashFlow).toLocaleString()} 円</td>
                <td className="px-2 lg:px-3 py-2 text-xs lg:text-sm"></td>
              </tr>
              {currentSchedule.map((item) => (
                <tr key={item.month}>
                  <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">{item.month}</td>
                  <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">{item.date}</td>
                  <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">{Math.round(item.rent).toLocaleString()} 円</td>
                  <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">{Math.round(item.payment).toLocaleString()} 円</td>
                  <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">{Math.round(item.principal).toLocaleString()} 円</td>
                  <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">{Math.round(item.interest).toLocaleString()} 円</td>
                  <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">{Math.round(item.cashFlow || 0).toLocaleString()} 円</td>
                  <td className="px-2 lg:px-3 py-2 whitespace-nowrap text-xs lg:text-sm">{Math.round(item.remaining).toLocaleString()} 円</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
