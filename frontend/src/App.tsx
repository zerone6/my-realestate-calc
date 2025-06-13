import { useState } from 'react'
import InputForm from './components/InputForm'
import ResultCard from './components/ResultCard'

function App() {
  const [result, setResult] = useState<null | {
    monthlyPayment: string
    yearlyIncome: string
    yearlyCost: string
    yearlyProfit: string
    yieldPercent: string
    grossYield: string
  }>(null)

  const [schedule, setSchedule] = useState<null | any[]>(null)

  const handleCalculate = (form: {
    price: string
    loan: string
    rate: string
    term: string
    rent: string
    expense: string
    startDate: string
  }) => {
    const price = parseFloat(form.price) * 10000
    const loan = parseFloat(form.loan) * 10000
    const i = parseFloat(form.rate) / 100 / 12
    const n = parseFloat(form.term) * 12
    const monthlyPayment = i === 0 ? loan / n : loan * i / (1 - Math.pow(1 + i, -n))
    const yearlyIncome = parseFloat(form.rent) * 12
    const yearlyCost = parseFloat(form.expense) + (monthlyPayment * 12 - (loan / n) * 12)
    const yearlyProfit = yearlyIncome - yearlyCost
    const yieldPercent = (yearlyProfit / price) * 100
    const grossYield = (yearlyIncome / price) * 100

    setResult({
      monthlyPayment: Math.round(monthlyPayment).toLocaleString(),
      yearlyIncome: Math.round(yearlyIncome).toLocaleString(),
      yearlyCost: Math.round(yearlyCost).toLocaleString(),
      yearlyProfit: Math.round(yearlyProfit).toLocaleString(),
      yieldPercent: yieldPercent.toFixed(2),
      grossYield: grossYield.toFixed(2)
    })

    const startDate = form.startDate ? new Date(form.startDate) : new Date()
    const repaymentSchedule = []
    let remaining = loan

    for (let j = 1; j <= n; j++) {
      const interest = remaining * i
      const principal = monthlyPayment - interest
      remaining -= principal
      const date = new Date(startDate)
      date.setMonth(date.getMonth() + j - 1)

      repaymentSchedule.push({
        no: j,
        date: date.toISOString().split('T')[0],
        payment: Math.round(monthlyPayment),
        principal: Math.round(principal),
        interest: Math.round(interest),
        balance: Math.round(Math.max(0, remaining))
      })
    }

    setSchedule(repaymentSchedule)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <InputForm onCalculate={handleCalculate} />
      {result && <ResultCard {...result} />}
      {schedule && (
        <div className="max-w-4xl mx-auto mt-10 bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">상환 일정표 (35년간)</h3>
          <div className="overflow-auto max-h-[600px]">
            <table className="min-w-full text-sm text-left border border-gray-200">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2 border">회차</th>
                  <th className="px-3 py-2 border">날짜</th>
                  <th className="px-3 py-2 border">상환 총액</th>
                  <th className="px-3 py-2 border">원금</th>
                  <th className="px-3 py-2 border">이자</th>
                  <th className="px-3 py-2 border">대출 잔액</th>
                </tr>
              </thead>
              <tbody>
                {schedule.slice(0, 60).map((item) => (
                  <tr key={item.no}>
                    <td className="px-3 py-2 border">{item.no}회차</td>
                    <td className="px-3 py-2 border">{item.date}</td>
                    <td className="px-3 py-2 border">{item.payment.toLocaleString()} 円</td>
                    <td className="px-3 py-2 border">{item.principal.toLocaleString()}</td>
                    <td className="px-3 py-2 border">{item.interest.toLocaleString()}</td>
                    <td className="px-3 py-2 border">{item.balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-xs text-gray-500 mt-2">※ 처음 60개월(5년치)만 표시 중</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
