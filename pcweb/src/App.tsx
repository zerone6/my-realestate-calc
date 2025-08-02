import { useEffect, useState } from 'react'
import MultiStepInputForm from './components/MultiStepInputForm'
import ResultCard from './components/ResultCard'
import { CalculationResult, FormInputData } from '../../shared/types/RealEstateForm'
import { calculateRealEstate } from '../../shared/api/realEstateApi'
import { convertFormToRequest } from '../../shared/utils/formUtils'

function App() {
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [savedItems, setSavedItems] = useState<{ name: string; form: FormInputData }[]>([])
  const [activeForm, setActiveForm] = useState<FormInputData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false) // 결과 표시 상태

  useEffect(() => {
    const saved = localStorage.getItem('realestate-items')
    if (saved) {
      setSavedItems(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('realestate-items', JSON.stringify(savedItems))
  }, [savedItems])

  const handleCalculate = async (form: FormInputData) => {
    setLoading(true)
    setError(null)

    try {
      const request = convertFormToRequest(form)
      const calculationResult = await calculateRealEstate(request)
      setResult(calculationResult)
      setShowResult(true) // 계산 완료 후 결과 표시
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
      console.error('Calculation error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCalculateComplete = () => {
    // 스크롤을 부드럽게 아래로 이동하여 결과를 보여줌
    setTimeout(() => {
      const resultElement = document.getElementById('calculation-result')
      if (resultElement) {
        resultElement.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  const handleSave = (form: FormInputData) => {
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

  const handleLoad = (form: FormInputData) => {
    setActiveForm(form)
    setShowResult(false) // 새로운 폼 로드 시 결과 숨김
    handleCalculate(form)
  }

  const handleDelete = (name: string) => {
    if (!confirm(`'${name}' 항목을 삭제하시겠습니까?`)) return

    const updated = savedItems.filter(item => item.name !== name)
    setSavedItems(updated)
    localStorage.setItem("savedItems", JSON.stringify(updated))
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-100">
      {/* 모바일 헤더 (데스크톱에서는 숨김) */}
      <div className="lg:hidden bg-white shadow-md p-4">
        <h1 className="text-lg font-bold text-center">부동산 수익성 계산기</h1>
      </div>

      {/* 좌측 사이드바 - 반응형 */}
      <aside className="w-full lg:w-64 bg-white shadow-md p-4 lg:h-screen overflow-y-auto">
        <h2 className="text-lg lg:text-xl font-bold mb-4">📂 저장된 계산</h2>
        <div className="lg:block">
          {savedItems.length === 0 ? (
            <p className="text-sm text-gray-500">저장된 계산이 없습니다</p>
          ) : (
            <ul className="space-y-2 max-h-40 lg:max-h-none overflow-y-auto lg:overflow-visible">
              {savedItems.map((item) => (
                <li key={item.name}>
                  <button
                    className="w-full text-left cursor-pointer text-sm text-black hover:font-semibold hover:text-blue-600 p-2 rounded hover:bg-gray-50"
                    onClick={() => handleLoad(item.form)}
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* 본문 - 반응형 */}
      <main className="flex-1 p-4 lg:p-6 overflow-x-auto">
        <MultiStepInputForm 
          onCalculate={handleCalculate} 
          onSave={handleSave} 
          onDelete={handleDelete} 
          defaultForm={activeForm}
          onCalculateComplete={handleCalculateComplete}
        />

        {loading && (
          <div className="max-w-full lg:max-w-4xl mx-auto mt-6 bg-white rounded-xl shadow-md p-4 lg:p-6">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 lg:h-8 lg:w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-sm lg:text-base text-gray-600">계산 중...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-full lg:max-w-4xl mx-auto mt-6 bg-red-50 border border-red-200 rounded-xl shadow-md p-4 lg:p-6">
            <p className="text-red-600 text-sm lg:text-base">오류: {error}</p>
          </div>
        )}

        {showResult && result && (
          <div id="calculation-result" className="mt-6">
            <ResultCard
              monthlyPayment={result.monthlyPayment}
              yearlyIncome={result.yearlyIncome}
              yearlyCost={result.yearlyCost}
              yearlyProfit={result.yearlyProfit}
              yieldPercent={result.yieldPercent}
              grossYield={result.grossYield}
              schedule={(result as any).schedule || result.repaymentSchedule || []}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
