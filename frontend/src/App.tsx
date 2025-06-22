import { useEffect, useState } from 'react'
import InputForm from './components/InputForm'
import ResultCard from './components/ResultCard'

// API 응답 타입 정의
interface CalculationResult {
  monthlyPayment: string
  yearlyIncome: string
  yearlyCost: string
  yearlyProfit: string
  yieldPercent: string
  grossYield: string
  schedule: RepaymentSchedule[]
}

interface RepaymentSchedule {
  no: number
  date: string
  payment: number
  principal: number
  interest: number
  balance: number
  estimatedMonthlyRent: number
  cashFlow: number
}

function App() {
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [page, setPage] = useState(0)
  const [savedItems, setSavedItems] = useState<{ name: string; form: any }[]>([])
  const [activeForm, setActiveForm] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('realestate-items')
    if (saved) {
      setSavedItems(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('realestate-items', JSON.stringify(savedItems))
  }, [savedItems])

  const handleCalculate = async (form: any) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:8080/api/calculation/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          price: parseFloat(form.price),
          loan: parseFloat(form.loan),
          rate: parseFloat(form.rate),
          term: parseInt(form.term),
          rent: parseFloat(form.rent),
          expense: parseFloat(form.expense),
          startDate: form.startDate,
          occupancyRate: parseFloat(form.occupancyRate),
          rentFixedPeriod: parseInt(form.rentFixedPeriod),
          rentAdjustmentInterval: parseInt(form.rentAdjustmentInterval),
          rentAdjustmentRate: parseFloat(form.rentAdjustmentRate)
        })
      })

      if (!response.ok) {
        throw new Error('계산 요청에 실패했습니다')
      }

      const calculationResult: CalculationResult = await response.json()

      setResult(calculationResult)
      setPage(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
      console.error('Calculation error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = (form: any) => {
    if (!form.name) {
      alert("물건 이름을 입력하세요")
      return
    }

    setSavedItems((prev) => {
      const existingIndex = prev.findIndex(item => item.name === form.name)
      let updated

      if (existingIndex !== -1) {
        // 같은 이름이 있으면 해당 항목을 덮어쓰기
        updated = [...prev]
        updated[existingIndex] = { name: form.name, form }
      } else {
        // 없으면 새 항목으로 추가
        updated = [...prev, { name: form.name, form }]
      }

      // localStorage도 반영
      localStorage.setItem("savedItems", JSON.stringify(updated))
      return updated
    })
  }

  const handleLoad = (form: any) => {
    setActiveForm(form)
    handleCalculate(form)
  }

  const handleDelete = (name: string) => {
    if (!confirm(`'${name}' 항목을 삭제하시겠습니까?`)) return

    const updated = savedItems.filter(item => item.name !== name)
    setSavedItems(updated)
    localStorage.setItem("savedItems", JSON.stringify(updated))
  }

  const pageSize = 60

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* 좌측 사이드바 */}
      <aside className="w-64 bg-white shadow-md p-4">
        <h2 className="text-xl font-bold mb-4">📂 저장된 계산</h2>
        <ul className="space-y-2">
          {savedItems.map((item, idx) => (
            <li
              key={idx}
              className="cursor-pointer text-sm text-black hover:font-semibold hover:text-blue-600"
              onClick={() => handleLoad(item.form)}
            >
              {item.name}
            </li>
          ))}
        </ul>
      </aside>

      {/* 본문 */}
      <main className="flex-1 p-6 overflow-x-auto">
        <InputForm onCalculate={handleCalculate} onSave={handleSave} onDelete={handleDelete} defaultForm={activeForm} />

        {loading && (
          <div className="max-w-4xl mx-auto mt-6 bg-white rounded-xl shadow-md p-6">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">계산 중...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-4xl mx-auto mt-6 bg-red-50 border border-red-200 rounded-xl shadow-md p-6">
            <p className="text-red-600">오류: {error}</p>
          </div>
        )}

        {result && <ResultCard
          monthlyPayment={result.monthlyPayment}
          yearlyIncome={result.yearlyIncome}
          yearlyCost={result.yearlyCost}
          yearlyProfit={result.yearlyProfit}
          yieldPercent={result.yieldPercent}
          grossYield={result.grossYield}
          schedule={result.schedule}
        />}
      </main>
    </div>
  )
}

export default App
