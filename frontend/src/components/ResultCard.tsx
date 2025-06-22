import { useState } from 'react';

interface ScheduleItem {
  no: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  estimatedMonthlyRent: number;
  cashFlow: number;
}

interface ResultProps {
  monthlyPayment: string;
  yearlyIncome: string;
  yearlyCost: string;
  yearlyProfit: string;
  yieldPercent: string;
  grossYield: string;
  schedule: ScheduleItem[];
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
      <div className="max-w-4xl mx-auto mt-6 bg-white p-6 rounded-xl shadow-md space-y-2">
        <h2 className="text-lg font-bold mb-4">계산 결과 요약</h2>
        <div>매월 상환금: <strong>{parseInt(monthlyPayment).toLocaleString()} 円</strong></div>
        <div>연간 수입: <strong>{parseInt(yearlyIncome).toLocaleString()} 円</strong></div>
        <div>연간 지출: <strong>{parseInt(yearlyCost).toLocaleString()} 円</strong></div>
        <div>연간 순이익: <strong>{parseInt(yearlyProfit).toLocaleString()} 円</strong></div>
        <div>표면 수익률 (GRY): <strong>{grossYield} %</strong></div>
        <div>예상 수익률 (NRY): <strong>{yieldPercent} %</strong></div>
        <div className="mt-6">
          <h3 className="text-lg font-bold mb-2">상환 일정표</h3>
          <p>상환 일정이 없습니다.</p>
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
    acc.estimatedMonthlyRent += item.estimatedMonthlyRent;
    acc.cashFlow += item.cashFlow;
    return acc;
  }, { payment: 0, principal: 0, interest: 0, estimatedMonthlyRent: 0, cashFlow: 0 });

  return (
    <div className="max-w-4xl mx-auto mt-6 bg-white p-6 rounded-xl shadow-md space-y-2">
      <h2 className="text-lg font-bold mb-4">계산 결과 요약</h2>
      <div>매월 상환금: <strong>{parseInt(monthlyPayment).toLocaleString()} 円</strong></div>
      <div>연간 수입: <strong>{parseInt(yearlyIncome).toLocaleString()} 円</strong></div>
      <div>연간 지출: <strong>{parseInt(yearlyCost).toLocaleString()} 円</strong></div>
      <div>연간 순이익: <strong>{parseInt(yearlyProfit).toLocaleString()} 円</strong></div>
      <div>표면 수익률 (GRY): <strong>{grossYield} %</strong></div>
      <div>예상 수익률 (NRY): <strong>{yieldPercent} %</strong></div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold">상환 일정표 - {currentPage}년차</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
            >
              이전
            </button>
            <span>{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">회차</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상환일</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">추정 월세</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">월 상환금</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">원금</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이자</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CF</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">대출 잔액</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr className="bg-gray-100 font-bold">
                <td className="px-3 py-2 text-sm" colSpan={2}>연간 합계</td>
                <td className="px-3 py-2 text-sm">{Math.round(annualSummary.estimatedMonthlyRent).toLocaleString()} 円</td>
                <td className="px-3 py-2 text-sm">{Math.round(annualSummary.payment).toLocaleString()} 円</td>
                <td className="px-3 py-2 text-sm">{Math.round(annualSummary.principal).toLocaleString()} 円</td>
                <td className="px-3 py-2 text-sm">{Math.round(annualSummary.interest).toLocaleString()} 円</td>
                <td className="px-3 py-2 text-sm">{Math.round(annualSummary.cashFlow).toLocaleString()} 円</td>
                <td className="px-3 py-2 text-sm"></td>
              </tr>
              {currentSchedule.map((item) => (
                <tr key={item.no}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">{item.no}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">{item.date}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">{Math.round(item.estimatedMonthlyRent).toLocaleString()} 円</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">{Math.round(item.payment).toLocaleString()} 円</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">{Math.round(item.principal).toLocaleString()} 円</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">{Math.round(item.interest).toLocaleString()} 円</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">{Math.round(item.cashFlow).toLocaleString()} 円</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">{Math.round(item.balance).toLocaleString()} 円</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
