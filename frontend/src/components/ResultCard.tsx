
interface ResultProps {
  monthlyPayment: string
  yearlyIncome: string
  yearlyCost: string
  yearlyProfit: string
  yieldPercent: string
  grossYield: string
}

export default function ResultCard({
  monthlyPayment,
  yearlyIncome,
  yearlyCost,
  yearlyProfit,
  yieldPercent,
  grossYield
}: ResultProps) {
  return (
    <div className="max-w-4xl mx-auto mt-6 bg-white p-6 rounded-xl shadow-md space-y-2">
      <h2 className="text-lg font-bold mb-4">계산 결과 요약</h2>
      <div>매월 상환금: <strong>{monthlyPayment} 円</strong></div>
      <div>연간 수입: <strong>{yearlyIncome} 円</strong></div>
      <div>연간 지출: <strong>{yearlyCost} 円</strong></div>
      <div>연간 순이익: <strong>{yearlyProfit} 円</strong></div>
      <div>표면 수익률 (GRY): <strong>{grossYield} %</strong></div>
      <div>예상 수익률 (NRY): <strong>{yieldPercent} %</strong></div>
    </div>
  )
}
