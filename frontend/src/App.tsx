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
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <InputForm onCalculate={handleCalculate} />
      {result && <ResultCard {...result} />}
    </div>
  )
}

export default App
