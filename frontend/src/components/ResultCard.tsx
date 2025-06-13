export default function ResultCard({
  monthlyPayment,
  yearlyIncome,
  yearlyCost,
  yearlyProfit,
  yieldPercent,
  grossYield
}: {
  monthlyPayment: string
  yearlyIncome: string
  yearlyCost: string
  yearlyProfit: string
  yieldPercent: string
  grossYield: string
}) {
  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4">계산 결과 요약</h3>
      <div className="grid grid-cols-2 gap-4 text-gray-700">
        <Item label="매월 상환금" value={`${monthlyPayment} 円`} />
        <Item label="연간 수입" value={`${yearlyIncome} 円`} />
        <Item label="연간 지출" value={`${yearlyCost} 円`} />
        <Item label="연간 순이익" value={`${yearlyProfit} 円`} />
        <Item label="표면 이익률 (연 수입 ÷ 매입가)" value={`${grossYield} %`} highlight />
        <Item label="예상 수익률 (순이익 ÷ 매입가)" value={`${yieldPercent} %`} highlight />
      </div>
    </div>
  );
}

function Item({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-xl ${highlight ? 'bg-blue-50 font-semibold' : 'bg-gray-50'}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-lg">{value}</div>
    </div>
  )
}
